<script setup lang="ts">
definePageMeta({
  layout: 'merchant',
  middleware: ['auth']
})

const user = useSupabaseUser()
const client = useSupabaseClient()

const loading = ref(true)
const saving = ref(false)
const errorMsg = ref('')
const successMsg = ref('')

const form = ref({
  id: '',
  name: '',
  name_en: '',
  name_zh: '',
  slug: '',
  description: '',
  store_type: 'restaurant',
  address: '',
  default_language: 'th',
  line_user_id: '',
  is_active: true,
  logo_url: '',
  cover_url: '',
  updated_at: ''
})

const isTranslating = ref(false)

const storeTypes = [
  { value: 'restaurant', label: computed(() => useNuxtApp().$i18n.t('store_type_restaurant')) },
  { value: 'cafe', label: computed(() => useNuxtApp().$i18n.t('store_type_cafe')) },
  { value: 'street_food', label: computed(() => useNuxtApp().$i18n.t('store_type_street')) },
  { value: 'drink', label: computed(() => useNuxtApp().$i18n.t('store_type_drink')) }
]

onMounted(async () => {
  const { data: authData } = await client.auth.getUser()
  if (!authData?.user?.id) return
  
  try {
    const { data: storeData, error } = await client
      .from('stores')
      .select('*')
      .eq('owner_id', authData.user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      
    if (error) throw error
    if (storeData?.[0]) {
      form.value = { ...(storeData[0] as any) }
    }
  } catch (e: any) {
    if (e.code !== 'PGRST116') { // Ignore "No rows found"
      errorMsg.value = useNuxtApp().$i18n.t('store_err_load')
    }
  } finally {
    loading.value = false
  }
})

const submitForm = async () => {
  saving.value = true
  errorMsg.value = ''
  successMsg.value = ''
  
  try {
    const { error } = await (client as any)
      .from('stores')
      .update({
        name: form.value.name,
        name_en: form.value.name_en || null,
        name_zh: form.value.name_zh || null,
        slug: form.value.slug,
        description: form.value.description,
        store_type: form.value.store_type,
        address: form.value.address,
        default_language: form.value.default_language,
        line_user_id: form.value.line_user_id || null,
        is_active: form.value.is_active,
        logo_url: form.value.logo_url || null,
        cover_url: form.value.cover_url || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', form.value.id)
      
    if (error) throw error
    
    successMsg.value = useNuxtApp().$i18n.t('store_save_success')
    setTimeout(() => { successMsg.value = '' }, 3000)
  } catch (e: any) {
    if (e.code === '23505') {
      errorMsg.value = useNuxtApp().$i18n.t('store_err_slug')
    } else {
      errorMsg.value = e.message || useNuxtApp().$i18n.t('store_err_load')
    }
  } finally {
    saving.value = false
  }
}

const translateStoreName = async () => {
  if (!form.value.name.trim()) return
  
  isTranslating.value = true
  try {
    const response = await fetch('/api/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name_th: form.value.name, description_th: '' })
    })
    const data = await response.json()
    if (data.error) throw new Error(data.message)
    if (data.name_en) form.value.name_en = data.name_en
    if (data.name_zh) form.value.name_zh = data.name_zh
  } catch (error: any) {
    alert(error.message || 'การแปลล้มเหลว กรุณาลองใหม่')
  } finally {
    isTranslating.value = false
  }
}
</script>

<template>
  <div class="max-w-5xl mx-auto">
    <div class="mb-8">
      <h1 class="text-2xl font-bold tracking-tight text-foreground">{{ $t('store_settings_title') }}</h1>
      <p class="text-muted-foreground mt-1">{{ $t('store_settings_subtitle') }}</p>
    </div>

    <div v-if="loading" class="p-8 text-center text-muted-foreground bg-card rounded-lg border">
      {{ $t('store_loading') }}
    </div>

    <div v-else-if="!form.id" class="p-8 text-center bg-card rounded-lg border">
      <p class="text-muted-foreground mb-4">{{ $t('store_no_profile') }}</p>
      <NuxtLink to="/merchant/store/create" class="text-primary font-medium hover:underline">{{ $t('store_create_new') }}</NuxtLink>
    </div>

    <form v-else @submit.prevent="submitForm" class="bg-card shadow-sm border rounded-lg overflow-hidden">
      <!-- Toggle Status (Top Bar) -->
      <div class="flex items-center justify-between p-4 bg-muted/20 border-b">
        <div>
          <h3 class="text-sm font-medium text-foreground">{{ $t('store_status_title') }}</h3>
          <p class="text-sm text-muted-foreground">{{ $t('store_status_desc') }}</p>
        </div>
        <button type="button" @click="form.is_active = !form.is_active" 
          :class="[form.is_active ? 'bg-green-600' : 'bg-gray-200', 'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2']" role="switch" :aria-checked="form.is_active">
          <span class="sr-only">Toggle Store Status</span>
          <span aria-hidden="true" :class="[form.is_active ? 'translate-x-5' : 'translate-x-0', 'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out']"></span>
        </button>
      </div>

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
              <p class="text-sm text-muted-foreground mt-1">ตั้งค่าชื่อร้านและรายละเอียดต่างๆ</p>
            </div>
            
            <div class="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div class="sm:col-span-2">
                <div class="flex items-center justify-between mb-1">
                  <label for="name" class="block text-sm font-medium text-foreground">{{ $t('store_name_label') }} <span class="text-destructive">*</span></label>
                  <button 
                    type="button"
                    @click="translateStoreName"
                    :disabled="isTranslating || !form.name"
                    class="inline-flex items-center gap-1.5 rounded-full bg-purple-100 px-3 py-1 text-xs font-medium text-purple-700 hover:bg-purple-200 disabled:opacity-50 transition-colors"
                  >
                    <span v-if="isTranslating" class="w-3 h-3 border-2 border-purple-700 border-t-transparent rounded-full animate-spin"></span>
                    ✨ แปลชื่อร้านอัตโนมัติ (AI)
                  </button>
                </div>
                <input v-model="form.name" type="text" id="name" required class="block w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary">
              </div>

              <div>
                <label for="name_en" class="block text-sm font-medium text-foreground">ชื่อร้าน (English)</label>
                <input v-model="form.name_en" type="text" id="name_en" placeholder="e.g. Kaprao Ta Lueak" class="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary">
              </div>

              <div>
                <label for="name_zh" class="block text-sm font-medium text-foreground">ชื่อร้าน (中文)</label>
                <input v-model="form.name_zh" type="text" id="name_zh" placeholder="例如 卡帕劳塔卢阿" class="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary">
              </div>

              <div class="sm:col-span-2">
                <label for="slug" class="block text-sm font-medium text-foreground">{{ $t('store_slug_label') }} <span class="text-destructive">*</span></label>
                <div class="mt-1 flex rounded-md shadow-sm">
                  <span class="inline-flex items-center rounded-l-md border border-r-0 border-input bg-muted px-3 text-muted-foreground sm:text-sm">
                    chiimenu.com/
                  </span>
                  <input v-model="form.slug" type="text" id="slug" required pattern="[a-z0-9-]+" class="block w-full min-w-0 flex-1 rounded-none rounded-r-md border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary">
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
              
              <div class="sm:col-span-2">
                <label for="address" class="block text-sm font-medium text-foreground">{{ $t('store_address_label') }}</label>
                <textarea v-model="form.address" id="address" rows="2" class="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"></textarea>
              </div>

              <div class="sm:col-span-2 border-t border-border/50 pt-6 mt-2">
                <h3 class="text-lg font-bold text-foreground mb-4">การเชื่อมต่อ LINE OA (สำหรับรับออเดอร์)</h3>
                <label for="line_user_id" class="block text-sm font-medium text-foreground">LINE User ID ของร้าน</label>
                <p class="text-xs text-muted-foreground mt-1 mb-2">เพื่อรับแจ้งเตือนออเดอร์เข้ามือถือทันที กรุณาแอด LINE: <strong class="text-primary">@ChiiMenu</strong> และพิมพ์คำว่า "ขอไอดี" นำรหัสที่บอทตอบกลับมากรอกในช่องนี้</p>
                <input v-model="form.line_user_id" type="text" id="line_user_id" placeholder="U1234567890abcdef..." class="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary">
              </div>
            </div>
          </div>
        </div>

        <div v-if="errorMsg" class="mt-6 rounded-md bg-destructive/10 p-4 border border-destructive/20">
          <p class="text-sm font-medium text-destructive">{{ errorMsg }}</p>
        </div>
        
        <div v-if="successMsg" class="mt-6 rounded-md bg-green-50 p-4 border border-green-200">
          <p class="text-sm font-medium text-green-800">{{ successMsg }}</p>
        </div>
      </div>
      

      <div class="bg-muted/50 px-6 py-4 flex justify-between items-center">
        <span class="text-sm text-muted-foreground">{{ $t('store_last_update') }} {{ new Date(form.updated_at || Date.now()).toLocaleDateString('th-TH') }}</span>
        <button type="submit" :disabled="saving" class="inline-flex justify-center rounded-md border border-transparent bg-primary py-2 px-6 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50">
          {{ saving ? $t('store_saving') : $t('store_save_btn') }}
        </button>
      </div>
    </form>
  </div>
</template>
