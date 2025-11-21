-- Migration 016: Add document selection for generation
-- Purpose: Allow users to select which uploaded documents should be used as context for AI-generated documents
-- Date: 2025-11-07

-- Add selection column to documents table
ALTER TABLE documents
ADD COLUMN IF NOT EXISTS selected_for_generation BOOLEAN DEFAULT false;

-- Add index for efficient filtering
CREATE INDEX IF NOT EXISTS idx_documents_selected
ON documents(project_id, selected_for_generation)
WHERE selected_for_generation = true;

-- Add metadata column for storing document analysis (if not exists)
-- Note: documents table already has metadata JSONB column, this is just a safety check
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'documents' AND column_name = 'metadata'
  ) THEN
    ALTER TABLE documents ADD COLUMN metadata JSONB DEFAULT '{}'::jsonb;
  END IF;
END $$;

-- Comment
COMMENT ON COLUMN documents.selected_for_generation IS 
'Indicates if this document should be used as context when generating AI documents';

-- Migration complete
-- To revert: ALTER TABLE documents DROP COLUMN IF EXISTS selected_for_generation;
