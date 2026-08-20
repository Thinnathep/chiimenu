<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { 
  Search, 
  Mic, 
  Volume2, 
  Plus, 
  Minus, 
  ShoppingBag, 
  X, 
  Check, 
  AlertTriangle, 
  Sparkles, 
  Store, 
  MapPin, 
  Clock, 
  ChevronRight,
  Flame,
  ShieldAlert,
  Info
} from 'lucide-vue-next'

definePageMeta({
  layout: 'tourist'
})

const route = useRoute()
const client = useSupabaseClient()

const shortCode = route.params.shortCode as string
const loading = ref(true)
const store = ref<any>(null)
const categories = ref<any[]>([])
const menuItems = ref<any[]>([])
const activeCategory = ref<string>('all')
const isStoreLocked = ref(false)

const { t, locale, locales, setLocale } = useI18n()

// === Voice Search State (STT) ===
const isListening = ref(false)
const searchQuery = ref('')
let recognition: any = null

// === Cart & Order State ===
const cart = ref<any[]>([])
const isCartOpen = ref(false)
const orderType = ref<'dinein' | 'takeaway'>('dinein')
const tableNo = ref('')
const customerName = ref('')
const finalAssignedTable = ref('')
const orderNote = ref('')
const isSubmitting = ref(false)
const orderSuccess = ref(false)

// === Item Selection Modal ===
interface AddonOptionSelection {
  name: string
  name_th?: string
  name_en?: string
  name_zh?: string
  price: number
}

const selectedItem = ref<any>(null)
const itemSpiceLevel = ref<number>(1)
const itemAddons = ref<Record<string, AddonOptionSelection>>({})
const itemQuantity = ref<number>(1)
const itemNote = ref('')

onMounted(async () => {
  try {
    let targetStoreId: string | null = null

    // 1a. Try to match from qr_codes table (short_code)
    const { data: qrData } = (await (client as any)
      .from('qr_codes')
      .select('store_id, id')
      .eq('short_code', shortCode)
      .eq('is_active', true)
      .maybeSingle()) as any
      
    if (qrData?.store_id) {
      targetStoreId = qrData.store_id
    } else {
      // 1b. Fallback: Try by store slug
      const { data: storeBySlug } = (await (client as any)
        .from('stores')
        .select('id, is_active')
        .eq('slug', shortCode)
        .maybeSingle()) as any

      if (storeBySlug?.id) {
        targetStoreId = storeBySlug.id
      } else {
        // 1c. Fallback: Try by store ID directly
        const { data: storeById } = (await (client as any)
          .from('stores')
          .select('id, is_active')
          .eq('id', shortCode)
          .maybeSingle()) as any

        if (storeById?.id) {
          targetStoreId = storeById.id
        }
      }
    }

    if (!targetStoreId) {
      loading.value = false
      return
    }

    // 2. Fetch Store, Categories, and Menu Items in parallel
    const [storeRes, catRes, itemRes] = await Promise.all([
      (client as any)
        .from('stores')
        .select('*')
        .eq('id', targetStoreId)
        .single(),
      (client as any)
        .from('menu_categories')
        .select('*')
        .eq('store_id', targetStoreId)
        .eq('is_active', true)
        .order('sort_order'),
      (client as any)
        .from('menu_items')
        .select(`
          *,
          menu_item_allergens (
            allergens (*)
          ),
          menu_item_customizations (
            customization_groups (
              *,
              customization_options (*)
            )
          )
        `)
        .eq('store_id', targetStoreId)
        .eq('is_available', true)
        .order('sort_order')
    ])

    const storeData = storeRes.data as any
    if (storeData) {
      if (storeData.is_active === false) {
        loading.value = false
        return
      }

      store.value = storeData
      if (storeData.default_language && ['th', 'en', 'zh'].includes(storeData.default_language)) {
        locale.value = storeData.default_language
      }
      
      // Check plan expiration
      if (storeData.trial_ends_at) {
        const planEnd = new Date(storeData.trial_ends_at).getTime()
        const now = new Date().getTime()
        if (planEnd < now) {
          isStoreLocked.value = true
          loading.value = false
          return
        }
      }
    }

    categories.value = catRes.data || []
    menuItems.value = itemRes.data || []
    
    // Init Voice Search
    initSpeechRecognition()
    
  } catch (error) {
    console.error('Fetch tourist menu error:', error)
  } finally {
    loading.value = false
  }
})

// === Voice Search (STT) ===
const initSpeechRecognition = () => {
  // @ts-ignore
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
  if (SpeechRecognition) {
    recognition = new SpeechRecognition()
    recognition.continuous = false
    recognition.interimResults = false
    
    recognition.onstart = () => { isListening.value = true }
    recognition.onend = () => { isListening.value = false }
    recognition.onerror = () => { isListening.value = false }
    
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript
      searchQuery.value = transcript
      activeCategory.value = 'all'
    }
  }
}

