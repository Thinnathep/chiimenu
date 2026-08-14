<script setup lang="ts">
definePageMeta({
  layout: 'merchant',
  middleware: ['auth']
})

const client = useSupabaseClient()
const { store, fetchStore } = useCurrentStore()
const loading = ref(true)
const orders = ref<any[]>([])
let realtimeChannel: any = null

onMounted(async () => {
  try {
    if (!store.value) {
      await fetchStore()
    }
    
    if (store.value) {
      await fetchOrders()
      
      // Subscribe to realtime updates
      realtimeChannel = client.channel('custom-all-channel')
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'orders', filter: `store_id=eq.${store.value.id}` },
          (payload) => {
            // Add new order to the top of the list
            orders.value.unshift(payload.new)
          }
        )
        .subscribe()
    }
  } catch (err) {
    console.error('Fetch orders error:', err)
  } finally {
    loading.value = false
  }
})

onUnmounted(() => {
  if (realtimeChannel) {
    client.removeChannel(realtimeChannel)
  }
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
    <div class="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card border p-5 sm:p-6 rounded-3xl shadow-xs">
      <div class="flex items-center gap-3.5">
        <div class="w-11 h-11 rounded-2xl bg-primary/10 text-primary flex items-center justify-center text-xl font-bold shrink-0">
          📋
        </div>
        <div>
          <h1 class="text-lg sm:text-xl font-bold text-foreground">ประวัติรายการออเดอร์ (Order History)</h1>
          <p class="text-xs text-muted-foreground mt-0.5">
            บันทึกรายการคำสั่งซื้อจากลูกค้าที่สแกนสั่งจากโต๊ะอาหารแบบเรียลไทม์ พร้อมการแจ้งเตือนเข้า LINE ร้านค้า
          </p>
        </div>
      </div>
      <button @click="fetchOrders" class="px-4 py-2 bg-muted hover:bg-muted/80 text-foreground rounded-xl text-xs font-semibold transition-colors inline-flex items-center gap-1.5 self-start sm:self-auto border">
        <span>🔄 รีเฟรชรายการ</span>
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
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        <div v-for="order in orders" :key="order.id" class="bg-card shadow-sm border rounded-2xl overflow-hidden flex flex-col border-primary/30">
          
          <!-- Header -->
          <div class="p-4 border-b flex justify-between items-center bg-primary/5">
            <div class="flex items-center gap-2">
              <span class="text-base sm:text-lg font-black text-foreground">
                {{ order.table_no?.startsWith('กลับบ้าน') || order.table_no?.startsWith('หน้าร้าน') ? `🥡 ${order.table_no}` : `🪑 โต๊ะ ${order.table_no}` }}
              </span>
            </div>
            <span class="text-xs font-semibold text-muted-foreground bg-background px-2.5 py-1 rounded-lg border">{{ formatDate(order.created_at) }}</span>
          </div>
          
          <!-- Items -->
          <div class="p-4 flex-1 bg-background">
            <ul class="space-y-3">
              <li v-for="(item, idx) in order.items" :key="idx" class="flex gap-2.5 text-xs border-b border-border/40 last:border-0 pb-2.5 last:pb-0">
                <span class="font-black text-primary">{{ Number(idx) + 1 }}.</span>
                <div class="flex-1 min-w-0">
                  <div class="flex justify-between items-start">
                    <h4 class="font-bold text-foreground">
                      <span v-if="(item.quantity || 1) > 1" class="text-primary font-black mr-1">{{ item.quantity }}x</span>
                      {{ item.menuItem?.name_th || item.name_th }}
                      <span class="text-muted-foreground text-[11px] font-normal">({{ item.menuItem?.name_en || item.name_en }})</span>
                    </h4>
                    <span class="font-bold text-foreground shrink-0 ml-2">
                      ฿{{ ((item.unitPrice || item.price || item.menuItem?.price || 0) * (item.quantity || 1)).toLocaleString('th-TH') }}
                    </span>
                  </div>
                  
                  <div class="text-[11px] text-muted-foreground mt-0.5 space-y-0.5">
                    <p v-if="item.spiceLevel">🌶️ ความเผ็ด: ระดับ {{ item.spiceLevel }}</p>
                    <p v-for="(addon, aIdx) in (item.addonNames || Object.values(item.selectedAddons || {}))" :key="aIdx">
                      ➕ {{ typeof addon === 'object' ? addon.name : addon }}
                    </p>
                    <p v-if="item.note" class="italic text-amber-700 dark:text-amber-400">
                      💬 โน้ต: {{ item.note }}
                    </p>
                  </div>
                </div>
              </li>
            </ul>
          </div>
          
          <!-- Footer Actions -->
          <div class="p-3.5 border-t bg-muted/20 flex justify-between items-center text-xs">
            <div class="text-[11px] text-muted-foreground flex items-center gap-1">
              <span>สถานะ LINE:</span>
              <span v-if="order.line_notified" class="text-emerald-600 font-bold">✓ แจ้งเตือนแล้ว</span>
              <span v-else class="text-muted-foreground font-medium">-</span>
            </div>
            
            <div class="font-black text-primary text-sm">
              รวม ฿{{ (order.items || []).reduce((sum: number, it: any) => sum + ((it.unitPrice || it.price || it.menuItem?.price || 0) * (it.quantity || 1)), 0).toLocaleString('th-TH') }}
            </div>
          </div>
          
        </div>
      </div>
      
    </div>
  </div>
</template>
