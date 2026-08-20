import { serverSupabaseServiceRole, serverSupabaseClient, serverSupabaseUser } from '#supabase/server'
import { createClient } from '@supabase/supabase-js'

interface DailySale {
    sale_date: string;
    display_date: string;
    day_name?: string;
    sales: number;
    order_count: number;
    items_count?: number;
    avg_order_value?: number;
    dinein_count?: number;
    takeaway_count?: number;
}

interface TopItem {
    name_th: string;
    name_en: string;
    name_zh: string;
    quantity_sold: number;
    total_sales: number;
    percentage?: number;
}

interface AddonStat {
    name_th: string;
    name_en: string;
    name_zh: string;
    name: string;
    count: number;
}

interface HourlyStat {
    hour: number;
    display: string;
    sales: number;
    count: number;
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
    const period = (query.period as string) || 'today' // 'today' | '7days' | 'month' | 'year'
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

    // 2. Resolve Target Store
    let targetStore: any = null

    if (requestedStoreId) {
        let storeQuery = db.from('stores').select('id, name, owner_id').eq('id', requestedStoreId)
        if (!isAdmin) {
            storeQuery = storeQuery.eq('owner_id', user.id)
        }
        const { data: storeData, error: storeErr } = await storeQuery.maybeSingle()
        if (storeErr || !storeData) {
            throw createError({
                statusCode: 403,
                statusMessage: 'Forbidden',
                message: 'You do not have permission to view analytics for this store.'
            })
        }
        targetStore = storeData
    } else {
        const { data: stores, error: storesErr } = await db
            .from('stores')
            .select('id, name, owner_id')
            .eq('owner_id', user.id)
            .order('created_at', { ascending: false })
            .limit(1)

        if (storesErr || !stores || stores.length === 0) {
            if (isAdmin) {
                const { data: anyStore } = await db
                    .from('stores')
                    .select('id, name, owner_id')
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .maybeSingle()
                targetStore = anyStore
            }
        } else {
            targetStore = stores[0]
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

    // 3. Compute Bangkok Time Dates
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

    // Fetch Customization Options for this store to enrich translations
    const addonLookup: Record<string, { name_th: string; name_en: string; name_zh: string }> = {}
    try {
        const { data: dbOptions } = await db
            .from('customization_options')
            .select('name_th, name_en, name_zh')
        
        if (dbOptions) {
            for (const opt of dbOptions) {
                const entry = {
                    name_th: opt.name_th || '',
                    name_en: opt.name_en || '',
                    name_zh: opt.name_zh || ''
                }
                if (opt.name_th) addonLookup[opt.name_th.trim().toLowerCase()] = entry
                if (opt.name_en) addonLookup[opt.name_en.trim().toLowerCase()] = entry
                if (opt.name_zh) addonLookup[opt.name_zh.trim().toLowerCase()] = entry
            }
        }
    } catch (e) {
        // ignore option fetch error
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
    let lostCancelledSales = 0

    // Dining types breakdown
    let dineInSales = 0
    let dineInCount = 0
    let takeawaySales = 0
    let takeawayCount = 0

    // Spiciness distribution
    const spiceDistribution: Record<string, number> = {
        '0': 0, // ไม่เผ็ด
        '1': 0, // เผ็ดน้อย
        '2': 0, // เผ็ดปานกลาง
        '3': 0  // เผ็ดมาก
    }

    // Addons tracking with Multilingual Support
    const addonsMap: Record<string, { name_th: string; name_en: string; name_zh: string; name: string; count: number }> = {}

    // Hourly distribution (0-23)
    const hourlyMap: Record<number, { hour: number; display: string; sales: number; count: number }> = {}
    for (let h = 0; h < 24; h++) {
        hourlyMap[h] = {
            hour: h,
            display: `${String(h).padStart(2, '0')}:00`,
            sales: 0,
            count: 0
        }
    }

    const dailyMap: Record<string, { date: string; display: string; day_name?: string; sales: number; count: number; items_count: number; dinein_count: number; takeaway_count: number }> = {}
    const itemsMap: Record<string, { name_th: string; name_en: string; name_zh: string; qty: number; sales: number }> = {}

    // Initialize daily map
    const dayNamesTh = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.']
    if (period === 'year') {
        const monthNamesTh = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.']
        for (let m = 0; m < 12; m++) {
            const mm = String(m + 1).padStart(2, '0')
            const key = `${bkkYear}-${mm}`
            dailyMap[key] = {
                date: key,
                display: monthNamesTh[m] || mm,
                day_name: `เดือน ${mm}`,
                sales: 0,
                count: 0,
                items_count: 0,
                dinein_count: 0,
                takeaway_count: 0
            }
        }
    } else if (period === '7days' || period === 'today' || period === 'month') {
        const curr = new Date(startDate)
        while (curr < endDate) {
            const yyyy = curr.getFullYear()
            const mm = String(curr.getMonth() + 1).padStart(2, '0')
            const dd = String(curr.getDate()).padStart(2, '0')
            const key = `${yyyy}-${mm}-${dd}`
            dailyMap[key] = {
                date: key,
                display: `${dd}/${mm}`,
                day_name: dayNamesTh[curr.getDay()],
                sales: 0,
                count: 0,
                items_count: 0,
                dinein_count: 0,
                takeaway_count: 0
            }
            curr.setDate(curr.getDate() + 1)
        }
    }

    for (const ord of orders) {
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

            if (ord.status !== 'cancelled') {
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

                // Spiciness level tracking
                if (it.spiceLevel !== undefined && it.spiceLevel !== null) {
                    const spKey = String(it.spiceLevel)
                    spiceDistribution[spKey] = (spiceDistribution[spKey] || 0) + qty
                }

                // Addons tracking with Multilingual Resolution
                const addons = it.addonNames || Object.values(it.selectedAddons || {})
                if (Array.isArray(addons)) {
                    for (const add of addons) {
                        let rawName = ''
                        let nTh = ''
                        let nEn = ''
                        let nZh = ''

                        if (typeof add === 'object' && add !== null) {
                            rawName = add.name || add.name_th || add.name_en || ''
                            nTh = add.name_th || ''
                            nEn = add.name_en || ''
                            nZh = add.name_zh || ''
                        } else if (typeof add === 'string') {
                            rawName = add.trim()
                        }

                        if (!rawName) continue

                        const lookupKey = rawName.toLowerCase()
                        const found = addonLookup[lookupKey] || (nTh ? addonLookup[nTh.toLowerCase()] : null)
                        if (found) {
                            nTh = found.name_th || nTh
                            nEn = found.name_en || nEn
                            nZh = found.name_zh || nZh
                        }

                        const primaryKey = (nTh || rawName).trim().toLowerCase()
                        const existing = addonsMap[primaryKey] || {
                            name_th: nTh || rawName,
                            name_en: nEn,
                            name_zh: nZh,
                            name: rawName,
                            count: 0
                        }
                        existing.count += qty
                        if (nEn && !existing.name_en) existing.name_en = nEn
                        if (nZh && !existing.name_zh) existing.name_zh = nZh
                        addonsMap[primaryKey] = existing
                    }
                }
            }
        }

        if (ord.status === 'cancelled') {
            cancelledOrders++
            lostCancelledSales += orderSum
            continue
        }

        if (ord.status === 'completed' || ord.status === 'paid' || ord.status === 'confirmed') {
            completedOrders++
        } else {
            pendingOrders++
        }

        validOrdersCount++
        totalSales += orderSum
        totalItemsSold += orderItemCount

        // Dining Type (Dine-in vs Takeaway)
        const tbl = (ord.table_no || '').toLowerCase()
        const isTakeaway = tbl.startsWith('กลับบ้าน') || tbl.startsWith('หน้าร้าน') || tbl.includes('takeaway')
        if (isTakeaway) {
            takeawaySales += orderSum
            takeawayCount++
        } else {
            dineInSales += orderSum
            dineInCount++
        }

        // Hourly Allocation
        const orderDate = new Date(ord.created_at)
        const dateBkk = new Date(orderDate.toLocaleString('en-US', { timeZone: 'Asia/Bangkok' }))
        const hour = dateBkk.getHours()
        if (hourlyMap[hour]) {
            hourlyMap[hour].sales += orderSum
            hourlyMap[hour].count += 1
        }

        // Breakdown Chart & Detailed Daily Table
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
            day_name: dayNamesTh[dateBkk.getDay()],
            sales: 0,
            count: 0,
            items_count: 0,
            dinein_count: 0,
            takeaway_count: 0
        }
        dailyEntry.sales += orderSum
        dailyEntry.count += 1
        dailyEntry.items_count += orderItemCount
        if (isTakeaway) {
            dailyEntry.takeaway_count += 1
        } else {
            dailyEntry.dinein_count += 1
        }
        dailyMap[key] = dailyEntry
    }

    const dailySales: DailySale[] = Object.values(dailyMap)
        .sort((a, b) => a.date.localeCompare(b.date))
        .map(d => ({
            sale_date: d.date,
            display_date: d.display,
            day_name: d.day_name,
            sales: d.sales,
            order_count: d.count,
            items_count: d.items_count,
            avg_order_value: d.count > 0 ? Math.round((d.sales / d.count) * 100) / 100 : 0,
            dinein_count: d.dinein_count,
            takeaway_count: d.takeaway_count
        }))

    const topItems: TopItem[] = Object.values(itemsMap)
        .sort((a, b) => b.sales - a.sales || b.qty - a.qty)
        .map(i => ({
            name_th: i.name_th,
            name_en: i.name_en,
            name_zh: i.name_zh,
            quantity_sold: i.qty,
            total_sales: i.sales,
            percentage: totalSales > 0 ? Math.round((i.sales / totalSales) * 1000) / 10 : 0
        }))

    // Hourly list (only hours with activity or 08:00 - 22:00)
    const hourlySales: HourlyStat[] = Object.values(hourlyMap)
        .filter(h => h.sales > 0 || (h.hour >= 8 && h.hour <= 22))
        .sort((a, b) => a.hour - b.hour)

    // Addons list
    const topAddons: AddonStat[] = Object.values(addonsMap)
        .sort((a, b) => b.count - a.count)
        .slice(0, 8)

    const avgOrderValue = validOrdersCount > 0 ? Math.round((totalSales / validOrdersCount) * 100) / 100 : 0
    const avgItemsPerOrder = validOrdersCount > 0 ? Math.round((totalItemsSold / validOrdersCount) * 10) / 10 : 0
    const completionRate = orders.length > 0 ? Math.round((completedOrders / orders.length) * 1000) / 10 : 100

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
                avg_order_value: avgOrderValue,
                avg_items_per_order: avgItemsPerOrder,
                lost_cancelled_sales: lostCancelledSales,
                completion_rate: completionRate
            },
            order_status: {
                total_orders: orders.length,
                completed_orders: completedOrders,
                pending_orders: pendingOrders,
                cancelled_orders: cancelledOrders
            },
            dining_types: {
                dinein: {
                    sales: dineInSales,
                    count: dineInCount,
                    percentage: totalSales > 0 ? Math.round((dineInSales / totalSales) * 100) : 0
                },
                takeaway: {
                    sales: takeawaySales,
                    count: takeawayCount,
                    percentage: totalSales > 0 ? Math.round((takeawaySales / totalSales) * 100) : 0
                }
            },
            hourly_sales: hourlySales,
            top_addons: topAddons,
            spice_distribution: spiceDistribution,
            daily_sales: dailySales,
            top_items: topItems
        }
    }
})
