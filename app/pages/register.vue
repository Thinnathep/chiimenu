<script setup lang="ts">
const user = useSupabaseUser()
const { auth } = useSupabaseClient()
const router = useRouter()

const email = ref('')
const password = ref('')
const fullName = ref('')
const loading = ref(false)
const errorMsg = ref('')
const successMsg = ref('')

watchEffect(() => {
  if (user.value) {
    router.push('/merchant/dashboard')
  }
})

const handleRegister = async () => {
  loading.value = true
  errorMsg.value = ''
  
  const { error } = await auth.signUp({
    email: email.value,
    password: password.value,
    options: {
      data: {
        full_name: fullName.value
      }
    }
  })
  
  if (error) {
    errorMsg.value = error.message
  } else {
    successMsg.value = 'สมัครสมาชิกสำเร็จ! (หากตั้งค่า Require Email Verification ไว้ใน Supabase กรุณายืนยันอีเมลก่อนเข้าสู่ระบบ)'
    // If auto login is enabled in Supabase, the watcher above will trigger.
  }
  loading.value = false
}
</script>

<template>
  <div class="flex min-h-screen flex-col justify-center py-12 sm:px-6 lg:px-8 bg-muted/30">
    <div class="sm:mx-auto sm:w-full sm:max-w-md">
      <h2 class="mt-6 text-center text-3xl font-bold tracking-tight text-foreground">
        สมัครร้านค้าใหม่
      </h2>
      <p class="mt-2 text-center text-sm text-muted-foreground">
        หรือ 
        <NuxtLink to="/login" class="font-medium text-primary hover:text-primary/80">
          เข้าสู่ระบบ หากมีบัญชีอยู่แล้ว
        </NuxtLink>
      </p>
    </div>

    <div class="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
      <div class="bg-card px-4 py-8 shadow sm:rounded-lg sm:px-10 border">
        <form v-if="!successMsg" class="space-y-6" @submit.prevent="handleRegister">
          <div>
            <label for="name" class="block text-sm font-medium text-foreground">ชื่อ-นามสกุล / ชื่อผู้ติดต่อ</label>
            <div class="mt-1">
              <input v-model="fullName" id="name" type="text" required class="block w-full appearance-none rounded-md border border-input px-3 py-2 placeholder-muted-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-primary sm:text-sm bg-background text-foreground" />
            </div>
          </div>
          
          <div>
            <label for="email" class="block text-sm font-medium text-foreground">Email address</label>
            <div class="mt-1">
              <input v-model="email" id="email" type="email" autocomplete="email" required class="block w-full appearance-none rounded-md border border-input px-3 py-2 placeholder-muted-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-primary sm:text-sm bg-background text-foreground" />
            </div>
          </div>

          <div>
            <label for="password" class="block text-sm font-medium text-foreground">Password</label>
            <div class="mt-1">
              <input v-model="password" id="password" type="password" autocomplete="new-password" required minlength="6" class="block w-full appearance-none rounded-md border border-input px-3 py-2 placeholder-muted-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-primary sm:text-sm bg-background text-foreground" />
            </div>
          </div>
          
          <div v-if="errorMsg" class="text-sm text-destructive font-medium">
            {{ errorMsg }}
          </div>

          <div>
            <button type="submit" :disabled="loading" class="flex w-full justify-center rounded-md border border-transparent bg-primary py-2 px-4 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50">
              {{ loading ? 'กำลังสร้างบัญชี...' : 'สร้างบัญชีร้านค้า' }}
            </button>
          </div>
        </form>
        
        <div v-else class="text-center">
          <div class="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100 mb-4">
            <svg class="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          </div>
          <h3 class="text-lg font-medium text-foreground">สมัครสำเร็จ</h3>
          <p class="mt-2 text-sm text-muted-foreground">{{ successMsg }}</p>
          <div class="mt-6">
            <NuxtLink to="/login" class="text-primary hover:text-primary/80 font-medium">กลับไปหน้าเข้าสู่ระบบ</NuxtLink>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
