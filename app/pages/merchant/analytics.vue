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
  Award, 
  Printer, 
  FileSpreadsheet, 
  Flame, 
  Plus, 
  Utensils, 
  SlidersHorizontal,
  Table as TableIcon
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
  avg_items_per_order?: number
  lost_cancelled_sales?: number
  completion_rate?: number
}

interface OrderStatus {
  total_orders: number
  completed_orders: number
  pending_orders: number
  cancelled_orders: number
}

interface DiningType {
  sales: number
  count: number
  percentage: number
}

interface DailySale {
  sale_date: string
  display_date: string
  day_name?: string
  sales: number
  order_count: number
  items_count?: number
  avg_order_value?: number
  dinein_count?: number
  takeaway_count?: number
}

interface TopItem {
  name_th: string
  name_en: string
  name_zh: string
  quantity_sold: number
  total_sales: number
  percentage?: number
}

interface AddonStat {
  name: string
  name_th?: string
  name_en?: string
  name_zh?: string
  count: number
}

interface HourlyStat {
  hour: number
  display: string
  sales: number
  count: number
}

interface AnalyticsPayload {
  period: string
  start_time: string
  end_time: string
  kpi: KPI
  order_status: OrderStatus
  dining_types?: {
    dinein: DiningType
    takeaway: DiningType
  }
  hourly_sales?: HourlyStat[]
  top_addons?: AddonStat[]
  spice_distribution?: Record<string, number>
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
    avg_order_value: 0,
    avg_items_per_order: 0,
    lost_cancelled_sales: 0,
    completion_rate: 100
  },
  order_status: {
    total_orders: 0,
    completed_orders: 0,
    pending_orders: 0,
    cancelled_orders: 0
  },
  dining_types: {
    dinein: { sales: 0, count: 0, percentage: 0 },
    takeaway: { sales: 0, count: 0, percentage: 0 }
  },
  hourly_sales: [],
  top_addons: [],
  spice_distribution: { '0': 0, '1': 0, '2': 0, '3': 0 },
  daily_sales: [],
  top_items: []
})

const hoveredBar = ref<DailySale | null>(null)

const fetchAnalytics = async () => {
  if (!store.value?.id) return
  
  loading.value = true
  errorMessage.value = null
  
  try {
    const client = useSupabaseClient()
    const { data: { session } } = await client.auth.getSession()
    const token = session?.access_token || ''

    const headers: Record<string, string> = {}
    if (token) {
      headers.Authorization = `Bearer ${token}`
    }

    const res: any = await $fetch(`/api/merchant/analytics?period=${activePeriod.value}&storeId=${store.value.id}`, {
      headers
    })

    if (res?.data) {
      analyticsData.value = res.data
    } else {
      throw new Error(t('analytics_err_load_title') as string)
    }
  } catch (err: any) {
    console.error('[Analytics View] Fetch Error:', err)
    errorMessage.value = err?.data?.message || err?.message || (t('analytics_err_load_title') as string)
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  if (!store.value) {
    await fetchStore()
  }
  if (store.value?.id) {
    await fetchAnalytics()
  }
})

const setPeriod = (period: PeriodType) => {
  activePeriod.value = period
  fetchAnalytics()
}

// Chart Calculations
const maxDailySales = computed(() => {
  if (!analyticsData.value.daily_sales || analyticsData.value.daily_sales.length === 0) return 1
  const max = Math.max(...analyticsData.value.daily_sales.map(d => d.sales))
  return max > 0 ? max : 1
})

const getItemName = (item: TopItem) => {
  if (locale.value === 'zh') {
    return item.name_zh || item.name_en || item.name_th
  }
  if (locale.value === 'en') {
    return item.name_en || item.name_th
  }
  return item.name_th
}

const getItemSubName = (item: TopItem) => {
  if (locale.value === 'th') {
    return item.name_en || ''
  }
  return item.name_th || ''
}

const getAddonName = (addon: AddonStat) => {
  if (locale.value === 'zh') {
    return addon.name_zh || addon.name_en || addon.name_th || addon.name
  }
  if (locale.value === 'en') {
    return addon.name_en || addon.name_th || addon.name
  }
  return addon.name_th || addon.name
}

const getAddonSubName = (addon: AddonStat) => {
  if (locale.value === 'th') {
    return addon.name_en || ''
  }
  return addon.name_th || ''
}

