// ========================================
// COMBINAÇÕES DE 5 NÚMEROS (0-36)
// Total: 435.897 estratégias (C(37,5) = 435.897)
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

// Gerar todas as combinações de 5 números
const generateQuintupletStrategies = (): StrategyFolder[] => {
  const folders: StrategyFolder[] = []
  let strategyId = 20000 // IDs começam em 20000 para não conflitar com pares (10000-10665)
  
  // Agrupar por primeiros dois números para organização
  // Exemplo: "0-1 com outros 3", "0-2 com outros 3", etc.
  for (let first = 0; first <= 36; first++) {
    const allStrategies: Strategy[] = []
    
    for (let second = first + 1; second <= 36; second++) {
      for (let third = second + 1; third <= 36; third++) {
        for (let fourth = third + 1; fourth <= 36; fourth++) {
          for (let fifth = fourth + 1; fifth <= 36; fifth++) {
            allStrategies.push({
              id: strategyId++,
              name: `${first} ${second} ${third} ${fourth} ${fifth}`,
              numbers: [first, second, third, fourth, fifth]
            })
          }
        }
      }
    }
    
    // Dividir em subpastas por segundo número para melhor organização
    // Criar uma estrutura de pastas/subpastas
    if (allStrategies.length > 0) {
      // Agrupar por segundo número
      const subfolders: Map<number, Strategy[]> = new Map()
      
      for (const strategy of allStrategies) {
        const secondNum = strategy.numbers[1]
        if (!subfolders.has(secondNum)) {
          subfolders.set(secondNum, [])
        }
        subfolders.get(secondNum)!.push(strategy)
      }
      
      // Criar pasta principal com todas as estratégias
      folders.push({
        name: `🎲 Quíntuplas com ${first}`,
        strategies: allStrategies
      })
    }
  }
  
  return folders
}

export const quintupletStrategies = generateQuintupletStrategies()

// Total de estratégias: 435.897
// Divididas em 37 pastas principais (uma para cada primeiro número 0-36)
// Cada pasta contém todas as combinações que começam com aquele número
// Exemplo pasta "Quíntuplas com 0": contém "0 1 2 3 4", "0 1 2 3 5", ..., "0 33 34 35 36"
