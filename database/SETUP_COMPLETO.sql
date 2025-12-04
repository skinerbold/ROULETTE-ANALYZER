-- ============================================================================
-- SCRIPT ÚNICO: Armazenamento Ilimitado + Export Diário + Cron Job
-- Data: 4 de dezembro de 2025
-- Execute este script completo no Supabase SQL Editor
-- ============================================================================

-- ============================================================================
-- PARTE 1: REMOVER LIMITE DE POSIÇÕES (Armazenamento Ilimitado)
-- ============================================================================

-- Remover constraint CHECK que limita posições
ALTER TABLE roulette_history
DROP CONSTRAINT IF EXISTS roulette_history_position_check;

-- Remover constraint UNIQUE de position (não precisamos mais de posições fixas)
ALTER TABLE roulette_history
DROP CONSTRAINT IF EXISTS unique_roulette_position;

-- Remover coluna position (não é mais necessária com armazenamento ilimitado)
ALTER TABLE roulette_history
DROP COLUMN IF EXISTS position;

-- Adicionar índice para queries por timestamp (queries filtram por range de timestamp)
CREATE INDEX IF NOT EXISTS idx_roulette_history_timestamp 
ON roulette_history(roulette_id, timestamp);

-- Atualizar comentários
COMMENT ON TABLE roulette_history IS 
'Armazena TODOS os números sorteados de cada roleta com timestamp. Armazenamento ilimitado. Export diário às 23:59.';

COMMENT ON COLUMN roulette_history.timestamp IS 
'Data/hora exata do sorteio (usado para export diário e análises temporais)';

-- ============================================================================
-- PARTE 2: CRIAR TABELA DE EXPORTS DIÁRIOS
-- ============================================================================

