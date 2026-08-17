<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { Globe, QrCode, Zap, MessageSquare, Store, Smartphone, Scan, LayoutDashboard } from 'lucide-vue-next'

const user = useSupabaseUser()
const { auth } = useSupabaseClient()

const logout = async () => {
  await auth.signOut()
}

// Parallax State
const mouseX = ref(0)
const mouseY = ref(0)
const isMobile = ref(false)

const handleMouseMove = (e: MouseEvent) => {
  if (isMobile.value) return // If gyro is active, don't use mouse
  
  // Calculate delta from center of screen (-1 to 1)
  const x = (e.clientX / window.innerWidth) * 2 - 1
  const y = (e.clientY / window.innerHeight) * 2 - 1
  
  requestAnimationFrame(() => {
    mouseX.value = x
    mouseY.value = y
  })
}

const handleOrientation = (e: DeviceOrientationEvent) => {
  if (e.beta === null || e.gamma === null) return
  isMobile.value = true // Detected gyro, disable mouse track
  
  // Normalize beta (up/down) around 45 degrees holding angle
  const beta = Math.max(-45, Math.min(45, (e.beta || 0) - 45)) / 45
  // Normalize gamma (left/right) 
  const gamma = Math.max(-45, Math.min(45, e.gamma || 0)) / 45
  
  requestAnimationFrame(() => {
    mouseX.value = gamma 
    mouseY.value = beta
  })
}

onMounted(() => {
  window.addEventListener('mousemove', handleMouseMove)
  window.addEventListener('deviceorientation', handleOrientation)
})

onUnmounted(() => {
  window.removeEventListener('mousemove', handleMouseMove)
  window.removeEventListener('deviceorientation', handleOrientation)
})

// Parallax Layers
const foregroundStyle = computed(() => ({
  transform: `translate3d(${mouseX.value * -30}px, ${mouseY.value * -30}px, 0) scale(1.02) rotate(3deg)`,
  transition: isMobile.value ? 'transform 0.1s ease-out' : 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
}))

const badgeStyle = computed(() => ({
  transform: `translate3d(${mouseX.value * -40}px, ${mouseY.value * -40}px, 0) scale(1.05)`,
  transition: isMobile.value ? 'transform 0.1s ease-out' : 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
}))

const midgroundStyle = computed(() => ({
  transform: `translate3d(${mouseX.value * -15}px, ${mouseY.value * -15}px, 0) scale(1.01) rotate(-6deg)`,
  transition: isMobile.value ? 'transform 0.1s ease-out' : 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
}))

const backgroundStyle = computed(() => ({
  transform: `translate3d(${mouseX.value * 25}px, ${mouseY.value * 25}px, 0)`,
  transition: isMobile.value ? 'transform 0.1s ease-out' : 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
}))

const textLayerStyle = computed(() => ({
  transform: `translate3d(${mouseX.value * 10}px, ${mouseY.value * 10}px, 0)`,
  transition: isMobile.value ? 'transform 0.1s ease-out' : 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
}))
</script>

