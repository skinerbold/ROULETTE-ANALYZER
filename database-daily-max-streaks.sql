-- ============================================================
-- Tabela para armazenar máximos diários de RED/GREEN por estratégia
-- ============================================================
-- Esta tabela armazena os valores máximos de sequências RED e GREEN
-- para cada combinação de: roleta + estratégia + data + casas
-- Isso evita recálculos constantes e melhora a performance
-- ============================================================

CREATE TABLE IF NOT EXISTS daily_max_streaks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Identificadores
  roulette_id TEXT NOT NULL,
  strategy_id INTEGER NOT NULL,
  analysis_date DATE NOT NULL,
  
  -- Máximos de RED por quantidade de casas
  max_red_1_casa INTEGER DEFAULT 0,
  max_red_2_casas INTEGER DEFAULT 0,
  max_red_3_casas INTEGER DEFAULT 0,
  
  -- Máximos de GREEN por quantidade de casas
  max_green_1_casa INTEGER DEFAULT 0,
  max_green_2_casas INTEGER DEFAULT 0,
  max_green_3_casas INTEGER DEFAULT 0,
  
  -- Metadados
  total_spins INTEGER DEFAULT 0, -- Total de lançamentos nesse dia
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraint única: apenas um registro por roleta/estratégia/data
  CONSTRAINT unique_daily_streak UNIQUE (roulette_id, strategy_id, analysis_date)
);

-- Índices para consultas rápidas
CREATE INDEX IF NOT EXISTS idx_daily_max_streaks_roulette 
  ON daily_max_streaks(roulette_id);

CREATE INDEX IF NOT EXISTS idx_daily_max_streaks_strategy 
  ON daily_max_streaks(strategy_id);

CREATE INDEX IF NOT EXISTS idx_daily_max_streaks_date 
  ON daily_max_streaks(analysis_date);

CREATE INDEX IF NOT EXISTS idx_daily_max_streaks_lookup 
  ON daily_max_streaks(roulette_id, strategy_id, analysis_date);

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_daily_max_streaks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar updated_at
DROP TRIGGER IF EXISTS trigger_daily_max_streaks_updated_at ON daily_max_streaks;
CREATE TRIGGER trigger_daily_max_streaks_updated_at
  BEFORE UPDATE ON daily_max_streaks
  FOR EACH ROW
  EXECUTE FUNCTION update_daily_max_streaks_updated_at();

-- Habilitar RLS (Row Level Security)
ALTER TABLE daily_max_streaks ENABLE ROW LEVEL SECURITY;

-- Política para permitir leitura pública
CREATE POLICY "Allow public read access on daily_max_streaks"
  ON daily_max_streaks
  FOR SELECT
  USING (true);

-- Política para permitir inserção/atualização (para o sistema)
CREATE POLICY "Allow public insert on daily_max_streaks"
  ON daily_max_streaks
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow public update on daily_max_streaks"
  ON daily_max_streaks
  FOR UPDATE
  USING (true);

-- ============================================================
-- Comentários na tabela
-- ============================================================
COMMENT ON TABLE daily_max_streaks IS 'Armazena máximos diários de sequências RED/GREEN por estratégia e roleta';
COMMENT ON COLUMN daily_max_streaks.roulette_id IS 'ID da roleta';
COMMENT ON COLUMN daily_max_streaks.strategy_id IS 'ID da estratégia';
COMMENT ON COLUMN daily_max_streaks.analysis_date IS 'Data da análise (YYYY-MM-DD)';
COMMENT ON COLUMN daily_max_streaks.max_red_1_casa IS 'Máximo de REDs consecutivos com 1 casa de análise';
COMMENT ON COLUMN daily_max_streaks.max_red_2_casas IS 'Máximo de REDs consecutivos com 2 casas de análise';
COMMENT ON COLUMN daily_max_streaks.max_red_3_casas IS 'Máximo de REDs consecutivos com 3 casas de análise';
COMMENT ON COLUMN daily_max_streaks.total_spins IS 'Total de lançamentos da roleta nesse dia';
