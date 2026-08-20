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
  Copy,
  QrCode,
  Utensils,
  Layers,
  FileText,
  Lock,
  Unlock,
  Eye,
  Sliders,
  Settings,
  Sun,
  Moon,
  Maximize2,
  Minimize2,
  SlidersHorizontal,
  ChevronDown
} from 'lucide-vue-next'
import { SUBSCRIPTION_PACKAGES, type PackageId } from '~/utils/pricing'
import AdminSecurityGate from '~/components/admin/AdminSecurityGate.vue'
import AdminQrStudio from '~/components/admin/AdminQrStudio.vue'
import AdminBackofficeSetup from '~/components/admin/AdminBackofficeSetup.vue'

definePageMeta({
  middleware: ['auth', 'admin']
})

const client = useSupabaseClient()
const user = useSupabaseUser()
const { t, locale, setLocale } = useI18n()

// Theme State (Dark / Light Mode)
const { currentTheme, isDark, toggleTheme, initTheme } = useTheme()

// Full Screen / Fluid Layout Toggle
const isFluidWidth = ref(true)

// Security Gate Ref & State
const securityGateRef = ref<any>(null)
const isSecurityUnlocked = ref(false)

// Active Top-Level Navigation Tab
const activeAdminTab = ref<'stores' | 'backoffice' | 'qr_studio' | 'logs'>('stores')
const activeTargetStoreId = ref<string>('')

// Stores State
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
const activeModalTab = ref<'renew' | 'adjust' | 'line'>('renew')

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
    if (stores.value.length > 0 && !activeTargetStoreId.value) {
      activeTargetStoreId.value = stores.value[0].id
    }
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
      .limit(50)
      
    if (data) logs.value = data
  } catch (err) {
    console.error('Fetch logs error:', err)
  }
}

const refreshData = async () => {
  refreshing.value = true
  await Promise.all([fetchStores(), fetchLogs()])
  refreshing.value = false
  useToast().success('อัปเดตข้อมูลล่าสุดเรียบร้อยแล้ว')
}

