<script setup lang="ts">
import { 
  LayoutDashboard, 
  ClipboardList, 
  QrCode, 
  Utensils, 
  BarChart3, 
  Store, 
  CreditCard, 
  BookOpen, 
  ShieldCheck, 
  Menu, 
  X, 
  ChevronDown, 
  ChevronLeft,
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen,
  LogOut, 
  User,
  MoreHorizontal
} from 'lucide-vue-next'

const user = useSupabaseUser()
const client = useSupabaseClient()
const router = useRouter()
const config = useRuntimeConfig()

const { locale, locales, setLocale } = useI18n()
const mobileMenuOpen = ref(false)
const isUserDropdownOpen = ref(false)
const isCollapsed = ref(false)

const { store, isAdmin, loading, fetchStore, clearStore } = useCurrentStore()

onMounted(async () => {
  // Load persisted sidebar state from localStorage
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('merchant_sidebar_collapsed')
    if (saved !== null) {
      isCollapsed.value = saved === 'true'
    }
  }
  await fetchStore()
})

const toggleSidebar = () => {
  isCollapsed.value = !isCollapsed.value
  if (typeof window !== 'undefined') {
    localStorage.setItem('merchant_sidebar_collapsed', String(isCollapsed.value))
  }
}

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
  const swal = useAlert()
  const result = await swal.fire({
    title: (useNuxtApp().$i18n.t('confirm_logout_title') as string) || 'ยืนยันการออกจากระบบ',
    text: (useNuxtApp().$i18n.t('confirm_logout_text') as string) || 'คุณต้องการออกจากระบบ ChiiMenu ใช่หรือไม่?',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#e11d48',
    cancelButtonColor: '#64748b',
    confirmButtonText: (useNuxtApp().$i18n.t('btn_logout_confirm') as string) || 'ออกจากระบบ',
    cancelButtonText: (useNuxtApp().$i18n.t('btn_cancel') as string) || 'ยกเลิก'
  })

  if (!result.isConfirmed) return

  clearStore()
  await client.auth.signOut()
  router.push('/login')
}

const route = useRoute()
const isBillingPage = computed(() => route.path.includes('/merchant/billing'))

const handleLocaleChange = (e: Event) => {
  const target = e.target as HTMLSelectElement
  if (target) {
    setLocale(target.value as any)
  }
}
</script>

