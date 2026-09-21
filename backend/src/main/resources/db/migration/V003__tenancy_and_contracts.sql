-- Migration V003: Tenancy and Contracts Module
-- Author: TroHub Core Team

-- 1. Bảng hồ sơ khách thuê (tenant_profiles)
CREATE TABLE tenant_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NULL REFERENCES users(id) ON DELETE RESTRICT,
    full_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    citizen_id_masked VARCHAR(20) NOT NULL,
    email VARCHAR(100) NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    version BIGINT NOT NULL DEFAULT 0
);

CREATE INDEX idx_tenant_profiles_phone ON tenant_profiles(phone);
CREATE INDEX idx_tenant_profiles_user_id ON tenant_profiles(user_id);

-- 2. Bảng hợp đồng thuê phòng (contracts)
CREATE TABLE contracts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE RESTRICT,
    representative_tenant_id UUID NOT NULL REFERENCES tenant_profiles(id) ON DELETE RESTRICT,
    status VARCHAR(20) NOT NULL, -- DRAFT, ACTIVE, ENDED
    actual_start_date DATE NOT NULL,
    planned_end_exclusive DATE NOT NULL,
    actual_checkout_date DATE NULL,
    rent NUMERIC(19,0) NOT NULL CHECK (rent >= 0),
    deposit_required NUMERIC(19,0) NOT NULL CHECK (deposit_required >= 0),
    deposit_settlement_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    version BIGINT NOT NULL DEFAULT 0
);

-- Partial Unique Index bắt buộc (BR-035, EX-22): Một phòng chỉ có tối đa 1 hợp đồng ACTIVE
CREATE UNIQUE INDEX uq_active_room_contract ON contracts(room_id) WHERE status = 'ACTIVE';

CREATE INDEX idx_contracts_room_id ON contracts(room_id);
CREATE INDEX idx_contracts_representative ON contracts(representative_tenant_id);
CREATE INDEX idx_contracts_status ON contracts(status);

-- 3. Bảng thành viên cư trú (contract_members)
CREATE TABLE contract_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_id UUID NOT NULL REFERENCES contracts(id) ON DELETE RESTRICT,
    tenant_id UUID NOT NULL REFERENCES tenant_profiles(id) ON DELETE RESTRICT,
    joined_on DATE NOT NULL,
    left_on DATE NULL,
    is_representative BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    version BIGINT NOT NULL DEFAULT 0
);

CREATE INDEX idx_contract_members_contract ON contract_members(contract_id);
CREATE INDEX idx_contract_members_tenant ON contract_members(tenant_id);

-- 4. Bảng nhật ký sự kiện hợp đồng (contract_events)
CREATE TABLE contract_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_id UUID NOT NULL REFERENCES contracts(id) ON DELETE RESTRICT,
    type VARCHAR(50) NOT NULL, -- ACTIVATION, EXTENSION, CHECKOUT
    old_value TEXT NULL,
    new_value TEXT NOT NULL,
    reason TEXT NOT NULL,
    actor_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX idx_contract_events_contract ON contract_events(contract_id);

-- 5. Bảng công tơ điện nước phòng (room_meters) - phục vụ bàn giao nhận phòng
CREATE TABLE room_meters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE RESTRICT,
    type VARCHAR(20) NOT NULL, -- ELECTRICITY, WATER
    serial VARCHAR(50) NOT NULL,
    installed_on DATE NOT NULL,
    initial_reading NUMERIC(18,3) NOT NULL DEFAULT 0.000,
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    version BIGINT NOT NULL DEFAULT 0,
    CONSTRAINT uq_room_meter_type UNIQUE (room_id, type)
);

CREATE INDEX idx_room_meters_room ON room_meters(room_id);

-- 6. Bảng bản ghi chỉ số (meter_readings) - phục vụ ghi nhận chỉ số bàn giao
CREATE TABLE meter_readings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    meter_id UUID NOT NULL REFERENCES room_meters(id) ON DELETE RESTRICT,
    reading_date DATE NOT NULL,
    value NUMERIC(18,3) NOT NULL CHECK (value >= 0),
    kind VARCHAR(20) NOT NULL, -- HANDOVER, PERIOD_END, CHECKOUT
    file_id UUID NULL,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    version BIGINT NOT NULL DEFAULT 0
);

CREATE INDEX idx_meter_readings_meter ON meter_readings(meter_id);
