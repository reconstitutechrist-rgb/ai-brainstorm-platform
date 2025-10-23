-- Migration 014: Allow Users to Manage Their Own Generated Documents
-- Adds RLS policies for INSERT, UPDATE, DELETE operations on generated_documents
-- This enables users to create, edit, and delete documents for their own projects

-- Drop existing user select policy if it exists (we'll recreate it for clarity)
DROP POLICY IF EXISTS "Users can view generated documents from own projects" ON generated_documents;

-- Create comprehensive policies for authenticated users
-- 1. SELECT: Users can view documents from their own projects
CREATE POLICY "Users can view generated documents from own projects"
    ON generated_documents
    FOR SELECT
    TO authenticated
    USING (
        project_id IN (
            SELECT id FROM projects WHERE user_id = auth.uid()
        )
    );

-- 2. INSERT: Users can create documents for their own projects
CREATE POLICY "Users can create generated documents for own projects"
    ON generated_documents
    FOR INSERT
    TO authenticated
    WITH CHECK (
        project_id IN (
            SELECT id FROM projects WHERE user_id = auth.uid()
        )
    );

-- 3. UPDATE: Users can update documents from their own projects
CREATE POLICY "Users can update generated documents from own projects"
    ON generated_documents
    FOR UPDATE
    TO authenticated
    USING (
        project_id IN (
            SELECT id FROM projects WHERE user_id = auth.uid()
        )
    )
    WITH CHECK (
        project_id IN (
            SELECT id FROM projects WHERE user_id = auth.uid()
        )
    );

-- 4. DELETE: Users can delete documents from their own projects
CREATE POLICY "Users can delete generated documents from own projects"
    ON generated_documents
    FOR DELETE
    TO authenticated
    USING (
        project_id IN (
            SELECT id FROM projects WHERE user_id = auth.uid()
        )
    );

-- Note: The service_role policy remains unchanged and continues to have full access
-- CREATE POLICY "Service role can manage all generated documents"
--     ON generated_documents FOR ALL TO service_role
--     USING (true) WITH CHECK (true);
