<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Layers, 
  Sliders, 
  Eye, 
  EyeOff, 
  UtensilsCrossed, 
  Sparkles,
  Flame,
  CheckCircle2,
  XCircle,
  AlertCircle,
  FolderPlus,
  ArrowRight,
  X,
  LayoutGrid,
  List,
  ChevronDown,
  ChevronUp,
  ArrowUpDown,
  Image as ImageIcon,
  Check,
  Tag
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
const menuItems = ref<any[]>([])

// View Mode: 'grid' (Large Visual Cards) vs 'compact' (Space-Efficient Table/List)
const viewMode = ref<'grid' | 'compact'>('grid')

// Accordion (Expand / Collapse) Categories State
const collapsedCategories = ref<Record<string, boolean>>({})

// Search & Advanced Filter State
const searchQuery = ref('')
const selectedCategoryFilter = ref('all')
const statusFilter = ref<'all' | 'available' | 'soldout'>('all')
const specialFilter = ref<'all' | 'spicy' | 'addons' | 'photo'>('all')
const sortBy = ref<'default' | 'price_asc' | 'price_desc' | 'name_asc'>('default')

// Quick Add Category Modal
const isAddCategoryModalOpen = ref(false)
const newCatNameTh = ref('')
const newCatNameEn = ref('')
const newCatNameZh = ref('')
const isTranslatingCat = ref(false)
const isAddingCat = ref(false)

onMounted(async () => {
  await loadMenuData()
})

const loadMenuData = async () => {
  loading.value = true
  try {
    if (!store.value) {
      await fetchStore()
    }
    
    if (store.value?.id) {
      const [catRes, itemRes] = await Promise.all([
        (client as any)
          .from('menu_categories')
          .select('*')
          .eq('store_id', store.value.id)
          .order('sort_order', { ascending: true }),
        (client as any)
          .from('menu_items')
          .select('*, menu_categories(name_th), menu_item_customizations(group_id)')
          .eq('store_id', store.value.id)
          .order('sort_order', { ascending: true })
      ])
      
      categories.value = catRes.data || []
      menuItems.value = itemRes.data || []
    }
  } catch (error) {
    console.error('Fetch merchant menu error:', error)
  } finally {
    loading.value = false
  }
}

// === Accordion Toggle Helpers ===
const toggleCategoryCollapse = (catId: string) => {
  collapsedCategories.value[catId] = !collapsedCategories.value[catId]
}

const expandAllCategories = () => {
  const next: Record<string, boolean> = {}
  categories.value.forEach(c => {
    next[c.id] = false
  })
  next['uncategorized'] = false
  collapsedCategories.value = next
}

const collapseAllCategories = () => {
  const next: Record<string, boolean> = {}
  categories.value.forEach(c => {
    next[c.id] = true
  })
  next['uncategorized'] = true
  collapsedCategories.value = next
}

const isCategoryCollapsed = (catId: string) => {
  return !!collapsedCategories.value[catId]
}

// === Quick Availability Toggle (ปิด/เปิด การขาย) ===
const toggleAvailability = async (item: any) => {
  const newStatus = !item.is_available
  item.is_available = newStatus // Optimistic update
  
  const { error } = await (client as any)
    .from('menu_items')
    .update({ is_available: newStatus })
    .eq('id', item.id)

  if (error) {
    item.is_available = !newStatus // Revert
    swal.fire({ title: 'Error', text: 'ไม่สามารถอัปเดตสถานะได้', icon: 'error' })
  }
}

// === Delete Menu Item (ลบเมนูอาหาร) ===
const deleteMenuItem = async (item: any) => {
  const result = await swal.fire({
    title: 'ยืนยันการลบเมนู?',
    text: `ต้องการลบ "${item.name_th}" ออกจากร้านค้าใช่หรือไม่?`,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#e11d48',
    cancelButtonColor: '#64748b',
    confirmButtonText: 'ใช่, ลบเลย!',
    cancelButtonText: 'ยกเลิก'
  })

  if (!result.isConfirmed) return

  const { error } = await (client as any)
    .from('menu_items')
    .delete()
    .eq('id', item.id)

  if (!error) {
    menuItems.value = menuItems.value.filter(i => i.id !== item.id)
    swal.fire({
      title: 'ลบสำเร็จ!',
      icon: 'success',
      timer: 1200,
      showConfirmButton: false
    })
  } else {
    swal.fire({ title: 'Error', text: 'ไม่สามารถลบรายการอาหารได้', icon: 'error' })
  }
}

// === Quick Create Category AI Translate ===
const translateQuickCategory = async () => {
  if (!newCatNameTh.value.trim()) return
  isTranslatingCat.value = true
  try {
    const res = await fetch('/api/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name_th: newCatNameTh.value, description_th: '' })
    })
    const data = await res.json()
    if (data && !data.error) {
      if (data.name_en) newCatNameEn.value = data.name_en
      if (data.name_zh) newCatNameZh.value = data.name_zh
    }
  } catch (err) {
    console.error(err)
  } finally {
    isTranslatingCat.value = false
  }
}