<template>
  <div class="flex h-screen overflow-hidden bg-muted/20 select-none">
    
    <!-- DESKTOP SIDEBAR (Collapsible & Persistent) -->
    <aside 
      class="hidden md:flex flex-col border-r bg-card z-20 shrink-0 transition-all duration-300 ease-in-out relative"
      :class="isCollapsed ? 'w-[72px]' : 'w-64'"
    >
      <!-- Sidebar Header (Logo & Toggle Button) -->
      <div 
        class="h-16 flex items-center border-b shrink-0 transition-all duration-300"
        :class="isCollapsed ? 'justify-center px-2' : 'justify-between px-5'"
      >
        <NuxtLink to="/merchant/dashboard" class="flex items-center gap-2.5 group overflow-hidden">
          <img src="/logo-icon.png" alt="ChiiMenu" class="w-8 h-8 rounded-xl object-contain shadow-xs shrink-0 group-hover:scale-105 transition-transform">
          <span 
            v-show="!isCollapsed" 
            class="text-xl font-black tracking-tight text-foreground whitespace-nowrap transition-opacity duration-200"
          >
            ChiiMenu
          </span>
        </NuxtLink>

        <!-- Toggle Collapse Button -->
        <button 
          type="button"
          @click="toggleSidebar"
          class="p-1.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer shrink-0"
          :class="isCollapsed ? 'absolute -right-3 top-5 bg-card border shadow-xs z-30 rounded-full w-6 h-6 flex items-center justify-center p-0' : ''"
          :title="isCollapsed ? 'ขยายแถบเมนู (Expand Sidebar)' : 'ย่อแถบเมนู (Collapse Sidebar)'"
        >
          <ChevronRight v-if="isCollapsed" class="w-3.5 h-3.5" />
          <PanelLeftClose v-else class="w-4 h-4" />
        </button>
      </div>

      <!-- Navigation Links Container -->
      <nav class="flex-1 overflow-y-auto py-3 space-y-4 overflow-x-hidden">
        
        <!-- Group 1: Operations (การขาย & หน้าร้าน) -->
        <div class="space-y-0.5">
          <div 
            v-if="!isCollapsed" 
            class="px-5 pb-1.5 text-[10px] font-bold tracking-wider text-muted-foreground/60 uppercase truncate"
          >
            {{ $t('nav_section_ops') }}
          </div>
          <div v-else class="my-1.5 mx-3 border-t border-border/40"></div>

          <!-- Dashboard -->
          <NuxtLink 
            v-if="!isTrialExpired" 
            to="/merchant/dashboard" 
            class="flex items-center text-sm font-medium text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-all rounded-r-2xl border-l-4 border-transparent group" 
            :class="isCollapsed ? 'justify-center px-0 py-2.5 mx-2 rounded-xl border-l-0' : 'px-5 py-2.5 gap-3'"
            active-class="!border-primary !bg-primary/10 !text-primary !font-bold"
            :title="isCollapsed ? $t('nav_dashboard') : undefined"
          >
            <LayoutDashboard class="w-4 h-4 shrink-0 transition-transform group-hover:scale-110" />
            <span v-show="!isCollapsed" class="whitespace-nowrap">{{ $t('nav_dashboard') }}</span>
          </NuxtLink>

          <!-- Orders -->
          <NuxtLink 
            v-if="!isTrialExpired" 
            to="/merchant/orders" 
            class="flex items-center text-sm font-medium text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-all rounded-r-2xl border-l-4 border-transparent group" 
            :class="isCollapsed ? 'justify-center px-0 py-2.5 mx-2 rounded-xl border-l-0' : 'px-5 py-2.5 gap-3'"
            active-class="!border-primary !bg-primary/10 !text-primary !font-bold"
            :title="isCollapsed ? $t('nav_orders') : undefined"
          >
            <ClipboardList class="w-4 h-4 shrink-0 transition-transform group-hover:scale-110" />
            <span v-show="!isCollapsed" class="whitespace-nowrap">{{ $t('nav_orders') }}</span>
          </NuxtLink>

          <!-- QR Codes -->
          <NuxtLink 
            v-if="!isTrialExpired" 
            to="/merchant/qr" 
            class="flex items-center text-sm font-medium text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-all rounded-r-2xl border-l-4 border-transparent group" 
            :class="isCollapsed ? 'justify-center px-0 py-2.5 mx-2 rounded-xl border-l-0' : 'px-5 py-2.5 gap-3'"
            active-class="!border-primary !bg-primary/10 !text-primary !font-bold"
            :title="isCollapsed ? $t('nav_qr_codes') : undefined"
          >
            <QrCode class="w-4 h-4 shrink-0 transition-transform group-hover:scale-110" />
            <span v-show="!isCollapsed" class="whitespace-nowrap">{{ $t('nav_qr_codes') }}</span>
          </NuxtLink>
        </div>

        <!-- Group 2: Menu & Items (เมนูอาหาร) -->
        <div class="space-y-0.5">
          <div 
            v-if="!isCollapsed" 
            class="px-5 pb-1.5 text-[10px] font-bold tracking-wider text-muted-foreground/60 uppercase truncate"
          >
            {{ $t('nav_section_menu') }}
          </div>
          <div v-else class="my-1.5 mx-3 border-t border-border/40"></div>

          <!-- Menu Management -->
          <NuxtLink 
            v-if="!isTrialExpired" 
            to="/merchant/menu" 
            class="flex items-center text-sm font-medium text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-all rounded-r-2xl border-l-4 border-transparent group" 
            :class="isCollapsed ? 'justify-center px-0 py-2.5 mx-2 rounded-xl border-l-0' : 'px-5 py-2.5 gap-3'"
            active-class="!border-primary !bg-primary/10 !text-primary !font-bold"
            :title="isCollapsed ? $t('nav_menu_manage') : undefined"
          >
            <Utensils class="w-4 h-4 shrink-0 transition-transform group-hover:scale-110" />
            <span v-show="!isCollapsed" class="whitespace-nowrap">{{ $t('nav_menu_manage') }}</span>
          </NuxtLink>
        </div>

        <!-- Group 3: Analytics & BI (รายงาน & สถิติ) -->
        <div class="space-y-0.5">
          <div 
            v-if="!isCollapsed" 
            class="px-5 pb-1.5 text-[10px] font-bold tracking-wider text-muted-foreground/60 uppercase truncate"
          >
            {{ $t('nav_section_analytics') }}
          </div>
          <div v-else class="my-1.5 mx-3 border-t border-border/40"></div>

          <!-- Sales Analytics -->
          <NuxtLink 
            v-if="!isTrialExpired" 
            to="/merchant/analytics" 
            class="flex items-center text-sm font-medium text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-all rounded-r-2xl border-l-4 border-transparent group" 
            :class="isCollapsed ? 'justify-center px-0 py-2.5 mx-2 rounded-xl border-l-0' : 'px-5 py-2.5 gap-3'"
            active-class="!border-primary !bg-primary/10 !text-primary !font-bold"
            :title="isCollapsed ? $t('nav_analytics') : undefined"
          >
            <BarChart3 class="w-4 h-4 shrink-0 transition-transform group-hover:scale-110" />
            <span v-show="!isCollapsed" class="whitespace-nowrap">{{ $t('nav_analytics') }}</span>
          </NuxtLink>
        </div>

        <!-- Group 4: Settings & Plans (ตั้งค่า & บัญชี) -->
        <div class="space-y-0.5">
          <div 
            v-if="!isCollapsed" 
            class="px-5 pb-1.5 text-[10px] font-bold tracking-wider text-muted-foreground/60 uppercase truncate"
          >
            {{ $t('nav_section_settings') }}
          </div>
          <div v-else class="my-1.5 mx-3 border-t border-border/40"></div>

          <!-- Store Settings -->
          <NuxtLink 
            v-if="!isTrialExpired" 
            to="/merchant/store/settings" 
            class="flex items-center text-sm font-medium text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-all rounded-r-2xl border-l-4 border-transparent group" 
            :class="isCollapsed ? 'justify-center px-0 py-2.5 mx-2 rounded-xl border-l-0' : 'px-5 py-2.5 gap-3'"
            active-class="!border-primary !bg-primary/10 !text-primary !font-bold"
            :title="isCollapsed ? $t('nav_store_settings') : undefined"
          >
            <Store class="w-4 h-4 shrink-0 transition-transform group-hover:scale-110" />
            <span v-show="!isCollapsed" class="whitespace-nowrap">{{ $t('nav_store_settings') }}</span>
          </NuxtLink>

          <!-- Billing & Plans -->
          <NuxtLink 
            to="/merchant/billing" 
            class="flex items-center text-sm font-medium text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-all rounded-r-2xl border-l-4 border-transparent group" 
            :class="isCollapsed ? 'justify-center px-0 py-2.5 mx-2 rounded-xl border-l-0' : 'px-5 py-2.5 gap-3'"
            active-class="!border-primary !bg-primary/10 !text-primary !font-bold"
            :title="isCollapsed ? $t('nav_billing') : undefined"
          >
            <CreditCard class="w-4 h-4 shrink-0 transition-transform group-hover:scale-110" />
            <span v-show="!isCollapsed" class="whitespace-nowrap">{{ $t('nav_billing') }}</span>
          </NuxtLink>

          <!-- Merchant Guide -->
          <NuxtLink 
            to="/merchant/guide" 
            class="flex items-center text-sm font-medium text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-all rounded-r-2xl border-l-4 border-transparent group" 
            :class="isCollapsed ? 'justify-center px-0 py-2.5 mx-2 rounded-xl border-l-0' : 'px-5 py-2.5 gap-3'"
            active-class="!border-primary !bg-primary/10 !text-primary !font-bold"
            :title="isCollapsed ? $t('nav_guide') : undefined"
          >
            <BookOpen class="w-4 h-4 shrink-0 transition-transform group-hover:scale-110" />
            <span v-show="!isCollapsed" class="whitespace-nowrap">{{ $t('nav_guide') }}</span>
          </NuxtLink>
        </div>

        <!-- Group 5: Super Admin (if isAdmin) -->
        <div v-if="isAdmin" class="space-y-0.5 pt-1">
          <div 
            v-if="!isCollapsed" 
            class="px-5 pb-1.5 text-[10px] font-bold tracking-wider text-orange-600/70 uppercase truncate"
          >
            {{ $t('nav_section_admin') }}
          </div>
          <div v-else class="my-1.5 mx-3 border-t border-orange-500/20"></div>

          <NuxtLink 
            to="/admin/stores" 
            class="flex items-center text-sm font-bold text-orange-600 hover:bg-orange-500/10 hover:text-orange-700 transition-all rounded-r-2xl border-l-4 border-transparent group" 
            :class="isCollapsed ? 'justify-center px-0 py-2.5 mx-2 rounded-xl border-l-0' : 'px-5 py-2.5 gap-3'"
            active-class="!border-orange-600 !bg-orange-500/15 !text-orange-700"
            :title="isCollapsed ? $t('nav_admin') : undefined"
          >
            <ShieldCheck class="w-4 h-4 shrink-0 transition-transform group-hover:scale-110" />
            <span v-show="!isCollapsed" class="whitespace-nowrap">{{ $t('nav_admin') }}</span>
          </NuxtLink>
        </div>

      </nav>

      <!-- Sidebar Footer (Version & Release Info) -->
      <div 
        class="border-t border-border bg-muted/10 shrink-0 transition-all duration-300"
        :class="isCollapsed ? 'p-2 text-center' : 'p-4'"
      >
        <div v-if="!isCollapsed" class="flex items-center justify-between text-[11px]">
          <span class="font-bold text-foreground truncate">ChiiMenu</span>
          <span class="px-2 py-0.5 rounded-full bg-primary/10 text-primary font-mono font-bold text-[10px]">v1.1</span>
        </div>
        <span v-else class="px-1.5 py-0.5 rounded-md bg-primary/10 text-primary font-mono font-bold text-[9px] inline-block">
          v1.1
        </span>
      </div>
    </aside>

    <!-- MAIN CONTENT AREA -->
    <div class="flex-1 flex flex-col min-w-0 overflow-hidden">
      
      <!-- Top Header (Desktop & Mobile) -->
      <header class="h-16 flex items-center justify-between border-b bg-card px-4 sm:px-6 shrink-0 z-10">
        <div class="flex items-center gap-2">
          <!-- Mobile Hamburger Toggle Button -->
          <button 
            @click="mobileMenuOpen = true" 
            class="md:hidden text-muted-foreground hover:text-foreground p-2 -ml-2 rounded-xl hover:bg-muted transition-colors cursor-pointer"
            title="Open Menu"
          >
            <Menu class="w-6 h-6" />
          </button>

          <!-- Mobile Brand Logo -->
          <NuxtLink to="/merchant/dashboard" class="md:hidden flex items-center gap-2">
            <img src="/logo-icon.png" alt="ChiiMenu" class="w-7 h-7 rounded-xl object-contain shadow-xs">
            <span class="text-lg font-bold tracking-tight text-foreground">ChiiMenu</span>
          </NuxtLink>
        </div>
        
        <!-- Right Header Items: Language Switcher & Account Menu -->
        <div class="flex items-center gap-3 ml-auto">
          <!-- Language Selector -->
          <select 
            v-model="locale" 
            @change="handleLocaleChange"
            class="bg-transparent border border-border rounded-xl text-xs font-semibold px-2.5 py-1.5 outline-none focus:ring-1 focus:ring-primary text-foreground cursor-pointer"
          >
            <option v-for="l in locales" :key="l.code" :value="l.code">
              {{ l.name }}
            </option>
          </select>

          <!-- User Dropdown Menu -->
          <div class="relative ml-1">
            <button 
              @click="isUserDropdownOpen = !isUserDropdownOpen" 
              class="flex items-center max-w-xs text-xs font-semibold bg-muted/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary px-3 py-1.5 transition-colors hover:bg-muted border cursor-pointer"
            >
              <span class="sr-only">Open user menu</span>
              <span class="text-xs font-semibold text-foreground mr-1">จัดการบัญชี</span>
              <ChevronDown class="w-3.5 h-3.5 text-muted-foreground" />
            </button>
            
            <div v-if="isUserDropdownOpen" @click="isUserDropdownOpen = false" class="fixed inset-0 z-40"></div>
            
            <div v-if="isUserDropdownOpen" class="origin-top-right absolute right-0 mt-2 w-48 rounded-2xl shadow-lg bg-card ring-1 ring-black/5 divide-y divide-border z-50 overflow-hidden border border-border">
              <div class="py-1">
                <NuxtLink to="/merchant/profile" @click="isUserDropdownOpen = false" class="flex items-center gap-2 px-4 py-2.5 text-sm text-foreground hover:bg-muted transition-colors">
                  <User class="w-4 h-4 text-muted-foreground" />
                  <span>โปรไฟล์ส่วนตัว</span>
                </NuxtLink>
              </div>
              <div class="py-1">
                <button @click="logout" class="flex items-center gap-2 w-full text-left px-4 py-2.5 text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors cursor-pointer">
                  <LogOut class="w-4 h-4" />
                  <span>ออกจากระบบ</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <!-- Scrollable Main Content Container -->
      <main class="flex-1 overflow-y-auto bg-muted/20 pb-20 md:pb-8">
        <div class="p-4 sm:p-6 lg:p-8 w-full max-w-[1600px] mx-auto">
          
          <!-- Loading State -->
          <div v-if="loading" class="flex justify-center items-center py-20">
            <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
          
          <!-- Trial Expired Lock Screen -->
          <div v-else-if="isTrialExpired && !isBillingPage" class="max-w-2xl mx-auto bg-card rounded-3xl shadow-lg border-2 overflow-hidden text-center mt-10" :class="!store?.has_used_first_time_promo ? 'border-rose-300' : 'border-red-200'">
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
              <NuxtLink to="/merchant/billing" class="inline-flex items-center justify-center gap-2 w-full py-4 bg-primary text-primary-foreground font-bold text-lg rounded-2xl shadow-md hover:bg-primary/90 transition-all cursor-pointer">
                <span>เลือกแพ็กเกจและต่ออายุ</span>
                <span class="text-xl">→</span>
              </NuxtLink>
            </div>
          </div>

          <!-- Normal Page Content Slot -->
          <slot v-else />

        </div>
      </main>

    </div>

    <!-- MOBILE DRAWER (Full Slide-Out Menu for Phones) -->
    <div 
      v-if="mobileMenuOpen" 
      @click="mobileMenuOpen = false" 
      class="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-xs transition-opacity"
    ></div>

    <Transition 
      enter-active-class="transition ease-in-out duration-300 transform" 
      enter-from-class="-translate-x-full" 
      enter-to-class="translate-x-0" 
      leave-active-class="transition ease-in-out duration-300 transform" 
      leave-from-class="translate-x-0" 
      leave-to-class="-translate-x-full"
    >
      <div v-if="mobileMenuOpen && !isTrialExpired" class="fixed inset-y-0 left-0 w-[280px] bg-card shadow-2xl z-50 md:hidden flex flex-col h-full overflow-y-auto select-none">
        
        <!-- Drawer Header -->
        <div class="p-5 border-b border-border flex items-center justify-between bg-muted/30">
          <div class="flex items-center gap-2.5">
            <img src="/logo-icon.png" alt="ChiiMenu" class="w-7 h-7 rounded-xl object-contain shadow-xs">
            <span class="text-xl font-black tracking-tight text-foreground">ChiiMenu</span>
          </div>
          <button @click="mobileMenuOpen = false" class="text-muted-foreground hover:text-foreground bg-muted p-1.5 rounded-full transition-colors cursor-pointer">
            <X class="w-5 h-5" />
          </button>
        </div>
        
        <!-- Drawer Menu Groups -->
        <div class="py-3 space-y-4 flex-1">
          
          <!-- Mobile Group 1: Operations -->
          <div class="space-y-0.5">
            <div class="px-6 pb-1.5 text-[10px] font-bold tracking-wider text-muted-foreground/60 uppercase">
              {{ $t('nav_section_ops') }}
            </div>

            <NuxtLink 
              to="/merchant/dashboard" 
              @click="mobileMenuOpen = false" 
              class="flex items-center gap-3 px-6 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-all rounded-r-2xl border-l-4 border-transparent" 
              active-class="!border-primary !bg-primary/10 !text-primary !font-bold"
            >
              <LayoutDashboard class="w-4 h-4 shrink-0" />
              <span>{{ $t('nav_dashboard') }}</span>
            </NuxtLink>

            <NuxtLink 
              to="/merchant/orders" 
              @click="mobileMenuOpen = false" 
              class="flex items-center gap-3 px-6 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-all rounded-r-2xl border-l-4 border-transparent" 
              active-class="!border-primary !bg-primary/10 !text-primary !font-bold"
            >
              <ClipboardList class="w-4 h-4 shrink-0" />
              <span>{{ $t('nav_orders') }}</span>
            </NuxtLink>

            <NuxtLink 
              to="/merchant/qr" 
              @click="mobileMenuOpen = false" 
              class="flex items-center gap-3 px-6 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-all rounded-r-2xl border-l-4 border-transparent" 
              active-class="!border-primary !bg-primary/10 !text-primary !font-bold"
            >
              <QrCode class="w-4 h-4 shrink-0" />
              <span>{{ $t('nav_qr_codes') }}</span>
            </NuxtLink>
          </div>

          <!-- Mobile Group 2: Menu -->
          <div class="space-y-0.5">
            <div class="px-6 pb-1.5 text-[10px] font-bold tracking-wider text-muted-foreground/60 uppercase">
              {{ $t('nav_section_menu') }}
            </div>

            <NuxtLink 
              to="/merchant/menu" 
              @click="mobileMenuOpen = false" 
              class="flex items-center gap-3 px-6 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-all rounded-r-2xl border-l-4 border-transparent" 
              active-class="!border-primary !bg-primary/10 !text-primary !font-bold"
            >
              <Utensils class="w-4 h-4 shrink-0" />
              <span>{{ $t('nav_menu_manage') }}</span>
            </NuxtLink>
          </div>

          <!-- Mobile Group 3: Analytics -->
          <div class="space-y-0.5">
            <div class="px-6 pb-1.5 text-[10px] font-bold tracking-wider text-muted-foreground/60 uppercase">
              {{ $t('nav_section_analytics') }}
            </div>

            <NuxtLink 
              to="/merchant/analytics" 
              @click="mobileMenuOpen = false" 
              class="flex items-center gap-3 px-6 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-all rounded-r-2xl border-l-4 border-transparent" 
              active-class="!border-primary !bg-primary/10 !text-primary !font-bold"
            >
              <BarChart3 class="w-4 h-4 shrink-0" />
              <span>{{ $t('nav_analytics') }}</span>
            </NuxtLink>
          </div>

          <!-- Mobile Group 4: Settings -->
          <div class="space-y-0.5">
            <div class="px-6 pb-1.5 text-[10px] font-bold tracking-wider text-muted-foreground/60 uppercase">
              {{ $t('nav_section_settings') }}
            </div>

            <NuxtLink 
              to="/merchant/store/settings" 
              @click="mobileMenuOpen = false" 
              class="flex items-center gap-3 px-6 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-all rounded-r-2xl border-l-4 border-transparent" 
              active-class="!border-primary !bg-primary/10 !text-primary !font-bold"
            >
              <Store class="w-4 h-4 shrink-0" />
              <span>{{ $t('nav_store_settings') }}</span>
            </NuxtLink>

            <NuxtLink 
              to="/merchant/billing" 
              @click="mobileMenuOpen = false" 
              class="flex items-center gap-3 px-6 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-all rounded-r-2xl border-l-4 border-transparent" 
              active-class="!border-primary !bg-primary/10 !text-primary !font-bold"
            >
              <CreditCard class="w-4 h-4 shrink-0" />
              <span>{{ $t('nav_billing') }}</span>
            </NuxtLink>

            <NuxtLink 
              to="/merchant/guide" 
              @click="mobileMenuOpen = false" 
              class="flex items-center gap-3 px-6 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-all rounded-r-2xl border-l-4 border-transparent" 
              active-class="!border-primary !bg-primary/10 !text-primary !font-bold"
            >
              <BookOpen class="w-4 h-4 shrink-0" />
              <span>{{ $t('nav_guide') }}</span>
            </NuxtLink>
          </div>

          <!-- Mobile Group 5: Super Admin -->
          <div v-if="isAdmin" class="space-y-0.5 pt-1">
            <div class="px-6 pb-1.5 text-[10px] font-bold tracking-wider text-orange-600/70 uppercase">
              {{ $t('nav_section_admin') }}
            </div>

            <NuxtLink 
              to="/admin/stores" 
              @click="mobileMenuOpen = false" 
              class="flex items-center gap-3 px-6 py-2.5 text-sm font-bold text-orange-600 hover:bg-orange-500/10 hover:text-orange-700 transition-all rounded-r-2xl border-l-4 border-transparent" 
              active-class="!border-orange-600 !bg-orange-500/15 !text-orange-700"
            >
              <ShieldCheck class="w-4 h-4 shrink-0" />
              <span>{{ $t('nav_admin') }}</span>
            </NuxtLink>
          </div>

        </div>
        
        <!-- Drawer Footer -->
        <div class="p-5 border-t border-border bg-muted/10 space-y-3">
           <button @click="logout" class="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-muted text-foreground rounded-xl font-medium hover:bg-muted/80 transition-colors border shadow-xs cursor-pointer">
             <LogOut class="w-4 h-4 text-destructive" />
             <span>{{ $t('nav_logout') }}</span>
           </button>
           <div class="flex items-center justify-between text-[11px] pt-1">
             <span class="font-bold text-foreground">ChiiMenu Platform</span>
             <span class="px-2 py-0.5 rounded-full bg-primary/10 text-primary font-mono font-bold text-[10px]">v1.1.0</span>
           </div>
        </div>
      </div>
    </Transition>

    <!-- MOBILE BOTTOM NAVIGATION BAR (Quick Access for Mobile Phone Operations) -->
    <nav 
      v-if="!isTrialExpired"
      class="md:hidden fixed bottom-0 inset-x-0 bg-card/95 backdrop-blur-md border-t border-border z-30 flex items-center justify-around px-2 py-2 shadow-lg select-none"
    >
      <NuxtLink 
        to="/merchant/dashboard" 
        class="flex flex-col items-center justify-center gap-1 text-[10px] font-medium text-muted-foreground hover:text-foreground py-1 px-2.5 rounded-xl transition-colors"
        active-class="!text-primary !font-bold bg-primary/10"
      >
        <LayoutDashboard class="w-5 h-5" />
        <span>{{ $t('nav_dashboard') }}</span>
      </NuxtLink>

      <NuxtLink 
        to="/merchant/orders" 
        class="flex flex-col items-center justify-center gap-1 text-[10px] font-medium text-muted-foreground hover:text-foreground py-1 px-2.5 rounded-xl transition-colors"
        active-class="!text-primary !font-bold bg-primary/10"
      >
        <ClipboardList class="w-5 h-5" />
        <span>{{ $t('nav_orders') }}</span>
      </NuxtLink>

      <NuxtLink 
        to="/merchant/menu" 
        class="flex flex-col items-center justify-center gap-1 text-[10px] font-medium text-muted-foreground hover:text-foreground py-1 px-2.5 rounded-xl transition-colors"
        active-class="!text-primary !font-bold bg-primary/10"
      >
        <Utensils class="w-5 h-5" />
        <span>{{ $t('nav_menu_manage') }}</span>
      </NuxtLink>

      <NuxtLink 
        to="/merchant/analytics" 
        class="flex flex-col items-center justify-center gap-1 text-[10px] font-medium text-muted-foreground hover:text-foreground py-1 px-2.5 rounded-xl transition-colors"
        active-class="!text-primary !font-bold bg-primary/10"
      >
        <BarChart3 class="w-5 h-5" />
        <span>{{ $t('nav_analytics') }}</span>
      </NuxtLink>

      <button 
        type="button"
        @click="mobileMenuOpen = true" 
        class="flex flex-col items-center justify-center gap-1 text-[10px] font-medium text-muted-foreground hover:text-foreground py-1 px-2.5 rounded-xl transition-colors cursor-pointer"
      >
        <MoreHorizontal class="w-5 h-5" />
        <span>เมนูอื่น</span>
      </button>
    </nav>

  </div>
</template>
