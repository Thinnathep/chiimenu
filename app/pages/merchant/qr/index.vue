<script setup lang="ts">
import QRCode from 'qrcode'

definePageMeta({
  layout: 'merchant',
  middleware: ['auth']
})

const user = useSupabaseUser()
const client = useSupabaseClient()
const config = useRuntimeConfig()

// Base URL for the public menu (adjust in production)
const baseUrl = ref('http://localhost:3000')

const loading = ref(true)
const generating = ref(false)
const store = ref<any>(null)
const qrCodes = ref<any[]>([])

const newQrLabel = ref('')

onMounted(async () => {
  // Determine the correct Base URL dynamically
  if (process.client) {
    baseUrl.value = window.location.origin
    
    // If running in development and user accessed via localhost,
    // fetch the real network IP so mobile phones can scan it successfully.
    if (import.meta.dev && window.location.hostname === 'localhost') {
      try {
        const { ip } = await $fetch('/api/get-ip')
        if (ip && ip !== 'localhost') {
          baseUrl.value = `http://${ip}:${window.location.port || 3000}`
        }
      } catch (e) {
        console.error('Failed to get local IP', e)
      }
    }
  }

  const { data: authData } = await client.auth.getUser()
  if (!authData?.user?.id) return
  
  const { data: storeData } = await client
    .from('stores')
    .select('*')
    .eq('owner_id', authData.user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    
  store.value = storeData?.[0] || null
  
  if (store.value) {
    await fetchQrCodes()
  }
  
  loading.value = false
})

const fetchQrCodes = async () => {
  const { data } = await client
    .from('qr_codes')
    .select('*')
    .eq('store_id', store.value.id)
    .order('created_at', { ascending: false })
    
  // Generate Data URLs for display
  if (data) {
    for (const qr of (data as any[])) {
      let url = `${baseUrl.value}/m/${qr.short_code}`
      qr.dataUrl = await QRCode.toDataURL(url, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#ffffff'
        }
      })
    }
  }
    
  qrCodes.value = data || []
}

