import { serverSupabaseServiceRole } from '#supabase/server'

const MAX_REQUESTS = 5;
const WINDOW_MS = 5 * 60 * 1000; // 5 minutes

export default defineEventHandler(async (event) => {
    // We need service role for rate limits as it bypasses RLS
    const supabase = await serverSupabaseServiceRole(event)

    // 1. Rate Limiting Check
    const ip = getRequestIP(event) || 'unknown';
    const now = Date.now();
    
    if (ip !== 'unknown') {
        const { data } = await (supabase as any)
            .from('rate_limits')
            .select('*')
            .eq('ip', ip)
            .single();
        
        const rateRecord = data as any;

        if (rateRecord) {
            if (now > rateRecord.reset_at) {
                // Reset window
                await (supabase as any).from('rate_limits').update({ request_count: 1, reset_at: now + WINDOW_MS }).eq('ip', ip);
            } else {
                if (rateRecord.request_count >= MAX_REQUESTS) {
                    throw createError({
                        statusCode: 429,
                        statusMessage: 'Too Many Requests',
                        message: 'You have sent too many orders. Please try again later.'
                    })
                }
                // Increment count
                await (supabase as any).from('rate_limits').update({ request_count: rateRecord.request_count + 1 }).eq('ip', ip);
            }
        } else {
            // First request from this IP
            await (supabase as any).from('rate_limits').insert({ ip, request_count: 1, reset_at: now + WINDOW_MS });
        }
    };

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
        const supabase = await serverSupabaseServiceRole(event);

        // 3. Get Store Info (to check line_user_id and plan status)
        const { data: store, error: storeError } = await supabase
            .from('stores')
            .select('name_en, line_user_id, plan_status, trial_ends_at')
            .eq('id', storeId)
            .single() as any;

        if (storeError || !store) {
            throw createError({
                statusCode: 404,
                statusMessage: 'Not Found',
                message: 'Store not found.'
            });
        }

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
        const { data: order, error: insertError } = await supabase
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

        if (insertError) {
            console.error('Failed to insert order:', insertError);
            throw createError({
                statusCode: 500,
                statusMessage: 'Internal Server Error',
                message: 'Failed to save order: ' + JSON.stringify(insertError)
            });
        }

        // 5. Send to LINE OA (Mock for now until we have real credentials)
        if (store.line_user_id) {
            try {
                // Generate Message Text
                let messageText = `🔔 ออเดอร์ใหม่เข้า!\nโต๊ะ: ${tableNo}\n\n`;
                
                let grandTotal = 0;
                cart.forEach((item: any, index: number) => {
                    const quantity = item.quantity || 1;
                    const itemTotal = item.price * quantity;
                    grandTotal += itemTotal;
                    
                    messageText += `${index + 1}. ${quantity}x ${item.menuItem.name_th} (${item.menuItem.name_en})\n`;
                    if (item.spiceLevel !== null) {
                        messageText += `   🌶️ ระดับความเผ็ด: ${item.spiceLevel}/4\n`;
                    }
                    if (item.selectedAddons && Object.keys(item.selectedAddons).length > 0) {
                        messageText += `   ➕ ตัวเลือกเสริม:\n`;
                        for (const addonId in item.selectedAddons) {
                            const addonValue = item.selectedAddons[addonId];
                            messageText += `      - ${addonValue}\n`;
                        }
                    }
                    messageText += `   💰 ราคา: ฿${itemTotal}\n\n`;
                });
                
                messageText += `💵 ยอดรวมทั้งหมด: ฿${grandTotal}\n`;

                // Call LINE Messaging API
                const lineToken = process.env.LINE_CHANNEL_ACCESS_TOKEN || (event.context.cloudflare?.env?.LINE_CHANNEL_ACCESS_TOKEN);
                if (lineToken) {
                    await $fetch('https://api.line.me/v2/bot/message/push', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${lineToken}`
                        },
                        body: {
                            to: store.line_user_id,
                            messages: [
                                {
                                    type: 'text',
                                    text: messageText
                                }
                            ]
                        }
                    });
                    console.log(`LINE Notification sent to ${store.line_user_id}`);
                } else {
                    console.log('--- MOCK LINE PUSH MESSAGE (No Token) ---');
                }

                // Update line_notified status
                await (supabase as any)
                    .from('orders')
                    .update({ line_notified: true })
                    .eq('id', order.id);

            } catch (lineError: any) {
                console.error(`[CRITICAL] LINE API failed for store ${storeId}. The order is saved in DB but notification failed. Error:`, lineError?.message || lineError);
                
                // Insert into error_logs so we can track this down later
                await (supabase as any).from('error_logs').insert({
                    store_id: storeId,
                    error_message: lineError?.message || String(lineError),
                    context: {
                        order_id: order.id,
                        line_user_id: store.line_user_id,
                        raw_error: lineError
                    }
                });
                // We don't throw an error here because the tourist UI is fire-and-forget.
            }
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
