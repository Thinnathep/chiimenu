<script setup lang="ts">
definePageMeta({
  layout: 'merchant',
  middleware: ['auth']
})

const client = useSupabaseClient()
const loading = ref(true)
const store = ref<any>(null)
const orders = ref<any[]>([])

onMounted(async () => {
  const { data: authData } = await client.auth.getUser()
  if (!authData?.user?.id) return
  
  // Get store
  const { data: storeData } = await client
    .from('stores')
    .select('*')
    .eq('owner_id', authData.user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    
  if (storeData?.[0]) {
    store.value = storeData[0]
    await fetchOrders()
  }
  loading.value = false
})

const fetchOrders = async () => {
  if (!store.value) return
  
  const { data, error } = await client
    .from('orders')
    .select('*')
    .eq('store_id', store.value.id)
    .order('created_at', { ascending: false })
    .limit(50) // limit to recent 50 for MVP
    
  if (!error && data) {
    orders.value = data
  } else if (error) {
    console.error("fetchOrders error:", error)
    alert("Error fetching orders: " + error.message)
  }
}



const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
}
</script>

<template>
  <div class="w-full pb-12">
    <div class="mb-8 flex justify-between items-end">
      <div>
        <h1 class="text-2xl font-bold tracking-tight text-foreground">ประวัติรายการสั่ง (Read-Only Order Log)</h1>
        <p class="text-muted-foreground mt-1">
          ประวัติสำเนาออเดอร์ที่ลูกค้ากดดูเมนูและโชว์ให้พนักงานดูหน้าร้าน (เพื่อเก็บสถิติและทบทวน)
          <br/>
          <strong class="text-indigo-600 font-medium">ระบบไม่มีการกดรับออเดอร์ใดๆ ในหน้านี้ (No Order Management)</strong>
        </p>
      </div>
      <button @click="fetchOrders" class="px-4 py-2 bg-muted hover:bg-muted/80 text-foreground rounded-lg text-sm font-medium transition-colors">
        🔄 รีเฟรช
      </button>
    </div>

    <div v-if="loading" class="p-8 text-center text-muted-foreground bg-card rounded-lg border">
      กำลังโหลดข้อมูลออเดอร์...
    </div>
    
    <div v-else-if="!store" class="p-8 text-center bg-card rounded-lg border">
      ไม่พบร้านค้า กรุณาสร้างร้านค้าก่อน
    </div>

    <div v-else class="space-y-6">
      
      <div v-if="orders.length === 0" class="p-12 text-center text-muted-foreground bg-card border rounded-lg border-dashed">
        <div class="text-4xl mb-4">🍽️</div>
        <p>ยังไม่มีออเดอร์เข้าในระบบ</p>
      </div>

      <!-- Order Cards -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div v-for="order in orders" :key="order.id" class="bg-card shadow-sm border rounded-2xl overflow-hidden flex flex-col border-primary/30">
          
          <!-- Header -->
          <div class="p-4 border-b flex justify-between items-center bg-primary/5">
            <div class="flex items-center gap-3">
              <span class="text-2xl font-black text-foreground">โต๊ะ {{ order.table_no }}</span>
              <span class="text-xs font-medium text-muted-foreground">{{ formatDate(order.created_at) }}</span>
            </div>
          </div>
          
          <!-- Items -->
          <div class="p-5 flex-1 bg-background">
            <ul class="space-y-4">
              <li v-for="(item, idx) in order.items" :key="idx" class="flex gap-3">
                <span class="font-bold text-lg text-primary">{{ Number(idx) + 1 }}.</span>
                <div>
                  <h4 class="font-bold text-foreground">{{ item.menuItem.name_th }} <span class="text-muted-foreground text-sm font-normal">({{ item.menuItem.name_en }})</span></h4>
                  
                  <div class="text-sm text-muted-foreground mt-1 space-y-0.5">
                    <p v-if="item.spiceLevel">🌶️ ความเผ็ด: ระดับ {{ item.spiceLevel }}</p>
                    <p v-for="(val, key) in item.selectedAddons" :key="key">➕ {{ val }}</p>
                  </div>
                </div>
              </li>
            </ul>
          </div>
          
          <!-- Footer Actions -->
          <div class="p-4 border-t bg-muted/20 flex justify-between items-center">
            <div class="text-xs text-muted-foreground flex items-center gap-1">
              <span>สถานะส่ง LINE:</span>
              <span v-if="order.line_notified" class="text-green-600 font-bold">✓ แจ้งเตือนสำเร็จ</span>
              <span v-else class="text-red-500 font-bold">✕ ไม่สำเร็จ</span>
            </div>
          </div>
          
        </div>
      </div>
      
    </div>
  </div>
</template>
