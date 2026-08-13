<script setup lang="ts">
definePageMeta({
  layout: 'merchant',
  middleware: ['auth']
})

const user = useSupabaseUser()
const client = useSupabaseClient()
const router = useRouter()

const loading = ref(false)
const errorMsg = ref('')
const slugStatus = ref<'idle' | 'checking' | 'available' | 'taken'>('idle')
let slugCheckTimeout: any = null

const form = ref({
  name: '',
  slug: '',
  description: '',
  store_type: 'restaurant',
  address: '',
  default_language: 'th',
  logo_url: '',
  cover_url: ''
})

const storeTypes = [
  { value: 'restaurant', label: 'ร้านอาหาร (Restaurant)' },
  { value: 'cafe', label: 'คาเฟ่ (Cafe / Coffee Shop)' },
  { value: 'street_food', label: 'สตรีทฟู้ด (Street Food)' },
  { value: 'drink', label: 'ร้านเครื่องดื่ม (Drink / Bar)' }
]

// Auto-generate slug from name (simple version)
watch(() => form.value.name, (newName) => {
  if (newName && !form.value.slug) {
    form.value.slug = newName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '')
  }
})

// Real-time slug check
watch(() => form.value.slug, (newSlug) => {
  if (!newSlug) {
    slugStatus.value = 'idle'
    return
  }
  slugStatus.value = 'checking'
  clearTimeout(slugCheckTimeout)
  
  slugCheckTimeout = setTimeout(async () => {
    const { count } = await client
      .from('stores')
      .select('*', { count: 'exact', head: true })
      .eq('slug', newSlug)
      
    if (count && count > 0) {
      slugStatus.value = 'taken'
    } else {
      slugStatus.value = 'available'
    }
  }, 500)
})