const saveQuickCategory = async () => {
  if (!newCatNameTh.value.trim() || !store.value) return
  isAddingCat.value = true

  if (!newCatNameEn.value || !newCatNameZh.value) {
    await translateQuickCategory()
  }

  const { data, error } = await (client as any).from('menu_categories').insert({
    store_id: store.value.id,
    name_th: newCatNameTh.value.trim(),
    name_en: newCatNameEn.value?.trim() || null,
    name_zh: newCatNameZh.value?.trim() || null,
    sort_order: categories.value.length,
    is_active: true
  }).select().single()

  isAddingCat.value = false
  if (!error && data) {
    categories.value.push(data)
    newCatNameTh.value = ''
    newCatNameEn.value = ''
    newCatNameZh.value = ''
    isAddCategoryModalOpen.value = false
    swal.fire({ title: 'สร้างหมวดหมู่สำเร็จ!', icon: 'success', timer: 1200, showConfirmButton: false })
  } else {
    swal.fire({ title: 'Error', text: 'ไม่สามารถสร้างหมวดหมู่ได้', icon: 'error' })
  }
}

// === Filtered & Sorted Category Sections ===
const categorySections = computed(() => {
  // 1. Filter Items
  let filtered = [...menuItems.value]

  // Status Filter
  if (statusFilter.value === 'available') {
    filtered = filtered.filter(i => i.is_available)
  } else if (statusFilter.value === 'soldout') {
    filtered = filtered.filter(i => !i.is_available)
  }

  // Special Filter
  if (specialFilter.value === 'spicy') {
    filtered = filtered.filter(i => i.is_spicy)
  } else if (specialFilter.value === 'addons') {
    filtered = filtered.filter(i => i.menu_item_customizations?.length > 0)
  } else if (specialFilter.value === 'photo') {
    filtered = filtered.filter(i => !!(i.photo_url || i.image_url))
  }

  // Search Query (Thai, English, Chinese, Description, Price)
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase().trim()
    filtered = filtered.filter(i => {
      const nTh = (i.name_th || '').toLowerCase()
      const nEn = (i.name_en || '').toLowerCase()
      const nZh = (i.name_zh || '').toLowerCase()
      const dTh = (i.description_th || '').toLowerCase()
      const dEn = (i.description_en || '').toLowerCase()
      const priceStr = String(i.price || '')
      return nTh.includes(q) || nEn.includes(q) || nZh.includes(q) || dTh.includes(q) || dEn.includes(q) || priceStr.includes(q)
    })
  }

  // Sorting Items
  if (sortBy.value === 'price_asc') {
    filtered.sort((a, b) => Number(a.price || 0) - Number(b.price || 0))
  } else if (sortBy.value === 'price_desc') {
    filtered.sort((a, b) => Number(b.price || 0) - Number(a.price || 0))
  } else if (sortBy.value === 'name_asc') {
    filtered.sort((a, b) => (a.name_th || '').localeCompare(b.name_th || ''))
  }

  // 2. Group by categories
  let cats = categories.value
  if (selectedCategoryFilter.value !== 'all') {
    cats = cats.filter(c => c.id === selectedCategoryFilter.value)
  }

  const sections = cats.map(cat => {
    const items = filtered.filter(i => i.category_id === cat.id)
    return {
      category: cat,
      items
    }
  })

  // 3. Uncategorized items
  const uncategorizedItems = filtered.filter(i => !i.category_id)
  if ((selectedCategoryFilter.value === 'all' || selectedCategoryFilter.value === 'uncategorized') && uncategorizedItems.length > 0) {
    sections.push({
      category: { id: 'uncategorized', name_th: 'ยังไม่ได้จัดหมวดหมู่', name_en: 'Uncategorized', name_zh: '未分类' },
      items: uncategorizedItems
    })
  }

  return sections.filter(sec => sec.items.length > 0 || (searchQuery.value.trim() === '' && statusFilter.value === 'all' && specialFilter.value === 'all'))
})

const stats = computed(() => {
  const total = menuItems.value.length
  const available = menuItems.value.filter(i => i.is_available).length
  const soldout = total - available
  const spicyCount = menuItems.value.filter(i => i.is_spicy).length
  const addonsCount = menuItems.value.filter(i => i.menu_item_customizations?.length > 0).length

  return {
    total,
    available,
    soldout,
    spicyCount,
    addonsCount,
    categoriesCount: categories.value.length
  }
})

const getCategoryDisplayName = (cat: any) => {
  if (!cat) return ''
  const l = locale.value
  if (l === 'en' && cat.name_en) return cat.name_en
  if (l === 'zh' && cat.name_zh) return cat.name_zh
  return cat.name_th || cat.name_en || cat.name_zh || ''
}

const getItemDisplayName = (item: any) => {
  if (!item) return ''
  const l = locale.value
  if (l === 'en' && item.name_en) return item.name_en
  if (l === 'zh' && item.name_zh) return item.name_zh
  return item.name_th || item.name_en || item.name_zh || ''
}

const getItemSubName = (item: any) => {
  if (!item) return ''
  const l = locale.value
  if (l === 'th') return item.name_en || ''
  return item.name_th || ''
}

