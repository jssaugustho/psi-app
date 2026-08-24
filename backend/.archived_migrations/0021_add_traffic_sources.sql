ALTER TABLE tenants ADD COLUMN IF NOT EXISTS traffic_sources jsonb DEFAULT '["Manual", "Instagram", "Google Ads", "Facebook Ads", "Webhook"]'::jsonb NOT NULL;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS default_traffic_source text DEFAULT 'Manual' NOT NULL;
