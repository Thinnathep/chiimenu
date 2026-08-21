<script setup lang="ts">
import { 
  Store, 
  Sparkles, 
  Globe, 
  MessageCircle, 
  CheckCircle2, 
  ExternalLink, 
  MapPin, 
  FileText, 
  Image as ImageIcon, 
  AlertCircle,
  Copy,
  Check,
  Power,
  Layers,
  Phone,
  Type,
  RotateCcw,
  ShieldCheck
} from 'lucide-vue-next'

definePageMeta({
  layout: 'merchant',
  middleware: ['auth']
})

const { levels: fontLevels, currentLevel: currentFontLevel, setLevel: setFontLevel, reset: resetFontSize } = useFontSize()

const user = useSupabaseUser()
const client = useSupabaseClient()
const { store, fetchStore, setStore } = useCurrentStore()

const loading = ref(true)
const saving = ref(false)
const errorMsg = ref('')
const successMsg = ref('')
const isTranslating = ref(false)
const slugStatus = ref<'idle' | 'checking' | 'available' | 'taken'>('idle')
let slugCheckTimeout: any = null

const form = ref({
  id: '',
  name: '',
  name_en: '',
  name_zh: '',
  slug: '',
  description: '',
  description_en: '',
  description_zh: '',
  store_type: 'restaurant',
  address: '',
  address_en: '',
  address_zh: '',
  phone: '',
  default_language: 'th',
  line_user_id: '',
  is_active: true,
  logo_url: '',
  cover_url: '',
  updated_at: ''
})

const storeTypes = [
  { value: 'restaurant', label: '🍽️ ร้านอาหารทั่วไป (Restaurant)' },
  { value: 'cafe', label: '☕ คาเฟ่ & เบเกอรี่ (Cafe & Bakery)' },
  { value: 'street_food', label: '🍢 สตรีทฟู้ด & อาหารจานด่วน (Street Food)' },
  { value: 'drink', label: '🧋 เครื่องดื่ม & ชานม (Drink & Dessert)' }
]

onMounted(async () => {
  try {
    if (!store.value) {
      await fetchStore()
    }
    
    if (store.value) {
      form.value = { 
        ...store.value,
        name_en: store.value.name_en || '',
        name_zh: store.value.name_zh || '',
        description_en: store.value.description_en || '',
        description_zh: store.value.description_zh || '',
        address_en: store.value.address_en || '',
        address_zh: store.value.address_zh || '',
        line_user_id: store.value.line_user_id || ''
      }
    }
  } catch (e: any) {
    if (e.code !== 'PGRST116') {
      errorMsg.value = 'ไม่สามารถโหลดข้อมูลร้านค้าได้'
    }
  } finally {
    loading.value = false
  }
})

// Auto format & sanitize slug
const sanitizeSlug = (val: string) => {
  return (val || '')
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
}

const onSlugInput = (e: Event) => {
  const target = e.target as HTMLInputElement
  form.value.slug = sanitizeSlug(target.value)
}

const copyStoreLink = async () => {
  if (!form.value.slug) return
  const url = `${window.location.origin}/m/${form.value.slug}`
  await navigator.clipboard.writeText(url)
  useToast().success(`คัดลอกลิงก์ร้านเรียบร้อยแล้ว: ${url}`)
}

const copyLineLinkCommand = async () => {
  if (!form.value.slug) return
  const cmd = `link ${form.value.slug}`
  await navigator.clipboard.writeText(cmd)
  useToast().success(`คัดลอกคำสั่ง "${cmd}" แล้ว! นำไปวางในแชท @946vhuev ได้ทันที`)
}

// Real-time slug validation
watch(() => form.value.slug, (newSlug) => {
  if (!newSlug || !form.value.id) {
    slugStatus.value = 'idle'
    return
  }
  slugStatus.value = 'checking'
  clearTimeout(slugCheckTimeout)
  
  slugCheckTimeout = setTimeout(async () => {
    const { count } = await (client as any)
      .from('stores')
      .select('*', { count: 'exact', head: true })
      .eq('slug', newSlug)
      .neq('id', form.value.id)
      
    if (count && count > 0) {
      slugStatus.value = 'taken'
    } else {
      slugStatus.value = 'available'
    }
  }, 400)
})

// Instant Toggle Store Active / Closed Status
const isTogglingStatus = ref(false)
const toggleStoreStatus = async () => {
  const newStatus = !form.value.is_active
  form.value.is_active = newStatus
  
  if (form.value.id) {
    isTogglingStatus.value = true
    try {
      const { error } = await (client as any)
        .from('stores')
        .update({ 
          is_active: newStatus, 
          updated_at: new Date().toISOString() 
        })
        .eq('id', form.value.id)
        
      if (error) throw error
      
      if (store.value) {
        setStore({ ...store.value, is_active: newStatus })
      }
      useToast().success(newStatus ? '🟢 เปิดให้บริการร้านค้าเรียบร้อยแล้ว (Active)' : '🔴 ปิดร้านชั่วคราวเรียบร้อยแล้ว (Offline)')
    } catch (err: any) {
      console.error('Toggle store status error:', err)
      form.value.is_active = !newStatus // Revert on failure
      useToast().error('ไม่สามารถบันทึกสถานะร้านได้ กรุณาลองใหม่อีกครั้ง')
    } finally {
      isTogglingStatus.value = false
    }
  }
}

