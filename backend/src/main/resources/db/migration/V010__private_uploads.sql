ALTER TABLE stored_files ALTER COLUMN parent_id DROP NOT NULL;
CREATE INDEX idx_stored_files_temporary ON stored_files (created_at) WHERE status = 'TEMPORARY';