const generateRandomString = (length = 6) => {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

const createQrCode = async () => {
  if (!store.value) return
  generating.value = true
  
  // Generate a unique 6-character short code
  let shortCode = generateRandomString(6)
  
  // Basic collision check (in production, should be handled by DB unique constraint + retry)
  const { error } = await (client as any).from('qr_codes').insert({
    store_id: store.value.id,
    label: newQrLabel.value || useNuxtApp().$i18n.t('qr_default_label'),
    short_code: shortCode,
    is_active: true
  })
  
  generating.value = false
  
  if (!error) {
    newQrLabel.value = ''
    await fetchQrCodes()
  } else {
    alert(useNuxtApp().$i18n.t('qr_error_create'))
  }
}

const toggleStatus = async (qr: any) => {
  const newStatus = !qr.is_active
  qr.is_active = newStatus
  await (client as any).from('qr_codes').update({ is_active: newStatus }).eq('id', qr.id)
}

const deleteQr = async (id: string) => {
  if (!confirm(useNuxtApp().$i18n.t('qr_delete_confirm'))) return
  await (client as any).from('qr_codes').delete().eq('id', id)
  await fetchQrCodes()
}

const downloadQr = (qr: any) => {
  const link = document.createElement('a')
  link.download = `ChiiMenu-QR-${qr.label || qr.short_code}.png`
  link.href = qr.dataUrl
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}
</script>

<template>
  <div class="w-full pb-12">
    <div class="mb-8">
      <h1 class="text-2xl font-bold tracking-tight text-foreground">{{ $t('qr_title') }}</h1>
      <p class="text-muted-foreground mt-1">{{ $t('qr_subtitle') }}</p>
    </div>

    <div v-if="loading" class="p-8 text-center text-muted-foreground bg-card rounded-lg border">
      {{ $t('menu_list_loading') }}
    </div>
    
    <div v-else-if="!store" class="p-8 text-center bg-card rounded-lg border">
      {{ $t('qr_no_store') }}
    </div>

    <div v-else class="space-y-8">
      
      <!-- Create New QR -->
      <div class="bg-card shadow-sm border rounded-lg p-6">
        <h2 class="text-lg font-medium mb-4">{{ $t('qr_create_title') }}</h2>
        <form @submit.prevent="createQrCode" class="flex flex-col sm:flex-row gap-4 items-end">
          <div class="flex-1">
            <label class="block text-sm font-medium text-foreground mb-1">{{ $t('qr_label_input') }} <span class="text-xs text-muted-foreground">(เช่น โซนแอร์, โต๊ะรวม)</span></label>
            <input v-model="newQrLabel" type="text" :placeholder="$t('qr_label_placeholder')" class="block w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary">
          </div>
          <button type="submit" :disabled="generating" class="inline-flex justify-center rounded-md border border-transparent bg-primary py-2 px-6 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50 h-[38px]">
            {{ generating ? $t('qr_generating') : $t('qr_create_btn') }}
          </button>
        </form>
      </div>

      <!-- QR Codes List -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
        <div v-if="qrCodes.length === 0" class="col-span-full p-12 text-center text-muted-foreground bg-card border rounded-lg border-dashed">
          <svg class="mx-auto h-12 w-12 text-muted-foreground mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 4v16m8-8H4" />
          </svg>
          <p>{{ $t('qr_empty') }}</p>
        </div>
        
        <div v-for="qr in qrCodes" :key="qr.id" class="bg-card shadow-sm border rounded-lg overflow-hidden flex flex-col" :class="!qr.is_active ? 'opacity-75' : ''">
          <div class="p-4 border-b bg-muted/30 flex justify-between items-center">
            <h3 class="font-bold text-foreground truncate" :title="qr.label">{{ qr.label || $t('qr_default_label') }}</h3>
            <div class="flex gap-2">
              <span class="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full font-medium font-mono">{{ qr.short_code }}</span>
            </div>
          </div>
          
          <div class="p-6 flex flex-col items-center flex-1">
            <!-- The QR Image -->
            <div class="bg-white p-2 rounded-lg border shadow-sm mb-4 relative group">
              <img :src="qr.dataUrl" alt="QR Code" class="w-48 h-48 object-contain">
              
              <!-- Inactive overlay -->
              <div v-if="!qr.is_active" class="absolute inset-0 bg-background/80 flex items-center justify-center rounded-lg">
                <span class="text-destructive font-bold px-3 py-1 bg-destructive/10 rounded-full text-sm">{{ $t('qr_suspended') }}</span>
              </div>
            </div>
            
            <p class="text-xs text-muted-foreground text-center mb-6 break-all w-full px-2">
              {{ baseUrl }}/m/{{ qr.short_code }}<span v-if="qr.table_identifier">?t={{ encodeURIComponent(qr.table_identifier) }}</span>
            </p>
            
            <!-- Actions -->
            <div class="flex gap-2 w-full mt-auto">
              <button @click="downloadQr(qr)" class="flex-1 inline-flex justify-center items-center rounded-md border border-input bg-background py-1.5 px-3 text-xs font-medium text-foreground shadow-sm hover:bg-muted">
                <svg class="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                {{ $t('qr_save_img') }}
              </button>
              
              <!-- Dropdown menu equivalent for small actions -->
              <button @click="toggleStatus(qr)" class="px-3 py-1.5 border border-input rounded-md text-xs font-medium" :class="qr.is_active ? 'text-orange-600 hover:bg-orange-50' : 'text-green-600 hover:bg-green-50'">
                {{ qr.is_active ? $t('qr_suspend_btn') : $t('qr_activate_btn') }}
              </button>
              
              <button @click="deleteQr(qr.id)" class="px-3 py-1.5 border border-input rounded-md text-xs font-medium text-destructive hover:bg-destructive/10">
                {{ $t('qr_delete_btn') }}
              </button>
            </div>
          </div>
        </div>
      </div>
      
    </div>
  </div>
</template>