<template>
  <div class="relative min-h-screen overflow-hidden bg-background font-sans selection:bg-primary/20">
    <!-- Background Decorators (Background Layer) -->
    <div :style="backgroundStyle" class="absolute top-0 right-0 w-[800px] h-[800px] bg-primary/5 rounded-full blur-[100px] opacity-80 pointer-events-none -translate-y-1/2 translate-x-1/3"></div>
    <div :style="backgroundStyle" class="absolute bottom-0 left-0 w-[600px] h-[600px] bg-rose-500/10 rounded-full blur-[80px] opacity-60 pointer-events-none translate-y-1/3 -translate-x-1/3"></div>
    
    <!-- Navbar -->
    <nav class="relative z-20 w-full px-6 lg:px-12 py-6 flex items-center justify-between">
      <NuxtLink to="/" class="flex items-center gap-3 group">
        <img src="/logo-icon.png" alt="ChiiMenu" class="w-10 h-10 rounded-2xl object-contain shadow-md shadow-primary/20 group-hover:scale-105 transition-transform">
        <span class="text-2xl font-black tracking-tight text-foreground bg-clip-text">ChiiMenu</span>
      </NuxtLink>
      <div v-if="user">
        <NuxtLink to="/merchant/dashboard" class="text-sm font-bold text-primary hover:text-primary/80 transition-colors">เข้าสู่แดชบอร์ด &rarr;</NuxtLink>
      </div>
    </nav>

    <!-- Hero Section (Full-screen Edge-to-Edge) -->
    <main class="relative z-10 w-full px-6 lg:px-12 pt-12 pb-24 lg:pt-20 lg:pb-32 flex flex-col lg:flex-row items-center justify-between gap-16 lg:gap-8 min-h-[calc(100vh-100px)]">
      
      <!-- Left: Text Content -->
      <div :style="textLayerStyle" class="w-full lg:w-[60%] flex flex-col items-center lg:items-start text-center lg:text-left z-10">
        
        <div class="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary mb-8 border border-primary/20 backdrop-blur-md animate-fade-in-up">
          <span class="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
          <span class="text-sm font-bold tracking-wide">ระบบจัดการร้านอาหารเพื่อยุคดิจิทัล</span>
        </div>
        
        <h1 class="text-5xl sm:text-6xl lg:text-7xl xl:text-[5.5rem] font-black text-foreground mb-6 tracking-tight leading-[1.1] animate-fade-in-up" style="animation-delay: 0.1s;">
          ยกระดับบริการ<br/>
          <span class="text-transparent bg-clip-text bg-gradient-to-r from-primary to-rose-600">ร้านอาหารอัจฉริยะ</span>
        </h1>
        
        <p class="text-lg sm:text-xl text-muted-foreground mb-10 max-w-2xl lg:max-w-3xl animate-fade-in-up font-medium leading-relaxed" style="animation-delay: 0.2s;">
          ลดข้อผิดพลาดในการรับออเดอร์ ขจัดปัญหาอุปสรรคทางภาษา พร้อมระบบแจ้งเตือนผ่าน LINE ทันที ไม่ต้องลงทุนซื้ออุปกรณ์เพิ่มเติม
        </p>
        
        <!-- CTA Action Area -->
        <div class="w-full sm:max-w-md mx-auto lg:mx-0 animate-fade-in-up" style="animation-delay: 0.3s;">
          <div v-if="user" class="p-6 sm:p-8 bg-card/80 backdrop-blur-xl rounded-3xl border border-border shadow-2xl shadow-black/5">
            <div class="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto lg:mx-0 mb-4 text-primary">
              <Store class="w-8 h-8" />
            </div>
            <p class="mb-6 text-foreground font-bold">เข้าสู่ระบบในชื่อ <br/><span class="text-primary font-normal">{{ user.email }}</span></p>
            <div class="flex flex-col sm:flex-row gap-3">
              <NuxtLink to="/merchant/dashboard" class="flex-1 flex justify-center py-3.5 bg-primary text-primary-foreground font-bold rounded-xl hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 hover:-translate-y-0.5 whitespace-nowrap">
                เข้าสู่แดชบอร์ด
              </NuxtLink>
              <button @click="logout" class="flex-1 py-3.5 bg-muted text-muted-foreground font-bold rounded-xl hover:bg-muted/80 transition-all whitespace-nowrap">
                ออกจากระบบ
              </button>
            </div>
          </div>
          
          <div v-else class="flex flex-col sm:flex-row gap-4 w-full">
            <NuxtLink to="/register" class="flex-1 py-4 bg-primary text-primary-foreground font-bold rounded-2xl hover:bg-primary/90 transition-all shadow-xl shadow-primary/25 hover:-translate-y-0.5 text-base flex justify-center items-center">
              ทดลองใช้งานฟรี 7 วัน
            </NuxtLink>
            <NuxtLink to="/login" class="flex-1 py-4 bg-card text-foreground font-bold rounded-2xl border border-input hover:bg-muted transition-all text-base shadow-sm flex justify-center items-center">
              เข้าสู่ระบบร้านค้า
            </NuxtLink>
          </div>
        </div>
        
        <!-- Features List -->
        <div class="mt-12 flex flex-wrap justify-center lg:justify-start gap-x-8 gap-y-4 animate-fade-in-up" style="animation-delay: 0.4s;">
          <div class="flex items-center gap-2 text-sm font-semibold text-muted-foreground"><Globe class="w-4 h-4 text-primary" /> รองรับ 3 ภาษา</div>
          <div class="flex items-center gap-2 text-sm font-semibold text-muted-foreground"><Scan class="w-4 h-4 text-primary" /> สแกนสั่งผ่าน QR</div>
          <div class="flex items-center gap-2 text-sm font-semibold text-muted-foreground"><Zap class="w-4 h-4 text-primary" /> เรียลไทม์ 100%</div>
        </div>
      </div>
      
      <!-- Right: Visual/Graphics (Parallax Area) -->
      <div class="w-full lg:w-[40%] relative flex justify-center lg:justify-end items-center animate-fade-in-up" style="animation-delay: 0.3s; perspective: 1000px;">
        <!-- Abstract Dashboard / Phone Composition -->
        <div class="relative w-full max-w-xl aspect-square lg:aspect-auto lg:h-[700px] flex justify-center items-center">
          
          <!-- Large Decorative Circle (Background) -->
          <div :style="backgroundStyle" class="absolute inset-0 bg-gradient-to-br from-primary/10 to-rose-500/5 rounded-full blur-3xl transform scale-90"></div>
          
          <!-- Mockup Element 1: Phone (Midground Layer) -->
          <div :style="midgroundStyle" class="absolute z-20 left-[5%] lg:left-[15%] top-[10%] lg:top-[15%] w-56 sm:w-64 h-[480px] sm:h-[540px] bg-card rounded-[2.5rem] border-[6px] border-border shadow-2xl shadow-black/10 overflow-hidden flex flex-col">
            <!-- Notch -->
            <div class="w-24 h-6 bg-border mx-auto rounded-b-xl absolute top-0 left-1/2 -translate-x-1/2 z-30"></div>
            <!-- Screen Content -->
            <div class="flex-1 bg-slate-50 dark:bg-slate-900 p-5 pt-12 flex flex-col gap-4">
              <div class="w-full h-36 bg-primary/20 rounded-2xl animate-pulse"></div>
              <div class="w-3/4 h-7 bg-primary/10 rounded-lg"></div>
              <div class="space-y-3 mt-2">
                <div class="w-full h-24 bg-card border rounded-2xl flex items-center p-4 gap-4 shadow-sm">
                  <div class="w-16 h-16 bg-muted rounded-xl"></div>
                  <div class="flex-1 space-y-3">
                    <div class="w-full h-3 bg-muted rounded-full"></div>
                    <div class="w-1/2 h-3 bg-muted/50 rounded-full"></div>
                  </div>
                </div>
                <div class="w-full h-24 bg-card border rounded-2xl flex items-center p-4 gap-4 shadow-sm">
                  <div class="w-16 h-16 bg-muted rounded-xl"></div>
                  <div class="flex-1 space-y-3">
                    <div class="w-full h-3 bg-muted rounded-full"></div>
                    <div class="w-1/2 h-3 bg-muted/50 rounded-full"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <!-- Mockup Element 2: Dashboard Widget (Foreground Layer) -->
          <div :style="foregroundStyle" class="absolute z-30 right-0 lg:right-[5%] bottom-[15%] w-72 sm:w-80 bg-card/90 backdrop-blur-xl rounded-3xl border border-white/20 dark:border-white/10 shadow-2xl shadow-primary/20 p-6">
            <div class="flex items-center gap-3 mb-5 border-b border-border pb-4">
              <div class="w-12 h-12 bg-green-500/10 rounded-full flex items-center justify-center text-green-600 dark:text-green-400">
                <MessageSquare class="w-6 h-6" />
              </div>
              <div>
                <div class="text-base font-bold text-foreground">ออเดอร์ใหม่เข้า!</div>
                <div class="text-sm text-muted-foreground">โต๊ะ 04 • 1 นาทีที่แล้ว</div>
              </div>
            </div>
            <div class="space-y-3">
              <div class="flex justify-between items-center text-base">
                <span class="text-foreground font-medium">ต้มยำกุ้งน้ำข้น x1</span>
                <span class="text-muted-foreground font-semibold">฿250</span>
              </div>
              <div class="flex justify-between items-center text-base">
                <span class="text-foreground font-medium">ข้าวผัดปู x2</span>
                <span class="text-muted-foreground font-semibold">฿160</span>
              </div>
            </div>
          </div>
          
          <!-- Floating Badge (Foreground Layer) -->
          <div :style="badgeStyle" class="absolute z-40 right-[10%] lg:right-[20%] top-[5%] bg-card px-5 py-4 rounded-2xl border shadow-xl flex items-center gap-3 animate-bounce" style="animation-duration: 4s;">
            <LayoutDashboard class="w-6 h-6 text-primary" />
            <div class="text-sm font-bold">จัดการง่ายผ่านมือถือ</div>
          </div>
          
        </div>
      </div>
      
    </main>

    <!-- Footer -->
    <footer class="relative z-10 bg-slate-950 dark:bg-black text-slate-300 py-16 lg:py-20 border-t border-slate-900">
      <div class="w-full px-6 lg:px-12">
        <div class="grid grid-cols-1 md:grid-cols-4 gap-12 lg:gap-8">
          
          <!-- Brand -->
          <div class="md:col-span-2">
            <div class="flex items-center gap-3 mb-6">
              <img src="/logo-icon.png" alt="ChiiMenu" class="w-10 h-10 rounded-2xl object-contain shadow-md shadow-primary/20">
              <span class="text-2xl font-black tracking-tight text-white">ChiiMenu</span>
            </div>
            <p class="text-slate-400 max-w-sm mb-8 leading-relaxed">
              แพลตฟอร์มจัดการร้านอาหารเพื่อยุคดิจิทัล ลดข้อผิดพลาด เพิ่มยอดขาย ด้วยเมนูอัจฉริยะที่เข้าถึงลูกค้าได้ทุกชาติทุกภาษา
            </p>
            <div class="flex gap-4 text-slate-400">
              <a href="#" class="w-10 h-10 rounded-full bg-slate-900 flex items-center justify-center hover:bg-primary hover:text-white transition-all hover:-translate-y-1">
                <Globe class="w-5 h-5" />
              </a>
              <a href="#" class="w-10 h-10 rounded-full bg-slate-900 flex items-center justify-center hover:bg-primary hover:text-white transition-all hover:-translate-y-1">
                <MessageSquare class="w-5 h-5" />
              </a>
            </div>
          </div>

          <!-- Links -->
          <div>
            <h4 class="text-white font-bold mb-6">บริการของเรา</h4>
            <ul class="space-y-4 text-sm font-medium">
              <li><NuxtLink to="/login" class="hover:text-primary transition-colors">เข้าสู่ระบบร้านค้า</NuxtLink></li>
              <li><NuxtLink to="/register" class="hover:text-primary transition-colors">ทดลองใช้งานฟรี 7 วัน</NuxtLink></li>
              <li><NuxtLink to="/#pricing" class="hover:text-primary transition-colors">ราคาแพ็กเกจ</NuxtLink></li>
            </ul>
          </div>
          
          <div>
            <h4 class="text-white font-bold mb-6">ช่วยเหลือ & ข้อมูล</h4>
            <ul class="space-y-4 text-sm font-medium">
              <li><a href="https://line.me/R/ti/p/@819wgrsj" target="_blank" rel="noopener noreferrer" class="hover:text-primary transition-colors flex items-center gap-2">
                <span>💬 ติดต่อทีมงาน LINE Support</span>
                <span class="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-md font-mono">@819wgrsj</span>
              </a></li>
              <li><NuxtLink to="/privacy" class="hover:text-primary transition-colors">นโยบายความเป็นส่วนตัว (Privacy Policy)</NuxtLink></li>
            </ul>
          </div>

        </div>

        <div class="mt-16 pt-8 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm font-medium text-slate-500">
          <div>&copy; {{ new Date().getFullYear() }} ChiiMenu. All rights reserved.</div>
          <div class="flex items-center gap-2">
            <span>Made with</span>
            <span class="text-rose-500 animate-pulse">❤️</span>
            <span>for Restaurants</span>
          </div>
        </div>
      </div>
    </footer>
  </div>
</template>

<style scoped>
@keyframes fade-in-up {
  0% {
    opacity: 0;
    transform: translateY(20px);
  }
  100% {
    opacity: 1;
    transform: translateY(0);
  }
}
.animate-fade-in-up {
  animation: fade-in-up 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  opacity: 0;
}
</style>
