-- Preserve existing entries; new transfers identify each side explicitly.
ALTER TABLE invoice_ledger_entries DROP CONSTRAINT chk_inv_ledger_entry_type;
ALTER TABLE invoice_ledger_entries ADD CONSTRAINT chk_inv_ledger_entry_type CHECK
    (entry_type IN ('PAYMENT', 'PAYMENT_CORRECTION', 'REFUND', 'CREDIT_APPLIED', 'CREDIT_OUT', 'CREDIT_IN', 'DEPOSIT_OFFSET'));
ALTER TABLE invoice_ledger_entries ADD CONSTRAINT chk_credit_transfer_direction CHECK
    ((entry_type <> 'CREDIT_OUT' OR amount < 0) AND (entry_type <> 'CREDIT_IN' OR amount > 0));
