CREATE FUNCTION protect_issued_invoice() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    IF OLD.status = 'ISSUED' THEN
        IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'Issued invoice cannot be deleted'; END IF;
        IF ROW(NEW.contract_id,NEW.billing_month,NEW.status,NEW.period_start,NEW.period_end_exclusive,NEW.due_date,NEW.issued_at)
           IS DISTINCT FROM ROW(OLD.contract_id,OLD.billing_month,OLD.status,OLD.period_start,OLD.period_end_exclusive,OLD.due_date,OLD.issued_at)
        THEN RAISE EXCEPTION 'Issued invoice snapshot is immutable'; END IF;
    END IF;
    IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
    RETURN NEW;
END $$;
CREATE TRIGGER immutable_issued_invoice BEFORE UPDATE OR DELETE ON invoices FOR EACH ROW EXECUTE FUNCTION protect_issued_invoice();

CREATE FUNCTION protect_issued_item() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE parent_id UUID;
BEGIN
    IF TG_OP='INSERT' THEN parent_id:=NEW.invoice_id; ELSE parent_id:=OLD.invoice_id; END IF;
    PERFORM 1 FROM invoices WHERE id=parent_id AND status='ISSUED';
    IF FOUND THEN RAISE EXCEPTION 'Issued invoice items are immutable'; END IF;
    IF TG_OP='UPDATE' AND NEW.invoice_id IS DISTINCT FROM OLD.invoice_id THEN
        PERFORM 1 FROM invoices WHERE id=NEW.invoice_id AND status='ISSUED';
        IF FOUND THEN RAISE EXCEPTION 'Cannot move item into issued invoice'; END IF;
    END IF;
    IF TG_OP='DELETE' THEN RETURN OLD; END IF;
    RETURN NEW;
END $$;
CREATE TRIGGER immutable_issued_items BEFORE INSERT OR UPDATE OR DELETE ON invoice_items FOR EACH ROW EXECUTE FUNCTION protect_issued_item();
