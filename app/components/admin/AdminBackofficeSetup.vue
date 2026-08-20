<script setup lang="ts">
import { 
  Store, 
  Utensils, 
  FolderTree, 
  Sliders, 
  Settings, 
  Smartphone, 
  Tablet, 
  Monitor, 
  Plus, 
  Edit2, 
  Trash2, 
  Sparkles, 
  Image, 
  Check, 
  X, 
  Search, 
  RefreshCw, 
  ExternalLink, 
  AlertCircle, 
  CheckCircle2, 
  ChevronDown, 
  ChevronUp, 
  Globe, 
  Flame, 
  ShieldAlert, 
  MessageCircle, 
  Phone, 
  Eye, 
  Save, 
  Upload
} from 'lucide-vue-next'

const props = defineProps<{
  stores: any[]
  initialStoreId?: string
}>()

const client = useSupabaseClient()
const selectedStoreId = ref<string>(props.initialStoreId || '')
const currentStore = computed(() => props.stores.find(s => s.id === selectedStoreId.value) || null)

// Active Sub-tab inside Backoffice Setup
const activeSubTab = ref<'menu' | 'categories' | 'customizations' | 'store_info' | 'preview'>('menu')

// Loading states
const loading = ref(false)
const saving = ref(false)
const isTranslating = ref(false)

// Data state for current store
const menuItems = ref<any[]>([])
const categories = ref<any[]>([])
const customizationGroups = ref<any[]>([])
const allAllergens = ref<any[]>([])

// Dish Search & Filter
const dishSearchQuery = ref('')
const dishCategoryFilter = ref<string>('all')

// Dish Modal State
const showDishModal = ref(false)
const isEditingDish = ref(false)
const editingDishId = ref<string | null>(null)
const dishForm = ref({
  category_id: '',
  name_th: '',
  name_en: '',
  name_zh: '',
  description_th: '',
  description_en: '',
  description_zh: '',
  price: '',
  is_available: true,
  is_spicy: false,
  spicy_level: 0,
  photo_url: ''
})
const selectedDishAllergens = ref<string[]>([])
const selectedDishGroups = ref<string[]>([])
const photoFile = ref<File | null>(null)
const photoPreview = ref('')

// Category Modal State
const showCategoryModal = ref(false)
const isEditingCategory = ref(false)
const editingCategoryId = ref<string | null>(null)
const categoryForm = ref({
  name_th: '',
  name_en: '',
  name_zh: '',
  sort_order: 0,
  is_active: true
})

// Customization Group Modal State
const showGroupModal = ref(false)
const isEditingGroup = ref(false)
const editingGroupId = ref<string | null>(null)
const groupForm = ref({
  name_th: '',
  name_en: '',
  name_zh: '',
  is_required: false
})
const groupOptions = ref<any[]>([])

// Store Info Form State
const storeForm = ref({
  name: '',
  name_en: '',
  name_zh: '',
  slug: '',
  phone: '',
  line_user_id: '',
  description: '',
  is_active: true,
  logo_url: '',
  cover_url: ''
})
const logoFile = ref<File | null>(null)
const logoPreview = ref('')
const coverFile = ref<File | null>(null)
const coverPreview = ref('')

// Simulator Device Frame
const simulatorDevice = ref<'mobile' | 'tablet'>('mobile')
const simulatorLang = ref<'th' | 'en' | 'zh'>('th')
const baseUrl = ref('http://localhost:3000')

onMounted(async () => {
  if (process.client) {
    baseUrl.value = window.location.origin
  }

  if (!selectedStoreId.value && props.stores.length > 0) {
    selectedStoreId.value = props.stores[0].id
  }

  if (selectedStoreId.value) {
    await fetchStoreData()
  }
})

watch(() => props.initialStoreId, (newId) => {
  if (newId && newId !== selectedStoreId.value) {
    selectedStoreId.value = newId
    fetchStoreData()
  }
})

watch(selectedStoreId, () => {
  fetchStoreData()
})

const fetchStoreData = async () => {
  if (!selectedStoreId.value) return
  loading.value = true

  // Sync Store info form
  if (currentStore.value) {
    storeForm.value = {
      name: currentStore.value.name || '',
      name_en: currentStore.value.name_en || '',
      name_zh: currentStore.value.name_zh || '',
      slug: currentStore.value.slug || '',
      phone: currentStore.value.phone || '',
      line_user_id: currentStore.value.line_user_id || '',
      description: currentStore.value.description || '',
      is_active: currentStore.value.is_active ?? true,
      logo_url: currentStore.value.logo_url || '',
      cover_url: currentStore.value.cover_url || ''
    }
  }

  try {
    const [itemsRes, catsRes, groupsRes, allergensRes] = await Promise.all([
      client.from('menu_items').select('*, menu_item_allergens(allergen_id), menu_item_customizations(group_id)').eq('store_id', selectedStoreId.value).order('created_at', { ascending: false }),
      client.from('menu_categories').select('*').eq('store_id', selectedStoreId.value).order('sort_order', { ascending: true }),
      client.from('customization_groups').select('*, customization_options(*)').eq('store_id', selectedStoreId.value).order('created_at', { ascending: true }),
      client.from('allergens').select('*')
    ])

    menuItems.value = itemsRes.data || []
    categories.value = catsRes.data || []
    customizationGroups.value = groupsRes.data || []
    allAllergens.value = allergensRes.data || []
  } catch (err) {
    console.error('Fetch store data error:', err)
  } finally {
    loading.value = false
  }
}

// Filtered Dishes
const filteredDishes = computed(() => {
  return menuItems.value.filter(dish => {
    const matchSearch = !dishSearchQuery.value || 
      (dish.name_th && dish.name_th.toLowerCase().includes(dishSearchQuery.value.toLowerCase())) ||
      (dish.name_en && dish.name_en.toLowerCase().includes(dishSearchQuery.value.toLowerCase())) ||
      (dish.name_zh && dish.name_zh.toLowerCase().includes(dishSearchQuery.value.toLowerCase()))

    const matchCategory = dishCategoryFilter.value === 'all' || dish.category_id === dishCategoryFilter.value
    return matchSearch && matchCategory
  })
})

// Quick Toggle Dish Availability
const toggleDishAvailable = async (dish: any) => {
  const newStatus = !dish.is_available
  dish.is_available = newStatus
  await (client as any).from('menu_items').update({ is_available: newStatus }).eq('id', dish.id)
  useToast().info(newStatus ? `เปิดขาย ${dish.name_th}` : `ปิดขายชั่วคราว ${dish.name_th}`)
}

// AI Auto-Translate for Dishes
const translateDishAI = async () => {
  if (!dishForm.value.name_th) {
    useToast().warning('กรุณากรอกชื่อเมนูภาษาไทยก่อนกดแปลภาษา AI')
    return
  }

  isTranslating.value = true
  try {
    const res = await $fetch<any>('/api/translate', {
      method: 'POST',
      body: {
        name_th: dishForm.value.name_th,
        description_th: dishForm.value.description_th || ''
      }
    })

    if (res?.success && res?.data) {
      dishForm.value.name_en = res.data.name_en || dishForm.value.name_en
      dishForm.value.name_zh = res.data.name_zh || dishForm.value.name_zh
      dishForm.value.description_en = res.data.desc_en || dishForm.value.description_en
      dishForm.value.description_zh = res.data.desc_zh || dishForm.value.description_zh
      useToast().success('AI แปลภาษาอังกฤษและจีนสำเร็จ!')
    } else {
      useToast().error('ไม่สามารถแปลภาษาได้')
    }
  } catch (err: any) {
    useToast().error('Translation error: ' + err.message)
  } finally {
    isTranslating.value = false
  }
}

