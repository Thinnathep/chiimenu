<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { 
  Plus, 
  ArrowLeft, 
  Sparkles, 
  Image as ImageIcon, 
  Flame, 
  Sliders, 
  Check, 
  Globe, 
  AlertCircle,
  CheckCircle2
} from 'lucide-vue-next'

definePageMeta({
  layout: 'merchant',
  middleware: ['auth']
})

const client = useSupabaseClient()
const router = useRouter()
const route = useRoute()

const loading = ref(true)
const saving = ref(false)
const errorMsg = ref('')
const { store, fetchStore } = useCurrentStore()
const categories = ref<any[]>([])
const allAllergens = ref<any[]>([])
const allGroups = ref<any[]>([])

// AI Translate Modal State
const isAiModalOpen = ref(false)

const form = ref({
  category_id: '',
  name_th: '',
  name_en: '',
  name_zh: '',
  description_th: '',
  description_en: '',
  description_zh: '',
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
    const [catData, allergenData, groupData] = await Promise.all([
      client.from('menu_categories').select('id, name_th').eq('store_id', store.value.id).order('sort_order', { ascending: true }),
      client.from('allergens').select('*'),
      client.from('customization_groups').select('*').eq('store_id', store.value.id)
    ])
    
    categories.value = catData.data || []
    allAllergens.value = allergenData.data || []
    allGroups.value = groupData.data || []
    
    if (route.query.category_id && typeof route.query.category_id === 'string') {
      form.value.category_id = route.query.category_id
    }
  }
  
  loading.value = false
})

const handlePhotoUpload = (e: Event) => {
  const target = e.target as HTMLInputElement
  if (target.files && target.files[0]) {
    const file = target.files[0]
    if (file.size > 5 * 1024 * 1024) {
      useToast().warning('รูปภาพต้องมีขนาดไม่เกิน 5MB')
      return
    }
    photoFile.value = file
    photoPreview.value = URL.createObjectURL(file)
  }
}

// Handle translations applied from AiTranslateModal
const handleTranslationsApplied = (data: {
  name_en: string
  name_zh: string
  explanation_en: string
  description_zh: string
}) => {
  form.value.name_en = data.name_en
  form.value.name_zh = data.name_zh
  form.value.explanation_en = data.explanation_en
  form.value.description_zh = data.description_zh
}

const openAiTranslate = () => {
  if (!form.value.name_th.trim()) {
    useToast().warning('กรุณากรอกชื่อเมนูภาษาไทยก่อนกดแปลภาษา')
    return
  }
  isAiModalOpen.value = true
}

