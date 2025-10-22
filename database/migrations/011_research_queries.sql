-- Migration: Create research_queries table
-- This migration adds support for tracking AI-driven web research queries

-- Create research_queries table
CREATE TABLE IF NOT EXISTS "research_queries" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  query TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  max_sources INTEGER DEFAULT 5,
  results_count INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_research_queries_project_id ON "research_queries" (project_id);
CREATE INDEX IF NOT EXISTS idx_research_queries_user_id ON "research_queries" (user_id);
CREATE INDEX IF NOT EXISTS idx_research_queries_status ON "research_queries" (status);
CREATE INDEX IF NOT EXISTS idx_research_queries_created_at ON "research_queries" (created_at DESC);

-- Create composite index for common query pattern
CREATE INDEX IF NOT EXISTS idx_research_queries_project_user ON "research_queries" (project_id, user_id);

-- Comments
COMMENT ON TABLE "research_queries" IS 'Tracks AI-driven web research queries and their results';
COMMENT ON COLUMN "research_queries".query IS 'The research query submitted by the user';
COMMENT ON COLUMN "research_queries".status IS 'Current status: pending, processing, completed, or failed';
COMMENT ON COLUMN "research_queries".max_sources IS 'Maximum number of sources to research';
COMMENT ON COLUMN "research_queries".results_count IS 'Number of sources found and analyzed';
COMMENT ON COLUMN "research_queries".metadata IS 'Additional data: synthesis, sources, savedReferences, duration, error details';
