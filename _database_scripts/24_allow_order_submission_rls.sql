-- ============================================================
-- ChiiMenu Customer Order Submission RLS Policy & RPC
-- อนุญาตให้ลูกค้า (anon / authenticated) ส่งออเดอร์เข้าสู่ระบบร้านค้า
-- ============================================================

-- 1. Drop existing insert policy if any
DROP POLICY IF EXISTS "Allow public insert orders" ON public.orders;
DROP POLICY IF EXISTS "Allow anon insert orders" ON public.orders;

-- 2. Create Database-First Insert Policy for orders
CREATE POLICY "Allow public insert orders"
ON public.orders
FOR INSERT
TO anon, authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.stores
    WHERE stores.id = orders.store_id 
      AND (stores.is_active IS TRUE OR stores.is_active IS NULL)
  )
);

-- 3. Grant table access permissions to anon and authenticated roles
GRANT SELECT, INSERT ON public.orders TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.orders TO authenticated;
GRANT ALL ON public.orders TO service_role;

-- 4. Database-First Security Definer RPC for Safe Order Submission
CREATE OR REPLACE FUNCTION public.submit_customer_order(
  p_store_id UUID,
  p_table_no TEXT,
  p_items    JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_store RECORD;
  v_order_id UUID;
  v_result JSONB;
BEGIN
  -- 1. Check Store existence and active state
  SELECT id, name, is_active, plan_status, trial_ends_at
  INTO v_store
  FROM public.stores
  WHERE id = p_store_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Store not found';
  END IF;

  IF v_store.is_active IS FALSE THEN
    RAISE EXCEPTION 'This store is temporarily closed';
  END IF;

  -- 2. Insert Order into orders table
  INSERT INTO public.orders (
    store_id,
    table_no,
    items,
    status,
    line_notified
  )
  VALUES (
    p_store_id,
    p_table_no,
    p_items,
    'pending',
    false
  )
  RETURNING id INTO v_order_id;

  SELECT row_to_json(o) INTO v_result
  FROM public.orders o
  WHERE o.id = v_order_id;

  RETURN v_result;
END;
$$;

-- Grant execute to anon and authenticated
GRANT EXECUTE ON FUNCTION public.submit_customer_order(UUID, TEXT, JSONB) TO anon, authenticated;
