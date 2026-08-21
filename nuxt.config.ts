// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: false }, // ปิด DevTools ไว้เพื่อลดเวลา Startup (เร็วขึ้น ~5 วินาที)
  css: ['~/assets/css/tailwind.css'],
  app: {
    pageTransition: { name: 'page', mode: 'out-in' },
    layoutTransition: { name: 'layout', mode: 'out-in' },
    head: {
      title: 'ChiiMenu - ระบบเมนูอาหาร 3 ภาษา และสั่งอาหารออนไลน์',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover' },
        { name: 'description', content: 'ChiiMenu ระบบจัดการเมนูอาหาร 3 ภาษา (ไทย, อังกฤษ, จีน) และสั่งอาหารออนไลน์ผ่าน QR Code ประจำโต๊ะ' },
        { name: 'theme-color', content: '#D41244' },
        { name: 'application-name', content: 'ChiiMenu' },
        { name: 'apple-mobile-web-app-capable', content: 'yes' },
        { name: 'apple-mobile-web-app-status-bar-style', content: 'default' },
        { name: 'apple-mobile-web-app-title', content: 'ChiiMenu' },
        { name: 'mobile-web-app-capable', content: 'yes' },
        { property: 'og:title', content: 'ChiiMenu - ระบบเมนูอาหาร 3 ภาษา' },
        { property: 'og:description', content: 'ChiiMenu ระบบจัดการเมนูอาหาร 3 ภาษา (ไทย, อังกฤษ, จีน) และสั่งอาหารออนไลน์ผ่าน QR Code ประจำโต๊ะ' },
        { property: 'og:image', content: '/og-image.png' },
        { property: 'og:type', content: 'website' },
        { name: 'twitter:card', content: 'summary_large_image' },
        { name: 'twitter:image', content: '/og-image.png' }
      ],
      link: [
        { rel: 'icon', type: 'image/png', href: '/favicon.png?v=2' },
        { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico?v=2' },
        { rel: 'shortcut icon', href: '/favicon.ico?v=2' },
        { rel: 'apple-touch-icon', sizes: '180x180', href: '/apple-touch-icon.png?v=2' },
        { rel: 'manifest', href: '/manifest.json' }
      ]
    }
  },

  modules: [
    '@nuxtjs/tailwindcss',
    '@nuxtjs/supabase',
    '@nuxtjs/i18n',
    '@nuxtjs/google-fonts'
  ].concat(process.env.NODE_ENV === 'production' ? ['nuxt-security'] : []),

  runtimeConfig: {
    cloudflareAccountId: process.env.CLOUDFLARE_ACCOUNT_ID,
    cloudflareApiToken: process.env.CLOUDFLARE_API_TOKEN,
    lineChannelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
    public: {
      adminEmails: process.env.ADMIN_EMAILS || ''
    }
  },

  i18n: {
    vueI18n: './i18n.config.ts',
    langDir: 'locales',
    locales: [
      { code: 'th', iso: 'th-TH', file: 'th.json', name: 'ไทย' },
      { code: 'en', iso: 'en-US', file: 'en.json', name: 'English' },
      { code: 'zh', iso: 'zh-CN', file: 'zh.json', name: '中文' }
      // { code: 'nod', iso: 'nod-TH', file: 'nod.json', name: 'ล้านนา' }
    ],
    defaultLocale: 'th',
    strategy: 'no_prefix',
    detectBrowserLanguage: {
      useCookie: true,
      cookieKey: 'i18n_redirected',
      redirectOn: 'root',
      alwaysRedirect: false,
      fallbackLocale: 'th'
    }
  },

  googleFonts: {
    families: {
      Prompt: [300, 400, 500, 600, 700],
      'Noto Sans Thai': [300, 400, 500, 600, 700],
      Inter: [400, 500, 600, 700]
    },
    display: 'swap',
    download: true,
    inject: true
  },

  supabase: {
    redirectOptions: {
      login: '/login',
      callback: '/confirm',
      exclude: ['/', '/login', '/register', '/privacy', '/m/*', '/menu/*', '/api/*'] // Exclude public tourist routes and auth pages
    },
    clientOptions: {
      auth: {
        flowType: 'pkce',
        detectSessionInUrl: true,
        persistSession: true,
        autoRefreshToken: true
      }
    }
  },

  // @ts-ignore - nuxt-security module is only loaded in production, so types are missing in dev
  security: {
    headers: {
      crossOriginEmbedderPolicy: 'unsafe-none',
      contentSecurityPolicy: false
    },
    rateLimiter: {
      tokensPerInterval: 150,
      interval: 300000, // 5 minutes
      throwError: true
    }
  }
})
