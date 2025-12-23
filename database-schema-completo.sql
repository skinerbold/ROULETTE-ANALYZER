-- ============================================================
-- SCHEMA COMPLETO - RouletteAnalyzer Database
-- ============================================================
-- Data de criação: 23/12/2025
-- Descrição: Todas as tabelas necessárias para o sistema
-- ============================================================

-- Limpar tabelas se existirem
DROP TABLE IF EXISTS daily_max_streaks CASCADE;
DROP TABLE IF EXISTS historico_da_roleta CASCADE;
DROP TABLE IF EXISTS user_sessions CASCADE;
DROP TABLE IF EXISTS sessoes_de_usuario CASCADE;
DROP TABLE IF EXISTS estrategias_personalizadas CASCADE;
DROP TABLE IF EXISTS exportacoes_diarias CASCADE;
DROP TABLE IF EXISTS sequencias_maximas_diarias CASCADE;
DROP TABLE IF EXISTS sugestoes_de_estrategia_de_IA CASCADE;
DROP TABLE IF EXISTS relatorio_logs_da_execucao CASCADE;
DROP TABLE IF EXISTS metadados_da_roleta CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- ============================================================
-- TABELA: users
-- ============================================================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    nome VARCHAR(255),
    foto_perfil TEXT,
    chip_category VARCHAR(50) DEFAULT 'all',
    selected_strategies TEXT,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);

-- ============================================================
-- TABELA: user_sessions
-- ============================================================
CREATE TABLE user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    chip_category VARCHAR(50),
    selected_strategies TEXT,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);

-- ============================================================
-- TABELA: historico_da_roleta
-- ============================================================
CREATE TABLE historico_da_roleta (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    roulette_id TEXT NOT NULL,
    number INTEGER NOT NULL CHECK (number >= 0 AND number <= 37),
    color VARCHAR(10),
    timestamp BIGINT NOT NULL,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_historico_roulette_id ON historico_da_roleta(roulette_id);
CREATE INDEX idx_historico_timestamp ON historico_da_roleta(timestamp);
CREATE INDEX idx_historico_roulette_timestamp ON historico_da_roleta(roulette_id, timestamp DESC);

-- ============================================================
-- TABELA: daily_max_streaks
-- ============================================================
CREATE TABLE daily_max_streaks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    roulette_id TEXT NOT NULL,
    strategy_id INTEGER NOT NULL,
    analysis_date DATE NOT NULL,
    max_red_1_casa INTEGER DEFAULT 0,
    max_red_2_casas INTEGER DEFAULT 0,
    max_red_3_casas INTEGER DEFAULT 0,
    max_green_1_casa INTEGER DEFAULT 0,
    max_green_2_casas INTEGER DEFAULT 0,
    max_green_3_casas INTEGER DEFAULT 0,
    total_spins INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_daily_streak UNIQUE (roulette_id, strategy_id, analysis_date)
);

CREATE INDEX idx_daily_max_streaks_roulette ON daily_max_streaks(roulette_id);
CREATE INDEX idx_daily_max_streaks_strategy ON daily_max_streaks(strategy_id);
CREATE INDEX idx_daily_max_streaks_date ON daily_max_streaks(analysis_date);
CREATE INDEX idx_daily_max_streaks_lookup ON daily_max_streaks(roulette_id, strategy_id, analysis_date);

-- ============================================================
-- TABELA: estrategias_personalizadas
-- ============================================================
CREATE TABLE estrategias_personalizadas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ou_id UUID REFERENCES users(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    numeros TEXT NOT NULL,
    estrategia_seleciona TEXT,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    categoria_chip VARCHAR(50)
);

CREATE INDEX idx_estrategias_user_id ON estrategias_personalizadas(user_id);