CREATE TABLE IF NOT EXISTS daily_exports (
  id BIGSERIAL PRIMARY KEY,
  export_date DATE NOT NULL,
  roulette_id VARCHAR(255) NOT NULL,
  total_numbers INTEGER NOT NULL,
  first_number_time TIMESTAMPTZ NOT NULL,
  last_number_time TIMESTAMPTZ NOT NULL,
  export_data JSONB NOT NULL, -- Array de {number, timestamp}
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Cada roleta tem apenas um export por dia
  CONSTRAINT unique_daily_export UNIQUE(roulette_id, export_date)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_daily_exports_date 
ON daily_exports(export_date DESC);

CREATE INDEX IF NOT EXISTS idx_daily_exports_roulette 
ON daily_exports(roulette_id, export_date DESC);

-- Comentários
COMMENT ON TABLE daily_exports IS 
'Armazena exports diários de todos os números sorteados por roleta. Gerado automaticamente às 23:59.';

COMMENT ON COLUMN daily_exports.export_data IS 
'Array JSON com todos os números do dia: [{number: 17, timestamp: "2025-12-04T14:30:00Z"}, ...]';

-- ============================================================================
-- PARTE 3: CRIAR FUNÇÃO DE EXPORT DIÁRIO
-- ============================================================================

-- Remover função antiga (necessário porque mudamos os parâmetros de retorno)
DROP FUNCTION IF EXISTS export_daily_roulette_history();

CREATE OR REPLACE FUNCTION export_daily_roulette_history()
RETURNS TABLE(
  out_roulette_id VARCHAR(255),
  total_exported INTEGER,
  out_export_date DATE
) AS $$
DECLARE
  v_export_date DATE;
  v_roulette RECORD;
  v_total INTEGER;
BEGIN
  -- Data do export (dia atual)
  v_export_date := CURRENT_DATE;
  
  -- Para cada roleta, exportar números do dia
  FOR v_roulette IN 
    SELECT DISTINCT rh.roulette_id
    FROM roulette_history rh
    WHERE DATE(to_timestamp(rh.timestamp / 1000.0)) = v_export_date
  LOOP
    -- Inserir export do dia
    INSERT INTO daily_exports (
      export_date,
      roulette_id,
      total_numbers,
      first_number_time,
      last_number_time,
      export_data
    )
    SELECT
      v_export_date,
      v_roulette.roulette_id,
      COUNT(*),
      to_timestamp(MIN(rh.timestamp) / 1000.0),
      to_timestamp(MAX(rh.timestamp) / 1000.0),
      jsonb_agg(
        jsonb_build_object(
          'number', rh.number,
          'timestamp', to_timestamp(rh.timestamp / 1000.0),
          'hour', EXTRACT(HOUR FROM to_timestamp(rh.timestamp / 1000.0)),
          'minute', EXTRACT(MINUTE FROM to_timestamp(rh.timestamp / 1000.0))
        ) ORDER BY rh.timestamp
      )
    FROM roulette_history rh
    WHERE rh.roulette_id = v_roulette.roulette_id
      AND DATE(to_timestamp(rh.timestamp / 1000.0)) = v_export_date
    ON CONFLICT (roulette_id, export_date) 
    DO UPDATE SET
      total_numbers = EXCLUDED.total_numbers,
      first_number_time = EXCLUDED.first_number_time,
      last_number_time = EXCLUDED.last_number_time,
      export_data = EXCLUDED.export_data,
      created_at = NOW();
    
    GET DIAGNOSTICS v_total = ROW_COUNT;
    
    RETURN QUERY SELECT v_roulette.roulette_id, v_total, v_export_date;
  END LOOP;
  
  RETURN;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION export_daily_roulette_history IS 
'Exporta todos os números do dia atual para a tabela daily_exports. Deve ser executada às 23:59 via cron job.';

-- ============================================================================
-- PARTE 4: ATUALIZAR FUNÇÃO update_roulette_history (Sem Limite)
-- ============================================================================

-- Remover funções antigas com assinaturas diferentes
DROP FUNCTION IF EXISTS update_roulette_history(VARCHAR, INTEGER, TIMESTAMPTZ);
DROP FUNCTION IF EXISTS update_roulette_history(VARCHAR, INTEGER);
DROP FUNCTION IF EXISTS update_roulette_history(TEXT, INTEGER, BIGINT);

CREATE OR REPLACE FUNCTION update_roulette_history(
  p_roulette_id VARCHAR(255),
  p_number INTEGER,
  p_timestamp BIGINT DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT * 1000
)
RETURNS TABLE(success BOOLEAN, message TEXT, history_count INTEGER) AS $$
DECLARE
  v_count INTEGER;
  v_timestamp_converted TIMESTAMPTZ;
BEGIN
  -- Converter timestamp de milissegundos para TIMESTAMPTZ
  v_timestamp_converted := to_timestamp(p_timestamp / 1000.0);
  
  -- Validações
  IF p_number < 0 OR p_number > 36 THEN
    RETURN QUERY SELECT FALSE, 'Número inválido (deve estar entre 0 e 36)', 0;
    RETURN;
  END IF;

  -- Inserir novo número (SEM LIMITE - armazenamento ilimitado)
  INSERT INTO roulette_history (roulette_id, number, timestamp)
  VALUES (p_roulette_id, p_number, p_timestamp);

  -- Atualizar metadata
  INSERT INTO roulette_metadata (roulette_id, last_number, total_spins, history_count, last_update)
  VALUES (
    p_roulette_id, 
    p_number, 
    1, 
    (SELECT COUNT(*) FROM roulette_history WHERE roulette_id = p_roulette_id),
    v_timestamp_converted
  )
  ON CONFLICT (roulette_id) DO UPDATE
  SET 
    last_number = p_number,
    last_update = v_timestamp_converted,
    total_spins = roulette_metadata.total_spins + 1,
    history_count = (SELECT COUNT(*) FROM roulette_history WHERE roulette_id = p_roulette_id);

  -- Obter contagem atual
  SELECT COUNT(*) INTO v_count FROM roulette_history WHERE roulette_id = p_roulette_id;

  RETURN QUERY SELECT TRUE, 'Histórico atualizado com sucesso', v_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION update_roulette_history IS 
'Insere novo número no histórico SEM LIMITE. Armazenamento ilimitado. Export diário remove números antigos.';

-- ============================================================================
-- PARTE 5: CRIAR FUNÇÃO DE LIMPEZA (Opcional - manter últimos 30 dias)
-- ============================================================================

-- Remover função antiga (necessário porque mudamos os parâmetros de retorno)
DROP FUNCTION IF EXISTS cleanup_old_history(INTEGER);

CREATE OR REPLACE FUNCTION cleanup_old_history(days_to_keep INTEGER DEFAULT 30)
RETURNS TABLE(
  out_roulette_id VARCHAR(255),
  deleted_count INTEGER
) AS $$
DECLARE
  v_cutoff_timestamp BIGINT;
  v_roulette RECORD;
  v_deleted INTEGER;
BEGIN
  -- Converter data de corte para timestamp em milissegundos
  v_cutoff_timestamp := EXTRACT(EPOCH FROM (NOW() - (days_to_keep || ' days')::INTERVAL))::BIGINT * 1000;
  
  FOR v_roulette IN 
    SELECT DISTINCT rh.roulette_id
    FROM roulette_history rh
    WHERE rh.timestamp < v_cutoff_timestamp
  LOOP
    DELETE FROM roulette_history
    WHERE roulette_history.roulette_id = v_roulette.roulette_id
      AND timestamp < v_cutoff_timestamp;
    
    GET DIAGNOSTICS v_deleted = ROW_COUNT;
    
    RETURN QUERY SELECT v_roulette.roulette_id, v_deleted;
  END LOOP;
  
  RETURN;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION cleanup_old_history IS 
'Remove números mais antigos que N dias (padrão: 30). Executar mensalmente. Exports diários são mantidos.';

-- ============================================================================
-- PARTE 6: HABILITAR EXTENSÃO pg_cron
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pg_cron;

-- ============================================================================
-- PARTE 7: CONFIGURAR CRON JOBS
-- ============================================================================

-- Remover job antigo de export se existir
DO $$
BEGIN
  PERFORM cron.unschedule('daily-roulette-export');
EXCEPTION
  WHEN OTHERS THEN
    NULL;
END
$$;

-- Criar job que executa às 23:59 todos os dias
SELECT cron.schedule(
  'daily-roulette-export',
  '59 23 * * *',
  $$
    SELECT export_daily_roulette_history();
  $$
);

-- Remover job antigo de limpeza se existir
DO $$
BEGIN
  PERFORM cron.unschedule('cleanup-old-history');
EXCEPTION
  WHEN OTHERS THEN
    NULL;
END
$$;

-- Criar job para limpar números antigos (manter últimos 30 dias)
-- Executa todo dia às 00:30
SELECT cron.schedule(
  'cleanup-old-history',
  '30 0 * * *',
  $$
    SELECT cleanup_old_history(30);
  $$
);

-- ============================================================================
-- VERIFICAÇÃO E TESTE
-- ============================================================================

-- Ver estrutura atualizada
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'roulette_history'
ORDER BY ordinal_position;

-- Ver funções criadas
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN ('update_roulette_history', 'export_daily_roulette_history', 'cleanup_old_history')
ORDER BY routine_name;

-- Verificar jobs agendados
SELECT jobid, jobname, schedule, command, active
FROM cron.job
WHERE jobname LIKE '%roulette%';

-- Testar export manualmente
SELECT * FROM export_daily_roulette_history();

-- Ver resultado (se houver dados hoje)
SELECT 
  export_date,
  roulette_id,
  total_numbers,
  first_number_time,
  last_number_time
FROM daily_exports
WHERE export_date = CURRENT_DATE;

-- ============================================================================
-- SUCESSO!
-- ============================================================================
-- ✅ Armazenamento ilimitado configurado
-- ✅ Tabela daily_exports criada
-- ✅ Funções de export e limpeza criadas
-- ✅ Cron jobs configurados (23:59 e 00:30)
-- ✅ Frontend continua mostrando 500 números
-- ============================================================================
