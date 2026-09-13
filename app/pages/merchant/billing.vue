<script setup lang="ts">
import { 
  CheckCircle2, 
  Phone, 
  CalendarRange, 
  Sparkles, 
  Zap, 
  Crown, 
  ShieldCheck, 
  ArrowRight, 
  HelpCircle, 
  MessageCircle, 
  Clock, 
  Gift, 
  Tag, 
  Check, 
  Download, 
  FileText,
  CreditCard,
  QrCode,
  UploadCloud,
  AlertCircle,
  Copy,
  X,
  RefreshCw
} from 'lucide-vue-next'
import { computed, ref, onMounted } from 'vue'
import { SUBSCRIPTION_PACKAGES } from '~/utils/pricing'

definePageMeta({
  layout: 'merchant',
  middleware: ['auth']
})

const client = useSupabaseClient()
const { store, setStore } = useCurrentStore()
const loading = ref(true)
const billingRecords = ref<any[]>([])
const selectedReceipt = ref<any>(null)
const showReceiptModal = ref(false)
const receiptContentRef = ref(null)
const downloading = ref(false)

// PromptPay SlipOK Payment States
const selectedPackage = ref<any>(null)
const showPaymentModal = ref(false)
const isGeneratingQr = ref(false)
const qrData = ref<any>(null)
const slipFile = ref<File | null>(null)
const slipPreviewUrl = ref<string | null>(null)
const fileInputRef = ref<HTMLInputElement | null>(null)
const isVerifying = ref(false)
const verifyError = ref<string | null>(null)
const copiedPromptpay = ref(false)
const copiedAmount = ref(false)

// Celebration Modal State
const showSuccessModal = ref(false)
const successData = ref<any>(null)

const openPaymentModal = async (pkg: any) => {
  selectedPackage.value = pkg
  slipFile.value = null
  if (slipPreviewUrl.value) {
    URL.revokeObjectURL(slipPreviewUrl.value)
    slipPreviewUrl.value = null
  }
  verifyError.value = null
  qrData.value = null
  showPaymentModal.value = true
  isGeneratingQr.value = true

  if (!store.value?.id) {
    verifyError.value = 'ไม่พบข้อมูลร้านค้า กรุณารีเฟรชหน้าเว็บแล้วลองใหม่อีกครั้ง'
    isGeneratingQr.value = false
    return
  }

  try {
    const { data: sessionData } = await client.auth.getSession()
    const token = sessionData?.session?.access_token
    const headers: Record<string, string> = {}
    if (token) {
      headers.Authorization = `Bearer ${token}`
    }

    const res = await $fetch<any>('/api/billing/create-qr', {
      method: 'POST',
      headers,
      body: {
        storeId: store.value.id,
        packageId: pkg.id
      }
    })
    qrData.value = res

    // Client-side fallback: if qrDataUrl is empty, render with browser Canvas QRCode
    if (res?.payload && !res?.qrDataUrl) {
      try {
        const qrModule = await import('qrcode')
        qrData.value.qrDataUrl = await qrModule.default.toDataURL(res.payload, {
          width: 300,
          margin: 2,
          color: { dark: '#000000', light: '#ffffff' }
        })
      } catch (clientQrErr) {
        console.warn('[billing] Client QR fallback render failed:', clientQrErr)
      }
    }
  } catch (err: any) {
    console.error('[billing] create-qr error:', err)
    verifyError.value = err?.data?.message || err?.message || 'ไม่สามารถสร้าง QR Code สำหรับชำระเงินได้'
  } finally {
    isGeneratingQr.value = false
  }
}

const closePaymentModal = () => {
  showPaymentModal.value = false
  slipFile.value = null
  if (slipPreviewUrl.value) {
    URL.revokeObjectURL(slipPreviewUrl.value)
    slipPreviewUrl.value = null
  }
  if (fileInputRef.value) {
    fileInputRef.value.value = ''
  }
}

const triggerFileInput = () => {
  fileInputRef.value?.click()
}

const onFileSelected = (event: Event) => {
  const input = event.target as HTMLInputElement
  if (input.files && input.files[0]) {
    handleSlipFile(input.files[0])
  }
}

const onFileDrop = (event: DragEvent) => {
  event.preventDefault()
  if (event.dataTransfer?.files && event.dataTransfer.files[0]) {
    handleSlipFile(event.dataTransfer.files[0])
  }
}

const handleSlipFile = (file: File) => {
  if (!file.type.startsWith('image/')) {
    verifyError.value = 'กรุณาอัปโหลดไฟล์รูปภาพเท่านั้น (JPG, PNG, WEBP)'
    return
  }
  if (file.size > 10 * 1024 * 1024) {
    verifyError.value = 'ขนาดไฟล์ภาพใหญ่เกิน 10MB กรุณาเลือกรูปภาพขนาดเล็กลง'
    return
  }
  verifyError.value = null
  slipFile.value = file
  if (slipPreviewUrl.value) {
    URL.revokeObjectURL(slipPreviewUrl.value)
  }
  slipPreviewUrl.value = URL.createObjectURL(file)
}

const removeSlipFile = () => {
  slipFile.value = null
  if (slipPreviewUrl.value) {
    URL.revokeObjectURL(slipPreviewUrl.value)
    slipPreviewUrl.value = null
  }
  if (fileInputRef.value) {
    fileInputRef.value.value = ''
  }
}

const copyToClipboard = async (text?: string, type: 'id' | 'amount' = 'id') => {
  if (!text) return
  try {
    await navigator.clipboard.writeText(text)
    if (type === 'id') {
      copiedPromptpay.value = true
      setTimeout(() => { copiedPromptpay.value = false }, 2000)
    } else {
      copiedAmount.value = true
      setTimeout(() => { copiedAmount.value = false }, 2000)
    }
  } catch (err) {
    console.error('Failed to copy to clipboard:', err)
  }
}

