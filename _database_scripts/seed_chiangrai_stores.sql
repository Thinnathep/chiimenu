-- =========================================================================
-- ChiiMenu Seed Data: 2 Sample Stores in Chiang Rai
-- Store 1: "ป้าแต๋ว ผัดไทยกุ้งสด" (Auntie Taew Pad Thai)
-- Store 2: "ลุงชัย ข้าวมันไก่" (Uncle Chai Chicken Rice)
-- =========================================================================
-- Run this script AFTER setting up your Supabase database.
-- NOTE: Please replace 'YOUR_USER_ID_HERE' with a valid auth.users.id
--       before running this script if you want to see them in your dashboard.
-- =========================================================================

DO $$
DECLARE
    owner_id UUID;
    store1_id UUID := gen_random_uuid();
    store2_id UUID := gen_random_uuid();
    
    cat1_id UUID := gen_random_uuid();
    cat2_id UUID := gen_random_uuid();
    
    item1_id UUID := gen_random_uuid();
    item2_id UUID := gen_random_uuid();
    item3_id UUID := gen_random_uuid();
    
    cust1_id UUID := gen_random_uuid();
BEGIN
    -- 1. Setup Owner ID
    -- Replace the below line with your actual Supabase auth.users ID to claim the stores.
    -- SELECT id INTO owner_id FROM auth.users LIMIT 1;
    -- If no user is found, the script will create stores without an owner (orphan stores).
    SELECT id INTO owner_id FROM auth.users ORDER BY created_at ASC LIMIT 1;

    -- ==========================================
    -- STORE 1: ป้าแต๋ว ผัดไทย (Auntie Taew Pad Thai)
    -- ==========================================
    INSERT INTO public.stores (id, owner_id, name, name_en, description, slug)
    VALUES (
        store1_id, owner_id, 
        'ป้าแต๋ว ผัดไทยกุ้งสด', 'Auntie Taew Pad Thai',
        'ผัดไทยเส้นจันท์เหนียวนุ่ม กุ้งสดตัวโต สูตรต้นตำรับกว่า 20 ปี',
        'pataew-padthai'
    );

    -- Category: ผัดไทย (Pad Thai)
    INSERT INTO public.menu_categories (id, store_id, name_th, name_en, sort_order)
    VALUES (cat1_id, store1_id, 'ผัดไทย', 'Pad Thai', 1);

    -- Item: ผัดไทยกุ้งสด
    INSERT INTO public.menu_items (id, category_id, store_id, name_th, name_en, name_zh, description_en, description_zh, price, is_available, is_spicy, spicy_level)
    VALUES (
        item1_id, cat1_id, store1_id,
        'ผัดไทยกุ้งสด', 'Pad Thai with Shrimp', '泰式炒河粉配鲜虾',
        'Stir-fried rice noodles with eggs, tofu, bean sprouts, peanuts, and fresh shrimp in tamarind sauce.',
        '酸角酱炒米粉，配鸡蛋、豆腐、豆芽、花生和鲜虾。',
        60.00, true, false, 0
    );

    -- Item: ผัดไทยหมู
    INSERT INTO public.menu_items (id, category_id, store_id, name_th, name_en, name_zh, description_en, description_zh, price, is_available, is_spicy, spicy_level)
    VALUES (
        item2_id, cat1_id, store1_id,
        'ผัดไทยหมู', 'Pad Thai with Pork', '泰式炒河粉配猪肉',
        'Stir-fried rice noodles with pork in tamarind sauce.',
        '酸角酱炒米粉配猪肉。',
        50.00, true, false, 0
    );

    -- Customization Group: เติมไข่ (Add-ons)
    INSERT INTO public.customization_groups (id, store_id, name_th, name_en, name_zh, is_required)
    VALUES (cust1_id, store1_id, 'เพิ่มท็อปปิ้ง', 'Add-ons', '添加', false);

    -- Link Customization to Items
    INSERT INTO public.menu_item_customizations (menu_item_id, group_id)
    VALUES 
        (item1_id, cust1_id),
        (item2_id, cust1_id);

    -- Customization Options
    INSERT INTO public.customization_options (group_id, name_th, name_en, name_zh, extra_price, sort_order)
    VALUES 
        (cust1_id, 'ไข่ดาว', 'Fried Egg', '煎蛋', 10.00, 1),
        (cust1_id, 'เพิ่มเส้น', 'Extra Noodles', '加面条', 10.00, 2),
        (cust1_id, 'ไม่ใส่ถั่วลิสง (แพ้ถั่ว)', 'No Peanuts (Allergy)', '不加花生 (过敏)', 0.00, 3);


    -- ==========================================
    -- STORE 2: ลุงชัย ข้าวมันไก่ (Uncle Chai Chicken Rice)
    -- ==========================================
    INSERT INTO public.stores (id, owner_id, name, name_en, description, slug)
    VALUES (
        store2_id, owner_id, 
        'ลุงชัย ข้าวมันไก่', 'Uncle Chai Chicken Rice',
        'ข้าวมันไก่ตอนเนื้อนุ่ม น้ำจิ้มรสเด็ด',
        'lungchai-chickenrice'
    );

    -- Category: ข้าวมันไก่ (Chicken Rice)
    INSERT INTO public.menu_categories (id, store_id, name_th, name_en, sort_order)
    VALUES (cat2_id, store2_id, 'ข้าวมันไก่', 'Chicken Rice', 1);

    -- Item: ข้าวมันไก่ต้ม
    INSERT INTO public.menu_items (id, category_id, store_id, name_th, name_en, name_zh, description_en, description_zh, price, is_available, is_spicy, spicy_level)
    VALUES (
        item3_id, cat2_id, store2_id,
        'ข้าวมันไก่ต้ม', 'Boiled Chicken Rice', '海南鸡饭',
        'Steamed chicken with seasoned rice, served with clear soup and ginger-soy dipping sauce.',
        '白斩鸡配鸡油饭，附清汤和姜汁酱油。',
        50.00, true, false, 0
    );

    RAISE NOTICE 'Seed data inserted successfully!';
END $$;
