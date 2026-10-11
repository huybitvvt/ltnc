ALTER TABLE financial_operations DROP CONSTRAINT IF EXISTS financial_operations_idempotency_key_key;
ALTER TABLE financial_operations ADD CONSTRAINT uq_financial_actor_key UNIQUE (actor_id, idempotency_key);
ALTER TABLE invoice_ledger_entries ADD COLUMN effective_date DATE;
UPDATE invoice_ledger_entries SET effective_date = (recorded_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date;
ALTER TABLE invoice_ledger_entries ALTER COLUMN effective_date SET NOT NULL;
ALTER TABLE deposit_ledger_entries ADD COLUMN effective_date DATE;
UPDATE deposit_ledger_entries SET effective_date = (recorded_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date;
ALTER TABLE deposit_ledger_entries ALTER COLUMN effective_date SET NOT NULL;
CREATE INDEX idx_invoice_ledger_effective ON invoice_ledger_entries (effective_date, invoice_id);