const submitSlipVerification = async () => {
  if (!slipFile.value || !selectedPackage.value || !store.value?.id) return

  isVerifying.value = true
  verifyError.value = null

  try {
    const { data: sessionData } = await client.auth.getSession()
    const token = sessionData?.session?.access_token
    const headers: Record<string, string> = {}
    if (token) {
      headers.Authorization = `Bearer ${token}`
    }

    const formData = new FormData()
    formData.append('slip', slipFile.value)
    formData.append('storeId', store.value.id)
    formData.append('packageId', selectedPackage.value.id)

    const res = await $fetch<any>('/api/billing/verify-slip', {
      method: 'POST',
      headers,
      body: formData
    })

    if (res?.success) {
      closePaymentModal()
      successData.value = res
      showSuccessModal.value = true

      // Refresh store data and billing records
      await refreshStoreDirectly()
      await fetchBillingRecords()
    } else {
      throw new Error(res?.message || 'การตรวจสอบสลิปล้มเหลว')
    }
  } catch (err: any) {
    console.error('Slip verification error:', err)
    verifyError.value = err?.data?.message || err?.message || 'เกิดข้อผิดพลาดในการตรวจสอบสลิป กรุณาลองใหม่อีกครั้ง'
  } finally {
    isVerifying.value = false
  }
}

const viewNewlyCreatedReceipt = () => {
  showSuccessModal.value = false
  if (successData.value?.receiptNumber) {
    const rec = billingRecords.value.find(r => r.receipt_number === successData.value.receiptNumber)
    if (rec) {
      openReceipt(rec)
      return
    }
    // Fallback: construct receipt preview from successData if DB fetch has slight delay
    openReceipt({
      receipt_number: successData.value.receiptNumber,
      package_name: successData.value.packageName,
      package_days: successData.value.packageDays,
      amount: successData.value.amount,
      paid_at: new Date().toISOString(),
      plan_start_at: new Date().toISOString(),
      plan_end_at: successData.value.newExpiryDate,
      payment_method: 'promptpay_slipok',
      slip_trans_ref: successData.value.transRef
    })
    return
  }
  if (billingRecords.value.length > 0) {
    openReceipt(billingRecords.value[0])
  }
}

const fetchBillingRecords = async () => {
  if (!store.value?.id) return
  
  const { data: billingData } = await client
    .from('billing_records')
    .select('*')
    .eq('store_id', store.value.id)
    .order('created_at', { ascending: false })
    
  if (billingData) {
    billingRecords.value = billingData
  }
}

const refreshStoreDirectly = async () => {
  // Refresh store data directly without touching shared loading state in layout
  if (store.value?.id) {
    const { data: storeData } = await client
      .from('stores')
      .select('*')
      .eq('id', store.value.id)
      .maybeSingle()

    if (storeData) {
      setStore(storeData)
      return
    }
  }

  const { data: authData } = await client.auth.getUser()
  if (!authData?.user?.id) return

  const { data: storeData } = await client
    .from('stores')
    .select('*')
    .eq('owner_id', authData.user.id)
    .order('updated_at', { ascending: false })
    .limit(1)

  if (storeData?.[0]) {
    setStore(storeData[0])
  }
}

onMounted(async () => {
  try {
    // Force refresh store data without blocking the layout slot
    await refreshStoreDirectly()
    await fetchBillingRecords()
  } catch (err) {
    console.error('Error fetching billing info:', err)
  } finally {
    loading.value = false
  }
})

const getFallbackTrialDate = (createdAt: string) => {
  const d = new Date(createdAt)
  d.setDate(d.getDate() + 7)
  return d.toISOString()
}

const getActiveEndDate = () => {
  if (!store.value) return new Date()
  return store.value.trial_ends_at || getFallbackTrialDate(store.value.created_at)
}

const getDaysRemaining = () => {
  if (!store.value) return 0
  const end = new Date(getActiveEndDate())
  const now = new Date()
  const diffTime = end.getTime() - now.getTime()
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
}

const isExpired = computed(() => getDaysRemaining() < 0)

const formatDate = (dateString: string) => {
  if (!dateString) return ''
  return new Date(dateString).toLocaleDateString('th-TH', {
    day: 'numeric', month: 'long', year: 'numeric'
  })
}

const formatDateTime = (dateString: string) => {
  if (!dateString) return ''
  return new Date(dateString).toLocaleDateString('th-TH', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  })
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', minimumFractionDigits: 0 }).format(amount)
}

const openReceipt = (record: any) => {
  selectedReceipt.value = record
  showReceiptModal.value = true
}

const downloadReceiptImage = async () => {
  if (!receiptContentRef.value) return
  
  try {
    downloading.value = true
    const html2canvas = (await import('html2canvas')).default
    const canvas = await html2canvas(receiptContentRef.value, {
      scale: 3, // High resolution
      useCORS: true,
      backgroundColor: '#ffffff'
    })
    
    const image = canvas.toDataURL('image/png')
    const link = document.createElement('a')
    link.href = image
    link.download = `Receipt_${selectedReceipt.value?.receipt_number || 'download'}.png`
    link.click()
  } catch (error) {
    console.error('Error generating receipt image:', error)
  } finally {
    downloading.value = false
  }
}

const { locale, t } = useI18n()

