-- Allow both 2D and 3D geometry in entity table
-- Remove dimension constraint, keep SRID check
ALTER TABLE entity ALTER COLUMN geometry TYPE geometry USING geometry;
ALTER TABLE entity DROP CONSTRAINT IF EXISTS enforce_srid_geometry;
ALTER TABLE entity ADD CONSTRAINT enforce_srid_geometry CHECK (geometry IS NULL OR ST_SRID(geometry) = 4326);

-- Add is_3d flag to model_definition
ALTER TABLE model_definition ADD COLUMN IF NOT EXISTS is_3d BOOLEAN NOT NULL DEFAULT false;
