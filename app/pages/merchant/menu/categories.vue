<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
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
  Search,
  CheckCircle2,
  UtensilsCrossed,
  Filter
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
const categories = ref<any[]>([])
const searchQuery = ref('')
const statusFilter = ref<'all' | 'active' | 'hidden'>('all')

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
  const { data, error } = await (client as any)
    .from('menu_categories')
    .select('*, menu_items(count)')
    .eq('store_id', store.value.id)
    .order('sort_order', { ascending: true })
    
  if (error) {
    console.error('Fetch categories error:', error)
    return
  }

  categories.value = data || []
}

// === Filtered Categories Computed ===
const filteredCategories = computed(() => {
  let list = categories.value

  // 1. Status Filter
  if (statusFilter.value === 'active') {
    list = list.filter(c => c.is_active !== false)
  } else if (statusFilter.value === 'hidden') {
    list = list.filter(c => c.is_active === false)
  }

  // 2. Search Query (TH, EN, ZH)
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase().trim()
    list = list.filter(c => {
      const th = (c.name_th || '').toLowerCase()
      const en = (c.name_en || '').toLowerCase()
      const zh = (c.name_zh || '').toLowerCase()
      return th.includes(q) || en.includes(q) || zh.includes(q)
    })
  }

  return list
})

// === Stats Computed ===
const stats = computed(() => {
  const total = categories.value.length
  const active = categories.value.filter(c => c.is_active !== false).length
  const hidden = total - active
  const totalItems = categories.value.reduce((acc, cat) => acc + (cat.menu_items?.[0]?.count || 0), 0)

  return {
    total,
    active,
    hidden,
    totalItems
  }
})

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

// === Add Category ===
const addCategory = async () => {
  if (!newCategory.value.name_th.trim() || !store.value) return
  
  addingCategory.value = true
  
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
    swal.fire({ title: 'Error', text: error.message || 'ไม่สามารถเพิ่มหมวดหมู่ได้', icon: 'error' })
  }
}

// === Edit Category ===
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
    swal.fire({
      title: 'บันทึกสำเร็จ!',
      icon: 'success',
      timer: 1200,
      showConfirmButton: false
    })
    await fetchCategories()
  } else {
    swal.fire({ title: 'Error', text: error.message || 'ไม่สามารถอัปเดตหมวดหมู่ได้', icon: 'error' })
  }
}

// === Toggle Active State ===
const toggleCategoryActive = async (cat: any) => {
  const newStatus = cat.is_active === false ? true : false
  cat.is_active = newStatus // Optimistic
  
  const { error } = await (client as any)
    .from('menu_categories')
    .update({ is_active: newStatus })
    .eq('id', cat.id)

  if (error) {
    cat.is_active = !newStatus
    swal.fire({ title: 'Error', text: 'ไม่สามารถเปลี่ยนสถานะได้', icon: 'error' })
  }
}

// === Reorder ===
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

// === Delete Category ===
const deleteCategory = async (cat: any) => {
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
  
  const { error } = await (client as any).from('menu_categories').delete().eq('id', cat.id)
  if (!error) {
    swal.fire({ title: 'ลบสำเร็จ!', icon: 'success', timer: 1200, showConfirmButton: false })
    await fetchCategories()
  } else {
    swal.fire({ title: 'Error', text: error.message || 'ไม่สามารถลบหมวดหมู่ได้', icon: 'error' })
  }
}

