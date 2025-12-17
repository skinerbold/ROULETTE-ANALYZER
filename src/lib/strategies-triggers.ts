// ========================================
// ESTRATÉGIAS DE GATILHO (0-36)
// Total: 2.220 estratégias
// Formato: [X, Y, Z] onde X-Y são ativadores (ordem obrigatória) e Z é o número de GREEN
// ========================================

export interface TriggerStrategy {
  id: number
  name: string
  triggerNumbers: [number, number] // [primeiro ativador, segundo ativador] - ordem obrigatória
  greenNumber: number // número que dá GREEN após ativação
}

export interface TriggerStrategyFolder {
  name: string
  strategies: TriggerStrategy[]
}

// Gerar todas as estratégias de gatilho
const generateTriggerStrategies = (): TriggerStrategyFolder[] => {
  const folders: TriggerStrategyFolder[] = []
  let strategyId = 500000 // IDs começam em 500000 para não conflitar
  
  // Agrupar por par de gatilhos (0,1), (0,2), ..., (34,35)
  for (let first = 0; first <= 34; first++) {
    for (let second = first + 1; second <= 35; second++) {
      const strategies: TriggerStrategy[] = []
      
      // Para cada par de gatilhos, gerar todos os números de GREEN possíveis
      for (let green = second + 1; green <= 36; green++) {
        strategies.push({
          id: strategyId++,
          name: `Gatilho ${first}-${second} → ${green}`,
          triggerNumbers: [first, second],
          greenNumber: green
        })
      }
      
      if (strategies.length > 0) {
        folders.push({
          name: `🎯 Gatilho ${first}-${second}`,
          strategies
        })
      }
    }
  }
  
  return folders
}

export const triggerStrategies = generateTriggerStrategies()

// Total de estratégias: 2.220
// Divididas em 630 pastas (uma para cada par de gatilhos)
// Cada pasta contém estratégias com o mesmo par de ativadores
// Exemplo pasta "Gatilho 0-1": contém "0-1 → 2", "0-1 → 3", ..., "0-1 → 36"
// 
// LÓGICA DE ATIVAÇÃO:
// - Números devem cair NA ORDEM: primeiro ativador → segundo ativador → número GREEN
// - Se cair fora de ordem, reseta a estratégia
// - Após GREEN, reseta e aguarda nova ativação
