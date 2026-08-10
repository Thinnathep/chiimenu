-- =============================================
-- ChiiMenu MVP Schema (Day 1)
-- =============================================

-- =============================================
-- 1. PROFILES (ข้อมูล user เสริมจาก Supabase Auth)
-- =============================================
CREATE TABLE profiles (
    id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email       TEXT NOT NULL,
    full_name   TEXT,
    role        TEXT NOT NULL DEFAULT 'merchant', 
                -- 'merchant' = ร้านค้าทั่วไป, 'super_admin' = แอดมิน
    pin_hash    TEXT, -- bcrypt hash ของ PIN 6 หลัก (เฉพาะ admin)
    pin_attempts INTEGER DEFAULT 0,
    pin_locked_until TIMESTAMP WITH TIME ZONE,
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- 2. STORES (ร้านค้า — 1 merchant = 1 store ใน MVP)
-- =============================================
CREATE TABLE stores (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id        UUID NOT NULL REFERENCES profiles(id),
    name            VARCHAR(255) NOT NULL,
    slug            VARCHAR(255) UNIQUE NOT NULL,
    description     TEXT,
    store_type      VARCHAR(50),  -- restaurant, cafe, street_food, drink
    address         TEXT,
    default_language VARCHAR(5) DEFAULT 'th',
    promptpay_qr_url TEXT,
    logo_url        TEXT,
    cover_url       TEXT,
    is_active       BOOLEAN DEFAULT true,
    plan_status     VARCHAR(20) DEFAULT 'trial',
    trial_ends_at   TIMESTAMP WITH TIME ZONE,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- 3. MENU CATEGORIES
-- =============================================
CREATE TABLE menu_categories (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id    UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    name_th     VARCHAR(255) NOT NULL,
    name_en     VARCHAR(255),
    sort_order  INTEGER DEFAULT 0,
    is_active   BOOLEAN DEFAULT true,
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- 4. MENU ITEMS
-- =============================================
CREATE TABLE menu_items (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id        UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    category_id     UUID REFERENCES menu_categories(id) ON DELETE SET NULL,
    name_th         VARCHAR(255) NOT NULL,
    name_en         VARCHAR(255),
    description_th  TEXT,
    description_en  TEXT,
    explanation_en  TEXT,
    price           DECIMAL(10,2) NOT NULL,
    photo_url       TEXT,
    is_available    BOOLEAN DEFAULT true,
    is_spicy        BOOLEAN DEFAULT false,
    spicy_level     SMALLINT DEFAULT 0,
    sort_order      INTEGER DEFAULT 0,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- 5. ALLERGENS & MENU_ITEM_ALLERGENS
-- =============================================
CREATE TABLE allergens (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name_th     VARCHAR(100) NOT NULL,
    name_en     VARCHAR(100) NOT NULL,
    icon        VARCHAR(50),
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE menu_item_allergens (
    menu_item_id UUID REFERENCES menu_items(id) ON DELETE CASCADE,
    allergen_id  UUID REFERENCES allergens(id) ON DELETE CASCADE,
    PRIMARY KEY (menu_item_id, allergen_id)
);

-- =============================================
-- 6. CUSTOMIZATION
-- =============================================
CREATE TABLE customization_groups (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id    UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    name_th     VARCHAR(255) NOT NULL,
    name_en     VARCHAR(255),
    is_required BOOLEAN DEFAULT false,
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE customization_options (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id    UUID NOT NULL REFERENCES customization_groups(id) ON DELETE CASCADE,
    name_th     VARCHAR(255) NOT NULL,
    name_en     VARCHAR(255),
    extra_price DECIMAL(10,2) DEFAULT 0,
    sort_order  INTEGER DEFAULT 0,
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE menu_item_customizations (
    menu_item_id UUID REFERENCES menu_items(id) ON DELETE CASCADE,
    group_id     UUID REFERENCES customization_groups(id) ON DELETE CASCADE,
    PRIMARY KEY (menu_item_id, group_id)
);

-- =============================================
-- 7. QR CODES
-- =============================================
CREATE TABLE qr_codes (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id    UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    label       VARCHAR(255),
    short_code  VARCHAR(20) UNIQUE NOT NULL,
    qr_image_url TEXT,
    scan_count  INTEGER DEFAULT 0,
    is_active   BOOLEAN DEFAULT true,
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- 8. USAGE LOGS & ADMIN LOGS
-- =============================================
CREATE TABLE usage_logs (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id    UUID NOT NULL REFERENCES stores(id),
    qr_code_id  UUID REFERENCES qr_codes(id),
    event_type  VARCHAR(50) NOT NULL,
    metadata    JSONB,
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE admin_access_logs (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES profiles(id),
    action      VARCHAR(50) NOT NULL,
    ip_address  TEXT,
    user_agent  TEXT,
    metadata    JSONB,
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- INDEXES
-- =============================================
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_stores_owner ON stores(owner_id);
CREATE INDEX idx_stores_slug ON stores(slug);
CREATE INDEX idx_menu_items_store ON menu_items(store_id);
CREATE INDEX idx_menu_items_category ON menu_items(category_id);
CREATE INDEX idx_menu_categories_store ON menu_categories(store_id);
CREATE INDEX idx_qr_codes_store ON qr_codes(store_id);
CREATE INDEX idx_qr_codes_short_code ON qr_codes(short_code);

-- =============================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE allergens ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_item_allergens ENABLE ROW LEVEL SECURITY;
ALTER TABLE customization_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE customization_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_item_customizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE qr_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_access_logs ENABLE ROW LEVEL SECURITY;

-- 1. Profiles: Own profile or Super Admin
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- 2. Stores: Owner manages, Admin manages, Public views active
CREATE POLICY "Owner can manage own store" ON stores FOR ALL 
USING (owner_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin'));
CREATE POLICY "Public can view active stores" ON stores FOR SELECT USING (is_active = true);

-- 3. Menu Categories
CREATE POLICY "Owner can manage categories" ON menu_categories FOR ALL 
USING (store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid()) OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin'));
CREATE POLICY "Public can view active categories" ON menu_categories FOR SELECT USING (is_active = true AND store_id IN (SELECT id FROM stores WHERE is_active = true));

-- 4. Menu Items
CREATE POLICY "Owner can manage items" ON menu_items FOR ALL 
USING (store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid()) OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin'));
CREATE POLICY "Public can view available items" ON menu_items FOR SELECT USING (is_available = true AND store_id IN (SELECT id FROM stores WHERE is_active = true));

-- 5. Allergens (Public Read)
CREATE POLICY "Public can view allergens" ON allergens FOR SELECT USING (true);

-- 6. Menu Item Allergens
CREATE POLICY "Public can view item allergens" ON menu_item_allergens FOR SELECT USING (true);
CREATE POLICY "Owner can manage item allergens" ON menu_item_allergens FOR ALL 
USING (menu_item_id IN (SELECT id FROM menu_items WHERE store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid())));

-- 7. Customizations
CREATE POLICY "Owner can manage custom groups" ON customization_groups FOR ALL 
USING (store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid()) OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin'));
CREATE POLICY "Public can view custom groups" ON customization_groups FOR SELECT USING (store_id IN (SELECT id FROM stores WHERE is_active = true));

CREATE POLICY "Owner can manage custom options" ON customization_options FOR ALL 
USING (group_id IN (SELECT id FROM customization_groups WHERE store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid())));
CREATE POLICY "Public can view custom options" ON customization_options FOR SELECT USING (true);

CREATE POLICY "Owner can manage item customizations" ON menu_item_customizations FOR ALL 
USING (menu_item_id IN (SELECT id FROM menu_items WHERE store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid())));
CREATE POLICY "Public can view item customizations" ON menu_item_customizations FOR SELECT USING (true);

-- 8. QR Codes
CREATE POLICY "Owner can manage QR" ON qr_codes FOR ALL 
USING (store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid()) OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin'));
CREATE POLICY "Public can view QR" ON qr_codes FOR SELECT USING (is_active = true);

-- 9. Usage Logs (Owner reads own, Admin reads all)
CREATE POLICY "Owner can read logs" ON usage_logs FOR SELECT 
USING (store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid()) OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin'));

-- 10. Admin Access Logs (Super Admin only)
CREATE POLICY "Admins can read access logs" ON admin_access_logs FOR SELECT 
USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin'));

-- =============================================
-- AUTO CREATE PROFILE ON SIGNUP (Trigger)
-- =============================================
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (new.id, new.email, new.raw_user_meta_data->>'full_name', 'merchant');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- =============================================
-- SEED ALLERGENS
-- =============================================
INSERT INTO allergens (name_th, name_en, icon) VALUES 
('ถั่วลิสง', 'Peanuts', '🥜'),
('นม', 'Milk/Dairy', '🥛'),
('ไข่', 'Eggs', '🥚'),
('กุ้ง/ปู/หอย', 'Shellfish', '🦐'),
('ถั่วเหลือง', 'Soy', '🫘'),
('กลูเตน/แป้งสาลี', 'Gluten/Wheat', '🌾'),
('งา', 'Sesame', '🌱'),
('ปลา', 'Fish', '🐟');
