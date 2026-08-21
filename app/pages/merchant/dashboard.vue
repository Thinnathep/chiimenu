<script setup lang="ts">
import { 
  CheckCircle2, 
  Clock, 
  ChefHat, 
  XCircle, 
  RefreshCw, 
  TrendingUp, 
  AlertCircle,
  Utensils,
  QrCode,
  Layers,
  Sparkles,
  Zap,
  Wallet,
  ArrowRight,
  ExternalLink,
  Copy,
  Check,
  Power,
  Flame,
  ShoppingBag,
  BellRing,
  BookOpen,
  ArrowUpRight
} from 'lucide-vue-next'

definePageMeta({
  layout: 'merchant',
  middleware: 'auth'
})

const { t, locale } = useI18n()
const client = useSupabaseClient()
const { store, loading: pending, fetchStore } = useCurrentStore()

// State
const loading = ref(true)
const updatingStatus = ref(false)
const updatingOrderId = ref<string | null>(null)
const copiedLink = ref(false)
let realtimeChannel: any = null

// Realtime Dashboard Metrics
const todayStats = ref({
  sales: 0,
  totalOrders: 0,
  completedOrders: 0,
  pendingOrders: 0,
  cookingOrders: 0,
  tableQrCount: 0,
  latestOrders: [] as any[],
  availableDishes: 0,
  soldOutDishes: 0
})

// Calculate Today's Date Range (Asia/Bangkok 00:00:00)
const getTodayRangeStr = () => {
  const now = new Date()
  const bkkOffset = 7 * 60
  const localOffset = now.getTimezoneOffset()
  const bkkTime = new Date(now.getTime() + (bkkOffset + localOffset) * 60 * 1000)

  const y = bkkTime.getFullYear()
  const m = String(bkkTime.getMonth() + 1).padStart(2, '0')
  const d = String(bkkTime.getDate()).padStart(2, '0')

  return `${y}-${m}-${d}T00:00:00+07:00`
}

// Calculate Order Total Price strictly from items jsonb
const computeOrderTotal = (order: any): number => {
  if (!order?.items || !Array.isArray(order.items)) return 0
  return order.items.reduce((sum: number, it: any) => {
    const unitPrice = Number(it.unitPrice ?? it.price ?? it.menuItem?.price ?? 0)
    const qty = Number(it.quantity || 1)
    const optionsTotal = Array.isArray(it.selectedOptions)
      ? it.selectedOptions.reduce((optSum: number, opt: any) => optSum + Number(opt.extra_price ?? opt.price ?? 0), 0)
      : 0
    return sum + ((unitPrice + optionsTotal) * qty)
  }, 0)
}

// Fetch Today's Live Pulse & Kitchen Orders
const fetchDashboardData = async () => {
  if (!store.value?.id) return
  
  loading.value = true
  try {
    const todayStartStr = getTodayRangeStr()

    // 1. Fetch today's orders, menu items, and active table QR codes from real database tables
    const [ordersRes, menuRes, qrRes] = await Promise.all([
      client
        .from('orders')
        .select('id, status, table_no, items, created_at, cancel_reason, cancelled_at')
        .eq('store_id', store.value.id)
        .gte('created_at', todayStartStr)
        .order('created_at', { ascending: false }),
      client
        .from('menu_items')
        .select('id, is_available')
        .eq('store_id', store.value.id),
      client
        .from('qr_codes')
        .select('id, is_active')
        .eq('store_id', store.value.id)
        .eq('is_active', true)
    ])

    const orders = (ordersRes.data || []) as any[]
    const menuItems = (menuRes.data || []) as any[]
    const qrCodes = (qrRes.data || []) as any[]

    let sales = 0
    let completed = 0
    let pending = 0
    let cooking = 0

    for (const o of orders) {
      // Calculate revenue from completed orders using computeOrderTotal
      if (o.status === 'completed') {
        completed++
        sales += computeOrderTotal(o)
      } else if (o.status === 'pending') {
        pending++
      } else if (o.status === 'confirmed' || o.status === 'cooking' || o.status === 'in_progress') {
        cooking++
      }
    }

    const availableCount = menuItems.filter(m => m.is_available !== false).length
    const soldOutCount = menuItems.filter(m => m.is_available === false).length

    todayStats.value = {
      sales,
      totalOrders: orders.length,
      completedOrders: completed,
      pendingOrders: pending,
      cookingOrders: cooking,
      tableQrCount: qrCodes.length,
      latestOrders: orders.slice(0, 5),
      availableDishes: availableCount,
      soldOutDishes: soldOutCount
    }
  } catch (err) {
    console.error('Fetch Dashboard Error:', err)
  } finally {
    loading.value = false
  }
}

