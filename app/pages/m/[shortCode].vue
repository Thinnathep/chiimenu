<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { 
  Search, 
  Mic, 
  MicOff,
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
  ChevronDown,
  Flame,
  ShieldAlert,
  Info,
  Bell,
  Receipt,
  Utensils,
  Trash2,
  HelpCircle,
  Heart,
  Share2,
  Coffee,
  CheckCircle2,
  ArrowLeft
} from 'lucide-vue-next'

definePageMeta({
  layout: 'tourist'
})

const route = useRoute()
const client = useSupabaseClient()
const shortCode = route.params.shortCode as string

// === Composable & Branding Theme ===
const { palette, extractFromImage, DEFAULT_THEME_COLOR } = useBrandTheme()
const { t, locale, locales, setLocale } = useI18n()

// === Core State ===
const loading = ref(true)
const store = ref<any>(null)
const categories = ref<any[]>([])
const menuItems = ref<any[]>([])
const activeCategory = ref<string>('all')
const isStoreLocked = ref(false)
const isStoreClosed = ref(false)
const isStoreNotFound = ref(false)
const detectedTableFromQr = ref<string>('')
const scannedQrLabel = ref<string>('')

// === Search & Voice (STT) State ===
const searchQuery = ref('')
const isListening = ref(false)
let recognition: any = null
const activeDietaryFilter = ref<'all' | 'spicy' | 'recommended'>('all')

// === Audio TTS State ===
const activeSpeakingItem = ref<string | null>(null)

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
const submittedOrderData = ref<any>(null)
const cartBouncing = ref(false)

// === Service Request Modal ===
const isServiceModalOpen = ref(false)
const serviceSuccessMsg = ref('')

// === Item Customization Bottom Sheet ===
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
const quickNoteChips = [
  { th: 'ไม่ใส่ผักชี', en: 'No coriander', zh: '不要香菜' },
  { th: 'แยกน้ำซุป/น้ำจิ้ม', en: 'Soup/sauce on the side', zh: '汤/酱汁分开' },
  { th: 'ไม่ใส่ผงชูรส', en: 'No MSG', zh: '不要味精' },
  { th: 'หวานน้อย', en: 'Less sweet', zh: '少糖' },
  { th: 'ไม่ใส่พริก', en: 'No chili', zh: '不要辣椒' }
]

// === Dynamic CSS Theme Variables ===
const dynamicThemeStyles = computed(() => {
  if (!palette.value) return {}
  return {
    '--brand-primary': palette.value.primary,
    '--brand-hover': palette.value.primaryHover,
    '--brand-light': palette.value.primaryLight,
    '--brand-subtle': palette.value.primarySubtle,
    '--brand-border': palette.value.primaryBorder,
    '--brand-contrast': palette.value.primaryContrast,
    '--brand-gradient': palette.value.primaryGradient
  }
})

