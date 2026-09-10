<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
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
  ArrowUpRight,
  MessageSquare,
  FileText
} from 'lucide-vue-next'

definePageMeta({
  layout: 'merchant',
  middleware: ['auth']
})

const { t, locale } = useI18n()
const client = useSupabaseClient()
const { store, loading: pending, fetchStore } = useCurrentStore()
const swal = useAlert()

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
      : (Array.isArray(it.addonNames) ? 0 : 0)
    return sum + ((unitPrice + optionsTotal) * qty)
  }, 0)
}

const getItemName = (item: any) => {
  if (!item) return ''
  const l = locale.value
  if (l === 'en' && item.name_en) return item.name_en
  if (l === 'zh' && item.name_zh) return item.name_zh
  return item.name_th || item.name || item.name_en || ''
}

const getItemSubName = (item: any) => {
  if (!item) return ''
  const l = locale.value
  if (l === 'th') return item.name_en || ''
  return item.name_th || ''
}

// Fetch Today's Live Pulse & Kitchen Orders
const fetchDashboardData = async () => {
  if (!store.value?.id) return
  
  loading.value = true
  try {
    const todayStartStr = getTodayRangeStr()

    // 1. Fetch today's orders, menu items, and active table QR codes from real database tables
    const [ordersRes, menuRes, qrRes] = await Promise.all([
      (client as any)
        .from('orders')
        .select('id, status, table_no, items, created_at, cancel_reason, cancelled_at')
        .eq('store_id', store.value.id)
        .gte('created_at', todayStartStr)
        .order('created_at', { ascending: false }),
      (client as any)
        .from('menu_items')
        .select('id, is_available')
        .eq('store_id', store.value.id),
      (client as any)
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
      if (o.status === 'completed') {
        completed++
        sales += computeOrderTotal(o)
      } else if (!o.status || o.status === 'pending') {
        pending++
      } else if (o.status === 'confirmed' || o.status === 'paid' || o.status === 'cooking' || o.status === 'in_progress') {
        cooking++
      }
    }

    const availableCount = menuItems.filter(m => m.is_available !== false).length
    const soldOutCount = menuItems.filter(m => m.is_available === false).length

    // Filter only pending / new orders waiting for acceptance (max 2 items)
    const pendingOrdersList = orders.filter(o => !o.status || o.status === 'pending')

    todayStats.value = {
      sales,
      totalOrders: orders.length,
      completedOrders: completed,
      pendingOrders: pending,
      cookingOrders: cooking,
      tableQrCount: qrCodes.length,
      latestOrders: pendingOrdersList.slice(0, 2),
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
    const { error } = await (client as any)
      .from('stores')
      .update({ is_active: newStatus })
      .eq('id', store.value.id)
      
    if (!error) {
      store.value.is_active = newStatus
      if (newStatus) {
        useToast().success('เปิดรับออเดอร์เรียบร้อยแล้ว')
      } else {
        useToast().info('พักรับออเดอร์ชั่วคราวแล้ว')
      }
    }
  } catch (err) {
    console.error('Failed to toggle store status:', err)
  } finally {
    updatingStatus.value = false
  }
}

// 1-Click Accept Order Action (Pending -> Confirmed)
const confirmOrder = async (order: any) => {
  updatingOrderId.value = order.id
  try {
    const { error } = await (client as any)
      .from('orders')
      .update({ status: 'confirmed' })
      .eq('id', order.id)

    if (error) {
      useToast().error('ไม่สามารถรับออเดอร์ได้: ' + error.message)
    } else {
      order.status = 'confirmed'
      useToast().success(`รับออเดอร์โต๊ะ ${order.table_no || 'หน้าร้าน'} เรียบร้อยแล้ว`)
      await fetchDashboardData()
    }
  } catch (err: any) {
    console.error('Failed to confirm order:', err)
  } finally {
    updatingOrderId.value = null
  }
}

// 1-Click Complete Order Action (Confirmed -> Completed)
const completeOrder = async (order: any) => {
  updatingOrderId.value = order.id
  try {
    const { error } = await (client as any)
      .from('orders')
      .update({ status: 'completed' })
      .eq('id', order.id)

    if (error) {
      useToast().error('ไม่สามารถจบออเดอร์ได้: ' + error.message)
    } else {
      order.status = 'completed'
      useToast().success(`ออเดอร์โต๊ะ ${order.table_no || 'หน้าร้าน'} ทำเสร็จแล้ว`)
      await fetchDashboardData()
    }
  } catch (err: any) {
    console.error('Failed to complete order:', err)
  } finally {
    updatingOrderId.value = null
  }
}

// Cancel Order with Confirmation Prompt
const cancelOrderWithPrompt = async (order: any) => {
  const result = await swal.fire({
    title: 'ยืนยันการยกเลิกออเดอร์',
    text: `ต้องการยกเลิกออเดอร์ของโต๊ะ ${order.table_no || 'หน้าร้าน'} ใช่หรือไม่?`,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#e11d48',
    cancelButtonColor: '#64748b',
    confirmButtonText: 'ใช่, ยกเลิกออเดอร์นี้',
    cancelButtonText: 'ไม่ยกเลิก'
  })

  if (!result.isConfirmed) return

  const reason = 'ลูกค้าขอยกเลิก / เปลี่ยนใจ'
  updatingOrderId.value = order.id
  try {
    let { error } = await (client as any)
      .from('orders')
      .update({
        status: 'cancelled',
        cancel_reason: reason,
        cancelled_at: new Date().toISOString()
      })
      .eq('id', order.id)

    if (error && error.message?.includes('cancel_reason')) {
      const retry = await (client as any)
        .from('orders')
        .update({ status: 'cancelled' })
        .eq('id', order.id)
      error = retry.error
    }

    if (error) {
      useToast().error('ไม่สามารถยกเลิกออเดอร์ได้: ' + error.message)
    } else {
      order.status = 'cancelled'
      order.cancel_reason = reason
      useToast().info(`ยกเลิกออเดอร์เรียบร้อยแล้ว (${reason})`)
      await fetchDashboardData()
    }
  } catch (err: any) {
    console.error('Failed to cancel order:', err)
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

  if (currentSubscribedStoreId === storeId && realtimeChannel) return

  try {
    if (realtimeChannel) {
      client.removeChannel(realtimeChannel)
      realtimeChannel = null
      currentSubscribedStoreId = null
    }

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
      <p class="text-xs text-muted-foreground mb-6 max-w-md mx-auto font-normal">{{ $t('dash_no_store_msg') }}</p>
      <NuxtLink 
        to="/merchant/store/create" 
        class="inline-flex items-center gap-2 px-6 py-3 rounded-2xl shadow-xs text-primary-foreground bg-primary hover:bg-primary/90 font-semibold text-xs transition-all"
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
              <div v-else class="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center text-2xl font-bold border border-primary/20 shadow-xs">
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
                  class="px-2.5 py-0.5 rounded-full text-[11px] font-semibold flex items-center gap-1.5 shadow-2xs"
                  :class="store.is_active ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'"
                >
                  <span class="w-2 h-2 rounded-full" :class="store.is_active ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'"></span>
                  <span>{{ store.is_active ? $t('dash_status_open') : $t('dash_status_closed') }}</span>
                </span>
              </div>

              <!-- Menu URL & Copy Link Action -->
              <div class="flex items-center gap-2 mt-1.5 text-xs text-muted-foreground">
                <span class="truncate max-w-[200px] sm:max-w-[320px] font-normal text-foreground/80">
                  /m/{{ store.slug }}
                </span>
                
                <button 
                  type="button"
                  @click="copyMenuLink"
                  class="px-2 py-0.5 rounded-lg bg-muted/60 hover:bg-muted text-[11px] text-foreground font-normal transition-all inline-flex items-center gap-1 cursor-pointer"
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
              class="px-4 py-2.5 rounded-2xl text-xs font-semibold transition-all inline-flex items-center gap-2 shadow-xs cursor-pointer disabled:opacity-50"
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
            <span class="text-xs font-normal text-muted-foreground">{{ $t('dash_kpi_today_sales') }}</span>
            <span class="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-sm font-bold">
              <Wallet class="w-4 h-4" />
            </span>
          </div>
          <div class="mt-3">
            <span class="text-xl sm:text-2xl font-bold text-foreground tabular-nums truncate block">
              ฿{{ todayStats.sales.toLocaleString('th-TH') }}
            </span>
            <span class="text-[11px] text-emerald-600 dark:text-emerald-400 font-normal block mt-1">
              {{ $t('dash_kpi_completed_desc', { completed: todayStats.completedOrders, total: todayStats.totalOrders }) }}
            </span>
          </div>
        </div>

        <!-- Today's Orders Count -->
        <div class="p-4 sm:p-5 bg-card border border-border/80 rounded-3xl shadow-xs flex flex-col justify-between transition-all hover:shadow-md group overflow-hidden">
          <div class="flex items-center justify-between">
            <span class="text-xs font-normal text-muted-foreground">{{ $t('dash_kpi_today_orders') }}</span>
            <span class="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center text-sm font-bold">
              <ShoppingBag class="w-4 h-4" />
            </span>
          </div>
          <div class="mt-3">
            <span class="text-xl sm:text-2xl font-bold text-foreground tabular-nums truncate block">
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
            <span class="text-xs font-normal text-muted-foreground">{{ $t('dash_kpi_kitchen_queue') }}</span>
            <span 
              class="w-8 h-8 rounded-xl flex items-center justify-center text-sm font-bold"
              :class="todayStats.pendingOrders + todayStats.cookingOrders > 0 ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 animate-pulse' : 'bg-muted text-muted-foreground'"
            >
              <ChefHat class="w-4 h-4" />
            </span>
          </div>
          <div class="mt-3">
            <span 
              class="text-xl sm:text-2xl font-bold tabular-nums truncate block"
              :class="todayStats.pendingOrders + todayStats.cookingOrders > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-foreground'"
            >
              {{ todayStats.pendingOrders + todayStats.cookingOrders }} รายการ
            </span>
            <span class="text-[11px] text-muted-foreground font-normal block mt-1">
              {{ $t('dash_kpi_kitchen_pending_desc', { pending: todayStats.pendingOrders, cooking: todayStats.cookingOrders }) }}
            </span>
          </div>
        </div>

        <!-- Active Table QR Codes in System -->
        <div class="p-4 sm:p-5 bg-card border border-border/80 rounded-3xl shadow-xs flex flex-col justify-between transition-all hover:shadow-md group overflow-hidden">
          <div class="flex items-center justify-between">
            <span class="text-xs font-normal text-muted-foreground">{{ $t('dash_kpi_table_qrs') }}</span>
            <span class="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center text-sm font-bold">
              📱
            </span>
          </div>
          <div class="mt-3">
            <span class="text-xl sm:text-2xl font-bold text-foreground tabular-nums truncate block">
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
            <div class="w-11 h-11 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center text-xl font-bold group-hover:scale-105 transition-transform">
              📋
            </div>
            <ArrowUpRight class="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </div>
          <div class="mt-4">
            <h3 class="text-xs sm:text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
              {{ $t('dash_action_orders_title') }}
            </h3>
            <p class="text-[11px] text-muted-foreground mt-0.5 font-normal">
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
            <div class="w-11 h-11 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-xl font-bold group-hover:scale-105 transition-transform">
              📱
            </div>
            <ArrowUpRight class="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </div>
          <div class="mt-4">
            <h3 class="text-xs sm:text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
              {{ $t('dash_action_qr_title') }}
            </h3>
            <p class="text-[11px] text-muted-foreground mt-0.5 font-normal">
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
            <div class="w-11 h-11 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center text-xl font-bold group-hover:scale-105 transition-transform">
              🍲
            </div>
            <ArrowUpRight class="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </div>
          <div class="mt-4">
            <h3 class="text-xs sm:text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
              {{ $t('dash_action_menu_title') }}
            </h3>
            <p class="text-[11px] text-muted-foreground mt-0.5 font-normal">
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
            <div class="w-11 h-11 rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center text-xl font-bold group-hover:scale-105 transition-transform">
              📊
            </div>
            <ArrowUpRight class="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </div>
          <div class="mt-4">
            <h3 class="text-xs sm:text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
              {{ $t('dash_action_analytics_title') }}
            </h3>
            <p class="text-[11px] text-muted-foreground mt-0.5 font-normal">
              {{ $t('dash_action_analytics_desc') }}
            </p>
          </div>
        </NuxtLink>

      </div>

      <!-- 4. TWO-COLUMN SPLIT: Live Kitchen Orders Feed + Store Readiness -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        <!-- Left 2 Cols: Live Kitchen & Today's Orders Feed (กระดานออเดอร์สดวันนี้) -->
        <div class="lg:col-span-2 bg-card border border-border/80 rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
          
          <div class="flex items-center justify-between gap-3">
            <div class="min-w-0">
              <h2 class="text-sm sm:text-base font-bold text-foreground flex items-center gap-2">
                <Flame class="w-4 h-4 text-rose-500 shrink-0" />
                <span class="truncate">ออเดอร์ใหม่รอรับ ({{ todayStats.pendingOrders }})</span>
              </h2>
              <p class="text-xs text-muted-foreground mt-0.5 font-normal">
                แสดงออเดอร์สดที่รอยืนยันเข้าระบบ (แสดง 2 รายการล่าสุด)
              </p>
            </div>

            <NuxtLink 
              to="/merchant/orders" 
              class="text-xs text-primary hover:underline font-semibold inline-flex items-center gap-1 shrink-0"
            >
              <span>จัดการออเดอร์ทั้งหมด</span>
              <ArrowRight class="w-3.5 h-3.5" />
            </NuxtLink>
          </div>

          <!-- Realtime Orders List -->
          <div v-if="todayStats.latestOrders && todayStats.latestOrders.length > 0" class="space-y-3.5 pt-1">
            <div 
              v-for="order in todayStats.latestOrders" 
              :key="order.id"
              class="p-4 bg-background border rounded-2xl shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between gap-3"
              :class="{
                'border-amber-400/80 dark:border-amber-500/50 ring-1 ring-amber-400/20': !order.status || order.status === 'pending',
                'border-blue-400/80 dark:border-blue-500/50 ring-1 ring-blue-400/20': order.status === 'confirmed' || order.status === 'paid' || order.status === 'cooking',
                'border-emerald-500/40': order.status === 'completed',
                'border-rose-300 dark:border-rose-900/40 opacity-70': order.status === 'cancelled'
              }"
            >
              <!-- Order Header Strip: Table & Status -->
              <div class="flex items-center justify-between gap-2 border-b border-border/40 pb-2.5">
                <div class="flex items-center gap-2 min-w-0">
                  <span class="font-semibold text-xs text-foreground truncate">
                    {{ order.table_no?.startsWith('กลับบ้าน') || order.table_no?.startsWith('หน้าร้าน') || order.table_no?.includes('Takeaway') ? `🥡 ${order.table_no}` : `🪑 โต๊ะ ${order.table_no || 'หน้าร้าน'}` }}
                  </span>
                  <span class="text-[11px] text-muted-foreground font-normal">
                    • {{ new Date(order.created_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) }} น.
                  </span>
                </div>

                <!-- Status Badge Matching orders/index.vue -->
                <div class="shrink-0">
                  <span 
                    v-if="!order.status || order.status === 'pending'"
                    class="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500 text-white inline-flex items-center gap-1 shadow-2xs"
                  >
                    <Clock class="w-3 h-3" />
                    <span>รอรับออเดอร์</span>
                  </span>

                  <span 
                    v-else-if="order.status === 'confirmed' || order.status === 'paid' || order.status === 'cooking'"
                    class="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-blue-600 text-white inline-flex items-center gap-1 shadow-2xs"
                  >
                    <ChefHat class="w-3 h-3" />
                    <span>กำลังปรุงอาหาร</span>
                  </span>

                  <span 
                    v-else-if="order.status === 'completed'"
                    class="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-600 text-white inline-flex items-center gap-1 shadow-2xs"
                  >
                    <CheckCircle2 class="w-3 h-3" />
                    <span>เสร็จสิ้น / เสิร์ฟแล้ว</span>
                  </span>

                  <span 
                    v-else-if="order.status === 'cancelled'"
                    class="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-rose-600 text-white inline-flex items-center gap-1 shadow-2xs"
                  >
                    <XCircle class="w-3 h-3" />
                    <span>ยกเลิกแล้ว</span>
                  </span>
                </div>
              </div>

              <!-- Order Items List -->
              <div class="space-y-2 py-0.5">
                <div 
                  v-for="(item, idx) in order.items" 
                  :key="idx" 
                  class="flex items-start justify-between gap-2 text-xs border-b border-border/30 last:border-0 pb-1.5 last:pb-0"
                >
                  <div class="min-w-0 flex-1">
                    <div class="flex items-baseline gap-1.5">
                      <span class="text-primary font-semibold text-[11px] shrink-0">{{ item.quantity || 1 }}x</span>
                      <span class="font-medium text-foreground text-xs">{{ getItemName(item) }}</span>
                    </div>

                    <!-- Addons / Spice / Subtitle -->
                    <div class="text-[11px] text-muted-foreground mt-0.5 space-y-0.5 font-normal pl-4">
                      <p v-if="getItemSubName(item)" class="text-[10px] text-muted-foreground">
                        {{ getItemSubName(item) }}
                      </p>
                      <p v-if="item.spiceLevel" class="text-rose-600 font-normal inline-flex items-center gap-0.5">
                        <Flame class="w-3 h-3" />
                        <span>เผ็ดระดับ {{ item.spiceLevel }}</span>
                      </p>
                      <p v-for="(addon, aIdx) in (item.addonNames || Object.values(item.selectedAddons || {}))" :key="aIdx" class="text-muted-foreground">
                        + {{ typeof addon === 'object' ? (addon.name || addon.name_th) : addon }}
                      </p>
                      <p v-if="item.note" class="text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-md mt-1 border border-amber-200 dark:border-amber-900/50 inline-block">
                        💬 โน้ต: {{ item.note }}
                      </p>
                    </div>
                  </div>

                  <!-- Unit total -->
                  <span class="text-foreground font-medium text-xs shrink-0 tabular-nums">
                    ฿{{ ((item.unitPrice || item.price || item.menuItem?.price || 0) * (item.quantity || 1)).toLocaleString('th-TH') }}
                  </span>
                </div>

                <!-- Cancellation Reason Badge if Cancelled -->
                <div v-if="order.status === 'cancelled' && order.cancel_reason" class="p-2 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 rounded-xl text-rose-700 dark:text-rose-300 text-[11px] font-normal">
                  ⚠️ เหตุผลที่ยกเลิก: {{ order.cancel_reason }}
                </div>
              </div>

              <!-- Price & 1-Click Action Buttons Footer -->
              <div class="pt-2.5 border-t border-border/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div class="flex items-center gap-1.5 text-xs">
                  <span class="text-muted-foreground font-normal">ยอดรวม:</span>
                  <span class="font-bold text-primary text-sm tabular-nums">
                    ฿{{ computeOrderTotal(order).toLocaleString('th-TH') }}
                  </span>
                </div>

                <!-- Action Controls Matching orders/index.vue -->
                <div class="flex items-center gap-2 self-end sm:self-auto">
                  
                  <!-- If Pending: Accept Order or Cancel -->
                  <template v-if="!order.status || order.status === 'pending'">
                    <button 
                      type="button"
                      @click="confirmOrder(order)"
                      :disabled="updatingOrderId === order.id"
                      class="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold transition-all inline-flex items-center gap-1 shadow-2xs cursor-pointer disabled:opacity-50"
                    >
                      <CheckCircle2 class="w-3.5 h-3.5" :class="{ 'animate-spin': updatingOrderId === order.id }" />
                      <span>รับออเดอร์</span>
                    </button>

                    <button 
                      type="button"
                      @click="cancelOrderWithPrompt(order)"
                      :disabled="updatingOrderId === order.id"
                      class="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-xl text-xs font-medium transition-colors cursor-pointer disabled:opacity-50"
                      title="ยกเลิกออเดอร์"
                    >
                      <XCircle class="w-3.5 h-3.5" />
                      <span class="hidden sm:inline">ยกเลิก</span>
                    </button>
                  </template>

                  <!-- If Confirmed / In Kitchen: Mark Done or Cancel -->
                  <template v-else-if="order.status === 'confirmed' || order.status === 'paid' || order.status === 'cooking'">
                    <button 
                      type="button"
                      @click="completeOrder(order)"
                      :disabled="updatingOrderId === order.id"
                      class="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold transition-all inline-flex items-center gap-1 shadow-2xs cursor-pointer disabled:opacity-50"
                    >
                      <CheckCircle2 class="w-3.5 h-3.5" :class="{ 'animate-bounce': updatingOrderId === order.id }" />
                      <span>เสร็จสิ้น / ส่งอาหารแล้ว</span>
                    </button>

                    <button 
                      type="button"
                      @click="cancelOrderWithPrompt(order)"
                      :disabled="updatingOrderId === order.id"
                      class="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-xl text-xs font-medium transition-colors cursor-pointer disabled:opacity-50"
                      title="ยกเลิกออเดอร์"
                    >
                      <XCircle class="w-3.5 h-3.5" />
                    </button>
                  </template>

                  <!-- Completed Notice -->
                  <span v-else-if="order.status === 'completed'" class="text-xs font-semibold text-emerald-600 flex items-center gap-1">
                    <CheckCircle2 class="w-3.5 h-3.5" />
                    <span>สำเร็จเรียบร้อย</span>
                  </span>

                  <!-- Cancelled Notice -->
                  <span v-else-if="order.status === 'cancelled'" class="text-xs font-semibold text-rose-600 flex items-center gap-1">
                    <XCircle class="w-3.5 h-3.5" />
                    <span>ยกเลิกแล้ว</span>
                  </span>

                </div>
              </div>

            </div>
          </div>

          <!-- Empty Orders State -->
          <div v-else class="py-10 text-center text-xs text-muted-foreground bg-muted/10 border border-dashed border-border/80 rounded-2xl space-y-1.5">
            <div class="text-2xl">☕</div>
            <p class="font-medium text-foreground text-xs">ไม่มีออเดอร์ใหม่ที่รอรับ</p>
            <p class="text-[11px] text-muted-foreground">เมื่อมีลูกค้าส่งออเดอร์ใหม่เข้ามา จะแสดงที่นี่ทันทีแบบเรียลไทม์</p>
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
                :class="store.line_user_id ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20' : 'bg-muted text-muted-foreground'"
              >
                {{ store.line_user_id ? 'เชื่อมต่อแล้ว' : 'ยังไม่เชื่อม' }}
              </span>
            </div>
            
            <p class="text-xs text-muted-foreground font-normal leading-relaxed">
              {{ store.line_user_id ? 'ออเดอร์ใหม่จะถูกส่งแจ้งเตือนเข้าห้องแชท LINE อัตโนมัติ' : 'เชื่อมต่อ LINE เพื่อรับแจ้งเตือนเมื่อมีลูกค้าสั่งอาหารทันที' }}
            </p>

            <NuxtLink 
              to="/merchant/store/settings" 
              class="text-xs text-primary hover:underline font-semibold inline-flex items-center gap-1"
            >
              <span>ตั้งค่าการแจ้งเตือน</span>
              <ArrowRight class="w-3 h-3" />
            </NuxtLink>
          </div>

        </div>

      </div>

    </div>

  </div>
</template>
