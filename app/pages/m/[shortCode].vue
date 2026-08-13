<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'

definePageMeta({
  layout: 'tourist',
  // No auth middleware because this is public
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

const { t, locale } = useI18n()

// === Voice Search State ===
const isListening = ref(false)
const searchQuery = ref('')
let recognition: any = null

// === Cart & Order State ===
const cart = ref<any[]>([])
const isCartOpen = ref(false)
const tableNo = ref('')
const isSubmitting = ref(false)
const orderSuccess = ref(false)

// Item Selection Modal
const selectedItem = ref<any>(null)
const itemSpiceLevel = ref<number>(1)
const itemAddons = ref<Record<string, string>>({})

onMounted(async () => {
  try {
    // 1. Get Store ID from QR code
    const { data: qrData } = (await client
      .from('qr_codes')
      .select('store_id, id')
      .eq('short_code', shortCode)
      .eq('is_active', true)
      .single()) as any
      
    if (!qrData) {
      loading.value = false
      return
    }

    // 2. Fetch Store
    const { data: storeData } = (await client
      .from('stores')
      .select('*')
      .eq('id', qrData.store_id)
      .eq('is_active', true)
      .single()) as any
      
    if (storeData) {
      store.value = storeData
      if (storeData.default_language && ['th', 'en', 'zh'].includes(storeData.default_language)) {
        locale.value = storeData.default_language
      }
      
      // Check trial expiration
      if (storeData.plan_status === 'trial' && storeData.trial_ends_at) {
        const trialEnd = new Date(storeData.trial_ends_at).getTime()
        const now = new Date().getTime()
        if (trialEnd < now) {
          isStoreLocked.value = true
          loading.value = false
          return // Stop fetching menu items
        }
      }
    }


    // 3. Fetch Categories
    const { data: catData } = (await client
      .from('menu_categories')
      .select('*')
      .eq('store_id', qrData.store_id)
      .eq('is_active', true)
      .order('sort_order')) as any
      
    categories.value = catData || []

    // 4. Fetch Menu Items with Allergens & Customizations
    const { data: itemData } = (await client
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
      .eq('store_id', qrData.store_id)
      .eq('is_available', true)
      .order('sort_order')) as any
      
    menuItems.value = itemData || []
    
    // Init Web Speech API (STT)
    initSpeechRecognition()
    
  } catch (error) {
    console.error(error)
  }
  
  loading.value = false
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
    alert(t('not_available'))
    return
  }
  if (isListening.value) {
    recognition.stop()
  } else {
    recognition.lang = locale.value === 'en' ? 'en-US' : (locale.value === 'zh' ? 'zh-CN' : 'th-TH')
    recognition.start()
  }
}

// === Text to Speech (TTS) ===
const speakThaiName = (textTh: string) => {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(textTh)
    utterance.lang = 'th-TH'
    utterance.rate = 0.9
    window.speechSynthesis.speak(utterance)
  }
}

// === Cart Logic ===
const openItemModal = (item: any) => {
  selectedItem.value = item
  itemSpiceLevel.value = item.spicy_level || 1
  itemAddons.value = {}
}

const closeItemModal = () => {
  selectedItem.value = null
}

const addToCart = () => {
  if (!selectedItem.value) return
  
  cart.value.push({
    id: Date.now().toString(),
    menuItem: selectedItem.value,
    spiceLevel: selectedItem.value.is_spicy ? itemSpiceLevel.value : null,
    selectedAddons: { ...itemAddons.value },
    price: selectedItem.value.price // MVP: simplified price, not calculating addon prices yet
  })
  
  closeItemModal()
}

const removeFromCart = (index: number) => {
  cart.value.splice(index, 1)
}

const cartTotal = computed(() => {
  return cart.value.reduce((total, item) => total + item.price, 0)
})

const submitOrder = () => {
  if (!tableNo.value.trim()) {
    alert('Please enter your table number.')
    return
  }
  if (cart.value.length === 0) return

  // Fire and forget (don't await). Let the backend try to ping LINE.
  $fetch('/api/order/submit', {
    method: 'POST',
    body: {
      storeId: store.value.id,
      tableNo: tableNo.value,
      cart: cart.value
    }
  }).catch(e => {
    // Log silently, do not disturb the UI flow
    console.error('Background order sync failed:', e)
  })
  
  // Immediately show the Show-to-Staff screen
  orderSuccess.value = true
  isCartOpen.value = false
}

// === Computed Data ===
const filteredItems = computed(() => {
  let result = menuItems.value
  
  if (activeCategory.value !== 'all') {
    result = result.filter(item => item.category_id === activeCategory.value)
  }
  
  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter(item => {
      const nameTh = (item.name_th || '').toLowerCase()
      const nameEn = (item.name_en || '').toLowerCase()
      const descEn = (item.explanation_en || '').toLowerCase()
      return nameTh.includes(query) || nameEn.includes(query) || descEn.includes(query)
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
  const l = locale.value
  return item[`explanation_${l}`] || item[`description_${l}`] || item.explanation_en || item.description_en || item.description_th || ''
}

const formatPrice = (price: number) => {
  return new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' }).format(price)
}

const getStoreName = () => {
  if (!store.value) return ''
  const l = locale.value
  return store.value[`name_${l}`] || store.value.name
}
</script>

<template>
  <div class="px-4 animate-in fade-in duration-500 relative min-h-screen">
    
    <!-- Success Screen Overlay (Show to Staff) -->
    <div v-if="orderSuccess" class="fixed inset-0 z-50 bg-background flex flex-col items-center justify-center p-6 animate-in zoom-in duration-300">
      <h2 class="text-3xl font-black text-foreground mb-2 text-center leading-tight">Show this screen<br/>to the staff</h2>
      <p class="text-muted-foreground text-center mb-6">
        Table <strong class="text-foreground text-2xl ml-2">{{ tableNo }}</strong>
      </p>
      
      <!-- List the items so staff can see -->
      <div class="w-full max-w-sm bg-card border shadow-sm rounded-xl p-4 mb-8 text-left overflow-y-auto max-h-[50vh]">
        <div v-for="(item, idx) in cart" :key="idx" class="flex justify-between border-b last:border-0 py-3">
          <div>
            <div class="font-bold text-lg leading-tight">{{ getItemName(item) }}</div>
            <div v-if="item.customizations" class="text-sm text-muted-foreground mt-1">{{ item.customizations }}</div>
          </div>
          <div class="font-bold shrink-0 ml-4">{{ formatPrice(item.price) }}</div>
        </div>
        <div class="mt-2 pt-4 border-t flex justify-between font-black text-xl text-primary">
          <span>Total:</span>
          <span>{{ formatPrice(cartTotal) }}</span>
        </div>
      </div>

      <button @click="orderSuccess = false; cart = []" class="bg-primary text-primary-foreground px-8 py-4 rounded-2xl font-bold hover:bg-primary/90 transition-colors w-full max-w-sm text-lg shadow-lg">
        Done
      </button>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="flex flex-col items-center justify-center py-20 space-y-4">
      <div class="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      <p class="text-muted-foreground animate-pulse font-medium">{{ $t('menu_loading') }}</p>
    </div>

    <!-- Store Not Found / Inactive -->
    <div v-else-if="!store" class="flex flex-col items-center justify-center min-h-[50vh] text-center px-6">
      <div class="w-20 h-20 bg-muted rounded-full flex items-center justify-center mb-4">
        <span class="text-3xl">🚫</span>
      </div>
      <h2 class="text-xl font-bold text-foreground">Temporarily Closed</h2>
    </div>

    <!-- Store Locked (Trial Expired) -->
    <div v-else-if="isStoreLocked" class="flex flex-col items-center justify-center min-h-[60vh] text-center px-6">
      <div class="w-24 h-24 bg-red-100 text-red-500 rounded-full flex items-center justify-center mb-6 shadow-sm border border-red-200">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      </div>
      <h2 class="text-2xl font-black text-foreground mb-2">ร้านค้าปิดให้บริการชั่วคราว</h2>
      <p class="text-muted-foreground max-w-sm mb-8">ขออภัย ร้านค้านี้หมดเวลาทดลองใช้งานระบบแล้ว กรุณาแจ้งให้พนักงานหรือเจ้าของร้านทราบ</p>
    </div>

    <!-- Main Content -->
    <div v-else class="pb-24">
      <!-- Store Header -->
      <div class="bg-card/80 backdrop-blur-sm shadow-xl shadow-black/5 rounded-3xl p-6 mt-4 border border-border/50 relative overflow-hidden">
        <div class="absolute -top-10 -right-10 w-32 h-32 bg-primary/20 rounded-full blur-3xl"></div>
        <div class="relative z-10">
          <h1 class="text-2xl font-black tracking-tight text-foreground">{{ getStoreName() }}</h1>
        </div>
        
        <!-- Voice Search -->
        <div class="mt-6 relative flex items-center">
          <input 
            v-model="searchQuery" 
            type="text" 
            :placeholder="$t('search')" 
            class="w-full bg-background/80 border border-border/50 rounded-2xl py-3 pl-4 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
          >
          <button @click="toggleVoiceSearch" :class="isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-primary/10 text-primary'" class="absolute right-2 p-2 rounded-xl transition-all">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/>
            </svg>
          </button>
        </div>
      </div>

      <!-- Categories -->
      <div class="mt-8 -mx-4 px-4 overflow-x-auto hide-scrollbar sticky top-14 z-30 bg-background/90 backdrop-blur-xl py-3 border-b border-border/40">
        <div class="flex gap-2 min-w-max">
          <button @click="activeCategory = 'all'" :class="activeCategory === 'all' ? 'bg-foreground text-background' : 'bg-muted/50'" class="px-5 py-2.5 rounded-2xl text-sm font-semibold transition-all">
            {{ $t('menu') }}
          </button>
          <button v-for="cat in categories" :key="cat.id" @click="activeCategory = cat.id" :class="activeCategory === cat.id ? 'bg-foreground text-background' : 'bg-muted/50'" class="px-5 py-2.5 rounded-2xl text-sm font-semibold transition-all">
            {{ getCategoryName(cat) }}
          </button>
        </div>
      </div>

      <!-- Menu Items -->
      <div class="mt-6 space-y-4">
        <div v-for="(item, index) in filteredItems" :key="item.id" @click="openItemModal(item)" class="group bg-card shadow-sm hover:shadow-md border border-border/40 rounded-3xl overflow-hidden cursor-pointer transition-all">
          <div class="flex p-4 gap-4 h-full">
            <!-- Image -->
            <div class="w-28 h-28 shrink-0 rounded-2xl overflow-hidden bg-muted relative">
              <img v-if="item.photo_url" :src="item.photo_url" class="w-full h-full object-cover" />
              <div v-else class="w-full h-full flex items-center justify-center text-4xl bg-muted/50">🍲</div>
              <div v-if="item.is_spicy" class="absolute bottom-2 right-2 bg-black/60 backdrop-blur-sm rounded-lg px-2 py-0.5 text-xs text-white">
                {{ '🌶️'.repeat(item.spicy_level || 1) }}
              </div>
            </div>
            
            <!-- Details -->
            <div class="flex-1 flex flex-col min-w-0 py-1">
              <div class="flex justify-between items-start gap-2">
                <h3 class="font-bold text-foreground text-[15px] leading-tight truncate">{{ getItemName(item) }}</h3>
              </div>
              <p class="text-xs text-muted-foreground mt-1.5 line-clamp-2 leading-relaxed">{{ getItemDesc(item) }}</p>
              <div class="mt-auto pt-3 flex items-center justify-between">
                <span class="font-black text-primary text-base">{{ formatPrice(item.price) }}</span>
                <button class="bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-bold">Add +</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Item Selection Modal -->
    <div v-if="selectedItem" class="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex justify-center items-end sm:items-center">
      <div class="bg-background w-full sm:w-[400px] sm:rounded-3xl rounded-t-3xl overflow-hidden animate-in slide-in-from-bottom-full sm:slide-in-from-bottom-10 duration-300 shadow-2xl flex flex-col max-h-[90vh]">
        
        <!-- Header Image -->
        <div class="h-48 bg-muted relative shrink-0">
          <img v-if="selectedItem.photo_url" :src="selectedItem.photo_url" class="w-full h-full object-cover" />
          <button @click="closeItemModal" class="absolute top-4 right-4 w-8 h-8 bg-black/50 text-white rounded-full flex items-center justify-center backdrop-blur-md">✕</button>
        </div>
        
        <!-- Content -->
        <div class="p-6 overflow-y-auto">
          <h2 class="text-2xl font-bold text-foreground">{{ getItemName(selectedItem) }}</h2>
          <p class="text-muted-foreground mt-2 text-sm">{{ getItemDesc(selectedItem) }}</p>
          <div class="mt-4 font-black text-xl text-primary">{{ formatPrice(selectedItem.price) }}</div>

          <!-- Spice Level -->
          <div v-if="selectedItem.is_spicy" class="mt-6 border-t border-border/50 pt-6">
            <h3 class="font-semibold text-foreground mb-3 flex items-center gap-2">
              <span>🌶️</span> Spice Level
            </h3>
            <div class="flex gap-2">
              <button v-for="level in 4" :key="level" @click="itemSpiceLevel = level" :class="itemSpiceLevel === level ? 'bg-red-500 text-white border-red-500' : 'bg-transparent text-foreground border-border'" class="flex-1 py-2 rounded-xl border transition-colors font-medium">
                {{ level === 1 ? 'No' : level === 2 ? 'Low' : level === 3 ? 'Med' : 'High' }}
              </button>
            </div>
          </div>

          <!-- Customizations -->
          <div v-if="selectedItem.menu_item_customizations?.length > 0" class="mt-6 border-t border-border/50 pt-6 space-y-6">
            <div v-for="cust in selectedItem.menu_item_customizations" :key="cust.customization_groups.id">
              <h3 class="font-semibold text-foreground mb-3">{{ cust.customization_groups[`name_${locale}`] || cust.customization_groups.name_en || cust.customization_groups.name_th }}</h3>
              <div class="space-y-2">
                <label v-for="opt in cust.customization_groups.customization_options" :key="opt.id" class="flex items-center justify-between p-3 rounded-xl border border-border/50 bg-card cursor-pointer hover:border-primary/50 transition-colors">
                  <span class="text-sm font-medium">{{ opt[`name_${locale}`] || opt.name_en || opt.name_th }}</span>
                  <input type="radio" :name="cust.customization_groups.id" :value="opt.name_th" v-model="itemAddons[cust.customization_groups.id]" class="w-4 h-4 text-primary focus:ring-primary">
                </label>
              </div>
            </div>
          </div>
        </div>

        <!-- Add Button -->
        <div class="p-4 bg-background border-t border-border/50 shrink-0">
          <button @click="addToCart" class="w-full bg-primary text-primary-foreground py-4 rounded-2xl font-bold text-lg hover:bg-primary/90 transition-colors">
            Add to Order
          </button>
        </div>
      </div>
    </div>

    <!-- Floating Cart Button -->
    <div v-if="cart.length > 0 && !isCartOpen && !selectedItem && !orderSuccess" class="fixed bottom-6 left-0 right-0 flex justify-center px-4 z-40">
      <button @click="isCartOpen = true" class="w-full max-w-[400px] bg-primary text-primary-foreground py-4 rounded-3xl font-bold text-lg shadow-xl shadow-primary/30 flex items-center justify-between px-6 hover:scale-[1.02] transition-transform">
        <div class="flex items-center gap-3">
          <span class="bg-white/20 w-8 h-8 rounded-full flex items-center justify-center text-sm">{{ cart.length }}</span>
          <span>View Order</span>
        </div>
        <span>{{ formatPrice(cartTotal) }}</span>
      </button>
    </div>

    <!-- Cart / Order Summary Modal -->
    <div v-if="isCartOpen" class="fixed inset-0 z-50 bg-background flex flex-col animate-in slide-in-from-bottom duration-300">
      <!-- Header -->
      <div class="p-4 border-b border-border/50 flex items-center justify-between bg-card/80 backdrop-blur-sm shrink-0">
        <h2 class="text-xl font-bold">Your Order</h2>
        <button @click="isCartOpen = false" class="p-2 bg-muted rounded-full">✕</button>
      </div>

      <!-- Cart Items -->
      <div class="flex-1 overflow-y-auto p-4 space-y-4">
        <div v-if="cart.length === 0" class="text-center py-10 text-muted-foreground">Empty</div>
        <div v-for="(item, index) in cart" :key="item.id" class="flex gap-4 p-4 bg-card rounded-2xl border border-border/50 relative">
          <button @click="removeFromCart(index)" class="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs font-bold shadow-sm">✕</button>
          <div class="w-16 h-16 bg-muted rounded-xl overflow-hidden shrink-0">
            <img v-if="item.menuItem.photo_url" :src="item.menuItem.photo_url" class="w-full h-full object-cover">
          </div>
          <div class="flex-1 min-w-0">
            <h4 class="font-bold text-sm truncate">{{ getItemName(item.menuItem) }}</h4>
            <div class="text-xs text-muted-foreground mt-1 space-y-0.5">
              <p v-if="item.spiceLevel">🌶️ Spice: {{ item.spiceLevel }}/4</p>
              <p v-for="(val, key) in item.selectedAddons" :key="key">➕ {{ val }}</p>
            </div>
            <p class="font-bold text-primary mt-2">{{ formatPrice(item.price) }}</p>
          </div>
        </div>
      </div>

      <!-- Checkout Footer -->
      <div class="p-4 bg-card border-t border-border/50 shrink-0 shadow-[0_-10px_20px_rgba(0,0,0,0.05)]">
        <!-- Table Number Input -->
        <div class="mb-4">
          <label class="block text-sm font-semibold text-foreground mb-1">Table Number <span class="text-red-500">*</span></label>
          <input v-model="tableNo" type="text" placeholder="e.g. 5, A12, or Takeaway" class="w-full bg-background border border-primary/30 rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-primary font-bold text-lg">
        </div>
        
        <button @click="submitOrder" :disabled="isSubmitting" class="w-full bg-black dark:bg-white text-white dark:text-black py-4 rounded-2xl font-bold text-lg flex justify-center items-center gap-2 hover:opacity-90 disabled:opacity-50 transition-opacity">
          <span v-if="isSubmitting" class="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
          <span v-else>Confirm Order</span>
          <span v-if="!isSubmitting">({{ formatPrice(cartTotal) }})</span>
        </button>
      </div>
    </div>

  </div>
</template>