// Rich Packages Definition with distinct personalities
const packages = computed(() => {
  const isZh = locale.value === 'zh'
  const isEn = locale.value === 'en'
  const isPromo = !store.value?.has_used_first_time_promo

  return [
    {
      ...SUBSCRIPTION_PACKAGES['14d'],
      name: isZh ? '14 天试用套餐' : (isEn ? '14 Days Plan' : '14 วัน'),
      unit: isZh ? '泰铢 / 14 天' : (isEn ? 'THB / 14 Days' : 'บาท / 14 วัน'),
      tagline: isZh ? '低成本测试市场，轻松开启智能点餐' : (isEn ? 'Test the market & get started with confidence' : 'ทดสอบตลาด & เริ่มต้นอย่างมั่นใจ'),
      badge: isZh ? '轻松起步' : (isEn ? 'Easy Start' : 'เริ่มต้นง่าย'),
      isPopular: false,
      isBestValue: false,
      dailyRate: isPromo ? '5.3' : '10.6',
      savings: isPromo ? (isZh ? '节省 ฿74' : (isEn ? 'Save ฿74' : 'ประหยัด ฿74')) : null,
      features: [
        { text: isZh ? '无限制桌号扫码点餐' : (isEn ? 'Unlimited table QR Code ordering' : 'รับออเดอร์ QR Code ไม่จำกัดโต๊ะ'), highlight: true },
        { text: isZh ? '泰/英/中三语智能翻译' : (isEn ? '3-Language AI translation (TH/EN/ZH)' : 'ระบบแปลภาษา 3 ภาษา (ไทย, อังกฤษ, จีน)'), highlight: true },
        { text: isZh ? 'LINE OA 实时订单推送' : (isEn ? 'Instant LINE OA order alerts' : 'แจ้งเตือนออเดอร์เข้า LINE ร้านค้าทันที'), highlight: false },
        { text: isZh ? '实时调整菜单与价格' : (isEn ? 'Real-time menu & price editing' : 'ปรับแต่งเมนูและราคาได้เรียลไทม์'), highlight: false }
      ],
      ctaText: isZh ? '续费 14 天' : (isEn ? 'Renew 14 Days' : 'ต่ออายุ 14 วัน'),
      ctaClass: 'bg-muted text-foreground hover:bg-muted/80'
    },
    {
      ...SUBSCRIPTION_PACKAGES['monthly'],
      name: isZh ? '1 个月标准套餐' : (isEn ? '1 Month Plan' : '1 เดือน'),
      unit: isZh ? '泰铢 / 月' : (isEn ? 'THB / Month' : 'บาท / เดือน'),
      tagline: isZh ? '最受餐厅欢迎的超高性价比方案' : (isEn ? 'Most popular & best value for restaurants' : 'ทางเลือกยอดนิยม คุ้มค่าที่สุดสำหรับร้านอาหาร'),
      badge: isZh ? '🔥 最受欢迎' : (isEn ? '🔥 Most Popular' : '🔥 ยอดนิยมสูงสุด'),
      isPopular: true,
      isBestValue: false,
      dailyRate: isPromo ? '4.3' : '8.6',
      savings: isPromo ? (isZh ? '节省 ฿130' : (isEn ? 'Save ฿130' : 'ประหยัด ฿130')) : null,
      features: [
        { text: isZh ? '包含 14 天方案的所有功能' : (isEn ? 'Includes all 14-day features' : 'รวมทุกฟีเจอร์ในแพ็กเกจ 14 วัน'), highlight: true },
        { text: isZh ? '每日营业额与订单数据看板' : (isEn ? 'Daily sales & order analytics dashboard' : 'แดชบอร์ดสรุปยอดและสถิติออเดอร์รายวัน'), highlight: true },
        { text: isZh ? '高清桌码海报设计模板' : (isEn ? 'High-resolution QR code signage template' : 'ป้าย QR Code สั่งอาหารความละเอียดสูง'), highlight: false },
        { text: isZh ? '专属客服全程技术支持' : (isEn ? 'Dedicated support during entire period' : 'ทีมงานให้คำปรึกษาตลอดการใช้งาน'), highlight: false },
        { text: isZh ? '折合每天仅 ~8.6 铢 (首充特惠 4.3 铢)' : (isEn ? 'Only ~8.6 THB/day (Promo 4.3 THB)' : 'เฉลี่ยเพียง ~8.6 บ./วัน (โปรครั้งแรก 4.3 บ.)'), highlight: true }
      ],
      ctaText: isZh ? '选择 1 个月套餐' : (isEn ? 'Select 1 Month' : 'เลือกแพ็กเกจ 1 เดือน'),
      ctaClass: 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-md shadow-rose-200'
    },
    {
      ...SUBSCRIPTION_PACKAGES['yearly'],
      name: isZh ? '1 年旗舰套餐' : (isEn ? '1 Year Plan' : '1 ปี'),
      unit: isZh ? '泰铢 / 年' : (isEn ? 'THB / Year' : 'บาท / ปี'),
      tagline: isZh ? '省心一整年，尊享最大折扣' : (isEn ? 'Maximum savings & hassle-free for a full year' : 'ประหยัดสูงสุด ไร้กังวลเรื่องการต่ออายุตลอดปี'),
      badge: isZh ? '👑 最划算 (付 10 个月送 2 个月)' : (isEn ? '👑 Best Value (Pay 10 Mo, Get 2 Free)' : '👑 คุ้มค่าที่สุด (จ่าย 10 เดือน ฟรี 2 เดือน)'),
      isPopular: false,
      isBestValue: true,
      dailyRate: isPromo ? '3.5' : '7.1',
      savings: isPromo ? (isZh ? '节省 ฿1,295' : (isEn ? 'Save ฿1,295' : 'ประหยัด ฿1,295')) : (isZh ? '免费赠送 2 个月' : (isEn ? '2 Months Free' : 'ประหยัดค่าบริการ 2 เดือน')),
      features: [
        { text: isZh ? '365 天无忧使用全套高级功能' : (isEn ? 'All pro features unlocked for 365 days' : 'รวมทุกฟีเจอร์ระดับโปรทั้งหมด 365 วัน'), highlight: true },
        { text: isZh ? '全年免费优先更新最新功能' : (isEn ? 'Free access to new feature releases' : 'สิทธิ์รับอัปเดตฟีเจอร์ใหม่ๆ ฟรีตลอดปี'), highlight: true },
        { text: isZh ? '无需每月重复续费，省时省力' : (isEn ? 'No monthly renewal hassle' : 'ไม่ต้องกังวลเรื่องการต่ออายุทุกเดือน'), highlight: false },
        { text: isZh ? '全年度数据云端备份与运维' : (isEn ? 'Cloud data backup & priority maintenance' : 'ระบบดูแลและสำรองข้อมูลร้านค้าตลอดปี'), highlight: false },
        { text: isZh ? '极致实惠每天仅 7.1 铢 (首充 3.5 铢)' : (isEn ? 'Best rate at only 7.1 THB/day (Promo 3.5 THB)' : 'เฉลี่ยถูกที่สุดเพียง 7.1 บ./วัน (โปร 3.5 บ.)'), highlight: true }
      ],
      ctaText: isZh ? '续费 1 年 (最超值)' : (isEn ? 'Renew 1 Year (Best Value)' : 'ต่ออายุ 1 ปี คุ้มที่สุด'),
      ctaClass: 'bg-slate-900 text-white hover:bg-slate-800 shadow-sm'
    }
  ]
})
</script>

