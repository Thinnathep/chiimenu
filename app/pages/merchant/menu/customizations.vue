<script setup lang="ts">
definePageMeta({
  layout: 'merchant',
  middleware: ['auth']
})

const user = useSupabaseUser()
const client = useSupabaseClient()

const loading = ref(true)
const store = ref<any>(null)
const groups = ref<any[]>([])

const newGroup = ref({
  name_th: '',
  name_en: '',
  name_zh: '',
  // name_nod: '',
  is_required: false
})

const newOption = ref({
  group_id: '',
  name_th: '',
  name_en: '',
  name_zh: '',
  // name_nod: '',
  extra_price: 0
})

const isTranslatingGroup = ref(false)
const isTranslatingOption = ref(false)

onMounted(async () => {
  const { data: authData } = await client.auth.getUser()
  if (!authData?.user?.id) return
  
  // Get Store
  const { data: storeData } = await client
    .from('stores')
    .select('id')
    .eq('owner_id', authData.user.id)
    .single()
    
  store.value = storeData
  
  if (store.value) {
    await fetchGroups()
  }
  
  loading.value = false
})

const fetchGroups = async () => {
  // Fetch groups and their options
  const { data } = await client
    .from('customization_groups')
    .select(`
      *,
      customization_options (*)
    `)
    .eq('store_id', store.value.id)
    .order('created_at', { ascending: true })
    
  // Sort options by sort_order locally
  if (data) {
    data.forEach(group => {
      if (group.customization_options) {
        group.customization_options.sort((a: any, b: any) => a.sort_order - b.sort_order)
      }
    })
  }
  
  groups.value = data || []
}

const addGroup = async () => {
  if (!newGroup.value.name_th.trim() || !store.value) return
  
  await client.from('customization_groups').insert({
    store_id: store.value.id,
    name_th: newGroup.value.name_th,
    name_en: newGroup.value.name_en || null,
    name_zh: newGroup.value.name_zh || null,
    // name_nod: newGroup.value.name_nod || null,
    is_required: newGroup.value.is_required
  })
  
  newGroup.value = { name_th: '', name_en: '', name_zh: '', /* name_nod: '', */ is_required: false }
  await fetchGroups()
}

const deleteGroup = async (id: string) => {
  if (!confirm(useNuxtApp().$i18n.t('cust_del_group_confirm'))) return
  await client.from('customization_groups').delete().eq('id', id)
  await fetchGroups()
}

const addOption = async (groupId: string) => {
  if (!newOption.value.name_th.trim() || newOption.value.group_id !== groupId) return
  
  // Find current max sort_order
  const group = groups.value.find(g => g.id === groupId)
  const maxSort = group?.customization_options?.length || 0
  
  await client.from('customization_options').insert({
    group_id: groupId,
    name_th: newOption.value.name_th,
    name_en: newOption.value.name_en || null,
    name_zh: newOption.value.name_zh || null,
    // name_nod: newOption.value.name_nod || null,
    extra_price: newOption.value.extra_price || 0,
    sort_order: maxSort
  })
  
  newOption.value = { group_id: '', name_th: '', name_en: '', name_zh: '', /* name_nod: '', */ extra_price: 0 }
  await fetchGroups()
}

const deleteOption = async (id: string) => {
  if (!confirm(useNuxtApp().$i18n.t('cust_del_opt_confirm'))) return
  await client.from('customization_options').delete().eq('id', id)
  await fetchGroups()
}

const translateGroup = async () => {
  if (!newGroup.value.name_th.trim()) return
  
  isTranslatingGroup.value = true
  try {
    const response = await fetch('/api/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        name_th: newGroup.value.name_th,
        description_th: ''
      })
    })
    
    const data = await response.json()
    if (data.error) throw new Error(data.message)
    
    if (data) {
      if (data.name_en) newGroup.value.name_en = data.name_en
      if (data.name_zh) newGroup.value.name_zh = data.name_zh
    }
  } catch (error: any) {
    alert(error.message || 'การแปลล้มเหลว กรุณาลองใหม่')
  } finally {
    isTranslatingGroup.value = false
  }
}

