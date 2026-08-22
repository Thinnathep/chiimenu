-- ==============================================================================
-- 38_fix_orders_permission_and_rpc.sql
-- Fix: Allow Customer Order Submission via Database RLS & Service Role
-- ==============================================================================

-- 1. Grant table-level access for orders
GRANT SELECT, INSERT ON public.orders TO anon, authenticated;
GRANT ALL ON public.orders TO service_role;

-- 2. Database-First RLS Policy for Order Submission (Only active stores)
DROP POLICY IF EXISTS "Allow public insert orders" ON public.orders;
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

-- 3. Database-First Security Definer RPC for Safe Order Submission
CREATE OR REPLACE FUNCTION public.submit_customer_order(
  p_store_id UUID,
  p_table_no TEXT,
  p_items    JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_store RECORD;
  v_order_id UUID;
  v_result JSONB;
BEGIN
  -- Check Store existence and active state
  SELECT id, name, is_active
  INTO v_store
  FROM public.stores
  WHERE id = p_store_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Store not found';
  END IF;

  IF v_store.is_active IS FALSE THEN
    RAISE EXCEPTION 'This store is temporarily closed';
  END IF;

  -- Insert Order into orders table
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

-- 4. Grant RPC execute permission
GRANT EXECUTE ON FUNCTION public.submit_customer_order(UUID, TEXT, JSONB) TO anon, authenticated, service_role;
