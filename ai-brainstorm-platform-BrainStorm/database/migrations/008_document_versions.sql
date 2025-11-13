-- Document Versions Table
-- Tracks complete history of all document changes with diff support
CREATE TABLE IF NOT EXISTS document_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES generated_documents(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    content TEXT NOT NULL, -- Full content snapshot at this version
    title VARCHAR(255) NOT NULL,

    -- Change tracking
    change_summary TEXT, -- AI-generated summary of what changed
    change_reason VARCHAR(255), -- Optional: why this change was made
    diff_from_previous TEXT, -- Markdown diff from previous version

    -- Metadata
    created_by UUID REFERENCES auth.users(id), -- User who triggered this version
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Indexes
    CONSTRAINT document_versions_doc_version_unique UNIQUE (document_id, version_number)
);

-- Index for faster lookups by document
CREATE INDEX idx_document_versions_document ON document_versions(document_id);

-- Index for faster lookups by version number
CREATE INDEX idx_document_versions_version ON document_versions(document_id, version_number DESC);

-- Index for faster lookups by creation date
CREATE INDEX idx_document_versions_created ON document_versions(created_at DESC);

-- Trigger to automatically create version snapshot when document is updated
CREATE OR REPLACE FUNCTION create_document_version_snapshot()
RETURNS TRIGGER AS $$
BEGIN
    -- Only create snapshot on UPDATE (not INSERT)
    IF TG_OP = 'UPDATE' AND (OLD.content != NEW.content OR OLD.title != NEW.title) THEN
        -- Insert the OLD version into versions table
        INSERT INTO document_versions (
            document_id,
            version_number,
            content,
            title,
            created_by,
            created_at
        ) VALUES (
            OLD.id,
            OLD.version,
            OLD.content,
            OLD.title,
            auth.uid(), -- Current authenticated user
            OLD.updated_at
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_create_document_version_snapshot
    BEFORE UPDATE ON generated_documents
    FOR EACH ROW
    EXECUTE FUNCTION create_document_version_snapshot();

-- RLS Policies
ALTER TABLE document_versions ENABLE ROW LEVEL SECURITY;

-- Users can view version history for their own project documents
CREATE POLICY "Users can view document versions from own projects"
    ON document_versions
    FOR SELECT
    TO authenticated
    USING (
        document_id IN (
            SELECT gd.id
            FROM generated_documents gd
            JOIN projects p ON gd.project_id = p.id
            WHERE p.user_id = auth.uid()::text
        )
    );

-- Service role has full access for backend operations
CREATE POLICY "Service role can manage all document versions"
    ON document_versions
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Helper function to get version history for a document
CREATE OR REPLACE FUNCTION get_document_version_history(doc_id UUID)
RETURNS TABLE (
    id UUID,
    version_number INTEGER,
    title VARCHAR(255),
    change_summary TEXT,
    change_reason VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE,
    content_preview TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        dv.id,
        dv.version_number,
        dv.title,
        dv.change_summary,
        dv.change_reason,
        dv.created_at,
        LEFT(dv.content, 200) || '...' as content_preview
    FROM document_versions dv
    WHERE dv.document_id = doc_id
    ORDER BY dv.version_number DESC;
END;
$$ LANGUAGE plpgsql;

-- Helper function to get diff between two versions
CREATE OR REPLACE FUNCTION get_version_diff(doc_id UUID, from_version INTEGER, to_version INTEGER)
RETURNS TABLE (
    from_content TEXT,
    to_content TEXT,
    from_title VARCHAR(255),
    to_title VARCHAR(255)
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        v1.content as from_content,
        v2.content as to_content,
        v1.title as from_title,
        v2.title as to_title
    FROM document_versions v1
    CROSS JOIN document_versions v2
    WHERE v1.document_id = doc_id
        AND v2.document_id = doc_id
        AND v1.version_number = from_version
        AND v2.version_number = to_version;
END;
$$ LANGUAGE plpgsql;