<template>
  <div class="w-full max-w-[1400px] mx-auto pb-16 space-y-8">
    
    <!-- Page Header & Status Overview -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl sm:text-3xl font-black tracking-tight text-foreground">{{ $t('billing_title') }}</h1>
        <p class="text-muted-foreground mt-1 text-sm">
          {{ $t('billing_desc') }}
        </p>
      </div>

      <!-- Quick Contact LINE Button -->
      <a 
        href="https://line.me/R/ti/p/@819wgrsj" 
        target="_blank" 
        rel="noopener noreferrer" 
        class="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white hover:bg-emerald-700 font-bold rounded-2xl shadow-sm hover:shadow-md transition-all text-xs shrink-0 self-start md:self-auto"
      >
        <MessageCircle class="w-4 h-4" />
        <span>{{ $t('billing_btn_open_line') }}</span>
      </a>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="text-center py-16">
      <div class="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
      <p class="text-xs text-muted-foreground">กำลังโหลดข้อมูลแพ็กเกจ...</p>
    </div>

    <!-- No Store Found -->
    <div v-else-if="!store" class="text-center p-12 bg-card border rounded-3xl shadow-xs">
      <div class="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center text-3xl mx-auto mb-4">
        🏪
      </div>
      <h2 class="text-xl font-bold text-foreground mb-2">ไม่พบข้อมูลร้านค้า</h2>
      <p class="text-muted-foreground text-sm mb-6">คุณต้องสร้างร้านค้าก่อนจึงจะสามารถเลือกแพ็กเกจได้</p>
      <NuxtLink to="/merchant/store/create" class="px-6 py-2.5 bg-primary text-primary-foreground hover:bg-primary/90 font-bold text-sm rounded-xl shadow-sm transition-all inline-flex items-center gap-2">
        สร้างร้านค้าทันที
      </NuxtLink>
    </div>

    <!-- Main Content Area -->
    <div v-else class="space-y-8">
      
      <!-- 1. Current Membership Status Card -->
      <div class="bg-card border rounded-3xl p-6 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gradient-to-r from-card via-card to-primary/5">
        <div class="space-y-1.5">
          <div class="flex items-center gap-2.5">
            <span class="text-xs font-semibold text-muted-foreground">{{ $t('billing_status_card_title') }}:</span>
            <strong class="text-base text-foreground font-black">{{ store.name }}</strong>
            
            <span 
              class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold shadow-2xs"
              :class="store.plan_status === 'active' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-amber-100 text-amber-800 border border-amber-200'"
            >
              <span class="w-1.5 h-1.5 rounded-full" :class="store.plan_status === 'active' ? 'bg-emerald-500' : 'bg-amber-500'"></span>
              {{ store.plan_status === 'active' ? $t('billing_status_active') : $t('billing_status_trial') }}
            </span>
          </div>

          <div class="text-xs text-muted-foreground flex flex-wrap items-center gap-3">
            <div class="flex items-center gap-1.5">
              <CalendarRange class="w-4 h-4 text-primary" />
              <span>{{ $t('billing_expiry_label') }}: <strong class="text-foreground">{{ formatDate(getActiveEndDate()) }}</strong></span>
            </div>

            <span 
              class="px-2.5 py-0.5 rounded-md font-bold text-xs"
              :class="isExpired ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'"
            >
              <span v-if="isExpired">{{ $t('billing_expired_badge') }}</span>
              <span v-else>{{ $t('billing_days_remaining', { days: getDaysRemaining() }) }}</span>
            </span>
          </div>
        </div>
      </div>

      <!-- 2. First-Time 50% Special Promotion Callout Banner -->
      <div 
        v-if="!store.has_used_first_time_promo"
        class="bg-gradient-to-r from-rose-500 via-pink-500 to-rose-600 text-white rounded-3xl p-6 shadow-md shadow-rose-200 flex flex-col md:flex-row items-center justify-between gap-4"
      >
        <div class="flex items-center gap-4 text-center md:text-left">
          <div class="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-2xl shrink-0 shadow-inner">
            🎁
          </div>
          <div>
            <div class="flex items-center justify-center md:justify-start gap-2">
              <span class="bg-white text-rose-600 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                {{ $t('billing_promo_badge') }}
              </span>
              <h3 class="text-lg font-black tracking-tight">{{ $t('billing_promo_title') }}</h3>
            </div>
            <p class="text-xs text-rose-100 mt-1">
              {{ $t('billing_promo_desc') }}
            </p>
          </div>
        </div>

        <div class="shrink-0">
          <span class="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/20 backdrop-blur-md text-white text-xs font-bold border border-white/30">
            <Sparkles class="w-4 h-4 text-yellow-300" />
            {{ $t('billing_promo_instant') }}
          </span>
        </div>
      </div>

      <!-- 3. Packages Grid (Distinct & Compelling) -->
      <div>
        <div class="text-center mb-8">
          <h2 class="text-xl font-black text-foreground">{{ $t('billing_packages_heading') }}</h2>
          <p class="text-xs text-muted-foreground mt-1">{{ $t('billing_packages_subheading') }}</p>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 items-stretch">
          
          <div 
            v-for="pkg in packages" 
            :key="pkg.name" 
            class="relative bg-card border rounded-3xl p-7 shadow-xs flex flex-col justify-between transition-all hover:shadow-md"
            :class="{
              'border-primary ring-2 ring-primary/20 scale-100 lg:-translate-y-2 z-10 bg-gradient-to-b from-primary/5 via-card to-card shadow-lg': pkg.isPopular,
              'border-amber-200 bg-gradient-to-b from-amber-50/20 via-card to-card': pkg.isBestValue,
              'border-border': !pkg.isPopular && !pkg.isBestValue
            }"
          >
            
            <!-- Top Badges -->
            <div v-if="pkg.badge" class="absolute -top-3.5 left-0 right-0 flex justify-center">
              <span 
                class="text-[11px] font-black px-3.5 py-1 rounded-full uppercase tracking-wider shadow-xs"
                :class="pkg.isPopular ? 'bg-primary text-primary-foreground' : (pkg.isBestValue ? 'bg-amber-500 text-white' : 'bg-muted text-foreground border')"
              >
                {{ pkg.badge }}
              </span>
            </div>

            <!-- Card Header -->
            <div>
              <div class="text-center pt-2">
                <h3 class="text-lg font-black text-foreground">{{ pkg.name }}</h3>
                <p class="text-xs text-muted-foreground mt-1 min-h-[32px] flex items-center justify-center">{{ pkg.tagline }}</p>
              </div>

              <!-- Price Box -->
              <div class="mt-5 p-4 rounded-2xl bg-muted/20 border text-center relative">
                
                <!-- Daily Rate Pill -->
                <div class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-primary/10 text-primary mb-2">
                  <span>{{ $t('billing_daily_rate', { rate: pkg.dailyRate }) }}</span>
                </div>

                <!-- Price with Promo Strike-through -->
                <div class="flex items-center justify-center gap-2">
                  <!-- Strikethrough if 50% promo is active -->
                  <span 
                    v-if="!store?.has_used_first_time_promo" 
                    class="text-sm font-semibold text-muted-foreground line-through decoration-rose-500 decoration-2"
                  >
                    {{ formatCurrency(pkg.standard) }}
                  </span>

                  <!-- Main Display Price -->
                  <span class="text-3xl sm:text-4xl font-black text-foreground">
                    {{ !store?.has_used_first_time_promo ? formatCurrency(pkg.firstTime) : formatCurrency(pkg.standard) }}
                  </span>
                </div>

                <p class="text-[11px] text-muted-foreground mt-1 font-medium">
                  {{ pkg.unit }}
                  <span v-if="pkg.savings" class="ml-1 text-rose-600 font-bold">({{ pkg.savings }})</span>
                </p>
              </div>

              <!-- Feature Checklist -->
              <div class="mt-6 space-y-3">
                <p class="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{{ $t('billing_feature_heading') }}</p>
                
                <ul class="space-y-2.5">
                  <li 
                    v-for="(feat, idx) in pkg.features" 
                    :key="idx" 
                    class="flex items-start gap-2.5 text-xs"
                  >
                    <div class="w-4 h-4 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
                      <Check class="w-2.5 h-2.5 stroke-[3]" />
                    </div>
                    <span 
                      :class="feat.highlight ? 'font-bold text-foreground' : 'text-muted-foreground'"
                      class="leading-tight"
                    >
                      {{ feat.text }}
                    </span>
                  </li>
                </ul>
              </div>
            </div>

            <!-- CTA Buttons (Auto PromptPay + LINE) -->
            <div class="mt-8 pt-4 border-t space-y-2">
              <button 
                @click="openPaymentModal(pkg)"
                type="button"
                class="w-full py-3 px-4 rounded-xl text-xs font-bold text-center flex items-center justify-center gap-2 transition-all shadow-sm hover:shadow-md cursor-pointer"
                :class="pkg.ctaClass"
              >
                <QrCode class="w-4 h-4" />
                <span>สแกนจ่ายทันที (PromptPay Auto)</span>
              </button>

              <a 
                href="https://line.me/R/ti/p/@819wgrsj" 
                target="_blank" 
                rel="noopener noreferrer" 
                class="w-full py-2 px-3 rounded-xl text-[11px] font-semibold text-center flex items-center justify-center gap-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors border border-dashed border-border"
              >
                <MessageCircle class="w-3.5 h-3.5 text-emerald-600" />
                <span>ติดต่อแอดมินทาง LINE</span>
              </a>
            </div>

          </div>

        </div>

        <p class="text-center text-xs text-muted-foreground mt-6">
          {{ $t('billing_terms_note') }}
        </p>
      </div>

      <!-- 4. How to Renew Easy 3 Steps -->
      <div class="bg-card border rounded-3xl p-6 sm:p-8 shadow-xs">
        <h3 class="text-base font-bold text-foreground mb-6 flex items-center gap-2">
          <Sparkles class="w-4 h-4 text-primary" />
          {{ $t('billing_steps_title') }}
        </h3>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
          <div class="p-4 rounded-2xl bg-muted/20 border flex items-start gap-3.5">
            <div class="w-8 h-8 rounded-xl bg-primary text-primary-foreground font-black text-sm flex items-center justify-center shrink-0">
              1
            </div>
            <div>
              <h4 class="text-xs font-bold text-foreground">{{ $t('billing_step_1_title') }}</h4>
              <p class="text-xs text-muted-foreground mt-0.5">{{ $t('billing_step_1_desc') }}</p>
            </div>
          </div>

          <div class="p-4 rounded-2xl bg-muted/20 border flex items-start gap-3.5">
            <div class="w-8 h-8 rounded-xl bg-primary text-primary-foreground font-black text-sm flex items-center justify-center shrink-0">
              2
            </div>
            <div>
              <h4 class="text-xs font-bold text-foreground">{{ $t('billing_step_2_title') }}</h4>
              <p class="text-xs text-muted-foreground mt-0.5">{{ $t('billing_step_2_desc') }}</p>
            </div>
          </div>

          <div class="p-4 rounded-2xl bg-muted/20 border flex items-start gap-3.5">
            <div class="w-8 h-8 rounded-xl bg-primary text-primary-foreground font-black text-sm flex items-center justify-center shrink-0">
              3
            </div>
            <div>
              <h4 class="text-xs font-bold text-foreground">{{ $t('billing_step_3_title') }}</h4>
              <p class="text-xs text-muted-foreground mt-0.5">{{ $t('billing_step_3_desc') }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- 5. Billing History Section -->
      <div class="bg-card border rounded-3xl shadow-xs overflow-hidden" id="billing-history-section">
        <div class="p-6 border-b flex items-center justify-between bg-muted/10">
          <div class="flex items-center gap-2.5">
            <div class="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <FileText class="w-4 h-4" />
            </div>
            <div>
              <h3 class="text-base font-bold text-foreground">{{ $t('billing_history_title') }}</h3>
              <p class="text-xs text-muted-foreground">{{ $t('billing_history_desc') }}</p>
            </div>
          </div>
          <span class="text-xs text-muted-foreground">{{ billingRecords.length }} รายการ</span>
        </div>
        
        <div v-if="billingRecords.length === 0" class="p-12 text-center text-muted-foreground">
          <FileText class="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p class="text-sm font-medium">{{ $t('billing_history_empty') }}</p>
          <p class="text-xs mt-1">{{ $t('billing_history_empty_desc') }}</p>
        </div>
        
        <div v-else class="overflow-x-auto">
          <table class="w-full text-sm text-left">
            <thead class="text-[11px] text-muted-foreground uppercase bg-muted/30 border-b font-semibold tracking-wider">
              <tr>
                <th scope="col" class="px-6 py-3.5">{{ $t('billing_receipt_col_date') }}</th>
                <th scope="col" class="px-6 py-3.5">{{ $t('billing_receipt_col_pkg') }}</th>
                <th scope="col" class="px-6 py-3.5">{{ $t('billing_receipt_col_amount') }}</th>
                <th scope="col" class="px-6 py-3.5">{{ $t('billing_receipt_col_status') }}</th>
                <th scope="col" class="px-6 py-3.5 text-right">{{ $t('billing_receipt_col_action') }}</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-border">
              <tr v-for="record in billingRecords" :key="record.id" class="hover:bg-muted/20 transition-colors">
                <td class="px-6 py-4 font-mono text-xs font-bold text-foreground whitespace-nowrap">{{ record.receipt_number }}</td>
                <td class="px-6 py-4">
                  <div class="flex items-center gap-2">
                    <span class="font-medium text-foreground">{{ record.package_name }}</span>
                    <span v-if="record.promotion_code === 'FIRST_TIME_50'" class="inline-flex items-center px-2 py-0.2 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700 border border-rose-200">
                      ลด 50%
                    </span>
                    <span v-if="record.payment_method === 'promptpay_slipok'" class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-200">
                      Auto
                    </span>
                  </div>
                </td>
                <td class="px-6 py-4 font-black text-emerald-600">{{ formatCurrency(record.amount) }}</td>
                <td class="px-6 py-4 text-xs text-muted-foreground whitespace-nowrap">{{ formatDateTime(record.paid_at) }}</td>
                <td class="px-6 py-4 text-right whitespace-nowrap">
                  <button 
                    @click="openReceipt(record)" 
                    class="text-primary hover:text-primary/80 font-bold text-xs transition-colors px-3 py-1.5 rounded-lg hover:bg-primary/10 inline-flex items-center gap-1.5 border border-primary/20"
                  >
                    <Download class="w-3.5 h-3.5" />
                    <span>{{ $t('billing_receipt_col_action') }}</span>
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

    </div>

    <!-- Receipt Print Modal -->
    <div v-if="showReceiptModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm print:hidden">
      <div class="bg-card border rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        <div class="p-5 border-b border-border flex justify-between items-center bg-muted/30">
          <div class="flex items-center gap-2">
            <FileText class="w-5 h-5 text-primary" />
            <h3 class="font-bold text-base text-foreground">{{ $t('billing_history_title') }}</h3>
          </div>
          <button @click="showReceiptModal = false" class="text-muted-foreground hover:text-foreground p-1.5 rounded-xl hover:bg-muted transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
          </button>
        </div>
        
        <!-- Receipt Preview Area -->
        <div class="p-6 overflow-y-auto flex-1 bg-muted/10">
          <div id="receipt-content" ref="receiptContentRef" class="bg-white text-black p-8 mx-auto shadow-sm border border-gray-200 rounded-2xl" style="width: 100%; max-width: 400px; font-family: monospace, sans-serif;">
            <!-- Receipt Header -->
            <div class="text-center mb-6 flex flex-col items-center">
              <img src="/logo-icon.png" alt="ChiiMenu" class="w-10 h-10 rounded-xl object-contain mb-2 shadow-xs" crossorigin="anonymous">
              <h2 class="text-xl font-bold mb-0.5">ChiiMenu</h2>
              <p class="text-xs text-gray-500">Official Receipt</p>
            </div>
            
            <div class="text-xs mb-6 space-y-1">
              <div class="flex justify-between">
                <span class="text-gray-500">{{ $t('billing_receipt_col_date') }}:</span>
                <span class="font-medium">{{ selectedReceipt?.receipt_number }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-500">Paid at:</span>
                <span>{{ formatDateTime(selectedReceipt?.paid_at) }}</span>
              </div>
            </div>
            
            <!-- Customer Info -->
            <div class="text-xs mb-6 space-y-1 pb-4 border-b border-gray-200 border-dashed">
              <div class="flex flex-col">
                <span class="text-gray-500 mb-1">Issued to:</span>
                <span class="font-bold text-sm">{{ store?.name }}</span>
                <span>{{ store?.address || '-' }}</span>
              </div>
            </div>
            
            <!-- Items -->
            <div class="mb-6 pb-4 border-b border-gray-200 border-dashed">
              <table class="w-full text-xs">
                <thead>
                  <tr class="text-gray-500">
                    <th class="text-left font-normal pb-2">Item</th>
                    <th class="text-right font-normal pb-2">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td class="py-1">
                      <div class="font-medium">{{ selectedReceipt?.package_name }}</div>
                      <div class="text-[10px] text-gray-500">{{ formatDate(selectedReceipt?.plan_start_at) }} - {{ formatDate(selectedReceipt?.plan_end_at) }}</div>
                    </td>
                    <td class="text-right align-top py-1">
                      <div v-if="selectedReceipt?.original_amount" class="text-gray-400 line-through text-[10px]">{{ formatCurrency(selectedReceipt.original_amount) }}</div>
                      <div>{{ formatCurrency(selectedReceipt?.amount || 0) }}</div>
                    </td>
                  </tr>
                  <tr v-if="selectedReceipt?.discount_amount">
                    <td class="py-1 text-rose-500 font-medium text-xs">
                      Promotion ({{ selectedReceipt?.promotion_code }})
                    </td>
                    <td class="text-right align-top py-1 text-rose-500">
                      -{{ formatCurrency(selectedReceipt.discount_amount) }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            
            <!-- Total -->
            <div class="flex justify-between items-center mb-8 font-bold">
              <span>Total</span>
              <span class="text-lg">{{ formatCurrency(selectedReceipt?.amount || 0) }}</span>
            </div>
            
            <!-- Footer -->
            <div class="text-center text-[10px] text-gray-500 space-y-1">
              <p>Payment: {{ selectedReceipt?.payment_method === 'promptpay_slipok' ? 'PromptPay (SlipOK Auto)' : 'PromptPay / Bank Transfer' }}</p>
              <p v-if="selectedReceipt?.slip_trans_ref">Slip Ref: {{ selectedReceipt.slip_trans_ref }}</p>
              <p v-else-if="selectedReceipt?.note">Ref: {{ selectedReceipt.note }}</p>
              <p class="mt-4 pt-4 border-t border-gray-200">Thank you for choosing ChiiMenu</p>
              <p>LINE: @819wgrsj</p>
            </div>
          </div>
        </div>
        
        <div class="p-4 border-t border-border bg-muted/30 flex justify-end gap-3">
          <button @click="showReceiptModal = false" class="px-5 py-2.5 text-muted-foreground font-medium hover:bg-muted rounded-xl transition-colors text-xs">
            {{ $t('btn_cancel') }}
          </button>
          <button @click="downloadReceiptImage" :disabled="downloading" class="px-5 py-2.5 bg-primary text-primary-foreground font-bold hover:bg-primary/90 rounded-xl shadow-xs transition-all flex items-center gap-2 disabled:opacity-50 text-xs">
            <svg v-if="downloading" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="animate-spin"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
            <Download v-else class="w-4 h-4" />
            <span>Download</span>
          </button>
        </div>
      </div>
    </div>

    <!-- 6. Payment & Slip Verification Modal (SlipOK PromptPay Auto) -->
    <div v-if="showPaymentModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md overflow-y-auto">
      <div class="bg-card border rounded-3xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col my-8 animate-in fade-in zoom-in-95 duration-200">
        
        <!-- Modal Header -->
        <div class="p-5 border-b border-border flex justify-between items-center bg-muted/30">
          <div class="flex items-center gap-2.5">
            <div class="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
              <QrCode class="w-5 h-5" />
            </div>
            <div>
              <h3 class="font-black text-base text-foreground flex items-center gap-2">
                ชำระเงินอัตโนมัติด้วย PromptPay
                <span v-if="qrData?.isPromo" class="text-[10px] px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 font-bold border border-rose-200">
                  ลด 50%
                </span>
              </h3>
              <p class="text-xs text-muted-foreground">สแกน QR Code โอนเงิน และแนบสลิปเพื่อเปิดใช้งานทันที 24 ชม.</p>
            </div>
          </div>
          <button 
            @click="closePaymentModal" 
            class="text-muted-foreground hover:text-foreground p-2 rounded-xl hover:bg-muted transition-colors cursor-pointer"
          >
            <X class="w-5 h-5" />
          </button>
        </div>

        <!-- Modal Body -->
        <div class="p-6 overflow-y-auto max-h-[calc(85vh-130px)] space-y-6">
          
          <!-- Loading State for QR generation -->
          <div v-if="isGeneratingQr" class="py-16 text-center space-y-3">
            <div class="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p class="text-xs font-medium text-muted-foreground">กำลังสร้าง QR Code พร้อมเพย์ตามยอดเงินของคุณ...</p>
          </div>

          <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            
            <!-- Left: QR Code Display & Payment Details -->
            <div class="bg-muted/20 border rounded-2xl p-5 flex flex-col items-center text-center space-y-4">
              <div class="bg-white p-3 rounded-2xl shadow-sm border border-slate-200 inline-block relative">
                <img 
                  v-if="qrData?.qrDataUrl" 
                  :src="qrData.qrDataUrl" 
                  alt="PromptPay QR Code" 
                  class="w-52 h-52 object-contain rounded-lg"
                />
                <div v-else class="w-52 h-52 flex items-center justify-center bg-muted/40 rounded-lg text-xs text-muted-foreground">
                  ไม่สามารถโหลด QR Code
                </div>
              </div>

              <!-- Package & Price Summary -->
              <div class="w-full bg-card border rounded-xl p-3.5 space-y-1.5 text-left text-xs">
                <div class="flex justify-between items-center text-muted-foreground">
                  <span>แพ็กเกจที่เลือก:</span>
                  <span class="font-bold text-foreground">{{ qrData?.package?.name }} ({{ qrData?.package?.days }} วัน)</span>
                </div>
                <div class="flex justify-between items-center">
                  <span class="text-muted-foreground">ยอดเงินที่ต้องโอน:</span>
                  <div class="flex items-center gap-1.5">
                    <span v-if="qrData?.isPromo" class="line-through text-muted-foreground text-[11px]">฿{{ qrData?.standardAmount }}</span>
                    <strong class="text-base text-rose-600 font-black">฿{{ qrData?.amount }}</strong>
                    <button 
                      @click="copyToClipboard(String(qrData?.amount), 'amount')" 
                      type="button"
                      class="text-muted-foreground hover:text-foreground p-1 rounded hover:bg-muted cursor-pointer"
                      title="คัดลอกยอดเงิน"
                    >
                      <Check v-if="copiedAmount" class="w-3.5 h-3.5 text-emerald-600" />
                      <Copy v-else class="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <div class="flex justify-between items-center text-muted-foreground pt-1 border-t border-dashed">
                  <span>บัญชีรับเงิน (PromptPay):</span>
                  <div class="flex items-center gap-1.5">
                    <span class="font-mono font-bold text-foreground">{{ qrData?.promptpayId }}</span>
                    <button 
                      @click="copyToClipboard(qrData?.promptpayId, 'id')" 
                      type="button"
                      class="text-muted-foreground hover:text-foreground p-1 rounded hover:bg-muted cursor-pointer"
                      title="คัดลอกเลขพร้อมเพย์"
                    >
                      <Check v-if="copiedPromptpay" class="w-3.5 h-3.5 text-emerald-600" />
                      <Copy v-else class="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <div v-if="qrData?.accountName" class="flex justify-between items-center text-muted-foreground text-[11px]">
                  <span>ชื่อบัญชี:</span>
                  <span class="font-medium text-foreground">{{ qrData.accountName }}</span>
                </div>
              </div>

              <p class="text-[11px] text-muted-foreground leading-relaxed">
                💡 สแกนผ่านแอปธนาคารใดก็ได้ ยอดเงินจะถูกระบุให้อัตโนมัติ จากนั้นบันทึกรูปสลิปและแนบในช่องขวามือ
              </p>
            </div>

            <!-- Right: Slip Upload & AI Verification -->
            <div class="space-y-4">
              <div>
                <label class="block text-xs font-bold text-foreground mb-1.5">
                  แนบรูปภาพสลิปการโอนเงิน <span class="text-rose-500">*</span>
                </label>

                <!-- Drag & Drop / File Input Box -->
                <div 
                  @dragover.prevent 
                  @dragenter.prevent 
                  @drop="onFileDrop"
                  class="border-2 border-dashed rounded-2xl p-4 text-center cursor-pointer transition-all hover:bg-muted/30 relative"
                  :class="slipFile ? 'border-emerald-400 bg-emerald-50/20' : 'border-border hover:border-primary/50'"
                  @click="triggerFileInput"
                >
                  <input 
                    ref="fileInputRef" 
                    type="file" 
                    accept="image/*" 
                    class="hidden" 
                    @change="onFileSelected"
                  />

                  <!-- Preview when file selected -->
                  <div v-if="slipPreviewUrl" class="space-y-3">
                    <div class="relative inline-block mx-auto">
                      <img 
                        :src="slipPreviewUrl" 
                        alt="Slip Preview" 
                        class="max-h-48 max-w-full rounded-xl object-contain shadow-xs border"
                      />
                      <button 
                        @click.stop="removeSlipFile" 
                        type="button"
                        class="absolute -top-2 -right-2 w-6 h-6 bg-rose-500 text-white rounded-full flex items-center justify-center hover:bg-rose-600 shadow-sm cursor-pointer"
                        title="ลบรูป"
                      >
                        <X class="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <p class="text-xs font-bold text-emerald-700 flex items-center justify-center gap-1">
                      <CheckCircle2 class="w-4 h-4 text-emerald-600" />
                      {{ slipFile?.name }} ({{ (slipFile?.size ? (slipFile.size / 1024).toFixed(0) : 0) }} KB)
                    </p>
                    <p class="text-[11px] text-muted-foreground">คลิกหรือลากรูปใหม่มาวางหากต้องการเปลี่ยนรูปสลิป</p>
                  </div>

                  <!-- Empty Placeholder -->
                  <div v-else class="py-6 space-y-2">
                    <div class="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto">
                      <UploadCloud class="w-6 h-6" />
                    </div>
                    <p class="text-xs font-bold text-foreground">คลิกเพื่อเลือกสลิป หรือลากไฟล์มาวางที่นี่</p>
                    <p class="text-[11px] text-muted-foreground">รองรับ JPG, PNG, WEBP หรือถ่ายรูปสลิป (สูงสุด 10MB)</p>
                  </div>
                </div>
              </div>

              <!-- Error Alert Banner -->
              <div v-if="verifyError" class="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5">
                <AlertCircle class="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div class="flex-1">
                  <strong class="font-bold block mb-0.5">การตรวจสอบไม่สำเร็จ:</strong>
                  <p class="leading-relaxed">{{ verifyError }}</p>
                </div>
              </div>

              <!-- Security Badges -->
              <div class="p-3 bg-muted/30 rounded-xl text-[11px] text-muted-foreground space-y-1">
                <div class="flex items-center gap-1.5 font-bold text-foreground">
                  <ShieldCheck class="w-4 h-4 text-emerald-600" />
                  <span>ระบบตรวจสลิปอัตโนมัติ SlipOK Real-time 24 ชม.</span>
                </div>
                <p>ระบบจะอ่าน QR Code บนสลิป ตรวจสอบยอดเงิน และขยายวันหมดอายุของร้านค้าให้ทันทีแบบเรียลไทม์</p>
              </div>

              <!-- Verification Action Button -->
              <button 
                @click="submitSlipVerification" 
                :disabled="!slipFile || isVerifying" 
                type="button"
                class="w-full py-3.5 px-5 rounded-xl font-black text-xs text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-md shadow-emerald-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <RefreshCw v-if="isVerifying" class="w-4 h-4 animate-spin" />
                <Sparkles v-else class="w-4 h-4 text-yellow-300" />
                <span>{{ isVerifying ? 'กำลังส่งสลิปให้ SlipOK ตรวจสอบ & ต่ออายุ...' : 'ตรวจสอบสลิป & ต่ออายุอัตโนมัติ' }}</span>
              </button>

            </div>

          </div>

        </div>

      </div>
    </div>

    <!-- 7. Success Celebration Modal -->
    <div v-if="showSuccessModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md">
      <div class="bg-card border rounded-3xl shadow-2xl w-full max-w-md overflow-hidden text-center p-8 space-y-5 animate-in zoom-in-95 duration-200">
        
        <div class="w-20 h-20 rounded-3xl bg-emerald-100 text-emerald-600 flex items-center justify-center text-4xl mx-auto shadow-inner ring-8 ring-emerald-50">
          🎉
        </div>

        <div class="space-y-1.5">
          <h3 class="text-xl font-black text-foreground">ต่ออายุแพ็กเกจสำเร็จ!</h3>
          <p class="text-xs text-muted-foreground">ระบบได้ทำการตรวจสอบสลิปและขยายระยะเวลาการใช้งานให้ร้านของคุณเรียบร้อยแล้ว</p>
        </div>

        <!-- Details Box -->
        <div class="bg-muted/20 border rounded-2xl p-4 text-xs space-y-2 text-left">
          <div class="flex justify-between items-center">
            <span class="text-muted-foreground">เลขที่ใบเสร็จ:</span>
            <span class="font-mono font-bold text-foreground">{{ successData?.receiptNumber }}</span>
          </div>
          <div class="flex justify-between items-center">
            <span class="text-muted-foreground">แพ็กเกจ:</span>
            <span class="font-bold text-foreground">{{ successData?.packageName }} ({{ successData?.packageDays }} วัน)</span>
          </div>
          <div class="flex justify-between items-center">
            <span class="text-muted-foreground">ยอดเงินที่ชำระ:</span>
            <span class="font-black text-emerald-600">฿{{ successData?.amount }}</span>
          </div>
          <div class="flex justify-between items-center pt-1 border-t border-dashed">
            <span class="text-muted-foreground">วันหมดอายุใหม่:</span>
            <span class="font-bold text-foreground">{{ formatDate(successData?.newExpiryDate) }}</span>
          </div>
        </div>

        <div class="space-y-2 pt-2">
          <button 
            @click="viewNewlyCreatedReceipt" 
            type="button"
            class="w-full py-3 px-4 rounded-xl text-xs font-bold text-white bg-primary hover:bg-primary/90 shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <FileText class="w-4 h-4" />
            <span>ดูและดาวน์โหลดใบเสร็จรับเงิน</span>
          </button>
          <button 
            @click="showSuccessModal = false" 
            type="button"
            class="w-full py-2.5 px-4 rounded-xl text-xs font-medium text-muted-foreground hover:bg-muted transition-colors cursor-pointer"
          >
            ปิดหน้าต่าง
          </button>
        </div>

      </div>
    </div>

  </div>
</template>
