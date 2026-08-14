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
  X
} from 'lucide-vue-next'

definePageMeta({
  layout: 'merchant',
  middleware: ['auth']
})

const client = useSupabaseClient()
const { store, fetchStore } = useCurrentStore()

const loading = ref(true)
const categories = ref<any[]>([])
const menuItems = ref<any[]>([])
const searchQuery = ref('')
const selectedCategoryFilter = ref('all')
const statusFilter = ref<'all' | 'available' | 'soldout'>('all')

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
          .select('*, menu_categories(name_th)')
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

// === Quick Availability Toggle (ปิด/เปิด การขาย) ===
const toggleAvailability = async (item: any) => {
  const newStatus = !item.is_available
  item.is_available = newStatus // Optimistic
  
  const { error } = await (client as any)
    .from('menu_items')
    .update({ is_available: newStatus })
    .eq('id', item.id)

  if (error) {
    item.is_available = !newStatus // Revert
    alert('ไม่สามารถอัปเดตสถานะได้')
  }
}

// === Delete Menu Item (ลบเมนูอาหาร) ===
const deleteMenuItem = async (item: any) => {
  const swal = useAlert()
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
    swal.fire('Error', 'ไม่สามารถลบรายการอาหารได้', 'error')
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
    const swal = useAlert()
    swal.fire({ title: 'สร้างหมวดหมู่สำเร็จ!', icon: 'success', timer: 1200, showConfirmButton: false })
  } else {
    alert('ไม่สามารถสร้างหมวดหมู่ได้')
  }
}

// === Category Grouped Computed ===
const categorySections = computed(() => {
  // 1. Filter items first
  let filtered = menuItems.value

  if (statusFilter.value === 'available') {
    filtered = filtered.filter(i => i.is_available)
  } else if (statusFilter.value === 'soldout') {
    filtered = filtered.filter(i => !i.is_available)
  }

  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase().trim()
    filtered = filtered.filter(i => {
      const nTh = (i.name_th || '').toLowerCase()
      const nEn = (i.name_en || '').toLowerCase()
      const nZh = (i.name_zh || '').toLowerCase()
      return nTh.includes(q) || nEn.includes(q) || nZh.includes(q)
    })
  }

  // 2. Group by category
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
  if (selectedCategoryFilter.value === 'all' && uncategorizedItems.length > 0) {
    sections.push({
      category: { id: 'uncategorized', name_th: 'ยังไม่ได้จัดหมวดหมู่', name_en: 'Uncategorized' },
      items: uncategorizedItems
    })
  }

  return sections
})

const stats = computed(() => {
  const total = menuItems.value.length
  const available = menuItems.value.filter(i => i.is_available).length
  const soldout = total - available
  return { total, available, soldout, categoriesCount: categories.value.length }
})

const formatPrice = (price: any) => {
  return new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', minimumFractionDigits: 0 }).format(Number(price || 0))
}
</script>

