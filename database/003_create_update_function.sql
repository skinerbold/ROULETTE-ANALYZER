-- ============================================================================
-- FUNCTION: update_roulette_history
-- Atualiza o histórico de uma roleta com um novo número
-- ============================================================================

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
  IF p_number < 0 OR p_number > 36 THEN
    RETURN QUERY SELECT FALSE, 'Número inválido (deve estar entre 0 e 36)', 0;
    RETURN;
  END IF;

  -- PASSO 1: Deletar posição 500 se existir
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

  -- PASSO 4: Atualizar metadata
  INSERT INTO roulette_metadata (roulette_id, last_number, total_spins, history_count, last_update)
  VALUES (
    p_roulette_id, 
    p_number, 
    1, 
    (SELECT COUNT(*) FROM roulette_history WHERE roulette_id = p_roulette_id),
    p_timestamp
  )
  ON CONFLICT (roulette_id) DO UPDATE
  SET 
    last_number = p_number,
    last_update = p_timestamp,
    total_spins = roulette_metadata.total_spins + 1,
    history_count = (SELECT COUNT(*) FROM roulette_history WHERE roulette_id = p_roulette_id);

  -- Obter contagem atual
  SELECT COUNT(*) INTO v_count FROM roulette_history WHERE roulette_id = p_roulette_id;

  RETURN QUERY SELECT TRUE, 'Histórico atualizado com sucesso', v_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- COMENTÁRIOS
-- ============================================================================

COMMENT ON FUNCTION update_roulette_history IS 
'Atualiza o histórico de uma roleta com um novo número. Remove posição 500, desloca todas as posições e insere o novo na posição 1.';
