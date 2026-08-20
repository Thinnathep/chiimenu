-- ============================================================
-- ChiiMenu Merchant Analytics RPC
-- ฟังก์ชันประมวลผลข้อมูลการขายและสรุปสถิติสำหรับ Merchant Dashboard
-- รองรับ: วันนี้ (today), 7 วันล่าสุด (7days), เดือนนี้ (month), ปีนี้ (year)
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_merchant_analytics(
  p_store_id UUID,
  p_period   TEXT DEFAULT 'today' -- 'today', '7days', 'month', 'year'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_caller_id UUID := auth.uid();
  v_start_time TIMESTAMPTZ;
  v_end_time TIMESTAMPTZ;
  v_now_bkk TIMESTAMPTZ := NOW() AT TIME ZONE 'Asia/Bangkok';
  v_today_start TIMESTAMPTZ := (date_trunc('day', v_now_bkk) AT TIME ZONE 'Asia/Bangkok');
  v_result JSONB;
BEGIN
  -- 1. Security Check: Validate Store Ownership or Admin access
  IF NOT (
    EXISTS (SELECT 1 FROM public.stores WHERE id = p_store_id AND owner_id = v_caller_id)
    OR EXISTS (SELECT 1 FROM public.admins WHERE id = v_caller_id)
  ) THEN
    RAISE EXCEPTION 'Unauthorized: You do not have permission to view analytics for this store';
  END IF;

  -- 2. Determine Date Bounds (Asia/Bangkok Timezone UTC+7)
  IF p_period = 'today' THEN
    v_start_time := v_today_start;
    v_end_time := v_today_start + INTERVAL '1 day';
  ELSIF p_period = '7days' THEN
    v_start_time := v_today_start - INTERVAL '6 days';
    v_end_time := v_today_start + INTERVAL '1 day';
  ELSIF p_period = 'month' THEN
    v_start_time := (date_trunc('month', v_now_bkk) AT TIME ZONE 'Asia/Bangkok');
    v_end_time := (date_trunc('month', v_now_bkk) + INTERVAL '1 month') AT TIME ZONE 'Asia/Bangkok';
  ELSIF p_period = 'year' THEN
    v_start_time := (date_trunc('year', v_now_bkk) AT TIME ZONE 'Asia/Bangkok');
    v_end_time := (date_trunc('year', v_now_bkk) + INTERVAL '1 year') AT TIME ZONE 'Asia/Bangkok';
  ELSE
    -- Default to 7 days
    v_start_time := v_today_start - INTERVAL '6 days';
    v_end_time := v_today_start + INTERVAL '1 day';
  END IF;

  -- 3. Execute DB-Side Aggregation
  WITH store_orders AS (
    SELECT
      o.id,
      o.table_no,
      o.status,
      o.items,
      o.created_at,
      -- Compute total order price from JSONB items
      COALESCE((
        SELECT SUM(
          COALESCE((it->>'unitPrice')::NUMERIC, (it->>'price')::NUMERIC, (it->'menuItem'->>'price')::NUMERIC, 0)
          * COALESCE((it->>'quantity')::NUMERIC, 1)
        )
        FROM jsonb_array_elements(o.items) AS it
      ), 0) AS order_total,
      -- Compute items count in order
      COALESCE((
        SELECT SUM(COALESCE((it->>'quantity')::NUMERIC, 1))
        FROM jsonb_array_elements(o.items) AS it
      ), 0) AS items_count
    FROM public.orders o
    WHERE o.store_id = p_store_id
      AND o.created_at >= v_start_time
      AND o.created_at < v_end_time
  ),
  valid_orders AS (
    SELECT * FROM store_orders
    WHERE status != 'cancelled'
  ),
  kpi_summary AS (
    SELECT
      COALESCE(SUM(order_total), 0) AS total_sales,
      COUNT(*)::INT AS total_orders,
      COALESCE(SUM(items_count), 0)::INT AS total_items_sold,
      CASE 
        WHEN COUNT(*) > 0 THEN ROUND((COALESCE(SUM(order_total), 0) / COUNT(*))::NUMERIC, 2)
        ELSE 0 
      END AS avg_order_value
    FROM valid_orders
  ),
  order_status_summary AS (
    SELECT
      COUNT(*)::INT AS total_orders,
      COUNT(*) FILTER (WHERE status = 'completed' OR status = 'paid' OR status = 'confirmed')::INT AS completed_orders,
      COUNT(*) FILTER (WHERE status = 'pending')::INT AS pending_orders,
      COUNT(*) FILTER (WHERE status = 'cancelled')::INT AS cancelled_orders
    FROM store_orders
  ),
  daily_breakdown AS (
    SELECT
      CASE 
        WHEN p_period = 'year' THEN TO_CHAR(created_at AT TIME ZONE 'Asia/Bangkok', 'YYYY-MM')
        ELSE TO_CHAR(created_at AT TIME ZONE 'Asia/Bangkok', 'YYYY-MM-DD')
      END AS sale_date,
      CASE 
        WHEN p_period = 'year' THEN TO_CHAR(created_at AT TIME ZONE 'Asia/Bangkok', 'MM')
        ELSE TO_CHAR(created_at AT TIME ZONE 'Asia/Bangkok', 'DD/MM')
      END AS display_date,
      COALESCE(SUM(order_total), 0) AS sales,
      COUNT(*)::INT AS order_count
    FROM valid_orders
    GROUP BY 1, 2
    ORDER BY 1 ASC
  ),
  top_items AS (
    SELECT
      COALESCE(it->'menuItem'->>'name_th', it->>'name_th', 'เมนูอาหาร') AS name_th,
      COALESCE(it->'menuItem'->>'name_en', it->>'name_en', '') AS name_en,
      COALESCE(it->'menuItem'->>'name_zh', it->>'name_zh', '') AS name_zh,
      SUM(COALESCE((it->>'quantity')::NUMERIC, 1))::INT AS quantity_sold,
      SUM(
        COALESCE((it->>'unitPrice')::NUMERIC, (it->>'price')::NUMERIC, (it->'menuItem'->>'price')::NUMERIC, 0)
        * COALESCE((it->>'quantity')::NUMERIC, 1)
      ) AS total_sales
    FROM valid_orders o,
    jsonb_array_elements(o.items) AS it
    GROUP BY 1, 2, 3
    ORDER BY quantity_sold DESC, total_sales DESC
    LIMIT 10
  )
  SELECT jsonb_build_object(
    'period', p_period,
    'start_time', v_start_time,
    'end_time', v_end_time,
    'kpi', (SELECT row_to_json(kpi_summary) FROM kpi_summary),
    'order_status', (SELECT row_to_json(order_status_summary) FROM order_status_summary),
    'daily_sales', COALESCE((SELECT jsonb_agg(row_to_json(daily_breakdown)) FROM daily_breakdown), '[]'::jsonb),
    'top_items', COALESCE((SELECT jsonb_agg(row_to_json(top_items)) FROM top_items), '[]'::jsonb)
  ) INTO v_result;

  RETURN v_result;
END;
$$;

-- Grant access to authenticated users
GRANT EXECUTE ON FUNCTION public.get_merchant_analytics(UUID, TEXT) TO authenticated;
