<script setup lang="ts">
definePageMeta({
  layout: 'merchant',
  middleware: ['auth']
})

const user = useSupabaseUser()
const client = useSupabaseClient()
const router = useRouter()
const route = useRoute()

const loading = ref(true)
const saving = ref(false)
const isTranslating = ref(false)
const errorMsg = ref('')
const { store, fetchStore } = useCurrentStore()
const categories = ref<any[]>([])
const allAllergens = ref<any[]>([])
const allGroups = ref<any[]>([])

const form = ref({
  category_id: '',
  name_th: '',
  name_en: '',
  name_zh: '',
  // name_nod: '',
  description_th: '',
  description_en: '',
  description_zh: '',
  // description_nod: '',
  explanation_en: '', // For tourists
  price: '',
  is_available: true,
  is_spicy: false,
  spicy_level: 0,
})

const selectedAllergens = ref<string[]>([])
const selectedGroups = ref<string[]>([])
const photoFile = ref<File | null>(null)
const photoPreview = ref('')

onMounted(async () => {
  if (!store.value) {
    await fetchStore()
  }
  
  if (store.value?.id) {
    // 2. Get Categories
    const { data: catData } = await client
      .from('menu_categories')
      .select('id, name_th')
      .eq('store_id', store.value.id)
      .order('sort_order', { ascending: true })
    categories.value = catData || []
    
    if (route.query.category_id && typeof route.query.category_id === 'string') {
      form.value.category_id = route.query.category_id
    }
    
    // 3. Get Allergens & Groups
    const [allergenData, groupData] = await Promise.all([
      client.from('allergens').select('*'),
      client.from('customization_groups').select('*').eq('store_id', store.value.id)
    ])
    allAllergens.value = allergenData.data || []
    allGroups.value = groupData.data || []
  }
  
  loading.value = false
})

const handlePhotoUpload = (e: Event) => {
  const target = e.target as HTMLInputElement
  if (target.files && target.files[0]) {
    const file = target.files[0]
    // Basic validation
    if (file.size > 5 * 1024 * 1024) {
      const swal = useAlert()
      swal.fire('ขนาดไฟล์เกิน', 'รูปภาพต้องขนาดไม่เกิน 5MB', 'warning')
      return
    }
    photoFile.value = file
    photoPreview.value = URL.createObjectURL(file)
  }
}

const handleAutoTranslate = async () => {
  const swal = useAlert()
  if (!form.value.name_th) {
    swal.fire('คำเตือน', 'กรุณากรอกชื่อเมนูภาษาไทยก่อนครับ', 'warning')
    return
  }
  
  isTranslating.value = true
  try {
    const data = await $fetch<any>('/api/translate', {
      method: 'POST',
      body: {
        name_th: form.value.name_th,
        description_th: form.value.description_th
      }
    })
    
    if (data) {
      if (data.name_en && !form.value.name_en) form.value.name_en = data.name_en
      if (data.name_zh && !form.value.name_zh) form.value.name_zh = data.name_zh
      
      if (data.description_en && !form.value.explanation_en) form.value.explanation_en = data.description_en
      if (data.description_zh && !form.value.description_zh) form.value.description_zh = data.description_zh
    }
  } catch (error: any) {
    swal.fire('ข้อผิดพลาด', error.message || 'การแปลล้มเหลว กรุณาลองใหม่', 'error')
  } finally {
    isTranslating.value = false
  }
}

