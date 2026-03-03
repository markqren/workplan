-- Simple key-value store for all app data
CREATE TABLE kv_store (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-update timestamp on changes
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER kv_store_timestamp
  BEFORE UPDATE ON kv_store
  FOR EACH ROW
  EXECUTE FUNCTION update_timestamp();

-- Allow anon access (single-user app, no auth needed)
ALTER TABLE kv_store ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access" ON kv_store
  FOR ALL USING (true) WITH CHECK (true);
