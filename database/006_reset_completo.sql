-- ============================================================================
-- RESET COMPLETO DO BANCO DE DADOS DE ROLETAS
-- 
-- Este script remove TODOS os dados de histórico e metadata das roletas
-- para recomeçar do zero, populando 1 número por vez conforme os lançamentos
-- ============================================================================

-- ============================================================================
-- PASSO 1: APAGAR TODOS OS DADOS DE HISTÓRICO
-- ============================================================================

TRUNCATE TABLE roulette_history RESTART IDENTITY CASCADE;

-- ============================================================================
-- PASSO 2: APAGAR METADATA DAS ROLETAS (se existir)
-- ============================================================================

TRUNCATE TABLE roulette_metadata RESTART IDENTITY CASCADE;

-- ============================================================================
-- PASSO 3: VERIFICAR QUE ESTÁ VAZIO
-- ============================================================================

SELECT 'roulette_history' as tabela, COUNT(*) as registros FROM roulette_history
UNION ALL
SELECT 'roulette_metadata' as tabela, COUNT(*) as registros FROM roulette_metadata;

-- ============================================================================
-- PASSO 4: VERIFICAR SE A FUNÇÃO update_roulette_history EXISTE
-- ============================================================================

SELECT routine_name, routine_type
FROM information_schema.routines 
WHERE routine_name = 'update_roulette_history';

-- ============================================================================
-- PRONTO! O banco está limpo e pronto para receber novos dados
-- ============================================================================