const getCategoryDisplayName = (cat: any) => {
  if (!cat) return ''
  const l = locale.value
  if (l === 'en' && cat.name_en) return cat.name_en
  if (l === 'zh' && cat.name_zh) return cat.name_zh
  return cat.name_th || cat.name_en || cat.name_zh || ''
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
          <Layers class="w-6 h-6 text-primary" />
          <span>{{ $t('cat_title') }}</span>
        </h1>
        <p class="text-xs text-muted-foreground mt-0.5">
          {{ $t('cat_subtitle') }}
        </p>
      </div>

      <!-- Stats Counters -->
      <div class="flex items-center gap-2 flex-wrap">
        <div class="px-3 py-1.5 bg-muted/60 border rounded-xl text-center">
          <span class="text-[10px] text-muted-foreground font-bold block leading-none">{{ $t('cat_stat_total') }}</span>
          <span class="text-sm font-black text-foreground">{{ stats.total }}</span>
        </div>
        <div class="px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-center">
          <span class="text-[10px] text-emerald-600 font-bold block leading-none">{{ $t('cat_stat_active') }}</span>
          <span class="text-sm font-black text-emerald-600">{{ stats.active }}</span>
        </div>
        <div class="px-3 py-1.5 bg-rose-500/10 border border-rose-500/20 rounded-xl text-center">
          <span class="text-[10px] text-rose-600 font-bold block leading-none">{{ $t('cat_stat_hidden') }}</span>
          <span class="text-sm font-black text-rose-600">{{ stats.hidden }}</span>
        </div>
      </div>
    </div>

    <!-- 2. Search & Filter Bar -->
    <div class="bg-card border rounded-3xl p-4 sm:p-5 shadow-xs space-y-3">
      <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <!-- Search Input -->
        <div class="relative flex-1">
          <Search class="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input 
            v-model="searchQuery" 
            type="text" 
            :placeholder="$t('cat_search_placeholder')" 
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

        <!-- Status Filter Tabs -->
        <div class="flex items-center gap-1 bg-muted/50 p-1 rounded-2xl shrink-0">
          <button 
            @click="statusFilter = 'all'"
            class="px-3 py-1.5 rounded-xl text-xs font-bold transition-all"
            :class="statusFilter === 'all' ? 'bg-background text-foreground shadow-2xs' : 'text-muted-foreground hover:text-foreground'"
          >
            {{ $t('cat_filter_all') }} ({{ categories.length }})
          </button>
          <button 
            @click="statusFilter = 'active'"
            class="px-3 py-1.5 rounded-xl text-xs font-bold transition-all"
            :class="statusFilter === 'active' ? 'bg-background text-emerald-600 shadow-2xs' : 'text-muted-foreground hover:text-foreground'"
          >
            {{ $t('cat_stat_active') }} ({{ stats.active }})
          </button>
          <button 
            @click="statusFilter = 'hidden'"
            class="px-3 py-1.5 rounded-xl text-xs font-bold transition-all"
            :class="statusFilter === 'hidden' ? 'bg-background text-rose-600 shadow-2xs' : 'text-muted-foreground hover:text-foreground'"
          >
            {{ $t('cat_stat_hidden') }} ({{ stats.hidden }})
          </button>
        </div>
      </div>
    </div>

    <!-- 3. Add Category Card -->
    <div class="bg-card border rounded-3xl p-6 shadow-xs space-y-4">
      <div class="flex items-center justify-between border-b pb-3">
        <h2 class="text-sm font-black text-foreground flex items-center gap-1.5">
          <Plus class="w-4 h-4 text-primary" />
          <span>{{ $t('cat_add_new') }}</span>
        </h2>
        
        <button 
          type="button"
          @click.prevent="translateCategory(false)"
          :disabled="isTranslating || !newCategory.name_th"
          class="inline-flex items-center gap-1.5 px-3 py-1 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-xl text-xs font-bold transition-colors disabled:opacity-50"
        >
          <Sparkles class="w-3.5 h-3.5 text-purple-600" :class="isTranslating ? 'animate-spin' : ''" />
          <span>{{ isTranslating ? $t('cat_translating') : $t('cat_translate_ai') }}</span>
        </button>
      </div>

      <form @submit.prevent="addCategory" class="space-y-4">
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label class="block text-xs font-bold text-foreground mb-1">
              {{ $t('settings_name_th') }} <span class="text-rose-500">*</span>
            </label>
            <input 
              v-model="newCategory.name_th" 
              type="text" 
              placeholder="เช่น อาหารจานเดียว, ต้ม/แกง" 
              required
              class="w-full px-3.5 py-2 bg-muted/40 border rounded-xl text-xs focus:ring-2 focus:ring-primary/20 focus:border-primary outline-hidden font-medium"
            />
          </div>

          <div>
            <label class="block text-xs font-bold text-foreground mb-1">
              {{ $t('settings_name_en') }}
            </label>
            <input 
              v-model="newCategory.name_en" 
              type="text" 
              placeholder="e.g. Single Dish, Soups"
              class="w-full px-3.5 py-2 bg-muted/40 border rounded-xl text-xs focus:ring-2 focus:ring-primary/20 focus:border-primary outline-hidden font-medium"
            />
          </div>

          <div>
            <label class="block text-xs font-bold text-foreground mb-1">
              {{ $t('settings_name_zh') }}
            </label>
            <input 
              v-model="newCategory.name_zh" 
              type="text" 
              placeholder="例如 单碟菜, 汤类"
              class="w-full px-3.5 py-2 bg-muted/40 border rounded-xl text-xs focus:ring-2 focus:ring-primary/20 focus:border-primary outline-hidden font-medium"
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
            <span>{{ addingCategory ? $t('cat_btn_adding') : $t('cat_btn_add') }}</span>
          </button>
        </div>
      </form>
    </div>

    <!-- 4. Categories List -->
    <div class="bg-card border rounded-3xl overflow-hidden shadow-xs">
      <div class="p-4 bg-muted/30 border-b flex items-center justify-between">
        <h3 class="text-xs font-black text-foreground">
          {{ $t('cat_list_title') }} ({{ filteredCategories.length }})
        </h3>
        <span class="text-[11px] text-muted-foreground">{{ $t('cat_reorder_hint') }}</span>
      </div>

      <div v-if="loading" class="p-8 text-center text-muted-foreground text-xs animate-pulse">
        {{ $t('loading') }}
      </div>

      <div v-else-if="categories.length === 0" class="p-12 text-center space-y-2 text-muted-foreground">
        <div class="text-3xl opacity-50">📂</div>
        <p class="text-xs font-bold">{{ $t('cat_empty_title') }}</p>
      </div>

      <div v-else-if="filteredCategories.length === 0" class="p-10 text-center space-y-3 text-muted-foreground">
        <div class="text-2xl">🔍</div>
        <p class="text-xs font-bold">ไม่พบหมวดหมู่ที่ค้นหา</p>
        <button 
          @click="searchQuery = ''; statusFilter = 'all'" 
          class="px-4 py-1.5 bg-primary/10 text-primary rounded-xl text-xs font-bold hover:bg-primary/20 transition-colors"
        >
          {{ $t('menu_clear_filter') }}
        </button>
      </div>

      <ul v-else class="divide-y">
        <li 
          v-for="(cat, index) in filteredCategories" 
          :key="cat.id" 
          class="p-4 hover:bg-muted/20 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
          :class="cat.is_active === false ? 'opacity-60 bg-slate-50/50 dark:bg-neutral-900/50' : ''"
        >
          <!-- Category Info -->
          <div class="flex items-center gap-3">
            <!-- Sort Order Number Badge -->
            <div class="w-8 h-8 rounded-xl bg-muted flex items-center justify-center text-xs font-black text-muted-foreground shrink-0 border border-border/40">
              {{ index + 1 }}
            </div>

            <div>
              <div class="flex items-center gap-2 flex-wrap">
                <span class="font-black text-sm text-foreground">{{ getCategoryDisplayName(cat) }}</span>
                <span 
                  class="px-2 py-0.5 rounded-full text-[10px] font-black"
                  :class="cat.is_active !== false ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'"
                >
                  {{ cat.is_active !== false ? $t('cat_status_active') : $t('cat_status_hidden') }}
                </span>
                <span class="px-2 py-0.5 bg-muted rounded-md text-[10px] font-bold text-muted-foreground">
                  {{ cat.menu_items?.[0]?.count || 0 }} {{ $t('cat_item_unit') }}
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
              title="Move Up"
            >
              <ArrowUp class="w-3.5 h-3.5" />
            </button>

            <!-- Sort Down -->
            <button 
              type="button" 
              @click="moveCategory(index, 'down')" 
              :disabled="index === filteredCategories.length - 1"
              class="p-1.5 rounded-lg border bg-background hover:bg-muted disabled:opacity-30 transition-colors"
              title="Move Down"
            >
              <ArrowDown class="w-3.5 h-3.5" />
            </button>

            <!-- Toggle Active Switch -->
            <button 
              type="button" 
              @click="toggleCategoryActive(cat)"
              class="px-2.5 py-1.5 rounded-xl text-xs font-bold transition-colors inline-flex items-center gap-1 ml-1"
              :class="cat.is_active !== false ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-neutral-800 dark:text-neutral-300' : 'bg-emerald-100 hover:bg-emerald-200 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'"
            >
              <EyeOff v-if="cat.is_active !== false" class="w-3.5 h-3.5 text-muted-foreground" />
              <Eye v-else class="w-3.5 h-3.5 text-emerald-600" />
              <span>{{ cat.is_active !== false ? $t('cat_btn_hide') : $t('cat_btn_show') }}</span>
            </button>

            <!-- Edit Button -->
            <button 
              type="button" 
              @click="openEditModal(cat)"
              class="p-1.5 rounded-xl border bg-background hover:bg-muted text-foreground transition-colors ml-1"
              title="Edit Category"
            >
              <Edit class="w-3.5 h-3.5" />
            </button>

            <!-- Delete Button -->
            <button 
              type="button" 
              @click="deleteCategory(cat)"
              class="p-1.5 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-600 transition-colors"
              title="Delete Category"
            >
              <Trash2 class="w-3.5 h-3.5" />
            </button>
          </div>
        </li>
      </ul>
    </div>

    <!-- 5. Edit Category Modal -->
    <div 
      v-if="editingCategory" 
      class="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
    >
      <div class="bg-card w-full max-w-md rounded-3xl p-6 shadow-2xl border space-y-4">
        <div class="flex items-center justify-between border-b pb-3">
          <h3 class="text-sm font-black text-foreground">{{ $t('cat_edit_title') }}</h3>
          <button @click="editingCategory = null" class="p-1 rounded-lg hover:bg-muted text-muted-foreground">
            <X class="w-4 h-4" />
          </button>
        </div>

        <form @submit.prevent="updateCategory" class="space-y-4">
          <div>
            <div class="flex items-center justify-between mb-1">
              <label class="block text-xs font-bold text-foreground">
                {{ $t('settings_name_th') }} <span class="text-rose-500">*</span>
              </label>
              <button 
                type="button"
                @click.prevent="translateCategory(true)"
                :disabled="isTranslatingEdit || !editForm.name_th"
                class="inline-flex items-center gap-1 text-[11px] font-bold text-purple-600 hover:text-purple-700"
              >
                <Sparkles class="w-3 h-3" :class="isTranslatingEdit ? 'animate-spin' : ''" />
                <span>{{ isTranslatingEdit ? $t('cat_translating') : $t('cat_translate_ai') }}</span>
              </button>
            </div>
            <input 
              v-model="editForm.name_th" 
              type="text" 
              required
              class="w-full px-3.5 py-2 bg-muted/40 border rounded-xl text-xs focus:ring-2 focus:ring-primary/20 focus:border-primary outline-hidden"
            />
          </div>

          <div>
            <label class="block text-xs font-bold text-foreground mb-1">{{ $t('settings_name_en') }}</label>
            <input 
              v-model="editForm.name_en" 
              type="text" 
              class="w-full px-3.5 py-2 bg-muted/40 border rounded-xl text-xs focus:ring-2 focus:ring-primary/20 focus:border-primary outline-hidden"
            />
          </div>

          <div>
            <label class="block text-xs font-bold text-foreground mb-1">{{ $t('settings_name_zh') }}</label>
            <input 
              v-model="editForm.name_zh" 
              type="text" 
              class="w-full px-3.5 py-2 bg-muted/40 border rounded-xl text-xs focus:ring-2 focus:ring-primary/20 focus:border-primary outline-hidden"
            />
          </div>

          <div class="pt-1">
            <label class="flex items-center gap-2 cursor-pointer">
              <input 
                v-model="editForm.is_active" 
                type="checkbox" 
                class="w-4 h-4 rounded text-primary focus:ring-primary"
              />
              <span class="text-xs font-bold text-foreground">{{ $t('cat_status_active') }} (แสดงในหน้าเมนูลูกค้า)</span>
            </label>
          </div>

          <div class="flex justify-end gap-2 pt-3 border-t">
            <button 
              type="button" 
              @click="editingCategory = null" 
              class="px-4 py-2 bg-muted hover:bg-muted/80 text-foreground font-bold text-xs rounded-xl transition-colors"
            >
              {{ $t('cat_btn_cancel') }}
            </button>
            <button 
              type="submit" 
              :disabled="isUpdating"
              class="px-5 py-2 bg-primary hover:bg-primary/90 text-primary-foreground font-black text-xs rounded-xl shadow-xs disabled:opacity-50 transition-all"
            >
              {{ isUpdating ? 'กำลังบันทึก...' : $t('cat_btn_save_edit') }}
            </button>
          </div>
        </form>
      </div>
    </div>

  </div>
</template>
