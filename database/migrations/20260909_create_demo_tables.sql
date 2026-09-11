-- Demo Sessions table: tracks each isolated visitor demo session
CREATE TABLE IF NOT EXISTS demo_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add demo flag and session reference to orders
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS is_demo BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS demo_session_id UUID REFERENCES demo_sessions(id) ON DELETE SET NULL;

-- Add demo flag and session reference to bills
ALTER TABLE bills
  ADD COLUMN IF NOT EXISTS is_demo BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS demo_session_id UUID REFERENCES demo_sessions(id) ON DELETE SET NULL;

-- Index for efficient session-scoped queries
CREATE INDEX IF NOT EXISTS idx_orders_demo_session ON orders(demo_session_id) WHERE is_demo = TRUE;
CREATE INDEX IF NOT EXISTS idx_bills_demo_session ON bills(demo_session_id) WHERE is_demo = TRUE;

-- Index to quickly find and clean up expired sessions
CREATE INDEX IF NOT EXISTS idx_demo_sessions_expires ON demo_sessions(expires_at);
