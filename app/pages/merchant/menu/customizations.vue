<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { 
  Plus, 
  Sliders, 
  Edit, 
  Trash2, 
  Sparkles, 
  ArrowLeft, 
  X, 
  Check, 
  Layers,
  ChevronDown,
  ChevronUp,
  Tag,
  AlertCircle
} from 'lucide-vue-next'

definePageMeta({
  layout: 'merchant',
  middleware: ['auth']
})

const client = useSupabaseClient()
const { store, fetchStore } = useCurrentStore()

const loading = ref(true)
const groups = ref<any[]>([])

// New Group Form State
const newGroup = ref({
  name_th: '',
  name_en: '',
  name_zh: '',
  is_required: false
})
const isTranslatingGroup = ref(false)
const addingGroup = ref(false)

// Edit Group Modal State
const editingGroup = ref<any>(null)
const editGroupForm = ref({
  id: '',
  name_th: '',
  name_en: '',
  name_zh: '',
  is_required: false
})
const isUpdatingGroup = ref(false)

// New Option Form State
const newOption = ref({
  group_id: '',
  name_th: '',
  name_en: '',
  name_zh: '',
  extra_price: 0
})
const isTranslatingOption = ref(false)
const addingOption = ref(false)

// Edit Option Modal State
const editingOption = ref<any>(null)
const editOptionForm = ref({
  id: '',
  group_id: '',
  name_th: '',
  name_en: '',
  name_zh: '',
  extra_price: 0
})
const isUpdatingOption = ref(false)

onMounted(async () => {
  if (!store.value) {
    await fetchStore()
  }
  
  if (store.value?.id) {
    await fetchGroups()
  }
  
  loading.value = false
})

const fetchGroups = async () => {
  const { data } = await (client as any)
    .from('customization_groups')
    .select(`
      *,
      customization_options (*)
    `)
    .eq('store_id', store.value.id)
    .order('created_at', { ascending: true })
    
  if (data) {
    (data as any[]).forEach(group => {
      if (group.customization_options) {
        group.customization_options.sort((a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0))
      }
    })
  }
  
  groups.value = data || []
}

// === AI Translation Helper ===
const translateText = async (nameTh: string) => {
  if (!nameTh.trim()) return { name_en: '', name_zh: '' }
  try {
    const response = await fetch('/api/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name_th: nameTh, description_th: '' })
    })
    const data = await response.json()
    return { name_en: data.name_en || '', name_zh: data.name_zh || '' }
  } catch {
    return { name_en: '', name_zh: '' }
  }
}

const translateNewGroup = async () => {
  if (!newGroup.value.name_th.trim()) return
  isTranslatingGroup.value = true
  const res = await translateText(newGroup.value.name_th)
  if (res.name_en) newGroup.value.name_en = res.name_en
  if (res.name_zh) newGroup.value.name_zh = res.name_zh
  isTranslatingGroup.value = false
}

const translateNewOption = async () => {
  if (!newOption.value.name_th.trim()) return
  isTranslatingOption.value = true
  const res = await translateText(newOption.value.name_th)
  if (res.name_en) newOption.value.name_en = res.name_en
  if (res.name_zh) newOption.value.name_zh = res.name_zh
  isTranslatingOption.value = false
}

// === Group Actions (กลุ่มตัวเลือก) ===
const addGroup = async () => {
  if (!newGroup.value.name_th.trim() || !store.value) return
  
  addingGroup.value = true
  if (!newGroup.value.name_en || !newGroup.value.name_zh) {
    await translateNewGroup()
  }
  
  const { error } = await (client as any).from('customization_groups').insert({
    store_id: store.value.id,
    name_th: newGroup.value.name_th.trim(),
    name_en: newGroup.value.name_en?.trim() || null,
    name_zh: newGroup.value.name_zh?.trim() || null,
    is_required: newGroup.value.is_required
  })
  
  addingGroup.value = false
  if (!error) {
    const swal = useAlert()
    swal.fire({ title: 'เพิ่มกลุ่มสำเร็จ!', icon: 'success', timer: 1200, showConfirmButton: false })
    newGroup.value = { name_th: '', name_en: '', name_zh: '', is_required: false }
    await fetchGroups()
  } else {
    alert('ไม่สามารถเพิ่มกลุ่มตัวเลือกได้')
  }
}

