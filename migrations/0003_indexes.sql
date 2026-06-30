-- 0003_indexes: Performance indexes for the high-volume complaints tables.
-- Scope kept deliberately lean — only columns that appear in ORDER BY, range
-- filters, or joins across the list/report/dashboard queries. Low-selectivity
-- columns (status, seen) and optional report filters (area_id, building, etc.)
-- are intentionally left unindexed to avoid write overhead with little payoff.
-- Idempotent: safe to re-run.

-- Every list query orders by date DESC; reports/dashboard also range-filter on it.
CREATE INDEX IF NOT EXISTS idx_complaints_date ON complaints (date DESC);

-- Serves the per-user complaint list: WHERE user_id = $1 ORDER BY date DESC.
-- Composite, so it covers both the filter and the sort in one scan, and makes
-- a standalone user_id index unnecessary.
CREATE INDEX IF NOT EXISTS idx_complaints_user_date ON complaints (user_id, date DESC);

-- Foreign key used by the reports LEFT JOIN (c.id = s.complaint_id).
-- Postgres does not auto-index foreign keys.
CREATE INDEX IF NOT EXISTS idx_complaint_seen_complaint_id ON complaint_seen (complaint_id);
