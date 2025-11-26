-- Função corrigida para atualizar histórico de roleta
-- Remove o LIMIT 1 problemático e usa uma abordagem diferente

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
  
  -- Se já temos 500 registros, remover o mais antigo
  IF v_existing_count >= 500 THEN
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
  
  -- Inserir novo registro
  INSERT INTO roulette_history (roulette_id, number, timestamp)
  VALUES (p_roulette_id, p_number, p_timestamp);
  
  -- Atualizar ou inserir metadados
  INSERT INTO roulette_metadata (
    roulette_id,
    total_spins,
    last_number,
    last_update,
    number_frequency
  )
  VALUES (
    p_roulette_id,
    1,
    p_number,
    v_timestamp_converted,
    jsonb_build_object(p_number::text, 1)
  )
  ON CONFLICT (roulette_id) DO UPDATE SET
    total_spins = roulette_metadata.total_spins + 1,
    last_number = p_number,
    last_update = v_timestamp_converted,
    number_frequency = jsonb_set(
      COALESCE(roulette_metadata.number_frequency, '{}'::jsonb),
      ARRAY[p_number::text],
      to_jsonb(COALESCE((roulette_metadata.number_frequency->>p_number::text)::integer, 0) + 1)
    );
  
  RETURN QUERY SELECT true, 'Histórico atualizado com sucesso'::TEXT;
END;
$$ LANGUAGE plpgsql;
