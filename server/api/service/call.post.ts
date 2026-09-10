import { serverSupabaseServiceRole, serverSupabaseClient } from '#supabase/server'
import { createClient } from '@supabase/supabase-js'

const MAX_SERVICE_REQUESTS = 10;
const WINDOW_MS = 5 * 60 * 1000; // 5 minutes

function sanitizeText(input: any, maxLength = 100): string {
    if (typeof input !== 'string') return '';
    return input
        .replace(/<[^>]*>?/gm, '')
        .replace(/[\u0000-\u001F\u007F-\u009F]/g, '')
        .trim()
        .slice(0, maxLength);
}

const SERVICE_MAP: Record<string, { th: string; en: string; zh: string; icon: string }> = {
    staff: { th: 'เรียกพนักงาน', en: 'Call Staff', zh: '呼叫服务员', icon: '🙋‍♂️' },
    bill: { th: 'ขอเช็คบิล', en: 'Request Bill', zh: '请求结账', icon: '🧾' },
    utensils: { th: 'ขอช้อนส้อม / ทิชชู่', en: 'Utensils / Napkin', zh: '加餐具/纸巾', icon: '🥢' },
    water: { th: 'ขอน้ำดื่ม / น้ำแข็ง', en: 'Water / Ice', zh: '加冰/水', icon: '🧊' }
};