// Open Dish Create Modal
const openCreateDish = () => {
  isEditingDish.value = false
  editingDishId.value = null
  dishForm.value = {
    category_id: categories.value[0]?.id || '',
    name_th: '',
    name_en: '',
    name_zh: '',
    description_th: '',
    description_en: '',
    description_zh: '',
    price: '',
    is_available: true,
    is_spicy: false,
    spicy_level: 0,
    photo_url: ''
  }
  selectedDishAllergens.value = []
  selectedDishGroups.value = []
  photoFile.value = null
  photoPreview.value = ''
  showDishModal.value = true
}

// Open Dish Edit Modal
const openEditDish = (dish: any) => {
  isEditingDish.value = true
  editingDishId.value = dish.id
  dishForm.value = {
    category_id: dish.category_id || '',
    name_th: dish.name_th || '',
    name_en: dish.name_en || '',
    name_zh: dish.name_zh || '',
    description_th: dish.description_th || '',
    description_en: dish.description_en || '',
    description_zh: dish.description_zh || '',
    price: dish.price?.toString() || '',
    is_available: dish.is_available ?? true,
    is_spicy: dish.is_spicy ?? false,
    spicy_level: dish.spicy_level || 0,
    photo_url: dish.photo_url || ''
  }
  selectedDishAllergens.value = (dish.menu_item_allergens || []).map((a: any) => a.allergen_id)
  selectedDishGroups.value = (dish.menu_item_customizations || []).map((g: any) => g.group_id)
  photoFile.value = null
  photoPreview.value = dish.photo_url || ''
  showDishModal.value = true
}

const handleDishPhoto = (e: Event) => {
  const target = e.target as HTMLInputElement
  if (target.files && target.files[0]) {
    const file = target.files[0]
    photoFile.value = file
    photoPreview.value = URL.createObjectURL(file)
  }
}

// Save Dish (Create or Update)
const saveDish = async () => {
  if (!dishForm.value.name_th || !dishForm.value.price) {
    useToast().warning('กรุณาระบุชื่อเมนูภาษาไทยและราคาอาหาร')
    return
  }

  saving.value = true
  try {
    let finalPhotoUrl = dishForm.value.photo_url

    if (photoFile.value) {
      const ext = photoFile.value.name.split('.').pop()
      const fileName = `dish_${selectedStoreId.value}_${Date.now()}.${ext}`
      const { data: uploadData, error: uploadErr } = await client.storage
        .from('chiimenu-images')
        .upload(fileName, photoFile.value, { upsert: true })

      if (!uploadErr && uploadData) {
        const { data: publicUrlData } = client.storage
          .from('chiimenu-images')
          .getPublicUrl(uploadData.path)
        finalPhotoUrl = publicUrlData.publicUrl
      }
    }

    const payload = {
      store_id: selectedStoreId.value,
      category_id: dishForm.value.category_id || null,
      name_th: dishForm.value.name_th,
      name_en: dishForm.value.name_en || null,
      name_zh: dishForm.value.name_zh || null,
      description_th: dishForm.value.description_th || null,
      description_en: dishForm.value.description_en || null,
      description_zh: dishForm.value.description_zh || null,
      price: parseFloat(dishForm.value.price),
      is_available: dishForm.value.is_available,
      is_spicy: dishForm.value.is_spicy,
      spicy_level: dishForm.value.is_spicy ? dishForm.value.spicy_level : 0,
      photo_url: finalPhotoUrl || null
    }

    let dishId = editingDishId.value

    if (isEditingDish.value && dishId) {
      await (client as any).from('menu_items').update(payload).eq('id', dishId)
      useToast().success(`อัปเดตเมนู ${dishForm.value.name_th} เรียบร้อย!`)
    } else {
      const { data: inserted, error: insertErr } = await (client as any)
        .from('menu_items')
        .insert(payload)
        .select()
        .single()
      if (insertErr) throw insertErr
      dishId = inserted.id
      useToast().success(`เพิ่มเมนู ${dishForm.value.name_th} สำเร็จ!`)
    }

    if (dishId) {
      await (client as any).from('menu_item_allergens').delete().eq('menu_item_id', dishId)
      if (selectedDishAllergens.value.length > 0) {
        const rows = selectedDishAllergens.value.map(aId => ({
          menu_item_id: dishId,
          allergen_id: aId
        }))
        await (client as any).from('menu_item_allergens').insert(rows)
      }

      await (client as any).from('menu_item_customizations').delete().eq('menu_item_id', dishId)
      if (selectedDishGroups.value.length > 0) {
        const gRows = selectedDishGroups.value.map(gId => ({
          menu_item_id: dishId,
          group_id: gId
        }))
        await (client as any).from('menu_item_customizations').insert(gRows)
      }
    }

    showDishModal.value = false
    await fetchStoreData()
  } catch (err: any) {
    console.error('Save dish error:', err)
    useToast().error('เกิดข้อผิดพลาดในการบันทึกเมนู: ' + err.message)
  } finally {
    saving.value = false
  }
}

// Delete Dish
const deleteDish = async (dish: any) => {
  if (!confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบเมนู "${dish.name_th}"?`)) return
  await (client as any).from('menu_items').delete().eq('id', dish.id)
  useToast().success(`ลบเมนู ${dish.name_th} เรียบร้อยแล้ว`)
  await fetchStoreData()
}

// CATEGORIES CRUD
const openCreateCategory = () => {
  isEditingCategory.value = false
  editingCategoryId.value = null
  categoryForm.value = {
    name_th: '',
    name_en: '',
    name_zh: '',
    sort_order: categories.value.length,
    is_active: true
  }
  showCategoryModal.value = true
}

const openEditCategory = (cat: any) => {
  isEditingCategory.value = true
  editingCategoryId.value = cat.id
  categoryForm.value = {
    name_th: cat.name_th || '',
    name_en: cat.name_en || '',
    name_zh: cat.name_zh || '',
    sort_order: cat.sort_order || 0,
    is_active: cat.is_active ?? true
  }
  showCategoryModal.value = true
}

const saveCategory = async () => {
  if (!categoryForm.value.name_th) {
    useToast().warning('กรุณากรอกชื่อหมวดหมู่ภาษาไทย')
    return
  }

  saving.value = true
  try {
    const payload = {
      store_id: selectedStoreId.value,
      name_th: categoryForm.value.name_th,
      name_en: categoryForm.value.name_en || null,
      name_zh: categoryForm.value.name_zh || null,
      sort_order: categoryForm.value.sort_order,
      is_active: categoryForm.value.is_active
    }

    if (isEditingCategory.value && editingCategoryId.value) {
      await (client as any).from('menu_categories').update(payload).eq('id', editingCategoryId.value)
      useToast().success('อัปเดตหมวดหมู่เรียบร้อย!')
    } else {
      await (client as any).from('menu_categories').insert(payload)
      useToast().success('สร้างหมวดหมู่ใหม่สำเร็จ!')
    }

    showCategoryModal.value = false
    await fetchStoreData()
  } catch (err: any) {
    useToast().error('Save category error: ' + err.message)
  } finally {
    saving.value = false
  }
}

const deleteCategory = async (cat: any) => {
  if (!confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบหมวดหมู่ "${cat.name_th}"?`)) return
  await (client as any).from('menu_categories').delete().eq('id', cat.id)
  useToast().success('ลบหมวดหมู่เรียบร้อยแล้ว')
  await fetchStoreData()
}

// Re-order Category Sort
const moveCategory = async (cat: any, direction: 'up' | 'down') => {
  const idx = categories.value.findIndex(c => c.id === cat.id)
  if (idx < 0) return
  if (direction === 'up' && idx === 0) return
  if (direction === 'down' && idx === categories.value.length - 1) return

  const targetIdx = direction === 'up' ? idx - 1 : idx + 1
  const otherCat = categories.value[targetIdx]

  const currentOrder = cat.sort_order || 0
  const otherOrder = otherCat.sort_order || 0

  await Promise.all([
    (client as any).from('menu_categories').update({ sort_order: otherOrder }).eq('id', cat.id),
    (client as any).from('menu_categories').update({ sort_order: currentOrder }).eq('id', otherCat.id)
  ])

  await fetchStoreData()
}

