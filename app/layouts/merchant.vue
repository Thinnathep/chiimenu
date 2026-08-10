<script setup lang="ts">
const user = useSupabaseUser()
const { auth } = useSupabaseClient()
const router = useRouter()

const { locale, locales, setLocale } = useI18n()

const logout = async () => {
  await auth.signOut()
  router.push('/login')
}
</script>

<template>
  <div class="min-h-screen bg-muted/20">
    <nav class="bg-card border-b sticky top-0 z-10">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between h-16">
          <div class="flex">
            <div class="flex-shrink-0 flex items-center">
              <NuxtLink to="/merchant/dashboard" class="text-xl font-bold text-primary">🥢 ChiiMenu</NuxtLink>
            </div>
            <div class="hidden sm:ml-6 sm:flex sm:space-x-8">
              <NuxtLink to="/merchant/dashboard" class="border-transparent text-muted-foreground hover:border-border hover:text-foreground inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium" active-class="border-primary text-foreground">
                {{ $t('nav_dashboard') }}
              </NuxtLink>
              <NuxtLink to="/merchant/store/settings" class="border-transparent text-muted-foreground hover:border-border hover:text-foreground inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium" active-class="border-primary text-foreground">
                {{ $t('nav_store_settings') }}
              </NuxtLink>
              <NuxtLink to="/merchant/menu" class="border-transparent text-muted-foreground hover:border-border hover:text-foreground inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium" active-class="border-primary text-foreground">
                {{ $t('nav_menu_manage') }}
              </NuxtLink>
              <NuxtLink to="/merchant/qr" class="border-transparent text-muted-foreground hover:border-border hover:text-foreground inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium" active-class="border-primary text-foreground">
                {{ $t('nav_qr_codes') }}
              </NuxtLink>
            </div>
          </div>
          <div class="flex items-center gap-4">
            <select 
              v-model="locale" 
              @change="setLocale($event.target.value)"
              class="bg-transparent border border-border rounded-md text-sm px-2 py-1 outline-none focus:ring-1 focus:ring-primary text-foreground"
            >
              <option v-for="l in locales" :key="l.code" :value="l.code">
                {{ l.name }}
              </option>
            </select>
            <div class="flex-shrink-0">
              <button @click="logout" class="text-sm font-medium text-muted-foreground hover:text-foreground">
                {{ $t('nav_logout') }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </nav>

    <div class="py-10">
      <main>
        <div class="max-w-7xl mx-auto sm:px-6 lg:px-8">
          <slot />
        </div>
      </main>
    </div>
  </div>
</template>
