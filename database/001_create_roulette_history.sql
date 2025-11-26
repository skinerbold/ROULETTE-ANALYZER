-- ============================================================================
-- TABELA: roulette_history
-- Armazena os últimos 500 números de cada roleta em ordem
-- ============================================================================

CREATE TABLE IF NOT EXISTS roulette_history (
  id BIGSERIAL PRIMARY KEY,
  roulette_id VARCHAR(255) NOT NULL,
  number INTEGER NOT NULL CHECK (number >= 0 AND number <= 36),
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  position INTEGER NOT NULL CHECK (position >= 1 AND position <= 500),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraint única: cada roleta tem apenas um registro por posição
  CONSTRAINT unique_roulette_position UNIQUE(roulette_id, position)
);

-- ============================================================================
-- ÍNDICES PARA PERFORMANCE
-- ============================================================================

-- Índice principal para buscar por roleta
CREATE INDEX IF NOT EXISTS idx_roulette_history_roulette_id 
ON roulette_history(roulette_id);

-- Índice composto para queries de histórico ordenado
CREATE INDEX IF NOT EXISTS idx_roulette_history_position 
ON roulette_history(roulette_id, position);

-- Índice para queries por timestamp
CREATE INDEX IF NOT EXISTS idx_roulette_history_timestamp 
ON roulette_history(roulette_id, timestamp DESC);

-- ============================================================================
-- COMENTÁRIOS
-- ============================================================================

COMMENT ON TABLE roulette_history IS 
'Armazena os últimos 500 números sorteados de cada roleta em ordem (position 1 = mais recente)';

COMMENT ON COLUMN roulette_history.roulette_id IS 
'Identificador único da roleta (ex: pragmatic-speed-auto-roulette)';

COMMENT ON COLUMN roulette_history.number IS 
'Número sorteado na roleta (0-36)';

COMMENT ON COLUMN roulette_history.position IS 
'Posição na fila de histórico (1 = mais recente, 500 = mais antigo)';

COMMENT ON COLUMN roulette_history.timestamp IS 
'Data/hora real do sorteio';
