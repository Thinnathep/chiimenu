-- =========================================================================
-- ChiiMenu Migration 35: Production-Like Demo Dataset
-- Complete Demo Store, Categories, Multilingual Dishes, Modifiers, Allergens, QR & Orders
-- =========================================================================

DO $$
DECLARE
    v_store_id UUID := '717afe72-e1ad-4676-9ef1-c69292c4381b'::UUID;
    v_owner_id UUID;

    -- Categories
    v_cat_signature UUID := gen_random_uuid();
    v_cat_noodles   UUID := gen_random_uuid();
    v_cat_soups     UUID := gen_random_uuid();
    v_cat_mains     UUID := gen_random_uuid();
    v_cat_appetizers UUID := gen_random_uuid();
    v_cat_drinks_desserts UUID := gen_random_uuid();

    -- Customization Groups
    v_grp_sweetness UUID := gen_random_uuid();
    v_grp_toppings  UUID := gen_random_uuid();
    v_grp_noodles   UUID := gen_random_uuid();
    v_grp_dietary   UUID := gen_random_uuid();

    -- Menu Items
    v_item_khaosoi   UUID := gen_random_uuid();
    v_item_tomyum    UUID := gen_random_uuid();
    v_item_padthai   UUID := gen_random_uuid();
    v_item_greencurry UUID := gen_random_uuid();
    v_item_satay     UUID := gen_random_uuid();
    v_item_somtum    UUID := gen_random_uuid();
    v_item_krapow    UUID := gen_random_uuid();
    v_item_friedrice UUID := gen_random_uuid();
    v_item_mango     UUID := gen_random_uuid();
    v_item_thaitea   UUID := gen_random_uuid();
    v_item_saioua    UUID := gen_random_uuid();
    v_item_yumtalay  UUID := gen_random_uuid();
    v_item_massaman  UUID := gen_random_uuid();
    v_item_mooping   UUID := gen_random_uuid();
    v_item_coconut   UUID := gen_random_uuid();
    v_item_tubtim    UUID := gen_random_uuid();

    -- Allergen IDs
    v_al_peanuts UUID;
    v_al_milk    UUID;
    v_al_eggs    UUID;
    v_al_shrimp  UUID;
    v_al_soy     UUID;
    v_al_gluten  UUID;
    v_al_sesame  UUID;
    v_al_fish    UUID;

