import { serverSupabaseServiceRole, serverSupabaseClient, serverSupabaseUser } from '#supabase/server'
import { createClient } from '@supabase/supabase-js'
import { generatePromptPayPayload } from '../../utils/promptpay'

const SUBSCRIPTION_PACKAGES: Record<string, { id: string; name: string; days: number; standard: number; firstTime: number }> = {
  '14d': {
    id: '14d',
    name: 'แพ็กเกจ 14 วัน',
    days: 14,
    standard: 149,
    firstTime: 75
  },
  'monthly': {
    id: 'monthly',
    name: 'แพ็กเกจ 1 เดือน',
    days: 30,
    standard: 259,
    firstTime: 129
  },
  'yearly': {
    id: 'yearly',
    name: 'แพ็กเกจ 1 ปี',
    days: 365,
    standard: 2590,
    firstTime: 1295
  }
}

export default defineEventHandler(async (event) => {
  try {
    const config = useRuntimeConfig(event)
    const cfEnv = (event.context as any)?.cloudflare?.env || {}

    const rawUrl = (config.public as any)?.supabaseUrl || 
                   (config.public as any)?.supabase?.url || 
                   cfEnv.SUPABASE_URL || 
                   cfEnv.NUXT_PUBLIC_SUPABASE_URL || 
                   process.env.SUPABASE_URL || 
                   process.env.NUXT_PUBLIC_SUPABASE_URL || 
                   'https://qfvcevwskxfluscqclpq.supabase.co'

    const secretKey = (config as any)?.supabaseServiceKey || 
                      (config as any)?.supabase?.secretKey || 
                      cfEnv.SUPABASE_SERVICE_KEY || 
                      cfEnv.NUXT_SUPABASE_SERVICE_KEY || 
                      cfEnv.NUXT_SUPABASE_SECRET_KEY || 
                      process.env.SUPABASE_SERVICE_KEY || 
                      process.env.NUXT_SUPABASE_SECRET_KEY || 
                      process.env.SUPABASE_SECRET_KEY || 
                      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFmdmNldndza3hmbHVzY3FjbHBxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NjM0OTU5MiwiZXhwIjoyMTAxOTI1NTkyfQ.gaotBZ4hqZnKg9MYJbnuGeZJSb9OYnXt-SWwOjwLpxk'

    const anonKey = (config.public as any)?.supabaseKey || 
                    (config.public as any)?.supabase?.key || 
                    cfEnv.SUPABASE_KEY || 
                    cfEnv.NUXT_PUBLIC_SUPABASE_KEY || 
                    process.env.SUPABASE_KEY || 
                    process.env.NUXT_PUBLIC_SUPABASE_KEY || 
                    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFmdmNldndza3hmbHVzY3FjbHBxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYzNDk1OTIsImV4cCI6MjEwMTkyNTU5Mn0.CPq8O4IS7XNPRCOg6k0l5q_1LlGX5ioUDFv5Z0O_5SQ'

    let supabase: any
    if (secretKey && rawUrl) {
      supabase = createClient(String(rawUrl), String(secretKey), {
        auth: { persistSession: false, autoRefreshToken: false }
      })
    } else if (rawUrl && anonKey) {
      supabase = createClient(String(rawUrl), String(anonKey), {
        auth: { persistSession: false, autoRefreshToken: false }
      })
    } else {
      try {
        supabase = await serverSupabaseServiceRole(event)
      } catch {
        supabase = await serverSupabaseClient(event)
      }
    }

    if (!supabase) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Database Initialization Error',
        message: 'ไม่สามารถเชื่อมต่อฐานข้อมูลได้ กรุณาลองใหม่อีกครั้ง'
      })
    }

    const body = await readBody(event)
    const storeId = body?.storeId
    const packageId = body?.packageId

    if (!storeId || !packageId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Bad Request',
        message: 'Missing required parameters: storeId or packageId'
      })
    }

    const pkg = SUBSCRIPTION_PACKAGES[packageId]
    if (!pkg) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Bad Request',
        message: `Invalid packageId: ${packageId}`
      })
    }

    // 1. Fetch store from database
    const { data: store, error: storeError } = await supabase
      .from('stores')
      .select('id, name, owner_id, plan_status, trial_ends_at, has_used_first_time_promo')
      .eq('id', storeId)
      .single()

    if (storeError || !store) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Not Found',
        message: 'ไม่พบข้อมูลร้านค้าในระบบ'
      })
    }

    // 2. Validate current user (allow if user owns store or is admin)
    let user: any = null
    try {
      user = await serverSupabaseUser(event)
    } catch {
      // If auth session not in cookie, check header
    }

    const authHeader = getHeader(event, 'authorization')
    if (!user && authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.replace('Bearer ', '').trim()
      if (token && rawUrl) {
        // Try with service role or anon key
        const keyToUse = secretKey || anonKey
        if (keyToUse) {
          try {
            const tokenClient = createClient(String(rawUrl), String(keyToUse))
            const { data: userData } = await tokenClient.auth.getUser(token)
            if (userData?.user) {
              user = userData.user
            }
          } catch {
            // Ignore token check error
          }
        }
      }
    }

    if (!user) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Unauthorized',
        message: 'กรุณาเข้าสู่ระบบก่อนทำรายการ'
      })
    }

    if (store.owner_id !== user.id) {
      // Verify if user is admin
      const adminEmails = ((config.public as any)?.adminEmails || cfEnv.ADMIN_EMAILS || process.env.ADMIN_EMAILS || '')
        .split(',')
        .map((e: string) => e.trim().toLowerCase())
        .filter(Boolean)

      const isEmailAdmin = user.email ? adminEmails.includes(user.email.toLowerCase()) : false
      let isDbAdmin = false
      try {
        const { data: adminRecord } = await supabase
          .from('admins')
          .select('id')
          .eq('id', user.id)
          .maybeSingle()
        if (adminRecord?.id) isDbAdmin = true
      } catch {
        // Ignore
      }

      if (!isEmailAdmin && !isDbAdmin) {
        throw createError({
          statusCode: 403,
          statusMessage: 'Forbidden',
          message: 'คุณไม่มีสิทธิ์ในการจัดการการชำระเงินสำหรับร้านค้านี้'
        })
      }
    }

    // 3. Determine authoritative pricing
    const isPromo = !store.has_used_first_time_promo
    const amount = isPromo ? pkg.firstTime : pkg.standard
    let promptpayId = String((config as any).promptpayId || cfEnv.PROMPTPAY_ID || process.env.PROMPTPAY_ID || '0962386554').trim()
    const cleanId = promptpayId.replace(/[^0-9]/g, '')
    if (cleanId.length < 9) {
      promptpayId = '0962386554'
    }
    const accountName = String((config as any).promptpayAccountName || cfEnv.PROMPTPAY_ACCOUNT_NAME || process.env.PROMPTPAY_ACCOUNT_NAME || 'ChiiMenu').trim()

    // 4. Generate PromptPay EMVCo Payload
    const payload = generatePromptPayPayload(promptpayId, amount)

    // 5. QR code image DataURL will be rendered client-side by the browser
    // to ensure 100% reliability on Cloudflare Workers without Node native module dependencies.
    const qrDataUrl = ''

    return {
      success: true,
      qrDataUrl,
      payload,
      amount,
      standardAmount: pkg.standard,
      discountAmount: isPromo ? (pkg.standard - pkg.firstTime) : 0,
      isPromo,
      package: {
        id: pkg.id,
        name: pkg.name,
        days: pkg.days
      },
      store: {
        id: store.id,
        name: store.name,
        currentExpiry: store.trial_ends_at
      },
      promptpayId,
      accountName
    }
  } catch (err: any) {
    console.error('[create-qr] Error:', err)
    if (err?.statusCode) {
      throw err
    }
    throw createError({
      statusCode: 500,
      statusMessage: 'Internal Server Error',
      message: err?.message || 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์ในการสร้าง QR Code'
    })
  }
})
