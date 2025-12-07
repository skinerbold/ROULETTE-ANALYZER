-- ============================================================================
-- LIMPEZA DE ROLETAS NÃO PERMITIDAS
-- Remove todos os números de roletas que não estão na lista de permitidas
-- Data: 7 de dezembro de 2025
-- ============================================================================

-- Ver quantos números existem por roleta ANTES da limpeza
SELECT 
  roulette_id,
  COUNT(*) as total_numeros,
  to_char(to_timestamp(MIN(timestamp)/1000.0), 'YYYY-MM-DD HH24:MI') as primeiro_numero,
  to_char(to_timestamp(MAX(timestamp)/1000.0), 'YYYY-MM-DD HH24:MI') as ultimo_numero
FROM roulette_history
GROUP BY roulette_id
ORDER BY total_numeros DESC;

-- ============================================================================
-- DELETAR números de roletas NÃO permitidas
-- 
-- Roletas PERMITIDAS (mantidas):
-- - Playtech: mega fire blaze, roleta brasileira
-- - Evolution: lightning, xxxtreme, immersive, auto-roulette, vip, speed, macao, ao vivo, relampago
-- - Pragmatic: mega roulette, auto mega, roleta brasileira pragmatic, power up
-- - Ezugi: ruby, rapida, azure
-- ============================================================================

-- DELETAR roletas que NÃO contêm nenhuma das palavras-chave permitidas
DELETE FROM roulette_history
WHERE roulette_id NOT IN (
  SELECT DISTINCT roulette_id 
  FROM roulette_history
  WHERE 
    -- Playtech
    LOWER(roulette_id) LIKE '%mega fire blaze%' OR
    LOWER(roulette_id) LIKE '%roleta brasileira%' AND LOWER(roulette_id) NOT LIKE '%pragmatic%' OR
    
    -- Evolution Gaming
    LOWER(roulette_id) LIKE '%lightning%' OR
    LOWER(roulette_id) LIKE '%xxxtreme%' OR
    LOWER(roulette_id) LIKE '%immersive%' OR
    LOWER(roulette_id) LIKE '%auto-roulette%' OR
    LOWER(roulette_id) LIKE '%vip roulette%' OR
    LOWER(roulette_id) LIKE '%speed%' OR
    LOWER(roulette_id) LIKE '%macao%' OR
    LOWER(roulette_id) LIKE '%ao vivo%' OR
    LOWER(roulette_id) LIKE '%relampago%' OR
    LOWER(roulette_id) LIKE '%relâmpago%' OR
    
    -- Pragmatic Play
    LOWER(roulette_id) LIKE '%mega roulette%' OR
    LOWER(roulette_id) LIKE '%auto mega%' OR
    LOWER(roulette_id) LIKE '%roleta brasileira pragmatic%' OR
    LOWER(roulette_id) LIKE '%pragmatic%' AND LOWER(roulette_id) LIKE '%roleta%' OR
    LOWER(roulette_id) LIKE '%power up%' OR
    
    -- Ezugi
    LOWER(roulette_id) LIKE '%ruby%' OR
    LOWER(roulette_id) LIKE '%rapida%' OR
    LOWER(roulette_id) LIKE '%rápida%' OR
    LOWER(roulette_id) LIKE '%azure%'
);

-- Limpar também a tabela de metadata
DELETE FROM roulette_metadata
WHERE roulette_id NOT IN (
  SELECT DISTINCT roulette_id 
  FROM roulette_history
);

-- Ver resultado APÓS a limpeza
SELECT 
  roulette_id,
  COUNT(*) as total_numeros,
  to_char(to_timestamp(MIN(timestamp)/1000.0), 'YYYY-MM-DD HH24:MI') as primeiro_numero,
  to_char(to_timestamp(MAX(timestamp)/1000.0), 'YYYY-MM-DD HH24:MI') as ultimo_numero
FROM roulette_history
GROUP BY roulette_id
ORDER BY total_numeros DESC;

-- Ver espaço recuperado
SELECT 
  COUNT(*) as total_registros_restantes,
  pg_size_pretty(pg_total_relation_size('roulette_history')) as tamanho_tabela
FROM roulette_history;

-- ============================================================================
-- EXECUTADO COM SUCESSO!
-- ============================================================================
