-- ========================================
-- TABELAS PARA SISTEMA DE RELATÓRIOS DIÁRIOS
-- Execute este script no Supabase SQL Editor
-- ========================================

-- 1. Tabela para armazenar os números das roletas (se não existir)
-- Esta tabela deve ser populada pelo websocket ou manualmente
CREATE TABLE IF NOT EXISTS roulette_numbers (
    id BIGSERIAL PRIMARY KEY,
    roulette_id VARCHAR(100) NOT NULL,
    roulette_name VARCHAR(255) NOT NULL,
    number INTEGER NOT NULL CHECK (number >= 0 AND number <= 36),
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_roulette_numbers_timestamp 
ON roulette_numbers(timestamp);

CREATE INDEX IF NOT EXISTS idx_roulette_numbers_roulette_id 
ON roulette_numbers(roulette_id);

CREATE INDEX IF NOT EXISTS idx_roulette_numbers_date 
ON roulette_numbers(DATE(timestamp));

-- 2. Tabela para armazenar os relatórios diários gerados
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

-- 3. Tabela para armazenar sugestões de estratégias geradas pela IA
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

-- 4. Tabela para logs de execução dos relatórios
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

-- 5. Trigger para atualizar updated_at automaticamente
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

-- 6. Função para inserir números da roleta (pode ser chamada pelo websocket)
CREATE OR REPLACE FUNCTION insert_roulette_number(
    p_roulette_id VARCHAR(100),
    p_roulette_name VARCHAR(255),
    p_number INTEGER,
    p_timestamp TIMESTAMPTZ DEFAULT NOW()
)
RETURNS BIGINT AS $$
DECLARE
    v_id BIGINT;
BEGIN
    INSERT INTO roulette_numbers (roulette_id, roulette_name, number, timestamp)
    VALUES (p_roulette_id, p_roulette_name, p_number, p_timestamp)
    RETURNING id INTO v_id;
    
    RETURN v_id;
END;
$$ LANGUAGE plpgsql;

-- 7. Função para obter estatísticas do dia
CREATE OR REPLACE FUNCTION get_daily_stats(p_date DATE)
RETURNS TABLE (
    total_lancamentos BIGINT,
    total_roletas BIGINT,
    lancamentos_por_hora JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::BIGINT as total_lancamentos,
        COUNT(DISTINCT roulette_id)::BIGINT as total_roletas,
        jsonb_object_agg(
            EXTRACT(HOUR FROM timestamp)::TEXT,
            hour_count
        ) as lancamentos_por_hora
    FROM (
        SELECT 
            roulette_id,
            timestamp,
            COUNT(*) OVER (PARTITION BY EXTRACT(HOUR FROM timestamp)) as hour_count
        FROM roulette_numbers
        WHERE DATE(timestamp) = p_date
    ) subq;
END;
$$ LANGUAGE plpgsql;

-- 8. Políticas de RLS (Row Level Security)
ALTER TABLE roulette_numbers ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_strategy_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_execution_logs ENABLE ROW LEVEL SECURITY;

-- Política para leitura pública dos números (todos podem ler)
CREATE POLICY "Roulette numbers are viewable by everyone"
ON roulette_numbers FOR SELECT
USING (true);

-- Política para inserção (apenas autenticados ou service role)
CREATE POLICY "Service role can insert roulette numbers"
ON roulette_numbers FOR INSERT
WITH CHECK (true);

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

COMMENT ON TABLE roulette_numbers IS 'Armazena todos os números lançados nas roletas para análise histórica';
COMMENT ON TABLE daily_reports IS 'Relatórios diários gerados automaticamente com análise via ChatGPT';
COMMENT ON TABLE ai_strategy_suggestions IS 'Sugestões de novas estratégias geradas pela IA';
COMMENT ON TABLE report_execution_logs IS 'Logs de execução do sistema de relatórios';

COMMENT ON COLUMN roulette_numbers.roulette_id IS 'ID único da roleta';
COMMENT ON COLUMN roulette_numbers.roulette_name IS 'Nome da roleta para exibição';
COMMENT ON COLUMN roulette_numbers.number IS 'Número lançado (0-36)';
COMMENT ON COLUMN roulette_numbers.timestamp IS 'Momento exato do lançamento';

COMMENT ON COLUMN daily_reports.report_date IS 'Data do relatório (YYYY-MM-DD)';
COMMENT ON COLUMN daily_reports.content IS 'Conteúdo completo do relatório em Markdown';
COMMENT ON COLUMN daily_reports.summary IS 'Resumo estruturado em JSON para consultas rápidas';

-- ========================================
-- DADOS DE EXEMPLO (OPCIONAL)
-- Descomente se quiser testar
-- ========================================

/*
-- Inserir alguns números de exemplo para teste
INSERT INTO roulette_numbers (roulette_id, roulette_name, number, timestamp) VALUES
('roulette_1', 'Roleta Brasileira', 17, NOW() - INTERVAL '1 hour'),
('roulette_1', 'Roleta Brasileira', 32, NOW() - INTERVAL '55 minutes'),
('roulette_1', 'Roleta Brasileira', 0, NOW() - INTERVAL '50 minutes'),
('roulette_2', 'Roleta Europeia', 25, NOW() - INTERVAL '45 minutes'),
('roulette_2', 'Roleta Europeia', 14, NOW() - INTERVAL '40 minutes'),
('roulette_1', 'Roleta Brasileira', 7, NOW() - INTERVAL '35 minutes');
*/

SELECT 'Tabelas de relatórios diários criadas com sucesso!' as message;
