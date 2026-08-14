<script setup lang="ts">
import { computed } from 'vue'
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-vue-next'
import { useToast, type ToastPosition, type ToastItem } from '~/composables/useToast'

const { toasts, dismiss } = useToast()

const positions: ToastPosition[] = ['top-right', 'top-left', 'top-center', 'bottom-right', 'bottom-left', 'bottom-center']

const getToastsByPosition = (pos: ToastPosition) => {
  return toasts.value.filter(t => (t.position || 'top-right') === pos)
}

const getPositionClasses = (pos: ToastPosition) => {
  switch (pos) {
    case 'top-right':
      return 'top-4 right-4 items-end'
    case 'top-left':
      return 'top-4 left-4 items-start'
    case 'top-center':
      return 'top-4 left-1/2 -translate-x-1/2 items-center'
    case 'bottom-right':
      return 'bottom-4 right-4 items-end'
    case 'bottom-left':
      return 'bottom-4 left-4 items-start'
    case 'bottom-center':
      return 'bottom-4 left-1/2 -translate-x-1/2 items-center'
    default:
      return 'top-4 right-4 items-end'
  }
}
</script>

<template>
  <Teleport to="body">
    <div 
      v-for="pos in positions" 
      :key="pos"
      class="fixed z-[120] pointer-events-none flex flex-col gap-2.5 max-w-sm sm:max-w-md w-full px-4"
      :class="getPositionClasses(pos)"
    >
      <TransitionGroup
        enter-active-class="transition-all duration-300 ease-out"
        enter-from-class="opacity-0 translate-y-2 scale-95"
        enter-to-class="opacity-100 translate-y-0 scale-100"
        leave-active-class="transition-all duration-200 ease-in"
        leave-from-class="opacity-100 translate-y-0 scale-100"
        leave-to-class="opacity-0 translate-y-2 scale-95"
      >
        <div 
          v-for="toast in getToastsByPosition(pos)" 
          :key="toast.id"
          class="pointer-events-auto w-full bg-card/95 backdrop-blur-md border rounded-2xl shadow-xl p-4 flex items-start gap-3 relative overflow-hidden transition-all duration-200 hover:shadow-2xl"
          :class="{
            'border-emerald-500/30 bg-emerald-50/20 dark:bg-emerald-950/20': toast.type === 'success',
            'border-rose-500/30 bg-rose-50/20 dark:bg-rose-950/20': toast.type === 'error',
            'border-amber-500/30 bg-amber-50/20 dark:bg-amber-950/20': toast.type === 'warning',
            'border-blue-500/30 bg-blue-50/20 dark:bg-blue-950/20': toast.type === 'info',
          }"
        >
          <!-- Accent Left Bar -->
          <div 
            class="absolute left-0 top-0 bottom-0 w-1.5"
            :class="{
              'bg-emerald-500': toast.type === 'success',
              'bg-rose-500': toast.type === 'error',
              'bg-amber-500': toast.type === 'warning',
              'bg-blue-500': toast.type === 'info',
            }"
          ></div>

          <!-- Icon -->
          <div class="shrink-0 mt-0.5 ml-1">
            <CheckCircle2 v-if="toast.type === 'success'" class="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <AlertCircle v-else-if="toast.type === 'error'" class="w-5 h-5 text-rose-600 dark:text-rose-400" />
            <AlertTriangle v-else-if="toast.type === 'warning'" class="w-5 h-5 text-amber-600 dark:text-amber-400" />
            <Info v-else class="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>

          <!-- Content -->
          <div class="flex-1 min-w-0 pr-2">
            <h4 v-if="toast.title" class="text-xs font-bold text-foreground mb-0.5 leading-snug">
              {{ toast.title }}
            </h4>
            <p class="text-xs font-medium text-muted-foreground leading-relaxed">
              {{ toast.message }}
            </p>
          </div>

          <!-- Close Button -->
          <button 
            type="button" 
            @click="dismiss(toast.id)"
            class="shrink-0 p-1 rounded-lg hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors -mr-1 -mt-1"
            title="ปิดการแจ้งเตือน"
          >
            <X class="w-3.5 h-3.5" />
          </button>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>
