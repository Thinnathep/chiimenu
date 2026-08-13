<script setup lang="ts">
import { Globe, Store, MessageCircle } from 'lucide-vue-next'

const { locale, setLocale } = useI18n()
const user = useSupabaseUser()
const { auth } = useSupabaseClient()
const router = useRouter()
import { isValidEmail, isValidPhone } from '~/utils/validation'

const loginId = ref('')
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
  const swal = useAlert()
  
  let actualEmail = loginId.value.trim()
  
  if (actualEmail.includes('@')) {
    if (!isValidEmail(actualEmail)) {
      errorMsg.value = locale.value === 'th' ? 'รูปแบบอีเมลไม่ถูกต้อง (เช่น example@gmail.com)' : 'Invalid email format'
      loading.value = false
      return
    }
    // Typo check for .co
    if (actualEmail.toLowerCase().endsWith('.co')) {
      const result = await swal.fire({
        title: locale.value === 'th' ? 'ตรวจสอบอีเมล' : 'Check Email',
        text: locale.value === 'th' 
          ? `คุณใช้อีเมล ${actualEmail} เข้าสู่ระบบใช่หรือไม่? (ระวังพิมพ์ตก .com)` 
          : `Are you using ${actualEmail}? (Did you mean .com?)`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: locale.value === 'th' ? 'ใช่, ถูกต้องแล้ว' : 'Yes, correct',
        cancelButtonText: locale.value === 'th' ? 'กลับไปแก้ไข' : 'Edit'
      })
      if (!result.isConfirmed) {
        loading.value = false
        return
      }
    }
  } else {
    if (!isValidPhone(actualEmail)) {
      errorMsg.value = locale.value === 'th' ? 'เบอร์โทรศัพท์ต้องขึ้นต้นด้วย 0 และมี 10 หลัก (เช่น 0812345678)' : 'Phone number must be exactly 10 digits and start with 0'
      loading.value = false
      return
    }
    actualEmail = `${actualEmail}@phone.chiimenu.com`
  }
  
  const { error } = await auth.signInWithPassword({
    email: actualEmail,
    password: password.value,
  })
  if (error) {
    if (error.message.includes('Invalid login credentials')) {
      errorMsg.value = locale.value === 'th' ? 'อีเมล/เบอร์โทร หรือ รหัสผ่านไม่ถูกต้อง' : 'Invalid email/phone or password'
    } else {
      errorMsg.value = error.message
    }
  } else {
    router.push('/merchant/dashboard')
  }
  loading.value = false
}
</script>