// === Fetch Store & Menu Data ===
onMounted(async () => {
  try {
    let targetStoreId: string | null = null

    // 1a. Try to match from qr_codes table (short_code)
    const { data: qrData } = (await (client as any)
      .from('qr_codes')
      .select('store_id, id, table_identifier, label')
      .eq('short_code', shortCode)
      .eq('is_active', true)
      .maybeSingle()) as any
      
    if (qrData?.store_id) {
      targetStoreId = qrData.store_id
      if (qrData.table_identifier) {
        detectedTableFromQr.value = qrData.table_identifier
        tableNo.value = qrData.table_identifier
      } else if (qrData.label) {
        scannedQrLabel.value = qrData.label
        if (!tableNo.value && qrData.label.toLowerCase().includes('โต๊ะ')) {
          tableNo.value = qrData.label
        }
      }
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

    // Check query params for table number e.g. ?table=5 or ?t=5
    if (route.query.table) {
      tableNo.value = String(route.query.table)
      detectedTableFromQr.value = String(route.query.table)
    } else if (route.query.t) {
      tableNo.value = String(route.query.t)
      detectedTableFromQr.value = String(route.query.t)
    }

    if (!targetStoreId) {
      isStoreNotFound.value = true
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
      store.value = storeData
      if (storeData.default_language && ['th', 'en', 'zh'].includes(storeData.default_language)) {
        locale.value = storeData.default_language
      }

      // Check if store is manually toggled offline / closed
      if (storeData.is_active === false) {
        isStoreClosed.value = true
        extractFromImage(storeData.logo_url || storeData.cover_url)
        loading.value = false
        return
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

      // 3. Extract Dynamic Brand Colors from Logo or Cover (Ultra-fast async)
      extractFromImage(storeData.logo_url || storeData.cover_url)
    } else {
      isStoreNotFound.value = true
      loading.value = false
      return
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
  if (typeof window === 'undefined') return
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
    alert(locale.value === 'zh' ? '当前浏览器不支持语音搜索' : (locale.value === 'en' ? 'Voice search is not supported in this browser' : 'เบราว์เซอร์นี้ยังไม่รองรับการค้นหาด้วยเสียง'))
    return
  }
  if (isListening.value) {
    recognition.stop()
  } else {
    recognition.lang = locale.value === 'en' ? 'en-US' : (locale.value === 'zh' ? 'zh-CN' : 'th-TH')
    try {
      recognition.start()
    } catch {
      recognition.stop()
    }
  }
}

// === Audio TTS Pronunciation (Thai name speaker) ===
const playPronunciation = (textTh: string, itemId?: string) => {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
  
  window.speechSynthesis.cancel()
  if (itemId) activeSpeakingItem.value = itemId
  
  const utterance = new SpeechSynthesisUtterance(textTh)
  utterance.lang = 'th-TH'
  utterance.rate = 0.85
  utterance.onend = () => {
    activeSpeakingItem.value = null
  }
  utterance.onerror = () => {
    activeSpeakingItem.value = null
  }
  window.speechSynthesis.speak(utterance)
}

// === Item Modal & Options ===
const openItemModal = (item: any) => {
  selectedItem.value = item
  itemSpiceLevel.value = item.spicy_level || (item.is_spicy ? 2 : 1)
  itemAddons.value = {}
  itemQuantity.value = 1
  itemNote.value = ''
}

const closeItemModal = () => {
  selectedItem.value = null
}

// === Background Scroll Lock Handler (Prevents background scrolling when modal is open) ===
watch([selectedItem, isCartOpen, orderSuccess], ([item, cartOpen, success]) => {
  if (typeof document !== 'undefined') {
    if (item || cartOpen || success) {
      document.body.style.overflow = 'hidden'
      document.documentElement.style.overflow = 'hidden'
      document.body.style.touchAction = 'none'
      document.body.classList.add('overflow-hidden')
    } else {
      document.body.style.overflow = ''
      document.documentElement.style.overflow = ''
      document.body.style.touchAction = ''
      document.body.classList.remove('overflow-hidden')
    }
  }
}, { immediate: true })

onUnmounted(() => {
  if (typeof document !== 'undefined') {
    document.body.style.overflow = ''
    document.documentElement.style.overflow = ''
    document.body.style.touchAction = ''
    document.body.classList.remove('overflow-hidden')
  }
})

const selectAddonOption = (groupId: string, option: any) => {
  const currentVal = itemAddons.value[groupId]?.name
  const targetVal = option[`name_${locale.value}`] || option.name_en || option.name_th

  if (currentVal === targetVal) {
    // Toggle off if clicking the same option
    const copy = { ...itemAddons.value }
    delete copy[groupId]
    itemAddons.value = copy
  } else {
    itemAddons.value[groupId] = {
      name: targetVal,
      name_th: option.name_th || '',
      name_en: option.name_en || '',
      name_zh: option.name_zh || '',
      price: Number(option.extra_price !== undefined ? option.extra_price : (option.price_delta || option.price || 0))
    }
  }
}

const addQuickNote = (chip: any) => {
  const noteText = chip[locale.value] || chip.en || chip.th
  if (itemNote.value.includes(noteText)) {
    itemNote.value = itemNote.value.replace(noteText, '').replace(/,\s*,/g, ',').replace(/^,\s*|,\s*$/g, '').trim()
  } else {
    itemNote.value = itemNote.value ? `${itemNote.value}, ${noteText}` : noteText
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

// === Direct Quick Add to Cart (for simple items) ===
const quickAddToCart = (item: any) => {
  const hasCustomizations = (item.menu_item_customizations && item.menu_item_customizations.length > 0) || item.is_spicy
  if (hasCustomizations) {
    openItemModal(item)
    return
  }

  // Find if already exists in cart with no options
  const existingIdx = cart.value.findIndex(c => c.menuItem.id === item.id && (!c.addonNames || c.addonNames.length === 0) && !c.note)
  if (existingIdx >= 0) {
    cart.value[existingIdx].quantity += 1
  } else {
    cart.value.push({
      id: Date.now().toString(),
      menuItem: item,
      spiceLevel: null,
      selectedAddons: {},
      addonNames: [],
      note: '',
      unitPrice: Number(item.price || 0),
      quantity: 1
    })
  }
  
  triggerCartFeedback()
}

const getItemCartQuantity = (itemId: string) => {
  return cart.value
    .filter(i => i.menuItem.id === itemId)
    .reduce((sum, i) => sum + (i.quantity || 0), 0)
}

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
  triggerCartFeedback()
}

const triggerCartFeedback = () => {
  cartBouncing.value = true
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    try { navigator.vibrate(20) } catch {}
  }
  setTimeout(() => {
    cartBouncing.value = false
  }, 400)
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

// === Order Submission ===
const submitOrder = async () => {
  const targetTable = orderType.value === 'takeaway'
    ? (customerName.value.trim() ? `กลับบ้าน (${customerName.value.trim()})` : 'กลับบ้าน (Takeaway)')
    : tableNo.value.trim()

  if (orderType.value === 'dinein' && !tableNo.value.trim()) {
    alert(locale.value === 'zh' ? '请填写您的桌号' : (locale.value === 'en' ? 'Please enter your Table Number' : 'กรุณาระบุหมายเลขโต๊ะ'))
    return
  }
  if (cart.value.length === 0) return

  finalAssignedTable.value = targetTable
  isSubmitting.value = true

  try {
    const res: any = await $fetch('/api/order/submit', {
      method: 'POST',
      body: {
        storeId: store.value.id,
        tableNo: targetTable,
        cart: cart.value,
        note: orderNote.value.trim()
      }
    })
    
    submittedOrderData.value = {
      orderId: res?.orderId || `ORD-${Date.now().toString().slice(-4)}`,
      time: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }),
      items: [...cart.value],
      total: cartTotal.value,
      table: targetTable
    }

    orderSuccess.value = true
    isCartOpen.value = false
  } catch (e: any) {
    console.error('Order submit error:', e)
    alert(e?.data?.message || 'Failed to submit order. Please try again.')
  } finally {
    isSubmitting.value = false
  }
}

// === Quick Service Requests (Call Staff / Bill / Utensils) ===
const sendServiceRequest = (type: string) => {
  const targetTable = tableNo.value.trim() || 'ลูกค้าหน้าร้าน'
  serviceSuccessMsg.value = locale.value === 'zh' 
    ? `已通知服务员前往: ${targetTable}` 
    : (locale.value === 'en' ? `Staff alerted for: ${targetTable}` : `แจ้งพนักงานเรียบร้อยแล้ว: ${targetTable}`)
  
  setTimeout(() => {
    isServiceModalOpen.value = false
    serviceSuccessMsg.value = ''
  }, 2200)
}

// === Multilingual & Filter Helpers ===
const filteredItems = computed(() => {
  let result = menuItems.value
  
  // Category Filter
  if (activeCategory.value !== 'all') {
    result = result.filter(item => item.category_id === activeCategory.value)
  }
  
  // Dietary Filter
  if (activeDietaryFilter.value === 'spicy') {
    result = result.filter(item => item.is_spicy)
  } else if (activeDietaryFilter.value === 'recommended') {
    result = result.filter(item => item.is_featured || item.sort_order < 3)
  }

  // Keyword Search
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase().trim()
    result = result.filter(item => {
      const nTh = (item.name_th || '').toLowerCase()
      const nEn = (item.name_en || '').toLowerCase()
      const nZh = (item.name_zh || '').toLowerCase()
      const dEn = (item.explanation_en || item.description_en || '').toLowerCase()
      const dZh = (item.explanation_zh || item.description_zh || '').toLowerCase()
      const dTh = (item.description_th || '').toLowerCase()
      return nTh.includes(q) || nEn.includes(q) || nZh.includes(q) || dEn.includes(q) || dZh.includes(q) || dTh.includes(q)
    })
  }
  
  return result
})

const getCategoryName = (cat: any) => {
  const l = locale.value
  return cat[`name_${l}`] || cat.name_en || cat.name_th
}

const getCategoryCount = (catId: string) => {
  if (catId === 'all') return menuItems.value.length
  return menuItems.value.filter(i => i.category_id === catId).length
}

const getItemName = (item: any) => {
  if (!item) return ''
  const l = locale.value
  return item[`name_${l}`] || item.name_en || item.name_th
}

const getItemSecondaryName = (item: any) => {
  if (!item) return ''
  if (locale.value === 'th') {
    return item.name_en || ''
  }
  return item.name_th || ''
}

const getItemDesc = (item: any) => {
  if (!item) return ''
  const l = locale.value
  return item[`explanation_${l}`] || item[`description_${l}`] || item.explanation_en || item.description_en || item.description_th || ''
}

const formatPrice = (price: number) => {
  return '฿' + Number(price || 0).toLocaleString('th-TH', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

const getStoreName = () => {
  if (!store.value) return 'ChiiMenu'
  const l = locale.value
  if (l === 'en' && store.value.name_en) return store.value.name_en
  if (l === 'zh' && store.value.name_zh) return store.value.name_zh
  return store.value.name || store.value.name_en || 'ChiiMenu'
}

const getStoreDescription = () => {
  if (!store.value) return ''
  const l = locale.value
  if (l === 'en' && store.value.description_en) return store.value.description_en
  if (l === 'zh' && store.value.description_zh) return store.value.description_zh
  return store.value.description || store.value.description_en || ''
}

const getStoreAddress = () => {
  if (!store.value) return ''
  const l = locale.value
  if (l === 'en' && store.value.address_en) return store.value.address_en
  if (l === 'zh' && store.value.address_zh) return store.value.address_zh
  return store.value.address || store.value.address_en || ''
}

const getSpiceLabel = (lvl: number) => {
  if (lvl === 1) return { text: locale.value === 'zh' ? '不辣 (Mild)' : (locale.value === 'en' ? 'Mild (No chili)' : 'ไม่เผ็ด (Mild)'), icon: '🟢' }
  if (lvl === 2) return { text: locale.value === 'zh' ? '微辣 (Low)' : (locale.value === 'en' ? 'Low Spicy' : 'เผ็ดน้อย (Low)'), icon: '🌶️' }
  if (lvl === 3) return { text: locale.value === 'zh' ? '中辣 (Medium)' : (locale.value === 'en' ? 'Medium Spicy' : 'เผ็ดกลาง (Medium)'), icon: '🌶️🌶️' }
  return { text: locale.value === 'zh' ? '特辣 (Hot)' : (locale.value === 'en' ? 'Very Hot' : 'เผ็ดมาก (Hot)'), icon: '🌶️🌶️🌶️' }
}

const getCategoryEmoji = (name: string) => {
  const n = (name || '').toLowerCase()
  if (n.includes('เส้น') || n.includes('noodle') || n.includes('ผัดไทย')) return '🍜'
  if (n.includes('ข้าว') || n.includes('rice') || n.includes('curry')) return '🍛'
  if (n.includes('ต้ม') || n.includes('soup') || n.includes('แกง')) return '🍲'
  if (n.includes('น้ำ') || n.includes('drink') || n.includes('tea') || n.includes('ชา')) return '🥤'
  if (n.includes('หวาน') || n.includes('dessert') || n.includes('เค้ก')) return '🍨'
  if (n.includes('ทานเล่น') || n.includes('snack') || n.includes('ทอด')) return '🍟'
  if (n.includes('สลัด') || n.includes('salad') || n.includes('ยำ')) return '🥗'
  return '🍽️'
}
</script>

<template>
  <div 
    class="relative min-h-screen bg-neutral-50 dark:bg-neutral-950 font-sans pb-32 text-foreground transition-colors duration-300"
    :style="dynamicThemeStyles"
  >
    
    <!-- 1. LOADING SKELETON -->
    <div v-if="loading" class="flex flex-col items-center justify-center min-h-[75vh] space-y-4 px-6 text-center">
      <div 
        class="w-12 h-12 border-4 rounded-full animate-spin border-t-transparent"
        :style="{ borderColor: palette.primary, borderTopColor: 'transparent' }"
      ></div>
      <div class="space-y-1">
        <p class="text-sm font-bold text-foreground animate-pulse">กำลังโหลดเมนูอร่อย...</p>
        <p class="text-xs text-muted-foreground">Loading menu & delicious choices</p>
      </div>
    </div>

    <!-- 2. STORE NOT FOUND -->
    <div v-else-if="isStoreNotFound || !store" class="flex flex-col items-center justify-center min-h-[70vh] text-center px-6 space-y-4">
      <div class="w-20 h-20 bg-muted text-muted-foreground rounded-3xl flex items-center justify-center text-4xl shadow-inner">
        🔍
      </div>
      <div>
        <h2 class="text-xl font-black text-foreground">{{ locale === 'zh' ? '未找到餐厅' : (locale === 'en' ? 'Store Not Found' : 'ไม่พบข้อมูลร้านค้า') }}</h2>
        <p class="text-xs text-muted-foreground mt-1">{{ locale === 'zh' ? '请检查二维码或联系服务员' : (locale === 'en' ? 'Please check your QR Code or contact staff' : 'กรุณาตรวจสอบ QR Code หรือติดต่อพนักงานของร้าน') }}</p>
      </div>
    </div>

    <!-- 3. STORE CLOSED TEMPORARILY (is_active = false) -->
    <div v-else-if="isStoreClosed || store?.is_active === false" class="flex flex-col items-center justify-center min-h-[75vh] text-center px-6 space-y-5">
      <div 
        class="w-24 h-24 rounded-3xl overflow-hidden shadow-lg border-2 border-border flex items-center justify-center bg-card"
        :style="{ borderColor: palette.primaryBorder }"
      >
        <img v-if="store.logo_url" :src="store.logo_url" class="w-full h-full object-cover grayscale-50" alt="Logo" />
        <span v-else class="text-3xl font-black">{{ store.name?.charAt(0) || '🏪' }}</span>
      </div>

      <div class="space-y-2">
        <div class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300 text-xs font-bold shadow-xs">
          <span class="w-2 h-2 rounded-full bg-rose-500"></span>
          <span>{{ locale === 'zh' ? '暂停营业 (Closed)' : (locale === 'en' ? 'Temporarily Closed' : 'ปิดให้บริการชั่วคราว') }}</span>
        </div>
        <h2 class="text-xl sm:text-2xl font-black text-foreground">{{ getStoreName() }}</h2>
        <p class="text-xs sm:text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed">
          {{ locale === 'zh' ? '本店目前暂停接单，欢迎稍后再来' : (locale === 'en' ? 'This store is currently not taking orders. Please check back later.' : 'ขณะนี้ร้านค้าปิดรับออเดอร์ชั่วคราว ขออภัยในความไม่สะดวก') }}
        </p>
      </div>

      <!-- Language Pill Switcher on Closed Screen -->
      <div class="flex items-center bg-muted/80 rounded-xl p-0.5 border border-border/40 text-xs font-bold shadow-2xs">
        <button 
          v-for="l in locales" 
          :key="l.code"
          @click="setLocale(l.code as any)"
          class="px-2.5 py-1 rounded-lg transition-all"
          :class="locale === l.code ? 'shadow-xs font-black' : 'text-muted-foreground hover:text-foreground'"
          :style="locale === l.code ? { backgroundColor: palette.primary, color: palette.primaryContrast } : {}"
        >
          {{ l.code === 'th' ? '🇹🇭 TH' : (l.code === 'en' ? '🇺🇸 EN' : '🇨🇳 中文') }}
        </button>
      </div>
    </div>

    <!-- 4. STORE EXPIRED / LOCKED -->
    <div v-else-if="isStoreLocked" class="flex flex-col items-center justify-center min-h-[70vh] text-center px-6 space-y-4">
      <div class="w-20 h-20 bg-amber-100 dark:bg-amber-950/50 text-amber-600 rounded-3xl flex items-center justify-center text-3xl shadow-inner">
        ⏳
      </div>
      <div>
        <h2 class="text-xl font-black text-foreground">Service Unavailable</h2>
        <p class="text-xs text-muted-foreground mt-1">ร้านค้านี้หมดระยะเวลาทดลองใช้งาน กรุณาติดต่อพนักงานของร้าน</p>
      </div>
    </div>

    <!-- 4. ACTIVE MODERN MENU EXPERIENCE -->
    <div v-else class="space-y-3 sm:space-y-4">
      
      <!-- ========================================================= -->
      <!-- TOP SLIDING BAR: UNIFIED LANGUAGE + SERVICE CALL          -->
      <!-- ========================================================= -->
      <header class="sticky top-0 z-40 bg-background/85 dark:bg-neutral-950/85 backdrop-blur-md border-b border-border/50 transition-all pt-2.5 pb-2 sm:pt-3.5 sm:pb-2.5">
        <div class="px-3.5 sm:px-5 flex items-center justify-between gap-2">
          
          <!-- Store mini branding info -->
          <div class="flex items-center gap-2 min-w-0">
            <div 
              class="w-7 h-7 rounded-xl overflow-hidden shrink-0 border shadow-2xs flex items-center justify-center text-xs font-black"
              :style="{ backgroundColor: palette.primaryLight, color: palette.primary }"
            >
              <img v-if="store.logo_url" :src="store.logo_url" class="w-full h-full object-cover" alt="Logo" />
              <span v-else>{{ store.name?.charAt(0) || '🏪' }}</span>
            </div>
            <div class="min-w-0">
              <span class="text-xs font-black text-foreground truncate block leading-tight">
                {{ getStoreName() }}
              </span>
              <span v-if="tableNo" class="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5">
                <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>{{ orderType === 'takeaway' ? '🥡 กลับบ้าน' : `📍 ${tableNo}` }}</span>
              </span>
            </div>
          </div>

          <!-- Actions: Language Switcher & Call Staff (Highlighted / Commented for Phase 2) -->
          <div class="flex items-center gap-1.5 shrink-0">
            <!--
            === [FEATURE: CALL STAFF BUTTON - HIGHLIGHTED FOR PHASE 2] ===
            <button 
              @click="isServiceModalOpen = true"
              class="p-1.5 sm:px-2.5 sm:py-1 rounded-xl text-xs font-bold transition-all border border-border/60 hover:bg-muted text-muted-foreground hover:text-foreground flex items-center gap-1 shadow-2xs"
              title="เรียกพนักงาน / ขอความช่วยเหลือ"
            >
              <Bell class="w-3.5 h-3.5" />
              <span class="hidden sm:inline text-[11px]">{{ locale === 'zh' ? '呼叫' : (locale === 'en' ? 'Staff' : 'เรียกพนักงาน') }}</span>
            </button>
            -->

            <!-- Language Pill Switcher (Segmented Control) -->
            <div class="flex items-center bg-muted/80 rounded-xl p-0.5 border border-border/40 text-[11px] font-bold">
              <button 
                v-for="l in locales" 
                :key="l.code"
                @click="setLocale(l.code as any)"
                class="px-2 py-1 rounded-lg transition-all"
                :class="locale === l.code ? 'shadow-xs font-black' : 'text-muted-foreground hover:text-foreground'"
                :style="locale === l.code ? { backgroundColor: palette.primary, color: palette.primaryContrast } : {}"
              >
                {{ l.code === 'th' ? '🇹🇭 TH' : (l.code === 'en' ? '🇺🇸 EN' : '🇨🇳 中文') }}
              </button>
            </div>
          </div>

        </div>
      </header>

      <!-- ========================================================= -->
      <!-- STORE HERO BANNER & ELEVATED PROFILE CARD                 -->
      <!-- ========================================================= -->
      <div class="relative">
        
        <!-- Cover Photo Banner -->
        <div class="h-32 sm:h-44 md:h-52 w-full relative overflow-hidden bg-slate-200 dark:bg-neutral-800">
          <img 
            v-if="store.cover_url" 
            :src="store.cover_url" 
            class="w-full h-full object-cover" 
            alt="Store Cover"
          />
          <!-- Ambient fallback gradient generated from brand primary -->
          <div 
            v-else 
            class="w-full h-full"
            :style="{ background: palette.primaryGradient }"
          ></div>

          <div class="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-black/30"></div>

          <!-- Open Status Badge on Top-Left of Cover -->
          <div class="absolute top-3 left-3 flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/20 text-xs font-bold text-white shadow-xs">
            <span class="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
            <span>{{ locale === 'zh' ? '营业中 (Open)' : (locale === 'en' ? 'Open for Orders' : 'เปิดรับออเดอร์') }}</span>
          </div>
        </div>

        <!-- Elevated Store Info Card: 100% Solid Card Background, zero text overlap! -->
        <div class="px-3 sm:px-5 -mt-10 sm:-mt-14 relative z-10">
          <div class="bg-card border border-border/60 rounded-3xl p-4 sm:p-5 shadow-lg space-y-3">
            
            <div class="flex items-start gap-3.5">
              <!-- Store Logo Avatar (Elevated cleanly) -->
              <div class="w-16 h-16 sm:w-20 sm:h-20 -mt-10 sm:-mt-12 rounded-2xl bg-card border-3 border-background shadow-xl overflow-hidden shrink-0 flex items-center justify-center text-2xl font-black ring-1 ring-border/50">
                <img v-if="store.logo_url" :src="store.logo_url" class="w-full h-full object-cover object-center" alt="Logo" />
                <span v-else :style="{ color: palette.primary }">{{ store.name?.charAt(0) || '🏪' }}</span>
              </div>

              <!-- Store Title & Location -->
              <div class="min-w-0 flex-1 pt-0.5">
                <div class="flex items-center gap-1.5">
                  <h1 class="text-base sm:text-xl md:text-2xl font-black text-foreground truncate leading-tight tracking-tight">
                    {{ getStoreName() }}
                  </h1>
                  <Sparkles class="w-4 h-4 shrink-0 text-amber-500" />
                </div>

                <p v-if="getStoreAddress()" class="text-xs text-muted-foreground truncate flex items-center gap-1 mt-1">
                  <MapPin class="w-3.5 h-3.5 shrink-0" :style="{ color: palette.primary }" />
                  <span class="truncate">{{ getStoreAddress() }}</span>
                </p>
              </div>
            </div>

            <!-- Store Description -->
            <p v-if="getStoreDescription()" class="text-xs text-muted-foreground leading-relaxed bg-muted/40 p-2.5 rounded-2xl border border-border/40">
              {{ getStoreDescription() }}
            </p>

            <!-- Table QR Verification Tag -->
            <div v-if="detectedTableFromQr || scannedQrLabel" class="flex items-center justify-between p-2.5 rounded-2xl border text-xs" :style="{ backgroundColor: palette.primarySubtle, borderColor: palette.primaryBorder }">
              <div class="flex items-center gap-1.5 font-bold" :style="{ color: palette.primary }">
                <MapPin class="w-4 h-4" />
                <span>{{ locale === 'zh' ? '当前已关联:' : (locale === 'en' ? 'Ordering from:' : 'สั่งสำหรับ:') }}</span>
                <span class="underline font-black">{{ detectedTableFromQr ? `โต๊ะ ${detectedTableFromQr}` : scannedQrLabel }}</span>
              </div>
              <span class="text-[10px] px-2.5 py-0.5 rounded-full font-bold bg-background/90 border text-foreground shadow-2xs">
                ✅ {{ locale === 'zh' ? 'QR 验证成功' : (locale === 'en' ? 'QR Verified' : 'ระบุโต๊ะอัตโนมัติ') }}
              </span>
            </div>

            <!-- Search & Voice Search Bar -->
            <div class="relative flex items-center pt-1">
              <Search class="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input 
                v-model="searchQuery" 
                type="text" 
                :placeholder="locale === 'zh' ? '搜索美味菜品、饮料、小吃...' : (locale === 'en' ? 'Search dishes, drinks, appetizers...' : 'ค้นหาเมนูอาหาร, เครื่องดื่ม, ของทานเล่น...')"
                class="w-full pl-9 pr-20 py-2.5 bg-muted/50 dark:bg-muted/30 border border-border/60 rounded-2xl text-xs sm:text-sm font-medium focus:ring-2 outline-none transition-all placeholder:text-muted-foreground"
                :style="{ '--tw-ring-color': palette.primaryLight }"
              />
              
              <div class="absolute right-2 flex items-center gap-1">
                <!-- Clear Search Button -->
                <button 
                  v-if="searchQuery" 
                  @click="searchQuery = ''"
                  class="p-1 text-muted-foreground hover:text-foreground rounded-lg"
                >
                  <X class="w-3.5 h-3.5" />
                </button>

                <!-- Mic Voice Search Button -->
                <button 
                  @click="toggleVoiceSearch"
                  class="p-1.5 rounded-xl transition-all flex items-center justify-center shadow-xs"
                  :class="isListening ? 'bg-rose-500 text-white animate-pulse' : 'bg-background hover:bg-muted text-muted-foreground hover:text-foreground border border-border/40'"
                  :title="isListening ? 'กำลังฟังเสียง...' : 'ค้นหาด้วยเสียง (Voice Search)'"
                >
                  <Mic v-if="!isListening" class="w-3.5 h-3.5" />
                  <MicOff v-else class="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <!-- Quick Filters Pills (Dietary / Highlights) -->
            <div class="flex items-center gap-1.5 overflow-x-auto hide-scrollbar text-[11px] font-bold pt-1">
              <button 
                @click="activeDietaryFilter = 'all'"
                class="px-3 py-1.5 rounded-xl transition-all shrink-0 border"
                :class="activeDietaryFilter === 'all' ? 'border-transparent shadow-2xs' : 'bg-muted/40 text-muted-foreground border-border/40'"
                :style="activeDietaryFilter === 'all' ? { backgroundColor: palette.primaryLight, color: palette.primary, borderColor: palette.primaryBorder } : {}"
              >
                ✨ {{ locale === 'zh' ? '全部项目' : (locale === 'en' ? 'All Items' : 'เมนูทั้งหมด') }}
              </button>

              <button 
                @click="activeDietaryFilter = activeDietaryFilter === 'recommended' ? 'all' : 'recommended'"
                class="px-3 py-1.5 rounded-xl transition-all shrink-0 border"
                :class="activeDietaryFilter === 'recommended' ? 'border-transparent shadow-2xs' : 'bg-muted/40 text-muted-foreground border-border/40'"
                :style="activeDietaryFilter === 'recommended' ? { backgroundColor: palette.primaryLight, color: palette.primary, borderColor: palette.primaryBorder } : {}"
              >
                ⭐ {{ locale === 'zh' ? '店长推荐' : (locale === 'en' ? 'Popular / Best' : 'เมนูแนะนำ') }}
              </button>

              <button 
                @click="activeDietaryFilter = activeDietaryFilter === 'spicy' ? 'all' : 'spicy'"
                class="px-3 py-1.5 rounded-xl transition-all shrink-0 border"
                :class="activeDietaryFilter === 'spicy' ? 'border-transparent shadow-2xs' : 'bg-muted/40 text-muted-foreground border-border/40'"
                :style="activeDietaryFilter === 'spicy' ? { backgroundColor: palette.primaryLight, color: palette.primary, borderColor: palette.primaryBorder } : {}"
              >
                🌶️ {{ locale === 'zh' ? '香辣菜肴' : (locale === 'en' ? 'Spicy Food' : 'เมนูเผ็ดแซ่บ') }}
              </button>
            </div>

          </div>
        </div>

      </div>

      <!-- ========================================================= -->
      <!-- CATEGORY STICKY SUBHEADER                                 -->
      <!-- ========================================================= -->
      <div class="sticky top-[3.75rem] sm:top-[4.25rem] z-30 bg-background/90 dark:bg-neutral-950/90 backdrop-blur-md border-b border-border/50 py-2.5 px-3 sm:px-5 shadow-2xs">
        <div class="flex items-center gap-2 overflow-x-auto hide-scrollbar">
          
          <!-- All Category -->
          <button 
            @click="activeCategory = 'all'" 
            class="px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition-all shrink-0 flex items-center gap-1.5 border"
            :class="activeCategory === 'all' ? 'shadow-xs border-transparent' : 'bg-muted/50 text-muted-foreground border-border/40 hover:text-foreground'"
            :style="activeCategory === 'all' ? { backgroundColor: palette.primary, color: palette.primaryContrast } : {}"
          >
            <span>🌟</span>
            <span>{{ locale === 'zh' ? '全部' : (locale === 'en' ? 'All' : 'ทั้งหมด') }}</span>
            <span class="text-[10px] sm:text-xs opacity-80">({{ getCategoryCount('all') }})</span>
          </button>

          <!-- Dynamic Categories -->
          <button 
            v-for="cat in categories" 
            :key="cat.id" 
            @click="activeCategory = cat.id" 
            class="px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition-all shrink-0 flex items-center gap-1.5 border"
            :class="activeCategory === cat.id ? 'shadow-xs border-transparent' : 'bg-muted/50 text-muted-foreground border-border/40 hover:text-foreground'"
            :style="activeCategory === cat.id ? { backgroundColor: palette.primary, color: palette.primaryContrast } : {}"
          >
            <span>{{ getCategoryEmoji(cat.name_th || cat.name_en) }}</span>
            <span>{{ getCategoryName(cat) }}</span>
            <span class="text-[10px] sm:text-xs opacity-80">({{ getCategoryCount(cat.id) }})</span>
          </button>

        </div>
      </div>

      <!-- ========================================================= -->
      <!-- MENU ITEMS GRID (Responsive 1 Col Mobile / 2 Col iPad / 3 Col PC) -->
      <!-- ========================================================= -->
      <div class="px-3 sm:px-5 pt-1">
        
        <!-- Empty State -->
        <div v-if="filteredItems.length === 0" class="py-20 text-center space-y-3">
          <div class="w-16 h-16 mx-auto rounded-3xl bg-muted/60 flex items-center justify-center text-3xl">
            🍜
          </div>
          <div>
            <p class="text-sm font-bold text-foreground">{{ locale === 'zh' ? '未找到符合条件的菜品' : (locale === 'en' ? 'No dishes found' : 'ไม่พบรายการอาหารที่ค้นหา') }}</p>
            <p class="text-xs text-muted-foreground mt-1">ลองเปลี่ยนคำค้นหา หรือเลือกหมวดหมู่อื่น</p>
          </div>
          <button 
            @click="searchQuery = ''; activeCategory = 'all'; activeDietaryFilter = 'all'"
            class="px-4 py-1.5 rounded-xl text-xs font-bold border border-border"
          >
            ล้างตัวกรอง (Clear Filter)
          </button>
        </div>

        <!-- Items Grid: Responsive Mobile 1 Col, Tablet/iPad 2 Cols, Desktop 3 Cols -->
        <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
          <div 
            v-for="item in filteredItems" 
            :key="item.id" 
            @click="openItemModal(item)"
            class="bg-card border border-border/60 rounded-2xl p-3 sm:p-3.5 shadow-2xs hover:shadow-md transition-all duration-200 cursor-pointer flex gap-3 sm:gap-3.5 items-center group active:scale-[0.99] relative overflow-hidden"
          >
            
            <!-- Food Thumbnail (Aspect 1:1) -->
            <div class="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-muted overflow-hidden shrink-0 relative border border-border/40">
              <img 
                v-if="item.photo_url || item.image_url" 
                :src="item.photo_url || item.image_url" 
                loading="lazy"
                class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                alt="Food"
              />
              <div v-else class="w-full h-full flex items-center justify-center text-3xl bg-muted/30">
                🍲
              </div>

              <!-- Spicy Level Badge -->
              <div 
                v-if="item.is_spicy" 
                class="absolute bottom-1.5 right-1.5 bg-black/75 backdrop-blur-xs rounded-lg px-1.5 py-0.5 text-[9px] text-white font-bold flex items-center gap-0.5 shadow-xs"
              >
                <span>🌶️</span>
                <span v-if="item.spicy_level > 1">{{ item.spicy_level }}</span>
              </div>

              <!-- Cart Quantity Badge on Image if added -->
              <div 
                v-if="getItemCartQuantity(item.id) > 0"
                class="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-md text-[10px] font-black shadow-md"
                :style="{ backgroundColor: palette.primary, color: palette.primaryContrast }"
              >
                {{ getItemCartQuantity(item.id) }}x
              </div>
            </div>

            <!-- Food Info -->
            <div class="flex-1 min-w-0 py-0.5 flex flex-col justify-between self-stretch">
              <div>
                <!-- Title & Pronunciation TTS -->
                <div class="flex items-start justify-between gap-1">
                  <h3 class="font-black text-foreground text-sm sm:text-base leading-snug line-clamp-1">
                    {{ getItemName(item) }}
                  </h3>
                  
                  <!-- Pronunciation Audio Icon -->
                  <button 
                    v-if="item.name_th" 
                    @click.stop="playPronunciation(item.name_th, item.id)"
                    class="text-muted-foreground hover:text-primary p-1 shrink-0 -mt-1 -mr-1 transition-colors"
                    :class="activeSpeakingItem === item.id ? 'text-primary scale-125 animate-pulse' : ''"
                    title="ฟังเสียงอ่านชื่อไทย (Pronunciation)"
                  >
                    <Volume2 class="w-3.5 h-3.5" />
                  </button>
                </div>

                <!-- Secondary Language Subtitle -->
                <p v-if="getItemSecondaryName(item)" class="text-[10px] sm:text-xs text-muted-foreground/80 line-clamp-1 font-medium">
                  {{ getItemSecondaryName(item) }}
                </p>

                <!-- Description -->
                <p v-if="getItemDesc(item)" class="text-[11px] text-muted-foreground line-clamp-2 mt-1 leading-tight">
                  {{ getItemDesc(item) }}
                </p>

                <!-- Allergen Preview Mini Tags -->
                <div v-if="item.menu_item_allergens?.length" class="flex flex-wrap gap-1 mt-1">
                  <span 
                    v-for="al in item.menu_item_allergens.slice(0, 2)" 
                    :key="al.allergens.id"
                    class="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400"
                  >
                    {{ al.allergens.icon || '⚠️' }} {{ al.allergens[`name_${locale}`] || al.allergens.name_th }}
                  </span>
                </div>
              </div>

              <!-- Price & Smart Quick Add Stepper -->
              <div class="flex items-center justify-between mt-2 pt-1 border-t border-border/30">
                <span class="font-black text-sm sm:text-base" :style="{ color: palette.primary }">
                  {{ formatPrice(item.price) }}
                </span>

                <!-- Quick Action Button -->
                <button 
                  @click.stop="quickAddToCart(item)"
                  class="px-3 py-1 font-bold text-xs rounded-xl transition-all flex items-center gap-1 shadow-2xs hover:scale-105 active:scale-95"
                  :style="{ backgroundColor: palette.primaryLight, color: palette.primary }"
                >
                  <Plus class="w-3.5 h-3.5" />
                  <span>{{ (item.menu_item_customizations?.length || item.is_spicy) ? (locale === 'zh' ? '选规格' : (locale === 'en' ? 'Option' : 'เลือก')) : (locale === 'zh' ? '添加' : (locale === 'en' ? 'Add' : 'สั่ง')) }}</span>
                </button>
              </div>

            </div>

          </div>
        </div>

      </div>

    </div>

    <!-- ============================================================= -->
    <!-- 5. ITEM CUSTOMIZATION MODAL (Bottom Sheet on Mobile / Modal on iPad/PC) -->
    <!-- ============================================================= -->
    <div 
      v-if="selectedItem" 
      class="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex justify-center items-end sm:items-center p-0 sm:p-4 animate-in fade-in duration-200"
      @touchmove.self.prevent
    >
      <div class="bg-card w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] animate-in slide-in-from-bottom duration-300 border border-border/50">
        
        <!-- Drag Pill Header (Mobile) -->
        <div class="sm:hidden flex justify-center pt-2 pb-1 bg-card">
          <div class="w-10 h-1 rounded-full bg-muted-foreground/30"></div>
        </div>

        <!-- Food Photo Header -->
        <div class="h-48 sm:h-52 bg-slate-200 dark:bg-neutral-800 relative shrink-0">
          <img 
            v-if="selectedItem.photo_url || selectedItem.image_url" 
            :src="selectedItem.photo_url || selectedItem.image_url" 
            class="w-full h-full object-cover" 
            alt="Dish Preview"
          />
          <div v-else class="w-full h-full flex items-center justify-center text-5xl">🍲</div>
          
          <button 
            type="button"
            @click="closeItemModal" 
            class="absolute top-3 right-3 z-30 w-9 h-9 sm:w-10 sm:h-10 bg-black/70 hover:bg-black/90 active:scale-90 text-white rounded-full flex items-center justify-center backdrop-blur-md shadow-md border border-white/20 transition-all cursor-pointer"
            aria-label="Close menu modal"
          >
            <X class="w-5 h-5 stroke-[2.5]" />
          </button>

          <div class="absolute bottom-3 left-3 bg-black/60 backdrop-blur-md px-3 py-1 rounded-xl text-white font-black text-sm">
            {{ formatPrice(selectedItem.price) }}
          </div>
        </div>

        <!-- Sheet Scrollable Content -->
        <div class="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
          
          <!-- Title & Subtitle -->
          <div>
            <div class="flex items-start justify-between gap-2">
              <h3 class="text-base sm:text-lg font-black text-foreground">
                {{ getItemName(selectedItem) }}
              </h3>
              <button 
                v-if="selectedItem.name_th" 
                @click="playPronunciation(selectedItem.name_th)"
                class="p-1.5 rounded-xl bg-muted/60 text-muted-foreground hover:text-foreground shrink-0 flex items-center gap-1 text-xs font-bold"
              >
                <Volume2 class="w-3.5 h-3.5 text-primary" />
                <span>ฟังเสียง</span>
              </button>
            </div>

            <p v-if="selectedItem.name_th && locale !== 'th'" class="text-xs text-muted-foreground mt-0.5">
              🇹🇭 {{ selectedItem.name_th }}
            </p>

            <p v-if="getItemDesc(selectedItem)" class="text-xs text-muted-foreground mt-2 leading-relaxed bg-muted/40 p-3 rounded-xl border border-border/40">
              {{ getItemDesc(selectedItem) }}
            </p>
          </div>

          <!-- Allergen Information Alert -->
          <div v-if="selectedItem.menu_item_allergens?.length > 0" class="p-3 bg-amber-500/10 border border-amber-500/30 rounded-2xl space-y-1.5">
            <p class="text-[11px] font-bold text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
              <ShieldAlert class="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span>{{ locale === 'zh' ? '过敏原提示 (Allergen Info):' : (locale === 'en' ? 'Allergen Information:' : 'ข้อมูลสำหรับผู้แพ้อาหาร (Allergen Info):') }}</span>
            </p>
            <div class="flex flex-wrap gap-1.5">
              <span 
                v-for="al in selectedItem.menu_item_allergens" 
                :key="al.allergens.id"
                class="px-2 py-0.5 rounded-lg bg-amber-500/20 text-amber-800 dark:text-amber-200 text-[10px] font-bold flex items-center gap-1"
              >
                <span>{{ al.allergens.icon || '⚠️' }}</span>
                <span>{{ al.allergens[`name_${locale}`] || al.allergens.name_en || al.allergens.name_th }}</span>
              </span>
            </div>
          </div>

          <!-- Spice Level Options -->
          <div v-if="selectedItem.is_spicy" class="space-y-2 border-t border-border/40 pt-3">
            <div class="flex items-center justify-between">
              <h4 class="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Flame class="w-4 h-4 text-rose-500" />
                <span>ระดับความเผ็ด (Spice Level)</span>
              </h4>
              <span class="text-[11px] font-bold text-rose-500">{{ getSpiceLabel(itemSpiceLevel).text }}</span>
            </div>
            
            <div class="grid grid-cols-4 gap-1.5">
              <button 
                v-for="level in 4" 
                :key="level" 
                type="button"
                @click="itemSpiceLevel = level"
                class="py-2 px-1 rounded-xl border text-center text-xs font-bold transition-all"
                :class="itemSpiceLevel === level ? 'border-rose-500 bg-rose-500/10 text-rose-600 dark:text-rose-400 shadow-2xs font-black' : 'border-border/60 text-muted-foreground hover:bg-muted/40'"
              >
                <div>{{ getSpiceLabel(level).icon }}</div>
                <div class="text-[10px] mt-0.5">{{ level === 1 ? 'Mild' : (level === 2 ? 'Low' : (level === 3 ? 'Med' : 'Hot')) }}</div>
              </button>
            </div>
          </div>

          <!-- Customization Groups (Add-ons & Options) -->
          <div v-if="selectedItem.menu_item_customizations?.length > 0" class="space-y-3.5 border-t border-border/40 pt-3">
            <div v-for="cust in selectedItem.menu_item_customizations" :key="cust.customization_groups.id" class="space-y-2">
              <h4 class="text-xs font-bold text-foreground flex items-center justify-between">
                <span>{{ cust.customization_groups[`name_${locale}`] || cust.customization_groups.name_en || cust.customization_groups.name_th }}</span>
                <span class="text-[10px] text-muted-foreground">(เลือกได้ 1 อย่าง)</span>
              </h4>

              <div class="space-y-1.5">
                <div 
                  v-for="opt in cust.customization_groups.customization_options" 
                  :key="opt.id"
                  @click="selectAddonOption(cust.customization_groups.id, opt)"
                  class="flex items-center justify-between p-2.5 rounded-xl border cursor-pointer transition-all"
                  :class="itemAddons[cust.customization_groups.id]?.name === (opt[`name_${locale}`] || opt.name_en || opt.name_th) ? 'font-bold shadow-2xs' : 'border-border/60 hover:bg-muted/40'"
                  :style="itemAddons[cust.customization_groups.id]?.name === (opt[`name_${locale}`] || opt.name_en || opt.name_th) ? { borderColor: palette.primary, backgroundColor: palette.primarySubtle } : {}"
                >
                  <div class="flex items-center gap-2">
                    <div 
                      class="w-4 h-4 rounded-full border flex items-center justify-center text-[9px]"
                      :style="itemAddons[cust.customization_groups.id]?.name === (opt[`name_${locale}`] || opt.name_en || opt.name_th) ? { backgroundColor: palette.primary, color: palette.primaryContrast, borderColor: palette.primary } : {}"
                    >
                      <Check v-if="itemAddons[cust.customization_groups.id]?.name === (opt[`name_${locale}`] || opt.name_en || opt.name_th)" class="w-3 h-3 stroke-[3]" />
                    </div>
                    <span class="text-xs">{{ opt[`name_${locale}`] || opt.name_en || opt.name_th }}</span>
                  </div>
                  <span v-if="(opt.extra_price !== undefined ? opt.extra_price : opt.price_delta) > 0" class="text-xs font-bold" :style="{ color: palette.primary }">
                    +{{ formatPrice(opt.extra_price !== undefined ? opt.extra_price : opt.price_delta) }}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <!-- Special Request & Quick Chips -->
          <div class="border-t border-border/40 pt-3 space-y-2">
            <label class="block text-xs font-bold text-foreground">
              {{ locale === 'zh' ? '特殊要求 / 备注 (Special Instructions):' : (locale === 'en' ? 'Special Request / Instructions:' : 'ข้อความเพิ่มเติมถึงครัว (Special Request):') }}
            </label>
            
            <!-- Quick Chips -->
            <div class="flex flex-wrap gap-1.5">
              <button 
                v-for="(chip, cIdx) in quickNoteChips" 
                :key="cIdx"
                type="button"
                @click="addQuickNote(chip)"
                class="px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all"
                :class="itemNote.includes(chip[locale] || chip.th) ? 'border-primary bg-primary/10 text-primary' : 'bg-muted/50 text-muted-foreground border-border/50'"
              >
                + {{ chip[locale] || chip.en || chip.th }}
              </button>
            </div>

            <input 
              v-model="itemNote"
              type="text" 
              placeholder="e.g. No cilantro, แยกน้ำซุป, หวานน้อย"
              class="w-full px-3 py-2 bg-muted/40 border border-border/60 rounded-xl text-xs focus:ring-2 outline-none"
              :style="{ '--tw-ring-color': palette.primaryLight }"
            />
          </div>

        </div>

        <!-- Modal Bottom Sticky Add Action -->
        <div class="p-4 bg-card border-t border-border/50 shrink-0 flex items-center gap-3">
          <!-- Quantity Stepper -->
          <div class="flex items-center gap-1.5 bg-muted/60 rounded-xl p-1 shrink-0 border border-border/40">
            <button 
              @click="itemQuantity = Math.max(1, itemQuantity - 1)" 
              class="w-8 h-8 rounded-lg bg-background flex items-center justify-center font-bold text-xs shadow-2xs hover:bg-muted active:scale-95"
            >
              <Minus class="w-3.5 h-3.5" />
            </button>
            <span class="w-6 text-center font-black text-xs">{{ itemQuantity }}</span>
            <button 
              @click="itemQuantity++" 
              class="w-8 h-8 rounded-lg bg-background flex items-center justify-center font-bold text-xs shadow-2xs hover:bg-muted active:scale-95"
            >
              <Plus class="w-3.5 h-3.5" />
            </button>
          </div>

          <!-- Add to Cart Button -->
          <button 
            @click="addToCart" 
            class="flex-1 py-3 font-black text-xs rounded-xl shadow-md transition-all flex items-center justify-between px-4 hover:opacity-95 active:scale-[0.99]"
            :style="{ backgroundColor: palette.primary, color: palette.primaryContrast }"
          >
            <span>{{ locale === 'zh' ? '加入订单' : (locale === 'en' ? 'Add to Order' : 'เพิ่มลงรายการสั่ง') }}</span>
            <span class="text-sm font-black">{{ formatPrice(modalCalculatedUnitPrice * itemQuantity) }}</span>
          </button>
        </div>

      </div>
    </div>

    <!-- ============================================================= -->
    <!-- 6. FLOATING SMART CART BAR (STICKY BOTTOM)                    -->
    <!-- ============================================================= -->
    <div 
      v-if="cart.length > 0 && !isCartOpen && !selectedItem && !orderSuccess" 
      class="fixed bottom-5 left-0 right-0 z-40 flex justify-center px-3 sm:px-5 animate-in slide-in-from-bottom duration-300 pointer-events-none"
    >
      <button 
        @click="isCartOpen = true" 
        class="pointer-events-auto w-full max-w-md sm:max-w-xl md:max-w-2xl py-3.5 px-4 rounded-2xl shadow-xl shadow-black/25 flex items-center justify-between hover:scale-[1.01] active:scale-[0.99] transition-all border border-white/20"
        :class="cartBouncing ? 'scale-105' : ''"
        :style="{ background: palette.primaryGradient, color: palette.primaryContrast }"
      >
        <div class="flex items-center gap-3">
          <div class="w-9 h-9 rounded-xl bg-white/25 backdrop-blur-md flex items-center justify-center text-xs font-black shadow-inner">
            <ShoppingBag class="w-4 h-4 mr-0.5" />
            <span>{{ cartItemCount }}</span>
          </div>
          <div class="text-left">
            <p class="text-xs font-black leading-tight">{{ locale === 'zh' ? '查看已点菜品' : (locale === 'en' ? 'View Your Order' : 'ดูรายการสั่งอาหาร') }}</p>
            <p class="text-[10px] opacity-80">{{ cart.length }} รายการ (Items)</p>
          </div>
        </div>

        <div class="flex items-center gap-2 font-black text-sm">
          <span>{{ formatPrice(cartTotal) }}</span>
          <ChevronRight class="w-4 h-4" />
        </div>
      </button>
    </div>

    <!-- ============================================================= -->
    <!-- 7. CART DRAWER & CHECKOUT FLOW (Responsive Sheet/Modal)       -->
    <!-- ============================================================= -->
    <div 
      v-if="isCartOpen" 
      class="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex justify-center items-end sm:items-center p-0 sm:p-4 animate-in fade-in duration-200"
      @touchmove.self.prevent
    >
      <div class="w-full sm:max-w-lg bg-card sm:rounded-3xl rounded-t-3xl shadow-2xl flex flex-col max-h-[88vh] sm:border border-border/50 overflow-hidden animate-in slide-in-from-bottom duration-300">
        
        <!-- Cart Header -->
        <div class="p-4 border-b border-border/50 flex items-center justify-between bg-card/90 backdrop-blur-md shrink-0">
          <div class="flex items-center gap-2">
            <div class="w-8 h-8 rounded-xl flex items-center justify-center" :style="{ backgroundColor: palette.primaryLight, color: palette.primary }">
              <ShoppingBag class="w-4 h-4" />
            </div>
            <div>
              <h2 class="text-sm font-black text-foreground">{{ locale === 'zh' ? '我的订单' : (locale === 'en' ? 'Your Order' : 'รายการอาหารของคุณ') }}</h2>
              <p class="text-[10px] text-muted-foreground">{{ cartItemCount }} รายการ</p>
            </div>
          </div>
          <button 
            type="button"
            @click="isCartOpen = false" 
            class="p-2 rounded-xl hover:bg-muted active:scale-90 text-muted-foreground hover:text-foreground transition-all cursor-pointer"
            aria-label="Close cart"
          >
            <X class="w-5 h-5 stroke-[2.5]" />
          </button>
        </div>

        <!-- Cart Item List -->
        <div class="flex-1 overflow-y-auto p-4 space-y-2.5">
          <div 
            v-for="(item, index) in cart" 
            :key="item.id" 
            class="bg-card border border-border/60 rounded-2xl p-3 shadow-2xs flex gap-3 relative"
          >
            <div class="w-16 h-16 rounded-xl bg-muted overflow-hidden shrink-0 border border-border/40">
              <img 
                v-if="item.menuItem.photo_url || item.menuItem.image_url" 
                :src="item.menuItem.photo_url || item.menuItem.image_url" 
                class="w-full h-full object-cover" 
                alt="Cart item"
              />
              <div v-else class="w-full h-full flex items-center justify-center text-2xl">🍲</div>
            </div>

            <div class="flex-1 min-w-0">
              <div class="flex justify-between items-start">
                <h4 class="font-black text-xs text-foreground truncate pr-5">{{ getItemName(item.menuItem) }}</h4>
                <button @click="removeFromCart(index)" class="text-muted-foreground hover:text-rose-600 p-0.5 transition-colors">
                  <Trash2 class="w-3.5 h-3.5" />
                </button>
              </div>

              <!-- Options Subtext -->
              <div class="text-[10px] text-muted-foreground space-y-0.5 mt-0.5">
                <p v-if="item.spiceLevel" class="text-rose-500 font-bold">🌶️ {{ getSpiceLabel(item.spiceLevel).text }}</p>
                <p v-for="(name, idx) in item.addonNames" :key="idx" class="text-foreground/80">➕ {{ name }}</p>
                <p v-if="item.note" class="italic text-amber-600 dark:text-amber-400">💬 {{ item.note }}</p>
              </div>

              <div class="flex items-center justify-between mt-2 pt-1 border-t border-border/30">
                <span class="font-black text-xs" :style="{ color: palette.primary }">
                  {{ formatPrice(item.unitPrice * item.quantity) }}
                </span>

                <div class="flex items-center gap-1.5 bg-muted/60 rounded-lg p-0.5 border border-border/30">
                  <button @click="updateCartItemQty(index, -1)" class="w-5 h-5 rounded bg-background text-xs font-bold shadow-2xs hover:bg-muted">-</button>
                  <span class="text-xs font-black w-4 text-center">{{ item.quantity }}</span>
                  <button @click="updateCartItemQty(index, 1)" class="w-5 h-5 rounded bg-background text-xs font-bold shadow-2xs hover:bg-muted">+</button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Checkout Bottom Controls -->
        <div class="p-4 bg-card border-t border-border/50 shrink-0 shadow-lg space-y-3">
          
          <!-- Dining Option & Table Selector -->
          <div class="space-y-2">
            <div class="flex items-center justify-between">
              <label class="block text-xs font-bold text-foreground">
                {{ locale === 'zh' ? '用餐方式 / 桌号' : (locale === 'en' ? 'Dining Option / Table' : 'รูปแบบการสั่ง / โต๊ะ') }} <span class="text-rose-500">*</span>
              </label>
              <span class="text-[11px] font-bold" :style="{ color: palette.primary }">
                {{ orderType === 'takeaway' ? '🥡 สั่งกลับบ้าน' : '🪑 ทานที่ร้าน' }}
              </span>
            </div>
            
            <!-- Segmented Option Buttons -->
            <div class="grid grid-cols-2 gap-2">
              <button 
                type="button"
                @click="orderType = 'dinein'"
                class="py-2 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                :class="orderType === 'dinein' ? 'border-transparent shadow-xs' : 'bg-muted/50 text-muted-foreground border-border/50 hover:text-foreground'"
                :style="orderType === 'dinein' ? { backgroundColor: palette.primary, color: palette.primaryContrast } : {}"
              >
                <span>🪑 ทานที่ร้าน (Dine-in)</span>
              </button>

              <button 
                type="button"
                @click="orderType = 'takeaway'"
                class="py-2 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                :class="orderType === 'takeaway' ? 'border-transparent shadow-xs' : 'bg-muted/50 text-muted-foreground border-border/50 hover:text-foreground'"
                :style="orderType === 'takeaway' ? { backgroundColor: palette.primary, color: palette.primaryContrast } : {}"
              >
                <span>🥡 สั่งกลับบ้าน (Takeaway)</span>
              </button>
            </div>

            <!-- If Dine-in: Table Input -->
            <div v-if="orderType === 'dinein'" class="animate-in fade-in duration-200">
              <div v-if="detectedTableFromQr" class="p-2 mb-1.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center justify-between text-xs">
                <span class="font-bold text-emerald-700 dark:text-emerald-300">📍 โต๊ะของคุณ: {{ detectedTableFromQr }}</span>
                <span class="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">ระบุจาก QR แล้ว</span>
              </div>
              <input 
                v-model="tableNo" 
                type="text" 
                required
                :placeholder="locale === 'zh' ? '填写桌号 (例如 5号桌, A12)' : (locale === 'en' ? 'Enter Table Number (e.g. 5, A12)' : 'ระบุหมายเลขโต๊ะ เช่น โต๊ะ 1, โต๊ะ 5, หรือ A12')" 
                class="w-full px-3.5 py-2 bg-background border border-border/80 rounded-xl font-bold text-sm focus:ring-2 outline-none"
                :style="{ '--tw-ring-color': palette.primaryLight }"
              />
            </div>

            <!-- If Takeaway / No table: Name / Call Name -->
            <div v-else class="space-y-1.5 animate-in fade-in duration-200">
              <input 
                v-model="customerName" 
                type="text" 
                :placeholder="locale === 'zh' ? '取餐称呼 / 顾客姓名 (选填)' : (locale === 'en' ? 'Name for pickup (Optional)' : 'ชื่อสำหรับเรียกรับอาหาร (ไม่ระบุก็ได้ เช่น คุณอาร์ม)')" 
                class="w-full px-3.5 py-2 bg-background border border-border/80 rounded-xl text-xs font-medium focus:ring-2 outline-none"
                :style="{ '--tw-ring-color': palette.primaryLight }"
              />
            </div>
          </div>

          <!-- Total Breakdown -->
          <div class="flex justify-between items-center text-sm font-black pt-1">
            <span>{{ locale === 'zh' ? '总计金额 (Total):' : (locale === 'en' ? 'Grand Total:' : 'ยอดรวมทั้งหมด (Total):') }}</span>
            <span class="text-base font-black" :style="{ color: palette.primary }">{{ formatPrice(cartTotal) }}</span>
          </div>

          <!-- Submit Order Button -->
          <button 
            @click="submitOrder" 
            :disabled="isSubmitting || (orderType === 'dinein' && !tableNo.trim())"
            class="w-full py-3.5 font-black text-sm rounded-2xl shadow-md disabled:opacity-50 transition-all flex items-center justify-center gap-2 hover:opacity-95 active:scale-[0.99]"
            :style="{ backgroundColor: palette.primary, color: palette.primaryContrast }"
          >
            <span v-if="isSubmitting" class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
            <Check class="w-4 h-4 stroke-[3]" v-else />
            <span>{{ isSubmitting ? 'กำลังส่งออเดอร์เข้าครัว...' : (locale === 'zh' ? '确认发送订单' : (locale === 'en' ? 'Confirm & Place Order' : 'ยืนยันการสั่งอาหาร (Confirm Order)')) }}</span>
          </button>
        </div>

      </div>
    </div>

    <!-- ============================================================= -->
    <!-- 8. ORDER SUCCESS DIGITAL RECEIPT MODAL                        -->
    <!-- ============================================================= -->
    <div 
      v-if="orderSuccess" 
      class="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 text-center animate-in zoom-in duration-300"
    >
      <div class="w-full max-w-md bg-card border border-border/60 rounded-3xl p-6 sm:p-7 shadow-2xl flex flex-col items-center">
        
        <!-- Animated Success Badge -->
        <div class="w-16 h-16 bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-3xl flex items-center justify-center mb-3 shadow-sm animate-bounce">
          <CheckCircle2 class="w-9 h-9 stroke-[2.5]" />
        </div>

        <h2 class="text-xl font-black text-foreground">
          {{ locale === 'zh' ? '下单成功！' : (locale === 'en' ? 'Order Placed Successfully!' : 'สั่งอาหารเรียบร้อยแล้ว!') }}
        </h2>
        <p class="text-xs text-muted-foreground mt-1">
          {{ locale === 'zh' ? '厨房正在为您准备美食，请在座位稍候' : (locale === 'en' ? 'Your order is sent to the kitchen. Please relax.' : 'ระบบส่งรายการไปยังห้องครัวเรียบร้อยแล้ว กรุณารอสักครู่ค่ะ') }}
        </p>

        <!-- Live Step Tracker -->
        <div class="w-full bg-muted/40 p-3 rounded-2xl my-3 border border-border/40 flex items-center justify-between text-[11px] font-bold text-muted-foreground">
          <div class="flex items-center gap-1 text-emerald-600 font-black">
            <span class="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
            <span>1. ส่งเข้าครัวแล้ว</span>
          </div>
          <span>→</span>
          <div>2. กำลังปรุง</div>
          <span>→</span>
          <div>3. พร้อมเสิร์ฟ</div>
        </div>

        <div class="px-4 py-1.5 rounded-2xl font-black text-xs border" :style="{ backgroundColor: palette.primaryLight, color: palette.primary, borderColor: palette.primaryBorder }">
          📍 {{ locale === 'zh' ? '用餐 / 桌号' : (locale === 'en' ? 'Dining / Table' : 'สถานที่ / โต๊ะ') }}: <span class="font-black text-sm ml-1">{{ finalAssignedTable || tableNo || 'สั่งกลับบ้าน' }}</span>
        </div>

        <!-- Receipt Box -->
        <div class="w-full bg-muted/20 border border-border/50 rounded-2xl p-3.5 my-3 text-left shadow-xs space-y-2 overflow-y-auto max-h-[30vh]">
          <div v-for="(item, idx) in cart" :key="idx" class="flex justify-between items-start border-b border-border/30 last:border-0 pb-1.5 text-xs">
            <div>
              <div class="font-bold text-foreground">{{ item.quantity }}x {{ getItemName(item.menuItem) }}</div>
              <div v-if="item.addonNames?.length" class="text-[10px] text-muted-foreground">
                + {{ item.addonNames.join(', ') }}
              </div>
              <div v-if="item.spiceLevel" class="text-[10px] text-rose-500">
                🌶️ {{ getSpiceLabel(item.spiceLevel).text }}
              </div>
            </div>
            <span class="font-bold shrink-0" :style="{ color: palette.primary }">{{ formatPrice(item.unitPrice * item.quantity) }}</span>
          </div>

          <div class="pt-2 border-t border-border/60 flex justify-between items-center font-black text-sm text-foreground">
            <span>Total:</span>
            <span class="text-base" :style="{ color: palette.primary }">{{ formatPrice(cartTotal) }}</span>
          </div>
        </div>

        <!-- Actions -->
        <div class="w-full space-y-2">
          <button 
            @click="orderSuccess = false; cart = []" 
            class="w-full py-3 font-black text-xs rounded-xl shadow-md transition-colors"
            :style="{ backgroundColor: palette.primary, color: palette.primaryContrast }"
          >
            {{ locale === 'zh' ? '完成 (继续查看菜单)' : (locale === 'en' ? 'Done (View Menu)' : 'เสร็จสิ้น (ดูเมนูต่อ)') }}
          </button>
        </div>

      </div>
    </div>

    <!-- ============================================================= -->
    <!-- 9. CALL SERVICE / STAFF ASSISTANCE MODAL (Hidden for Phase 2) -->
    <!-- ============================================================= -->
    <!--
    <div 
      v-if="isServiceModalOpen" 
      class="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 text-center animate-in zoom-in duration-200"
      @click.self="isServiceModalOpen = false"
    >
      <div class="w-full max-w-sm bg-card border border-border/60 rounded-3xl p-5 shadow-2xl text-left space-y-3">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <Bell class="w-5 h-5" :style="{ color: palette.primary }" />
            <h3 class="font-black text-sm text-foreground">{{ locale === 'zh' ? '呼叫服务 / 需求' : (locale === 'en' ? 'Call Staff & Amenities' : 'เรียกพนักงาน / บริการเสริม') }}</h3>
          </div>
          <button @click="isServiceModalOpen = false" class="p-1 text-muted-foreground hover:text-foreground">
            <X class="w-4 h-4" />
          </button>
        </div>

        <div v-if="serviceSuccessMsg" class="p-3 bg-emerald-500/20 border border-emerald-500/40 rounded-xl text-center text-xs font-bold text-emerald-700 dark:text-emerald-300">
          ✅ {{ serviceSuccessMsg }}
        </div>

        <div v-else class="grid grid-cols-2 gap-2 pt-1">
          <button 
            @click="sendServiceRequest('staff')"
            class="p-3 rounded-2xl border border-border/60 hover:border-primary bg-muted/40 hover:bg-primary/5 flex flex-col items-center gap-1.5 text-center transition-all"
          >
            <span class="text-2xl">🙋‍♂️</span>
            <span class="text-xs font-bold text-foreground">{{ locale === 'zh' ? '呼叫服务员' : (locale === 'en' ? 'Call Staff' : 'เรียกพนักงาน') }}</span>
          </button>

          <button 
            @click="sendServiceRequest('bill')"
            class="p-3 rounded-2xl border border-border/60 hover:border-primary bg-muted/40 hover:bg-primary/5 flex flex-col items-center gap-1.5 text-center transition-all"
          >
            <span class="text-2xl">🧾</span>
            <span class="text-xs font-bold text-foreground">{{ locale === 'zh' ? '请求结账' : (locale === 'en' ? 'Request Bill' : 'ขอเช็คบิล') }}</span>
          </button>

          <button 
            @click="sendServiceRequest('utensils')"
            class="p-3 rounded-2xl border border-border/60 hover:border-primary bg-muted/40 hover:bg-primary/5 flex flex-col items-center gap-1.5 text-center transition-all"
          >
            <span class="text-2xl">🥢</span>
            <span class="text-xs font-bold text-foreground">{{ locale === 'zh' ? '加餐具/纸巾' : (locale === 'en' ? 'Utensils/Napkin' : 'ขอช้อนส้อม/ทิชชู่') }}</span>
          </button>

          <button 
            @click="sendServiceRequest('water')"
            class="p-3 rounded-2xl border border-border/60 hover:border-primary bg-muted/40 hover:bg-primary/5 flex flex-col items-center gap-1.5 text-center transition-all"
          >
            <span class="text-2xl">🧊</span>
            <span class="text-xs font-bold text-foreground">{{ locale === 'zh' ? '加冰/水' : (locale === 'en' ? 'Ice / Water' : 'ขอน้ำแข็ง/น้ำเปล่า') }}</span>
          </button>
        </div>
      </div>
    </div>
    -->

  </div>
</template>
