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

const { t, locale } = useI18n()

// Voice Search State
const isListening = ref(false)
const searchQuery = ref('')
let recognition: any = null

onMounted(async () => {
  try {
    // 1. Get Store ID from QR code
    const { data: qrData } = await client
      .from('qr_codes')
      .select('store_id, id')
      .eq('short_code', shortCode)
      .eq('is_active', true)
      .single()
      
    if (!qrData) {
      loading.value = false
      return
    }

    // Log scan (fire and forget) - TEMPORARILY DISABLED due to RLS vulnerability
    /*
    client.from('usage_logs').insert({
      store_id: qrData.store_id,
      qr_code_id: qrData.id,
      event_type: 'menu_view'
    }).then()
    */

    // 2. Fetch Store
    const { data: storeData } = await client
      .from('stores')
      .select('*')
      .eq('id', qrData.store_id)
      .eq('is_active', true)
      .single()
      
    if (storeData) {
      store.value = storeData
      // Initialize default language based on store, but wait for i18n
      if (storeData.default_language && ['th', 'en', 'zh'].includes(storeData.default_language)) {
        locale.value = storeData.default_language
      }
    }

    // 3. Fetch Categories
    const { data: catData } = await client
      .from('menu_categories')
      .select('*')
      .eq('store_id', qrData.store_id)
      .eq('is_active', true)
      .order('sort_order')
      
    categories.value = catData || []

    // 4. Fetch Menu Items with Allergens & Customizations
    const { data: itemData } = await client
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
      .order('sort_order')
      
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
      activeCategory.value = 'all' // Reset category to show search results
    }
  }
}

const toggleVoiceSearch = () => {
  if (!recognition) {
    alert(t('not_available')) // Can improve this alert later
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
    // Cancel any ongoing speech
    window.speechSynthesis.cancel()
    
    const utterance = new SpeechSynthesisUtterance(textTh)
    utterance.lang = 'th-TH'
    utterance.rate = 0.9 // slightly slower for clarity
    window.speechSynthesis.speak(utterance)
  }
}

