<script setup lang="ts">
import { 
  TrendingUp, 
  DollarSign, 
  ShoppingBag, 
  UtensilsCrossed, 
  Calendar, 
  RefreshCw, 
  AlertCircle, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  ArrowUpRight,
  Sparkles,
  Award,
  ChevronRight,
  Receipt
} from 'lucide-vue-next'

definePageMeta({
  layout: 'merchant',
  middleware: ['auth']
})

const { store, fetchStore } = useCurrentStore()
const { t, locale } = useI18n()

type PeriodType = 'today' | '7days' | 'month' | 'year'
const activePeriod = ref<PeriodType>('today')
const loading = ref(true)
const errorMessage = ref<string | null>(null)

interface KPI {
  total_sales: number
  total_orders: number
  total_items_sold: number
  avg_order_value: number
}

interface OrderStatus {
  total_orders: number
  completed_orders: number
  pending_orders: number
  cancelled_orders: number
}

interface DailySale {
  sale_date: string
  display_date: string
  sales: number
  order_count: number
}

interface TopItem {
  name_th: string
  name_en: string
  name_zh: string
  quantity_sold: number
  total_sales: number
}

interface AnalyticsPayload {
  period: string
  start_time: string
  end_time: string
  kpi: KPI
  order_status: OrderStatus
  daily_sales: DailySale[]
  top_items: TopItem[]
}

const analyticsData = ref<AnalyticsPayload>({
  period: 'today',
  start_time: '',
  end_time: '',
  kpi: {
    total_sales: 0,
    total_orders: 0,
    total_items_sold: 0,
    avg_order_value: 0
  },
  order_status: {
    total_orders: 0,
    completed_orders: 0,
    pending_orders: 0,
    cancelled_orders: 0
  },
  daily_sales: [],
  top_items: []
})

const hoveredBar = ref<DailySale | null>(null)

const fetchAnalytics = async () => {
  if (!store.value?.id) return
  
  loading.value = true
  errorMessage.value = null
  
  try {
    const res = await $fetch<{ success: boolean; data: AnalyticsPayload }>('/api/merchant/analytics', {
      query: {
        period: activePeriod.value,
        storeId: store.value.id
      }
    })
    
    if (res?.success && res.data) {
      analyticsData.value = res.data
    } else {
      throw new Error('Could not load analytics data')
    }
  } catch (err: any) {
    console.error('Fetch analytics error:', err)
    errorMessage.value = err?.data?.message || err?.message || 'เกิดข้อผิดพลาดในการโหลดข้อมูลการขาย'
  } finally {
    loading.value = false
  }
}

const setPeriod = (period: PeriodType) => {
  if (activePeriod.value === period && !loading.value) return
  activePeriod.value = period
  fetchAnalytics()
}

onMounted(async () => {
  if (!store.value) {
    await fetchStore()
  }
  if (store.value) {
    await fetchAnalytics()
  }
})

watch(() => store.value?.id, (newId) => {
  if (newId) {
    fetchAnalytics()
  }
})

// Chart Helpers
const maxDailySales = computed(() => {
  const sales = analyticsData.value.daily_sales.map(d => Number(d.sales) || 0)
  const max = Math.max(0, ...sales)
  return max > 0 ? max : 100
})

const formatCurrency = (val: number | undefined) => {
  return (Number(val) || 0).toLocaleString('th-TH', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  })
}

