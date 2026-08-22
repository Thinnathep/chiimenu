import webpush from 'web-push'
import { createClient } from '@supabase/supabase-js'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { subscription, storeId } = body

  if (!subscription || !storeId) {
    throw createError({ statusCode: 400, message: 'Missing subscription or storeId' })
  }

  const config = useRuntimeConfig()

  // Configure VAPID for sending pushes
  if (config.vapidPublicKey && config.vapidPrivateKey) {
    webpush.setVapidDetails(
      config.vapidEmail || 'mailto:admin@chiimenu.com',
      config.vapidPublicKey,
      config.vapidPrivateKey
    )
  }

  // Use service key if available, fall back to anon key (RLS will protect)
  const supabaseUrl = process.env.NUXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || ''
  const supabaseKey = process.env.NUXT_SUPABASE_SECRET_KEY || process.env.SUPABASE_KEY || ''

  if (!supabaseUrl || !supabaseKey) {
    throw createError({ statusCode: 500, message: 'Supabase config missing' })
  }

  const db = createClient(supabaseUrl, supabaseKey)

  const { endpoint, keys } = subscription
  const { error } = await db
    .from('push_subscriptions')
    .upsert({
      store_id: storeId,
      endpoint,
      p256dh: keys.p256dh,
      auth: keys.auth
    }, { onConflict: 'endpoint' })

  if (error) {
    console.error('[push/subscribe] upsert error:', error.message)
    // Non-fatal: return success anyway so client doesn't keep retrying
    // The notification will still work via Supabase Realtime fallback
    return { success: true, stored: false, note: error.message }
  }

  return { success: true, stored: true }
})