// AI Translation for All Store Info (Name, Description, Address)
const translateStoreInfo = async () => {
  const swal = useAlert()
  if (!form.value.name.trim() && !form.value.description.trim() && !form.value.address.trim()) {
    swal.fire('แจ้งเตือน', 'กรุณากรอกชื่อร้าน คำอธิบาย หรือที่อยู่ภาษาไทยก่อนทำการแปลค่ะ', 'warning')
    return
  }
  
  isTranslating.value = true
  try {
    const data = await $fetch<any>('/api/translate', {
      method: 'POST',
      body: { 
        name_th: form.value.name, 
        description_th: form.value.description,
        address_th: form.value.address,
        type: 'store'
      }
    })
    
    if (data) {
      if (data.name_en && !form.value.name_en) form.value.name_en = data.name_en
      else if (data.name_en) form.value.name_en = data.name_en

      if (data.name_zh && !form.value.name_zh) form.value.name_zh = data.name_zh
      else if (data.name_zh) form.value.name_zh = data.name_zh

      if (data.description_en) form.value.description_en = data.description_en
      if (data.description_zh) form.value.description_zh = data.description_zh
      if (data.address_en) form.value.address_en = data.address_en
      if (data.address_zh) form.value.address_zh = data.address_zh
      
      useToast().success('✨ แปลข้อมูลร้านค้าครบ 3 ภาษา (ไทย, อังกฤษ, จีน) สำเร็จแล้ว!')
    }
  } catch (error: any) {
    console.error('Store AI Translate error:', error)
    swal.fire('การแปลล้มเหลว', error.data?.message || error.message || 'ไม่สามารถติดต่อ AI Translation ได้ในขณะนี้', 'error')
  } finally {
    isTranslating.value = false
  }
}

const showManualLineId = ref(false)
const isSavingLine = ref(false)

// Save specific LINE User ID to DB
const saveLineId = async () => {
  const targetId = form.value.line_user_id?.trim()
  if (!targetId) {
    useToast().error('กรุณากรอกรหัส LINE User ID ของคุณ (ขึ้นต้นด้วยตัว U)')
    return
  }
  if (!targetId.startsWith('U')) {
    useToast().error('รูปแบบ LINE User ID ไม่ถูกต้อง (ต้องขึ้นต้นด้วยตัว U เช่น U3cfe...)')
    return
  }
  
  isSavingLine.value = true
  if (form.value.id) {
    try {
      await (client as any)
        .from('stores')
        .update({ line_user_id: targetId, updated_at: new Date().toISOString() })
        .eq('id', form.value.id)
        
      if (store.value) {
        setStore({ ...store.value, line_user_id: targetId })
      }
      useToast().success('เชื่อมต่อ LINE สำเร็จ! ระบบจะส่งแจ้งเตือนออเดอร์เข้า LINE ของร้านคุณทันที')
    } catch (err) {
      console.error('Save line id error:', err)
      useToast().error('เกิดข้อผิดพลาดในการบันทึก กรุณาลองใหม่อีกครั้ง')
    } finally {
      isSavingLine.value = false
    }
  }
}

// Open LINE OA Chat
const openLineBotChat = () => {
  window.open('https://line.me/R/ti/p/@946vhuev', '_blank')
}

// Disconnect LINE (Auto-save null to Supabase)
const disconnectLine = async () => {
  if (confirm('คุณต้องการปิดการแจ้งเตือนออเดอร์ผ่าน LINE ใช่หรือไม่?')) {
    form.value.line_user_id = ''
    
    if (form.value.id) {
      try {
        await (client as any)
          .from('stores')
          .update({ line_user_id: null, updated_at: new Date().toISOString() })
          .eq('id', form.value.id)
          
        if (store.value) {
          setStore({ ...store.value, line_user_id: null })
        }
        useToast().success('ปิดการเชื่อมต่อ LINE เรียบร้อยแล้ว')
      } catch (err) {
        console.error('Disconnect LINE error:', err)
      }
    }
  }
}