// 1-Click Store Active Status Toggle
const toggleStoreStatus = async () => {
  if (!store.value?.id || updatingStatus.value) return
  
  updatingStatus.value = true
  const newStatus = !store.value.is_active
  try {
    const { error } = await client
      .from('stores')
      .update({ is_active: newStatus } as never)
      .eq('id', store.value.id)
      
    if (!error) {
      store.value.is_active = newStatus
    }
  } catch (err) {
    console.error('Failed to toggle store status:', err)
  } finally {
    updatingStatus.value = false
  }
}

// Fast Order Status Update from Dashboard
const updateOrderStatus = async (orderId: string, nextStatus: string) => {
  if (updatingOrderId.value) return
  
  updatingOrderId.value = orderId
  try {
    const { error } = await client
      .from('orders')
      .update({ status: nextStatus } as never)
      .eq('id', orderId)
      
    if (!error) {
      const idx = todayStats.value.latestOrders.findIndex(o => o.id === orderId)
      if (idx !== -1) {
        todayStats.value.latestOrders[idx].status = nextStatus
      }
      fetchDashboardData()
    }
  } catch (err) {
    console.error('Failed to update order status:', err)
  } finally {
    updatingOrderId.value = null
  }
}

// Copy Menu Link to Clipboard
const copyMenuLink = async () => {
  if (!store.value?.slug) return
  const url = `${window.location.origin}/m/${store.value.slug}`
  try {
    await navigator.clipboard.writeText(url)
    copiedLink.value = true
    setTimeout(() => {
      copiedLink.value = false
    }, 2500)
  } catch (e) {
    console.error('Copy link failed:', e)
  }
}

// Subscription Plan calculations
const daysRemaining = computed(() => {
  if (!store.value?.trial_ends_at) return 0
  const end = new Date(store.value.trial_ends_at)
  const now = new Date()
  const diffTime = end.getTime() - now.getTime()
  return Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)))
})

const isTrial = computed(() => store.value?.plan_status === 'trial')

let currentSubscribedStoreId: string | null = null

const setupRealtime = () => {
  const storeId = store.value?.id
  if (!storeId) return

  // If already subscribed to this store, skip duplicate subscription
  if (currentSubscribedStoreId === storeId && realtimeChannel) return

  try {
    // Clean up any existing channel before creating a new one
    if (realtimeChannel) {
      client.removeChannel(realtimeChannel)
      realtimeChannel = null
      currentSubscribedStoreId = null
    }

    // Create fresh unique channel
    const channelName = `dashboard-orders-${storeId}-${Date.now()}`
    const ch = client.channel(channelName)
    ch.on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'orders', filter: `store_id=eq.${storeId}` },
      () => {
        fetchDashboardData()
      }
    )
    ch.subscribe((status: string) => {
      if (status === 'SUBSCRIBED') {
        currentSubscribedStoreId = storeId
      }
    })
    realtimeChannel = ch
  } catch (e) {
    console.warn('Realtime subscription warning:', e)
  }
}

onMounted(async () => {
  try {
    if (!store.value) {
      await fetchStore()
    }
    await fetchDashboardData()
    setupRealtime()
  } catch (err) {
    console.error('Mounted dashboard error:', err)
  }
})

onUnmounted(() => {
  if (realtimeChannel) {
    client.removeChannel(realtimeChannel)
    realtimeChannel = null
    currentSubscribedStoreId = null
  }
})

watch(() => store.value?.id, async (newId, oldId) => {
  if (newId && newId !== oldId) {
    await fetchDashboardData()
    setupRealtime()
  }
})
</script>

