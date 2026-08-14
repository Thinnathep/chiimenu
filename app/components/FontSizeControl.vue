<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { RotateCcw, Type } from 'lucide-vue-next'

const { 
  levels, 
  currentLevel, 
  currentScaleInfo, 
  isDefault, 
  canIncrease, 
  canDecrease, 
  initFontSize, 
  setLevel, 
  increase, 
  decrease, 
  reset 
} = useFontSize()

const isOpen = ref(false)

onMounted(() => {
  initFontSize()
})
</script>

<template>
  <div class="relative inline-flex items-center">
    <!-- Main Control Capsule -->
    <div class="inline-flex items-center bg-muted/60 hover:bg-muted border rounded-xl p-0.5 transition-colors shadow-2xs">
      
      <!-- Decrease Button (A-) -->
      <button 
        type="button" 
        @click="decrease" 
        :disabled="!canDecrease"
        class="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-background text-xs font-bold text-foreground disabled:opacity-30 disabled:hover:bg-transparent transition-all"
        title="ลดขนาดตัวอักษร (A-)"
      >
        <span class="text-[11px]">A-</span>
      </button>

      <!-- Current Size Indicator / Dropdown Trigger -->
      <button 
        type="button" 
        @click="isOpen = !isOpen"
        class="px-2 h-7 flex items-center gap-1 rounded-lg hover:bg-background text-[11px] font-bold text-foreground transition-all"
        title="คลิกเพื่อเลือกขนาดตัวอักษร"
      >
        <Type class="w-3 h-3 text-primary" />
        <span>{{ currentScaleInfo?.percentage || '100%' }}</span>
      </button>

      <!-- Increase Button (A+) -->
      <button 
        type="button" 
        @click="increase" 
        :disabled="!canIncrease"
        class="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-background text-xs font-bold text-foreground disabled:opacity-30 disabled:hover:bg-transparent transition-all"
        title="เพิ่มขนาดตัวอักษร (A+)"
      >
        <span class="text-[13px] font-bold">A+</span>
      </button>

      <!-- Reset Button (Visible when not default) -->
      <button 
        v-if="!isDefault" 
        type="button" 
        @click="reset"
        class="w-6 h-7 flex items-center justify-center rounded-lg hover:bg-rose-50 text-rose-600 transition-colors ml-0.5"
        title="รีเซ็ตขนาดตัวอักษรกลับเป็นค่าเริ่มต้น (100%)"
      >
        <RotateCcw class="w-3 h-3" />
      </button>
    </div>

    <!-- Dropdown Modal / Popover -->
    <div v-if="isOpen" @click="isOpen = false" class="fixed inset-0 z-40"></div>
    
    <div 
      v-if="isOpen" 
      class="origin-top-right absolute right-0 top-full mt-2 w-48 rounded-2xl shadow-xl bg-card border divide-y z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150 p-1 space-y-1"
    >
      <div class="px-3 py-2">
        <p class="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">ขนาดตัวอักษรทั้งเว็บ</p>
      </div>

      <div class="py-1 space-y-0.5">
        <button 
          v-for="lvl in levels" 
          :key="lvl.key"
          type="button"
          @click="setLevel(lvl.key); isOpen = false"
          class="w-full px-3 py-2 rounded-xl text-left text-xs font-bold flex items-center justify-between transition-colors"
          :class="currentLevel === lvl.key ? 'bg-primary/10 text-primary font-black' : 'hover:bg-muted text-foreground'"
        >
          <span>{{ lvl.label }}</span>
          <span v-if="currentLevel === lvl.key" class="text-primary text-xs">✓</span>
        </button>
      </div>

      <div class="p-1 pt-1.5" v-if="!isDefault">
        <button 
          type="button" 
          @click="reset(); isOpen = false"
          class="w-full px-3 py-1.5 rounded-xl text-left text-[11px] font-bold text-rose-600 hover:bg-rose-50 flex items-center gap-1.5 transition-colors"
        >
          <RotateCcw class="w-3 h-3" />
          <span>รีเซ็ตค่าเริ่มต้น (100%)</span>
        </button>
      </div>
    </div>
  </div>
</template>
