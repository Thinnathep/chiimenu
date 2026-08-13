<script setup lang="ts">
definePageMeta({
  layout: 'merchant',
  middleware: ['auth']
})

const user = useSupabaseUser()
const client = useSupabaseClient()

const loading = ref(true)
const store = ref<any>(null)
const categories = ref<any[]>([])
const newCategoryNameTh = ref('')
const newCategoryNameEn = ref('')
const newCategoryNameZh = ref('')
// const newCategoryNameNod = ref('')
const addingCategory = ref(false)
const isTranslating = ref(false)

onMounted(async () => {
  const { data: authData } = await client.auth.getUser()
  if (!authData?.user?.id) return
  
  // Get Store
  const { data: storeData } = await client
    .from('stores')
    .select('id')
    .eq('owner_id', authData.user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    
  store.value = storeData?.[0] || null
  
  if (store.value) {
    // 2. Get Categories
    await fetchCategories()
  }
  
  loading.value = false
})

const fetchCategories = async () => {
  const { data } = await client
    .from('menu_categories')
    .select('*')
    .eq('store_id', store.value.id)
    .order('sort_order', { ascending: true })
    
  categories.value = data || []
}

const addCategory = async () => {
  if (!newCategoryNameTh.value.trim() || !store.value) return
  
  addingCategory.value = true
  
  // Auto translate if missing
  if (!newCategoryNameEn.value || !newCategoryNameZh.value) {
    await translateCategory();
  }
  
  // Duplicate check
  const { count: dupCount } = await client
    .from('menu_categories')
    .select('*', { count: 'exact', head: true })
    .eq('store_id', store.value.id)
    .eq('name_th', newCategoryNameTh.value.trim())
    
  if (dupCount && dupCount > 0) {
    addingCategory.value = false
    const swal = useAlert()
    swal.fire({
      title: 'หมวดหมู่ซ้ำ',
      text: `คุณมีหมวดหมู่ชื่อ "${newCategoryNameTh.value}" ในร้านแล้ว กรุณาตั้งชื่ออื่น`,
      icon: 'error'
    })
    return
  }
  
  const { error } = await client.from('menu_categories').insert({
    store_id: store.value.id,
    name_th: newCategoryNameTh.value,
    name_en: newCategoryNameEn.value || null,
    name_zh: newCategoryNameZh.value || null,
    sort_order: categories.value.length
  } as any)
  
  addingCategory.value = false
  const swal = useAlert()
  
  if (!error) {
    swal.fire({
      title: 'สำเร็จ!',
      text: 'เพิ่มหมวดหมู่เรียบร้อยแล้ว',
      icon: 'success',
      timer: 1500,
      showConfirmButton: false
    })
    newCategoryNameTh.value = ''
    newCategoryNameEn.value = ''
    newCategoryNameZh.value = ''
    // newCategoryNameNod.value = ''
    await fetchCategories()
  } else {
    swal.fire('Error', 'ไม่สามารถเพิ่มหมวดหมู่ได้', 'error')
  }
}

const translateCategory = async () => {
  if (!newCategoryNameTh.value.trim()) return
  
  isTranslating.value = true
  try {
    const response = await fetch('/api/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        name_th: newCategoryNameTh.value,
        description_th: ''
      })
    })
    
    const data = await response.json()
    if (data.error) throw new Error(data.message)
    
    if (data) {
      if (data.name_en && !newCategoryNameEn.value) newCategoryNameEn.value = data.name_en
      if (data.name_zh && !newCategoryNameZh.value) newCategoryNameZh.value = data.name_zh
    }
  } catch (error: any) {
    const swal = useAlert()
    swal.fire({
      title: 'เตือน',
      text: 'การแปลอัตโนมัติล้มเหลว กรุณากรอกด้วยตนเอง',
      icon: 'warning',
      timer: 2000,
      showConfirmButton: false
    })
  } finally {
    isTranslating.value = false
  }
}

