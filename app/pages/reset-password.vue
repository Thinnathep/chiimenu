<script setup lang="ts">
import { KeyRound, Lock, AlertCircle, CheckCircle2, ArrowLeft } from 'lucide-vue-next'

definePageMeta({
  auth: false
})

const { auth } = useSupabaseClient()
const router = useRouter()
const route = useRoute()

type PageState = 'loading' | 'form' | 'no_token' | 'invalid_token' | 'cross_device' | 'success'
const pageState = ref<PageState>('loading')
const loadingMessage = ref('กำลังตรวจสอบความปลอดภัยของลิงก์...')

const password = ref('')
const confirmPassword = ref('')
const submitting = ref(false)
const formError = ref('')
const successMsg = ref('')

onMounted(async () => {
  try {
    // 1. Check for URL query error parameters (e.g. Supabase redirect errors)
    if (route.query.error || route.query.error_description) {
      console.warn('[ResetPassword] URL query error:', route.query.error_description || route.query.error)
      pageState.value = 'invalid_token'
      return
    }

    // 2. Check for Hash Fragment recovery token (Implicit flow e.g. #access_token=... or #type=recovery)
    if (typeof window !== 'undefined' && window.location.hash) {
      const hash = window.location.hash
      if (hash.includes('error=')) {
        pageState.value = 'invalid_token'
        return
      }
      if (hash.includes('type=recovery') || hash.includes('access_token=')) {
        pageState.value = 'form'
        return
      }
    }

    // 3. Check if an active session already exists in browser
    const { data: { session: existingSession } } = await auth.getSession()
    if (existingSession) {
      pageState.value = 'form'
      return
    }

    // 4. Check for PKCE auth code in query (?code=xxxx)
    const code = route.query.code as string | undefined
    if (code) {
      loadingMessage.value = 'กำลังยืนยันรหัสความปลอดภัย...'
      const { error } = await auth.exchangeCodeForSession(code)
      if (error) {
        console.warn('[ResetPassword] PKCE code exchange error:', error.message)
        
        // Check once more if session got established in the background
        const { data: { session: retrySession } } = await auth.getSession()
        if (retrySession) {
          pageState.value = 'form'
          return
        }

        if (error.message?.includes('code verifier') || error.message?.includes('flow state')) {
          pageState.value = 'cross_device'
        } else {
          pageState.value = 'invalid_token'
        }
        return
      }
      // Successfully authenticated via PKCE code!
      pageState.value = 'form'
      return
    }

    // 5. Listen for onAuthStateChange events (in case Supabase parses hash/session asynchronously)
    let stateResolved = false
    auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || (event === 'SIGNED_IN' && session)) {
        stateResolved = true
        pageState.value = 'form'
      }
    })

    // 6. If no code, no recovery hash, and no active session after grace period
    setTimeout(() => {
      if (!stateResolved && pageState.value === 'loading') {
        // User just opened /reset-password directly without a token
        pageState.value = 'no_token'
      }
    }, 800)

  } catch (err) {
    console.error('[ResetPassword] Initialization error:', err)
    pageState.value = 'no_token'
  }
})

