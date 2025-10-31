// ========================================
// TIPOS DO SISTEMA DE ESTRATÉGIAS
// ========================================

export interface StrategyStats {
  id: number
  name: string
  totalGreen: number
  totalRed: number
  maxGreenSequence: number
  maxRedSequence: number
  firstAttemptHits: number
  secondAttemptHits: number
  thirdAttemptHits: number
  mostActivatingNumber: number
  mostActivatingCount: number
  activations: number
  profit: number
  // Novas métricas de padrão de entrada
  maxConsecutiveGreens: number // Maior sequência de GREEN seguidos
  maxConsecutiveReds: number   // Maior sequência de RED seguidos
  bestEntryPattern: 'post-green' | 'post-red' | 'neutral' // Melhor entrada: após GREEN ou RED
  postGreenWins: number        // Vitórias após GREEN
  postRedWins: number          // Vitórias após RED
}

export interface NumberStatus {
  number: number
  status: 'GREEN' | 'RED' | 'ACTIVATION' | 'NEUTRAL'
}

// Nova interface para seleção de estratégias
export interface StrategySelection {
  folderName: string
  strategyIds: number[] | 'all' // 'all' para todas da pasta
}

export interface UserSession {
  id?: string
  user_id: string
  numbers: number[]
  chip_category?: 'up-to-9' | 'more-than-9' | 'all' // Atualizado para incluir 'all'
  selected_strategy?: number // Mantido para compatibilidade (backward)
  selected_strategies?: number[] // NOVO: Array de IDs de estratégias selecionadas
  created_at?: string
  updated_at?: string
}