const submitForm = async () => {
  if (!store.value) return
  saving.value = true
  errorMsg.value = ''
  
  // Auto translate if fields are empty
  if (!form.value.name_en || !form.value.name_zh || !form.value.explanation_en) {
    await handleAutoTranslate()
  }
  
  // Duplicate Name Warning Check
  const { count: dupCount } = await client
    .from('menu_items')
    .select('*', { count: 'exact', head: true })
    .eq('store_id', store.value.id)
    .eq('name_th', form.value.name_th.trim())
    
  if (dupCount && dupCount > 0) {
    const swal = useAlert()
    const result = await swal.fire({
      title: 'พบเมนูชื่อซ้ำ',
      text: `คุณมีเมนูชื่อ "${form.value.name_th}" ในร้านอยู่แล้ว ต้องการสร้างเมนูชื่อนี้ซ้ำใช่หรือไม่?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'ใช่, สร้างเมนู',
      cancelButtonText: 'กลับไปแก้ไข'
    })
    if (!result.isConfirmed) {
      saving.value = false
      return
    }
  }
  
  try {
    let photoUrl = null
    
    // Upload photo if exists
    if (photoFile.value) {
      const fileExt = photoFile.value.name.split('.').pop()
      const fileName = `${store.value.id}/${Date.now()}.${fileExt}`
      
      const { data: uploadData, error: uploadError } = await client.storage
        .from('chiimenu-images')
        .upload(fileName, photoFile.value)
        
      if (uploadError) throw uploadError
      
      // Get public URL
      const { data: publicUrlData } = client.storage
        .from('chiimenu-images')
        .getPublicUrl(fileName)
        
      photoUrl = publicUrlData.publicUrl
    }
    
    // Insert Menu Item
    const { data: menuItem, error: insertError } = await client.from('menu_items').insert({
      store_id: store.value.id,
      category_id: form.value.category_id || null,
      name_th: form.value.name_th,
      name_en: form.value.name_en || null,
      name_zh: form.value.name_zh || null,
      description_th: form.value.description_th || null,
      description_en: form.value.description_en || null,
      description_zh: form.value.description_zh || null,
      explanation_en: form.value.explanation_en || null,
      price: parseFloat(form.value.price),
      is_available: form.value.is_available,
      is_spicy: form.value.is_spicy,
      spicy_level: form.value.is_spicy ? form.value.spicy_level : 0,
      photo_url: photoUrl
    } as never).select().single() as any
    
    if (insertError) throw insertError
    
    // Insert Allergens if any
    if (selectedAllergens.value.length > 0 && menuItem) {
      const allergenInserts = selectedAllergens.value.map(allergenId => ({
        menu_item_id: menuItem.id,
        allergen_id: allergenId
      }))
      
      const { error: allergenError } = await client
        .from('menu_item_allergens')
        .insert(allergenInserts as never)
        
      if (allergenError) console.error('Failed to link allergens:', allergenError)
    }

    // Insert Customization Groups if any
    if (selectedGroups.value.length > 0 && menuItem) {
      const groupInserts = selectedGroups.value.map(groupId => ({
        menu_item_id: menuItem.id,
        group_id: groupId
      }))
      
      await client.from('menu_item_customizations').insert(groupInserts as never)
    }
    
    useToast().success('เพิ่มเมนูอาหารเรียบร้อยแล้ว!')
    
    router.push('/merchant/menu')
  } catch (e: any) {
    errorMsg.value = e.message || 'เกิดข้อผิดพลาดในการบันทึกเมนู'
    saving.value = false
  }
}
</script>

<template>
  <div class="max-w-5xl mx-auto pb-12">
    <div class="mb-8">
      <NuxtLink to="/merchant/menu" class="text-sm font-medium text-muted-foreground hover:text-foreground mb-4 inline-block">
        &larr; {{ $t('item_back_btn') }}
      </NuxtLink>
      <h1 class="text-2xl font-bold tracking-tight text-foreground">{{ $t('item_create_title') }}</h1>
    </div>

    <div v-if="loading" class="p-8 text-center text-muted-foreground bg-card rounded-lg border">
      {{ $t('menu_list_loading') }}
    </div>

    <form v-else @submit.prevent="submitForm" class="space-y-6">
      
      <!-- Section 1: Basic Info -->
      <div class="bg-card shadow-sm border rounded-lg p-6">
        <h2 class="text-lg font-medium mb-4 text-foreground border-b pb-2">{{ $t('item_basic_info') }}</h2>
        
        <div class="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <!-- Image Upload -->
          <div class="sm:col-span-2 flex flex-col sm:flex-row gap-6 items-start">
            <div class="h-32 w-32 flex-shrink-0 bg-muted rounded-md border-2 border-dashed border-input flex items-center justify-center overflow-hidden relative group cursor-pointer hover:border-primary transition-colors">
              <img v-if="photoPreview" :src="photoPreview" class="h-full w-full object-cover">
              <div v-else class="text-muted-foreground flex flex-col items-center">
                <svg class="h-8 w-8 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                <span class="text-xs">{{ $t('item_add_photo') }}</span>
              </div>
              <input type="file" accept="image/*" @change="handlePhotoUpload" class="absolute inset-0 opacity-0 cursor-pointer w-full h-full">
            </div>
            <div class="flex-1">
              <h3 class="text-sm font-medium text-foreground mb-1">{{ $t('item_photo') }}</h3>
              <p class="text-sm text-muted-foreground mb-3">{{ $t('item_photo_hint') }}</p>
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium text-foreground">{{ $t('item_name_th') }} <span class="text-destructive">*</span></label>
            <input v-model="form.name_th" type="text" required class="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary">
          </div>
          
          <div>
            <label class="block text-sm font-medium text-foreground">{{ $t('item_price') }} <span class="text-destructive">*</span></label>
            <input v-model="form.price" type="number" step="0.01" min="0" required class="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary">
          </div>

          <div class="sm:col-span-2">
            <label class="block text-sm font-medium text-foreground">{{ $t('item_category') }}</label>
            <select v-model="form.category_id" class="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary">
              <option value="">{{ $t('item_no_cat') }}</option>
              <option v-for="cat in categories" :key="cat.id" :value="cat.id">{{ cat.name_th }}</option>
            </select>
          </div>
          
          <div class="sm:col-span-2">
            <label class="block text-sm font-medium text-foreground">{{ $t('item_desc_th') }}</label>
            <textarea v-model="form.description_th" rows="2" class="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"></textarea>
          </div>
          
          <!-- <div class="sm:col-span-2">
            <label class="block text-sm font-medium text-foreground">{{ $t('item_desc_nod') }}</label>
            <textarea v-model="form.description_nod" rows="2" class="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"></textarea>
          </div> -->
        </div>
      </div>
      
      <!-- Section 2: For Tourists -->
      <div class="bg-card shadow-sm border rounded-lg p-6">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 border-b pb-4">
          <div class="flex items-center gap-2">
            <span class="bg-blue-100 text-blue-800 text-xs font-semibold px-2 py-0.5 rounded uppercase tracking-wide">Tourist-Ready</span>
            <h2 class="text-lg font-medium text-foreground">{{ $t('item_tourist_info') }}</h2>
          </div>
          <button type="button" @click="handleAutoTranslate" :disabled="isTranslating" class="inline-flex items-center justify-center gap-2 rounded-md bg-purple-100 text-purple-700 px-3 py-1.5 text-sm font-medium hover:bg-purple-200 transition-colors disabled:opacity-50">
            <svg v-if="isTranslating" class="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
            <span v-else>✨</span>
            {{ isTranslating ? 'กำลังให้ AI แปล...' : 'แปลภาษาอัตโนมัติ (AI)' }}
          </button>
        </div>
        
        <div class="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div class="sm:col-span-2">
            <label class="block text-sm font-medium text-foreground">{{ $t('item_name_en') }}</label>
            <input v-model="form.name_en" type="text" class="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary" placeholder="e.g. Pad Thai with Shrimp">
          </div>

          <div class="sm:col-span-2">
            <label class="block text-sm font-medium text-foreground">{{ $t('item_name_zh') }}</label>
            <input v-model="form.name_zh" type="text" class="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary" placeholder="e.g. 泰式炒粉">
          </div>
          
          <div class="sm:col-span-2">
            <label class="block text-sm font-medium text-foreground">{{ $t('item_exp_en') }}</label>
            <textarea v-model="form.explanation_en" rows="3" class="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary" placeholder="e.g. Stir-fried rice noodles with eggs, peanuts, bean sprouts, and tamarind sauce."></textarea>
            <p class="mt-1 text-xs text-muted-foreground">{{ $t('item_exp_hint') }}</p>
          </div>

          <div class="sm:col-span-2">
            <label class="block text-sm font-medium text-foreground">{{ $t('item_exp_zh') }}</label>
            <textarea v-model="form.description_zh" rows="3" class="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"></textarea>
          </div>
          
          <!-- Spicy Level -->
          <div class="sm:col-span-2 border rounded-md p-4 bg-muted/20">
            <div class="flex items-center mb-3">
              <input v-model="form.is_spicy" type="checkbox" id="is_spicy" class="h-4 w-4 rounded border-input text-primary focus:ring-primary">
              <label for="is_spicy" class="ml-2 block text-sm font-medium text-foreground">{{ $t('item_spicy') }}</label>
            </div>
            
            <div v-if="form.is_spicy" class="pl-6">
              <label class="block text-sm font-medium text-muted-foreground mb-2">{{ $t('item_spicy_level') }}</label>
              <div class="flex items-center gap-4">
                <input type="range" v-model="form.spicy_level" min="1" max="5" step="1" class="w-full max-w-xs accent-red-500">
                <span class="text-lg w-16 text-center font-bold text-red-500">{{ '🌶️'.repeat(form.spicy_level) }}</span>
              </div>
            </div>
          </div>
          
          <!-- Allergens -->
          <div class="sm:col-span-2">
            <label class="block text-sm font-medium text-foreground mb-3">{{ $t('item_allergens') }} <span class="text-xs font-normal text-muted-foreground">{{ $t('item_allergens_hint') }}</span></label>
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <label v-for="allergen in allAllergens" :key="allergen.id" class="relative flex items-center p-3 cursor-pointer rounded-lg border border-input hover:bg-muted/50 transition-colors" :class="selectedAllergens.includes(allergen.id) ? 'bg-primary/5 border-primary/50' : ''">
                <input type="checkbox" :value="allergen.id" v-model="selectedAllergens" class="h-4 w-4 rounded border-input text-primary focus:ring-primary">
                <span class="ml-2 flex flex-col">
                  <span class="text-sm font-medium text-foreground">{{ allergen.name_en }} {{ allergen.icon }}</span>
                  <span class="text-xs text-muted-foreground">{{ allergen.name_th }}</span>
                </span>
              </label>
            </div>
          </div>
          
          <!-- Customizations -->
          <div class="sm:col-span-2 mt-4" v-if="allGroups.length > 0">
            <label class="block text-sm font-medium text-foreground mb-3">{{ $t('item_customizations') }}</label>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label v-for="group in allGroups" :key="group.id" class="relative flex items-center p-3 cursor-pointer rounded-lg border border-input hover:bg-muted/50 transition-colors" :class="selectedGroups.includes(group.id) ? 'bg-primary/5 border-primary/50' : ''">
                <input type="checkbox" :value="group.id" v-model="selectedGroups" class="h-4 w-4 rounded border-input text-primary focus:ring-primary">
                <span class="ml-2 flex flex-col">
                  <span class="text-sm font-medium text-foreground">{{ group.name_th }} <span v-if="group.is_required" class="text-xs text-red-500 ml-1">({{ $t('cust_req_badge') }})</span></span>
                  <span class="text-xs text-muted-foreground" v-if="group.name_en">{{ group.name_en }}</span>
                </span>
              </label>
            </div>
          </div>
        </div>
      </div>
      
      <div v-if="errorMsg" class="rounded-md bg-destructive/10 p-4 border border-destructive/20 text-sm font-medium text-destructive">
        {{ errorMsg }}
      </div>
      
      <!-- Submit -->
      <div class="flex justify-end gap-3 pt-4 border-t">
        <NuxtLink to="/merchant/menu" class="inline-flex justify-center rounded-md border border-input bg-background py-2 px-6 text-sm font-medium text-foreground shadow-sm hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2">
          {{ $t('item_cancel') }}
        </NuxtLink>
        <button type="submit" :disabled="saving" class="inline-flex justify-center rounded-md border border-transparent bg-primary py-2 px-6 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50">
          {{ saving ? $t('item_saving_img') : $t('item_save') }}
        </button>
      </div>
    </form>
  </div>
</template>
