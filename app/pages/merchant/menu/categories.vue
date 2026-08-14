<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { 
  Plus, 
  Layers, 
  Edit, 
  Trash2, 
  ArrowUp, 
  ArrowDown, 
  Sparkles, 
  Eye, 
  EyeOff, 
  Check, 
  X,
  ArrowLeft,
  Search
} from 'lucide-vue-next'

definePageMeta({
  layout: 'merchant',
  middleware: ['auth']
})

const client = useSupabaseClient()
const { store, fetchStore } = useCurrentStore()

const loading = ref(true)
const categories = ref<any[]>([])
const isTranslating = ref(false)
const addingCategory = ref(false)

// New Category Form State
const newCategory = ref({
  name_th: '',
  name_en: '',
  name_zh: ''
})

// Edit Category Modal State
const editingCategory = ref<any>(null)
const editForm = ref({
  id: '',
  name_th: '',
  name_en: '',
  name_zh: '',
  is_active: true
})
const isTranslatingEdit = ref(false)
const isUpdating = ref(false)

onMounted(async () => {
  if (!store.value) {
    await fetchStore()
  }
  
  if (store.value?.id) {
    await fetchCategories()
  }
  
  loading.value = false
})

const fetchCategories = async () => {
  const { data } = await (client as any)
    .from('menu_categories')
    .select('*, menu_items(count)')
    .eq('store_id', store.value.id)
    .order('sort_order', { ascending: true })
    
  categories.value = data || []
}

// === AI Translation Helper ===
const translateCategory = async (isEdit = false) => {
  const targetForm = isEdit ? editForm.value : newCategory.value
  if (!targetForm.name_th.trim()) return
  
  if (isEdit) isTranslatingEdit.value = true
  else isTranslating.value = true

  try {
    const response = await fetch('/api/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        name_th: targetForm.name_th,
        description_th: ''
      })
    })
    
    const data = await response.json()
    if (data && !data.error) {
      if (data.name_en) targetForm.name_en = data.name_en
      if (data.name_zh) targetForm.name_zh = data.name_zh
    }
  } catch (error) {
    console.error('Translation error:', error)
  } finally {
    if (isEdit) isTranslatingEdit.value = false
    else isTranslating.value = false
  }
}

// === Add Category (บันทึกหมวดหมู่ใหม่) ===
const addCategory = async () => {
  if (!newCategory.value.name_th.trim() || !store.value) return
  
  addingCategory.value = true
  
  // Auto translate if missing
  if (!newCategory.value.name_en || !newCategory.value.name_zh) {
    await translateCategory(false)
  }
  
  // Check Duplicate
  const { count: dupCount } = await (client as any)
    .from('menu_categories')
    .select('*', { count: 'exact', head: true })
    .eq('store_id', store.value.id)
    .eq('name_th', newCategory.value.name_th.trim())
    
  if (dupCount && dupCount > 0) {
    addingCategory.value = false
    const swal = useAlert()
    swal.fire({
      title: 'หมวดหมู่ซ้ำ',
      text: `คุณมีหมวดหมู่ชื่อ "${newCategory.value.name_th}" ในร้านแล้ว`,
      icon: 'error'
    })
    return
  }
  
  const { error } = await (client as any).from('menu_categories').insert({
    store_id: store.value.id,
    name_th: newCategory.value.name_th.trim(),
    name_en: newCategory.value.name_en?.trim() || null,
    name_zh: newCategory.value.name_zh?.trim() || null,
    sort_order: categories.value.length,
    is_active: true
  })
  
  addingCategory.value = false
  const swal = useAlert()
  
  if (!error) {
    swal.fire({
      title: 'สำเร็จ!',
      text: 'เพิ่มหมวดหมู่เรียบร้อยแล้ว',
      icon: 'success',
      timer: 1200,
      showConfirmButton: false
    })
    newCategory.value = { name_th: '', name_en: '', name_zh: '' }
    await fetchCategories()
  } else {
    swal.fire('Error', 'ไม่สามารถเพิ่มหมวดหมู่ได้', 'error')
  }
}

// === Edit Category (แก้ไขหมวดหมู่) ===
const openEditModal = (cat: any) => {
  editingCategory.value = cat
  editForm.value = {
    id: cat.id,
    name_th: cat.name_th || '',
    name_en: cat.name_en || '',
    name_zh: cat.name_zh || '',
    is_active: cat.is_active !== false
  }
}

