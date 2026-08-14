<script setup lang="ts">
const { auth } = useSupabaseClient()
const router = useRouter()
import { isValidEmail, isValidPhone } from '~/utils/validation'

const loginId = ref('')
const loading = ref(false)
const errorMsg = ref('')
const successMsg = ref('')
const isPhoneMode = ref(false)

const handleReset = async () => {
  loading.value = true
  errorMsg.value = ''
  successMsg.value = ''
  isPhoneMode.value = false
  
  const inputStr = loginId.value.trim()
  
  if (!inputStr.includes('@')) {
    if (isValidPhone(inputStr)) {
      // It's a valid phone number
      isPhoneMode.value = true
      loading.value = false
      return
    } else {
      errorMsg.value = 'รูปแบบเบอร์โทรศัพท์ไม่ถูกต้อง'
      loading.value = false
      return
    }
  }
  
  if (!isValidEmail(inputStr)) {
    errorMsg.value = 'รูปแบบอีเมลไม่ถูกต้อง'
    loading.value = false
    return
  }
  
  // Treat as email
  const { error } = await auth.resetPasswordForEmail(inputStr, {
    redirectTo: `${window.location.origin}/reset-password`,
  })
  
  if (error) {
    errorMsg.value = error.message
  } else {
    successMsg.value = 'ส่งลิงก์สำหรับตั้งรหัสผ่านใหม่ไปที่อีเมลของคุณแล้ว กรุณาเช็คอีเมล (รวมถึงโฟลเดอร์จดหมายขยะ)'
  }
  loading.value = false
}
</script>

<template>
  <div class="flex min-h-screen flex-col justify-center py-12 sm:px-6 lg:px-8 bg-muted/30">
    <div class="sm:mx-auto sm:w-full sm:max-w-md">
      <h2 class="mt-6 text-center text-3xl font-bold tracking-tight text-foreground">
        ลืมรหัสผ่าน
      </h2>
      <p class="mt-2 text-center text-sm text-muted-foreground">
        กลับไปหน้า 
        <NuxtLink to="/login" class="font-medium text-primary hover:text-primary/80">
          เข้าสู่ระบบ
        </NuxtLink>
      </p>
    </div>

    <div class="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
      <div class="bg-card px-4 py-8 shadow sm:rounded-lg sm:px-10 border">
        
        <div v-if="isPhoneMode" class="text-center py-4">
          <div class="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 mb-4">
            <svg class="h-6 w-6 text-amber-600" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
            </svg>
          </div>
          <h3 class="text-lg font-medium text-foreground">คุณใช้งานด้วยเบอร์โทรศัพท์</h3>
          <p class="mt-2 text-sm text-muted-foreground">
            เนื่องจากเหตุผลด้านความปลอดภัย ระบบจะไม่ส่งรหัสผ่านใหม่ทาง SMS<br><br>
            กรุณาติดต่อแอดมินผ่าน LINE OA: <strong class="text-foreground">@819wgrsj</strong><br>
            เพื่อขอรหัสผ่านใหม่สำหรับเบอร์ <strong>{{ loginId }}</strong> ค่ะ
          </p>
          <div class="mt-6">
            <NuxtLink to="/login" class="inline-flex w-full justify-center rounded-md border border-input bg-background py-2 px-4 text-sm font-medium text-foreground shadow-sm hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2">
              กลับหน้าเข้าสู่ระบบ
            </NuxtLink>
          </div>
        </div>

        <form v-else-if="!successMsg" class="space-y-6" @submit.prevent="handleReset">
          <div>
            <label for="loginId" class="block text-sm font-medium text-foreground">อีเมล หรือ เบอร์โทรศัพท์</label>
            <div class="mt-1">
              <input v-model="loginId" id="loginId" type="text" required class="block w-full appearance-none rounded-md border border-input px-3 py-2 placeholder-muted-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-primary sm:text-sm bg-background text-foreground" placeholder="เช่น admin@email.com หรือ 0812345678" />
            </div>
          </div>
          
          <div v-if="errorMsg" class="text-sm text-destructive font-medium">
            {{ errorMsg }}
          </div>

          <div>
            <button type="submit" :disabled="loading" class="flex w-full justify-center rounded-md border border-transparent bg-primary py-2 px-4 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50">
              {{ loading ? 'กำลังส่งข้อมูล...' : 'ส่งข้อมูล' }}
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
          <div class="mt-6">
            <NuxtLink to="/login" class="inline-flex w-full justify-center rounded-md border border-input bg-background py-2 px-4 text-sm font-medium text-foreground shadow-sm hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2">
              กลับไปหน้าเข้าสู่ระบบ
            </NuxtLink>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
