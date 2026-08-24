ALTER TABLE pipeline_columns ADD COLUMN IF NOT EXISTS category text DEFAULT 'acolhimento' NOT NULL;

-- Atualizar colunas padrões para as categorias corretas se existirem
UPDATE pipeline_columns SET category = 'pendente' WHERE slug IN ('lead', 'novo-lead', 'contato-inicial', 'pendente');
UPDATE pipeline_columns SET category = 'paciente' WHERE slug IN ('paciente', 'inicio-tratamento', 'contrato-fechado');
UPDATE pipeline_columns SET category = 'alta' WHERE slug IN ('alta', 'tratamento-concluido');
UPDATE pipeline_columns SET category = 'negativa' WHERE slug IN ('negativa', 'perdido', 'desistencia');
