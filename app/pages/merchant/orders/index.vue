<script setup lang="ts">
import { 
  CheckCircle2, 
  Clock, 
  ChefHat, 
  XCircle, 
  RefreshCw, 
  TrendingUp, 
  AlertCircle,
  MessageSquare,
  Flame,
  Plus,
  Utensils,
  Search,
  Filter,
  Calendar,
  Layers,
  LayoutGrid,
  Table as TableIcon,
  ChevronDown,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  FileText,
  Printer,
  X,
  SlidersHorizontal,
  Type
} from 'lucide-vue-next'

definePageMeta({
  layout: 'merchant',
  middleware: ['auth']
})

const client = useSupabaseClient()
const { store, fetchStore } = useCurrentStore()
const { t, locale } = useI18n()

const loading = ref(true)
const updatingId = ref<string | null>(null)
const orders = ref<any[]>([])
let realtimeChannel: any = null

// View & Display Controls
const viewMode = ref<'cards' | 'table'>('cards')
const densityMode = ref<'compact' | 'normal' | 'large'>('normal')

// Filter States
const searchQuery = ref('')
const activeStatus = ref<'all' | 'pending' | 'confirmed' | 'completed' | 'cancelled'>('all')
const activeDatePreset = ref<'today' | 'yesterday' | '7days' | 'month' | 'all' | 'custom'>('today')
const customDate = ref('')
const activeOrderType = ref<'all' | 'dinein' | 'takeaway'>('all')
const sortBy = ref<'newest' | 'oldest' | 'price_desc' | 'price_asc' | 'table'>('newest')

// Pagination
const currentPage = ref(1)
const pageSize = ref(24)

// Receipt Modal
const selectedOrderForReceipt = ref<any | null>(null)
const showReceiptModal = ref(false)

// Cancel Order Modal State
const showCancelModal = ref(false)
const orderToCancel = ref<any | null>(null)
const cancelReasonPreset = ref('customer')
const cancelReasonCustom = ref('')

