<script setup lang="ts">
import { 
  ShieldCheck, 
  ShieldAlert, 
  Lock, 
  Unlock, 
  KeyRound, 
  Cat, 
  CheckCircle2, 
  AlertCircle,
  HelpCircle,
  Sparkles,
  UserCheck,
  RefreshCw
} from 'lucide-vue-next'

const props = defineProps<{
  userEmail?: string
  userId?: string
}>()

const emit = defineEmits<{
  (e: 'unlock'): void
  (e: 'lock'): void
}>()

const client = useSupabaseClient()
const isUnlocked = ref(false)
const answerInput = ref('')
const errorMsg = ref('')
const isShaking = ref(false)
const verifying = ref(false)
const showHint = ref(false)

// Session storage key
const SESSION_KEY = 'chiimenu_admin_master_session'
const SESSION_DURATION_HOURS = 4

const checkSession = () => {
  if (typeof window === 'undefined') return
  try {
    const raw = sessionStorage.getItem(SESSION_KEY)
    if (raw) {
      const session = JSON.parse(raw)
      const now = Date.now()
      if (session.unlocked && session.expiresAt > now) {
        isUnlocked.value = true
        emit('unlock')
        return
      }
    }
  } catch (e) {
    console.error('Session check error', e)
  }
  isUnlocked.value = false
}

onMounted(() => {
  checkSession()
})

const verifyAnswer = async () => {
  errorMsg.value = ''
  const trimmed = answerInput.value.trim()
  
  if (!trimmed) {
    errorMsg.value = 'กรุณากรอกคำตอบเพื่อยืนยันตัวตน'
    triggerShake()
    return
  }

  verifying.value = true
  
  // Security Challenge Verification
  // Question: แมวตัวโปรดชื่ออะไร
  // Answer: หมอก
  if (trimmed === 'หมอก') {
    // Verified successfully
    const expiresAt = Date.now() + (SESSION_DURATION_HOURS * 60 * 60 * 1000)
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({
      unlocked: true,
      email: props.userEmail,
      verifiedAt: new Date().toISOString(),
      expiresAt
    }))

    // Log security access in audit trail
    try {
      if (props.userId) {
        await (client as any).from('admin_action_logs').insert({
          admin_id: props.userId,
          action: 'SECURITY_CHALLENGE_VERIFIED',
          details: {
            method: 'SECURITY_QUESTION',
            question: 'favorite_cat_name',
            ip: 'client_session',
            verified_at: new Date().toISOString()
          }
        })
      }
    } catch (err) {
      console.warn('Audit log write error:', err)
    }

    isUnlocked.value = true
    verifying.value = false
    answerInput.value = ''
    useToast().success('ยืนยันตัวตน Super Admin สำเร็จ! ปลดล็อก Master Key เรียบร้อย')
    emit('unlock')
  } else {
    // Failed verification
    verifying.value = false
    errorMsg.value = 'คำตอบความปลอดภัยไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง'
    triggerShake()
    
    // Log failed attempt
    try {
      if (props.userId) {
        await (client as any).from('admin_action_logs').insert({
          admin_id: props.userId,
          action: 'SECURITY_CHALLENGE_FAILED',
          details: {
            attempt_input: trimmed,
            timestamp: new Date().toISOString()
          }
        })
      }
    } catch (err) {
      // Ignore
    }
  }
}

const triggerShake = () => {
  isShaking.value = true
  setTimeout(() => {
    isShaking.value = false
  }, 600)
}

const lockSession = () => {
  sessionStorage.removeItem(SESSION_KEY)
  isUnlocked.value = false
  answerInput.value = ''
  errorMsg.value = ''
  useToast().info('ล็อกเซสชัน Super Admin แล้ว')
  emit('lock')
}

defineExpose({
  isUnlocked,
  lockSession
})
</script>

