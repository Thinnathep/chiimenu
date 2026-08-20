import { serverSupabaseServiceRole, serverSupabaseClient, serverSupabaseUser } from '#supabase/server'
import { createClient } from '@supabase/supabase-js'

interface DailySale {
    sale_date: string;
    display_date: string;
    sales: number;
    order_count: number;
}

interface TopItem {
    name_th: string;
    name_en: string;
    name_zh: string;
    quantity_sold: number;
    total_sales: number;
}

export default defineEventHandler(async (event) => {
    const config = useRuntimeConfig(event)
    const rawUrl = (config.public as any)?.supabaseUrl || (config.public as any)?.supabase?.url || process.env.SUPABASE_URL || process.env.NUXT_PUBLIC_SUPABASE_URL || ''
    const rawKey = (config.public as any)?.supabaseKey || (config.public as any)?.supabase?.key || process.env.SUPABASE_KEY || process.env.NUXT_PUBLIC_SUPABASE_KEY || ''
    const supabaseUrl = String(rawUrl)
    const supabaseKey = String(rawKey)

    let client: any
    try {
        client = await serverSupabaseClient(event)
    } catch (e) {
        // Fallback
    }

    let serviceRole: any
    try {
        serviceRole = await serverSupabaseServiceRole(event)
    } catch {
        serviceRole = client
    }

    let db = serviceRole || client
    let user = await serverSupabaseUser(event)

    const authHeader = getHeader(event, 'authorization')
    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.replace('Bearer ', '').trim()
        if (token && supabaseUrl && supabaseKey) {
            const tokenClient = createClient(supabaseUrl, supabaseKey, {
                global: { headers: { Authorization: `Bearer ${token}` } }
            })
            try {
                const { data: userData } = await tokenClient.auth.getUser(token)
                if (userData?.user) {
                    user = userData.user as any
                    db = tokenClient
                }
            } catch (e) {
                // Ignore token decode error
            }
        }
    }

    if (!user) {
        throw createError({
            statusCode: 401,
            statusMessage: 'Unauthorized',
            message: 'You must be logged in to view analytics.'
        })
    }

    const query = getQuery(event)
    const period = (query.period as string) || 'today' // 'today' | '7days' | 'month'
    const requestedStoreId = query.storeId as string | undefined

    // 1. Determine if current user is Admin
    const adminEmails = (config.public?.adminEmails || process.env.ADMIN_EMAILS || '')
        .split(',')
        .map((e: string) => e.trim().toLowerCase())
        .filter(Boolean)

    const isEmailAdmin = user.email ? adminEmails.includes(user.email.toLowerCase()) : false

    let isDbAdmin = false
    try {
        const { data: adminRecord } = await db
            .from('admins')
            .select('id')
            .eq('id', user.id)
            .maybeSingle()
        if (adminRecord?.id) isDbAdmin = true
    } catch (e) {
        // ignore
    }

    if (!isDbAdmin) {
        try {
            const { data: profileRecord } = await db
                .from('profiles')
                .select('role')
                .eq('id', user.id)
                .maybeSingle()
            if (profileRecord?.role === 'admin') isDbAdmin = true
        } catch (e) {
            // ignore
        }
    }

    const isAdmin = isEmailAdmin || isDbAdmin

    // 2. Resolve Store and verify access
    let targetStore: any = null

    if (requestedStoreId) {
        const { data: store, error: storeError } = await db
            .from('stores')
            .select('id, name, owner_id')
            .eq('id', requestedStoreId)
            .maybeSingle()

        if (storeError) {
            console.error('[ANALYTICS] Error fetching store by ID:', storeError)
        }

        if (store) {
            // If user is not the owner and not an admin, deny access
            if (store.owner_id !== user.id && !isAdmin) {
                console.warn(`[ANALYTICS] 403 Forbidden: User ${user.id} (${user.email}) attempted to access store ${store.id} owned by ${store.owner_id}`)
                throw createError({
                    statusCode: 403,
                    statusMessage: 'Forbidden',
                    message: 'You do not have permission to view analytics for this store.'
                })
            }
            targetStore = store
        }
    }

    if (!targetStore) {
        // Find store by owner_id
        const { data: ownerStores } = await db
            .from('stores')
            .select('id, name, owner_id')
            .eq('owner_id', user.id)
            .order('created_at', { ascending: false })
            .limit(1)

        if (ownerStores && ownerStores.length > 0) {
            targetStore = ownerStores[0]
        }
    }

    if (!targetStore) {
        throw createError({
            statusCode: 404,
            statusMessage: 'Not Found',
            message: 'Store not found.'
        })
    }

    const storeId = targetStore.id

    // 3. Try calling Database RPC `get_merchant_analytics`
    if (db) {
        try {
            const { data: rpcData, error: rpcError } = await db.rpc('get_merchant_analytics', {
                p_store_id: storeId,
                p_period: period
            })

            if (!rpcError && rpcData) {
                return {
                    success: true,
                    store: { id: targetStore.id, name: targetStore.name },
                    data: rpcData
                }
            }
        } catch (rpcErr) {
            console.warn('[ANALYTICS] RPC call failed, using server-side aggregation:', rpcErr)
        }
    }

    // 4. Server-Side Aggregation (Robust Fallback)
    const formatter = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok' })
    const bkkDateParts = formatter.formatToParts(new Date())
    const bkkYear = Number(bkkDateParts.find(p => p.type === 'year')?.value) || new Date().getFullYear()
    const bkkMonth = Number(bkkDateParts.find(p => p.type === 'month')?.value) || (new Date().getMonth() + 1)
    const bkkDay = Number(bkkDateParts.find(p => p.type === 'day')?.value) || new Date().getDate()
    const bkkDateStr = `${bkkYear}-${String(bkkMonth).padStart(2, '0')}-${String(bkkDay).padStart(2, '0')}`

    const todayStart = new Date(`${bkkDateStr}T00:00:00+07:00`)

    let startDate: Date
    let endDate: Date

    if (period === 'today') {
        startDate = todayStart
        endDate = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000)
    } else if (period === '7days') {
        startDate = new Date(todayStart.getTime() - 6 * 24 * 60 * 60 * 1000)
        endDate = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000)
    } else if (period === 'month') {
        const mm = String(bkkMonth).padStart(2, '0')
        startDate = new Date(`${bkkYear}-${mm}-01T00:00:00+07:00`)
        const nextMonth = bkkMonth === 12 ? 1 : bkkMonth + 1
        const nextYear = bkkMonth === 12 ? bkkYear + 1 : bkkYear
        const nextMm = String(nextMonth).padStart(2, '0')
        endDate = new Date(`${nextYear}-${nextMm}-01T00:00:00+07:00`)
    } else if (period === 'year') {
        startDate = new Date(`${bkkYear}-01-01T00:00:00+07:00`)
        endDate = new Date(`${bkkYear + 1}-01-01T00:00:00+07:00`)
    } else {
        startDate = new Date(todayStart.getTime() - 6 * 24 * 60 * 60 * 1000)
        endDate = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000)
    }

    // Fetch orders within date range for this store
    const { data: rawOrders, error: ordersError } = await db
        .from('orders')
        .select('id, table_no, status, items, created_at')
        .eq('store_id', storeId)
        .gte('created_at', startDate.toISOString())
        .lt('created_at', endDate.toISOString())
        .order('created_at', { ascending: true })

    if (ordersError) {
        throw createError({
            statusCode: 500,
            statusMessage: 'Internal Server Error',
            message: 'Failed to fetch store orders: ' + ordersError.message
        })
    }

    const orders = (rawOrders || []) as any[]

    let totalSales = 0
    let totalItemsSold = 0
    let validOrdersCount = 0
    let completedOrders = 0
    let pendingOrders = 0
    let cancelledOrders = 0

    const dailyMap: Record<string, { date: string; display: string; sales: number; count: number }> = {}
    const itemsMap: Record<string, { name_th: string; name_en: string; name_zh: string; qty: number; sales: number }> = {}

    // Initialize daily map with 0s for all periods in range for smooth charts
    if (period === 'year') {
        const monthNamesTh = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.']
        for (let m = 0; m < 12; m++) {
            const mm = String(m + 1).padStart(2, '0')
            const key = `${bkkYear}-${mm}`
            dailyMap[key] = {
                date: key,
                display: monthNamesTh[m] || mm,
                sales: 0,
                count: 0
            }
        }
    } else if (period === '7days' || period === 'today') {
        const curr = new Date(startDate)
        while (curr < endDate) {
            const yyyy = curr.getFullYear()
            const mm = String(curr.getMonth() + 1).padStart(2, '0')
            const dd = String(curr.getDate()).padStart(2, '0')
            const key = `${yyyy}-${mm}-${dd}`
            dailyMap[key] = {
                date: key,
                display: `${dd}/${mm}`,
                sales: 0,
                count: 0
            }
            curr.setDate(curr.getDate() + 1)
        }
    }

    for (const ord of orders) {
        const isCancelled = ord.status === 'cancelled'
        if (isCancelled) {
            cancelledOrders++
            continue
        }

        if (ord.status === 'completed' || ord.status === 'paid' || ord.status === 'confirmed') {
            completedOrders++
        } else {
            pendingOrders++
        }

        validOrdersCount++

        let orderSum = 0
        let orderItemCount = 0
        const itemsArr = Array.isArray(ord.items) ? ord.items : []

        for (const it of itemsArr) {
            const qty = Number(it.quantity) || 1
            const unitPrice = Number(
                it.unitPrice !== undefined 
                    ? it.unitPrice 
                    : (it.price !== undefined ? it.price : (it.menuItem?.price || 0))
            )
            const itemTotal = unitPrice * qty
            orderSum += itemTotal
            orderItemCount += qty

            // Top items tracking
            const nameTh = it.menuItem?.name_th || it.name_th || 'เมนูอาหาร'
            const nameEn = it.menuItem?.name_en || it.name_en || ''
            const nameZh = it.menuItem?.name_zh || it.name_zh || ''
            const itemKey = nameTh.trim().toLowerCase()

            const itemEntry = itemsMap[itemKey] || {
                name_th: nameTh,
                name_en: nameEn,
                name_zh: nameZh,
                qty: 0,
                sales: 0
            }
            itemEntry.qty += qty
            itemEntry.sales += itemTotal
            itemsMap[itemKey] = itemEntry
        }

        totalSales += orderSum
        totalItemsSold += orderItemCount

        // Breakdown (Daily for today/7days/month, Monthly for year)
        const orderDate = new Date(ord.created_at)
        const dateBkk = new Date(orderDate.toLocaleString('en-US', { timeZone: 'Asia/Bangkok' }))
        const yyyy = dateBkk.getFullYear()
        const mm = String(dateBkk.getMonth() + 1).padStart(2, '0')
        const dd = String(dateBkk.getDate()).padStart(2, '0')

        let key: string
        let display: string

        if (period === 'year') {
            key = `${yyyy}-${mm}`
            const monthNamesTh = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.']
            display = monthNamesTh[dateBkk.getMonth()] || mm
        } else {
            key = `${yyyy}-${mm}-${dd}`
            display = `${dd}/${mm}`
        }

        const dailyEntry = dailyMap[key] || {
            date: key,
            display,
            sales: 0,
            count: 0
        }
        dailyEntry.sales += orderSum
        dailyEntry.count += 1
        dailyMap[key] = dailyEntry
    }

    const dailySales: DailySale[] = Object.values(dailyMap)
        .sort((a, b) => a.date.localeCompare(b.date))
        .map(d => ({
            sale_date: d.date,
            display_date: d.display,
            sales: d.sales,
            order_count: d.count
        }))

    const topItems: TopItem[] = Object.values(itemsMap)
        .sort((a, b) => b.qty - a.qty || b.sales - a.sales)
        .slice(0, 10)
        .map(i => ({
            name_th: i.name_th,
            name_en: i.name_en,
            name_zh: i.name_zh,
            quantity_sold: i.qty,
            total_sales: i.sales
        }))

    const avgOrderValue = validOrdersCount > 0 ? Math.round((totalSales / validOrdersCount) * 100) / 100 : 0

    return {
        success: true,
        store: { id: targetStore.id, name: targetStore.name },
        data: {
            period,
            start_time: startDate.toISOString(),
            end_time: endDate.toISOString(),
            kpi: {
                total_sales: totalSales,
                total_orders: validOrdersCount,
                total_items_sold: totalItemsSold,
                avg_order_value: avgOrderValue
            },
            order_status: {
                total_orders: orders.length,
                completed_orders: completedOrders,
                pending_orders: pendingOrders,
                cancelled_orders: cancelledOrders
            },
            daily_sales: dailySales,
            top_items: topItems
        }
    }
})
