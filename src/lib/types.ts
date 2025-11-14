// ========================================
// TIPOS DO SISTEMA DE ESTRAT�GIAS
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
  // Novas m�tricas de padr�o de entrada
  maxConsecutiveGreens: number // Maior sequ�ncia de GREEN seguidos
  maxConsecutiveReds: number   // Maior sequ�ncia de RED seguidos
  bestEntryPattern: 'post-green' | 'post-red' | 'neutral' // Melhor entrada: ap�s GREEN ou RED
  postGreenWins: number        // Vit�rias ap�s GREEN
  postRedWins: number          // Vit�rias ap�s RED
}

export interface NumberStatus {
  number: number
  status: 'GREEN' | 'RED' | 'ACTIVATION' | 'NEUTRAL'
}

// Nova interface para sele��o de estrat�gias
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
  green_red_attempts?: number // NOVO: Quantidade de casas para analisar GREEN/RED (3, 4, 5 ou 6)
  created_at?: string
  updated_at?: string
}

// ========================================
// TIPOS PARA AN�LISE DE ESTRAT�GIAS
// ========================================

export interface Strategy {
  id: number
  name: string
  numbers: number[]
  protectionNumbers?: number[]
}

export interface Activation {
  position: number
  activatingNumber: number
  result: 'GREEN' | 'RED'
  attempts: number
  winningNumber?: number
}

export interface NumberResult {
  number: number
  position: number
  status: 'GREEN' | 'RED' | 'ACTIVATION' | 'NEUTRAL'
  strategyId?: number
}

export interface AnalysisResult {
  totalGreen: number
  totalRed: number
  maxGreenSequence: number
  maxRedSequence: number
  firstAttemptHits: number
  secondAttemptHits: number
  thirdAttemptHits: number
  mostActivatingNumber: number
  mostActivatingCount: number
  profit: number
  activations: Activation[]
}
