-- ============================================================================
-- LIMPEZA: Evolution Gaming - Remover roletas NÃO permitidas
-- Este script remove do banco de dados:
-- 1. Roletas da Evolution Gaming NÃO permitidas (mantém apenas 6 específicas)
-- ============================================================================

-- ROLETAS MANTIDAS (Evolution Gaming):
-- ✅ Speed Roulette
-- ✅ Lightning Roulette  
-- ✅ XXXtreme Lightning Roulette
-- ✅ Lightning Spain
-- ✅ Auto-Roulette
-- ✅ Auto-Roulette VIP

-- ROLETAS REMOVIDAS (Evolution Gaming):
-- ❌ Immersive
-- ❌ Roulette Macao
-- ❌ Ao Vivo
-- ❌ Relâmpago

-- Backup: Contar registros antes da exclusão
SELECT 
  'ANTES DA EXCLUSÃO' AS status,
  COUNT(*) AS total_registros
FROM roulette_history
WHERE 
  -- Evolution Gaming (REMOVER - exceto as 6 permitidas)
  (roulette_id ILIKE '%evolution%' AND roulette_id ILIKE '%immersive%')
  OR (roulette_id ILIKE '%immersive%' AND roulette_id NOT ILIKE '%lightning%')
  OR roulette_id ILIKE '%roulette macao%'
  OR roulette_id ILIKE '%macao%'
  OR (roulette_id ILIKE '%ao vivo%' AND roulette_id NOT ILIKE '%lightning%' AND roulette_id NOT ILIKE '%speed%')
  OR (roulette_id ILIKE '%relampago%' AND roulette_id NOT ILIKE '%xxxtreme%');

-- Deletar roletas Evolution Gaming NÃO permitidas
DELETE FROM roulette_history
WHERE (roulette_id ILIKE '%evolution%' AND roulette_id ILIKE '%immersive%')
   OR (roulette_id ILIKE '%immersive%' AND roulette_id NOT ILIKE '%lightning%')
   OR roulette_id ILIKE '%roulette macao%'
   OR roulette_id ILIKE '%macao%'
   OR (roulette_id ILIKE '%ao vivo%' AND roulette_id NOT ILIKE '%lightning%' AND roulette_id NOT ILIKE '%speed%')
   OR (roulette_id ILIKE '%relampago%' AND roulette_id NOT ILIKE '%xxxtreme%');

-- Deletar metadados Evolution Gaming NÃO permitidas
DELETE FROM roulette_metadata
WHERE (roulette_id ILIKE '%evolution%' AND roulette_id ILIKE '%immersive%')
   OR (roulette_id ILIKE '%immersive%' AND roulette_id NOT ILIKE '%lightning%')
   OR roulette_id ILIKE '%roulette macao%'
   OR roulette_id ILIKE '%macao%'
   OR (roulette_id ILIKE '%ao vivo%' AND roulette_id NOT ILIKE '%lightning%' AND roulette_id NOT ILIKE '%speed%')
   OR (roulette_id ILIKE '%relampago%' AND roulette_id NOT ILIKE '%xxxtreme%');

-- Verificar resultado (deve retornar 0)
SELECT 
  'APÓS EXCLUSÃO - Evolution não permitidas' AS status,
  COUNT(*) AS total_registros
FROM roulette_history
WHERE 
  (roulette_id ILIKE '%evolution%' AND roulette_id ILIKE '%immersive%')
  OR (roulette_id ILIKE '%immersive%' AND roulette_id NOT ILIKE '%lightning%')
  OR roulette_id ILIKE '%roulette macao%'
  OR roulette_id ILIKE '%macao%'
  OR (roulette_id ILIKE '%ao vivo%' AND roulette_id NOT ILIKE '%lightning%' AND roulette_id NOT ILIKE '%speed%')
  OR (roulette_id ILIKE '%relampago%' AND roulette_id NOT ILIKE '%xxxtreme%');

-- Listar roletas restantes Evolution Gaming
SELECT DISTINCT roulette_id, COUNT(*) AS total_numbers
FROM roulette_history
WHERE roulette_id ILIKE '%evolution%'
   OR roulette_id ILIKE '%lightning%'
   OR roulette_id ILIKE '%speed%'
   OR roulette_id ILIKE '%auto%'
   OR roulette_id ILIKE '%vip%'
   OR roulette_id ILIKE '%spain%'
GROUP BY roulette_id
ORDER BY roulette_id;

-- Listar TODAS as roletas restantes no banco
SELECT DISTINCT roulette_id, COUNT(*) AS total_numbers
FROM roulette_history
GROUP BY roulette_id
ORDER BY roulette_id;

-- ============================================================================
-- RESULTADO ESPERADO: 
-- - 0 registros de Evolution não permitidas (Immersive, Macao, Ao Vivo, Relâmpago)
-- - Roletas restantes: 1 Playtech + 6 Evolution Gaming + 5 Pragmatic Play = 12 total
-- ============================================================================
