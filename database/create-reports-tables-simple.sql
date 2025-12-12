-- ========================================
-- TABELAS PARA SISTEMA DE RELATÓRIOS DIÁRIOS
-- Execute este script no Supabase SQL Editor
-- 
-- IMPORTANTE: Este script NÃO cria roulette_numbers
-- Usa a tabela roulette_history existente
-- ========================================

-- 1. Tabela para armazenar os relatórios diários gerados
CREATE TABLE IF NOT EXISTS daily_reports (
    id BIGSERIAL PRIMARY KEY,
    report_date DATE NOT NULL UNIQUE,
    content TEXT NOT NULL,
    total_lancamentos INTEGER DEFAULT 0,
    total_estrategias INTEGER DEFAULT 0,
    total_roletas INTEGER DEFAULT 0,
    summary JSONB DEFAULT '{}',
    generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índice para busca por data
CREATE INDEX IF NOT EXISTS idx_daily_reports_date 
ON daily_reports(report_date DESC);

-- 2. Tabela para armazenar sugestões de estratégias geradas pela IA
CREATE TABLE IF NOT EXISTS ai_strategy_suggestions (
    id BIGSERIAL PRIMARY KEY,
    report_id BIGINT REFERENCES daily_reports(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    numbers INTEGER[] NOT NULL,
    justification TEXT,
    recommended_hours VARCHAR(50),
    recommended_roulette VARCHAR(255),
    confidence_score DECIMAL(5,2),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índice para busca por relatório
CREATE INDEX IF NOT EXISTS idx_ai_suggestions_report 
ON ai_strategy_suggestions(report_id);

-- 3. Tabela para logs de execução dos relatórios
CREATE TABLE IF NOT EXISTS report_execution_logs (
    id BIGSERIAL PRIMARY KEY,
    report_date DATE NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('started', 'success', 'failed')),
    error_message TEXT,
    execution_time_ms INTEGER,
    lancamentos_processados INTEGER DEFAULT 0,
    estrategias_analisadas INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_daily_reports_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_daily_reports_updated_at ON daily_reports;
CREATE TRIGGER trigger_daily_reports_updated_at
    BEFORE UPDATE ON daily_reports
    FOR EACH ROW
    EXECUTE FUNCTION update_daily_reports_updated_at();

-- 5. Políticas de RLS (Row Level Security)
ALTER TABLE daily_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_strategy_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_execution_logs ENABLE ROW LEVEL SECURITY;

-- Política para relatórios (apenas leitura pública)
CREATE POLICY "Daily reports are viewable by everyone"
ON daily_reports FOR SELECT
USING (true);

-- Política para inserção de relatórios (service role)
CREATE POLICY "Service role can manage daily reports"
ON daily_reports FOR ALL
USING (true)
WITH CHECK (true);

-- Política para sugestões de IA
CREATE POLICY "AI suggestions are viewable by everyone"
ON ai_strategy_suggestions FOR SELECT
USING (true);

CREATE POLICY "Service role can manage AI suggestions"
ON ai_strategy_suggestions FOR ALL
USING (true)
WITH CHECK (true);

-- Política para logs
CREATE POLICY "Logs are viewable by everyone"
ON report_execution_logs FOR SELECT
USING (true);

CREATE POLICY "Service role can manage logs"
ON report_execution_logs FOR ALL
USING (true)
WITH CHECK (true);

-- ========================================
-- COMENTÁRIOS NAS TABELAS
-- ========================================

COMMENT ON TABLE daily_reports IS 'Relatórios diários gerados automaticamente com análise via ChatGPT';
COMMENT ON TABLE ai_strategy_suggestions IS 'Sugestões de novas estratégias geradas pela IA';
COMMENT ON TABLE report_execution_logs IS 'Logs de execução do sistema de relatórios';

COMMENT ON COLUMN daily_reports.report_date IS 'Data do relatório (YYYY-MM-DD)';
COMMENT ON COLUMN daily_reports.content IS 'Conteúdo completo do relatório em Markdown';
COMMENT ON COLUMN daily_reports.summary IS 'Resumo estruturado em JSON para consultas rápidas';

SELECT 'Tabelas de relatórios diários criadas com sucesso! Usando tabela roulette_history existente.' as message;