<template>
  <div class="w-full max-w-full pb-24 overflow-x-hidden space-y-6">
    
    <!-- Pending Loading Spinner -->
    <div v-if="pending" class="flex items-center justify-center py-20">
      <RefreshCw class="w-8 h-8 text-primary animate-spin" />
    </div>

    <!-- No Store Created State -->
    <div v-else-if="!store" class="bg-card border border-border/80 rounded-3xl p-8 sm:p-12 text-center max-w-2xl mx-auto shadow-sm">
      <div class="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-3xl mb-4">
        🏪
      </div>
      <h2 class="text-xl sm:text-2xl font-bold text-foreground mb-2">{{ $t('dash_welcome') }}</h2>
      <p class="text-sm text-muted-foreground mb-6 max-w-md mx-auto">{{ $t('dash_no_store_msg') }}</p>
      <NuxtLink 
        to="/merchant/store/create" 
        class="inline-flex items-center gap-2 px-6 py-3 rounded-2xl shadow-xs text-primary-foreground bg-primary hover:bg-primary/90 font-bold text-sm transition-all"
      >
        <span>{{ $t('dash_create_store') }}</span>
        <ArrowRight class="w-4 h-4" />
      </NuxtLink>
    </div>

    <!-- MAIN EXECUTIVE COCKPIT -->
    <div v-else class="space-y-6">
      
      <!-- 1. STORE OPERATIONS HEADER: Live Store Mode, Status Toggle & Quick Link -->
      <div class="bg-card border border-border/80 rounded-3xl p-5 sm:p-6 shadow-xs relative overflow-hidden">
        <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          
          <!-- Left: Store Identity & Status -->
          <div class="flex items-center gap-4">
            <!-- Store Logo / Avatar -->
            <div class="relative shrink-0">
              <div v-if="store.logo_url" class="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl overflow-hidden border border-border shadow-xs">
                <img :src="store.logo_url" :alt="store.name" class="w-full h-full object-cover" />
              </div>
              <div v-else class="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center text-2xl font-black border border-primary/20 shadow-xs">
                {{ store.name?.charAt(0) || '🏪' }}
              </div>
              <!-- Online/Offline Indicator Badge -->
              <span 
                class="absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-card shadow-xs"
                :class="store.is_active ? 'bg-emerald-500' : 'bg-rose-500'"
              ></span>
            </div>

            <!-- Store Details -->
            <div>
              <div class="flex flex-wrap items-center gap-2">
                <h1 class="text-lg sm:text-xl font-bold text-foreground">
                  {{ store.name }}
                </h1>
                
                <!-- Status Pill Badge -->
                <span 
                  class="px-2.5 py-0.5 rounded-full text-[11px] font-bold flex items-center gap-1.5 shadow-2xs"
                  :class="store.is_active ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'"
                >
                  <span class="w-2 h-2 rounded-full" :class="store.is_active ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'"></span>
                  <span>{{ store.is_active ? $t('dash_status_open') : $t('dash_status_closed') }}</span>
                </span>
              </div>

              <!-- Menu URL & Copy Link Action -->
              <div class="flex items-center gap-2 mt-1.5 text-xs text-muted-foreground">
                <span class="truncate max-w-[200px] sm:max-w-[320px] font-medium text-foreground/80">
                  /m/{{ store.slug }}
                </span>
                
                <button 
                  type="button"
                  @click="copyMenuLink"
                  class="px-2 py-0.5 rounded-lg bg-muted/60 hover:bg-muted text-[11px] text-foreground font-medium transition-all inline-flex items-center gap-1 cursor-pointer"
                  :title="$t('dash_quick_copy_link')"
                >
                  <Check v-if="copiedLink" class="w-3 h-3 text-emerald-500" />
                  <Copy v-else class="w-3 h-3 text-muted-foreground" />
                  <span>{{ copiedLink ? $t('dash_copied_success') : $t('dash_quick_copy_link') }}</span>
                </button>

                <a 
                  :href="`/m/${store.slug}`" 
                  target="_blank" 
                  class="p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-primary transition-colors"
                  title="Preview Menu"
                >
                  <ExternalLink class="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          </div>

          <!-- Right: 1-Click Store Open/Close Toggle & Plan Status -->
          <div class="flex flex-wrap items-center gap-3 self-start lg:self-auto">
            
            <!-- Plan / Trial Status Pill -->
            <div 
              class="px-3.5 py-2 rounded-2xl text-xs font-semibold border flex items-center gap-2 shadow-2xs"
              :class="isTrial ? (daysRemaining <= 7 ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20' : 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20') : 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20'"
            >
              <span>{{ isTrial ? '⏳ ทดลองใช้' : '✨ บัญชี Active' }}</span>
              <span class="font-bold">({{ daysRemaining }} วัน)</span>
            </div>

            <!-- 1-Click Open / Closed Toggle Button -->
            <button 
              type="button"
              @click="toggleStoreStatus"
              :disabled="updatingStatus"
              class="px-4 py-2.5 rounded-2xl text-xs font-bold transition-all inline-flex items-center gap-2 shadow-xs cursor-pointer disabled:opacity-50"
              :class="store.is_active ? 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/20' : 'bg-emerald-500 hover:bg-emerald-600 text-white'"
            >
              <Power class="w-4 h-4" :class="{ 'animate-spin': updatingStatus }" />
              <span>{{ store.is_active ? 'กดเพื่อพักรับออเดอร์' : 'กดเพื่อเปิดรับออเดอร์' }}</span>
            </button>

          </div>

        </div>
      </div>

      <!-- 2. TODAY'S SHIFT PULSE METRICS (4 VITAL REALTIME CARDS) -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        
        <!-- Today's Net Revenue -->
        <div class="p-4 sm:p-5 bg-card border border-border/80 rounded-3xl shadow-xs flex flex-col justify-between transition-all hover:shadow-md group overflow-hidden">
          <div class="flex items-center justify-between">
            <span class="text-xs font-medium text-muted-foreground">{{ $t('dash_kpi_today_sales') }}</span>
            <span class="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-sm font-bold">
              <Wallet class="w-4 h-4" />
            </span>
          </div>
          <div class="mt-3">
            <span class="text-2xl sm:text-3xl font-black text-foreground tabular-nums truncate block">
              ฿{{ todayStats.sales.toLocaleString('th-TH') }}
            </span>
            <span class="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium block mt-1">
              {{ $t('dash_kpi_completed_desc', { completed: todayStats.completedOrders, total: todayStats.totalOrders }) }}
            </span>
          </div>
        </div>

        <!-- Today's Orders Count -->
        <div class="p-4 sm:p-5 bg-card border border-border/80 rounded-3xl shadow-xs flex flex-col justify-between transition-all hover:shadow-md group overflow-hidden">
          <div class="flex items-center justify-between">
            <span class="text-xs font-medium text-muted-foreground">{{ $t('dash_kpi_today_orders') }}</span>
            <span class="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center text-sm font-bold">
              <ShoppingBag class="w-4 h-4" />
            </span>
          </div>
          <div class="mt-3">
            <span class="text-2xl sm:text-3xl font-black text-foreground tabular-nums truncate block">
              {{ todayStats.totalOrders }}
            </span>
            <span class="text-[11px] text-muted-foreground font-normal block mt-1">
              {{ todayStats.completedOrders }} บิลสำเร็จ • {{ todayStats.pendingOrders + todayStats.cookingOrders }} รอดำเนินการ
            </span>
          </div>
        </div>

        <!-- Kitchen Queue (Cooking / Pending) -->
        <div class="p-4 sm:p-5 bg-card border border-border/80 rounded-3xl shadow-xs flex flex-col justify-between transition-all hover:shadow-md group overflow-hidden">
          <div class="flex items-center justify-between">
            <span class="text-xs font-medium text-muted-foreground">{{ $t('dash_kpi_kitchen_queue') }}</span>
            <span 
              class="w-8 h-8 rounded-xl flex items-center justify-center text-sm font-bold"
              :class="todayStats.pendingOrders + todayStats.cookingOrders > 0 ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 animate-pulse' : 'bg-muted text-muted-foreground'"
            >
              <ChefHat class="w-4 h-4" />
            </span>
          </div>
          <div class="mt-3">
            <span 
              class="text-2xl sm:text-3xl font-black tabular-nums truncate block"
              :class="todayStats.pendingOrders + todayStats.cookingOrders > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-foreground'"
            >
              {{ todayStats.pendingOrders + todayStats.cookingOrders }} รายการ
            </span>
            <span class="text-[11px] text-muted-foreground font-normal block mt-1">
              {{ $t('dash_kpi_kitchen_pending_desc', { pending: todayStats.pendingOrders, cooking: todayStats.cookingOrders }) }}
            </span>
          </div>
        </div>

        <!-- Active Table QR Codes in System (Real Data from qr_codes table) -->
        <div class="p-4 sm:p-5 bg-card border border-border/80 rounded-3xl shadow-xs flex flex-col justify-between transition-all hover:shadow-md group overflow-hidden">
          <div class="flex items-center justify-between">
            <span class="text-xs font-medium text-muted-foreground">{{ $t('dash_kpi_table_qrs') }}</span>
            <span class="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center text-sm font-bold">
              📱
            </span>
          </div>
          <div class="mt-3">
            <span class="text-2xl sm:text-3xl font-black text-foreground tabular-nums truncate block">
              {{ todayStats.tableQrCount }} จุด
            </span>
            <span class="text-[11px] text-muted-foreground font-normal block mt-1">
              {{ $t('dash_kpi_table_qrs_desc', { count: todayStats.tableQrCount }) }}
            </span>
          </div>
        </div>

      </div>

      <!-- 3. QUICK ACTION COMMAND HUB (4 MAIN OPERATIONAL STATIONS) -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        
        <!-- Action 1: Live Kitchen & Orders -->
        <NuxtLink 
          to="/merchant/orders" 
          class="p-5 bg-card hover:bg-muted/30 border border-border/80 rounded-3xl shadow-xs flex flex-col justify-between transition-all hover:shadow-md group cursor-pointer"
        >
          <div class="flex items-start justify-between">
            <div class="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center text-xl font-bold group-hover:scale-105 transition-transform">
              📋
            </div>
            <ArrowUpRight class="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </div>
          <div class="mt-4">
            <h3 class="text-sm font-bold text-foreground group-hover:text-primary transition-colors">
              {{ $t('dash_action_orders_title') }}
            </h3>
            <p class="text-xs text-muted-foreground mt-0.5 font-normal">
              {{ $t('dash_action_orders_desc') }}
            </p>
          </div>
        </NuxtLink>

        <!-- Action 2: Table QR Code Hub -->
        <NuxtLink 
          to="/merchant/qr" 
          class="p-5 bg-card hover:bg-muted/30 border border-border/80 rounded-3xl shadow-xs flex flex-col justify-between transition-all hover:shadow-md group cursor-pointer"
        >
          <div class="flex items-start justify-between">
            <div class="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-xl font-bold group-hover:scale-105 transition-transform">
              📱
            </div>
            <ArrowUpRight class="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </div>
          <div class="mt-4">
            <h3 class="text-sm font-bold text-foreground group-hover:text-primary transition-colors">
              {{ $t('dash_action_qr_title') }}
            </h3>
            <p class="text-xs text-muted-foreground mt-0.5 font-normal">
              {{ $t('dash_action_qr_desc') }}
            </p>
          </div>
        </NuxtLink>

        <!-- Action 3: Menu & Catalog Management -->
        <NuxtLink 
          to="/merchant/menu" 
          class="p-5 bg-card hover:bg-muted/30 border border-border/80 rounded-3xl shadow-xs flex flex-col justify-between transition-all hover:shadow-md group cursor-pointer"
        >
          <div class="flex items-start justify-between">
            <div class="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center text-xl font-bold group-hover:scale-105 transition-transform">
              🍲
            </div>
            <ArrowUpRight class="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </div>
          <div class="mt-4">
            <h3 class="text-sm font-bold text-foreground group-hover:text-primary transition-colors">
              {{ $t('dash_action_menu_title') }}
            </h3>
            <p class="text-xs text-muted-foreground mt-0.5 font-normal">
              {{ $t('dash_action_menu_desc') }}
            </p>
          </div>
        </NuxtLink>

        <!-- Action 4: Full BI & Sales Analytics -->
        <NuxtLink 
          to="/merchant/analytics" 
          class="p-5 bg-card hover:bg-muted/30 border border-border/80 rounded-3xl shadow-xs flex flex-col justify-between transition-all hover:shadow-md group cursor-pointer"
        >
          <div class="flex items-start justify-between">
            <div class="w-12 h-12 rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center text-xl font-bold group-hover:scale-105 transition-transform">
              📊
            </div>
            <ArrowUpRight class="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </div>
          <div class="mt-4">
            <h3 class="text-sm font-bold text-foreground group-hover:text-primary transition-colors">
              {{ $t('dash_action_analytics_title') }}
            </h3>
            <p class="text-xs text-muted-foreground mt-0.5 font-normal">
              {{ $t('dash_action_analytics_desc') }}
            </p>
          </div>
        </NuxtLink>

      </div>

      <!-- 4. TWO-COLUMN SPLIT: Live Kitchen Orders Feed + Store Readiness -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        <!-- Left 2 Cols: Live Kitchen & Today's Orders Feed -->
        <div class="lg:col-span-2 bg-card border border-border/80 rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
          
          <div class="flex items-center justify-between">
            <div>
              <h2 class="text-base font-bold text-foreground flex items-center gap-2">
                <Flame class="w-4 h-4 text-rose-500" />
                <span>{{ $t('dash_feed_title') }}</span>
              </h2>
              <p class="text-xs text-muted-foreground mt-0.5">
                {{ $t('dash_feed_desc') }}
              </p>
            </div>

            <NuxtLink 
              to="/merchant/orders" 
              class="text-xs text-primary hover:underline font-bold inline-flex items-center gap-1"
            >
              <span>ดูทั้งหมด ({{ todayStats.totalOrders }})</span>
              <ArrowRight class="w-3.5 h-3.5" />
            </NuxtLink>
          </div>

          <!-- Realtime Orders List -->
          <div v-if="todayStats.latestOrders && todayStats.latestOrders.length > 0" class="space-y-3 pt-1">
            <div 
              v-for="order in todayStats.latestOrders" 
              :key="order.id"
              class="p-4 bg-muted/20 hover:bg-muted/40 border border-border/60 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all"
            >
              <!-- Order Info -->
              <div class="flex items-start gap-3">
                <div 
                  class="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs shrink-0"
                  :class="order.status === 'pending' ? 'bg-amber-500/10 text-amber-600 border border-amber-500/20' : (order.status === 'confirmed' || order.status === 'cooking' ? 'bg-blue-500/10 text-blue-600 border border-blue-500/20' : 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20')"
                >
                  {{ order.table_no ? `T${order.table_no}` : '🥡' }}
                </div>

                <div>
                  <div class="flex items-center gap-2">
                    <span class="font-bold text-xs text-foreground">
                      โต๊ะ {{ order.table_no || 'หน้าร้าน' }}
                    </span>
                    <span class="text-[10px] text-muted-foreground font-medium">
                      • {{ new Date(order.created_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) }}
                    </span>
                    <span 
                      class="px-2 py-0.2 rounded-md text-[10px] font-semibold"
                      :class="order.status === 'pending' ? 'bg-amber-500/10 text-amber-600' : (order.status === 'confirmed' || order.status === 'cooking' ? 'bg-blue-500/10 text-blue-600' : 'bg-emerald-500/10 text-emerald-600')"
                    >
                      {{ order.status === 'pending' ? 'รอรับ' : (order.status === 'confirmed' || order.status === 'cooking' ? 'กำลังทำ' : 'สำเร็จ') }}
                    </span>
                  </div>

                  <p class="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                    <span v-for="(it, idx) in (order.items || []).slice(0, 3)" :key="idx">
                      {{ it.name_th || it.name }} (x{{ it.quantity }})<span v-if="Number(idx) < Math.min(2, (order.items || []).length - 1)">, </span>
                    </span>
                    <span v-if="(order.items || []).length > 3"> และอีก {{ order.items.length - 3 }} รายการ</span>
                  </p>
                </div>
              </div>

              <!-- Price & 1-Click Action Buttons -->
              <div class="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-border/40">
                <span class="font-bold text-xs sm:text-sm text-foreground tabular-nums">
                  ฿{{ computeOrderTotal(order).toLocaleString('th-TH') }}
                </span>

                <div class="flex items-center gap-1.5">
                  <!-- Action: Accept Order -->
                  <button 
                    v-if="order.status === 'pending'"
                    @click="updateOrderStatus(order.id, 'confirmed')"
                    :disabled="updatingOrderId === order.id"
                    class="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer disabled:opacity-50"
                  >
                    <span>{{ $t('dash_btn_accept') }}</span>
                  </button>

                  <!-- Action: Mark Cooking -->
                  <button 
                    v-else-if="order.status === 'confirmed'"
                    @click="updateOrderStatus(order.id, 'cooking')"
                    :disabled="updatingOrderId === order.id"
                    class="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer disabled:opacity-50"
                  >
                    <span>{{ $t('dash_btn_cook') }}</span>
                  </button>

                  <!-- Action: Mark Complete -->
                  <button 
                    v-else-if="order.status === 'cooking' || order.status === 'in_progress'"
                    @click="updateOrderStatus(order.id, 'completed')"
                    :disabled="updatingOrderId === order.id"
                    class="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer disabled:opacity-50"
                  >
                    <span>{{ $t('dash_btn_done') }}</span>
                  </button>
                </div>
              </div>

            </div>
          </div>

          <!-- Empty Orders State -->
          <div v-else class="py-12 text-center text-xs text-muted-foreground bg-muted/10 border border-dashed border-border/80 rounded-2xl space-y-2">
            <div class="text-3xl">☕</div>
            <p class="font-medium text-foreground">{{ $t('dash_feed_empty') }}</p>
          </div>

        </div>

        <!-- Right 1 Col: Menu Readiness & Store Health -->
        <div class="space-y-4">
          
          <!-- Menu Readiness Widget -->
          <div class="bg-card border border-border/80 rounded-3xl p-5 shadow-xs space-y-3.5">
            <h3 class="text-sm font-bold text-foreground flex items-center gap-2">
              <Utensils class="w-4 h-4 text-primary" />
              <span>{{ $t('dash_menu_readiness_title') }}</span>
            </h3>

            <div class="grid grid-cols-2 gap-2.5">
              <div class="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-center">
                <span class="text-[10px] text-emerald-700 dark:text-emerald-300 font-medium block">
                  {{ $t('dash_menu_active_count') }}
                </span>
                <span class="text-xl font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                  {{ todayStats.availableDishes }}
                </span>
              </div>

              <div class="p-3 bg-amber-500/10 border border-amber-500/20 rounded-2xl text-center">
                <span class="text-[10px] text-amber-700 dark:text-amber-300 font-medium block">
                  {{ $t('dash_menu_soldout_alert') }}
                </span>
                <span class="text-xl font-bold text-amber-600 dark:text-amber-400 tabular-nums">
                  {{ todayStats.soldOutDishes }}
                </span>
              </div>
            </div>

            <NuxtLink 
              to="/merchant/menu" 
              class="w-full py-2 bg-muted/60 hover:bg-muted text-foreground text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-colors"
            >
              <span>ปรับสถานะเมนูอาหาร</span>
              <ArrowRight class="w-3.5 h-3.5" />
            </NuxtLink>
          </div>

          <!-- LINE Notify & Alerts -->
          <div class="bg-card border border-border/80 rounded-3xl p-5 shadow-xs space-y-3">
            <div class="flex items-center justify-between">
              <span class="text-xs font-bold text-foreground flex items-center gap-1.5">
                <BellRing class="w-3.5 h-3.5 text-emerald-500" />
                <span>แจ้งเตือนออเดอร์ LINE</span>
              </span>
              <span 
                class="px-2 py-0.5 rounded-full text-[10px] font-bold"
                :class="store.line_user_id ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-600'"
              >
                {{ store.line_user_id ? 'เชื่อมต่อแล้ว' : 'ยังไม่เชื่อมต่อ' }}
              </span>
            </div>

            <p class="text-xs text-muted-foreground">
              {{ store.line_user_id ? 'ระบบจะส่งแจ้งเตือนออเดอร์เข้า LINE ส่วนตัวของคุณทันทีที่มีการสั่ง' : 'เชื่อมต่อ LINE เพื่อรับการแจ้งเตือนเสียงเตือนเมื่อมีออเดอร์เข้า' }}
            </p>

            <NuxtLink 
              to="/merchant/store/settings" 
              class="w-full py-2 bg-muted/60 hover:bg-muted text-foreground text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-colors"
            >
              <span>{{ store.line_user_id ? 'จัดการการเชื่อมต่อ' : 'ตั้งค่ารับแจ้งเตือน LINE' }}</span>
              <ArrowRight class="w-3.5 h-3.5" />
            </NuxtLink>
          </div>

          <!-- Merchant Quick Guide Banner -->
          <NuxtLink 
            to="/merchant/guide"
            class="bg-gradient-to-br from-primary/10 via-card to-purple-500/5 border border-border/80 rounded-3xl p-5 shadow-xs flex items-center justify-between group cursor-pointer hover:shadow-md transition-all"
          >
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center text-lg font-bold group-hover:scale-105 transition-transform">
                📚
              </div>
              <div>
                <h4 class="text-xs font-bold text-foreground group-hover:text-primary transition-colors">คู่มือใช้งานระบบ</h4>
                <p class="text-[11px] text-muted-foreground mt-0.5">วิธีเพิ่มเมนู 3 ภาษา & พิมพ์ QR</p>
              </div>
            </div>
            <ArrowRight class="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-transform" />
          </NuxtLink>

        </div>

      </div>

    </div>

  </div>
</template>