// Export CSV Functionality (Business Ready)
const exportCsvReport = () => {
  const data = analyticsData.value
  const storeName = store.value?.name || 'Store'
  const periodLabel = activePeriod.value
  
  let csv = `\uFEFF` // UTF-8 BOM for Excel in Thai
  csv += `รายงานยอดขาย ChiiMenu (Sales Report)\n`
  csv += `ร้านค้า: ${storeName}\n`
  csv += `ช่วงเวลา: ${periodLabel} (${data.start_time?.slice(0, 10)} ถึง ${data.end_time?.slice(0, 10)})\n`
  csv += `วันที่ออกรายงาน: ${new Date().toLocaleString('th-TH')}\n\n`
  
  // Section 1: KPI Summary
  csv += `=== สรุปยอดขายรวม (KPI Summary) ===\n`
  csv += `ยอดขายสุทธิ (฿),${data.kpi.total_sales}\n`
  csv += `จำนวนออเดอร์ที่สำเร็จ,${data.kpi.total_orders}\n`
  csv += `จำนวนจานที่ขายได้,${data.kpi.total_items_sold}\n`
  csv += `ยอดเฉลี่ยต่อบิล (AOV ฿),${data.kpi.avg_order_value}\n`
  csv += `เฉลี่ยจานต่อบิล,${data.kpi.avg_items_per_order || 0}\n`
  csv += `ยอดเงินที่สูญเสียจากออเดอร์ยกเลิก (฿),${data.kpi.lost_cancelled_sales || 0}\n\n`
  
  // Section 2: Daily Breakdown Table
  csv += `=== รายละเอียดสถิติรายวัน (Daily Breakdown) ===\n`
  csv += `วันที่,วัน,ยอดขาย (฿),จำนวนออเดอร์,จำนวนจาน,เฉลี่ย/บิล (฿),ทานที่ร้าน,กลับบ้าน\n`
  data.daily_sales.forEach(d => {
    csv += `${d.sale_date},${d.day_name || '-'},${d.sales},${d.order_count},${d.items_count || 0},${d.avg_order_value || 0},${d.dinein_count || 0},${d.takeaway_count || 0}\n`
  })
  csv += `\n`

  // Section 3: All Menu Items
  csv += `=== สรุปยอดขายรายเมนู (Menu Items Sales) ===\n`
  csv += `อันดับ,ชื่อเมนู (ไทย),ชื่อเมนู (EN),จำนวนที่ขายได้ (จาน),ยอดขายรวม (฿),สัดส่วนยอดขาย (%)\n`
  data.top_items.forEach((it, idx) => {
    csv += `${idx + 1},"${it.name_th}","${it.name_en}",${it.quantity_sold},${it.total_sales},${it.percentage || 0}%\n`
  })

  // Trigger browser download
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.setAttribute('href', url)
  link.setAttribute('download', `ChiiMenu-Sales-${storeName}-${periodLabel}-${new Date().toISOString().slice(0, 10)}.csv`)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

const printExecutiveReport = () => {
  window.print()
}

const periodLabels: Record<PeriodType, { th: string; en: string; zh: string }> = {
  today: { th: 'วันนี้', en: 'Today', zh: '今天' },
  '7days': { th: '7 วันล่าสุด', en: 'Last 7 Days', zh: '近7天' },
  month: { th: 'เดือนนี้', en: 'This Month', zh: '本月' },
  year: { th: 'ปีนี้', en: 'This Year', zh: '今年' }
}
</script>

<template>
  <div class="w-full pb-20">
    
    <!-- Top Header Banner & Action Buttons -->
    <div class="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card border border-border/80 p-5 sm:p-6 rounded-3xl shadow-xs">
      <div class="flex items-center gap-3.5">
        <div class="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center text-2xl font-bold shrink-0 shadow-2xs">
          📊
        </div>
        <div>
          <h1 class="text-lg sm:text-xl font-bold text-foreground">
            {{ $t('analytics_title') }}
          </h1>
          <p class="text-xs text-muted-foreground mt-0.5 font-normal">
            {{ $t('analytics_desc') }}
          </p>
        </div>
      </div>

      <!-- Controls: Period Tabs + Export + Print + Refresh -->
      <div class="flex flex-wrap items-center gap-2 sm:gap-2.5 self-start md:self-auto">
        
        <!-- Period Tabs -->
        <div class="inline-flex p-1 bg-muted/60 rounded-2xl border border-border/60 text-xs font-semibold">
          <button 
            type="button"
            @click="setPeriod('today')"
            :disabled="loading"
            class="px-3.5 py-1.5 rounded-xl transition-all font-medium"
            :class="activePeriod === 'today' ? 'bg-background text-primary shadow-xs font-bold' : 'text-muted-foreground hover:text-foreground'"
          >
            <span>{{ periodLabels.today[locale as 'th' | 'en' | 'zh'] || periodLabels.today.th }}</span>
          </button>
          <button 
            type="button"
            @click="setPeriod('7days')"
            :disabled="loading"
            class="px-3.5 py-1.5 rounded-xl transition-all font-medium"
            :class="activePeriod === '7days' ? 'bg-background text-primary shadow-xs font-bold' : 'text-muted-foreground hover:text-foreground'"
          >
            <span>{{ periodLabels['7days'][locale as 'th' | 'en' | 'zh'] || periodLabels['7days'].th }}</span>
          </button>
          <button 
            type="button"
            @click="setPeriod('month')"
            :disabled="loading"
            class="px-3.5 py-1.5 rounded-xl transition-all font-medium"
            :class="activePeriod === 'month' ? 'bg-background text-primary shadow-xs font-bold' : 'text-muted-foreground hover:text-foreground'"
          >
            <span>{{ periodLabels.month[locale as 'th' | 'en' | 'zh'] || periodLabels.month.th }}</span>
          </button>
          <button 
            type="button"
            @click="setPeriod('year')"
            :disabled="loading"
            class="px-3.5 py-1.5 rounded-xl transition-all font-medium"
            :class="activePeriod === 'year' ? 'bg-background text-primary shadow-xs font-bold' : 'text-muted-foreground hover:text-foreground'"
          >
            <span>{{ periodLabels.year[locale as 'th' | 'en' | 'zh'] || periodLabels.year.th }}</span>
          </button>
        </div>

        <!-- Export CSV Button (Business Grade) -->
        <button 
          @click="exportCsvReport"
          :disabled="loading"
          class="px-3 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 rounded-2xl text-xs font-semibold transition-all inline-flex items-center gap-1.5 shadow-2xs disabled:opacity-50"
          :title="$t('analytics_btn_export_csv')"
        >
          <FileSpreadsheet class="w-3.5 h-3.5 text-emerald-600" />
          <span class="hidden sm:inline">{{ $t('analytics_btn_export_csv') }}</span>
        </button>

        <!-- Print Report Button -->
        <button 
          @click="printExecutiveReport"
          :disabled="loading"
          class="px-3 py-2 bg-card hover:bg-muted text-foreground border border-border/80 rounded-2xl text-xs font-semibold transition-all inline-flex items-center gap-1.5 shadow-2xs disabled:opacity-50"
          :title="$t('analytics_btn_print_report')"
        >
          <Printer class="w-3.5 h-3.5" />
          <span class="hidden sm:inline">{{ $t('analytics_btn_print_report') }}</span>
        </button>

        <!-- Refresh Button -->
        <button 
          @click="fetchAnalytics"
          :disabled="loading"
          class="px-3 py-2 bg-card hover:bg-muted text-foreground border border-border/80 rounded-2xl text-xs font-semibold transition-all inline-flex items-center gap-1.5 shadow-2xs disabled:opacity-50"
          :title="$t('order_btn_refresh')"
        >
          <RefreshCw class="w-3.5 h-3.5" :class="{ 'animate-spin': loading }" />
          <span class="hidden sm:inline">{{ $t('order_btn_refresh') }}</span>
        </button>

      </div>
    </div>

    <!-- Error State Box with Retry -->
    <div v-if="errorMessage" class="mb-6 p-6 rounded-3xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/50 text-rose-900 dark:text-rose-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div class="flex items-start gap-3">
        <AlertCircle class="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
        <div>
          <h3 class="font-semibold text-sm">{{ $t('analytics_err_load_title') }}</h3>
          <p class="text-xs text-rose-700 dark:text-rose-300 mt-0.5 font-normal">{{ errorMessage }}</p>
        </div>
      </div>
      <button 
        @click="fetchAnalytics"
        class="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold transition-colors inline-flex items-center gap-1.5 self-start sm:self-auto shrink-0 shadow-xs"
      >
        <RefreshCw class="w-3.5 h-3.5" />
        <span>{{ $t('analytics_btn_retry') }}</span>
      </button>
    </div>

    <!-- Loading Shimmer State -->
    <div v-if="loading" class="space-y-6">
      <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
        <div v-for="i in 6" :key="i" class="h-28 bg-card border border-border/80 rounded-3xl animate-pulse"></div>
      </div>
      <div class="h-72 bg-card border border-border/80 rounded-3xl animate-pulse"></div>
    </div>

    <!-- Main Analytics Content -->
    <div v-else class="space-y-6">
      
      <!-- 1. SUMMARY METRIC CARDS (6 METRICS) -->
      <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
        
        <!-- Net Total Revenue -->
        <div class="p-4 bg-card border border-border/80 rounded-3xl shadow-xs flex flex-col justify-between transition-all hover:shadow-md">
          <div class="flex items-center justify-between">
            <span class="text-[11px] font-medium text-muted-foreground">{{ $t('analytics_kpi_total_revenue') }}</span>
            <span class="w-7 h-7 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-xs font-bold">
              ฿
            </span>
          </div>
          <div class="mt-3">
            <span class="text-xl sm:text-2xl font-bold text-foreground tabular-nums">
              ฿{{ analyticsData.kpi.total_sales.toLocaleString('th-TH') }}
            </span>
            <span class="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium block mt-0.5">
              {{ $t('analytics_kpi_net_desc') }}
            </span>
          </div>
        </div>

        <!-- Completed Orders -->
        <div class="p-4 bg-card border border-border/80 rounded-3xl shadow-xs flex flex-col justify-between transition-all hover:shadow-md">
          <div class="flex items-center justify-between">
            <span class="text-[11px] font-medium text-muted-foreground">{{ $t('analytics_kpi_total_orders') }}</span>
            <span class="w-7 h-7 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center text-xs font-bold">
              <ShoppingBag class="w-3.5 h-3.5" />
            </span>
          </div>
          <div class="mt-3">
            <span class="text-xl sm:text-2xl font-bold text-foreground tabular-nums">
              {{ analyticsData.kpi.total_orders }}
            </span>
            <span class="text-[10px] text-blue-600 dark:text-blue-400 font-medium block mt-0.5">
              {{ $t('analytics_kpi_completion_rate_desc', { rate: analyticsData.kpi.completion_rate || 100 }) }}
            </span>
          </div>
        </div>

        <!-- Average Order Value (AOV) -->
        <div class="p-4 bg-card border border-border/80 rounded-3xl shadow-xs flex flex-col justify-between transition-all hover:shadow-md">
          <div class="flex items-center justify-between">
            <span class="text-[11px] font-medium text-muted-foreground">{{ $t('analytics_kpi_aov') }}</span>
            <span class="w-7 h-7 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center text-xs font-bold">
              <TrendingUp class="w-3.5 h-3.5" />
            </span>
          </div>
          <div class="mt-3">
            <span class="text-xl sm:text-2xl font-bold text-foreground tabular-nums">
              ฿{{ analyticsData.kpi.avg_order_value.toLocaleString('th-TH') }}
            </span>
            <span class="text-[10px] text-muted-foreground font-normal block mt-0.5">
              {{ $t('analytics_kpi_aov_desc') }}
            </span>
          </div>
        </div>

        <!-- Total Items Sold -->
        <div class="p-4 bg-card border border-border/80 rounded-3xl shadow-xs flex flex-col justify-between transition-all hover:shadow-md">
          <div class="flex items-center justify-between">
            <span class="text-[11px] font-medium text-muted-foreground">{{ $t('analytics_kpi_items_sold') }}</span>
            <span class="w-7 h-7 rounded-xl bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">
              <Utensils class="w-3.5 h-3.5" />
            </span>
          </div>
          <div class="mt-3">
            <span class="text-xl sm:text-2xl font-bold text-foreground tabular-nums">
              {{ analyticsData.kpi.total_items_sold }}
            </span>
            <span class="text-[10px] text-muted-foreground font-normal block mt-0.5">
              {{ $t('analytics_kpi_items_desc') }}
            </span>
          </div>
        </div>

        <!-- Avg Items per Order -->
        <div class="p-4 bg-card border border-border/80 rounded-3xl shadow-xs flex flex-col justify-between transition-all hover:shadow-md">
          <div class="flex items-center justify-between">
            <span class="text-[11px] font-medium text-muted-foreground">{{ $t('analytics_kpi_avg_items') }}</span>
            <span class="w-7 h-7 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center text-xs font-bold">
              🥢
            </span>
          </div>
          <div class="mt-3">
            <span class="text-xl sm:text-2xl font-bold text-foreground tabular-nums">
              {{ analyticsData.kpi.avg_items_per_order || 0 }}
            </span>
            <span class="text-[10px] text-muted-foreground font-normal block mt-0.5">
              {{ $t('analytics_kpi_avg_items_desc') }}
            </span>
          </div>
        </div>

        <!-- Lost Sales (Cancelled) -->
        <div class="p-4 bg-card border border-border/80 rounded-3xl shadow-xs flex flex-col justify-between transition-all hover:shadow-md">
          <div class="flex items-center justify-between">
            <span class="text-[11px] font-medium text-muted-foreground">{{ $t('analytics_kpi_lost_sales') }}</span>
            <span class="w-7 h-7 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center text-xs font-bold">
              <XCircle class="w-3.5 h-3.5" />
            </span>
          </div>
          <div class="mt-3">
            <span class="text-xl sm:text-2xl font-bold text-rose-600 dark:text-rose-400 tabular-nums">
              ฿{{ (analyticsData.kpi.lost_cancelled_sales || 0).toLocaleString('th-TH') }}
            </span>
            <span class="text-[10px] text-muted-foreground font-normal block mt-0.5">
              {{ $t('analytics_kpi_lost_desc', { count: analyticsData.order_status.cancelled_orders }) }}
            </span>
          </div>
        </div>

      </div>

      <!-- 2. SALES REVENUE & VOLUME TREND CHART -->
      <div class="p-5 sm:p-6 bg-card border border-border/80 rounded-3xl shadow-xs">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
          <div>
            <h2 class="text-base sm:text-lg font-bold text-foreground flex items-center gap-2">
              <span>{{ $t('analytics_sales_trend_title') }}</span>
              <span class="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-primary/10 text-primary">
                {{ periodLabels[activePeriod][locale as 'th' | 'en' | 'zh'] || periodLabels[activePeriod].th }}
              </span>
            </h2>
            <p class="text-xs text-muted-foreground mt-0.5 font-normal">
              {{ $t('analytics_sales_trend_desc') }}
            </p>
          </div>

          <!-- Tooltip Preview when Hovering -->
          <div v-if="hoveredBar" class="text-xs font-semibold text-primary bg-primary/10 px-3 py-1.5 rounded-xl border border-primary/20 animate-in fade-in duration-150">
            <span>📅 {{ hoveredBar.display_date }}: </span>
            <span class="font-bold">฿{{ hoveredBar.sales.toLocaleString('th-TH') }}</span>
            <span class="text-muted-foreground ml-1">({{ $t('analytics_unit_bills', { count: hoveredBar.order_count }) }})</span>
          </div>
        </div>

        <!-- Bar Chart Visualizer -->
        <div v-if="analyticsData.daily_sales.length > 0" class="h-64 sm:h-72 w-full flex items-end gap-1 sm:gap-3 pt-6 pb-2 border-b border-border/60">
          <div 
            v-for="(day, idx) in analyticsData.daily_sales" 
            :key="idx"
            class="flex-1 flex flex-col items-center h-full justify-end group relative cursor-pointer"
            @mouseenter="hoveredBar = day"
            @mouseleave="hoveredBar = null"
          >
            <!-- Hover Tooltip Box -->
            <div class="absolute -top-12 z-20 hidden group-hover:flex flex-col items-center bg-popover text-popover-foreground border shadow-md px-2.5 py-1 rounded-xl text-[11px] whitespace-nowrap pointer-events-none">
              <span class="font-semibold">{{ day.display_date }}</span>
              <span class="text-primary font-bold">฿{{ day.sales.toLocaleString('th-TH') }}</span>
              <span class="text-muted-foreground text-[9px]">{{ $t('analytics_unit_bills', { count: day.order_count }) }}</span>
            </div>

            <!-- Bar Column -->
            <div 
              class="w-full max-w-[40px] rounded-t-xl transition-all duration-300 group-hover:opacity-80"
              :class="day.sales > 0 ? 'bg-gradient-to-t from-primary/80 to-primary shadow-xs' : 'bg-muted/40 min-h-[4px]'"
              :style="{ height: `${Math.max(4, Math.round((day.sales / maxDailySales) * 100))}%` }"
            ></div>

            <!-- X-axis Label -->
            <span class="text-[10px] text-muted-foreground mt-2 truncate w-full text-center group-hover:text-foreground font-normal">
              {{ day.display_date }}
            </span>
          </div>
        </div>

        <div v-else class="h-48 flex items-center justify-center text-xs text-muted-foreground">
          {{ $t('analytics_empty_sales') }}
        </div>
      </div>

      <!-- 3. DETAILED DAILY BREAKDOWN TABLE (ตารางแจกแจงรายวันอย่างละเอียด) -->
      <div v-if="analyticsData.daily_sales.length > 0" class="p-5 sm:p-6 bg-card border border-border/80 rounded-3xl shadow-xs space-y-4">
        <div class="flex items-center justify-between">
          <div>
            <h3 class="text-base font-bold text-foreground flex items-center gap-2">
              <TableIcon class="w-4 h-4 text-primary" />
              <span>{{ $t('analytics_daily_table_title') }}</span>
            </h3>
            <p class="text-xs text-muted-foreground mt-0.5 font-normal">
              {{ $t('analytics_daily_table_desc') }}
            </p>
          </div>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs">
            <thead class="bg-muted/40 border-b border-border/80 text-muted-foreground font-semibold">
              <tr>
                <th class="py-3 px-4">{{ $t('analytics_col_date') }}</th>
                <th class="py-3 px-4">{{ $t('analytics_col_day') }}</th>
                <th class="py-3 px-4 text-right">{{ $t('analytics_col_sales') }}</th>
                <th class="py-3 px-4 text-center">{{ $t('analytics_col_orders_count') }}</th>
                <th class="py-3 px-4 text-center">{{ $t('analytics_col_dishes_count') }}</th>
                <th class="py-3 px-4 text-right">{{ $t('analytics_col_avg_bill') }}</th>
                <th class="py-3 px-4 text-center">{{ $t('analytics_col_channels') }}</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-border/60">
              <tr 
                v-for="(day, idx) in analyticsData.daily_sales" 
                :key="idx"
                class="hover:bg-muted/20 transition-colors"
              >
                <td class="py-3 px-4 font-medium text-foreground whitespace-nowrap">
                  {{ day.sale_date }}
                </td>
                <td class="py-3 px-4 text-muted-foreground whitespace-nowrap">
                  {{ day.day_name || day.display_date }}
                </td>
                <td class="py-3 px-4 text-right font-bold text-primary tabular-nums whitespace-nowrap">
                  ฿{{ day.sales.toLocaleString('th-TH') }}
                </td>
                <td class="py-3 px-4 text-center font-medium text-foreground tabular-nums whitespace-nowrap">
                  {{ $t('analytics_unit_bills', { count: day.order_count }) }}
                </td>
                <td class="py-3 px-4 text-center text-muted-foreground tabular-nums whitespace-nowrap">
                  {{ $t('analytics_unit_dishes', { count: day.items_count || 0 }) }}
                </td>
                <td class="py-3 px-4 text-right text-muted-foreground tabular-nums whitespace-nowrap">
                  ฿{{ (day.avg_order_value || 0).toLocaleString('th-TH') }}
                </td>
                <td class="py-3 px-4 text-center text-muted-foreground whitespace-nowrap">
                  🪑 {{ day.dinein_count || 0 }} / 🥡 {{ day.takeaway_count || 0 }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- 4. MENU ITEMS SALES BREAKDOWN (ตารางยอดขายทุกเมนูอาหาร) -->
      <div class="p-5 sm:p-6 bg-card border border-border/80 rounded-3xl shadow-xs space-y-4">
        <div>
          <h3 class="text-base sm:text-lg font-bold text-foreground flex items-center gap-2">
            <Award class="w-4 h-4 text-amber-500" />
            <span>{{ $t('analytics_top_menu_title') }}</span>
          </h3>
          <p class="text-xs text-muted-foreground mt-0.5 font-normal">
            {{ $t('analytics_top_menu_desc') }}
          </p>
        </div>

        <div v-if="analyticsData.top_items.length > 0" class="overflow-x-auto">
          <table class="w-full text-left text-xs">
            <thead class="bg-muted/40 border-b border-border/80 text-muted-foreground font-semibold">
              <tr>
                <th class="py-3 px-3 text-center w-12">{{ $t('analytics_col_rank') }}</th>
                <th class="py-3 px-4">{{ $t('analytics_col_dish') }}</th>
                <th class="py-3 px-4 text-center">{{ $t('analytics_col_qty') }}</th>
                <th class="py-3 px-4 text-right">{{ $t('analytics_col_sales') }}</th>
                <th class="py-3 px-4 text-right w-36">{{ $t('analytics_col_share') }}</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-border/60">
              <tr 
                v-for="(item, idx) in analyticsData.top_items" 
                :key="idx"
                class="hover:bg-muted/20 transition-colors"
              >
                <!-- Rank Badge -->
                <td class="py-3.5 px-3 text-center">
                  <span 
                    v-if="idx === 0" 
                    class="w-6 h-6 rounded-full bg-amber-500 text-white font-bold text-xs inline-flex items-center justify-center shadow-2xs"
                  >
                    1
                  </span>
                  <span 
                    v-else-if="idx === 1" 
                    class="w-6 h-6 rounded-full bg-slate-400 text-white font-bold text-xs inline-flex items-center justify-center shadow-2xs"
                  >
                    2
                  </span>
                  <span 
                    v-else-if="idx === 2" 
                    class="w-6 h-6 rounded-full bg-amber-700 text-white font-bold text-xs inline-flex items-center justify-center shadow-2xs"
                  >
                    3
                  </span>
                  <span v-else class="text-muted-foreground font-medium text-xs">
                    {{ idx + 1 }}
                  </span>
                </td>

                <!-- Dish Name (Multilingual) -->
                <td class="py-3.5 px-4 font-medium text-foreground">
                  <div>
                    <span>{{ getItemName(item) }}</span>
                    <span v-if="getItemSubName(item)" class="text-[10px] text-muted-foreground font-normal block sm:inline sm:ml-1">
                      ({{ getItemSubName(item) }})
                    </span>
                  </div>
                </td>

                <!-- Quantity Sold -->
                <td class="py-3.5 px-4 text-center font-semibold text-foreground tabular-nums">
                  {{ $t('analytics_unit_dishes', { count: item.quantity_sold }) }}
                </td>

                <!-- Total Sales -->
                <td class="py-3.5 px-4 text-right font-bold text-primary tabular-nums">
                  ฿{{ item.total_sales.toLocaleString('th-TH') }}
                </td>

                <!-- Share % Progress -->
                <td class="py-3.5 px-4 text-right">
                  <div class="flex items-center justify-end gap-2">
                    <div class="w-16 bg-muted rounded-full h-1.5 overflow-hidden">
                      <div class="bg-primary h-full rounded-full" :style="{ width: `${Math.min(100, (item.percentage || 0))}%` }"></div>
                    </div>
                    <span class="text-[11px] font-semibold text-muted-foreground tabular-nums">
                      {{ item.percentage || 0 }}%
                    </span>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div v-else class="py-12 text-center text-xs text-muted-foreground">
          {{ $t('analytics_empty_dishes') }}
        </div>
      </div>

      <!-- 5. OPERATIONAL BREAKDOWN (CHANNELS & PREFERENCES) -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        <!-- Dining Channel Breakdown -->
        <div class="p-5 sm:p-6 bg-card border border-border/80 rounded-3xl shadow-xs space-y-4">
          <h3 class="text-sm font-bold text-foreground flex items-center gap-2">
            <UtensilsCrossed class="w-4 h-4 text-primary" />
            <span>{{ $t('analytics_channels_title') }}</span>
          </h3>

          <div class="space-y-3 pt-1">
            <div class="p-3 bg-muted/20 border border-border/60 rounded-2xl space-y-1.5">
              <div class="flex justify-between text-xs">
                <span class="font-medium text-foreground">{{ $t('analytics_channel_dinein') }}</span>
                <span class="font-bold text-foreground">฿{{ (analyticsData.dining_types?.dinein.sales || 0).toLocaleString('th-TH') }}</span>
              </div>
              <div class="text-[10px] text-muted-foreground flex justify-between">
                <span>{{ $t('analytics_unit_bills', { count: analyticsData.dining_types?.dinein.count || 0 }) }}</span>
                <span>{{ analyticsData.dining_types?.dinein.percentage || 0 }}%</span>
              </div>
            </div>

            <div class="p-3 bg-muted/20 border border-border/60 rounded-2xl space-y-1.5">
              <div class="flex justify-between text-xs">
                <span class="font-medium text-foreground">{{ $t('analytics_channel_takeaway') }}</span>
                <span class="font-bold text-foreground">฿{{ (analyticsData.dining_types?.takeaway.sales || 0).toLocaleString('th-TH') }}</span>
              </div>
              <div class="text-[10px] text-muted-foreground flex justify-between">
                <span>{{ $t('analytics_unit_bills', { count: analyticsData.dining_types?.takeaway.count || 0 }) }}</span>
                <span>{{ analyticsData.dining_types?.takeaway.percentage || 0 }}%</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Spiciness Preference Breakdown -->
        <div class="p-5 sm:p-6 bg-card border border-border/80 rounded-3xl shadow-xs space-y-4">
          <h3 class="text-sm font-bold text-foreground flex items-center gap-2">
            <Flame class="w-4 h-4 text-rose-500" />
            <span>{{ $t('analytics_spice_title') }}</span>
          </h3>

          <div class="space-y-2 pt-1 text-xs">
            <div class="flex justify-between items-center p-2 bg-muted/20 rounded-xl">
              <span>{{ $t('analytics_spice_level_0') }}</span>
              <span class="font-bold text-foreground">{{ $t('analytics_unit_dishes', { count: analyticsData.spice_distribution?.['0'] || 0 }) }}</span>
            </div>
            <div class="flex justify-between items-center p-2 bg-muted/20 rounded-xl">
              <span>{{ $t('analytics_spice_level_1') }}</span>
              <span class="font-bold text-foreground">{{ $t('analytics_unit_dishes', { count: analyticsData.spice_distribution?.['1'] || 0 }) }}</span>
            </div>
            <div class="flex justify-between items-center p-2 bg-muted/20 rounded-xl">
              <span>{{ $t('analytics_spice_level_2') }}</span>
              <span class="font-bold text-foreground">{{ $t('analytics_unit_dishes', { count: analyticsData.spice_distribution?.['2'] || 0 }) }}</span>
            </div>
            <div class="flex justify-between items-center p-2 bg-muted/20 rounded-xl">
              <span>{{ $t('analytics_spice_level_3') }}</span>
              <span class="font-bold text-foreground">{{ $t('analytics_unit_dishes', { count: analyticsData.spice_distribution?.['3'] || 0 }) }}</span>
            </div>
          </div>
        </div>

        <!-- Top Add-ons Breakdown -->
        <div class="p-5 sm:p-6 bg-card border border-border/80 rounded-3xl shadow-xs space-y-4">
          <h3 class="text-sm font-bold text-foreground flex items-center gap-2">
            <Plus class="w-4 h-4 text-primary" />
            <span>{{ $t('analytics_addons_title') }}</span>
          </h3>

          <div v-if="analyticsData.top_addons && analyticsData.top_addons.length > 0" class="space-y-2 pt-1 text-xs">
            <div 
              v-for="(addon, aIdx) in analyticsData.top_addons" 
              :key="aIdx"
              class="flex justify-between items-center p-2 bg-muted/20 rounded-xl"
            >
              <span class="truncate">
                <span>{{ getAddonName(addon) }}</span>
                <span v-if="getAddonSubName(addon)" class="text-[10px] text-muted-foreground ml-1 font-normal">({{ getAddonSubName(addon) }})</span>
              </span>
              <span class="font-bold text-foreground shrink-0 ml-2 tabular-nums">{{ $t('analytics_unit_times', { count: addon.count }) }}</span>
            </div>
          </div>
          <div v-else class="py-6 text-center text-xs text-muted-foreground">
            {{ $t('analytics_addons_empty') }}
          </div>
        </div>

      </div>

      <!-- 6. HOURLY BREAKDOWN TABLE (สถิติแจกแจงรายชั่วโมง) -->
      <div v-if="analyticsData.hourly_sales && analyticsData.hourly_sales.length > 0" class="p-5 sm:p-6 bg-card border border-border/80 rounded-3xl shadow-xs space-y-4">
        <h3 class="text-base font-bold text-foreground flex items-center gap-2">
          <Clock class="w-4 h-4 text-primary" />
          <span>{{ $t('analytics_hourly_title') }}</span>
        </h3>

        <div class="grid grid-cols-3 sm:grid-cols-6 lg:grid-cols-8 gap-2.5">
          <div 
            v-for="h in analyticsData.hourly_sales" 
            :key="h.hour"
            class="p-3 bg-muted/20 border border-border/60 rounded-2xl text-center"
            :class="{ 'border-primary/40 bg-primary/5': h.sales > 0 }"
          >
            <span class="text-xs font-semibold text-foreground block">{{ h.display }}</span>
            <span class="text-xs font-bold text-primary block mt-1 tabular-nums">฿{{ h.sales.toLocaleString('th-TH') }}</span>
            <span class="text-[10px] text-muted-foreground block">{{ $t('analytics_unit_bills', { count: h.count }) }}</span>
          </div>
        </div>
      </div>

    </div>

  </div>
</template>
