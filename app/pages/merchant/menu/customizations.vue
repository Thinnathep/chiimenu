<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
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
  AlertCircle,
  Search,
  CheckCircle2,
  Filter,
  Eye,
  DollarSign
} from 'lucide-vue-next'

definePageMeta({
  layout: 'merchant',
  middleware: ['auth']
})

const client = useSupabaseClient()
const { store, fetchStore } = useCurrentStore()
const { locale, t } = useI18n()
const swal = useAlert()

const loading = ref(true)
const groups = ref<any[]>([])

// Search & Filter State
const searchQuery = ref('')
const selectedFilter = ref<'all' | 'required' | 'optional' | 'paid' | 'free'>('all')

// Accordion (Expand / Collapse) State
const collapsedGroups = ref<Record<string, boolean>>({})

// New Group Form State (Collapsible)
const isAddGroupOpen = ref(false)
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

// Isolated Per-Group New Option Form State
const newOptions = ref<Record<string, {
  name_th: string
  name_en: string
  name_zh: string
  extra_price: number | string
  isTranslating: boolean
  isAdding: boolean
}>>({})

const getNewOption = (groupId: string) => {
  if (!newOptions.value[groupId]) {
    newOptions.value[groupId] = {
      name_th: '',
      name_en: '',
      name_zh: '',
      extra_price: 0,
      isTranslating: false,
      isAdding: false
    }
  }
  return newOptions.value[groupId]
}

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
  const { data, error } = await (client as any)
    .from('customization_groups')
    .select(`
      *,
      customization_options (*)
    `)
    .eq('store_id', store.value.id)
    .order('created_at', { ascending: true })
    
  if (error) {
    console.error('Fetch customization groups error:', error)
    return
  }

  if (data) {
    (data as any[]).forEach(group => {
      if (group.customization_options) {
        group.customization_options.sort((a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0))
      }
    })
  }
  
  groups.value = data || []
}

// === Accordion Toggle Helpers (Default: Collapsed for Clean Screen) ===
const toggleGroupCollapse = (groupId: string) => {
  collapsedGroups.value[groupId] = !isGroupCollapsed(groupId)
}

const expandAllGroups = () => {
  const next: Record<string, boolean> = {}
  groups.value.forEach(g => {
    next[g.id] = false
  })
  collapsedGroups.value = next
}

const collapseAllGroups = () => {
  const next: Record<string, boolean> = {}
  groups.value.forEach(g => {
    next[g.id] = true
  })
  collapsedGroups.value = next
}

const isGroupCollapsed = (groupId: string): boolean => {
  return collapsedGroups.value[groupId] !== false
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

const translateNewOptionForGroup = async (groupId: string) => {
  const optState = getNewOption(groupId)
  if (!optState.name_th.trim()) return
  optState.isTranslating = true
  const res = await translateText(optState.name_th)
  if (res.name_en) optState.name_en = res.name_en
  if (res.name_zh) optState.name_zh = res.name_zh
  optState.isTranslating = false
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
    swal.fire({ title: 'เพิ่มกลุ่มสำเร็จ!', icon: 'success', timer: 1200, showConfirmButton: false })
    newGroup.value = { name_th: '', name_en: '', name_zh: '', is_required: false }
    await fetchGroups()
  } else {
    swal.fire({ title: 'เกิดข้อผิดพลาด', text: error.message || 'ไม่สามารถเพิ่มกลุ่มตัวเลือกได้', icon: 'error' })
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
    swal.fire({ title: 'บันทึกสำเร็จ!', icon: 'success', timer: 1200, showConfirmButton: false })
    await fetchGroups()
  } else {
    swal.fire({ title: 'เกิดข้อผิดพลาด', text: error.message || 'ไม่สามารถอัปเดตกลุ่มได้', icon: 'error' })
  }
}

