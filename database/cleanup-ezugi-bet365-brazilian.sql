-- ============================================================================
-- LIMPEZA: Remover roletas Ezugi e Roleta Brasileira Bet365
-- Este script remove do banco de dados:
-- 1. Todas as roletas do provedor Ezugi (Ruby, Rápida, Azure)
-- 2. Roleta Brasileira da Bet365 (Playtech)
-- ============================================================================

-- Backup: Contar registros antes da exclusão
SELECT 
  'ANTES DA EXCLUSÃO' AS status,
  COUNT(*) AS total_registros
FROM roulette_history
WHERE roulette_id ILIKE '%ezugi%'
   OR roulette_id ILIKE '%ruby%'
   OR roulette_id ILIKE '%rapida%'
   OR roulette_id ILIKE '%azure%'
   OR (roulette_id ILIKE '%brasileira%' AND roulette_id ILIKE '%bet365%')
   OR (roulette_id ILIKE '%brasileira%' AND roulette_id ILIKE '%playtech%');

-- Deletar histórico das roletas Ezugi
DELETE FROM roulette_history
WHERE roulette_id ILIKE '%ezugi%'
   OR roulette_id ILIKE '%ruby%'
   OR roulette_id ILIKE '%rapida%'
   OR roulette_id ILIKE '%azure%';

-- Deletar histórico da Roleta Brasileira Bet365/Playtech
DELETE FROM roulette_history
WHERE (roulette_id ILIKE '%brasileira%' AND roulette_id ILIKE '%bet365%')
   OR (roulette_id ILIKE '%brasileira%' AND roulette_id ILIKE '%playtech%');

-- Deletar metadados das roletas Ezugi
DELETE FROM roulette_metadata
WHERE roulette_id ILIKE '%ezugi%'
   OR roulette_id ILIKE '%ruby%'
   OR roulette_id ILIKE '%rapida%'
   OR roulette_id ILIKE '%azure%';

-- Deletar metadados da Roleta Brasileira Bet365/Playtech
DELETE FROM roulette_metadata
WHERE (roulette_id ILIKE '%brasileira%' AND roulette_id ILIKE '%bet365%')
   OR (roulette_id ILIKE '%brasileira%' AND roulette_id ILIKE '%playtech%');

-- Verificar resultado
SELECT 
  'APÓS EXCLUSÃO' AS status,
  COUNT(*) AS total_registros
FROM roulette_history
WHERE roulette_id ILIKE '%ezugi%'
   OR roulette_id ILIKE '%ruby%'
   OR roulette_id ILIKE '%rapida%'
   OR roulette_id ILIKE '%azure%'
   OR (roulette_id ILIKE '%brasileira%' AND roulette_id ILIKE '%bet365%')
   OR (roulette_id ILIKE '%brasileira%' AND roulette_id ILIKE '%playtech%');

-- Listar roletas restantes
SELECT DISTINCT roulette_id, COUNT(*) AS total_numbers
FROM roulette_history
GROUP BY roulette_id
ORDER BY roulette_id;

-- ============================================================================
-- RESULTADO ESPERADO: 0 registros para Ezugi e Roleta Brasileira Bet365
-- ============================================================================