const translateOption = async () => {
  if (!newOption.value.name_th.trim()) return
  
  isTranslatingOption.value = true
  try {
    const response = await fetch('/api/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        name_th: newOption.value.name_th,
        description_th: ''
      })
    })
    
    const data = await response.json()
    if (data.error) throw new Error(data.message)
    
    if (data) {
      if (data.name_en) newOption.value.name_en = data.name_en
      if (data.name_zh) newOption.value.name_zh = data.name_zh
    }
  } catch (error: any) {
    alert(error.message || 'การแปลล้มเหลว กรุณาลองใหม่')
  } finally {
    isTranslatingOption.value = false
  }
}
</script>

<template>
  <div class="max-w-4xl mx-auto pb-12">
    <div class="mb-8">
      <NuxtLink to="/merchant/menu" class="text-sm font-medium text-muted-foreground hover:text-foreground mb-4 inline-block">
        &larr; {{ $t('cat_back') }}
      </NuxtLink>
      <h1 class="text-2xl font-bold tracking-tight text-foreground">{{ $t('cust_title') }}</h1>
      <p class="text-muted-foreground mt-1">{{ $t('cust_desc') }}</p>
    </div>

    <div v-if="loading" class="p-8 text-center text-muted-foreground">{{ $t('menu_list_loading') }}</div>
    
    <div v-else-if="!store" class="p-8 text-center bg-card rounded-lg border">
      {{ $t('cust_need_store') }}
    </div>

    <div v-else class="space-y-8">
      <!-- Add New Group -->
      <div class="bg-card shadow-sm border rounded-lg p-6">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-lg font-medium">{{ $t('cust_add_group') }}</h2>
          <button 
            @click.prevent="translateGroup"
            :disabled="isTranslatingGroup || !newGroup.name_th"
            class="inline-flex items-center gap-1.5 rounded-full bg-purple-100 px-3 py-1 text-xs font-medium text-purple-700 hover:bg-purple-200 disabled:opacity-50 transition-colors"
          >
            <span v-if="isTranslatingGroup" class="w-3 h-3 border-2 border-purple-700 border-t-transparent rounded-full animate-spin"></span>
            ✨ แปลภาษาอัตโนมัติ (AI)
          </button>
        </div>
        <form @submit.prevent="addGroup" class="flex flex-col gap-4">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-foreground mb-1">{{ $t('cust_group_name') }} <span class="text-destructive">*</span></label>
              <input v-model="newGroup.name_th" type="text" placeholder="เช่น ระดับความหวาน" required class="block w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary">
            </div>
            <div>
              <label class="block text-sm font-medium text-foreground mb-1">{{ $t('cust_group_name_en') }}</label>
              <input v-model="newGroup.name_en" type="text" placeholder="e.g. Sweetness Level" class="block w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary">
            </div>
            <div>
              <label class="block text-sm font-medium text-foreground mb-1">ชื่อกลุ่ม (中文)</label>
              <input v-model="newGroup.name_zh" type="text" placeholder="例如 甜度" class="block w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary">
            </div>
            <!-- <div>
              <label class="block text-sm font-medium text-foreground mb-1">ชื่อกลุ่ม (ล้านนา)</label>
              <input v-model="newGroup.name_nod" type="text" class="block w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary">
            </div> -->
            <div class="flex items-end pb-1">
              <label class="flex items-center">
                <input v-model="newGroup.is_required" type="checkbox" class="h-4 w-4 rounded border-input text-primary focus:ring-primary">
                <span class="ml-2 text-sm text-foreground">{{ $t('cust_req') }}</span>
              </label>
            </div>
          </div>
          <div class="flex justify-end">
            <button type="submit" :disabled="!newGroup.name_th" class="inline-flex justify-center rounded-md border border-transparent bg-primary py-2 px-6 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary h-[38px]">
              {{ $t('cust_save_group') }}
            </button>
          </div>
        </form>
      </div>

      <!-- Groups List -->
      <div v-if="groups.length === 0" class="p-8 text-center text-muted-foreground bg-card border rounded-lg">
        {{ $t('cust_empty_groups') }}
      </div>
      
      <div v-for="group in groups" :key="group.id" class="bg-card shadow-sm border rounded-lg overflow-hidden">
        <!-- Group Header -->
        <div class="bg-muted/30 px-6 py-4 border-b flex justify-between items-center">
          <div>
            <h3 class="text-lg font-bold text-foreground flex items-center gap-2">
              {{ group.name_th }}
              <span v-if="group.is_required" class="text-xs bg-red-100 text-red-800 px-2 py-0.5 rounded-full font-medium">{{ $t('cust_req_badge') }}</span>
            </h3>
            <p class="text-sm text-muted-foreground" v-if="group.name_en || group.name_zh">
              <span v-if="group.name_en">{{ group.name_en }}</span>
              <span v-if="group.name_en && group.name_zh"> · </span>
              <span v-if="group.name_zh">{{ group.name_zh }}</span>
            </p>
          </div>
          <button @click="deleteGroup(group.id)" class="text-sm text-destructive hover:underline">{{ $t('cust_del_group') }}</button>
        </div>
        
        <!-- Options List -->
        <div class="p-6">
          <ul class="space-y-3 mb-6" v-if="group.customization_options?.length > 0">
            <li v-for="opt in group.customization_options" :key="opt.id" class="flex justify-between items-center p-3 border rounded-md bg-background">
              <div class="flex items-center gap-4">
                <div class="font-medium text-foreground">
                  {{ opt.name_th }}
                  <span v-if="opt.name_en" class="text-muted-foreground text-sm font-normal">({{ opt.name_en }})</span>
                  <span v-if="opt.name_zh" class="text-muted-foreground text-sm font-normal ml-1">{{ opt.name_zh }}</span>
                </div>
              </div>
              <div class="flex items-center gap-4">
                <span class="text-sm font-medium" :class="opt.extra_price > 0 ? 'text-green-600' : 'text-muted-foreground'">
                  {{ opt.extra_price > 0 ? `+฿${opt.extra_price}` : $t('cust_free') }}
                </span>
                <button @click="deleteOption(opt.id)" class="text-muted-foreground hover:text-destructive">
                  <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </button>
              </div>
            </li>
          </ul>
          <div v-else class="text-sm text-muted-foreground mb-6 italic">{{ $t('cust_empty_opt') }}</div>
          
          <!-- Add Option Form -->
          <div class="bg-muted/20 rounded-md border border-dashed p-4">
            <div class="flex items-center justify-between mb-3">
              <span class="text-sm font-medium text-muted-foreground">{{ $t('cust_add_opt') }}</span>
              <button 
                @click.prevent="translateOption"
                :disabled="isTranslatingOption || !newOption.name_th"
                class="inline-flex items-center gap-1.5 rounded-full bg-purple-100 px-3 py-1 text-xs font-medium text-purple-700 hover:bg-purple-200 disabled:opacity-50 transition-colors"
              >
                <span v-if="isTranslatingOption" class="w-3 h-3 border-2 border-purple-700 border-t-transparent rounded-full animate-spin"></span>
                ✨ AI
              </button>
            </div>
            <form @submit.prevent="addOption(group.id)" class="space-y-3">
              <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <input v-model="newOption.name_th" @focus="newOption.group_id = group.id" type="text" :placeholder="$t('cust_opt_name_ph')" required class="block w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none">
                </div>
                <div>
                  <input v-model="newOption.name_en" @focus="newOption.group_id = group.id" type="text" :placeholder="$t('cust_opt_en_ph')" class="block w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none">
                </div>
                <div>
                  <input v-model="newOption.name_zh" @focus="newOption.group_id = group.id" type="text" placeholder="中文名称" class="block w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none">
                </div>
                <!-- <div>
                  <input v-model="newOption.name_nod" @focus="newOption.group_id = group.id" type="text" placeholder="ชื่อล้านนา" class="block w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none">
                </div> -->
              </div>
              <div class="flex gap-3 items-end">
                <div class="w-32">
                  <input v-model="newOption.extra_price" @focus="newOption.group_id = group.id" type="number" min="0" step="0.01" :placeholder="$t('cust_opt_price')" class="block w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none">
                </div>
                <button type="submit" class="inline-flex justify-center rounded-md bg-secondary text-secondary-foreground py-2 px-4 text-sm font-medium hover:bg-secondary/80 border border-input h-[38px]">
                  {{ $t('cust_add_opt') }}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
