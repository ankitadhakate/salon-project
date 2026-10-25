-- Full-text and trigram indexes for /search. The query still works without them;
-- they keep a Neon free-tier scan off the sequential path as the table grows.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS "Salon_searchBlob_fts"
  ON "Salon"
  USING gin (to_tsvector('simple', "searchBlob"));

CREATE INDEX IF NOT EXISTS "Salon_searchBlob_trgm"
  ON "Salon"
  USING gin ("searchBlob" gin_trgm_ops);
