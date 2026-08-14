import { ref, computed } from 'vue'

export type FontSizeLevel = 'sm' | 'md' | 'lg' | 'xl'

const FONT_LEVELS: { key: FontSizeLevel; label: string; scale: number; percentage: string }[] = [
  { key: 'sm', label: 'กะทัดรัด (90%)', scale: 0.90, percentage: '90%' },
  { key: 'md', label: 'ปกติ (100%)', scale: 1.00, percentage: '100%' },
  { key: 'lg', label: 'ใหญ่ (115%)', scale: 1.15, percentage: '115%' },
  { key: 'xl', label: 'ใหญ่พิเศษ (130%)', scale: 1.30, percentage: '130%' }
]

const currentLevel = ref<FontSizeLevel>('md')
const isInitialized = ref(false)

export const useFontSize = () => {
  const initFontSize = () => {
    if (isInitialized.value || typeof window === 'undefined') return
    
    const saved = localStorage.getItem('chiimenu_font_level') as FontSizeLevel | null
    if (saved && FONT_LEVELS.some(f => f.key === saved)) {
      currentLevel.value = saved
    } else {
      currentLevel.value = 'md'
    }
    
    applyScale(currentLevel.value)
    isInitialized.value = true
  }

  const applyScale = (level: FontSizeLevel) => {
    if (typeof document === 'undefined') return
    const match = FONT_LEVELS.find(f => f.key === level) || FONT_LEVELS[1]!
    
    document.documentElement.style.setProperty('--font-scale', match.scale.toString())
    document.documentElement.setAttribute('data-font-size', level)
    
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('chiimenu_font_level', level)
    }
  }

  const setLevel = (level: FontSizeLevel) => {
    currentLevel.value = level
    applyScale(level)
  }

  const increase = () => {
    const currentIndex = FONT_LEVELS.findIndex(f => f.key === currentLevel.value)
    if (currentIndex >= 0 && currentIndex < FONT_LEVELS.length - 1) {
      const next = FONT_LEVELS[currentIndex + 1]?.key
      if (next) setLevel(next)
    }
  }

  const decrease = () => {
    const currentIndex = FONT_LEVELS.findIndex(f => f.key === currentLevel.value)
    if (currentIndex > 0) {
      const prev = FONT_LEVELS[currentIndex - 1]?.key
      if (prev) setLevel(prev)
    }
  }

  const reset = () => {
    setLevel('md')
  }

  const currentScaleInfo = computed(() => {
    return FONT_LEVELS.find(f => f.key === currentLevel.value) || FONT_LEVELS[1]
  })

  const isDefault = computed(() => currentLevel.value === 'md')
  const canIncrease = computed(() => {
    const idx = FONT_LEVELS.findIndex(f => f.key === currentLevel.value)
    return idx < FONT_LEVELS.length - 1
  })
  const canDecrease = computed(() => {
    const idx = FONT_LEVELS.findIndex(f => f.key === currentLevel.value)
    return idx > 0
  })

  return {
    levels: FONT_LEVELS,
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
  }
}
