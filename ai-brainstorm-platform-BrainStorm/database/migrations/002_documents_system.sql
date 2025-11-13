-- =====================================================
-- DOCUMENT MANAGEMENT SYSTEM
-- Migration: Add document folders and documents tables
-- =====================================================

-- Create document_folders table
CREATE TABLE IF NOT EXISTS document_folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT unique_folder_name_per_project UNIQUE(project_id, name)
);

-- Create documents table
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  folder_id UUID REFERENCES document_folders(id) ON DELETE SET NULL,
  file_url TEXT NOT NULL,
  filename VARCHAR(500) NOT NULL,
  file_size INTEGER NOT NULL,
  file_type VARCHAR(100) NOT NULL,
  description TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_documents_project_id ON documents(project_id);
CREATE INDEX IF NOT EXISTS idx_documents_folder_id ON documents(folder_id);
CREATE INDEX IF NOT EXISTS idx_documents_user_id ON documents(user_id);
CREATE INDEX IF NOT EXISTS idx_documents_created_at ON documents(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_document_folders_project_id ON document_folders(project_id);
CREATE INDEX IF NOT EXISTS idx_document_folders_user_id ON document_folders(user_id);

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
DROP TRIGGER IF EXISTS update_document_folders_updated_at ON document_folders;
CREATE TRIGGER update_document_folders_updated_at
    BEFORE UPDATE ON document_folders
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_documents_updated_at ON documents;
CREATE TRIGGER update_documents_updated_at
    BEFORE UPDATE ON documents
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add RLS (Row Level Security) policies
ALTER TABLE document_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view folders in their projects
CREATE POLICY select_document_folders ON document_folders
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert folders
CREATE POLICY insert_document_folders ON document_folders
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own folders
CREATE POLICY update_document_folders ON document_folders
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Policy: Users can delete their own folders
CREATE POLICY delete_document_folders ON document_folders
  FOR DELETE
  USING (auth.uid() = user_id);

-- Policy: Users can view documents in their projects
CREATE POLICY select_documents ON documents
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert documents
CREATE POLICY insert_documents ON documents
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own documents
CREATE POLICY update_documents ON documents
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Policy: Users can delete their own documents
CREATE POLICY delete_documents ON documents
  FOR DELETE
  USING (auth.uid() = user_id);

-- Add comments for documentation
COMMENT ON TABLE document_folders IS 'Folders for organizing project documents';
COMMENT ON TABLE documents IS 'Document files uploaded to projects';
COMMENT ON COLUMN documents.metadata IS 'JSON metadata including storagePath, originalName, etc.';
COMMENT ON COLUMN documents.file_size IS 'File size in bytes';
