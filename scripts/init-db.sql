-- ============================================
-- DevForge Database Initialization Script
-- PostgreSQL 16+
-- ============================================

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Set default search path
SET search_path TO public;

-- ============================================
-- Grant permissions
-- ============================================
GRANT ALL PRIVILEGES ON DATABASE devforge TO devforge;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO devforge;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO devforge;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO devforge;

-- Default privileges for future objects
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO devforge;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO devforge;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO devforge;

-- ============================================
-- NocoBase will create its own tables on startup
-- These are just indexes and optimizations
-- ============================================

-- Create index on common query patterns (will be created after NocoBase tables exist)
-- These statements are safe to run even if tables don't exist yet

DO $$
BEGIN
    -- Performance optimizations will be applied after NocoBase creates tables
    RAISE NOTICE 'Database initialized. NocoBase will create tables on first startup.';
END $$;
