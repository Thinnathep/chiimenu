<script setup lang="ts">
useHead({
  link: [
    { rel: 'icon', type: 'image/png', href: '/favicon.png?v=2' },
    { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico?v=2' },
    { rel: 'shortcut icon', href: '/favicon.ico?v=2' },
    { rel: 'apple-touch-icon', sizes: '180x180', href: '/apple-touch-icon.png?v=2' }
  ]
})
</script>

<template>
  <div class="min-h-screen bg-background text-foreground font-sans">
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
    <ClientOnly>
      <GlobalAlert />
      <ToastContainer />
    </ClientOnly>
  </div>
</template>
