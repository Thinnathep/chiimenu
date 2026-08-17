<script setup lang="ts">
import { 
  ShieldCheck, 
  LogOut, 
  Globe, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Search, 
  Info, 
  Store, 
  ExternalLink, 
  Calendar, 
  CreditCard, 
  Sparkles, 
  Filter, 
  RefreshCw, 
  ChevronRight, 
  Tag, 
  X, 
  Check, 
  Plus, 
  MinusCircle, 
  AlertTriangle,
  UserCheck,
  TrendingUp,
  Receipt,
  MessageCircle,
  Phone,
  Copy
} from 'lucide-vue-next'
import { SUBSCRIPTION_PACKAGES, type PackageId } from '~/utils/pricing'

definePageMeta({
  middleware: ['auth', 'admin']
})

const client = useSupabaseClient()
const user = useSupabaseUser()
const { t, locale, setLocale } = useI18n()

// State
const stores = ref<any[]>([])
const logs = ref<any[]>([])
const loading = ref(true)
const refreshing = ref(false)
const processingId = ref<string | null>(null)
const searchQuery = ref('')
const currentFilter = ref<'all' | 'active' | 'trial' | 'expiring_soon' | 'expired'>('all')

// Modal State
const showManageModal = ref(false)
const activeStore = ref<any>(null)
const activeTab = ref<'renew' | 'adjust' | 'line'>('renew')

// Renew Form State
const selectedPkgId = ref<PackageId>('monthly')
const useFirstTimePromo = ref(false)
const renewNote = ref('')

// Adjust Form State
const adjustType = ref<'add_7' | 'add_14' | 'custom_add' | 'custom_deduct' | 'revoke'>('add_7')
const adjustDays = ref(7)
const adjustNote = ref('')

// Store Info / LINE Form State
const editLineUserId = ref('')
const editPhone = ref('')

// Load Data
const fetchStores = async () => {
  loading.value = true
  try {
    const { data, error } = await client
      .from('stores')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (error) throw error
    stores.value = data || []
  } catch (err) {
    console.error('Fetch stores error:', err)
  } finally {
    loading.value = false
  }
}

const fetchLogs = async () => {
  try {
    const { data } = await client
      .from('admin_action_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10)
      
    if (data) logs.value = data
  } catch (err) {
    console.error('Fetch logs error:', err)
  }
}

const refreshData = async () => {
  refreshing.value = true
  await Promise.all([fetchStores(), fetchLogs()])
  refreshing.value = false
}

onMounted(() => {
  fetchStores()
  fetchLogs()
})

// Helpers for dates & remaining time
const getActiveEndDate = (store: any) => {
  if (store.trial_ends_at) return store.trial_ends_at
  const d = new Date(store.created_at || Date.now())
  d.setDate(d.getDate() + 7)
  return d.toISOString()
}

const getDaysRemaining = (store: any) => {
  const end = new Date(getActiveEndDate(store)).getTime()
  const now = Date.now()
  return Math.ceil((end - now) / (1000 * 60 * 60 * 24))
}

const isExpired = (store: any) => getDaysRemaining(store) < 0
const isExpiringSoon = (store: any) => {
  const days = getDaysRemaining(store)
  return days >= 0 && days <= 7
}

// Formatters
const formatDate = (dateString: string | null) => {
  if (!dateString) return 'N/A'
  return new Date(dateString).toLocaleDateString('th-TH', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  })
}

const formatDateTime = (dateString: string | null) => {
  if (!dateString) return 'N/A'
  return new Date(dateString).toLocaleDateString('th-TH', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', minimumFractionDigits: 0 }).format(amount)
}

// Stats Computations
const stats = computed(() => {
  const total = stores.value.length
  const activePaid = stores.value.filter(s => s.plan_status === 'active' && !isExpired(s)).length
  const trialActive = stores.value.filter(s => s.plan_status !== 'active' && !isExpired(s)).length
  const urgent = stores.value.filter(s => isExpired(s) || isExpiringSoon(s)).length

  return { total, activePaid, trialActive, urgent }
})

// Filtered Stores
const filteredStores = computed(() => {
  let list = stores.value

  // Apply Tab Filter
  if (currentFilter.value === 'active') {
    list = list.filter(s => s.plan_status === 'active' && !isExpired(s))
  } else if (currentFilter.value === 'trial') {
    list = list.filter(s => s.plan_status !== 'active' && !isExpired(s))
  } else if (currentFilter.value === 'expiring_soon') {
    list = list.filter(s => isExpiringSoon(s))
  } else if (currentFilter.value === 'expired') {
    list = list.filter(s => isExpired(s))
  }

  // Apply Search
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase().trim()
    list = list.filter(s => 
      s.name?.toLowerCase().includes(q) || 
      s.slug?.toLowerCase().includes(q) ||
      s.id?.toLowerCase().includes(q) ||
      s.line_user_id?.toLowerCase().includes(q) ||
      s.phone?.toLowerCase().includes(q)
    )
  }

  return list
})

// Modal Actions
const openManageModal = (store: any, defaultTab: 'renew' | 'adjust' | 'line' = 'renew') => {
  activeStore.value = store
  activeTab.value = defaultTab
  selectedPkgId.value = 'monthly'
  useFirstTimePromo.value = !store.has_used_first_time_promo
  renewNote.value = ''
  adjustType.value = 'add_7'
  adjustDays.value = 7
  adjustNote.value = ''
  editLineUserId.value = store.line_user_id || ''
  editPhone.value = store.phone || ''
  showManageModal.value = true
}

const closeManageModal = () => {
  showManageModal.value = false
  activeStore.value = null
}

