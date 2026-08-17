<script setup lang="ts">
import { Globe, BellRing, Smartphone } from 'lucide-vue-next'

const { locale, setLocale } = useI18n()
const user = useSupabaseUser()
const client = useSupabaseClient()
const { auth } = client
const router = useRouter()
import { isValidEmail, isValidPhone } from '~/utils/validation'

const loginId = ref('')
const password = ref('')
const fullName = ref('')
const loading = ref(false)
const errorMsg = ref('')
const successMsg = ref('')
const acceptPdpa = ref(false)
const showPrivacyModal = ref(false)

watchEffect(() => {
  if (user.value) {
    router.push('/merchant/dashboard')
  }
})

const handleRegister = async () => {
  if (!acceptPdpa.value) {
    errorMsg.value = locale.value === 'th' 
      ? 'กรุณายอมรับนโยบายความเป็นส่วนตัวก่อนสมัคร' 
      : 'Please accept the privacy policy before registering'
    return
  }

  loading.value = true
  errorMsg.value = ''
  successMsg.value = ''
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
          ? `คุณใช้อีเมล ${actualEmail} ใช่หรือไม่? (ระวังพิมพ์ตก .com)` 
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
  
  // Duplicate Name Check
  const { count } = await client
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .eq('full_name', fullName.value.trim())
    
  if (count && count > 0) {
    const nameResult = await swal.fire({
      title: locale.value === 'th' ? 'ชื่อนี้มีในระบบแล้ว' : 'Name already exists',
      text: locale.value === 'th' 
        ? 'พบว่ามีผู้ใช้งานชื่อนี้อยู่ในระบบแล้ว คุณอาจจะเคยสมัครใช้งานไว้แล้ว ต้องการดำเนินการสมัครบัญชีใหม่ต่อไปหรือไม่?' 
        : 'This name is already registered. Do you want to proceed creating a new account?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: locale.value === 'th' ? 'ยืนยันสมัครใหม่' : 'Proceed',
      cancelButtonText: locale.value === 'th' ? 'ยกเลิก' : 'Cancel'
    })
    if (!nameResult.isConfirmed) {
      loading.value = false
      return
    }
  }
  
  const metaData: any = {
    full_name: fullName.value
  }
  
  if (actualEmail.includes('@phone.chiimenu.com')) {
    metaData.phone = loginId.value.trim()
  }
  
  const { error } = await auth.signUp({
    email: actualEmail,
    password: password.value,
    options: {
      data: metaData
    }
  })
  
  if (error) {
    if (error.message.includes('User already registered') || error.message.includes('already exists')) {
      errorMsg.value = locale.value === 'th' ? 'อีเมลหรือเบอร์โทรนี้ถูกสมัครใช้งานไปแล้ว กรุณาเข้าสู่ระบบ' : 'This email/phone is already registered. Please login.'
    } else {
      errorMsg.value = error.message
    }
  } else {
    if (actualEmail.includes('@phone.chiimenu.com')) {
      successMsg.value = 'เปิดร้านค้าสำเร็จ! ระบบกำลังพาคุณเข้าสู่แดชบอร์ด...'
    } else {
      successMsg.value = 'เปิดร้านค้าสำเร็จ! กรุณาตรวจสอบและกดยืนยันในอีเมลของคุณก่อนเข้าสู่ระบบ'
    }
    // If auto login is enabled in Supabase, the watcher above will trigger.
  }
  loading.value = false
}
</script>

