export default defineNuxtPlugin((nuxtApp) => {
  // 1. Suppress Vue WarnHandler for <Suspense> and [intlify]
  const prevWarnHandler = nuxtApp.vueApp.config.warnHandler
  nuxtApp.vueApp.config.warnHandler = (msg, instance, trace) => {
    if (typeof msg === 'string') {
      if (
        msg.includes('<Suspense> is an experimental feature') ||
        msg.includes('[intlify]') ||
        msg.includes('Not found')
      ) {
        return
      }
    }
    if (prevWarnHandler) {
      prevWarnHandler(msg, instance, trace)
    } else {
      console.warn(msg, trace)
    }
  }

  // 2. Suppress console.warn for [intlify] and <Suspense> in browser
  if (typeof window !== 'undefined') {
    const originalConsoleWarn = console.warn
    console.warn = (...args: any[]) => {
      const firstArg = args[0]
      if (typeof firstArg === 'string') {
        if (
          firstArg.includes('<Suspense> is an experimental feature') ||
          firstArg.includes('[intlify]') ||
          firstArg.includes("Not found '")
        ) {
          return
        }
      }
      originalConsoleWarn.apply(console, args)
    }
  }

  // 3. Configure i18n instance options directly
  const i18n = (nuxtApp as any).$i18n
  if (i18n) {
    try {
      if (i18n.global) {
        i18n.global.missingWarn = false
        i18n.global.fallbackWarn = false
      }
      i18n.missingWarn = false
      i18n.fallbackWarn = false
    } catch (e) {
      // ignore
    }
  }
})
