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
const menuItems = ref<any[]>([])

onMounted(async () => {
  const { data: authData } = await client.auth.getUser()
  if (!authData?.user?.id) return
  
  // 1. Get Store
  const { data: storeData } = await client
    .from('stores')
    .select('*')
    .eq('owner_id', authData.user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    
  store.value = storeData?.[0] || null
  
  if (store.value) {
    // 2. Get Categories
    const { data: catData } = await client
      .from('menu_categories')
      .select('*')
      .eq('store_id', store.value.id)
      .order('sort_order', { ascending: true })
    categories.value = catData || []
    
    // 3. Get Menu Items
    await fetchMenuItems()
  }
  
  loading.value = false
})

const fetchMenuItems = async () => {
  const { data } = await client
    .from('menu_items')
    .select('*, menu_categories(name_th)')
    .eq('store_id', store.value.id)
    .order('sort_order', { ascending: true })
    
  menuItems.value = data || []
}

const toggleAvailability = async (item: any) => {
  const newStatus = !item.is_available
  // Optimistic update
  item.is_available = newStatus
  
  await (client as any)
    .from('menu_items')
    .update({ is_available: newStatus })
    .eq('id', item.id)
}
</script>

<template>
  <div>
    <div class="mb-8 sm:flex sm:items-center sm:justify-between">
      <div>
        <h1 class="text-2xl font-bold tracking-tight text-foreground">{{ $t('menu_list_title') }}</h1>
        <p class="text-muted-foreground mt-1">{{ $t('menu_list_desc') }}</p>
      </div>
      <div class="mt-4 sm:mt-0 flex gap-3 flex-wrap">
        <NuxtLink to="/merchant/menu/customizations" class="inline-flex items-center px-4 py-2 border border-input text-sm font-medium rounded-md shadow-sm bg-background hover:bg-muted focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary">
          {{ $t('menu_list_cust_btn') }}
        </NuxtLink>
        <NuxtLink to="/merchant/menu/categories" class="inline-flex items-center px-4 py-2 border border-input text-sm font-medium rounded-md shadow-sm bg-background hover:bg-muted focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary">
          {{ $t('menu_list_cats_btn') }}
        </NuxtLink>
        <NuxtLink to="/merchant/menu/items/create" class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-primary-foreground bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary">
          + {{ $t('menu_list_add_btn') }}
        </NuxtLink>
      </div>
    </div>

    <div v-if="loading" class="p-8 text-center text-muted-foreground bg-card rounded-lg border">
      {{ $t('menu_list_loading') }}
    </div>
    
    <div v-else-if="!store" class="p-8 text-center bg-card rounded-lg border">
      {{ $t('menu_list_need_store') }}
    </div>

    <div v-else-if="categories.length === 0 && menuItems.length === 0" class="text-center bg-card border rounded-lg p-12">
      <svg class="mx-auto h-12 w-12 text-muted-foreground mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
      </svg>
      <h3 class="text-lg font-medium text-foreground mb-2">{{ $t('menu_list_no_menu') }}</h3>
      <p class="text-muted-foreground mb-6">{{ $t('menu_list_start_cat') }}</p>
      <NuxtLink to="/merchant/menu/categories" class="inline-flex justify-center rounded-md border border-transparent bg-primary py-2 px-4 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90">
        {{ $t('menu_list_create_cat_first') }}
      </NuxtLink>
    </div>

    <div v-else class="space-y-8">
      <!-- Loop through categories -->
      <div v-for="cat in categories" :key="cat.id" class="bg-card border shadow-sm rounded-lg overflow-hidden">
        <div class="bg-muted/30 px-6 py-3 border-b flex justify-between items-center">
          <h2 class="text-lg font-semibold text-foreground">{{ cat.name_th }} <span v-if="cat.name_en" class="text-sm font-normal text-muted-foreground ml-2">({{ cat.name_en }})</span></h2>
        </div>
        
        <ul class="divide-y divide-border">
          <li v-for="item in menuItems.filter(i => i.category_id === cat.id)" :key="item.id" class="p-6 hover:bg-muted/10 transition-colors flex flex-col sm:flex-row gap-6">
            <!-- Image -->
            <div class="h-24 w-24 flex-shrink-0 bg-muted rounded-md overflow-hidden border">
              <img v-if="item.photo_url" :src="item.photo_url" alt="" class="h-full w-full object-cover">
              <div v-else class="h-full w-full flex items-center justify-center text-muted-foreground">
                <svg class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
              </div>
            </div>
            
            <!-- Details -->
            <div class="flex-1 min-w-0">
              <div class="flex justify-between items-start">
                <div>
                  <h3 class="text-lg font-medium text-foreground flex items-center gap-2">
                    {{ item.name_th }}
                    <span v-if="item.is_spicy" class="text-red-500 text-sm" :title="`ความเผ็ดระดับ ${item.spicy_level}`">
                      {{ '🌶️'.repeat(item.spicy_level || 1) }}
                    </span>
                  </h3>
                  <p class="text-muted-foreground text-sm" v-if="item.name_en">{{ item.name_en }}</p>
                </div>
                <div class="text-lg font-bold text-foreground">฿{{ item.price }}</div>
              </div>
              <p class="mt-2 text-sm text-muted-foreground line-clamp-2">{{ item.description_th }}</p>
              
              <div class="mt-4 flex flex-wrap gap-2 items-center justify-between">
                <!-- Status Toggle -->
                <button @click="toggleAvailability(item)" 
                  class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors"
                  :class="item.is_available ? 'bg-green-100 text-green-800 hover:bg-green-200' : 'bg-red-100 text-red-800 hover:bg-red-200'">
                  <span class="h-1.5 w-1.5 rounded-full" :class="item.is_available ? 'bg-green-600' : 'bg-red-600'"></span>
                  {{ item.is_available ? $t('menu_list_available') : $t('menu_list_soldout') }}
                </button>
                
                <NuxtLink :to="`/merchant/menu/items/${item.id}`" class="text-sm font-medium text-primary hover:underline">
                  {{ $t('menu_list_edit_info') }}
                </NuxtLink>
              </div>
            </div>
          </li>
          
          <li v-if="menuItems.filter(i => i.category_id === cat.id).length === 0" class="p-6 text-center text-muted-foreground text-sm">
            {{ $t('menu_list_empty_cat') }}
          </li>
        </ul>
      </div>
      
      <!-- Items without category -->
      <div v-if="menuItems.filter(i => !i.category_id).length > 0" class="bg-card border shadow-sm rounded-lg overflow-hidden opacity-75">
        <div class="bg-muted/30 px-6 py-3 border-b">
          <h2 class="text-lg font-medium text-muted-foreground">{{ $t('menu_list_no_cat') }}</h2>
        </div>
        <ul class="divide-y divide-border">
          <li v-for="item in menuItems.filter(i => !i.category_id)" :key="item.id" class="p-4 flex justify-between items-center">
            <div>
              <span class="font-medium text-foreground">{{ item.name_th }}</span>
              <span class="ml-2 text-muted-foreground">฿{{ item.price }}</span>
            </div>
            <NuxtLink :to="`/merchant/menu/items/${item.id}`" class="text-sm text-primary hover:underline">{{ $t('menu_list_edit') }}</NuxtLink>
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>