<template>
  <div>
    <!-- UNLOCKED TOP BADGE (When session is active) -->
    <div v-if="isUnlocked" class="flex flex-wrap items-center justify-between gap-3 bg-gradient-to-r from-[#1B4B4A]/10 via-[#132525]/15 to-[#E8572E]/10 dark:from-[#1B4B4A]/90 dark:via-[#132525] dark:to-[#0c1818] border border-[#1B4B4A]/30 dark:border-[#1B4B4A] rounded-2xl px-4 sm:px-5 py-3 shadow-md backdrop-blur-md mb-6 transition-colors">
      <div class="flex items-center gap-3">
        <div class="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-sm shrink-0">
          <ShieldCheck class="w-4 h-4 sm:w-5 sm:h-5" />
        </div>
        <div>
          <div class="flex items-center gap-2 flex-wrap">
            <span class="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
              <span class="w-2 h-2 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse"></span>
              Super Admin Master Key Active
            </span>
            <span class="text-[10px] px-2 py-0.5 rounded-full bg-[#E8572E]/15 text-[#E8572E] border border-[#E8572E]/30 font-mono font-bold">
              Level 1 Authority
            </span>
          </div>
          <p class="text-xs text-gray-600 dark:text-gray-300 font-mono mt-0.5 truncate">
            เข้าสู่ระบบในนาม: <strong class="text-gray-900 dark:text-white">{{ userEmail || 'Super Admin' }}</strong>
          </p>
        </div>
      </div>

      <div class="flex items-center gap-2">
        <button 
          @click="lockSession"
          class="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-300 border border-red-500/30 transition-all font-medium cursor-pointer shadow-sm"
        >
          <Lock class="w-3.5 h-3.5" />
          <span>ล็อกเซสชัน</span>
        </button>
      </div>
    </div>

    <!-- LOCKED SECURITY GATE MODAL / SCREEN (When session is locked) -->
    <div v-else class="min-h-[65vh] flex items-center justify-center p-4">
      <div 
        class="w-full max-w-md bg-white dark:bg-gradient-to-b dark:from-[#162a2a] dark:via-[#102020] dark:to-[#0a1414] border border-[#E8E2D9] dark:border-[#1B4B4A]/60 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden backdrop-blur-xl transition-all duration-300"
        :class="{ 'animate-[shake_0.5s_ease-in-out]': isShaking }"
      >
        <!-- Ambient Glowing Background Elements -->
        <div class="absolute -top-20 -right-20 w-48 h-48 bg-[#E8572E]/15 rounded-full blur-3xl pointer-events-none"></div>
        <div class="absolute -bottom-20 -left-20 w-48 h-48 bg-[#1B4B4A]/25 rounded-full blur-3xl pointer-events-none"></div>

        <!-- Header Icon -->
        <div class="flex flex-col items-center text-center relative z-10 mb-6">
          <div class="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#1B4B4A] to-[#E8572E] p-0.5 shadow-xl shadow-[#E8572E]/20 mb-4">
            <div class="w-full h-full bg-[#FAF7F2] dark:bg-[#0c1818] rounded-2xl flex items-center justify-center text-[#E8572E]">
              <Lock class="w-8 h-8 animate-pulse" />
            </div>
          </div>

          <h2 class="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
            ChiiMenu Security Gate
          </h2>
          <p class="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1 max-w-xs">
            ระบบความปลอดภัยระดับสูงสุด กรุณายืนยันตัวตนด้วยคำถามความปลอดภัยก่อนเข้าใช้งาน
          </p>

          <!-- Current Account Tag -->
          <div class="mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-xs text-gray-700 dark:text-gray-300">
            <UserCheck class="w-3.5 h-3.5 text-[#F0A73C]" />
            <span>บัญชี:</span>
            <span class="font-mono text-gray-900 dark:text-white font-medium">{{ userEmail || 'กำลังตรวจสอบ...' }}</span>
          </div>
        </div>

        <!-- Security Question Form -->
        <form @submit.prevent="verifyAnswer" class="space-y-4 relative z-10">
          <div class="space-y-2">
            <label class="block text-xs font-semibold text-gray-700 dark:text-gray-300 flex items-center justify-between">
              <span class="flex items-center gap-1.5 text-[#E8572E] dark:text-[#F0A73C] font-bold">
                <Cat class="w-4 h-4" />
                คำถามยืนยันตัวตน:
              </span>
              <button 
                type="button" 
                @click="showHint = !showHint"
                class="text-[11px] text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 underline flex items-center gap-1 cursor-pointer"
              >
                <HelpCircle class="w-3 h-3" />
                {{ showHint ? 'ซ่อนคำใบ้' : 'คำใบ้' }}
              </button>
            </label>

            <!-- Question Box -->
            <div class="p-3.5 rounded-xl bg-gray-50 dark:bg-black/40 border border-gray-200 dark:border-white/10 text-sm font-semibold text-gray-900 dark:text-white shadow-inner flex items-center gap-2.5">
              <KeyRound class="w-4 h-4 text-[#E8572E] shrink-0" />
              <span>แมวตัวโปรดชื่ออะไร?</span>
            </div>

            <!-- Hint Box -->
            <div v-if="showHint" class="p-2.5 rounded-lg bg-[#F0A73C]/10 border border-[#F0A73C]/30 text-xs text-[#F0A73C] flex items-center gap-2 animate-fadeIn">
              <Sparkles class="w-3.5 h-3.5 shrink-0" />
              <span>คำตอบเป็นชื่อแมว 1 คำภาษาไทย (ขึ้นต้นด้วย ห...)</span>
            </div>

            <!-- Answer Input -->
            <div class="relative">
              <input 
                v-model="answerInput"
                type="text"
                autocomplete="off"
                placeholder="กรอกคำตอบยืนยันตัวตน..."
                class="w-full px-4 py-3 rounded-xl bg-white dark:bg-black/50 border border-gray-300 dark:border-white/15 focus:border-[#E8572E] focus:ring-2 focus:ring-[#E8572E]/20 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 text-sm transition-all outline-none shadow-sm"
                :disabled="verifying"
                autofocus
              />
            </div>

            <!-- Error Feedback -->
            <p v-if="errorMsg" class="text-xs text-red-500 dark:text-red-400 flex items-center gap-1.5 pt-1">
              <AlertCircle class="w-3.5 h-3.5 shrink-0" />
              {{ errorMsg }}
            </p>
          </div>

          <!-- Submit Button -->
          <button 
            type="submit"
            :disabled="verifying || !answerInput.trim()"
            class="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-[#E8572E] via-[#f26d47] to-[#F0A73C] hover:opacity-95 active:scale-[0.99] text-white font-bold text-sm shadow-lg shadow-[#E8572E]/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            <RefreshCw v-if="verifying" class="w-4 h-4 animate-spin" />
            <Unlock v-else class="w-4 h-4" />
            {{ verifying ? 'กำลังยืนยัน...' : 'ปลดล็อกสิทธิ์ Super Admin' }}
          </button>
        </form>

        <!-- Security Note Footer -->
        <div class="mt-6 pt-4 border-t border-gray-100 dark:border-white/5 text-center text-[11px] text-gray-400 dark:text-gray-500 flex items-center justify-center gap-1.5">
          <ShieldCheck class="w-3.5 h-3.5 text-emerald-500" />
          <span>การกระทำทั้งหมดจะถูกบันทึกลงใน Audit Trail เพื่อความปลอดภัย</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
@keyframes shake {
  0%, 100% { transform: translateX(0); }
  20%, 60% { transform: translateX(-8px); }
  40%, 80% { transform: translateX(8px); }
}
</style>
