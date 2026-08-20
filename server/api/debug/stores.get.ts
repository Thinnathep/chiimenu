import { serverSupabaseServiceRole, serverSupabaseClient, serverSupabaseUser } from '#supabase/server'

export default defineEventHandler(async (event) => {
    // 🛡️ Production Security Guard: Debug endpoint is blocked in production unless called by an authenticated Admin
    if (process.env.NODE_ENV === 'production' && !import.meta.dev) {
        let user = null
        try {
            user = await serverSupabaseUser(event)
        } catch {}

        const config = useRuntimeConfig(event)
        const adminEmails = (config.public?.adminEmails || process.env.ADMIN_EMAILS || '')
            .split(',')
            .map((e: string) => e.trim().toLowerCase())
            .filter(Boolean)

        const isEmailAdmin = user?.email ? adminEmails.includes(user.email.toLowerCase()) : false

        if (!user || !isEmailAdmin) {
            throw createError({
                statusCode: 404,
                statusMessage: 'Not Found'
            })
        }
    }

    let supabase: any;
    try {
        supabase = await serverSupabaseServiceRole(event);
    } catch {
        supabase = await serverSupabaseClient(event);
    }

    if (!supabase) {
        return { error: 'Supabase client not initialized' };
    }

    // 1. Get all stores
    const { data: stores, error: storesErr } = await supabase
        .from('stores')
        .select('id, name, slug, line_user_id, plan_status, trial_ends_at')
        .order('created_at', { ascending: false });

    // 2. Get last 5 orders
    const { data: orders, error: ordersErr } = await supabase
        .from('orders')
        .select('id, store_id, table_no, status, line_notified, created_at, stores(name, slug, line_user_id)')
        .order('created_at', { ascending: false })
        .limit(5);

    return {
        stores,
        recentOrders: orders,
        errors: { storesErr, ordersErr }
    };
});
