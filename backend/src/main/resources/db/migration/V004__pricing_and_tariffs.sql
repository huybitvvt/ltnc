-- Migration V004: Pricing, Tariffs, Metering, and Consumption Alerts
-- Author: TroHub Core Team

-- 1. Bảng cấu hình tính tiền & ngưỡng cảnh báo tòa nhà (building_billing_settings)
CREATE TABLE building_billing_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    building_id UUID NOT NULL UNIQUE REFERENCES buildings(id) ON DELETE RESTRICT,
    due_days INT NOT NULL DEFAULT 7,
    water_absolute_threshold NUMERIC(18,3) NOT NULL DEFAULT 10.000,
    electricity_absolute_threshold NUMERIC(18,3) NOT NULL DEFAULT 100.000,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    version BIGINT NOT NULL DEFAULT 0
);

-- 2. Bảng định nghĩa loại phí / dịch vụ (service_definitions)
CREATE TABLE service_definitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    unit VARCHAR(20) NOT NULL,
    calculation_type VARCHAR(30) NOT NULL, -- ROOM_MONTHLY, PERSON_MONTHLY, METERED, ONE_OFF
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    version BIGINT NOT NULL DEFAULT 0
);

-- 3. Bảng biểu giá dịch vụ theo tòa và tháng hiệu lực (tariffs)
CREATE TABLE tariffs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    building_id UUID NOT NULL REFERENCES buildings(id) ON DELETE RESTRICT,
    service_id UUID NOT NULL REFERENCES service_definitions(id) ON DELETE RESTRICT,
    effective_month VARCHAR(7) NOT NULL, -- YYYY-MM
    unit_price NUMERIC(19,0) NOT NULL CHECK (unit_price >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    version BIGINT NOT NULL DEFAULT 0,
    CONSTRAINT uq_building_service_month UNIQUE (building_id, service_id, effective_month)
);

CREATE INDEX idx_tariffs_building_service ON tariffs(building_id, service_id);
CREATE INDEX idx_tariffs_effective_month ON tariffs(effective_month);

-- 4. Bảng đăng ký dịch vụ của hợp đồng (contract_service_subscriptions)
CREATE TABLE contract_service_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_id UUID NOT NULL REFERENCES contracts(id) ON DELETE RESTRICT,
    service_id UUID NOT NULL REFERENCES service_definitions(id) ON DELETE RESTRICT,
    start_month VARCHAR(7) NOT NULL, -- YYYY-MM
    end_month_exclusive VARCHAR(7) NULL, -- YYYY-MM
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    version BIGINT NOT NULL DEFAULT 0,
    CONSTRAINT uq_contract_service_period UNIQUE (contract_id, service_id, start_month)
);

CREATE INDEX idx_contract_service_contract ON contract_service_subscriptions(contract_id);

-- 5. Bảng cảnh báo tiêu thụ bất thường (consumption_alerts)
CREATE TABLE consumption_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_id UUID NOT NULL REFERENCES contracts(id) ON DELETE RESTRICT,
    meter_type VARCHAR(20) NOT NULL, -- ELECTRICITY, WATER
    billing_month VARCHAR(7) NOT NULL, -- YYYY-MM
    reading_version BIGINT NOT NULL DEFAULT 0,
    evaluation_status VARCHAR(30) NOT NULL, -- NORMAL, WARNING, INSUFFICIENT_DATA, NOT_COMPARABLE
    comparison_snapshot JSONB NOT NULL,
    acknowledged_by UUID NULL REFERENCES users(id) ON DELETE RESTRICT,
    acknowledged_at TIMESTAMPTZ NULL,
    reason TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX idx_consumption_alerts_contract ON consumption_alerts(contract_id);
CREATE INDEX idx_consumption_alerts_month ON consumption_alerts(billing_month);

-- 6. Bảng khoản thu phát sinh bổ sung (one_off_charges)
CREATE TABLE one_off_charges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_id UUID NOT NULL REFERENCES contracts(id) ON DELETE RESTRICT,
    billing_month VARCHAR(7) NOT NULL, -- YYYY-MM
    label VARCHAR(100) NOT NULL,
    amount NUMERIC(19,0) NOT NULL CHECK (amount >= 0),
    reason TEXT NOT NULL,
    source_ref VARCHAR(100) NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX idx_one_off_charges_contract ON one_off_charges(contract_id);
CREATE INDEX idx_one_off_charges_month ON one_off_charges(billing_month);

-- 7. Seed dịch vụ tiêu chuẩn hệ thống
INSERT INTO service_definitions (id, name, unit, calculation_type, active)
VALUES 
    ('00000000-0000-0000-0000-000000000001', 'Điện sinh hoạt', 'kWh', 'METERED', true),
    ('00000000-0000-0000-0000-000000000002', 'Nước sinh hoạt', 'm³', 'METERED', true),
    ('00000000-0000-0000-0000-000000000003', 'Internet / Wifi', 'phòng/tháng', 'ROOM_MONTHLY', true),
    ('00000000-0000-0000-0000-000000000004', 'Vệ sinh & Rác', 'người/tháng', 'PERSON_MONTHLY', true),
    ('00000000-0000-0000-0000-000000000005', 'Giữ xe máy', 'người/tháng', 'PERSON_MONTHLY', true)
ON CONFLICT (id) DO NOTHING;