const deleteGroup = async (group: any) => {
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

  const { error } = await (client as any).from('customization_groups').delete().eq('id', group.id)
  if (!error) {
    swal.fire({ title: 'ลบสำเร็จ!', icon: 'success', timer: 1200, showConfirmButton: false })
    await fetchGroups()
  } else {
    swal.fire({ title: 'เกิดข้อผิดพลาด', text: error.message || 'ไม่สามารถลบกลุ่มได้', icon: 'error' })
  }
}

// === Option Actions (ตัวเลือกย่อย +ราคา) ===
const addOption = async (groupId: string) => {
  const optState = getNewOption(groupId)
  if (!optState.name_th.trim()) return
  optState.isAdding = true

  if (!optState.name_en || !optState.name_zh) {
    await translateNewOptionForGroup(groupId)
  }

  // Use extra_price (NOT price_delta) to match database schema
  const { error } = await (client as any).from('customization_options').insert({
    group_id: groupId,
    name_th: optState.name_th.trim(),
    name_en: optState.name_en?.trim() || null,
    name_zh: optState.name_zh?.trim() || null,
    extra_price: Number(optState.extra_price || 0),
    sort_order: (groups.value.find(g => g.id === groupId)?.customization_options?.length || 0) + 1
  })

  optState.isAdding = false
  if (!error) {
    optState.name_th = ''
    optState.name_en = ''
    optState.name_zh = ''
    optState.extra_price = 0
    swal.fire({ title: 'เพิ่มตัวเลือกสำเร็จ!', icon: 'success', timer: 1000, showConfirmButton: false })
    await fetchGroups()
  } else {
    swal.fire({ title: 'เกิดข้อผิดพลาด', text: error.message || 'ไม่สามารถเพิ่มตัวเลือกได้', icon: 'error' })
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
    extra_price: Number(opt.extra_price !== undefined ? opt.extra_price : (opt.price_delta || 0))
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
      extra_price: Number(editOptionForm.value.extra_price || 0)
    })
    .eq('id', editOptionForm.value.id)

  isUpdatingOption.value = false
  if (!error) {
    editingOption.value = null
    swal.fire({ title: 'บันทึกสำเร็จ!', icon: 'success', timer: 1000, showConfirmButton: false })
    await fetchGroups()
  } else {
    swal.fire({ title: 'เกิดข้อผิดพลาด', text: error.message || 'ไม่สามารถอัปเดตตัวเลือกได้', icon: 'error' })
  }
}

const deleteOption = async (opt: any) => {
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

  const { error } = await (client as any).from('customization_options').delete().eq('id', opt.id)
  if (!error) {
    swal.fire({ title: 'ลบสำเร็จ!', icon: 'success', timer: 1000, showConfirmButton: false })
    await fetchGroups()
  } else {
    swal.fire({ title: 'เกิดข้อผิดพลาด', text: error.message || 'ไม่สามารถลบตัวเลือกได้', icon: 'error' })
  }
}

// === Filtered & Searched Groups Computed ===
const filteredGroups = computed(() => {
  let result = groups.value

  // 1. Filter by required / optional / price filter
  if (selectedFilter.value === 'required') {
    result = result.filter(g => g.is_required)
  } else if (selectedFilter.value === 'optional') {
    result = result.filter(g => !g.is_required)
  } else if (selectedFilter.value === 'paid') {
    result = result.filter(g => g.customization_options?.some((o: any) => Number(o.extra_price || o.price_delta || 0) > 0))
  } else if (selectedFilter.value === 'free') {
    result = result.filter(g => g.customization_options?.length > 0 && g.customization_options?.every((o: any) => Number(o.extra_price || o.price_delta || 0) === 0))
  }

  // 2. Filter by search query across group names & child option names
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase().trim()
    result = result.filter(g => {
      const gTh = (g.name_th || '').toLowerCase()
      const gEn = (g.name_en || '').toLowerCase()
      const gZh = (g.name_zh || '').toLowerCase()
      const matchGroup = gTh.includes(q) || gEn.includes(q) || gZh.includes(q)
      
      const matchOption = g.customization_options?.some((o: any) => {
        const oTh = (o.name_th || '').toLowerCase()
        const oEn = (o.name_en || '').toLowerCase()
        const oZh = (o.name_zh || '').toLowerCase()
        return oTh.includes(q) || oEn.includes(q) || oZh.includes(q)
      })

      return matchGroup || matchOption
    })
  }

  return result
})

