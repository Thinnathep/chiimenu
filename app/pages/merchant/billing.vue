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

const packages = [
  {
    name: 'แพ็กเกจ 14 วัน',
    price: '99',
    unit: 'บาท / 14 วัน',
    features: ['รับออเดอร์ผ่าน QR Code', 'ปรับแต่งเมนูได้ไม่จำกัด', 'รองรับ 3 ภาษา (ไทย, อังกฤษ, จีน)', 'การแจ้งเตือนออเดอร์ผ่าน LINE']
  },
  {
    name: 'แพ็กเกจ 1 เดือน',
    price: '199',
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
        <a href="https://line.me/R/ti/p/@chiimenu" target="_blank" rel="noopener noreferrer" class="px-6 py-2.5 bg-primary text-primary-foreground hover:bg-primary/90 font-medium rounded-xl shadow-sm transition-all flex items-center gap-2">
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
              <a href="https://line.me/R/ti/p/@chiimenu" target="_blank" rel="noopener noreferrer" class="block w-full text-center px-4 py-3 rounded-xl font-medium transition-colors" :class="pkg.isPopular ? 'bg-primary text-primary-foreground hover:bg-primary/90' : 'bg-muted text-foreground hover:bg-muted/80'">
                ต่ออายุแพ็กเกจนี้
              </a>
            </div>
          </div>
        </div>
      </div>
      
      <div class="text-center text-sm text-muted-foreground mt-8">
        * ราคาอาจมีการเปลี่ยนแปลง สามารถสอบถามโปรโมชั่นล่าสุดได้ที่ LINE OA
      </div>
    </div>
  </div>
</template>
