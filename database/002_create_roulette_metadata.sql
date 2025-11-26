-- ============================================================================
-- TABELA: roulette_metadata
-- Armazena metadados e estatísticas de cada roleta
-- ============================================================================

CREATE TABLE IF NOT EXISTS roulette_metadata (
  roulette_id VARCHAR(255) PRIMARY KEY,
  last_number INTEGER CHECK (last_number >= 0 AND last_number <= 36),
  last_update TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  total_spins BIGINT DEFAULT 0,
  history_count INTEGER DEFAULT 0 CHECK (history_count >= 0 AND history_count <= 500),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- ÍNDICES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_roulette_metadata_last_update 
ON roulette_metadata(last_update DESC);

-- ============================================================================
-- TRIGGER PARA ATUALIZAR updated_at
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_roulette_metadata_updated_at
BEFORE UPDATE ON roulette_metadata
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- COMENTÁRIOS
-- ============================================================================

COMMENT ON TABLE roulette_metadata IS 
'Metadados e estatísticas de cada roleta';

COMMENT ON COLUMN roulette_metadata.roulette_id IS 
'Identificador único da roleta';

COMMENT ON COLUMN roulette_metadata.last_number IS 
'Último número sorteado';

COMMENT ON COLUMN roulette_metadata.total_spins IS 
'Total de giros desde o início do monitoramento';

COMMENT ON COLUMN roulette_metadata.history_count IS 
'Quantidade de registros no histórico (máx 500)';
