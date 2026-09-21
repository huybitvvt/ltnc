-- ==============================================================================
-- TroHub Database Migration V002: Property Management (Floors and Rooms)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS floors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    building_id UUID NOT NULL REFERENCES buildings(id) ON DELETE RESTRICT,
    name VARCHAR(50) NOT NULL,
    floor_order INT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    version BIGINT NOT NULL DEFAULT 0,
    CONSTRAINT uq_building_floor_order UNIQUE (building_id, floor_order)
);

CREATE INDEX IF NOT EXISTS idx_floors_building ON floors(building_id);

CREATE TABLE IF NOT EXISTS rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    building_id UUID NOT NULL REFERENCES buildings(id) ON DELETE RESTRICT,
    floor_id UUID REFERENCES floors(id) ON DELETE RESTRICT,
    room_number VARCHAR(50) NOT NULL,
    base_price NUMERIC(19, 0) NOT NULL DEFAULT 0,
    deposit_amount NUMERIC(19, 0) NOT NULL DEFAULT 0,
    area NUMERIC(8, 2) DEFAULT 20.0,
    max_tenants INT NOT NULL DEFAULT 2,
    bookable BOOLEAN NOT NULL DEFAULT TRUE,
    status VARCHAR(30) NOT NULL DEFAULT 'VACANT',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    version BIGINT NOT NULL DEFAULT 0,
    CONSTRAINT uq_building_room_number UNIQUE (building_id, room_number),
    CONSTRAINT chk_room_status CHECK (status IN ('VACANT', 'RENTED', 'DEPOSIT_RESERVED', 'MAINTENANCE'))
);

CREATE INDEX IF NOT EXISTS idx_rooms_building ON rooms(building_id);
CREATE INDEX IF NOT EXISTS idx_rooms_floor ON rooms(floor_id);
CREATE INDEX IF NOT EXISTS idx_rooms_status ON rooms(status);
