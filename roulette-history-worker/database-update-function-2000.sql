-- ============================================================================
-- FUNÇÃO ATUALIZADA: update_roulette_history para 2000 números
-- Atualiza o histórico de uma roleta com um novo número
-- Limite aumentado de 500 para 2000
-- ============================================================================

CREATE OR REPLACE FUNCTION update_roulette_history(
  p_roulette_id TEXT,
  p_number INTEGER,
  p_timestamp BIGINT
)
RETURNS TABLE(success BOOLEAN, message TEXT) AS $$
DECLARE
  v_existing_count INTEGER;
  v_oldest_timestamp BIGINT;
  v_timestamp_converted TIMESTAMPTZ;
BEGIN
  -- Converter timestamp de milissegundos para TIMESTAMPTZ
  v_timestamp_converted := to_timestamp(p_timestamp / 1000.0);
  
  -- Contar registros existentes
  SELECT COUNT(*) INTO v_existing_count
  FROM roulette_history
  WHERE roulette_id = p_roulette_id;
  
  -- Se já temos 2000 registros (aumentado de 500), remover o mais antigo
  IF v_existing_count >= 2000 THEN
    -- Encontrar o timestamp mais antigo
    SELECT MIN(timestamp) INTO v_oldest_timestamp
    FROM roulette_history
    WHERE roulette_id = p_roulette_id;
    
    -- Deletar apenas um registro com o timestamp mais antigo
    DELETE FROM roulette_history
    WHERE roulette_id = p_roulette_id 
      AND timestamp = v_oldest_timestamp
      AND ctid = (
        SELECT ctid 
        FROM roulette_history 
        WHERE roulette_id = p_roulette_id 
          AND timestamp = v_oldest_timestamp 
        LIMIT 1
      );
  END IF;
  
  -- Inserir novo registro com timestamp
  INSERT INTO roulette_history (roulette_id, number, timestamp)
  VALUES (p_roulette_id, p_number, v_timestamp_converted);
  
  -- Atualizar ou inserir metadados
  INSERT INTO roulette_metadata (
    roulette_id,
    total_spins,
    last_number,
    last_update
  ) VALUES (
    p_roulette_id,
    1,
    p_number,
    v_timestamp_converted
  )
  ON CONFLICT (roulette_id) DO UPDATE
  SET 
    total_spins = roulette_metadata.total_spins + 1,
    last_number = p_number,
    last_update = v_timestamp_converted;
  
  RETURN QUERY SELECT TRUE, 'Número inserido com sucesso';
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN QUERY SELECT FALSE, SQLERRM;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- COMENTÁRIOS
-- ============================================================================

COMMENT ON FUNCTION update_roulette_history IS 
'Atualiza o histórico de uma roleta com um novo número. Mantém os últimos 2000 números e remove o mais antigo quando necessário. O timestamp é armazenado para rastreamento da data/hora do sorteio.';