onMounted(async () => {
  try {
    if (!store.value) {
      await fetchStore()
    }
    
    if (store.value) {
      await fetchOrders()
      
      // Subscribe to realtime updates for both INSERT and UPDATE
      realtimeChannel = client.channel(`orders-store-${store.value.id}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'orders', filter: `store_id=eq.${store.value.id}` },
          (payload) => {
            orders.value.unshift(payload.new)
          }
        )
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'orders', filter: `store_id=eq.${store.value.id}` },
          (payload) => {
            const idx = orders.value.findIndex(o => o.id === payload.new.id)
            if (idx !== -1) {
              orders.value[idx] = payload.new
            }
          }
        )
        .subscribe()
    }
  } catch (err) {
    console.error('Fetch orders error:', err)
  } finally {
    loading.value = false
  }
})

onUnmounted(() => {
  if (realtimeChannel) {
    client.removeChannel(realtimeChannel)
  }
})

const fetchOrders = async () => {
  if (!store.value) return
  
  loading.value = true
  try {
    const { data, error } = await client
      .from('orders')
      .select('*')
      .eq('store_id', store.value.id)
      .order('created_at', { ascending: false })
      .limit(300) // Support up to 300 recent orders
      
    if (!error && data) {
      orders.value = data
    } else if (error) {
      console.error('fetchOrders error:', error)
    }
  } finally {
    loading.value = false
  }
}

// 1-Click Complete Order Action
const completeOrder = async (order: any) => {
  updatingId.value = order.id
  try {
    const { error } = await (client as any)
      .from('orders')
      .update({ status: 'completed' })
      .eq('id', order.id)

    if (error) {
      const swal = useAlert()
      swal.fire({
        title: 'Error',
        text: 'Error completing order: ' + error.message,
        icon: 'error'
      })
    } else {
      order.status = 'completed'
    }
  } catch (err: any) {
    console.error('Failed to complete order:', err)
  } finally {
    updatingId.value = null
  }
}

// Open Cancellation Reason Modal
const promptCancelOrder = (order: any) => {
  orderToCancel.value = order
  cancelReasonPreset.value = 'customer'
  cancelReasonCustom.value = ''
  showCancelModal.value = true
}

// Submit Cancellation with Reason
const confirmCancelOrder = async () => {
  if (!orderToCancel.value) return
  
  const order = orderToCancel.value
  let finalReason = ''
  if (cancelReasonPreset.value === 'customer') {
    finalReason = (t('order_cancel_reason_customer') as string)
  } else if (cancelReasonPreset.value === 'out_of_stock') {
    finalReason = (t('order_cancel_reason_out_of_stock') as string)
  } else if (cancelReasonPreset.value === 'duplicate') {
    finalReason = (t('order_cancel_reason_duplicate') as string)
  } else if (cancelReasonPreset.value === 'delay') {
    finalReason = (t('order_cancel_reason_delay') as string)
  } else {
    finalReason = cancelReasonCustom.value.trim() || (t('order_cancel_reason_other') as string)
  }

  updatingId.value = order.id
  showCancelModal.value = false

  try {
    const payload: any = { 
      status: 'cancelled',
      cancel_reason: finalReason,
      cancelled_at: new Date().toISOString()
    }

    let { error } = await (client as any)
      .from('orders')
      .update(payload)
      .eq('id', order.id)

    // Graceful fallback if cancel_reason column not yet migrated
    if (error && error.message?.includes('cancel_reason')) {
      const retry = await (client as any)
        .from('orders')
        .update({ status: 'cancelled' })
        .eq('id', order.id)
      error = retry.error
    }

    if (error) {
      const swal = useAlert()
      swal.fire({
        title: 'Error',
        text: 'Error cancelling order: ' + error.message,
        icon: 'error'
      })
    } else {
      order.status = 'cancelled'
      order.cancel_reason = finalReason
      const swal = useAlert()
      swal.fire({
        title: (t('order_cancel_success') as string) || 'ยกเลิกออเดอร์เรียบร้อยแล้ว',
        text: finalReason ? `เหตุผล: ${finalReason}` : '',
        icon: 'success',
        timer: 1500,
        showConfirmButton: false
      })
    }
  } catch (err: any) {
    console.error('Failed to cancel order:', err)
  } finally {
    updatingId.value = null
    orderToCancel.value = null
  }
}

// Calculate Order Total Price
const computeOrderTotal = (order: any): number => {
  if (!order?.items || !Array.isArray(order.items)) return 0
  return order.items.reduce((sum: number, it: any) => {
    const unitPrice = Number(it.unitPrice ?? it.price ?? it.menuItem?.price ?? 0)
    const qty = Number(it.quantity || 1)
    return sum + (unitPrice * qty)
  }, 0)
}

// Calculate Items count in an order
const computeOrderItemsCount = (order: any): number => {
  if (!order?.items || !Array.isArray(order.items)) return 0
  return order.items.reduce((sum: number, it: any) => sum + Number(it.quantity || 1), 0)
}

// Extract customer order note
const getOrderNote = (order: any): string => {
  if (order?.order_note) return order.order_note
  if (Array.isArray(order?.items)) {
    const itemWithNote = order.items.find((it: any) => it.order_note)
    if (itemWithNote?.order_note) return itemWithNote.order_note
  }
  return ''
}

// Date Range Filtering Helpers
const isDateInRange = (dateStr: string, preset: typeof activeDatePreset.value): boolean => {
  if (preset === 'all') return true
  if (!dateStr) return false
  
  const orderDate = new Date(dateStr)
  const now = new Date()
  
  // Asia/Bangkok date comparison
  const formatter = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok' })
  const orderBkkStr = formatter.format(orderDate)
  const nowBkkStr = formatter.format(now)
  
  if (preset === 'today') {
    return orderBkkStr === nowBkkStr
  }
  
  if (preset === 'yesterday') {
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    const yesterdayBkkStr = formatter.format(yesterday)
    return orderBkkStr === yesterdayBkkStr
  }
  
  if (preset === '7days') {
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    return orderDate >= sevenDaysAgo
  }
  
  if (preset === 'month') {
    const [nowY, nowM] = nowBkkStr.split('-')
    const [ordY, ordM] = orderBkkStr.split('-')
    return nowY === ordY && nowM === ordM
  }
  
  if (preset === 'custom' && customDate.value) {
    return orderBkkStr === customDate.value
  }
  
  return true
}

// Multi-Dimensional Filtered Orders
const filteredOrders = computed(() => {
  let list = orders.value

  // 1. Date Range Filter
  list = list.filter(o => isDateInRange(o.created_at, activeDatePreset.value))

  // 2. Order Status Filter
  if (activeStatus.value !== 'all') {
    list = list.filter(o => {
      const s = o.status || 'pending'
      if (activeStatus.value === 'confirmed') {
        return s === 'confirmed' || s === 'paid'
      }
      return s === activeStatus.value
    })
  }

  // 3. Dine-in vs Takeaway Type Filter
  if (activeOrderType.value !== 'all') {
    list = list.filter(o => {
      const tbl = (o.table_no || '').toLowerCase()
      const isTakeaway = tbl.startsWith('กลับบ้าน') || tbl.startsWith('หน้าร้าน') || tbl.includes('takeaway')
      return activeOrderType.value === 'takeaway' ? isTakeaway : !isTakeaway
    })
  }

  // 4. Search Query (Table, Item name, Note, Total, Order ID)
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.trim().toLowerCase()
    list = list.filter(o => {
      const tableMatch = (o.table_no || '').toLowerCase().includes(q)
      const noteMatch = (o.items || []).some((it: any) => (it.note || '').toLowerCase().includes(q) || (it.order_note || '').toLowerCase().includes(q)) || (o.order_note || '').toLowerCase().includes(q)
      const idMatch = (o.id || '').toLowerCase().includes(q)
      const priceMatch = computeOrderTotal(o).toString().includes(q)
      const itemMatch = (o.items || []).some((it: any) => {
        const nTh = (it.menuItem?.name_th || it.name_th || '').toLowerCase()
        const nEn = (it.menuItem?.name_en || it.name_en || '').toLowerCase()
        const nZh = (it.menuItem?.name_zh || it.name_zh || '').toLowerCase()
        return nTh.includes(q) || nEn.includes(q) || nZh.includes(q)
      })
      return tableMatch || noteMatch || idMatch || priceMatch || itemMatch
    })
  }

  // 5. Sorting
  const sorted = [...list]
  if (sortBy.value === 'newest') {
    sorted.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  } else if (sortBy.value === 'oldest') {
    sorted.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
  } else if (sortBy.value === 'price_desc') {
    sorted.sort((a, b) => computeOrderTotal(b) - computeOrderTotal(a))
  } else if (sortBy.value === 'price_asc') {
    sorted.sort((a, b) => computeOrderTotal(a) - computeOrderTotal(b))
  } else if (sortBy.value === 'table') {
    sorted.sort((a, b) => (a.table_no || '').localeCompare(b.table_no || '', undefined, { numeric: true }))
  }

  return sorted
})

// Paginated Orders
const paginatedOrders = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  return filteredOrders.value.slice(start, start + pageSize.value)
})

const totalPages = computed(() => {
  return Math.max(1, Math.ceil(filteredOrders.value.length / pageSize.value))
})

// Status Counts (Based on current date/type/search filters for accuracy)
const statusCounts = computed(() => {
  const base = orders.value.filter(o => isDateInRange(o.created_at, activeDatePreset.value))
  return {
    all: base.length,
    pending: base.filter(o => !o.status || o.status === 'pending').length,
    confirmed: base.filter(o => o.status === 'confirmed' || o.status === 'paid').length,
    completed: base.filter(o => o.status === 'completed').length,
    cancelled: base.filter(o => o.status === 'cancelled').length
  }
})

// Reset page when filter changes
watch([searchQuery, activeStatus, activeDatePreset, customDate, activeOrderType, sortBy, pageSize], () => {
  currentPage.value = 1
})

const formatDate = (dateStr: string) => {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  const loc = locale.value === 'zh' ? 'zh-CN' : (locale.value === 'en' ? 'en-US' : 'th-TH')
  
  return new Intl.DateTimeFormat(loc, {
    timeZone: 'Asia/Bangkok',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).format(date)
}

const getItemName = (item: any) => {
  if (locale.value === 'zh') {
    return item.menuItem?.name_zh || item.name_zh || item.menuItem?.name_en || item.name_en || item.menuItem?.name_th || item.name_th
  }
  if (locale.value === 'en') {
    return item.menuItem?.name_en || item.name_en || item.menuItem?.name_th || item.name_th
  }
  return item.menuItem?.name_th || item.name_th
}

const getItemSubName = (item: any) => {
  if (locale.value === 'th') {
    return item.menuItem?.name_en || item.name_en || ''
  }
  return item.menuItem?.name_th || item.name_th || ''
}

const openReceiptModal = (order: any) => {
  selectedOrderForReceipt.value = order
  showReceiptModal.value = true
}

const printReceipt = () => {
  window.print()
}
</script>

<template>
  <div class="w-full pb-20">
    
    <!-- Top Header Banner & Quick Action Buttons -->
    <div class="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card border border-border/80 p-5 sm:p-6 rounded-3xl shadow-xs">
      <div class="flex items-center gap-3.5">
        <div class="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center text-2xl font-bold shrink-0 shadow-2xs">
          📋
        </div>
        <div>
          <h1 class="text-lg sm:text-xl font-bold text-foreground">
            {{ $t('order_history_title') }}
          </h1>
          <p class="text-xs text-muted-foreground mt-0.5 font-normal">
            {{ $t('order_history_desc') }}
          </p>
        </div>
      </div>

      <div class="flex flex-wrap items-center gap-2 sm:gap-3 self-start md:self-auto">
        <!-- View Mode Switcher: Cards vs Table -->
        <div class="inline-flex p-1 bg-muted/60 rounded-2xl border border-border/60 text-xs font-semibold">
          <button 
            type="button"
            @click="viewMode = 'cards'"
            class="px-3 py-1.5 rounded-xl transition-all inline-flex items-center gap-1.5"
            :class="viewMode === 'cards' ? 'bg-background text-primary shadow-xs font-bold' : 'text-muted-foreground hover:text-foreground'"
            :title="$t('order_view_cards')"
          >
            <LayoutGrid class="w-3.5 h-3.5" />
            <span class="hidden sm:inline">{{ $t('order_view_cards') }}</span>
          </button>
          <button 
            type="button"
            @click="viewMode = 'table'"
            class="px-3 py-1.5 rounded-xl transition-all inline-flex items-center gap-1.5"
            :class="viewMode === 'table' ? 'bg-background text-primary shadow-xs font-bold' : 'text-muted-foreground hover:text-foreground'"
            :title="$t('order_view_table')"
          >
            <TableIcon class="w-3.5 h-3.5" />
            <span class="hidden sm:inline">{{ $t('order_view_table') }}</span>
          </button>
        </div>

        <!-- Density / Font Size Adjuster -->
        <div class="inline-flex p-1 bg-muted/60 rounded-2xl border border-border/60 text-xs font-semibold">
          <button 
            type="button"
            @click="densityMode = 'compact'"
            class="px-2.5 py-1.5 rounded-xl transition-all"
            :class="densityMode === 'compact' ? 'bg-background text-primary shadow-xs font-bold' : 'text-muted-foreground hover:text-foreground'"
            :title="$t('order_density_compact')"
          >
            <span class="text-[10px]">A-</span>
          </button>
          <button 
            type="button"
            @click="densityMode = 'normal'"
            class="px-2.5 py-1.5 rounded-xl transition-all"
            :class="densityMode === 'normal' ? 'bg-background text-primary shadow-xs font-bold' : 'text-muted-foreground hover:text-foreground'"
            :title="$t('order_density_normal')"
          >
            <span class="text-xs">A</span>
          </button>
          <button 
            type="button"
            @click="densityMode = 'large'"
            class="px-2.5 py-1.5 rounded-xl transition-all"
            :class="densityMode === 'large' ? 'bg-background text-primary shadow-xs font-bold' : 'text-muted-foreground hover:text-foreground'"
            :title="$t('order_density_large')"
          >
            <span class="text-sm font-bold">A+</span>
          </button>
        </div>

        <NuxtLink 
          to="/merchant/analytics" 
          class="px-3.5 py-2 bg-primary/10 hover:bg-primary/20 text-primary rounded-2xl text-xs font-bold transition-all inline-flex items-center gap-1.5 border border-primary/20 shadow-2xs"
        >
          <TrendingUp class="w-3.5 h-3.5" />
          <span class="hidden sm:inline">{{ $t('order_btn_analytics') }}</span>
        </NuxtLink>

        <button 
          @click="fetchOrders" 
          :disabled="loading"
          class="px-3.5 py-2 bg-card hover:bg-muted text-foreground border border-border/80 rounded-2xl text-xs font-semibold transition-all inline-flex items-center gap-1.5 shadow-2xs disabled:opacity-50"
          :title="$t('order_btn_refresh')"
        >
          <RefreshCw class="w-3.5 h-3.5" :class="{ 'animate-spin': loading }" />
          <span class="hidden sm:inline">{{ $t('order_btn_refresh') }}</span>
        </button>
      </div>
    </div>

    <!-- Multi-Dimensional Search & Filtering Toolset -->
    <div class="mb-6 p-4 sm:p-5 bg-card border border-border/80 rounded-3xl shadow-xs space-y-4">
      
      <!-- Top Row: Search Input + Date Presets + Sort -->
      <div class="flex flex-col lg:flex-row items-stretch lg:items-center gap-3">
        
        <!-- Search Input -->
        <div class="relative flex-1">
          <Search class="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input 
            v-model="searchQuery" 
            type="text" 
            :placeholder="$t('order_search_placeholder')"
            class="w-full pl-9 pr-8 py-2 bg-muted/40 border border-border/80 rounded-2xl text-xs sm:text-sm font-normal text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
          />
          <button 
            v-if="searchQuery" 
            @click="searchQuery = ''"
            class="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X class="w-3.5 h-3.5" />
          </button>
        </div>

        <!-- Date Range Filter Selector -->
        <div class="flex flex-wrap items-center gap-1.5 text-xs">
          <button
            v-for="d in [
              { id: 'today', label: $t('order_date_today') },
              { id: 'yesterday', label: $t('order_date_yesterday') },
              { id: '7days', label: $t('order_date_7days') },
              { id: 'month', label: $t('order_date_month') },
              { id: 'all', label: $t('order_date_all') },
              { id: 'custom', label: '📅' }
            ]"
            :key="d.id"
            type="button"
            @click="activeDatePreset = d.id as any"
            class="px-3 py-2 rounded-xl border transition-all font-medium"
            :class="activeDatePreset === d.id ? 'bg-primary text-primary-foreground border-primary font-bold shadow-2xs' : 'bg-muted/40 text-muted-foreground hover:text-foreground border-border/80'"
          >
            {{ d.label }}
          </button>

          <!-- Custom Date Input -->
          <input 
            v-if="activeDatePreset === 'custom'" 
            v-model="customDate" 
            type="date"
            class="px-2.5 py-1.5 bg-background border border-primary rounded-xl text-xs font-semibold text-foreground focus:outline-none"
          />
        </div>

        <!-- Sort By Dropdown -->
        <div class="flex items-center gap-2">
          <select 
            v-model="sortBy"
            class="px-3 py-2 bg-muted/40 border border-border/80 rounded-2xl text-xs font-medium text-foreground outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="newest">{{ $t('order_sort_newest') }}</option>
            <option value="oldest">{{ $t('order_sort_oldest') }}</option>
            <option value="price_desc">{{ $t('order_sort_price_high') }}</option>
            <option value="price_asc">{{ $t('order_sort_price_low') }}</option>
            <option value="table">{{ $t('order_sort_table') }}</option>
          </select>

          <select 
            v-model="activeOrderType"
            class="px-3 py-2 bg-muted/40 border border-border/80 rounded-2xl text-xs font-medium text-foreground outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="all">{{ $t('order_type_all') }}</option>
            <option value="dinein">🪑 {{ $t('order_type_dinein') }}</option>
            <option value="takeaway">🥡 {{ $t('order_type_takeaway') }}</option>
          </select>
        </div>

      </div>

      <!-- Bottom Row: Order Status Tabs -->
      <div class="pt-2 border-t border-border/60 flex items-center justify-between flex-wrap gap-2">
        <div class="flex overflow-x-auto pb-1 gap-2 text-xs font-medium no-scrollbar">
          <button 
            type="button"
            @click="activeStatus = 'all'"
            class="px-3.5 py-1.5 rounded-xl border transition-all flex items-center gap-1.5 shrink-0"
            :class="activeStatus === 'all' ? 'bg-primary text-primary-foreground border-primary font-semibold shadow-2xs' : 'bg-muted/30 text-muted-foreground hover:text-foreground border-border/80'"
          >
            <span>{{ $t('order_filter_all') }}</span>
            <span class="px-1.5 py-0.2 rounded-full text-[10px]" :class="activeStatus === 'all' ? 'bg-white/20 text-white' : 'bg-muted text-foreground'">
              {{ statusCounts.all }}
            </span>
          </button>

          <button 
            type="button"
            @click="activeStatus = 'pending'"
            class="px-3.5 py-1.5 rounded-xl border transition-all flex items-center gap-1.5 shrink-0"
            :class="activeStatus === 'pending' ? 'bg-amber-500 text-white border-amber-500 font-semibold shadow-2xs' : 'bg-muted/30 text-muted-foreground hover:text-foreground border-border/80'"
          >
            <Clock class="w-3.5 h-3.5" />
            <span>{{ $t('order_status_pending') }}</span>
            <span class="px-1.5 py-0.2 rounded-full text-[10px]" :class="activeStatus === 'pending' ? 'bg-white/20 text-white' : 'bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400'">
              {{ statusCounts.pending }}
            </span>
          </button>

          <button 
            type="button"
            @click="activeStatus = 'completed'"
            class="px-3.5 py-1.5 rounded-xl border transition-all flex items-center gap-1.5 shrink-0"
            :class="activeStatus === 'completed' ? 'bg-emerald-600 text-white border-emerald-600 font-semibold shadow-2xs' : 'bg-muted/30 text-muted-foreground hover:text-foreground border-border/80'"
          >
            <CheckCircle2 class="w-3.5 h-3.5" />
            <span>{{ $t('order_status_completed') }}</span>
            <span class="px-1.5 py-0.2 rounded-full text-[10px]" :class="activeStatus === 'completed' ? 'bg-white/20 text-white' : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400'">
              {{ statusCounts.completed }}
            </span>
          </button>

          <button 
            type="button"
            @click="activeStatus = 'cancelled'"
            class="px-3.5 py-1.5 rounded-xl border transition-all flex items-center gap-1.5 shrink-0"
            :class="activeStatus === 'cancelled' ? 'bg-rose-600 text-white border-rose-600 font-semibold shadow-2xs' : 'bg-muted/30 text-muted-foreground hover:text-foreground border-border/80'"
          >
            <XCircle class="w-3.5 h-3.5" />
            <span>{{ $t('order_status_cancelled') }}</span>
            <span class="px-1.5 py-0.2 rounded-full text-[10px]" :class="activeStatus === 'cancelled' ? 'bg-white/20 text-white' : 'bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400'">
              {{ statusCounts.cancelled }}
            </span>
          </button>
        </div>

        <!-- Showing count indicator -->
        <span class="text-[11px] text-muted-foreground font-normal">
          {{ $t('order_page_showing', { 
            from: filteredOrders.length > 0 ? (currentPage - 1) * pageSize + 1 : 0, 
            to: Math.min(currentPage * pageSize, filteredOrders.length), 
            total: filteredOrders.length 
          }) }}
        </span>
      </div>

    </div>

    <!-- Loading State -->
    <div v-if="loading" class="p-12 text-center text-muted-foreground bg-card rounded-3xl border border-border/80 shadow-xs">
      <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-3"></div>
      <p class="text-sm font-normal">{{ $t('order_loading') }}</p>
    </div>
    
    <!-- No Store State -->
    <div v-else-if="!store" class="p-12 text-center bg-card rounded-3xl border border-border/80 shadow-xs">
      <p class="text-sm text-muted-foreground font-normal">{{ $t('store_err_auth') }}</p>
    </div>

    <!-- Empty Orders State -->
    <div v-else-if="filteredOrders.length === 0" class="p-16 text-center text-muted-foreground bg-card border border-border/80 rounded-3xl border-dashed">
      <div class="text-5xl mb-3">🍽️</div>
      <p class="text-base font-semibold text-foreground">{{ $t('order_empty') }}</p>
      <p class="text-xs text-muted-foreground mt-1 font-normal">{{ $t('order_history_desc') }}</p>
      <button 
        v-if="searchQuery || activeStatus !== 'all' || activeDatePreset !== 'all'"
        @click="searchQuery = ''; activeStatus = 'all'; activeDatePreset = 'all'"
        class="mt-4 px-4 py-2 bg-muted hover:bg-muted/80 text-foreground text-xs font-medium rounded-xl border transition-all"
      >
        ล้างตัวกรองทั้งหมด
      </button>
    </div>

    <!-- 1. KITCHEN CARDS VIEW MODE -->
    <div v-else-if="viewMode === 'cards'" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
      <div 
        v-for="order in paginatedOrders" 
        :key="order.id" 
        class="bg-card shadow-xs border rounded-3xl overflow-hidden flex flex-col transition-all duration-200 hover:shadow-md"
        :class="{
          'border-amber-400/80 dark:border-amber-500/50 ring-2 ring-amber-400/20': !order.status || order.status === 'pending' || order.status === 'confirmed' || order.status === 'paid',
          'border-emerald-500/50': order.status === 'completed',
          'border-rose-300 dark:border-rose-900/50 opacity-75': order.status === 'cancelled',
          'text-xs': densityMode === 'compact',
          'text-sm': densityMode === 'normal',
          'text-base': densityMode === 'large'
        }"
      >
        
        <!-- Order Card Header -->
        <div 
          class="p-4 border-b flex justify-between items-center"
          :class="{
            'bg-amber-500/10': !order.status || order.status === 'pending' || order.status === 'confirmed' || order.status === 'paid',
            'bg-emerald-500/10': order.status === 'completed',
            'bg-rose-500/10': order.status === 'cancelled'
          }"
        >
          <div class="flex items-center gap-2">
            <span class="font-semibold text-foreground">
              {{ order.table_no?.startsWith('กลับบ้าน') || order.table_no?.startsWith('หน้าร้าน') || order.table_no?.includes('Takeaway') ? `🥡 ${order.table_no}` : `🪑 ${$t('order_table', { no: order.table_no })}` }}
            </span>
          </div>

          <!-- Status Badge -->
          <div class="flex items-center gap-1.5">
            <span 
              v-if="!order.status || order.status === 'pending' || order.status === 'confirmed' || order.status === 'paid'"
              class="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-amber-500 text-white inline-flex items-center gap-1 shadow-2xs"
            >
              <Clock class="w-3 h-3" />
              <span>{{ $t('order_status_pending') }}</span>
            </span>

            <span 
              v-else-if="order.status === 'completed'"
              class="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-emerald-600 text-white inline-flex items-center gap-1 shadow-2xs"
            >
              <CheckCircle2 class="w-3 h-3" />
              <span>{{ $t('order_status_completed') }}</span>
            </span>

            <span 
              v-else-if="order.status === 'cancelled'"
              class="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-rose-600 text-white inline-flex items-center gap-1 shadow-2xs"
            >
              <XCircle class="w-3 h-3" />
              <span>{{ $t('order_status_cancelled') }}</span>
            </span>
          </div>
        </div>

        <!-- Timestamp & LINE status strip -->
        <div class="px-4 py-2 bg-muted/30 border-b flex justify-between items-center text-[11px] text-muted-foreground font-normal">
          <span>{{ formatDate(order.created_at) }}</span>
          <div class="flex items-center gap-2">
            <span v-if="order.line_notified" class="text-emerald-600 dark:text-emerald-400 font-medium inline-flex items-center gap-1">
              <span>✓ LINE</span>
            </span>
            <button 
              @click="openReceiptModal(order)"
              class="text-muted-foreground hover:text-foreground inline-flex items-center gap-0.5"
              title="ดูใบเสร็จ"
            >
              <FileText class="w-3 h-3" />
            </button>
          </div>
        </div>
        
        <!-- Items List (Clean Typography) -->
        <div class="p-4 flex-1 bg-background">
          <ul class="space-y-2.5">
            <li v-for="(item, idx) in order.items" :key="idx" class="flex gap-2 text-xs border-b border-border/40 last:border-0 pb-2.5 last:pb-0">
              <span class="text-primary font-medium">{{ Number(idx) + 1 }}.</span>
              <div class="flex-1 min-w-0">
                <div class="flex justify-between items-start">
                  <div class="font-medium text-foreground">
                    <span v-if="(item.quantity || 1) > 1" class="text-primary font-semibold mr-1">{{ item.quantity }}x</span>
                    <span>{{ getItemName(item) }}</span>
                    <span v-if="getItemSubName(item)" class="text-muted-foreground text-[10px] font-normal block">
                      {{ getItemSubName(item) }}
                    </span>
                  </div>
                  <span class="text-foreground font-medium shrink-0 ml-2 tabular-nums">
                    ฿{{ ((item.unitPrice || item.price || item.menuItem?.price || 0) * (item.quantity || 1)).toLocaleString('th-TH') }}
                  </span>
                </div>
                
                <!-- Details (Addons, Spice, Note) -->
                <div class="text-[11px] text-muted-foreground mt-1 space-y-0.5 font-normal">
                  <p v-if="item.spiceLevel" class="text-rose-600 dark:text-rose-400 font-normal inline-flex items-center gap-1">
                    <Flame class="w-3 h-3" />
                    <span>{{ $t('order_spice_level', { level: item.spiceLevel }) }}</span>
                  </p>
                  <p v-for="(addon, aIdx) in (item.addonNames || Object.values(item.selectedAddons || {}))" :key="aIdx" class="text-muted-foreground font-normal">
                    + {{ typeof addon === 'object' ? (addon.name || addon.name_th) : addon }}
                  </p>
                  <p v-if="item.note" class="italic text-amber-700 dark:text-amber-400 font-normal bg-amber-50 dark:bg-amber-950/40 p-1.5 rounded-lg mt-1 border border-amber-200 dark:border-amber-900/50">
                    💬 {{ item.note }}
                  </p>
                </div>
              </div>
            </li>
          </ul>

          <!-- Customer Order Note -->
          <div v-if="getOrderNote(order)" class="mt-3 p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-900 dark:text-amber-200 text-xs font-semibold flex items-start gap-2 shadow-2xs">
            <span class="text-sm shrink-0">📝</span>
            <div class="min-w-0">
              <span class="text-[10px] uppercase font-bold text-amber-700 dark:text-amber-400 block">โน้ตจากลูกค้า:</span>
              <span class="font-medium text-xs break-words">{{ getOrderNote(order) }}</span>
            </div>
          </div>

          <!-- Cancellation Reason Note if Cancelled -->
          <div v-if="order.status === 'cancelled' && order.cancel_reason" class="mt-3 p-2 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 rounded-xl text-rose-700 dark:text-rose-300 text-[11px]">
            ⚠️ เหตุผล: {{ order.cancel_reason }}
          </div>
        </div>
        
        <!-- Total Price Strip -->
        <div class="px-4 py-2.5 border-t bg-muted/10 flex justify-between items-center text-xs">
          <span class="text-muted-foreground font-normal">{{ $t('order_total_label') }}:</span>
          <span class="font-semibold text-primary text-base tabular-nums">
            ฿{{ computeOrderTotal(order).toLocaleString('th-TH') }}
          </span>
        </div>

        <!-- 1-Click Action Buttons Footer -->
        <div class="p-3 border-t bg-card flex gap-2">
          
          <!-- Direct Complete Button (Single Click) -->
          <button
            v-if="order.status !== 'completed' && order.status !== 'cancelled'"
            type="button"
            @click="completeOrder(order)"
            :disabled="updatingId === order.id"
            class="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold transition-all inline-flex items-center justify-center gap-1.5 shadow-xs disabled:opacity-50"
          >
            <CheckCircle2 class="w-3.5 h-3.5" :class="{ 'animate-bounce': updatingId === order.id }" />
            <span>{{ $t('order_btn_complete_direct') }}</span>
          </button>

          <!-- Cancel Order Button (With Reason Prompt) -->
          <button
            v-if="order.status !== 'completed' && order.status !== 'cancelled'"
            type="button"
            @click="promptCancelOrder(order)"
            :disabled="updatingId === order.id"
            class="py-2 px-3 bg-muted hover:bg-rose-100 hover:text-rose-700 dark:hover:bg-rose-950 dark:hover:text-rose-300 text-muted-foreground rounded-xl text-xs font-normal transition-all border disabled:opacity-50"
            title="ยกเลิกออเดอร์"
          >
            <XCircle class="w-3.5 h-3.5" />
          </button>

          <!-- Completed State Notice -->
          <div v-if="order.status === 'completed'" class="w-full py-1 text-center text-xs font-semibold text-emerald-600 dark:text-emerald-400">
            ✓ {{ $t('order_status_completed') }}
          </div>

          <!-- Cancelled State Notice -->
          <div v-if="order.status === 'cancelled'" class="w-full py-1 text-center text-xs font-semibold text-rose-600 dark:text-rose-400">
            ✕ {{ $t('order_status_cancelled') }}
          </div>
        </div>
        
      </div>
    </div>

    <!-- 2. AUDIT TABLE / LIST VIEW MODE -->
    <div v-else-if="viewMode === 'table'" class="bg-card border border-border/80 rounded-3xl shadow-xs overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-left text-xs">
          <thead class="bg-muted/50 border-b border-border/80 text-muted-foreground font-semibold">
            <tr>
              <th class="py-3 px-4">{{ $t('order_col_time') }}</th>
              <th class="py-3 px-4">{{ $t('order_col_table') }}</th>
              <th class="py-3 px-4">{{ $t('order_col_items') }}</th>
              <th class="py-3 px-4 text-right">{{ $t('order_col_total') }}</th>
              <th class="py-3 px-4 text-center">{{ $t('order_col_status') }}</th>
              <th class="py-3 px-4 text-center">LINE</th>
              <th class="py-3 px-4 text-center">{{ $t('order_col_actions') }}</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-border/60">
            <tr 
              v-for="order in paginatedOrders" 
              :key="order.id"
              class="hover:bg-muted/20 transition-colors"
            >
              <!-- Time -->
              <td class="py-3 px-4 text-muted-foreground font-normal whitespace-nowrap">
                {{ formatDate(order.created_at) }}
              </td>

              <!-- Table / Type -->
              <td class="py-3 px-4 font-semibold text-foreground whitespace-nowrap">
                {{ order.table_no?.startsWith('กลับบ้าน') || order.table_no?.includes('Takeaway') ? `🥡 ${order.table_no}` : `🪑 โต๊ะ ${order.table_no}` }}
              </td>

              <!-- Items Summary -->
              <td class="py-3 px-4 max-w-xs">
                <div class="space-y-1">
                  <div v-for="(it, idx) in (order.items || []).slice(0, 3)" :key="idx" class="text-foreground font-normal flex items-center justify-between gap-2">
                    <span class="truncate">
                      <span v-if="(it.quantity || 1) > 1" class="text-primary font-semibold mr-1">{{ it.quantity }}x</span>
                      {{ getItemName(it) }}
                    </span>
                  </div>
                  <span v-if="(order.items || []).length > 3" class="text-[10px] text-muted-foreground font-normal">
                    + อีก {{ order.items.length - 3 }} รายการ
                  </span>
                  <div v-if="getOrderNote(order)" class="text-[10px] text-amber-600 dark:text-amber-400 font-medium truncate max-w-[200px]" :title="getOrderNote(order)">
                    📝 {{ getOrderNote(order) }}
                  </div>
                </div>
              </td>

              <!-- Total Amount -->
              <td class="py-3 px-4 text-right font-semibold text-primary tabular-nums whitespace-nowrap">
                ฿{{ computeOrderTotal(order).toLocaleString('th-TH') }}
              </td>

              <!-- Status Badge -->
              <td class="py-3 px-4 text-center whitespace-nowrap">
                <span 
                  v-if="!order.status || order.status === 'pending' || order.status === 'confirmed' || order.status === 'paid'"
                  class="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500 text-white"
                >
                  {{ $t('order_status_pending') }}
                </span>
                <span 
                  v-else-if="order.status === 'completed'"
                  class="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-600 text-white"
                >
                  {{ $t('order_status_completed') }}
                </span>
                <span 
                  v-else-if="order.status === 'cancelled'"
                  class="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-rose-600 text-white"
                >
                  {{ $t('order_status_cancelled') }}
                </span>
              </td>

              <!-- LINE Status -->
              <td class="py-3 px-4 text-center whitespace-nowrap">
                <span v-if="order.line_notified" class="text-emerald-600 font-bold text-[11px]">✓</span>
                <span v-else class="text-muted-foreground text-[11px]">-</span>
              </td>

              <!-- Action Buttons -->
              <td class="py-3 px-4 text-center whitespace-nowrap">
                <div class="inline-flex items-center gap-1.5">
                  <!-- Direct Complete -->
                  <button 
                    v-if="order.status !== 'completed' && order.status !== 'cancelled'"
                    @click="completeOrder(order)"
                    :disabled="updatingId === order.id"
                    class="px-2.5 py-1 bg-emerald-600 text-white rounded-lg text-[10px] font-semibold hover:bg-emerald-700 transition-all shadow-2xs"
                  >
                    ✓ เสร็จสิ้น
                  </button>

                  <button 
                    @click="openReceiptModal(order)"
                    class="p-1 text-muted-foreground hover:text-foreground bg-muted/60 rounded-lg transition-all"
                    title="ดูใบเสร็จ"
                  >
                    <FileText class="w-3.5 h-3.5" />
                  </button>

                  <!-- Cancel with Reason -->
                  <button 
                    v-if="order.status !== 'completed' && order.status !== 'cancelled'"
                    @click="promptCancelOrder(order)"
                    class="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-all"
                    title="ยกเลิกออเดอร์"
                  >
                    <XCircle class="w-3.5 h-3.5" />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Pagination & Page Controls -->
    <div v-if="totalPages > 1" class="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
      <div class="flex items-center gap-2 text-xs text-muted-foreground">
        <span>จำนวนต่อหน้า:</span>
        <select 
          v-model="pageSize" 
          class="px-2 py-1 bg-card border border-border/80 rounded-xl text-xs font-medium text-foreground outline-none"
        >
          <option :value="12">12</option>
          <option :value="24">24</option>
          <option :value="48">48</option>
          <option :value="100">100</option>
        </select>
      </div>

      <div class="flex items-center gap-1.5">
        <button 
          @click="currentPage = Math.max(1, currentPage - 1)"
          :disabled="currentPage === 1"
          class="p-2 bg-card border border-border/80 rounded-xl text-foreground hover:bg-muted disabled:opacity-40 transition-all shadow-2xs"
        >
          <ChevronLeft class="w-4 h-4" />
        </button>

        <span class="px-3 py-1.5 bg-card border border-border/80 rounded-xl text-xs font-semibold text-foreground">
          {{ currentPage }} / {{ totalPages }}
        </span>

        <button 
          @click="currentPage = Math.min(totalPages, currentPage + 1)"
          :disabled="currentPage === totalPages"
          class="p-2 bg-card border border-border/80 rounded-xl text-foreground hover:bg-muted disabled:opacity-40 transition-all shadow-2xs"
        >
          <ChevronRight class="w-4 h-4" />
        </button>
      </div>
    </div>

    <!-- CANCELLATION REASON MODAL -->
    <Teleport to="body">
      <div 
        v-if="showCancelModal && orderToCancel" 
        class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
      >
        <div class="w-full max-w-md bg-card border border-border/80 rounded-3xl shadow-xl overflow-hidden flex flex-col">
          
          <div class="p-5 border-b flex justify-between items-center bg-rose-50/50 dark:bg-rose-950/30">
            <div class="flex items-center gap-2 text-rose-600 dark:text-rose-400">
              <XCircle class="w-5 h-5" />
              <h3 class="font-bold text-base">{{ $t('order_cancel_modal_title') }}</h3>
            </div>
            <button 
              @click="showCancelModal = false"
              class="p-1.5 text-muted-foreground hover:text-foreground rounded-full hover:bg-muted transition-colors"
            >
              <X class="w-4 h-4" />
            </button>
          </div>

          <div class="p-5 space-y-4 text-xs">
            <p class="text-muted-foreground">
              {{ $t('order_cancel_modal_text') }}
            </p>

            <div class="space-y-2">
              <label class="flex items-center gap-2.5 p-3 rounded-2xl border cursor-pointer transition-all" :class="cancelReasonPreset === 'customer' ? 'border-primary bg-primary/5 font-semibold text-foreground' : 'border-border/60 hover:bg-muted/30 text-muted-foreground'">
                <input type="radio" value="customer" v-model="cancelReasonPreset" class="text-primary" />
                <span>{{ $t('order_cancel_reason_customer') }}</span>
              </label>

              <label class="flex items-center gap-2.5 p-3 rounded-2xl border cursor-pointer transition-all" :class="cancelReasonPreset === 'out_of_stock' ? 'border-primary bg-primary/5 font-semibold text-foreground' : 'border-border/60 hover:bg-muted/30 text-muted-foreground'">
                <input type="radio" value="out_of_stock" v-model="cancelReasonPreset" class="text-primary" />
                <span>{{ $t('order_cancel_reason_out_of_stock') }}</span>
              </label>

              <label class="flex items-center gap-2.5 p-3 rounded-2xl border cursor-pointer transition-all" :class="cancelReasonPreset === 'duplicate' ? 'border-primary bg-primary/5 font-semibold text-foreground' : 'border-border/60 hover:bg-muted/30 text-muted-foreground'">
                <input type="radio" value="duplicate" v-model="cancelReasonPreset" class="text-primary" />
                <span>{{ $t('order_cancel_reason_duplicate') }}</span>
              </label>

              <label class="flex items-center gap-2.5 p-3 rounded-2xl border cursor-pointer transition-all" :class="cancelReasonPreset === 'delay' ? 'border-primary bg-primary/5 font-semibold text-foreground' : 'border-border/60 hover:bg-muted/30 text-muted-foreground'">
                <input type="radio" value="delay" v-model="cancelReasonPreset" class="text-primary" />
                <span>{{ $t('order_cancel_reason_delay') }}</span>
              </label>

              <label class="flex items-center gap-2.5 p-3 rounded-2xl border cursor-pointer transition-all" :class="cancelReasonPreset === 'other' ? 'border-primary bg-primary/5 font-semibold text-foreground' : 'border-border/60 hover:bg-muted/30 text-muted-foreground'">
                <input type="radio" value="other" v-model="cancelReasonPreset" class="text-primary" />
                <span>{{ $t('order_cancel_reason_other') }}</span>
              </label>
            </div>

            <div v-if="cancelReasonPreset === 'other'" class="pt-1">
              <input 
                v-model="cancelReasonCustom"
                type="text" 
                :placeholder="$t('order_cancel_reason_placeholder')"
                class="w-full px-3.5 py-2 bg-muted/40 border border-border/80 rounded-xl text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          <div class="p-4 border-t bg-muted/20 flex gap-2 justify-end">
            <button 
              @click="showCancelModal = false"
              class="px-4 py-2 bg-muted hover:bg-muted/80 text-foreground rounded-xl text-xs font-medium border transition-all"
            >
              {{ $t('btn_cancel') }}
            </button>
            <button 
              @click="confirmCancelOrder"
              :disabled="updatingId !== null"
              class="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-all disabled:opacity-50"
            >
              {{ $t('order_btn_cancel') }}
            </button>
          </div>

        </div>
      </div>
    </Teleport>

    <!-- ORDER RECEIPT MODAL -->
    <Teleport to="body">
      <div 
        v-if="showReceiptModal && selectedOrderForReceipt" 
        class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
      >
        <div class="w-full max-w-md bg-card border border-border/80 rounded-3xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
          
          <!-- Modal Header -->
          <div class="p-5 border-b flex justify-between items-center bg-muted/30">
            <div class="flex items-center gap-2">
              <span class="text-xl">🧾</span>
              <div>
                <h3 class="font-bold text-base text-foreground">{{ $t('order_receipt_modal_title') }}</h3>
                <p class="text-[11px] text-muted-foreground font-mono">ID: {{ selectedOrderForReceipt.id?.slice(0, 8) }}...</p>
              </div>
            </div>
            <button 
              @click="showReceiptModal = false"
              class="p-2 text-muted-foreground hover:text-foreground rounded-full hover:bg-muted transition-colors"
            >
              <X class="w-5 h-5" />
            </button>
          </div>

          <!-- Thermal Receipt Body (Clean Print Preview) -->
          <div id="receipt-print-area" class="p-6 overflow-y-auto space-y-4 bg-background font-sans text-xs">
            <div class="text-center pb-3 border-b border-dashed border-border/80">
              <h2 class="text-lg font-bold text-foreground">{{ store?.name || 'ChiiMenu Store' }}</h2>
              <p class="text-muted-foreground text-[11px] mt-0.5">
                {{ selectedOrderForReceipt.table_no?.startsWith('กลับบ้าน') ? selectedOrderForReceipt.table_no : `โต๊ะ: ${selectedOrderForReceipt.table_no}` }}
              </p>
              <p class="text-muted-foreground text-[10px] mt-0.5">{{ formatDate(selectedOrderForReceipt.created_at) }}</p>
              
              <!-- Status on Receipt -->
              <div class="mt-2">
                <span v-if="selectedOrderForReceipt.status === 'completed'" class="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400">
                  ✓ ชำระแล้ว / เสร็จสิ้น
                </span>
                <span v-else-if="selectedOrderForReceipt.status === 'cancelled'" class="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400">
                  ✕ ยกเลิก: {{ selectedOrderForReceipt.cancel_reason || '-' }}
                </span>
              </div>
            </div>

            <!-- Items Table -->
            <div class="space-y-3">
              <div 
                v-for="(it, idx) in selectedOrderForReceipt.items" 
                :key="idx"
                class="flex justify-between items-start gap-2 border-b border-border/40 pb-2.5 last:border-0"
              >
                <div class="flex-1">
                  <div class="font-medium text-foreground">
                    <span v-if="(it.quantity || 1) > 1" class="text-primary font-semibold mr-1">{{ it.quantity }}x</span>
                    {{ getItemName(it) }}
                  </div>
                  <div v-if="it.spiceLevel" class="text-[10px] text-rose-500">
                    🌶️ ความเผ็ด: ระดับ {{ it.spiceLevel }}
                  </div>
                  <div v-for="(addon, aIdx) in (it.addonNames || Object.values(it.selectedAddons || {}))" :key="aIdx" class="text-[10px] text-muted-foreground">
                    + {{ typeof addon === 'object' ? (addon.name || addon.name_th) : addon }}
                  </div>
                  <div v-if="it.note" class="text-[10px] text-amber-600 dark:text-amber-400 italic">
                    💬 {{ it.note }}
                  </div>
                </div>

                <div class="font-medium text-foreground tabular-nums">
                  ฿{{ ((it.unitPrice || it.price || it.menuItem?.price || 0) * (it.quantity || 1)).toLocaleString('th-TH') }}
                </div>
              </div>
            </div>

            <!-- Customer Order Note on Receipt -->
            <div v-if="getOrderNote(selectedOrderForReceipt)" class="p-2 bg-amber-50 dark:bg-amber-950/30 border border-dashed border-amber-300 dark:border-amber-800 rounded-lg text-[11px] text-amber-900 dark:text-amber-200">
              <span class="font-bold">📝 โน้ตจากลูกค้า:</span> {{ getOrderNote(selectedOrderForReceipt) }}
            </div>

            <!-- Receipt Total Summary -->
            <div class="pt-3 border-t border-dashed border-border/80 space-y-1.5 text-xs">
              <div class="flex justify-between text-muted-foreground">
                <span>จำนวนรายการ:</span>
                <span>{{ computeOrderItemsCount(selectedOrderForReceipt) }} จาน</span>
              </div>
              <div class="flex justify-between text-sm font-bold text-foreground pt-1 border-t border-border/40">
                <span>ยอดรวมสุทธิ:</span>
                <span class="text-primary font-mono text-base">฿{{ computeOrderTotal(selectedOrderForReceipt).toLocaleString('th-TH') }}</span>
              </div>
            </div>

            <div class="text-center pt-3 text-[10px] text-muted-foreground">
              <p>ขอบคุณที่ใช้บริการ / Thank you / 谢谢光临</p>
              <p class="font-mono text-[9px] mt-1">ChiiMenu Digital Ordering Platform</p>
            </div>
          </div>

          <!-- Modal Footer Actions -->
          <div class="p-4 border-t bg-muted/20 flex gap-2 justify-end">
            <button 
              @click="printReceipt"
              class="px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 shadow-xs transition-all"
            >
              <Printer class="w-3.5 h-3.5" />
              <span>พิมพ์ใบเสร็จ (Print)</span>
            </button>
            <button 
              @click="showReceiptModal = false"
              class="px-4 py-2 bg-muted hover:bg-muted/80 text-foreground rounded-xl text-xs font-medium border transition-all"
            >
              ปิดหน้าต่าง
            </button>
          </div>

        </div>
      </div>
    </Teleport>

  </div>
</template>

<style>
@media print {
  /* Hide everything on the page */
  body * {
    visibility: hidden;
  }
  /* Show only the receipt print area and its children */
  #receipt-print-area,
  #receipt-print-area * {
    visibility: visible;
  }
  /* Position the receipt area at the top-left, full receipt width */
  #receipt-print-area {
    position: fixed;
    left: 0;
    top: 0;
    width: 80mm;
    padding: 8mm;
    background: white !important;
    color: black !important;
    font-size: 12px;
    line-height: 1.5;
  }
  body {
    background: white !important;
  }
}
</style>
