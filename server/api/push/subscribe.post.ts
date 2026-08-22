import { serverSupabaseClient, serverSupabaseUser } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { subscription, storeId } = body

  if (!subscription || !storeId) {
    throw createError({ statusCode: 400, message: 'Missing subscription or storeId' })
  }

  try {
    const client = await serverSupabaseClient(event)
    const { endpoint, keys } = subscription

    const { error } = await (client as any)
      .from('push_subscriptions')
      .upsert({
        store_id: storeId,
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth
      }, { onConflict: 'endpoint' })

    if (error) {
      console.warn('[push/subscribe] upsert note:', error.message)
      return { success: true, stored: false, note: error.message }
    }

    return { success: true, stored: true }
  } catch (err: any) {
    console.warn('[push/subscribe] handler note:', err.message)
    return { success: true, stored: false, note: err.message }
  }
})