<template>
  <div class="flex min-h-screen bg-background flex-row-reverse">
    <!-- Right Side: Form (Reversed layout to match register) -->
    <div class="flex flex-1 flex-col justify-center px-4 py-12 sm:px-6 lg:flex-none lg:px-20 xl:px-24 border-l border-border/40 bg-card relative z-10 shadow-2xl shadow-black/5">
      <div class="mx-auto w-full max-w-sm lg:w-96">
        <!-- Language Switcher -->
        <div class="absolute top-4 right-6">
          <select 
            v-model="locale" 
            @change="setLocale(locale)"
            class="text-sm border-none bg-transparent font-medium text-muted-foreground focus:ring-0 cursor-pointer hover:text-foreground transition-colors"
          >
            <option value="th">🇹🇭 ไทย</option>
            <option value="en">🇺🇸 English</option>
            <option value="zh">🇨🇳 中文</option>
          </select>
        </div>

        <div class="animate-fade-in-up" style="animation-delay: 0.1s;">
          <NuxtLink to="/" class="flex items-center gap-2 mb-8 group w-fit">
            <span class="text-2xl group-hover:-translate-x-1 transition-transform">&larr;</span>
            <span class="font-bold text-foreground" v-if="locale === 'th'">กลับหน้าหลัก</span>
            <span class="font-bold text-foreground" v-else-if="locale === 'en'">Back to Home</span>
            <span class="font-bold text-foreground" v-else>返回首页</span>
          </NuxtLink>
          <h2 class="mt-8 text-3xl font-black tracking-tight text-foreground">
            <template v-if="locale === 'th'">เข้าสู่ระบบร้านค้า</template>
            <template v-else-if="locale === 'en'">Merchant Login</template>
            <template v-else>商家登录</template>
          </h2>
          <p class="mt-2 text-sm text-muted-foreground">
            <template v-if="locale === 'th'">ยังไม่มีบัญชีร้านค้า?</template>
            <template v-else-if="locale === 'en'">Don't have an account?</template>
            <template v-else>还没有账户？</template>
            <NuxtLink to="/register" class="font-bold text-primary hover:text-primary/80 transition-colors ml-1">
              <template v-if="locale === 'th'">ทดลองใช้งานฟรี 7 วัน</template>
              <template v-else-if="locale === 'en'">Start 7-day free trial</template>
              <template v-else>开始 7 天免费试用</template>
            </NuxtLink>
          </p>
        </div>

        <div class="mt-10">
          <form class="space-y-6" @submit.prevent="handleLogin">
            <div class="animate-fade-in-up" style="animation-delay: 0.2s;">
              <label for="loginId" class="block text-sm font-bold text-foreground">
                <template v-if="locale === 'th'">อีเมล หรือ เบอร์โทรศัพท์</template>
                <template v-else-if="locale === 'en'">Email or Phone Number</template>
                <template v-else>电子邮件或电话号码</template>
              </label>
              <div class="mt-2">
                <input v-model="loginId" id="loginId" name="loginId" type="text" autocomplete="username" required class="block w-full rounded-xl border border-input px-4 py-3 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 bg-background text-foreground transition-all" placeholder="เช่น shop@email.com หรือ 0812345678" />
              </div>
            </div>

            <div class="animate-fade-in-up" style="animation-delay: 0.3s;">
              <div class="flex items-center justify-between">
                <label for="password" class="block text-sm font-bold text-foreground">
                  <template v-if="locale === 'th'">รหัสผ่าน</template>
                  <template v-else-if="locale === 'en'">Password</template>
                  <template v-else>密码</template>
                </label>
                <div class="text-sm">
                  <NuxtLink to="/forgot-password" class="font-semibold text-primary hover:text-primary/80 transition-colors">
                    <template v-if="locale === 'th'">ลืมรหัสผ่าน?</template>
                    <template v-else-if="locale === 'en'">Forgot password?</template>
                    <template v-else>忘记密码？</template>
                  </NuxtLink>
                </div>
              </div>
              <div class="mt-2">
                <input v-model="password" id="password" name="password" type="password" autocomplete="current-password" required class="block w-full rounded-xl border border-input px-4 py-3 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 bg-background text-foreground transition-all" />
              </div>
            </div>
            
            <div v-if="errorMsg" class="rounded-lg bg-destructive/10 p-4 border border-destructive/20 text-sm font-semibold text-destructive animate-in fade-in slide-in-from-top-2">
              {{ errorMsg }}
            </div>

            <div class="animate-fade-in-up" style="animation-delay: 0.4s;">
              <button type="submit" :disabled="loading" class="flex w-full justify-center items-center rounded-xl border border-transparent bg-primary py-3.5 px-4 text-base font-bold text-primary-foreground shadow-lg shadow-primary/25 hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 transition-all hover:-translate-y-0.5">
                <span v-if="loading" class="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></span>
                <template v-if="locale === 'th'">{{ loading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบเลย' }}</template>
                <template v-else-if="locale === 'en'">{{ loading ? 'Signing in...' : 'Sign In' }}</template>
                <template v-else>{{ loading ? '登录中...' : '登录' }}</template>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
    
    <!-- Right Side: Graphic/Banner -->
    <div class="relative hidden w-0 flex-1 lg:block bg-slate-900 overflow-hidden">
      <!-- Gradient Mesh Background -->
      <div class="absolute inset-0 bg-gradient-to-br from-primary/80 to-rose-900/90 mix-blend-multiply"></div>
      <div class="absolute -top-40 -right-40 w-96 h-96 bg-rose-500/40 rounded-full blur-3xl opacity-60"></div>
      <div class="absolute bottom-20 left-20 w-72 h-72 bg-purple-500/30 rounded-full blur-3xl opacity-60"></div>
      
      <!-- Content Overlay -->
      <div class="absolute inset-0 flex flex-col items-center justify-center text-white p-12 text-center">
        <div class="mb-10 text-white/90 bg-white/10 p-6 rounded-3xl backdrop-blur-sm border border-white/20 shadow-2xl animate-fade-in-up" style="animation-delay: 0.1s;">
          <Store class="w-20 h-20" stroke-width="1.5" />
        </div>
        <h2 class="text-4xl lg:text-5xl font-black mb-6 leading-tight max-w-lg text-white animate-fade-in-up" style="animation-delay: 0.2s;">
          <template v-if="locale === 'th'">ระบบเมนูคิวอาร์โค้ด<br/>สำหรับร้านอาหาร</template>
          <template v-else-if="locale === 'en'">Tourist-Ready<br/>QR Menu System</template>
          <template v-else>智能点餐<br/>二维码菜单系统</template>
        </h2>
        <p class="text-lg text-white/80 max-w-md font-medium leading-relaxed mb-10 animate-fade-in-up" style="animation-delay: 0.3s;">
          <template v-if="locale === 'th'">ลดปัญหาสื่อสารกับนักท่องเที่ยว จัดการเมนูหลายภาษา และรับออเดอร์ตรงเข้า LINE ของร้านคุณ</template>
          <template v-else-if="locale === 'en'">Reduce communication barriers with tourists, manage multilingual menus, and receive orders directly to your LINE.</template>
          <template v-else>打破与游客的沟通障碍，管理多语言菜单，并将订单直接接收到您商店的 LINE 中。</template>
        </p>
        
        <div class="flex gap-4 animate-fade-in-up" style="animation-delay: 0.4s;">
          <div class="bg-black/20 backdrop-blur-sm px-6 py-3 rounded-2xl border border-white/10 flex items-center gap-3">
            <Globe class="w-5 h-5 text-white/80" />
            <span class="font-medium text-sm text-white/90">
              <template v-if="locale === 'th'">เมนูหลายภาษา</template>
              <template v-else-if="locale === 'en'">Multilingual Menu</template>
              <template v-else>多语言菜单</template>
            </span>
          </div>
          <div class="bg-black/20 backdrop-blur-sm px-6 py-3 rounded-2xl border border-white/10 flex items-center gap-3">
            <MessageCircle class="w-5 h-5 text-white/80" />
            <span class="font-medium text-sm text-white/90">
              <template v-if="locale === 'th'">แจ้งเตือนผ่าน LINE</template>
              <template v-else-if="locale === 'en'">LINE Notifications</template>
              <template v-else>LINE 消息通知</template>
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
