-- Migration: Add tags and favorites to "references" table
-- This migration adds support for organizing references with tags and marking favorites

-- Add tags array column to "references" table
ALTER TABLE "references" ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';

-- Add is_favorite boolean column to "references" table
ALTER TABLE "references" ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN DEFAULT FALSE;

-- Create index on tags for faster filtering
CREATE INDEX IF NOT EXISTS idx_references_tags ON "references" USING GIN (tags);

-- Create index on is_favorite for faster filtering
CREATE INDEX IF NOT EXISTS idx_references_favorite ON "references" (is_favorite) WHERE is_favorite = TRUE;

-- Create index on project_id (see notes about multi-column with arrays)
CREATE INDEX IF NOT EXISTS idx_references_project_id ON "references" (project_id);

-- Comments
COMMENT ON COLUMN "references".tags IS 'Array of tags for organizing references (e.g., competitor, requirement, design, technical)';
COMMENT ON COLUMN "references".is_favorite IS 'Whether this reference is marked as favorite/pinned for quick access';
