// ========================================
// COMBINAÇÕES DE 2 NÚMEROS (0-36)
// Total: 666 estratégias (C(37,2) = 37*36/2 = 666)
// Todas as combinações possíveis sem repetição
// ========================================

export interface Strategy {
  id: number
  name: string
  numbers: number[]
}

export interface StrategyFolder {
  name: string
  strategies: Strategy[]
}

// Gerar todas as combinações de 2 números
const generatePairStrategies = (): StrategyFolder[] => {
  const folders: StrategyFolder[] = []
  let strategyId = 10000 // IDs começam em 10000 para não conflitar
  
  // Agrupar por primeiro número (0-36)
  for (let first = 0; first <= 36; first++) {
    const strategies: Strategy[] = []
    
    for (let second = first + 1; second <= 36; second++) {
      strategies.push({
        id: strategyId++,
        name: `${first} combinado com ${second}`,
        numbers: [first, second]
      })
    }
    
    if (strategies.length > 0) {
      folders.push({
        name: `🎲 Pares com ${first}`,
        strategies
      })
    }
  }
  
  return folders
}

export const pairStrategies = generatePairStrategies()

// Total de estratégias: 666
// Divididas em 37 pastas (uma para cada número base 0-36)
// Pasta "Pares com 0": 36 estratégias (0-1, 0-2, ..., 0-36)
// Pasta "Pares com 1": 35 estratégias (1-2, 1-3, ..., 1-36)
// ...
// Pasta "Pares com 35": 1 estratégia (35-36)
