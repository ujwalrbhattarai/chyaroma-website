CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS bills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  table_id UUID NOT NULL REFERENCES branch_tables(id) ON DELETE CASCADE,
  order_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0,
  tax_rate NUMERIC(5, 2) NOT NULL DEFAULT 0,
  tax_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  discount_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  payment_method VARCHAR(40) NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'finalized', 'adjustment')),
  adjustment_of_bill_id UUID NULL REFERENCES bills(id) ON DELETE SET NULL,
  immutable_at TIMESTAMPTZ NULL,
  checkout_requested_at TIMESTAMPTZ NULL,
  checkout_approved_at TIMESTAMPTZ NULL,
  checkout_request_method VARCHAR(40) NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION prevent_immutable_bill_changes() RETURNS trigger AS $$
BEGIN
  IF OLD.immutable_at IS NOT NULL THEN
    RAISE EXCEPTION 'Finalized bills are immutable';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS bills_immutable_guard ON bills;
CREATE TRIGGER bills_immutable_guard BEFORE UPDATE OR DELETE ON bills FOR EACH ROW EXECUTE FUNCTION prevent_immutable_bill_changes();
