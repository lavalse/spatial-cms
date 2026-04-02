ALTER TABLE dataset_definition ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE dataset_definition ADD COLUMN IF NOT EXISTS license TEXT;
ALTER TABLE dataset_definition ADD COLUMN IF NOT EXISTS source TEXT;
ALTER TABLE dataset_definition ADD COLUMN IF NOT EXISTS contact_name TEXT;
ALTER TABLE dataset_definition ADD COLUMN IF NOT EXISTS contact_email TEXT;
ALTER TABLE dataset_definition ADD COLUMN IF NOT EXISTS keywords JSONB DEFAULT '[]';
