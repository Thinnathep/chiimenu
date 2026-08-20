<script setup lang="ts">
definePageMeta({
  layout: 'merchant',
  middleware: ['auth']
})

const client = useSupabaseClient()
const { store, loading: pending, fetchStore } = useCurrentStore()

// Fetch today's orders stats
const orderStats = ref({ todayCount: 0, latestOrders: [] as any[] })

const fetchOrderStats = async () => {
  if (!store.value?.id) return
  
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayStr = today.toISOString()
  
  const { data, error } = await client
    .from('orders')
    .select('id, status, table_no, items, created_at')
    .eq('store_id', store.value.id)
    .gte('created_at', todayStr)
    .order('created_at', { ascending: false })
    
  if (!error && data) {
    orderStats.value = {
      todayCount: data.length,
      latestOrders: (data as any[]).slice(0, 3)
    }
  }
}

onMounted(async () => {
  if (!store.value) {
    await fetchStore()
  }
  await fetchOrderStats()
})

watch(() => store.value?.id, async (newId) => {
  if (newId) {
    await fetchOrderStats()
  }
})

const daysRemaining = computed(() => {
  if (!store.value?.trial_ends_at) return 0
  const end = new Date(store.value.trial_ends_at)
  const now = new Date()
  const diffTime = end.getTime() - now.getTime()
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
})

const isTrial = computed(() => store.value?.plan_status === 'trial')
</script>

