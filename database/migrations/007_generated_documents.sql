-- Generated Documents Table
-- AI-generated project documentation (briefs, decision logs, technical specs, etc.)
CREATE TABLE IF NOT EXISTS generated_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    document_type VARCHAR(50) NOT NULL, -- 'project_brief', 'decision_log', 'rejection_log', 'technical_specs'
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL, -- Markdown format
    version INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Indexes
    CONSTRAINT generated_documents_project_type_unique UNIQUE (project_id, document_type)
);

-- Index for faster lookups by project
CREATE INDEX idx_generated_documents_project ON generated_documents(project_id);

-- Index for faster lookups by type
CREATE INDEX idx_generated_documents_type ON generated_documents(document_type);

-- Updated at trigger
CREATE OR REPLACE FUNCTION update_generated_documents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    NEW.version = OLD.version + 1;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_generated_documents_updated_at
    BEFORE UPDATE ON generated_documents
    FOR EACH ROW
    EXECUTE FUNCTION update_generated_documents_updated_at();

-- RLS Policies
ALTER TABLE generated_documents ENABLE ROW LEVEL SECURITY;

-- Users can view generated documents for their own projects
-- NOTE: This assumes projects.user_id is UUID type (as in production schema)
-- If projects.user_id is TEXT, you'll get "operator does not exist: text = uuid" error
-- Fix: Either change projects.user_id to UUID, or use: WHERE user_id::uuid = auth.uid()
CREATE POLICY "Users can view generated documents from own projects"
    ON generated_documents
    FOR SELECT
    TO authenticated
    USING (
        project_id IN (
            SELECT id FROM projects WHERE user_id = auth.uid()
        )
    );

-- Service role has full access for backend document generation
-- This allows the backend API to generate/update/delete documents
CREATE POLICY "Service role can manage all generated documents"
    ON generated_documents
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);
