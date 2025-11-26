-- ============================================================================
-- QUERIES DE TESTE E VALIDAÇÃO
-- ============================================================================

-- 1. Testar inserção de um número
SELECT * FROM update_roulette_history('test-roulette', 17);

-- 2. Verificar se foi inserido na posição 1
SELECT * FROM roulette_history WHERE roulette_id = 'test-roulette' ORDER BY position;

-- 3. Inserir mais alguns números
SELECT * FROM update_roulette_history('test-roulette', 23);
SELECT * FROM update_roulette_history('test-roulette', 5);
SELECT * FROM update_roulette_history('test-roulette', 12);

-- 4. Verificar ordem (deve estar: 12, 5, 23, 17)
SELECT position, number, timestamp 
FROM roulette_history 
WHERE roulette_id = 'test-roulette' 
ORDER BY position ASC;

-- 5. Verificar metadata
SELECT * FROM roulette_metadata WHERE roulette_id = 'test-roulette';

-- 6. Testar query de histórico (como será usado pela API)
SELECT number 
FROM roulette_history 
WHERE roulette_id = 'test-roulette' 
ORDER BY position ASC 
LIMIT 50;

-- 7. Limpar dados de teste
DELETE FROM roulette_history WHERE roulette_id = 'test-roulette';
DELETE FROM roulette_metadata WHERE roulette_id = 'test-roulette';

-- ============================================================================
-- QUERY PARA POPULAR HISTÓRICO INICIAL (SE NECESSÁRIO)
-- ============================================================================

-- Caso precise inicializar com números aleatórios para teste
INSERT INTO roulette_history (roulette_id, number, position, timestamp)
SELECT 
  'test-roulette',
  (random() * 36)::INTEGER,
  generate_series(1, 100),
  NOW() - (generate_series(1, 100) || ' minutes')::INTERVAL;

-- ============================================================================
-- QUERIES DE MONITORAMENTO
-- ============================================================================

-- Total de registros por roleta
SELECT roulette_id, COUNT(*) as count
FROM roulette_history
GROUP BY roulette_id
ORDER BY count DESC;

-- Últimas atualizações
SELECT roulette_id, last_number, last_update, total_spins, history_count
FROM roulette_metadata
ORDER BY last_update DESC;

-- Verificar performance de índices
EXPLAIN ANALYZE
SELECT number 
FROM roulette_history 
WHERE roulette_id = 'pragmatic-speed-auto-roulette' 
ORDER BY position ASC 
LIMIT 500;