// Calculated Renewal Info
const currentPkg = computed(() => SUBSCRIPTION_PACKAGES[selectedPkgId.value])
const calculatedPrice = computed(() => {
  if (!currentPkg.value) return 0
  if (useFirstTimePromo.value && !activeStore.value?.has_used_first_time_promo) {
    return currentPkg.value.firstTime
  }
  return currentPkg.value.standard
})

const previewNewExpiryDate = computed(() => {
  if (!activeStore.value || !currentPkg.value) return ''
  const now = new Date()
  const currentEnd = new Date(getActiveEndDate(activeStore.value))
  const baseDate = currentEnd > now ? currentEnd : now
  const newDate = new Date(baseDate)
  newDate.setDate(newDate.getDate() + currentPkg.value.days)
  return formatDate(newDate.toISOString())
})

// Execute Actions
const submitRenewal = async () => {
  if (!activeStore.value || !currentPkg.value) return
  const store = activeStore.value
  const pkg = currentPkg.value
  const amount = calculatedPrice.value
  const isPromo = useFirstTimePromo.value && !store.has_used_first_time_promo
  
  processingId.value = store.id
  try {
    const now = new Date()
    const currentEnd = new Date(store.trial_ends_at || now)
    const baseDate = currentEnd > now ? currentEnd : now
    const newEnd = new Date(baseDate)
    newEnd.setDate(newEnd.getDate() + pkg.days)

    const { error } = await (client as any).rpc('admin_update_store_plan', {
      p_store_id: store.id,
      p_plan_status: 'active',
      p_trial_ends_at: newEnd.toISOString(),
      p_action: `paid_${pkg.days}`,
      p_details: {
        previous_end: store.trial_ends_at,
        new_end: newEnd.toISOString(),
        previous_status: store.plan_status,
        new_status: 'active'
      },
      p_amount: amount,
      p_package_name: pkg.name,
      p_package_days: pkg.days,
      p_note: renewNote.value || 'Admin Renewal',
      p_original_amount: isPromo ? pkg.standard : null,
      p_discount_amount: isPromo ? (pkg.standard - pkg.firstTime) : null,
      p_promotion_code: isPromo ? 'FIRST_TIME_50' : null
    })

    if (error) throw error

    alert(`✅ ต่ออายุร้าน "${store.name}" สำเร็จ!`)
    closeManageModal()
    await refreshData()
  } catch (err: any) {
    console.error('Renewal error:', err)
    alert(`❌ เกิดข้อผิดพลาด: ${err.message}`)
  } finally {
    processingId.value = null
  }
}

const submitAdjustment = async () => {
  if (!activeStore.value) return
  const store = activeStore.value

  let days = 0
  let actionName = ''
  let newPlanStatus = store.plan_status

  if (adjustType.value === 'add_7') {
    days = 7
    actionName = 'trial_7'
  } else if (adjustType.value === 'add_14') {
    days = 14
    actionName = 'trial_14'
  } else if (adjustType.value === 'custom_add') {
    days = Math.abs(adjustDays.value)
    actionName = 'custom_add'
  } else if (adjustType.value === 'custom_deduct') {
    days = -Math.abs(adjustDays.value)
    actionName = 'deduct_custom'
    if (!adjustNote.value.trim()) {
      alert('กรุณาระบุเหตุผลในการลดวันใช้งาน')
      return
    }
  } else if (adjustType.value === 'revoke') {
    if (!confirm(`คุณแน่ใจหรือไม่ว่าต้องการตัดสิทธิ์ร้าน "${store.name}" ทันที?`)) return
    actionName = 'revoke'
  }

  processingId.value = store.id
  try {
    const now = new Date()
    let newEnd: Date

    if (actionName === 'revoke') {
      newEnd = new Date(now)
      newEnd.setDate(now.getDate() - 1)
    } else {
      const currentEnd = new Date(store.trial_ends_at || now)
      const baseDate = currentEnd > now ? currentEnd : now
      newEnd = new Date(baseDate)
      newEnd.setDate(newEnd.getDate() + days)
    }

    const { error } = await (client as any).rpc('admin_update_store_plan', {
      p_store_id: store.id,
      p_plan_status: newPlanStatus,
      p_trial_ends_at: newEnd.toISOString(),
      p_action: actionName,
      p_details: {
        previous_end: store.trial_ends_at,
        new_end: newEnd.toISOString(),
        note: adjustNote.value
      },
      p_amount: null,
      p_package_name: null,
      p_package_days: null,
      p_note: adjustNote.value || `Admin Adjustment: ${actionName}`,
      p_original_amount: null,
      p_discount_amount: null,
      p_promotion_code: null
    })

    if (error) throw error

    alert(`✅ ปรับสถานะร้าน "${store.name}" เรียบร้อยแล้ว!`)
    closeManageModal()
    await refreshData()
  } catch (err: any) {
    console.error('Adjust error:', err)
    alert(`❌ เกิดข้อผิดพลาด: ${err.message}`)
  } finally {
    processingId.value = null
  }
}

// Save LINE User ID & Contact Info
const saveStoreInfo = async () => {
  if (!activeStore.value) return
  processingId.value = activeStore.value.id
  try {
    const { error } = await (client as any)
      .from('stores')
      .update({
        line_user_id: editLineUserId.value.trim() || null,
        phone: editPhone.value.trim() || null
      })
      .eq('id', activeStore.value.id)

    if (error) throw error

    alert(`✅ บันทึกข้อมูลและ LINE ID ของร้าน "${activeStore.value.name}" สำเร็จ!`)
    closeManageModal()
    await refreshData()
  } catch (err: any) {
    alert(`❌ เกิดข้อผิดพลาด: ${err.message}`)
  } finally {
    processingId.value = null
  }
}