<template>
  <div class="space-y-6 pb-20">
    
    <!-- 1. Header & Navigation Actions -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-card to-card/80 border p-5 sm:p-6 rounded-3xl shadow-xs">
      <div>
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
            <UtensilsCrossed class="w-5 h-5" />
          </div>
          <div>
            <h1 class="text-xl font-bold text-foreground">จัดการเมนูอาหาร (Menu Management)</h1>
            <p class="text-xs text-muted-foreground">จัดหมวดหมู่ เพิ่ม ลบ แก้ไข และเปิด/ปิดการจำหน่ายอาหารในร้านของคุณ</p>
          </div>
        </div>
      </div>

      <!-- Quick Action Buttons -->
      <div class="flex items-center gap-2 flex-wrap sm:flex-nowrap">
        <!-- Quick Add Category Trigger Button -->
        <button 
          type="button"
          @click="isAddCategoryModalOpen = true" 
          class="px-3.5 py-2.5 bg-muted/60 hover:bg-muted text-foreground font-semibold text-xs rounded-2xl border transition-all inline-flex items-center gap-1.5"
        >
          <FolderPlus class="w-4 h-4 text-primary" />
          <span>+ สร้างหมวดหมู่ใหม่</span>
        </button>

        <NuxtLink 
          to="/merchant/menu/categories" 
          class="px-3.5 py-2.5 bg-muted/60 hover:bg-muted text-foreground font-semibold text-xs rounded-2xl border transition-all inline-flex items-center gap-1.5"
        >
          <Layers class="w-4 h-4 text-muted-foreground" />
          <span>จัดการหมวดหมู่</span>
        </NuxtLink>

        <NuxtLink 
          to="/merchant/menu/customizations" 
          class="px-3.5 py-2.5 bg-muted/60 hover:bg-muted text-foreground font-semibold text-xs rounded-2xl border transition-all inline-flex items-center gap-1.5"
        >
          <Sliders class="w-4 h-4 text-muted-foreground" />
          <span>ตัวเลือกพิเศษ (Add-ons)</span>
        </NuxtLink>

        <NuxtLink 
          to="/merchant/menu/items/create" 
          class="px-4 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs rounded-2xl shadow-sm transition-all inline-flex items-center gap-1.5 shrink-0"
        >
          <Plus class="w-4 h-4" />
          <span>+ เพิ่มเมนูอาหาร</span>
        </NuxtLink>
      </div>
    </div>

    <!-- 2. Quick Stat Counters -->
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <div class="bg-card border rounded-2xl p-4 flex items-center gap-3 shadow-2xs">
        <div class="w-10 h-10 rounded-xl bg-slate-100 dark:bg-neutral-800 text-foreground flex items-center justify-center font-bold text-sm">
          {{ stats.total }}
        </div>
        <div>
          <p class="text-[11px] text-muted-foreground font-medium">เมนูทั้งหมด</p>
          <p class="text-sm font-bold text-foreground">{{ stats.total }} รายการ</p>
        </div>
      </div>

      <div class="bg-card border rounded-2xl p-4 flex items-center gap-3 shadow-2xs">
        <div class="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-sm">
          {{ stats.available }}
        </div>
        <div>
          <p class="text-[11px] text-muted-foreground font-medium">พร้อมขาย (Active)</p>
          <p class="text-sm font-bold text-emerald-600">{{ stats.available }} รายการ</p>
        </div>
      </div>

      <div class="bg-card border rounded-2xl p-4 flex items-center gap-3 shadow-2xs">
        <div class="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center font-bold text-sm">
          {{ stats.soldout }}
        </div>
        <div>
          <p class="text-[11px] text-muted-foreground font-medium">สินค้าหมด (Sold out)</p>
          <p class="text-sm font-bold text-rose-600">{{ stats.soldout }} รายการ</p>
        </div>
      </div>

      <div class="bg-card border rounded-2xl p-4 flex items-center gap-3 shadow-2xs">
        <div class="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-sm">
          {{ stats.categoriesCount }}
        </div>
        <div>
          <p class="text-[11px] text-muted-foreground font-medium">หมวดหมู่อาหาร</p>
          <p class="text-sm font-bold text-amber-600">{{ stats.categoriesCount }} หมวด</p>
        </div>
      </div>
    </div>

    <!-- 3. Search & Filter Sticky Bar -->
    <div class="bg-card border rounded-2xl p-4 space-y-3 shadow-2xs">
      <div class="flex flex-col sm:flex-row items-center gap-3">
        <!-- Search Input -->
        <div class="relative flex-1 w-full">
          <Search class="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input 
            v-model="searchQuery" 
            type="text" 
            placeholder="ค้นหาชื่อเมนู (ไทย / English / 中文)..." 
            class="w-full pl-9 pr-4 py-2 bg-muted/40 border rounded-xl text-xs font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary outline-hidden"
          />
        </div>

        <!-- Status Filter Buttons -->
        <div class="flex items-center gap-1 bg-muted/50 p-1 rounded-xl w-full sm:w-auto shrink-0">
          <button 
            @click="statusFilter = 'all'" 
            class="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex-1 sm:flex-none"
            :class="statusFilter === 'all' ? 'bg-background text-foreground shadow-2xs' : 'text-muted-foreground hover:text-foreground'"
          >
            ทั้งหมด
          </button>
          <button 
            @click="statusFilter = 'available'" 
            class="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex-1 sm:flex-none"
            :class="statusFilter === 'available' ? 'bg-background text-emerald-600 shadow-2xs' : 'text-muted-foreground hover:text-foreground'"
          >
            มีขาย
          </button>
          <button 
            @click="statusFilter = 'soldout'" 
            class="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex-1 sm:flex-none"
            :class="statusFilter === 'soldout' ? 'bg-background text-rose-600 shadow-2xs' : 'text-muted-foreground hover:text-foreground'"
          >
            หมด
          </button>
        </div>
      </div>

      <!-- Category Filter Tabs -->
      <div class="flex items-center gap-2 overflow-x-auto hide-scrollbar pt-1">
        <button 
          @click="selectedCategoryFilter = 'all'" 
          class="px-3 py-1 rounded-xl text-xs font-semibold transition-all shrink-0"
          :class="selectedCategoryFilter === 'all' ? 'bg-primary text-primary-foreground' : 'bg-muted/50 text-muted-foreground hover:text-foreground'"
        >
          🌟 ทุกหมวดหมู่ ({{ stats.total }})
        </button>

        <button 
          v-for="cat in categories" 
          :key="cat.id" 
          @click="selectedCategoryFilter = cat.id" 
          class="px-3 py-1 rounded-xl text-xs font-semibold transition-all shrink-0"
          :class="selectedCategoryFilter === cat.id ? 'bg-primary text-primary-foreground' : 'bg-muted/50 text-muted-foreground hover:text-foreground'"
        >
          {{ cat.name_th }} ({{ menuItems.filter(i => i.category_id === cat.id).length }})
        </button>
      </div>
    </div>

    <!-- 4. Loading State -->
    <div v-if="loading" class="py-20 text-center space-y-3 bg-card border rounded-3xl">
      <div class="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
      <p class="text-xs font-bold text-muted-foreground animate-pulse">กำลังโหลดรายการอาหาร...</p>
    </div>

    <!-- 5. Empty State (No Categories & No Items) -->
    <div v-else-if="categories.length === 0 && menuItems.length === 0" class="py-16 text-center space-y-4 bg-card border rounded-3xl p-6">
      <div class="w-16 h-16 bg-primary/10 text-primary rounded-2xl flex items-center justify-center text-3xl mx-auto">
        🍲
      </div>
      <div>
        <h3 class="text-base font-bold text-foreground">ยังไม่มีรายการอาหารในร้าน</h3>
        <p class="text-xs text-muted-foreground mt-1">เริ่มต้นง่ายๆ โดยการสร้างหมวดหมู่แรกของคุณ แล้วเพิ่มรายการอาหารลงในระบบ</p>
      </div>
      <button 
        @click="isAddCategoryModalOpen = true" 
        class="inline-flex items-center gap-1.5 px-5 py-2.5 bg-primary text-primary-foreground font-bold text-xs rounded-xl shadow-xs"
      >
        <FolderPlus class="w-4 h-4" />
        <span>+ สร้างหมวดหมู่แรกของร้าน</span>
      </button>
    </div>

    <!-- 6. CATEGORY-FIRST GROUPED LIST (Responsive for Mobile, iPad, and Desktop) -->
    <div v-else class="space-y-6">
      <div 
        v-for="sec in categorySections" 
        :key="sec.category.id" 
        class="bg-card border rounded-3xl overflow-hidden shadow-xs space-y-4 p-5 sm:p-6"
      >
        <!-- Category Section Header -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-2xl bg-muted flex items-center justify-center text-primary font-bold">
              <Layers class="w-5 h-5" />
            </div>
            <div>
              <div class="flex items-center gap-2">
                <h2 class="text-base font-bold text-foreground">{{ sec.category.name_th }}</h2>
                <span class="px-2 py-0.5 rounded-full bg-muted text-[10px] font-bold text-muted-foreground">
                  {{ sec.items.length }} รายการ
                </span>
                <span 
                  v-if="sec.category.is_active === false"
                  class="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[10px] font-bold"
                >
                  ซ่อนหมวดนี้
                </span>
              </div>
              <p v-if="sec.category.name_en" class="text-xs text-muted-foreground mt-0.5 font-medium">
                {{ sec.category.name_en }} <span v-if="sec.category.name_zh">• {{ sec.category.name_zh }}</span>
              </p>
            </div>
          </div>

          <!-- Category Section Quick Actions -->
          <div class="flex items-center gap-2 self-end sm:self-auto">
            <!-- Add Item Directly To This Category Button -->
            <NuxtLink 
              v-if="sec.category.id !== 'uncategorized'"
              :to="`/merchant/menu/items/create?category_id=${sec.category.id}`"
              class="px-3 py-1.5 bg-primary/10 hover:bg-primary text-primary hover:text-primary-foreground font-semibold text-xs rounded-xl transition-all inline-flex items-center gap-1"
            >
              <Plus class="w-3.5 h-3.5" />
              <span>+ เพิ่มเมนูในหมวดนี้</span>
            </NuxtLink>

            <NuxtLink 
              v-if="sec.category.id !== 'uncategorized'"
              to="/merchant/menu/categories"
              class="p-1.5 bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground rounded-xl transition-colors"
              title="จัดการหมวดหมู่นี้"
            >
              <Edit class="w-3.5 h-3.5" />
            </NuxtLink>
          </div>
        </div>

        <!-- Category Items Grid -->
        <div v-if="sec.items.length === 0" class="py-8 text-center bg-muted/20 border border-dashed rounded-2xl text-xs text-muted-foreground">
          ยังไม่มีเมนูในหมวดหมู่นี้ 
          <NuxtLink 
            v-if="sec.category.id !== 'uncategorized'"
            :to="`/merchant/menu/items/create?category_id=${sec.category.id}`" 
            class="text-primary font-bold ml-1 hover:underline inline-flex items-center gap-0.5"
          >
            <span>+ เพิ่มเมนูเลย</span>
          </NuxtLink>
        </div>

        <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div 
            v-for="item in sec.items" 
            :key="item.id" 
            class="bg-background border rounded-2xl p-4 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between group relative"
            :class="!item.is_available ? 'opacity-70 bg-slate-50/50 dark:bg-neutral-900/50' : ''"
          >
            <!-- Food Info Row -->
            <div class="flex gap-3 items-start">
              <!-- Thumbnail -->
              <div class="w-18 h-18 rounded-2xl bg-muted overflow-hidden shrink-0 relative border border-border/40">
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
                  {{ item.name_th }}
                </h3>
                
                <p v-if="item.name_en" class="text-[11px] text-muted-foreground truncate mt-0.5 font-medium">
                  {{ item.name_en }}
                </p>

                <div class="flex items-center gap-1.5 mt-1.5 flex-wrap">
                  <span 
                    class="px-2 py-0.5 rounded-md text-[10px] font-bold"
                    :class="item.is_available ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'"
                  >
                    {{ item.is_available ? '● มีขาย' : '○ หมด' }}
                  </span>
                </div>
              </div>
            </div>

            <!-- Description (if any) -->
            <p v-if="item.description_th" class="text-xs text-muted-foreground mt-2 line-clamp-2 leading-relaxed">
              {{ item.description_th }}
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
                  :class="item.is_available ? 'bg-slate-100 hover:bg-slate-200 text-slate-700' : 'bg-emerald-100 hover:bg-emerald-200 text-emerald-800'"
                  :title="item.is_available ? 'กดเพื่อตั้งเป็นสินค้าหมด' : 'กดเพื่อเปิดขาย'"
                >
                  <EyeOff v-if="item.is_available" class="w-3 h-3 text-muted-foreground" />
                  <Eye v-else class="w-3 h-3 text-emerald-600" />
                  <span>{{ item.is_available ? 'ปิดขาย' : 'เปิดขาย' }}</span>
                </button>

                <!-- Edit Button -->
                <NuxtLink 
                  :to="`/merchant/menu/items/${item.id}`" 
                  class="p-1.5 bg-muted/60 hover:bg-primary hover:text-white rounded-xl text-muted-foreground transition-colors"
                  title="แก้ไขเมนู"
                >
                  <Edit class="w-3.5 h-3.5" />
                </NuxtLink>

                <!-- Delete Button -->
                <button 
                  type="button"
                  @click="deleteMenuItem(item)"
                  class="p-1.5 bg-muted/60 hover:bg-rose-600 hover:text-white rounded-xl text-muted-foreground transition-colors"
                  title="ลบเมนู"
                >
                  <Trash2 class="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>

    <!-- 7. Quick Create Category Modal (สร้างหมวดหมู่ด่วน) -->
    <div 
      v-if="isAddCategoryModalOpen" 
      class="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
    >
      <div class="bg-card w-full max-w-md rounded-3xl p-6 shadow-2xl border space-y-4 animate-in zoom-in-95 duration-200">
        <div class="flex items-center justify-between border-b pb-3">
          <div class="flex items-center gap-2">
            <FolderPlus class="w-5 h-5 text-primary" />
            <h3 class="text-sm font-bold text-foreground">สร้างหมวดหมู่ใหม่</h3>
          </div>
          <button @click="isAddCategoryModalOpen = false" class="p-1 rounded-lg hover:bg-muted text-muted-foreground">
            <X class="w-4 h-4" />
          </button>
        </div>

        <form @submit.prevent="saveQuickCategory" class="space-y-3">
          <div>
            <label class="block text-xs font-semibold text-foreground mb-1">
              ชื่อหมวดหมู่ (ภาษาไทย) <span class="text-rose-500">*</span>
            </label>
            <input 
              v-model="newCatNameTh" 
              type="text" 
              placeholder="เช่น ต้ม/แกง, อาหารทานเล่น, ของหวาน"
              required
              class="w-full px-3 py-2 bg-muted/40 border rounded-xl text-xs focus:ring-2 focus:ring-primary/20 focus:border-primary outline-hidden"
            />
          </div>

          <div>
            <label class="block text-xs font-semibold text-foreground mb-1">
              ชื่อภาษาอังกฤษ (English)
            </label>
            <input 
              v-model="newCatNameEn" 
              type="text" 
              placeholder="e.g. Soups & Curries, Appetizers"
              class="w-full px-3 py-2 bg-muted/40 border rounded-xl text-xs focus:ring-2 focus:ring-primary/20 focus:border-primary outline-hidden"
            />
          </div>

          <div>
            <label class="block text-xs font-semibold text-foreground mb-1">
              ชื่อภาษาจีน (中文)
            </label>
            <input 
              v-model="newCatNameZh" 
              type="text" 
              placeholder="例如 汤类, 小吃"
              class="w-full px-3 py-2 bg-muted/40 border rounded-xl text-xs focus:ring-2 focus:ring-primary/20 focus:border-primary outline-hidden"
            />
          </div>

          <div class="flex items-center justify-between pt-3">
            <button 
              type="button"
              @click.prevent="translateQuickCategory"
              :disabled="isTranslatingCat || !newCatNameTh"
              class="inline-flex items-center gap-1.5 px-3 py-1 bg-purple-50 text-purple-700 rounded-xl text-xs font-semibold"
            >
              <Sparkles class="w-3.5 h-3.5 text-purple-600" :class="isTranslatingCat ? 'animate-spin' : ''" />
              <span>แปลภาษา AI</span>
            </button>

            <div class="flex items-center gap-2">
              <button 
                type="button" 
                @click="isAddCategoryModalOpen = false"
                class="px-4 py-2 bg-muted text-foreground font-semibold text-xs rounded-xl"
              >
                ยกเลิก
              </button>
              <button 
                type="submit" 
                :disabled="isAddingCat || !newCatNameTh.trim()"
                class="px-5 py-2 bg-primary text-primary-foreground font-bold text-xs rounded-xl shadow-xs"
              >
                {{ isAddingCat ? 'กำลังสร้าง...' : 'สร้างหมวดหมู่' }}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>

  </div>
</template>