// CUSTOMIZATION GROUPS CRUD
const openCreateGroup = () => {
  isEditingGroup.value = false
  editingGroupId.value = null
  groupForm.value = {
    name_th: '',
    name_en: '',
    name_zh: '',
    is_required: false
  }
  groupOptions.value = [
    { name_th: '', name_en: '', name_zh: '', extra_price: 0 }
  ]
  showGroupModal.value = true
}

const openEditGroup = (grp: any) => {
  isEditingGroup.value = true
  editingGroupId.value = grp.id
  groupForm.value = {
    name_th: grp.name_th || '',
    name_en: grp.name_en || '',
    name_zh: grp.name_zh || '',
    is_required: grp.is_required ?? false
  }
  groupOptions.value = (grp.customization_options || []).map((o: any) => ({
    id: o.id,
    name_th: o.name_th || '',
    name_en: o.name_en || '',
    name_zh: o.name_zh || '',
    extra_price: o.extra_price || 0
  }))
  if (groupOptions.value.length === 0) {
    groupOptions.value.push({ name_th: '', name_en: '', name_zh: '', extra_price: 0 })
  }
  showGroupModal.value = true
}

const addOptionRow = () => {
  groupOptions.value.push({ name_th: '', name_en: '', name_zh: '', extra_price: 0 })
}

const removeOptionRow = (index: number) => {
  groupOptions.value.splice(index, 1)
}

const saveGroup = async () => {
  if (!groupForm.value.name_th) {
    useToast().warning('กรุณากรอกชื่อกลุ่มตัวเลือกเสริมภาษาไทย')
    return
  }

  saving.value = true
  try {
    const payload = {
      store_id: selectedStoreId.value,
      name_th: groupForm.value.name_th,
      name_en: groupForm.value.name_en || null,
      name_zh: groupForm.value.name_zh || null,
      is_required: groupForm.value.is_required
    }

    let gId = editingGroupId.value

    if (isEditingGroup.value && gId) {
      await (client as any).from('customization_groups').update(payload).eq('id', gId)
      useToast().success('อัปเดตกลุ่มตัวเลือกเสริมเรียบร้อย!')
    } else {
      const { data: inserted, error: insertErr } = await (client as any)
        .from('customization_groups')
        .insert(payload)
        .select()
        .single()
      if (insertErr) throw insertErr
      gId = inserted.id
      useToast().success('สร้างกลุ่มตัวเลือกเสริมใหม่สำเร็จ!')
    }

    if (gId) {
      await (client as any).from('customization_options').delete().eq('group_id', gId)
      const validOptions = groupOptions.value.filter(o => o.name_th && o.name_th.trim())
      if (validOptions.length > 0) {
        const oRows = validOptions.map((o, idx) => ({
          group_id: gId,
          name_th: o.name_th,
          name_en: o.name_en || null,
          name_zh: o.name_zh || null,
          extra_price: parseFloat(o.extra_price) || 0,
          sort_order: idx
        }))
        await (client as any).from('customization_options').insert(oRows)
      }
    }

    showGroupModal.value = false
    await fetchStoreData()
  } catch (err: any) {
    useToast().error('Save group error: ' + err.message)
  } finally {
    saving.value = false
  }
}

