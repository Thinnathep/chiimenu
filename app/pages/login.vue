<script setup lang="ts">
const user = useSupabaseUser()
const { auth } = useSupabaseClient()
const router = useRouter()

const email = ref('')
const password = ref('')
const loading = ref(false)
const errorMsg = ref('')

// If already logged in, redirect to merchant dashboard
watchEffect(() => {
  if (user.value) {
    router.push('/merchant/dashboard')
  }
})

const handleLogin = async () => {
  loading.value = true
  errorMsg.value = ''
  
  const { error } = await auth.signInWithPassword({
    email: email.value,
    password: password.value,
  })
  
  if (error) {
    errorMsg.value = error.message
  } else {
    router.push('/merchant/dashboard')
  }
  loading.value = false
}
</script>

<template>
  <div class="flex min-h-screen flex-col justify-center py-12 sm:px-6 lg:px-8 bg-muted/30">
    <div class="sm:mx-auto sm:w-full sm:max-w-md">
      <h2 class="mt-6 text-center text-3xl font-bold tracking-tight text-foreground">
        เข้าสู่ระบบร้านค้า
      </h2>
      <p class="mt-2 text-center text-sm text-muted-foreground">
        หรือ 
        <NuxtLink to="/register" class="font-medium text-primary hover:text-primary/80">
          สมัครร้านค้าใหม่ที่นี่
        </NuxtLink>
      </p>
    </div>

    <div class="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
      <div class="bg-card px-4 py-8 shadow sm:rounded-lg sm:px-10 border">
        <form class="space-y-6" @submit.prevent="handleLogin">
          <div>
            <label for="email" class="block text-sm font-medium text-foreground">Email address</label>
            <div class="mt-1">
              <input v-model="email" id="email" name="email" type="email" autocomplete="email" required class="block w-full appearance-none rounded-md border border-input px-3 py-2 placeholder-muted-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-primary sm:text-sm bg-background text-foreground" />
            </div>
          </div>

          <div>
            <label for="password" class="block text-sm font-medium text-foreground">Password</label>
            <div class="mt-1">
              <input v-model="password" id="password" name="password" type="password" autocomplete="current-password" required class="block w-full appearance-none rounded-md border border-input px-3 py-2 placeholder-muted-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-primary sm:text-sm bg-background text-foreground" />
            </div>
          </div>
          
          <div v-if="errorMsg" class="text-sm text-destructive font-medium">
            {{ errorMsg }}
          </div>

          <div>
            <button type="submit" :disabled="loading" class="flex w-full justify-center rounded-md border border-transparent bg-primary py-2 px-4 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50">
              {{ loading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>
