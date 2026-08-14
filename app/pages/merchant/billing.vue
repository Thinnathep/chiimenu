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
  CreditCard
} from 'lucide-vue-next'
import { computed, ref, onMounted } from 'vue'
import { SUBSCRIPTION_PACKAGES } from '~/utils/pricing'

definePageMeta({
  layout: 'merchant',
  middleware: ['auth']
})

const client = useSupabaseClient()
const { store, fetchStore } = useCurrentStore()
const loading = ref(true)
const billingRecords = ref<any[]>([])
const selectedReceipt = ref<any>(null)
const showReceiptModal = ref(false)
const receiptContentRef = ref(null)
const downloading = ref(false)

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

onMounted(async () => {
  try {
    // Force refresh store data so newly approved plans / promo status are up to date
    await fetchStore(true)
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

// Rich Packages Definition with distinct personalities
const packages = computed(() => [
  {
    ...SUBSCRIPTION_PACKAGES['14d'],
    unit: 'บาท / 14 วัน',
    tagline: 'ทดสอบตลาด & เริ่มต้นอย่างมั่นใจ',
    badge: 'เริ่มต้นง่าย',
    isPopular: false,
    isBestValue: false,
    dailyRate: !store.value?.has_used_first_time_promo ? '5.3' : '10.6',
    savings: !store.value?.has_used_first_time_promo ? 'ประหยัด ฿74' : null,
    features: [
      { text: 'รับออเดอร์ QR Code ไม่จำกัดโต๊ะ', highlight: true },
      { text: 'ระบบแปลภาษา 3 ภาษา (ไทย, อังกฤษ, จีน)', highlight: true },
      { text: 'แจ้งเตือนออเดอร์เข้า LINE ร้านค้าทันที', highlight: false },
      { text: 'ปรับแต่งเมนูและราคาได้เรียลไทม์', highlight: false }
    ],
    ctaText: 'ต่ออายุ 14 วัน',
    ctaClass: 'bg-muted text-foreground hover:bg-muted/80'
  },
  {
    ...SUBSCRIPTION_PACKAGES['monthly'],
    unit: 'บาท / เดือน',
    tagline: 'ทางเลือกยอดนิยม คุ้มค่าที่สุดสำหรับร้านอาหาร',
    badge: '🔥 ยอดนิยมสูงสุด',
    isPopular: true,
    isBestValue: false,
    dailyRate: !store.value?.has_used_first_time_promo ? '4.3' : '8.6',
    savings: !store.value?.has_used_first_time_promo ? 'ประหยัด ฿130' : null,
    features: [
      { text: 'รวมทุกฟีเจอร์ในแพ็กเกจ 14 วัน', highlight: true },
      { text: 'แดชบอร์ดสรุปยอดและสถิติออเดอร์รายวัน', highlight: true },
      { text: 'ป้าย QR Code สั่งอาหารความละเอียดสูง', highlight: false },
      { text: 'ทีมงานให้คำปรึกษาตลอดการใช้งาน', highlight: false },
      { text: 'เฉลี่ยเพียง ~8.6 บ./วัน (โปรครั้งแรก 4.3 บ.)', highlight: true }
    ],
    ctaText: 'เลือกแพ็กเกจ 1 เดือน',
    ctaClass: 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-md shadow-rose-200'
  },
  {
    ...SUBSCRIPTION_PACKAGES['yearly'],
    unit: 'บาท / ปี',
    tagline: 'ประหยัดสูงสุด ไร้กังวลเรื่องการต่ออายุตลอดปี',
    badge: '👑 คุ้มค่าที่สุด (จ่าย 10 เดือน ฟรี 2 เดือน)',
    isPopular: false,
    isBestValue: true,
    dailyRate: !store.value?.has_used_first_time_promo ? '3.5' : '7.1',
    savings: !store.value?.has_used_first_time_promo ? 'ประหยัด ฿1,295' : 'ประหยัดค่าบริการ 2 เดือน',
    features: [
      { text: 'รวมทุกฟีเจอร์ระดับโปรทั้งหมด 365 วัน', highlight: true },
      { text: 'สิทธิ์รับอัปเดตฟีเจอร์ใหม่ๆ ฟรีตลอดปี', highlight: true },
      { text: 'ไม่ต้องกังวลเรื่องการต่ออายุทุกเดือน', highlight: false },
      { text: 'ระบบดูแลและสำรองข้อมูลร้านค้าตลอดปี', highlight: false },
      { text: 'เฉลี่ยถูกที่สุดเพียง 7.1 บ./วัน (โปร 3.5 บ.)', highlight: true }
    ],
    ctaText: 'ต่ออายุ 1 ปี คุ้มที่สุด',
    ctaClass: 'bg-slate-900 text-white hover:bg-slate-800 shadow-sm'
  }
])
</script>

<template>
  <div class="w-full max-w-[1400px] mx-auto pb-16 space-y-8">
    
    <!-- Page Header & Status Overview -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl sm:text-3xl font-black tracking-tight text-foreground">แพ็กเกจและการต่ออายุสมาชิก</h1>
        <p class="text-muted-foreground mt-1 text-sm">
          เลือกแพ็กเกจที่ลงตัวกับร้านของคุณ เพื่อให้ลูกค้านักท่องเที่ยวสามารถสแกนสั่งอาหารได้อย่างต่อเนื่อง
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
        <span>ติดต่อแอดมินผ่าน LINE OA</span>
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
            <span class="text-xs font-semibold text-muted-foreground">ร้านของคุณ:</span>
            <strong class="text-base text-foreground font-black">{{ store.name }}</strong>
            
            <span 
              class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold shadow-2xs"
              :class="store.plan_status === 'active' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-amber-100 text-amber-800 border border-amber-200'"
            >
              <span class="w-1.5 h-1.5 rounded-full" :class="store.plan_status === 'active' ? 'bg-emerald-500' : 'bg-amber-500'"></span>
              {{ store.plan_status === 'active' ? 'ใช้งานจริง (Active Plan)' : 'ทดลองใช้ (Trial Period)' }}
            </span>
          </div>

          <div class="text-xs text-muted-foreground flex flex-wrap items-center gap-3">
            <div class="flex items-center gap-1.5">
              <CalendarRange class="w-4 h-4 text-primary" />
              <span>วันหมดอายุ: <strong class="text-foreground">{{ formatDate(getActiveEndDate()) }}</strong></span>
            </div>

            <span 
              class="px-2.5 py-0.5 rounded-md font-bold text-xs"
              :class="isExpired ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'"
            >
              <span v-if="isExpired">หมดอายุแล้ว (กรุณาต่ออายุ)</span>
              <span v-else>เหลือเวลาอีก {{ getDaysRemaining() }} วัน</span>
            </span>
          </div>
        </div>

        <!-- <a 
          href="https://line.me/R/ti/p/@819wgrsj" 
          target="_blank" 
          rel="noopener noreferrer" 
          class="px-5 py-2.5 bg-primary text-primary-foreground hover:bg-primary/90 font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-2 shrink-0"
        >
          <Phone class="w-3.5 h-3.5" />
          <span>แจ้งต่ออายุกับแอดมิน</span>
        </a> -->
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
                Special Offer
              </span>
              <h3 class="text-lg font-black tracking-tight">สิทธิ์ส่วนลดพิเศษ 50% สำหรับร้านค้าใหม่!</h3>
            </div>
            <p class="text-xs text-rose-100 mt-1">
              รับสิทธิ์ลดค่าบริการ 50% ทันทีในการต่ออายุครั้งแรก (ใช้ได้ 1 ครั้ง ต่อ 1 ร้านค้า เลือกแพ็กเกจใดก็ได้)
            </p>
          </div>
        </div>

        <div class="shrink-0">
          <span class="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/20 backdrop-blur-md text-white text-xs font-bold border border-white/30">
            <Sparkles class="w-4 h-4 text-yellow-300" />
            ลดทันทีในราคานี้
          </span>
        </div>
      </div>

      <!-- 3. Packages Grid (Distinct & Compelling) -->
      <div>
        <div class="text-center mb-8">
          <h2 class="text-xl font-black text-foreground">เลือกแพ็กเกจที่เหมาะกับการดำเนินงานของร้านคุณ</h2>
          <p class="text-xs text-muted-foreground mt-1">ไม่มีข้อผูกมัดระยะยาว ปรับเปลี่ยนและต่ออายุได้ตามความสะดวก</p>
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
                  <span>ตกวันละเพียง ~{{ pkg.dailyRate }} บาท</span>
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
                <p class="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">ฟีเจอร์เด่นที่จะได้รับ:</p>
                
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

            <!-- CTA Button -->
            <div class="mt-8 pt-4 border-t">
              <a 
                :href="`https://line.me/R/ti/p/@819wgrsj`" 
                target="_blank" 
                rel="noopener noreferrer" 
                class="w-full py-3 px-4 rounded-xl text-xs font-bold text-center flex items-center justify-center gap-2 transition-all block"
                :class="pkg.ctaClass"
              >
                <span>{{ pkg.ctaText }}</span>
                <ArrowRight class="w-3.5 h-3.5" />
              </a>
            </div>

          </div>

        </div>

        <p class="text-center text-xs text-muted-foreground mt-6">
          * ราคาและโปรโมชั่นอาจมีการเปลี่ยนแปลง สามารถสอบถามรายละเอียดเพิ่มเติมได้ที่ LINE Official Account
        </p>
      </div>

      <!-- 4. How to Renew Easy 3 Steps -->
      <div class="bg-card border rounded-3xl p-6 sm:p-8 shadow-xs">
        <h3 class="text-base font-bold text-foreground mb-6 flex items-center gap-2">
          <Sparkles class="w-4 h-4 text-primary" />
          ขั้นตอนการต่ออายุสมาชิกง่ายๆ ใน 3 ขั้นตอน
        </h3>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
          <div class="p-4 rounded-2xl bg-muted/20 border flex items-start gap-3.5">
            <div class="w-8 h-8 rounded-xl bg-primary text-primary-foreground font-black text-sm flex items-center justify-center shrink-0">
              1
            </div>
            <div>
              <h4 class="text-xs font-bold text-foreground">เลือกแพ็กเกจที่ต้องการ</h4>
              <p class="text-xs text-muted-foreground mt-0.5">เลือก 14 วัน, 1 เดือน หรือ 1 ปี ตามรอบการใช้งานของร้าน</p>
            </div>
          </div>

          <div class="p-4 rounded-2xl bg-muted/20 border flex items-start gap-3.5">
            <div class="w-8 h-8 rounded-xl bg-primary text-primary-foreground font-black text-sm flex items-center justify-center shrink-0">
              2
            </div>
            <div>
              <h4 class="text-xs font-bold text-foreground">ทัก LINE พร้อมส่งสลิป</h4>
              <p class="text-xs text-muted-foreground mt-0.5">แจ้งชื่อร้านค้าและแนบสลิปโอนเงินมาที่ LINE: @819wgrsj</p>
            </div>
          </div>

          <div class="p-4 rounded-2xl bg-muted/20 border flex items-start gap-3.5">
            <div class="w-8 h-8 rounded-xl bg-primary text-primary-foreground font-black text-sm flex items-center justify-center shrink-0">
              3
            </div>
            <div>
              <h4 class="text-xs font-bold text-foreground">เปิดใช้งานต่อเนื่องทันที</h4>
              <p class="text-xs text-muted-foreground mt-0.5">แอดมินดำเนินการปลดล็อกและออกใบเสร็จรับเงินให้ภายใน 5 นาที</p>
            </div>
          </div>
        </div>
      </div>

      <!-- 5. Billing History Section -->
      <div class="bg-card border rounded-3xl shadow-xs overflow-hidden" id="billing-history-section">
        <div class="p-6 border-b flex items-center justify-between bg-muted/10">
          <div class="flex items-center gap-2.5">
            <div class="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Receipt class="w-4 h-4" />
            </div>
            <div>
              <h3 class="text-base font-bold text-foreground">{{ $t('billing_history_title') }}</h3>
              <p class="text-xs text-muted-foreground">ประวัติการชำระเงินและใบเสร็จทั้งหมดของร้านคุณ</p>
            </div>
          </div>
          <span class="text-xs text-muted-foreground">{{ billingRecords.length }} รายการ</span>
        </div>
        
        <div v-if="billingRecords.length === 0" class="p-12 text-center text-muted-foreground">
          <FileText class="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p class="text-sm font-medium">{{ $t('billing_no_history') }}</p>
        </div>
        
        <div v-else class="overflow-x-auto">
          <table class="w-full text-sm text-left">
            <thead class="text-[11px] text-muted-foreground uppercase bg-muted/30 border-b font-semibold tracking-wider">
              <tr>
                <th scope="col" class="px-6 py-3.5">{{ $t('billing_col_receipt') }}</th>
                <th scope="col" class="px-6 py-3.5">{{ $t('billing_col_package') }}</th>
                <th scope="col" class="px-6 py-3.5">{{ $t('billing_col_amount') }}</th>
                <th scope="col" class="px-6 py-3.5">{{ $t('billing_col_paid_at') }}</th>
                <th scope="col" class="px-6 py-3.5">{{ $t('billing_col_valid') }}</th>
                <th scope="col" class="px-6 py-3.5 text-right">ใบเสร็จ</th>
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
                  </div>
                </td>
                <td class="px-6 py-4 font-black text-emerald-600">{{ formatCurrency(record.amount) }}</td>
                <td class="px-6 py-4 text-xs text-muted-foreground whitespace-nowrap">{{ formatDateTime(record.paid_at) }}</td>
                <td class="px-6 py-4 text-xs text-muted-foreground whitespace-nowrap">
                  {{ formatDate(record.plan_start_at) }} - {{ formatDate(record.plan_end_at) }}
                </td>
                <td class="px-6 py-4 text-right whitespace-nowrap">
                  <button 
                    @click="openReceipt(record)" 
                    class="text-primary hover:text-primary/80 font-bold text-xs transition-colors px-3 py-1.5 rounded-lg hover:bg-primary/10 inline-flex items-center gap-1.5 border border-primary/20"
                  >
                    <Download class="w-3.5 h-3.5" />
                    <span>{{ $t('billing_btn_download') }}</span>
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
            <Receipt class="w-5 h-5 text-primary" />
            <h3 class="font-bold text-base text-foreground">{{ $t('billing_receipt_title') }}</h3>
          </div>
          <button @click="showReceiptModal = false" class="text-muted-foreground hover:text-foreground p-1.5 rounded-xl hover:bg-muted transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
          </button>
        </div>
        
        <!-- Receipt Preview Area -->
        <div class="p-6 overflow-y-auto flex-1 bg-muted/10">
          <div id="receipt-content" ref="receiptContentRef" class="bg-white text-black p-8 mx-auto shadow-sm border border-gray-200 rounded-2xl" style="width: 100%; max-width: 400px; font-family: monospace, sans-serif;">
            <!-- Receipt Header -->
            <div class="text-center mb-6">
              <h2 class="text-xl font-bold mb-1">ChiiMenu</h2>
              <p class="text-xs text-gray-500">{{ $t('billing_receipt_title') }}</p>
            </div>
            
            <div class="text-xs mb-6 space-y-1">
              <div class="flex justify-between">
                <span class="text-gray-500">{{ $t('billing_col_receipt') }}:</span>
                <span class="font-medium">{{ selectedReceipt?.receipt_number }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-500">{{ $t('billing_col_paid_at') }}:</span>
                <span>{{ formatDateTime(selectedReceipt?.paid_at) }}</span>
              </div>
            </div>
            
            <!-- Customer Info -->
            <div class="text-xs mb-6 space-y-1 pb-4 border-b border-gray-200 border-dashed">
              <div class="flex flex-col">
                <span class="text-gray-500 mb-1">{{ $t('billing_receipt_issued_to') }}:</span>
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
                      ส่วนลดโปรโมชั่น ({{ selectedReceipt?.promotion_code }})
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
              <p>{{ $t('billing_receipt_payment_method') }}: {{ $t('billing_receipt_bank_transfer') }}</p>
              <p v-if="selectedReceipt?.note">Ref: {{ selectedReceipt.note }}</p>
              <p class="mt-4 pt-4 border-t border-gray-200">{{ $t('billing_receipt_footer') }}</p>
              <p>LINE: @819wgrsj</p>
            </div>
          </div>
        </div>
        
        <div class="p-4 border-t border-border bg-muted/30 flex justify-end gap-3">
          <button @click="showReceiptModal = false" class="px-5 py-2.5 text-muted-foreground font-medium hover:bg-muted rounded-xl transition-colors text-xs">
            ปิด
          </button>
          <button @click="downloadReceiptImage" :disabled="downloading" class="px-5 py-2.5 bg-primary text-primary-foreground font-bold hover:bg-primary/90 rounded-xl shadow-xs transition-all flex items-center gap-2 disabled:opacity-50 text-xs">
            <svg v-if="downloading" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="animate-spin"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
            <Download v-else class="w-4 h-4" />
            <span>บันทึกเป็นรูปภาพ</span>
          </button>
        </div>
      </div>
    </div>

  </div>
</template>