<template>
  <div class="flex min-h-screen bg-background flex-row-reverse">
    <!-- Right Side: Form (Reversed layout for variation) -->
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
            <template v-if="locale === 'th'">เริ่มต้นใช้งานฟรี 7 วัน</template>
            <template v-else-if="locale === 'en'">Start 7-Day Free Trial</template>
            <template v-else>开始 7 天免费试用</template>
          </h2>
          <p class="mt-2 text-sm text-muted-foreground">
            <template v-if="locale === 'th'">มีบัญชีร้านค้าอยู่แล้ว?</template>
            <template v-else-if="locale === 'en'">Already have an account?</template>
            <template v-else>已有账户？</template>
            <NuxtLink to="/login" class="font-bold text-primary hover:text-primary/80 transition-colors ml-1">
              <template v-if="locale === 'th'">เข้าสู่ระบบที่นี่</template>
              <template v-else-if="locale === 'en'">Sign in here</template>
              <template v-else>在这里登录</template>
            </NuxtLink>
          </p>
        </div>

        <div class="mt-10">
          <form v-if="!successMsg" class="space-y-6" @submit.prevent="handleRegister">
            <div class="animate-fade-in-up" style="animation-delay: 0.2s;">
              <label for="name" class="block text-sm font-bold text-foreground">
                <template v-if="locale === 'th'">ชื่อ-นามสกุล / ชื่อผู้ติดต่อ</template>
                <template v-else-if="locale === 'en'">Full Name / Contact Name</template>
                <template v-else>全名 / 联系人姓名</template>
              </label>
              <div class="mt-2">
                <input v-model="fullName" id="name" type="text" required class="block w-full rounded-xl border border-input px-4 py-3 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 bg-background text-foreground transition-all" />
              </div>
            </div>
            
            <div class="animate-fade-in-up" style="animation-delay: 0.3s;">
              <label for="loginId" class="block text-sm font-bold text-foreground">
                <template v-if="locale === 'th'">อีเมล หรือ เบอร์โทรศัพท์</template>
                <template v-else-if="locale === 'en'">Email or Phone Number</template>
                <template v-else>电子邮件或电话号码</template>
              </label>
              <div class="mt-2">
                <input v-model="loginId" id="loginId" type="text" autocomplete="username" required class="block w-full rounded-xl border border-input px-4 py-3 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 bg-background text-foreground transition-all" :placeholder="locale === 'th' ? 'เช่น shop@email.com หรือ 0812345678' : 'e.g. shop@email.com or 0812345678'" />
              </div>
            </div>

            <div class="animate-fade-in-up" style="animation-delay: 0.4s;">
              <label for="password" class="block text-sm font-bold text-foreground">
                <template v-if="locale === 'th'">รหัสผ่าน (อย่างน้อย 6 ตัวอักษร)</template>
                <template v-else-if="locale === 'en'">Password (at least 6 characters)</template>
                <template v-else>密码（至少 6 个字符）</template>
              </label>
              <div class="mt-2">
                <input v-model="password" id="password" type="password" autocomplete="new-password" required minlength="6" class="block w-full rounded-xl border border-input px-4 py-3 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 bg-background text-foreground transition-all" />
              </div>
            </div>
            
            <div v-if="errorMsg" class="rounded-lg bg-destructive/10 p-4 border border-destructive/20 text-sm font-semibold text-destructive animate-in fade-in slide-in-from-top-2">
              {{ errorMsg }}
            </div>

            <!-- PDPA Checkbox -->
            <div class="flex items-start gap-3 animate-fade-in-up" style="animation-delay: 0.45s;">
              <div class="flex h-6 items-center">
                <input id="pdpa" v-model="acceptPdpa" type="checkbox" required class="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary">
              </div>
              <div class="text-sm leading-6">
                <label for="pdpa" class="font-medium text-foreground">
                  <template v-if="locale === 'th'">ข้าพเจ้ายอมรับ</template>
                  <template v-else-if="locale === 'en'">I accept the</template>
                  <template v-else>我接受</template>
                  <button type="button" @click="showPrivacyModal = true" class="text-primary hover:underline ml-1">
                    <template v-if="locale === 'th'">นโยบายความเป็นส่วนตัว (Privacy Policy)</template>
                    <template v-else-if="locale === 'en'">Privacy Policy</template>
                    <template v-else>隐私政策</template>
                  </button>
                </label>
              </div>
            </div>

            <div class="animate-fade-in-up" style="animation-delay: 0.5s;">
              <button type="submit" :disabled="loading" class="flex w-full justify-center items-center rounded-xl border border-transparent bg-primary py-3.5 px-4 text-base font-bold text-primary-foreground shadow-lg shadow-primary/25 hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 transition-all hover:-translate-y-0.5">
                <span v-if="loading" class="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></span>
                <template v-if="locale === 'th'">{{ loading ? 'กำลังสร้างบัญชี...' : 'สมัครร้านค้าใหม่' }}</template>
                <template v-else-if="locale === 'en'">{{ loading ? 'Creating Account...' : 'Create Account' }}</template>
                <template v-else>{{ loading ? '正在创建账户...' : '创建账户' }}</template>
              </button>
            </div>
          </form>
          
          <div v-else class="text-center bg-green-50 dark:bg-green-950/30 p-8 rounded-2xl border border-green-100 dark:border-green-900 animate-in fade-in zoom-in-95">
            <div class="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900 mb-6 shadow-sm">
              <svg class="h-8 w-8 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            </div>
            <h3 class="text-xl font-black text-foreground mb-2">
              <template v-if="locale === 'th'">สมัครสำเร็จ!</template>
              <template v-else-if="locale === 'en'">Registration Successful!</template>
              <template v-else>注册成功！</template>
            </h3>
            <p class="text-sm text-muted-foreground leading-relaxed">{{ successMsg }}</p>
            <div class="mt-8">
              <NuxtLink to="/login" class="inline-flex justify-center items-center rounded-xl bg-primary px-6 py-3 text-sm font-bold text-primary-foreground shadow-md hover:bg-primary/90 transition-all">
                <template v-if="locale === 'th'">กลับไปหน้าเข้าสู่ระบบ</template>
                <template v-else-if="locale === 'en'">Return to Login</template>
                <template v-else>返回登录</template>
              </NuxtLink>
            </div>
          </div>

          <!-- Auth Footer Links -->
          <div class="mt-10 pt-6 border-t border-border/50 text-center text-xs text-muted-foreground space-y-2">
            <div class="flex justify-center items-center gap-3">
              <NuxtLink to="/privacy" class="hover:text-primary transition-colors font-medium">นโยบายความเป็นส่วนตัว</NuxtLink>
              <span>•</span>
              <a href="https://line.me/R/ti/p/@819wgrsj" target="_blank" rel="noopener noreferrer" class="hover:text-emerald-700 font-bold text-emerald-700">ช่วยเหลือ / ติดต่อ LINE</a>
            </div>
            <p>&copy; {{ new Date().getFullYear() }} ChiiMenu. All rights reserved.</p>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Left Side: Graphic/Banner -->
    <div class="relative hidden w-0 flex-1 lg:block bg-slate-900 overflow-hidden">
      <div class="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&q=80')] bg-cover bg-center opacity-40 mix-blend-overlay"></div>
      <div class="absolute inset-0 bg-gradient-to-br from-primary/90 to-rose-900/90 mix-blend-multiply"></div>
      
      <!-- Content Overlay -->
      <div class="absolute inset-0 flex flex-col items-center justify-center text-white p-12 text-center">
        <div class="mb-8 text-white/90 bg-white/10 p-5 rounded-3xl backdrop-blur-sm border border-white/20 shadow-2xl animate-fade-in-up flex items-center justify-center" style="animation-delay: 0.1s;">
          <img src="/logo.png" alt="ChiiMenu" class="w-16 h-16 rounded-2xl object-contain shadow-xl" />
        </div>
        <h2 class="text-4xl lg:text-5xl font-black mb-10 leading-tight max-w-lg text-white animate-fade-in-up" style="animation-delay: 0.15s;">
          <template v-if="locale === 'th'">ยกระดับร้านอาหาร<br/>ด้วยระบบสั่งอาหารดิจิทัล</template>
          <template v-else-if="locale === 'en'">Elevate your restaurant<br/>with digital menus</template>
          <template v-else>使用数字菜单<br/>提升您的餐厅体验</template>
        </h2>
        
        <div class="space-y-6 text-left max-w-md mx-auto">
          <!-- Feature 1 -->
          <div class="flex items-center gap-4 bg-white/10 p-4 rounded-2xl backdrop-blur-sm border border-white/10 shadow-xl animate-fade-in-up" style="animation-delay: 0.2s;">
            <div class="flex-shrink-0 w-12 h-12 rounded-full bg-white/20 flex items-center justify-center text-white shadow-inner">
              <Globe class="w-6 h-6" />
            </div>
            <div class="font-medium text-lg text-white/95 leading-snug">
              <template v-if="locale === 'th'">เมนู 3 ภาษา (ไทย, อังกฤษ, จีน)</template>
              <template v-else-if="locale === 'en'">Tri-lingual menus (TH, EN, ZH)</template>
              <template v-else>三语菜单 (泰语, 英语, 中文)</template>
            </div>
          </div>
          
          <!-- Feature 2 -->
          <div class="flex items-center gap-4 bg-white/10 p-4 rounded-2xl backdrop-blur-sm border border-white/10 shadow-xl animate-fade-in-up" style="animation-delay: 0.3s;">
            <div class="flex-shrink-0 w-12 h-12 rounded-full bg-white/20 flex items-center justify-center text-white shadow-inner">
              <BellRing class="w-6 h-6" />
            </div>
            <div class="font-medium text-lg text-white/95 leading-snug">
              <template v-if="locale === 'th'">แจ้งเตือนออเดอร์ใหม่ผ่าน LINE ทันที</template>
              <template v-else-if="locale === 'en'">Instant order alerts via LINE</template>
              <template v-else>通过 LINE 即时通知新订单</template>
            </div>
          </div>
          
          <!-- Feature 3 -->
          <div class="flex items-center gap-4 bg-white/10 p-4 rounded-2xl backdrop-blur-sm border border-white/10 shadow-xl animate-fade-in-up" style="animation-delay: 0.4s;">
            <div class="flex-shrink-0 w-12 h-12 rounded-full bg-white/20 flex items-center justify-center text-white shadow-inner">
              <Smartphone class="w-6 h-6" />
            </div>
            <div class="font-medium text-lg text-white/95 leading-snug">
              <template v-if="locale === 'th'">ไม่ต้องลงทุนซื้อฮาร์ดแวร์เพิ่มเติม</template>
              <template v-else-if="locale === 'en'">Zero hardware investment required</template>
              <template v-else>无需额外的硬件投资</template>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Privacy Policy Modal -->
