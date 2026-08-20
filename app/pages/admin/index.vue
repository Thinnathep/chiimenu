<script setup lang="ts">
definePageMeta({
  middleware: ['auth', 'admin']
})

navigateTo('/admin/stores', { replace: true })
</script>

<template>
  <div class="flex items-center justify-center min-h-screen">
    <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
  </div>
</template>