const toggleVoiceSearch = () => {
  if (!recognition) {
    alert(t('not_available') || 'Voice search is not supported in this browser.')
    return
  }
  if (isListening.value) {
    recognition.stop()
  } else {
    recognition.lang = locale.value === 'en' ? 'en-US' : (locale.value === 'zh' ? 'zh-CN' : 'th-TH')
    recognition.start()
  }
}

// === Text to Speech (Pronunciation) ===
const speakThaiName = (e: Event, textTh: string) => {
  e?.stopPropagation?.()
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(textTh)
    utterance.lang = 'th-TH'
    utterance.rate = 0.85
    window.speechSynthesis.speak(utterance)
  }
}

const playPronunciation = (textTh: string) => {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(textTh)
    utterance.lang = 'th-TH'
    utterance.rate = 0.85
    window.speechSynthesis.speak(utterance)
  }
}

// === Item Modal & Options ===
const openItemModal = (item: any) => {
  selectedItem.value = item
  itemSpiceLevel.value = item.spicy_level || 1
  itemAddons.value = {}
  itemQuantity.value = 1
  itemNote.value = ''
}

const closeItemModal = () => {
  selectedItem.value = null
}

const selectAddonOption = (groupId: string, option: any) => {
  itemAddons.value[groupId] = {
    name: option[`name_${locale.value}`] || option.name_en || option.name_th,
    name_th: option.name_th || '',
    name_en: option.name_en || '',
    name_zh: option.name_zh || '',
    price: Number(option.extra_price !== undefined ? option.extra_price : (option.price_delta || option.price || 0))
  }
}

const modalCalculatedUnitPrice = computed(() => {
  if (!selectedItem.value) return 0
  let base = Number(selectedItem.value.price || 0)
  for (const key in itemAddons.value) {
    base += Number(itemAddons.value[key]?.price || 0)
  }
  return base
})

const addToCart = () => {
  if (!selectedItem.value) return
  
  const formattedAddons: string[] = []
  for (const k in itemAddons.value) {
    if (itemAddons.value[k]?.name) {
      formattedAddons.push(itemAddons.value[k].name)
    }
  }

  cart.value.push({
    id: Date.now().toString(),
    menuItem: selectedItem.value,
    spiceLevel: selectedItem.value.is_spicy ? itemSpiceLevel.value : null,
    selectedAddons: { ...itemAddons.value },
    addonNames: formattedAddons,
    note: itemNote.value.trim(),
    unitPrice: modalCalculatedUnitPrice.value,
    quantity: itemQuantity.value
  })
  
  closeItemModal()
}

const removeFromCart = (index: number) => {
  cart.value.splice(index, 1)
}

const updateCartItemQty = (index: number, delta: number) => {
  const item = cart.value[index]
  if (!item) return
  const newQty = item.quantity + delta
  if (newQty <= 0) {
    removeFromCart(index)
  } else {
    item.quantity = newQty
  }
}

const cartTotal = computed(() => {
  return cart.value.reduce((total, item) => total + (item.unitPrice * (item.quantity || 1)), 0)
})

const cartItemCount = computed(() => {
  return cart.value.reduce((total, item) => total + (item.quantity || 1), 0)
})

const submitOrder = async () => {
  const targetTable = orderType.value === 'takeaway'
    ? (customerName.value.trim() ? `กลับบ้าน (${customerName.value.trim()})` : 'กลับบ้าน / ไม่มีโต๊ะ (Takeaway)')
    : tableNo.value.trim()

  if (orderType.value === 'dinein' && !tableNo.value.trim()) {
    alert(locale.value === 'zh' ? '请填写您的桌号' : (locale.value === 'en' ? 'Please enter your Table Number' : 'กรุณาระบุหมายเลขโต๊ะ'))
    return
  }
  if (cart.value.length === 0) return

  finalAssignedTable.value = targetTable
  isSubmitting.value = true

  try {
    await $fetch('/api/order/submit', {
      method: 'POST',
      body: {
        storeId: store.value.id,
        tableNo: targetTable,
        cart: cart.value,
        note: orderNote.value.trim()
      }
    })
  } catch (e) {
    console.error('Background order sync failed:', e)
  } finally {
    isSubmitting.value = false
    orderSuccess.value = true
    isCartOpen.value = false
  }
}

// === Multilingual Helpers ===
const filteredItems = computed(() => {
  let result = menuItems.value
  
  if (activeCategory.value !== 'all') {
    result = result.filter(item => item.category_id === activeCategory.value)
  }
  
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase().trim()
    result = result.filter(item => {
      const nTh = (item.name_th || '').toLowerCase()
      const nEn = (item.name_en || '').toLowerCase()
      const nZh = (item.name_zh || '').toLowerCase()
      const dEn = (item.explanation_en || item.description_en || '').toLowerCase()
      const dZh = (item.explanation_zh || item.description_zh || '').toLowerCase()
      return nTh.includes(q) || nEn.includes(q) || nZh.includes(q) || dEn.includes(q) || dZh.includes(q)
    })
  }
  
  return result
})

const getCategoryName = (cat: any) => {
  const l = locale.value
  return cat[`name_${l}`] || cat.name_en || cat.name_th
}

