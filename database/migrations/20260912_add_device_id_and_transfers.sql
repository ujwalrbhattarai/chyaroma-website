-- Track which phone/device owns each order so we can lock a tab to a table and
-- alert staff if the same device tries to move to a different table while unpaid.
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS device_id VARCHAR(64);

-- Staff-approved table transfer requests (customer tab lock → cashier/manager approval).
CREATE TABLE IF NOT EXISTS table_transfer_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id VARCHAR(64),
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  from_table_id UUID NOT NULL REFERENCES branch_tables(id) ON DELETE CASCADE,
  to_table_id UUID NOT NULL REFERENCES branch_tables(id) ON DELETE CASCADE,
  status VARCHAR(16) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'denied')),
  resolved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_transfer_pending ON table_transfer_requests(status) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_transfer_device_target ON table_transfer_requests(device_id, to_table_id) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_orders_device ON orders(device_id);