<script setup lang="ts">
import { Menu, X, QrCode, ChevronDown } from 'lucide-vue-next'

const user = useSupabaseUser()
const client = useSupabaseClient()
const router = useRouter()
const config = useRuntimeConfig()

const { locale, locales, setLocale } = useI18n()
const mobileMenuOpen = ref(false)
const isUserDropdownOpen = ref(false)

const { store, isAdmin, loading, fetchStore, clearStore } = useCurrentStore()

onMounted(async () => {
  await fetchStore()
})

const daysRemaining = computed(() => {
  if (!store.value?.trial_ends_at) return 0
  const trialEnd = new Date(store.value.trial_ends_at).getTime()
  const now = new Date().getTime()
  return Math.ceil((trialEnd - now) / (1000 * 60 * 60 * 24))
})

const isTrialExpired = computed(() => {
  if (!store.value?.trial_ends_at) return false
  return new Date(store.value.trial_ends_at).getTime() < Date.now()
})

const logout = async () => {
  clearStore()
  await client.auth.signOut()
  router.push('/login')
}

const route = useRoute()
const isBillingPage = computed(() => route.path.includes('/merchant/billing'))

const handleLocaleChange = (e: Event) => {
  const target = e.target as HTMLSelectElement
  if (target) {
    setLocale(target.value as 'th' | 'en' | 'zh')
  }
}
</script>

