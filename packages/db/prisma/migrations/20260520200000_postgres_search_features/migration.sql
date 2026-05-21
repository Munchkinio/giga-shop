-- ============================================================================
-- PostgreSQL-specific search features
-- ============================================================================
-- This migration adds features that Prisma cannot generate via schema.prisma:
-- 1. search_vector column on products (auto-generated tsvector for FTS)
-- 2. path column on categories (ltree for hierarchical queries)
-- 3. GIN indexes for fast full-text search and trigram matching
-- 4. GIN index for JSONB attributes filtering
-- 5. GIST index for ltree path queries
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. PRODUCTS: Add search_vector as a GENERATED column
-- ----------------------------------------------------------------------------
-- This column auto-updates whenever name, sku, description, or short_description changes.
-- Weights: A = highest priority (name, sku), B = medium (short_desc), C = lowest (description)

ALTER TABLE products DROP COLUMN IF EXISTS search_vector;

ALTER TABLE products ADD COLUMN search_vector tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(sku, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(short_description, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(description, '')), 'C')
  ) STORED;

-- GIN index for fast full-text search
CREATE INDEX idx_products_search_vector ON products USING GIN (search_vector);

-- ----------------------------------------------------------------------------
-- 2. PRODUCTS: GIN index on name for trigram-based fuzzy search & autocomplete
-- ----------------------------------------------------------------------------
CREATE INDEX idx_products_name_trgm ON products USING GIN (name gin_trgm_ops);

-- ----------------------------------------------------------------------------
-- 3. PRODUCTS: GIN index on attributes (JSONB) for fast filter queries
-- ----------------------------------------------------------------------------
-- Allows queries like: WHERE attributes @> '{"color": "red"}'
CREATE INDEX idx_products_attributes ON products USING GIN (attributes);

-- ----------------------------------------------------------------------------
-- 4. CATEGORIES: ltree path column with GIST index
-- ----------------------------------------------------------------------------
-- Note: 'path' column is already defined in Prisma as Unsupported("ltree") and is nullable.
-- The actual ltree column was created by the init migration. We just add the GIST index here.

CREATE INDEX idx_categories_path ON categories USING GIST (path);

-- Helpful B-tree index for ltree path queries that don't use hierarchical operators
CREATE INDEX idx_categories_path_btree ON categories (path);

-- ----------------------------------------------------------------------------
-- 5. CATEGORIES: GIN index on name for trigram-based search
-- ----------------------------------------------------------------------------
CREATE INDEX idx_categories_name_trgm ON categories USING GIN (name gin_trgm_ops);

-- ----------------------------------------------------------------------------
-- 6. BRANDS: GIN index on name for trigram-based search
-- ----------------------------------------------------------------------------
CREATE INDEX idx_brands_name_trgm ON brands USING GIN (name gin_trgm_ops);

-- ----------------------------------------------------------------------------
-- 7. SAVED_SEARCHES: GIN index on filters JSONB
-- ----------------------------------------------------------------------------
CREATE INDEX idx_saved_searches_filters ON saved_searches USING GIN (filters);