<template>
  <div>
    <h1 class="text-2xl font-bold tracking-tight text-foreground mb-6">{{ $t('dash_title') }}</h1>
    
    <div v-if="pending" class="text-muted-foreground">{{ $t('menu_list_loading') }}</div>
    
    <div v-else-if="!store" class="bg-card border rounded-lg p-8 text-center max-w-2xl mx-auto shadow-sm">
      <div class="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 mb-4">
        <svg class="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" d="M13.5 21v-7.5a2.25 2.25 0 01-2.25-2.25v-15a2.25 2.25 0 00-2.25 2.25M10.5 21v-7.5a2.25 2.25 0 01-2.25-2.25m0 0a2.25 2.25 0 012.25 2.25M3 13.5l6-6 6 6m-6-6v15" />
        </svg>
      </div>
      <h2 class="text-xl font-semibold mb-2">{{ $t('dash_welcome') }}</h2>
      <p class="text-muted-foreground mb-6">{{ $t('dash_no_store_msg') }}</p>
      <NuxtLink to="/merchant/store/create" class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-primary-foreground bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary">
        {{ $t('dash_create_store') }}
      </NuxtLink>
    </div>
    
    <div v-else>
      <!-- Trial / Plan Banner -->
      <div class="mb-6">
        <div v-if="isTrial && daysRemaining > 7" class="bg-blue-50 border-l-4 border-blue-400 p-4 rounded-md">
          <div class="flex">
            <div class="ml-3">
              <p class="text-sm text-blue-700">
                สถานะ: ทดลองใช้งาน (เหลืออีก {{ daysRemaining }} วัน)
              </p>
            </div>
          </div>
        </div>
        
        <div v-else-if="isTrial && daysRemaining <= 7 && daysRemaining >= 0" class="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-md">
          <div class="flex">
            <div class="ml-3">
              <p class="text-sm text-yellow-700 font-medium">
                ⚠️ เหลือเวลาทดลองใช้อีกเพียง {{ daysRemaining }} วัน! กรุณาต่ออายุเพื่อใช้งานอย่างต่อเนื่อง
              </p>
            </div>
          </div>
        </div>
        
        <div v-else-if="daysRemaining < 0 && isTrial" class="bg-red-50 border-l-4 border-red-400 p-4 rounded-md">
          <div class="flex">
            <div class="ml-3">
              <p class="text-sm text-red-700 font-bold">
                ❌ หมดเวลาทดลองใช้งานแล้ว (เมนูฝั่งลูกค้าปิดการแสดงผลชั่วคราว) กรุณาต่ออายุ
              </p>
            </div>
          </div>
        </div>
        
        <div v-else-if="store.plan_status === 'active'" class="bg-green-50 border-l-4 border-green-400 p-4 rounded-md">
           <div class="flex">
            <div class="ml-3">
              <p class="text-sm text-green-700 font-medium">
                ✅ สถานะ: Active (ใช้งานได้อีก {{ daysRemaining }} วัน)
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- Quick Start / User Guide Banner -->
      <div class="mb-6 bg-gradient-to-r from-primary/10 via-card to-primary/5 border rounded-3xl p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div class="flex items-center gap-3.5">
          <div class="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center text-2xl font-bold shrink-0">
            📚
          </div>
          <div>
            <h2 class="text-sm sm:text-base font-bold text-foreground">คู่มือเริ่มต้นใช้งานระบบ (Merchant Guide)</h2>
            <p class="text-xs text-muted-foreground mt-0.5">เรียนรู้วิธีเพิ่มเมนู 3 ภาษา เชื่อมต่อแจ้งเตือน LINE และพิมพ์ QR Code ประจำโต๊ะ</p>
          </div>
        </div>

        <NuxtLink 
          to="/merchant/guide" 
          class="px-5 py-2.5 bg-primary text-primary-foreground font-bold text-xs rounded-2xl shadow-xs hover:bg-primary/90 transition-all inline-flex items-center justify-center gap-1.5 shrink-0"
        >
          <span>เปิดดูคู่มือแบบจับมือทำ</span>
          <span>→</span>
        </NuxtLink>
      </div>

      <div class="grid grid-cols-1 gap-6 md:grid-cols-2">
        <!-- Order Stats -->
        <div class="bg-card overflow-hidden shadow-sm rounded-lg border">
          <div class="p-5">
            <div class="flex items-center">
              <div class="flex-shrink-0">
                <span class="text-3xl">🍽️</span>
              </div>
              <div class="ml-5 w-0 flex-1">
                <dl>
                  <dt class="text-sm font-medium text-muted-foreground truncate">ออเดอร์วันนี้ (Today's Orders)</dt>
                  <dd class="flex items-baseline">
                    <div class="text-2xl font-semibold text-foreground">{{ orderStats?.todayCount || 0 }}</div>
                  </dd>
                </dl>
              </div>
            </div>
            
            <div v-if="orderStats?.latestOrders?.length" class="mt-4 pt-4 border-t border-border/50">
              <p class="text-xs font-bold text-muted-foreground mb-2">ออเดอร์ล่าสุด:</p>
              <ul class="space-y-2">
                <li v-for="order in orderStats.latestOrders" :key="order.id" class="text-sm flex justify-between">
                  <span>โต๊ะ {{ order.table_no }} ({{ order.items.length }} รายการ)</span>
                  <span class="text-muted-foreground">{{ new Date(order.created_at).toLocaleTimeString('th-TH', {hour: '2-digit', minute:'2-digit'}) }}</span>
                </li>
              </ul>
            </div>

            <div class="mt-4 pt-3 border-t border-border/50 flex justify-between items-center text-xs">
              <NuxtLink to="/merchant/orders" class="text-muted-foreground hover:text-foreground transition-colors font-medium">
                ดูออเดอร์ทั้งหมด
              </NuxtLink>
              <NuxtLink to="/merchant/analytics" class="text-primary hover:underline font-bold inline-flex items-center gap-1">
                <span>📊 รายงานยอดขาย (Analytics)</span>
                <span>→</span>
              </NuxtLink>
            </div>
          </div>
        </div>

      
      <!-- Store Info Summary -->
      <div class="bg-card overflow-hidden shadow-sm rounded-lg border flex flex-col">
        <div class="relative h-24 bg-primary/20">
          <img v-if="store.cover_url" :src="store.cover_url" class="w-full h-full object-cover" />
        </div>
        <div class="p-5 relative flex-1 flex flex-col">
          <div class="absolute -top-10 left-5 bg-card p-1 rounded-lg shadow-sm border">
            <div v-if="store.logo_url" class="w-16 h-16 rounded-md overflow-hidden">
               <img :src="store.logo_url" class="w-full h-full object-cover" />
            </div>
            <div v-else class="w-16 h-16 bg-primary/10 flex items-center justify-center rounded-md text-primary font-bold text-xl">
               {{ store.name?.charAt(0) || 'S' }}
            </div>
          </div>
          
          <div class="mt-8 flex-1">
            <div class="flex justify-between items-start mb-2">
              <div>
                <h3 class="text-xl font-bold text-foreground line-clamp-1">{{ store.name }}</h3>
                <p v-if="store.name_en" class="text-xs text-muted-foreground line-clamp-1">{{ store.name_en }}</p>
              </div>
              <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 flex-shrink-0" v-if="store.is_active">
                เปิดรับออเดอร์
              </span>
              <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 flex-shrink-0" v-else>
                ปิดรับออเดอร์
              </span>
            </div>
            
            <div class="mt-4 space-y-3 text-sm">
              <div class="flex items-start gap-2">
                <span class="text-muted-foreground w-16 flex-shrink-0">ประเภท:</span>
                <span class="font-medium">{{ store.store_type || '-' }}</span>
              </div>
              <div class="flex items-start gap-2">
                <span class="text-muted-foreground w-16 flex-shrink-0">ลิงก์เมนู:</span>
                <a :href="`/m/${store.slug}`" target="_blank" class="font-medium text-primary hover:underline break-all">/m/{{ store.slug }}</a>
              </div>
              <div class="flex items-start gap-2">
                <span class="text-muted-foreground w-16 flex-shrink-0">ที่อยู่:</span>
                <span class="font-medium line-clamp-2">{{ store.address || '-' }}</span>
              </div>
              <div class="flex items-start gap-2 pt-3 mt-1 border-t border-border/50">
                <span class="text-muted-foreground w-16 flex-shrink-0 mt-0.5">แจ้งเตือน:</span>
                <span v-if="store.line_user_id" class="font-medium text-green-600 flex items-center gap-1 text-sm">
                  <span class="text-base leading-none">💬</span> เชื่อมต่อ LINE แล้ว
                </span>
                <span v-else class="font-medium text-red-500 flex flex-col gap-1 text-sm">
                  <div class="flex items-center gap-1"><span class="text-base leading-none">❌</span> ยังไม่เชื่อมต่อ</div>
                  <NuxtLink to="/merchant/store/settings" class="text-xs underline hover:text-red-700">คลิกเพื่อตั้งค่ารับออเดอร์</NuxtLink>
                </span>
              </div>
            </div>
          </div>
          
          <div class="mt-6 pt-4 border-t flex gap-2">
            <NuxtLink to="/merchant/store/settings" class="flex-1 text-center bg-muted hover:bg-muted/80 text-foreground py-2 rounded-md text-sm font-medium transition-colors">ตั้งค่าร้าน</NuxtLink>
            <NuxtLink to="/merchant/qr" class="flex-1 text-center bg-primary hover:bg-primary/90 text-primary-foreground py-2 rounded-md text-sm font-medium transition-colors">สร้าง QR Code</NuxtLink>
          </div>
        </div>
      </div>

      <!-- Upcoming Features (Coming Soon) -->
      <div class="bg-card overflow-hidden shadow-sm rounded-lg border mt-6 md:col-span-2 relative">
        <div class="absolute inset-0 bg-gradient-to-r from-primary/5 to-purple-500/5 pointer-events-none"></div>
        <div class="p-6">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-lg font-bold flex items-center gap-2">
              <span>🚀</span> ฟีเจอร์ใหม่ที่กำลังจะมา (Coming Soon)
            </h3>
            <span class="bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-bold tracking-wide uppercase">Roadmap</span>
          </div>
          
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div class="p-4 bg-background border rounded-xl shadow-sm hover:border-primary/30 transition-colors opacity-80">
              <div class="text-2xl mb-2">📦</div>
              <h4 class="font-bold mb-1">ระบบตัดสต็อก</h4>
              <p class="text-xs text-muted-foreground">จัดการวัตถุดิบและสต็อกสินค้าแบบเรียลไทม์ พร้อมแจ้งเตือนเมื่อของใกล้หมด</p>
            </div>
            
            <div class="p-4 bg-background border rounded-xl shadow-sm hover:border-primary/30 transition-colors opacity-80">
              <div class="text-2xl mb-2">💻</div>
              <h4 class="font-bold mb-1">POS & ระบบขายหน้าร้าน</h4>
              <p class="text-xs text-muted-foreground">บันทึกยอดขายหน้าร้าน และพิมพ์ใบเสร็จ ครบจบในหน้าเดียว</p>
            </div>
            
            <div class="p-4 bg-background border rounded-xl shadow-sm hover:border-primary/30 transition-colors opacity-80">
              <div class="text-2xl mb-2">🍳</div>
              <h4 class="font-bold mb-1">จอในครัว (KDS)</h4>
              <p class="text-xs text-muted-foreground">ลดความผิดพลาดด้วยระบบแสดงออเดอร์ในครัว จัดการคิวได้อย่างมีประสิทธิภาพ</p>
            </div>
          </div>
        </div>
      </div>

    </div>
  </div>
</div>
</template>