const openEditGroup = (group: any) => {
  editingGroup.value = group
  editGroupForm.value = {
    id: group.id,
    name_th: group.name_th || '',
    name_en: group.name_en || '',
    name_zh: group.name_zh || '',
    is_required: !!group.is_required
  }
}

const updateGroup = async () => {
  if (!editGroupForm.value.name_th.trim() || !editGroupForm.value.id) return
  isUpdatingGroup.value = true

  const { error } = await (client as any)
    .from('customization_groups')
    .update({
      name_th: editGroupForm.value.name_th.trim(),
      name_en: editGroupForm.value.name_en?.trim() || null,
      name_zh: editGroupForm.value.name_zh?.trim() || null,
      is_required: editGroupForm.value.is_required
    })
    .eq('id', editGroupForm.value.id)

  isUpdatingGroup.value = false
  if (!error) {
    editingGroup.value = null
    await fetchGroups()
  } else {
    alert('ไม่สามารถอัปเดตกลุ่มได้')
  }
}

const deleteGroup = async (group: any) => {
  const swal = useAlert()
  const result = await swal.fire({
    title: 'ยืนยันการลบกลุ่มตัวเลือก?',
    text: `ต้องการลบกลุ่ม "${group.name_th}" และตัวเลือกย่อยทั้งหมดใช่หรือไม่?`,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#e11d48',
    cancelButtonColor: '#64748b',
    confirmButtonText: 'ใช่, ลบเลย!',
    cancelButtonText: 'ยกเลิก'
  })
  if (!result.isConfirmed) return

  await (client as any).from('customization_groups').delete().eq('id', group.id)
  await fetchGroups()
}

// === Option Actions (ตัวเลือกย่อย +ราคา) ===
const addOption = async (groupId: string) => {
  if (!newOption.value.name_th.trim()) return
  addingOption.value = true

  if (!newOption.value.name_en || !newOption.value.name_zh) {
    await translateNewOption()
  }

  const { error } = await (client as any).from('customization_options').insert({
    group_id: groupId,
    name_th: newOption.value.name_th.trim(),
    name_en: newOption.value.name_en?.trim() || null,
    name_zh: newOption.value.name_zh?.trim() || null,
    price_delta: Number(newOption.value.extra_price || 0)
  })

  addingOption.value = false
  if (!error) {
    newOption.value = { group_id: '', name_th: '', name_en: '', name_zh: '', extra_price: 0 }
    await fetchGroups()
  } else {
    alert('ไม่สามารถเพิ่มตัวเลือกได้')
  }
}

const openEditOption = (opt: any) => {
  editingOption.value = opt
  editOptionForm.value = {
    id: opt.id,
    group_id: opt.group_id,
    name_th: opt.name_th || '',
    name_en: opt.name_en || '',
    name_zh: opt.name_zh || '',
    extra_price: opt.price_delta || opt.extra_price || 0
  }
}

const updateOption = async () => {
  if (!editOptionForm.value.name_th.trim() || !editOptionForm.value.id) return
  isUpdatingOption.value = true

  const { error } = await (client as any)
    .from('customization_options')
    .update({
      name_th: editOptionForm.value.name_th.trim(),
      name_en: editOptionForm.value.name_en?.trim() || null,
      name_zh: editOptionForm.value.name_zh?.trim() || null,
      price_delta: Number(editOptionForm.value.extra_price || 0)
    })
    .eq('id', editOptionForm.value.id)

  isUpdatingOption.value = false
  if (!error) {
    editingOption.value = null
    await fetchGroups()
  } else {
    alert('ไม่สามารถอัปเดตตัวเลือกได้')
  }
}

