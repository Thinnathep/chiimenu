import { ref, computed } from 'vue'

export type ThemeMode = 'dark' | 'light'

const currentTheme = ref<ThemeMode>('dark')
const isThemeInitialized = ref(false)

export const useTheme = () => {
  const initTheme = () => {
    if (typeof window === 'undefined') return
    if (isThemeInitialized.value) return

    const saved = localStorage.getItem('chiimenu_theme') as ThemeMode | null
    if (saved === 'dark' || saved === 'light') {
      currentTheme.value = saved
    } else {
      // Default to dark mode for admin
      currentTheme.value = 'dark'
    }

    applyTheme(currentTheme.value)
    isThemeInitialized.value = true
  }

  const applyTheme = (theme: ThemeMode) => {
    if (typeof document === 'undefined') return
    const root = document.documentElement

    if (theme === 'dark') {
      root.classList.add('dark')
      root.classList.remove('light')
      root.style.colorScheme = 'dark'
    } else {
      root.classList.remove('dark')
      root.classList.add('light')
      root.style.colorScheme = 'light'
    }

    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('chiimenu_theme', theme)
    }
  }

  const toggleTheme = () => {
    const nextTheme: ThemeMode = currentTheme.value === 'dark' ? 'light' : 'dark'
    currentTheme.value = nextTheme
    applyTheme(nextTheme)
  }

  const setTheme = (theme: ThemeMode) => {
    currentTheme.value = theme
    applyTheme(theme)
  }

  const isDark = computed(() => currentTheme.value === 'dark')

  return {
    currentTheme,
    isDark,
    initTheme,
    toggleTheme,
    setTheme
  }
}
