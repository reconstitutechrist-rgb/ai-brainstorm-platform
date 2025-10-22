-- Migration: Document Research Conversations
-- Date: 2025-10-21
-- Purpose: Add conversation support and folder categorization for Document Research Agent

-- Add conversation support to research_queries table
ALTER TABLE research_queries ADD COLUMN conversation_thread JSONB;
ALTER TABLE research_queries ADD COLUMN session_type TEXT DEFAULT 'quick';

-- Add comment explaining the columns
COMMENT ON COLUMN research_queries.conversation_thread IS 'Full conversation history for conversational research sessions. Structure: {messages: [{role, content, timestamp, metadata}]}';
COMMENT ON COLUMN research_queries.session_type IS 'Type of research session: quick (single query) or conversational (multi-turn dialogue)';

-- Add folder categorization and completion tracking to generated_documents
ALTER TABLE generated_documents ADD COLUMN folder_category TEXT;
ALTER TABLE generated_documents ADD COLUMN completion_percent INTEGER DEFAULT 100;
ALTER TABLE generated_documents ADD COLUMN missing_fields JSONB;

-- Add comment explaining the new columns
COMMENT ON COLUMN generated_documents.folder_category IS 'Document category folder: software_technical, business, or development';
COMMENT ON COLUMN generated_documents.completion_percent IS 'Percentage of required fields filled (0-100). 100 means complete, <100 means incomplete';
COMMENT ON COLUMN generated_documents.missing_fields IS 'Array of missing required fields. Structure: [{field, description, required}]';

-- Create index for efficient folder queries
CREATE INDEX IF NOT EXISTS idx_generated_documents_folder_category ON generated_documents(folder_category);
CREATE INDEX IF NOT EXISTS idx_generated_documents_completion ON generated_documents(completion_percent);

-- Create index for conversation queries
CREATE INDEX IF NOT EXISTS idx_research_queries_session_type ON research_queries(session_type);
CREATE INDEX IF NOT EXISTS idx_research_queries_conversation_thread ON research_queries USING gin(conversation_thread);