const deleteOption = async (opt: any) => {
  const swal = useAlert()
  const result = await swal.fire({
    title: 'ยืนยันการลบตัวเลือก?',
    text: `ต้องการลบตัวเลือก "${opt.name_th}" ใช่หรือไม่?`,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#e11d48',
    cancelButtonColor: '#64748b',
    confirmButtonText: 'ลบ',
    cancelButtonText: 'ยกเลิก'
  })
  if (!result.isConfirmed) return

  await (client as any).from('customization_options').delete().eq('id', opt.id)
  await fetchGroups()
}

const formatPrice = (price: any) => {
  const num = Number(price || 0)
  return num > 0 ? `+฿${num}` : 'ฟรี (฿0)'
}
</script>

<template>
  <div class="space-y-6 pb-20 max-w-4xl mx-auto">
    
    <!-- 1. Top Header -->
    <div class="flex items-center justify-between gap-4">
      <div>
        <NuxtLink 
          to="/merchant/menu" 
          class="text-xs font-bold text-muted-foreground hover:text-foreground inline-flex items-center gap-1 mb-2"
        >
          <ArrowLeft class="w-3.5 h-3.5" />
          <span>กลับไปหน้ารายการเมนู</span>
        </NuxtLink>
        <h1 class="text-xl font-black text-foreground flex items-center gap-2">
          <Sliders class="w-6 h-6 text-primary" />
          <span>จัดการตัวเลือกพิเศษ (Add-ons & Options)</span>
        </h1>
        <p class="text-xs text-muted-foreground mt-0.5">
          สร้างกลุ่มตัวเลือก เช่น ระดับความหวาน, เลือกเนื้อสัตว์, ท็อปปิ้งไข่ดาว เพื่อนำไปผูกกับเมนูอาหาร
        </p>
      </div>
    </div>

    <!-- 2. Add Group Card -->
    <div class="bg-card border rounded-3xl p-6 shadow-xs space-y-4">
      <div class="flex items-center justify-between border-b pb-3">
        <h2 class="text-sm font-black text-foreground flex items-center gap-1.5">
          <Plus class="w-4 h-4 text-primary" />
          <span>สร้างกลุ่มตัวเลือกใหม่ (เช่น เลือกประเภทเนื้อสัตว์, ระดับความหวาน)</span>
        </h2>
        
        <button 
          type="button"
          @click.prevent="translateNewGroup"
          :disabled="isTranslatingGroup || !newGroup.name_th"
          class="inline-flex items-center gap-1.5 px-3 py-1 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-xl text-xs font-bold transition-colors disabled:opacity-50"
        >
          <Sparkles class="w-3.5 h-3.5 text-purple-600" :class="isTranslatingGroup ? 'animate-spin' : ''" />
          <span>{{ isTranslatingGroup ? 'กำลังแปล...' : '✨ แปลภาษา AI' }}</span>
        </button>
      </div>

      <form @submit.prevent="addGroup" class="space-y-4">
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label class="block text-xs font-bold text-foreground mb-1">
              ชื่อกลุ่ม (ภาษาไทย) <span class="text-rose-500">*</span>
            </label>
            <input 
              v-model="newGroup.name_th" 
              type="text" 
              placeholder="เช่น เลือกเนื้อสัตว์, ท็อปปิ้งพิเศษ" 
              required
              class="w-full px-3.5 py-2 bg-muted/40 border rounded-xl text-xs focus:ring-2 focus:ring-primary/20 focus:border-primary outline-hidden"
            />
          </div>

          <div>
            <label class="block text-xs font-bold text-foreground mb-1">
              ชื่อกลุ่ม (English)
            </label>
            <input 
              v-model="newGroup.name_en" 
              type="text" 
              placeholder="e.g. Choice of Meat, Toppings"
              class="w-full px-3.5 py-2 bg-muted/40 border rounded-xl text-xs focus:ring-2 focus:ring-primary/20 focus:border-primary outline-hidden"
            />
          </div>

          <div>
            <label class="block text-xs font-bold text-foreground mb-1">
              ชื่อกลุ่ม (中文)
            </label>
            <input 
              v-model="newGroup.name_zh" 
              type="text" 
              placeholder="例如 肉类选择, 配料"
              class="w-full px-3.5 py-2 bg-muted/40 border rounded-xl text-xs focus:ring-2 focus:ring-primary/20 focus:border-primary outline-hidden"
            />
          </div>
        </div>

        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
          <label class="flex items-center gap-2 cursor-pointer">
            <input 
              v-model="newGroup.is_required" 
              type="checkbox" 
              class="w-4 h-4 rounded text-primary focus:ring-primary"
            />
            <span class="text-xs font-bold text-foreground">
              จำเป็นต้องเลือก (Required - ลูกค้าต้องเลือกก่อนกดสั่งอาหาร)
            </span>
          </label>

          <button 
            type="submit" 
            :disabled="addingGroup || !newGroup.name_th.trim()"
            class="px-6 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground font-black text-xs rounded-xl shadow-xs disabled:opacity-50 transition-all flex items-center justify-center gap-1.5"
          >
            <Plus class="w-4 h-4" />
            <span>{{ addingGroup ? 'กำลังบันทึก...' : 'สร้างกลุ่มตัวเลือก' }}</span>
          </button>
        </div>
      </form>
    </div>

    <!-- 3. Groups & Options List -->
    <div v-if="loading" class="p-8 text-center text-muted-foreground text-xs animate-pulse">
      กำลังโหลดกลุ่มตัวเลือก...
    </div>

    <div v-else-if="groups.length === 0" class="p-12 text-center space-y-2 bg-card border rounded-3xl text-muted-foreground">
      <div class="text-3xl opacity-50">🎛️</div>
      <p class="text-xs font-bold">ยังไม่มีกลุ่มตัวเลือกพิเศษในร้าน</p>
    </div>

    <div v-else class="space-y-4">
      <div 
        v-for="group in groups" 
        :key="group.id"
        class="bg-card border rounded-3xl overflow-hidden shadow-xs space-y-4 p-5"
      >
        <!-- Group Header -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-black">
              <Tag class="w-5 h-5" />
            </div>
            <div>
              <div class="flex items-center gap-2">
                <h3 class="font-black text-sm text-foreground">{{ group.name_th }}</h3>
                <span 
                  class="px-2 py-0.5 rounded-full text-[10px] font-black"
                  :class="group.is_required ? 'bg-rose-100 text-rose-800 border border-rose-200' : 'bg-slate-100 text-slate-700'"
                >
                  {{ group.is_required ? '★ บังคับเลือก' : 'เลือกหรือไม่ก็ได้' }}
                </span>
              </div>
              <p class="text-xs text-muted-foreground mt-0.5">
                <span v-if="group.name_en">{{ group.name_en }}</span>
                <span v-if="group.name_en && group.name_zh"> • </span>
                <span v-if="group.name_zh">{{ group.name_zh }}</span>
              </p>
            </div>
          </div>

          <div class="flex items-center gap-2 self-end sm:self-auto">
            <button 
              type="button" 
              @click="openEditGroup(group)"
              class="p-2 bg-muted hover:bg-muted/80 text-foreground font-bold text-xs rounded-xl transition-colors inline-flex items-center gap-1"
            >
              <Edit class="w-3.5 h-3.5" />
              <span>แก้ไขกลุ่ม</span>
            </button>
            <button 
              type="button" 
              @click="deleteGroup(group)"
              class="p-2 bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold text-xs rounded-xl transition-colors inline-flex items-center gap-1"
            >
              <Trash2 class="w-3.5 h-3.5" />
              <span>ลบกลุ่ม</span>
            </button>
          </div>
        </div>

        <!-- Options in this Group -->
        <div class="space-y-2">
          <p class="text-xs font-bold text-muted-foreground flex items-center gap-1">
            <span>ตัวเลือกในกลุ่มนี้ ({{ group.customization_options?.length || 0 }} รายการ):</span>
          </p>

          <div v-if="!group.customization_options?.length" class="p-4 bg-muted/20 border border-dashed rounded-2xl text-center text-xs text-muted-foreground">
            ยังไม่มีตัวเลือกย่อยในกลุ่มนี้ เพิ่มตัวเลือกด้านล่างได้เลย
          </div>

          <div v-else class="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div 
              v-for="opt in group.customization_options" 
              :key="opt.id"
              class="flex items-center justify-between p-3 bg-muted/30 border rounded-2xl text-xs"
            >
              <div class="min-w-0 flex-1 pr-2">
                <p class="font-black text-foreground truncate">{{ opt.name_th }}</p>
                <p class="text-[11px] text-muted-foreground truncate" v-if="opt.name_en || opt.name_zh">
                  {{ opt.name_en }} <span v-if="opt.name_zh">• {{ opt.name_zh }}</span>
                </p>
              </div>

              <div class="flex items-center gap-2 shrink-0">
                <span class="px-2 py-0.5 bg-background border rounded-lg font-black text-primary text-[11px]">
                  {{ formatPrice(opt.price_delta || opt.extra_price) }}
                </span>

                <button 
                  type="button" 
                  @click="openEditOption(opt)"
                  class="p-1 text-muted-foreground hover:text-foreground"
                >
                  <Edit class="w-3.5 h-3.5" />
                </button>

                <button 
                  type="button" 
                  @click="deleteOption(opt)"
                  class="p-1 text-muted-foreground hover:text-rose-600"
                >
                  <Trash2 class="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Add Option Inline Form -->
        <div class="bg-muted/10 border border-dashed rounded-2xl p-4 space-y-3">
          <div class="flex items-center justify-between">
            <span class="text-xs font-bold text-foreground flex items-center gap-1">
              <Plus class="w-3.5 h-3.5 text-primary" />
              <span>เพิ่มตัวเลือกในกลุ่ม "{{ group.name_th }}"</span>
            </span>

            <button 
              type="button"
              @click.prevent="translateNewOption"
              :disabled="isTranslatingOption || !newOption.name_th"
              class="inline-flex items-center gap-1 px-2.5 py-0.5 bg-purple-50 text-purple-700 rounded-lg text-[11px] font-bold"
            >
              <Sparkles class="w-3 h-3 text-purple-600" />
              <span>แปล AI</span>
            </button>
          </div>

          <form @submit.prevent="addOption(group.id)" class="space-y-3">
            <div class="grid grid-cols-1 sm:grid-cols-4 gap-2">
              <input 
                v-model="newOption.name_th" 
                type="text" 
                placeholder="ชื่อตัวเลือก (ไทย) *" 
                required
                class="px-3 py-2 bg-background border rounded-xl text-xs"
              />
              <input 
                v-model="newOption.name_en" 
                type="text" 
                placeholder="English (เช่น Pork / Egg)" 
                class="px-3 py-2 bg-background border rounded-xl text-xs"
              />
              <input 
                v-model="newOption.name_zh" 
                type="text" 
                placeholder="中文" 
                class="px-3 py-2 bg-background border rounded-xl text-xs"
              />
              <div class="flex gap-2">
                <input 
                  v-model="newOption.extra_price" 
                  type="number" 
                  min="0"
                  placeholder="+ราคา (฿)" 
                  class="w-24 px-3 py-2 bg-background border rounded-xl text-xs font-bold"
                />
                <button 
                  type="submit" 
                  :disabled="addingOption || !newOption.name_th.trim()"
                  class="flex-1 px-3 py-2 bg-primary text-primary-foreground font-bold text-xs rounded-xl shadow-2xs shrink-0"
                >
                  + เพิ่ม
                </button>
              </div>
            </div>
          </form>
        </div>

      </div>
    </div>

    <!-- 4. Edit Group Modal -->
    <div 
      v-if="editingGroup" 
      class="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
    >
      <div class="bg-card w-full max-w-md rounded-3xl p-6 shadow-2xl border space-y-4">
        <div class="flex items-center justify-between border-b pb-3">
          <h3 class="text-sm font-black text-foreground">แก้ไขกลุ่มตัวเลือก</h3>
          <button @click="editingGroup = null" class="p-1 rounded-lg hover:bg-muted text-muted-foreground">
            <X class="w-4 h-4" />
          </button>
        </div>

        <form @submit.prevent="updateGroup" class="space-y-3">
          <div>
            <label class="block text-xs font-bold text-foreground mb-1">ชื่อกลุ่ม (ไทย) *</label>
            <input v-model="editGroupForm.name_th" type="text" required class="w-full px-3 py-2 bg-muted/40 border rounded-xl text-xs" />
          </div>
          <div>
            <label class="block text-xs font-bold text-foreground mb-1">English</label>
            <input v-model="editGroupForm.name_en" type="text" class="w-full px-3 py-2 bg-muted/40 border rounded-xl text-xs" />
          </div>
          <div>
            <label class="block text-xs font-bold text-foreground mb-1">中文</label>
            <input v-model="editGroupForm.name_zh" type="text" class="w-full px-3 py-2 bg-muted/40 border rounded-xl text-xs" />
          </div>
          <label class="flex items-center gap-2 pt-1 cursor-pointer">
            <input v-model="editGroupForm.is_required" type="checkbox" class="w-4 h-4 rounded text-primary" />
            <span class="text-xs font-bold text-foreground">จำเป็นต้องเลือก (Required)</span>
          </label>

          <div class="flex justify-end gap-2 pt-3">
            <button type="button" @click="editingGroup = null" class="px-4 py-2 bg-muted text-foreground font-bold text-xs rounded-xl">ยกเลิก</button>
            <button type="submit" :disabled="isUpdatingGroup" class="px-5 py-2 bg-primary text-primary-foreground font-black text-xs rounded-xl">
              {{ isUpdatingGroup ? 'กำลังบันทึก...' : 'บันทึก' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- 5. Edit Option Modal -->
    <div 
      v-if="editingOption" 
      class="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
    >
      <div class="bg-card w-full max-w-md rounded-3xl p-6 shadow-2xl border space-y-4">
        <div class="flex items-center justify-between border-b pb-3">
          <h3 class="text-sm font-black text-foreground">แก้ไขตัวเลือกย่อย</h3>
          <button @click="editingOption = null" class="p-1 rounded-lg hover:bg-muted text-muted-foreground">
            <X class="w-4 h-4" />
          </button>
        </div>

        <form @submit.prevent="updateOption" class="space-y-3">
          <div>
            <label class="block text-xs font-bold text-foreground mb-1">ชื่อตัวเลือก (ไทย) *</label>
            <input v-model="editOptionForm.name_th" type="text" required class="w-full px-3 py-2 bg-muted/40 border rounded-xl text-xs" />
          </div>
          <div>
            <label class="block text-xs font-bold text-foreground mb-1">English</label>
            <input v-model="editOptionForm.name_en" type="text" class="w-full px-3 py-2 bg-muted/40 border rounded-xl text-xs" />
          </div>
          <div>
            <label class="block text-xs font-bold text-foreground mb-1">中文</label>
            <input v-model="editOptionForm.name_zh" type="text" class="w-full px-3 py-2 bg-muted/40 border rounded-xl text-xs" />
          </div>
          <div>
            <label class="block text-xs font-bold text-foreground mb-1">ราคาบวกเพิ่ม (+฿)</label>
            <input v-model="editOptionForm.extra_price" type="number" min="0" class="w-full px-3 py-2 bg-muted/40 border rounded-xl text-xs font-bold" />
          </div>

          <div class="flex justify-end gap-2 pt-3">
            <button type="button" @click="editingOption = null" class="px-4 py-2 bg-muted text-foreground font-bold text-xs rounded-xl">ยกเลิก</button>
            <button type="submit" :disabled="isUpdatingOption" class="px-5 py-2 bg-primary text-primary-foreground font-black text-xs rounded-xl">
              {{ isUpdatingOption ? 'กำลังบันทึก...' : 'บันทึก' }}
            </button>
          </div>
        </form>
      </div>
    </div>

  </div>
</template>