const submitForm = async () => {
  loading.value = true
  errorMsg.value = ''
  
  try {
    // ดึงข้อมูล User ชัวร์ๆ จาก Auth Client ป้องกันบั๊กจาก Vue Reactivity
    const { data: authData, error: authError } = await client.auth.getUser()
    if (authError || !authData.user) {
      throw new Error(useNuxtApp().$i18n.t('store_err_auth'))
    }
    
    const ownerId = authData.user.id

    // Duplicate name warning
    const { count: nameCount } = await client
      .from('stores')
      .select('*', { count: 'exact', head: true })
      .eq('name', form.value.name.trim())
      
    if (nameCount && nameCount > 0) {
      const swal = useAlert()
      const result = await swal.fire({
        title: 'พบชื่อร้านซ้ำ',
        text: `มีชื่อร้าน "${form.value.name}" ในระบบแล้ว คุณแน่ใจหรือไม่ว่าต้องการใช้ชื่อนี้?`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'ใช่, ฉันต้องการใช้ชื่อนี้',
        cancelButtonText: 'กลับไปแก้ไข'
      })
      if (!result.isConfirmed) {
        loading.value = false
        return
      }
    }

    const trialEndsAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

    const { data, error } = await client.from('stores').insert({
      owner_id: ownerId,
      name: form.value.name,
      slug: form.value.slug,
      description: form.value.description,
      store_type: form.value.store_type,
      address: form.value.address,
      default_language: form.value.default_language,
      logo_url: form.value.logo_url || null,
      cover_url: form.value.cover_url || null,
      is_active: true,
      plan_status: 'trial',
      trial_ends_at: trialEndsAt
    } as any).select().single()
    
    if (error) throw error
    
    // Redirect to dashboard
    router.push('/merchant/dashboard')
  } catch (e: any) {
    if (e.code === '23505') { // Unique violation for slug
      errorMsg.value = useNuxtApp().$i18n.t('store_err_slug')
    } else {
      errorMsg.value = e.message || useNuxtApp().$i18n.t('store_err_create')
    }
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="max-w-3xl mx-auto">
    <div class="mb-8">
      <NuxtLink to="/merchant/dashboard" class="text-sm font-medium text-muted-foreground hover:text-foreground mb-4 inline-block">
        &larr; {{ $t('store_back') }}
      </NuxtLink>
      <h1 class="text-2xl font-bold tracking-tight text-foreground">{{ $t('store_create_title') }}</h1>
      <p class="text-muted-foreground mt-1">{{ $t('store_create_desc') }}</p>
    </div>

    <form @submit.prevent="submitForm" class="bg-card shadow-sm border rounded-lg overflow-hidden">
      <div class="p-6">
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          <!-- Left Column: Images -->
          <div class="lg:col-span-1 space-y-6">
            <div>
              <h3 class="text-lg font-medium text-foreground">ภาพลักษณ์ร้านค้า</h3>
              <p class="text-sm text-muted-foreground mt-1">อัปโหลดโลโก้และรูปปกเพื่อดึงดูดลูกค้า</p>
            </div>
            
            <ImageUpload 
              v-if="user"
              bucket="store_assets" 
              :path="`${user.id}/logo`" 
              v-model="form.logo_url" 
              label="โลโก้ร้าน (1:1)" 
              aspect-ratio="1/1" 
            />
            
            <ImageUpload 
              v-if="user"
              bucket="store_assets" 
              :path="`${user.id}/cover`" 
              v-model="form.cover_url" 
              label="รูปหน้าปก (16:9)" 
              aspect-ratio="16/9" 
            />
          </div>

          <!-- Right Column: Details -->
          <div class="lg:col-span-2 space-y-6">
            <div>
              <h3 class="text-lg font-medium text-foreground">ข้อมูลพื้นฐาน</h3>
              <p class="text-sm text-muted-foreground mt-1">ชื่อและข้อมูลติดต่อ</p>
            </div>
            
            <div class="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div class="sm:col-span-2">
                <label for="name" class="block text-sm font-medium text-foreground">{{ $t('store_name_label') }} <span class="text-destructive">*</span></label>
                <input v-model="form.name" type="text" id="name" required class="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary">
              </div>

              <div class="sm:col-span-2">
                <label for="slug" class="block text-sm font-medium text-foreground">{{ $t('store_slug_label') }} <span class="text-destructive">*</span></label>
                <div class="mt-1 flex rounded-md shadow-sm">
                  <span class="inline-flex items-center rounded-l-md border border-r-0 border-input bg-muted px-3 text-muted-foreground sm:text-sm">
                    chiimenu.com/
                  </span>
                  <input v-model="form.slug" type="text" id="slug" required pattern="[a-z0-9-]+" class="block w-full min-w-0 flex-1 rounded-none rounded-r-md border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary">
                </div>
                <div class="mt-1 flex items-center justify-between">
                  <p class="text-xs text-muted-foreground">{{ $t('store_slug_hint') }}</p>
                  <p v-if="slugStatus === 'checking'" class="text-xs text-yellow-600 animate-pulse">กำลังตรวจสอบ...</p>
                  <p v-else-if="slugStatus === 'taken'" class="text-xs text-destructive font-bold">❌ ลิงก์นี้มีคนใช้แล้ว กรุณาเปลี่ยนใหม่</p>
                  <p v-else-if="slugStatus === 'available'" class="text-xs text-green-600 font-bold">✅ ลิงก์นี้สามารถใช้งานได้</p>
                </div>
              </div>

              <div>
                <label for="store_type" class="block text-sm font-medium text-foreground">{{ $t('store_type_label') }}</label>
                <select v-model="form.store_type" id="store_type" class="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary">
                  <option v-for="t in storeTypes" :key="t.value" :value="t.value">{{ typeof t.label === 'string' ? t.label : t.label }}</option>
                </select>
              </div>

              <div>
                <label for="default_language" class="block text-sm font-medium text-foreground">{{ $t('store_lang_label') }}</label>
                <select v-model="form.default_language" id="default_language" class="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary">
                  <option value="th">{{ $t('store_lang_th') }}</option>
                  <option value="en">{{ $t('store_lang_en') }}</option>
                </select>
              </div>

              <div class="sm:col-span-2">
                <label for="description" class="block text-sm font-medium text-foreground">{{ $t('store_desc_label') }}</label>
                <textarea v-model="form.description" id="description" rows="3" class="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"></textarea>
              </div>
            </div>
          </div>
        </div>

        <div v-if="errorMsg" class="mt-6 rounded-md bg-destructive/10 p-4 border border-destructive/20">
          <div class="flex">
            <div class="ml-3">
              <h3 class="text-sm font-medium text-destructive">{{ $t('store_err_title') }}</h3>
              <div class="mt-2 text-sm text-destructive/90">
                <p>{{ errorMsg }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div class="bg-muted/50 px-6 py-4 flex justify-end">
        <button type="submit" :disabled="loading || slugStatus === 'taken' || slugStatus === 'checking'" class="inline-flex justify-center rounded-md border border-transparent bg-primary py-2 px-4 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50">
          {{ loading ? $t('btn_saving') : $t('btn_save_create') }}
        </button>
      </div>
    </form>
  </div>
</template>
