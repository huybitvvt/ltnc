-- The same referenced expense cannot be billed and deducted from deposit.
-- DEDUCTION.note stores the expenseRef supplied by the existing API.
CREATE FUNCTION guard_expense_reference() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE expense TEXT;
BEGIN
    IF TG_TABLE_NAME = 'deposit_ledger_entries' THEN
        IF NEW.entry_type <> 'DEDUCTION' THEN RETURN NEW; END IF;
        expense := NULLIF(btrim(NEW.note), '');
    ELSE
        expense := NULLIF(btrim(NEW.source_ref), '');
    END IF;
    IF expense IS NULL THEN RETURN NEW; END IF;
    PERFORM pg_advisory_xact_lock(hashtextextended(NEW.contract_id::text || ':expense:' || expense, 0));
    IF EXISTS (SELECT 1 FROM one_off_charges WHERE contract_id = NEW.contract_id AND btrim(source_ref) = expense)
       OR EXISTS (SELECT 1 FROM deposit_ledger_entries WHERE contract_id = NEW.contract_id
                  AND entry_type = 'DEDUCTION' AND btrim(note) = expense) THEN
        RAISE EXCEPTION 'Expense reference already charged: %', expense USING ERRCODE = '23505';
    END IF;
    RETURN NEW;
END $$;
CREATE TRIGGER guard_charge_expense BEFORE INSERT ON one_off_charges FOR EACH ROW EXECUTE FUNCTION guard_expense_reference();
CREATE TRIGGER guard_deposit_expense BEFORE INSERT ON deposit_ledger_entries FOR EACH ROW EXECUTE FUNCTION guard_expense_reference();

-- Preserve the correction/refund reason, rather than only the receipt note.
CREATE OR REPLACE FUNCTION audit_financial_insert() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE building_uuid UUID; reason_text TEXT;
BEGIN
    SELECT r.building_id INTO building_uuid FROM contracts c JOIN rooms r ON r.id = c.room_id WHERE c.id = NEW.contract_id;
    reason_text := NEW.note;
    IF TG_TABLE_NAME = 'deposit_ledger_entries' THEN reason_text := COALESCE(NEW.reason, NEW.note); END IF;
    INSERT INTO audit_events (actor_id, actor_role, action, resource_type, resource_id, building_id,
                             reason, before_data, after_data, source_ref)
    SELECT NEW.actor_id, u.role, NEW.entry_type, TG_TABLE_NAME, NEW.id, building_uuid,
           reason_text, NULL, jsonb_build_object('amount', NEW.amount::text, 'effectiveDate', NEW.effective_date,
              'contractId', NEW.contract_id, 'operationId', NEW.operation_id), NEW.ref_entry_id
    FROM users u WHERE u.id = NEW.actor_id;
    RETURN NEW;
END $$;
