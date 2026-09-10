-- Migration 40: Fix missing ON DELETE CASCADE on menu FK constraints
-- Problem: Deleting menu items/categories fails due to missing CASCADE behaviour.
-- Also fixes menu_items.category_id to use ON DELETE SET NULL so categories can
-- be deleted without orphaning menu items.
--
-- Run this in the Supabase SQL editor (Dashboard -> SQL Editor -> New query).

-- 1. menu_item_allergens(menu_item_id) -> menu_items(id)  ON DELETE CASCADE
ALTER TABLE public.menu_item_allergens
  DROP CONSTRAINT IF EXISTS menu_item_allergens_menu_item_id_fkey;

ALTER TABLE public.menu_item_allergens
  ADD CONSTRAINT menu_item_allergens_menu_item_id_fkey
  FOREIGN KEY (menu_item_id)
  REFERENCES public.menu_items(id)
  ON DELETE CASCADE;

-- 2. menu_item_customizations(menu_item_id) -> menu_items(id)  ON DELETE CASCADE
ALTER TABLE public.menu_item_customizations
  DROP CONSTRAINT IF EXISTS menu_item_customizations_menu_item_id_fkey;

ALTER TABLE public.menu_item_customizations
  ADD CONSTRAINT menu_item_customizations_menu_item_id_fkey
  FOREIGN KEY (menu_item_id)
  REFERENCES public.menu_items(id)
  ON DELETE CASCADE;

-- 3. menu_item_customizations(group_id) -> customization_groups(id)  ON DELETE CASCADE
ALTER TABLE public.menu_item_customizations
  DROP CONSTRAINT IF EXISTS menu_item_customizations_group_id_fkey;

ALTER TABLE public.menu_item_customizations
  ADD CONSTRAINT menu_item_customizations_group_id_fkey
  FOREIGN KEY (group_id)
  REFERENCES public.customization_groups(id)
  ON DELETE CASCADE;

-- 4. customization_options(group_id) -> customization_groups(id)  ON DELETE CASCADE
ALTER TABLE public.customization_options
  DROP CONSTRAINT IF EXISTS customization_options_group_id_fkey;

ALTER TABLE public.customization_options
  ADD CONSTRAINT customization_options_group_id_fkey
  FOREIGN KEY (group_id)
  REFERENCES public.customization_groups(id)
  ON DELETE CASCADE;

-- 5. menu_items(category_id) -> menu_categories(id)  ON DELETE SET NULL
--    Allows deleting a category without also deleting its menu items.
ALTER TABLE public.menu_items
  DROP CONSTRAINT IF EXISTS menu_items_category_id_fkey;

ALTER TABLE public.menu_items
  ADD CONSTRAINT menu_items_category_id_fkey
  FOREIGN KEY (category_id)
  REFERENCES public.menu_categories(id)
  ON DELETE SET NULL;
