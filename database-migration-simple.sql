-- ========================================
-- MIGRAÇÃO SIMPLIFICADA
-- Adicionar apenas categoria de fichas
-- ========================================

-- 1. Adicionar coluna chip_category
ALTER TABLE user_sessions
ADD COLUMN IF NOT EXISTS chip_category TEXT DEFAULT 'up-to-9' 
CHECK (chip_category IN ('up-to-9', 'more-than-9'));

-- 2. Criar índice
CREATE INDEX IF NOT EXISTS idx_chip_category ON user_sessions(chip_category);

-- 3. VERIFICAÇÃO - Execute para conferir:
-- SELECT id, user_id, chip_category, selected_strategy FROM user_sessions LIMIT 5;
