-- ========================================
-- MIGRAÇÃO: Adicionar campo green_red_attempts
-- ========================================
-- Este script adiciona a coluna green_red_attempts à tabela user_sessions
-- para armazenar a quantidade de casas que devem ser analisadas para GREEN/RED (3, 4, 5 ou 6)

-- Adicionar coluna green_red_attempts (padrão: 3)
ALTER TABLE user_sessions 
ADD COLUMN IF NOT EXISTS green_red_attempts INTEGER DEFAULT 3;

-- Validação: verificar que o valor está entre 1 e 6
ALTER TABLE user_sessions 
ADD CONSTRAINT check_green_red_attempts 
CHECK (green_red_attempts >= 1 AND green_red_attempts <= 6);

-- Comentário para documentação
COMMENT ON COLUMN user_sessions.green_red_attempts IS 
'Quantidade de casas após ativação para contabilizar GREEN ou RED (1, 2, 3, 4, 5 ou 6). Padrão: 3';

-- Verificar estrutura atualizada
SELECT column_name, data_type, column_default, is_nullable
FROM information_schema.columns
WHERE table_name = 'user_sessions'
ORDER BY ordinal_position;
