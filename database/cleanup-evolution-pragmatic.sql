-- ============================================================================
-- LIMPEZA: Evolution Gaming e Pragmatic Play
-- Este script remove do banco de dados:
-- 1. Roletas da Evolution Gaming NÃO permitidas (mantém apenas 6 específicas)
-- 2. TODAS as roletas do provedor Pragmatic Play
-- ============================================================================

-- ROLETAS MANTIDAS (Evolution Gaming):
-- ✅ Speed Roulette
-- ✅ Lightning Roulette  
-- ✅ XXXtreme Lightning Roulette
-- ✅ Lightning Spain
-- ✅ Auto-Roulette
-- ✅ Auto-Roulette VIP

-- Backup: Contar registros antes da exclusão
SELECT 
  'ANTES DA EXCLUSÃO' AS status,
  COUNT(*) AS total_registros
FROM roulette_history
WHERE 
  -- Pragmatic Play (TODAS)
  roulette_id ILIKE '%pragmatic%'
  OR roulette_id ILIKE '%mega roulette%'
  OR roulette_id ILIKE '%auto mega%'
  OR roulette_id ILIKE '%power up%'
  -- Evolution Gaming (REMOVER - exceto as 6 permitidas)
  OR (roulette_id ILIKE '%evolution%' AND roulette_id ILIKE '%immersive%')
  OR (roulette_id ILIKE '%immersive%' AND roulette_id NOT ILIKE '%lightning%')
  OR roulette_id ILIKE '%roulette macao%'
  OR roulette_id ILIKE '%macao%'
  OR (roulette_id ILIKE '%ao vivo%' AND roulette_id NOT ILIKE '%lightning%' AND roulette_id NOT ILIKE '%speed%')
  OR (roulette_id ILIKE '%relampago%' AND roulette_id NOT ILIKE '%xxxtreme%');

-- Deletar TODAS as roletas Pragmatic Play
DELETE FROM roulette_history
WHERE roulette_id ILIKE '%pragmatic%'
   OR roulette_id ILIKE '%mega roulette%'
   OR roulette_id ILIKE '%auto mega%'
   OR roulette_id ILIKE '%power up%';

-- Deletar roletas Evolution Gaming NÃO permitidas
DELETE FROM roulette_history
WHERE (roulette_id ILIKE '%evolution%' AND roulette_id ILIKE '%immersive%')
   OR (roulette_id ILIKE '%immersive%' AND roulette_id NOT ILIKE '%lightning%')
   OR roulette_id ILIKE '%roulette macao%'
   OR roulette_id ILIKE '%macao%'
   OR (roulette_id ILIKE '%ao vivo%' AND roulette_id NOT ILIKE '%lightning%' AND roulette_id NOT ILIKE '%speed%')
   OR (roulette_id ILIKE '%relampago%' AND roulette_id NOT ILIKE '%xxxtreme%');

-- Deletar metadados Pragmatic Play
DELETE FROM roulette_metadata
WHERE roulette_id ILIKE '%pragmatic%'
   OR roulette_id ILIKE '%mega roulette%'
   OR roulette_id ILIKE '%auto mega%'
   OR roulette_id ILIKE '%power up%';

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
  'APÓS EXCLUSÃO - Pragmatic e Evolution não permitidas' AS status,
  COUNT(*) AS total_registros
FROM roulette_history
WHERE 
  roulette_id ILIKE '%pragmatic%'
  OR roulette_id ILIKE '%mega roulette%'
  OR roulette_id ILIKE '%auto mega%'
  OR roulette_id ILIKE '%power up%'
  OR (roulette_id ILIKE '%evolution%' AND roulette_id ILIKE '%immersive%')
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
-- - 0 registros de Pragmatic Play
-- - 0 registros de Evolution não permitidas (Immersive, Macao, Ao Vivo, Relâmpago)
-- - Apenas 7 roletas restantes: 1 Playtech + 6 Evolution Gaming específicas
-- ============================================================================
