<script setup lang="ts">
import {
  FileSpreadsheet,
  RefreshCw,
  TrendingUp,
  ShoppingBag,
  Utensils,
  XCircle,
  Clock,
  Award,
  AlertCircle,
  Table as TableIcon,
  Flame,
  Plus,
  UtensilsCrossed,
  Layers,
  PieChart,
  Search,
  Sparkles,
  Zap,
  Wallet,
  ArrowLeft,
  Filter,
  ArrowUpDown,
  LayoutGrid,
  List,
  ChevronRight,
  Calendar
} from 'lucide-vue-next'

definePageMeta({
  layout: 'merchant',
  middleware: 'auth'
})

const { t, locale } = useI18n()

type PeriodType = 'today' | '7days' | 'month' | 'year'
type MetricType = 'sales' | 'orders' | 'items'
type ViewType = 'overview' | 'best_sellers' | 'daily_breakdown'

interface DailySale {
  sale_date: string;
  display_date: string;
  day_name?: string;
  sales: number;
  order_count: number;
  items_count?: number;
  avg_order_value?: number;
  dinein_count?: number;
  takeaway_count?: number;
  dinein_sales?: number;
  takeaway_sales?: number;
}

interface TopItem {
  name_th: string;
  name_en: string;
  name_zh: string;
  category_name?: string;
  category_name_th?: string;
  category_name_en?: string;
  category_name_zh?: string;
  quantity_sold: number;
  total_sales: number;
  avg_price?: number;
  percentage?: number;
}

interface CategorySale {
  category_id: string;
  name_th: string;
  name_en: string;
  name_zh: string;
  sales: number;
  quantity_sold: number;
  percentage: number;
}

interface AddonStat {
  name_th: string;
  name_en: string;
  name_zh: string;
  name: string;
  count: number;
  sales?: number;
}

interface HourlyStat {
  hour: number;
  display: string;
  sales: number;
  count: number;
}

interface AnalyticsData {
  period: PeriodType;
  start_time: string;
  end_time: string;
  kpi: {
    total_sales: number;
    total_orders: number;
    total_items_sold: number;
    avg_order_value: number;
    avg_items_per_order?: number;
    lost_cancelled_sales?: number;
    completion_rate?: number;
    peak_hour?: { hour: number; display: string; sales: number; count: number };
  };
  order_status: {
    total_orders: number;
    completed_orders: number;
    pending_orders: number;
    cancelled_orders: number;
  };
  dining_types: {
    dinein: { sales: number; count: number; percentage: number; avg_ticket?: number };
    takeaway: { sales: number; count: number; percentage: number; avg_ticket?: number };
  };
  category_sales: CategorySale[];
  meal_periods: {
    breakfast: { sales: number; count: number; percentage: number };
    lunch: { sales: number; count: number; percentage: number };
    afternoon: { sales: number; count: number; percentage: number };
    dinner: { sales: number; count: number; percentage: number };
    night: { sales: number; count: number; percentage: number };
  };
  ticket_tiers: {
    under_100: { label: string; count: number; sales: number; percentage: number };
    tier_100_299: { label: string; count: number; sales: number; percentage: number };
    tier_300_599: { label: string; count: number; sales: number; percentage: number };
    tier_600_plus: { label: string; count: number; sales: number; percentage: number };
  };
  hourly_sales: HourlyStat[];
  top_addons: AddonStat[];
  spice_distribution: Record<string, number>;
  daily_sales: DailySale[];
  top_items: TopItem[];
}

const activePeriod = ref<PeriodType>('today')
const activeMetric = ref<MetricType>('sales')
const activeView = ref<ViewType>('overview')
const loading = ref(false)
const errorMessage = ref('')
const { store, fetchStore } = useCurrentStore()

// Sub-view Filter & Sort States
const menuSearchQuery = ref('')
const menuCategoryFilter = ref('all')
const menuSortBy = ref<'revenue_desc' | 'qty_desc' | 'price_desc' | 'share_desc'>('revenue_desc')
const menuViewMode = ref<'table' | 'cards'>('cards')

const dailySearchQuery = ref('')
const dailyChannelFilter = ref<'all' | 'sales_only' | 'dinein' | 'takeaway'>('all')
const dailySortBy = ref<'date_desc' | 'date_asc' | 'sales_desc' | 'orders_desc' | 'aov_desc'>('date_desc')
const dailyViewMode = ref<'table' | 'cards'>('cards')

const defaultData: AnalyticsData = {
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
    completion_rate: 100,
    peak_hour: { hour: 12, display: '12:00', sales: 0, count: 0 }
  },
  order_status: {
    total_orders: 0,
    completed_orders: 0,
    pending_orders: 0,
    cancelled_orders: 0
  },
  dining_types: {
    dinein: { sales: 0, count: 0, percentage: 0, avg_ticket: 0 },
    takeaway: { sales: 0, count: 0, percentage: 0, avg_ticket: 0 }
  },
  category_sales: [],
  meal_periods: {
    breakfast: { sales: 0, count: 0, percentage: 0 },
    lunch: { sales: 0, count: 0, percentage: 0 },
    afternoon: { sales: 0, count: 0, percentage: 0 },
    dinner: { sales: 0, count: 0, percentage: 0 },
    night: { sales: 0, count: 0, percentage: 0 }
  },
  ticket_tiers: {
    under_100: { label: '< ฿100', count: 0, sales: 0, percentage: 0 },
    tier_100_299: { label: '฿100 - ฿299', count: 0, sales: 0, percentage: 0 },
    tier_300_599: { label: '฿300 - ฿599', count: 0, sales: 0, percentage: 0 },
    tier_600_plus: { label: '฿600+', count: 0, sales: 0, percentage: 0 }
  },
  hourly_sales: [],
  top_addons: [],
  spice_distribution: { '0': 0, '1': 0, '2': 0, '3': 0 },
  daily_sales: [],
  top_items: []
}

const analyticsData = ref<AnalyticsData>({ ...defaultData })

const client = useSupabaseClient()
let analyticsRealtimeChannel: any = null

const fetchAnalytics = async () => {
  if (!store.value?.id) {
    await fetchStore()
  }
  const currentStoreId = store.value?.id
  if (!currentStoreId) {
    loading.value = false
    return
  }

  loading.value = true
  errorMessage.value = ''
  try {
    const { data: sessionData } = await client.auth.getSession()
    const token = sessionData?.session?.access_token
    const headers: Record<string, string> = {
      ...(useRequestHeaders(['cookie']) as Record<string, string>)
    }
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    const res: any = await $fetch(`/api/merchant/analytics?period=${activePeriod.value}&storeId=${currentStoreId}`, {
      headers
    })
    if (res && res.success && res.data) {
      analyticsData.value = res.data
    }
  } catch (err: any) {
    console.error('Fetch Analytics Error:', err)
    errorMessage.value = err.data?.message || err.message || 'ไม่สามารถโหลดข้อมูลสถิติได้'
  } finally {
    loading.value = false
  }
}

const setPeriod = (p: PeriodType) => {
  activePeriod.value = p
  fetchAnalytics()
}