const updateCategory = async () => {
  if (!editForm.value.name_th.trim() || !editForm.value.id) return

  isUpdating.value = true
  const { error } = await (client as any)
    .from('menu_categories')
    .update({
      name_th: editForm.value.name_th.trim(),
      name_en: editForm.value.name_en?.trim() || null,
      name_zh: editForm.value.name_zh?.trim() || null,
      is_active: editForm.value.is_active
    })
    .eq('id', editForm.value.id)

  isUpdating.value = false
  if (!error) {
    editingCategory.value = null
    const swal = useAlert()
    swal.fire({
      title: 'บันทึกสำเร็จ!',
      icon: 'success',
      timer: 1200,
      showConfirmButton: false
    })
    await fetchCategories()
  } else {
    alert('ไม่สามารถอัปเดตหมวดหมู่ได้')
  }
}

// === Toggle Active State (เปิด/ปิด หมวดหมู่) ===
const toggleCategoryActive = async (cat: any) => {
  const newStatus = cat.is_active === false ? true : false
  cat.is_active = newStatus // Optimistic
  
  const { error } = await (client as any)
    .from('menu_categories')
    .update({ is_active: newStatus })
    .eq('id', cat.id)

  if (error) {
    cat.is_active = !newStatus
    alert('ไม่สามารถเปลี่ยนสถานะได้')
  }
}

// === Reorder (จัดลำดับ ขึ้น/ลง) ===
const moveCategory = async (index: number, direction: 'up' | 'down') => {
  const targetIndex = direction === 'up' ? index - 1 : index + 1
  if (targetIndex < 0 || targetIndex >= categories.value.length) return

  const itemA = categories.value[index]
  const itemB = categories.value[targetIndex]

  // Swap in array
  categories.value[index] = itemB
  categories.value[targetIndex] = itemA

  // Update DB sort_orders
  await Promise.all([
    (client as any).from('menu_categories').update({ sort_order: targetIndex }).eq('id', itemA.id),
    (client as any).from('menu_categories').update({ sort_order: index }).eq('id', itemB.id)
  ])
}

