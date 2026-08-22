<script setup lang="ts">
import { 
  Smartphone, 
  X, 
  Copy, 
  Check, 
  ExternalLink, 
  Share, 
  PlusSquare, 
  MoreVertical, 
  Download, 
  ShieldCheck, 
  Sparkles,
  Info
} from 'lucide-vue-next'

const { 
  showInstallModal, 
  activeInstallTab, 
  deferredInstallPrompt, 
  closeInstallModal, 
  promptAndroidInstall,
  isIOS 
} = useOrderNotification()

const isCopied = ref(false)

const copyCurrentUrl = async () => {
  if (typeof window === 'undefined') return
  try {
    await navigator.clipboard.writeText(window.location.origin + '/merchant/dashboard')
    isCopied.value = true
    useToast().success('คัดลอกลิงก์แล้ว! นำไปวางใน Safari หรือ Chrome ได้ทันที')
    setTimeout(() => { isCopied.value = false }, 3000)
  } catch (e) {
    useToast().error('ไม่สามารถคัดลอกลิงก์ได้')
  }
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
        v-if="showInstallModal" 
        class="fixed inset-0 z-[250] flex items-end sm:items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-md overflow-y-auto"
        @click.self="closeInstallModal"
      >
        <div 
          class="w-full max-w-lg bg-card text-foreground rounded-3xl shadow-2xl border border-border overflow-hidden animate-in zoom-in-95 duration-200 my-auto"
        >
          <!-- Header Bar -->
          <div class="p-6 pb-4 border-b border-border bg-muted/20 relative">
            <button 
              type="button" 
              @click="closeInstallModal"
              class="absolute top-5 right-5 p-2 rounded-2xl bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              <X class="w-4 h-4" />
            </button>

            <div class="flex items-center gap-3">
              <div class="w-12 h-12 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center text-2xl shadow-sm shadow-primary/20 shrink-0">
                <Smartphone class="w-6 h-6" />
              </div>
              <div>
                <h3 class="text-lg font-black tracking-tight text-foreground">
                  วิธีติดตั้งแอป ChiiMenu บนมือถือ
                </h3>
                <p class="text-xs text-muted-foreground mt-0.5">
                  เปิดใช้งานเต็มจอ ลื่นไหล พร้อมรับแจ้งเตือนออเดอร์แม้ล็อกหน้าจอ
                </p>
              </div>
            </div>

            <!-- Device Selector Tabs -->
            <div class="grid grid-cols-2 gap-2 mt-5 p-1 bg-muted/60 rounded-2xl border border-border/50">
              <button
                type="button"
                @click="activeInstallTab = 'android'"
                class="py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
                :class="activeInstallTab === 'android' ? 'bg-background text-foreground shadow-xs border border-border' : 'text-muted-foreground hover:text-foreground'"
              >
                <span>🤖</span>
                <span>Android (Chrome)</span>
              </button>
              <button
                type="button"
                @click="activeInstallTab = 'ios'"
                class="py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
                :class="activeInstallTab === 'ios' ? 'bg-background text-foreground shadow-xs border border-border' : 'text-muted-foreground hover:text-foreground'"
              >
                <span>🍏</span>
                <span>iOS (iPhone / iPad)</span>
              </button>
            </div>
          </div>

          <!-- Body Content: Android Tab -->
          <div v-if="activeInstallTab === 'android'" class="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
            
            <!-- Quick 1-Click Install Button (if Chrome prompt ready) -->
            <div v-if="deferredInstallPrompt" class="p-4 rounded-2xl bg-gradient-to-r from-primary/10 via-card to-rose-500/10 border border-primary/30 flex items-center justify-between gap-3 shadow-xs">
              <div>
                <p class="text-xs font-bold text-foreground">เครื่องของคุณพร้อมติดตั้งทันที</p>
                <p class="text-[11px] text-muted-foreground">กดปุ่มเพื่อติดตั้ง ChiiMenu ลงเครื่องได้ในคลิกเดียว</p>
              </div>
              <button
                type="button"
                @click="promptAndroidInstall"
                class="px-4 py-2 bg-primary text-primary-foreground font-bold text-xs rounded-xl shadow-xs hover:bg-primary/90 transition-all shrink-0 inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Download class="w-3.5 h-3.5" />
                <span>ติดตั้งทันที</span>
              </button>
            </div>

            <div class="space-y-3 text-xs">
              <!-- Step 1 -->
              <div class="p-4 bg-muted/30 border rounded-2xl flex items-start gap-3.5">
                <span class="w-6 h-6 rounded-full bg-primary text-primary-foreground font-bold flex items-center justify-center shrink-0 text-xs shadow-xs">1</span>
                <div class="space-y-1">
                  <h4 class="font-bold text-foreground">เปิดเว็บไซต์ใน Google Chrome</h4>
                  <p class="text-muted-foreground text-[11px] leading-relaxed">
                    เปิดเบราว์เซอร์ <strong>Google Chrome</strong> หรือ <strong>Samsung Internet</strong> แล้วเข้าสู่ระบบร้านค้า ChiiMenu
                  </p>
                </div>
              </div>

              <!-- Step 2 -->
              <div class="p-4 bg-muted/30 border rounded-2xl flex items-start gap-3.5">
                <span class="w-6 h-6 rounded-full bg-primary text-primary-foreground font-bold flex items-center justify-center shrink-0 text-xs shadow-xs">2</span>
                <div class="space-y-1">
                  <h4 class="font-bold text-foreground flex items-center gap-1.5">
                    <span>กดปุ่มเมนูจุด 3 จุด</span>
                    <span class="p-1 rounded bg-muted font-mono font-bold text-foreground inline-flex items-center"><MoreVertical class="w-3 h-3" /></span>
                  </h4>
                  <p class="text-muted-foreground text-[11px] leading-relaxed">
                    กดที่จุดสามจุด <strong class="text-foreground">(⋮)</strong> ที่มุมขวาบนของหน้าจอเบราว์เซอร์
                  </p>
                </div>
              </div>

              <!-- Step 3 -->
              <div class="p-4 bg-muted/30 border rounded-2xl flex items-start gap-3.5">
                <span class="w-6 h-6 rounded-full bg-primary text-primary-foreground font-bold flex items-center justify-center shrink-0 text-xs shadow-xs">3</span>
                <div class="space-y-1">
                  <h4 class="font-bold text-foreground">เลือก "ติดตั้งแอป" หรือ "เพิ่มลงในหน้าจอหลัก"</h4>
                  <p class="text-muted-foreground text-[11px] leading-relaxed">
                    เลือกเมนู <strong>"ติดตั้งแอป (Install App)"</strong> หรือ <strong>"เพิ่มลงในหน้าจอหลัก (Add to Home screen)"</strong>
                  </p>
                </div>
              </div>

              <!-- Step 4 -->
              <div class="p-4 bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 rounded-2xl flex items-start gap-3.5">
                <span class="w-6 h-6 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center shrink-0 text-xs shadow-xs">4</span>
                <div class="space-y-1">
                  <h4 class="font-bold text-emerald-950 dark:text-emerald-300">กดยืนยัน "ติดตั้ง" (Install)</h4>
                  <p class="text-emerald-800 dark:text-emerald-400 text-[11px] leading-relaxed">
                    ไอคอน ChiiMenu จะไปปรากฏบนหน้าจอหลักของมือถือ สามารถเปิดใช้งานเหมือนแอปจริงได้ทันที!
                  </p>
                </div>
              </div>
            </div>

          </div>

          <!-- Body Content: iOS Tab -->
          <div v-else class="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
            
            <!-- Apple Safari Notice Banner -->
            <div class="p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 flex items-start gap-3 text-xs">
              <Info class="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div class="text-amber-950 dark:text-amber-300 text-[11px] leading-relaxed">
                <strong>ข้อกำหนดของ Apple:</strong> บน iPhone / iPad จะต้องติดตั้งผ่านเบราว์เซอร์ <strong>Safari</strong> เท่านั้น เพื่อให้ระบบแจ้งเตือนแบบพุช (Push Notification) ทำงานได้
              </div>
            </div>

            <div class="space-y-3 text-xs">
              <!-- Step 1 -->
              <div class="p-4 bg-muted/30 border rounded-2xl flex items-start gap-3.5">
                <span class="w-6 h-6 rounded-full bg-primary text-primary-foreground font-bold flex items-center justify-center shrink-0 text-xs shadow-xs">1</span>
                <div class="space-y-1">
                  <h4 class="font-bold text-foreground">เปิดเว็บไซต์ใน Safari</h4>
                  <p class="text-muted-foreground text-[11px] leading-relaxed">
                    เปิดแอป <strong>Safari</strong> บน iPhone/iPad แล้วเข้าเว็บไซต์ ChiiMenu (หากเปิดจาก LINE ให้กดเปิดใน Safari ก่อน)
                  </p>
                </div>
              </div>

              <!-- Step 2 -->
              <div class="p-4 bg-muted/30 border rounded-2xl flex items-start gap-3.5">
                <span class="w-6 h-6 rounded-full bg-primary text-primary-foreground font-bold flex items-center justify-center shrink-0 text-xs shadow-xs">2</span>
                <div class="space-y-1">
                  <h4 class="font-bold text-foreground flex items-center gap-1.5">
                    <span>กดปุ่มแชร์ (Share)</span>
                    <span class="p-1 rounded bg-muted font-mono font-bold text-foreground inline-flex items-center"><Share class="w-3 h-3" /></span>
                  </h4>
                  <p class="text-muted-foreground text-[11px] leading-relaxed">
                    กดปุ่มไอคอนสี่เหลี่ยมลูกศรชี้ขึ้น <strong>(Share)</strong> บริเวณแถบเมนูด้านล่างสุดของหน้าจอ
                  </p>
                </div>
              </div>

              <!-- Step 3 -->
              <div class="p-4 bg-muted/30 border rounded-2xl flex items-start gap-3.5">
                <span class="w-6 h-6 rounded-full bg-primary text-primary-foreground font-bold flex items-center justify-center shrink-0 text-xs shadow-xs">3</span>
                <div class="space-y-1">
                  <h4 class="font-bold text-foreground flex items-center gap-1.5">
                    <span>เลือก "เพิ่มไปยังหน้าจอโฮม"</span>
                    <span class="p-1 rounded bg-muted font-mono font-bold text-foreground inline-flex items-center"><PlusSquare class="w-3 h-3" /></span>
                  </h4>
                  <p class="text-muted-foreground text-[11px] leading-relaxed">
                    เลื่อนรายการเมนูลงมา แล้วกดเลือกที่ <strong>"เพิ่มไปยังหน้าจอโฮม" (Add to Home Screen)</strong>
                  </p>
                </div>
              </div>

              <!-- Step 4 -->
              <div class="p-4 bg-muted/30 border rounded-2xl flex items-start gap-3.5">
                <span class="w-6 h-6 rounded-full bg-primary text-primary-foreground font-bold flex items-center justify-center shrink-0 text-xs shadow-xs">4</span>
                <div class="space-y-1">
                  <h4 class="font-bold text-foreground">กดปุ่ม "เพิ่ม" (Add)</h4>
                  <p class="text-muted-foreground text-[11px] leading-relaxed">
                    กดปุ่ม <strong>"เพิ่ม" (Add)</strong> ที่มุมขวาบนของหน้าจอ iPhone
                  </p>
                </div>
              </div>

              <!-- Step 5 -->
              <div class="p-4 bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 rounded-2xl flex items-start gap-3.5">
                <span class="w-6 h-6 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center shrink-0 text-xs shadow-xs">5</span>
                <div class="space-y-1">
                  <h4 class="font-bold text-emerald-950 dark:text-emerald-300">เปิดแอปและกดเปิดการแจ้งเตือน</h4>
                  <p class="text-emerald-800 dark:text-emerald-400 text-[11px] leading-relaxed">
                    เปิดแอป ChiiMenu จากหน้าจอโฮม เข้าเมนูตั้งค่าร้านค้า แล้วกด <strong>"เปิดการแจ้งเตือน"</strong> เพื่อรับเตือนออเดอร์แบบเต็มประสิทธิภาพ
                  </p>
                </div>
              </div>
            </div>

          </div>

          <!-- Footer Actions -->
          <div class="p-4 sm:p-6 border-t border-border bg-muted/10 flex flex-col sm:flex-row items-center justify-between gap-3">
            <button
              type="button"
              @click="copyCurrentUrl"
              class="w-full sm:w-auto px-4 py-2.5 bg-muted hover:bg-muted/80 text-foreground font-semibold text-xs rounded-xl transition-colors inline-flex items-center justify-center gap-1.5 cursor-pointer border"
            >
              <Check v-if="isCopied" class="w-3.5 h-3.5 text-emerald-600" />
              <Copy v-else class="w-3.5 h-3.5 text-muted-foreground" />
              <span>{{ isCopied ? 'คัดลอกลิงก์เรียบร้อยแล้ว' : 'คัดลอกลิงก์ร้านเพื่อเปิดในเบราว์เซอร์' }}</span>
            </button>

            <button
              type="button"
              @click="closeInstallModal"
              class="w-full sm:w-auto px-6 py-2.5 bg-primary text-primary-foreground font-bold text-xs rounded-xl shadow-xs hover:bg-primary/90 transition-all cursor-pointer text-center"
            >
              เข้าใจแล้ว ปิดหน้าต่าง
            </button>
          </div>

        </div>
      </div>
    </Transition>
  </Teleport>
</template>
