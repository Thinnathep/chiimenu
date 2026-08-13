<script setup lang="ts">
const { auth } = useSupabaseClient()
const router = useRouter()

const password = ref('')
const confirmPassword = ref('')
const loading = ref(false)
const errorMsg = ref('')
const successMsg = ref('')

// Check if user has a valid session for password recovery
onMounted(async () => {
  const { data: { session } } = await auth.getSession()
  
  // Wait for Supabase to parse the URL hash and create a session
  setTimeout(async () => {
    const { data: delayedSession } = await auth.getSession()
    if (!delayedSession.session) {
      errorMsg.value = 'ลิงก์ไม่ถูกต้อง หรือหมดอายุแล้ว กรุณาขอลิงก์ใหม่'
    }
  }, 1000)
})

const handleUpdatePassword = async () => {
  if (password.value !== confirmPassword.value) {
    errorMsg.value = 'รหัสผ่านไม่ตรงกัน'
    return
  }
  
  loading.value = true
  errorMsg.value = ''
  
  const { error } = await auth.updateUser({
    password: password.value
  })
  
  if (error) {
    errorMsg.value = error.message
  } else {
    successMsg.value = 'เปลี่ยนรหัสผ่านสำเร็จ! ระบบกำลังพากลับไปหน้าเข้าสู่ระบบ...'
    setTimeout(() => {
      router.push('/login')
    }, 3000)
  }
  
  loading.value = false
}
</script>

<template>
  <div class="flex min-h-screen flex-col justify-center py-12 sm:px-6 lg:px-8 bg-muted/30">
    <div class="sm:mx-auto sm:w-full sm:max-w-md">
      <h2 class="mt-6 text-center text-3xl font-bold tracking-tight text-foreground">
        ตั้งรหัสผ่านใหม่
      </h2>
    </div>

    <div class="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
      <div class="bg-card px-4 py-8 shadow sm:rounded-lg sm:px-10 border">
        
        <div v-if="errorMsg && !password && !confirmPassword" class="text-center">
           <div class="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 mb-4">
            <svg class="h-6 w-6 text-destructive" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h3 class="text-lg font-medium text-foreground">เกิดข้อผิดพลาด</h3>
          <p class="mt-2 text-sm text-destructive">{{ errorMsg }}</p>
          <div class="mt-6">
            <NuxtLink to="/forgot-password" class="inline-flex w-full justify-center rounded-md border border-input bg-background py-2 px-4 text-sm font-medium text-foreground shadow-sm hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2">
              ขอลิงก์ใหม่
            </NuxtLink>
          </div>
        </div>

        <form v-else-if="!successMsg" class="space-y-6" @submit.prevent="handleUpdatePassword">
          <div>
            <label for="password" class="block text-sm font-medium text-foreground">รหัสผ่านใหม่ (อย่างน้อย 6 ตัว)</label>
            <div class="mt-1">
              <input v-model="password" id="password" type="password" required minlength="6" class="block w-full appearance-none rounded-md border border-input px-3 py-2 placeholder-muted-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-primary sm:text-sm bg-background text-foreground" />
            </div>
          </div>
          
          <div>
            <label for="confirmPassword" class="block text-sm font-medium text-foreground">ยืนยันรหัสผ่านใหม่</label>
            <div class="mt-1">
              <input v-model="confirmPassword" id="confirmPassword" type="password" required minlength="6" class="block w-full appearance-none rounded-md border border-input px-3 py-2 placeholder-muted-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-primary sm:text-sm bg-background text-foreground" />
            </div>
          </div>
          
          <div v-if="errorMsg" class="text-sm text-destructive font-medium">
            {{ errorMsg }}
          </div>

          <div>
            <button type="submit" :disabled="loading" class="flex w-full justify-center rounded-md border border-transparent bg-primary py-2 px-4 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50">
              {{ loading ? 'กำลังบันทึก...' : 'บันทึกรหัสผ่านใหม่' }}
            </button>
          </div>
        </form>
        
        <div v-else class="text-center">
          <div class="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100 mb-4">
            <svg class="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          </div>
          <h3 class="text-lg font-medium text-foreground">สำเร็จ</h3>
          <p class="mt-2 text-sm text-muted-foreground">{{ successMsg }}</p>
        </div>
      </div>
    </div>
  </div>
</template>