const handleUpdatePassword = async () => {
  formError.value = ''

  if (password.value.length < 6) {
    formError.value = 'รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร'
    return
  }

  if (password.value !== confirmPassword.value) {
    formError.value = 'รหัสผ่านทั้งสองช่องไม่ตรงกัน กรุณาตรวจสอบอีกครั้ง'
    return
  }

  submitting.value = true

  try {
    const { error } = await auth.updateUser({
      password: password.value
    })

    if (error) {
      formError.value = error.message
    } else {
      pageState.value = 'success'
      successMsg.value = 'เปลี่ยนรหัสผ่านใหม่สำเร็จเรียบร้อยแล้วค่ะ! กำลังพากลับไปหน้าเข้าสู่ระบบ...'
      setTimeout(() => {
        router.push('/login')
      }, 2500)
    }
  } catch (err: any) {
    formError.value = err?.message || 'เกิดข้อผิดพลาดในการบันทึกรหัสผ่านใหม่'
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="flex min-h-screen flex-col justify-center py-12 sm:px-6 lg:px-8 bg-muted/30">
    <div class="sm:mx-auto sm:w-full sm:max-w-md">
      <h2 class="text-center text-3xl font-extrabold tracking-tight text-foreground">
        ตั้งรหัสผ่านใหม่
      </h2>
      <p class="mt-2 text-center text-sm text-muted-foreground">
        ChiiMenu Security & Account Recovery
      </p>
    </div>

    <div class="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
      <div class="bg-card px-6 py-8 shadow-xl sm:rounded-2xl border border-border/60">
        
        <!-- STATE 1: LOADING -->
        <div v-if="pageState === 'loading'" class="text-center py-8">
          <div class="w-10 h-10 border-3 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-4"></div>
          <p class="text-sm font-medium text-muted-foreground">{{ loadingMessage }}</p>
        </div>

        <!-- STATE 2: NO TOKEN / DIRECT VISIT GUIDANCE -->
        <div v-else-if="pageState === 'no_token'" class="text-center py-4">
          <div class="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-4 shadow-inner">
            <KeyRound class="h-7 w-7" />
          </div>
          <h3 class="text-lg font-bold text-foreground">ต้องการตั้งรหัสผ่านใหม่ใช่หรือไม่?</h3>
          <p class="mt-2 text-sm text-muted-foreground leading-relaxed">
            เพื่อความปลอดภัยของข้อมูลร้านค้า การตั้งรหัสผ่านใหม่จำเป็นต้องใช้ลิงก์ยืนยันตัวตนที่ส่งไปยังอีเมลของคุณค่ะ
          </p>
          <div class="mt-6 space-y-3">
            <NuxtLink 
              to="/forgot-password" 
              class="inline-flex w-full justify-center items-center gap-2 rounded-xl bg-primary py-3 px-4 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all"
            >
              ไปหน้าขอลิงก์ตั้งรหัสผ่านใหม่
            </NuxtLink>
            <NuxtLink 
              to="/login" 
              class="inline-flex w-full justify-center items-center gap-2 rounded-xl border border-input bg-background py-2.5 px-4 text-sm font-medium text-foreground shadow-sm hover:bg-muted transition-colors"
            >
              <ArrowLeft class="w-4 h-4" />
              กลับหน้าเข้าสู่ระบบ
            </NuxtLink>
          </div>
        </div>

        <!-- STATE 3: INVALID / EXPIRED LINK -->
        <div v-else-if="pageState === 'invalid_token'" class="text-center py-4">
          <div class="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive mb-4">
            <AlertCircle class="h-7 w-7" />
          </div>
          <h3 class="text-lg font-bold text-foreground">ลิงก์หมดอายุหรือไม่ถูกต้อง</h3>
          <p class="mt-2 text-sm text-muted-foreground leading-relaxed">
            ลิงก์สำหรับตั้งรหัสผ่านนี้อาจถูกใช้งานไปแล้ว หรือหมดอายุตามระยะเวลาความปลอดภัย กรุณาขอลิงก์ใหม่อีกครั้งค่ะ
          </p>
          <div class="mt-6 space-y-3">
            <NuxtLink 
              to="/forgot-password" 
              class="inline-flex w-full justify-center items-center gap-2 rounded-xl bg-primary py-3 px-4 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all"
            >
              ขอลิงก์ตั้งรหัสผ่านใหม่
            </NuxtLink>
            <NuxtLink 
              to="/login" 
              class="inline-flex w-full justify-center items-center gap-2 rounded-xl border border-input bg-background py-2.5 px-4 text-sm font-medium text-foreground shadow-sm hover:bg-muted transition-colors"
            >
              กลับหน้าเข้าสู่ระบบ
            </NuxtLink>
          </div>
        </div>

        <!-- STATE 3.5: CROSS-DEVICE / MISSING PKCE VERIFIER -->
        <div v-else-if="pageState === 'cross_device'" class="text-center py-4">
          <div class="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-amber-600 mb-4 shadow-inner">
            <AlertCircle class="h-7 w-7" />
          </div>
          <h3 class="text-lg font-bold text-foreground">เปิดลิงก์ต่างเบราว์เซอร์หรืออุปกรณ์</h3>
          <p class="mt-2 text-sm text-muted-foreground leading-relaxed">
            เนื่องจากคุณเปิดลิงก์ในเบราว์เซอร์หรือหน้าต่างที่ต่างจากตอนที่กดขอรหัสผ่าน ระบบความปลอดภัย (PKCE) จึงไม่สามารถจับคู่เครื่องได้ค่ะ<br><br>
            <span class="font-medium text-foreground">วิธีแก้ไขง่ายๆ:</span> เพียงกดปุ่มด้านล่างเพื่อขอลิงก์ใหม่จากเบราว์เซอร์นี้ได้ทันทีค่ะ ✨
          </p>
          <div class="mt-6 space-y-3">
            <NuxtLink 
              to="/forgot-password" 
              class="inline-flex w-full justify-center items-center gap-2 rounded-xl bg-primary py-3 px-4 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all"
            >
              ขอลิงก์ใหม่สำหรับเบราว์เซอร์นี้
            </NuxtLink>
            <NuxtLink 
              to="/login" 
              class="inline-flex w-full justify-center items-center gap-2 rounded-xl border border-input bg-background py-2.5 px-4 text-sm font-medium text-foreground shadow-sm hover:bg-muted transition-colors"
            >
              กลับหน้าเข้าสู่ระบบ
            </NuxtLink>
          </div>
        </div>

        <!-- STATE 4: SUCCESS -->
        <div v-else-if="pageState === 'success'" class="text-center py-4 animate-fade-in-up">
          <div class="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-green-100 text-green-600 mb-4 shadow-inner">
            <CheckCircle2 class="h-7 w-7" />
          </div>
          <h3 class="text-lg font-bold text-foreground">เปลี่ยนรหัสผ่านสำเร็จ!</h3>
          <p class="mt-2 text-sm text-muted-foreground">{{ successMsg }}</p>
          <div class="mt-6">
            <NuxtLink 
              to="/login" 
              class="inline-flex w-full justify-center rounded-xl bg-primary py-2.5 px-4 text-sm font-bold text-primary-foreground shadow hover:bg-primary/90 transition-all"
            >
              เข้าสู่ระบบทันที
            </NuxtLink>
          </div>
        </div>

        <!-- STATE 5: PASSWORD ENTRY FORM (PERMANENT & STABLE) -->
        <form v-else class="space-y-5" @submit.prevent="handleUpdatePassword">
          <div class="flex items-center gap-2 mb-2 text-primary font-bold text-sm">
            <Lock class="w-4 h-4" />
            <span>กรอกรหัสผ่านใหม่ของคุณ</span>
          </div>

          <div>
            <label for="password" class="block text-sm font-bold text-foreground mb-1.5">
              รหัสผ่านใหม่
            </label>
            <input 
              v-model="password" 
              id="password" 
              type="password" 
              required 
              minlength="6" 
              autocomplete="new-password"
              placeholder="ระบุรหัสผ่านอย่างน้อย 6 ตัวอักษร"
              class="block w-full rounded-xl border border-input px-4 py-3 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 bg-background text-foreground transition-all sm:text-sm" 
            />
          </div>
          
          <div>
            <label for="confirmPassword" class="block text-sm font-bold text-foreground mb-1.5">
              ยืนยันรหัสผ่านใหม่อีกครั้ง
            </label>
            <input 
              v-model="confirmPassword" 
              id="confirmPassword" 
              type="password" 
              required 
              minlength="6" 
              autocomplete="new-password"
              placeholder="กรอกรหัสผ่านเดิมซ้ำอีกครั้ง"
              class="block w-full rounded-xl border border-input px-4 py-3 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 bg-background text-foreground transition-all sm:text-sm" 
            />
          </div>
          
          <div v-if="formError" class="rounded-xl bg-destructive/10 p-3.5 border border-destructive/20 text-sm font-medium text-destructive animate-fade-in-up">
            {{ formError }}
          </div>

          <div>
            <button 
              type="submit" 
              :disabled="submitting" 
              class="flex w-full justify-center items-center rounded-xl border border-transparent bg-primary py-3.5 px-4 text-base font-bold text-primary-foreground shadow-lg shadow-primary/25 hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 transition-all hover:-translate-y-0.5"
            >
              <span v-if="submitting" class="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></span>
              {{ submitting ? 'กำลังบันทึกรหัสผ่านใหม่...' : 'บันทึกรหัสผ่านใหม่' }}
            </button>
          </div>
        </form>

      </div>
    </div>
  </div>
</template>
