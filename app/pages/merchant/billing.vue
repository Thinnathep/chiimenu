<script setup lang="ts">
import { CheckCircle2, Phone, CalendarRange } from 'lucide-vue-next'
import { computed, ref, onMounted } from 'vue'

definePageMeta({
  layout: 'merchant',
  middleware: ['auth']
})

const client = useSupabaseClient()
const store = ref<any>(null)
const loading = ref(true)
const billingRecords = ref<any[]>([])
const selectedReceipt = ref<any>(null)
const showReceiptModal = ref(false)
const receiptContentRef = ref(null)
const downloading = ref(false)

onMounted(async () => {
  const { data: authData } = await client.auth.getUser()
  if (!authData?.user?.id) return

  const { data: storeData, error } = await client
    .from('stores')
    .select('*')
    .eq('owner_id', authData.user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    
  if (error) {
    console.error('Error fetching store:', error)
  }
    
  if (storeData && storeData.length > 0) {
    store.value = storeData[0]
    
    // Fetch billing history
    const { data: billingData } = await client
      .from('billing_records')
      .select('*')
      .eq('store_id', store.value.id)
      .order('created_at', { ascending: false })
      
    if (billingData) {
      billingRecords.value = billingData
    }
  }
  loading.value = false
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
  return new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' }).format(amount)
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

const packages = [
  {
    name: 'แพ็กเกจ 14 วัน',
    price: '99',
    unit: 'บาท / 14 วัน',
    features: ['รับออเดอร์ผ่าน QR Code', 'ปรับแต่งเมนูได้ไม่จำกัด', 'รองรับ 3 ภาษา (ไทย, อังกฤษ, จีน)', 'การแจ้งเตือนออเดอร์ผ่าน LINE']
  },
  {
    name: 'แพ็กเกจ 1 เดือน',
    price: '259',
    unit: 'บาท / เดือน',
    isPopular: true,
    features: ['รับออเดอร์ผ่าน QR Code', 'ปรับแต่งเมนูได้ไม่จำกัด', 'รองรับ 3 ภาษา (ไทย, อังกฤษ, จีน)', 'การแจ้งเตือนออเดอร์ผ่าน LINE', 'ประหยัดกว่ารายสัปดาห์']
  },
  {
    name: 'แพ็กเกจ 1 ปี',
    price: '1,990',
    unit: 'บาท / ปี',
    features: ['รับออเดอร์ผ่าน QR Code', 'ปรับแต่งเมนูได้ไม่จำกัด', 'รองรับ 3 ภาษา (ไทย, อังกฤษ, จีน)', 'การแจ้งเตือนออเดอร์ผ่าน LINE', 'ประหยัดที่สุด (แถมฟรี 2 เดือน)']
  }
]
</script>

<template>
  <div class="w-full max-w-[1400px] mx-auto pb-12">
    <div class="mb-8">
      <h1 class="text-2xl font-bold tracking-tight text-foreground">แพ็กเกจและการต่ออายุ</h1>
      <p class="text-muted-foreground mt-1">
        เลือกแพ็กเกจที่เหมาะสมกับร้านของคุณ เพื่อให้ลูกค้าสามารถสแกนสั่งอาหารได้อย่างต่อเนื่อง
      </p>
    </div>

    <div v-if="loading" class="text-center p-12">
      <div class="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
    </div>

    <div v-else-if="!store" class="text-center p-12 bg-card border rounded-2xl shadow-sm">
      <div class="text-4xl mb-4">🏪</div>
      <h2 class="text-xl font-semibold text-foreground mb-2">ไม่พบข้อมูลร้านค้า</h2>
      <p class="text-muted-foreground mb-6">คุณต้องสร้างร้านค้าก่อนจึงจะสามารถดูแพ็กเกจได้</p>
      <NuxtLink to="/merchant/store/create" class="px-6 py-2.5 bg-primary text-primary-foreground hover:bg-primary/90 font-medium rounded-xl shadow-sm transition-all inline-flex items-center gap-2">
        สร้างร้านค้าเลย
      </NuxtLink>
    </div>

    <div v-else class="space-y-8">
      <!-- Status Card -->
      <div class="bg-card border rounded-2xl p-6 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 class="text-lg font-semibold text-foreground mb-1">สถานะปัจจุบัน: 
            <span :class="store.plan_status === 'active' ? 'text-emerald-600' : 'text-amber-600'">
              {{ store.plan_status === 'active' ? 'ใช้งานจริง' : 'ทดลองใช้' }}
            </span>
          </h2>
          <div class="text-sm text-muted-foreground flex items-center gap-2">
            <CalendarRange class="w-4 h-4" />
            <span>หมดอายุวันที่ {{ formatDate(getActiveEndDate()) }}</span>
            <span v-if="isExpired" class="text-rose-500 font-bold ml-2">(หมดอายุแล้ว)</span>
            <span v-else class="text-emerald-600 font-medium ml-2">(เหลือ {{ getDaysRemaining() }} วัน)</span>
          </div>
        </div>
        <a href="https://line.me/R/ti/p/@819wgrsj" target="_blank" rel="noopener noreferrer" class="px-6 py-2.5 bg-primary text-primary-foreground hover:bg-primary/90 font-medium rounded-xl shadow-sm transition-all flex items-center gap-2">
          <Phone class="w-4 h-4" />
          ติดต่อแอดมินเพื่อต่ออายุ
        </a>
      </div>

      <!-- Packages -->
      <div>
        <h3 class="text-xl font-bold mb-6 text-foreground text-center">ตัวเลือกแพ็กเกจ</h3>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div v-for="pkg in packages" :key="pkg.name" class="relative bg-card border rounded-3xl p-8 shadow-sm flex flex-col" :class="pkg.isPopular ? 'border-primary ring-2 ring-primary/20 scale-100 md:scale-105 z-10 shadow-md' : 'border-border'">
            <div v-if="pkg.isPopular" class="absolute -top-4 left-0 right-0 flex justify-center">
              <span class="bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                ยอดนิยม
              </span>
            </div>
            
            <h4 class="text-lg font-medium text-foreground text-center">{{ pkg.name }}</h4>
            <div class="mt-4 text-center">
              <span class="text-4xl font-black text-foreground">{{ pkg.price }}</span>
              <span class="text-sm text-muted-foreground ml-1">{{ pkg.unit }}</span>
            </div>
            
            <ul class="mt-8 space-y-4 flex-1">
              <li v-for="feat in pkg.features" :key="feat" class="flex items-start gap-3">
                <CheckCircle2 class="w-5 h-5 text-emerald-500 shrink-0" />
                <span class="text-sm text-muted-foreground leading-tight">{{ feat }}</span>
              </li>
            </ul>
            
            <div class="mt-8">
              <a href="https://line.me/R/ti/p/@819wgrsj" target="_blank" rel="noopener noreferrer" class="block w-full text-center px-4 py-3 rounded-xl font-medium transition-colors" :class="pkg.isPopular ? 'bg-primary text-primary-foreground hover:bg-primary/90' : 'bg-muted text-foreground hover:bg-muted/80'">
                ต่ออายุแพ็กเกจนี้
              </a>
            </div>
          </div>
        </div>
      </div>
      
      <div class="text-center text-sm text-muted-foreground mt-8">
        * ราคาอาจมีการเปลี่ยนแปลง สามารถสอบถามโปรโมชั่นล่าสุดได้ที่ LINE OA
      </div>

      <!-- Billing History -->
      <div class="mt-12 bg-card border rounded-2xl shadow-sm overflow-hidden" id="billing-history-section">
        <div class="p-6 border-b border-border">
          <h3 class="text-xl font-bold text-foreground">{{ $t('billing_history_title') }}</h3>
        </div>
        
        <div v-if="billingRecords.length === 0" class="p-8 text-center text-muted-foreground">
          {{ $t('billing_no_history') }}
        </div>
        <div v-else class="overflow-x-auto">
          <table class="w-full text-sm text-left">
            <thead class="text-xs text-muted-foreground uppercase bg-muted/50 border-b border-border">
              <tr>
                <th scope="col" class="px-6 py-4 font-medium">{{ $t('billing_col_receipt') }}</th>
                <th scope="col" class="px-6 py-4 font-medium">{{ $t('billing_col_package') }}</th>
                <th scope="col" class="px-6 py-4 font-medium">{{ $t('billing_col_amount') }}</th>
                <th scope="col" class="px-6 py-4 font-medium">{{ $t('billing_col_paid_at') }}</th>
                <th scope="col" class="px-6 py-4 font-medium">{{ $t('billing_col_valid') }}</th>
                <th scope="col" class="px-6 py-4 text-right font-medium"></th>
              </tr>
            </thead>
            <tbody class="divide-y divide-border">
              <tr v-for="record in billingRecords" :key="record.id" class="hover:bg-muted/30 transition-colors">
                <td class="px-6 py-4 font-medium text-foreground whitespace-nowrap">{{ record.receipt_number }}</td>
                <td class="px-6 py-4 text-muted-foreground">{{ record.package_name }}</td>
                <td class="px-6 py-4 font-medium text-emerald-600">{{ formatCurrency(record.amount) }}</td>
                <td class="px-6 py-4 text-muted-foreground whitespace-nowrap">{{ formatDateTime(record.paid_at) }}</td>
                <td class="px-6 py-4 text-muted-foreground whitespace-nowrap">
                  {{ formatDate(record.plan_start_at) }} - {{ formatDate(record.plan_end_at) }}
                </td>
                <td class="px-6 py-4 text-right">
                  <button @click="openReceipt(record)" class="text-primary hover:text-primary/80 font-medium text-sm transition-colors px-3 py-1.5 rounded-lg hover:bg-primary/10">
                    {{ $t('billing_btn_download') }}
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>

  <!-- Receipt Print Modal -->
  <div v-if="showReceiptModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm print:hidden">
    <div class="bg-card border rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
      <div class="p-4 border-b border-border flex justify-between items-center bg-muted/30">
        <h3 class="font-bold text-lg text-foreground">{{ $t('billing_receipt_title') }}</h3>
        <button @click="showReceiptModal = false" class="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-muted transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
        </button>
      </div>
      
      <!-- Receipt Preview Area -->
      <div class="p-6 overflow-y-auto flex-1 bg-muted/10">
        <div id="receipt-content" ref="receiptContentRef" class="bg-white text-black p-8 mx-auto shadow-sm border border-gray-200 rounded-xl" style="width: 100%; max-width: 400px; font-family: monospace, sans-serif;">
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
                  <td class="text-right align-top py-1">{{ formatCurrency(selectedReceipt?.amount || 0) }}</td>
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
        <button @click="showReceiptModal = false" class="px-5 py-2.5 text-muted-foreground font-medium hover:bg-muted rounded-xl transition-colors">
          ปิด
        </button>
        <button @click="downloadReceiptImage" :disabled="downloading" class="px-5 py-2.5 bg-primary text-primary-foreground font-medium hover:bg-primary/90 rounded-xl shadow-sm transition-all flex items-center gap-2 disabled:opacity-50">
          <svg v-if="downloading" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="animate-spin"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
          <svg v-else xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
          บันทึกเป็นรูปภาพ
        </button>
      </div>
    </div>
  </div>
</template>