const deleteCategory = async (id: string) => {
  const swal = useAlert()
  const result = await swal.fire({
    title: 'ยืนยันการลบ?',
    text: "คุณจะไม่สามารถกู้คืนข้อมูลนี้ได้",
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#d33',
    cancelButtonColor: '#3085d6',
    confirmButtonText: 'ใช่, ลบเลย!',
    cancelButtonText: 'ยกเลิก'
  })
  
  if (!result.isConfirmed) return
  
  await client.from('menu_categories').delete().eq('id', id)
  await fetchCategories()
}
</script>

<template>
  <div class="w-full">
    <div class="mb-8 flex justify-between items-center">
      <div>
        <NuxtLink to="/merchant/menu" class="text-sm font-medium text-muted-foreground hover:text-foreground mb-4 inline-block">
          &larr; {{ $t('cat_back') }}
        </NuxtLink>
        <h1 class="text-2xl font-bold tracking-tight text-foreground">{{ $t('cat_title') }}</h1>
        <p class="text-muted-foreground mt-1">{{ $t('cat_desc') }}</p>
      </div>
    </div>

    <div v-if="loading" class="p-8 text-center text-muted-foreground">{{ $t('menu_list_loading') }}</div>
    
    <div v-else-if="!store" class="p-8 text-center bg-card rounded-lg border">
      {{ $t('menu_list_need_store') }}
    </div>

    <div v-else class="space-y-6">
      <!-- Add New Category -->
      <div class="bg-card shadow-sm border rounded-lg p-6">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-lg font-medium">{{ $t('cat_add_title') }}</h2>
          <button 
            @click.prevent="translateCategory"
            :disabled="isTranslating || !newCategoryNameTh"
            class="inline-flex items-center gap-1.5 rounded-full bg-purple-100 px-3 py-1 text-xs font-medium text-purple-700 hover:bg-purple-200 disabled:opacity-50 transition-colors"
          >
            <span v-if="isTranslating" class="w-3 h-3 border-2 border-purple-700 border-t-transparent rounded-full animate-spin"></span>
            ✨ แปลภาษาอัตโนมัติ (AI)
          </button>
        </div>
        <form @submit.prevent="addCategory" class="flex flex-col gap-4">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-foreground mb-1">{{ $t('cat_name_th') }} <span class="text-destructive">*</span></label>
              <input v-model="newCategoryNameTh" type="text" required class="block w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary">
            </div>
            <div>
              <label class="block text-sm font-medium text-foreground mb-1">{{ $t('cat_name_en') }}</label>
              <input v-model="newCategoryNameEn" type="text" class="block w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary">
            </div>
            <div>
              <label class="block text-sm font-medium text-foreground mb-1">{{ $t('cat_name_zh') }}</label>
              <input v-model="newCategoryNameZh" type="text" class="block w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary">
            </div>
            <!-- <div class="col-span-2">
              <label class="block text-sm font-medium text-foreground mb-1">{{ $t('cat_name_nod') }}</label>
              <input v-model="newCategoryNameNod" type="text" class="block w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary">
            </div> -->
          </div>
          <div class="flex justify-end">
            <button type="submit" :disabled="addingCategory || !newCategoryNameTh" class="inline-flex justify-center rounded-md border border-transparent bg-primary py-2 px-6 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 h-[38px]">
              {{ $t('cat_add_btn') }}
            </button>
          </div>
        </form>
      </div>

      <!-- Categories List -->
      <div class="bg-card shadow-sm border rounded-lg overflow-hidden">
        <div v-if="categories.length === 0" class="p-8 text-center text-muted-foreground">
          {{ $t('cat_empty') }}
        </div>
        <ul v-else class="divide-y divide-border">
          <li v-for="cat in categories" :key="cat.id" class="p-4 flex items-center justify-between hover:bg-muted/20">
            <div>
              <div class="font-medium text-foreground">{{ cat.name_th }}</div>
              <div class="text-sm text-muted-foreground" v-if="cat.name_en">{{ cat.name_en }}</div>
            </div>
            <div class="flex items-center gap-3">
              <!-- TODO: Edit button / Sort buttons -->
              <button @click="deleteCategory(cat.id)" class="text-destructive hover:text-destructive/80 text-sm font-medium">{{ $t('cat_delete') }}</button>
            </div>
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>