<template>
  <div class="flex h-screen overflow-hidden bg-muted/20">
    
    <!-- Desktop Sidebar -->
    <aside class="hidden md:flex w-64 flex-col border-r bg-card z-20 shrink-0">
      <div class="h-16 flex items-center px-6 border-b shrink-0">
        <NuxtLink to="/merchant/dashboard" class="text-xl font-bold text-primary">🥢 ChiiMenu</NuxtLink>
      </div>
      <nav class="flex-1 overflow-y-auto py-4 space-y-1">
        <NuxtLink v-if="!isTrialExpired" to="/merchant/dashboard" class="block px-6 py-3 border-l-4 border-transparent text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors" active-class="bg-primary/10 border-primary text-primary">
          {{ $t('nav_dashboard') }}
        </NuxtLink>
        <NuxtLink v-if="!isTrialExpired" to="/merchant/orders" class="block px-6 py-3 border-l-4 border-transparent text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors" active-class="bg-primary/10 border-primary text-primary">
          ประวัติออเดอร์
        </NuxtLink>
        <NuxtLink v-if="!isTrialExpired" to="/merchant/store/settings" class="block px-6 py-3 border-l-4 border-transparent text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors" active-class="bg-primary/10 border-primary text-primary">
          {{ $t('nav_store_settings') }}
        </NuxtLink>
        <NuxtLink v-if="!isTrialExpired" to="/merchant/menu" class="block px-6 py-3 border-l-4 border-transparent text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors" active-class="bg-primary/10 border-primary text-primary">
          {{ $t('nav_menu_manage') }}
        </NuxtLink>
        <NuxtLink v-if="!isTrialExpired" to="/merchant/qr" class="block px-6 py-3 border-l-4 border-transparent text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors" active-class="bg-primary/10 border-primary text-primary">
          {{ $t('nav_qr_codes') }}
        </NuxtLink>
        <NuxtLink to="/merchant/billing" class="block px-6 py-3 border-l-4 border-transparent text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors" active-class="bg-primary/10 border-primary text-primary">
          แพ็กเกจ/ต่ออายุ
        </NuxtLink>
        <NuxtLink to="/merchant/guide" class="block px-6 py-3 border-l-4 border-transparent text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors" active-class="bg-primary/10 border-primary text-primary">
          📚 คู่มือการใช้งาน
        </NuxtLink>
        <NuxtLink v-if="isAdmin" to="/admin/stores" class="block px-6 py-3 border-l-4 border-transparent text-sm font-bold text-orange-600 hover:bg-orange-50 hover:text-orange-700 transition-colors" active-class="bg-orange-100 border-orange-600 text-orange-700">
          ⭐ Admin
        </NuxtLink>
      </nav>
    </aside>

    <!-- Main Content Area -->
    <div class="flex-1 flex flex-col min-w-0 overflow-hidden">
      
      <!-- Top Header -->
      <header class="h-16 flex items-center justify-between border-b bg-card px-4 sm:px-6 shrink-0 z-10">
        <div class="flex items-center">
          <button @click="mobileMenuOpen = true" class="md:hidden text-muted-foreground hover:text-foreground p-2 -ml-2 mr-2">
            <Menu class="w-6 h-6" />
          </button>
          <NuxtLink to="/merchant/dashboard" class="md:hidden text-xl font-bold text-primary">🥢 ChiiMenu</NuxtLink>
        </div>
        
        <div class="flex items-center gap-3 ml-auto">
          <select 
            v-model="locale" 
            @change="handleLocaleChange"
            class="bg-transparent border border-border rounded-xl text-xs font-semibold px-2 py-1.5 outline-none focus:ring-1 focus:ring-primary text-foreground"
          >
            <option v-for="l in locales" :key="l.code" :value="l.code">
              {{ l.name }}
            </option>
          </select>
          <div class="relative ml-1">
            <button @click="isUserDropdownOpen = !isUserDropdownOpen" class="flex items-center max-w-xs text-xs font-semibold bg-muted/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary px-3 py-1.5 transition-colors hover:bg-muted border">
              <span class="sr-only">Open user menu</span>
              <span class="text-xs font-semibold text-foreground mr-1">จัดการบัญชี</span>
              <ChevronDown class="w-3.5 h-3.5 text-muted-foreground" />
            </button>
            
            <div v-if="isUserDropdownOpen" @click="isUserDropdownOpen = false" class="fixed inset-0 z-40"></div>
            
            <div v-if="isUserDropdownOpen" class="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-card ring-1 ring-black ring-opacity-5 divide-y divide-border z-50 overflow-hidden border border-border">
              <div class="py-1">
                <NuxtLink to="/merchant/profile" @click="isUserDropdownOpen = false" class="block px-4 py-2 text-sm text-foreground hover:bg-muted transition-colors">โปรไฟล์ส่วนตัว</NuxtLink>
              </div>
              <div class="py-1">
                <button @click="logout" class="block w-full text-left px-4 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors">ออกจากระบบ</button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <!-- Scrollable Main Content -->
      <main class="flex-1 overflow-y-auto bg-muted/20">
        <div class="p-4 sm:p-6 lg:p-8 w-full max-w-[1600px] mx-auto">
          
          <!-- Loading State -->
          <div v-if="loading" class="flex justify-center items-center py-20">
            <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
          
          <!-- Trial Expired Lock Screen -->
          <div v-else-if="isTrialExpired && !isBillingPage" class="max-w-2xl mx-auto bg-card rounded-2xl shadow-lg border-2 overflow-hidden text-center mt-10" :class="!store?.has_used_first_time_promo ? 'border-rose-300' : 'border-red-200'">
            <div :class="!store?.has_used_first_time_promo ? 'bg-gradient-to-r from-rose-500 to-pink-600 text-white p-8' : 'bg-red-500 text-white p-6'">
              <div v-if="!store?.has_used_first_time_promo" class="inline-block bg-white text-rose-600 font-bold px-3 py-1 rounded-full text-sm mb-4 shadow-sm">🔥 สิทธิพิเศษเฉพาะคุณ</div>
              <h2 class="font-black" :class="!store?.has_used_first_time_promo ? 'text-4xl mb-2' : 'text-3xl'">
                {{ !store?.has_used_first_time_promo ? 'สิทธิ์ทดลองใช้งานหมดแล้ว' : 'สิทธิ์ใช้งานระบบของคุณหมดแล้ว' }}
              </h2>
              <p class="mt-2 text-white/90 text-lg" v-if="!store?.has_used_first_time_promo">
                ต่ออายุวันนี้ <span class="font-bold underline decoration-2 underline-offset-4">รับส่วนลดทันที 50%</span> 
                <br>เพื่อใช้งานระบบจัดการและรับออเดอร์ได้อย่างต่อเนื่อง
              </p>
              <p class="mt-2 text-red-100" v-else>
                กรุณาต่ออายุแพ็กเกจเพื่อกลับมาใช้งานระบบจัดการและเมนูร้านค้าอีกครั้ง
              </p>
            </div>
            
            <div class="p-8">
              <div class="flex justify-center mb-8">
                <NuxtLink v-if="!store?.has_used_first_time_promo" to="/merchant/billing" class="bg-rose-500 hover:bg-rose-600 text-white px-8 py-4 rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-3 text-lg font-bold w-full max-w-sm">
                  ดูราคาแพ็กเกจโปรโมชั่น 50%
                </NuxtLink>
                <a v-else href="https://line.me/R/ti/p/@819wgrsj" target="_blank" rel="noopener noreferrer" class="bg-[#00B900] hover:bg-[#009900] text-white px-8 py-4 rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-3 text-lg font-bold w-full max-w-sm">
                  <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" fill="currentColor" viewBox="0 0 16 16">
                    <path d="M8 0c4.411 0 8 2.912 8 6.492 0 3.146-2.618 5.86-6.326 6.39-.304.043-.63.14-.725.437-.083.257-.023.75-.023.75s.033.4.156.966c.094.432-.423.633-.787.41-1.636-.994-5.69-3.414-7.258-5.328C.612 8.441 0 7.502 0 6.492 0 2.912 3.589 0 8 0z" />
                  </svg>
                  ติดต่อแอดมินผ่าน LINE
                </a>
              </div>
              
              <h3 class="text-xl font-bold text-foreground mb-4">ขั้นตอนการต่ออายุ:</h3>
              <div class="text-left bg-muted/30 p-6 rounded-xl text-foreground space-y-4 mb-4 mx-auto max-w-md font-medium border border-border">
                <div class="flex items-start gap-3">
                  <div class="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center flex-shrink-0 mt-0.5">1</div>
                  <div>
                    กดปุ่มด้านบน หรือแอด LINE ID: <strong class="text-primary">@819wgrsj</strong>
                  </div>
                </div>
                <div class="flex items-start gap-3">
                  <div class="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center flex-shrink-0 mt-0.5">2</div>
                  <div>
                    ส่งข้อความหาแอดมินว่า: <br>
                    <span class="text-primary font-bold bg-primary/10 px-3 py-1.5 rounded-lg inline-block mt-2 border border-primary/20">"ต่ออายุร้าน: {{ store?.name || 'ชื่อร้านของคุณ' }}"</span>
                  </div>
                </div>
                <div class="flex items-start gap-3">
                  <div class="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center flex-shrink-0 mt-0.5">3</div>
                  <div>
                    แอดมินจะปลดล็อกระบบให้ร้านของคุณกลับมาออนไลน์ทันที
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <!-- Normal Content -->
          <div v-show="!loading && (!isTrialExpired || isBillingPage)">
            <slot />
          </div>

          <!-- App System Footer (Clean, Responsive, Support & Privacy Links) -->
          <footer class="mt-20 pt-6 pb-6 border-t border-border/60 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
            <div class="flex items-center gap-2">
              <span class="font-bold text-foreground">🥢 ChiiMenu</span>
              <span>•</span>
              <span>&copy; {{ new Date().getFullYear() }} All rights reserved.</span>
            </div>

            <div class="flex items-center gap-4 flex-wrap justify-center font-medium">
              <NuxtLink to="/merchant/billing" class="hover:text-primary transition-colors">แพ็กเกจและการต่ออายุ</NuxtLink>
              <span>•</span>
              <NuxtLink to="/privacy" class="hover:text-primary transition-colors">นโยบายความเป็นส่วนตัว</NuxtLink>
              <span>•</span>
              <a 
                href="https://line.me/R/ti/p/@819wgrsj" 
                target="_blank" 
                rel="noopener noreferrer" 
                class="hover:text-emerald-700 font-bold transition-colors inline-flex items-center gap-1 text-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-lg border border-emerald-200"
              >
                <span>💬 ติดต่อช่วยเหลือ LINE: @819wgrsj</span>
              </a>
            </div>
          </footer>

        </div>
      </main>
    </div>

    <!-- Mobile Menu Backdrop -->
    <Transition 
      enter-active-class="transition-opacity ease-linear duration-300" 
      enter-from-class="opacity-0" 
      enter-to-class="opacity-100" 
      leave-active-class="transition-opacity ease-linear duration-300" 
      leave-from-class="opacity-100" 
      leave-to-class="opacity-0"
    >
      <div v-if="mobileMenuOpen && !isTrialExpired" class="fixed inset-0 bg-black/60 z-40 md:hidden backdrop-blur-sm" @click="mobileMenuOpen = false"></div>
    </Transition>

    <!-- Mobile Menu Drawer -->
    <Transition 
      enter-active-class="transition ease-in-out duration-300 transform" 
      enter-from-class="-translate-x-full" 
      enter-to-class="translate-x-0" 
      leave-active-class="transition ease-in-out duration-300 transform" 
      leave-from-class="translate-x-0" 
      leave-to-class="-translate-x-full"
    >
      <div v-if="mobileMenuOpen && !isTrialExpired" class="fixed inset-y-0 left-0 w-[280px] bg-card shadow-2xl z-50 md:hidden flex flex-col h-full overflow-y-auto">
        <div class="p-5 border-b border-border flex items-center justify-between bg-muted/30">
          <span class="text-xl font-bold text-primary">🥢 ChiiMenu</span>
          <button @click="mobileMenuOpen = false" class="text-muted-foreground hover:text-foreground bg-muted p-1.5 rounded-full transition-colors">
            <X class="w-5 h-5" />
          </button>
        </div>
        
        <div class="py-4 space-y-1 flex-1">
          <NuxtLink to="/merchant/dashboard" @click="mobileMenuOpen = false" class="block px-6 py-3 text-base font-medium transition-colors" active-class="bg-primary/10 border-l-4 border-primary text-primary">
            {{ $t('nav_dashboard') }}
          </NuxtLink>
          <NuxtLink to="/merchant/orders" @click="mobileMenuOpen = false" class="block px-6 py-3 border-l-4 border-transparent text-base font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors" active-class="bg-primary/10 border-primary text-primary">
            ประวัติออเดอร์
          </NuxtLink>
          <NuxtLink to="/merchant/store/settings" @click="mobileMenuOpen = false" class="block px-6 py-3 border-l-4 border-transparent text-base font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors" active-class="bg-primary/10 border-primary text-primary">
            {{ $t('nav_store_settings') }}
          </NuxtLink>
          <NuxtLink to="/merchant/menu" @click="mobileMenuOpen = false" class="block px-6 py-3 border-l-4 border-transparent text-base font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors" active-class="bg-primary/10 border-primary text-primary">
            {{ $t('nav_menu_manage') }}
          </NuxtLink>
          <NuxtLink to="/merchant/qr" @click="mobileMenuOpen = false" class="block px-6 py-3 border-l-4 border-transparent text-base font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors" active-class="bg-primary/10 border-primary text-primary">
            {{ $t('nav_qr_codes') }}
          </NuxtLink>
          <NuxtLink to="/merchant/billing" @click="mobileMenuOpen = false" class="block px-6 py-3 border-l-4 border-transparent text-base font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors" active-class="bg-primary/10 border-primary text-primary">
            แพ็กเกจ/ต่ออายุ
          </NuxtLink>
          <NuxtLink to="/merchant/guide" @click="mobileMenuOpen = false" class="block px-6 py-3 border-l-4 border-transparent text-base font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors" active-class="bg-primary/10 border-primary text-primary">
            📚 คู่มือการใช้งาน
          </NuxtLink>
          <NuxtLink v-if="isAdmin" to="/admin/stores" @click="mobileMenuOpen = false" class="block px-6 py-3 border-l-4 border-transparent text-base font-bold text-orange-600 hover:bg-orange-50 hover:text-orange-700 transition-colors" active-class="bg-orange-100 border-orange-600 text-orange-700">
            ⭐ Admin
          </NuxtLink>
        </div>
        
        <div class="p-5 border-t border-border bg-muted/10">
           <button @click="logout" class="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-muted text-foreground rounded-xl font-medium hover:bg-muted/80 transition-colors border shadow-sm">
             {{ $t('nav_logout') }}
           </button>
        </div>
      </div>
    </Transition>
  </div>
</template>