// 1-Click Quick Grant 7 Days Trial
const quickGrant7Days = async (store: any) => {
  if (!confirm(`เพิ่มวันทดลองใช้งานฟรี 7 วัน ให้ร้าน "${store.name}" ใช่หรือไม่?`)) return
  
  processingId.value = store.id
  try {
    const now = new Date()
    const currentEnd = new Date(store.trial_ends_at || now)
    const baseDate = currentEnd > now ? currentEnd : now
    const newEnd = new Date(baseDate)
    newEnd.setDate(newEnd.getDate() + 7)

    const { error } = await (client as any).rpc('admin_update_store_plan', {
      p_store_id: store.id,
      p_plan_status: store.plan_status,
      p_trial_ends_at: newEnd.toISOString(),
      p_action: 'trial_7',
      p_details: {
        previous_end: store.trial_ends_at,
        new_end: newEnd.toISOString(),
        note: 'Quick +7 Days Grant'
      },
      p_amount: null,
      p_package_name: null,
      p_package_days: null,
      p_note: 'Quick +7 Days Grant',
      p_original_amount: null,
      p_discount_amount: null,
      p_promotion_code: null
    })

    if (error) throw error

    alert(`🎉 เพิ่ม 7 วัน ให้ร้าน "${store.name}" สำเร็จ!`)
    await refreshData()
  } catch (err: any) {
    alert(`❌ เกิดข้อผิดพลาด: ${err.message}`)
  } finally {
    processingId.value = null
  }
}
</script>

