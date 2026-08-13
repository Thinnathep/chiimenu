<script setup lang="ts">
import { useAlert } from '~/composables/useAlert'
import { AlertTriangle, XCircle, CheckCircle2, Info } from 'lucide-vue-next'

const { alertState, close } = useAlert()
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="alertState.isOpen" class="fixed inset-0 z-[100] flex items-center justify-center px-4">
        <!-- Backdrop -->
        <div class="absolute inset-0 bg-background/80 backdrop-blur-sm" @click="close(false)"></div>
        
        <!-- Modal Content -->
        <Transition name="zoom">
          <div v-if="alertState.options" class="relative z-10 w-full max-w-sm sm:max-w-md overflow-hidden rounded-2xl bg-card border border-border shadow-2xl p-6 sm:p-8 animate-in zoom-in-95 duration-200">
            
            <div class="flex flex-col items-center text-center">
              <!-- Icon -->
              <div v-if="alertState.options.icon" class="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full shadow-inner" :class="{
                'bg-yellow-100/10 text-yellow-500': alertState.options.icon === 'warning',
                'bg-red-100/10 text-red-500': alertState.options.icon === 'error',
                'bg-green-100/10 text-green-500': alertState.options.icon === 'success',
                'bg-blue-100/10 text-blue-500': alertState.options.icon === 'info',
              }">
                <AlertTriangle v-if="alertState.options.icon === 'warning'" class="h-8 w-8" />
                <XCircle v-else-if="alertState.options.icon === 'error'" class="h-8 w-8" />
                <CheckCircle2 v-else-if="alertState.options.icon === 'success'" class="h-8 w-8" />
                <Info v-else class="h-8 w-8" />
              </div>

              <!-- Title & Text -->
              <h3 class="mb-2 text-xl sm:text-2xl font-bold tracking-tight text-foreground">{{ alertState.options.title }}</h3>
              <p v-if="alertState.options.text" class="text-sm sm:text-base text-muted-foreground leading-relaxed">{{ alertState.options.text }}</p>
            </div>

            <!-- Actions -->
            <div class="mt-8 flex flex-col-reverse sm:flex-row justify-center gap-3 w-full">
              <button 
                v-if="alertState.options.showCancelButton" 
                @click="close(false)" 
                class="flex-1 rounded-xl border border-input bg-background px-4 py-3 text-sm font-semibold text-foreground shadow-sm hover:bg-muted transition-colors"
              >
                {{ alertState.options.cancelButtonText }}
              </button>
              
              <button 
                v-if="alertState.options.showConfirmButton !== false"
                @click="close(true)" 
                class="flex-1 rounded-xl border border-transparent px-4 py-3 text-sm font-semibold text-primary-foreground shadow-lg transition-colors"
                :class="[
                  alertState.options.icon === 'warning' || alertState.options.icon === 'error' 
                    ? 'bg-destructive hover:bg-destructive/90 shadow-destructive/20' 
                    : 'bg-primary hover:bg-primary/90 shadow-primary/20'
                ]"
              >
                {{ alertState.options.confirmButtonText }}
              </button>
            </div>
            
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.zoom-enter-active,
.zoom-leave-active {
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

.zoom-enter-from,
.zoom-leave-to {
  opacity: 0;
  transform: scale(0.95);
}
</style>
