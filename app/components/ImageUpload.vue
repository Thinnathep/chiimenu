<script setup lang="ts">
const props = defineProps({
  bucket: { type: String, required: true },
  path: { type: String, required: true }, // e.g., '123-456/logo'
  modelValue: { type: String, default: '' },
  label: { type: String, default: 'อัปโหลดรูปภาพ' },
  aspectRatio: { type: String, default: 'auto' },
  maxSize: { type: Number, default: 5 } // MB
})

const emit = defineEmits(['update:modelValue'])

const client = useSupabaseClient()
const uploading = ref(false)
const errorMsg = ref('')

const handleUpload = async (event: any) => {
  const file = event.target.files[0]
  if (!file) return
  
  errorMsg.value = ''
  
  if (file.size > props.maxSize * 1024 * 1024) {
    errorMsg.value = `ขนาดไฟล์ต้องไม่เกิน ${props.maxSize}MB`
    return
  }
  
  if (!file.type.startsWith('image/')) {
    errorMsg.value = 'รองรับเฉพาะไฟล์รูปภาพ (JPG, PNG, WEBP)'
    return
  }
  
  uploading.value = true
  
  try {
    // Upload to Supabase Storage
    const fileExt = file.name.split('.').pop()
    const fileName = `${props.path}-${Date.now()}.${fileExt}` // add timestamp to avoid caching issues
    
    const { data, error } = await client.storage
      .from(props.bucket)
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      })
      
    if (error) throw error
    
    // Get Public URL
    const { data: { publicUrl } } = client.storage
      .from(props.bucket)
      .getPublicUrl(fileName)
      
    emit('update:modelValue', publicUrl)
  } catch (error: any) {
    errorMsg.value = error.message || 'เกิดข้อผิดพลาดในการอัปโหลด'
  } finally {
    uploading.value = false
    // reset file input so the same file can be selected again if needed
    event.target.value = ''
  }
}
</script>

<template>
  <div>
    <label class="block text-sm font-medium text-foreground mb-1">{{ label }}</label>
    
    <div 
      class="relative flex flex-col items-center justify-center border-2 border-dashed rounded-lg overflow-hidden transition-colors hover:bg-muted/50"
      :class="[
        errorMsg ? 'border-destructive/50 bg-destructive/5' : 'border-input bg-muted/20',
        !modelValue ? 'py-8' : ''
      ]"
      :style="{ aspectRatio: aspectRatio !== 'auto' ? aspectRatio : 'auto' }"
    >
      <input 
        type="file" 
        accept="image/jpeg, image/png, image/webp"
        class="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
        @change="handleUpload"
        :disabled="uploading"
      >
      
      <!-- Preview Image -->
      <img 
        v-if="modelValue && !uploading" 
        :src="modelValue" 
        alt="Preview" 
        class="w-full h-full object-cover"
      >
      
      <!-- Loading State -->
      <div v-else-if="uploading" class="flex flex-col items-center justify-center p-4">
        <span class="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mb-2"></span>
        <span class="text-xs text-muted-foreground">กำลังอัปโหลด...</span>
      </div>
      
      <!-- Empty State -->
      <div v-else-if="!modelValue" class="flex flex-col items-center justify-center text-center p-4">
        <div class="p-3 bg-primary/10 rounded-full mb-3 text-primary">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-6 h-6"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>
        </div>
        <p class="text-sm font-medium text-foreground">คลิกหรือลากไฟล์มาวางที่นี่</p>
        <p class="text-xs text-muted-foreground mt-1">รองรับ JPG, PNG, WEBP (สูงสุด {{ maxSize }}MB)</p>
      </div>
      
      <!-- Hover Overlay (if has image) -->
      <div v-if="modelValue && !uploading" class="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
        <span class="text-white text-sm font-medium flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>
          เปลี่ยนรูปภาพ
        </span>
      </div>
    </div>
    
    <p v-if="errorMsg" class="mt-2 text-sm text-destructive">{{ errorMsg }}</p>
  </div>
</template>