// Save Changes
const submitForm = async () => {
  saving.value = true
  errorMsg.value = ''
  successMsg.value = ''
  
  try {
    // Duplicate name warning
    const { count: nameCount } = await (client as any)
      .from('stores')
      .select('*', { count: 'exact', head: true })
      .eq('name', form.value.name.trim())
      .neq('id', form.value.id)
      
    if (nameCount && nameCount > 0) {
      const swal = useAlert()
      const result = await swal.fire({
        title: 'พบชื่อร้านซ้ำในระบบ',
        text: `มีชื่อร้าน "${form.value.name}" อยู่แล้ว คุณต้องการใช้ชื่อนี้ใช่หรือไม่?`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'ยืนยันใช้ชื่อนี้',
        cancelButtonText: 'แก้ไขชื่อ'
      })
      if (!result.isConfirmed) {
        saving.value = false
        return
      }
    }

    const { error } = await (client as any)
      .from('stores')
      .update({
        name: form.value.name,
        name_en: form.value.name_en || null,
        name_zh: form.value.name_zh || null,
        slug: form.value.slug,
        description: form.value.description || null,
        description_en: form.value.description_en || null,
        description_zh: form.value.description_zh || null,
        store_type: form.value.store_type,
        address: form.value.address || null,
        address_en: form.value.address_en || null,
        address_zh: form.value.address_zh || null,
        phone: form.value.phone || null,
        default_language: form.value.default_language,
        line_user_id: form.value.line_user_id ? form.value.line_user_id.trim() : null,
        is_active: form.value.is_active,
        logo_url: form.value.logo_url || null,
        cover_url: form.value.cover_url || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', form.value.id)
      
    if (error) throw error
    
    setStore({ ...store.value, ...form.value })
    useToast().success('บันทึกข้อมูลร้านค้าและการตั้งค่าเรียบร้อยแล้ว!')
    successMsg.value = '✅ บันทึกข้อมูลร้านค้าและการตั้งค่าเรียบร้อยแล้ว!'
    setTimeout(() => { successMsg.value = '' }, 4000)
  } catch (e: any) {
    if (e.code === '23505') {
      errorMsg.value = '❌ ลิงก์ร้านค้านี้ถูกใช้งานแล้ว กรุณาเปลี่ยนใหม่อีกครั้ง'
      useToast().error('ลิงก์ร้านค้านี้ถูกใช้งานแล้ว กรุณาเปลี่ยนใหม่อีกครั้ง')
    } else {
      errorMsg.value = e.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล'
      useToast().error(errorMsg.value)
    }
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="w-full max-w-5xl mx-auto pb-20 space-y-8">
    
    <!-- Page Header & Action Bar -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-6">
      <div>
        <div class="flex items-center gap-2.5">
          <div class="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-black">
            <Store class="w-5 h-5" />
          </div>
          <h1 class="text-2xl sm:text-3xl font-black tracking-tight text-foreground">ตั้งค่าและปรับแต่งร้านค้า</h1>
        </div>
        <p class="text-xs sm:text-sm text-muted-foreground mt-1">
          จัดการข้อมูลพื้นฐาน ภาพลักษณ์ร้าน ลิงก์เมนู และการเชื่อมต่อ LINE แจ้งเตือนออเดอร์
        </p>
      </div>

      <!-- Preview Live Store Link -->
      <a 
        v-if="form.slug"
        :href="`/m/${form.slug}`" 
        target="_blank" 
        class="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-muted hover:bg-muted/80 text-foreground font-semibold text-xs transition-all border shrink-0"
      >
        <span>เปิดดูหน้าร้านจริง</span>
        <ExternalLink class="w-3.5 h-3.5 opacity-60" />
      </a>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="p-16 text-center bg-card rounded-3xl border shadow-xs">
      <div class="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
      <p class="text-xs text-muted-foreground">กำลังโหลดข้อมูลร้านค้า...</p>
    </div>

    <!-- No Store Created -->
    <div v-else-if="!form.id" class="p-12 text-center bg-card rounded-3xl border shadow-xs">
      <div class="text-4xl mb-3">🏪</div>
      <h2 class="text-lg font-bold text-foreground mb-1">ยังไม่พบข้อมูลร้านค้า</h2>
      <p class="text-xs text-muted-foreground mb-6">คุณยังไม่ได้สร้างร้านค้าในระบบ</p>
      <NuxtLink to="/merchant/store/create" class="px-6 py-2.5 bg-primary text-primary-foreground font-bold text-xs rounded-xl shadow-xs">
        สร้างร้านค้าทันที
      </NuxtLink>
    </div>

    <!-- Main Settings Form -->
    <form v-else @submit.prevent="submitForm" class="space-y-8">
      
      <!-- 1. Store Open/Closed Status Card -->
      <div 
        class="rounded-3xl p-6 border shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all"
        :class="form.is_active ? 'bg-emerald-50/40 border-emerald-200' : 'bg-rose-50/40 border-rose-200'"
      >
        <div class="flex items-center gap-3.5">
          <div 
            class="w-12 h-12 rounded-2xl flex items-center justify-center text-xl shrink-0 shadow-xs"
            :class="form.is_active ? 'bg-emerald-500 text-white shadow-emerald-200' : 'bg-rose-500 text-white shadow-rose-200'"
          >
            <Power class="w-6 h-6" />
          </div>
          <div>
            <div class="flex items-center gap-2">
              <h3 class="text-base font-black text-foreground">
                สถานะร้าน: {{ form.is_active ? 'เปิดให้บริการ (Open)' : 'ปิดร้านชั่วคราว (Closed)' }}
              </h3>
              <span 
                class="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider"
                :class="form.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'"
              >
                {{ form.is_active ? 'Active' : 'Offline' }}
              </span>
            </div>
            <p class="text-xs text-muted-foreground mt-0.5">
              {{ form.is_active ? 'ลูกค้าสามารถสแกน QR Code และกดสั่งอาหารได้ตามปกติ' : 'หน้าร้านจะแสดงป้ายแจ้งว่าปิดให้บริการชั่วคราว และไม่อนุญาตให้สั่งอาหาร' }}
            </p>
          </div>
        </div>

        <button 
          type="button" 
          @click="toggleStoreStatus"
          :disabled="isTogglingStatus" 
          class="relative inline-flex h-7 w-14 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden disabled:opacity-50"
          :class="form.is_active ? 'bg-emerald-600' : 'bg-slate-300'"
          :title="form.is_active ? 'กดเพื่อปิดร้านชั่วคราว' : 'กดเพื่อเปิดให้บริการ'"
        >
          <span 
            class="pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out flex items-center justify-center text-[10px]"
            :class="form.is_active ? 'translate-x-7' : 'translate-x-0'"
          >
            <span v-if="isTogglingStatus" class="w-3 h-3 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin"></span>
          </span>
        </button>
      </div>

      <!-- 2. Visual Branding Grid (Images) -->
      <div class="bg-card border rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
        <div class="border-b pb-4">
          <h2 class="text-base font-black text-foreground flex items-center gap-2">
            <ImageIcon class="w-4 h-4 text-primary" />
            ภาพลักษณ์และแบรนด์ร้านค้า (Branding)
          </h2>
          <p class="text-xs text-muted-foreground mt-0.5">อัปโหลดโลโก้และภาพปกเพื่อสร้างความน่าเชื่อถือให้นักท่องเที่ยว</p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
          <div class="md:col-span-1">
            <label class="block text-xs font-bold text-foreground mb-2">โลโก้ร้าน (สัดส่วน 1:1)</label>
            <ImageUpload 
              v-if="user"
              bucket="store_assets" 
              :path="`${user.id}/logo`" 
              v-model="form.logo_url" 
              label="อัปโหลดโลโก้" 
              aspect-ratio="1/1" 
            />
            <p class="text-[11px] text-muted-foreground mt-2">แสดงบนหัวเมนูและตรงกลาง QR Code</p>
          </div>

          <div class="md:col-span-2">
            <label class="block text-xs font-bold text-foreground mb-2">ภาพหน้าปกร้าน (สัดส่วน 16:9)</label>
            <ImageUpload 
              v-if="user"
              bucket="store_assets" 
              :path="`${user.id}/cover`" 
              v-model="form.cover_url" 
              label="อัปโหลดภาพปกหน้าร้าน" 
              aspect-ratio="16/9" 
            />
            <p class="text-[11px] text-muted-foreground mt-2">แสดงเป็นแบนเนอร์ด้านบนสุดเมื่อลูกค้าเปิดดูเมนู</p>
          </div>
        </div>
      </div>

      <!-- 3. Store Identity & Multi-Language Names & Descriptions -->
      <div class="bg-card border rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4">
          <div>
            <h2 class="text-base font-black text-foreground flex items-center gap-2">
              <Globe class="w-4 h-4 text-primary" />
              ชื่อร้านค้าและ 3 ภาษา (Multi-Language)
            </h2>
            <p class="text-xs text-muted-foreground mt-0.5">แปลชื่อร้าน คำอธิบาย และที่อยู่เป็นภาษาอังกฤษและภาษาจีนเพื่อต้อนรับชาวต่างชาติ</p>
          </div>

          <button 
            type="button"
            @click="translateStoreInfo"
            :disabled="isTranslating || (!form.name && !form.description && !form.address)"
            class="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-purple-100 text-purple-700 hover:bg-purple-200 font-bold text-xs disabled:opacity-50 transition-colors shadow-2xs self-start sm:self-auto"
          >
            <span v-if="isTranslating" class="w-3.5 h-3.5 border-2 border-purple-700 border-t-transparent rounded-full animate-spin"></span>
            <Sparkles v-else class="w-3.5 h-3.5" />
            <span>{{ isTranslating ? 'กำลังแปลด้วย AI...' : '✨ แปลข้อมูลร้านอัตโนมัติ (AI)' }}</span>
          </button>
        </div>

        <!-- 3.1 Store Names (3 Languages) -->
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
          <!-- Thai Name -->
          <div>
            <label class="block text-xs font-bold text-foreground mb-1.5">
              ชื่อร้านภาษาไทย <span class="text-rose-500">*</span>
            </label>
            <input 
              v-model="form.name" 
              type="text" 
              required 
              placeholder="เช่น กะเพราตาเลือก" 
              class="w-full px-3.5 py-2.5 bg-background border rounded-xl text-xs font-semibold focus:ring-2 focus:ring-primary/20 focus:border-primary outline-hidden transition-all"
            />
          </div>

          <!-- English Name -->
          <div>
            <label class="block text-xs font-bold text-foreground mb-1.5">
              ชื่อร้านภาษาอังกฤษ (English)
            </label>
            <input 
              v-model="form.name_en" 
              type="text" 
              placeholder="e.g. Kaprao Ta Lueak" 
              class="w-full px-3.5 py-2.5 bg-background border rounded-xl text-xs focus:ring-2 focus:ring-primary/20 focus:border-primary outline-hidden transition-all"
            />
          </div>

          <!-- Chinese Name -->
          <div>
            <label class="block text-xs font-bold text-foreground mb-1.5">
              ชื่อร้านภาษาจีน (中文)
            </label>
            <input 
              v-model="form.name_zh" 
              type="text" 
              placeholder="例如 泰式打抛猪肉饭" 
              class="w-full px-3.5 py-2.5 bg-background border rounded-xl text-xs focus:ring-2 focus:ring-primary/20 focus:border-primary outline-hidden transition-all"
            />
          </div>
        </div>

        <!-- 3.2 Store Type & Default Language -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 pt-2">
          <div>
            <label class="block text-xs font-bold text-foreground mb-1.5">ประเภทธุรกิจ / ร้านอาหาร</label>
            <select 
              v-model="form.store_type" 
              class="w-full px-3.5 py-2.5 bg-background border rounded-xl text-xs font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary outline-hidden transition-all"
            >
              <option v-for="t in storeTypes" :key="t.value" :value="t.value">{{ t.label }}</option>
            </select>
          </div>

          <div>
            <label class="block text-xs font-bold text-foreground mb-1.5">ภาษาเริ่มต้นของเมนู</label>
            <select 
              v-model="form.default_language" 
              class="w-full px-3.5 py-2.5 bg-background border rounded-xl text-xs font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary outline-hidden transition-all"
            >
              <option value="th">🇹🇭 ภาษาไทย (เริ่มต้น)</option>
              <option value="en">🇬🇧 English (Default for Tourists)</option>
            </select>
          </div>
        </div>

        <!-- 3.3 Descriptions (3 Languages) -->
        <div class="space-y-4 pt-2 border-t border-border/40">
          <h3 class="text-xs font-black text-foreground flex items-center gap-1.5">
            <FileText class="w-3.5 h-3.5 text-primary" />
            คำอธิบายหรือเรื่องราวของร้าน (Store Descriptions)
          </h3>

          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
            <div>
              <label class="block text-xs font-bold text-foreground mb-1.5">คำอธิบายภาษาไทย</label>
              <textarea 
                v-model="form.description" 
                rows="3" 
                placeholder="เช่น ร้านอาหารพื้นเมืองเชียงราย รสชาติต้นตำรับ เปิดบริการมากว่า 20 ปี..."
                class="w-full px-3.5 py-2.5 bg-background border rounded-xl text-xs focus:ring-2 focus:ring-primary/20 focus:border-primary outline-hidden transition-all leading-relaxed"
              ></textarea>
            </div>

            <div>
              <label class="block text-xs font-bold text-foreground mb-1.5">คำอธิบายภาษาอังกฤษ (English)</label>
              <textarea 
                v-model="form.description_en" 
                rows="3" 
                placeholder="e.g. Authentic Northern Thai restaurant in Chiang Rai, serving local recipes..."
                class="w-full px-3.5 py-2.5 bg-background border rounded-xl text-xs focus:ring-2 focus:ring-primary/20 focus:border-primary outline-hidden transition-all leading-relaxed"
              ></textarea>
            </div>

            <div>
              <label class="block text-xs font-bold text-foreground mb-1.5">คำอธิบายภาษาจีน (中文简介)</label>
              <textarea 
                v-model="form.description_zh" 
                rows="3" 
                placeholder="例如 清莱正宗传统泰北特色风味餐厅，精选地道食材..."
                class="w-full px-3.5 py-2.5 bg-background border rounded-xl text-xs focus:ring-2 focus:ring-primary/20 focus:border-primary outline-hidden transition-all leading-relaxed"
              ></textarea>
            </div>
          </div>
        </div>
      </div>

      <!-- 4. Store Link & Location (Slug & 3-Language Address) -->
      <div class="bg-card border rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
        <div class="border-b pb-4">
          <h2 class="text-base font-black text-foreground flex items-center gap-2">
            <MapPin class="w-4 h-4 text-primary" />
            ลิงก์ร้านค้าและที่ตั้ง (URL & Address)
          </h2>
          <p class="text-xs text-muted-foreground mt-0.5">กำหนด URL เฉพาะของร้านคุณ และที่ตั้งสำหรับแนะนำนักท่องเที่ยว</p>
        </div>

        <!-- Slug URL -->
        <div class="space-y-2">
          <label class="block text-xs font-bold text-foreground">
            ลิงก์เมนูร้านค้า (Custom URL Slug) <span class="text-rose-500">*</span>
          </label>
          
          <div class="flex rounded-xl border overflow-hidden focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary transition-all">
            <span class="inline-flex items-center bg-muted px-3.5 text-xs text-muted-foreground font-mono font-medium border-r shrink-0">
              chiimenu.com/m/
            </span>
            <input 
              :value="form.slug"
              @input="onSlugInput"
              type="text" 
              required 
              pattern="^[a-z0-9\-]+$" 
              placeholder="my-restaurant-name" 
              class="w-full px-3.5 py-2.5 bg-background text-xs font-mono font-bold outline-hidden"
            />
          </div>

          <div class="flex items-center justify-between text-xs pt-0.5">
            <span class="text-[11px] text-muted-foreground">
              🔤 ระบบปรับเป็น <strong>ตัวพิมพ์เล็ก (a-z)</strong> ตัวเลข และ <strong>-</strong> อัตโนมัติ
            </span>
            <div>
              <span v-if="slugStatus === 'checking'" class="text-amber-600 animate-pulse text-[11px] font-bold">กำลังตรวจสอบ...</span>
              <span v-else-if="slugStatus === 'taken'" class="text-rose-600 text-[11px] font-bold">❌ ลิงก์นี้มีร้านอื่นใช้งานแล้ว</span>
              <span v-else-if="slugStatus === 'available'" class="text-emerald-600 text-[11px] font-bold">✅ ลิงก์นี้สามารถใช้งานได้</span>
            </div>
          </div>

          <!-- Quick Copy & Action Buttons -->
          <div v-if="form.slug" class="pt-2 flex flex-wrap gap-2">
            <button 
              type="button" 
              @click="copyLineLinkCommand"
              class="px-3.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 font-bold text-xs rounded-xl border border-emerald-200 transition-all inline-flex items-center gap-1.5 shadow-2xs"
              title="คัดลอกคำสั่งไปวางใน LINE"
            >
              <MessageCircle class="w-3.5 h-3.5 text-emerald-600" />
              <span>📋 คัดลอกคำสั่งผูก LINE: <code class="font-mono bg-emerald-200/50 dark:bg-emerald-900/50 px-1 rounded">link {{ form.slug }}</code></span>
            </button>

            <button 
              type="button" 
              @click="copyStoreLink"
              class="px-3.5 py-1.5 bg-muted hover:bg-muted/80 text-foreground font-semibold text-xs rounded-xl border transition-all inline-flex items-center gap-1.5"
            >
              <Copy class="w-3.5 h-3.5 text-muted-foreground" />
              <span>คัดลอกลิงก์ร้าน (/m/{{ form.slug }})</span>
            </button>
          </div>
        </div>

        <!-- 3-Language Address Grid -->
        <div class="space-y-4 pt-2 border-t border-border/40">
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
            <!-- Thai Address -->
            <div>
              <label class="block text-xs font-bold text-foreground mb-1.5">ที่อยู่ร้านภาษาไทย</label>
              <input 
                v-model="form.address" 
                type="text" 
                placeholder="เช่น เชียงราย (ตรงข้ามหอนาฬิกา)" 
                class="w-full px-3.5 py-2.5 bg-background border rounded-xl text-xs focus:ring-2 focus:ring-primary/20 focus:border-primary outline-hidden transition-all"
              />
            </div>

            <!-- English Address -->
            <div>
              <label class="block text-xs font-bold text-foreground mb-1.5">ที่อยู่ร้านภาษาอังกฤษ (English)</label>
              <input 
                v-model="form.address_en" 
                type="text" 
                placeholder="e.g. Chiang Rai, Thailand" 
                class="w-full px-3.5 py-2.5 bg-background border rounded-xl text-xs focus:ring-2 focus:ring-primary/20 focus:border-primary outline-hidden transition-all"
              />
            </div>

            <!-- Chinese Address -->
            <div>
              <label class="block text-xs font-bold text-foreground mb-1.5">ที่อยู่ร้านภาษาจีน (中文地址)</label>
              <input 
                v-model="form.address_zh" 
                type="text" 
                placeholder="例如 泰国 清莱府" 
                class="w-full px-3.5 py-2.5 bg-background border rounded-xl text-xs focus:ring-2 focus:ring-primary/20 focus:border-primary outline-hidden transition-all"
              />
            </div>
          </div>

          <!-- Phone Number -->
          <div>
            <label class="block text-xs font-bold text-foreground mb-1.5">เบอร์โทรศัพท์ติดต่อร้าน</label>
            <input 
              v-model="form.phone" 
              type="text" 
              placeholder="เช่น 081-234-5678" 
              class="w-full max-w-sm px-3.5 py-2.5 bg-background border rounded-xl text-xs focus:ring-2 focus:ring-primary/20 focus:border-primary outline-hidden transition-all"
            />
            <p class="text-[11px] text-muted-foreground mt-1.5">เบอร์โทรสำหรับให้ลูกค้าหรือทีมงานติดต่อกรณีฉุกเฉิน</p>
          </div>
        </div>
      </div>

      <!-- 5. LINE OA Notification Integration Card (Clean, Frictionless, No Raw Code) -->
      <div class="bg-gradient-to-br from-emerald-500/5 via-card to-emerald-500/10 border-2 border-emerald-500/30 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
        
        <!-- Header with Status Badge -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-emerald-200/50 pb-4">
          <div class="flex items-center gap-3.5">
            <div class="w-12 h-12 rounded-2xl bg-emerald-500 text-white flex items-center justify-center text-2xl shadow-sm shadow-emerald-200 shrink-0">
              <MessageCircle class="w-6 h-6" />
            </div>
            <div>
              <div class="flex items-center gap-2">
                <h2 class="text-base font-black text-foreground">การแจ้งเตือนออเดอร์ผ่าน LINE OA</h2>
                <span 
                  class="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider"
                  :class="form.line_user_id ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-slate-100 text-slate-600'"
                >
                  {{ form.line_user_id ? '🟢 เปิดใช้งานแล้ว (Active)' : '⚪ ยังไม่เปิดใช้งาน' }}
                </span>
              </div>
              <p class="text-xs text-muted-foreground mt-0.5">
                เมื่อนักท่องเที่ยวสั่งอาหารผ่าน QR Code รายการออเดอร์จะเด้งเข้าแชท LINE เจ้าของร้านทันที
              </p>
            </div>
          </div>
        </div>

        <!-- Connected State (Clean & Professional) -->
        <div v-if="form.line_user_id" class="p-5 rounded-2xl bg-white/90 dark:bg-card/90 border border-emerald-200 space-y-4">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div class="space-y-1.5">
              <div class="flex items-center gap-2 text-xs font-bold text-emerald-800">
                <CheckCircle2 class="w-4 h-4 text-emerald-600" />
                <span>ระบบพร้อมส่งออเดอร์เข้า LINE ของคุณแล้ว</span>
                <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                  <ShieldCheck class="w-3 h-3 text-emerald-700" />
                  <span>ล็อกสิทธิ์เฉพาะเจ้าของร้าน (Protected)</span>
                </span>
              </div>
              <p class="text-[11px] text-muted-foreground">
                LINE Official Account: <strong>@946vhuev (ChiiMenu Alert)</strong>
              </p>
              <p class="text-[11px] font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md inline-block">
                User ID: {{ form.line_user_id }}
              </p>
            </div>

            <div class="flex items-center gap-2">
              <a 
                href="https://line.me/R/ti/p/@946vhuev" 
                target="_blank" 
                rel="noopener noreferrer" 
                class="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-xs transition-all inline-flex items-center gap-1.5"
              >
                <MessageCircle class="w-3.5 h-3.5" />
                <span>เปิดดูแชท LINE OA</span>
              </a>

              <button 
                type="button" 
                @click="showManualLineId = !showManualLineId"
                class="px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground bg-muted hover:bg-muted/80 rounded-xl transition-colors"
              >
                {{ showManualLineId ? 'ซ่อนการแก้ไข' : 'แก้ไขรหัส' }}
              </button>

              <button 
                type="button" 
                @click="disconnectLine"
                class="px-3 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                title="ปิดการแจ้งเตือน"
              >
                ปิดการเชื่อมต่อ
              </button>
            </div>
          </div>

          <!-- Edit Line ID input -->
          <div v-if="showManualLineId" class="pt-3 border-t border-emerald-100 flex flex-col sm:flex-row items-center gap-2">
            <input 
              v-model="form.line_user_id" 
              type="text" 
              placeholder="Uxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
              class="flex-1 w-full px-3 py-2 bg-background border rounded-xl font-mono text-xs text-foreground focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-hidden"
            />
            <button 
              type="button"
              @click="saveLineId"
              :disabled="isSavingLine"
              class="w-full sm:w-auto px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition-all shrink-0"
            >
              {{ isSavingLine ? 'กำลังบันทึก...' : 'บันทึกการแก้ไข' }}
            </button>
          </div>
        </div>

        <!-- Disconnected State (Step-by-Step Guide) -->
        <div v-else class="p-6 rounded-2xl bg-white/90 dark:bg-card/90 border border-slate-200 space-y-5">
          <div class="space-y-1">
            <h3 class="text-sm font-bold text-foreground flex items-center gap-2">
              <MessageCircle class="w-4 h-4 text-emerald-600" />
              <span>วิธีเชื่อมต่อรับแจ้งเตือนออเดอร์ผ่าน LINE (@946vhuev)</span>
            </h3>
            <p class="text-xs text-muted-foreground">
              ทำตาม 2 ขั้นตอนง่ายๆ ด้านล่าง เพื่อให้ระบบส่งออเดอร์เข้าแชท LINE ของคุณโดยตรง:
            </p>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <!-- Option 1: Auto Link via Chat -->
            <div class="p-4 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/70 rounded-2xl space-y-3">
              <div class="flex items-center gap-2">
                <span class="w-5 h-5 rounded-full bg-emerald-600 text-white text-xs font-bold flex items-center justify-center">1</span>
                <h4 class="text-xs font-bold text-emerald-950 dark:text-emerald-300">แอดเพื่อน & รับรหัสประจำตัว</h4>
              </div>
              <p class="text-xs text-muted-foreground leading-relaxed">
                กดปุ่มด้านล่างเพื่อแอด LINE OA: <strong>@946vhuev</strong> แล้วทักแชท บอทจะตอบกลับ <strong>รหัส LINE User ID</strong> ของคุณทันที
              </p>
              <button 
                type="button" 
                @click="openLineBotChat"
                class="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all inline-flex items-center justify-center gap-2"
              >
                <MessageCircle class="w-4 h-4" />
                <span>แอดไลน์ & เปิดแชท @946vhuev</span>
              </button>
            </div>

            <!-- Option 2: Enter User ID & Save -->
            <div class="p-4 bg-muted/30 border rounded-2xl space-y-3">
              <div class="flex items-center gap-2">
                <span class="w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">2</span>
                <h4 class="text-xs font-bold text-foreground">กรอกรหัส LINE User ID ของคุณ</h4>
              </div>
              <p class="text-xs text-muted-foreground leading-relaxed">
                นำรหัส <code class="font-mono text-primary font-bold">U...</code> ที่ได้จากบอทมากรอกลงในช่องนี้ แล้วกดบันทึก:
              </p>
              <div class="flex flex-col sm:flex-row gap-2">
                <input 
                  v-model="form.line_user_id" 
                  type="text" 
                  placeholder="เช่น U3cfe1457fc5f6d1c6939e..."
                  class="flex-1 px-3 py-2 bg-background border rounded-xl font-mono text-xs text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-hidden"
                />
                <button 
                  type="button"
                  @click="saveLineId"
                  :disabled="isSavingLine"
                  class="px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl text-xs transition-all shrink-0 shadow-xs"
                >
                  {{ isSavingLine ? 'กำลังบันทึก...' : '🟢 บันทึกเชื่อมต่อ' }}
                </button>
              </div>
            </div>
          </div>
        </div>

      </div>

      <!-- 6. Display & Font Size Setting Card -->
      <div class="bg-card border rounded-3xl p-6 sm:p-8 shadow-xs space-y-4">
        <div class="flex items-center gap-3.5 border-b pb-4">
          <div class="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-bold">
            <Type class="w-5 h-5" />
          </div>
          <div>
            <h2 class="text-sm font-bold text-foreground">ขนาดตัวอักษรของระบบ (Font Size & Display)</h2>
            <p class="text-xs text-muted-foreground">ปรับขนาดตัวอักษรทั้งเว็บไซต์ให้พอดีกับสายตาของคุณ (ระบบจะจำค่านี้ไว้ตลอด)</p>
          </div>
        </div>

        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
          <div class="flex items-center gap-2 flex-wrap">
            <button 
              v-for="lvl in fontLevels" 
              :key="lvl.key"
              type="button"
              @click="setFontLevel(lvl.key)"
              class="px-4 py-2.5 rounded-2xl text-xs font-bold transition-all border"
              :class="currentFontLevel === lvl.key ? 'bg-primary text-primary-foreground border-primary shadow-xs' : 'bg-muted/40 hover:bg-muted text-foreground border-border'"
            >
              {{ lvl.label }}
            </button>
          </div>

          <button 
            v-if="currentFontLevel !== 'md'"
            type="button"
            @click="resetFontSize"
            class="px-4 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-xl transition-colors inline-flex items-center gap-1 self-start sm:self-auto"
          >
            <RotateCcw class="w-3.5 h-3.5" />
            <span>รีเซ็ตค่าเริ่มต้น (100%)</span>
          </button>
        </div>
      </div>

      <!-- Alerts -->
      <div v-if="errorMsg" class="rounded-2xl bg-rose-50 p-4 border border-rose-200 flex items-center gap-3">
        <AlertCircle class="w-5 h-5 text-rose-600 shrink-0" />
        <p class="text-xs font-bold text-rose-800">{{ errorMsg }}</p>
      </div>
      
      <div v-if="successMsg" class="rounded-2xl bg-emerald-50 p-4 border border-emerald-200 flex items-center gap-3 animate-in fade-in duration-300">
        <CheckCircle2 class="w-5 h-5 text-emerald-600 shrink-0" />
        <p class="text-xs font-bold text-emerald-800">{{ successMsg }}</p>
      </div>

      <!-- Sticky / Fixed Bottom Submit Bar -->
      <div class="bg-card border rounded-3xl p-4 sm:p-5 shadow-lg flex flex-col sm:flex-row justify-between items-center gap-4 sticky bottom-4 z-20 backdrop-blur-md bg-card/95">
        <div class="text-xs text-muted-foreground text-center sm:text-left">
          <span>อัปเดตล่าสุดเมื่อ: </span>
          <strong class="text-foreground font-semibold">{{ new Date(form.updated_at || Date.now()).toLocaleDateString('th-TH') }}</strong>
        </div>

        <button 
          type="submit" 
          :disabled="saving || slugStatus === 'taken' || slugStatus === 'checking'" 
          class="w-full sm:w-auto px-8 py-3 bg-primary text-primary-foreground font-bold text-xs rounded-2xl shadow-md hover:bg-primary/90 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <span v-if="saving" class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
          <Check class="w-4 h-4" v-else />
          <span>{{ saving ? 'กำลังบันทึกข้อมูล...' : 'บันทึกการเปลี่ยนแปลงทั้งหมด' }}</span>
        </button>
      </div>

    </form>

  </div>
</template>