// === Computed Data ===
const filteredItems = computed(() => {
  let result = menuItems.value
  
  // Filter by category
  if (activeCategory.value !== 'all') {
    result = result.filter(item => item.category_id === activeCategory.value)
  }
  
  // Filter by search query
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
  const l = locale.value
  return item[`name_${l}`] || item.name_en || item.name_th
}

const getItemDesc = (item: any) => {
  const l = locale.value
  return item[`explanation_${l}`] || item[`description_${l}`] || item.explanation_en || item.description_en || item.description_th || ''
}

// Format Price
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
  <div class="px-4 animate-in fade-in duration-500">
    <!-- Loading State -->
    <div v-if="loading" class="flex flex-col items-center justify-center py-20 space-y-4">
      <div class="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      <p class="text-muted-foreground animate-pulse font-medium">{{ $t('menu_loading') }}</p>
    </div>

    <!-- Store Not Found -->
    <div v-else-if="!store" class="text-center py-20 bg-card rounded-2xl shadow-sm border border-border/50 mt-6 animate-in slide-in-from-bottom-4 duration-500">
      <div class="text-4xl mb-4">🍽️</div>
      <h2 class="text-xl font-bold text-foreground">{{ $t('menu_not_found') }}</h2>
      <p class="text-muted-foreground mt-2">{{ $t('menu_invalid_qr') }}</p>
    </div>

    <!-- Empty Menu Warning -->
    <div v-else-if="categories.length === 0 && menuItems.length === 0" class="text-center py-20 bg-card rounded-2xl shadow-sm border border-border/50 mt-6 animate-in slide-in-from-bottom-4 duration-500 mx-4">
      <div class="text-4xl mb-4">👨‍🍳</div>
      <h2 class="text-xl font-bold text-foreground">{{ $t('not_available') }}</h2>
      <p class="text-muted-foreground mt-2">{{ $t('please_wait') }}</p>
    </div>

    <!-- Main Store Content -->
    <div v-else class="pb-12">
      
      <!-- Store Header (Glassmorphism card) -->
      <div class="bg-card/80 backdrop-blur-sm shadow-xl shadow-black/5 dark:shadow-black/20 rounded-3xl p-6 mt-4 border border-border/50 relative overflow-hidden animate-in slide-in-from-top-4 duration-500 delay-100 fill-mode-both">
        <!-- Abstract gradient blob behind text -->
        <div class="absolute -top-10 -right-10 w-32 h-32 bg-primary/20 rounded-full blur-3xl"></div>
        
        <div class="flex items-start justify-between relative z-10">
          <div>
            <h1 class="text-2xl font-black tracking-tight text-foreground">{{ getStoreName() }}</h1>
            <p class="text-sm text-muted-foreground mt-1">
              {{ store.store_type === 'restaurant' ? $t('store_type_restaurant') : 
                 store.store_type === 'cafe' ? $t('store_type_cafe') : 
                 store.store_type === 'street_food' ? $t('store_type_street') : 
                 store.store_type === 'drink' ? $t('store_type_drink') : 
                 store.store_type }}
            </p>
          </div>
        </div>
        
        <!-- Voice Search Input -->
        <div class="mt-6 relative flex items-center">
          <input 
            v-model="searchQuery" 
            type="text" 
            :placeholder="$t('search')" 
            class="w-full bg-background/80 dark:bg-muted/30 border border-border/50 rounded-2xl py-3 pl-4 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all placeholder-muted-foreground"
          >
          <!-- Mic Button -->
          <button 
            @click="toggleVoiceSearch"
            :class="isListening ? 'bg-red-500 text-white animate-pulse shadow-lg shadow-red-500/30' : 'bg-primary/10 text-primary hover:bg-primary/20'"
            class="absolute right-2 p-2 rounded-xl transition-all"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/>
            </svg>
          </button>
        </div>
      </div>

      <!-- Category Tabs (Horizontal Scroll) -->
      <div class="mt-8 -mx-4 px-4 overflow-x-auto hide-scrollbar sticky top-14 z-40 bg-background/90 backdrop-blur-xl py-3 border-b border-border/40 transition-colors animate-in fade-in duration-500 delay-200 fill-mode-both">
        <div class="flex gap-2 min-w-max">
          <button 
            @click="activeCategory = 'all'"
            :class="activeCategory === 'all' ? 'bg-foreground text-background shadow-md' : 'bg-muted/50 text-foreground hover:bg-muted'"
            class="px-5 py-2.5 rounded-2xl text-sm font-semibold transition-all"
          >
            {{ $t('menu') }}
          </button>
          <button 
            v-for="cat in categories" 
            :key="cat.id"
            @click="activeCategory = cat.id"
            :class="activeCategory === cat.id ? 'bg-foreground text-background shadow-md' : 'bg-muted/50 text-foreground hover:bg-muted'"
            class="px-5 py-2.5 rounded-2xl text-sm font-semibold transition-all"
          >
            {{ getCategoryName(cat) }}
          </button>
        </div>
      </div>

      <!-- Menu Items List -->
      <div class="mt-6 space-y-4">
        <div v-if="filteredItems.length === 0" class="text-center py-12 text-muted-foreground animate-in zoom-in-95 duration-300">
          <p>{{ $t('not_available') }}</p>
        </div>
        
        <div 
          v-for="(item, index) in filteredItems" 
          :key="item.id"
          class="group bg-card shadow-sm hover:shadow-md border border-border/40 rounded-3xl overflow-hidden transition-all duration-300 animate-in slide-in-from-bottom-6 fade-in fill-mode-both"
          :style="`animation-delay: ${(index % 10) * 50 + 200}ms`"
        >
          <div class="flex p-4 gap-4 h-full">
            <!-- Image -->
            <div class="w-28 h-28 shrink-0 rounded-2xl overflow-hidden bg-muted relative">
              <img v-if="item.photo_url" :src="item.photo_url" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
              <div v-else class="w-full h-full flex items-center justify-center text-4xl bg-muted/50">🍲</div>
              
              <!-- Spicy Badge -->
              <div v-if="item.is_spicy" class="absolute bottom-2 right-2 bg-black/60 backdrop-blur-sm rounded-lg px-2 py-0.5 text-xs">
                {{ '🌶️'.repeat(item.spicy_level || 1) }}
              </div>
            </div>
            
            <!-- Details -->
            <div class="flex-1 flex flex-col min-w-0 py-1">
              <div class="flex justify-between items-start gap-2">
                <h3 class="font-bold text-foreground text-[15px] leading-tight truncate">
                  {{ getItemName(item) }}
                </h3>
                
                <!-- TTS Button for Thai Pronunciation (Helpful for tourists) -->
                <button 
                  v-if="locale !== 'th' && item.name_th" 
                  @click.stop="speakThaiName(item.name_th)"
                  class="shrink-0 p-1.5 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                  title="Hear Thai Pronunciation"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>
                </button>
              </div>
              
              <!-- Description -->
              <p class="text-xs text-muted-foreground mt-1.5 line-clamp-2 leading-relaxed">
                {{ getItemDesc(item) }}
              </p>
              
              <div class="mt-auto pt-3 flex items-center justify-between">
                <span class="font-black text-primary text-base">{{ formatPrice(item.price) }}</span>
                
                <!-- Allergens Badges -->
                <div class="flex gap-1" v-if="item.menu_item_allergens?.length > 0">
                  <span 
                    v-for="al in item.menu_item_allergens.slice(0,3)" 
                    :key="al.allergens.id"
                    class="w-6 h-6 flex items-center justify-center bg-muted rounded-full text-[10px]"
                    :title="al.allergens[`name_${locale}`] || al.allergens.name_en || al.allergens.name_th"
                  >
                    {{ al.allergens.icon }}
                  </span>
                </div>
              </div>
            </div>
          </div>
          
          <!-- Customizations Preview (Optional, showing there are options) -->
          <div v-if="item.menu_item_customizations?.length > 0" class="px-4 py-2 bg-muted/30 border-t border-border/40 flex items-center gap-2">
            <span class="flex h-1.5 w-1.5 rounded-full bg-primary"></span>
            <span class="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
              {{ $t('options') }}
            </span>
          </div>
        </div>
      </div>
      
    </div>
  </div>
</template>
