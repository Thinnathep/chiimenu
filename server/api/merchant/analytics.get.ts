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
    dinein_sales?: number;
    takeaway_sales?: number;
}

interface TopItem {
    name_th: string;
    name_en: string;
    name_zh: string;
    category_name?: string;
    category_name_th?: string;
    category_name_en?: string;
    category_name_zh?: string;
    quantity_sold: number;
    total_sales: number;
    avg_price?: number;
    percentage?: number;
}

interface CategorySale {
    category_id: string;
    name_th: string;
    name_en: string;
    name_zh: string;
    sales: number;
    quantity_sold: number;
    percentage: number;
}

interface AddonStat {
    name_th: string;
    name_en: string;
    name_zh: string;
    name: string;
    count: number;
    sales?: number;
}

interface HourlyStat {
    hour: number;
    display: string;
    sales: number;
    count: number;
}

interface MealPeriodsMap {
    breakfast: { sales: number; count: number };
    lunch: { sales: number; count: number };
    afternoon: { sales: number; count: number };
    dinner: { sales: number; count: number };
    night: { sales: number; count: number };
}

interface TicketTiersMap {
    under_100: { count: number; sales: number };
    tier_100_299: { count: number; sales: number };
    tier_300_599: { count: number; sales: number };
    tier_600_plus: { count: number; sales: number };
}

