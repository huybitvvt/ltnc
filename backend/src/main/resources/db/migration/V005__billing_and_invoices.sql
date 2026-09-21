-- V005__billing_and_invoices.sql
-- Module Billing, Invoices, Financial Operations, Adjustments, Notes (Task D2)

-- 1. Bảng thao tác tài chính Idempotent (Dùng cho cả D2, E1, E2)
CREATE TABLE IF NOT EXISTS financial_operations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    idempotency_key VARCHAR(100) NOT NULL UNIQUE,
    actor_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    action VARCHAR(50) NOT NULL,
    request_hash VARCHAR(64) NOT NULL,
    status VARCHAR(20) NOT NULL,
    response_snapshot TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);
CREATE INDEX IF NOT EXISTS idx_fin_ops_key ON financial_operations(idempotency_key);

-- 2. Bảng hóa đơn kỳ (invoices)
CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_id UUID NOT NULL REFERENCES contracts(id) ON DELETE RESTRICT,
    billing_month VARCHAR(7) NOT NULL,
    status VARCHAR(20) NOT NULL, -- 'DRAFT', 'ISSUED'
    period_start DATE NOT NULL,
    period_end_exclusive DATE NOT NULL,
    due_date DATE NOT NULL,
    issued_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    version BIGINT NOT NULL DEFAULT 0,
    CONSTRAINT uq_invoice_contract_month UNIQUE (contract_id, billing_month)
);
CREATE INDEX IF NOT EXISTS idx_invoices_contract ON invoices(contract_id);
CREATE INDEX IF NOT EXISTS idx_invoices_month ON invoices(billing_month);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);

-- 3. Bảng chi tiết dòng hóa đơn snapshot (invoice_items)
CREATE TABLE IF NOT EXISTS invoice_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE RESTRICT,
    type VARCHAR(30) NOT NULL, -- 'RENT', 'ELECTRICITY', 'WATER', 'SERVICE', 'ONE_OFF'
    label VARCHAR(100) NOT NULL,
    quantity NUMERIC(18,3) NOT NULL,
    unit_price NUMERIC(19,0) NOT NULL,
    amount NUMERIC(19,0) NOT NULL,
    calculation_snapshot JSONB NOT NULL,
    reading_refs JSONB NULL,
    tariff_ref UUID NULL REFERENCES tariffs(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice ON invoice_items(invoice_id);

-- 4. Bảng điều chỉnh giá trị hóa đơn đã phát hành (invoice_adjustments)
CREATE TABLE IF NOT EXISTS invoice_adjustments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE RESTRICT,
    delta_amount NUMERIC(19,0) NOT NULL CHECK (delta_amount <> 0),
    reason TEXT NOT NULL,
    old_snapshot JSONB NOT NULL,
    new_snapshot JSONB NOT NULL,
    effective_date DATE NOT NULL,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    operation_id UUID NOT NULL REFERENCES financial_operations(id) ON DELETE RESTRICT
);
CREATE INDEX IF NOT EXISTS idx_invoice_adjustments_invoice ON invoice_adjustments(invoice_id);

-- 5. Bảng ghi chú đính chính mô tả phi tài chính (invoice_notes)
CREATE TABLE IF NOT EXISTS invoice_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE RESTRICT,
    content TEXT NOT NULL,
    reason TEXT NOT NULL,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);
CREATE INDEX IF NOT EXISTS idx_invoice_notes_invoice ON invoice_notes(invoice_id);
