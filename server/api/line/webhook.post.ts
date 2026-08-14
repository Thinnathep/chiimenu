import { serverSupabaseServiceRole, serverSupabaseClient } from '#supabase/server'

export default defineEventHandler(async (event) => {
    try {
        const body = await readBody(event);
        const events = body?.events || [];
        const config = useRuntimeConfig(event);
        const lineToken = config.lineChannelAccessToken || process.env.LINE_CHANNEL_ACCESS_TOKEN;

        let supabase: any;
        try {
            supabase = await serverSupabaseServiceRole(event);
        } catch {
            supabase = await serverSupabaseClient(event);
        }

        for (const ev of events) {
            const userId = ev?.source?.userId;
            const replyToken = ev?.replyToken;

            if (!userId || !replyToken || !lineToken) continue;

            if (ev.type === 'message' && ev.message?.type === 'text') {
                const rawText = (ev.message.text || '').trim();

                // Extract slug flexibly:
                // Supports: "link bunny", "link /m/bunny", "ผูกร้าน bunny", "https://chiimenu.pages.dev/m/bunny", "bunny"
                let targetSlug = rawText
                    .replace(/^(?:link|ผูก|ผูกร้าน|connect)\s*/i, '')
                    .replace(/^(?:https?:\/\/[^\/]+)?\/?m\//i, '')
                    .trim()
                    .toLowerCase()
                    .replace(/[^a-z0-9-]/g, '');

                if (targetSlug && supabase) {
                    const { data: storeData, error: findError } = await supabase
                        .from('stores')
                        .select('id, name, slug')
                        .eq('slug', targetSlug)
                        .single();

                    if (storeData && !findError) {
                        // Update line_user_id in DB
                        await supabase
                            .from('stores')
                            .update({ line_user_id: userId, updated_at: new Date().toISOString() })
                            .eq('id', storeData.id);

                        // Reply success
                        await replyLineMessage(replyToken, lineToken, [
                            {
                                type: 'text',
                                text: `🎉 เชื่อมต่อสำเร็จ!\n\nร้าน: ${storeData.name} (/m/${storeData.slug})\n\nระบบได้ผูกการแจ้งเตือนกับบัญชี LINE นี้เรียบร้อยแล้ว เมื่อลูกค้าสแกนสั่งอาหาร ออเดอร์จะเด้งเข้าแชทนี้ทันทีครับ 🔔`
                            }
                        ]);
                        continue;
                    } else if (rawText.toLowerCase().startsWith('link') || rawText.startsWith('ผูก')) {
                        // User explicitly typed "link <slug>" but store was not found
                        await replyLineMessage(replyToken, lineToken, [
                            {
                                type: 'text',
                                text: `⚠️ ไม่พบร้านค้าที่มีลิงก์ "${targetSlug}" ในระบบ ChiiMenu\n\nกรุณาตรวจสอบชื่อลิงก์ร้านของคุณในเมนู "ตั้งค่าร้านค้า" อีกครั้งครับ`
                            }
                        ]);
                        continue;
                    }
                }

                // Default reply: Give them their real LINE User ID and clear instructions
                await replyLineMessage(replyToken, lineToken, [
                    {
                        type: 'text',
                        text: `👋 สวัสดีครับ! ยินดีต้อนรับสู่ ChiiMenu Alerts 🔔\n\n🆔 LINE User ID ของคุณคือ:\n${userId}\n\n💡 วิธีผูกร้านค้ารับออเดอร์ทันที:\nพิมพ์:\nlink <ลิงก์ร้านของคุณ>\n(เช่น link ${targetSlug || 'pataew-padthai'})\n\nหรือนำรหัส User ID ด้านบนไปกรอกในหน้า "ตั้งค่าร้านค้า" ในระบบ ChiiMenu ได้เลยครับ!`
                    }
                ]);
            } else if (ev.type === 'follow') {
                // When merchant adds friend to the bot
                await replyLineMessage(replyToken, lineToken, [
                    {
                        type: 'text',
                        text: `👋 ยินดีต้อนรับสู่ ChiiMenu Alerts 🔔\n\n🆔 LINE User ID ของคุณคือ:\n${userId}\n\n👉 วิธีผูกร้านค้ารับออเดอร์:\nพิมพ์:\nlink <ชื่อลิงก์ร้าน>\n(เช่น link pataew-padthai)\nเพื่อผูกร้านค้าอัตโนมัติได้ทันทีครับ!`
                    }
                ]);
            }
        }

        return { status: 'ok' };
    } catch (err: any) {
        console.error('[LINE WEBHOOK ERROR]', err);
        return { status: 'error', message: err?.message };
    }
});

async function replyLineMessage(replyToken: string, channelAccessToken: string, messages: any[]) {
    try {
        await $fetch('https://api.line.me/v2/bot/message/reply', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${channelAccessToken}`
            },
            body: {
                replyToken,
                messages
            }
        });
    } catch (e: any) {
        console.error('[LINE REPLY ERROR]', e?.data || e?.message || e);
    }
}