<template>
  <div class="min-h-screen bg-slate-50/50 text-foreground font-sans selection:bg-rose-100 selection:text-rose-900 pb-16">
    
    <!-- Top Navigation Bar -->
    <header class="bg-card border-b sticky top-0 z-30 shadow-xs backdrop-blur-md bg-card/90">
      <div class="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between items-center h-16">
          
          <!-- Brand & Admin Title -->
          <div class="flex items-center space-x-3">
            <img src="/logo-icon.png" alt="ChiiMenu" class="w-10 h-10 rounded-xl object-contain shadow-xs">
            <div>
              <div class="flex items-center gap-2">
                <span class="font-black tracking-tight text-lg text-foreground">ChiiMenu</span>
                <span class="bg-rose-100 text-rose-700 text-[11px] font-bold px-2 py-0.5 rounded-full border border-rose-200">Admin Portal</span>
              </div>
              <p class="text-xs text-muted-foreground hidden sm:block">ระบบควบคุมและบริหารจัดการร้านค้าหลังบ้าน</p>
            </div>
          </div>
          
          <!-- Actions & Navigation -->
          <div class="flex items-center space-x-3">
            <button 
              @click="refreshData" 
              :disabled="refreshing" 
              class="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl transition-all flex items-center gap-1.5 text-xs font-medium border border-border"
              title="รีเฟรชข้อมูล"
            >
              <RefreshCw class="w-3.5 h-3.5" :class="{'animate-spin text-rose-500': refreshing}" />
              <span class="hidden sm:inline">รีเฟรช</span>
            </button>

            <div class="h-5 w-px bg-border mx-1"></div>
            
            <NuxtLink 
              to="/merchant/dashboard" 
              class="flex items-center gap-2 text-xs font-semibold px-3.5 py-2 rounded-xl bg-muted text-foreground hover:bg-muted/80 transition-all border border-border"
            >
              <Store class="w-3.5 h-3.5 text-primary" />
              <span>ไปหน้าร้านค้า</span>
            </NuxtLink>
          </div>

        </div>
      </div>
    </header>

    <!-- Main Content Container -->
    <main class="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-8">
      
      <!-- 1. Stats KPI Overview Grid -->
      <section class="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <!-- Total Stores -->
        <div class="bg-card border rounded-2xl p-5 shadow-xs flex items-center justify-between">
          <div>
            <p class="text-xs font-medium text-muted-foreground">ร้านค้าทั้งหมด</p>
            <p class="text-2xl sm:text-3xl font-black mt-1 text-foreground">{{ stats.total }}</p>
            <span class="text-[11px] text-muted-foreground">ลงทะเบียนในระบบ</span>
          </div>
          <div class="w-12 h-12 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
            <Store class="w-6 h-6" />
          </div>
        </div>

        <!-- Active Paid -->
        <div class="bg-card border rounded-2xl p-5 shadow-xs flex items-center justify-between border-emerald-200 bg-emerald-50/20">
          <div>
            <p class="text-xs font-medium text-emerald-700">สมาชิกใช้งานจริง (Paid)</p>
            <p class="text-2xl sm:text-3xl font-black mt-1 text-emerald-600">{{ stats.activePaid }}</p>
            <span class="text-[11px] text-emerald-600 font-medium">ร้านที่สร้างรายได้</span>
          </div>
          <div class="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
            <CheckCircle2 class="w-6 h-6" />
          </div>
        </div>

        <!-- Trial Active -->
        <div class="bg-card border rounded-2xl p-5 shadow-xs flex items-center justify-between">
          <div>
            <p class="text-xs font-medium text-muted-foreground">กำลังทดลองใช้ (Trial)</p>
            <p class="text-2xl sm:text-3xl font-black mt-1 text-amber-600">{{ stats.trialActive }}</p>
            <span class="text-[11px] text-muted-foreground">อยู่ในช่วง 7 วันฟรี</span>
          </div>
          <div class="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Clock class="w-6 h-6" />
          </div>
        </div>

        <!-- Urgent / Expired -->
        <div class="bg-card border rounded-2xl p-5 shadow-xs flex items-center justify-between" :class="stats.urgent > 0 ? 'border-rose-200 bg-rose-50/20' : ''">
          <div>
            <p class="text-xs font-medium text-rose-600">หมดอายุ / ใกล้หมดอายุ</p>
            <p class="text-2xl sm:text-3xl font-black mt-1 text-rose-600">{{ stats.urgent }}</p>
            <span class="text-[11px] text-rose-500 font-medium">โอกาสทักปิดการขาย</span>
          </div>
          <div class="w-12 h-12 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center">
            <AlertTriangle class="w-6 h-6" />
          </div>
        </div>
      </section>

      <!-- 2. Store Management Main Card -->
      <section class="bg-card border rounded-3xl shadow-xs overflow-hidden">
        
        <!-- Header Controls: Tabs + Search -->
        <div class="p-6 border-b flex flex-col md:flex-row md:items-center justify-between gap-4 bg-muted/10">
          
          <!-- Filter Tabs -->
          <div class="flex items-center gap-1.5 overflow-x-auto pb-2 md:pb-0 scrollbar-none">
            <button 
              @click="currentFilter = 'all'" 
              class="px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 flex items-center gap-1.5"
              :class="currentFilter === 'all' ? 'bg-foreground text-background shadow-xs' : 'bg-muted text-muted-foreground hover:text-foreground'"
            >
              ทั้งหมด
              <span class="text-[10px] px-1.5 py-0.2 rounded-full" :class="currentFilter === 'all' ? 'bg-background/20 text-background' : 'bg-background text-muted-foreground'">
                {{ stats.total }}
              </span>
            </button>
            
            <button 
              @click="currentFilter = 'active'" 
              class="px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 flex items-center gap-1.5"
              :class="currentFilter === 'active' ? 'bg-emerald-600 text-white shadow-xs' : 'bg-muted text-muted-foreground hover:text-emerald-700'"
            >
              ใช้งานจริง
              <span class="text-[10px] px-1.5 py-0.2 rounded-full bg-black/10">
                {{ stats.activePaid }}
              </span>
            </button>

            <button 
              @click="currentFilter = 'trial'" 
              class="px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 flex items-center gap-1.5"
              :class="currentFilter === 'trial' ? 'bg-amber-500 text-white shadow-xs' : 'bg-muted text-muted-foreground hover:text-amber-700'"
            >
              ทดลองใช้
              <span class="text-[10px] px-1.5 py-0.2 rounded-full bg-black/10">
                {{ stats.trialActive }}
              </span>
            </button>

            <button 
              @click="currentFilter = 'expiring_soon'" 
              class="px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 flex items-center gap-1.5"
              :class="currentFilter === 'expiring_soon' ? 'bg-orange-500 text-white shadow-xs' : 'bg-muted text-muted-foreground hover:text-orange-700'"
            >
              ใกล้หมดอายุ (≤ 7 วัน)
            </button>

            <button 
              @click="currentFilter = 'expired'" 
              class="px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 flex items-center gap-1.5"
              :class="currentFilter === 'expired' ? 'bg-rose-600 text-white shadow-xs' : 'bg-muted text-muted-foreground hover:text-rose-700'"
            >
              หมดอายุแล้ว
            </button>
          </div>

          <!-- Search Input -->
          <div class="relative w-full md:w-72">
            <Search class="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input 
              v-model="searchQuery" 
              type="text" 
              placeholder="ค้นหาชื่อร้าน, slug, เบอร์ หรือ LINE..."
              class="w-full pl-9 pr-8 py-2 bg-background border rounded-xl text-xs focus:ring-2 focus:ring-primary/20 focus:border-primary outline-hidden transition-all placeholder:text-muted-foreground"
            />
            <button 
              v-if="searchQuery" 
              @click="searchQuery = ''" 
              class="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X class="w-3.5 h-3.5" />
            </button>
          </div>

        </div>

        <!-- Table View -->
        <div class="overflow-x-auto">
          <table class="w-full text-left text-sm">
            <thead class="bg-muted/40 text-[11px] uppercase tracking-wider text-muted-foreground border-b font-semibold">
              <tr>
                <th scope="col" class="px-6 py-3.5">ข้อมูลร้านค้า</th>
                <th scope="col" class="px-6 py-3.5">สถานะแพ็กเกจ</th>
                <th scope="col" class="px-6 py-3.5">สถานะ LINE แจ้งเตือน</th>
                <th scope="col" class="px-6 py-3.5">วันหมดอายุ</th>
                <th scope="col" class="px-6 py-3.5 text-right">การจัดการ</th>
              </tr>
            </thead>
            
            <tbody class="divide-y divide-border">
              <!-- Loading Skeleton -->
              <tr v-if="loading">
                <td colspan="5" class="px-6 py-12 text-center text-muted-foreground">
                  <div class="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                  กำลังโหลดรายชื่อร้านค้า...
                </td>
              </tr>

              <!-- Empty State -->
              <tr v-else-if="filteredStores.length === 0">
                <td colspan="5" class="px-6 py-12 text-center text-muted-foreground">
                  <Info class="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p class="font-medium text-foreground">ไม่พบร้านค้าตามเงื่อนไขที่ค้นหา</p>
                  <p class="text-xs mt-1">ลองเปลี่ยนคำค้นหาหรือเลือกแท็บอื่น</p>
                </td>
              </tr>

              <!-- Store Row -->
              <tr 
                v-for="store in filteredStores" 
                :key="store.id" 
                class="hover:bg-muted/20 transition-colors group"
                :class="{'bg-rose-50/20': isExpired(store)}"
              >
                
                <!-- Store Info -->
                <td class="px-6 py-4">
                  <div class="flex items-center gap-3.5">
                    <div class="w-10 h-10 rounded-xl bg-primary/10 text-primary font-black flex items-center justify-center text-base shrink-0 border border-primary/20">
                      {{ store.name?.charAt(0) || '🏪' }}
                    </div>
                    <div>
                      <div class="font-bold text-foreground flex items-center gap-1.5">
                        <span>{{ store.name }}</span>
                        <a 
                          :href="`/m/${store.slug}`" 
                          target="_blank" 
                          class="text-muted-foreground hover:text-primary transition-colors inline-flex items-center"
                          title="เปิดดูหน้าร้านนักท่องเที่ยว"
                        >
                          <ExternalLink class="w-3.5 h-3.5 opacity-60 hover:opacity-100" />
                        </a>
                      </div>
                      <div class="text-xs text-muted-foreground flex flex-wrap items-center gap-2 mt-0.5">
                        <span class="font-mono text-[11px] bg-muted px-1.5 py-0.2 rounded">/{{ store.slug }}</span>
                        <span v-if="store.phone" class="text-[11px]">📞 {{ store.phone }}</span>
                        
                        <!-- Promo Tag in Row -->
                        <span 
                          v-if="!store.has_used_first_time_promo"
                          class="text-[10px] font-bold text-rose-600 bg-rose-50 border border-rose-200 px-1.5 py-0.2 rounded"
                        >
                          สิทธิ์ 50% ว่าง
                        </span>
                      </div>
                    </div>
                  </div>
                </td>

                <!-- Plan Status -->
                <td class="px-6 py-4 whitespace-nowrap">
                  <span 
                    class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold shadow-2xs"
                    :class="store.plan_status === 'active' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-amber-100 text-amber-800 border border-amber-200'"
                  >
                    <span class="w-1.5 h-1.5 rounded-full" :class="store.plan_status === 'active' ? 'bg-emerald-500' : 'bg-amber-500'"></span>
                    {{ store.plan_status === 'active' ? 'ใช้งานจริง (Paid)' : 'ทดลองใช้ (Trial)' }}
                  </span>
                </td>

                <!-- LINE Connection Status -->
                <td class="px-6 py-4 whitespace-nowrap">
                  <span 
                    v-if="store.line_user_id" 
                    class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200"
                    :title="`LINE ID: ${store.line_user_id}`"
                  >
                    <MessageCircle class="w-3 h-3 text-emerald-600" />
                    ผูก LINE แล้ว
                  </span>
                  <span 
                    v-else 
                    class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-slate-100 text-slate-400 border border-slate-200"
                  >
                    <X class="w-3 h-3 text-slate-400" />
                    ยังไม่ผูก LINE
                  </span>
                </td>

                <!-- Expiration Countdown -->
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="flex items-center gap-2">
                    <div 
                      class="w-2 h-2 rounded-full shrink-0"
                      :class="{
                        'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]': getDaysRemaining(store) > 7,
                        'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]': getDaysRemaining(store) >= 0 && getDaysRemaining(store) <= 7,
                        'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]': getDaysRemaining(store) < 0
                      }"
                    ></div>
                    <div>
                      <p class="text-xs font-semibold text-foreground">
                        {{ formatDate(getActiveEndDate(store)) }}
                      </p>
                      <p 
                        class="text-[11px] font-medium"
                        :class="{
                          'text-emerald-600': getDaysRemaining(store) > 7,
                          'text-amber-600 font-bold': getDaysRemaining(store) >= 0 && getDaysRemaining(store) <= 7,
                          'text-rose-600 font-bold': getDaysRemaining(store) < 0
                        }"
                      >
                        <span v-if="isExpired(store)">หมดอายุแล้ว ({{ Math.abs(getDaysRemaining(store)) }} วันก่อน)</span>
                        <span v-else>เหลืออีก {{ getDaysRemaining(store) }} วัน</span>
                      </p>
                    </div>
                  </div>
                </td>

                <!-- Actions -->
                <td class="px-6 py-4 text-right whitespace-nowrap">
                  <div class="flex items-center justify-end gap-2">
                    
                    <!-- Quick +7 Days Button -->
                    <button 
                      @click="quickGrant7Days(store)" 
                      :disabled="processingId === store.id"
                      class="px-2.5 py-1.5 text-xs font-medium bg-muted hover:bg-muted/80 text-foreground rounded-lg border transition-all inline-flex items-center gap-1 disabled:opacity-50"
                      title="เพิ่มวันทดลองฟรี 7 วันทันที"
                    >
                      <Plus class="w-3.5 h-3.5 text-emerald-600" />
                      <span class="hidden xl:inline">+7 วันฟรี</span>
                    </button>

                    <!-- Main Manage Button -->
                    <button 
                      @click="openManageModal(store, 'renew')" 
                      :disabled="processingId === store.id"
                      class="px-3.5 py-1.5 text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg shadow-2xs transition-all flex items-center gap-1.5 disabled:opacity-50"
                    >
                      <CreditCard class="w-3.5 h-3.5" />
                      <span>จัดการร้าน</span>
                    </button>

                  </div>
                </td>

              </tr>
            </tbody>
          </table>
        </div>

      </section>

      <!-- 3. Recent Admin Action Logs Section -->
      <section class="bg-card border rounded-3xl p-6 shadow-xs space-y-4">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <div class="p-1.5 rounded-lg bg-primary/10 text-primary">
              <Clock class="w-4 h-4" />
            </div>
            <h3 class="font-bold text-foreground text-sm">บันทึกการทำงานของแอดมินล่าสุด (Audit Trail)</h3>
          </div>
          <span class="text-xs text-muted-foreground">{{ logs.length }} รายการล่าสุด</span>
        </div>

        <div v-if="logs.length === 0" class="text-center py-6 text-xs text-muted-foreground">
          ยังไม่มีประวัติการทำงาน
        </div>
        
        <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div 
            v-for="log in logs" 
            :key="log.id" 
            class="p-3 bg-muted/20 border rounded-xl flex items-center justify-between gap-3 text-xs"
          >
            <div class="flex items-center gap-2.5 truncate">
              <span class="w-2 h-2 rounded-full bg-primary shrink-0"></span>
              <span class="font-semibold text-foreground uppercase tracking-wide">{{ log.action }}</span>
              <span class="text-muted-foreground font-mono text-[11px] truncate">Store: {{ log.target_store_id?.slice(0, 8) }}...</span>
            </div>
            <span class="text-[11px] text-muted-foreground shrink-0 font-medium">{{ formatDateTime(log.created_at) }}</span>
          </div>
        </div>
      </section>

    </main>

    <!-- ================================================================= -->
    <!-- UNIFIED STORE MANAGEMENT MODAL                                    -->
    <!-- ================================================================= -->
    <div 
      v-if="showManageModal && activeStore" 
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div class="bg-card border rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[92vh]">
        
        <!-- Modal Header -->
        <div class="p-6 border-b bg-muted/20 flex items-start justify-between">
          <div class="flex items-center gap-3.5">
            <div class="w-12 h-12 rounded-2xl bg-gradient-to-br from-rose-500 to-pink-600 text-white font-black flex items-center justify-center text-lg shadow-sm">
              {{ activeStore.name?.charAt(0) }}
            </div>
            <div>
              <h3 class="text-lg font-black text-foreground">{{ activeStore.name }}</h3>
              <p class="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                <span class="font-mono bg-muted px-1.5 py-0.2 rounded">/{{ activeStore.slug }}</span>
                <span>• หมดอายุ: <strong class="text-foreground">{{ formatDate(getActiveEndDate(activeStore)) }}</strong></span>
              </p>
            </div>
          </div>
          
          <button 
            @click="closeManageModal" 
            class="text-muted-foreground hover:text-foreground p-1.5 rounded-xl hover:bg-muted transition-colors"
          >
            <X class="w-5 h-5" />
          </button>
        </div>

        <!-- Mode Tabs (3 Tabs) -->
        <div class="flex border-b px-6 bg-muted/5 gap-2 sm:gap-4 overflow-x-auto">
          <button 
            @click="activeTab = 'renew'" 
            class="py-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 shrink-0"
            :class="activeTab === 'renew' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'"
          >
            <CreditCard class="w-4 h-4" />
            ต่ออายุสมาชิก
          </button>

          <button 
            @click="activeTab = 'adjust'" 
            class="py-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 shrink-0"
            :class="activeTab === 'adjust' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'"
          >
            <Calendar class="w-4 h-4" />
            ปรับวันพิเศษ
          </button>

          <button 
            @click="activeTab = 'line'" 
            class="py-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 shrink-0"
            :class="activeTab === 'line' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'"
          >
            <MessageCircle class="w-4 h-4 text-emerald-600" />
            ผูก LINE ID ร้านค้า
          </button>
        </div>

        <!-- Modal Body -->
        <div class="p-6 overflow-y-auto flex-1 space-y-6">
          
          <!-- TAB 1: RENEWAL & PAYMENT -->
          <div v-if="activeTab === 'renew'" class="space-y-5">
            
            <!-- Package Selection Cards -->
            <div>
              <label class="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2.5">
                เลือกแพ็กเกจที่ร้านค้าสั่งซื้อ:
              </label>
              
              <div class="grid grid-cols-3 gap-3">
                <div 
                  v-for="(pkg, key) in SUBSCRIPTION_PACKAGES" 
                  :key="key"
                  @click="selectedPkgId = key"
                  class="cursor-pointer border-2 rounded-2xl p-3.5 text-center transition-all relative"
                  :class="selectedPkgId === key ? 'border-primary bg-primary/5 shadow-xs' : 'border-border hover:border-muted-foreground/30'"
                >
                  <div v-if="key === 'monthly'" class="absolute -top-2.5 left-0 right-0 flex justify-center">
                    <span class="bg-primary text-primary-foreground text-[9px] font-extrabold px-2 py-0.2 rounded-full uppercase">
                      ยอดนิยม
                    </span>
                  </div>

                  <p class="text-xs font-bold text-foreground">{{ pkg.name }}</p>
                  
                  <div class="mt-2">
                    <span class="text-lg font-black text-primary">
                      {{ formatCurrency(useFirstTimePromo && !activeStore.has_used_first_time_promo ? pkg.firstTime : pkg.standard) }}
                    </span>
                  </div>
                  <span class="text-[10px] text-muted-foreground">({{ pkg.days }} วัน)</span>
                </div>
              </div>
            </div>

            <!-- First-Time 50% Promo Box -->
            <div>
              <!-- If eligible -->
              <div 
                v-if="!activeStore.has_used_first_time_promo"
                class="p-4 rounded-2xl border-2 border-rose-200 bg-rose-50/50 flex items-center justify-between"
              >
                <div class="flex items-center gap-3">
                  <div class="w-8 h-8 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                    <Sparkles class="w-4 h-4" />
                  </div>
                  <div>
                    <p class="text-xs font-bold text-rose-900">ใช้สิทธิ์โปรโมชั่นลด 50% (ครั้งแรก)</p>
                    <p class="text-[11px] text-rose-600">ร้านนี้ยังไม่เคยใช้สิทธิ์โปรโมชั่น</p>
                  </div>
                </div>
                
                <label class="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" v-model="useFirstTimePromo" class="sr-only peer">
                  <div class="w-11 h-6 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-rose-500"></div>
                </label>
              </div>

              <!-- If already used -->
              <div 
                v-else 
                class="p-3.5 rounded-2xl bg-muted/40 border flex items-center gap-2.5 text-xs text-muted-foreground"
              >
                <CheckCircle2 class="w-4 h-4 text-slate-400 shrink-0" />
                <span>ร้านนี้เคยใช้สิทธิ์โปรโมชั่น 50% ไปแล้ว (ระบบคำนวณราคามาตรฐาน)</span>
              </div>
            </div>

            <!-- Calculation Summary Banner -->
            <div class="p-4 bg-muted/30 border rounded-2xl space-y-2 text-xs">
              <div class="flex justify-between text-muted-foreground">
                <span>ราคาเต็มแพ็กเกจ:</span>
                <span>{{ formatCurrency(currentPkg.standard) }}</span>
              </div>

              <div v-if="useFirstTimePromo && !activeStore.has_used_first_time_promo" class="flex justify-between text-rose-600 font-semibold">
                <span>ส่วนลด First-Time (50%):</span>
                <span>-{{ formatCurrency(currentPkg.standard - currentPkg.firstTime) }}</span>
              </div>

              <div class="pt-2 border-t flex justify-between items-center font-bold text-sm text-foreground">
                <span>ยอดเงินที่ต้องเรียกเก็บ:</span>
                <span class="text-lg text-primary">{{ formatCurrency(calculatedPrice) }}</span>
              </div>

              <div class="pt-1 text-[11px] text-muted-foreground">
                🗓️ วันหมดอายุใหม่: <strong class="text-foreground">{{ previewNewExpiryDate }}</strong> (+{{ currentPkg.days }} วัน)
              </div>
            </div>

            <!-- Note input -->
            <div>
              <label class="block text-xs font-medium text-foreground mb-1.5">
                หมายเหตุการชำระเงิน (ระบุธนาคาร / เลขสลิป / เวลาโอน):
              </label>
              <input 
                v-model="renewNote" 
                type="text" 
                placeholder="เช่น KBank โอน 129 บ. เวลา 14:30 น."
                class="w-full px-3.5 py-2.5 bg-background border rounded-xl text-xs focus:ring-2 focus:ring-primary/20 focus:border-primary outline-hidden"
              />
            </div>

          </div>

          <!-- TAB 2: ADJUSTMENTS & FREE TRIALS -->
          <div v-if="activeTab === 'adjust'" class="space-y-4">
            
            <label class="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">
              เลือกประเภทการปรับวัน:
            </label>

            <div class="grid grid-cols-2 gap-2.5">
              <button 
                type="button"
                @click="adjustType = 'add_7'; adjustDays = 7"
                class="p-3 rounded-xl border text-left text-xs font-medium transition-all"
                :class="adjustType === 'add_7' ? 'border-primary bg-primary/5 text-primary font-bold' : 'border-border hover:bg-muted'"
              >
                🎁 +7 วันฟรี (ทดลองใช้)
              </button>

              <button 
                type="button"
                @click="adjustType = 'add_14'; adjustDays = 14"
                class="p-3 rounded-xl border text-left text-xs font-medium transition-all"
                :class="adjustType === 'add_14' ? 'border-primary bg-primary/5 text-primary font-bold' : 'border-border hover:bg-muted'"
              >
                🎁 +14 วันฟรี (ทดลองใช้)
              </button>

              <button 
                type="button"
                @click="adjustType = 'custom_add'"
                class="p-3 rounded-xl border text-left text-xs font-medium transition-all"
                :class="adjustType === 'custom_add' ? 'border-primary bg-primary/5 text-primary font-bold' : 'border-border hover:bg-muted'"
              >
                ➕ เพิ่มวันพิเศษ (กำหนดเอง)
              </button>

              <button 
                type="button"
                @click="adjustType = 'custom_deduct'"
                class="p-3 rounded-xl border text-left text-xs font-medium transition-all text-rose-600"
                :class="adjustType === 'custom_deduct' ? 'border-rose-500 bg-rose-50 font-bold' : 'border-border hover:bg-muted'"
              >
                ➖ ลบ/ลดจำนวนวัน
              </button>
            </div>

            <!-- Custom Days Input -->
            <div v-if="adjustType === 'custom_add' || adjustType === 'custom_deduct'" class="pt-2">
              <label class="block text-xs font-medium text-foreground mb-1">
                จำนวนวัน:
              </label>
              <input 
                v-model.number="adjustDays" 
                type="number" 
                min="1"
                class="w-full px-3.5 py-2.5 bg-background border rounded-xl text-xs focus:ring-2 focus:ring-primary/20 focus:border-primary outline-hidden"
              />
            </div>

            <!-- Mandatory Note for Adjustments -->
            <div class="pt-2">
              <label class="block text-xs font-medium text-foreground mb-1">
                เหตุผลในการปรับสถานะ: <span class="text-rose-500">*</span>
              </label>
              <input 
                v-model="adjustNote" 
                type="text" 
                placeholder="เช่น ร้านแจ้งขยายเวลาทดสอบ, ปรับลดยอดวันใช้งาน"
                class="w-full px-3.5 py-2.5 bg-background border rounded-xl text-xs focus:ring-2 focus:ring-primary/20 focus:border-primary outline-hidden"
              />
            </div>

            <!-- Revoke Box -->
            <div class="pt-4 border-t">
              <button 
                type="button"
                @click="adjustType = 'revoke'"
                class="w-full p-3 rounded-xl border border-rose-200 bg-rose-50/50 hover:bg-rose-100 text-rose-700 text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
              >
                <AlertCircle class="w-4 h-4 text-rose-600" />
                ตัดการเข้าถึงระบบทันที (Revoke Access)
              </button>
            </div>

          </div>

          <!-- TAB 3: LINE USER ID & STORE INFO -->
          <div v-if="activeTab === 'line'" class="space-y-4">
            
            <!-- Connection Status -->
            <div 
              class="p-4 rounded-2xl border flex items-center justify-between"
              :class="editLineUserId ? 'bg-emerald-50/50 border-emerald-200 text-emerald-900' : 'bg-slate-50 border-slate-200 text-slate-700'"
            >
              <div class="flex items-center gap-3">
                <div class="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" :class="editLineUserId ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-200 text-slate-500'">
                  <MessageCircle class="w-5 h-5" />
                </div>
                <div>
                  <p class="text-xs font-bold">{{ editLineUserId ? 'สถานะ: ผูกบัญชี LINE เรียบร้อยแล้ว' : 'สถานะ: ยังไม่ได้ระบุ LINE User ID' }}</p>
                  <p class="text-[11px] text-muted-foreground">{{ editLineUserId ? 'เมื่อมีออเดอร์ใหม่ ระบบจะส่งแจ้งเตือนเข้าบัญชีนี้ทันที' : 'ลูกค้าร้านค้าต้องแจ้งรหัส LINE เพื่อให้ระบบส่งออเดอร์เข้ามือถือ' }}</p>
                </div>
              </div>
            </div>

            <!-- LINE User ID Input -->
            <div>
              <label class="block text-xs font-bold text-foreground mb-1.5">
                LINE User ID (ขึ้นต้นด้วย U... ความยาว 33 หลัก):
              </label>
              <input 
                v-model="editLineUserId" 
                type="text" 
                placeholder="เช่น U3cfe1457fc5f6d1c6939e4147cb8ba75"
                class="w-full px-3.5 py-2.5 bg-background border rounded-xl font-mono text-xs focus:ring-2 focus:ring-primary/20 focus:border-primary outline-hidden"
              />
              <p class="text-[11px] text-muted-foreground mt-1">
                💡 นำรหัสมาจากข้อความแชทที่ร้านค้าทักเข้ามาใน LINE Official Account
              </p>
            </div>

            <!-- Phone Number Input -->
            <div>
              <label class="block text-xs font-medium text-foreground mb-1.5">
                เบอร์โทรศัพท์ติดต่อร้านค้า:
              </label>
              <input 
                v-model="editPhone" 
                type="text" 
                placeholder="เช่น 081-234-5678"
                class="w-full px-3.5 py-2.5 bg-background border rounded-xl text-xs focus:ring-2 focus:ring-primary/20 focus:border-primary outline-hidden"
              />
            </div>

            <!-- Store IDs Quick Copy -->
            <div class="p-3.5 bg-muted/20 border rounded-2xl space-y-1.5 text-xs text-muted-foreground">
              <div class="flex justify-between">
                <span>Store ID:</span>
                <span class="font-mono text-foreground select-all">{{ activeStore.id }}</span>
              </div>
              <div class="flex justify-between">
                <span>Slug:</span>
                <span class="font-mono text-foreground">/{{ activeStore.slug }}</span>
              </div>
            </div>

          </div>

        </div>

        <!-- Modal Footer -->
        <div class="p-5 border-t bg-muted/20 flex items-center justify-between gap-3">
          <button 
            @click="closeManageModal" 
            class="px-4 py-2 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl transition-colors"
          >
            ยกเลิก
          </button>
          
          <button 
            v-if="activeTab === 'renew'"
            @click="submitRenewal" 
            :disabled="processingId === activeStore.id"
            class="px-6 py-2.5 text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl shadow-xs transition-all flex items-center gap-2 disabled:opacity-50"
          >
            <span v-if="processingId === activeStore.id" class="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
            <Check class="w-4 h-4" v-else />
            <span>ยืนยันรับเงิน {{ formatCurrency(calculatedPrice) }} และต่ออายุ</span>
          </button>

          <button 
            v-if="activeTab === 'adjust'"
            @click="submitAdjustment" 
            :disabled="processingId === activeStore.id"
            class="px-6 py-2.5 text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-2 disabled:opacity-50 text-white"
            :class="adjustType === 'revoke' || adjustType === 'custom_deduct' ? 'bg-rose-600 hover:bg-rose-700' : 'bg-slate-900 hover:bg-slate-800'"
          >
            <span v-if="processingId === activeStore.id" class="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
            <span>ยืนยันการปรับวัน</span>
          </button>

          <button 
            v-if="activeTab === 'line'"
            @click="saveStoreInfo" 
            :disabled="processingId === activeStore.id"
            class="px-6 py-2.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs transition-all flex items-center gap-2 disabled:opacity-50"
          >
            <span v-if="processingId === activeStore.id" class="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
            <Check class="w-4 h-4" v-else />
            <span>บันทึก LINE ID & ข้อมูลร้าน</span>
          </button>
        </div>

      </div>
    </div>

  </div>
</template>