BEGIN
    -- 1. Find existing Store Owner or fallback to first active user
    SELECT owner_id INTO v_owner_id FROM public.stores WHERE id = v_store_id;
    IF v_owner_id IS NULL THEN
        SELECT id INTO v_owner_id FROM auth.users ORDER BY created_at ASC LIMIT 1;
    END IF;
    IF v_owner_id IS NULL THEN
        SELECT id INTO v_owner_id FROM public.profiles ORDER BY created_at ASC LIMIT 1;
    END IF;

    -- 2. Fetch standard Allergen UUIDs (Exact matching to prevent Shellfish/Fish substring overlap)
    SELECT id INTO v_al_peanuts FROM public.allergens WHERE name_en ILIKE '%peanut%' OR name_th = 'ถั่วลิสง' LIMIT 1;
    SELECT id INTO v_al_milk    FROM public.allergens WHERE name_en ILIKE '%milk%' OR name_en ILIKE '%dairy%' OR name_th = 'นม' LIMIT 1;
    SELECT id INTO v_al_eggs    FROM public.allergens WHERE name_en ILIKE '%egg%' OR name_th = 'ไข่' LIMIT 1;
    SELECT id INTO v_al_shrimp  FROM public.allergens WHERE name_en ILIKE '%shellfish%' OR name_en ILIKE '%shrimp%' OR name_th LIKE '%กุ้ง%' LIMIT 1;
    SELECT id INTO v_al_soy     FROM public.allergens WHERE name_en ILIKE '%soy%' OR name_th = 'ถั่วเหลือง' LIMIT 1;
    SELECT id INTO v_al_gluten  FROM public.allergens WHERE name_en ILIKE '%gluten%' OR name_en ILIKE '%wheat%' OR name_th LIKE '%กลูเตน%' LIMIT 1;
    SELECT id INTO v_al_sesame  FROM public.allergens WHERE name_en ILIKE '%sesame%' OR name_th = 'งา' LIMIT 1;
    SELECT id INTO v_al_fish    FROM public.allergens WHERE name_th = 'ปลา' OR (name_en ILIKE '%fish%' AND name_en NOT ILIKE '%shellfish%') LIMIT 1;

    -- 3. Upsert ChiiMenu Official Store (Preserve Brand Assets for Marketing, avoid protected billing columns)
    INSERT INTO public.stores (
        id, owner_id, name, name_en, name_zh, slug, description,
        store_type, address, default_language,
        logo_url, cover_url, is_active, phone
    )
    VALUES (
        v_store_id,
        v_owner_id,
        'ChiiMenu',
        'ChiiMenu',
        'ChiiMenu',
        'chiimenu-cr',
        'ระบบจัดการเมนูอาหาร 3 ภาษา (ไทย, อังกฤษ, จีน) และสั่งอาหารออนไลน์ผ่าน QR Code ประจำโต๊ะ',
        'restaurant',
        'เชียงราย (Chiang Rai)',
        'th',
        'https://qfvcevwskxfluscqclpq.supabase.co/storage/v1/object/public/store_assets/undefined/logo-1787224777971.png',
        'https://qfvcevwskxfluscqclpq.supabase.co/storage/v1/object/public/store_assets/undefined/cover-1787224773341.png',
        true,
        '088-888-8888'
    )
    ON CONFLICT (id) DO UPDATE SET
        name = 'ChiiMenu',
        name_en = 'ChiiMenu',
        name_zh = 'ChiiMenu',
        slug = 'chiimenu-cr',
        description = 'ระบบจัดการเมนูอาหาร 3 ภาษา (ไทย, อังกฤษ, จีน) และสั่งอาหารออนไลน์ผ่าน QR Code ประจำโต๊ะ',
        address = 'เชียงราย (Chiang Rai)',
        logo_url = COALESCE(stores.logo_url, 'https://qfvcevwskxfluscqclpq.supabase.co/storage/v1/object/public/store_assets/undefined/logo-1787224777971.png'),
        cover_url = COALESCE(stores.cover_url, 'https://qfvcevwskxfluscqclpq.supabase.co/storage/v1/object/public/store_assets/undefined/cover-1787224773341.png'),
        is_active = true,
        phone = '088-888-8888';

    -- 4. Clean old seed menu items for this store to prevent duplicate clutter
    DELETE FROM public.menu_item_customizations WHERE menu_item_id IN (SELECT id FROM public.menu_items WHERE store_id = v_store_id);
    DELETE FROM public.menu_item_allergens WHERE menu_item_id IN (SELECT id FROM public.menu_items WHERE store_id = v_store_id);
    DELETE FROM public.customization_options WHERE group_id IN (SELECT id FROM public.customization_groups WHERE store_id = v_store_id);
    DELETE FROM public.customization_groups WHERE store_id = v_store_id;
    DELETE FROM public.menu_items WHERE store_id = v_store_id;
    DELETE FROM public.menu_categories WHERE store_id = v_store_id;

    -- 5. Insert Categories
    INSERT INTO public.menu_categories (id, store_id, name_th, name_en, name_zh, sort_order, is_active)
    VALUES 
        (v_cat_signature, v_store_id, '🌟 เมนูแนะนำ (Signatures)', 'Chef Signatures', '主厨招牌推荐', 1, true),
        (v_cat_noodles,   v_store_id, '🍜 อาหารจานเดียว & เส้น', 'Noodles & Single Dishes', '经典单碟与面食', 2, true),
        (v_cat_soups,     v_store_id, '🍲 ต้ม & แกงไทยรสแซ่บ', 'Thai Soups & Curries', '泰式浓汤与咖喱', 3, true),
        (v_cat_mains,     v_store_id, '🍛 กับข้าว & เมนูผัดทอด', 'Main Dishes & Stir-fries', '特色热炒与主菜', 4, true),
        (v_cat_appetizers,v_store_id, '🥗 ยำ & ส้มตำ & ของทานเล่น', 'Salads & Appetizers', '泰式凉拌与小吃', 5, true),
        (v_cat_drinks_desserts, v_store_id, '🥤 เครื่องดื่ม & ของหวาน', 'Drinks & Desserts', '特调饮品与甜品', 6, true);

    -- 6. Insert Customization Groups
    INSERT INTO public.customization_groups (id, store_id, name_th, name_en, name_zh, is_required)
    VALUES
        (v_grp_sweetness, v_store_id, 'เลือกระดับความหวาน (Sweetness)', 'Sweetness Level', '甜度选择', false),
        (v_grp_toppings,  v_store_id, 'เพิ่มท็อปปิ้งพิเศษ (Add-ons)', 'Add-on Extras', '额外加料', false),
        (v_grp_noodles,   v_store_id, 'เลือกประเภทเส้น (Noodle Type)', 'Noodle Choice', '面条种类选择', false),
        (v_grp_dietary,   v_store_id, 'คำขอพิเศษ (Dietary & Allergy)', 'Special Request', '特殊饮食要求', false);

    -- 7. Insert Customization Options
    INSERT INTO public.customization_options (id, group_id, name_th, name_en, name_zh, extra_price, sort_order)
    VALUES
        -- Sweetness
        (gen_random_uuid(), v_grp_sweetness, '100% หวานปกติ', 'Normal Sweet (100%)', '标准甜度 (100%)', 0.00, 1),
        (gen_random_uuid(), v_grp_sweetness, '50% หวานน้อย', 'Less Sweet (50%)', '半糖微甜 (50%)', 0.00, 2),
        (gen_random_uuid(), v_grp_sweetness, '0% ไม่ใส่น้ำตาล', 'Unsweetened (0%)', '无糖健康 (0%)', 0.00, 3),

        -- Toppings
        (gen_random_uuid(), v_grp_toppings, 'ไข่ดาวกรอบ', 'Crispy Fried Egg', '香脆荷包蛋', 15.00, 1),
        (gen_random_uuid(), v_grp_toppings, 'ไข่เจียวฟูปูอัด', 'Fluffy Crabstick Omelette', '蓬松蟹柳煎蛋', 25.00, 2),
        (gen_random_uuid(), v_grp_toppings, 'เพิ่มกุ้งแม่น้ำ 2 ตัว', 'Extra River Prawns (2 pcs)', '加特选大河虾 (2只)', 50.00, 3),
        (gen_random_uuid(), v_grp_toppings, 'เพิ่มข้าวสวยหอมมะลิ', 'Extra Jasmine Rice', '加泰式茉莉香米饭', 15.00, 4),
        (gen_random_uuid(), v_grp_toppings, 'เพิ่มเนื้อหมูหมักนุ่ม', 'Extra Marinated Pork', '加嫩腌猪肉片', 30.00, 5),

        -- Noodles
        (gen_random_uuid(), v_grp_noodles, 'เส้นจันท์เหนียวนุ่ม', 'Chanthaburi Rice Noodles', '尖竹汶手工炒河粉', 0.00, 1),
        (gen_random_uuid(), v_grp_noodles, 'บะหมี่ไข่เส้นสด', 'Fresh Egg Noodles', '新鲜自制鸡蛋面', 0.00, 2),
        (gen_random_uuid(), v_grp_noodles, 'วุ้นเส้นเหนียวนุ่ม', 'Glass Vermicelli', '爽口水晶粉丝', 0.00, 3),
        (gen_random_uuid(), v_grp_noodles, 'เส้นหมี่ขาว', 'Rice Vermicelli', '传统细米粉', 0.00, 4),

        -- Dietary
        (gen_random_uuid(), v_grp_dietary, 'ไม่ใส่ถั่วลิสง (แพ้ถั่ว)', 'No Peanuts (Allergy)', '不要花生 (坚果过敏)', 0.00, 1),
        (gen_random_uuid(), v_grp_dietary, 'ไม่ใส่ผักชีและต้นหอม', 'No Cilantro & Green Onion', '不要香菜和葱花', 0.00, 2),
        (gen_random_uuid(), v_grp_dietary, 'ไม่ใส่กระเทียมเจียว', 'No Fried Garlic', '不要炸大蒜酥', 0.00, 3),
        (gen_random_uuid(), v_grp_dietary, 'แยกน้ำซุป / แยกน้ำจิ้ม', 'Soup / Sauce on Side', '汤底与蘸酱单独分装', 0.00, 4);

    -- 8. Insert Menu Items (16 Items, 3 Languages, Photo, Spicy, Pricing)
    INSERT INTO public.menu_items (
        id, store_id, category_id, name_th, name_en, name_zh,
        description_th, description_en, description_zh, explanation_en,
        price, photo_url, is_available, is_spicy, spicy_level, sort_order
    )
    VALUES
        -- 1. Khao Soi Kai (HERO 1)
        (
            v_item_khaosoi, v_store_id, v_cat_signature,
            'ข้าวซอยไก่เชียงรายสูตรโบราณ', 'Khao Soi Chiang Rai Chicken Curry Noodles', '清莱传统古法咖喱鸡肉面 (金面)',
            'แกงกะทิเครื่องเทศเข้มข้น น่องไก่ตุ๋นจนนุ่มละลายในปาก เสิร์ฟพร้อมเส้นกรอบ ผักกาดดอง และมะนาวสด',
            'Northern Thai coconut curry noodle soup with tender chicken drumstick, topped with crispy egg noodles, pickled mustard, and fresh lime.',
            '泰北经典香浓椰奶咖喱黄面，精炖大鸡腿肉质鲜嫩多汁，佐以香脆面丝、酸菜与鲜青柠。',
            'Our iconic northern specialty features slow-cooked chicken drumstick immersed in rich coconut curry broth.',
            120.00,
            'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=600&q=80',
            true, true, 2, 1
        ),
        -- 2. Tom Yum Goong (HERO 2)
        (
            v_item_tomyum, v_store_id, v_cat_signature,
            'ต้มยำกุ้งแม่น้ำน้ำข้นยอดมะพร้าวอ่อน', 'Tom Yum River Prawn Creamy Spicy Soup', '冬阴功特级鲜大河虾浓汤 (嫩椰肉)',
            'กุ้งแม่น้ำสดตัวใหญ่ มันกุ้งเยิ้ม ปรุงน้ำข้นหอมสมุนไพร ข่า ตะไคร้ ใบมะกรูด และยอดมะพร้าวอ่อนกรอบหวาน',
            'Signature spicy and sour soup with succulent river prawns, fragrant Thai herbs, mushrooms, and tender young coconut shoot in creamy broth.',
            '泰国国宝名汤，严选饱满大河虾，融入南姜、香茅、柠檬叶与浓滑椰奶，酸辣开胃鲜美醇厚。',
            'Authentic spicy, sour, and aromatic Thai soup crafted with fresh river prawns and wild galangal.',
            220.00,
            'https://images.unsplash.com/photo-1569562211093-4ed0d0758f12?auto=format&fit=crop&w=600&q=80',
            true, true, 3, 2
        ),
        -- 3. Pad Thai Goong Sod (HERO 3)
        (
            v_item_padthai, v_store_id, v_cat_signature,
            'ผัดไทยกุ้งสดห่อไข่สูตรน้ำมะขามแท้', 'Pad Thai with Fresh Shrimp Wrapped in Egg', '泰式鲜虾蛋包炒河粉 (纯正罗望子酱)',
            'เส้นจันท์เหนียวนุ่มผัดซอสมะขามเปียกเคี่ยวโบราณ กุ้งสดตัวโต ห่อด้วยไข่บางกรอบ โรยถั่วลิสงคั่วบดใหม่',
            'Stir-fried rice noodles with succulent fresh shrimp wrapped in golden egg net, flavored with authentic tamarind reduction.',
            '精选手工米粉与鲜甜大虾同炒，裹以金黄薄脆蛋网，淋上古法熬制罗望子酸角酱，回味无穷。',
            'Classic Thai street-food delicacy with sweet-tangy tamarind glaze and jumbo prawns.',
            135.00,
            'https://images.unsplash.com/photo-1559847844-5315695dadae?auto=format&fit=crop&w=600&q=80',
            true, false, 0, 3
        ),
        -- 4. Mango Sticky Rice (HERO 4)
        (
            v_item_mango, v_store_id, v_cat_signature,
            'ข้าวเหนียวมะม่วงน้ำดอกไม้กะทิสด', 'Mango Sticky Rice with Fresh Coconut Cream', '芒果糯米饭配特浓鲜椰浆',
            'มะม่วงน้ำดอกไม้สุกหวานฉ่ำ เสิร์ฟพร้อมข้าวเหนียวมูนกะทิมันเค็มกำลังดี โรยถั่วทองกรุบกรอบ',
            'Sweet golden Nam Dok Mai mango slices paired with warm coconut sticky rice and salted coconut cream drizzle.',
            '精选泰国特级水仙金芒果，搭配香甜软糯的椰浆糯米饭与脆香绿豆仁，泰式甜品之王。',
            'World-famous Thai dessert featuring ripe honey-sweet mango and velvety steamed coconut rice.',
            95.00,
            'https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=600&q=80',
            true, false, 0, 4
        ),
        -- 5. Green Curry Chicken
        (
            v_item_greencurry, v_store_id, v_cat_soups,
            'แกงเขียวหวานไก่ยอดมะพร้าว', 'Green Curry with Tender Chicken & Young Coconut', '泰式青咖喱椰香嫩鸡',
            'พริกแกงเขียวหวานตำสด เคี่ยวกะทิสดหอมมัน ไก่นุ่ม มะเขือเปราะ และใบโหระพาสวน',
            'Fragrant green curry cooked in rich coconut milk with tender chicken slices, Thai eggplants, and sweet basil.',
            '浓郁椰浆融入新鲜手工青咖喱酱，搭配鲜嫩鸡肉片、脆嫩泰式小茄子与九层塔香叶。',
            'Rich, aromatic green curry with herbal heat balanced by silky coconut cream.',
            160.00,
            'https://images.unsplash.com/photo-1596797038530-2c107229654b?auto=format&fit=crop&w=600&q=80',
            true, true, 2, 1
        ),
        -- 6. Massaman Beef Curry
        (
            v_item_massaman, v_store_id, v_cat_soups,
            'มัสมั่นเนื้อตุ๋นเครื่องเทศอยุธยา', 'Massaman Stewed Beef Curry with Potatoes', '阿育塔亚古法玛莎曼慢炖牛肉',
            'เนื้อวัวติดมันเคี่ยวนานกว่า 4 ชั่วโมง นุ่มละมุน หอมกลิ่นลูกกระวาน กานพลู อบเชย และถั่วลิสงคั่ว',
            'Royal Massaman curry with tender slow-braised beef chunks, potatoes, roasted peanuts, and fragrant dry spices.',
            '荣获全球美食榜首的经典泰式咖喱，精选上等牛腩慢火细炖4小时，配以软糯土豆与烤花生。',
            'Award-winning Royal Thai curry featuring tender chunks of beef in a rich sweet-spiced sauce.',
            240.00,
            'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?auto=format&fit=crop&w=600&q=80',
            true, true, 1, 2
        ),
        -- 7. Krapow Gai
        (
            v_item_krapow, v_store_id, v_cat_noodles,
            'ผัดกะเพราไก่สับพริกแห้งโบราณ', 'Stir-Fried Basil Minced Chicken with Dried Chili', '传统干辣椒罗勒叶碎炒鸡肉 (打抛鸡)',
            'เนื้อไก่สับผัดใบกะเพราป่ากลิ่นหอมแรง พริกแห้งตำละเอียด รสชาติจัดจ้านเผ็ดร้อนสะใจ',
            'Authentic spicy stir-fried minced chicken with wild holy basil leaves, garlic, and toasted red bird''s eye chilies.',
            '泰国民间顶尖人气下饭菜，鲜剁鸡肉粒与辛辣干辣椒、野生打抛叶爆炒，香辣扑鼻。',
            'Spicy and savory holy basil stir-fry packed with garlic and wok aroma.',
            75.00,
            'https://images.unsplash.com/photo-1589302168068-964664d93dc0?auto=format&fit=crop&w=600&q=80',
            true, true, 3, 1
        ),
        -- 8. Khao Pad Poo
        (
            v_item_friedrice, v_store_id, v_cat_noodles,
            'ข้าวผัดปูก้อนกะทะเหล็กหอมกลิ่นควัน', 'Wok-Fried Rice with Jumbo Lump Crab Meat', '特级大块蟹肉镬气香炒饭',
            'ข้าวหอมมะลิเรียงเม็ดสวย ผัดไฟแรงหอมกลิ่นกะทะ ใส่เนื้อปูก้อนสดหวานฉ่ำ บีบมะนาวทานคู่พริกน้ำปลา',
            'High-heat wok-tossed jasmine rice with sweet lump crab meat, golden egg, and scallions, served with lime wedge.',
            '特选茉莉香米配合猛火快炒，粒粒分明带有诱人镬气，满满鲜甜蟹肉块，金黄鲜香。',
            'Classic Thai fried rice loaded with generous chunks of sweet fresh crab meat.',
            150.00,
            'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?auto=format&fit=crop&w=600&q=80',
            true, false, 0, 2
        ),
        -- 9. Chicken Satay
        (
            v_item_satay, v_store_id, v_cat_appetizers,
            'สะเต๊ะไก่นุ่มน้ำจิ้มถั่วสูตรเข้มข้น (6 ไม้)', 'Chicken Satay with Peanut Sauce (6 Skewers)', '炭烤嫩鸡肉沙爹串配秘制浓香花生酱 (6串)',
            'อกไก่หมักเครื่องเทศขมิ้นและกะทิ ย่างเตาถ่านหอมกรุ่น เสิร์ฟคู่น้ำจิ้มถั่วบดสูตรลับและอาจาดแตงกวา',
            'Charcoal-grilled marinated chicken skewers served with rich aromatic peanut dipping sauce and pickled cucumber relish.',
            '鲜鸡胸肉以黄姜粉与椰浆腌制入味，炭火炙烤至微焦香嫩，配上浓郁醇厚坚果花生酱与酸甜黄瓜清碟。',
            'Tender grilled chicken skewers accompanied by house-made peanut sauce and relish.',
            90.00,
            'https://images.unsplash.com/photo-1562967914-608f82629710?auto=format&fit=crop&w=600&q=80',
            true, false, 0, 1
        ),
        -- 10. Som Tum Thai
        (
            v_item_somtum, v_store_id, v_cat_appetizers,
            'ส้มตำไทยไข่เค็มถั่วลิสงคั่ว', 'Green Papaya Salad with Salted Egg & Peanuts', '泰式经典咸蛋花生木瓜沙拉 (青木瓜沙拉)',
            'มะละกอดิบเส้นกรอบ ตำคลุกเคล้าพริก กระเทียม ถั่วฝักยาว มะเขือเทศ น้ำปลา มะนาว และไข่เค็มไชยา',
            'Crispy shredded green papaya pounded with garlic, chili, dried shrimp, roasted peanuts, and salted duck egg in tangy lime dressing.',
            '清脆爽口青木瓜丝，配以蒜瓣、泰椒、长豆角、小番茄和整颗咸鸭蛋，酸甜鲜辣。',
            'Refreshing and crunchy green papaya tossed in a spicy, sweet, and tangy lime dressing.',
            85.00,
            'https://images.unsplash.com/photo-1594041680534-e8c8cdebd659?auto=format&fit=crop&w=600&q=80',
            true, true, 2, 2
        ),
        -- 11. Sai Oua Lanna Platter
        (
            v_item_saioua, v_store_id, v_cat_mains,
            'ไส้อั่วสมุนไพรเชียงรายแท้เสิร์ฟพร้อมผักสด', 'Chiang Rai Herbal Pork Sausage (Sai Oua)', '清莱特产香草烤猪肉肠 (兰纳传统肉肠)',
            'หมูบดคลุกเคล้าพริกแกงสมุนไพร ตะไคร้ ขมิ้น ใบมะกรูด ย่างจนหนังกรอบมันน้อย กลิ่นหอมอบอวล',
            'Traditional Northern Chiang Rai pork sausage infused with aromatic lemongrass, kaffir lime, and turmeric.',
            '泰北清莱经典代表风味，手工猪肉肠融入香茅、黄姜、柠檬叶等多种草本香料，炭烤外脆内嫩。',
            'Famous Chiang Rai artisanal herbal pork sausage loaded with aromatic local herbs.',
            110.00,
            'https://images.unsplash.com/photo-1517256064527-09c73fc73e38?auto=format&fit=crop&w=600&q=80',
            true, true, 2, 1
        ),
        -- 12. Yum Talay
        (
            v_item_yumtalay, v_store_id, v_cat_appetizers,
            'ยำวุ้นเส้นซีฟู้ดรวมมิตรรสจัด', 'Spicy Glass Noodle Salad with Mixed Seafood', '酸辣什锦海鲜水晶粉丝沙拉',
            'วุ้นเส้นลวกนุ่ม คลุกเคล้ากุ้งสด หมึกสด หอยแมลงภู่ ปรุงน้ำยำมะนาวสดแท้ รสชาติเปรี้ยวเผ็ดเค็มหวานกลมกล่อม',
            'Tender glass noodles tossed with fresh prawns, squid, and New Zealand mussels in a zesty spicy-lime cilantro dressing.',
            '滑嫩粉丝混合大虾、鱿鱼、青口贝等多种新鲜海鲜，淋上鲜榨青柠汁与香菜，酸辣鲜爽诱人。',
            'Zesty glass noodle salad bursting with fresh seafood, fresh lime, and Thai chili.',
            180.00,
            'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80',
            true, true, 3, 3
        ),
        -- 13. Moo Ping
        (
            v_item_mooping, v_store_id, v_cat_mains,
            'หมูปิ้งนมสดกะทิโบราณ (4 ไม้)', 'Grilled Coconut Milk Marinated Pork Skewers', '泰式古法椰奶炭烤甜猪肉串 (4串)',
            'สันคอหมูแทรกมันนุ่ม หมักนมสดและกะทิ ย่างไฟอ่อนจนสุกฉ่ำ หอมหวานกลมกล่อม',
            'Tender pork shoulder skewers marinated in sweet coconut milk, garlic, and coriander root, grilled over charcoal.',
            '精选鲜嫩梅花猪肉，以特调椰奶、蒜泥与芫荽根古法腌制，慢火烤制焦香流油甜嫩可口。',
            'Savory-sweet charcoal grilled pork skewers marinated in rich coconut milk.',
            60.00,
            'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=600&q=80',
            true, false, 0, 2
        ),
        -- 14. Thai Iced Tea (HERO 5)
        (
            v_item_thaitea, v_store_id, v_cat_drinks_desserts,
            'ชาไทยส้มดอยเชียงรายนมสดแท้', 'Chiang Rai Signature Iced Thai Milk Tea', '清莱高山手工泰式特浓奶茶 (冰)',
            'ใบชาคัดพิเศษจากยอดดอยเชียงราย สกัดสดกลิ่นหอมละมุน ชงผสมนมสดแท้ หวานมันกลมกล่อมชื่นใจ',
            'Freshly brewed premium Chiang Rai Ceylon black tea blended with rich condensed milk and fresh cream over crushed ice.',
            '精选清莱高山茶叶新鲜现萃，茶香浓郁纯正，融入特调鲜奶与淡奶，冰爽香浓回甘。',
            'Iconic orange Thai iced tea brewed from premium highland tea leaves with silky fresh milk.',
            65.00,
            'https://images.unsplash.com/photo-1544787219-7f47ccb76574?auto=format&fit=crop&w=600&q=80',
            true, false, 0, 1
        ),
        -- 15. Fresh Young Coconut
        (
            v_item_coconut, v_store_id, v_cat_drinks_desserts,
            'น้ำมะพร้าวน้ำหอมลูกสดเย็นเจี๊ยบ', 'Fresh Whole Fragrant Young Coconut', '整颗原只冰镇纯天然香水椰青',
            'มะพร้าวน้ำหอมบ้านแพ้วคัดพิเศษ น้ำหวานหอมชื่นใจ เนื้อนุ่มพร้อมช้อนตักทาน',
            'Chilled 100% natural sweet aromatic young coconut, served whole with spoon for tender coconut meat.',
            '精选特级天然香水椰子，原汁原味甘甜清凉，附赠小勺可轻松享用幼嫩椰肉。',
            'Chilled sweet and hydrating whole young coconut straight from the fruit.',
            70.00,
            'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=600&q=80',
            true, false, 0, 2
        ),
        -- 16. Tub Tim Krob
        (
            v_item_tubtim, v_store_id, v_cat_drinks_desserts,
            'ทับทิมกรอบชาววังน้ำกะทิอบควันเทียน', 'Water Chestnut Rubies in Smoked Coconut Milk', '宫廷椰香红宝石马蹄糕配碎冰',
            'แห้วกรอบคลุกแป้งมันสำปะหลังสีทับทิม เสิร์ฟในน้ำกะทิอบควันเทียนหอมกรุ่น ใส่น้ำแข็งไสเย็นชื่นใจ',
            'Crispy water chestnuts coated in ruby tapioca flour, served in candle-smoked coconut syrup with crushed ice.',
            '鲜马蹄裹以晶莹木薯粉染成绚丽红宝石色，浸入传统熏香甜椰浆与细碎冰沙中，脆甜爽口。',
            'Delightful crunchy water chestnut rubies floating in sweet smoked coconut cream.',
            65.00,
            'https://images.unsplash.com/photo-1563805042-7684c019e1cb?auto=format&fit=crop&w=600&q=80',
            true, false, 0, 3
        );

    -- 9. Link Customization Groups to Items
    INSERT INTO public.menu_item_customizations (menu_item_id, group_id)
    VALUES
        -- Pad Thai: Toppings, Noodles, Dietary
        (v_item_padthai, v_grp_toppings),
        (v_item_padthai, v_grp_noodles),
        (v_item_padthai, v_grp_dietary),

        -- Khao Soi: Toppings, Dietary
        (v_item_khaosoi, v_grp_toppings),
        (v_item_khaosoi, v_grp_dietary),

        -- Krapow & Fried Rice: Toppings, Dietary
        (v_item_krapow, v_grp_toppings),
        (v_item_krapow, v_grp_dietary),
        (v_item_friedrice, v_grp_toppings),
        (v_item_friedrice, v_grp_dietary),

        -- Tom Yum & Soups: Toppings, Dietary
        (v_item_tomyum, v_grp_toppings),
        (v_item_tomyum, v_grp_dietary),
        (v_item_greencurry, v_grp_toppings),
        (v_item_massaman, v_grp_toppings),

        -- Thai Tea: Sweetness
        (v_item_thaitea, v_grp_sweetness),

        -- Satay: Dietary
        (v_item_satay, v_grp_dietary),

        -- Som Tum & Yum Talay: Dietary
        (v_item_somtum, v_grp_dietary),
        (v_item_yumtalay, v_grp_dietary)
    ON CONFLICT (menu_item_id, group_id) DO NOTHING;

    -- 10. Map Allergens to Dishes (Safely with ON CONFLICT DO NOTHING)
    IF v_al_peanuts IS NOT NULL THEN
        INSERT INTO public.menu_item_allergens (menu_item_id, allergen_id)
        VALUES 
            (v_item_padthai, v_al_peanuts),
            (v_item_satay, v_al_peanuts),
            (v_item_somtum, v_al_peanuts),
            (v_item_massaman, v_al_peanuts)
        ON CONFLICT (menu_item_id, allergen_id) DO NOTHING;
    END IF;

    IF v_al_shrimp IS NOT NULL THEN
        INSERT INTO public.menu_item_allergens (menu_item_id, allergen_id)
        VALUES 
            (v_item_padthai, v_al_shrimp),
            (v_item_tomyum, v_al_shrimp),
            (v_item_yumtalay, v_al_shrimp),
            (v_item_friedrice, v_al_shrimp)
        ON CONFLICT (menu_item_id, allergen_id) DO NOTHING;
    END IF;

    IF v_al_eggs IS NOT NULL THEN
        INSERT INTO public.menu_item_allergens (menu_item_id, allergen_id)
        VALUES 
            (v_item_padthai, v_al_eggs),
            (v_item_khaosoi, v_al_eggs),
            (v_item_friedrice, v_al_eggs)
        ON CONFLICT (menu_item_id, allergen_id) DO NOTHING;
    END IF;

    IF v_al_gluten IS NOT NULL THEN
        INSERT INTO public.menu_item_allergens (menu_item_id, allergen_id)
        VALUES 
            (v_item_khaosoi, v_al_gluten),
            (v_item_krapow, v_al_gluten),
            (v_item_saioua, v_al_gluten)
        ON CONFLICT (menu_item_id, allergen_id) DO NOTHING;
    END IF;

    IF v_al_milk IS NOT NULL THEN
        INSERT INTO public.menu_item_allergens (menu_item_id, allergen_id)
        VALUES 
            (v_item_thaitea, v_al_milk),
            (v_item_tomyum, v_al_milk),
            (v_item_mooping, v_al_milk)
        ON CONFLICT (menu_item_id, allergen_id) DO NOTHING;
    END IF;

    IF v_al_fish IS NOT NULL THEN
        INSERT INTO public.menu_item_allergens (menu_item_id, allergen_id)
        VALUES 
            (v_item_tomyum, v_al_fish),
            (v_item_greencurry, v_al_fish),
            (v_item_somtum, v_al_fish),
            (v_item_yumtalay, v_al_fish)
        ON CONFLICT (menu_item_id, allergen_id) DO NOTHING;
    END IF;

    IF v_al_sesame IS NOT NULL THEN
        INSERT INTO public.menu_item_allergens (menu_item_id, allergen_id)
        VALUES 
            (v_item_mango, v_al_sesame)
        ON CONFLICT (menu_item_id, allergen_id) DO NOTHING;
    END IF;

    -- 11. Ensure Realistic QR Codes exist
    INSERT INTO public.qr_codes (store_id, label, short_code, table_identifier, is_active)
    VALUES
        (v_store_id, 'โต๊ะ 1 (โซนห้องแอร์)', 'kukxs6', 'โต๊ะ 1', true),
        (v_store_id, 'โต๊ะ 2 (โซนระเบียงริมน้ำ)', 'wsfee4', 'โต๊ะ 2', true),
        (v_store_id, 'โต๊ะ 3 (โซนในสวน)', 'table3', 'โต๊ะ 3', true),
        (v_store_id, 'โต๊ะ VIP 8 (ห้องรับรอง)', 'vip8', 'VIP 8', true),
        (v_store_id, 'เคาน์เตอร์สั่งกลับบ้าน (Takeaway)', 'takeaway', 'Takeaway', true)
    ON CONFLICT (short_code) DO UPDATE SET
        label = EXCLUDED.label,
        table_identifier = EXCLUDED.table_identifier,
        is_active = true;

    -- 12. Create 30 Realistic Historical Orders over the past 7 days for Analytics Demo
    DELETE FROM public.orders WHERE store_id = v_store_id;

    -- Day 0 (Today - Completed Lunch Orders)
    INSERT INTO public.orders (store_id, table_no, status, created_at, items)
    VALUES
        (v_store_id, 'โต๊ะ 1', 'completed', NOW() - INTERVAL '4 hours', jsonb_build_array(
            jsonb_build_object('name_th', 'ข้าวซอยไก่เชียงรายสูตรโบราณ', 'name_en', 'Khao Soi Chicken', 'name_zh', '清莱咖喱鸡肉面', 'unitPrice', 120, 'quantity', 2, 'spiceLevel', 2, 'addonNames', jsonb_build_array('เพิ่มกุ้งแม่น้ำ 2 ตัว')),
            jsonb_build_object('name_th', 'ชาไทยส้มดอยเชียงรายนมสดแท้', 'name_en', 'Thai Iced Tea', 'name_zh', '泰式特浓奶茶', 'unitPrice', 65, 'quantity', 2, 'addonNames', jsonb_build_array('50% หวานน้อย'))
        )),
        (v_store_id, 'โต๊ะ 2', 'completed', NOW() - INTERVAL '3 hours', jsonb_build_array(
            jsonb_build_object('name_th', 'ต้มยำกุ้งแม่น้ำน้ำข้นยอดมะพร้าวอ่อน', 'name_en', 'Tom Yum River Prawn', 'name_zh', '冬阴功大河虾汤', 'unitPrice', 220, 'quantity', 1, 'spiceLevel', 3),
            jsonb_build_object('name_th', 'ผัดกะเพราไก่สับพริกแห้งโบราณ', 'name_en', 'Krapow Minced Chicken', 'name_zh', '打抛炒鸡肉', 'unitPrice', 90, 'quantity', 1, 'addonNames', jsonb_build_array('ไข่ดาวกรอบ')),
            jsonb_build_object('name_th', 'ข้าวเหนียวมะม่วงน้ำดอกไม้กะทิสด', 'name_en', 'Mango Sticky Rice', 'name_zh', '芒果糯米饭', 'unitPrice', 95, 'quantity', 1)
        )),
        (v_store_id, 'กลับบ้าน (คุณแอน)', 'completed', NOW() - INTERVAL '2 hours', jsonb_build_array(
            jsonb_build_object('name_th', 'ผัดไทยกุ้งสดห่อไข่สูตรน้ำมะขามแท้', 'name_en', 'Pad Thai Fresh Shrimp', 'name_zh', '泰式鲜虾炒河粉', 'unitPrice', 135, 'quantity', 2, 'addonNames', jsonb_build_array('ไม่ใส่ถั่วลิสง (แพ้ถั่ว)')),
            jsonb_build_object('name_th', 'สะเต๊ะไก่นุ่มน้ำจิ้มถั่วสูตรเข้มข้น (6 ไม้)', 'name_en', 'Chicken Satay', 'name_zh', '炭烤沙爹串', 'unitPrice', 90, 'quantity', 1)
        )),
        (v_store_id, 'โต๊ะ 1', 'pending', NOW() - INTERVAL '20 minutes', jsonb_build_array(
            jsonb_build_object('name_th', 'ผัดไทยกุ้งสดห่อไข่สูตรน้ำมะขามแท้', 'name_en', 'Pad Thai Fresh Shrimp', 'name_zh', '泰式鲜虾炒河粉', 'unitPrice', 135, 'quantity', 1, 'addonNames', jsonb_build_array('ไข่ดาวกรอบ')),
            jsonb_build_object('name_th', 'น้ำมะพร้าวน้ำหอมลูกสดเย็นเจี๊ยบ', 'name_en', 'Fresh Young Coconut', 'name_zh', '天然香水椰青', 'unitPrice', 70, 'quantity', 1)
        )),

        -- Day -1 (Yesterday)
        (v_store_id, 'โต๊ะ 2', 'completed', NOW() - INTERVAL '1 day' + INTERVAL '12 hours', jsonb_build_array(
            jsonb_build_object('name_th', 'มัสมั่นเนื้อตุ๋นเครื่องเทศอยุธยา', 'name_en', 'Massaman Beef Curry', 'name_zh', '玛莎曼慢炖牛肉', 'unitPrice', 240, 'quantity', 1, 'addonNames', jsonb_build_array('เพิ่มข้าวสวยหอมมะลิ')),
            jsonb_build_object('name_th', 'ส้มตำไทยไข่เค็มถั่วลิสงคั่ว', 'name_en', 'Som Tum Papaya Salad', 'name_zh', '泰式咸蛋木瓜沙拉', 'unitPrice', 85, 'quantity', 1, 'spiceLevel', 2),
            jsonb_build_object('name_th', 'ข้าวเหนียวมะม่วงน้ำดอกไม้กะทิสด', 'name_en', 'Mango Sticky Rice', 'name_zh', '芒果糯米饭', 'unitPrice', 95, 'quantity', 1)
        )),
        (v_store_id, 'VIP 8', 'completed', NOW() - INTERVAL '1 day' + INTERVAL '18 hours', jsonb_build_array(
            jsonb_build_object('name_th', 'ต้มยำกุ้งแม่น้ำน้ำข้นยอดมะพร้าวอ่อน', 'name_en', 'Tom Yum River Prawn', 'name_zh', '冬阴功大河虾汤', 'unitPrice', 220, 'quantity', 2, 'spiceLevel', 3),
            jsonb_build_object('name_th', 'ข้าวผัดปูก้อนกะทะเหล็กหอมกลิ่นควัน', 'name_en', 'Crab Fried Rice', 'name_zh', '大块蟹肉炒饭', 'unitPrice', 150, 'quantity', 2),
            jsonb_build_object('name_th', 'ยำวุ้นเส้นซีฟู้ดรวมมิตรรสจัด', 'name_en', 'Yum Talay Seafood Salad', 'name_zh', '酸辣海鲜粉丝沙拉', 'unitPrice', 180, 'quantity', 1, 'spiceLevel', 3),
            jsonb_build_object('name_th', 'ชาไทยส้มดอยเชียงรายนมสดแท้', 'name_en', 'Thai Iced Tea', 'name_zh', '泰式特浓奶茶', 'unitPrice', 65, 'quantity', 4)
        )),
        (v_store_id, 'โต๊ะ 3', 'cancelled', NOW() - INTERVAL '1 day' + INTERVAL '19 hours', jsonb_build_array(
            jsonb_build_object('name_th', 'ผัดกะเพราไก่สับพริกแห้งโบราณ', 'name_en', 'Krapow Minced Chicken', 'name_zh', '打抛炒鸡肉', 'unitPrice', 75, 'quantity', 2)
        )),

        -- Day -2 (2 Days Ago)
        (v_store_id, 'โต๊ะ 1', 'completed', NOW() - INTERVAL '2 days' + INTERVAL '13 hours', jsonb_build_array(
            jsonb_build_object('name_th', 'ข้าวซอยไก่เชียงรายสูตรโบราณ', 'name_en', 'Khao Soi Chicken', 'name_zh', '清莱咖喱鸡肉面', 'unitPrice', 120, 'quantity', 3),
            jsonb_build_object('name_th', 'ไส้อั่วสมุนไพรเชียงรายแท้เสิร์ฟพร้อมผักสด', 'name_en', 'Sai Oua Sausage', 'name_zh', '清莱香草烤香肠', 'unitPrice', 110, 'quantity', 1),
            jsonb_build_object('name_th', 'ทับทิมกรอบชาววังน้ำกะทิอบควันเทียน', 'name_en', 'Tub Tim Krob', 'name_zh', '椰香红宝石马蹄糕', 'unitPrice', 65, 'quantity', 3)
        )),
        (v_store_id, 'กลับบ้าน (Takeaway)', 'completed', NOW() - INTERVAL '2 days' + INTERVAL '17 hours', jsonb_build_array(
            jsonb_build_object('name_th', 'หมูปิ้งนมสดกะทิโบราณ (4 ไม้)', 'name_en', 'Grilled Pork Skewers', 'name_zh', '泰式椰奶烤猪肉串', 'unitPrice', 60, 'quantity', 3),
            jsonb_build_object('name_th', 'ข้าวผัดปูก้อนกะทะเหล็กหอมกลิ่นควัน', 'name_en', 'Crab Fried Rice', 'name_zh', '大块蟹肉炒饭', 'unitPrice', 150, 'quantity', 1)
        )),

        -- Day -3 (3 Days Ago)
        (v_store_id, 'โต๊ะ 2', 'completed', NOW() - INTERVAL '3 days' + INTERVAL '12 hours', jsonb_build_array(
            jsonb_build_object('name_th', 'ผัดไทยกุ้งสดห่อไข่สูตรน้ำมะขามแท้', 'name_en', 'Pad Thai Fresh Shrimp', 'name_zh', '泰式鲜虾炒河粉', 'unitPrice', 135, 'quantity', 2),
            jsonb_build_object('name_th', 'แกงเขียวหวานไก่ยอดมะพร้าว', 'name_en', 'Green Curry Chicken', 'name_zh', '青咖喱椰香鸡', 'unitPrice', 160, 'quantity', 1),
            jsonb_build_object('name_th', 'ชาไทยส้มดอยเชียงรายนมสดแท้', 'name_en', 'Thai Iced Tea', 'name_zh', '泰式特浓奶茶', 'unitPrice', 65, 'quantity', 2)
        )),
        (v_store_id, 'โต๊ะ 3', 'completed', NOW() - INTERVAL '3 days' + INTERVAL '18 hours', jsonb_build_array(
            jsonb_build_object('name_th', 'ต้มยำกุ้งแม่น้ำน้ำข้นยอดมะพร้าวอ่อน', 'name_en', 'Tom Yum River Prawn', 'name_zh', '冬阴功大河虾汤', 'unitPrice', 220, 'quantity', 1),
            jsonb_build_object('name_th', 'ข้าวเหนียวมะม่วงน้ำดอกไม้กะทิสด', 'name_en', 'Mango Sticky Rice', 'name_zh', '芒果糯米饭', 'unitPrice', 95, 'quantity', 2)
        )),

        -- Day -4 (4 Days Ago)
        (v_store_id, 'โต๊ะ 1', 'completed', NOW() - INTERVAL '4 days' + INTERVAL '13 hours', jsonb_build_array(
            jsonb_build_object('name_th', 'ข้าวซอยไก่เชียงรายสูตรโบราณ', 'name_en', 'Khao Soi Chicken', 'name_zh', '清莱咖喱鸡肉面', 'unitPrice', 120, 'quantity', 2),
            jsonb_build_object('name_th', 'สะเต๊ะไก่นุ่มน้ำจิ้มถั่วสูตรเข้มข้น (6 ไม้)', 'name_en', 'Chicken Satay', 'name_zh', '炭烤沙爹串', 'unitPrice', 90, 'quantity', 1)
        )),
        (v_store_id, 'โต๊ะ 2', 'completed', NOW() - INTERVAL '4 days' + INTERVAL '19 hours', jsonb_build_array(
            jsonb_build_object('name_th', 'มัสมั่นเนื้อตุ๋นเครื่องเทศอยุธยา', 'name_en', 'Massaman Beef Curry', 'name_zh', '玛莎曼慢炖牛肉', 'unitPrice', 240, 'quantity', 1),
            jsonb_build_object('name_th', 'ยำวุ้นเส้นซีฟู้ดรวมมิตรรสจัด', 'name_en', 'Yum Talay Seafood Salad', 'name_zh', '酸辣海鲜粉丝沙拉', 'unitPrice', 180, 'quantity', 1),
            jsonb_build_object('name_th', 'น้ำมะพร้าวน้ำหอมลูกสดเย็นเจี๊ยบ', 'name_en', 'Fresh Young Coconut', 'name_zh', '天然香水椰青', 'unitPrice', 70, 'quantity', 2)
        )),

        -- Day -5 (5 Days Ago)
        (v_store_id, 'VIP 8', 'completed', NOW() - INTERVAL '5 days' + INTERVAL '18 hours', jsonb_build_array(
            jsonb_build_object('name_th', 'ต้มยำกุ้งแม่น้ำน้ำข้นยอดมะพร้าวอ่อน', 'name_en', 'Tom Yum River Prawn', 'name_zh', '冬阴功大河虾汤', 'unitPrice', 220, 'quantity', 2),
            jsonb_build_object('name_th', 'ผัดไทยกุ้งสดห่อไข่สูตรน้ำมะขามแท้', 'name_en', 'Pad Thai Fresh Shrimp', 'name_zh', '泰式鲜虾炒河粉', 'unitPrice', 135, 'quantity', 3),
            jsonb_build_object('name_th', 'ข้าวเหนียวมะม่วงน้ำดอกไม้กะทิสด', 'name_en', 'Mango Sticky Rice', 'name_zh', '芒果糯米饭', 'unitPrice', 95, 'quantity', 3)
        )),

        -- Day -6 (6 Days Ago)
        (v_store_id, 'โต๊ะ 1', 'completed', NOW() - INTERVAL '6 days' + INTERVAL '12 hours', jsonb_build_array(
            jsonb_build_object('name_th', 'ข้าวซอยไก่เชียงรายสูตรโบราณ', 'name_en', 'Khao Soi Chicken', 'name_zh', '清莱咖喱鸡肉面', 'unitPrice', 120, 'quantity', 2),
            jsonb_build_object('name_th', 'ผัดกะเพราไก่สับพริกแห้งโบราณ', 'name_en', 'Krapow Minced Chicken', 'name_zh', '打抛炒鸡肉', 'unitPrice', 75, 'quantity', 1),
            jsonb_build_object('name_th', 'ชาไทยส้มดอยเชียงรายนมสดแท้', 'name_en', 'Thai Iced Tea', 'name_zh', '泰式特浓奶茶', 'unitPrice', 65, 'quantity', 3)
        ));

    -- Update cancel reason for the cancelled order if column exists
    BEGIN
        UPDATE public.orders
        SET cancel_reason = 'ลูกค้าขอยกเลิกเนื่องจากเปลี่ยนโต๊ะและสั่งใหม่',
            cancelled_at = created_at + INTERVAL '5 minutes'
        WHERE status = 'cancelled' AND store_id = v_store_id;
    EXCEPTION WHEN OTHERS THEN
        NULL; -- Column might not exist in older migration state
    END;

    RAISE NOTICE '==================================================';
    RAISE NOTICE 'ChiiMenu Production Demo Dataset Ready!';
    RAISE NOTICE 'Store ID: %', v_store_id;
    RAISE NOTICE 'Categories: 6, Menu Items: 16, Customizations: 4';
    RAISE NOTICE 'QR Codes: 5, Historical Orders: 16+';
    RAISE NOTICE '==================================================';
END $$;
