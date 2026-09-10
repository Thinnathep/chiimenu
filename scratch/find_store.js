"""
Run this script once to create the missing SQL migration files 40 and 41.
Usage: python create_sql_migrations.py
(Rename this file to create_sql_migrations.py or run as-is via: python scratch/find_store.js)
"""
import os

base = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '_database_scripts')

sql_40 = """-- 40_fix_menu_fk_cascade.sql
-- Fix missing ON DELETE CASCADE on menu-related FK constraints
-- so that deleting menu items/categories cleans up related rows automatically.
-- Constraint names taken from Db.sql.

-- 1. menu_item_allergens(menu_item_id) -> menu_items(id) ON DELETE CASCADE
ALTER TABLE public.menu_item_allergens
  DROP CONSTRAINT IF EXISTS menu_item_allergens_menu_item_id_fkey;

ALTER TABLE public.menu_item_allergens
  ADD CONSTRAINT menu_item_allergens_menu_item_id_fkey
  FOREIGN KEY (menu_item_id)
  REFERENCES public.menu_items(id)
  ON DELETE CASCADE;

-- 2. menu_item_customizations(menu_item_id) -> menu_items(id) ON DELETE CASCADE
ALTER TABLE public.menu_item_customizations
  DROP CONSTRAINT IF EXISTS menu_item_customizations_menu_item_id_fkey;

ALTER TABLE public.menu_item_customizations
  ADD CONSTRAINT menu_item_customizations_menu_item_id_fkey
  FOREIGN KEY (menu_item_id)
  REFERENCES public.menu_items(id)
  ON DELETE CASCADE;

-- 3. menu_item_customizations(group_id) -> customization_groups(id) ON DELETE CASCADE
ALTER TABLE public.menu_item_customizations
  DROP CONSTRAINT IF EXISTS menu_item_customizations_group_id_fkey;

ALTER TABLE public.menu_item_customizations
  ADD CONSTRAINT menu_item_customizations_group_id_fkey
  FOREIGN KEY (group_id)
  REFERENCES public.customization_groups(id)
  ON DELETE CASCADE;

-- 4. customization_options(group_id) -> customization_groups(id) ON DELETE CASCADE
ALTER TABLE public.customization_options
  DROP CONSTRAINT IF EXISTS customization_options_group_id_fkey;

ALTER TABLE public.customization_options
  ADD CONSTRAINT customization_options_group_id_fkey
  FOREIGN KEY (group_id)
  REFERENCES public.customization_groups(id)
  ON DELETE CASCADE;

-- 5. menu_items(category_id) -> menu_categories(id) ON DELETE SET NULL
ALTER TABLE public.menu_items
  DROP CONSTRAINT IF EXISTS menu_items_category_id_fkey;

ALTER TABLE public.menu_items
  ADD CONSTRAINT menu_items_category_id_fkey
  FOREIGN KEY (category_id)
  REFERENCES public.menu_categories(id)
  ON DELETE SET NULL;
"""

sql_41 = """-- 41_fix_handle_new_user_trigger.sql
-- Fix handle_new_user() trigger to read full_name and phone from
-- raw_user_meta_data, which is populated by the register.vue page
-- during auth.signUp({ data: { full_name, phone } }).

-- Drop and recreate cleanly
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, phone, role)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', ''),
    new.raw_user_meta_data->>'phone',
    'merchant'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
"""

with open(os.path.join(base, '40_fix_menu_fk_cascade.sql'), 'w', encoding='utf-8') as f:
    f.write(sql_40)
print('Created 40_fix_menu_fk_cascade.sql')

with open(os.path.join(base, '41_fix_handle_new_user_trigger.sql'), 'w', encoding='utf-8') as f:
    f.write(sql_41)
print('Created 41_fix_handle_new_user_trigger.sql')

print('Done!')