// === Delete Category (ลบหมวดหมู่) ===
const deleteCategory = async (cat: any) => {
  const swal = useAlert()
  const result = await swal.fire({
    title: 'ยืนยันการลบหมวดหมู่?',
    text: `ต้องการลบหมวดหมู่ "${cat.name_th}" ใช่หรือไม่? (เมนูในหมวดนี้จะไม่ถูกลบ แต่จะกลายเป็นไม่มีหมวดหมู่)`,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#e11d48',
    cancelButtonColor: '#64748b',
    confirmButtonText: 'ใช่, ลบเลย!',
    cancelButtonText: 'ยกเลิก'
  })
  
  if (!result.isConfirmed) return
  
  await (client as any).from('menu_categories').delete().eq('id', cat.id)
  await fetchCategories()
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
          <Layers class="w-6 h-6 text-primary" />
          <span>จัดการหมวดหมู่เมนู (Categories)</span>
        </h1>
        <p class="text-xs text-muted-foreground mt-0.5">
          จัดกลุ่มอาหารเพื่อให้นักท่องเที่ยวเลือกดูเมนูได้ง่ายและรวดเร็ว
        </p>
      </div>
    </div>

    <!-- 2. Add Category Card -->
    <div class="bg-card border rounded-3xl p-6 shadow-xs space-y-4">
      <div class="flex items-center justify-between border-b pb-3">
        <h2 class="text-sm font-black text-foreground flex items-center gap-1.5">
          <Plus class="w-4 h-4 text-primary" />
          <span>เพิ่มหมวดหมู่ใหม่</span>
        </h2>
        
        <button 
          type="button"
          @click.prevent="translateCategory(false)"
          :disabled="isTranslating || !newCategory.name_th"
          class="inline-flex items-center gap-1.5 px-3 py-1 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-xl text-xs font-bold transition-colors disabled:opacity-50"
        >
          <Sparkles class="w-3.5 h-3.5 text-purple-600" :class="isTranslating ? 'animate-spin' : ''" />
          <span>{{ isTranslating ? 'กำลังแปล...' : '✨ แปลภาษา AI' }}</span>
        </button>
      </div>

      <form @submit.prevent="addCategory" class="space-y-4">
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label class="block text-xs font-bold text-foreground mb-1">
              ชื่อภาษาไทย <span class="text-rose-500">*</span>
            </label>
            <input 
              v-model="newCategory.name_th" 
              type="text" 
              placeholder="เช่น อาหารจานเดียว, ต้ม/แกง" 
              required
              class="w-full px-3.5 py-2 bg-muted/40 border rounded-xl text-xs focus:ring-2 focus:ring-primary/20 focus:border-primary outline-hidden"
            />
          </div>

          <div>
            <label class="block text-xs font-bold text-foreground mb-1">
              ชื่อภาษาอังกฤษ (English)
            </label>
            <input 
              v-model="newCategory.name_en" 
              type="text" 
              placeholder="e.g. Single Dish, Soups"
              class="w-full px-3.5 py-2 bg-muted/40 border rounded-xl text-xs focus:ring-2 focus:ring-primary/20 focus:border-primary outline-hidden"
            />
          </div>

          <div>
            <label class="block text-xs font-bold text-foreground mb-1">
              ชื่อภาษาจีน (中文)
            </label>
            <input 
              v-model="newCategory.name_zh" 
              type="text" 
              placeholder="例如 单碟菜, 汤类"
              class="w-full px-3.5 py-2 bg-muted/40 border rounded-xl text-xs focus:ring-2 focus:ring-primary/20 focus:border-primary outline-hidden"
            />
          </div>
        </div>

        <div class="flex justify-end pt-2">
          <button 
            type="submit" 
            :disabled="addingCategory || !newCategory.name_th.trim()"
            class="px-6 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground font-black text-xs rounded-xl shadow-xs disabled:opacity-50 transition-all flex items-center gap-1.5"
          >
            <Plus class="w-4 h-4" />
            <span>{{ addingCategory ? 'กำลังบันทึก...' : 'เพิ่มหมวดหมู่' }}</span>
          </button>
        </div>
      </form>
    </div>

    <!-- 3. Categories List -->
    <div class="bg-card border rounded-3xl overflow-hidden shadow-xs">
      <div class="p-4 bg-muted/30 border-b flex items-center justify-between">
        <h3 class="text-xs font-black text-foreground">
          รายการหมวดหมู่ทั้งหมด ({{ categories.length }} หมวด)
        </h3>
        <span class="text-[11px] text-muted-foreground">จัดลำดับโดยใช้ปุ่มลูกศร ขึ้น / ลง</span>
      </div>

      <div v-if="loading" class="p-8 text-center text-muted-foreground text-xs animate-pulse">
        กำลังโหลดหมวดหมู่...
      </div>

      <div v-else-if="categories.length === 0" class="p-12 text-center space-y-2 text-muted-foreground">
        <div class="text-3xl opacity-50">📂</div>
        <p class="text-xs font-bold">ยังไม่มีหมวดหมู่เมนูในร้าน</p>
      </div>

      <ul v-else class="divide-y">
        <li 
          v-for="(cat, index) in categories" 
          :key="cat.id" 
          class="p-4 hover:bg-muted/20 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
          :class="cat.is_active === false ? 'opacity-60 bg-slate-50/50 dark:bg-neutral-900/50' : ''"
        >
          <!-- Category Info -->
          <div class="flex items-center gap-3">
            <!-- Sort Order Number Badge -->
            <div class="w-7 h-7 rounded-lg bg-muted flex items-center justify-center text-xs font-black text-muted-foreground shrink-0">
              {{ index + 1 }}
            </div>

            <div>
              <div class="flex items-center gap-2">
                <span class="font-black text-sm text-foreground">{{ cat.name_th }}</span>
                <span 
                  class="px-2 py-0.5 rounded-full text-[10px] font-black"
                  :class="cat.is_active !== false ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'"
                >
                  {{ cat.is_active !== false ? 'เปิดใช้งาน' : 'ซ่อนหมวดนี้' }}
                </span>
                <span class="px-2 py-0.5 bg-muted rounded-md text-[10px] font-bold text-muted-foreground">
                  {{ cat.menu_items?.[0]?.count || 0 }} เมนู
                </span>
              </div>

              <p class="text-xs text-muted-foreground mt-0.5">
                <span v-if="cat.name_en">{{ cat.name_en }}</span>
                <span v-if="cat.name_en && cat.name_zh"> • </span>
                <span v-if="cat.name_zh">{{ cat.name_zh }}</span>
              </p>
            </div>
          </div>

          <!-- Action Buttons -->
          <div class="flex items-center gap-1.5 self-end sm:self-auto">
            <!-- Sort Up -->
            <button 
              type="button" 
              @click="moveCategory(index, 'up')" 
              :disabled="index === 0"
              class="p-1.5 rounded-lg border bg-background hover:bg-muted disabled:opacity-30 transition-colors"
              title="เลื่อนขึ้น"
            >
              <ArrowUp class="w-3.5 h-3.5" />
            </button>

            <!-- Sort Down -->
            <button 
              type="button" 
              @click="moveCategory(index, 'down')" 
              :disabled="index === categories.length - 1"
              class="p-1.5 rounded-lg border bg-background hover:bg-muted disabled:opacity-30 transition-colors"
              title="เลื่อนลง"
            >
              <ArrowDown class="w-3.5 h-3.5" />
            </button>

            <!-- Toggle Active Switch -->
            <button 
              type="button"
              @click="toggleCategoryActive(cat)"
              class="px-2.5 py-1.5 rounded-xl text-xs font-bold transition-colors inline-flex items-center gap-1 ml-1"
              :class="cat.is_active !== false ? 'bg-slate-100 hover:bg-slate-200 text-slate-700' : 'bg-emerald-100 hover:bg-emerald-200 text-emerald-800'"
              :title="cat.is_active !== false ? 'กดเพื่อซ่อนหมวดนี้จากเมนู' : 'กดเพื่อเปิดแสดงหมวดนี้'"
            >
              <EyeOff v-if="cat.is_active !== false" class="w-3.5 h-3.5 text-muted-foreground" />
              <Eye v-else class="w-3.5 h-3.5 text-emerald-600" />
              <span>{{ cat.is_active !== false ? 'ซ่อน' : 'แสดง' }}</span>
            </button>

            <!-- Edit Button -->
            <button 
              type="button"
              @click="openEditModal(cat)"
              class="p-1.5 bg-muted/60 hover:bg-primary hover:text-white rounded-xl text-muted-foreground transition-colors ml-1"
              title="แก้ไขหมวดหมู่"
            >
              <Edit class="w-4 h-4" />
            </button>

            <!-- Delete Button -->
            <button 
              type="button"
              @click="deleteCategory(cat)"
              class="p-1.5 bg-muted/60 hover:bg-rose-600 hover:text-white rounded-xl text-muted-foreground transition-colors"
              title="ลบหมวดหมู่"
            >
              <Trash2 class="w-4 h-4" />
            </button>
          </div>
        </li>
      </ul>
    </div>

    <!-- 4. Edit Category Modal -->
    <div 
      v-if="editingCategory" 
      class="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
    >
      <div class="bg-card w-full max-w-md rounded-3xl p-6 shadow-2xl border space-y-4 animate-in zoom-in-95 duration-200">
        <div class="flex items-center justify-between border-b pb-3">
          <h3 class="text-sm font-black text-foreground">แก้ไขหมวดหมู่เมนู</h3>
          <button @click="editingCategory = null" class="p-1 rounded-lg hover:bg-muted text-muted-foreground">
            <X class="w-4 h-4" />
          </button>
        </div>

        <form @submit.prevent="updateCategory" class="space-y-3">
          <div>
            <label class="block text-xs font-bold text-foreground mb-1">
              ชื่อภาษาไทย <span class="text-rose-500">*</span>
            </label>
            <input 
              v-model="editForm.name_th" 
              type="text" 
              required
              class="w-full px-3 py-2 bg-muted/40 border rounded-xl text-xs focus:ring-2 focus:ring-primary/20 focus:border-primary outline-hidden"
            />
          </div>

          <div>
            <label class="block text-xs font-bold text-foreground mb-1">
              ชื่อภาษาอังกฤษ (English)
            </label>
            <input 
              v-model="editForm.name_en" 
              type="text" 
              class="w-full px-3 py-2 bg-muted/40 border rounded-xl text-xs focus:ring-2 focus:ring-primary/20 focus:border-primary outline-hidden"
            />
          </div>

          <div>
            <label class="block text-xs font-bold text-foreground mb-1">
              ชื่อภาษาจีน (中文)
            </label>
            <input 
              v-model="editForm.name_zh" 
              type="text" 
              class="w-full px-3 py-2 bg-muted/40 border rounded-xl text-xs focus:ring-2 focus:ring-primary/20 focus:border-primary outline-hidden"
            />
          </div>

          <div class="flex items-center justify-between pt-2">
            <button 
              type="button"
              @click.prevent="translateCategory(true)"
              :disabled="isTranslatingEdit || !editForm.name_th"
              class="inline-flex items-center gap-1.5 px-3 py-1 bg-purple-50 text-purple-700 rounded-xl text-xs font-bold"
            >
              <Sparkles class="w-3.5 h-3.5 text-purple-600" :class="isTranslatingEdit ? 'animate-spin' : ''" />
              <span>แปลภาษา AI</span>
            </button>

            <div class="flex items-center gap-2">
              <button 
                type="button" 
                @click="editingCategory = null"
                class="px-4 py-2 bg-muted text-foreground font-bold text-xs rounded-xl"
              >
                ยกเลิก
              </button>
              <button 
                type="submit" 
                :disabled="isUpdating || !editForm.name_th.trim()"
                class="px-5 py-2 bg-primary text-primary-foreground font-black text-xs rounded-xl shadow-xs"
              >
                {{ isUpdating ? 'กำลังบันทึก...' : 'บันทึกการแก้ไข' }}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>

  </div>
</template>