// === Stats Computed ===
const stats = computed(() => {
  const totalGroups = groups.value.length
  let totalOptions = 0
  let paidOptionsCount = 0
  let freeOptionsCount = 0

  groups.value.forEach(g => {
    (g.customization_options || []).forEach((o: any) => {
      totalOptions++
      if (Number(o.extra_price || o.price_delta || 0) > 0) {
        paidOptionsCount++
      } else {
        freeOptionsCount++
      }
    })
  })

  return {
    totalGroups,
    totalOptions,
    paidOptionsCount,
    freeOptionsCount
  }
})

const getGroupDisplayName = (group: any) => {
  if (!group) return ''
  const l = locale.value
  if (l === 'en' && group.name_en) return group.name_en
  if (l === 'zh' && group.name_zh) return group.name_zh
  return group.name_th || group.name_en || group.name_zh || ''
}

const getOptionSummaryText = (group: any) => {
  const opts = group.customization_options || []
  if (opts.length === 0) return 'ยังไม่มีตัวเลือกย่อย'
  const names = opts.map((o: any) => {
    const price = Number(o.extra_price !== undefined ? o.extra_price : (o.price_delta || 0))
    const priceTag = price > 0 ? ` (+฿${price})` : ''
    return `${o.name_th}${priceTag}`
  })
  return names.slice(0, 4).join(', ') + (names.length > 4 ? ` และอีก ${names.length - 4} รายการ` : '')
}

const formatPrice = (price: any) => {
  const num = Number(price || 0)
  return num > 0 ? `+฿${num}` : 'ฟรี (฿0)'
}
</script>

