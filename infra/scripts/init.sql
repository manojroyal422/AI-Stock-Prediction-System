-- StockPro V2 — PostgreSQL initialization
-- Runs once on fresh container start

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";   -- For fuzzy text search
CREATE EXTENSION IF NOT EXISTS "btree_gin"; -- For composite GIN indexes

-- Performance settings (adjust for your server)
ALTER SYSTEM SET shared_buffers           = '256MB';
ALTER SYSTEM SET effective_cache_size     = '1GB';
ALTER SYSTEM SET maintenance_work_mem     = '128MB';
ALTER SYSTEM SET checkpoint_completion_target = '0.9';
ALTER SYSTEM SET wal_buffers              = '16MB';
ALTER SYSTEM SET default_statistics_target = '100';
ALTER SYSTEM SET random_page_cost         = '1.1';

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE stockpro TO stockuser;
