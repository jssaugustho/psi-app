ALTER TABLE pipeline_columns ADD COLUMN IF NOT EXISTS slug text DEFAULT '' NOT NULL;
ALTER TABLE pipeline_columns ADD COLUMN IF NOT EXISTS color text DEFAULT '#6366F1' NOT NULL;

-- Atualizar slugs existentes com base nos nomes
UPDATE pipeline_columns SET slug = LOWER(REGEXP_REPLACE(name, '[^a-zA-Z0-9]+', '-', 'g')) WHERE slug = '';