onMounted(async () => {
  if (!store.value?.id) {
    await fetchStore()
  }
  await fetchAnalytics()

  if (store.value?.id) {
    analyticsRealtimeChannel = client.channel(`analytics-orders-${store.value.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders', filter: `store_id=eq.${store.value.id}` },
        () => {
          fetchAnalytics()
        }
      )
      .subscribe()
  }
})

onUnmounted(() => {
  if (analyticsRealtimeChannel) {
    client.removeChannel(analyticsRealtimeChannel)
  }
})

watch(() => store.value?.id, (newId) => {
  if (newId) {
    fetchAnalytics()
  }
})

// Max Values for Visual Progress Bars
const maxDailySales = computed(() => {
  if (!analyticsData.value.daily_sales || analyticsData.value.daily_sales.length === 0) return 1
  return Math.max(...analyticsData.value.daily_sales.map(d => d.sales), 1)
})

const maxHourlySales = computed(() => {
  if (!analyticsData.value.hourly_sales || analyticsData.value.hourly_sales.length === 0) return 1
  return Math.max(...analyticsData.value.hourly_sales.map(h => h.sales), 1)
})

// Dynamic Chart Bar Heights
const getBarHeight = (day: DailySale) => {
  let val = 0
  let max = 1
  if (activeMetric.value === 'sales') {
    val = day.sales
    max = maxDailySales.value
  } else if (activeMetric.value === 'orders') {
    val = day.order_count
    max = Math.max(...analyticsData.value.daily_sales.map(d => d.order_count), 1)
  } else {
    val = day.items_count || 0
    max = Math.max(...analyticsData.value.daily_sales.map(d => d.items_count || 0), 1)
  }
  if (max === 0 || val === 0) return '6px'
  const pct = Math.max(6, Math.round((val / max) * 55))
  return `${pct}%`
}

const getHourlyBarHeight = (h: HourlyStat) => {
  if (!maxHourlySales.value || maxHourlySales.value === 0 || h.sales === 0) return '4px'
  const pct = Math.max(6, Math.round((h.sales / maxHourlySales.value) * 50))
  return `${pct}%`
}

const getMetricValueDisplay = (day: DailySale) => {
  if (activeMetric.value === 'sales') return `฿${day.sales.toLocaleString('th-TH')}`
  if (activeMetric.value === 'orders') return `${day.order_count} บิล`
  return `${day.items_count || 0} จาน`
}

// Trend Stats (Best, Lowest, Avg)
const trendStats = computed(() => {
  const days = analyticsData.value.daily_sales.filter(d => d.sales > 0)
  if (!days || days.length === 0) return null

  const sorted = [...days].sort((a, b) => b.sales - a.sales)
  const bestDay = sorted[0]
  const lowestDay = sorted[sorted.length - 1]
  const avgSales = Math.round(analyticsData.value.kpi.total_sales / (days.length || 1))

  if (!bestDay || !lowestDay) return null

  return {
    bestDay,
    lowestDay,
    avgSales
  }
})

// Category Multilingual Translation Dictionary
const categoryDictionary: Record<string, { th: string; en: string; zh: string }> = {
  '⭐ เมนูแนะนำ (signatures)': { th: '⭐ เมนูแนะนำ', en: '⭐ Signatures', zh: '⭐ 招牌推荐' },
  'เมนูแนะนำ (signatures)': { th: '⭐ เมนูแนะนำ', en: '⭐ Signatures', zh: '⭐ 招牌推荐' },
  '⭐ เมนูแนะนำ': { th: '⭐ เมนูแนะนำ', en: '⭐ Signatures', zh: '⭐ 招牌推荐' },
  'เมนูแนะนำ': { th: '⭐ เมนูแนะนำ', en: '⭐ Signatures', zh: '⭐ 招牌推荐' },
  'signatures': { th: '⭐ เมนูแนะนำ', en: '⭐ Signatures', zh: '⭐ 招牌推荐' },
  '🥤 เครื่องดื่ม & ของหวาน': { th: '🥤 เครื่องดื่ม & ของหวาน', en: '🥤 Drinks & Desserts', zh: '🥤 饮品与甜品' },
  'เครื่องดื่ม & ของหวาน': { th: '🥤 เครื่องดื่ม & ของหวาน', en: '🥤 Drinks & Desserts', zh: '🥤 饮品与甜品' },
  'เครื่องดื่ม': { th: 'เครื่องดื่ม', en: 'Beverages', zh: '饮品' },
  'ของหวาน': { th: 'ของหวาน', en: 'Desserts', zh: '甜品' },
  '🍲 ต้ม & แกงไทยรสแซ่บ': { th: '🍲 ต้ม & แกงไทย', en: '🍲 Soups & Curries', zh: '🍲 泰式热汤与咖喱' },
  'ต้ม & แกงไทยรสแซ่บ': { th: '🍲 ต้ม & แกงไทย', en: '🍲 Soups & Curries', zh: '🍲 泰式热汤与咖喱' },
  'ต้ม & แกงไทย': { th: '🍲 ต้ม & แกงไทย', en: '🍲 Soups & Curries', zh: '🍲 泰式热汤与咖喱' },
  '🍲 อาหารจานเดียว & เส้น': { th: '🍲 อาหารจานเดียว & เส้น', en: '🍲 One-Dish & Noodles', zh: '🍲 简餐与面食' },
  'อาหารจานเดียว & เส้น': { th: '🍲 อาหารจานเดียว & เส้น', en: '🍲 One-Dish & Noodles', zh: '🍲 简餐与面食' },
  '🥗 ยำ & ส้มตำ & ของทานเล่น': { th: '🥗 ยำ & ส้มตำ & ของทานเล่น', en: '🥗 Salads & Appetizers', zh: '🥗 凉拌沙拉与小吃' },
  'ยำ & ส้มตำ & ของทานเล่น': { th: '🥗 ยำ & ส้มตำ & ของทานเล่น', en: '🥗 Salads & Appetizers', zh: '🥗 凉拌沙拉与小吃' },
  'อาหารคลีน': { th: 'อาหารคลีน', en: 'Clean Food', zh: '清食健康餐' },
  'clean food': { th: 'อาหารคลีน', en: 'Clean Food', zh: '清食健康餐' },
  'เมนูเส้น': { th: 'เมนูเส้น', en: 'Noodles', zh: '面食料理' },
  'ผัดไทย': { th: 'ผัดไทย', en: 'Pad Thai', zh: '泰式炒河粉' },
  'อาหารทั่วไป': { th: 'อาหารทั่วไป', en: 'General', zh: '常规菜品' }
}

const getCategoryDisplayName = (item: TopItem) => {
  const currentLang = locale.value
  const rawTh = (item.category_name_th || item.category_name || '').trim().toLowerCase()
  
  if (currentLang === 'zh') {
    if (item.category_name_zh && item.category_name_zh !== '常规' && item.category_name_zh !== '常规菜品') {
      return item.category_name_zh
    }
    return categoryDictionary[rawTh]?.zh || item.category_name_zh || item.category_name || '常规'
  }
  if (currentLang === 'en') {
    if (item.category_name_en && item.category_name_en !== 'General') {
      return item.category_name_en
    }
    return categoryDictionary[rawTh]?.en || item.category_name_en || item.category_name || 'General'
  }
  return categoryDictionary[rawTh]?.th || item.category_name_th || item.category_name || 'ทั่วไป'
}

const getCategoryName = (cat: CategorySale) => {
  const currentLang = locale.value
  const rawTh = (cat.name_th || '').trim().toLowerCase()

  if (currentLang === 'zh') {
    if (cat.name_zh && cat.name_zh !== '常规' && cat.name_zh !== '常规菜品') return cat.name_zh
    return categoryDictionary[rawTh]?.zh || cat.name_zh || cat.name_th
  }
  if (currentLang === 'en') {
    if (cat.name_en && cat.name_en !== 'General') return cat.name_en
    return categoryDictionary[rawTh]?.en || cat.name_en || cat.name_th
  }
  return categoryDictionary[rawTh]?.th || cat.name_th || 'ทั่วไป'
}

const getItemName = (item: TopItem | CategorySale) => {
  if (locale.value === 'zh') {
    return item.name_zh || item.name_en || item.name_th
  }
  if (locale.value === 'en') {
    return item.name_en || item.name_th
  }
  return item.name_th
}

const getItemSubName = (item: TopItem | CategorySale) => {
  if (locale.value === 'th') {
    return item.name_en || ''
  }
  return item.name_th || ''
}

// Category List for Best Sellers Filter Dropdown
const availableCategories = computed(() => {
  const set = new Set<string>()
  analyticsData.value.top_items.forEach(i => {
    const cat = i.category_name_th || i.category_name || ''
    if (cat) set.add(cat)
  })
  return Array.from(set)
})

// Filtered & Sorted Menu Items (Best Sellers View)
const filteredTopItems = computed(() => {
  let list = [...analyticsData.value.top_items]
  
  // Category filter
  if (menuCategoryFilter.value !== 'all') {
    list = list.filter(i => (i.category_name_th || i.category_name) === menuCategoryFilter.value)
  }

  // Search query
  const q = menuSearchQuery.value.trim().toLowerCase()
  if (q) {
    list = list.filter(item => {
      return (
        (item.name_th && item.name_th.toLowerCase().includes(q)) ||
        (item.name_en && item.name_en.toLowerCase().includes(q)) ||
        (item.name_zh && item.name_zh.toLowerCase().includes(q)) ||
        (item.category_name && item.category_name.toLowerCase().includes(q))
      )
    })
  }

  // Sorting
  if (menuSortBy.value === 'revenue_desc') {
    list.sort((a, b) => b.total_sales - a.total_sales)
  } else if (menuSortBy.value === 'qty_desc') {
    list.sort((a, b) => b.quantity_sold - a.quantity_sold)
  } else if (menuSortBy.value === 'price_desc') {
    list.sort((a, b) => (b.avg_price || 0) - (a.avg_price || 0))
  } else if (menuSortBy.value === 'share_desc') {
    list.sort((a, b) => (b.percentage || 0) - (a.percentage || 0))
  }

  return list
})

// Filtered & Sorted Daily Breakdown Items (Daily Sales View)
const filteredDailySales = computed(() => {
  let list = [...analyticsData.value.daily_sales]

  // Channel filter
  if (dailyChannelFilter.value === 'sales_only') {
    list = list.filter(d => d.sales > 0)
  } else if (dailyChannelFilter.value === 'dinein') {
    list = list.filter(d => (d.dinein_sales || 0) > (d.takeaway_sales || 0))
  } else if (dailyChannelFilter.value === 'takeaway') {
    list = list.filter(d => (d.takeaway_sales || 0) > (d.dinein_sales || 0))
  }

  // Search query
  const q = dailySearchQuery.value.trim().toLowerCase()
  if (q) {
    list = list.filter(d => {
      return (
        d.sale_date.toLowerCase().includes(q) ||
        d.display_date.toLowerCase().includes(q) ||
        (d.day_name && d.day_name.toLowerCase().includes(q))
      )
    })
  }

  // Sorting
  if (dailySortBy.value === 'date_desc') {
    list.sort((a, b) => b.sale_date.localeCompare(a.sale_date))
  } else if (dailySortBy.value === 'date_asc') {
    list.sort((a, b) => a.sale_date.localeCompare(b.sale_date))
  } else if (dailySortBy.value === 'sales_desc') {
    list.sort((a, b) => b.sales - a.sales)
  } else if (dailySortBy.value === 'orders_desc') {
    list.sort((a, b) => b.order_count - a.order_count)
  } else if (dailySortBy.value === 'aov_desc') {
    list.sort((a, b) => (b.avg_order_value || 0) - (a.avg_order_value || 0))
  }

  return list
})

// Unified Single Smart Export Handler
const handleSmartExportCsv = () => {
  const storeName = store.value?.name || 'Store'
  const periodLabel = activePeriod.value

  if (activeView.value === 'best_sellers') {
    let csv = `\uFEFF`
    csv += `รายงานเมนูขายดีประจำร้าน (Best Sellers Report) - ${storeName}\n`
    csv += `ช่วงเวลา: ${periodLabel}\n\n`
    csv += `อันดับ,ชื่อเมนู (ไทย),ชื่อเมนู (EN),หมวดหมู่,ราคาเฉลี่ย (฿),จำนวนจานที่ขายได้,ยอดขายรวม (฿),สัดส่วนยอดขาย (%)\n`
    filteredTopItems.value.forEach((it, idx) => {
      csv += `${idx + 1},"${it.name_th}","${it.name_en}","${it.category_name_th || it.category_name || '-'}",${it.avg_price || 0},${it.quantity_sold},${it.total_sales},${it.percentage || 0}%\n`
    })
    downloadCsv(csv, `ChiiMenu-BestSellers-${storeName}-${periodLabel}.csv`)
  } else if (activeView.value === 'daily_breakdown') {
    let csv = `\uFEFF`
    csv += `ตารางสรุปสถิติยอดขายรายวัน/รายช่วงเวลา (Daily Breakdown Report) - ${storeName}\n`
    csv += `ช่วงเวลา: ${periodLabel}\n\n`
    csv += `วันที่,วัน,ยอดขายรวม (฿),จำนวนบิล,จำนวนจาน,ยอดเฉลี่ยต่อบิล (฿),ยอดทานที่ร้าน (฿),ยอดกลับบ้าน (฿)\n`
    filteredDailySales.value.forEach(d => {
      csv += `"${d.sale_date}","${d.day_name || '-'}",${d.sales},${d.order_count},${d.items_count || 0},${d.avg_order_value || 0},${d.dinein_sales || 0},${d.takeaway_sales || 0}\n`
    })
    downloadCsv(csv, `ChiiMenu-DailyBreakdown-${storeName}-${periodLabel}.csv`)
  } else {
    // Full Executive BI Report
    const data = analyticsData.value
    let csv = `\uFEFF`
    csv += `รายงานสรุปยอดขายและข้อมูลเชิงลึกธุรกิจ ChiiMenu (Executive BI Report)\n`
    csv += `ร้านค้า: ${storeName}\n`
    csv += `ช่วงเวลา: ${periodLabel} (${data.start_time?.slice(0, 10)} ถึง ${data.end_time?.slice(0, 10)})\n`
    csv += `วันที่ออกรายงาน: ${new Date().toLocaleString('th-TH')}\n\n`
    
    csv += `=== สรุปยอดขายรวม (KPI Summary) ===\n`
    csv += `ยอดขายสุทธิ (฿),${data.kpi.total_sales}\n`
    csv += `จำนวนออเดอร์ที่สำเร็จ,${data.kpi.total_orders}\n`
    csv += `จำนวนจานที่ขายได้,${data.kpi.total_items_sold}\n`
    csv += `ยอดเฉลี่ยต่อบิล (AOV ฿),${data.kpi.avg_order_value}\n`
    csv += `เฉลี่ยจานต่อบิล,${data.kpi.avg_items_per_order || 0}\n\n`
    
    downloadCsv(csv, `ChiiMenu-Full-Report-${storeName}-${periodLabel}.csv`)
  }
}

const downloadCsv = (csvContent: string, fileName: string) => {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.setAttribute('href', url)
  link.setAttribute('download', fileName)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

const periodLabels: Record<PeriodType, { th: string; en: string; zh: string }> = {
  today: { th: 'วันนี้', en: 'Today', zh: '今日' },
  '7days': { th: '7 วันล่าสุด', en: 'Last 7 Days', zh: '近7天' },
  month: { th: 'เดือนนี้', en: 'This Month', zh: '本月' },
  year: { th: 'ปีนี้', en: 'This Year', zh: '今年' }
}
</script>

<template>
  <div class="w-full max-w-full pb-24 overflow-x-hidden space-y-6">
    
    <!-- UNIFIED TOP HEADER: Title, Back Button, Single Period Selector, Single Export & Single Refresh -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card border border-border/80 p-5 sm:p-6 rounded-3xl shadow-xs overflow-hidden">
      
      <!-- Left: Title & Subtitle with Quick Back Button if not in Overview -->
      <div class="flex items-center gap-3.5">
        <!-- Back Button (Shown when not on Overview) -->
        <button 
          v-if="activeView !== 'overview'"
          @click="activeView = 'overview'"
          class="w-11 h-11 rounded-2xl bg-muted/70 hover:bg-muted text-foreground flex items-center justify-center transition-all shadow-2xs shrink-0 cursor-pointer"
          :title="$t('analytics_btn_back_overview')"
        >
          <ArrowLeft class="w-5 h-5" />
        </button>

        <div v-else class="w-11 h-11 rounded-2xl bg-primary/10 text-primary flex items-center justify-center text-xl font-bold shrink-0 shadow-2xs">
          📊
        </div>

        <div>
          <h1 class="text-lg sm:text-xl font-bold text-foreground flex items-center gap-2">
            <span>{{ activeView === 'overview' ? $t('analytics_title') : (activeView === 'best_sellers' ? $t('analytics_nav_best_sellers') : $t('analytics_nav_daily_breakdown')) }}</span>
          </h1>
          <p class="text-xs text-muted-foreground mt-0.5 font-normal">
            {{ activeView === 'overview' ? $t('analytics_desc') : (activeView === 'best_sellers' ? $t('analytics_top_menu_desc') : $t('analytics_daily_table_desc')) }}
          </p>
        </div>
      </div>

      <!-- Right: Single Period Tabs + Single Smart Export + Single Refresh (NO DUPLICATES) -->
      <div class="flex flex-wrap items-center gap-2 sm:gap-2.5 self-start md:self-auto">
        
        <!-- Period Switcher Tabs -->
        <div class="inline-flex p-1 bg-muted/60 rounded-2xl border border-border/60 text-xs font-semibold">
          <button 
            type="button"
            @click="setPeriod('today')"
            :disabled="loading"
            class="px-3.5 py-1.5 rounded-xl transition-all font-medium cursor-pointer"
            :class="activePeriod === 'today' ? 'bg-background text-primary shadow-xs font-bold' : 'text-muted-foreground hover:text-foreground'"
          >
            <span>{{ periodLabels.today[locale as 'th' | 'en' | 'zh'] || periodLabels.today.th }}</span>
          </button>
          <button 
            type="button"
            @click="setPeriod('7days')"
            :disabled="loading"
            class="px-3.5 py-1.5 rounded-xl transition-all font-medium cursor-pointer"
            :class="activePeriod === '7days' ? 'bg-background text-primary shadow-xs font-bold' : 'text-muted-foreground hover:text-foreground'"
          >
            <span>{{ periodLabels['7days'][locale as 'th' | 'en' | 'zh'] || periodLabels['7days'].th }}</span>
          </button>
          <button 
            type="button"
            @click="setPeriod('month')"
            :disabled="loading"
            class="px-3.5 py-1.5 rounded-xl transition-all font-medium cursor-pointer"
            :class="activePeriod === 'month' ? 'bg-background text-primary shadow-xs font-bold' : 'text-muted-foreground hover:text-foreground'"
          >
            <span>{{ periodLabels.month[locale as 'th' | 'en' | 'zh'] || periodLabels.month.th }}</span>
          </button>
          <button 
            type="button"
            @click="setPeriod('year')"
            :disabled="loading"
            class="px-3.5 py-1.5 rounded-xl transition-all font-medium cursor-pointer"
            :class="activePeriod === 'year' ? 'bg-background text-primary shadow-xs font-bold' : 'text-muted-foreground hover:text-foreground'"
          >
            <span>{{ periodLabels.year[locale as 'th' | 'en' | 'zh'] || periodLabels.year.th }}</span>
          </button>
        </div>

        <!-- Single Unified Export CSV Button -->
        <button 
          @click="handleSmartExportCsv"
          :disabled="loading"
          class="px-3.5 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 rounded-2xl text-xs font-semibold transition-all inline-flex items-center gap-1.5 shadow-2xs disabled:opacity-50 cursor-pointer"
          :title="$t('analytics_btn_export_csv')"
        >
          <FileSpreadsheet class="w-4 h-4 text-emerald-600" />
          <span class="hidden sm:inline">{{ $t('analytics_btn_export_csv') }}</span>
        </button>

        <!-- Single Refresh Button -->
        <button 
          @click="fetchAnalytics"
          :disabled="loading"
          class="px-3 py-2 bg-card hover:bg-muted text-foreground border border-border/80 rounded-2xl text-xs font-semibold transition-all inline-flex items-center gap-1.5 shadow-2xs disabled:opacity-50 cursor-pointer"
          :title="$t('analytics_btn_refresh')"
        >
          <RefreshCw class="w-3.5 h-3.5" :class="{ 'animate-spin': loading }" />
          <span class="hidden sm:inline">{{ $t('analytics_btn_refresh') }}</span>
        </button>

      </div>
    </div>

    <!-- MAIN SEGMENTED SUB-VIEW NAVIGATION TABS -->
    <div class="flex items-center gap-2 p-1.5 bg-card border border-border/80 rounded-2xl shadow-xs overflow-x-auto scrollbar-none">
      <button 
        @click="activeView = 'overview'"
        class="flex-1 min-w-[140px] px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
        :class="activeView === 'overview' ? 'bg-primary text-primary-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'"
      >
        <PieChart class="w-4 h-4" />
        <span>{{ $t('analytics_nav_overview') }}</span>
      </button>

      <button 
        @click="activeView = 'best_sellers'"
        class="flex-1 min-w-[150px] px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
        :class="activeView === 'best_sellers' ? 'bg-primary text-primary-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'"
      >
        <Award class="w-4 h-4" />
        <span>{{ $t('analytics_nav_best_sellers') }}</span>
        <span class="px-1.5 py-0.2 rounded-full text-[10px] bg-background/20 font-semibold">
          {{ analyticsData.top_items.length }}
        </span>
      </button>

      <button 
        @click="activeView = 'daily_breakdown'"
        class="flex-1 min-w-[160px] px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
        :class="activeView === 'daily_breakdown' ? 'bg-primary text-primary-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'"
      >
        <TableIcon class="w-4 h-4" />
        <span>{{ $t('analytics_nav_daily_breakdown') }}</span>
      </button>
    </div>

    <!-- Error State Box with Retry -->
    <div v-if="errorMessage" class="p-6 rounded-3xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/50 text-rose-900 dark:text-rose-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 overflow-hidden">
      <div class="flex items-start gap-3">
        <AlertCircle class="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
        <div>
          <h3 class="font-semibold text-sm">{{ $t('analytics_err_load_title') }}</h3>
          <p class="text-xs text-rose-700 dark:text-rose-300 mt-0.5 font-normal">{{ errorMessage }}</p>
        </div>
      </div>
      <button 
        @click="fetchAnalytics"
        class="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold transition-colors inline-flex items-center gap-1.5 self-start sm:self-auto shrink-0 shadow-xs cursor-pointer"
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
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div class="h-64 bg-card border border-border/80 rounded-3xl animate-pulse"></div>
        <div class="h-64 bg-card border border-border/80 rounded-3xl animate-pulse"></div>
      </div>
    </div>

    <!-- MAIN VIEW CONTAINER -->
    <div v-else class="space-y-6">
      
      <!-- ======================================================== -->
      <!-- VIEW 1: EXECUTIVE DASHBOARD & BI OVERVIEW               -->
      <!-- ======================================================== -->
      <div v-if="activeView === 'overview'" class="space-y-6">
        
        <!-- 1. SUMMARY EXECUTIVE KPI CARDS (6 METRICS) -->
        <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
          
          <!-- Net Total Revenue -->
          <div class="p-4 bg-card border border-border/80 rounded-3xl shadow-xs flex flex-col justify-between transition-all hover:shadow-md overflow-hidden relative group">
            <div class="flex items-center justify-between">
              <span class="text-[11px] font-medium text-muted-foreground">{{ $t('analytics_kpi_total_revenue') }}</span>
              <span class="w-7 h-7 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-xs font-bold">
                <Wallet class="w-3.5 h-3.5" />
              </span>
            </div>
            <div class="mt-3">
              <span class="text-xl sm:text-2xl font-bold text-foreground tabular-nums truncate block">
                ฿{{ analyticsData.kpi.total_sales.toLocaleString('th-TH') }}
              </span>
              <span class="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium block mt-0.5">
                {{ $t('analytics_kpi_net_desc') }}
              </span>
            </div>
          </div>

          <!-- Completed Orders -->
          <div class="p-4 bg-card border border-border/80 rounded-3xl shadow-xs flex flex-col justify-between transition-all hover:shadow-md overflow-hidden">
            <div class="flex items-center justify-between">
              <span class="text-[11px] font-medium text-muted-foreground">{{ $t('analytics_kpi_total_orders') }}</span>
              <span class="w-7 h-7 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center text-xs font-bold">
                <ShoppingBag class="w-3.5 h-3.5" />
              </span>
            </div>
            <div class="mt-3">
              <span class="text-xl sm:text-2xl font-bold text-foreground tabular-nums truncate block">
                {{ analyticsData.kpi.total_orders }}
              </span>
              <span class="text-[10px] text-blue-600 dark:text-blue-400 font-medium block mt-0.5">
                {{ $t('analytics_kpi_completion_rate_desc', { rate: analyticsData.kpi.completion_rate || 100 }) }}
              </span>
            </div>
          </div>

          <!-- Average Order Value (AOV) -->
          <div class="p-4 bg-card border border-border/80 rounded-3xl shadow-xs flex flex-col justify-between transition-all hover:shadow-md overflow-hidden">
            <div class="flex items-center justify-between">
              <span class="text-[11px] font-medium text-muted-foreground">{{ $t('analytics_kpi_aov') }}</span>
              <span class="w-7 h-7 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center text-xs font-bold">
                <TrendingUp class="w-3.5 h-3.5" />
              </span>
            </div>
            <div class="mt-3">
              <span class="text-xl sm:text-2xl font-bold text-foreground tabular-nums truncate block">
                ฿{{ analyticsData.kpi.avg_order_value.toLocaleString('th-TH') }}
              </span>
              <span class="text-[10px] text-muted-foreground font-normal block mt-0.5">
                {{ $t('analytics_kpi_aov_desc') }}
              </span>
            </div>
          </div>

          <!-- Total Items Sold -->
          <div class="p-4 bg-card border border-border/80 rounded-3xl shadow-xs flex flex-col justify-between transition-all hover:shadow-md overflow-hidden">
            <div class="flex items-center justify-between">
              <span class="text-[11px] font-medium text-muted-foreground">{{ $t('analytics_kpi_items_sold') }}</span>
              <span class="w-7 h-7 rounded-xl bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">
                <Utensils class="w-3.5 h-3.5" />
              </span>
            </div>
            <div class="mt-3">
              <span class="text-xl sm:text-2xl font-bold text-foreground tabular-nums truncate block">
                {{ analyticsData.kpi.total_items_sold }}
              </span>
              <span class="text-[10px] text-muted-foreground font-normal block mt-0.5">
                {{ $t('analytics_kpi_items_desc') }}
              </span>
            </div>
          </div>

          <!-- Avg Items per Order -->
          <div class="p-4 bg-card border border-border/80 rounded-3xl shadow-xs flex flex-col justify-between transition-all hover:shadow-md overflow-hidden">
            <div class="flex items-center justify-between">
              <span class="text-[11px] font-medium text-muted-foreground">{{ $t('analytics_kpi_avg_items') }}</span>
              <span class="w-7 h-7 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center text-xs font-bold">
                <Layers class="w-3.5 h-3.5" />
              </span>
            </div>
            <div class="mt-3">
              <span class="text-xl sm:text-2xl font-bold text-foreground tabular-nums truncate block">
                {{ analyticsData.kpi.avg_items_per_order || 0 }}
              </span>
              <span class="text-[10px] text-muted-foreground font-normal block mt-0.5">
                {{ $t('analytics_kpi_avg_items_desc') }}
              </span>
            </div>
          </div>

          <!-- Peak Rush Hour -->
          <div class="p-4 bg-card border border-border/80 rounded-3xl shadow-xs flex flex-col justify-between transition-all hover:shadow-md overflow-hidden">
            <div class="flex items-center justify-between">
              <span class="text-[11px] font-medium text-muted-foreground">{{ $t('analytics_kpi_peak_rush') }}</span>
              <span class="w-7 h-7 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center text-xs font-bold">
                <Zap class="w-3.5 h-3.5" />
              </span>
            </div>
            <div class="mt-3">
              <span class="text-xl sm:text-2xl font-bold text-rose-600 dark:text-rose-400 tabular-nums truncate block">
                {{ analyticsData.kpi.peak_hour?.display || '12:00' }}
              </span>
              <span class="text-[10px] text-muted-foreground font-normal block mt-0.5">
                ฿{{ (analyticsData.kpi.peak_hour?.sales || 0).toLocaleString('th-TH') }} • {{ $t('analytics_unit_bills', { count: analyticsData.kpi.peak_hour?.count || 0 }) }}
              </span>
            </div>
          </div>

        </div>

        <!-- 2. MULTI-METRIC SALES TREND VISUALIZER -->
        <div class="p-5 sm:p-6 bg-card border border-border/80 rounded-3xl shadow-xs space-y-4 overflow-hidden">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 class="text-base sm:text-lg font-bold text-foreground flex items-center gap-2">
                <TrendingUp class="w-4 h-4 text-primary" />
                <span>{{ $t('analytics_sales_trend_title') }}</span>
              </h2>
              <p class="text-xs text-muted-foreground mt-0.5 font-normal">
                {{ $t('analytics_sales_trend_desc') }}
              </p>
            </div>

            <!-- Metric Mode Switcher -->
            <div class="inline-flex p-1 bg-muted/60 rounded-2xl border border-border/60 text-xs font-semibold self-start sm:self-auto">
              <button 
                type="button"
                @click="activeMetric = 'sales'"
                class="px-3 py-1.5 rounded-xl transition-all cursor-pointer"
                :class="activeMetric === 'sales' ? 'bg-background text-primary shadow-xs font-bold' : 'text-muted-foreground hover:text-foreground'"
              >
                <span>{{ $t('analytics_metric_revenue') }}</span>
              </button>
              <button 
                type="button"
                @click="activeMetric = 'orders'"
                class="px-3 py-1.5 rounded-xl transition-all cursor-pointer"
                :class="activeMetric === 'orders' ? 'bg-background text-primary shadow-xs font-bold' : 'text-muted-foreground hover:text-foreground'"
              >
                <span>{{ $t('analytics_metric_orders') }}</span>
              </button>
              <button 
                type="button"
                @click="activeMetric = 'items'"
                class="px-3 py-1.5 rounded-xl transition-all cursor-pointer"
                :class="activeMetric === 'items' ? 'bg-background text-primary shadow-xs font-bold' : 'text-muted-foreground hover:text-foreground'"
              >
                <span>{{ $t('analytics_metric_dishes') }}</span>
              </button>
            </div>
          </div>

          <!-- Trend Bar Chart -->
          <div class="w-full overflow-x-auto scrollbar-thin pb-2 pt-4">
            <div 
              class="flex items-end gap-2 sm:gap-3.5 h-48 sm:h-56 px-2"
              :style="{ minWidth: activePeriod === 'month' ? '700px' : (activePeriod === 'year' ? '580px' : '100%') }"
            >
              <div 
                v-for="day in analyticsData.daily_sales" 
                :key="day.sale_date"
                class="flex-1 flex flex-col items-center justify-end h-full group relative cursor-pointer min-w-[20px]"
              >
                <!-- Tooltip Hover Popover (Always floats 8px above the bar, 100% inside container) -->
                <div 
                  class="opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 transform group-hover:-translate-y-1 absolute left-1/2 -translate-x-1/2 z-30 bg-slate-900 dark:bg-slate-950 text-white text-[11px] font-semibold px-3 py-1.5 rounded-xl shadow-xl whitespace-nowrap flex flex-col items-center border border-white/15"
                  :style="{ bottom: `calc(${getBarHeight(day)} + 8px)` }"
                >
                  <span class="text-[10px] text-slate-300 font-medium">{{ day.sale_date }} ({{ day.day_name || '' }})</span>
                  <span class="text-emerald-400 font-bold text-xs">{{ getMetricValueDisplay(day) }}</span>
                  <div class="w-2 h-2 bg-slate-900 dark:bg-slate-950 rotate-45 absolute -bottom-1 left-1/2 -translate-x-1/2 border-r border-b border-white/15"></div>
                </div>

                <!-- Bar Column -->
                <div 
                  class="w-full rounded-t-xl transition-all duration-300 group-hover:opacity-85"
                  :class="day.sales > 0 ? 'bg-primary' : 'bg-muted/40 min-h-[4px]'"
                  :style="{ height: getBarHeight(day) }"
                ></div>

                <!-- X-Axis Labels -->
                <div class="text-center mt-2 w-full">
                  <span class="text-[10px] sm:text-[11px] font-medium text-foreground block truncate">
                    {{ day.display_date }}
                  </span>
                  <span v-if="day.day_name" class="text-[9px] text-muted-foreground block truncate">
                    {{ day.day_name }}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <!-- Quick Statistical Insights Pill Row -->
          <div v-if="trendStats && trendStats.bestDay && trendStats.lowestDay" class="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
            <div class="p-3 bg-muted/20 border border-border/60 rounded-2xl flex items-center justify-between text-xs">
              <span class="text-muted-foreground flex items-center gap-1.5">
                <span>🌟</span>
                <span>{{ $t('analytics_best_selling_day') }}</span>
              </span>
              <span class="font-bold text-foreground">
                {{ trendStats.bestDay.display_date }} (฿{{ trendStats.bestDay.sales.toLocaleString('th-TH') }})
              </span>
            </div>
            <div class="p-3 bg-muted/20 border border-border/60 rounded-2xl flex items-center justify-between text-xs">
              <span class="text-muted-foreground flex items-center gap-1.5">
                <span>📉</span>
                <span>{{ $t('analytics_lowest_selling_day') }}</span>
              </span>
              <span class="font-bold text-foreground">
                {{ trendStats.lowestDay.display_date }} (฿{{ trendStats.lowestDay.sales.toLocaleString('th-TH') }})
              </span>
            </div>
            <div class="p-3 bg-muted/20 border border-border/60 rounded-2xl flex items-center justify-between text-xs">
              <span class="text-muted-foreground flex items-center gap-1.5">
                <span>📊</span>
                <span>{{ $t('analytics_avg_daily_sales') }}</span>
              </span>
              <span class="font-bold text-primary">
                ฿{{ trendStats.avgSales.toLocaleString('th-TH') }} / วัน
              </span>
            </div>
          </div>
        </div>

        <!-- 3. PEAK RUSH HOURS & MEAL PERIODS (2 COLUMNS) -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          <!-- Peak Rush Hours Histogram -->
          <div class="p-5 sm:p-6 bg-card border border-border/80 rounded-3xl shadow-xs space-y-4 overflow-hidden">
            <div>
              <h3 class="text-base font-bold text-foreground flex items-center gap-2">
                <Clock class="w-4 h-4 text-primary" />
                <span>{{ $t('analytics_peak_hours_title') }}</span>
              </h3>
              <p class="text-xs text-muted-foreground mt-0.5 font-normal">
                {{ $t('analytics_peak_hours_desc') }}
              </p>
            </div>

            <!-- Hourly Distribution Chart -->
            <div class="w-full overflow-x-auto scrollbar-thin pb-2 pt-4">
              <div class="flex items-end gap-1.5 sm:gap-2 h-40 px-1 min-w-[500px]">
                <div 
                  v-for="h in analyticsData.hourly_sales" 
                  :key="h.hour"
                  class="flex-1 flex flex-col items-center justify-end h-full group relative cursor-pointer"
                >
                  <!-- Tooltip Hover Popover (Floats 8px above the hourly bar) -->
                  <div 
                    class="opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 transform group-hover:-translate-y-1 absolute left-1/2 -translate-x-1/2 z-30 bg-slate-900 dark:bg-slate-950 text-white text-[10px] font-semibold px-2.5 py-1.5 rounded-xl shadow-xl whitespace-nowrap flex flex-col items-center border border-white/15"
                    :style="{ bottom: `calc(${getHourlyBarHeight(h)} + 8px)` }"
                  >
                    <span class="text-slate-300 font-medium">{{ h.display }}</span>
                    <span class="text-emerald-400 font-bold">฿{{ h.sales.toLocaleString('th-TH') }} <span class="text-white/80 font-normal">({{ h.count }} บิล)</span></span>
                    <div class="w-1.5 h-1.5 bg-slate-900 dark:bg-slate-950 rotate-45 absolute -bottom-0.5 left-1/2 -translate-x-1/2 border-r border-b border-white/15"></div>
                  </div>

                  <div 
                    class="w-full max-w-[20px] rounded-t-lg transition-all duration-300 group-hover:opacity-80"
                    :class="h.sales > 0 ? (h.hour === analyticsData.kpi.peak_hour?.hour ? 'bg-rose-500 shadow-xs' : 'bg-primary/80') : 'bg-muted/30 min-h-[3px]'"
                    :style="{ height: getHourlyBarHeight(h) }"
                  ></div>

                  <span class="text-[9px] text-muted-foreground mt-1.5 truncate w-full text-center">
                    {{ h.display.slice(0, 2) }}
                  </span>
                </div>
              </div>
            </div>

            <div class="flex items-center justify-between text-[11px] text-muted-foreground pt-1">
              <span class="flex items-center gap-1.5">
                <span class="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block"></span>
                <span>{{ $t('analytics_kpi_peak_rush') }}: <strong>{{ analyticsData.kpi.peak_hour?.display }}</strong></span>
              </span>
              <span>฿{{ (analyticsData.kpi.peak_hour?.sales || 0).toLocaleString('th-TH') }}</span>
            </div>
          </div>

          <!-- Meal Period Revenue Contribution -->
          <div class="p-5 sm:p-6 bg-card border border-border/80 rounded-3xl shadow-xs space-y-4 overflow-hidden">
            <div>
              <h3 class="text-base font-bold text-foreground flex items-center gap-2">
                <PieChart class="w-4 h-4 text-amber-500" />
                <span>{{ $t('analytics_meal_periods_title') }}</span>
              </h3>
              <p class="text-xs text-muted-foreground mt-0.5 font-normal">
                แจกแจงสัดส่วนยอดขายตามช่วงมื้ออาหารหลักของวัน
              </p>
            </div>

            <div class="space-y-3 pt-1">
              
              <!-- Breakfast -->
              <div class="p-3 bg-muted/20 border border-border/60 rounded-2xl space-y-1.5">
                <div class="flex justify-between text-xs">
                  <span class="font-medium text-foreground flex items-center gap-1.5">
                    <span>🌅</span>
                    <span>{{ $t('analytics_meal_breakfast') }}</span>
                  </span>
                  <span class="font-bold text-foreground tabular-nums">฿{{ (analyticsData.meal_periods.breakfast.sales || 0).toLocaleString('th-TH') }}</span>
                </div>
                <div class="flex items-center gap-3">
                  <div class="flex-1 bg-muted rounded-full h-2 overflow-hidden">
                    <div class="bg-amber-400 h-full rounded-full" :style="{ width: `${analyticsData.meal_periods.breakfast.percentage}%` }"></div>
                  </div>
                  <span class="text-[11px] font-semibold text-muted-foreground w-12 text-right tabular-nums">{{ analyticsData.meal_periods.breakfast.percentage }}%</span>
                </div>
              </div>

              <!-- Lunch Rush -->
              <div class="p-3 bg-muted/20 border border-border/60 rounded-2xl space-y-1.5">
                <div class="flex justify-between text-xs">
                  <span class="font-medium text-foreground flex items-center gap-1.5">
                    <span>☀️</span>
                    <span>{{ $t('analytics_meal_lunch') }}</span>
                  </span>
                  <span class="font-bold text-foreground tabular-nums">฿{{ (analyticsData.meal_periods.lunch.sales || 0).toLocaleString('th-TH') }}</span>
                </div>
                <div class="flex items-center gap-3">
                  <div class="flex-1 bg-muted rounded-full h-2 overflow-hidden">
                    <div class="bg-primary h-full rounded-full" :style="{ width: `${analyticsData.meal_periods.lunch.percentage}%` }"></div>
                  </div>
                  <span class="text-[11px] font-semibold text-muted-foreground w-12 text-right tabular-nums">{{ analyticsData.meal_periods.lunch.percentage }}%</span>
                </div>
              </div>

              <!-- Afternoon -->
              <div class="p-3 bg-muted/20 border border-border/60 rounded-2xl space-y-1.5">
                <div class="flex justify-between text-xs">
                  <span class="font-medium text-foreground flex items-center gap-1.5">
                    <span>☕</span>
                    <span>{{ $t('analytics_meal_afternoon') }}</span>
                  </span>
                  <span class="font-bold text-foreground tabular-nums">฿{{ (analyticsData.meal_periods.afternoon.sales || 0).toLocaleString('th-TH') }}</span>
                </div>
                <div class="flex items-center gap-3">
                  <div class="flex-1 bg-muted rounded-full h-2 overflow-hidden">
                    <div class="bg-emerald-500 h-full rounded-full" :style="{ width: `${analyticsData.meal_periods.afternoon.percentage}%` }"></div>
                  </div>
                  <span class="text-[11px] font-semibold text-muted-foreground w-12 text-right tabular-nums">{{ analyticsData.meal_periods.afternoon.percentage }}%</span>
                </div>
              </div>

              <!-- Dinner Rush -->
              <div class="p-3 bg-muted/20 border border-border/60 rounded-2xl space-y-1.5">
                <div class="flex justify-between text-xs">
                  <span class="font-medium text-foreground flex items-center gap-1.5">
                    <span>🌙</span>
                    <span>{{ $t('analytics_meal_dinner') }}</span>
                  </span>
                  <span class="font-bold text-foreground tabular-nums">฿{{ (analyticsData.meal_periods.dinner.sales || 0).toLocaleString('th-TH') }}</span>
                </div>
                <div class="flex items-center gap-3">
                  <div class="flex-1 bg-muted rounded-full h-2 overflow-hidden">
                    <div class="bg-purple-600 h-full rounded-full" :style="{ width: `${analyticsData.meal_periods.dinner.percentage}%` }"></div>
                  </div>
                  <span class="text-[11px] font-semibold text-muted-foreground w-12 text-right tabular-nums">{{ analyticsData.meal_periods.dinner.percentage }}%</span>
                </div>
              </div>

            </div>
          </div>

        </div>

        <!-- 4. CATEGORY CONTRIBUTION & DINING CHANNELS & TICKET SIZE (3 COLUMNS) -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          <!-- Category Contribution -->
          <div class="p-5 sm:p-6 bg-card border border-border/80 rounded-3xl shadow-xs space-y-4 overflow-hidden">
            <h3 class="text-sm font-bold text-foreground flex items-center gap-2">
              <Layers class="w-4 h-4 text-primary" />
              <span>{{ $t('analytics_category_title') }}</span>
            </h3>

            <div v-if="analyticsData.category_sales && analyticsData.category_sales.length > 0" class="space-y-3 pt-1">
              <div 
                v-for="cat in analyticsData.category_sales" 
                :key="cat.category_id"
                class="p-3 bg-muted/20 border border-border/60 rounded-2xl space-y-1.5"
              >
                <div class="flex justify-between text-xs">
                  <span class="font-medium text-foreground truncate">
                    {{ getCategoryName(cat) }}
                  </span>
                  <span class="font-bold text-foreground shrink-0 ml-2 tabular-nums">฿{{ cat.sales.toLocaleString('th-TH') }}</span>
                </div>
                <div class="flex items-center gap-2.5">
                  <div class="flex-1 bg-muted rounded-full h-1.5 overflow-hidden">
                    <div class="bg-primary h-full rounded-full" :style="{ width: `${cat.percentage}%` }"></div>
                  </div>
                  <span class="text-[10px] text-muted-foreground tabular-nums">{{ cat.percentage }}% ({{ cat.quantity_sold }} จาน)</span>
                </div>
              </div>
            </div>
            <div v-else class="py-8 text-center text-xs text-muted-foreground">
              {{ $t('analytics_empty_sales') }}
            </div>
          </div>

          <!-- Dining Channel Breakdown -->
          <div class="p-5 sm:p-6 bg-card border border-border/80 rounded-3xl shadow-xs space-y-4 overflow-hidden">
            <h3 class="text-sm font-bold text-foreground flex items-center gap-2">
              <UtensilsCrossed class="w-4 h-4 text-primary" />
              <span>{{ $t('analytics_channels_title') }}</span>
            </h3>

            <div class="space-y-3 pt-1">
              <div class="p-3 bg-muted/20 border border-border/60 rounded-2xl space-y-1.5">
                <div class="flex justify-between text-xs">
                  <span class="font-medium text-foreground">🪑 {{ $t('analytics_channel_dinein') }}</span>
                  <span class="font-bold text-foreground tabular-nums">฿{{ (analyticsData.dining_types?.dinein.sales || 0).toLocaleString('th-TH') }}</span>
                </div>
                <div class="flex items-center gap-2.5">
                  <div class="flex-1 bg-muted rounded-full h-1.5 overflow-hidden">
                    <div class="bg-blue-500 h-full rounded-full" :style="{ width: `${analyticsData.dining_types?.dinein.percentage || 0}%` }"></div>
                  </div>
                  <span class="text-[10px] text-muted-foreground tabular-nums">{{ analyticsData.dining_types?.dinein.percentage || 0 }}% ({{ analyticsData.dining_types?.dinein.count || 0 }} บิล)</span>
                </div>
              </div>

              <div class="p-3 bg-muted/20 border border-border/60 rounded-2xl space-y-1.5">
                <div class="flex justify-between text-xs">
                  <span class="font-medium text-foreground">🥡 {{ $t('analytics_channel_takeaway') }}</span>
                  <span class="font-bold text-foreground tabular-nums">฿{{ (analyticsData.dining_types?.takeaway.sales || 0).toLocaleString('th-TH') }}</span>
                </div>
                <div class="flex items-center gap-2.5">
                  <div class="flex-1 bg-muted rounded-full h-1.5 overflow-hidden">
                    <div class="bg-emerald-500 h-full rounded-full" :style="{ width: `${analyticsData.dining_types?.takeaway.percentage || 0}%` }"></div>
                  </div>
                  <span class="text-[10px] text-muted-foreground tabular-nums">{{ analyticsData.dining_types?.takeaway.percentage || 0 }}% ({{ analyticsData.dining_types?.takeaway.count || 0 }} บิล)</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Ticket Size Distribution -->
          <div class="p-5 sm:p-6 bg-card border border-border/80 rounded-3xl shadow-xs space-y-4 overflow-hidden">
            <h3 class="text-sm font-bold text-foreground flex items-center gap-2">
              <TrendingUp class="w-4 h-4 text-amber-500" />
              <span>{{ $t('analytics_ticket_size_title') }}</span>
            </h3>

            <div class="space-y-2 pt-1 text-xs">
              <div class="flex justify-between items-center p-2 bg-muted/20 rounded-xl">
                <span class="text-muted-foreground">&lt; ฿100 (บิลประหยัด)</span>
                <span class="font-bold text-foreground tabular-nums">{{ analyticsData.ticket_tiers.under_100.count }} บิล ({{ analyticsData.ticket_tiers.under_100.percentage }}%)</span>
              </div>
              <div class="flex justify-between items-center p-2 bg-muted/20 rounded-xl">
                <span class="text-muted-foreground">฿100 - ฿299 (บิลมาตรฐาน)</span>
                <span class="font-bold text-foreground tabular-nums">{{ analyticsData.ticket_tiers.tier_100_299.count }} บิล ({{ analyticsData.ticket_tiers.tier_100_299.percentage }}%)</span>
              </div>
              <div class="flex justify-between items-center p-2 bg-muted/20 rounded-xl">
                <span class="text-muted-foreground">฿300 - ฿599 (บิลกลุ่มย่อย)</span>
                <span class="font-bold text-foreground tabular-nums">{{ analyticsData.ticket_tiers.tier_300_599.count }} บิล ({{ analyticsData.ticket_tiers.tier_300_599.percentage }}%)</span>
              </div>
              <div class="flex justify-between items-center p-2 bg-muted/20 rounded-xl">
                <span class="text-muted-foreground">฿600+ (บิลโต๊ะใหญ่)</span>
                <span class="font-bold text-foreground tabular-nums">{{ analyticsData.ticket_tiers.tier_600_plus.count }} บิล ({{ analyticsData.ticket_tiers.tier_600_plus.percentage }}%)</span>
              </div>
            </div>
          </div>

        </div>

      </div>

      <!-- ======================================================== -->
      <!-- VIEW 2: DEDICATED BEST SELLERS MENU REPORT               -->
      <!-- ======================================================== -->
      <div v-else-if="activeView === 'best_sellers'" class="space-y-6">
        
        <!-- Quick Summary Stat Pills -->
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          <div class="p-4 bg-card border border-border/80 rounded-2xl shadow-xs flex items-center justify-between">
            <span class="text-xs text-muted-foreground flex items-center gap-1.5">
              <span>🏆</span>
              <span>{{ $t('analytics_stat_top_dish') }}</span>
            </span>
            <span class="font-bold text-xs sm:text-sm text-foreground truncate max-w-[180px]">
              {{ analyticsData.top_items[0] ? getItemName(analyticsData.top_items[0]) : '-' }}
            </span>
          </div>

          <div class="p-4 bg-card border border-border/80 rounded-2xl shadow-xs flex items-center justify-between">
            <span class="text-xs text-muted-foreground flex items-center gap-1.5">
              <span>📦</span>
              <span>{{ $t('analytics_stat_active_items') }}</span>
            </span>
            <span class="font-bold text-xs sm:text-sm text-foreground">
              {{ analyticsData.top_items.length }} รายการ
            </span>
          </div>

          <div class="p-4 bg-card border border-border/80 rounded-2xl shadow-xs flex items-center justify-between">
            <span class="text-xs text-muted-foreground flex items-center gap-1.5">
              <span>💰</span>
              <span>{{ $t('analytics_stat_avg_dish_sales') }}</span>
            </span>
            <span class="font-bold text-xs sm:text-sm text-primary">
              ฿{{ analyticsData.top_items.length > 0 ? Math.round(analyticsData.kpi.total_sales / analyticsData.top_items.length).toLocaleString('th-TH') : 0 }}
            </span>
          </div>
        </div>

        <!-- Search & Filter Controls Bar -->
        <div class="p-4 bg-card border border-border/80 rounded-2xl shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          
          <!-- Search Input -->
          <div class="relative flex-1">
            <Search class="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input 
              v-model="menuSearchQuery"
              type="text"
              :placeholder="$t('analytics_search_menu')"
              class="w-full pl-10 pr-3.5 py-2 bg-muted/40 border border-border/80 rounded-xl text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div class="flex items-center gap-2">
            <!-- Category Filter Dropdown -->
            <div class="relative">
              <select 
                v-model="menuCategoryFilter"
                class="px-3 py-2 bg-muted/40 border border-border/80 rounded-xl text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary appearance-none pr-8 cursor-pointer"
              >
                <option value="all">{{ $t('analytics_filter_all_categories') }}</option>
                <option v-for="cat in availableCategories" :key="cat" :value="cat">
                  {{ cat }}
                </option>
              </select>
              <Filter class="w-3.5 h-3.5 text-muted-foreground absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            <!-- Sort By Dropdown -->
            <div class="relative">
              <select 
                v-model="menuSortBy"
                class="px-3 py-2 bg-muted/40 border border-border/80 rounded-xl text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary appearance-none pr-8 cursor-pointer"
              >
                <option value="revenue_desc">{{ $t('analytics_sort_revenue_desc') }}</option>
                <option value="qty_desc">{{ $t('analytics_sort_qty_desc') }}</option>
                <option value="price_desc">{{ $t('analytics_sort_price_desc') }}</option>
                <option value="share_desc">{{ $t('analytics_sort_share_desc') }}</option>
              </select>
              <ArrowUpDown class="w-3.5 h-3.5 text-muted-foreground absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            <!-- View Mode Switcher -->
            <div class="inline-flex p-1 bg-muted/60 rounded-xl border border-border/60 text-xs font-semibold">
              <button 
                @click="menuViewMode = 'cards'"
                class="p-1.5 rounded-lg transition-all cursor-pointer"
                :class="menuViewMode === 'cards' ? 'bg-background text-primary shadow-xs' : 'text-muted-foreground hover:text-foreground'"
                title="Card View"
              >
                <LayoutGrid class="w-4 h-4" />
              </button>
              <button 
                @click="menuViewMode = 'table'"
                class="p-1.5 rounded-lg transition-all cursor-pointer"
                :class="menuViewMode === 'table' ? 'bg-background text-primary shadow-xs' : 'text-muted-foreground hover:text-foreground'"
                title="Table View"
              >
                <List class="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        <!-- Render Mode 1: Mobile-friendly Cards View -->
        <div v-if="menuViewMode === 'cards'" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          <div 
            v-for="(item, idx) in filteredTopItems" 
            :key="idx"
            class="p-4 bg-card border border-border/80 rounded-2xl shadow-xs space-y-3 transition-all hover:shadow-md"
          >
            <div class="flex items-start justify-between gap-2">
              <div class="flex items-center gap-2">
                <span 
                  class="w-6 h-6 rounded-full font-bold text-xs inline-flex items-center justify-center shrink-0"
                  :class="idx === 0 ? 'bg-amber-500 text-white' : (idx === 1 ? 'bg-slate-400 text-white' : (idx === 2 ? 'bg-amber-700 text-white' : 'bg-muted text-foreground'))"
                >
                  {{ idx === 0 ? '🥇' : (idx === 1 ? '🥈' : (idx === 2 ? '🥉' : idx + 1)) }}
                </span>
                <span class="px-2 py-0.5 rounded-md bg-muted text-[10px] font-medium text-muted-foreground">
                  {{ getCategoryDisplayName(item) }}
                </span>
              </div>
              <span class="font-bold text-sm text-primary tabular-nums">
                ฿{{ item.total_sales.toLocaleString('th-TH') }}
              </span>
            </div>

            <div>
              <h4 class="font-semibold text-xs text-foreground">
                {{ getItemName(item) }}
              </h4>
              <p v-if="getItemSubName(item)" class="text-[10px] text-muted-foreground mt-0.5">
                {{ getItemSubName(item) }}
              </p>
            </div>

            <div class="pt-2 border-t border-border/60 flex items-center justify-between text-xs text-muted-foreground">
              <span>฿{{ item.avg_price || 0 }} / จาน</span>
              <span class="font-semibold text-foreground">{{ $t('analytics_unit_dishes', { count: item.quantity_sold }) }}</span>
            </div>

            <!-- Progress Bar -->
            <div class="flex items-center gap-2 pt-0.5">
              <div class="flex-1 bg-muted rounded-full h-1.5 overflow-hidden">
                <div class="bg-primary h-full rounded-full" :style="{ width: `${Math.min(100, item.percentage || 0)}%` }"></div>
              </div>
              <span class="text-[10px] font-semibold text-muted-foreground tabular-nums">{{ item.percentage || 0 }}%</span>
            </div>
          </div>
        </div>

        <!-- Render Mode 2: High Density Table View -->
        <div v-else class="bg-card border border-border/80 rounded-3xl shadow-xs overflow-hidden">
          <div class="overflow-x-auto">
            <table class="w-full text-left text-xs">
              <thead class="bg-muted/40 border-b border-border/80 text-muted-foreground font-semibold">
                <tr>
                  <th class="py-3.5 px-3 text-center w-12">{{ $t('analytics_col_rank') }}</th>
                  <th class="py-3.5 px-4">{{ $t('analytics_col_dish') }}</th>
                  <th class="py-3.5 px-3">{{ $t('analytics_col_category') }}</th>
                  <th class="py-3.5 px-3 text-right">{{ $t('analytics_col_avg_price') }}</th>
                  <th class="py-3.5 px-4 text-center">{{ $t('analytics_col_qty') }}</th>
                  <th class="py-3.5 px-4 text-right">{{ $t('analytics_col_sales') }}</th>
                  <th class="py-3.5 px-4 text-right w-36">{{ $t('analytics_col_share') }}</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-border/60">
                <tr 
                  v-for="(item, idx) in filteredTopItems" 
                  :key="idx"
                  class="hover:bg-muted/20 transition-colors"
                >
                  <td class="py-3.5 px-3 text-center">
                    <span 
                      class="w-6 h-6 rounded-full font-bold text-xs inline-flex items-center justify-center"
                      :class="idx === 0 ? 'bg-amber-500 text-white' : (idx === 1 ? 'bg-slate-400 text-white' : (idx === 2 ? 'bg-amber-700 text-white' : 'text-muted-foreground'))"
                    >
                      {{ idx === 0 ? '🥇' : (idx === 1 ? '🥈' : (idx === 2 ? '🥉' : idx + 1)) }}
                    </span>
                  </td>

                  <td class="py-3.5 px-4 font-medium text-foreground">
                    <div>
                      <span>{{ getItemName(item) }}</span>
                      <span v-if="getItemSubName(item)" class="text-[10px] text-muted-foreground font-normal block sm:inline sm:ml-1">
                        ({{ getItemSubName(item) }})
                      </span>
                    </div>
                  </td>

                  <td class="py-3.5 px-3 text-muted-foreground">
                    <span class="px-2 py-0.5 rounded-md bg-muted text-[10px] font-medium">
                      {{ getCategoryDisplayName(item) }}
                    </span>
                  </td>

                  <td class="py-3.5 px-3 text-right font-medium text-muted-foreground tabular-nums">
                    ฿{{ item.avg_price || 0 }}
                  </td>

                  <td class="py-3.5 px-4 text-center font-semibold text-foreground tabular-nums">
                    {{ $t('analytics_unit_dishes', { count: item.quantity_sold }) }}
                  </td>

                  <td class="py-3.5 px-4 text-right font-bold text-primary tabular-nums">
                    ฿{{ item.total_sales.toLocaleString('th-TH') }}
                  </td>

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
        </div>

        <div v-if="filteredTopItems.length === 0" class="py-16 text-center text-xs text-muted-foreground bg-card border border-border/80 rounded-3xl">
          {{ $t('analytics_empty_dishes') }}
        </div>

      </div>

      <!-- ======================================================== -->
      <!-- VIEW 3: DEDICATED DAILY / PERIODIC BREAKDOWN TABLE       -->
      <!-- ======================================================== -->
      <div v-else-if="activeView === 'daily_breakdown'" class="space-y-6">
        
        <!-- Quick Summary Stat Pills -->
        <div v-if="trendStats && trendStats.bestDay && trendStats.lowestDay" class="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          <div class="p-4 bg-card border border-border/80 rounded-2xl shadow-xs flex items-center justify-between">
            <span class="text-xs text-muted-foreground flex items-center gap-1.5">
              <span>🌟</span>
              <span>{{ $t('analytics_best_selling_day') }}</span>
            </span>
            <span class="font-bold text-xs sm:text-sm text-foreground">
              {{ trendStats.bestDay.display_date }} (฿{{ trendStats.bestDay.sales.toLocaleString('th-TH') }})
            </span>
          </div>

          <div class="p-4 bg-card border border-border/80 rounded-2xl shadow-xs flex items-center justify-between">
            <span class="text-xs text-muted-foreground flex items-center gap-1.5">
              <span>📉</span>
              <span>{{ $t('analytics_lowest_selling_day') }}</span>
            </span>
            <span class="font-bold text-xs sm:text-sm text-foreground">
              {{ trendStats.lowestDay.display_date }} (฿{{ trendStats.lowestDay.sales.toLocaleString('th-TH') }})
            </span>
          </div>

          <div class="p-4 bg-card border border-border/80 rounded-2xl shadow-xs flex items-center justify-between">
            <span class="text-xs text-muted-foreground flex items-center gap-1.5">
              <span>📊</span>
              <span>{{ $t('analytics_avg_daily_sales') }}</span>
            </span>
            <span class="font-bold text-xs sm:text-sm text-primary">
              ฿{{ trendStats.avgSales.toLocaleString('th-TH') }} / วัน
            </span>
          </div>
        </div>

        <!-- Search & Filter Controls Bar -->
        <div class="p-4 bg-card border border-border/80 rounded-2xl shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          
          <!-- Search Input -->
          <div class="relative flex-1">
            <Search class="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input 
              v-model="dailySearchQuery"
              type="text"
              :placeholder="$t('analytics_search_daily')"
              class="w-full pl-10 pr-3.5 py-2 bg-muted/40 border border-border/80 rounded-xl text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div class="flex items-center gap-2">
            <!-- Channel Filter Dropdown -->
            <div class="relative">
              <select 
                v-model="dailyChannelFilter"
                class="px-3 py-2 bg-muted/40 border border-border/80 rounded-xl text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary appearance-none pr-8 cursor-pointer"
              >
                <option value="all">{{ $t('analytics_filter_channel_all') }}</option>
                <option value="sales_only">{{ $t('analytics_filter_channel_sales_only') }}</option>
                <option value="dinein">{{ $t('analytics_filter_channel_dinein') }}</option>
                <option value="takeaway">{{ $t('analytics_filter_channel_takeaway') }}</option>
              </select>
              <Filter class="w-3.5 h-3.5 text-muted-foreground absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            <!-- Sort By Dropdown -->
            <div class="relative">
              <select 
                v-model="dailySortBy"
                class="px-3 py-2 bg-muted/40 border border-border/80 rounded-xl text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary appearance-none pr-8 cursor-pointer"
              >
                <option value="date_desc">{{ $t('analytics_sort_date_desc') }}</option>
                <option value="date_asc">{{ $t('analytics_sort_date_asc') }}</option>
                <option value="sales_desc">{{ $t('analytics_sort_sales_desc') }}</option>
                <option value="orders_desc">{{ $t('analytics_sort_orders_desc') }}</option>
                <option value="aov_desc">{{ $t('analytics_sort_aov_desc') }}</option>
              </select>
              <ArrowUpDown class="w-3.5 h-3.5 text-muted-foreground absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            <!-- View Mode Switcher -->
            <div class="inline-flex p-1 bg-muted/60 rounded-xl border border-border/60 text-xs font-semibold">
              <button 
                @click="dailyViewMode = 'cards'"
                class="p-1.5 rounded-lg transition-all cursor-pointer"
                :class="dailyViewMode === 'cards' ? 'bg-background text-primary shadow-xs' : 'text-muted-foreground hover:text-foreground'"
                title="Card View"
              >
                <LayoutGrid class="w-4 h-4" />
              </button>
              <button 
                @click="dailyViewMode = 'table'"
                class="p-1.5 rounded-lg transition-all cursor-pointer"
                :class="dailyViewMode === 'table' ? 'bg-background text-primary shadow-xs' : 'text-muted-foreground hover:text-foreground'"
                title="Table View"
              >
                <List class="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        <!-- Render Mode 1: Mobile-friendly Cards View -->
        <div v-if="dailyViewMode === 'cards'" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          <div 
            v-for="day in filteredDailySales" 
            :key="day.sale_date"
            class="p-4 bg-card border border-border/80 rounded-2xl shadow-xs space-y-3 transition-all hover:shadow-md"
          >
            <div class="flex items-start justify-between gap-2">
              <div>
                <span class="font-bold text-xs text-foreground block">
                  {{ day.sale_date }}
                </span>
                <span v-if="day.day_name" class="text-[10px] text-muted-foreground font-medium">
                  {{ day.day_name }}
                </span>
              </div>
              <span class="font-bold text-sm text-primary tabular-nums">
                ฿{{ day.sales.toLocaleString('th-TH') }}
              </span>
            </div>

            <div class="grid grid-cols-3 gap-2 py-2 border-y border-border/60 text-center text-xs">
              <div>
                <span class="text-[10px] text-muted-foreground block">จำนวนบิล</span>
                <span class="font-semibold text-foreground">{{ day.order_count }}</span>
              </div>
              <div>
                <span class="text-[10px] text-muted-foreground block">จำนวนจาน</span>
                <span class="font-semibold text-foreground">{{ day.items_count || 0 }}</span>
              </div>
              <div>
                <span class="text-[10px] text-muted-foreground block">เฉลี่ย/บิล</span>
                <span class="font-semibold text-foreground">฿{{ day.avg_order_value || 0 }}</span>
              </div>
            </div>

            <!-- Dining Channel Split -->
            <div class="flex items-center justify-between text-[10px] text-muted-foreground pt-0.5">
              <span>🪑 ทานที่ร้าน: <strong>฿{{ (day.dinein_sales || 0).toLocaleString('th-TH') }}</strong></span>
              <span>🥡 กลับบ้าน: <strong>฿{{ (day.takeaway_sales || 0).toLocaleString('th-TH') }}</strong></span>
            </div>
          </div>
        </div>

        <!-- Render Mode 2: High Density Accounting Table View -->
        <div v-else class="bg-card border border-border/80 rounded-3xl shadow-xs overflow-hidden">
          <div class="overflow-x-auto">
            <table class="w-full text-left text-xs">
              <thead class="bg-muted/40 border-b border-border/80 text-muted-foreground font-semibold">
                <tr>
                  <th class="py-3.5 px-4">{{ $t('analytics_col_date') }}</th>
                  <th class="py-3.5 px-3">{{ $t('analytics_col_day') }}</th>
                  <th class="py-3.5 px-4 text-right">{{ $t('analytics_col_sales') }}</th>
                  <th class="py-3.5 px-4 text-center">{{ $t('analytics_col_orders_count') }}</th>
                  <th class="py-3.5 px-4 text-center">{{ $t('analytics_col_dishes_count') }}</th>
                  <th class="py-3.5 px-4 text-right">{{ $t('analytics_col_avg_bill') }}</th>
                  <th class="py-3.5 px-4 text-right">{{ $t('analytics_col_channels') }}</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-border/60">
                <tr 
                  v-for="day in filteredDailySales" 
                  :key="day.sale_date"
                  class="hover:bg-muted/20 transition-colors"
                  :class="{ 'opacity-60': day.sales === 0 }"
                >
                  <td class="py-3 px-4 font-semibold text-foreground">
                    {{ day.sale_date }}
                  </td>

                  <td class="py-3 px-3 text-muted-foreground font-medium">
                    {{ day.day_name || '-' }}
                  </td>

                  <td class="py-3 px-4 text-right font-bold text-foreground tabular-nums">
                    ฿{{ day.sales.toLocaleString('th-TH') }}
                  </td>

                  <td class="py-3 px-4 text-center font-medium text-muted-foreground tabular-nums">
                    {{ day.order_count }}
                  </td>

                  <td class="py-3 px-4 text-center font-medium text-muted-foreground tabular-nums">
                    {{ day.items_count || 0 }}
                  </td>

                  <td class="py-3 px-4 text-right font-medium text-primary tabular-nums">
                    ฿{{ (day.avg_order_value || 0).toLocaleString('th-TH') }}
                  </td>

                  <td class="py-3 px-4 text-right text-[11px] text-muted-foreground tabular-nums">
                    <span>🪑 {{ day.dinein_count || 0 }} / 🥡 {{ day.takeaway_count || 0 }}</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div v-if="filteredDailySales.length === 0" class="py-16 text-center text-xs text-muted-foreground bg-card border border-border/80 rounded-3xl">
          {{ $t('analytics_empty_sales') }}
        </div>

      </div>

    </div>

  </div>
</template>
