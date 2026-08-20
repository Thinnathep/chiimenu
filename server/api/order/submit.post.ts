import { serverSupabaseServiceRole, serverSupabaseClient } from '#supabase/server'
import { createClient } from '@supabase/supabase-js'

const MAX_REQUESTS = 5;
const WINDOW_MS = 5 * 60 * 1000; // 5 minutes

export default defineEventHandler(async (event) => {
    const config = useRuntimeConfig(event)
    const rawUrl = (config.public as any)?.supabaseUrl || (config.public as any)?.supabase?.url || process.env.SUPABASE_URL || process.env.NUXT_PUBLIC_SUPABASE_URL || ''
    const secretKey = (config as any)?.supabase?.secretKey || process.env.SUPABASE_SECRET_KEY || process.env.NUXT_SUPABASE_SECRET_KEY || ''

    let supabase: any;
    if (secretKey && rawUrl) {
        supabase = createClient(String(rawUrl), String(secretKey))
    } else {
        try {
            supabase = await serverSupabaseServiceRole(event);
        } catch {
            supabase = await serverSupabaseClient(event);
        }
    }

    // 1. Rate Limiting Check (Safe & Non-blocking)
    try {
        const ip = getRequestIP(event) || 'unknown';
        const now = Date.now();
        
        if (ip !== 'unknown' && supabase) {
            const { data } = await (supabase as any)
                .from('rate_limits')
                .select('*')
                .eq('ip', ip)
                .single();
            
            const rateRecord = data as any;

            if (rateRecord) {
                if (now > rateRecord.reset_at) {
                    await (supabase as any).from('rate_limits').update({ request_count: 1, reset_at: now + WINDOW_MS }).eq('ip', ip);
                } else {
                    if (rateRecord.request_count >= MAX_REQUESTS) {
                        throw createError({
                            statusCode: 429,
                            statusMessage: 'Too Many Requests',
                            message: 'You have sent too many orders. Please try again later.'
                        });
                    }
                    await (supabase as any).from('rate_limits').update({ request_count: rateRecord.request_count + 1 }).eq('ip', ip);
                }
            } else {
                await (supabase as any).from('rate_limits').insert({ ip, request_count: 1, reset_at: now + WINDOW_MS });
            }
        }
    } catch (rateErr: any) {
        if (rateErr?.statusCode === 429) throw rateErr;
    }

    // 2. Parse Body
    const body = await readBody(event);
    const { storeId, tableNo, cart } = body;

    if (!storeId || !tableNo || !cart || cart.length === 0) {
        throw createError({
            statusCode: 400,
            statusMessage: 'Bad Request',
            message: 'Missing required fields: storeId, tableNo, or cart is empty.'
        });
    }

    try {
        // 3. Get Store Info (to check line_user_id and plan status)
        const { data: store, error: storeError } = await supabase
            .from('stores')
            .select('name, name_en, slug, line_user_id, plan_status, trial_ends_at')
            .eq('id', storeId)
            .single() as any;

        if (storeError || !store) {
            throw createError({
                statusCode: 404,
                statusMessage: 'Not Found',
                message: 'Store not found.'
            });
        }

        console.log(`[ORDER SUBMIT] Store: "${store.name}" (/m/${store.slug}) | Target LINE ID in DB: "${store.line_user_id}"`);

        // 3b. Check plan expiration server-side (defence-in-depth — do NOT rely on UI alone)
        if (store.trial_ends_at) {
            const planEnd = new Date(store.trial_ends_at).getTime();
            if (planEnd < Date.now()) {
                throw createError({
                    statusCode: 403,
                    statusMessage: 'Forbidden',
                    message: 'This store\'s plan has expired. Please contact the store owner.'
                });
            }
        }

        // 4. Save to Database (Table `orders`)
        let order: any = null;
        const { data: insertedOrder, error: insertError } = await supabase
            .from('orders')
            .insert({
                store_id: storeId,
                table_no: tableNo,
                items: cart,
                status: 'pending',
                line_notified: false
            } as any)
            .select()
            .single() as any;

        if (!insertError && insertedOrder) {
            order = insertedOrder;
        } else {
            // Try calling Security Definer RPC submit_customer_order
            const { data: rpcOrder, error: rpcError } = await supabase.rpc('submit_customer_order', {
                p_store_id: storeId,
                p_table_no: tableNo,
                p_items: cart
            });
            if (!rpcError && rpcOrder) {
                order = rpcOrder;
            } else {
                console.error('Failed to insert order via table & RPC:', insertError, rpcError);
                throw createError({
                    statusCode: 500,
                    statusMessage: 'Internal Server Error',
                    message: 'Failed to save order: ' + (insertError?.message || rpcError?.message || 'Database insert error')
                });
            }
        }

        // 5. Send to LINE OA
        if (store.line_user_id && store.line_user_id.trim()) {
            try {
                // Format Time in Thai format
                const nowThai = new Date().toLocaleString('th-TH', { 
                    timeZone: 'Asia/Bangkok',
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                });

                let messageText = `🔔 มีออเดอร์ใหม่เข้า!\n`;
                messageText += `📍 โต๊ะ: ${tableNo}\n`;
                messageText += `⏰ เวลา: ${nowThai} น.\n`;
                messageText += `--------------------------------\n`;
                
                let grandTotal = 0;
                cart.forEach((item: any, index: number) => {
                    const quantity = Number(item.quantity) || 1;
                    const unitPrice = Number(item.unitPrice !== undefined ? item.unitPrice : (item.price !== undefined ? item.price : (item.menuItem?.price || 0)));
                    const itemTotal = unitPrice * quantity;
                    grandTotal += itemTotal;
                    
                    const nameTh = item.menuItem?.name_th || item.name_th || 'เมนูอาหาร';
                    const nameEn = item.menuItem?.name_en || item.name_en || '';
                    
                    messageText += `${index + 1}. ${quantity}x ${nameTh}${nameEn ? ` (${nameEn})` : ''}\n`;
                    
                    if (item.spiceLevel !== undefined && item.spiceLevel !== null && item.spiceLevel !== 0) {
                        const spiceMap: Record<number, string> = {
                            1: 'ไม่เผ็ด (Mild)',
                            2: 'เผ็ดน้อย (Low)',
                            3: 'เผ็ดกลาง (Medium)',
                            4: 'เผ็ดมาก (Hot)'
                        };
                        messageText += `   🌶️ ความเผ็ด: ${spiceMap[Number(item.spiceLevel)] || `ระดับ ${item.spiceLevel}`}\n`;
                    }
                    
                    if (item.addonNames && Array.isArray(item.addonNames) && item.addonNames.length > 0) {
                        messageText += `   ➕ ตัวเลือกเสริม: ${item.addonNames.join(', ')}\n`;
                    } else if (item.selectedAddons && Object.keys(item.selectedAddons).length > 0) {
                        const addonList = Object.values(item.selectedAddons).join(', ');
                        messageText += `   ➕ ตัวเลือกเสริม: ${addonList}\n`;
                    }
                    
                    if (item.note && item.note.trim()) {
                        messageText += `   💬 โน้ต: ${item.note.trim()}\n`;
                    }
                    
                    messageText += `   💰 ฿${itemTotal.toLocaleString('th-TH')}\n\n`;
                });
                
                messageText += `--------------------------------\n`;
                messageText += `💵 ยอดรวมทั้งหมด: ฿${grandTotal.toLocaleString('th-TH')}`;

                // Call LINE Messaging API
                const config = useRuntimeConfig(event);
                const lineToken = config.lineChannelAccessToken || process.env.LINE_CHANNEL_ACCESS_TOKEN;
                
                if (lineToken) {
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
                    console.log(`[LINE NOTIFICATION SUCCESS] Sent to ${store.line_user_id}`);
                } else {
                    console.warn('[LINE NOTIFICATION WARN] LINE_CHANNEL_ACCESS_TOKEN is missing');
                }

                // Update line_notified status
                await (supabase as any)
                    .from('orders')
                    .update({ line_notified: true })
                    .eq('id', order.id);

            } catch (lineError: any) {
                console.warn(`[LINE NOTIFICATION] Could not deliver LINE push message for store ${storeId} (User ID: ${store.line_user_id}). Error:`, lineError?.data?.message || lineError?.message || lineError);
                // Order is already saved successfully in database.
            }
        } else {
            console.log(`[LINE NOTIFICATION INFO] Store ${storeId} has not configured line_user_id.`);
        }

        return {
            success: true,
            orderId: order.id,
            message: 'Order placed successfully.'
        };
    } catch (err: any) {
        console.error("Submit API Error: ", err);
        throw createError({
            statusCode: 500,
            statusMessage: 'Internal Server Error',
            message: err.message || String(err)
        });
    }
});