-- ============================================================
-- TABELA: exportacoes_diarias
-- ============================================================
CREATE TABLE exportacoes_diarias (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    data_exportacao DATE NOT NULL,
    conteudo JSONB,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_exportacoes_user_id ON exportacoes_diarias(user_id);
CREATE INDEX idx_exportacoes_data ON exportacoes_diarias(data_exportacao);

-- ============================================================
-- TABELA: sequencias_maximas_diarias
-- ============================================================
CREATE TABLE sequencias_maximas_diarias (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    roulette_id TEXT NOT NULL,
    strategy_id INTEGER NOT NULL,
    data DATE NOT NULL,
    max_red INTEGER DEFAULT 0,
    max_green INTEGER DEFAULT 0,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_seq_maxima UNIQUE (roulette_id, strategy_id, data)
);

CREATE INDEX idx_seq_maximas_roulette ON sequencias_maximas_diarias(roulette_id);
CREATE INDEX idx_seq_maximas_data ON sequencias_maximas_diarias(data);

-- ============================================================
-- TABELA: sugestoes_de_estrategia_de_IA
-- ============================================================
CREATE TABLE sugestoes_de_estrategia_de_IA (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    sugestao JSONB,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_sugestoes_user_id ON sugestoes_de_estrategia_de_IA(user_id);

-- ============================================================
-- TABELA: relatorio_logs_da_execucao
-- ============================================================
CREATE TABLE relatorio_logs_da_execucao (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tipo VARCHAR(50),
    mensagem TEXT,
    dados JSONB,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_logs_tipo ON relatorio_logs_da_execucao(tipo);
CREATE INDEX idx_logs_criado_em ON relatorio_logs_da_execucao(criado_em DESC);

-- ============================================================
-- TABELA: metadados_da_roleta
-- ============================================================
CREATE TABLE metadados_da_roleta (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    roulette_id TEXT UNIQUE NOT NULL,
    nome VARCHAR(255),
    provedor VARCHAR(100),
    ativo BOOLEAN DEFAULT TRUE,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_metadados_roulette_id ON metadados_da_roleta(roulette_id);

-- ============================================================
-- TRIGGERS PARA UPDATE AUTOMÁTICO
-- ============================================================

-- Trigger para users
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.atualizado_em = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_sessions_updated_at
    BEFORE UPDATE ON user_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_estrategias_updated_at
    BEFORE UPDATE ON estrategias_personalizadas
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_metadados_updated_at
    BEFORE UPDATE ON metadados_da_roleta
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_daily_max_streaks_updated_at
    BEFORE UPDATE ON daily_max_streaks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- DADOS INICIAIS
-- ============================================================

-- Inserir usuário admin padrão (senha: admin123)
-- Hash bcrypt de 'admin123': $2a$10$xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
INSERT INTO users (email, password_hash, nome, chip_category, selected_strategies)
VALUES (
    'admin@roleta.com',
    '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhkO',
    'Administrador',
    'all',
    '1'
) ON CONFLICT (email) DO NOTHING;

-- ============================================================
-- COMENTÁRIOS
-- ============================================================
COMMENT ON TABLE users IS 'Usuários do sistema';
COMMENT ON TABLE user_sessions IS 'Sessões ativas de usuários';
COMMENT ON TABLE historico_da_roleta IS 'Histórico de números da roleta em tempo real';
COMMENT ON TABLE daily_max_streaks IS 'Máximos diários de sequências RED/GREEN por estratégia';
COMMENT ON TABLE estrategias_personalizadas IS 'Estratégias customizadas criadas pelos usuários';
COMMENT ON TABLE exportacoes_diarias IS 'Exportações diárias de relatórios';
COMMENT ON TABLE sequencias_maximas_diarias IS 'Sequências máximas diárias (legacy)';
COMMENT ON TABLE sugestoes_de_estrategia_de_IA IS 'Sugestões de estratégias geradas por IA';
COMMENT ON TABLE relatorio_logs_da_execucao IS 'Logs de execução do sistema';
COMMENT ON TABLE metadados_da_roleta IS 'Metadados das roletas conectadas';

-- ============================================================
-- FIM DO SCHEMA
-- ============================================================
