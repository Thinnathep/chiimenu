<script setup lang="ts">
import { ref, watch } from 'vue'
import { 
  Sparkles, 
  X, 
  Check, 
  Globe, 
  Eye, 
  RefreshCw, 
  Languages, 
  AlertCircle,
  UtensilsCrossed,
  Info
} from 'lucide-vue-next'

const props = defineProps<{
  modelValue: boolean
  nameTh: string
  descriptionTh?: string
  nameEn?: string
  nameZh?: string
  explanationEn?: string
  descriptionZh?: string
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', val: boolean): void
  (e: 'apply', data: {
    name_en: string
    name_zh: string
    explanation_en: string
    description_zh: string
  }): void
}>()

const isTranslating = ref(false)
const activeTab = ref<'en' | 'zh'>('en')

// Local editable translation state
const localNameEn = ref('')
const localNameZh = ref('')
const localExplanationEn = ref('')
const localDescriptionZh = ref('')

// Synchronize with incoming props when modal opens
watch(() => props.modelValue, (isOpen) => {
  if (isOpen) {
    localNameEn.value = props.nameEn || ''
    localNameZh.value = props.nameZh || ''
    localExplanationEn.value = props.explanationEn || ''
    localDescriptionZh.value = props.descriptionZh || ''
  }
})

const closeModal = () => {
  emit('update:modelValue', false)
}

const handleTranslate = async () => {
  if (!props.nameTh?.trim()) {
    useToast().warning('กรุณากรอกชื่อเมนูภาษาไทยในฟอร์มก่อนแปลภาษา')
    return
  }

  isTranslating.value = true
  try {
    const data = await $fetch<any>('/api/translate', {
      method: 'POST',
      body: {
        name_th: props.nameTh.trim(),
        description_th: props.descriptionTh?.trim() || ''
      }
    })

    if (data && !data.error) {
      if (data.name_en) localNameEn.value = data.name_en
      if (data.name_zh) localNameZh.value = data.name_zh
      if (data.description_en) localExplanationEn.value = data.description_en
      if (data.description_zh) localDescriptionZh.value = data.description_zh
      useToast().success('AI แปลภาษาสำเร็จแล้ว!')
    } else {
      useToast().error(data?.message || 'การแปลล้มเหลว กรุณาลองใหม่อีกครั้ง')
    }
  } catch (err: any) {
    console.error('AI Translate error:', err)
    useToast().error(err.data?.message || err.message || 'ไม่สามารถเชื่อมต่อระบบ AI ได้')
  } finally {
    isTranslating.value = false
  }
}

