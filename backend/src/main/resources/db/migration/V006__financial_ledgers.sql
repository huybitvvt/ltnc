-- V006: Sổ cái thu tiền hóa đơn, sửa thu, hoàn tiền và chuyển dư (Invoice Ledger Entries)
-- Tuân thủ: BR-087..BR-104, EX-08..EX-16, EX-22..EX-25

CREATE TABLE IF NOT EXISTS invoice_ledger_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE RESTRICT,
    contract_id UUID NOT NULL REFERENCES contracts(id) ON DELETE RESTRICT,
    entry_type VARCHAR(32) NOT NULL, -- PAYMENT, PAYMENT_CORRECTION, REFUND, CREDIT_APPLIED, DEPOSIT_OFFSET
    amount NUMERIC(19, 0) NOT NULL,
    payment_method VARCHAR(32) NOT NULL, -- CASH, BANK_TRANSFER, MOMO, VNPAY, INTERNAL_TRANSFER
    reference_code VARCHAR(128),
    note TEXT,
    ref_entry_id UUID REFERENCES invoice_ledger_entries(id) ON DELETE RESTRICT,
    operation_id UUID REFERENCES financial_operations(id) ON DELETE RESTRICT,
    actor_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_inv_ledger_amount_not_zero CHECK (amount <> 0),
    CONSTRAINT chk_inv_ledger_entry_type CHECK (entry_type IN ('PAYMENT', 'PAYMENT_CORRECTION', 'REFUND', 'CREDIT_APPLIED', 'DEPOSIT_OFFSET')),
    CONSTRAINT chk_inv_ledger_payment_method CHECK (payment_method IN ('CASH', 'BANK_TRANSFER', 'MOMO', 'VNPAY', 'INTERNAL_TRANSFER'))
);

CREATE INDEX IF NOT EXISTS idx_inv_ledger_invoice ON invoice_ledger_entries(invoice_id, recorded_at ASC);
CREATE INDEX IF NOT EXISTS idx_inv_ledger_contract ON invoice_ledger_entries(contract_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_inv_ledger_ref_entry ON invoice_ledger_entries(ref_entry_id);
