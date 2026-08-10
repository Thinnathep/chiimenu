<script setup lang="ts">
definePageMeta({
  layout: 'merchant',
  middleware: ['auth']
})

const user = useSupabaseUser()
const client = useSupabaseClient()

// Fetch store info
const { data: store, pending, refresh } = await useAsyncData('store', async () => {
  // ใช้ client.auth.getUser() เพื่อความชัวร์ (แก้ปัญหา Vue reactivity ดึงค่าไม่ทัน)
  const { data: authData } = await client.auth.getUser()
  if (!authData?.user?.id) return null
  
  const { data, error } = await client
    .from('stores')
    .select('*')
    .eq('owner_id', authData.user.id)
    .single()
    
  if (error) {
    console.error("Dashboard fetch store error:", error)
    return null
  }
  return data
})
</script>

<template>
  <div>
    <h1 class="text-2xl font-bold tracking-tight text-foreground mb-6">{{ $t('dash_title') }}</h1>
    
    <div v-if="pending" class="text-muted-foreground">{{ $t('menu_list_loading') }}</div>
    
    <div v-else-if="!store" class="bg-card border rounded-lg p-8 text-center max-w-2xl mx-auto shadow-sm">
      <div class="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 mb-4">
        <svg class="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" d="M13.5 21v-7.5a2.25 2.25 0 01-2.25-2.25v-15a2.25 2.25 0 00-2.25 2.25M10.5 21v-7.5a2.25 2.25 0 01-2.25-2.25m0 0a2.25 2.25 0 012.25 2.25M3 13.5l6-6 6 6m-6-6v15" />
        </svg>
      </div>
      <h2 class="text-xl font-semibold mb-2">{{ $t('dash_welcome') }}</h2>
      <p class="text-muted-foreground mb-6">{{ $t('dash_no_store_msg') }}</p>
      <NuxtLink to="/merchant/store/create" class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-primary-foreground bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary">
        {{ $t('dash_create_store') }}
      </NuxtLink>
    </div>
    
    <div v-else class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      <!-- Stats Cards (Placeholder for Day 6) -->
      <div class="bg-card overflow-hidden shadow-sm rounded-lg border">
        <div class="p-5">
          <div class="flex items-center">
            <div class="flex-shrink-0">
              <svg class="h-6 w-6 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" /></svg>
            </div>
            <div class="ml-5 w-0 flex-1">
              <dl>
                <dt class="text-sm font-medium text-muted-foreground truncate">{{ $t('dash_qr_scans') }}</dt>
                <dd class="flex items-baseline">
                  <div class="text-2xl font-semibold text-foreground">0</div>
                </dd>
              </dl>
            </div>
          </div>
        </div>
      </div>
      
      <div class="bg-card overflow-hidden shadow-sm rounded-lg border">
        <div class="p-5">
          <div class="flex items-center">
            <div class="flex-shrink-0">
              <svg class="h-6 w-6 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" /></svg>
            </div>
            <div class="ml-5 w-0 flex-1">
              <dl>
                <dt class="text-sm font-medium text-muted-foreground truncate">{{ $t('dash_active_menus') }}</dt>
                <dd class="flex items-baseline">
                  <div class="text-2xl font-semibold text-foreground">0</div>
                </dd>
              </dl>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Store Info Summary -->
      <div class="bg-card overflow-hidden shadow-sm rounded-lg border sm:col-span-2 lg:col-span-1">
        <div class="p-5">
          <h3 class="text-lg leading-6 font-medium text-foreground">{{ $t('dash_store', { name: store.name }) }}</h3>
          <p class="mt-1 max-w-2xl text-sm text-muted-foreground">{{ store.store_type || $t('dash_store_type') }}</p>
          
          <div class="mt-4 pt-4 border-t flex justify-between items-center">
            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800" v-if="store.is_active">
              {{ $t('dash_open') }}
            </span>
            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800" v-else>
              {{ $t('dash_closed') }}
            </span>
            <NuxtLink to="/merchant/qr" class="text-sm font-medium text-primary hover:text-primary/80">{{ $t('dash_create_qr') }}</NuxtLink>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
