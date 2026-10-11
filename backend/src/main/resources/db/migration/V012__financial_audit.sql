CREATE TABLE audit_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    actor_role VARCHAR(20) NOT NULL,
    action VARCHAR(50) NOT NULL,
    resource_type VARCHAR(50) NOT NULL,
    resource_id UUID NOT NULL,
    building_id UUID NOT NULL REFERENCES buildings(id) ON DELETE RESTRICT,
    reason TEXT,
    before_data JSONB,
    after_data JSONB NOT NULL,
    source_ref UUID,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);
CREATE INDEX idx_audit_building_time ON audit_events (building_id, recorded_at DESC);

CREATE FUNCTION audit_financial_insert() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE contract_uuid UUID; actor_uuid UUID; building_uuid UUID; reason_text TEXT;
BEGIN
    actor_uuid := NEW.actor_id;
    contract_uuid := NEW.contract_id;
    SELECT r.building_id INTO building_uuid FROM contracts c JOIN rooms r ON r.id = c.room_id WHERE c.id = contract_uuid;
    INSERT INTO audit_events (actor_id, actor_role, action, resource_type, resource_id, building_id,
                             reason, before_data, after_data, source_ref)
    SELECT actor_uuid, u.role, NEW.entry_type, TG_TABLE_NAME, NEW.id, building_uuid,
           NEW.note, NULL, jsonb_build_object('amount', NEW.amount::text, 'effectiveDate', NEW.effective_date,
              'contractId', NEW.contract_id, 'operationId', NEW.operation_id), NEW.ref_entry_id
    FROM users u WHERE u.id = actor_uuid;
    RETURN NEW;
END $$;
CREATE TRIGGER audit_invoice_ledger AFTER INSERT ON invoice_ledger_entries FOR EACH ROW EXECUTE FUNCTION audit_financial_insert();
CREATE TRIGGER audit_deposit_ledger AFTER INSERT ON deposit_ledger_entries FOR EACH ROW EXECUTE FUNCTION audit_financial_insert();

CREATE FUNCTION reject_financial_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Confirmed financial records are append-only'; END $$;
CREATE TRIGGER immutable_invoice_ledger BEFORE UPDATE OR DELETE ON invoice_ledger_entries FOR EACH ROW EXECUTE FUNCTION reject_financial_mutation();
CREATE TRIGGER immutable_deposit_ledger BEFORE UPDATE OR DELETE ON deposit_ledger_entries FOR EACH ROW EXECUTE FUNCTION reject_financial_mutation();
CREATE TRIGGER immutable_invoice_adjustments BEFORE UPDATE OR DELETE ON invoice_adjustments FOR EACH ROW EXECUTE FUNCTION reject_financial_mutation();
CREATE TRIGGER immutable_audit BEFORE UPDATE OR DELETE ON audit_events FOR EACH ROW EXECUTE FUNCTION reject_financial_mutation();
