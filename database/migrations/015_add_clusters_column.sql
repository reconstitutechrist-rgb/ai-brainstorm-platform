-- Migration: Add clusters column to projects table for canvas auto-clustering
-- Description: Stores cluster metadata including id, name, color, description, and position

-- Add clusters column to projects table
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS clusters JSONB DEFAULT '[]'::jsonb;

-- Create index for faster queries on clusters
CREATE INDEX IF NOT EXISTS idx_projects_clusters ON projects USING GIN (clusters);

-- Add comment to document the column
COMMENT ON COLUMN projects.clusters IS 'Stores canvas cluster metadata as array of objects with id, name, color, description, and position';
