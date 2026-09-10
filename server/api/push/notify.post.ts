import webpush from 'web-push'
import { createClient } from '@supabase/supabase-js'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { storeId, title, message, orderId, secret } = body

  const config = useRuntimeConfig()

  // Simple secret check to prevent abuse (set WEBHOOK_SECRET in env)
  const expectedSecret = config.webhookSecret || 'chiimenu_push_webhook_secret_2026'
  if (secret !== expectedSecret) {
    throw createError({ statusCode: 403, message: 'Forbidden' })
  }

  if (!storeId) {
    throw createError({ statusCode: 400, message: 'Missing storeId' })
  }

  if (!config.vapidPublicKey || !config.vapidPrivateKey) {
    console.warn('[push/notify] VAPID keys not configured, skipping web push')
    return { success: false, skipped: true, message: 'VAPID keys not configured' }
  }

  webpush.setVapidDetails(
    config.vapidEmail || 'mailto:admin@chiimenu.com',
    config.vapidPublicKey,
    config.vapidPrivateKey
  )

  const supabaseUrl = (config.public as any)?.supabaseUrl || (config.public as any)?.supabase?.url || process.env.NUXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || ''
  const supabaseKey = (config as any)?.supabaseServiceKey || (config as any)?.supabase?.secretKey || process.env.SUPABASE_SERVICE_KEY || process.env.NUXT_SUPABASE_SECRET_KEY || process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_KEY || ''

  if (!supabaseUrl || !supabaseKey) {
    throw createError({ statusCode: 500, message: 'Supabase config missing' })
  }

  const db = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  })

  // Get all push subscriptions for this store
  const { data: subs, error: fetchErr } = await db
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth')
    .eq('store_id', storeId)

  if (fetchErr) {
    console.error('[push/notify] fetch subs error:', fetchErr.message)
    throw createError({ statusCode: 500, message: fetchErr.message })
  }

  if (!subs || subs.length === 0) {
    return { success: true, sent: 0, total: 0 }
  }

  const payload = JSON.stringify({
    title: title || '🍜 ChiiMenu — ออเดอร์ใหม่!',
    body: message || 'มีออเดอร์ใหม่เข้ามา กรุณาตรวจสอบ',
    tag: `order-${orderId || Date.now()}`,
    url: '/merchant/orders',
    orderId: orderId || null
  })

  let sent = 0
  const expiredEndpoints: string[] = []

  await Promise.allSettled(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload,
          { TTL: 3600, urgency: 'high' }
        )
        sent++
      } catch (err: any) {
        // 410 = subscription expired/unsubscribed, 404 = not found
        if (err.statusCode === 410 || err.statusCode === 404) {
          expiredEndpoints.push(sub.endpoint)
        } else {
          console.error('[push/notify] send error:', err.statusCode, err.body)
        }
      }
    })
  )

  // Cleanup expired subscriptions
  if (expiredEndpoints.length > 0) {
    await db
      .from('push_subscriptions')
      .delete()
      .in('endpoint', expiredEndpoints)
    console.log(`[push/notify] Removed ${expiredEndpoints.length} expired subscriptions`)
  }

  return { success: true, sent, total: subs.length, removed: expiredEndpoints.length }
})
