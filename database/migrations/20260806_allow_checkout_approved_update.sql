CREATE OR REPLACE FUNCTION prevent_immutable_bill_changes() RETURNS trigger AS $$
BEGIN
  IF OLD.immutable_at IS NOT NULL THEN
    IF NEW.checkout_approved_at IS DISTINCT FROM OLD.checkout_approved_at
       AND NEW.id IS NOT DISTINCT FROM OLD.id
       AND NEW.branch_id IS NOT DISTINCT FROM OLD.branch_id
       AND NEW.table_id IS NOT DISTINCT FROM OLD.table_id
       AND NEW.order_ids IS NOT DISTINCT FROM OLD.order_ids
       AND NEW.subtotal IS NOT DISTINCT FROM OLD.subtotal
       AND NEW.tax_rate IS NOT DISTINCT FROM OLD.tax_rate
       AND NEW.tax_amount IS NOT DISTINCT FROM OLD.tax_amount
       AND NEW.discount_amount IS NOT DISTINCT FROM OLD.discount_amount
       AND NEW.total_amount IS NOT DISTINCT FROM OLD.total_amount
       AND NEW.payment_method IS NOT DISTINCT FROM OLD.payment_method
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

DROP TRIGGER IF EXISTS bills_immutable_guard ON bills;
CREATE TRIGGER bills_immutable_guard BEFORE UPDATE OR DELETE ON bills FOR EACH ROW EXECUTE FUNCTION prevent_immutable_bill_changes();