const submitForm = async () => {
  if (!store.value || !form.value.name_th.trim() || !form.value.price) return
  saving.value = true
  errorMsg.value = ''
  
  // Duplicate Name Warning Check
  const { count: dupCount } = await (client as any)
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
      confirmButtonText: 'ใช่, สร้างเมนูนี้',
      cancelButtonText: 'กลับไปแก้ไข'
    })
    if (!result.isConfirmed) {
      saving.value = false
      return
    }
  }
  
  try {
    let finalPhotoUrl = ''
    
    // Upload photo if exists
    if (photoFile.value) {
      const fileExt = photoFile.value.name.split('.').pop()
      const fileName = `${store.value.id}/${Date.now()}.${fileExt}`
      
      const { error: uploadError } = await client.storage
        .from('chiimenu-images')
        .upload(fileName, photoFile.value)
        
      if (uploadError) throw uploadError
      
      const { data: publicUrlData } = client.storage
        .from('chiimenu-images')
        .getPublicUrl(fileName)
        
      finalPhotoUrl = publicUrlData.publicUrl
    }
    
    // Insert Menu Item
    const { data: itemData, error: insertError } = await (client as any)
      .from('menu_items')
      .insert({
        store_id: store.value.id,
        category_id: form.value.category_id || null,
        name_th: form.value.name_th.trim(),
        name_en: form.value.name_en?.trim() || null,
        name_zh: form.value.name_zh?.trim() || null,
        description_th: form.value.description_th?.trim() || null,
        description_en: form.value.explanation_en?.trim() || null,
        description_zh: form.value.description_zh?.trim() || null,
        explanation_en: form.value.explanation_en?.trim() || null,
        price: parseFloat(form.value.price),
        is_available: form.value.is_available,
        is_spicy: form.value.is_spicy,
        spicy_level: form.value.is_spicy ? form.value.spicy_level : 0,
        photo_url: finalPhotoUrl || null
      })
      .select()
      .single()
      
    if (insertError) throw insertError
    
    // Insert Allergens if selected
    if (selectedAllergens.value.length > 0 && itemData?.id) {
      const allergenInserts = selectedAllergens.value.map(allergenId => ({
        menu_item_id: itemData.id,
        allergen_id: allergenId
      }))
      await (client as any).from('menu_item_allergens').insert(allergenInserts)
    }

    // Insert Customization Groups if selected
    if (selectedGroups.value.length > 0 && itemData?.id) {
      const groupInserts = selectedGroups.value.map(groupId => ({
        menu_item_id: itemData.id,
        group_id: groupId
      }))
      await (client as any).from('menu_item_customizations').insert(groupInserts)
    }
    
    useToast().success(`เพิ่มเมนู "${form.value.name_th}" เรียบร้อยแล้ว!`)
    router.push('/merchant/menu')
  } catch (e: any) {
    errorMsg.value = e.message || 'ไม่สามารถสร้างเมนูอาหารได้'
    useToast().error(errorMsg.value)
    saving.value = false
  }
}
</script>

