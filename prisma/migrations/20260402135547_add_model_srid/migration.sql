-- Add SRID field to model_definition (default 4326 for backward compat)
ALTER TABLE model_definition ADD COLUMN IF NOT EXISTS srid INT NOT NULL DEFAULT 4326;

-- Remove SRID 4326 constraint on entity geometry (allow any CRS)
ALTER TABLE entity DROP CONSTRAINT IF EXISTS enforce_srid_geometry;
