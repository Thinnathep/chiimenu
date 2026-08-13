import { serverSupabaseServiceRole } from '#supabase/server'

// Simple in-memory rate limit map (IP -> count & reset time)
// In a real production environment, use Redis or Supabase for rate limiting.
const rateLimitMap = new Map<string, { count: number, resetAt: number }>();
const MAX_REQUESTS = 5;
const WINDOW_MS = 5 * 60 * 1000; // 5 minutes

export default defineEventHandler(async (event) => {
    // 1. Rate Limiting Check
    const ip = getRequestIP(event) || 'unknown';
    const now = Date.now();
    
    if (ip !== 'unknown') {
        const rateRecord = rateLimitMap.get(ip);
        if (rateRecord) {
            if (now > rateRecord.resetAt) {
                // Reset window
                rateLimitMap.set(ip, { count: 1, resetAt: now + WINDOW_MS });
            } else {
                if (rateRecord.count >= MAX_REQUESTS) {
                    throw createError({
                        statusCode: 429,
                        statusMessage: 'Too Many Requests',
                        message: 'You have sent too many orders. Please try again later.'
                    });
                }
                rateRecord.count++;
            }
        } else {
            rateLimitMap.set(ip, { count: 1, resetAt: now + WINDOW_MS });
        }
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

    const supabase = await serverSupabaseServiceRole(event);

    // 3. Get Store Info (to check line_user_id)
    const { data: store, error: storeError } = await supabase
        .from('stores')
        .select('name_en, line_user_id')
        .eq('id', storeId)
        .single() as any;

    if (storeError || !store) {
        throw createError({
            statusCode: 404,
            statusMessage: 'Not Found',
            message: 'Store not found.'
        });
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
            message: 'Failed to save order.'
        });
    }

    // 5. Send to LINE OA (Mock for now until we have real credentials)
    if (store.line_user_id) {
        try {
            // Generate Message Text
            let messageText = `🔔 ออเดอร์ใหม่เข้า!\nโต๊ะ: ${tableNo}\n\n`;
            
            cart.forEach((item: any, index: number) => {
                messageText += `${index + 1}. ${item.menuItem.name_th} (${item.menuItem.name_en})\n`;
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
                messageText += '\n';
            });

            // Call LINE Messaging API
            if (process.env.LINE_CHANNEL_ACCESS_TOKEN) {
                await $fetch('https://api.line.me/v2/bot/message/push', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`
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
                console.log(`To: ${store.line_user_id}`);
                console.log(`Message: \n${messageText}`);
                console.log('------------------------------');
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
    } else {
        console.warn(`Store ${storeId} does not have a line_user_id connected.`);
    }

    return {
        success: true,
        orderId: order.id,
        message: 'Order placed successfully.'
    };
});
