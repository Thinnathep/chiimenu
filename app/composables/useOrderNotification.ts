/**
 * useOrderNotification — ChiiMenu Push Notification Composable
 *
 * Features:
 * 1. Default OFF for both Sound and Web Push Notification (Merchant can turn ON in Settings)
 * 2. Reliable Web Push state management & toggle ON/OFF
 * 3. Sound via Web Audio API (ding-dong bell, no external file required)
 * 4. Test Notification & Test Sound triggers
 * 5. Supabase Realtime fallback → in-app notification when tab is open
 * 6. Detailed Android & iOS Installation Modal controls
 */

const VAPID_PUBLIC_KEY = 'BDWwbOf0y6djUnn7A7jGLx49-2IOpAf0_0xs5afrlWfYdRq3shGhFc4zv8fSJarVr2MR5_3aN03HiunMq_fVadk'

// ─── Device Detection ─────────────────────────────────────────────────────────
export const isIOS = () =>
  process.client &&
  (/iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1))

export const isAndroid = () =>
  process.client && /Android/i.test(navigator.userAgent)

export const isIOSPWA = () =>
  isIOS() && window.matchMedia('(display-mode: standalone)').matches

export const isStandalone = () =>
  process.client && window.matchMedia('(display-mode: standalone)').matches

// ─── Composable ───────────────────────────────────────────────────────────────
export const useOrderNotification = () => {
  // Persisted states shared across Nuxt components (Defaults to FALSE / OFF)
  const soundEnabled = useState<boolean>('notif_sound_enabled', () => false)
  const pushEnabled = useState<boolean>('notif_push_enabled', () => false)
  const notificationPermission = useState<NotificationPermission>('notif_permission', () => 'default')
  const isSubscribed = useState<boolean>('notif_subscribed', () => false)
  const isSubscribing = useState<boolean>('notif_is_subscribing', () => false)
  
  // PWA Install States & Modal
  const deferredInstallPrompt = useState<any>('pwa_install_prompt', () => null)
  const showInstallBanner = useState<boolean>('pwa_install_banner', () => false)
  const showInstallModal = useState<boolean>('pwa_install_modal', () => false)
  const activeInstallTab = useState<'android' | 'ios'>('pwa_active_install_tab', () => isIOS() ? 'ios' : 'android')

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

      const note = (freq: number, t: number, dur: number, vol = 0.45) => {
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
      useToast().success('เปิดเสียงกระดิ่งแจ้งเตือนแล้ว')
    } else {
      useToast().info('ปิดเสียงกระดิ่งแจ้งเตือนแล้ว')
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

    // Current Notification Permission
    if ('Notification' in window) {
      notificationPermission.value = Notification.permission
      // If browser permission is denied, ensure pushEnabled is false
      if (Notification.permission === 'denied') {
        pushEnabled.value = false
      }
    }
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

    try {
      const result = await Notification.requestPermission()
      notificationPermission.value = result
      return result === 'granted'
    } catch (e) {
      console.error('[ChiiMenu] Request permission error:', e)
      return false
    }
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
    if (!process.client) return false

    // iOS: need to be in PWA mode to use push
    if (isIOS() && !isIOSPWA()) {
      openInstallModal('ios')
      return false
    }

    isSubscribing.value = true

    try {
      const granted = await requestPermission()
      if (!granted) {
        pushEnabled.value = false
        if (process.client) {
          localStorage.setItem('chiimenu_push_enabled', 'off')
        }
        if (notificationPermission.value === 'denied') {
          useToast().error('การแจ้งเตือนถูกปิดกั้นในเบราว์เซอร์ กรุณาเปิดอนุญาตในการตั้งค่าเบราว์เซอร์')
        }
        return false
      }

      // Permission is granted! Enable push immediately
      pushEnabled.value = true
      notificationPermission.value = 'granted'
      localStorage.setItem('chiimenu_push_enabled', 'on')

      // Background register Service Worker & VAPID subscription
      const reg = await registerSW()
      if (reg && 'pushManager' in reg && store.value?.id) {
        try {
          let sub = await reg.pushManager.getSubscription()
          if (!sub) {
            sub = await reg.pushManager.subscribe({
              userVisibleOnly: true,
              applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as unknown as BufferSource
            })
          }

          if (sub) {
            const subJson = sub.toJSON()
            // 1. Direct client-side upsert with active authenticated session
            try {
              await (client as any)
                .from('push_subscriptions')
                .upsert({
                  store_id: store.value.id,
                  endpoint: sub.endpoint,
                  p256dh: subJson.keys?.p256dh || '',
                  auth: subJson.keys?.auth || ''
                }, { onConflict: 'endpoint' })
            } catch (dbErr) {
              console.warn('[ChiiMenu] Client direct upsert note:', dbErr)
            }

            // 2. Also notify server endpoint
            try {
              await $fetch('/api/push/subscribe', {
                method: 'POST',
                body: { subscription: subJson, storeId: store.value.id }
              })
            } catch (apiErr) {
              console.warn('[ChiiMenu] Server API subscribe note:', apiErr)
            }

            isSubscribed.value = true
          }
        } catch (subErr) {
          console.warn('[ChiiMenu] VAPID push subscribe background warning (local notifications still active):', subErr)
        }
      }

      useToast().success('เปิดการแจ้งเตือนเรียบร้อยแล้ว')
      return true
    } catch (e: any) {
      console.error('[ChiiMenu] Push subscribe error:', e)
      useToast().error(e.message || 'ไม่สามารถเปิดการแจ้งเตือนได้')
      return false
    } finally {
      isSubscribing.value = false
    }
  }

  // ─── Unsubscribe from Web Push ───────────────────────────────────────────
  const unsubscribeFromWebPush = async (): Promise<boolean> => {
    try {
      const reg = await navigator.serviceWorker?.ready
      if (reg && 'pushManager' in reg) {
        const sub = await reg.pushManager.getSubscription()
        if (sub) {
          try {
            await (client as any)
              .from('push_subscriptions')
              .delete()
              .eq('endpoint', sub.endpoint)
          } catch (_) {}
          await sub.unsubscribe()
        }
      }
      pushEnabled.value = false
      isSubscribed.value = false
      if (process.client) {
        localStorage.setItem('chiimenu_push_enabled', 'off')
      }
      useToast().info('ปิดการแจ้งเตือนเรียบร้อยแล้ว')
      return true
    } catch (e) {
      console.error('[ChiiMenu] Push unsubscribe error:', e)
      pushEnabled.value = false
      if (process.client) {
        localStorage.setItem('chiimenu_push_enabled', 'off')
      }
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

  // ─── Test Notification Trigger ───────────────────────────────────────────
  const testPushNotification = async () => {
    // 1. Play sound
    playOrderSound()

    // 2. Trigger notification
    const title = '🍜 ทดสอบการแจ้งเตือน ChiiMenu'
    const body = 'ระบบแจ้งเตือนออเดอร์พร้อมใช้งานแล้ว! (โต๊ะ 1 - ฿250)'

    const notifOptions: any = {
      body,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: 'test-order',
      renotify: true,
      requireInteraction: false,
      vibrate: [200, 100, 200],
      data: { url: '/merchant/orders' }
    }

    try {
      const swReg = await navigator.serviceWorker?.ready
      if (swReg) {
        await swReg.showNotification(title, notifOptions)
        useToast().success('ส่งการแจ้งเตือนทดสอบแล้ว!')
        return
      }
    } catch (_) { /* fallthrough */ }

    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      try {
        new Notification(title, { body, icon: '/icon-192.png' })
        useToast().success('ส่งการแจ้งเตือนทดสอบแล้ว!')
        return
      } catch (_) { /* ignore */ }
    }

    useToast().success('ทดสอบเล่นเสียงกระดิ่งเรียบร้อยแล้ว!')
  }

  // ─── Show Notification on incoming order ─────────────────────────────────
  const showOrderNotification = async (order: any) => {
    // Use correct DB column names: table_no (not table_number), items (JSONB array)
    const tableLabel = order.table_no
      ? `โต๊ะ ${order.table_no}`
      : order.order_type === 'takeaway' ? 'Take Away' : 'ออเดอร์ใหม่'
    const title = `🍜 ${tableLabel} — ออเดอร์ใหม่!`
    // Compute total and count from the items JSONB array
    const itemsArr: any[] = Array.isArray(order.items) ? order.items : []
    const totalPrice = itemsArr.reduce((sum: number, item: any) => {
      const price = Number(item.unitPrice ?? item.price ?? 0)
      const qty = Number(item.quantity ?? 1)
      return sum + price * qty
    }, 0)
    const itemsCount = itemsArr.length
    const body = `฿${totalPrice} | ${itemsCount || ''} รายการ`

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

  // ─── PWA Install Controls & Modal ────────────────────────────────────────
  const initInstallPrompt = () => {
    if (!process.client) return

    window.addEventListener('beforeinstallprompt', (e: any) => {
      e.preventDefault()
      deferredInstallPrompt.value = e
      if (!isStandalone()) {
        showInstallBanner.value = true
      }
    })

    window.addEventListener('appinstalled', () => {
      showInstallBanner.value = false
      showInstallModal.value = false
      deferredInstallPrompt.value = null
      useToast().success('ติดตั้ง ChiiMenu บนหน้าจอหลักเรียบร้อยแล้ว!')
    })

    if (isStandalone()) {
      showInstallBanner.value = false
    }
  }

  const openInstallModal = (tab?: 'android' | 'ios') => {
    if (tab) {
      activeInstallTab.value = tab
    } else {
      activeInstallTab.value = isIOS() ? 'ios' : 'android'
    }
    showInstallModal.value = true
  }

  const closeInstallModal = () => {
    showInstallModal.value = false
  }

  const promptAndroidInstall = async () => {
    if (!deferredInstallPrompt.value) {
      openInstallModal('android')
      return
    }
    deferredInstallPrompt.value.prompt()
    const { outcome } = await deferredInstallPrompt.value.userChoice
    if (outcome === 'accepted') {
      showInstallBanner.value = false
      showInstallModal.value = false
      deferredInstallPrompt.value = null
    }
  }

  const dismissInstallBanner = () => {
    showInstallBanner.value = false
    if (process.client) {
      localStorage.setItem('chiimenu_install_banner_dismissed', 'true')
    }
  }

  // ─── Initialize ───────────────────────────────────────────────────────────
  const initialize = async () => {
    if (!process.client) return

    restorePreferences()
    await registerSW()
    initInstallPrompt()

    // If merchant had explicitly enabled push previously, refresh subscription in background
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
    isSubscribing,
    showInstallBanner,
    showInstallModal,
    activeInstallTab,
    deferredInstallPrompt,
    // Actions
    toggleSound,
    togglePushNotification,
    testPushNotification,
    playOrderSound,
    requestPermission,
    subscribeToWebPush,
    unsubscribeFromWebPush,
    startRealtimeListener,
    stopRealtimeListener,
    openInstallModal,
    closeInstallModal,
    promptAndroidInstall,
    dismissInstallBanner,
    initialize,
    // Helpers
    isIOS,
    isAndroid,
    isIOSPWA,
    isStandalone
  }
}