<template>
  <div class="max-w-4xl mx-auto pb-20 space-y-6">
    
    <!-- Top Nav Back & Title -->
    <div class="flex items-center justify-between gap-4 border-b pb-4">
      <div class="flex items-center gap-3">
        <NuxtLink 
          to="/merchant/menu" 
          class="p-2 bg-muted/60 hover:bg-muted text-foreground rounded-2xl transition-colors"
          title="กลับหน้ารายการอาหาร"
        >
          <ArrowLeft class="w-4 h-4" />
        </NuxtLink>
        <div>
          <h1 class="text-lg sm:text-xl font-bold tracking-tight text-foreground">
            {{ $t('menu_item_create_title') }}
          </h1>
          <p class="text-xs text-muted-foreground font-normal">
            เพิ่มรายการอาหารใหม่ในร้านของคุณ
          </p>
        </div>
      </div>
    </div>

    <div v-if="loading" class="p-12 text-center bg-card rounded-3xl border shadow-xs">
      <div class="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
      <p class="text-xs text-muted-foreground font-normal">{{ $t('loading') }}</p>
    </div>

    <form v-else @submit.prevent="submitForm" class="space-y-6">
      
      <!-- 1. Basic Info & Photo Card -->
      <div class="bg-card border rounded-3xl p-5 sm:p-7 shadow-xs space-y-5">
        <h2 class="text-sm font-bold text-foreground border-b pb-3 flex items-center gap-2">
          <span>{{ $t('item_basic_info') }}</span>
        </h2>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          
          <!-- Image Upload Area -->
          <div class="sm:col-span-2 flex flex-col sm:flex-row gap-4 items-start">
            <div class="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-muted border-2 border-dashed border-border flex items-center justify-center overflow-hidden relative group cursor-pointer hover:border-primary transition-colors shrink-0">
              <img v-if="photoPreview" :src="photoPreview" class="h-full w-full object-cover" alt="Preview">
              <div v-else class="text-muted-foreground flex flex-col items-center gap-1 p-2 text-center">
                <ImageIcon class="w-6 h-6 text-muted-foreground" />
                <span class="text-[10px] font-medium">+ เพิ่มรูปภาพ</span>
              </div>
              <input type="file" accept="image/*" @change="handlePhotoUpload" class="absolute inset-0 opacity-0 cursor-pointer w-full h-full">
            </div>

            <div class="space-y-1">
              <h3 class="text-xs font-semibold text-foreground">{{ $t('item_photo') }}</h3>
              <p class="text-[11px] text-muted-foreground font-normal leading-relaxed">
                {{ $t('item_photo_hint') }} (ขนาดแนะนำไม่เกิน 5MB)
              </p>
            </div>
          </div>

          <!-- Name TH (Required) -->
          <div class="sm:col-span-2">
            <label class="block text-xs font-semibold text-foreground mb-1.5">
              {{ $t('item_name_th') }} <span class="text-destructive">*</span>
            </label>
            <input 
              v-model="form.name_th" 
              type="text" 
              required 
              placeholder="เช่น ต้มยำกุ้งน้ำข้น, ผัดไทยกุ้งสด"
              class="w-full px-3.5 py-2.5 bg-background border rounded-xl text-xs text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-hidden font-normal"
            />
          </div>

          <!-- Price & Category Row -->
          <div>
            <label class="block text-xs font-semibold text-foreground mb-1.5">
              {{ $t('item_price') }} (บาท) <span class="text-destructive">*</span>
            </label>
            <input 
              v-model="form.price" 
              type="number" 
              step="0.01" 
              min="0" 
              required 
              placeholder="เช่น 120"
              class="w-full px-3.5 py-2.5 bg-background border rounded-xl text-xs text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-hidden font-normal"
            />
          </div>

          <div>
            <label class="block text-xs font-semibold text-foreground mb-1.5">
              {{ $t('item_category') }}
            </label>
            <select 
              v-model="form.category_id" 
              class="w-full px-3.5 py-2.5 bg-background border rounded-xl text-xs text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-hidden font-normal cursor-pointer"
            >
              <option value="">{{ $t('item_no_cat') }}</option>
              <option v-for="cat in categories" :key="cat.id" :value="cat.id">{{ cat.name_th }}</option>
            </select>
          </div>

          <!-- Description TH -->
          <div class="sm:col-span-2">
            <label class="block text-xs font-semibold text-foreground mb-1.5">
              {{ $t('item_desc_th') }}
            </label>
            <textarea 
              v-model="form.description_th" 
              rows="2" 
              placeholder="อธิบายรสชาติหรือวัตถุดิบเด่น..."
              class="w-full px-3.5 py-2.5 bg-background border rounded-xl text-xs text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-hidden font-normal leading-relaxed"
            ></textarea>
          </div>

        </div>
      </div>

      <!-- 2. AI Translation & Tourist-Ready Multi-Language Card -->
      <div class="bg-gradient-to-br from-primary/5 via-card to-amber-500/5 border border-primary/20 rounded-3xl p-5 sm:p-7 shadow-xs space-y-4">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/50 pb-3">
          <div class="flex items-center gap-2.5">
            <div class="w-8 h-8 rounded-xl bg-primary text-primary-foreground flex items-center justify-center text-sm shadow-xs shrink-0">
              <Sparkles class="w-4 h-4" />
            </div>
            <div>
              <h2 class="text-sm font-bold text-foreground">ภาษาสำหรับนักท่องเที่ยว (Tourist-Ready)</h2>
              <p class="text-[11px] text-muted-foreground font-normal">
                แปลชื่อและคำอธิบายเป็นภาษาอังกฤษและจีนอัตโนมัติด้วย AI
              </p>
            </div>
          </div>

          <button 
            type="button" 
            @click="openAiTranslate"
            class="px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs rounded-xl shadow-xs transition-all inline-flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
          >
            <Sparkles class="w-3.5 h-3.5" />
            <span>{{ (form.name_en || form.name_zh) ? 'แก้ไขคำแปล / แปล AI' : '✨ จัดการภาษา & แปล AI' }}</span>
          </button>
        </div>

        <!-- Translation Status Badges / Preview -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <!-- English Status -->
          <div class="p-3.5 rounded-2xl bg-card border flex items-start justify-between gap-2 shadow-2xs">
            <div class="space-y-0.5 min-w-0">
              <div class="flex items-center gap-1.5">
                <span class="text-xs">🇺🇸</span>
                <span class="text-xs font-semibold text-foreground">ภาษาอังกฤษ (EN)</span>
              </div>
              <p class="text-[11px] text-muted-foreground truncate font-normal">
                {{ form.name_en || 'ยังไม่ได้ระบุชื่อภาษาอังกฤษ' }}
              </p>
            </div>
            <span 
              class="px-2 py-0.5 rounded-md text-[10px] font-medium shrink-0"
              :class="form.name_en ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'"
            >
              {{ form.name_en ? 'มีคำแปลแล้ว' : 'ยังไม่มี' }}
            </span>
          </div>

          <!-- Chinese Status -->
          <div class="p-3.5 rounded-2xl bg-card border flex items-start justify-between gap-2 shadow-2xs">
            <div class="space-y-0.5 min-w-0">
              <div class="flex items-center gap-1.5">
                <span class="text-xs">🇨🇳</span>
                <span class="text-xs font-semibold text-foreground">ภาษาจีน (ZH)</span>
              </div>
              <p class="text-[11px] text-muted-foreground truncate font-normal">
                {{ form.name_zh || 'ยังไม่ได้ระบุชื่อภาษาจีน' }}
              </p>
            </div>
            <span 
              class="px-2 py-0.5 rounded-md text-[10px] font-medium shrink-0"
              :class="form.name_zh ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'"
            >
              {{ form.name_zh ? 'มีคำแปลแล้ว' : 'ยังไม่มี' }}
            </span>
          </div>
        </div>
      </div>

      <!-- 3. Spicy Level & Dietary Info Card -->
      <div class="bg-card border rounded-3xl p-5 sm:p-7 shadow-xs space-y-5">
        <h2 class="text-sm font-bold text-foreground border-b pb-3">
          ระดับความเผ็ดและสารก่อภูมิแพ้
        </h2>

        <!-- Spicy Level -->
        <div class="p-4 rounded-2xl bg-muted/20 border border-border/50 space-y-3">
          <div class="flex items-center justify-between">
            <label class="flex items-center gap-2 cursor-pointer select-none">
              <input v-model="form.is_spicy" type="checkbox" class="w-4 h-4 rounded text-primary focus:ring-primary">
              <span class="text-xs font-semibold text-foreground flex items-center gap-1">
                <span>🌶️ เมนูนี้มีความเผ็ด</span>
              </span>
            </label>
            <span v-if="form.is_spicy" class="text-xs font-semibold text-rose-600">
              ระดับ {{ form.spicy_level }} / 5
            </span>
          </div>

          <div v-if="form.is_spicy" class="pt-2 flex items-center gap-3">
            <input 
              v-model="form.spicy_level" 
              type="range" 
              min="1" 
              max="5" 
              step="1" 
              class="w-full max-w-xs accent-rose-600"
            />
            <span class="text-base tracking-wider select-none">{{ '🌶️'.repeat(Number(form.spicy_level || 1)) }}</span>
          </div>
        </div>

        <!-- Allergens Selection -->
        <div>
          <div class="flex items-center justify-between mb-2.5">
            <label class="block text-xs font-semibold text-foreground">
              {{ $t('item_allergens') }}
            </label>
            <span class="text-[11px] text-muted-foreground font-normal">{{ $t('item_allergens_hint') }}</span>
          </div>

          <div class="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <label 
              v-for="allergen in allAllergens" 
              :key="allergen.id" 
              class="p-2.5 rounded-2xl border cursor-pointer transition-all flex items-center gap-2 select-none"
              :class="selectedAllergens.includes(allergen.id) ? 'bg-primary/10 border-primary shadow-2xs font-semibold' : 'bg-background hover:bg-muted/40 text-foreground'"
            >
              <input 
                v-model="selectedAllergens" 
                :value="allergen.id" 
                type="checkbox" 
                class="w-3.5 h-3.5 rounded text-primary focus:ring-primary"
              />
              <div class="min-w-0 flex-1">
                <p class="text-xs truncate font-medium">{{ allergen.name_th }} {{ allergen.icon }}</p>
                <p class="text-[10px] text-muted-foreground truncate font-normal">{{ allergen.name_en }}</p>
              </div>
            </label>
          </div>
        </div>

        <!-- Customizations Groups -->
        <div v-if="allGroups.length > 0" class="pt-2 border-t border-border/50">
          <div class="flex items-center justify-between mb-2.5">
            <label class="block text-xs font-semibold text-foreground">
              กลุ่มตัวเลือกเพิ่มเติม (Customization Groups)
            </label>
            <span class="text-[11px] text-muted-foreground font-normal">เช่น ระดับความหวาน, ท็อปปิ้ง</span>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <label 
              v-for="group in allGroups" 
              :key="group.id" 
              class="p-3 rounded-2xl border cursor-pointer transition-all flex items-center gap-2.5 select-none"
              :class="selectedGroups.includes(group.id) ? 'bg-primary/10 border-primary shadow-2xs font-semibold' : 'bg-background hover:bg-muted/40 text-foreground'"
            >
              <input 
                v-model="selectedGroups" 
                :value="group.id" 
                type="checkbox" 
                class="w-4 h-4 rounded text-primary focus:ring-primary"
              />
              <div class="min-w-0 flex-1">
                <p class="text-xs font-semibold text-foreground truncate">
                  {{ group.name_th }}
                  <span v-if="group.is_required" class="text-rose-500 font-bold ml-1 text-[10px]">(บังคับเลือก)</span>
                </p>
                <p v-if="group.name_en" class="text-[10px] text-muted-foreground truncate font-normal">
                  {{ group.name_en }}
                </p>
              </div>
            </label>
          </div>
        </div>

      </div>

      <!-- Alerts -->
      <div v-if="errorMsg" class="p-4 rounded-2xl bg-destructive/10 border border-destructive/20 text-xs font-medium text-destructive flex items-center gap-2">
        <AlertCircle class="w-4 h-4 shrink-0" />
        <span>{{ errorMsg }}</span>
      </div>

      <!-- Sticky Submit Bar -->
      <div class="bg-card border rounded-3xl p-4 shadow-lg flex items-center justify-between gap-3 sticky bottom-4 z-20 backdrop-blur-md bg-card/95">
        <NuxtLink 
          to="/merchant/menu" 
          class="px-5 py-2.5 bg-muted hover:bg-muted/80 text-foreground font-medium text-xs rounded-xl transition-colors"
        >
          {{ $t('item_cancel') }}
        </NuxtLink>

        <button 
          type="submit" 
          :disabled="saving"
          class="px-7 py-2.5 bg-primary text-primary-foreground font-semibold text-xs rounded-xl shadow-xs hover:bg-primary/90 transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
        >
          <span v-if="saving" class="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
          <Check v-else class="w-4 h-4" />
          <span>{{ saving ? $t('item_saving_img') : $t('item_save_changes') }}</span>
        </button>
      </div>

    </form>

    <!-- AI Multi-Language Translation Modal -->
    <AiTranslateModal 
      v-model="isAiModalOpen"
      :name-th="form.name_th"
      :description-th="form.description_th"
      :name-en="form.name_en"
      :name-zh="form.name_zh"
      :explanation-en="form.explanation_en"
      :description-zh="form.description_zh"
      @apply="handleTranslationsApplied"
    />

  </div>
</template>
