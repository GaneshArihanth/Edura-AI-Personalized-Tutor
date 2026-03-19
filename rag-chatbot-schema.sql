-- Enable the pgvector extension to work with embedding vectors
CREATE EXTENSION IF NOT EXISTS vector;

-- Drop existing resources because we are changing the vector dimensionality from 768 to 3072
DROP FUNCTION IF EXISTS match_site_documents(vector(768), INT, FLOAT);
DROP FUNCTION IF EXISTS match_site_documents(vector(3072), INT, FLOAT);
DROP TABLE IF EXISTS site_documents;

-- Create table to store website pages, courses, and content
CREATE TABLE IF NOT EXISTS site_rag_documents (
  id BIGSERIAL PRIMARY KEY,
  url_path TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  content_type TEXT NOT NULL, -- 'course', 'assignment', 'page', 'faq'
  embedding vector(3072) -- Gemini embeddings use 3072 dimensions
);

-- Row Level Security (RLS) - Readers can view all site documents
ALTER TABLE site_rag_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all users" ON site_rag_documents
  FOR SELECT USING (true);

-- Create a function to similarity search for RAG queries
CREATE OR REPLACE FUNCTION match_site_documents (
  query_embedding vector(3072),
  match_count INT DEFAULT 5,
  similarity_threshold FLOAT DEFAULT 0.5
)
RETURNS TABLE (
  id BIGINT,
  url_path TEXT,
  title TEXT,
  content TEXT,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    site_rag_documents.id,
    site_rag_documents.url_path,
    site_rag_documents.title,
    site_rag_documents.content,
    1 - (site_rag_documents.embedding <=> query_embedding) AS similarity
  FROM site_rag_documents
  WHERE 1 - (site_rag_documents.embedding <=> query_embedding) > similarity_threshold
  ORDER BY site_rag_documents.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
