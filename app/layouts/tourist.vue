<script setup lang="ts">
import { ref, onMounted } from 'vue'

const { locale, locales, setLocale } = useI18n()

onMounted(() => {
  // ใช้งาน Light Mode เป็นค่าเริ่มต้น
  document.documentElement.classList.remove('dark')
})
</script>

<template>
  <!-- Main layout container: Dark mode support, Lanna Premium Vibe -->
  <div class="min-h-screen bg-neutral-50 dark:bg-neutral-950 transition-colors duration-300 font-sans selection:bg-primary/30">
    
    <!-- Top Global Nav (Transparent / Glassmorphism) -->
    <header class="fixed top-0 w-full z-50 bg-background/80 dark:bg-background/60 backdrop-blur-md border-b border-border/40 shadow-sm transition-colors duration-300">
      <div class="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
        
        <!-- Logo Area -->
        <div class="flex items-center gap-2">
          <div class="text-primary font-bold text-lg tracking-tighter">
            <span class="text-rose-600 dark:text-rose-400">Chii</span>Menu
          </div>
        </div>

        <!-- Language Switcher -->
        <div class="flex items-center gap-2">
          <select 
            v-model="locale" 
            @change="setLocale(($event.target as HTMLSelectElement).value as any)"
            class="bg-transparent border border-border rounded-xl text-xs font-semibold px-2 py-1 outline-none focus:ring-1 focus:ring-primary text-foreground"
          >
            <option v-for="l in locales" :key="l.code" :value="l.code">
              {{ l.name }}
            </option>
          </select>
        </div>
        
      </div>
    </header>

    <!-- Page Content Slot: Responsive container for Mobile, iPad, and PC -->
    <main class="max-w-4xl mx-auto min-h-screen pt-14 pb-24 shadow-xl sm:border-x border-border/40 bg-background dark:bg-[#111] transition-colors duration-300">
      <slot />
    </main>

  </div>
</template>

<style>
/* Smooth font rendering */
body {
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* Hide scrollbar for category tabs but allow scrolling */
.hide-scrollbar::-webkit-scrollbar {
  display: none;
}
.hide-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
</style>
