import { serverSupabaseServiceRole, serverSupabaseClient } from '#supabase/server'
import { createClient } from '@supabase/supabase-js'

export default defineEventHandler(async (event) => {
    const shortCode = getRouterParam(event, 'shortCode')

    if (!shortCode) {
        throw createError({
            statusCode: 400,
            statusMessage: 'Missing short code'
        })
    }

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

    if (!supabase) {
        throw createError({
            statusCode: 500,
            statusMessage: 'Supabase service client initialization failed'
        })
    }

    let targetStoreId: string | null = null
    let qrData: any = null

    // 1a. Try to match from qr_codes table (short_code)
    const { data: qrMatch } = await supabase
        .from('qr_codes')
        .select('store_id, id, table_identifier, label, short_code')
        .eq('short_code', shortCode)
        .eq('is_active', true)
        .maybeSingle()

    if (qrMatch?.store_id) {
        targetStoreId = qrMatch.store_id
        qrData = qrMatch
    } else {
        // 1b. Fallback: Try by store slug
        const { data: storeBySlug } = await supabase
            .from('stores')
            .select('id, is_active')
            .eq('slug', shortCode)
            .maybeSingle()

        if (storeBySlug?.id) {
            targetStoreId = storeBySlug.id
        } else {
            // 1c. Fallback: Try by store ID directly
            const { data: storeById } = await supabase
                .from('stores')
                .select('id, is_active')
                .eq('id', shortCode)
                .maybeSingle()

            if (storeById?.id) {
                targetStoreId = storeById.id
            }
        }
    }

    if (!targetStoreId) {
        return {
            notFound: true,
            message: 'Store not found'
        }
    }

    // 2. Fetch Store, Categories, and Menu Items in parallel via service role
    const [storeRes, catRes, itemRes] = await Promise.all([
        supabase
            .from('stores')
            .select('*')
            .eq('id', targetStoreId)
            .single(),
        supabase
            .from('menu_categories')
            .select('*')
            .eq('store_id', targetStoreId)
            .eq('is_active', true)
            .order('sort_order'),
        supabase
            .from('menu_items')
            .select(`
                *,
                menu_item_allergens (
                    allergens (*)
                ),
                menu_item_customizations (
                    customization_groups (
                        *,
                        customization_options (*)
                    )
                )
            `)
            .eq('store_id', targetStoreId)
            .eq('is_available', true)
            .order('sort_order')
    ])

    const storeData = storeRes.data
    if (!storeData) {
        return {
            notFound: true,
            message: 'Store details not found'
        }
    }

    // Check if store is closed or expired
    let isStoreClosed = storeData.is_active === false
    let isStoreLocked = false

    if (storeData.trial_ends_at) {
        const planEnd = new Date(storeData.trial_ends_at).getTime()
        const now = Date.now()
        if (planEnd < now) {
            isStoreLocked = true
        }
    }

    return {
        success: true,
        store: storeData,
        categories: catRes.data || [],
        menuItems: itemRes.data || [],
        qrData,
        isStoreClosed,
        isStoreLocked
    }
})