const applyTranslations = () => {
  emit('apply', {
    name_en: localNameEn.value.trim(),
    name_zh: localNameZh.value.trim(),
    explanation_en: localExplanationEn.value.trim(),
    description_zh: localDescriptionZh.value.trim()
  })
  useToast().success('นำคำแปลไปใส่ในฟอร์มเรียบร้อยแล้ว')
  closeModal()
}
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition ease-out duration-300"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition ease-in duration-200"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div 
        v-if="modelValue" 
        class="fixed inset-0 z-[260] flex items-end sm:items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-md overflow-y-auto"
        @click.self="closeModal"
      >
        <div 
          class="w-full max-w-2xl bg-card text-foreground rounded-3xl shadow-2xl border border-border overflow-hidden animate-in zoom-in-95 duration-200 my-auto flex flex-col max-h-[90vh]"
        >
          <!-- Header Bar -->
          <div class="p-5 sm:p-6 border-b border-border bg-gradient-to-r from-primary/5 via-card to-amber-500/5 relative shrink-0">
            <button 
              type="button" 
              @click="closeModal"
              class="absolute top-5 right-5 p-2 rounded-2xl bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              <X class="w-4 h-4" />
            </button>

            <div class="flex items-center gap-3">
              <div class="w-11 h-11 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center text-xl shadow-sm shadow-primary/20 shrink-0">
                <Sparkles class="w-5 h-5" />
              </div>
              <div>
                <div class="flex items-center gap-2">
                  <h3 class="text-base sm:text-lg font-bold tracking-tight text-foreground">
                    แปลภาษาเมนูด้วย AI (Tourist-Ready)
                  </h3>
                  <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary border border-primary/20">
                    EN & ZH
                  </span>
                </div>
                <p class="text-xs text-muted-foreground mt-0.5">
                  แปลชื่อและคำอธิบายเมนูอาหารเพื่อรองรับนักท่องเที่ยวต่างชาติ
                </p>
              </div>
            </div>

            <!-- Original Thai Context Box -->
            <div class="mt-4 p-3.5 bg-muted/40 rounded-2xl border border-border/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div class="text-xs">
                <span class="text-muted-foreground font-medium">ชื่อภาษาไทย: </span>
                <strong class="text-foreground font-semibold">{{ nameTh || '(ยังไม่ได้กรอกชื่อเมนู)' }}</strong>
                <p v-if="descriptionTh" class="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">
                  {{ descriptionTh }}
                </p>
              </div>

              <!-- Quick AI Trigger Button -->
              <button
                type="button"
                @click="handleTranslate"
                :disabled="isTranslating || !nameTh"
                class="px-4 py-2 bg-gradient-to-r from-primary to-rose-600 hover:from-primary/90 hover:to-rose-600/90 text-primary-foreground font-semibold text-xs rounded-xl shadow-xs transition-all inline-flex items-center justify-center gap-1.5 shrink-0 cursor-pointer disabled:opacity-50"
              >
                <span v-if="isTranslating" class="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                <Sparkles v-else class="w-3.5 h-3.5" />
                <span>{{ isTranslating ? 'กำลังให้ AI แปล...' : '⚡ กดให้ AI แปลอัตโนมัติ' }}</span>
              </button>
            </div>
          </div>

          <!-- Body: Translation Inputs & Preview -->
          <div class="p-5 sm:p-6 space-y-5 overflow-y-auto flex-1">
            
            <!-- Language Switcher Tabs -->
            <div class="grid grid-cols-2 gap-2 p-1 bg-muted/60 rounded-2xl border border-border/50">
              <button
                type="button"
                @click="activeTab = 'en'"
                class="py-2 px-3 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer"
                :class="activeTab === 'en' ? 'bg-background text-foreground shadow-xs border border-border font-bold' : 'text-muted-foreground hover:text-foreground'"
              >
                <span>🇺🇸</span>
                <span>ภาษาอังกฤษ (English)</span>
                <span v-if="localNameEn" class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              </button>
              <button
                type="button"
                @click="activeTab = 'zh'"
                class="py-2 px-3 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer"
                :class="activeTab === 'zh' ? 'bg-background text-foreground shadow-xs border border-border font-bold' : 'text-muted-foreground hover:text-foreground'"
              >
                <span>🇨🇳</span>
                <span>ภาษาจีน (中文)</span>
                <span v-if="localNameZh" class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              </button>
            </div>

            <!-- English Fields -->
            <div v-if="activeTab === 'en'" class="space-y-4 animate-in fade-in-50 duration-150">
              <div>
                <label class="block text-xs font-semibold text-foreground mb-1.5">
                  ชื่อเมนูภาษาอังกฤษ (Item Name EN)
                </label>
                <input 
                  v-model="localNameEn"
                  type="text" 
                  placeholder="e.g. Tom Yum Kung (Spicy Shrimp Soup)" 
                  class="w-full px-3.5 py-2.5 bg-background border rounded-xl text-xs text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-hidden font-normal"
                />
              </div>

              <div>
                <div class="flex items-center justify-between mb-1.5">
                  <label class="block text-xs font-semibold text-foreground">
                    คำอธิบายสำหรับนักท่องเที่ยว (Tourist Explanation EN)
                  </label>
                  <span class="text-[10px] text-muted-foreground">แนะนำวัตถุดิบและรสชาติ</span>
                </div>
                <textarea 
                  v-model="localExplanationEn"
                  rows="3"
                  placeholder="e.g. Authentic Thai spicy and sour soup with fresh river prawns, lemongrass, galangal, and lime juice." 
                  class="w-full px-3.5 py-2.5 bg-background border rounded-xl text-xs text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-hidden font-normal leading-relaxed"
                ></textarea>
              </div>
            </div>

            <!-- Chinese Fields -->
            <div v-else class="space-y-4 animate-in fade-in-50 duration-150">
              <div>
                <label class="block text-xs font-semibold text-foreground mb-1.5">
                  ชื่อเมนูภาษาจีน (菜品名称 ZH)
                </label>
                <input 
                  v-model="localNameZh"
                  type="text" 
                  placeholder="例如：冬阴功虾汤 (Tom Yum Goong)" 
                  class="w-full px-3.5 py-2.5 bg-background border rounded-xl text-xs text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-hidden font-normal"
                />
              </div>

              <div>
                <div class="flex items-center justify-between mb-1.5">
                  <label class="block text-xs font-semibold text-foreground">
                    คำอธิบายภาษาจีน (菜品介绍 ZH)
                  </label>
                  <span class="text-[10px] text-muted-foreground">คำอธิบายรสชาติภาษาจีน</span>
                </div>
                <textarea 
                  v-model="localDescriptionZh"
                  rows="3"
                  placeholder="例如：泰国经典酸辣虾汤，配有新鲜河虾、柠檬草、高良姜和新鲜青柠汁。" 
                  class="w-full px-3.5 py-2.5 bg-background border rounded-xl text-xs text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-hidden font-normal leading-relaxed"
                ></textarea>
              </div>
            </div>

            <!-- Live Tourist Preview Card -->
            <div class="p-4 bg-muted/20 border border-border/60 rounded-2xl space-y-2">
              <div class="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground">
                <Eye class="w-3.5 h-3.5 text-primary" />
                <span>ตัวอย่างการแสดงผลบนหน้าจอนักท่องเที่ยว ({{ activeTab === 'en' ? 'English View' : 'Chinese View' }}):</span>
              </div>

              <div class="p-3.5 bg-card border rounded-xl shadow-2xs space-y-1">
                <div class="flex items-center justify-between gap-2">
                  <h4 class="text-sm font-semibold text-foreground">
                    {{ (activeTab === 'en' ? localNameEn : localNameZh) || '(ยังไม่มีคำแปล)' }}
                  </h4>
                  <span class="text-[11px] font-medium text-muted-foreground font-mono">฿0.00</span>
                </div>
                <p class="text-[11px] text-muted-foreground font-normal leading-relaxed">
                  {{ (activeTab === 'en' ? localExplanationEn : localDescriptionZh) || '(คำอธิบายเมนูอาหารสำหรับนักท่องเที่ยว)' }}
                </p>
              </div>
            </div>

          </div>

          <!-- Footer Action Bar -->
          <div class="p-4 sm:p-6 border-t border-border bg-muted/10 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
            <button
              type="button"
              @click="closeModal"
              class="w-full sm:w-auto px-5 py-2.5 bg-muted hover:bg-muted/80 text-foreground font-semibold text-xs rounded-xl transition-colors cursor-pointer border"
            >
              ยกเลิก
            </button>

            <button
              type="button"
              @click="applyTranslations"
              class="w-full sm:w-auto px-6 py-2.5 bg-primary text-primary-foreground font-semibold text-xs rounded-xl shadow-xs hover:bg-primary/90 transition-all inline-flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Check class="w-4 h-4" />
              <span>นำคำแปลไปใช้ในเมนู</span>
            </button>
          </div>

        </div>
      </div>
    </Transition>
  </Teleport>
</template>
