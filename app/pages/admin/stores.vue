<script setup>
import { ShieldCheck, LogOut, Globe, CheckCircle2, AlertCircle, Clock, Search, Info } from 'lucide-vue-next'

definePageMeta({
  middleware: ['auth', 'admin']
})

const client = useSupabaseClient()
const user = useSupabaseUser()
const { t, locale, setLocale } = useI18n()

const stores = ref([])
const logs = ref([])
const loading = ref(true)
const processingId = ref(null)
const selectedActions = ref({})
const searchQuery = ref('')
const showPaymentModal = ref(false)
const showDeductModal = ref(false)
const activeStore = ref(null)
const paymentForm = ref({ amount: 0, note: '' })
const deductForm = ref({ days: 1, note: '' })

const fetchStores = async () => {
  loading.value = true
  const { data } = await client
    .from('stores')
    .select('*')
    .order('trial_ends_at', { ascending: true })
  
  if (data) {
    stores.value = data
    data.forEach(s => {
      if (!selectedActions.value[s.id]) {
        selectedActions.value[s.id] = 'paid_30'
      }
    })
  }
  loading.value = false
}

const fetchLogs = async () => {
  const { data } = await client
    .from('admin_action_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(15)
    
  if (data) logs.value = data
}

onMounted(() => {
  fetchStores()
  fetchLogs()
})

// Filtered stores for search
const filteredStores = computed(() => {
  if (!searchQuery.value) return stores.value
  const q = searchQuery.value.toLowerCase()
  return stores.value.filter(s => 
    s.name?.toLowerCase().includes(q) || 
    s.slug?.toLowerCase().includes(q)
  )
})

// Helper to get fallback trial date (7 days from creation)
const getFallbackTrialDate = (createdAt) => {
  const d = new Date(createdAt)
  d.setDate(d.getDate() + 7)
  return d.toISOString()
}

// Get the actual end date for a store
const getActiveEndDate = (store) => {
  return store.trial_ends_at || getFallbackTrialDate(store.created_at)
}

// Helper: Calculate days remaining
const getDaysRemaining = (store) => {
  const end = new Date(getActiveEndDate(store))
  const now = new Date()
  const diffTime = end.getTime() - now.getTime()
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
}

const isExpired = (store) => {
  return getDaysRemaining(store) < 0
}

const getStorePlanStatus = (store) => {
  if (store.plan_status === 'active') {
    return 'active'
  }
  return 'trial'
}

const formatDate = (dateString) => {
  if (!dateString) return 'N/A'
  return new Date(dateString).toLocaleDateString(locale.value === 'th' ? 'th-TH' : 'en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  })
}

const formatActionName = (action) => {
  const map = {
    'trial_7': t('admin_act_7d'),
    'trial_14': t('admin_act_14d'),
    'paid_30': t('admin_act_30d'),
    'paid_365': t('admin_act_365d'),
    'revoke': t('admin_act_revoke'),
    'mark_as_paid': t('admin_act_legacy')
  }
  return map[action] || action
}

const packagePrices = {
  trial_7: { name: '+7 วัน (ทดลอง)', days: 7, price: null },
  trial_14: { name: '+14 วัน (ทดลอง)', days: 14, price: null },
  paid_30: { name: 'แพ็กเกจ 1 เดือน', days: 30, price: 259 },
  paid_365: { name: 'แพ็กเกจ 1 ปี', days: 365, price: 1990 },
  deduct_custom: { name: 'ลดวัน (ระบุจำนวน)', days: null, price: null },
  revoke: { name: 'ตัดการเข้าถึง', days: 0, price: null }
}

const applyAction = async (store) => {
  const action = selectedActions.value[store.id]
  if (!action) return
  
  const pkgInfo = packagePrices[action]
  activeStore.value = store
  
  if (action === 'deduct_custom') {
    deductForm.value.days = 1
    deductForm.value.note = ''
    showDeductModal.value = true
  } else if (pkgInfo && pkgInfo.price !== null) {
    // Is a paid package, show modal
    paymentForm.value.amount = pkgInfo.price
    paymentForm.value.note = ''
    showPaymentModal.value = true
  } else {
    // Is a free/revoke action, use simple confirm
    const actionName = formatActionName(action)
    const confirmMsg = t('admin_confirm_action')
      .replace('{action}', actionName)
      .replace('{store}', store.name)

    if (!confirm(confirmMsg)) return
    
    await executeAction(store, action, null, null, null, null)
  }
}

const submitPayment = async () => {
  const store = activeStore.value
  const action = selectedActions.value[store.id]
  const pkgInfo = packagePrices[action]
  
  await executeAction(
    store, 
    action, 
    paymentForm.value.amount, 
    pkgInfo.name, 
    pkgInfo.days, 
    paymentForm.value.note
  )
  showPaymentModal.value = false
}

const submitDeduct = async () => {
  if (deductForm.value.days <= 0) {
    alert('กรุณาระบุจำนวนวันที่ต้องการลดให้ถูกต้อง');
    return;
  }
  const store = activeStore.value
  await executeAction(
    store, 
    'deduct_custom', 
    null, 
    'ลดวัน (ระบุจำนวน)', 
    -Math.abs(deductForm.value.days), 
    deductForm.value.note
  )
  showDeductModal.value = false
}

const executeAction = async (store, action, amount, pkgName, pkgDays, note) => {
  processingId.value = store.id
  try {
    const now = new Date()
    const currentEnd = new Date(store.trial_ends_at || now)
    
    // Stacking logic: GREATEST(trial_ends_at, now)
    const baseDate = currentEnd > now ? currentEnd : now
    
    let newEnd = new Date(baseDate)
    let newPlanStatus = store.plan_status
    let logAction = action
    
    if (action === 'trial_7') {
      newEnd.setDate(newEnd.getDate() + 7)
    } else if (action === 'trial_14') {
      newEnd.setDate(newEnd.getDate() + 14)
    } else if (action === 'paid_30') {
      newEnd.setDate(newEnd.getDate() + 30)
      newPlanStatus = 'active'
    } else if (action === 'paid_365') {
      newEnd.setDate(newEnd.getDate() + 365)
      newPlanStatus = 'active'
    } else if (action === 'revoke') {
      newEnd = new Date(now)
      newEnd.setDate(now.getDate() - 1)
    } else if (action === 'deduct_custom' && pkgDays) {
      if (!note || note.trim() === '') {
        alert('กรุณาระบุหมายเหตุ (Note) ทุกครั้งที่มีการลดวันใช้งาน')
        processingId.value = null
        return
      }
      newEnd.setDate(newEnd.getDate() + pkgDays)
    }
    
    // Update store and log atomically using RPC
    const { error: updateError } = await client.rpc('admin_update_store_plan', {
      p_store_id: store.id,
      p_plan_status: newPlanStatus,
      p_trial_ends_at: newEnd.toISOString(),
      p_action: logAction,
      p_details: {
        previous_end: store.trial_ends_at,
        new_end: newEnd.toISOString(),
        previous_status: store.plan_status,
        new_status: newPlanStatus
      },
      p_amount: amount,
      p_package_name: pkgName,
      p_package_days: pkgDays,
      p_note: note
    })
      
    if (updateError) throw updateError

    alert(t('admin_success'))
    fetchStores()
    fetchLogs()
  } catch (err) {
    console.error(err)
    alert(t('admin_error').replace('{error}', err.message))
  } finally {
    processingId.value = null
  }
}
</script>

<template>
  <div class="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans selection:bg-indigo-100 selection:text-indigo-900">
    <!-- Premium Header -->
    <header class="bg-white/80 backdrop-blur-xl border-b border-slate-200/80 sticky top-0 z-30 transition-all duration-300">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between items-center h-16">
          <div class="flex items-center space-x-3 group">
            <div class="bg-indigo-50 p-2 rounded-xl group-hover:bg-indigo-100 transition-colors">
              <ShieldCheck class="w-6 h-6 text-indigo-600" />
            </div>
            <h1 class="text-xl font-bold tracking-tight text-slate-900">{{ $t('admin_title') }}</h1>
          </div>
          
          <div class="flex items-center space-x-4">
            <!-- Language Switcher -->
            <div class="flex items-center space-x-2 bg-slate-50 hover:bg-slate-100 transition-colors rounded-full px-3 py-1.5 border border-slate-200">
              <Globe class="w-4 h-4 text-slate-500" />
              <select v-model="locale" @change="setLocale($event.target.value)" class="bg-transparent text-sm font-medium text-slate-700 focus:outline-none focus:ring-0 border-none p-0 cursor-pointer">
                <option value="th">ไทย</option>
                <option value="en">English</option>
                <option value="zh">中文</option>
              </select>
            </div>
            
            <div class="h-6 w-px bg-slate-200 mx-2"></div>
            
            <NuxtLink to="/merchant/dashboard" class="flex items-center space-x-2 text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors px-3 py-2 rounded-lg hover:bg-slate-50">
              <LogOut class="w-4 h-4" />
              <span class="hidden sm:inline">{{ $t('admin_back') }}</span>
            </NuxtLink>
          </div>
        </div>
      </div>
    </header>

    <!-- Main Content -->
    <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      <!-- Stores Section -->
      <section class="space-y-4">
        <div class="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <h2 class="text-lg font-semibold text-slate-800 flex items-center gap-2">
            {{ $t('admin_title') }}
            <span class="bg-indigo-100 text-indigo-700 text-xs py-0.5 px-2 rounded-full font-bold">{{ stores.length }}</span>
          </h2>
          
          <!-- Search Box -->
          <div class="relative w-full sm:w-72">
            <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search class="h-4 w-4 text-slate-400" />
            </div>
            <input 
              type="text" 
              v-model="searchQuery" 
              placeholder="Search stores..." 
              class="block w-full pl-10 pr-3 py-2 border border-slate-200 rounded-xl leading-5 bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition-shadow"
            />
          </div>
        </div>

        <div class="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
          <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-slate-100">
              <thead class="bg-slate-50/50">
                <tr>
                  <th scope="col" class="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">{{ $t('admin_col_store') }}</th>
                  <th scope="col" class="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">{{ $t('admin_col_status') }}</th>
                  <th scope="col" class="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">{{ $t('admin_col_trial') }}</th>
                  <th scope="col" class="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider hidden md:table-cell">{{ $t('admin_col_created') }}</th>
                  <th scope="col" class="px-6 py-4 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">{{ $t('admin_col_action') }}</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100">
                <tr v-if="loading" class="bg-white">
                  <td colspan="5" class="px-6 py-12 text-center">
                    <div class="inline-flex items-center space-x-2 text-slate-500">
                      <div class="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                      <span>{{ $t('admin_loading') }}</span>
                    </div>
                  </td>
                </tr>
                <tr v-else-if="filteredStores.length === 0" class="bg-white">
                  <td colspan="5" class="px-6 py-12 text-center text-slate-500">
                    <Info class="w-6 h-6 mx-auto mb-2 text-slate-400" />
                    {{ $t('admin_no_stores') }}
                  </td>
                </tr>
                <tr v-for="store in filteredStores" :key="store.id" class="group hover:bg-slate-50/50 transition-colors" :class="{'bg-rose-50/30': isExpired(store)}">
                  
                  <!-- Store Info -->
                  <td class="px-6 py-4 whitespace-nowrap">
                    <div class="flex items-center">
                      <div class="flex-shrink-0 h-10 w-10 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-lg">
                        {{ store.name.charAt(0) }}
                      </div>
                      <div class="ml-4">
                        <div class="text-sm font-semibold text-slate-900">{{ store.name }}</div>
                        <div class="text-sm text-slate-500">{{ store.slug }}</div>
                      </div>
                    </div>
                  </td>

                  <!-- Status -->
                  <td class="px-6 py-4 whitespace-nowrap">
                    <div class="flex items-center space-x-2">
                      <span class="px-2.5 py-1 inline-flex text-xs font-medium rounded-full" 
                        :class="getStorePlanStatus(store) === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'">
                        {{ getStorePlanStatus(store) === 'active' ? 'ใช้งานจริง' : 'ทดลองใช้' }}
                      </span>
                      <span v-if="!store.is_active" class="px-2.5 py-1 inline-flex text-xs font-medium rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                        {{ $t('admin_status_inactive') }}
                      </span>
                    </div>
                  </td>

                  <!-- Expiration -->
                  <td class="px-6 py-4 whitespace-nowrap">
                    <div class="flex items-center space-x-2">
                      <!-- Status Indicator Dot -->
                      <div class="w-2 h-2 rounded-full" 
                           :class="{
                             'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]': getDaysRemaining(store) > 7,
                             'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]': getDaysRemaining(store) >= 0 && getDaysRemaining(store) <= 7,
                             'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]': getDaysRemaining(store) < 0
                           }">
                      </div>
                      <div class="text-sm" :class="isExpired(store) ? 'text-rose-600 font-semibold' : 'text-slate-700'">
                        {{ formatDate(getActiveEndDate(store)) }}
                        <span v-if="isExpired(store)" class="ml-1 text-xs text-rose-500 font-bold">(หมดอายุแล้ว)</span>
                        <span v-else class="ml-1 text-xs font-medium" :class="getStorePlanStatus(store) === 'active' ? 'text-emerald-600' : 'text-amber-600'">
                          (เหลือ {{ getDaysRemaining(store) }} วัน)
                        </span>
                      </div>
                    </div>
                  </td>

                  <!-- Created At -->
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-500 hidden md:table-cell">
                    {{ formatDate(store.created_at) }}
                  </td>

                  <!-- Action -->
                  <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div class="flex justify-end items-center gap-2">
                      <select v-model="selectedActions[store.id]" class="text-sm border-slate-200 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 px-3 py-1.5 bg-white text-slate-700 shadow-sm transition-shadow hover:shadow-md cursor-pointer outline-none">
                        <option value="trial_7">{{ $t('admin_act_7d') }}</option>
                        <option value="trial_14">{{ $t('admin_act_14d') }}</option>
                        <option value="paid_30">{{ $t('admin_act_30d') }}</option>
                        <option value="paid_365">{{ $t('admin_act_365d') }}</option>
                        <option value="deduct_custom">ลดวัน (ระบุจำนวน)</option>
                        <option value="revoke">{{ $t('admin_act_revoke') }}</option>
                      </select>
                      <button 
                        @click="applyAction(store)" 
                        :disabled="processingId === store.id || !selectedActions[store.id]"
                        class="bg-slate-900 text-white px-4 py-1.5 rounded-lg shadow-sm hover:bg-indigo-600 hover:shadow-indigo-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center min-w-[70px]"
                      >
                        <span v-if="processingId === store.id" class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                        <span v-else>{{ $t('admin_btn_apply') }}</span>
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>
      
      <!-- Recent Actions Log -->
      <section class="space-y-4">
        <h2 class="text-lg font-semibold text-slate-800 flex items-center gap-2">
          <Clock class="w-5 h-5 text-slate-400" />
          {{ $t('admin_recent_actions') }}
        </h2>
        
        <div class="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
          <div v-if="logs.length === 0" class="p-8 text-center text-slate-500">
            <Info class="w-6 h-6 mx-auto mb-2 text-slate-400" />
            {{ $t('admin_no_actions') }}
          </div>
          <ul v-else class="divide-y divide-slate-100">
            <li v-for="log in logs" :key="log.id" class="p-4 sm:px-6 hover:bg-slate-50/50 transition-colors flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div class="flex items-center gap-3">
                <div class="p-1.5 rounded-full" :class="log.action === 'revoke' ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-600'">
                  <AlertCircle v-if="log.action === 'revoke'" class="w-4 h-4" />
                  <CheckCircle2 v-else class="w-4 h-4" />
                </div>
                <div>
                  <span class="font-semibold text-slate-900">{{ formatActionName(log.action) }}</span> 
                  <span class="text-slate-500 mx-2">&rarr;</span> 
                  <span class="text-slate-700">Store ID: <code class="bg-slate-100 px-1.5 py-0.5 rounded text-xs text-slate-600">{{ log.target_store_id }}</code></span>
                </div>
              </div>
              <div class="text-sm text-slate-400 flex items-center gap-1.5 sm:ml-auto">
                <Clock class="w-3.5 h-3.5" />
                {{ formatDate(log.created_at) }}
              </div>
            </li>
          </ul>
        </div>
      </section>

    </main>

    <!-- Payment Modal -->
    <div v-if="showPaymentModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div class="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
        <div class="p-6 border-b border-slate-100">
          <h3 class="text-xl font-bold text-slate-900">{{ $t('admin_payment_modal_title') }}</h3>
          <p class="text-sm text-slate-500 mt-1">Store: <span class="font-semibold text-slate-700">{{ activeStore?.name }}</span></p>
        </div>
        
        <div class="p-6 space-y-4">
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1">{{ $t('billing_col_package') }}</label>
            <div class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-600 font-medium">
              {{ packagePrices[selectedActions[activeStore?.id]]?.name }}
            </div>
          </div>
          
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1">{{ $t('admin_payment_amount') }}</label>
            <div class="relative">
              <span class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-medium">฿</span>
              <input type="number" v-model="paymentForm.amount" class="w-full border border-slate-200 rounded-xl pl-8 pr-4 py-2.5 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow outline-none text-slate-900" />
            </div>
          </div>
          
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1">{{ $t('admin_payment_note') }}</label>
            <textarea v-model="paymentForm.note" rows="2" class="w-full border border-slate-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow outline-none text-slate-900 placeholder:text-slate-400" placeholder="e.g., KBank, Transfer at 14:30"></textarea>
          </div>
        </div>
        
        <div class="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
          <button @click="showPaymentModal = false" class="px-5 py-2.5 text-slate-600 font-medium hover:bg-slate-200 rounded-xl transition-colors">
            {{ $t('admin_payment_cancel') }}
          </button>
          <button @click="submitPayment" :disabled="processingId === activeStore?.id" class="px-5 py-2.5 bg-indigo-600 text-white font-medium hover:bg-indigo-700 rounded-xl shadow-sm transition-all disabled:opacity-50 flex items-center gap-2">
            <span v-if="processingId === activeStore?.id" class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
            {{ $t('admin_payment_confirm') }}
          </button>
        </div>
      </div>
    </div>

    <!-- Deduct Modal -->
    <div v-if="showDeductModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div class="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
        <div class="p-6 border-b border-slate-100">
          <h3 class="text-lg font-bold text-slate-900">ระบุจำนวนวันที่ต้องการลด</h3>
          <p class="text-sm text-slate-500 mt-1">ร้าน: {{ activeStore?.name }}</p>
        </div>
        
        <div class="p-6 space-y-4">
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1">จำนวนวัน <span class="text-rose-500">*</span></label>
            <div class="relative">
              <input 
                v-model.number="deductForm.days" 
                type="number" 
                min="1"
                class="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                placeholder="เช่น 5 หรือ 10"
              >
            </div>
            <p class="text-xs text-slate-500 mt-2">* ระบบจะนำจำนวนวันนี้ไปลบออกจากวันหมดอายุเดิมของร้าน</p>
          </div>
          
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1">หมายเหตุ (ถ้ามี)</label>
            <textarea 
              v-model="deductForm.note" 
              rows="2"
              class="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
              placeholder="ระบุเหตุผลการลดวัน..."
            ></textarea>
          </div>
        </div>
        
        <div class="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
          <button @click="showDeductModal = false" class="px-5 py-2.5 text-slate-600 font-medium hover:bg-slate-200 rounded-xl transition-colors">
            ยกเลิก
          </button>
          <button 
            @click="submitDeduct" 
            :disabled="!deductForm.days || deductForm.days <= 0"
            class="px-5 py-2.5 bg-rose-600 text-white font-medium hover:bg-rose-700 rounded-xl shadow-sm transition-all flex items-center gap-2 disabled:opacity-50"
          >
            ยืนยันการลดวัน
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