<div v-if="showPrivacyModal" class="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto overflow-x-hidden bg-black/60 backdrop-blur-sm p-4">
  <div class="relative w-full max-w-2xl max-h-[90vh] bg-background rounded-2xl shadow-2xl flex flex-col animate-in fade-in zoom-in-95 duration-200">
    
    <!-- Modal Header -->
    <div class="flex items-center justify-between p-5 border-b border-border">
      <h3 class="text-xl font-bold text-foreground">
        <template v-if="locale === 'th'">นโยบายความเป็นส่วนตัว</template>
        <template v-else-if="locale === 'en'">Privacy Policy</template>
        <template v-else>隐私政策</template>
      </h3>
      <button @click="showPrivacyModal = false" type="button" class="text-muted-foreground hover:bg-muted hover:text-foreground rounded-lg p-2 transition-colors">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
      </button>
    </div>

    <!-- Modal Body -->
    <div class="p-6 overflow-y-auto flex-1 text-sm text-muted-foreground space-y-4">
      <template v-if="locale === 'th'">
        <p>เพื่อการให้บริการที่สมบูรณ์แบบ ChiiMenu มีความจำเป็นต้องจัดเก็บข้อมูลส่วนบุคคลของท่าน ดังนี้:</p>
        <ul class="list-disc pl-5 space-y-2">
          <li><strong>ข้อมูลการติดต่อ:</strong> เบอร์โทรศัพท์, อีเมล, ชื่อ, และ Line ID (เพื่อใช้ในการแจ้งเตือนออเดอร์และการเข้าระบบ)</li>
          <li><strong>ข้อมูลร้านค้า:</strong> ชื่อร้าน, ที่อยู่, พิกัด, และเวลาเปิดปิด</li>
          <li><strong>ข้อมูลการใช้งาน:</strong> ประวัติการใช้งานระบบ, ออเดอร์ที่ถูกสร้าง, และข้อมูลอุปกรณ์ที่ใช้ล็อกอิน</li>
        </ul>
        <p class="font-bold text-foreground mt-4">วัตถุประสงค์ในการเก็บข้อมูล:</p>
        <ul class="list-disc pl-5 space-y-2">
          <li>เพื่อยืนยันตัวตนและป้องกันการเข้าถึงโดยไม่ได้รับอนุญาต</li>
          <li>เพื่อส่งการแจ้งเตือนออเดอร์ (ผ่านช่องทาง LINE หรือ Email)</li>
          <li>เพื่อปรับปรุงและพัฒนาบริการให้ตรงกับความต้องการของร้านค้า</li>
        </ul>
        <p>ข้อมูลทั้งหมดจะถูกเก็บรักษาไว้อย่างปลอดภัยตามพระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล (PDPA) และจะไม่มีการนำไปขายต่อให้กับบุคคลที่สาม</p>
      </template>
      <template v-else-if="locale === 'en'">
        <p>To provide our complete services, ChiiMenu needs to collect the following personal information:</p>
        <ul class="list-disc pl-5 space-y-2">
          <li><strong>Contact Information:</strong> Phone number, Email, Name, and Line ID (for order notifications and login).</li>
          <li><strong>Store Information:</strong> Store name, address, location, and operating hours.</li>
          <li><strong>Usage Data:</strong> System usage history, created orders, and device login information.</li>
        </ul>
        <p class="font-bold text-foreground mt-4">Purpose of Data Collection:</p>
        <ul class="list-disc pl-5 space-y-2">
          <li>To verify identity and prevent unauthorized access.</li>
          <li>To send order notifications (via LINE or Email).</li>
          <li>To improve and develop services tailored to merchants' needs.</li>
        </ul>
        <p>All data is securely stored in compliance with the Personal Data Protection Act (PDPA) and will never be sold to third parties.</p>
      </template>
      <template v-else>
        <p>为了提供完整的服务，ChiiMenu 需要收集以下个人信息：</p>
        <ul class="list-disc pl-5 space-y-2">
          <li><strong>联系信息：</strong> 电话号码、电子邮件、姓名和 Line ID（用于订单通知和登录）。</li>
          <li><strong>商店信息：</strong> 商店名称、地址、位置和营业时间。</li>
          <li><strong>使用数据：</strong> 系统使用历史记录、创建的订单和设备登录信息。</li>
        </ul>
        <p class="font-bold text-foreground mt-4">数据收集目的：</p>
        <ul class="list-disc pl-5 space-y-2">
          <li>验证身份并防止未经授权的访问。</li>
          <li>发送订单通知（通过 LINE 或 电子邮件）。</li>
          <li>改进和开发适合商家需求的服务。</li>
        </ul>
        <p>所有数据均按照个人数据保护法 (PDPA) 的规定安全存储，绝不会出售给第三方。</p>
      </template>
    </div>

    <!-- Modal Footer -->
    <div class="flex items-center justify-end p-5 border-t border-border">
      <button @click="showPrivacyModal = false; acceptPdpa = true" type="button" class="text-white bg-primary hover:bg-primary/90 font-medium rounded-xl text-sm px-5 py-2.5 text-center transition-colors">
        <template v-if="locale === 'th'">เข้าใจและยอมรับ</template>
        <template v-else-if="locale === 'en'">I Understand & Accept</template>
        <template v-else>理解并接受</template>
      </button>
    </div>
    
  </div>
</div>
</template>
