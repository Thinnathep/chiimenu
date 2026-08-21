<script setup lang="ts">
import { onMounted } from 'vue'

onMounted(() => {
  // Use Light mode as standard default for tourist menu, responsive to device preferences if configured
  if (!document.documentElement.classList.contains('dark') && !document.documentElement.classList.contains('light')) {
    document.documentElement.classList.remove('dark')
  }
})
</script>

<template>
  <!-- Main layout container: Responsive for Mobile, iPad / Tablet, and PC / Desktop -->
  <div class="min-h-screen bg-slate-100/80 dark:bg-neutral-950 transition-colors duration-300 font-sans selection:bg-primary/30 text-foreground antialiased">
    <!-- Responsive Content Container: Adapts seamlessly to iPhone (430px), iPad (768-1024px), and PC (1280px+) -->
    <main class="w-full max-w-lg md:max-w-3xl lg:max-w-4xl xl:max-w-5xl mx-auto min-h-screen sm:border-x sm:border-border/40 bg-background shadow-2xl transition-colors duration-300 relative">
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

/* Hide scrollbars for category horizontal tabs while maintaining smooth scrolling */
.hide-scrollbar::-webkit-scrollbar {
  display: none;
}
.hide-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}

/* Glassmorphic utilities */
.glass-effect {
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
}
.dark .glass-effect {
  background: rgba(18, 18, 18, 0.85);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
}
</style>