const deleteGroup = async (grp: any) => {
  if (!confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบกลุ่ม "${grp.name_th}"?`)) return
  await (client as any).from('customization_groups').delete().eq('id', grp.id)
  useToast().success('ลบกลุ่มตัวเลือกเสริมเรียบร้อยแล้ว')
  await fetchStoreData()
}

// SAVE STORE PROFILE & CONTACT
const saveStoreProfile = async () => {
  if (!selectedStoreId.value) return
  saving.value = true

  try {
    let finalLogoUrl = storeForm.value.logo_url
    let finalCoverUrl = storeForm.value.cover_url

    if (logoFile.value) {
      const ext = logoFile.value.name.split('.').pop()
      const fileName = `logo_${selectedStoreId.value}_${Date.now()}.${ext}`
      const { data: up, error: err } = await client.storage
        .from('store_assets')
        .upload(fileName, logoFile.value, { upsert: true })
      if (!err && up) {
        finalLogoUrl = client.storage.from('store_assets').getPublicUrl(up.path).data.publicUrl
      }
    }

    if (coverFile.value) {
      const ext = coverFile.value.name.split('.').pop()
      const fileName = `cover_${selectedStoreId.value}_${Date.now()}.${ext}`
      const { data: up, error: err } = await client.storage
        .from('store_assets')
        .upload(fileName, coverFile.value, { upsert: true })
      if (!err && up) {
        finalCoverUrl = client.storage.from('store_assets').getPublicUrl(up.path).data.publicUrl
      }
    }

    const payload = {
      name: storeForm.value.name,
      name_en: storeForm.value.name_en || null,
      name_zh: storeForm.value.name_zh || null,
      slug: storeForm.value.slug,
      phone: storeForm.value.phone || null,
      line_user_id: storeForm.value.line_user_id || null,
      description: storeForm.value.description || null,
      is_active: storeForm.value.is_active,
      logo_url: finalLogoUrl || null,
      cover_url: finalCoverUrl || null,
      updated_at: new Date().toISOString()
    }

    const { error } = await (client as any).from('stores').update(payload).eq('id', selectedStoreId.value)
    if (error) throw error

    useToast().success('บันทึกข้อมูลร้านค้า & การตั้งค่า LINE OA สำเร็จ!')
    await fetchStoreData()
  } catch (err: any) {
    console.error('Save store profile error:', err)
    useToast().error('ไม่สามารถบันทึกข้อมูลร้านค้าได้: ' + err.message)
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="space-y-6">
    <!-- Top Store Banner & Sub-Navigation -->
    <div class="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#132525] border border-[#E8E2D9] dark:border-[#1B4B4A] shadow-sm space-y-4 transition-colors">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div class="flex items-center gap-3.5">
          <div class="w-12 h-12 rounded-xl bg-gradient-to-tr from-[#1B4B4A] to-[#E8572E] p-0.5 shadow-md shrink-0">
            <div class="w-full h-full bg-gray-50 dark:bg-black rounded-xl overflow-hidden flex items-center justify-center">
              <img v-if="currentStore?.logo_url" :src="currentStore.logo_url" alt="Logo" class="w-full h-full object-cover" />
              <Store v-else class="w-6 h-6 text-[#E8572E]" />
            </div>
          </div>
          <div>
            <div class="flex items-center gap-2 flex-wrap">
              <h2 class="text-base sm:text-lg font-bold text-gray-900 dark:text-white">{{ currentStore?.name || 'เลือกร้านค้า' }}</h2>
              <span class="text-xs px-2 py-0.5 rounded-full bg-[#E8572E]/15 text-[#E8572E] font-mono font-bold">
                /m/{{ currentStore?.slug }}
              </span>
              <span 
                class="text-[10px] px-2 py-0.5 rounded-full font-bold"
                :class="currentStore?.is_active ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' : 'bg-red-500/15 text-red-600 dark:text-red-400'"
              >
                {{ currentStore?.is_active ? 'ร้านเปิดบริการ' : 'ร้านปิดชั่วคราว' }}
              </span>
            </div>
            <p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              ระบบจัดทำหลังบ้านแบบ Done-For-You: จัดการเมนู หมวดหมู่ ตัวเลือกเสริม และดูพรีวิวสด
            </p>
          </div>
        </div>

        <!-- Store Switcher -->
        <div class="flex items-center gap-2">
          <label class="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">เลือกร้าน:</label>
          <select 
            v-model="selectedStoreId"
            class="px-3 py-2 rounded-xl bg-gray-50 dark:bg-black/40 border border-gray-300 dark:border-white/10 text-gray-900 dark:text-white text-xs sm:text-sm font-medium focus:ring-2 focus:ring-[#E8572E] outline-none transition-colors"
          >
            <option v-for="s in stores" :key="s.id" :value="s.id">
              {{ s.name }} ({{ s.slug }})
            </option>
          </select>
        </div>
      </div>

      <!-- Sub-Tab Navigation Bar -->
      <div class="flex items-center gap-1.5 overflow-x-auto pt-2 border-t border-gray-100 dark:border-white/10 no-scrollbar">
        <button 
          @click="activeSubTab = 'menu'"
          class="px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer"
          :class="activeSubTab === 'menu' ? 'bg-[#E8572E] text-white shadow-md shadow-[#E8572E]/20' : 'bg-gray-50 dark:bg-black/30 hover:bg-gray-100 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-white/10'"
        >
          <Utensils class="w-3.5 h-3.5" />
          <span>1. เมนูอาหาร ({{ menuItems.length }})</span>
        </button>

        <button 
          @click="activeSubTab = 'categories'"
          class="px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer"
          :class="activeSubTab === 'categories' ? 'bg-[#E8572E] text-white shadow-md shadow-[#E8572E]/20' : 'bg-gray-50 dark:bg-black/30 hover:bg-gray-100 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-white/10'"
        >
          <FolderTree class="w-3.5 h-3.5" />
          <span>2. หมวดหมู่อาหาร ({{ categories.length }})</span>
        </button>

        <button 
          @click="activeSubTab = 'customizations'"
          class="px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer"
          :class="activeSubTab === 'customizations' ? 'bg-[#E8572E] text-white shadow-md shadow-[#E8572E]/20' : 'bg-gray-50 dark:bg-black/30 hover:bg-gray-100 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-white/10'"
        >
          <Sliders class="w-3.5 h-3.5" />
          <span>3. ตัวเลือกเสริม & ท็อปปิ้ง ({{ customizationGroups.length }})</span>
        </button>

        <button 
          @click="activeSubTab = 'store_info'"
          class="px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer"
          :class="activeSubTab === 'store_info' ? 'bg-[#E8572E] text-white shadow-md shadow-[#E8572E]/20' : 'bg-gray-50 dark:bg-black/30 hover:bg-gray-100 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-white/10'"
        >
          <Settings class="w-3.5 h-3.5" />
          <span>4. ข้อมูลร้าน & LINE OA</span>
        </button>

        <button 
          @click="activeSubTab = 'preview'"
          class="px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ml-auto bg-gradient-to-r from-[#1B4B4A] to-[#E8572E] text-white shadow-md hover:opacity-95"
        >
          <Eye class="w-3.5 h-3.5" />
          <span>📱 Live Simulator Preview</span>
        </button>
      </div>
    </div>

    <!-- SUB-TAB 1: MENU ITEMS MANAGER -->
    <div v-if="activeSubTab === 'menu'" class="space-y-4">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <!-- Search & Category Filters -->
        <div class="flex flex-wrap items-center gap-2 flex-1">
          <div class="relative flex-1 min-w-[200px] max-w-sm">
            <Search class="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              v-model="dishSearchQuery" 
              type="text" 
              placeholder="ค้นหาชื่อเมนู (ไทย, EN, จีน)..." 
              class="w-full pl-9 pr-3 py-2 rounded-xl bg-white dark:bg-[#132525] border border-gray-300 dark:border-[#1B4B4A] text-xs text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-1 focus:ring-[#E8572E] outline-none transition-colors"
            />
          </div>

          <select 
            v-model="dishCategoryFilter"
            class="px-3 py-2 rounded-xl bg-white dark:bg-[#132525] border border-gray-300 dark:border-[#1B4B4A] text-gray-900 dark:text-white text-xs font-medium focus:ring-1 focus:ring-[#E8572E] outline-none transition-colors"
          >
            <option value="all">ทุกหมวดหมู่ (All)</option>
            <option v-for="c in categories" :key="c.id" :value="c.id">{{ c.name_th }}</option>
          </select>
        </div>

        <!-- Add Dish Button -->
        <button 
          @click="openCreateDish"
          class="px-4 py-2.5 rounded-xl bg-[#E8572E] hover:bg-[#E8572E]/90 text-white font-bold text-xs shadow-md shadow-[#E8572E]/20 transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
        >
          <Plus class="w-4 h-4" />
          <span>เพิ่มเมนูอาหารใหม่</span>
        </button>
      </div>

      <!-- Loading Dishes -->
      <div v-if="loading" class="p-12 text-center text-gray-400 bg-white dark:bg-[#132525] border border-gray-200 dark:border-[#1B4B4A] rounded-2xl">
        <RefreshCw class="w-6 h-6 animate-spin mx-auto mb-2 text-[#E8572E]" />
        <span class="text-xs">กำลังโหลดรายการอาหาร...</span>
      </div>

      <!-- Empty Dishes -->
      <div v-else-if="filteredDishes.length === 0" class="p-12 text-center text-gray-500 bg-white dark:bg-[#132525] border border-dashed border-gray-300 dark:border-[#1B4B4A] rounded-2xl">
        <Utensils class="w-12 h-12 mx-auto mb-2 opacity-30" />
        <p class="text-sm font-bold text-gray-800 dark:text-gray-200">ไม่พบรายการอาหารในหมวดนี้</p>
        <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">คลิกปุ่ม "เพิ่มเมนูอาหารใหม่" ด้านบนเพื่อเริ่มจัดทำเมนูให้ร้าน</p>
      </div>

      <!-- Dishes Grid -->
      <div v-else class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        <div 
          v-for="dish in filteredDishes" 
          :key="dish.id"
          class="p-4 rounded-2xl bg-white dark:bg-[#132525] border border-gray-200 dark:border-[#1B4B4A] shadow-sm flex flex-col justify-between gap-3 hover:border-[#E8572E]/50 transition-all relative overflow-hidden"
          :class="!dish.is_available ? 'opacity-70 bg-gray-50 dark:bg-muted/20' : ''"
        >
          <div class="flex items-start gap-3">
            <!-- Dish Photo Thumbnail -->
            <div class="w-16 h-16 rounded-xl bg-gray-100 dark:bg-black/40 overflow-hidden shrink-0 border border-gray-200 dark:border-white/10 flex items-center justify-center">
              <img v-if="dish.photo_url" :src="dish.photo_url" alt="Dish" class="w-full h-full object-cover" />
              <Utensils v-else class="w-6 h-6 opacity-30 text-gray-400" />
            </div>

            <!-- Dish Info -->
            <div class="flex-1 min-w-0">
              <div class="flex items-center justify-between gap-1">
                <h4 class="font-bold text-gray-900 dark:text-white text-sm truncate" :title="dish.name_th">
                  {{ dish.name_th }}
                </h4>
                <span class="text-xs font-bold text-[#E8572E] font-mono shrink-0">
                  ฿{{ dish.price }}
                </span>
              </div>

              <!-- Translations preview -->
              <p class="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
                <span v-if="dish.name_en">{{ dish.name_en }}</span>
                <span v-if="dish.name_zh" class="text-gray-400"> • {{ dish.name_zh }}</span>
              </p>

              <!-- Tags: Spicy, Category, Allergens -->
              <div class="flex items-center gap-1.5 flex-wrap mt-2">
                <span v-if="dish.is_spicy" class="text-[10px] px-1.5 py-0.5 rounded bg-red-500/15 text-red-600 dark:text-red-400 font-bold flex items-center gap-0.5">
                  <Flame class="w-3 h-3" /> เผ็ดระดับ {{ dish.spicy_level || 1 }}
                </span>
                <span v-if="dish.menu_item_allergens?.length" class="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-700 dark:text-amber-300 font-semibold">
                  {{ dish.menu_item_allergens.length }} สารก่อภูมิแพ้
                </span>
                <span v-if="dish.menu_item_customizations?.length" class="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-700 dark:text-blue-300 font-semibold">
                  {{ dish.menu_item_customizations.length }} ตัวเลือกเสริม
                </span>
              </div>
            </div>
          </div>

          <!-- Bottom Actions -->
          <div class="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-white/10 text-xs">
            <button 
              @click="toggleDishAvailable(dish)"
              class="px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer"
              :class="dish.is_available ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/25' : 'bg-red-500/15 text-red-600 dark:text-red-400 hover:bg-red-500/25'"
            >
              {{ dish.is_available ? '✓ พร้อมขาย' : '✕ หมดชั่วคราว' }}
            </button>

            <div class="flex items-center gap-1">
              <button 
                @click="openEditDish(dish)"
                class="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-all cursor-pointer"
                title="แก้ไขเมนู"
              >
                <Edit2 class="w-3.5 h-3.5" />
              </button>
              <button 
                @click="deleteDish(dish)"
                class="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 transition-all cursor-pointer"
                title="ลบเมนู"
              >
                <Trash2 class="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- SUB-TAB 2: CATEGORIES MANAGER -->
    <div v-else-if="activeSubTab === 'categories'" class="space-y-4">
      <div class="flex items-center justify-between">
        <div>
          <h3 class="font-bold text-gray-900 dark:text-white text-sm">หมวดหมู่อาหาร (Categories)</h3>
          <p class="text-xs text-gray-500 dark:text-gray-400">จัดเรียงลำดับการแสดงผลหมวดหมู่ในหน้าเมนู 3 ภาษา</p>
        </div>

        <button 
          @click="openCreateCategory"
          class="px-4 py-2 rounded-xl bg-[#E8572E] hover:bg-[#E8572E]/90 text-white font-bold text-xs shadow-md shadow-[#E8572E]/20 transition-all flex items-center gap-1.5 cursor-pointer"
        >
          <Plus class="w-4 h-4" />
          <span>สร้างหมวดหมู่ใหม่</span>
        </button>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div 
          v-for="(cat, idx) in categories" 
          :key="cat.id"
          class="p-4 rounded-2xl bg-white dark:bg-[#132525] border border-gray-200 dark:border-[#1B4B4A] shadow-sm flex items-center justify-between gap-3"
        >
          <div class="flex items-center gap-3">
            <div class="flex flex-col gap-1">
              <button 
                @click="moveCategory(cat, 'up')" 
                :disabled="idx === 0"
                class="p-1 rounded hover:bg-gray-100 dark:hover:bg-white/10 disabled:opacity-20 text-gray-700 dark:text-gray-300 cursor-pointer"
              >
                <ChevronUp class="w-3.5 h-3.5" />
              </button>
              <button 
                @click="moveCategory(cat, 'down')" 
                :disabled="idx === categories.length - 1"
                class="p-1 rounded hover:bg-gray-100 dark:hover:bg-white/10 disabled:opacity-20 text-gray-700 dark:text-gray-300 cursor-pointer"
              >
                <ChevronDown class="w-3.5 h-3.5" />
              </button>
            </div>

            <div>
              <div class="flex items-center gap-2">
                <h4 class="font-bold text-gray-900 dark:text-white text-sm">{{ cat.name_th }}</h4>
                <span class="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 dark:bg-black/40 text-gray-600 dark:text-gray-400 font-mono font-bold">
                  ลำดับ {{ cat.sort_order }}
                </span>
              </div>
              <p class="text-xs text-gray-500 dark:text-gray-400">
                <span v-if="cat.name_en">{{ cat.name_en }}</span>
                <span v-if="cat.name_zh"> • {{ cat.name_zh }}</span>
              </p>
            </div>
          </div>

          <div class="flex items-center gap-1">
            <button 
              @click="openEditCategory(cat)"
              class="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300 transition-all cursor-pointer"
            >
              <Edit2 class="w-4 h-4" />
            </button>
            <button 
              @click="deleteCategory(cat)"
              class="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 transition-all cursor-pointer"
            >
              <Trash2 class="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- SUB-TAB 3: CUSTOMIZATIONS MANAGER -->
    <div v-else-if="activeSubTab === 'customizations'" class="space-y-4">
      <div class="flex items-center justify-between">
        <div>
          <h3 class="font-bold text-gray-900 dark:text-white text-sm">กลุ่มตัวเลือกเสริม & ท็อปปิ้ง (Customizations)</h3>
          <p class="text-xs text-gray-500 dark:text-gray-400">สร้างกลุ่มตัวเลือก (เช่น เนื้อสัตว์, ความหวาน, ท็อปปิ้ง) และกำหนดราคาบวกเพิ่ม</p>
        </div>

        <button 
          @click="openCreateGroup"
          class="px-4 py-2 rounded-xl bg-[#E8572E] hover:bg-[#E8572E]/90 text-white font-bold text-xs shadow-md shadow-[#E8572E]/20 transition-all flex items-center gap-1.5 cursor-pointer"
        >
          <Plus class="w-4 h-4" />
          <span>สร้างกลุ่มตัวเลือกใหม่</span>
        </button>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div 
          v-for="grp in customizationGroups" 
          :key="grp.id"
          class="p-5 rounded-2xl bg-white dark:bg-[#132525] border border-gray-200 dark:border-[#1B4B4A] shadow-sm space-y-3"
        >
          <div class="flex items-start justify-between">
            <div>
              <div class="flex items-center gap-2">
                <h4 class="font-bold text-gray-900 dark:text-white text-sm">{{ grp.name_th }}</h4>
                <span 
                  class="text-[10px] px-2 py-0.5 rounded-full font-bold"
                  :class="grp.is_required ? 'bg-red-500/15 text-red-600 dark:text-red-400' : 'bg-blue-500/15 text-blue-600 dark:text-blue-400'"
                >
                  {{ grp.is_required ? 'บังคับเลือก (Required)' : 'ไม่บังคับ (Optional)' }}
                </span>
              </div>
              <p class="text-xs text-gray-500 dark:text-gray-400">
                <span v-if="grp.name_en">{{ grp.name_en }}</span>
                <span v-if="grp.name_zh"> • {{ grp.name_zh }}</span>
              </p>
            </div>

            <div class="flex items-center gap-1">
              <button @click="openEditGroup(grp)" class="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300 cursor-pointer">
                <Edit2 class="w-3.5 h-3.5" />
              </button>
              <button @click="deleteGroup(grp)" class="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 cursor-pointer">
                <Trash2 class="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div class="p-3 rounded-xl bg-gray-50 dark:bg-black/40 space-y-1.5 border border-gray-100 dark:border-white/5">
            <div class="text-[11px] font-bold text-gray-600 dark:text-gray-400">ตัวเลือกย่อย ({{ grp.customization_options?.length || 0 }} รายการ):</div>
            <div class="flex flex-wrap gap-1.5">
              <span 
                v-for="opt in grp.customization_options" 
                :key="opt.id"
                class="text-xs px-2.5 py-1 rounded-lg bg-white dark:bg-[#132525] border border-gray-200 dark:border-white/10 text-gray-800 dark:text-gray-200 font-medium flex items-center gap-1.5"
              >
                <span>{{ opt.name_th }}</span>
                <span v-if="opt.extra_price > 0" class="text-[#E8572E] font-bold font-mono">+฿{{ opt.extra_price }}</span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- SUB-TAB 4: STORE INFO & LINE OA -->
    <div v-else-if="activeSubTab === 'store_info'" class="p-5 sm:p-6 rounded-2xl bg-white dark:bg-[#132525] border border-[#E8E2D9] dark:border-[#1B4B4A] shadow-sm space-y-6 transition-colors">
      <div class="flex items-center justify-between border-b border-gray-100 dark:border-white/10 pb-3">
        <div>
          <h3 class="font-bold text-gray-900 dark:text-white text-sm">ข้อมูลร้านค้าและการเชื่อมต่อ LINE OA</h3>
          <p class="text-xs text-gray-500 dark:text-gray-400">แก้ไขข้อมูลร้าน โลโก้ ภาพหน้าปก และผูก LINE User ID สำหรับรับออเดอร์</p>
        </div>
        <button 
          @click="saveStoreProfile"
          :disabled="saving"
          class="px-5 py-2.5 rounded-xl bg-[#E8572E] hover:bg-[#E8572E]/90 text-white font-bold text-xs shadow-md shadow-[#E8572E]/20 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
        >
          <Save class="w-4 h-4" />
          <span>{{ saving ? 'กำลังบันทึก...' : 'บันทึกการตั้งค่าร้าน' }}</span>
        </button>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div class="space-y-4">
          <div>
            <label class="block text-xs font-semibold text-gray-800 dark:text-gray-200 mb-1">ชื่อร้าน (ภาษาไทย) *</label>
            <input v-model="storeForm.name" type="text" class="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-black/40 border border-gray-300 dark:border-white/10 text-gray-900 dark:text-white text-sm outline-none focus:ring-1 focus:ring-[#E8572E]" />
          </div>

          <div>
            <label class="block text-xs font-semibold text-gray-800 dark:text-gray-200 mb-1">ชื่อร้าน (English)</label>
            <input v-model="storeForm.name_en" type="text" class="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-black/40 border border-gray-300 dark:border-white/10 text-gray-900 dark:text-white text-sm outline-none focus:ring-1 focus:ring-[#E8572E]" />
          </div>

          <div>
            <label class="block text-xs font-semibold text-gray-800 dark:text-gray-200 mb-1">ชื่อร้าน (中文 Chinese)</label>
            <input v-model="storeForm.name_zh" type="text" class="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-black/40 border border-gray-300 dark:border-white/10 text-gray-900 dark:text-white text-sm outline-none focus:ring-1 focus:ring-[#E8572E]" />
          </div>

          <div>
            <label class="block text-xs font-semibold text-gray-800 dark:text-gray-200 mb-1">Custom URL Slug *</label>
            <div class="flex items-center rounded-xl bg-gray-50 dark:bg-black/40 border border-gray-300 dark:border-white/10 overflow-hidden px-3">
              <span class="text-xs text-gray-500">chiimenu.com/m/</span>
              <input v-model="storeForm.slug" type="text" class="w-full py-2 bg-transparent text-gray-900 dark:text-white text-sm outline-none font-mono" />
            </div>
          </div>
        </div>

        <div class="space-y-4">
          <div>
            <label class="block text-xs font-semibold text-emerald-600 dark:text-emerald-400 mb-1 flex items-center gap-1.5">
              <MessageCircle class="w-4 h-4" /> LINE User ID (สำหรับรับการแจ้งเตือนออเดอร์)
            </label>
            <input 
              v-model="storeForm.line_user_id" 
              type="text" 
              placeholder="เช่น U1234567890abcdef..."
              class="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-black/40 border border-gray-300 dark:border-white/10 text-gray-900 dark:text-white text-sm font-mono outline-none focus:ring-1 focus:ring-[#E8572E]" 
            />
            <p class="text-[11px] text-gray-500 dark:text-gray-400 mt-1">
              💡 แนะนำให้ร้านค้าพิมพ์คำสั่ง <code class="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-black/60 font-bold text-[#E8572E]">link {{ storeForm.slug }}</code> ส่งในแชท LINE OA @946vhuev เพื่อผูกอัตโนมัติ
            </p>
          </div>

          <div>
            <label class="block text-xs font-semibold text-gray-800 dark:text-gray-200 mb-1">เบอร์โทรศัพท์ร้านค้า</label>
            <input v-model="storeForm.phone" type="text" placeholder="081-xxx-xxxx" class="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-black/40 border border-gray-300 dark:border-white/10 text-gray-900 dark:text-white text-sm outline-none focus:ring-1 focus:ring-[#E8572E]" />
          </div>

          <div class="p-4 rounded-xl bg-gray-50 dark:bg-black/40 border border-gray-200 dark:border-white/10 flex items-center justify-between">
            <div>
              <div class="text-xs font-bold text-gray-900 dark:text-white">สถานะเปิด/ปิดร้าน (Store Availability)</div>
              <p class="text-[11px] text-gray-500 dark:text-gray-400">หากปิดร้าน ลูกค้าจะไม่สามารถกดส่งออเดอร์ได้</p>
            </div>
            <input v-model="storeForm.is_active" type="checkbox" class="w-5 h-5 accent-[#E8572E] cursor-pointer" />
          </div>
        </div>
      </div>
    </div>

    <!-- SUB-TAB 5: LIVE SIMULATOR PREVIEW -->
    <div v-else-if="activeSubTab === 'preview'" class="p-5 sm:p-6 rounded-2xl bg-white dark:bg-[#132525] border border-[#E8E2D9] dark:border-[#1B4B4A] shadow-sm space-y-4 transition-colors">
      <div class="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 dark:border-white/10 pb-3">
        <div class="flex items-center gap-2">
          <Eye class="w-4 h-4 text-[#E8572E]" />
          <h3 class="font-bold text-gray-900 dark:text-white text-xs sm:text-sm">
            Live Simulator: <span class="text-[#E8572E]">{{ currentStore?.name }}</span>
          </h3>
        </div>

        <div class="flex items-center gap-2">
          <div class="flex items-center bg-gray-100 dark:bg-black/40 rounded-xl p-1 border border-gray-200 dark:border-white/10">
            <button 
              @click="simulatorDevice = 'mobile'"
              class="px-3 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 cursor-pointer"
              :class="simulatorDevice === 'mobile' ? 'bg-white dark:bg-[#132525] text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400'"
            >
              <Smartphone class="w-3.5 h-3.5" /> Mobile
            </button>
            <button 
              @click="simulatorDevice = 'tablet'"
              class="px-3 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 cursor-pointer"
              :class="simulatorDevice === 'tablet' ? 'bg-white dark:bg-[#132525] text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400'"
            >
              <Tablet class="w-3.5 h-3.5" /> iPad / Tablet
            </button>
          </div>

          <a 
            :href="`${baseUrl}/m/${currentStore?.slug}`" 
            target="_blank" 
            class="px-3 py-1.5 rounded-xl bg-gray-50 dark:bg-black/30 border border-gray-200 dark:border-white/10 hover:bg-gray-100 dark:hover:bg-white/10 text-gray-800 dark:text-gray-200 text-xs font-semibold flex items-center gap-1 cursor-pointer"
          >
            เปิดแท็บใหม่ <ExternalLink class="w-3 h-3" />
          </a>
        </div>
      </div>

      <div class="flex justify-center p-6 bg-gray-50 dark:bg-black/40 rounded-2xl border border-dashed border-gray-200 dark:border-white/10 min-h-[600px] overflow-hidden">
        <div 
          class="bg-gray-950 p-3 rounded-[40px] shadow-2xl border-4 border-gray-800 transition-all duration-300 flex flex-col"
          :class="simulatorDevice === 'mobile' ? 'w-[375px] h-[680px]' : 'w-[768px] h-[720px]'"
        >
          <div class="w-32 h-4 bg-gray-800 rounded-full mx-auto mb-2 shrink-0"></div>
          <iframe 
            :src="`${baseUrl}/m/${currentStore?.slug}`" 
            class="w-full h-full rounded-[24px] bg-white border-0"
          ></iframe>
        </div>
      </div>
    </div>

    <!-- DISH MODAL (Create / Edit Dish) -->
    <div v-if="showDishModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div class="w-full max-w-2xl bg-white dark:bg-[#132525] border border-gray-200 dark:border-[#1B4B4A] rounded-3xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
        <div class="flex items-center justify-between border-b border-gray-100 dark:border-white/10 pb-3">
          <h3 class="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Utensils class="w-4 h-4 text-[#E8572E]" />
            {{ isEditingDish ? 'แก้ไขรายการอาหาร' : 'เพิ่มเมนูอาหารใหม่' }}
          </h3>
          <button @click="showDishModal = false" class="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 text-gray-500"><X class="w-5 h-5" /></button>
        </div>

        <form @submit.prevent="saveDish" class="space-y-4 text-xs">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div class="sm:col-span-2 space-y-1">
              <label class="font-semibold text-gray-800 dark:text-gray-200 flex items-center justify-between">
                <span>ชื่ออาหาร (ภาษาไทย) *</span>
                <button 
                  type="button" 
                  @click="translateDishAI" 
                  :disabled="isTranslating || !dishForm.name_th"
                  class="text-[11px] text-[#E8572E] hover:underline flex items-center gap-1 font-bold disabled:opacity-50 cursor-pointer"
                >
                  <Sparkles class="w-3.5 h-3.5" />
                  {{ isTranslating ? 'กำลังแปลด้วย AI...' : '✨ แปลภาษา AI อัตโนมัติ' }}
                </button>
              </label>
              <input v-model="dishForm.name_th" type="text" placeholder="เช่น ต้มยำกุ้งน้ำข้น" class="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-black/40 border border-gray-300 dark:border-white/10 text-gray-900 dark:text-white text-sm outline-none focus:ring-1 focus:ring-[#E8572E]" required />
            </div>

            <div>
              <label class="font-semibold text-gray-800 dark:text-gray-200 mb-1 block">ชื่อภาษาอังกฤษ (English Name)</label>
              <input v-model="dishForm.name_en" type="text" placeholder="e.g. Creamy Tom Yum Kung" class="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-black/40 border border-gray-300 dark:border-white/10 text-gray-900 dark:text-white text-sm outline-none focus:ring-1 focus:ring-[#E8572E]" />
            </div>

            <div>
              <label class="font-semibold text-gray-800 dark:text-gray-200 mb-1 block">ชื่อภาษาจีน (中文 Name)</label>
              <input v-model="dishForm.name_zh" type="text" placeholder="例如 冬阴功虾汤" class="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-black/40 border border-gray-300 dark:border-white/10 text-gray-900 dark:text-white text-sm outline-none focus:ring-1 focus:ring-[#E8572E]" />
            </div>

            <div>
              <label class="font-semibold text-gray-800 dark:text-gray-200 mb-1 block">ราคาอาหาร (฿) *</label>
              <input v-model="dishForm.price" type="number" step="0.5" placeholder="เช่น 120" class="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-black/40 border border-gray-300 dark:border-white/10 text-gray-900 dark:text-white text-sm outline-none focus:ring-1 focus:ring-[#E8572E] font-bold" required />
            </div>

            <div>
              <label class="font-semibold text-gray-800 dark:text-gray-200 mb-1 block">หมวดหมู่อาหาร</label>
              <select v-model="dishForm.category_id" class="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-black/40 border border-gray-300 dark:border-white/10 text-gray-900 dark:text-white text-sm outline-none focus:ring-1 focus:ring-[#E8572E]">
                <option value="">-- ไม่ระบุหมวดหมู่ --</option>
                <option v-for="c in categories" :key="c.id" :value="c.id">{{ c.name_th }}</option>
              </select>
            </div>

            <div class="sm:col-span-2 space-y-2">
              <label class="font-semibold text-gray-800 dark:text-gray-200 block">รูปภาพอาหาร</label>
              <div class="flex items-center gap-4">
                <div class="w-20 h-20 rounded-xl bg-gray-100 dark:bg-black/40 overflow-hidden border border-gray-200 dark:border-white/10 shrink-0 flex items-center justify-center">
                  <img v-if="photoPreview" :src="photoPreview" alt="Preview" class="w-full h-full object-cover" />
                  <Image v-else class="w-8 h-8 opacity-30 text-gray-400" />
                </div>
                <input type="file" accept="image/*" @change="handleDishPhoto" class="text-xs text-gray-600 dark:text-gray-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-[#E8572E] file:text-white hover:file:bg-[#E8572E]/90 cursor-pointer" />
              </div>
            </div>

            <div class="sm:col-span-2 p-3 rounded-xl bg-gray-50 dark:bg-black/40 border border-gray-200 dark:border-white/10 space-y-2">
              <div class="flex items-center justify-between">
                <span class="font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                  <Flame class="w-4 h-4 text-red-500" /> เป็นเมนูเผ็ดหรือไม่
                </span>
                <input v-model="dishForm.is_spicy" type="checkbox" class="w-4 h-4 accent-[#E8572E] cursor-pointer" />
              </div>
              <div v-if="dishForm.is_spicy" class="flex items-center gap-2 pt-1">
                <span class="text-gray-500 dark:text-gray-400">ระดับความเผ็ด:</span>
                <button 
                  v-for="lvl in [1, 2, 3]" 
                  :key="lvl"
                  type="button"
                  @click="dishForm.spicy_level = lvl"
                  class="px-2.5 py-1 rounded-lg border text-xs font-semibold cursor-pointer"
                  :class="dishForm.spicy_level === lvl ? 'bg-red-500 text-white border-red-500' : 'bg-white dark:bg-black/30 border-gray-300 dark:border-white/10 text-gray-800 dark:text-gray-200'"
                >
                  🌶️ ระดับ {{ lvl }}
                </button>
              </div>
            </div>

            <div class="sm:col-span-2 space-y-2">
              <label class="font-semibold text-gray-800 dark:text-gray-200 block">ข้อมูลสำหรับผู้แพ้อาหาร (Allergens)</label>
              <div class="flex flex-wrap gap-2">
                <label 
                  v-for="alg in allAllergens" 
                  :key="alg.id"
                  class="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs cursor-pointer transition-all"
                  :class="selectedDishAllergens.includes(alg.id) ? 'bg-amber-500/15 border-amber-500/40 text-amber-800 dark:text-amber-300 font-bold' : 'bg-gray-50 dark:bg-black/30 border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-400'"
                >
                  <input type="checkbox" :value="alg.id" v-model="selectedDishAllergens" class="sr-only" />
                  <span>{{ alg.icon }}</span>
                  <span>{{ alg.name_th }}</span>
                </label>
              </div>
            </div>

            <div class="sm:col-span-2 space-y-2">
              <label class="font-semibold text-gray-800 dark:text-gray-200 block">ผูกกลุ่มตัวเลือกเสริม (Customization Groups)</label>
              <div class="flex flex-wrap gap-2">
                <label 
                  v-for="grp in customizationGroups" 
                  :key="grp.id"
                  class="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs cursor-pointer transition-all"
                  :class="selectedDishGroups.includes(grp.id) ? 'bg-blue-500/15 border-blue-500/40 text-blue-700 dark:text-blue-300 font-bold' : 'bg-gray-50 dark:bg-black/30 border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-400'"
                >
                  <input type="checkbox" :value="grp.id" v-model="selectedDishGroups" class="sr-only" />
                  <span>{{ grp.name_th }}</span>
                </label>
              </div>
            </div>
          </div>

          <div class="flex items-center justify-end gap-2 pt-3 border-t border-gray-100 dark:border-white/10">
            <button type="button" @click="showDishModal = false" class="px-4 py-2 rounded-xl bg-gray-100 dark:bg-black/30 text-gray-700 dark:text-gray-300 font-medium">ยกเลิก</button>
            <button type="submit" :disabled="saving" class="px-5 py-2 rounded-xl bg-[#E8572E] hover:bg-[#E8572E]/90 text-white font-bold shadow-md cursor-pointer disabled:opacity-50">
              {{ saving ? 'กำลังบันทึก...' : 'บันทึกเมนู' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- CATEGORY MODAL -->
    <div v-if="showCategoryModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div class="w-full max-w-md bg-white dark:bg-[#132525] border border-gray-200 dark:border-[#1B4B4A] rounded-3xl p-6 shadow-2xl space-y-4">
        <div class="flex items-center justify-between border-b border-gray-100 dark:border-white/10 pb-3">
          <h3 class="text-base font-bold text-gray-900 dark:text-white">
            {{ isEditingCategory ? 'แก้ไขหมวดหมู่อาหาร' : 'สร้างหมวดหมู่ใหม่' }}
          </h3>
          <button @click="showCategoryModal = false" class="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 text-gray-500"><X class="w-5 h-5" /></button>
        </div>

        <form @submit.prevent="saveCategory" class="space-y-3 text-xs">
          <div>
            <label class="font-semibold text-gray-800 dark:text-gray-200 mb-1 block">ชื่อหมวดหมู่ (ไทย) *</label>
            <input v-model="categoryForm.name_th" type="text" placeholder="เช่น อาหารจานเดียว, เครื่องดื่ม" class="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-black/40 border border-gray-300 dark:border-white/10 text-gray-900 dark:text-white text-sm outline-none focus:ring-1 focus:ring-[#E8572E]" required />
          </div>
          <div>
            <label class="font-semibold text-gray-800 dark:text-gray-200 mb-1 block">ชื่อหมวดหมู่ (English)</label>
            <input v-model="categoryForm.name_en" type="text" placeholder="e.g. Main Dishes, Beverages" class="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-black/40 border border-gray-300 dark:border-white/10 text-gray-900 dark:text-white text-sm outline-none focus:ring-1 focus:ring-[#E8572E]" />
          </div>
          <div>
            <label class="font-semibold text-gray-800 dark:text-gray-200 mb-1 block">ชื่อหมวดหมู่ (中文)</label>
            <input v-model="categoryForm.name_zh" type="text" placeholder="例如 主食, 饮料" class="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-black/40 border border-gray-300 dark:border-white/10 text-gray-900 dark:text-white text-sm outline-none focus:ring-1 focus:ring-[#E8572E]" />
          </div>

          <div class="flex items-center justify-end gap-2 pt-3 border-t border-gray-100 dark:border-white/10">
            <button type="button" @click="showCategoryModal = false" class="px-4 py-2 rounded-xl bg-gray-100 dark:bg-black/30 text-gray-700 dark:text-gray-300 font-medium">ยกเลิก</button>
            <button type="submit" :disabled="saving" class="px-5 py-2 rounded-xl bg-[#E8572E] hover:bg-[#E8572E]/90 text-white font-bold shadow-md cursor-pointer disabled:opacity-50">
              {{ saving ? 'กำลังบันทึก...' : 'บันทึกหมวดหมู่' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- CUSTOMIZATION GROUP MODAL -->
    <div v-if="showGroupModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div class="w-full max-w-xl bg-white dark:bg-[#132525] border border-gray-200 dark:border-[#1B4B4A] rounded-3xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
        <div class="flex items-center justify-between border-b border-gray-100 dark:border-white/10 pb-3">
          <h3 class="text-base font-bold text-gray-900 dark:text-white">
            {{ isEditingGroup ? 'แก้ไขกลุ่มตัวเลือกเสริม' : 'สร้างกลุ่มตัวเลือกเสริมใหม่' }}
          </h3>
          <button @click="showGroupModal = false" class="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 text-gray-500"><X class="w-5 h-5" /></button>
        </div>

        <form @submit.prevent="saveGroup" class="space-y-4 text-xs">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div class="sm:col-span-2">
              <label class="font-semibold text-gray-800 dark:text-gray-200 mb-1 block">ชื่อกลุ่ม (ไทย) *</label>
              <input v-model="groupForm.name_th" type="text" placeholder="เช่น เลือกเนื้อสัตว์, ความหวาน" class="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-black/40 border border-gray-300 dark:border-white/10 text-gray-900 dark:text-white text-sm outline-none focus:ring-1 focus:ring-[#E8572E]" required />
            </div>
            <div>
              <label class="font-semibold text-gray-800 dark:text-gray-200 mb-1 block">ชื่อกลุ่ม (English)</label>
              <input v-model="groupForm.name_en" type="text" placeholder="e.g. Meat Choice, Sweetness" class="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-black/40 border border-gray-300 dark:border-white/10 text-gray-900 dark:text-white text-sm outline-none focus:ring-1 focus:ring-[#E8572E]" />
            </div>
            <div>
              <label class="font-semibold text-gray-800 dark:text-gray-200 mb-1 block">ชื่อกลุ่ม (中文)</label>
              <input v-model="groupForm.name_zh" type="text" placeholder="例如 肉类选择, 甜度" class="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-black/40 border border-gray-300 dark:border-white/10 text-gray-900 dark:text-white text-sm outline-none focus:ring-1 focus:ring-[#E8572E]" />
            </div>

            <div class="sm:col-span-2 flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-black/40 border border-gray-200 dark:border-white/10">
              <div>
                <span class="font-bold text-gray-900 dark:text-white">จำเป็นต้องเลือกหรือไม่ (Required)</span>
                <p class="text-[11px] text-gray-500 dark:text-gray-400">ถ้าเปิดใช้งาน ลูกค้าต้องเลือกตัวเลือกนี้อย่างน้อย 1 รายการก่อนสั่ง</p>
              </div>
              <input v-model="groupForm.is_required" type="checkbox" class="w-5 h-5 accent-[#E8572E] cursor-pointer" />
            </div>
          </div>

          <div class="space-y-2 pt-2 border-t border-gray-100 dark:border-white/10">
            <div class="flex items-center justify-between">
              <span class="font-bold text-gray-900 dark:text-white text-xs">รายการตัวเลือกย่อย & ราคาบวกเพิ่ม (+฿)</span>
              <button type="button" @click="addOptionRow" class="text-xs text-[#E8572E] font-bold hover:underline flex items-center gap-1 cursor-pointer">
                <Plus class="w-3.5 h-3.5" /> เพิ่มแถวตัวเลือก
              </button>
            </div>

            <div class="space-y-2">
              <div 
                v-for="(opt, idx) in groupOptions" 
                :key="idx"
                class="flex items-center gap-2 p-2.5 rounded-xl bg-gray-50 dark:bg-black/40 border border-gray-200 dark:border-white/10"
              >
                <input v-model="opt.name_th" type="text" placeholder="ชื่อไทย (เช่น หมูกรอบ)" class="flex-1 px-2.5 py-1.5 rounded-lg bg-white dark:bg-[#132525] border border-gray-300 dark:border-white/10 text-xs text-gray-900 dark:text-white" required />
                <input v-model="opt.name_en" type="text" placeholder="EN (Crispy Pork)" class="flex-1 px-2.5 py-1.5 rounded-lg bg-white dark:bg-[#132525] border border-gray-300 dark:border-white/10 text-xs text-gray-900 dark:text-white" />
                <div class="flex items-center gap-1 w-24">
                  <span class="text-gray-500">+฿</span>
                  <input v-model="opt.extra_price" type="number" step="1" placeholder="0" class="w-full px-2 py-1.5 rounded-lg bg-white dark:bg-[#132525] border border-gray-300 dark:border-white/10 text-xs font-bold text-center text-gray-900 dark:text-white" />
                </div>
                <button type="button" @click="removeOptionRow(idx)" class="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 cursor-pointer">
                  <Trash2 class="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          <div class="flex items-center justify-end gap-2 pt-3 border-t border-gray-100 dark:border-white/10">
            <button type="button" @click="showGroupModal = false" class="px-4 py-2 rounded-xl bg-gray-100 dark:bg-black/30 text-gray-700 dark:text-gray-300 font-medium">ยกเลิก</button>
            <button type="submit" :disabled="saving" class="px-5 py-2 rounded-xl bg-[#E8572E] hover:bg-[#E8572E]/90 text-white font-bold shadow-md cursor-pointer disabled:opacity-50">
              {{ saving ? 'กำลังบันทึก...' : 'บันทึกกลุ่มตัวเลือก' }}
            </button>
          </div>
        </form>
      </div>
    </div>

  </div>
</template>