<template>
  <div class="space-y-6 pb-20 max-w-4xl mx-auto">
    
    <!-- 1. Top Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-card to-card/80 border p-5 sm:p-6 rounded-3xl shadow-xs">
      <div>
        <NuxtLink 
          to="/merchant/menu" 
          class="text-xs font-bold text-muted-foreground hover:text-foreground inline-flex items-center gap-1 mb-2"
        >
          <ArrowLeft class="w-3.5 h-3.5" />
          <span>{{ $t('cat_back_to_menu') }}</span>
        </NuxtLink>
        <h1 class="text-xl font-black text-foreground flex items-center gap-2">
          <Sliders class="w-6 h-6 text-primary" />
          <span>{{ $t('cust_title') }}</span>
        </h1>
        <p class="text-xs text-muted-foreground mt-0.5">
          {{ $t('cust_desc') }}
        </p>
      </div>

      <!-- Quick Stats Pills -->
      <div class="flex items-center gap-2 flex-wrap">
        <div class="px-3 py-1.5 bg-muted/60 border rounded-xl text-center">
          <span class="text-[10px] text-muted-foreground font-bold block leading-none">{{ $t('cust_stat_groups') }}</span>
          <span class="text-sm font-black text-foreground">{{ stats.totalGroups }}</span>
        </div>
        <div class="px-3 py-1.5 bg-primary/10 border border-primary/20 rounded-xl text-center">
          <span class="text-[10px] text-primary font-bold block leading-none">{{ $t('cust_stat_options') }}</span>
          <span class="text-sm font-black text-primary">{{ stats.totalOptions }}</span>
        </div>
      </div>
    </div>

    <!-- 2. Search & Filter Bar + Expand/Collapse Toolbar -->
    <div class="bg-card border rounded-3xl p-4 sm:p-5 shadow-xs space-y-3">
      <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <!-- Search Input -->
        <div class="relative flex-1">
          <Search class="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input 
            v-model="searchQuery" 
            type="text" 
            :placeholder="$t('cust_search_placeholder')" 
            class="w-full pl-9 pr-4 py-2.5 bg-muted/40 border rounded-2xl text-xs font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary outline-hidden"
          />
          <button 
            v-if="searchQuery" 
            @click="searchQuery = ''" 
            class="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X class="w-3.5 h-3.5" />
          </button>
        </div>

        <!-- Global Expand / Collapse Buttons -->
        <div class="flex items-center gap-1.5 shrink-0">
          <button 
            type="button" 
            @click="expandAllGroups"
            class="px-3 py-2 bg-muted/50 hover:bg-muted text-foreground rounded-xl text-xs font-bold transition-colors inline-flex items-center gap-1 border border-border/40"
          >
            <ChevronDown class="w-3.5 h-3.5 text-primary" />
            <span>{{ $t('expand_all') }}</span>
          </button>
          <button 
            type="button" 
            @click="collapseAllGroups"
            class="px-3 py-2 bg-muted/50 hover:bg-muted text-foreground rounded-xl text-xs font-bold transition-colors inline-flex items-center gap-1 border border-border/40"
          >
            <ChevronUp class="w-3.5 h-3.5 text-muted-foreground" />
            <span>{{ $t('collapse_all') }}</span>
          </button>
        </div>
      </div>

      <!-- Filter Pills -->
      <div class="flex items-center gap-1.5 overflow-x-auto hide-scrollbar pt-1">
        <button 
          @click="selectedFilter = 'all'"
          class="px-3 py-1 rounded-xl text-xs font-bold transition-all shrink-0"
          :class="selectedFilter === 'all' ? 'bg-primary text-primary-foreground shadow-2xs' : 'bg-muted/50 text-muted-foreground hover:text-foreground'"
        >
          {{ $t('filter_all_options') }} ({{ groups.length }})
        </button>
        <button 
          @click="selectedFilter = 'required'"
          class="px-3 py-1 rounded-xl text-xs font-bold transition-all shrink-0"
          :class="selectedFilter === 'required' ? 'bg-rose-500 text-white shadow-2xs' : 'bg-muted/50 text-muted-foreground hover:text-foreground'"
        >
          {{ $t('filter_required') }} ({{ groups.filter(g => g.is_required).length }})
        </button>
        <button 
          @click="selectedFilter = 'optional'"
          class="px-3 py-1 rounded-xl text-xs font-bold transition-all shrink-0"
          :class="selectedFilter === 'optional' ? 'bg-primary text-primary-foreground shadow-2xs' : 'bg-muted/50 text-muted-foreground hover:text-foreground'"
        >
          {{ $t('filter_optional') }} ({{ groups.filter(g => !g.is_required).length }})
        </button>
        <button 
          @click="selectedFilter = 'paid'"
          class="px-3 py-1 rounded-xl text-xs font-bold transition-all shrink-0"
          :class="selectedFilter === 'paid' ? 'bg-amber-500 text-white shadow-2xs' : 'bg-muted/50 text-muted-foreground hover:text-foreground'"
        >
          {{ $t('filter_paid') }} ({{ stats.paidOptionsCount }})
        </button>
        <button 
          @click="selectedFilter = 'free'"
          class="px-3 py-1 rounded-xl text-xs font-bold transition-all shrink-0"
          :class="selectedFilter === 'free' ? 'bg-emerald-600 text-white shadow-2xs' : 'bg-muted/50 text-muted-foreground hover:text-foreground'"
        >
          {{ $t('filter_free') }} ({{ stats.freeOptionsCount }})
        </button>
      </div>
    </div>

    <!-- 3. Add Group Card (Collapsible) -->
    <div class="bg-card border rounded-3xl p-4 sm:p-5 shadow-xs space-y-4">
      <div 
        @click="isAddGroupOpen = !isAddGroupOpen"
        class="flex items-center justify-between cursor-pointer select-none"
      >
        <h2 class="text-xs sm:text-sm font-bold text-foreground flex items-center gap-2">
          <span class="w-7 h-7 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
            <Plus class="w-4 h-4" />
          </span>
          <span>สร้างกลุ่มตัวเลือกใหม่ (เช่น เลือกประเภทเนื้อสัตว์, ระดับความหวาน)</span>
        </h2>
        
        <div class="flex items-center gap-2">
          <span class="text-xs font-semibold text-primary">
            {{ isAddGroupOpen ? 'ย่อแบบฟอร์ม' : '+ ขยายเพื่อเพิ่มกลุ่ม' }}
          </span>
          <ChevronDown class="w-4 h-4 text-muted-foreground transition-transform duration-200" :class="isAddGroupOpen ? 'rotate-180' : ''" />
        </div>
      </div>

      <div v-show="isAddGroupOpen" class="pt-3 border-t space-y-4 animate-in fade-in-50 duration-200">
        <div class="flex items-center justify-end">
          <button 
            type="button"
            @click.prevent="translateNewGroup"
            :disabled="isTranslatingGroup || !newGroup.name_th"
            class="inline-flex items-center gap-1.5 px-3 py-1 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-xl text-xs font-semibold transition-colors disabled:opacity-50"
          >
            <Sparkles class="w-3.5 h-3.5 text-purple-600" :class="isTranslatingGroup ? 'animate-spin' : ''" />
            <span>{{ isTranslatingGroup ? $t('cat_translating') : $t('cat_translate_ai') }}</span>
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
              class="w-full px-3.5 py-2 bg-muted/40 border rounded-xl text-xs focus:ring-2 focus:ring-primary/20 focus:border-primary outline-hidden font-medium"
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
              class="w-full px-3.5 py-2 bg-muted/40 border rounded-xl text-xs focus:ring-2 focus:ring-primary/20 focus:border-primary outline-hidden font-medium"
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
              class="w-full px-3.5 py-2 bg-muted/40 border rounded-xl text-xs focus:ring-2 focus:ring-primary/20 focus:border-primary outline-hidden font-medium"
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
    </div>

    <!-- 4. Groups & Options List (Accordion Style) -->
    <div v-if="loading" class="p-12 text-center space-y-3 bg-card border rounded-3xl">
      <div class="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
      <p class="text-xs font-bold text-muted-foreground animate-pulse">กำลังโหลดกลุ่มตัวเลือก...</p>
    </div>

    <div v-else-if="groups.length === 0" class="p-12 text-center space-y-2 bg-card border rounded-3xl text-muted-foreground">
      <div class="text-3xl opacity-50">🎛️</div>
      <p class="text-xs font-bold">ยังไม่มีกลุ่มตัวเลือกพิเศษในร้าน</p>
    </div>

    <div v-else-if="filteredGroups.length === 0" class="p-10 text-center space-y-3 bg-card border rounded-3xl text-muted-foreground">
      <div class="text-2xl">🔍</div>
      <p class="text-xs font-bold">ไม่พบกลุ่มตัวเลือกที่ตรงกับเงื่อนไขการค้นหา</p>
      <button 
        @click="searchQuery = ''; selectedFilter = 'all'" 
        class="px-4 py-1.5 bg-primary/10 text-primary rounded-xl text-xs font-bold hover:bg-primary/20 transition-colors"
      >
        {{ $t('menu_clear_filter') }}
      </button>
    </div>

    <div v-else class="space-y-4">
      <div 
        v-for="group in filteredGroups" 
        :key="group.id"
        class="bg-card border rounded-3xl overflow-hidden shadow-xs transition-all"
        :class="isGroupCollapsed(group.id) ? 'hover:border-primary/50' : 'space-y-4 p-5'"
      >
        <!-- Collapsible Header Section -->
        <div 
          @click="toggleGroupCollapse(group.id)"
          class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer select-none transition-colors"
          :class="isGroupCollapsed(group.id) ? 'p-4 sm:p-5 hover:bg-muted/20' : 'border-b pb-4'"
        >
          <div class="flex items-center gap-3">
            <div 
              class="w-10 h-10 rounded-2xl flex items-center justify-center font-bold transition-transform"
              :class="group.is_required ? 'bg-rose-500/10 text-rose-600' : 'bg-primary/10 text-primary'"
            >
              <Tag class="w-5 h-5" />
            </div>

            <div>
              <div class="flex items-center gap-2 flex-wrap">
                <h3 class="font-semibold text-sm text-foreground">{{ getGroupDisplayName(group) }}</h3>
                
                <span 
                  class="px-2 py-0.5 rounded-full text-[10px] font-medium"
                  :class="group.is_required ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-200' : 'bg-slate-100 text-slate-700 dark:bg-neutral-800 dark:text-neutral-300'"
                >
                  {{ group.is_required ? '★ บังคับเลือก' : 'เลือกหรือไม่ก็ได้' }}
                </span>

                <span class="px-2 py-0.5 bg-muted rounded-full text-[10px] font-normal text-muted-foreground">
                  {{ group.customization_options?.length || 0 }} ตัวเลือก
                </span>
              </div>

              <!-- Collapsed Summary Description -->
              <p class="text-xs text-muted-foreground mt-0.5 truncate max-w-xl font-normal">
                <span v-if="isGroupCollapsed(group.id)" class="text-foreground/80 font-normal">
                  {{ getOptionSummaryText(group) }}
                </span>
                <span v-else>
                  <span v-if="group.name_en">{{ group.name_en }}</span>
                  <span v-if="group.name_en && group.name_zh"> • </span>
                  <span v-if="group.name_zh">{{ group.name_zh }}</span>
                </span>
              </p>
            </div>
          </div>

          <!-- Actions & Accordion Chevron -->
          <div class="flex items-center gap-2 self-end sm:self-auto" @click.stop>
            <button 
              type="button" 
              @click="openEditGroup(group)"
              class="p-2 bg-muted hover:bg-muted/80 text-foreground font-bold text-xs rounded-xl transition-colors inline-flex items-center gap-1"
            >
              <Edit class="w-3.5 h-3.5" />
              <span class="hidden sm:inline">แก้ไขกลุ่ม</span>
            </button>

            <button 
              type="button" 
              @click="deleteGroup(group)"
              class="p-2 bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold text-xs rounded-xl transition-colors inline-flex items-center gap-1"
            >
              <Trash2 class="w-3.5 h-3.5" />
              <span class="hidden sm:inline">ลบกลุ่ม</span>
            </button>

            <button 
              type="button" 
              @click="toggleGroupCollapse(group.id)"
              class="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              :title="isGroupCollapsed(group.id) ? 'ขยายกลุ่มนี้' : 'ยุบกลุ่มนี้'"
            >
              <ChevronDown 
                class="w-5 h-5 transition-transform duration-200" 
                :class="isGroupCollapsed(group.id) ? '' : 'rotate-180'" 
              />
            </button>
          </div>
        </div>

        <!-- Expanded Content (Options Grid + Add Form) -->
        <div v-show="!isGroupCollapsed(group.id)" class="space-y-4 animate-in fade-in-50 duration-200">
          
          <!-- Options in this Group -->
          <div class="space-y-2">
            <div class="flex items-center justify-between text-xs font-bold text-muted-foreground">
              <span>ตัวเลือกในกลุ่มนี้ ({{ group.customization_options?.length || 0 }} รายการ):</span>
            </div>

            <div v-if="!group.customization_options?.length" class="p-5 bg-muted/20 border border-dashed rounded-2xl text-center text-xs text-muted-foreground space-y-1">
              <p class="font-bold text-foreground">ยังไม่มีตัวเลือกย่อยในกลุ่มนี้</p>
              <p>สามารถกรอกชื่อและราคาที่ช่องด้านล่างเพื่อเพิ่มตัวเลือกแรกได้ทันที</p>
            </div>

            <div v-else class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div 
                v-for="opt in group.customization_options" 
                :key="opt.id"
                class="flex items-center justify-between p-3.5 bg-muted/30 hover:bg-muted/50 border rounded-2xl text-xs transition-colors"
              >
                <div class="min-w-0 flex-1 pr-2">
                  <p class="font-black text-foreground truncate">{{ opt.name_th }}</p>
                  <p class="text-[11px] text-muted-foreground truncate" v-if="opt.name_en || opt.name_zh">
                    {{ opt.name_en }} <span v-if="opt.name_zh">• {{ opt.name_zh }}</span>
                  </p>
                </div>

                <div class="flex items-center gap-2 shrink-0">
                  <span 
                    class="px-2.5 py-1 rounded-xl font-black text-[11px] border"
                    :class="Number(opt.extra_price || opt.price_delta || 0) > 0 ? 'bg-primary/10 text-primary border-primary/20' : 'bg-muted text-muted-foreground border-border/40'"
                  >
                    {{ formatPrice(opt.extra_price !== undefined ? opt.extra_price : opt.price_delta) }}
                  </span>

                  <button 
                    type="button" 
                    @click="openEditOption(opt)"
                    class="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted"
                  >
                    <Edit class="w-3.5 h-3.5" />
                  </button>

                  <button 
                    type="button" 
                    @click="deleteOption(opt)"
                    class="p-1.5 text-muted-foreground hover:text-rose-600 rounded-lg hover:bg-rose-50"
                  >
                    <Trash2 class="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Add Option Inline Form (Isolated per group) -->
          <div class="bg-muted/20 border border-dashed rounded-2xl p-4 space-y-3">
            <div class="flex items-center justify-between">
              <span class="text-xs font-black text-foreground flex items-center gap-1">
                <Plus class="w-3.5 h-3.5 text-primary" />
                <span>เพิ่มตัวเลือกในกลุ่ม "{{ group.name_th }}"</span>
              </span>

              <button 
                type="button"
                @click.prevent="translateNewOptionForGroup(group.id)"
                :disabled="getNewOption(group.id).isTranslating || !getNewOption(group.id).name_th"
                class="inline-flex items-center gap-1 px-2.5 py-1 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-lg text-[11px] font-bold transition-colors disabled:opacity-50"
              >
                <Sparkles class="w-3 h-3 text-purple-600" :class="getNewOption(group.id).isTranslating ? 'animate-spin' : ''" />
                <span>{{ getNewOption(group.id).isTranslating ? 'กำลังแปล...' : 'แปล AI' }}</span>
              </button>
            </div>

            <form @submit.prevent="addOption(group.id)" class="space-y-3">
              <div class="grid grid-cols-1 sm:grid-cols-4 gap-2">
                <input 
                  v-model="getNewOption(group.id).name_th" 
                  type="text" 
                  placeholder="ชื่อตัวเลือก (ไทย) *" 
                  required
                  class="px-3 py-2 bg-background border rounded-xl text-xs font-medium"
                />
                <input 
                  v-model="getNewOption(group.id).name_en" 
                  type="text" 
                  placeholder="English (เช่น Steamed Egg)" 
                  class="px-3 py-2 bg-background border rounded-xl text-xs font-medium"
                />
                <input 
                  v-model="getNewOption(group.id).name_zh" 
                  type="text" 
                  placeholder="中文 (例如 蒸蛋)" 
                  class="px-3 py-2 bg-background border rounded-xl text-xs font-medium"
                />
                <div class="flex gap-2">
                  <input 
                    v-model="getNewOption(group.id).extra_price" 
                    type="number" 
                    min="0"
                    placeholder="+ราคา (฿)" 
                    class="w-24 px-3 py-2 bg-background border rounded-xl text-xs font-bold"
                  />
                  <button 
                    type="submit" 
                    :disabled="getNewOption(group.id).isAdding || !getNewOption(group.id).name_th.trim()"
                    class="flex-1 px-3 py-2 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs rounded-xl shadow-2xs shrink-0 disabled:opacity-50 transition-all flex items-center justify-center gap-1"
                  >
                    <Plus class="w-3.5 h-3.5" />
                    <span>{{ getNewOption(group.id).isAdding ? 'บันทึก...' : 'เพิ่ม' }}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>

        </div>

      </div>
    </div>

    <!-- 5. Edit Group Modal -->
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

    <!-- 6. Edit Option Modal -->
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
