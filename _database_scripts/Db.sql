-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.profiles (
  id uuid NOT NULL,
  email text NOT NULL,
  full_name text,
  role text NOT NULL DEFAULT 'merchant'::text,
  pin_hash text,
  pin_attempts integer DEFAULT 0,
  pin_locked_until timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  phone character varying,
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
);
CREATE TABLE public.stores (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  name character varying NOT NULL,
  slug character varying NOT NULL UNIQUE,
  description text,
  store_type character varying,
  address text,
  default_language character varying DEFAULT 'th'::character varying,
  promptpay_qr_url text,
  logo_url text,
  cover_url text,
  is_active boolean DEFAULT true,
  plan_status character varying DEFAULT 'trial'::character varying,
  trial_ends_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  name_en text,
  name_zh text,
  line_user_id text,
  phone character varying,
  has_used_first_time_promo boolean DEFAULT false,
  description_en text,
  description_zh text,
  address_en text,
  address_zh text,
  CONSTRAINT stores_pkey PRIMARY KEY (id),
  CONSTRAINT stores_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.menu_categories (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL,
  name_th character varying NOT NULL,
  name_en character varying,
  sort_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  name_zh character varying,
  name_nod character varying,
  CONSTRAINT menu_categories_pkey PRIMARY KEY (id),
  CONSTRAINT menu_categories_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id)
);
CREATE TABLE public.menu_items (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL,
  category_id uuid,
  name_th character varying NOT NULL,
  name_en character varying,
  description_th text,
  description_en text,
  explanation_en text,
  price numeric NOT NULL,
  photo_url text,
  is_available boolean DEFAULT true,
  is_spicy boolean DEFAULT false,
  spicy_level smallint DEFAULT 0,
  sort_order integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  name_zh character varying,
  name_nod character varying,
  description_zh text,
  description_nod text,
  CONSTRAINT menu_items_pkey PRIMARY KEY (id),
  CONSTRAINT menu_items_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id),
  CONSTRAINT menu_items_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.menu_categories(id)
);
CREATE TABLE public.allergens (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name_th character varying NOT NULL,
  name_en character varying NOT NULL,
  icon character varying,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT allergens_pkey PRIMARY KEY (id)
);
CREATE TABLE public.menu_item_allergens (
  menu_item_id uuid NOT NULL,
  allergen_id uuid NOT NULL,
  CONSTRAINT menu_item_allergens_pkey PRIMARY KEY (menu_item_id, allergen_id),
  CONSTRAINT menu_item_allergens_menu_item_id_fkey FOREIGN KEY (menu_item_id) REFERENCES public.menu_items(id),
  CONSTRAINT menu_item_allergens_allergen_id_fkey FOREIGN KEY (allergen_id) REFERENCES public.allergens(id)
);
CREATE TABLE public.customization_groups (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL,
  name_th character varying NOT NULL,
  name_en character varying,
  is_required boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  name_zh character varying,
  name_nod character varying,
  CONSTRAINT customization_groups_pkey PRIMARY KEY (id),
  CONSTRAINT customization_groups_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id)
);
CREATE TABLE public.customization_options (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL,
  name_th character varying NOT NULL,
  name_en character varying,
  extra_price numeric DEFAULT 0,
  sort_order integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  name_zh character varying,
  name_nod character varying,
  CONSTRAINT customization_options_pkey PRIMARY KEY (id),
  CONSTRAINT customization_options_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.customization_groups(id)
);
CREATE TABLE public.menu_item_customizations (
  menu_item_id uuid NOT NULL,
  group_id uuid NOT NULL,
  CONSTRAINT menu_item_customizations_pkey PRIMARY KEY (menu_item_id, group_id),
  CONSTRAINT menu_item_customizations_menu_item_id_fkey FOREIGN KEY (menu_item_id) REFERENCES public.menu_items(id),
  CONSTRAINT menu_item_customizations_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.customization_groups(id)
);
CREATE TABLE public.qr_codes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL,
  label character varying,
  short_code character varying NOT NULL UNIQUE,
  qr_image_url text,
  scan_count integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  table_identifier text,
  CONSTRAINT qr_codes_pkey PRIMARY KEY (id),
  CONSTRAINT qr_codes_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id)
);
CREATE TABLE public.usage_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL,
  qr_code_id uuid,
  event_type character varying NOT NULL,
  metadata jsonb,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT usage_logs_pkey PRIMARY KEY (id),
  CONSTRAINT usage_logs_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id),
  CONSTRAINT usage_logs_qr_code_id_fkey FOREIGN KEY (qr_code_id) REFERENCES public.qr_codes(id)
);
CREATE TABLE public.admin_access_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  action character varying NOT NULL,
  ip_address text,
  user_agent text,
  metadata jsonb,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT admin_access_logs_pkey PRIMARY KEY (id),
  CONSTRAINT admin_access_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.admin_action_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL,
  action character varying NOT NULL,
  target_store_id uuid NOT NULL,
  details jsonb,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT admin_action_logs_pkey PRIMARY KEY (id),
  CONSTRAINT admin_action_logs_admin_id_fkey FOREIGN KEY (admin_id) REFERENCES auth.users(id),
  CONSTRAINT admin_action_logs_target_store_id_fkey FOREIGN KEY (target_store_id) REFERENCES public.stores(id)
);
CREATE TABLE public.orders (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL,
  table_no text NOT NULL,
  items jsonb NOT NULL,
  status text NOT NULL DEFAULT 'pending'::text,
  line_notified boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  cancel_reason text,
  cancelled_at timestamp with time zone,
  CONSTRAINT orders_pkey PRIMARY KEY (id),
  CONSTRAINT orders_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id)
);
CREATE TABLE public.admins (
  id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT admins_pkey PRIMARY KEY (id),
  CONSTRAINT admins_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
);
CREATE TABLE public.billing_records (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL,
  receipt_number text NOT NULL UNIQUE,
  package_name text NOT NULL,
  package_days integer NOT NULL,
  amount numeric NOT NULL,
  payment_method text NOT NULL DEFAULT 'bank_transfer'::text,
  paid_at timestamp with time zone NOT NULL DEFAULT now(),
  plan_start_at timestamp with time zone NOT NULL,
  plan_end_at timestamp with time zone NOT NULL,
  note text,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  company_name text,
  company_address text,
  tax_id text,
  net_amount numeric,
  vat_amount numeric,
  original_amount numeric,
  discount_amount numeric,
  promotion_code text,
  CONSTRAINT billing_records_pkey PRIMARY KEY (id),
  CONSTRAINT billing_records_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id),
  CONSTRAINT billing_records_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id)
);
CREATE TABLE public.rate_limits (
  ip text NOT NULL,
  request_count integer NOT NULL DEFAULT 1,
  reset_at bigint NOT NULL,
  CONSTRAINT rate_limits_pkey PRIMARY KEY (ip)
);
CREATE TABLE public.push_subscriptions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  store_id uuid,
  endpoint text NOT NULL UNIQUE,
  p256dh text NOT NULL,
  auth text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT push_subscriptions_pkey PRIMARY KEY (id),
  CONSTRAINT push_subscriptions_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id)
);