const standardCategories: Record<string, { th: string; en: string; zh: string }> = {
    '⭐ เมนูแนะนำ (signatures)': { th: '⭐ เมนูแนะนำ', en: '⭐ Signatures', zh: '⭐ 招牌推荐' },
    'เมนูแนะนำ (signatures)': { th: '⭐ เมนูแนะนำ', en: '⭐ Signatures', zh: '⭐ 招牌推荐' },
    '⭐ เมนูแนะนำ': { th: '⭐ เมนูแนะนำ', en: '⭐ Signatures', zh: '⭐ 招牌推荐' },
    'เมนูแนะนำ': { th: '⭐ เมนูแนะนำ', en: '⭐ Signatures', zh: '⭐ 招牌推荐' },
    'signatures': { th: '⭐ เมนูแนะนำ', en: '⭐ Signatures', zh: '⭐ 招牌推荐' },
    '🥤 เครื่องดื่ม & ของหวาน': { th: '🥤 เครื่องดื่ม & ของหวาน', en: '🥤 Drinks & Desserts', zh: '🥤 饮品与甜点' },
    'เครื่องดื่ม & ของหวาน': { th: '🥤 เครื่องดื่ม & ของหวาน', en: '🥤 Drinks & Desserts', zh: '🥤 饮品与甜点' },
    'เครื่องดื่ม': { th: 'เครื่องดื่ม', en: 'Beverages', zh: '饮品' },
    'ของหวาน': { th: 'ของหวาน', en: 'Desserts', zh: '甜点' },
    '🍲 ต้ม & แกงไทยรสแซ่บ': { th: '🍲 ต้ม & แกงไทย', en: '🍲 Soups & Curries', zh: '🍲 泰式热汤与咖喱' },
    'ต้ม & แกงไทยรสแซ่บ': { th: '🍲 ต้ม & แกงไทย', en: '🍲 Soups & Curries', zh: '🍲 泰式热汤与咖喱' },
    'ต้ม & แกงไทย': { th: '🍲 ต้ม & แกงไทย', en: '🍲 Soups & Curries', zh: '🍲 泰式热汤与咖喱' },
    '🍲 อาหารจานเดียว & เส้น': { th: '🍲 อาหารจานเดียว & เส้น', en: '🍲 One-Dish & Noodles', zh: '🍲 简餐与面食' },
    'อาหารจานเดียว & เส้น': { th: '🍲 อาหารจานเดียว & เส้น', en: '🍲 One-Dish & Noodles', zh: '🍲 简餐与面食' },
    '🥗 ยำ & ส้มตำ & ของทานเล่น': { th: '🥗 ยำ & ส้มตำ & ของทานเล่น', en: '🥗 Salads & Appetizers', zh: '🥗 凉拌沙拉与小吃' },
    'ยำ & ส้มตำ & ของทานเล่น': { th: '🥗 ยำ & ส้มตำ & ของทานเล่น', en: '🥗 Salads & Appetizers', zh: '🥗 凉拌沙拉与小吃' },
    'อาหารคลีน': { th: 'อาหารคลีน', en: 'Clean Food', zh: '清食健康餐' },
    'clean food': { th: 'อาหารคลีน', en: 'Clean Food', zh: '清食健康餐' },
    'เมนูเส้น': { th: 'เมนูเส้น', en: 'Noodles', zh: '面食料理' },
    'ผัดไทย': { th: 'ผัดไทย', en: 'Pad Thai', zh: '泰式炒河粉' },
    'อาหารทั่วไป': { th: 'อาหารทั่วไป', en: 'General', zh: '常规菜品' }
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
    const lookupDb = serviceRole || db

    if (requestedStoreId) {
        let storeQuery = lookupDb.from('stores').select('id, name, owner_id').eq('id', requestedStoreId)
        if (!isAdmin) {
            storeQuery = storeQuery.eq('owner_id', user.id)
        }
        const { data: storeData, error: storeErr } = await storeQuery.maybeSingle()
        if (storeErr || !storeData) {
            if (isAdmin) {
                const { data: anyStore } = await lookupDb.from('stores').select('id, name, owner_id').eq('id', requestedStoreId).maybeSingle()
                targetStore = anyStore
            }
            if (!targetStore) {
                throw createError({
                    statusCode: 403,
                    statusMessage: 'Forbidden',
                    message: 'You do not have permission to view analytics for this store.'
                })
            }
        } else {
            targetStore = storeData
        }
    } else {
        const { data: stores, error: storesErr } = await lookupDb
            .from('stores')
            .select('id, name, owner_id')
            .eq('owner_id', user.id)
            .order('created_at', { ascending: false })
            .limit(1)

        if (storesErr || !stores || stores.length === 0) {
            if (isAdmin) {
                const { data: anyStore } = await lookupDb
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

    const queryDb = serviceRole || db

    // 4. Fetch Category metadata, Menu items, and Addon options in parallel
    const addonLookup: Record<string, { name_th: string; name_en: string; name_zh: string }> = {}
    const categoryMap: Record<string, { id: string; name_th: string; name_en: string; name_zh: string }> = {}
    const itemCategoryLookup: Record<string, { id: string; name_th: string; name_en: string; name_zh: string }> = {}

    try {
        const [optRes, catRes, itemRes] = await Promise.all([
            queryDb.from('customization_options').select('name_th, name_en, name_zh'),
            queryDb.from('menu_categories').select('id, name_th, name_en, name_zh').eq('store_id', storeId),
            queryDb.from('menu_items').select('id, name_th, category_id').eq('store_id', storeId)
        ])

        if (optRes.data) {
            for (const opt of optRes.data) {
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

        if (catRes.data) {
            for (const cat of catRes.data) {
                const entry = {
                    id: cat.id,
                    name_th: cat.name_th || 'ทั่วไป',
                    name_en: cat.name_en || 'General',
                    name_zh: cat.name_zh || '常规'
                }
                categoryMap[cat.id] = entry
                if (cat.name_th) categoryMap[cat.name_th.trim().toLowerCase()] = entry
            }
        }

        if (itemRes.data) {
            for (const it of itemRes.data) {
                const catObj = categoryMap[it.category_id] || {
                    id: it.category_id || 'uncategorized',
                    name_th: 'อาหารทั่วไป',
                    name_en: 'General',
                    name_zh: '常规菜品'
                }
                if (it.id) itemCategoryLookup[it.id] = catObj
                if (it.name_th) itemCategoryLookup[it.name_th.trim().toLowerCase()] = catObj
            }
        }
    } catch (e) {
        // ignore metadata lookup error
    }

    // 5. Fetch orders within date range for this store
    const { data: rawOrders, error: ordersError } = await queryDb
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
    const addonsMap: Record<string, { name_th: string; name_en: string; name_zh: string; name: string; count: number; sales: number }> = {}

    // Category Sales Tracking
    const categorySalesMap: Record<string, { category_id: string; name_th: string; name_en: string; name_zh: string; sales: number; qty: number }> = {}

    // Meal Periods Tracking
    const mealPeriods: MealPeriodsMap = {
        breakfast: { sales: 0, count: 0 }, // 06:00 - 10:59
        lunch: { sales: 0, count: 0 },     // 11:00 - 13:59
        afternoon: { sales: 0, count: 0 }, // 14:00 - 16:59
        dinner: { sales: 0, count: 0 },    // 17:00 - 20:59
        night: { sales: 0, count: 0 }      // 21:00 - 05:59
    }

    // Ticket Size Segments
    const ticketTiers: TicketTiersMap = {
        under_100: { count: 0, sales: 0 },
        tier_100_299: { count: 0, sales: 0 },
        tier_300_599: { count: 0, sales: 0 },
        tier_600_plus: { count: 0, sales: 0 }
    }

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

    const dailyMap: Record<string, { date: string; display: string; day_name?: string; sales: number; count: number; items_count: number; dinein_count: number; takeaway_count: number; dinein_sales: number; takeaway_sales: number }> = {}
    const itemsMap: Record<string, {
        name_th: string;
        name_en: string;
        name_zh: string;
        category_name?: string;
        category_name_th?: string;
        category_name_en?: string;
        category_name_zh?: string;
        qty: number;
        sales: number;
    }> = {}

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
                takeaway_count: 0,
                dinein_sales: 0,
                takeaway_sales: 0
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
                takeaway_count: 0,
                dinein_sales: 0,
                takeaway_sales: 0
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

                // Resolve Category with full Multilingual support
                let catObj = itemCategoryLookup[it.menuItem?.id || ''] || itemCategoryLookup[itemKey] || categoryMap[it.menuItem?.category_id || it.category_id || '']
                
                if (!catObj) {
                    const rawCat = (it.menuItem?.category_name || it.category_name || '').trim().toLowerCase()
                    const std = standardCategories[rawCat]
                    if (std) {
                        catObj = {
                            id: rawCat,
                            name_th: std.th,
                            name_en: std.en,
                            name_zh: std.zh
                        }
                    } else {
                        catObj = {
                            id: 'uncategorized',
                            name_th: 'อาหารทั่วไป',
                            name_en: 'General',
                            name_zh: '常规菜品'
                        }
                    }
                }

                // If name_en or name_zh is missing, try standard dictionary fallback
                if (!catObj.name_en || !catObj.name_zh) {
                    const std = standardCategories[catObj.name_th.trim().toLowerCase()]
                    if (std) {
                        catObj = {
                            ...catObj,
                            name_en: catObj.name_en || std.en,
                            name_zh: catObj.name_zh || std.zh
                        }
                    }
                }

                const itemEntry = itemsMap[itemKey] || {
                    name_th: nameTh,
                    name_en: nameEn,
                    name_zh: nameZh,
                    category_name: catObj.name_th,
                    category_name_th: catObj.name_th,
                    category_name_en: catObj.name_en || 'General',
                    category_name_zh: catObj.name_zh || '常规',
                    qty: 0,
                    sales: 0
                }
                itemEntry.qty += qty
                itemEntry.sales += itemTotal
                itemsMap[itemKey] = itemEntry

                // Category tracking
                const catEntry = categorySalesMap[catObj.id] || {
                    category_id: catObj.id,
                    name_th: catObj.name_th,
                    name_en: catObj.name_en || 'General',
                    name_zh: catObj.name_zh || '常规',
                    sales: 0,
                    qty: 0
                }
                catEntry.sales += itemTotal
                catEntry.qty += qty
                categorySalesMap[catObj.id] = catEntry

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
                        let addonPrice = 0

                        if (typeof add === 'object' && add !== null) {
                            rawName = add.name || add.name_th || add.name_en || ''
                            nTh = add.name_th || ''
                            nEn = add.name_en || ''
                            nZh = add.name_zh || ''
                            addonPrice = Number(add.price || add.extra_price || 0)
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
                            count: 0,
                            sales: 0
                        }
                        existing.count += qty
                        existing.sales += (addonPrice * qty)
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

        // Ticket Size Segment
        if (orderSum < 100) {
            ticketTiers.under_100.count++
            ticketTiers.under_100.sales += orderSum
        } else if (orderSum < 300) {
            ticketTiers.tier_100_299.count++
            ticketTiers.tier_100_299.sales += orderSum
        } else if (orderSum < 600) {
            ticketTiers.tier_300_599.count++
            ticketTiers.tier_300_599.sales += orderSum
        } else {
            ticketTiers.tier_600_plus.count++
            ticketTiers.tier_600_plus.sales += orderSum
        }

        // Hourly & Meal Period Allocation
        const orderDate = new Date(ord.created_at)
        const dateBkk = new Date(orderDate.toLocaleString('en-US', { timeZone: 'Asia/Bangkok' }))
        const hour = dateBkk.getHours()

        if (hourlyMap[hour]) {
            hourlyMap[hour].sales += orderSum
            hourlyMap[hour].count += 1
        }

        if (hour >= 6 && hour < 11) {
            mealPeriods.breakfast.sales += orderSum
            mealPeriods.breakfast.count += 1
        } else if (hour >= 11 && hour < 14) {
            mealPeriods.lunch.sales += orderSum
            mealPeriods.lunch.count += 1
        } else if (hour >= 14 && hour < 17) {
            mealPeriods.afternoon.sales += orderSum
            mealPeriods.afternoon.count += 1
        } else if (hour >= 17 && hour < 21) {
            mealPeriods.dinner.sales += orderSum
            mealPeriods.dinner.count += 1
        } else {
            mealPeriods.night.sales += orderSum
            mealPeriods.night.count += 1
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
            takeaway_count: 0,
            dinein_sales: 0,
            takeaway_sales: 0
        }
        dailyEntry.sales += orderSum
        dailyEntry.count += 1
        dailyEntry.items_count += orderItemCount
        if (isTakeaway) {
            dailyEntry.takeaway_count += 1
            dailyEntry.takeaway_sales += orderSum
        } else {
            dailyEntry.dinein_count += 1
            dailyEntry.dinein_sales += orderSum
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
            takeaway_count: d.takeaway_count,
            dinein_sales: d.dinein_sales,
            takeaway_sales: d.takeaway_sales
        }))

    const topItems: TopItem[] = Object.values(itemsMap)
        .sort((a, b) => b.sales - a.sales || b.qty - a.qty)
        .map(i => ({
            name_th: i.name_th,
            name_en: i.name_en,
            name_zh: i.name_zh,
            category_name: i.category_name,
            category_name_th: i.category_name_th,
            category_name_en: i.category_name_en,
            category_name_zh: i.category_name_zh,
            quantity_sold: i.qty,
            total_sales: i.sales,
            avg_price: i.qty > 0 ? Math.round(i.sales / i.qty) : 0,
            percentage: totalSales > 0 ? Math.round((i.sales / totalSales) * 1000) / 10 : 0
        }))

    const categorySales: CategorySale[] = Object.values(categorySalesMap)
        .sort((a, b) => b.sales - a.sales)
        .map(c => ({
            category_id: c.category_id,
            name_th: c.name_th,
            name_en: c.name_en,
            name_zh: c.name_zh,
            sales: c.sales,
            quantity_sold: c.qty,
            percentage: totalSales > 0 ? Math.round((c.sales / totalSales) * 1000) / 10 : 0
        }))

    // Hourly list (06:00 to 23:00)
    const hourlySales: HourlyStat[] = Object.values(hourlyMap)
        .filter(h => h.sales > 0 || (h.hour >= 6 && h.hour <= 23))
        .sort((a, b) => a.hour - b.hour)

    // Find Peak Rush Hour
    let peakHour = { hour: 12, display: '12:00', sales: 0, count: 0 }
    hourlySales.forEach(h => {
        if (h.sales > peakHour.sales) {
            peakHour = { ...h }
        }
    })

    // Addons list
    const topAddons: AddonStat[] = Object.values(addonsMap)
        .sort((a, b) => b.count - a.count)
        .slice(0, 10)

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
                completion_rate: completionRate,
                peak_hour: peakHour
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
                    percentage: totalSales > 0 ? Math.round((dineInSales / totalSales) * 100) : 0,
                    avg_ticket: dineInCount > 0 ? Math.round(dineInSales / dineInCount) : 0
                },
                takeaway: {
                    sales: takeawaySales,
                    count: takeawayCount,
                    percentage: totalSales > 0 ? Math.round((takeawaySales / totalSales) * 100) : 0,
                    avg_ticket: takeawayCount > 0 ? Math.round(takeawaySales / takeawayCount) : 0
                }
            },
            category_sales: categorySales,
            meal_periods: {
                breakfast: { ...mealPeriods.breakfast, percentage: totalSales > 0 ? Math.round((mealPeriods.breakfast.sales / totalSales) * 100) : 0 },
                lunch: { ...mealPeriods.lunch, percentage: totalSales > 0 ? Math.round((mealPeriods.lunch.sales / totalSales) * 100) : 0 },
                afternoon: { ...mealPeriods.afternoon, percentage: totalSales > 0 ? Math.round((mealPeriods.afternoon.sales / totalSales) * 100) : 0 },
                dinner: { ...mealPeriods.dinner, percentage: totalSales > 0 ? Math.round((mealPeriods.dinner.sales / totalSales) * 100) : 0 },
                night: { ...mealPeriods.night, percentage: totalSales > 0 ? Math.round((mealPeriods.night.sales / totalSales) * 100) : 0 }
            },
            ticket_tiers: {
                under_100: { label: '< ฿100', ...ticketTiers.under_100, percentage: validOrdersCount > 0 ? Math.round((ticketTiers.under_100.count / validOrdersCount) * 100) : 0 },
                tier_100_299: { label: '฿100 - ฿299', ...ticketTiers.tier_100_299, percentage: validOrdersCount > 0 ? Math.round((ticketTiers.tier_100_299.count / validOrdersCount) * 100) : 0 },
                tier_300_599: { label: '฿300 - ฿599', ...ticketTiers.tier_300_599, percentage: validOrdersCount > 0 ? Math.round((ticketTiers.tier_300_599.count / validOrdersCount) * 100) : 0 },
                tier_600_plus: { label: '฿600+', ...ticketTiers.tier_600_plus, percentage: validOrdersCount > 0 ? Math.round((ticketTiers.tier_600_plus.count / validOrdersCount) * 100) : 0 }
            },
            hourly_sales: hourlySales,
            top_addons: topAddons,
            spice_distribution: spiceDistribution,
            daily_sales: dailySales,
            top_items: topItems
        }
    }
})
