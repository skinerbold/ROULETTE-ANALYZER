-- ========================================
-- TABELA: daily_report_parts
-- Armazena partes progressivas do relatório diário
-- ========================================

-- Criar tabela se não existir
CREATE TABLE IF NOT EXISTS daily_report_parts (
  id SERIAL PRIMARY KEY,
  report_date DATE NOT NULL,
  period_name VARCHAR(30) NOT NULL,
  period_type VARCHAR(20) NOT NULL, -- 'sub' (2h), 'intermediate' (6h), 'final' (24h)
  period_order INTEGER NOT NULL, -- Ordem do período no dia (1-12 para sub, 1-4 para intermediate, 1 para final)
  content TEXT NOT NULL,
  total_lancamentos INTEGER DEFAULT 0,
  generated_at TIMESTAMP DEFAULT NOW(),
  
  -- Constraint para evitar duplicatas
  UNIQUE(report_date, period_name, period_type)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_report_parts_date ON daily_report_parts(report_date);
CREATE INDEX IF NOT EXISTS idx_report_parts_type ON daily_report_parts(period_type);
CREATE INDEX IF NOT EXISTS idx_report_parts_date_type ON daily_report_parts(report_date, period_type);

-- Comentários da tabela
COMMENT ON TABLE daily_report_parts IS 'Armazena partes progressivas do relatório diário de roletas';
COMMENT ON COLUMN daily_report_parts.period_type IS 'Tipo do período: sub (2h), intermediate (6h), final (24h)';
COMMENT ON COLUMN daily_report_parts.period_order IS 'Ordem do período: 1-12 para sub, 1-4 para intermediate, 1 para final';

-- Função para limpar relatórios antigos (manter apenas últimos 30 dias)
CREATE OR REPLACE FUNCTION clean_old_report_parts() RETURNS void AS $$
BEGIN
  DELETE FROM daily_report_parts 
  WHERE report_date < CURRENT_DATE - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;
