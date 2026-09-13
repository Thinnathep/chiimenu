import { serverSupabaseServiceRole, serverSupabaseClient, serverSupabaseUser } from '#supabase/server'
import { createClient } from '@supabase/supabase-js'

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
  const config = useRuntimeConfig(event)
  const cfEnv = (event.context as any)?.cloudflare?.env || {}

  const rawUrl = (config.public as any)?.supabaseUrl || 
                 (config.public as any)?.supabase?.url || 
                 cfEnv.SUPABASE_URL || 
                 cfEnv.NUXT_PUBLIC_SUPABASE_URL || 
                 process.env.SUPABASE_URL || 
                 process.env.NUXT_PUBLIC_SUPABASE_URL || ''

  const secretKey = (config as any)?.supabaseServiceKey || 
                    (config as any)?.supabase?.secretKey || 
                    cfEnv.SUPABASE_SERVICE_KEY || 
                    cfEnv.NUXT_SUPABASE_SERVICE_KEY || 
                    cfEnv.NUXT_SUPABASE_SECRET_KEY || 
                    process.env.SUPABASE_SERVICE_KEY || 
                    process.env.NUXT_SUPABASE_SECRET_KEY || 
                    process.env.SUPABASE_SECRET_KEY || ''

  const anonKey = (config.public as any)?.supabaseKey || 
                  (config.public as any)?.supabase?.key || 
                  cfEnv.SUPABASE_KEY || 
                  cfEnv.NUXT_PUBLIC_SUPABASE_KEY || 
                  process.env.SUPABASE_KEY || 
                  process.env.NUXT_PUBLIC_SUPABASE_KEY || ''

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

  // 1. Extract payload: support both multipart/form-data and JSON
  let fileBuffer: Buffer | null = null
  let fileName = 'slip.jpg'
  let fileType = 'image/jpeg'
  let storeId = ''
  let packageId = ''

  const contentType = getHeader(event, 'content-type') || ''

  if (contentType.includes('multipart/form-data')) {
    const parts = await readMultipartFormData(event)
    if (parts && Array.isArray(parts)) {
      for (const part of parts) {
        if (part.name === 'slip' || part.name === 'file' || part.name === 'files') {
          fileBuffer = part.data
          if (part.filename) fileName = part.filename
          if (part.type) fileType = part.type
        } else if (part.name === 'storeId') {
          storeId = part.data.toString('utf-8').trim()
        } else if (part.name === 'packageId') {
          packageId = part.data.toString('utf-8').trim()
        }
      }
    }
  } else {
    const jsonBody = await readBody(event)
    storeId = jsonBody?.storeId || ''
    packageId = jsonBody?.packageId || ''
    if (jsonBody?.imageBase64) {
      const base64Data = jsonBody.imageBase64.replace(/^data:image\/\w+;base64,/, '')
      fileBuffer = Buffer.from(base64Data, 'base64')
      fileName = jsonBody.fileName || 'slip.jpg'
      fileType = jsonBody.fileType || 'image/jpeg'
    }
  }

  if (!fileBuffer || fileBuffer.length === 0) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request',
      message: 'กรุณาแนบรูปภาพสลิปการโอนเงิน'
    })
  }

  if (!storeId || !packageId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request',
      message: 'ข้อมูลไม่ครบถ้วน: storeId หรือ packageId หายไป'
    })
  }

  const pkg = SUBSCRIPTION_PACKAGES[packageId]
  if (!pkg) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request',
      message: `ไม่พบแพ็กเกจที่ระบุ (${packageId})`
    })
  }

  // 2. Fetch Store & Verify Authorization
  const { data: store, error: storeError } = await supabase
    .from('stores')
    .select('id, name, owner_id, plan_status, trial_ends_at, has_used_first_time_promo')
    .eq('id', storeId)
    .single()

  if (storeError || !store) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Not Found',
      message: 'ไม่พบข้อมูลร้านค้านี้ในระบบ'
    })
  }

  let user: any = null
  try {
    user = await serverSupabaseUser(event)
  } catch {
    // Session token in header
  }

  const authHeader = getHeader(event, 'authorization')
  if (!user && authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.replace('Bearer ', '').trim()
    if (token && rawUrl && secretKey) {
      try {
        const tokenClient = createClient(String(rawUrl), String(secretKey))
        const { data: userData } = await tokenClient.auth.getUser(token)
        if (userData?.user) {
          user = userData.user
        }
      } catch {
        // Ignore
      }
    }
  }

  if (!user) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized',
      message: 'กรุณาเข้าสู่ระบบก่อนทำรายการต่ออายุ'
    })
  }

  if (store.owner_id !== user.id) {
    const adminEmails = (config.public?.adminEmails || process.env.ADMIN_EMAILS || '')
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
        message: 'คุณไม่มีสิทธิ์ในการต่ออายุร้านค้านี้'
      })
    }
  }

  // 3. Determine expected amount
  const isPromo = !store.has_used_first_time_promo
  const expectedAmount = isPromo ? pkg.firstTime : pkg.standard

  // 4. Call SlipOK Verification Gateway
  let branchId = String((config as any).slipokBranchId || cfEnv.SLIPOK_BRANCH_ID || process.env.SLIPOK_BRANCH_ID || '76120').trim()
  let apiKey = String((config as any).slipokApiKey || cfEnv.SLIPOK_API_KEY || process.env.SLIPOK_API_KEY || 'SLIPOKOUFVGAA').trim()

  // Smart auto-healing: if Cloudflare environment still has legacy deprecated branch/key, upgrade to active credentials
  if (branchId === '75890' || !branchId) {
    branchId = '76120'
  }
  if (apiKey === 'SLIPOKAQ7O2X0' || !apiKey) {
    apiKey = 'SLIPOKOUFVGAA'
  }

  const slipFormData = new FormData()
  const blob = new Blob([fileBuffer], { type: fileType })
  slipFormData.append('files', blob, fileName)
  slipFormData.append('log', 'true')
  slipFormData.append('amount', String(expectedAmount))

  let slipOkResult: any = null
  try {
    const slipOkResponse = await fetch(`https://api.slipok.com/api/line/apikey/${branchId}`, {
      method: 'POST',
      headers: {
        'x-authorization': apiKey,
        'User-Agent': 'ChiiMenu-Server/1.0'
      },
      body: slipFormData
    })

    slipOkResult = await slipOkResponse.json()
  } catch (err: any) {
    console.error('[SlipOK] Network / API Gateway Error:', err)
    throw createError({
      statusCode: 502,
      statusMessage: 'Bad Gateway',
      message: 'ไม่สามารถติดต่อเซิร์ฟเวอร์ตรวจสอบสลิป SlipOK ได้ในขณะนี้ กรุณาลองใหม่อีกครั้ง'
    })
  }

  if (!slipOkResult?.success || !slipOkResult?.data) {
    const code = slipOkResult?.code
    let thaiMsg = slipOkResult?.message || 'ไม่สามารถตรวจสอบความถูกต้องของสลิปได้'
    
    if (code === 1008) {
      thaiMsg = 'รูปภาพนี้ไม่ใช่สลิปโอนเงิน หรือ QR Code บนสลิปไม่ชัดเจน'
    } else if (code === 1012) {
      thaiMsg = 'สลิปนี้เคยถูกนำมาตรวจสอบแล้วในระบบ SlipOK (ไม่อนุญาตให้ใช้สลิปซ้ำ)'
    } else if (code === 1013) {
      thaiMsg = `ยอดเงินในสลิปไม่ตรงกับราคาแพ็กเกจ (ต้องการ ${expectedAmount} บาท)`
    } else if (code === 1014) {
      thaiMsg = 'สลิปนี้ไม่ได้โอนเข้าบัญชี PromptPay ของทาง ChiiMenu'
    }

    throw createError({
      statusCode: 400,
      statusMessage: 'Slip Verification Failed',
      message: thaiMsg
    })
  }

  const slipData = slipOkResult.data
  const transRef = String(slipData.transRef || '').trim()

  if (!transRef) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid Slip Data',
      message: 'ไม่พบรหัสอ้างอิงธุรกรรมธนาคาร (Transaction Reference) บนสลิป'
    })
  }

  // 5. Anti-Fraud Guard 1: Check transRef in database (Anti-Replay Attack)
  try {
    const { data: existingRecord, error: checkError } = await supabase
      .from('billing_records')
      .select('id, receipt_number, created_at')
      .eq('slip_trans_ref', transRef)
      .maybeSingle()

    if (existingRecord) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Duplicate Slip',
        message: `สลิปนี้ถูกใช้งานไปแล้ว (เลขที่ใบเสร็จเดิม: ${existingRecord.receipt_number}) ไม่สามารถนำมาใช้ซ้ำได้`
      })
    }
    if (checkError && checkError.code !== 'PGRST116') {
      console.warn('[SlipOK] Notice: slip_trans_ref check query warning (migration 42 may be pending):', checkError.message)
    }
  } catch (err: any) {
    if (err.statusCode === 400) throw err
    console.warn('[SlipOK] Error during replay check:', err)
  }

  // 6. Anti-Fraud Guard 2: Verify Exact Amount
  const slipAmount = Number(slipData.amount)
  if (isNaN(slipAmount) || Math.abs(slipAmount - expectedAmount) > 0.01) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Amount Mismatch',
      message: `ยอดเงินในสลิป (${slipAmount} บาท) ไม่ตรงกับราคาแพ็กเกจที่ต้องชำระ (${expectedAmount} บาท)`
    })
  }

  // 7. Anti-Fraud Guard 3: Check freshness (not older than 60 minutes, not in the future)
  let slipDate: Date | null = null
  if (slipData.transTimestamp) {
    slipDate = new Date(slipData.transTimestamp)
  } else if (slipData.transDate && slipData.transTime) {
    const y = String(slipData.transDate).slice(0, 4)
    const m = String(slipData.transDate).slice(4, 6)
    const d = String(slipData.transDate).slice(6, 8)
    slipDate = new Date(`${y}-${m}-${d}T${slipData.transTime}+07:00`)
  }

  if (slipDate && !isNaN(slipDate.getTime())) {
    const ageMinutes = (Date.now() - slipDate.getTime()) / (1000 * 60)
    // Tolerance: 65 minutes (allowing 5 minutes clock drift)
    if (ageMinutes > 65) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Slip Expired',
        message: `สลิปนี้ทำรายการเมื่อ ${Math.round(ageMinutes)} นาทีที่แล้ว (เกินกำหนด 60 นาที) กรุณาใช้สลิปที่ทำรายการล่าสุด`
      })
    }
    if (ageMinutes < -10) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid Slip Timestamp',
        message: 'เวลาบนสลิปไม่ถูกต้อง (เวลาในอนาคต) กรุณาตรวจสอบเวลาในอุปกรณ์ของคุณ'
      })
    }
  }

  // 8. Upload slip to Supabase Storage (Best effort)
  let slipUrl: string | null = null
  try {
    const storagePath = `slips/${store.id}/${Date.now()}_${transRef}.jpg`
    const { data: uploadData, error: uploadErr } = await supabase.storage
      .from('store_assets')
      .upload(storagePath, fileBuffer, {
        contentType: fileType,
        upsert: true
      })

    if (!uploadErr && uploadData) {
      const { data: publicUrlData } = supabase.storage
        .from('store_assets')
        .getPublicUrl(storagePath)
      slipUrl = publicUrlData?.publicUrl || null
    }
  } catch (storageErr) {
    console.warn('[SlipOK] Slip storage upload error (non-fatal):', storageErr)
  }

  // 9. Calculate New Expiry Date
  const now = new Date()
  const currentEnd = store.trial_ends_at ? new Date(store.trial_ends_at) : now
  const baseDate = currentEnd > now ? currentEnd : now
  const newEnd = new Date(baseDate)
  newEnd.setDate(newEnd.getDate() + pkg.days)

  // 10. Call admin_update_store_plan RPC (Atomic Update + Receipt Generation)
  const { error: rpcError } = await supabase.rpc('admin_update_store_plan', {
    p_store_id: store.id,
    p_plan_status: 'active',
    p_trial_ends_at: newEnd.toISOString(),
    p_action: `paid_${pkg.days}`,
    p_details: {
      previous_end: store.trial_ends_at,
      new_end: newEnd.toISOString(),
      previous_status: store.plan_status,
      new_status: 'active',
      payment_method: 'promptpay_slipok',
      trans_ref: transRef,
      slip_url: slipUrl
    },
    p_amount: expectedAmount,
    p_package_name: pkg.name,
    p_package_days: pkg.days,
    p_note: `PromptPay SlipOK Auto (${transRef})`,
    p_original_amount: isPromo ? pkg.standard : null,
    p_discount_amount: isPromo ? (pkg.standard - pkg.firstTime) : null,
    p_promotion_code: isPromo ? 'FIRST_TIME_50' : null
  })

  if (rpcError) {
    console.error('[SlipOK] RPC Error:', rpcError)
    throw createError({
      statusCode: 500,
      statusMessage: 'RPC Failed',
      message: `ไม่สามารถบันทึกการต่ออายุร้านค้าได้: ${rpcError.message}`
    })
  }

  // 11. Update the newly created billing record with slip data & transRef
  const noteExpected = `PromptPay SlipOK Auto (${transRef})`
  let targetRecord: any = null

  try {
    const { data: recordByNote } = await supabase
      .from('billing_records')
      .select('id, receipt_number')
      .eq('store_id', store.id)
      .eq('note', noteExpected)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    targetRecord = recordByNote

    if (!targetRecord) {
      const { data: fallbackRecord } = await supabase
        .from('billing_records')
        .select('id, receipt_number')
        .eq('store_id', store.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      targetRecord = fallbackRecord
    }

    if (targetRecord?.id) {
      const { error: updateRecErr } = await supabase
        .from('billing_records')
        .update({
          slip_trans_ref: transRef,
          slip_url: slipUrl,
          slip_data: slipData,
          payment_method: 'promptpay_slipok'
        })
        .eq('id', targetRecord.id)

      if (updateRecErr) {
        console.warn('[SlipOK] Failed to update billing record with slip_trans_ref (schema migration 42 might be pending):', updateRecErr.message)
      }
    }
  } catch (recErr) {
    console.warn('[SlipOK] Non-fatal error during billing record update:', recErr)
  }

  return {
    success: true,
    message: 'ตรวจสอบสลิปและต่ออายุแพ็กเกจเรียบร้อยแล้ว!',
    receiptNumber: targetRecord?.receipt_number || '',
    newExpiryDate: newEnd.toISOString(),
    packageName: pkg.name,
    packageDays: pkg.days,
    amount: expectedAmount,
    transRef,
    slipUrl
  }
})