export default defineEventHandler(async (event) => {
    const config = useRuntimeConfig(event)
    const rawUrl = (config.public as any)?.supabaseUrl || (config.public as any)?.supabase?.url || process.env.SUPABASE_URL || process.env.NUXT_PUBLIC_SUPABASE_URL || ''
    const secretKey = (config as any)?.supabaseServiceKey || (config as any)?.supabase?.secretKey || process.env.SUPABASE_SERVICE_KEY || process.env.NUXT_SUPABASE_SECRET_KEY || process.env.SUPABASE_SECRET_KEY || ''

    let supabase: any;
    if (secretKey && rawUrl) {
        supabase = createClient(String(rawUrl), String(secretKey), {
            auth: { persistSession: false, autoRefreshToken: false }
        })
    } else {
        try {
            supabase = await serverSupabaseServiceRole(event);
        } catch {
            supabase = await serverSupabaseClient(event);
        }
    }

    // 1. Parse and Validate Body
    const body = await readBody(event);
    const { storeId, tableNo, serviceType } = body || {};

    if (!storeId) {
        throw createError({
            statusCode: 400,
            statusMessage: 'Bad Request',
            message: 'Missing required field: storeId'
        });
    }

    const cleanTableNo = sanitizeText(tableNo, 50) || 'ลูกค้าหน้าร้าน';
    const cleanType = String(serviceType || 'staff').toLowerCase();
    const serviceInfo = SERVICE_MAP[cleanType] || { th: 'เรียกพนักงาน', en: 'Call Staff', zh: '呼叫服务员', icon: '🔔' };

    // 2. Rate Limiting Check (10 service calls per table / 5 mins)
    try {
        const cfIp = getHeader(event, 'cf-connecting-ip');
        const realIp = getHeader(event, 'x-real-ip');
        const forwardedFor = getHeader(event, 'x-forwarded-for')?.split(',')[0]?.trim();
        const ip = cfIp || realIp || forwardedFor || getRequestIP(event) || 'unknown';
        const rateKey = `${ip}:${storeId}:${cleanTableNo}:service`;
        const now = Date.now();

        if (ip !== 'unknown' && supabase) {
            const { data: rateRecord } = await (supabase as any)
                .from('rate_limits')
                .select('*')
                .eq('ip', rateKey)
                .maybeSingle();

            if (rateRecord) {
                if (now > rateRecord.reset_at) {
                    await (supabase as any).from('rate_limits').update({ request_count: 1, reset_at: now + WINDOW_MS }).eq('ip', rateKey);
                } else {
                    if (rateRecord.request_count >= MAX_SERVICE_REQUESTS) {
                        throw createError({
                            statusCode: 429,
                            statusMessage: 'Too Many Requests',
                            message: 'คุณส่งคำขอบริการถี่เกินไป กรุณารอสักครู่ (Please wait before sending another request.)'
                        });
                    }
                    await (supabase as any).from('rate_limits').update({ request_count: rateRecord.request_count + 1 }).eq('ip', rateKey);
                }
            } else {
                await (supabase as any).from('rate_limits').upsert({ ip: rateKey, request_count: 1, reset_at: now + WINDOW_MS }, { onConflict: 'ip' });
            }
        }
    } catch (rateErr: any) {
        if (rateErr?.statusCode === 429) throw rateErr;
    }

    // 3. Get Store Info
    const { data: store, error: storeError } = await supabase
        .from('stores')
        .select('id, name, line_user_id, is_active, trial_ends_at')
        .eq('id', storeId)
        .single() as any;

    if (storeError || !store) {
        throw createError({
            statusCode: 404,
            statusMessage: 'Not Found',
            message: 'Store not found'
        });
    }

    if (store.is_active === false) {
        throw createError({
            statusCode: 403,
            statusMessage: 'Forbidden',
            message: 'ขณะนี้ร้านค้าปิดให้บริการชั่วคราว (Store is closed)'
        });
    }

    const nowThai = new Date().toLocaleString('th-TH', { 
        timeZone: 'Asia/Bangkok',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });

    // 4. Send LINE Push Message to merchant (Thai / English / Chinese)
    let lineSent = false;
    if (store.line_user_id && store.line_user_id.trim()) {
        try {
            const lineToken = config.lineChannelAccessToken || process.env.LINE_CHANNEL_ACCESS_TOKEN;
            if (lineToken) {
                const messageText = `🔔 โต๊ะ ${cleanTableNo} เรียกบริการ!\n\n`
                    + `${serviceInfo.icon} บริการ: ${serviceInfo.th} / ${serviceInfo.en} / ${serviceInfo.zh}\n`
                    + `📍 โต๊ะ: ${cleanTableNo}\n`
                    + `⏰ เวลา: ${nowThai} น.\n`
                    + `🏪 ร้าน: ${store.name}`;

                await $fetch('https://api.line.me/v2/bot/message/push', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${lineToken}`
                    },
                    body: {
                        to: store.line_user_id.trim(),
                        messages: [
                            {
                                type: 'text',
                                text: messageText
                            }
                        ]
                    }
                });
                lineSent = true;
                console.log(`[SERVICE CALL LINE SUCCESS] Sent service call for table ${cleanTableNo} to ${store.line_user_id}`);
            }
        } catch (lineErr: any) {
            console.warn(`[SERVICE CALL LINE WARN] Store ${storeId}:`, lineErr?.data?.message || lineErr?.message || lineErr);
        }
    }

    // 5. Broadcast Realtime Event & Log to usage_logs
    try {
        // Broadcast to realtime channel for dashboard
        const channel = (supabase as any).channel(`store-events-${storeId}`);
        await channel.send({
            type: 'broadcast',
            event: 'service_request',
            payload: {
                tableNo: cleanTableNo,
                serviceType: cleanType,
                serviceName: serviceInfo.th,
                serviceNameEn: serviceInfo.en,
                serviceNameZh: serviceInfo.zh,
                icon: serviceInfo.icon,
                time: nowThai
            }
        });
    } catch (_) {
        // Realtime broadcast is non-fatal
    }

    try {
        await (supabase as any).from('usage_logs').insert({
            store_id: storeId,
            event_type: 'service_request',
            metadata: {
                table_no: cleanTableNo,
                service_type: cleanType,
                service_title: serviceInfo.th,
                requested_at: new Date().toISOString()
            }
        });
    } catch (_) {
        // Log insertion is non-fatal
    }

    // 6. Trigger Web Push Notification to Store Devices
    try {
        const expectedSecret = config.webhookSecret || process.env.WEBHOOK_SECRET || 'chiimenu_push_webhook_secret_2026';
        const fetcher: any = (event as any).$fetch || $fetch;
        await fetcher('/api/push/notify', {
            method: 'POST',
            body: {
                storeId,
                title: `${serviceInfo.icon} โต๊ะ ${cleanTableNo}: ${serviceInfo.th}`,
                message: `โต๊ะ ${cleanTableNo} ต้องการ "${serviceInfo.th} (${serviceInfo.zh})" - ${nowThai} น.`,
                orderId: `svc-${Date.now()}`,
                secret: expectedSecret
            }
        });
        console.log(`[SERVICE CALL PUSH SUCCESS] Sent push for table ${cleanTableNo}`);
    } catch (pushErr: any) {
        console.warn(`[SERVICE CALL PUSH WARN] Store ${storeId}:`, pushErr?.data?.message || pushErr?.message || pushErr);
    }

    return {
        success: true,
        service: serviceInfo.th,
        table: cleanTableNo,
        lineSent,
        message: 'ส่งคำขอบริการเรียบร้อยแล้ว'
    };
});
