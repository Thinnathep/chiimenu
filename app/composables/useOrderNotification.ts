/**
 * useOrderNotification — ChiiMenu Push Notification Composable
 *
 * Features:
 * 1. Default OFF for both Sound and Web Push Notification (Merchant can turn ON in Settings)
 * 2. Service Worker registration (public/sw.js)
 * 3. Web Push API subscription (VAPID) → native OS notification
 * 4. Sound via Web Audio API (ding-dong bell, no external file required)
 * 5. Supabase Realtime fallback → in-app notification when tab is open
 * 6. PWA Install prompt (Android Chrome auto-prompt + manual trigger for iOS)
 */

const VAPID_PUBLIC_KEY = 'BDWwbOf0y6djUnn7A7jGLx49-2IOpAf0_0xs5afrlWfYdRq3shGhFc4zv8fSJarVr2MR5_3aN03HiunMq_fVadk'

// ─── Detect iOS ───────────────────────────────────────────────────────────────
const isIOS = () =>
  process.client &&
  (/iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1))

const isIOSPWA = () =>
  isIOS() && window.matchMedia('(display-mode: standalone)').matches

// ─── Composable ───────────────────────────────────────────────────────────────
export const useOrderNotification = () => {
  // Persisted states shared across components (Defaults to FALSE / OFF)
  const soundEnabled = useState<boolean>('notif_sound_enabled', () => false)
  const pushEnabled = useState<boolean>('notif_push_enabled', () => false)
  const notificationPermission = useState<NotificationPermission>('notif_permission', () => 'default')
  const isSubscribed = useState<boolean>('notif_subscribed', () => false)
  const deferredInstallPrompt = useState<any>('pwa_install_prompt', () => null)
  const showInstallBanner = useState<boolean>('pwa_install_banner', () => false)
  const showIOSGuide = useState<boolean>('pwa_ios_guide', () => false)

  const realtimeChannel = ref<any>(null)
  const client = useSupabaseClient()
  const { store } = useCurrentStore()

  // ─── Sound Engine (Web Audio API) ─────────────────────────────────────────
  const playOrderSound = () => {
    if (!process.client) return
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
      if (!AudioCtx) return
      const ctx = new AudioCtx()

      const note = (freq: number, t: number, dur: number, vol = 0.4) => {
        const osc = ctx.createOscillator()
        const g = ctx.createGain()
        osc.connect(g)
        g.connect(ctx.destination)
        osc.type = 'sine'
        osc.frequency.setValueAtTime(freq, t)
        g.gain.setValueAtTime(0, t)
        g.gain.linearRampToValueAtTime(vol, t + 0.02)
        g.gain.exponentialRampToValueAtTime(0.001, t + dur)
        osc.start(t)
        osc.stop(t + dur)
      }

      // ♪ ding-dong-ding bell melody
      const t = ctx.currentTime
      note(880,  t,        0.45, 0.5)   // A5
      note(1109, t + 0.18, 0.35, 0.4)   // C#6
      note(1319, t + 0.36, 0.55, 0.45)  // E6
      note(1109, t + 0.56, 0.30, 0.35)  // C#6
      note(880,  t + 0.76, 0.65, 0.4)   // A5
    } catch (e) {
      console.warn('[ChiiMenu] Audio play error:', e)
    }
  }

  const toggleSound = () => {
    soundEnabled.value = !soundEnabled.value
    if (process.client) {
      localStorage.setItem('chiimenu_sound', soundEnabled.value ? 'on' : 'off')
    }
    if (soundEnabled.value) {
      playOrderSound()
    }
  }

  // ─── Restore persisted preferences (Defaults to OFF) ───────────────────────
  const restorePreferences = () => {
    if (!process.client) return
    // Sound: Default OFF unless saved 'on'
    const savedSound = localStorage.getItem('chiimenu_sound')
    soundEnabled.value = savedSound === 'on'

    // Push: Default OFF unless saved 'on'
    const savedPush = localStorage.getItem('chiimenu_push_enabled')
    pushEnabled.value = savedPush === 'on'
  }

  // ─── Service Worker ───────────────────────────────────────────────────────
  const registerSW = async (): Promise<ServiceWorkerRegistration | null> => {
    if (!process.client || !('serviceWorker' in navigator)) return null
    try {
      const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' })
      await navigator.serviceWorker.ready
      return reg
    } catch (e) {
      console.warn('[ChiiMenu] SW registration failed:', e)
      return null
    }
  }

  // ─── Notification Permission ──────────────────────────────────────────────
  const requestPermission = async (): Promise<boolean> => {
    if (!process.client || !('Notification' in window)) return false
    if (Notification.permission === 'granted') {
      notificationPermission.value = 'granted'
      return true
    }
    if (Notification.permission === 'denied') {
      notificationPermission.value = 'denied'
      return false
    }
    const result = await Notification.requestPermission()
    notificationPermission.value = result
    return result === 'granted'
  }

  // ─── VAPID key converter ──────────────────────────────────────────────────
  const urlBase64ToUint8Array = (b64: string): Uint8Array => {
    const padding = '='.repeat((4 - (b64.length % 4)) % 4)
    const base64 = (b64 + padding).replace(/-/g, '+').replace(/_/g, '/')
    const raw = window.atob(base64)
    const outputArray = new Uint8Array(raw.length)
    for (let i = 0; i < raw.length; ++i) {
      outputArray[i] = raw.charCodeAt(i)
    }
    return outputArray
  }

  // ─── Subscribe to Web Push ─────────────────────────────────────────────────
  const subscribeToWebPush = async (): Promise<boolean> => {
    if (!store.value?.id) return false

    // iOS: need to be in PWA mode to use push
    if (isIOS() && !isIOSPWA()) {
      showIOSGuide.value = true
      return false
    }

    const reg = await registerSW()
    if (!reg) return false

    const granted = await requestPermission()
    if (!granted) return false

    try {
      let sub = await reg.pushManager.getSubscription()
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as unknown as BufferSource
        })
      }

      // Store subscription in DB
      await $fetch('/api/push/subscribe', {
        method: 'POST',
        body: { subscription: sub.toJSON(), storeId: store.value.id }
      })

      isSubscribed.value = true
      pushEnabled.value = true
      notificationPermission.value = 'granted'
      if (process.client) {
        localStorage.setItem('chiimenu_push_enabled', 'on')
      }
      return true
    } catch (e) {
      console.error('[ChiiMenu] Push subscribe error:', e)
      return false
    }
  }

  // ─── Unsubscribe from Web Push ───────────────────────────────────────────
  const unsubscribeFromWebPush = async (): Promise<boolean> => {
    try {
      const reg = await navigator.serviceWorker?.ready
      if (reg) {
        const sub = await reg.pushManager.getSubscription()
        if (sub) {
          await sub.unsubscribe()
        }
      }
      pushEnabled.value = false
      isSubscribed.value = false
      if (process.client) {
        localStorage.setItem('chiimenu_push_enabled', 'off')
      }
      return true
    } catch (e) {
      console.error('[ChiiMenu] Push unsubscribe error:', e)
      return false
    }
  }

  // ─── Toggle Push Notification Switch ─────────────────────────────────────
  const togglePushNotification = async () => {
    if (pushEnabled.value) {
      await unsubscribeFromWebPush()
    } else {
      await subscribeToWebPush()
    }
  }

  // ─── Show Notification (in-app & OS) ─────────────────────────────────────
  const showOrderNotification = async (order: any) => {
    const tableLabel = order.table_number
      ? `โต๊ะ ${order.table_number}`
      : order.order_type === 'takeaway' ? 'Take Away' : 'ออเดอร์ใหม่'
    const title = `🍜 ${tableLabel} — ออเดอร์ใหม่!`
    const body = `฿${order.total_price || 0} | ${order.items_count || ''} รายการ`

    // 1. Play sound only if merchant enabled sound
    if (soundEnabled.value) {
      playOrderSound()
    }

    // 2. Show native push notification only if merchant enabled push
    if (pushEnabled.value && notificationPermission.value === 'granted') {
      const notifOptions: any = {
        body,
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        tag: `order-${order.id}`,
        renotify: true,
        requireInteraction: true,
        vibrate: [200, 100, 200, 100, 400],
        data: { url: '/merchant/orders', orderId: order.id },
        actions: [
          { action: 'view', title: '👀 ดูออเดอร์' },
          { action: 'dismiss', title: '✕ ปิด' }
        ]
      }

      try {
        const swReg = await navigator.serviceWorker?.ready
        if (swReg) {
          await swReg.showNotification(title, notifOptions)
          return
        }
      } catch (_) { /* fallthrough */ }

      // Fallback: standard Notification API
      try {
        new Notification(title, { body, icon: '/icon-192.png', tag: `order-${order.id}` })
      } catch (_) { /* ignore */ }
    }
  }

  // ─── Supabase Realtime Listener ───────────────────────────────────────────
  const startRealtimeListener = () => {
    if (!store.value?.id || realtimeChannel.value) return

    realtimeChannel.value = client
      .channel(`notif-orders-${store.value.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'orders',
          filter: `store_id=eq.${store.value.id}`
        },
        async (payload: any) => {
          await showOrderNotification(payload.new)
        }
      )
      .subscribe()
  }

  const stopRealtimeListener = () => {
    if (realtimeChannel.value) {
      client.removeChannel(realtimeChannel.value)
      realtimeChannel.value = null
    }
  }

  // ─── PWA Install ──────────────────────────────────────────────────────────
  const initInstallPrompt = () => {
    if (!process.client) return

    // Android Chrome: listen for beforeinstallprompt
    window.addEventListener('beforeinstallprompt', (e: any) => {
      e.preventDefault()
      deferredInstallPrompt.value = e
      if (!window.matchMedia('(display-mode: standalone)').matches) {
        showInstallBanner.value = true
      }
    })

    window.addEventListener('appinstalled', () => {
      showInstallBanner.value = false
      showIOSGuide.value = false
      deferredInstallPrompt.value = null
    })

    // iOS: show guide if not already installed as PWA
    if (isIOS() && !isIOSPWA()) {
      setTimeout(() => {
        const dismissed = localStorage.getItem('chiimenu_ios_guide_dismissed')
        if (!dismissed) {
          showInstallBanner.value = true
        }
      }, 3000)
    }

    if (window.matchMedia('(display-mode: standalone)').matches) {
      showInstallBanner.value = false
    }
  }

  const installPWA = async () => {
    if (isIOS()) {
      showIOSGuide.value = true
      if (process.client) {
        localStorage.setItem('chiimenu_ios_guide_dismissed', 'true')
      }
      showInstallBanner.value = false
      return
    }
    if (!deferredInstallPrompt.value) return
    deferredInstallPrompt.value.prompt()
    const { outcome } = await deferredInstallPrompt.value.userChoice
    if (outcome === 'accepted') {
      showInstallBanner.value = false
      deferredInstallPrompt.value = null
    }
  }

  const dismissInstallBanner = () => {
    showInstallBanner.value = false
    if (process.client) {
      localStorage.setItem('chiimenu_ios_guide_dismissed', 'true')
    }
  }

  // ─── Initialize ───────────────────────────────────────────────────────────
  const initialize = async () => {
    if (!process.client) return

    restorePreferences()

    if ('Notification' in window) {
      notificationPermission.value = Notification.permission
    }

    await registerSW()
    initInstallPrompt()

    // If merchant had explicitly enabled push previously, verify subscription
    if (pushEnabled.value && Notification.permission === 'granted' && store.value?.id) {
      await subscribeToWebPush()
    }

    startRealtimeListener()
  }

  return {
    // State
    soundEnabled,
    pushEnabled,
    notificationPermission,
    isSubscribed,
    showInstallBanner,
    showIOSGuide,
    // Actions
    toggleSound,
    togglePushNotification,
    playOrderSound,
    requestPermission,
    subscribeToWebPush,
    unsubscribeFromWebPush,
    startRealtimeListener,
    stopRealtimeListener,
    installPWA,
    dismissInstallBanner,
    initialize,
    // Helpers
    isIOS,
    isIOSPWA
  }
}
