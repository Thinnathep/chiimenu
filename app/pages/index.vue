<script setup lang="ts">
const user = useSupabaseUser()
const { auth } = useSupabaseClient()

const logout = async () => {
  await auth.signOut()
}
</script>

<template>
  <div class="flex flex-col items-center justify-center min-h-screen p-4 text-center">
    <h1 class="text-4xl font-bold text-primary mb-4">🥢 ChiiMenu MVP</h1>
    <p class="text-xl text-muted-foreground mb-8">Tourist-Ready Merchant Platform</p>
    
    <div v-if="user" class="p-6 bg-card rounded-xl border shadow-sm max-w-md w-full">
      <p class="mb-4">Logged in as: <strong>{{ user.email }}</strong></p>
      <button @click="logout" class="px-4 py-2 bg-destructive text-destructive-foreground rounded-md hover:bg-destructive/90 transition-colors">
        Logout
      </button>
    </div>
    
    <div v-else class="flex gap-4">
      <NuxtLink to="/login" class="px-6 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors">
        Merchant Login
      </NuxtLink>
      <NuxtLink to="/register" class="px-6 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/90 transition-colors">
        Register Store
      </NuxtLink>
    </div>
  </div>
</template>
