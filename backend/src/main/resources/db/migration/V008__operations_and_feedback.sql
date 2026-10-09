-- V008__operations_and_feedback.sql
-- Module Operations: Sự cố bảo trì, trao đổi phản hồi hóa đơn, quản lý tệp đính kèm và ảnh riêng tư (BR-123..BR-132)

CREATE TABLE IF NOT EXISTS maintenance_issues (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_id UUID NOT NULL REFERENCES contracts(id) ON DELETE RESTRICT,
    room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE RESTRICT,
    title VARCHAR(150) NOT NULL,
    description TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'OPEN',
    assignee_id UUID REFERENCES users(id) ON DELETE SET NULL,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    version BIGINT NOT NULL DEFAULT 0,
    CONSTRAINT chk_issue_status CHECK (
        status IN ('OPEN', 'ACCEPTED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED')
    )
);

CREATE INDEX IF NOT EXISTS idx_maintenance_issues_contract ON maintenance_issues(contract_id, status);
CREATE INDEX IF NOT EXISTS idx_maintenance_issues_room ON maintenance_issues(room_id, status);

CREATE TABLE IF NOT EXISTS issue_status_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    issue_id UUID NOT NULL REFERENCES maintenance_issues(id) ON DELETE CASCADE,
    old_status VARCHAR(20) NOT NULL,
    new_status VARCHAR(20) NOT NULL,
    comment TEXT,
    actor_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_issue_history_issue ON issue_status_history(issue_id, created_at);

CREATE TABLE IF NOT EXISTS invoice_feedbacks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE RESTRICT,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    message TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'OPEN',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_feedback_status CHECK (
        status IN ('OPEN', 'IN_REVIEW', 'RESOLVED')
    )
);

CREATE INDEX IF NOT EXISTS idx_invoice_feedbacks_invoice ON invoice_feedbacks(invoice_id);

CREATE TABLE IF NOT EXISTS invoice_feedback_replies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    feedback_id UUID NOT NULL REFERENCES invoice_feedbacks(id) ON DELETE CASCADE,
    actor_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    message TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_feedback_replies_feedback ON invoice_feedback_replies(feedback_id, created_at);

CREATE TABLE IF NOT EXISTS stored_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    storage_key VARCHAR(255) NOT NULL UNIQUE,
    original_name VARCHAR(255) NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    size BIGINT NOT NULL,
    uploaded_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    parent_type VARCHAR(50) NOT NULL,
    parent_id UUID NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'ATTACHED',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_stored_file_mime CHECK (
        mime_type IN ('image/jpeg', 'image/png', 'image/webp')
    ),
    CONSTRAINT chk_stored_file_size CHECK (
        size > 0 AND size <= 5242880
    ),
    CONSTRAINT chk_stored_file_parent_type CHECK (
        parent_type IN ('METER_READING', 'MAINTENANCE_ISSUE', 'INVOICE_FEEDBACK')
    )
);

CREATE INDEX IF NOT EXISTS idx_stored_files_parent ON stored_files(parent_type, parent_id);
