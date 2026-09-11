-- Migration: Cashier Authentication & Inventory Idempotency
-- ---------------------------------------------------------------------------
-- 1. Make supplier_id optional in purchases table for simplified restock
ALTER TABLE purchases ALTER COLUMN supplier_id DROP NOT NULL;
ALTER TABLE purchases ALTER COLUMN unit_cost SET DEFAULT 0;

-- 2. Add processed_by to payments table to record the cashier who processed payment
ALTER TABLE payments ADD COLUMN IF NOT EXISTS processed_by UUID REFERENCES users(id) ON DELETE SET NULL;

-- 3. Add cashier_id to bills table
ALTER TABLE bills ADD COLUMN IF NOT EXISTS cashier_id UUID REFERENCES users(id) ON DELETE SET NULL;

-- 4. Update the prevent_immutable_bill_changes() trigger to allow updating
-- checkout_approved_at, cashier_id, and payment_method during approval
CREATE OR REPLACE FUNCTION prevent_immutable_bill_changes() RETURNS trigger AS $$
BEGIN
  IF OLD.immutable_at IS NOT NULL THEN
    IF (NEW.checkout_approved_at IS DISTINCT FROM OLD.checkout_approved_at
        OR NEW.cashier_id IS DISTINCT FROM OLD.cashier_id
        OR NEW.payment_method IS DISTINCT FROM OLD.payment_method)
       AND NEW.id IS NOT DISTINCT FROM OLD.id
       AND NEW.branch_id IS NOT DISTINCT FROM OLD.branch_id
       AND NEW.table_id IS NOT DISTINCT FROM OLD.table_id
       AND NEW.order_ids IS NOT DISTINCT FROM OLD.order_ids
       AND NEW.subtotal IS NOT DISTINCT FROM OLD.subtotal
       AND NEW.tax_rate IS NOT DISTINCT FROM OLD.tax_rate
       AND NEW.tax_amount IS NOT DISTINCT FROM OLD.tax_amount
       AND NEW.discount_amount IS NOT DISTINCT FROM OLD.discount_amount
       AND NEW.total_amount IS NOT DISTINCT FROM OLD.total_amount
       AND NEW.status IS NOT DISTINCT FROM OLD.status
       AND NEW.adjustment_of_bill_id IS NOT DISTINCT FROM OLD.adjustment_of_bill_id
       AND NEW.immutable_at IS NOT DISTINCT FROM OLD.immutable_at
       AND NEW.checkout_requested_at IS NOT DISTINCT FROM OLD.checkout_requested_at
       AND NEW.checkout_request_method IS NOT DISTINCT FROM OLD.checkout_request_method
    THEN
      RETURN NEW;
    END IF;
    RAISE EXCEPTION 'Finalized bills are immutable';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Create order_inventory_deductions table to enforce single deduction per order
CREATE TABLE IF NOT EXISTS order_inventory_deductions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  deducted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT order_inventory_deductions_order_id_unique UNIQUE (order_id)
);