const formatDecimal = (val: number | undefined) => {
  return (Number(val) || 0).toLocaleString('th-TH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
}

const getItemName = (item: TopItem) => {
  if (locale.value === 'en' && item.name_en) return item.name_en
  if (locale.value === 'zh' && item.name_zh) return item.name_zh
  return item.name_th || item.name_en || 'เมนูอาหาร'
}

const getItemSubtitle = (item: TopItem) => {
  if (locale.value === 'th') {
    return item.name_en || item.name_zh || ''
  }
  return item.name_th || ''
}

const topItemMaxSales = computed(() => {
  if (analyticsData.value.top_items.length === 0) return 1
  return Math.max(...analyticsData.value.top_items.map(i => i.total_sales || 1))
})

const periodLabels: Record<PeriodType, { th: string; en: string; zh: string; sub: string }> = {
  today: {
    th: 'วันนี้',
    en: 'Today',
    zh: '今日',
    sub: '00:00 - 23:59 น.'
  },
  '7days': {
    th: '7 วันที่ผ่านมา',
    en: 'Last 7 Days',
    zh: '最近7天',
    sub: '7 วันล่าสุด'
  },
  month: {
    th: 'เดือนนี้',
    en: 'This Month',
    zh: '本月',
    sub: 'ตั้งแต่วันที่ 1 ของเดือน'
  },
  year: {
    th: 'ปีนี้',
    en: 'This Year',
    zh: '今年',
    sub: 'สถิติตลอดทั้งปี'
  }
}
</script>

<template>
  <div class="w-full pb-16">
    
    <!-- Page Header & Period Selector -->
    <div class="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card border border-border/80 p-5 sm:p-6 rounded-3xl shadow-xs">
      <div class="flex items-center gap-3.5">
        <div class="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center text-2xl font-bold shrink-0 shadow-2xs">
          📊
        </div>
        <div>
          <h1 class="text-lg sm:text-xl font-bold text-foreground">
            {{ $t('analytics_title') }}
          </h1>
          <p class="text-xs text-muted-foreground mt-0.5">
            {{ $t('analytics_desc') }}
          </p>
        </div>
      </div>

      <!-- Controls: Period Tabs & Refresh -->
      <div class="flex flex-wrap items-center gap-2 sm:gap-3 self-start md:self-auto">
        <!-- Segmented Control Period Filter -->
        <div class="inline-flex p-1 bg-muted/60 rounded-2xl border border-border/60 text-xs font-semibold">
          <button 
            type="button"
            @click="setPeriod('today')"
            :disabled="loading"
            class="px-3.5 py-1.5 rounded-xl transition-all flex items-center gap-1.5"
            :class="activePeriod === 'today' ? 'bg-background text-primary shadow-xs font-bold' : 'text-muted-foreground hover:text-foreground'"
          >
            <span>{{ periodLabels.today[locale as 'th' | 'en' | 'zh'] || periodLabels.today.th }}</span>
          </button>
          <button 
            type="button"
            @click="setPeriod('7days')"
            :disabled="loading"
            class="px-3.5 py-1.5 rounded-xl transition-all flex items-center gap-1.5"
            :class="activePeriod === '7days' ? 'bg-background text-primary shadow-xs font-bold' : 'text-muted-foreground hover:text-foreground'"
          >
            <span>{{ periodLabels['7days'][locale as 'th' | 'en' | 'zh'] || periodLabels['7days'].th }}</span>
          </button>
          <button 
            type="button"
            @click="setPeriod('month')"
            :disabled="loading"
            class="px-3.5 py-1.5 rounded-xl transition-all flex items-center gap-1.5"
            :class="activePeriod === 'month' ? 'bg-background text-primary shadow-xs font-bold' : 'text-muted-foreground hover:text-foreground'"
          >
            <span>{{ periodLabels.month[locale as 'th' | 'en' | 'zh'] || periodLabels.month.th }}</span>
          </button>
          <button 
            type="button"
            @click="setPeriod('year')"
            :disabled="loading"
            class="px-3.5 py-1.5 rounded-xl transition-all flex items-center gap-1.5"
            :class="activePeriod === 'year' ? 'bg-background text-primary shadow-xs font-bold' : 'text-muted-foreground hover:text-foreground'"
          >
            <span>{{ periodLabels.year[locale as 'th' | 'en' | 'zh'] || periodLabels.year.th }}</span>
          </button>
        </div>

        <!-- Refresh Button -->
        <button 
          @click="fetchAnalytics"
          :disabled="loading"
          class="px-3.5 py-2 bg-card hover:bg-muted text-foreground border border-border/80 rounded-2xl text-xs font-semibold transition-all inline-flex items-center gap-1.5 shadow-2xs disabled:opacity-50"
          title="รีเฟรชข้อมูลล่าสุด"
        >
          <RefreshCw class="w-3.5 h-3.5" :class="{ 'animate-spin': loading }" />
          <span class="hidden sm:inline">รีเฟรช</span>
        </button>
      </div>
    </div>

    <!-- Error State Box with Retry -->
    <div v-if="errorMessage" class="mb-6 p-6 rounded-3xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/50 text-rose-900 dark:text-rose-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div class="flex items-start gap-3">
        <AlertCircle class="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
        <div>
          <h3 class="font-bold text-sm">ไม่สามารถโหลดข้อมูล Analytics ได้</h3>
          <p class="text-xs text-rose-700 dark:text-rose-300 mt-0.5">{{ errorMessage }}</p>
        </div>
      </div>
      <button 
        @click="fetchAnalytics"
        class="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-colors inline-flex items-center gap-1.5 self-start sm:self-auto shrink-0 shadow-xs"
      >
        <RefreshCw class="w-3.5 h-3.5" />
        <span>ลองใหม่อีกครั้ง</span>
      </button>
    </div>

    <!-- Loading Skeleton Shimmer -->
    <div v-if="loading && !analyticsData.kpi.total_orders && !errorMessage" class="space-y-6 animate-pulse">
      <!-- KPI Skeletons -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        <div v-for="i in 4" :key="i" class="h-32 bg-card border border-border/60 rounded-3xl p-5 flex flex-col justify-between">
          <div class="h-4 bg-muted rounded w-24"></div>
          <div class="h-8 bg-muted rounded w-32"></div>
          <div class="h-3 bg-muted rounded w-20"></div>
        </div>
      </div>

      <!-- Chart Skeleton -->
      <div class="h-80 bg-card border border-border/60 rounded-3xl p-6">
        <div class="h-5 bg-muted rounded w-36 mb-6"></div>
        <div class="h-56 bg-muted/40 rounded-2xl"></div>
      </div>
    </div>

    <!-- Main Analytics Content -->
    <div v-else class="space-y-6">
      
      <!-- 1. KPI Summary Cards (4 Primary Metrics) -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        
        <!-- Total Sales -->
        <div class="bg-card border border-border/80 rounded-3xl p-5 sm:p-6 shadow-xs relative overflow-hidden transition-all hover:border-primary/40 group">
          <div class="flex items-center justify-between">
            <span class="text-xs font-semibold text-muted-foreground">ยอดขายรวม (Sales)</span>
            <div class="w-9 h-9 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-sm">
              ฿
            </div>
          </div>
          <div class="mt-3">
            <div class="text-2xl sm:text-3xl font-black text-foreground tracking-tight flex items-baseline gap-1">
              <span>฿{{ formatCurrency(analyticsData.kpi.total_sales) }}</span>
            </div>
            <p class="text-[11px] text-muted-foreground mt-1 flex items-center gap-1 font-medium">
              <span>ช่วงเวลา: {{ periodLabels[activePeriod][locale as 'th' | 'en' | 'zh'] || periodLabels[activePeriod].th }}</span>
            </p>
          </div>
          <div class="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500/50 to-emerald-500/10"></div>
        </div>

        <!-- Total Orders -->
        <div class="bg-card border border-border/80 rounded-3xl p-5 sm:p-6 shadow-xs relative overflow-hidden transition-all hover:border-primary/40 group">
          <div class="flex items-center justify-between">
            <span class="text-xs font-semibold text-muted-foreground">จำนวนออเดอร์ (Orders)</span>
            <div class="w-9 h-9 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center text-sm">
              🧾
            </div>
          </div>
          <div class="mt-3">
            <div class="text-2xl sm:text-3xl font-black text-foreground tracking-tight flex items-baseline gap-1">
              <span>{{ (analyticsData.kpi.total_orders || 0).toLocaleString('th-TH') }}</span>
              <span class="text-xs font-semibold text-muted-foreground">ออเดอร์</span>
            </div>
            <p class="text-[11px] text-muted-foreground mt-1 flex items-center gap-1 font-medium">
              <span v-if="analyticsData.order_status.cancelled_orders > 0" class="text-rose-500 font-semibold">
                (ยกเลิก {{ analyticsData.order_status.cancelled_orders }} รายการ)
              </span>
              <span v-else class="text-emerald-600 font-medium">สำเร็จ 100%</span>
            </p>
          </div>
          <div class="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500/50 to-blue-500/10"></div>
        </div>

        <!-- Items Sold -->
        <div class="bg-card border border-border/80 rounded-3xl p-5 sm:p-6 shadow-xs relative overflow-hidden transition-all hover:border-primary/40 group">
          <div class="flex items-center justify-between">
            <span class="text-xs font-semibold text-muted-foreground">จำนวนจาน/รายการที่ขาย</span>
            <div class="w-9 h-9 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center text-sm">
              🍲
            </div>
          </div>
          <div class="mt-3">
            <div class="text-2xl sm:text-3xl font-black text-foreground tracking-tight flex items-baseline gap-1">
              <span>{{ (analyticsData.kpi.total_items_sold || 0).toLocaleString('th-TH') }}</span>
              <span class="text-xs font-semibold text-muted-foreground">จาน/แก้ว</span>
            </div>
            <p class="text-[11px] text-muted-foreground mt-1 flex items-center gap-1 font-medium">
              <span>เฉลี่ย {{ analyticsData.kpi.total_orders > 0 ? (analyticsData.kpi.total_items_sold / analyticsData.kpi.total_orders).toFixed(1) : 0 }} จาน / ออเดอร์</span>
            </p>
          </div>
          <div class="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500/50 to-amber-500/10"></div>
        </div>

        <!-- Average Order Value (AOV) -->
        <div class="bg-card border border-border/80 rounded-3xl p-5 sm:p-6 shadow-xs relative overflow-hidden transition-all hover:border-primary/40 group">
          <div class="flex items-center justify-between">
            <span class="text-xs font-semibold text-muted-foreground">ยอดเฉลี่ยต่อออเดอร์ (AOV)</span>
            <div class="w-9 h-9 rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center text-sm">
              🎯
            </div>
          </div>
          <div class="mt-3">
            <div class="text-2xl sm:text-3xl font-black text-foreground tracking-tight flex items-baseline gap-1">
              <span>฿{{ formatCurrency(analyticsData.kpi.avg_order_value) }}</span>
            </div>
            <p class="text-[11px] text-muted-foreground mt-1 flex items-center gap-1 font-medium">
              <span>ต่อ 1 คำสั่งซื้อ</span>
            </p>
          </div>
          <div class="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500/50 to-purple-500/10"></div>
        </div>

      </div>

      <!-- Empty State Banner when no orders exist in period -->
      <div 
        v-if="analyticsData.kpi.total_orders === 0 && !loading" 
        class="bg-card border border-dashed border-border/90 rounded-3xl p-10 sm:p-14 text-center max-w-3xl mx-auto shadow-xs"
      >
        <div class="w-16 h-16 rounded-3xl bg-primary/10 text-primary flex items-center justify-center text-3xl mx-auto mb-4">
          🍽️
        </div>
        <h3 class="text-lg font-bold text-foreground mb-1.5">
          ยังไม่มีข้อมูลการขายในช่วงเวลานี้
        </h3>
        <p class="text-xs sm:text-sm text-muted-foreground max-w-md mx-auto mb-6">
          เมื่อลูกค้าเริ่มสแกน QR Code ประจำโต๊ะและส่งคำสั่งซื้อ ระบบจะสรุปสถิติและยอดขายมาแสดงที่หน้านี้โดยอัตโนมัติ
        </p>

        <div class="flex flex-wrap items-center justify-center gap-3">
          <NuxtLink 
            to="/merchant/qr" 
            class="px-4 py-2.5 bg-primary text-primary-foreground font-semibold text-xs rounded-xl shadow-xs hover:bg-primary/90 transition-all inline-flex items-center gap-1.5"
          >
            <span>🖨️ ดู QR Code ประจำโต๊ะ</span>
          </NuxtLink>
          <NuxtLink 
            to="/merchant/orders" 
            class="px-4 py-2.5 bg-muted hover:bg-muted/80 text-foreground font-semibold text-xs rounded-xl border transition-all inline-flex items-center gap-1.5"
          >
            <span>📋 ดูประวัติคำสั่งซื้อ</span>
          </NuxtLink>
        </div>
      </div>

      <!-- Analytics Visuals (Visible when data exists or empty with grid) -->
      <div v-else class="space-y-6">

        <!-- 2. Sales Trend & Daily Overview Chart -->
        <div class="bg-card border border-border/80 rounded-3xl p-5 sm:p-6 shadow-xs">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
            <div>
              <h2 class="text-base font-bold text-foreground flex items-center gap-2">
                <span>📈 {{ activePeriod === 'year' ? 'แนวโน้มยอดขายรายเดือน (Monthly Sales Trend)' : 'แนวโน้มยอดขายรายวัน (Daily Sales Trend)' }}</span>
              </h2>
              <p class="text-xs text-muted-foreground mt-0.5">
                เปรียบเทียบยอดขายรวม (฿) และจำนวนออเดอร์ตาม{{ activePeriod === 'year' ? 'เดือน' : 'วัน' }}
              </p>
            </div>
            <div class="flex items-center gap-3 text-xs">
              <span class="inline-flex items-center gap-1.5 text-muted-foreground">
                <span class="w-3 h-3 rounded-md bg-primary"></span>
                <span>ยอดขาย (฿)</span>
              </span>
              <span class="inline-flex items-center gap-1.5 text-muted-foreground">
                <span class="w-3 h-3 rounded-md bg-blue-400"></span>
                <span>จำนวนออเดอร์</span>
              </span>
            </div>
          </div>

          <!-- Bar Chart Container -->
          <div class="relative w-full">
            
            <!-- When daily sales has items -->
            <div v-if="analyticsData.daily_sales.length > 0" class="pt-4 pb-2">
              
              <!-- Responsive SVG/HTML Bar Chart -->
              <div class="flex items-end gap-2 sm:gap-4 h-56 sm:h-64 px-2 sm:px-4 border-b border-border/60">
                
                <div 
                  v-for="(day, dIdx) in analyticsData.daily_sales" 
                  :key="dIdx"
                  class="flex-1 h-full flex flex-col justify-end items-center group relative cursor-pointer"
                  @mouseenter="hoveredBar = day"
                  @mouseleave="hoveredBar = null"
                >
                  <!-- Tooltip Hover Card -->
                  <div 
                    v-if="hoveredBar?.sale_date === day.sale_date" 
                    class="absolute -top-16 z-30 bg-foreground text-background text-xs rounded-xl py-2 px-3 shadow-lg pointer-events-none whitespace-nowrap text-center animate-in fade-in zoom-in-95 duration-150"
                  >
                    <div class="font-bold">{{ activePeriod === 'year' ? `เดือน ${day.display_date}` : `วันที่ ${day.display_date}` }}</div>
                    <div class="text-[11px] text-primary-foreground/90 font-mono mt-0.5">
                      ฿{{ formatCurrency(day.sales) }} • {{ day.order_count }} ออเดอร์
                    </div>
                  </div>

                  <!-- Value Tag on Top of Bar -->
                  <span class="text-[10px] font-mono font-bold text-muted-foreground mb-1 group-hover:text-primary transition-colors hidden sm:block">
                    <template v-if="day.sales > 0">฿{{ formatCurrency(day.sales) }}</template>
                  </span>

                  <!-- Dual Bar Column (Sales Bar + Order Count Indicator) -->
                  <div class="w-full max-w-[48px] flex items-end justify-center gap-1 h-full max-h-[85%]">
                    
                    <!-- Sales Bar -->
                    <div 
                      class="w-full rounded-t-xl bg-gradient-to-t from-primary/80 to-primary transition-all duration-500 group-hover:brightness-110 shadow-2xs relative overflow-hidden min-h-[4px]"
                      :style="{ 
                        height: `${Math.max(4, (day.sales / maxDailySales) * 100)}%` 
                      }"
                    >
                      <div class="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    </div>
                  </div>

                  <!-- Date Label Below Axis -->
                  <div class="text-[11px] font-semibold text-muted-foreground mt-2.5 text-center truncate w-full group-hover:text-foreground transition-colors">
                    {{ day.display_date }}
                  </div>
                </div>

              </div>

              <!-- Summary Footnote -->
              <div class="mt-4 flex items-center justify-between text-xs text-muted-foreground px-2">
                <span>ทั้งหมด {{ analyticsData.daily_sales.length }} {{ activePeriod === 'year' ? 'เดือน' : 'วัน' }}ในช่วงนี้</span>
                <span class="font-bold text-foreground">
                  ยอดรวมในกราฟ: ฿{{ formatCurrency(analyticsData.kpi.total_sales) }}
                </span>
              </div>
            </div>

            <!-- Empty Graph Fallback -->
            <div v-else class="h-48 flex items-center justify-center text-muted-foreground text-xs border rounded-2xl bg-muted/10">
              ไม่มีข้อมูลยอดขายรายวันในช่วงเวลานี้
            </div>

          </div>
        </div>

        <!-- 3. Two-Column Grid: Top Selling Menu & Order Status Summary -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          <!-- Top Selling Menu (2 Columns on Large Screens) -->
          <div class="lg:col-span-2 bg-card border border-border/80 rounded-3xl p-5 sm:p-6 shadow-xs flex flex-col">
            <div class="flex items-center justify-between mb-5">
              <div>
                <h2 class="text-base font-bold text-foreground flex items-center gap-2">
                  <span>🏆 เมนูขายดี (Top Selling Menu)</span>
                </h2>
                <p class="text-xs text-muted-foreground mt-0.5">
                  10 อันดับเมนูที่ได้รับความนิยมสูงสุด เรียงตามจำนวนที่สั่ง
                </p>
              </div>
              <span class="px-2.5 py-1 bg-primary/10 text-primary text-xs font-bold rounded-xl">
                Top {{ analyticsData.top_items.length }}
              </span>
            </div>

            <!-- Menu Table / List -->
            <div v-if="analyticsData.top_items.length > 0" class="flex-1 overflow-x-auto">
              <table class="w-full text-left border-collapse text-xs">
                <thead>
                  <tr class="border-b border-border/60 text-muted-foreground font-semibold">
                    <th class="pb-3 pl-2 w-12 text-center">อันดับ</th>
                    <th class="pb-3">รายการอาหาร</th>
                    <th class="pb-3 text-right">จำนวนที่ขาย</th>
                    <th class="pb-3 text-right pr-2">ยอดขายรวม</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-border/40">
                  <tr 
                    v-for="(item, idx) in analyticsData.top_items" 
                    :key="idx"
                    class="hover:bg-muted/30 transition-colors group"
                  >
                    <!-- Rank Badge -->
                    <td class="py-3.5 pl-2 text-center font-bold">
                      <span 
                        v-if="idx === 0" 
                        class="w-6 h-6 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 inline-flex items-center justify-center text-xs font-black shadow-2xs"
                      >
                        🥇
                      </span>
                      <span 
                        v-else-if="idx === 1" 
                        class="w-6 h-6 rounded-full bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200 inline-flex items-center justify-center text-xs font-black"
                      >
                        🥈
                      </span>
                      <span 
                        v-else-if="idx === 2" 
                        class="w-6 h-6 rounded-full bg-amber-900/10 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400 inline-flex items-center justify-center text-xs font-black"
                      >
                        🥉
                      </span>
                      <span v-else class="text-muted-foreground font-mono">
                        {{ idx + 1 }}
                      </span>
                    </td>

                    <!-- Menu Info + Visual Share Bar -->
                    <td class="py-3.5 pr-3 min-w-[180px]">
                      <div class="font-bold text-foreground text-sm group-hover:text-primary transition-colors">
                        {{ getItemName(item) }}
                      </div>
                      <div v-if="getItemSubtitle(item)" class="text-[11px] text-muted-foreground font-normal">
                        {{ getItemSubtitle(item) }}
                      </div>
                      <!-- Share Bar -->
                      <div class="w-full bg-muted/60 h-1.5 rounded-full mt-1.5 overflow-hidden max-w-[240px]">
                        <div 
                          class="bg-primary h-full rounded-full transition-all duration-500"
                          :style="{ width: `${(item.total_sales / topItemMaxSales) * 100}%` }"
                        ></div>
                      </div>
                    </td>

                    <!-- Quantity Sold -->
                    <td class="py-3.5 text-right font-bold font-mono text-foreground text-sm whitespace-nowrap">
                      {{ item.quantity_sold }} <span class="text-[11px] font-normal text-muted-foreground">จาน</span>
                    </td>

                    <!-- Total Item Sales -->
                    <td class="py-3.5 text-right pr-2 font-black font-mono text-primary text-sm whitespace-nowrap">
                      ฿{{ formatCurrency(item.total_sales) }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- Empty Top Items State -->
            <div v-else class="flex-1 flex flex-col items-center justify-center p-8 text-center text-muted-foreground text-xs border rounded-2xl border-dashed">
              <UtensilsCrossed class="w-8 h-8 mb-2 opacity-40 text-primary" />
              <span>ยังไม่มีข้อมูลเมนูที่ขายได้ในช่วงนี้</span>
            </div>
          </div>

          <!-- Order Status Summary Card (1 Column on Large Screens) -->
          <div class="bg-card border border-border/80 rounded-3xl p-5 sm:p-6 shadow-xs flex flex-col justify-between">
            <div>
              <div class="mb-5">
                <h2 class="text-base font-bold text-foreground flex items-center gap-2">
                  <span>📑 สรุปสถานะออเดอร์</span>
                </h2>
                <p class="text-xs text-muted-foreground mt-0.5">
                  ความสมบูรณ์และอัตราการยกเลิกคำสั่งซื้อ
                </p>
              </div>

              <!-- Status Metrics Breakdown -->
              <div class="space-y-3.5">
                
                <!-- Total Orders -->
                <div class="p-3.5 bg-muted/30 rounded-2xl border border-border/60 flex items-center justify-between">
                  <div class="flex items-center gap-2.5">
                    <div class="w-8 h-8 rounded-xl bg-foreground/5 text-foreground flex items-center justify-center text-sm font-bold">
                      🧾
                    </div>
                    <div>
                      <div class="text-xs font-bold text-foreground">ออเดอร์ทั้งหมด</div>
                      <div class="text-[10px] text-muted-foreground">Total Placed Orders</div>
                    </div>
                  </div>
                  <span class="text-base font-black font-mono text-foreground">
                    {{ analyticsData.order_status.total_orders }}
                  </span>
                </div>

                <!-- Completed / Paid / Confirmed -->
                <div class="p-3.5 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-2xl border border-emerald-200/60 dark:border-emerald-900/40 flex items-center justify-between">
                  <div class="flex items-center gap-2.5">
                    <div class="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center text-sm">
                      <CheckCircle2 class="w-4 h-4" />
                    </div>
                    <div>
                      <div class="text-xs font-bold text-emerald-900 dark:text-emerald-300">ออเดอร์ที่สำเร็จ/ชำระแล้ว</div>
                      <div class="text-[10px] text-emerald-700/80 dark:text-emerald-400">Completed / Active</div>
                    </div>
                  </div>
                  <span class="text-base font-black font-mono text-emerald-600 dark:text-emerald-400">
                    {{ analyticsData.order_status.completed_orders + analyticsData.order_status.pending_orders }}
                  </span>
                </div>

                <!-- Cancelled Orders -->
                <div class="p-3.5 bg-rose-50/50 dark:bg-rose-950/20 rounded-2xl border border-rose-200/60 dark:border-rose-900/40 flex items-center justify-between">
                  <div class="flex items-center gap-2.5">
                    <div class="w-8 h-8 rounded-xl bg-rose-500/10 text-rose-600 flex items-center justify-center text-sm">
                      <XCircle class="w-4 h-4" />
                    </div>
                    <div>
                      <div class="text-xs font-bold text-rose-900 dark:text-rose-300">ออเดอร์ที่ยกเลิก</div>
                      <div class="text-[10px] text-rose-700/80 dark:text-rose-400">Cancelled / Void</div>
                    </div>
                  </div>
                  <span class="text-base font-black font-mono text-rose-600 dark:text-rose-400">
                    {{ analyticsData.order_status.cancelled_orders }}
                  </span>
                </div>

              </div>

              <!-- Completion Ratio Bar -->
              <div class="mt-6 pt-5 border-t border-border/60">
                <div class="flex justify-between text-xs font-semibold mb-2">
                  <span class="text-muted-foreground">อัตราออเดอร์สำเร็จ (Success Rate)</span>
                  <span class="text-emerald-600 font-bold font-mono">
                    {{ analyticsData.order_status.total_orders > 0 
                      ? Math.round(((analyticsData.order_status.total_orders - analyticsData.order_status.cancelled_orders) / analyticsData.order_status.total_orders) * 100) 
                      : 100 }}%
                  </span>
                </div>
                <div class="w-full bg-muted h-2.5 rounded-full overflow-hidden flex">
                  <div 
                    class="bg-emerald-500 h-full transition-all duration-500"
                    :style="{ 
                      width: `${analyticsData.order_status.total_orders > 0 
                        ? ((analyticsData.order_status.total_orders - analyticsData.order_status.cancelled_orders) / analyticsData.order_status.total_orders) * 100 
                        : 100}%` 
                    }"
                  ></div>
                  <div 
                    class="bg-rose-500 h-full transition-all duration-500"
                    :style="{ 
                      width: `${analyticsData.order_status.total_orders > 0 
                        ? (analyticsData.order_status.cancelled_orders / analyticsData.order_status.total_orders) * 100 
                        : 0}%` 
                    }"
                  ></div>
                </div>
              </div>
            </div>

            <!-- Quick Link to Order History -->
            <div class="mt-6 pt-4 border-t border-border/60">
              <NuxtLink 
                to="/merchant/orders" 
                class="w-full py-2.5 px-4 bg-muted hover:bg-muted/80 text-foreground font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-1.5 border border-border/80"
              >
                <span>ดูประวัติคำสั่งซื้อทั้งหมด</span>
                <ChevronRight class="w-3.5 h-3.5" />
              </NuxtLink>
            </div>

          </div>

        </div>

      </div>

    </div>

  </div>
</template>
