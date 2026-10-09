-- V007__deposit_ledger.sql
-- Quản lý tiền cọc, sổ cọc bất biến, khấu trừ, hoàn cọc, bù trừ hóa đơn và quyết toán (BR-105..BR-122)

ALTER TABLE contracts
    ADD COLUMN IF NOT EXISTS deposit_status VARCHAR(20) NOT NULL DEFAULT 'NOT_RECEIVED',
    ADD COLUMN IF NOT EXISTS deposit_settled_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS deposit_ledger_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_id UUID NOT NULL REFERENCES contracts(id) ON DELETE RESTRICT,
    entry_type VARCHAR(30) NOT NULL,
    amount NUMERIC(19, 0) NOT NULL,
    payment_method VARCHAR(30),
    reference_code VARCHAR(100),
    note TEXT,
    reason TEXT,
    ref_entry_id UUID REFERENCES deposit_ledger_entries(id) ON DELETE RESTRICT,
    invoice_id UUID REFERENCES invoices(id) ON DELETE RESTRICT,
    operation_id UUID REFERENCES financial_operations(id) ON DELETE SET NULL,
    actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_deposit_amount_nonzero CHECK (amount <> 0),
    CONSTRAINT chk_deposit_entry_type CHECK (
        entry_type IN ('RECEIPT', 'RECEIPT_CORRECTION', 'REFUND', 'DEDUCTION', 'OFFSET_OUT')
    )
);

CREATE INDEX IF NOT EXISTS idx_deposit_ledger_contract ON deposit_ledger_entries(contract_id, recorded_at);
CREATE INDEX IF NOT EXISTS idx_deposit_ledger_operation ON deposit_ledger_entries(operation_id);
CREATE INDEX IF NOT EXISTS idx_deposit_ledger_invoice ON deposit_ledger_entries(invoice_id);