const getItemName = (item: any) => {
  if (!item) return ''
  const l = locale.value
  return item[`name_${l}`] || item.name_en || item.name_th
}

const getItemDesc = (item: any) => {
  if (!item) return ''
  const l = locale.value
  return item[`explanation_${l}`] || item[`description_${l}`] || item.explanation_en || item.description_en || item.description_th || ''
}

const formatPrice = (price: number) => {
  return new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', minimumFractionDigits: 0 }).format(price)
}

const getStoreName = () => {
  if (!store.value) return ''
  const l = locale.value
  return store.value[`name_${l}`] || store.value.name_en || store.value.name
}

const getSpiceLabel = (lvl: number) => {
  if (lvl === 1) return { text: 'ไม่เผ็ด (Mild)', icon: '🟢' }
  if (lvl === 2) return { text: 'เผ็ดน้อย (Low)', icon: '🌶️' }
  if (lvl === 3) return { text: 'เผ็ดกลาง (Medium)', icon: '🌶️🌶️' }
  return { text: 'เผ็ดมาก (Hot)', icon: '🌶️🌶️🌶️' }
}
</script>

<template>
  <div class="relative min-h-screen bg-slate-50/60 dark:bg-neutral-950 font-sans selection:bg-primary/20 pb-32">
    
    <!-- 1. LOADING SKELETON -->
    <div v-if="loading" class="flex flex-col items-center justify-center min-h-[70vh] space-y-4 px-6 text-center">
      <div class="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      <p class="text-xs font-bold text-muted-foreground animate-pulse">Loading delicious menu...</p>
    </div>

    <!-- 2. STORE CLOSED -->
    <div v-else-if="!store" class="flex flex-col items-center justify-center min-h-[60vh] text-center px-6 space-y-4">
      <div class="w-20 h-20 bg-rose-50 text-rose-600 rounded-3xl flex items-center justify-center text-4xl shadow-inner">
        🚫
      </div>
      <div>
        <h2 class="text-xl font-black text-foreground">Temporarily Closed</h2>
        <p class="text-xs text-muted-foreground mt-1">ร้านค้านี้ปิดให้บริการชั่วคราว ขออภัยในความไม่สะดวก</p>
      </div>
    </div>

    <!-- 3. STORE EXPIRED / LOCKED -->
    <div v-else-if="isStoreLocked" class="flex flex-col items-center justify-center min-h-[60vh] text-center px-6 space-y-4">
      <div class="w-20 h-20 bg-amber-50 text-amber-600 rounded-3xl flex items-center justify-center text-3xl shadow-inner">
        ⏳
      </div>
      <div>
        <h2 class="text-xl font-black text-foreground">Service Unavailable</h2>
        <p class="text-xs text-muted-foreground mt-1">ร้านค้านี้หมดระยะเวลาทดลองใช้งาน กรุณาติดต่อพนักงานของร้าน</p>
      </div>
    </div>

    <!-- 4. ACTIVE MENU EXPERIENCE -->
    <div v-else class="space-y-4">
      
      <!-- Store Cover & Header Banner -->
      <div class="relative overflow-hidden bg-card border-b shadow-xs">
        <!-- Cover Photo -->
        <div class="h-24 sm:h-28 w-full bg-slate-200 dark:bg-neutral-800 relative overflow-hidden">
          <img 
            v-if="store.cover_url" 
            :src="store.cover_url" 
            class="w-full h-full object-cover" 
            alt="Store Cover"
          />
          <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
          
          <!-- Language Selector (Top Floating) -->
          <div class="absolute top-2.5 right-2.5 flex items-center gap-1 bg-black/60 backdrop-blur-md rounded-xl p-1 border border-white/20">
            <button 
              v-for="l in locales" 
              :key="l.code"
              @click="setLocale(l.code as any)"
              class="px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all"
              :class="locale === l.code ? 'bg-white text-black shadow-xs' : 'text-white/80 hover:text-white'"
            >
              {{ l.code === 'th' ? '🇹🇭 TH' : (l.code === 'en' ? '🇬🇧 EN' : '🇨🇳 中文') }}
            </button>
          </div>
        </div>

        <!-- Store Info Overlay -->
        <div class="px-4 pb-3 -mt-7 relative z-10 flex items-end gap-3">
          <!-- Logo Avatar (Strictly bounded so large images never expand) -->
          <div class="w-14 h-14 min-w-[56px] min-h-[56px] max-w-[56px] max-h-[56px] rounded-2xl bg-card border-2 border-background shadow-md overflow-hidden shrink-0 flex items-center justify-center text-xl font-black text-primary">
            <img v-if="store.logo_url" :src="store.logo_url" class="w-full h-full object-cover object-center" alt="Logo" />
            <span v-else>{{ store.name?.charAt(0) || '🏪' }}</span>
          </div>

          <!-- Store Title & Meta -->
          <div class="min-w-0 flex-1 pb-0.5">
            <h1 class="text-base font-black text-foreground truncate drop-shadow-2xs leading-tight">
              {{ getStoreName() }}
            </h1>
            <p v-if="store.address" class="text-[11px] text-muted-foreground truncate flex items-center gap-1 mt-0.5">
              <MapPin class="w-3 h-3 text-primary shrink-0" />
              <span>{{ store.address }}</span>
            </p>
          </div>
        </div>

        <!-- Search & Voice Search Bar -->
        <div class="px-4 pb-3 pt-0.5">
          <div class="relative flex items-center">
            <Search class="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input 
              v-model="searchQuery" 
              type="text" 
              :placeholder="locale === 'zh' ? '搜索菜品名称...' : (locale === 'en' ? 'Search dishes or drinks...' : 'ค้นหาเมนูอาหาร...')"
              class="w-full pl-9 pr-11 py-2 bg-muted/40 border rounded-2xl text-xs font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary outline-hidden transition-all placeholder:text-muted-foreground"
            />
            <button 
              @click="toggleVoiceSearch"
              class="absolute right-2 p-1.5 rounded-xl transition-all flex items-center justify-center"
              :class="isListening ? 'bg-rose-500 text-white animate-pulse shadow-xs' : 'text-muted-foreground hover:text-primary'"
              title="ค้นหาด้วยเสียง (Voice Search)"
            >
              <Mic class="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <!-- Category Filter Sticky Bar -->
      <div class="sticky top-14 z-30 bg-background/95 backdrop-blur-md border-b shadow-2xs py-2.5 px-4 -mx-0">
        <div class="flex items-center gap-2 overflow-x-auto hide-scrollbar">
          <button 
            @click="activeCategory = 'all'" 
            class="px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1"
            :class="activeCategory === 'all' ? 'bg-primary text-primary-foreground shadow-xs' : 'bg-muted/60 text-muted-foreground hover:text-foreground'"
          >
            <span>🌟</span>
            <span>{{ locale === 'zh' ? '全部' : (locale === 'en' ? 'All' : 'ทั้งหมด') }}</span>
          </button>

          <button 
            v-for="cat in categories" 
            :key="cat.id" 
            @click="activeCategory = cat.id" 
            class="px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0"
            :class="activeCategory === cat.id ? 'bg-primary text-primary-foreground shadow-xs' : 'bg-muted/60 text-muted-foreground hover:text-foreground'"
          >
            {{ getCategoryName(cat) }}
          </button>
        </div>
      </div>

      <!-- Menu Items List: Responsive 1 col on Mobile, 2 cols on Tablet/iPad & Desktop -->
      <div class="px-4">
        <!-- Empty Items State -->
        <div v-if="filteredItems.length === 0" class="py-16 text-center space-y-2">
          <div class="text-3xl opacity-40">🍜</div>
          <p class="text-xs font-bold text-muted-foreground">ไม่พบรายการอาหารที่ค้นหา</p>
        </div>

        <!-- Menu Item Cards Grid -->
        <div v-else class="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div 
            v-for="item in filteredItems" 
            :key="item.id" 
            @click="openItemModal(item)"
            class="bg-card border rounded-2xl p-3.5 shadow-2xs hover:shadow-md transition-all cursor-pointer flex gap-3.5 items-center group active:scale-[0.99]"
          >
            <!-- Food Thumbnail -->
            <div class="w-24 h-24 rounded-2xl bg-muted overflow-hidden shrink-0 relative border border-border/40">
              <img 
                v-if="item.photo_url || item.image_url" 
                :src="item.photo_url || item.image_url" 
                class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                alt="Food"
              />
              <div v-else class="w-full h-full flex items-center justify-center text-3xl bg-muted/40">
                🍲
              </div>

              <!-- Spicy Indicator Badge -->
              <div 
                v-if="item.is_spicy" 
                class="absolute bottom-1.5 right-1.5 bg-black/70 backdrop-blur-xs rounded-lg px-1.5 py-0.5 text-[10px] text-white font-bold flex items-center gap-0.5"
              >
                <span>🌶️</span>
                <span v-if="item.spicy_level > 1">{{ item.spicy_level }}</span>
              </div>
            </div>

            <!-- Food Info -->
            <div class="flex-1 min-w-0 py-0.5 flex flex-col justify-between self-stretch">
              <div>
                <div class="flex items-start justify-between gap-1">
                  <h3 class="font-black text-foreground text-sm leading-tight truncate">
                    {{ getItemName(item) }}
                  </h3>
                  
                  <!-- Pronunciation Audio (Optional) -->
                  <button 
                    v-if="item.name_th" 
                    @click.stop="playPronunciation(item.name_th)"
                    class="text-muted-foreground hover:text-primary p-1 shrink-0 -mt-1 -mr-1"
                    title="ฟังเสียงอ่านชื่อไทย"
                  >
                    <Volume2 class="w-3.5 h-3.5" />
                  </button>
                </div>

                <p v-if="getItemDesc(item)" class="text-[11px] text-muted-foreground line-clamp-2 mt-1 leading-snug">
                  {{ getItemDesc(item) }}
                </p>
              </div>

              <!-- Price & Add Button -->
              <div class="flex items-center justify-between mt-2 pt-1 border-t border-border/30">
                <span class="font-black text-primary text-sm">
                  {{ formatPrice(item.price) }}
                </span>

                <button 
                  @click.stop="openItemModal(item)"
                  class="px-3 py-1 bg-primary/10 hover:bg-primary text-primary hover:text-primary-foreground font-bold text-xs rounded-xl transition-colors flex items-center gap-1 shadow-2xs"
                >
                  <Plus class="w-3 h-3" />
                  <span>Add</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>

    <!-- ============================================================= -->
    <!-- 5. ITEM CUSTOMIZATION MODAL (Bottom Sheet / Centered Modal)    -->
    <!-- ============================================================= -->
    <div 
      v-if="selectedItem" 
      class="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex justify-center items-end sm:items-center p-0 sm:p-4 animate-in fade-in duration-200"
    >
      <div class="bg-card w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] animate-in slide-in-from-bottom duration-300">
        
        <!-- Modal Image Header -->
        <div class="h-52 bg-slate-200 dark:bg-neutral-800 relative shrink-0">
          <img 
            v-if="selectedItem.photo_url || selectedItem.image_url" 
            :src="selectedItem.photo_url || selectedItem.image_url" 
            class="w-full h-full object-cover" 
          />
          <div v-else class="w-full h-full flex items-center justify-center text-5xl">🍲</div>
          
          <button 
            @click="closeItemModal" 
            class="absolute top-3.5 right-3.5 w-8 h-8 bg-black/60 text-white rounded-full flex items-center justify-center backdrop-blur-md shadow-xs hover:bg-black/80 transition-colors"
          >
            <X class="w-4 h-4" />
          </button>
        </div>

        <!-- Modal Body Content -->
        <div class="p-5 overflow-y-auto space-y-5 flex-1">
          <!-- Title & Price -->
          <div>
            <div class="flex items-start justify-between gap-2">
              <h3 class="text-lg font-black text-foreground">
                {{ getItemName(selectedItem) }}
              </h3>
              <span class="text-lg font-black text-primary shrink-0">
                {{ formatPrice(selectedItem.price) }}
              </span>
            </div>

            <!-- Thai Original Name (Subtext) -->
            <p v-if="locale !== 'th' && selectedItem.name_th" class="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
              <span>🇹🇭 {{ selectedItem.name_th }}</span>
              <button @click="playPronunciation(selectedItem.name_th)" class="text-primary hover:underline ml-1">
                <Volume2 class="w-3 h-3 inline" />
              </button>
            </p>

            <p v-if="getItemDesc(selectedItem)" class="text-xs text-muted-foreground mt-2 leading-relaxed bg-muted/40 p-3 rounded-xl">
              {{ getItemDesc(selectedItem) }}
            </p>
          </div>

          <!-- Allergen Warnings (If Any) -->
          <div v-if="selectedItem.menu_item_allergens?.length > 0" class="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 rounded-2xl space-y-1.5">
            <p class="text-[11px] font-bold text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
              <ShieldAlert class="w-3.5 h-3.5 text-amber-600" />
              <span>{{ locale === 'zh' ? '过敏原提示 (Allergen Info):' : (locale === 'en' ? 'Allergen Information:' : 'ข้อมูลสำหรับผู้แพ้อาหาร (Allergen Info):') }}</span>
            </p>
            <div class="flex flex-wrap gap-1.5">
              <span 
                v-for="al in selectedItem.menu_item_allergens" 
                :key="al.allergens.id"
                class="px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-900/50 text-amber-900 dark:text-amber-200 text-[10px] font-bold"
              >
                {{ al.allergens.icon }} {{ al.allergens[`name_${locale}`] || al.allergens.name_en || al.allergens.name_th }}
              </span>
            </div>
          </div>

          <!-- Spice Level Options -->
          <div v-if="selectedItem.is_spicy" class="space-y-2.5 border-t pt-4">
            <h3 class="text-xs font-bold text-foreground flex items-center gap-1.5">
              <Flame class="w-4 h-4 text-rose-500" />
              <span>ระดับความเผ็ด (Spice Level)</span>
            </h3>
            
            <div class="grid grid-cols-4 gap-2">
              <button 
                v-for="level in 4" 
                :key="level" 
                type="button"
                @click="itemSpiceLevel = level"
                class="py-2.5 rounded-xl border text-center text-xs font-bold transition-all"
                :class="itemSpiceLevel === level ? 'border-rose-500 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 shadow-2xs' : 'border-border text-muted-foreground hover:bg-muted'"
              >
                <div>{{ getSpiceLabel(level).icon }}</div>
                <div class="text-[10px] mt-0.5">{{ level === 1 ? 'Mild' : (level === 2 ? 'Low' : (level === 3 ? 'Med' : 'Hot')) }}</div>
              </button>
            </div>
          </div>

          <!-- Customization Groups (Add-ons) -->
          <div v-if="selectedItem.menu_item_customizations?.length > 0" class="space-y-4 border-t pt-4">
            <div v-for="cust in selectedItem.menu_item_customizations" :key="cust.customization_groups.id" class="space-y-2">
              <h3 class="text-xs font-bold text-foreground">
                {{ cust.customization_groups[`name_${locale}`] || cust.customization_groups.name_en || cust.customization_groups.name_th }}
              </h3>

              <div class="space-y-1.5">
                <label 
                  v-for="opt in cust.customization_groups.customization_options" 
                  :key="opt.id"
                  @click="selectAddonOption(cust.customization_groups.id, opt)"
                  class="flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all"
                  :class="itemAddons[cust.customization_groups.id]?.name === (opt[`name_${locale}`] || opt.name_en || opt.name_th) ? 'border-primary bg-primary/5 font-bold' : 'border-border hover:bg-muted/50'"
                >
                  <span class="text-xs">{{ opt[`name_${locale}`] || opt.name_en || opt.name_th }}</span>
                  <span v-if="(opt.extra_price !== undefined ? opt.extra_price : opt.price_delta) > 0" class="text-xs font-bold text-primary">+{{ formatPrice(opt.extra_price !== undefined ? opt.extra_price : opt.price_delta) }}</span>
                </label>
              </div>
            </div>
          </div>

          <!-- Special Instructions Input -->
          <div class="border-t pt-4">
            <label class="block text-xs font-bold text-foreground mb-1.5">
              ข้อความเพิ่มเติมถึงครัว (Special Request):
            </label>
            <input 
              v-model="itemNote"
              type="text" 
              placeholder="e.g. No ice, No cilantro, แยกน้ำซุป"
              class="w-full px-3.5 py-2 bg-muted/40 border rounded-xl text-xs focus:ring-2 focus:ring-primary/20 focus:border-primary outline-hidden"
            />
          </div>
        </div>

        <!-- Modal Bottom Sticky Add to Cart -->
        <div class="p-4 bg-card border-t shrink-0 flex items-center gap-3">
          <!-- Quantity Selector -->
          <div class="flex items-center gap-2 bg-muted rounded-xl p-1 shrink-0">
            <button 
              @click="itemQuantity = Math.max(1, itemQuantity - 1)" 
              class="w-8 h-8 rounded-lg bg-background flex items-center justify-center font-bold text-xs shadow-2xs hover:bg-muted"
            >
              <Minus class="w-3.5 h-3.5" />
            </button>
            <span class="w-6 text-center font-black text-xs">{{ itemQuantity }}</span>
            <button 
              @click="itemQuantity++" 
              class="w-8 h-8 rounded-lg bg-background flex items-center justify-center font-bold text-xs shadow-2xs hover:bg-muted"
            >
              <Plus class="w-3.5 h-3.5" />
            </button>
          </div>

          <!-- Add to Cart Button -->
          <button 
            @click="addToCart" 
            class="flex-1 py-3 bg-primary text-primary-foreground font-black text-xs rounded-xl shadow-md hover:bg-primary/90 transition-all flex items-center justify-between px-4"
          >
            <span>เพิ่มลงตะกร้า (Add to Order)</span>
            <span>{{ formatPrice(modalCalculatedUnitPrice * itemQuantity) }}</span>
          </button>
        </div>

      </div>
    </div>

    <!-- ============================================================= -->
    <!-- 6. FLOATING VIEW ORDER BAR (STICKY BOTTOM)                    -->
    <!-- ============================================================= -->
    <div 
      v-if="cart.length > 0 && !isCartOpen && !selectedItem && !orderSuccess" 
      class="fixed bottom-6 left-0 right-0 z-40 flex justify-center px-4 animate-in slide-in-from-bottom duration-300"
    >
      <button 
        @click="isCartOpen = true" 
        class="w-full max-w-md sm:max-w-xl bg-slate-950 dark:bg-primary text-white py-3.5 px-5 rounded-2xl shadow-xl shadow-black/20 flex items-center justify-between hover:scale-[1.01] active:scale-[0.99] transition-all"
      >
        <div class="flex items-center gap-3">
          <div class="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center text-xs font-black">
            {{ cartItemCount }}
          </div>
          <div class="text-left">
            <p class="text-xs font-black">ดูรายการสั่งอาหาร (View Order)</p>
            <p class="text-[10px] text-white/70">{{ cart.length }} รายการ</p>
          </div>
        </div>

        <div class="flex items-center gap-2 font-black text-sm">
          <span>{{ formatPrice(cartTotal) }}</span>
          <ChevronRight class="w-4 h-4" />
        </div>
      </button>
    </div>

    <!-- ============================================================= -->
    <!-- 7. CART DRAWER & ORDER CONFIRMATION                          -->
    <!-- ============================================================= -->
    <div 
      v-if="isCartOpen" 
      class="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex justify-center items-end sm:items-center p-0 sm:p-4 animate-in fade-in duration-200"
      @click.self="isCartOpen = false"
    >
      <div class="w-full sm:max-w-lg bg-card sm:rounded-3xl rounded-t-3xl shadow-2xl flex flex-col max-h-[85vh] sm:border overflow-hidden animate-in slide-in-from-bottom duration-300">
        <!-- Cart Header -->
        <div class="p-4 border-b flex items-center justify-between bg-card/80 backdrop-blur-md shrink-0">
          <div class="flex items-center gap-2">
            <ShoppingBag class="w-5 h-5 text-primary" />
            <h2 class="text-base font-black text-foreground">รายการอาหารของคุณ (Your Order)</h2>
          </div>
          <button @click="isCartOpen = false" class="p-1.5 rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground">
            <X class="w-5 h-5" />
          </button>
        </div>

        <!-- Cart Item List -->
        <div class="flex-1 overflow-y-auto p-4 space-y-3">
          <div 
            v-for="(item, index) in cart" 
            :key="item.id" 
            class="bg-card border rounded-2xl p-3.5 shadow-2xs flex gap-3 relative"
          >
            <div class="w-16 h-16 rounded-xl bg-muted overflow-hidden shrink-0">
              <img 
                v-if="item.menuItem.photo_url || item.menuItem.image_url" 
                :src="item.menuItem.photo_url || item.menuItem.image_url" 
                class="w-full h-full object-cover" 
              />
              <div v-else class="w-full h-full flex items-center justify-center text-2xl">🍲</div>
            </div>

            <div class="flex-1 min-w-0">
              <div class="flex justify-between items-start">
                <h4 class="font-bold text-xs text-foreground truncate pr-6">{{ getItemName(item.menuItem) }}</h4>
                <button @click="removeFromCart(index)" class="text-muted-foreground hover:text-rose-600 p-1">
                  <X class="w-3.5 h-3.5" />
                </button>
              </div>

              <div class="text-[11px] text-muted-foreground space-y-0.5 mt-0.5">
                <p v-if="item.spiceLevel">🌶️ Spice: {{ getSpiceLabel(item.spiceLevel).text }}</p>
                <p v-for="(name, idx) in item.addonNames" :key="idx">➕ {{ name }}</p>
                <p v-if="item.note" class="italic text-amber-600">💬 {{ item.note }}</p>
              </div>

              <div class="flex items-center justify-between mt-2 pt-1 border-t">
                <span class="font-black text-primary text-xs">{{ formatPrice(item.unitPrice * item.quantity) }}</span>

                <div class="flex items-center gap-2 bg-muted/60 rounded-lg p-0.5">
                  <button @click="updateCartItemQty(index, -1)" class="w-6 h-6 rounded bg-background text-xs font-bold shadow-2xs">-</button>
                  <span class="text-xs font-black w-3 text-center">{{ item.quantity }}</span>
                  <button @click="updateCartItemQty(index, 1)" class="w-6 h-6 rounded bg-background text-xs font-bold shadow-2xs">+</button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Checkout Bottom Card -->
        <div class="p-4 bg-card border-t shrink-0 shadow-lg space-y-3">
          <!-- Dining Option & Table Selector -->
          <div class="space-y-2">
            <div class="flex items-center justify-between">
              <label class="block text-xs font-bold text-foreground">
                {{ locale === 'zh' ? '用餐方式 / 桌号' : (locale === 'en' ? 'Dining Option' : 'รูปแบบการสั่ง / โต๊ะ') }} <span class="text-rose-500">*</span>
              </label>
              <span class="text-[11px] font-bold text-primary">
                {{ orderType === 'takeaway' ? '🥡 สั่งกลับบ้าน / ไม่มีโต๊ะ' : '🪑 ทานที่ร้าน (มีโต๊ะ)' }}
              </span>
            </div>
            
            <!-- Segmented Option Buttons -->
            <div class="grid grid-cols-2 gap-2">
              <button 
                type="button"
                @click="orderType = 'dinein'"
                class="py-2 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                :class="orderType === 'dinein' ? 'bg-primary text-primary-foreground border-primary shadow-xs' : 'bg-muted/50 text-muted-foreground border-border hover:text-foreground'"
              >
                <span>🪑 ทานที่ร้าน (มีโต๊ะ)</span>
              </button>

              <button 
                type="button"
                @click="orderType = 'takeaway'"
                class="py-2 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                :class="orderType === 'takeaway' ? 'bg-primary text-primary-foreground border-primary shadow-xs' : 'bg-muted/50 text-muted-foreground border-border hover:text-foreground'"
              >
                <span>🥡 ไม่มีโต๊ะ / กลับบ้าน</span>
              </button>
            </div>

            <!-- If Dine-in: Table Input -->
            <div v-if="orderType === 'dinein'" class="animate-in fade-in duration-200">
              <input 
                v-model="tableNo" 
                type="text" 
                required
                :placeholder="locale === 'zh' ? '填写桌号 (例如 5号桌, A12)' : (locale === 'en' ? 'Enter Table Number (e.g. 5, A12)' : 'ระบุหมายเลขโต๊ะ เช่น โต๊ะ 1, โต๊ะ 5, หรือ A12')" 
                class="w-full px-4 py-2.5 bg-background border-2 border-primary/30 rounded-xl font-bold text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-hidden"
              />
            </div>

            <!-- If Takeaway / No table: Name / Call Name (Optional) -->
            <div v-else class="space-y-1.5 animate-in fade-in duration-200">
              <div class="p-2 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 rounded-xl flex items-center justify-between text-xs">
                <span class="font-bold text-emerald-800 dark:text-emerald-300">✅ ร้านไม่มีที่นั่ง / สั่งกลับบ้าน</span>
                <span class="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">ไม่ต้องใส่โต๊ะ</span>
              </div>
              <input 
                v-model="customerName" 
                type="text" 
                :placeholder="locale === 'zh' ? '取餐称呼 / 顾客姓名 (选填)' : (locale === 'en' ? 'Name for pickup (Optional)' : 'ชื่อสำหรับเรียกรับอาหาร (ไม่ระบุก็ได้ เช่น คุณอาร์ม)')" 
                class="w-full px-4 py-2 bg-background border rounded-xl text-xs font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary outline-hidden"
              />
            </div>
          </div>

          <!-- Total Breakdown -->
          <div class="flex justify-between items-center text-sm font-black pt-1">
            <span>ยอดรวมทั้งหมด (Total):</span>
            <span class="text-lg text-primary">{{ formatPrice(cartTotal) }}</span>
          </div>

          <!-- Submit Button -->
          <button 
            @click="submitOrder" 
            :disabled="isSubmitting || (orderType === 'dinein' && !tableNo.trim())"
            class="w-full py-3.5 bg-primary text-primary-foreground font-black text-sm rounded-2xl shadow-md hover:bg-primary/90 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
          >
            <span v-if="isSubmitting" class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
            <Check class="w-4 h-4" v-else />
            <span>{{ isSubmitting ? 'กำลังส่งออเดอร์...' : 'ยืนยันการสั่งอาหาร (Confirm Order)' }}</span>
          </button>
        </div>

      </div>
    </div>

    <!-- ============================================================= -->
    <!-- 8. ORDER SUCCESS RECEIPT OVERLAY                              -->
    <!-- ============================================================= -->
    <div 
      v-if="orderSuccess" 
      class="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 text-center animate-in zoom-in duration-300"
    >
      <div class="w-full max-w-md bg-card border rounded-3xl p-6 sm:p-8 shadow-2xl flex flex-col items-center">
        <div class="w-16 h-16 bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 rounded-3xl flex items-center justify-center mb-4 shadow-sm">
          <Check class="w-8 h-8 stroke-[3]" />
        </div>

        <h2 class="text-2xl font-black text-foreground">
          {{ locale === 'zh' ? '下单成功！' : (locale === 'en' ? 'Order Placed Successfully!' : 'สั่งอาหารเรียบร้อยแล้ว!') }}
        </h2>
        <p class="text-xs text-muted-foreground mt-1">
          {{ locale === 'zh' ? '厨房正在为您准备美食，请在座位或取餐处稍候' : (locale === 'en' ? 'Your order is sent to the kitchen. Please relax or wait at the counter.' : 'ระบบส่งรายการไปยังห้องครัวเรียบร้อยแล้ว กรุณารอสักครู่ค่ะ') }}
        </p>

        <div class="mt-4 px-4 py-2 bg-muted rounded-2xl font-black text-sm text-foreground">
          📍 {{ locale === 'zh' ? '用餐 / 桌号' : (locale === 'en' ? 'Dining / Table' : 'สถานที่ / โต๊ะ') }}: <span class="text-primary text-base ml-1">{{ finalAssignedTable || tableNo || 'สั่งกลับบ้าน (Takeaway)' }}</span>
        </div>

        <!-- Receipt summary box -->
        <div class="w-full bg-muted/30 border rounded-2xl p-4 my-5 text-left shadow-xs space-y-2.5 overflow-y-auto max-h-[35vh]">
          <div v-for="(item, idx) in cart" :key="idx" class="flex justify-between items-start border-b border-border/40 last:border-0 pb-2 text-xs">
            <div>
              <div class="font-bold text-foreground">{{ item.quantity }}x {{ item.menuItem.name_th }}</div>
              <div class="text-[10px] text-muted-foreground">{{ item.menuItem.name_en }}</div>
              <div v-if="item.addonNames?.length" class="text-[10px] text-muted-foreground mt-0.5">
                + {{ item.addonNames.join(', ') }}
              </div>
              <div v-if="item.spiceLevel" class="text-[10px] text-muted-foreground">
                🌶️ {{ getSpiceLabel(item.spiceLevel).text }}
              </div>
            </div>
            <span class="font-bold text-primary shrink-0">{{ formatPrice(item.unitPrice * item.quantity) }}</span>
          </div>

          <div class="pt-2 border-t border-border/60 flex justify-between items-center font-black text-sm text-foreground">
            <span>Total:</span>
            <span class="text-primary text-base">{{ formatPrice(cartTotal) }}</span>
          </div>
        </div>

        <button 
          @click="orderSuccess = false; cart = []" 
          class="w-full py-3.5 bg-primary text-primary-foreground font-black text-sm rounded-2xl shadow-md hover:bg-primary/90 transition-colors"
        >
          เสร็จสิ้น (Done)
        </button>
      </div>
    </div>

  </div>
</template>
