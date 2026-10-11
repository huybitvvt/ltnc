ALTER TABLE tenant_profiles ADD COLUMN created_by UUID REFERENCES users(id) ON DELETE RESTRICT;
CREATE INDEX idx_tenant_profile_creator ON tenant_profiles(created_by);