onMounted(() => {
  initTheme()
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

  if (currentFilter.value === 'active') {
    list = list.filter(s => s.plan_status === 'active' && !isExpired(s))
  } else if (currentFilter.value === 'trial') {
    list = list.filter(s => s.plan_status !== 'active' && !isExpired(s))
  } else if (currentFilter.value === 'expiring_soon') {
    list = list.filter(s => isExpiringSoon(s))
  } else if (currentFilter.value === 'expired') {
    list = list.filter(s => isExpired(s))
  }

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

// Jump directly to Backoffice Setup tab for a store
const goToBackoffice = (storeId: string) => {
  activeTargetStoreId.value = storeId
  activeAdminTab.value = 'backoffice'
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

// Jump directly to QR Studio tab for a store
const goToQrStudio = (storeId: string) => {
  activeTargetStoreId.value = storeId
  activeAdminTab.value = 'qr_studio'
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

// Modal Actions
const openManageModal = (store: any, defaultTab: 'renew' | 'adjust' | 'line' = 'renew') => {
  activeStore.value = store
  activeModalTab.value = defaultTab
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

    useToast().success(`ต่ออายุร้าน "${store.name}" สำเร็จ!`)
    closeManageModal()
    await refreshData()
  } catch (err: any) {
    console.error('Renewal error:', err)
    useToast().error(`เกิดข้อผิดพลาด: ${err.message}`)
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
      useToast().warning('กรุณาระบุเหตุผลในการลดวันใช้งาน')
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

    useToast().success(`ปรับสถานะร้าน "${store.name}" เรียบร้อยแล้ว!`)
    closeManageModal()
    await refreshData()
  } catch (err: any) {
    console.error('Adjust error:', err)
    useToast().error(`เกิดข้อผิดพลาด: ${err.message}`)
  } finally {
    processingId.value = null
  }
}

// 1-Click Quick Grant +7 Days
const quickGrantTrial = async (store: any) => {
  processingId.value = store.id
  try {
    const now = new Date()
    const currentEnd = new Date(getActiveEndDate(store))
    const baseDate = currentEnd > now ? currentEnd : now
    const newEnd = new Date(baseDate)
    newEnd.setDate(newEnd.getDate() + 7)

    const { error } = await (client as any).rpc('admin_update_store_plan', {
      p_store_id: store.id,
      p_plan_status: store.plan_status,
      p_trial_ends_at: newEnd.toISOString(),
      p_action: 'quick_grant_7',
      p_details: {
        previous_end: store.trial_ends_at,
        new_end: newEnd.toISOString(),
        granted_by: user.value?.email
      },
      p_amount: null,
      p_package_name: null,
      p_package_days: null,
      p_note: 'Quick Grant 7 Days Trial from Admin Table',
      p_original_amount: null,
      p_discount_amount: null,
      p_promotion_code: null
    })

    if (error) throw error

    useToast().success(`เพิ่มเวลา 7 วันให้ร้าน "${store.name}" สำเร็จ!`)
    await refreshData()
  } catch (err: any) {
    console.error('Quick grant error:', err)
    useToast().error(`เกิดข้อผิดพลาด: ${err.message}`)
  } finally {
    processingId.value = null
  }
}

// Save LINE & Phone
const saveStoreInfo = async () => {
  if (!activeStore.value) return
  const store = activeStore.value

  processingId.value = store.id
  try {
    const { error } = await (client as any)
      .from('stores')
      .update({
        line_user_id: editLineUserId.value.trim() || null,
        phone: editPhone.value.trim() || null
      })
      .eq('id', store.id)

    if (error) throw error

    useToast().success('บันทึกข้อมูล LINE OA และเบอร์โทรสำเร็จ!')
    closeManageModal()
    await refreshData()
  } catch (err: any) {
    console.error('Save info error:', err)
    useToast().error(`เกิดข้อผิดพลาด: ${err.message}`)
  } finally {
    processingId.value = null
  }
}

const handleLogout = async () => {
  const swal = useAlert()
  const result = await swal.fire({
    title: (useNuxtApp().$i18n.t('confirm_logout_title') as string) || 'ยืนยันการออกจากระบบ',
    text: 'คุณต้องการออกจากระบบผู้ดูแลระบบ (Admin) ใช่หรือไม่?',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#e11d48',
    cancelButtonColor: '#64748b',
    confirmButtonText: (useNuxtApp().$i18n.t('btn_logout_confirm') as string) || 'ออกจากระบบ',
    cancelButtonText: (useNuxtApp().$i18n.t('btn_cancel') as string) || 'ยกเลิก'
  })

  if (!result.isConfirmed) return

  await client.auth.signOut()
  navigateTo('/login')
}
</script>

<template>
  <div 
    class="min-h-screen font-sans pb-16 transition-colors duration-200"
    :class="isDark ? 'bg-[#0c1818] text-gray-100 selection:bg-[#E8572E] selection:text-white' : 'bg-[#FAF8F5] text-gray-900 selection:bg-[#E8572E] selection:text-white'"
  >
    <!-- TOP MASTER SUPER ADMIN HEADER BAR -->
    <header class="sticky top-0 z-40 bg-white/95 dark:bg-[#132525]/95 border-b border-gray-200 dark:border-[#1B4B4A] backdrop-blur-md px-4 sm:px-6 lg:px-8 py-3 shadow-sm transition-colors">
      <div 
        class="mx-auto flex flex-wrap items-center justify-between gap-3"
        :class="isFluidWidth ? 'w-full max-w-[1720px]' : 'max-w-7xl'"
      >
        <!-- Brand Title & Badges -->
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#E8572E] to-[#F0A73C] p-0.5 shadow-md shadow-[#E8572E]/20 shrink-0">
            <div class="w-full h-full bg-white dark:bg-[#0c1818] rounded-xl flex items-center justify-center text-[#E8572E]">
              <ShieldCheck class="w-5 h-5" />
            </div>
          </div>
          <div>
            <h1 class="text-sm sm:text-base font-bold text-gray-900 dark:text-white tracking-tight flex items-center gap-2 flex-wrap">
              <span>ChiiMenu Super Admin</span>
              <span class="text-[10px] px-2 py-0.5 rounded-full bg-[#E8572E]/15 text-[#E8572E] border border-[#E8572E]/30 font-mono font-bold">
                Control Hub v2.0
              </span>
            </h1>
            <p class="text-[11px] text-gray-500 dark:text-gray-400 hidden sm:block">ศูนย์ควบคุมสิทธิ์ บริการ Done-For-You และห้องแล็บ QR Studio</p>
          </div>
        </div>

        <!-- Header Right Utilities & Switchers -->
        <div class="flex items-center gap-2">
          
          <!-- Full-Width Fluid Screen Toggle -->
          <button 
            @click="isFluidWidth = !isFluidWidth"
            class="p-2 rounded-xl border transition-all cursor-pointer shadow-sm hidden md:flex items-center justify-center text-xs"
            :class="isDark ? 'bg-white/5 hover:bg-white/10 text-gray-300 border-white/10' : 'bg-gray-100 hover:bg-gray-200 text-gray-700 border-gray-200'"
            :title="isFluidWidth ? 'ย่อมุมมองเป็น Standard 1280px' : 'ขยายเต็มหน้าจอ Full Width (1720px)'"
          >
            <Minimize2 v-if="isFluidWidth" class="w-4 h-4" />
            <Maximize2 v-else class="w-4 h-4" />
          </button>

          <!-- Dark / Light Mode Toggle Button -->
          <button 
            @click="toggleTheme"
            class="p-2 rounded-xl border transition-all cursor-pointer shadow-sm flex items-center justify-center text-xs"
            :class="isDark ? 'bg-white/5 hover:bg-white/10 text-amber-400 border-white/10' : 'bg-gray-100 hover:bg-gray-200 text-amber-600 border-gray-200'"
            :title="isDark ? 'เปลี่ยนเป็นโหมดสว่าง (Light Mode)' : 'เปลี่ยนเป็นโหมดมืด (Dark Mode)'"
          >
            <Sun v-if="isDark" class="w-4 h-4" />
            <Moon v-else class="w-4 h-4" />
          </button>

          <!-- Refresh Data Button -->
          <button 
            @click="refreshData"
            :disabled="refreshing"
            class="px-3 py-1.5 rounded-xl border transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5 text-xs font-semibold shadow-sm"
            :class="isDark ? 'bg-white/5 hover:bg-white/10 text-gray-300 border-white/10' : 'bg-gray-100 hover:bg-gray-200 text-gray-700 border-gray-200'"
            title="รีเฟรชข้อมูลทั้งหมด"
          >
            <RefreshCw class="w-3.5 h-3.5" :class="{ 'animate-spin': refreshing }" />
            <span class="hidden sm:inline">รีเฟรช</span>
          </button>

          <!-- Public Website Link -->
          <NuxtLink 
            to="/" 
            target="_blank"
            class="px-3 py-1.5 rounded-xl border transition-all flex items-center gap-1.5 text-xs font-semibold shadow-sm"
            :class="isDark ? 'bg-white/5 hover:bg-white/10 text-gray-300 border-white/10' : 'bg-gray-100 hover:bg-gray-200 text-gray-700 border-gray-200'"
          >
            <Globe class="w-3.5 h-3.5" />
            <span class="hidden sm:inline">หน้าเว็บ</span>
          </NuxtLink>

          <!-- Logout Button -->
          <button 
            @click="handleLogout"
            class="px-3 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 text-xs font-semibold border border-red-500/30 flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
          >
            <LogOut class="w-3.5 h-3.5" />
            <span class="hidden sm:inline">ออก</span>
          </button>
        </div>
      </div>
    </header>

    <!-- MAIN CONTAINER (Fluid Width Option) -->
    <main 
      class="mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6"
      :class="isFluidWidth ? 'w-full max-w-[1720px]' : 'max-w-7xl'"
    >
      
      <!-- 2-FACTOR SECURITY GATE (With Session Lock/Unlock) -->
      <AdminSecurityGate 
        ref="securityGateRef"
        :user-email="user?.email"
        :user-id="user?.id"
        @unlock="isSecurityUnlocked = true"
        @lock="isSecurityUnlocked = false"
      />

      <!-- MAIN UNLOCKED ADMIN CONTENT -->
      <div v-if="isSecurityUnlocked" class="space-y-6 animate-fadeIn">
        
        <!-- MASTER NAVIGATION MENU BAR (Sticky Sub-nav) -->
        <nav class="sticky top-[57px] z-30 flex items-center gap-2 overflow-x-auto p-1.5 rounded-2xl bg-white/95 dark:bg-[#132525]/95 border border-gray-200 dark:border-[#1B4B4A] shadow-md backdrop-blur-md no-scrollbar transition-colors">
          
          <button 
            @click="activeAdminTab = 'stores'"
            class="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap cursor-pointer"
            :class="activeAdminTab === 'stores' ? 'bg-[#E8572E] text-white shadow-lg shadow-[#E8572E]/25' : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5'"
          >
            <Store class="w-4 h-4" />
            <span>1. คลังร้านค้า & สิทธิ์</span>
            <span class="text-[10px] px-1.5 py-0.5 rounded-full bg-black/20 dark:bg-black/40 font-mono">{{ stores.length }}</span>
          </button>

          <button 
            @click="activeAdminTab = 'backoffice'"
            class="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap cursor-pointer"
            :class="activeAdminTab === 'backoffice' ? 'bg-[#E8572E] text-white shadow-lg shadow-[#E8572E]/25' : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5'"
          >
            <Utensils class="w-4 h-4" />
            <span>2. จัดการหลังบ้าน Done-For-You</span>
            <span class="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold">Full Setup</span>
          </button>

          <button 
            @click="activeAdminTab = 'qr_studio'"
            class="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap cursor-pointer"
            :class="activeAdminTab === 'qr_studio' ? 'bg-[#E8572E] text-white shadow-lg shadow-[#E8572E]/25' : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5'"
          >
            <QrCode class="w-4 h-4" />
            <span>3. QR Studio & High-Res Export</span>
            <span class="text-[10px] px-1.5 py-0.5 rounded-full bg-[#F0A73C]/20 text-[#F0A73C] font-bold">300 DPI / ZIP</span>
          </button>

          <button 
            @click="activeAdminTab = 'logs'"
            class="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap cursor-pointer ml-auto"
            :class="activeAdminTab === 'logs' ? 'bg-[#E8572E] text-white shadow-lg shadow-[#E8572E]/25' : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5'"
          >
            <FileText class="w-4 h-4" />
            <span>4. Audit Trail Logs</span>
            <span class="text-[10px] px-1.5 py-0.5 rounded-full bg-black/20 dark:bg-black/40 font-mono">{{ logs.length }}</span>
          </button>
        </nav>

        <!-- ========================================================================= -->
        <!-- TAB 1: STORE DIRECTORY & LICENSE MANAGEMENT                               -->
        <!-- ========================================================================= -->
        <div v-if="activeAdminTab === 'stores'" class="space-y-6">
          
          <!-- KPI Summary Cards -->
          <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
            
            <div class="p-4 sm:p-5 rounded-2xl bg-white dark:bg-gradient-to-br dark:from-[#132525] dark:to-[#0c1818] border border-gray-200 dark:border-[#1B4B4A] shadow-sm">
              <div class="flex items-center justify-between text-gray-500 dark:text-gray-400 text-xs font-semibold">
                <span>ร้านค้าทั้งหมด</span>
                <Store class="w-4 h-4" />
              </div>
              <div class="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white mt-2 font-mono">
                {{ stats.total }} <span class="text-xs text-gray-500 dark:text-gray-400 font-normal">ร้าน</span>
              </div>
            </div>

            <div class="p-4 sm:p-5 rounded-2xl bg-white dark:bg-gradient-to-br dark:from-[#132525] dark:to-[#0c1818] border border-emerald-500/30 shadow-sm">
              <div class="flex items-center justify-between text-emerald-600 dark:text-emerald-400 text-xs font-bold">
                <span>สมาชิกร้านค้า Paid Active</span>
                <CheckCircle2 class="w-4 h-4 text-emerald-500" />
              </div>
              <div class="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400 mt-2 font-mono">
                {{ stats.activePaid }} <span class="text-xs text-gray-500 dark:text-gray-400 font-normal">ร้าน</span>
              </div>
            </div>

            <div class="p-4 sm:p-5 rounded-2xl bg-white dark:bg-gradient-to-br dark:from-[#132525] dark:to-[#0c1818] border border-blue-500/30 shadow-sm">
              <div class="flex items-center justify-between text-blue-600 dark:text-blue-400 text-xs font-bold">
                <span>ช่วงทดลองใช้ฟรี (Trial)</span>
                <Clock class="w-4 h-4 text-blue-500" />
              </div>
              <div class="text-2xl sm:text-3xl font-black text-blue-600 dark:text-blue-400 mt-2 font-mono">
                {{ stats.trialActive }} <span class="text-xs text-gray-500 dark:text-gray-400 font-normal">ร้าน</span>
              </div>
            </div>

            <div class="p-4 sm:p-5 rounded-2xl bg-white dark:bg-gradient-to-br dark:from-[#132525] dark:to-[#0c1818] border border-amber-500/30 shadow-sm">
              <div class="flex items-center justify-between text-amber-600 dark:text-amber-400 text-xs font-bold">
                <span>ใกล้หมดอายุ (≤ 7 วัน)</span>
                <AlertTriangle class="w-4 h-4 text-amber-500" />
              </div>
              <div class="text-2xl sm:text-3xl font-black text-amber-600 dark:text-amber-400 mt-2 font-mono">
                {{ stats.urgent }} <span class="text-xs text-gray-500 dark:text-gray-400 font-normal">ร้าน</span>
              </div>
            </div>

          </div>

          <!-- Directory Table Container -->
          <div class="p-5 sm:p-6 rounded-2xl bg-white dark:bg-[#132525] border border-gray-200 dark:border-[#1B4B4A] shadow-sm space-y-5 transition-colors">
            
            <!-- Filters and Search Bar -->
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              
              <!-- Tab Filters -->
              <div class="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                <button 
                  @click="currentFilter = 'all'"
                  class="px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap"
                  :class="currentFilter === 'all' ? 'bg-[#E8572E] text-white shadow' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white bg-gray-100 dark:bg-black/30'"
                >
                  ทั้งหมด ({{ stores.length }})
                </button>
                <button 
                  @click="currentFilter = 'active'"
                  class="px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap"
                  :class="currentFilter === 'active' ? 'bg-emerald-500 text-white shadow' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white bg-gray-100 dark:bg-black/30'"
                >
                  Active Paid
                </button>
                <button 
                  @click="currentFilter = 'trial'"
                  class="px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap"
                  :class="currentFilter === 'trial' ? 'bg-blue-500 text-white shadow' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white bg-gray-100 dark:bg-black/30'"
                >
                  Trial
                </button>
                <button 
                  @click="currentFilter = 'expiring_soon'"
                  class="px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap"
                  :class="currentFilter === 'expiring_soon' ? 'bg-amber-500 text-white shadow' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white bg-gray-100 dark:bg-black/30'"
                >
                  ใกล้หมดอายุ
                </button>
              </div>

              <!-- Search Box -->
              <div class="relative min-w-[260px]">
                <Search class="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input 
                  v-model="searchQuery"
                  type="text"
                  placeholder="ค้นหาชื่อร้าน, slug, เบอร์โทร, LINE ID..."
                  class="w-full pl-9 pr-3 py-2 rounded-xl bg-gray-50 dark:bg-black/40 border border-gray-300 dark:border-white/10 text-xs text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:border-[#E8572E] focus:ring-1 focus:ring-[#E8572E] outline-none transition-colors"
                />
              </div>
            </div>

            <!-- Stores Table -->
            <div class="overflow-x-auto rounded-xl border border-gray-200 dark:border-white/10">
              <table class="w-full text-left text-xs text-gray-700 dark:text-gray-300">
                <thead class="bg-gray-50 dark:bg-black/40 text-gray-500 dark:text-gray-400 text-[11px] uppercase font-bold border-b border-gray-200 dark:border-white/10">
                  <tr>
                    <th class="p-3.5">ร้านค้า (Store)</th>
                    <th class="p-3.5">สถานะแพ็กเกจ</th>
                    <th class="p-3.5">วันหมดอายุ</th>
                    <th class="p-3.5">LINE & เบอร์โทร</th>
                    <th class="p-3.5 text-right">การจัดการ & Setup</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-gray-100 dark:divide-white/5">
                  <tr v-if="loading">
                    <td colspan="5" class="p-12 text-center text-gray-400">
                      <RefreshCw class="w-6 h-6 animate-spin mx-auto mb-2 text-[#E8572E]" />
                      กำลังโหลดข้อมูลร้านค้า...
                    </td>
                  </tr>

                  <tr v-else-if="filteredStores.length === 0">
                    <td colspan="5" class="p-12 text-center text-gray-400">
                      ไม่พบร้านค้าที่ตรงกับเงื่อนไขการค้นหา
                    </td>
                  </tr>

                  <tr v-for="store in filteredStores" :key="store.id" class="hover:bg-gray-50/80 dark:hover:bg-white/[0.02] transition-colors">
                    
                    <!-- Store Info -->
                    <td class="p-3.5">
                      <div class="flex items-center gap-3">
                        <div class="w-9 h-9 rounded-lg bg-gray-100 dark:bg-black/50 border border-gray-200 dark:border-white/10 overflow-hidden flex items-center justify-center shrink-0">
                          <img v-if="store.logo_url" :src="store.logo_url" alt="Logo" class="w-full h-full object-cover" />
                          <Store v-else class="w-4 h-4 text-[#E8572E]" />
                        </div>
                        <div>
                          <div class="font-bold text-gray-900 dark:text-white text-sm flex items-center gap-1.5">
                            {{ store.name }}
                            <a :href="`/m/${store.slug}`" target="_blank" class="text-gray-400 hover:text-[#E8572E]" title="เปิดหน้าเว็บร้าน">
                              <ExternalLink class="w-3 h-3" />
                            </a>
                          </div>
                          <div class="text-[11px] text-gray-500 dark:text-gray-400 font-mono mt-0.5">
                            /m/{{ store.slug }}
                          </div>
                        </div>
                      </div>
                    </td>

                    <!-- Plan Status -->
                    <td class="p-3.5">
                      <div class="space-y-1">
                        <span 
                          class="inline-block text-[10px] px-2 py-0.5 rounded-full font-bold uppercase"
                          :class="store.plan_status === 'active' ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30' : 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30'"
                        >
                          {{ store.plan_status === 'active' ? 'Paid Active' : 'Trial (ทดลองใช้)' }}
                        </span>
                        <div v-if="store.has_used_first_time_promo" class="text-[10px] text-gray-500 dark:text-gray-400 flex items-center gap-1">
                          <Tag class="w-2.5 h-2.5 text-[#F0A73C]" /> ใช้โปร 50% แล้ว
                        </div>
                        <div v-else class="text-[10px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-bold">
                          <Sparkles class="w-2.5 h-2.5" /> มีสิทธิ์ลด 50%
                        </div>
                      </div>
                    </td>

                    <!-- Expiry Date & Remaining Days -->
                    <td class="p-3.5">
                      <div class="space-y-0.5">
                        <div class="font-bold text-gray-900 dark:text-white">
                          {{ formatDate(getActiveEndDate(store)) }}
                        </div>
                        <div 
                          class="text-[11px] font-semibold"
                          :class="getDaysRemaining(store) < 0 ? 'text-red-500 dark:text-red-400 font-bold' : isExpiringSoon(store) ? 'text-amber-600 dark:text-amber-400 font-bold' : 'text-gray-500 dark:text-gray-400'"
                        >
                          <span v-if="getDaysRemaining(store) < 0">⚠️ หมดอายุแล้ว</span>
                          <span v-else>เหลือ {{ getDaysRemaining(store) }} วัน</span>
                        </div>
                      </div>
                    </td>

                    <!-- LINE & Phone -->
                    <td class="p-3.5">
                      <div class="space-y-1">
                        <div v-if="store.line_user_id" class="text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-mono font-medium">
                          <MessageCircle class="w-3 h-3" /> ผูก LINE แล้ว
                        </div>
                        <div v-else class="text-[11px] text-gray-400 flex items-center gap-1">
                          <MessageCircle class="w-3 h-3" /> ยังไม่ผูก LINE
                        </div>
                        <div v-if="store.phone" class="text-[11px] text-gray-700 dark:text-gray-300 flex items-center gap-1 font-mono">
                          <Phone class="w-3 h-3 text-gray-400" /> {{ store.phone }}
                        </div>
                      </div>
                    </td>

                    <!-- Action Buttons -->
                    <td class="p-3.5 text-right">
                      <div class="flex items-center justify-end gap-1.5 flex-wrap">
                        
                        <!-- Quick +7D Grant -->
                        <button 
                          @click="quickGrantTrial(store)"
                          :disabled="processingId === store.id"
                          class="px-2.5 py-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-300 border border-blue-500/30 text-[11px] font-bold transition-all cursor-pointer whitespace-nowrap"
                          title="เพิ่มเวลาทดลองใช้ 7 วันฟรีทันที"
                        >
                          +7 วันฟรี
                        </button>

                        <!-- Back-Office Setup (Done-for-you) -->
                        <button 
                          @click="goToBackoffice(store.id)"
                          class="px-2.5 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 border border-emerald-500/30 text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1 whitespace-nowrap"
                          title="จัดการหลังบ้านร้านค้า: เมนู หมวดหมู่ ตัวเลือกเสริม"
                        >
                          <Utensils class="w-3 h-3" />
                          หลังบ้าน
                        </button>

                        <!-- QR Studio -->
                        <button 
                          @click="goToQrStudio(store.id)"
                          class="px-2.5 py-1.5 rounded-lg bg-[#F0A73C]/15 hover:bg-[#F0A73C]/25 text-amber-700 dark:text-[#F0A73C] border border-[#F0A73C]/30 text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1 whitespace-nowrap"
                          title="ออกแบบและดาวน์โหลด QR Code 300 DPI / Standee / ZIP"
                        >
                          <QrCode class="w-3 h-3" />
                          QR Studio
                        </button>

                        <!-- Manage Plan & Billing -->
                        <button 
                          @click="openManageModal(store, 'renew')"
                          class="px-2.5 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-white/10 dark:hover:bg-white/20 text-gray-800 dark:text-white text-[11px] font-semibold transition-all cursor-pointer whitespace-nowrap"
                        >
                          ปรับแพ็กเกจ
                        </button>
                      </div>
                    </td>

                  </tr>
                </tbody>
              </table>
            </div>

          </div>

        </div>

        <!-- ========================================================================= -->
        <!-- TAB 2: MERCHANT BACK-OFFICE DONE-FOR-YOU SETUP                            -->
        <!-- ========================================================================= -->
        <div v-else-if="activeAdminTab === 'backoffice'" class="space-y-6">
          <AdminBackofficeSetup 
            :stores="stores"
            :initial-store-id="activeTargetStoreId"
          />
        </div>

        <!-- ========================================================================= -->
        <!-- TAB 3: ADVANCED QR STUDIO & EXPORT SUITE                                  -->
        <!-- ========================================================================= -->
        <div v-else-if="activeAdminTab === 'qr_studio'" class="space-y-6">
          <AdminQrStudio 
            :stores="stores"
            :initial-store-id="activeTargetStoreId"
          />
        </div>

        <!-- ========================================================================= -->
        <!-- TAB 4: AUDIT TRAIL & LOGS                                                 -->
        <!-- ========================================================================= -->
        <div v-else-if="activeAdminTab === 'logs'" class="p-6 rounded-2xl bg-white dark:bg-[#132525] border border-gray-200 dark:border-[#1B4B4A] shadow-sm space-y-4 transition-colors">
          <div class="flex items-center justify-between">
            <div>
              <h3 class="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <FileText class="w-4 h-4 text-[#F0A73C]" />
                ประวัติการทำงานของแอดมิน (Admin Audit Trail Logs)
              </h3>
              <p class="text-xs text-gray-500 dark:text-gray-400">บันทึกทุกการต่ออายุ ปรับวัน ยืนยันความปลอดภัย และการแก้ไขร้านค้า</p>
            </div>
            <button @click="fetchLogs" class="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white flex items-center gap-1 cursor-pointer">
              <RefreshCw class="w-3 h-3" /> อัปเดต Log
            </button>
          </div>

          <div class="overflow-x-auto rounded-xl border border-gray-200 dark:border-white/10">
            <table class="w-full text-left text-xs text-gray-700 dark:text-gray-300">
              <thead class="bg-gray-50 dark:bg-black/40 text-gray-500 dark:text-gray-400 text-[11px] uppercase font-bold border-b border-gray-200 dark:border-white/10">
                <tr>
                  <th class="p-3">เวลาที่ทำรายการ</th>
                  <th class="p-3">Action / กิจกรรม</th>
                  <th class="p-3">เป้าหมายร้านค้า (Target)</th>
                  <th class="p-3">รายละเอียด (Details)</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-100 dark:divide-white/5">
                <tr v-if="logs.length === 0">
                  <td colspan="4" class="p-8 text-center text-gray-400">ไม่มีบันทึก Audit Log</td>
                </tr>
                <tr v-for="log in logs" :key="log.id" class="hover:bg-gray-50/80 dark:hover:bg-white/[0.02]">
                  <td class="p-3 whitespace-nowrap text-gray-500 dark:text-gray-400 font-mono text-[11px]">
                    {{ formatDateTime(log.created_at) }}
                  </td>
                  <td class="p-3 whitespace-nowrap">
                    <span class="px-2 py-0.5 rounded-full bg-gray-100 dark:bg-white/10 text-gray-800 dark:text-white font-mono text-[10px] font-bold">
                      {{ log.action }}
                    </span>
                  </td>
                  <td class="p-3 font-mono text-gray-700 dark:text-gray-300 text-[11px]">
                    {{ log.target_store_id ? log.target_store_id.substring(0, 8) + '...' : 'System / Global' }}
                  </td>
                  <td class="p-3 text-gray-500 dark:text-gray-400 font-mono text-[11px]">
                    {{ JSON.stringify(log.details) }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

      </div>

    </main>

    <!-- MANAGE PLAN & BILLING MODAL -->
    <div v-if="showManageModal && activeStore" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div class="w-full max-w-lg bg-white dark:bg-[#132525] border border-gray-200 dark:border-[#1B4B4A] rounded-3xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
        <div class="flex items-center justify-between border-b border-gray-100 dark:border-white/10 pb-3">
          <div>
            <h3 class="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <CreditCard class="w-4 h-4 text-[#E8572E]" />
              จัดการสิทธิ์: {{ activeStore.name }}
            </h3>
            <p class="text-xs text-gray-500 dark:text-gray-400">/m/{{ activeStore.slug }}</p>
          </div>
          <button @click="closeManageModal" class="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 text-gray-400"><X class="w-5 h-5" /></button>
        </div>

        <!-- Modal Tabs -->
        <div class="flex rounded-xl bg-gray-100 dark:bg-black/40 p-1 border border-gray-200 dark:border-white/10 text-xs">
          <button 
            @click="activeModalTab = 'renew'"
            class="flex-1 py-1.5 rounded-lg font-bold transition-all text-center cursor-pointer"
            :class="activeModalTab === 'renew' ? 'bg-[#E8572E] text-white shadow' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'"
          >
            ต่ออายุ (Renewal)
          </button>
          <button 
            @click="activeModalTab = 'adjust'"
            class="flex-1 py-1.5 rounded-lg font-bold transition-all text-center cursor-pointer"
            :class="activeModalTab === 'adjust' ? 'bg-[#E8572E] text-white shadow' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'"
          >
            ปรับวัน (Adjust)
          </button>
          <button 
            @click="activeModalTab = 'line'"
            class="flex-1 py-1.5 rounded-lg font-bold transition-all text-center cursor-pointer"
            :class="activeModalTab === 'line' ? 'bg-[#E8572E] text-white shadow' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'"
          >
            LINE & เบอร์โทร
          </button>
        </div>

        <!-- TAB: RENEW -->
        <div v-if="activeModalTab === 'renew'" class="space-y-4 text-xs">
          <div>
            <label class="block font-semibold text-gray-800 dark:text-gray-200 mb-1.5">เลือกแพ็กเกจที่ชำระเงิน:</label>
            <div class="grid grid-cols-3 gap-2">
              <button 
                v-for="(pkg, key) in SUBSCRIPTION_PACKAGES" 
                :key="key"
                type="button"
                @click="selectedPkgId = key"
                class="p-3 rounded-xl border text-center transition-all cursor-pointer"
                :class="selectedPkgId === key ? 'border-[#E8572E] bg-[#E8572E]/10 text-gray-900 dark:text-white ring-1 ring-[#E8572E]' : 'border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-black/20 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'"
              >
                <div class="font-bold text-gray-900 dark:text-white">{{ pkg.name }}</div>
                <div class="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">{{ pkg.days }} วัน</div>
                <div class="text-xs font-bold text-[#E8572E] dark:text-[#F0A73C] mt-1">฿{{ pkg.standard }}</div>
              </button>
            </div>
          </div>

          <!-- Promo 50% Switch -->
          <div class="p-3 rounded-xl bg-gray-50 dark:bg-black/40 border border-gray-200 dark:border-white/10 flex items-center justify-between">
            <div>
              <div class="font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                <Sparkles class="w-3.5 h-3.5 text-[#F0A73C]" /> บังคับใช้ส่วนลดโปร 50% (FIRST_TIME_50)
              </div>
              <p class="text-[11px] text-gray-500 dark:text-gray-400">ลด 50% สำหรับการชำระเงินครั้งแรก</p>
            </div>
            <input v-model="useFirstTimePromo" type="checkbox" class="w-4 h-4 accent-[#E8572E] cursor-pointer" />
          </div>

          <!-- Price Summary Box -->
          <div class="p-4 rounded-xl bg-gradient-to-r from-[#1B4B4A]/10 via-[#1B4B4A]/5 to-[#E8572E]/10 dark:from-[#1B4B4A]/50 dark:to-[#0c1818] border border-[#1B4B4A]/30 dark:border-[#1B4B4A] space-y-1">
            <div class="flex justify-between text-gray-600 dark:text-gray-400">
              <span>ยอดเงินที่บันทึกใบเสร็จ:</span>
              <strong class="text-gray-900 dark:text-white text-sm font-mono">฿{{ calculatedPrice }}</strong>
            </div>
            <div class="flex justify-between text-gray-600 dark:text-gray-400">
              <span>วันหมดอายุใหม่หลังต่ออายุ:</span>
              <strong class="text-emerald-600 dark:text-emerald-400 font-mono">{{ previewNewExpiryDate }}</strong>
            </div>
          </div>

          <div>
            <label class="block font-semibold text-gray-800 dark:text-gray-200 mb-1">บันทึกเพิ่มเติม (Note):</label>
            <input v-model="renewNote" type="text" placeholder="เช่น โอนผ่าน KBank สลิปเลขที่..." class="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-black/40 border border-gray-300 dark:border-white/10 text-gray-900 dark:text-white outline-none focus:border-[#E8572E]" />
          </div>

          <button 
            @click="submitRenewal"
            :disabled="processingId === activeStore.id"
            class="w-full py-3 rounded-xl bg-gradient-to-r from-[#E8572E] to-[#F0A73C] text-white font-bold shadow-lg shadow-[#E8572E]/20 transition-all cursor-pointer disabled:opacity-50"
          >
            ยืนยันการต่ออายุ & ออกใบเสร็จดิจิทัล
          </button>
        </div>

        <!-- TAB: ADJUST -->
        <div v-else-if="activeModalTab === 'adjust'" class="space-y-4 text-xs">
          <div>
            <label class="block font-semibold text-gray-800 dark:text-gray-200 mb-1.5">รูปแบบการปรับวัน:</label>
            <div class="grid grid-cols-2 gap-2">
              <button 
                type="button" 
                @click="adjustType = 'add_7'"
                class="p-2.5 rounded-xl border text-center transition-all cursor-pointer font-semibold"
                :class="adjustType === 'add_7' ? 'border-[#E8572E] bg-[#E8572E]/10 text-gray-900 dark:text-white' : 'border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-black/20 text-gray-600 dark:text-gray-400'"
              >
                +7 วัน (Trial)
              </button>
              <button 
                type="button" 
                @click="adjustType = 'add_14'"
                class="p-2.5 rounded-xl border text-center transition-all cursor-pointer font-semibold"
                :class="adjustType === 'add_14' ? 'border-[#E8572E] bg-[#E8572E]/10 text-gray-900 dark:text-white' : 'border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-black/20 text-gray-600 dark:text-gray-400'"
              >
                +14 วัน (Trial)
              </button>
              <button 
                type="button" 
                @click="adjustType = 'custom_add'"
                class="p-2.5 rounded-xl border text-center transition-all cursor-pointer font-semibold"
                :class="adjustType === 'custom_add' ? 'border-[#E8572E] bg-[#E8572E]/10 text-gray-900 dark:text-white' : 'border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-black/20 text-gray-600 dark:text-gray-400'"
              >
                กำหนดวันเพิ่มเอง
              </button>
              <button 
                type="button" 
                @click="adjustType = 'custom_deduct'"
                class="p-2.5 rounded-xl border text-center transition-all cursor-pointer font-semibold"
                :class="adjustType === 'custom_deduct' ? 'border-red-500 bg-red-500/10 text-red-600 dark:text-white' : 'border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-black/20 text-gray-600 dark:text-gray-400'"
              >
                ลดวันใช้งาน (Deduct)
              </button>
            </div>
          </div>

          <div v-if="adjustType === 'custom_add' || adjustType === 'custom_deduct'">
            <label class="block font-semibold text-gray-800 dark:text-gray-200 mb-1">จำนวนวัน:</label>
            <input v-model.number="adjustDays" type="number" min="1" class="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-black/40 border border-gray-300 dark:border-white/10 text-gray-900 dark:text-white font-bold" />
          </div>

          <div>
            <label class="block font-semibold text-gray-800 dark:text-gray-200 mb-1">เหตุผลการปรับ (Note):</label>
            <input v-model="adjustNote" type="text" placeholder="ระบุเหตุผลเพื่อบันทึก Audit Log..." class="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-black/40 border border-gray-300 dark:border-white/10 text-gray-900 dark:text-white outline-none focus:border-[#E8572E]" />
          </div>

          <button 
            @click="submitAdjustment"
            :disabled="processingId === activeStore.id"
            class="w-full py-3 rounded-xl bg-[#E8572E] hover:bg-[#E8572E]/90 text-white font-bold shadow-lg transition-all cursor-pointer disabled:opacity-50"
          >
            บันทึกการปรับวันใช้งาน
          </button>
        </div>

        <!-- TAB: LINE & PHONE -->
        <div v-else-if="activeModalTab === 'line'" class="space-y-4 text-xs">
          <div>
            <label class="block font-semibold text-gray-800 dark:text-gray-200 mb-1">LINE User ID (U...):</label>
            <input v-model="editLineUserId" type="text" placeholder="U1234567890abcdef..." class="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-black/40 border border-gray-300 dark:border-white/10 text-gray-900 dark:text-white font-mono outline-none focus:border-[#E8572E]" />
          </div>

          <div>
            <label class="block font-semibold text-gray-800 dark:text-gray-200 mb-1">เบอร์โทรศัพท์:</label>
            <input v-model="editPhone" type="text" placeholder="081-xxx-xxxx" class="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-black/40 border border-gray-300 dark:border-white/10 text-gray-900 dark:text-white outline-none focus:border-[#E8572E]" />
          </div>

          <button 
            @click="saveStoreInfo"
            :disabled="processingId === activeStore.id"
            class="w-full py-3 rounded-xl bg-[#E8572E] hover:bg-[#E8572E]/90 text-white font-bold shadow-lg transition-all cursor-pointer disabled:opacity-50"
          >
            บันทึกข้อมูลติดต่อ
          </button>
        </div>

      </div>
    </div>

  </div>
</template>

<style scoped>
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: translateY(0); }
}

.animate-fadeIn {
  animation: fadeIn 0.2s ease-out forwards;
}

.no-scrollbar::-webkit-scrollbar {
  display: none;
}
.no-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
</style>
