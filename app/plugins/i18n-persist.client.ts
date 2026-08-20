export default defineNuxtPlugin((nuxtApp) => {
  const i18n = (nuxtApp as any).$i18n
  if (!i18n) return

  // 1. Initial hydration: Read saved language from localStorage
  try {
    const savedLocale = localStorage.getItem('chiimenu_locale')
    if (savedLocale && ['th', 'en', 'zh'].includes(savedLocale)) {
      if (i18n.locale.value !== savedLocale) {
        if (typeof i18n.setLocale === 'function') {
          i18n.setLocale(savedLocale)
        } else {
          i18n.locale.value = savedLocale
        }
      }
    }
  } catch (err) {
    console.warn('[i18n-persist] Failed to read locale from localStorage:', err)
  }

  // 2. Real-time sync: Whenever locale changes, persist to localStorage and cookie
  watch(
    () => i18n.locale.value,
    (newLocale) => {
      if (newLocale && ['th', 'en', 'zh'].includes(newLocale)) {
        try {
          localStorage.setItem('chiimenu_locale', newLocale)
          const cookie = useCookie('i18n_redirected', { maxAge: 60 * 60 * 24 * 365 })
          cookie.value = newLocale
        } catch (e) {
          // ignore storage error
        }
      }
    },
    { immediate: true }
  )
})
