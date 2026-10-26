CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE IF NOT EXISTS catalog_schema_migrations (
  version TEXT PRIMARY KEY,
  checksum TEXT NOT NULL,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS catalog_categories (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  parent_id TEXT REFERENCES catalog_categories(id) ON DELETE RESTRICT,
  accent TEXT NOT NULL,
  icon TEXT NOT NULL,
  search_terms TEXT[] NOT NULL DEFAULT '{}',
  google_product_category TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'draft', 'retired')),
  is_assignable BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS catalog_categories_parent_idx ON catalog_categories(parent_id, sort_order, name);

CREATE TABLE IF NOT EXISTS catalog_brands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  normalized_name TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS catalog_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  category_id TEXT NOT NULL REFERENCES catalog_categories(id) ON DELETE RESTRICT,
  brand_id UUID REFERENCES catalog_brands(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  summary TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  highlights JSONB NOT NULL DEFAULT '[]'::jsonb,
  specifications JSONB NOT NULL DEFAULT '{}'::jsonb,
  pros JSONB NOT NULL DEFAULT '[]'::jsonb,
  cons JSONB NOT NULL DEFAULT '[]'::jsonb,
  gtin TEXT,
  mpn TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'archived')),
  indexable BOOLEAN NOT NULL DEFAULT false,
  featured BOOLEAN NOT NULL DEFAULT false,
  trending BOOLEAN NOT NULL DEFAULT false,
  search_document TSVECTOR GENERATED ALWAYS AS (
    setweight(to_tsvector('simple', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(summary, '')), 'B') ||
    setweight(to_tsvector('simple', coalesce(description, '')), 'C')
  ) STORED,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (gtin IS NULL OR length(trim(gtin)) > 0),
  CHECK (mpn IS NULL OR length(trim(mpn)) > 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS catalog_products_gtin_idx ON catalog_products(gtin) WHERE gtin IS NOT NULL;
CREATE INDEX IF NOT EXISTS catalog_products_category_idx ON catalog_products(category_id, status, indexable);
CREATE INDEX IF NOT EXISTS catalog_products_search_idx ON catalog_products USING GIN(search_document);
CREATE INDEX IF NOT EXISTS catalog_products_title_trgm_idx ON catalog_products USING GIN(title gin_trgm_ops);

CREATE TABLE IF NOT EXISTS catalog_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES catalog_products(id) ON DELETE CASCADE,
  source_key TEXT NOT NULL,
  label TEXT NOT NULL,
  attributes JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (product_id, source_key)
);

CREATE TABLE IF NOT EXISTS catalog_merchants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  normalized_name TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  trust_label TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS catalog_offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  variant_id UUID NOT NULL REFERENCES catalog_variants(id) ON DELETE CASCADE,
  merchant_id UUID NOT NULL REFERENCES catalog_merchants(id) ON DELETE RESTRICT,
  source_id TEXT NOT NULL,
  external_offer_id TEXT NOT NULL,
  affiliate_url TEXT NOT NULL,
  price_amount_minor BIGINT,
  previous_price_amount_minor BIGINT,
  currency CHAR(3),
  availability TEXT NOT NULL CHECK (availability IN ('in_stock', 'limited', 'out_of_stock', 'unknown')),
  shipping_label TEXT NOT NULL DEFAULT '',
  observed_at TIMESTAMPTZ NOT NULL,
  expires_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (source_id, external_offer_id),
  CHECK (price_amount_minor IS NULL OR price_amount_minor >= 0),
  CHECK (previous_price_amount_minor IS NULL OR previous_price_amount_minor >= 0),
  CHECK (affiliate_url ~ '^https://')
);

CREATE INDEX IF NOT EXISTS catalog_offers_variant_idx ON catalog_offers(variant_id, status, availability, price_amount_minor);
CREATE INDEX IF NOT EXISTS catalog_offers_freshness_idx ON catalog_offers(source_id, observed_at DESC);

CREATE TABLE IF NOT EXISTS catalog_media_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES catalog_products(id) ON DELETE CASCADE,
  variant_id UUID REFERENCES catalog_variants(id) ON DELETE CASCADE,
  source_id TEXT NOT NULL,
  source_url TEXT NOT NULL,
  object_key TEXT,
  alt_text TEXT NOT NULL,
  width INTEGER,
  height INTEGER,
  role TEXT NOT NULL CHECK (role IN ('hero', 'gallery', 'swatch')),
  rights_mode TEXT NOT NULL DEFAULT 'remote_only' CHECK (rights_mode IN ('remote_only', 'cache_allowed', 'derivatives_allowed')),
  rights_expires_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'rejected', 'expired')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (source_id, source_url, product_id)
);

CREATE TABLE IF NOT EXISTS catalog_source_records (
  identity_key TEXT PRIMARY KEY,
  source_id TEXT NOT NULL,
  external_product_id TEXT NOT NULL,
  external_variant_id TEXT NOT NULL,
  external_offer_id TEXT NOT NULL,
  fingerprint CHAR(64) NOT NULL,
  normalized_record JSONB NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('active', 'archived')),
  first_seen_at TIMESTAMPTZ NOT NULL,
  last_seen_at TIMESTAMPTZ NOT NULL,
  archived_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (source_id, external_offer_id)
);

CREATE INDEX IF NOT EXISTS catalog_source_records_active_idx ON catalog_source_records(source_id, status, last_seen_at DESC);

CREATE TABLE IF NOT EXISTS catalog_import_runs (
  run_id UUID PRIMARY KEY,
  source_id TEXT NOT NULL,
  mode TEXT NOT NULL CHECK (mode IN ('full', 'incremental')),
  dry_run BOOLEAN NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('succeeded', 'rejected', 'failed')),
  report JSONB NOT NULL,
  started_at TIMESTAMPTZ NOT NULL,
  finished_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS catalog_import_runs_source_idx ON catalog_import_runs(source_id, started_at DESC);

CREATE TABLE IF NOT EXISTS catalog_outbox_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aggregate_type TEXT NOT NULL,
  aggregate_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  available_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  claimed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  attempts INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS catalog_outbox_pending_idx ON catalog_outbox_events(available_at, created_at) WHERE completed_at IS NULL;
