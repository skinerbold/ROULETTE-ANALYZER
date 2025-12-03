-- ============================================================================
-- SCRIPT DE LIMPEZA: Remover dados duplicados do roulette_history
-- 
-- PROBLEMA: O sistema estava inserindo todo o histórico (~60 números) repetidamente
-- causando duplicatas massivas no banco de dados.
--
-- EXECUTE ESTE SCRIPT NO SUPABASE SQL EDITOR
-- ============================================================================

-- ============================================================================
-- PASSO 1: Verificar estado atual (execute primeiro para diagnóstico)
-- ============================================================================

-- Verificar quantos registros por roleta e quantos únicos
SELECT 
    roulette_id,
    COUNT(*) as total_records,
    COUNT(DISTINCT number) as unique_numbers,
    MAX(position) as max_position,
    MIN(position) as min_position
FROM roulette_history
GROUP BY roulette_id
ORDER BY total_records DESC;

-- ============================================================================
-- PASSO 2: Backup (OPCIONAL - crie uma cópia antes de limpar)
-- ============================================================================

-- CREATE TABLE roulette_history_backup AS SELECT * FROM roulette_history;

-- ============================================================================
-- PASSO 3: Limpar tabela completamente (RECOMENDADO)
-- Como o sistema vai reconstruir o histórico corretamente, é mais seguro limpar
-- ============================================================================

-- TRUNCATE TABLE roulette_history;

-- OU se preferir manter alguns dados, usar DELETE seletivo:
-- DELETE FROM roulette_history WHERE position > 1;

-- ============================================================================
-- PASSO 4: Resetar sequências se necessário
-- ============================================================================

-- ALTER SEQUENCE roulette_history_id_seq RESTART WITH 1;

-- ============================================================================
-- PASSO 5: Verificar se a função update_roulette_history existe
-- ============================================================================

SELECT 
    routine_name,
    routine_type
FROM information_schema.routines 
WHERE routine_name = 'update_roulette_history' 
AND routine_schema = 'public';

-- ============================================================================
-- PASSO 6: Se a função não existir, criar ela
-- ============================================================================

/*
CREATE OR REPLACE FUNCTION update_roulette_history(
  p_roulette_id VARCHAR(255),
  p_number INTEGER,
  p_timestamp TIMESTAMPTZ DEFAULT NOW()
)
RETURNS TABLE(success BOOLEAN, message TEXT, history_count INTEGER) AS $$
DECLARE
  v_count INTEGER;
BEGIN
  -- Validações
  IF p_number < 0 OR p_number > 37 THEN
    RETURN QUERY SELECT FALSE, 'Número inválido (deve estar entre 0 e 37)'::TEXT, 0;
    RETURN;
  END IF;

  -- PASSO 1: Deletar posição 500 se existir (mantém máximo de 500)
  DELETE FROM roulette_history 
  WHERE roulette_id = p_roulette_id AND position = 500;

  -- PASSO 2: Incrementar todas as posições (shift down)
  UPDATE roulette_history 
  SET position = position + 1 
  WHERE roulette_id = p_roulette_id;

  -- PASSO 3: Inserir novo número na posição 1
  INSERT INTO roulette_history (roulette_id, number, position, timestamp)
  VALUES (p_roulette_id, p_number, 1, p_timestamp)
  ON CONFLICT (roulette_id, position) DO UPDATE
  SET number = p_number, timestamp = p_timestamp;

  -- Obter contagem atual
  SELECT COUNT(*) INTO v_count FROM roulette_history WHERE roulette_id = p_roulette_id;

  RETURN QUERY SELECT TRUE, 'Histórico atualizado com sucesso'::TEXT, v_count;
END;
$$ LANGUAGE plpgsql;
*/

-- ============================================================================
-- PASSO 7: Testar a função com um número
-- ============================================================================

-- SELECT * FROM update_roulette_history('test-cleanup', 17);
-- SELECT * FROM roulette_history WHERE roulette_id = 'test-cleanup' ORDER BY position;

-- ============================================================================
-- PASSO 8: Limpar dados de teste
-- ============================================================================

-- DELETE FROM roulette_history WHERE roulette_id = 'test-cleanup';
