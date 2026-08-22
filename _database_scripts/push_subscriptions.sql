-- ============================================================
-- ChiiMenu: Push Notifications (PWA)
-- Run this in Supabase SQL Editor
-- ============================================================

-- Table: push_subscriptions
-- Stores Web Push subscriptions per merchant store
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id     uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  endpoint     text NOT NULL,
  p256dh       text NOT NULL,
  auth         text NOT NULL,
  user_agent   text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE(endpoint)
);

-- Index for fast lookup by store
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_store_id ON push_subscriptions(store_id);

-- RLS
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Allow store owner to manage their subscriptions
CREATE POLICY "store_owner_manage_push_subs"
  ON push_subscriptions FOR ALL
  USING (
    store_id IN (
      SELECT id FROM stores WHERE owner_id = auth.uid()
    )
  )
  WITH CHECK (
    store_id IN (
      SELECT id FROM stores WHERE owner_id = auth.uid()
    )
  );

-- Trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER push_subscriptions_updated_at
  BEFORE UPDATE ON push_subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- OPTIONAL: Supabase Webhook to trigger push notification
-- Go to: Supabase Dashboard > Database > Webhooks > Create
--
-- Name: order_push_notify
-- Table: orders
-- Events: INSERT
-- HTTP Method: POST
-- URL: https://your-domain.com/api/push/notify
-- Headers:
--   Content-Type: application/json
-- Body (JSON Template):
-- {
--   "storeId": "{{record.store_id}}",
--   "orderId": "{{record.id}}",
--   "title": "ออเดอร์ใหม่เข้ามา!",
--   "message": "โต๊ะ {{record.table_number}} สั่งอาหารแล้ว",
--   "secret": "chiimenu_push_webhook_secret_2026"
-- }
-- ============================================================
