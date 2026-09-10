<script setup lang="ts">
import { Loader2, AlertCircle } from 'lucide-vue-next'

definePageMeta({
  auth: false
})

const user = useSupabaseUser()
const client = useSupabaseClient()
const route = useRoute()

const redirectDone = ref(false)
const errorMessage = ref<string | null>(null)
const timedOut = ref(false)

const handleRedirect = () => {
  if (redirectDone.value) return
  redirectDone.value = true

  let cookieRedirectPath: string | null = null
  try {
    const cookieRedirect = useSupabaseCookieRedirect()
    cookieRedirectPath = cookieRedirect?.pluck() || null
  } catch (_) {
    // Fallback if composable not loaded
    const fallbackCookie = useCookie('sb-redirect-path')
    cookieRedirectPath = fallbackCookie.value
    fallbackCookie.value = null
  }

  // Check query parameter redirectTo or cookie redirect path
  const targetPath = (route.query.redirectTo as string) || cookieRedirectPath || '/merchant/dashboard'
  return navigateTo(targetPath, { replace: true })
}

// Watch user session from @nuxtjs/supabase
watch(
  user,
  (newUser) => {
    if (newUser) {
      handleRedirect()
    }
  },
  { immediate: true }
)

onMounted(async () => {
  // 1. Check for auth errors passed via URL
  if (route.query.error || route.query.error_description) {
    errorMessage.value = String(route.query.error_description || route.query.error)
    return
  }

  // 2. If user already authenticated
  if (user.value) {
    handleRedirect()
    return
  }

  // 3. Handle PKCE code exchange if present in query parameter
  if (route.query.code) {
    try {
      const { error: exchangeError } = await client.auth.exchangeCodeForSession(String(route.query.code))
      if (exchangeError) {
        console.error('Session exchange error:', exchangeError)
        errorMessage.value = exchangeError.message
        return
      }
      // Re-check user or session
      const { data } = await client.auth.getSession()
      if (data?.session) {
        handleRedirect()
        return
      }
    } catch (err: any) {
      console.error('Auth code exchange exception:', err)
      errorMessage.value = err?.message || 'Failed to exchange auth code'
      return
    }
  }

  // 4. Fallback timer: if session exchange completes or user needs manual redirect
  setTimeout(() => {
    if (!redirectDone.value) {
      if (user.value) {
        handleRedirect()
      } else {
        timedOut.value = true
      }
    }
  }, 3500)
})
</script>

<template>
  <div class="min-h-screen flex flex-col items-center justify-center p-4 bg-background text-foreground">
    <div class="w-full max-w-sm p-8 bg-card border border-border/80 rounded-3xl shadow-xl text-center space-y-5 animate-in fade-in zoom-in duration-300">
      
      <!-- Error State -->
      <template v-if="errorMessage">
        <div class="w-16 h-16 mx-auto rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center shadow-inner">
          <AlertCircle class="w-8 h-8" />
        </div>

        <div class="space-y-1.5">
          <h2 class="text-xl font-black tracking-tight text-destructive">เกิดข้อผิดพลาดในการยืนยันตัวตน</h2>
          <p class="text-xs text-muted-foreground break-words leading-relaxed">
            {{ errorMessage }}
          </p>
        </div>

        <div class="pt-2 space-y-2">
          <NuxtLink
            to="/login"
            class="w-full inline-flex items-center justify-center py-2.5 px-4 rounded-xl text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm"
          >
            กลับสู่หน้าเข้าสู่ระบบ (Login)
          </NuxtLink>
        </div>
      </template>

      <!-- Loading / Resolving State -->
      <template v-else>
        <div class="w-16 h-16 mx-auto rounded-2xl bg-primary/10 text-primary flex items-center justify-center shadow-inner">
          <Loader2 class="w-8 h-8 animate-spin text-primary" />
        </div>

        <div class="space-y-1.5">
          <h2 class="text-xl font-black tracking-tight text-foreground">กำลังยืนยันตัวตน...</h2>
          <p class="text-xs text-muted-foreground">
            ระบบกำลังเชื่อมต่อบัญชีและพาคุณเข้าสู่ระบบ ChiiMenu
          </p>
        </div>

        <div class="pt-2">
          <NuxtLink
            to="/merchant/dashboard"
            class="inline-flex items-center justify-center text-xs font-semibold text-primary hover:underline"
          >
            {{ timedOut ? 'คลิกที่นี่เพื่อเข้าสู่ระบบร้านค้า &rarr;' : 'คลิกที่นี่หากหน้าเว็บไม่เปลี่ยนอัตโนมัติ &rarr;' }}
          </NuxtLink>
        </div>
      </template>

    </div>
  </div>
</template>