const getItemDesc = (item: any) => {
  if (!item) return ''
  const l = locale.value
  if (l === 'en' && item.description_en) return item.description_en
  if (l === 'zh' && item.description_zh) return item.description_zh
  return item.description_th || item.description_en || ''
}

const formatPrice = (price: any) => {
  return new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', minimumFractionDigits: 0 }).format(Number(price || 0))
}

const resetAllFilters = () => {
  searchQuery.value = ''
  selectedCategoryFilter.value = 'all'
  statusFilter.value = 'all'
  specialFilter.value = 'all'
  sortBy.value = 'default'
}
</script>

<template>
  <div class="space-y-6 pb-20 max-w-6xl mx-auto">
    
    <!-- 1. Header & Quick Action Buttons -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-card to-card/80 border p-5 sm:p-6 rounded-3xl shadow-xs">
      <div>
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-bold">
            <UtensilsCrossed class="w-5 h-5" />
          </div>
          <div>
            <h1 class="text-xl font-bold text-foreground">{{ $t('menu_title') }}</h1>
            <p class="text-xs text-muted-foreground">{{ $t('menu_subtitle') }}</p>
          </div>
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="flex items-center gap-2 flex-wrap sm:flex-nowrap">
        <button 
          type="button"
          @click="isAddCategoryModalOpen = true" 
          class="px-3.5 py-2.5 bg-muted/60 hover:bg-muted text-foreground font-semibold text-xs rounded-2xl border border-border/40 transition-all inline-flex items-center gap-1.5"
        >
          <FolderPlus class="w-4 h-4 text-primary" />
          <span>{{ $t('menu_btn_create_cat') }}</span>
        </button>

        <NuxtLink 
          to="/merchant/menu/categories" 
          class="px-3.5 py-2.5 bg-muted/60 hover:bg-muted text-foreground font-semibold text-xs rounded-2xl border border-border/40 transition-all inline-flex items-center gap-1.5"
        >
          <Layers class="w-4 h-4 text-muted-foreground" />
          <span>{{ $t('menu_btn_manage_cats') }}</span>
        </NuxtLink>

        <NuxtLink 
          to="/merchant/menu/customizations" 
          class="px-3.5 py-2.5 bg-muted/60 hover:bg-muted text-foreground font-semibold text-xs rounded-2xl border border-border/40 transition-all inline-flex items-center gap-1.5"
        >
          <Sliders class="w-4 h-4 text-muted-foreground" />
          <span>{{ $t('menu_btn_addons') }}</span>
        </NuxtLink>

        <NuxtLink 
          to="/merchant/menu/items/create" 
          class="px-4 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground font-black text-xs rounded-2xl shadow-xs transition-all inline-flex items-center gap-1.5 shrink-0"
        >
          <Plus class="w-4 h-4" />
          <span>{{ $t('menu_btn_add_item') }}</span>
        </NuxtLink>
      </div>
    </div>

    <!-- 2. Responsive Stats Counters -->
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <div class="bg-card border rounded-2xl p-4 flex items-center gap-3 shadow-2xs">
        <div class="w-10 h-10 rounded-xl bg-slate-100 dark:bg-neutral-800 text-foreground flex items-center justify-center font-bold text-sm">
          {{ stats.total }}
        </div>
        <div>
          <p class="text-[11px] text-muted-foreground font-medium">{{ $t('menu_stat_total') }}</p>
          <p class="text-sm font-bold text-foreground">{{ $t('menu_unit_items', { count: stats.total }) }}</p>
        </div>
      </div>

      <div class="bg-card border rounded-2xl p-4 flex items-center gap-3 shadow-2xs">
        <div class="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center font-bold text-sm">
          {{ stats.available }}
        </div>
        <div>
          <p class="text-[11px] text-muted-foreground font-medium">{{ $t('menu_stat_available') }}</p>
          <p class="text-sm font-bold text-emerald-600">{{ $t('menu_unit_items', { count: stats.available }) }}</p>
        </div>
      </div>

      <div class="bg-card border rounded-2xl p-4 flex items-center gap-3 shadow-2xs">
        <div class="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-950 text-rose-600 flex items-center justify-center font-bold text-sm">
          {{ stats.soldout }}
        </div>
        <div>
          <p class="text-[11px] text-muted-foreground font-medium">{{ $t('menu_stat_soldout') }}</p>
          <p class="text-sm font-bold text-rose-600">{{ $t('menu_unit_items', { count: stats.soldout }) }}</p>
        </div>
      </div>

      <div class="bg-card border rounded-2xl p-4 flex items-center gap-3 shadow-2xs">
        <div class="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950 text-amber-600 flex items-center justify-center font-bold text-sm">
          {{ stats.categoriesCount }}
        </div>
        <div>
          <p class="text-[11px] text-muted-foreground font-medium">{{ $t('menu_stat_categories') }}</p>
          <p class="text-sm font-bold text-amber-600">{{ $t('menu_unit_categories', { count: stats.categoriesCount }) }}</p>
        </div>
      </div>
    </div>

    <!-- 3. Search, Filter & View Mode Toolbar -->
    <div class="bg-card border rounded-3xl p-4 sm:p-5 space-y-3.5 shadow-xs">
      
      <!-- Top Row: Search Input + View Mode Switcher + Global Expand/Collapse -->
      <div class="flex flex-col md:flex-row items-stretch md:items-center gap-3">
        
        <!-- Search Input -->
        <div class="relative flex-1">
          <Search class="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input 
            v-model="searchQuery" 
            type="text" 
            :placeholder="$t('menu_search_placeholder')" 
            class="w-full pl-9 pr-8 py-2.5 bg-muted/40 border rounded-2xl text-xs font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary outline-hidden"
          />
          <button 
            v-if="searchQuery" 
            @click="searchQuery = ''" 
            class="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X class="w-3.5 h-3.5" />
          </button>
        </div>

        <!-- Sort Dropdown -->
        <div class="flex items-center gap-2 shrink-0">
          <select 
            v-model="sortBy"
            class="px-3 py-2 bg-muted/50 border border-border/40 rounded-xl text-xs font-bold text-foreground outline-hidden cursor-pointer"
          >
            <option value="default">{{ $t('menu_sort_default') }}</option>
            <option value="price_asc">{{ $t('menu_sort_price_asc') }}</option>
            <option value="price_desc">{{ $t('menu_sort_price_desc') }}</option>
            <option value="name_asc">{{ $t('menu_sort_name_asc') }}</option>
          </select>

          <!-- View Mode Toggle (Grid vs Compact List) -->
          <div class="flex items-center bg-muted/60 p-1 rounded-xl border border-border/40">
            <button 
              type="button"
              @click="viewMode = 'grid'" 
              class="p-1.5 rounded-lg transition-all"
              :class="viewMode === 'grid' ? 'bg-background text-primary shadow-2xs font-bold' : 'text-muted-foreground hover:text-foreground'"
              :title="$t('view_grid')"
            >
              <LayoutGrid class="w-4 h-4" />
            </button>
            <button 
              type="button"
              @click="viewMode = 'compact'" 
              class="p-1.5 rounded-lg transition-all"
              :class="viewMode === 'compact' ? 'bg-background text-primary shadow-2xs font-bold' : 'text-muted-foreground hover:text-foreground'"
              :title="$t('view_list')"
            >
              <List class="w-4 h-4" />
            </button>
          </div>

          <!-- Expand / Collapse All Categories -->
          <div class="flex items-center gap-1">
            <button 
              type="button" 
              @click="expandAllCategories" 
              class="p-2 bg-muted/50 hover:bg-muted text-foreground rounded-xl text-xs font-bold transition-colors border border-border/40"
              :title="$t('expand_all')"
            >
              <ChevronDown class="w-3.5 h-3.5 text-primary" />
            </button>
            <button 
              type="button" 
              @click="collapseAllCategories" 
              class="p-2 bg-muted/50 hover:bg-muted text-foreground rounded-xl text-xs font-bold transition-colors border border-border/40"
              :title="$t('collapse_all')"
            >
              <ChevronUp class="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          </div>
        </div>

      </div>

      <!-- Second Row: Status Filter + Special Feature Filters -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-1 border-t border-border/40">
        
        <!-- Status Filter Buttons -->
        <div class="flex items-center gap-1 bg-muted/50 p-1 rounded-xl w-full sm:w-auto">
          <button 
            @click="statusFilter = 'all'" 
            class="px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex-1 sm:flex-none"
            :class="statusFilter === 'all' ? 'bg-background text-foreground shadow-2xs' : 'text-muted-foreground hover:text-foreground'"
          >
            {{ $t('menu_filter_all') }}
          </button>
          <button 
            @click="statusFilter = 'available'" 
            class="px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex-1 sm:flex-none"
            :class="statusFilter === 'available' ? 'bg-background text-emerald-600 shadow-2xs' : 'text-muted-foreground hover:text-foreground'"
          >
            {{ $t('menu_filter_available') }} ({{ stats.available }})
          </button>
          <button 
            @click="statusFilter = 'soldout'" 
            class="px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex-1 sm:flex-none"
            :class="statusFilter === 'soldout' ? 'bg-background text-rose-600 shadow-2xs' : 'text-muted-foreground hover:text-foreground'"
          >
            {{ $t('menu_filter_soldout') }} ({{ stats.soldout }})
          </button>
        </div>

        <!-- Special Feature Filter Pills -->
        <div class="flex items-center gap-1.5 overflow-x-auto hide-scrollbar">
          <button 
            @click="specialFilter = specialFilter === 'spicy' ? 'all' : 'spicy'"
            class="px-2.5 py-1 rounded-xl text-[11px] font-bold border transition-all shrink-0"
            :class="specialFilter === 'spicy' ? 'bg-rose-500 text-white border-rose-500 shadow-2xs' : 'bg-muted/40 text-muted-foreground hover:text-foreground border-border/40'"
          >
            {{ $t('menu_filter_spicy') }} ({{ stats.spicyCount }})
          </button>
          <button 
            @click="specialFilter = specialFilter === 'addons' ? 'all' : 'addons'"
            class="px-2.5 py-1 rounded-xl text-[11px] font-bold border transition-all shrink-0"
            :class="specialFilter === 'addons' ? 'bg-primary text-primary-foreground border-primary shadow-2xs' : 'bg-muted/40 text-muted-foreground hover:text-foreground border-border/40'"
          >
            {{ $t('menu_filter_has_addons') }} ({{ stats.addonsCount }})
          </button>
          <button 
            @click="specialFilter = specialFilter === 'photo' ? 'all' : 'photo'"
            class="px-2.5 py-1 rounded-xl text-[11px] font-bold border transition-all shrink-0"
            :class="specialFilter === 'photo' ? 'bg-blue-600 text-white border-blue-600 shadow-2xs' : 'bg-muted/40 text-muted-foreground hover:text-foreground border-border/40'"
          >
            {{ $t('menu_filter_has_photo') }}
          </button>
        </div>

      </div>

      <!-- Third Row: Category Pills Scrollable -->
      <div class="flex items-center gap-1.5 overflow-x-auto hide-scrollbar pt-1">
        <button 
          @click="selectedCategoryFilter = 'all'" 
          class="px-3 py-1 rounded-xl text-xs font-bold transition-all shrink-0"
          :class="selectedCategoryFilter === 'all' ? 'bg-primary text-primary-foreground shadow-2xs' : 'bg-muted/50 text-muted-foreground hover:text-foreground'"
        >
          {{ $t('menu_filter_all_cats', { count: stats.total }) }}
        </button>

        <button 
          v-for="cat in categories" 
          :key="cat.id" 
          @click="selectedCategoryFilter = cat.id" 
          class="px-3 py-1 rounded-xl text-xs font-bold transition-all shrink-0"
          :class="selectedCategoryFilter === cat.id ? 'bg-primary text-primary-foreground shadow-2xs' : 'bg-muted/50 text-muted-foreground hover:text-foreground'"
        >
          {{ getCategoryDisplayName(cat) }} ({{ menuItems.filter(i => i.category_id === cat.id).length }})
        </button>
      </div>

    </div>

    <!-- 4. Loading State -->
    <div v-if="loading" class="py-20 text-center space-y-3 bg-card border rounded-3xl">
      <div class="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
      <p class="text-xs font-bold text-muted-foreground animate-pulse">{{ $t('menu_loading') }}</p>
    </div>

    <!-- 5. Empty State (No Categories & No Items) -->
    <div v-else-if="categories.length === 0 && menuItems.length === 0" class="py-16 text-center space-y-4 bg-card border rounded-3xl p-6">
      <div class="w-16 h-16 bg-primary/10 text-primary rounded-2xl flex items-center justify-center text-3xl mx-auto">
        🍲
      </div>
      <div>
        <h3 class="text-base font-bold text-foreground">{{ $t('menu_empty_title') }}</h3>
        <p class="text-xs text-muted-foreground mt-1">{{ $t('menu_empty_desc') }}</p>
      </div>
      <button 
        @click="isAddCategoryModalOpen = true" 
        class="inline-flex items-center gap-1.5 px-5 py-2.5 bg-primary text-primary-foreground font-bold text-xs rounded-xl shadow-xs"
      >
        <FolderPlus class="w-4 h-4" />
        <span>{{ $t('menu_btn_create_first_cat') }}</span>
      </button>
    </div>

    <!-- 6. Filter No Results -->
    <div v-else-if="categorySections.length === 0" class="p-12 text-center space-y-3 bg-card border rounded-3xl text-muted-foreground">
      <div class="text-3xl">🔍</div>
      <p class="text-xs font-bold">ไม่พบรายการอาหารที่ตรงกับเงื่อนไขการค้นหา</p>
      <button 
        @click="resetAllFilters" 
        class="px-4 py-2 bg-primary/10 hover:bg-primary/20 text-primary rounded-xl text-xs font-bold transition-colors inline-flex items-center gap-1"
      >
        <span>{{ $t('menu_clear_filter') }}</span>
      </button>
    </div>

    <!-- 7. CATEGORY SECTIONS (ACCORDION SUPPORT & VIEW MODES) -->
    <div v-else class="space-y-6">
      <div 
        v-for="sec in categorySections" 
        :key="sec.category.id" 
        class="bg-card border rounded-3xl overflow-hidden shadow-xs transition-all"
        :class="isCategoryCollapsed(sec.category.id) ? 'hover:border-primary/50' : 'space-y-4 p-5 sm:p-6'"
      >
        <!-- Category Section Header (Clickable Accordion) -->
        <div 
          @click="toggleCategoryCollapse(sec.category.id)"
          class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer select-none transition-colors"
          :class="isCategoryCollapsed(sec.category.id) ? 'p-5 hover:bg-muted/20' : 'border-b pb-4'"
        >
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-2xl bg-muted flex items-center justify-center text-primary font-bold">
              <Layers class="w-5 h-5" />
            </div>

            <div>
              <div class="flex items-center gap-2 flex-wrap">
                <h2 class="text-base font-bold text-foreground">{{ getCategoryDisplayName(sec.category) }}</h2>
                <span class="px-2 py-0.5 rounded-full bg-muted text-[10px] font-bold text-muted-foreground">
                  {{ $t('menu_unit_items', { count: sec.items.length }) }}
                </span>
                <span 
                  v-if="sec.category.is_active === false"
                  class="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[10px] font-bold"
                >
                  {{ $t('menu_cat_hidden') }}
                </span>
              </div>

              <p class="text-xs text-muted-foreground mt-0.5 font-medium">
                <span v-if="isCategoryCollapsed(sec.category.id)">
                  พร้อมขาย {{ sec.items.filter((i: any) => i.is_available).length }} เมนู • สินค้าหมด {{ sec.items.filter((i: any) => !i.is_available).length }} เมนู
                </span>
                <span v-else>
                  <span v-if="sec.category.name_en && locale === 'th'">{{ sec.category.name_en }}</span>
                  <span v-else-if="sec.category.name_th && locale !== 'th'">{{ sec.category.name_th }}</span>
                </span>
              </p>
            </div>
          </div>

          <!-- Section Action Buttons & Accordion Chevron -->
          <div class="flex items-center gap-2 self-end sm:self-auto" @click.stop>
            <NuxtLink 
              v-if="sec.category.id !== 'uncategorized'"
              :to="`/merchant/menu/items/create?category_id=${sec.category.id}`"
              class="px-3 py-1.5 bg-primary/10 hover:bg-primary text-primary hover:text-primary-foreground font-semibold text-xs rounded-xl transition-all inline-flex items-center gap-1"
            >
              <Plus class="w-3.5 h-3.5" />
              <span>+ {{ $t('menu_btn_add_item') }}</span>
            </NuxtLink>

            <NuxtLink 
              v-if="sec.category.id !== 'uncategorized'"
              to="/merchant/menu/categories"
              class="p-1.5 bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground rounded-xl transition-colors"
              :title="$t('menu_btn_manage_cats')"
            >
              <Edit class="w-3.5 h-3.5" />
            </NuxtLink>

            <button 
              type="button" 
              @click="toggleCategoryCollapse(sec.category.id)"
              class="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              :title="isCategoryCollapsed(sec.category.id) ? 'ขยายหมวดนี้' : 'ยุบหมวดนี้'"
            >
              <ChevronDown 
                class="w-5 h-5 transition-transform duration-200" 
                :class="isCategoryCollapsed(sec.category.id) ? '' : 'rotate-180'" 
              />
            </button>
          </div>
        </div>

        <!-- Expanded Category Content -->
        <div v-show="!isCategoryCollapsed(sec.category.id)" class="animate-in fade-in-50 duration-200">
          
          <!-- Empty Category Notice -->
          <div v-if="sec.items.length === 0" class="py-8 text-center bg-muted/20 border border-dashed rounded-2xl text-xs text-muted-foreground">
            {{ $t('menu_empty_title') }}
            <NuxtLink 
              v-if="sec.category.id !== 'uncategorized'"
              :to="`/merchant/menu/items/create?category_id=${sec.category.id}`" 
              class="text-primary font-bold ml-1 hover:underline inline-flex items-center gap-0.5"
            >
              <span>+ {{ $t('menu_btn_add_item') }}</span>
            </NuxtLink>
          </div>

          <!-- MODE A: GRID CARDS VIEW -->
          <div v-else-if="viewMode === 'grid'" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div 
              v-for="item in sec.items" 
              :key="item.id" 
              class="bg-background border rounded-2xl p-4 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between group relative"
              :class="!item.is_available ? 'opacity-70 bg-slate-50/50 dark:bg-neutral-900/50' : ''"
            >
              <!-- Food Info Row -->
              <div class="flex gap-3 items-start">
                <!-- Thumbnail -->
                <div class="w-20 h-20 min-w-20 min-h-20 max-w-20 max-h-20 aspect-square rounded-2xl bg-muted overflow-hidden shrink-0 relative border border-border/40">
                  <img 
                    v-if="item.photo_url || item.image_url" 
                    :src="item.photo_url || item.image_url" 
                    class="w-full h-full object-cover group-hover:scale-105 transition-transform" 
                    alt="Food thumbnail" 
                  />
                  <div v-else class="w-full h-full flex items-center justify-center text-2xl">🍲</div>
                  
                  <div 
                    v-if="item.is_spicy" 
                    class="absolute bottom-1 right-1 bg-black/70 backdrop-blur-xs rounded-md px-1 py-0.5 text-[9px] text-white font-bold"
                  >
                    🌶️ {{ item.spicy_level > 1 ? item.spicy_level : '' }}
                  </div>
                </div>

                <!-- Titles -->
                <div class="flex-1 min-w-0">
                  <h3 class="font-bold text-foreground text-sm truncate leading-tight">
                    {{ getItemDisplayName(item) }}
                  </h3>
                  
                  <p v-if="getItemSubName(item)" class="text-[11px] text-muted-foreground truncate mt-0.5 font-medium">
                    {{ getItemSubName(item) }}
                  </p>

                  <div class="flex items-center gap-1.5 mt-1.5 flex-wrap">
                    <span 
                      class="px-2 py-0.5 rounded-md text-[10px] font-bold"
                      :class="item.is_available ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'"
                    >
                      {{ item.is_available ? `● ${$t('menu_item_status_on')}` : `○ ${$t('menu_item_status_off')}` }}
                    </span>

                    <span 
                      v-if="item.menu_item_customizations?.length > 0"
                      class="px-1.5 py-0.5 rounded-md bg-muted text-[10px] font-bold text-muted-foreground"
                    >
                      🎛️ {{ item.menu_item_customizations.length }} ตัวเลือก
                    </span>
                  </div>
                </div>
              </div>

              <!-- Description (if any) -->
              <p v-if="getItemDesc(item)" class="text-xs text-muted-foreground mt-2 line-clamp-2 leading-relaxed">
                {{ getItemDesc(item) }}
              </p>

              <!-- Bottom Action Bar (Price, Toggle, Edit, Delete) -->
              <div class="mt-3 pt-2.5 border-t flex items-center justify-between gap-2">
                <span class="font-bold text-primary text-sm">
                  {{ formatPrice(item.price) }}
                </span>

                <div class="flex items-center gap-1.5">
                  <!-- Toggle Active / Sold out Switch Button -->
                  <button 
                    type="button"
                    @click="toggleAvailability(item)"
                    class="px-2.5 py-1 rounded-xl text-[11px] font-semibold transition-colors inline-flex items-center gap-1"
                    :class="item.is_available ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-neutral-800 dark:text-neutral-300' : 'bg-emerald-100 hover:bg-emerald-200 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'"
                    :title="$t('menu_item_toggle_avail_title')"
                  >
                    <CheckCircle2 v-if="item.is_available" class="w-3.5 h-3.5 text-emerald-600" />
                    <XCircle v-else class="w-3.5 h-3.5 text-rose-600" />
                    <span>{{ item.is_available ? $t('menu_item_status_on') : $t('menu_item_status_off') }}</span>
                  </button>

                  <!-- Edit Dish -->
                  <NuxtLink 
                    :to="`/merchant/menu/items/${item.id}`"
                    class="p-1.5 rounded-xl border bg-background hover:bg-muted text-foreground transition-colors"
                    :title="$t('menu_item_btn_edit')"
                  >
                    <Edit class="w-3.5 h-3.5" />
                  </NuxtLink>

                  <!-- Delete Dish -->
                  <button 
                    type="button"
                    @click="deleteMenuItem(item)"
                    class="p-1.5 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-600 transition-colors"
                    :title="$t('menu_item_btn_del')"
                  >
                    <Trash2 class="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- MODE B: COMPACT TABLE / LIST VIEW (Space Efficient for 50-100+ items) -->
          <div v-else class="border rounded-2xl overflow-hidden bg-background">
            <table class="w-full text-left text-xs border-collapse">
              <thead>
                <tr class="bg-muted/40 border-b text-[11px] text-muted-foreground font-bold">
                  <th class="p-3 w-14 text-center">{{ $t('menu_compact_col_photo') }}</th>
                  <th class="p-3">{{ $t('menu_compact_col_name') }}</th>
                  <th class="p-3 w-28">{{ $t('menu_compact_col_price') }}</th>
                  <th class="p-3 w-32 text-center">{{ $t('menu_compact_col_status') }}</th>
                  <th class="p-3 w-24 text-right">{{ $t('menu_compact_col_actions') }}</th>
                </tr>
              </thead>
              <tbody class="divide-y">
                <tr 
                  v-for="item in sec.items" 
                  :key="item.id"
                  class="hover:bg-muted/20 transition-colors"
                  :class="!item.is_available ? 'opacity-70 bg-slate-50/50 dark:bg-neutral-900/50' : ''"
                >
                  <!-- Photo Thumbnail -->
                  <td class="p-2 text-center">
                    <div class="w-10 h-10 rounded-xl bg-muted overflow-hidden mx-auto border border-border/40">
                      <img 
                        v-if="item.photo_url || item.image_url" 
                        :src="item.photo_url || item.image_url" 
                        class="w-full h-full object-cover" 
                        alt="Thumbnail" 
                      />
                      <div v-else class="w-full h-full flex items-center justify-center text-sm">🍲</div>
                    </div>
                  </td>

                  <!-- Name & Badges -->
                  <td class="p-3">
                    <div class="flex items-center gap-1.5 flex-wrap">
                      <span class="font-bold text-foreground">{{ getItemDisplayName(item) }}</span>
                      <span v-if="item.is_spicy" class="text-[10px]">🌶️</span>
                      <span v-if="item.menu_item_customizations?.length" class="text-[10px] text-muted-foreground">🎛️</span>
                    </div>
                    <p v-if="getItemSubName(item)" class="text-[11px] text-muted-foreground mt-0.5">
                      {{ getItemSubName(item) }}
                    </p>
                  </td>

                  <!-- Price -->
                  <td class="p-3 font-bold text-primary">
                    {{ formatPrice(item.price) }}
                  </td>

                  <!-- Status Toggle Switch -->
                  <td class="p-3 text-center">
                    <button 
                      type="button"
                      @click="toggleAvailability(item)"
                      class="px-2.5 py-1 rounded-xl text-[10px] font-bold transition-colors inline-flex items-center gap-1"
                      :class="item.is_available ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-rose-100 text-rose-800 hover:bg-rose-200 dark:bg-rose-950 dark:text-rose-300'"
                    >
                      <CheckCircle2 v-if="item.is_available" class="w-3 h-3 text-emerald-600" />
                      <XCircle v-else class="w-3 h-3 text-rose-600" />
                      <span>{{ item.is_available ? 'เปิดขาย' : 'หมด' }}</span>
                    </button>
                  </td>

                  <!-- Actions -->
                  <td class="p-3 text-right">
                    <div class="flex items-center justify-end gap-1.5">
                      <NuxtLink 
                        :to="`/merchant/menu/items/${item.id}`"
                        class="p-1.5 rounded-lg border bg-background hover:bg-muted text-foreground transition-colors"
                        :title="$t('menu_item_btn_edit')"
                      >
                        <Edit class="w-3.5 h-3.5" />
                      </NuxtLink>
                      <button 
                        type="button"
                        @click="deleteMenuItem(item)"
                        class="p-1.5 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-600 transition-colors"
                        :title="$t('menu_item_btn_del')"
                      >
                        <Trash2 class="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

        </div>

      </div>
    </div>

    <!-- 8. QUICK ADD CATEGORY MODAL -->
    <div 
      v-if="isAddCategoryModalOpen" 
      class="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
    >
      <div class="bg-card w-full max-w-md rounded-3xl p-6 shadow-2xl border space-y-4">
        <div class="flex items-center justify-between border-b pb-3">
          <div class="flex items-center gap-2">
            <div class="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
              <FolderPlus class="w-4 h-4" />
            </div>
            <div>
              <h3 class="text-sm font-black text-foreground">{{ $t('menu_modal_quick_cat_title') }}</h3>
              <p class="text-[10px] text-muted-foreground">{{ $t('menu_modal_quick_cat_desc') }}</p>
            </div>
          </div>
          <button @click="isAddCategoryModalOpen = false" class="p-1 rounded-lg hover:bg-muted text-muted-foreground">
            <X class="w-4 h-4" />
          </button>
        </div>

        <form @submit.prevent="saveQuickCategory" class="space-y-3.5">
          <div>
            <div class="flex items-center justify-between mb-1">
              <label class="block text-xs font-bold text-foreground">
                {{ $t('settings_name_th') }} <span class="text-rose-500">*</span>
              </label>
              <button 
                type="button" 
                @click="translateQuickCategory" 
                :disabled="isTranslatingCat || !newCatNameTh.trim()"
                class="inline-flex items-center gap-1 text-[11px] font-bold text-purple-600 hover:text-purple-700"
              >
                <Sparkles class="w-3 h-3" :class="isTranslatingCat ? 'animate-spin' : ''" />
                <span>{{ isTranslatingCat ? $t('menu_modal_btn_translating') : $t('menu_modal_btn_translate_ai') }}</span>
              </button>
            </div>
            <input 
              v-model="newCatNameTh" 
              type="text" 
              placeholder="เช่น อาหารจานด่วน, ของหวาน" 
              required
              class="w-full px-3.5 py-2 bg-muted/40 border rounded-xl text-xs focus:ring-2 focus:ring-primary/20 focus:border-primary outline-hidden"
            />
          </div>

          <div>
            <label class="block text-xs font-bold text-foreground mb-1">{{ $t('settings_name_en') }}</label>
            <input 
              v-model="newCatNameEn" 
              type="text" 
              placeholder="e.g. Fast Food, Desserts" 
              class="w-full px-3.5 py-2 bg-muted/40 border rounded-xl text-xs focus:ring-2 focus:ring-primary/20 focus:border-primary outline-hidden"
            />
          </div>

          <div>
            <label class="block text-xs font-bold text-foreground mb-1">{{ $t('settings_name_zh') }}</label>
            <input 
              v-model="newCatNameZh" 
              type="text" 
              placeholder="例如 快餐, 甜点" 
              class="w-full px-3.5 py-2 bg-muted/40 border rounded-xl text-xs focus:ring-2 focus:ring-primary/20 focus:border-primary outline-hidden"
            />
          </div>

          <div class="flex justify-end gap-2 pt-3 border-t">
            <button 
              type="button" 
              @click="isAddCategoryModalOpen = false" 
              class="px-4 py-2 bg-muted hover:bg-muted/80 text-foreground font-bold text-xs rounded-xl transition-colors"
            >
              {{ $t('menu_modal_btn_cancel') }}
            </button>
            <button 
              type="submit" 
              :disabled="isAddingCat"
              class="px-5 py-2 bg-primary hover:bg-primary/90 text-primary-foreground font-black text-xs rounded-xl shadow-xs disabled:opacity-50 transition-all"
            >
              {{ isAddingCat ? $t('menu_modal_btn_saving') : $t('menu_modal_btn_save') }}
            </button>
          </div>
        </form>
      </div>
    </div>

  </div>
</template>
