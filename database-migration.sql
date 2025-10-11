-- ========================================
-- MIGRAÇÃO DO BANCO DE DADOS
-- Sistema de Estratégias por Pastas
-- ========================================

-- 1. Adicionar novas colunas à tabela user_sessions
ALTER TABLE user_sessions 
  ADD COLUMN IF NOT EXISTS chip_category VARCHAR(20) DEFAULT 'up-to-9',
  ADD COLUMN IF NOT EXISTS selected_folder VARCHAR(100) DEFAULT 'Cores Altos e baixos',
  ADD COLUMN IF NOT EXISTS selected_strategies JSONB DEFAULT '"all"'::jsonb;

-- 2. Migrar dados existentes da coluna antiga selected_strategy
-- Mapeamento: estratégias antigas → novas estratégias
UPDATE user_sessions
SET 
  chip_category = 'up-to-9',
  selected_folder = 'Cores Altos e baixos',
  selected_strategies = CASE
    WHEN selected_strategy = 1 THEN '[1]'::jsonb  -- Pretos baixos
    WHEN selected_strategy = 2 THEN '[2]'::jsonb  -- Vermelhos Altos
    WHEN selected_strategy = 3 THEN '[3]'::jsonb  -- Pretos Altos
    WHEN selected_strategy = 4 THEN '[4]'::jsonb  -- Vermelhos Baixos
    WHEN selected_strategy = 5 THEN '[1]'::jsonb  -- Default para Pretos baixos
    ELSE '[1]'::jsonb
  END
WHERE selected_folder IS NULL;

-- 3. Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_user_sessions_chip_category 
  ON user_sessions(chip_category);

CREATE INDEX IF NOT EXISTS idx_user_sessions_selected_folder 
  ON user_sessions(selected_folder);

-- 4. (OPCIONAL) Remover coluna antiga após confirmar que tudo funciona
-- DESCOMENTE APENAS APÓS TESTAR E CONFIRMAR QUE ESTÁ TUDO OK
-- ALTER TABLE user_sessions DROP COLUMN IF EXISTS selected_strategy;

-- ========================================
-- VERIFICAÇÃO
-- ========================================

-- Verificar se as colunas foram criadas
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'user_sessions'
ORDER BY ordinal_position;

-- Verificar dados migrados
SELECT 
  id,
  user_id,
  chip_category,
  selected_folder,
  selected_strategies,
  array_length(numbers, 1) as total_numbers,
  updated_at
FROM user_sessions
ORDER BY updated_at DESC
LIMIT 5;

-- ========================================
-- MIGRAÇÃO CONCLUÍDA! ✅
-- ========================================
