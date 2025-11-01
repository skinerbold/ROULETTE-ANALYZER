// Tipos para a API de Roleta WebSocket
export interface RouletteNumber {
  number: number
  color: 'red' | 'black' | 'green'
  timestamp: number
}

export interface RouletteInfo {
  id: string
  name: string
  provider?: string // Provedor da roleta (ex: "Pragmatic Play", "Evolution", etc)
}

export interface RouletteMessage {
  type: 'spin' | 'result' | 'history' | 'error' | 'connected' | 'roulettes'
  data?: any
  number?: number
  timestamp?: number
  error?: string
}

export interface WebSocketConfig {
  url: string
  reconnectInterval: number
  maxReconnectAttempts: number
  heartbeatInterval: number
  maxHistorySize: number
}

export const WEBSOCKET_CONFIG: WebSocketConfig = {
  url: process.env.NEXT_PUBLIC_WEBSOCKET_URL || 'ws://localhost:3000',
  reconnectInterval: 5000, // 5 segundos
  maxReconnectAttempts: 10,
  heartbeatInterval: 30000, // 30 segundos
  maxHistorySize: 500, // Últimos 500 números
}

// Determinar cor do número da roleta
export function getRouletteColor(number: number): 'red' | 'black' | 'green' {
  if (number === 0 || number === 37) return 'green' // 0 e 00
  
  // Números vermelhos na roleta europeia
  const redNumbers = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]
  
  return redNumbers.includes(number) ? 'red' : 'black'
}

// Formatar número para exibição
export function formatRouletteNumber(number: number): string {
  if (number === 37) return '00'
  return number.toString()
}

// Extrair informações da roleta (nome e provedor)
export function parseRouletteName(rouletteName: string): RouletteInfo {
  // Formato esperado: "provedor_nome" ou apenas "nome"
  // Exemplos: 
  // - "pragmatic_roulette_1" → Pragmatic Play
  // - "evolution_speed_roulette" → Evolution
  // - "ezugi_auto_roulette" → Ezugi
  
  const providerMap: Record<string, string> = {
    'pragmatic': 'Pragmatic Play',
    'evolution': 'Evolution Gaming',
    'ezugi': 'Ezugi',
    'playtech': 'Playtech',
    'netent': 'NetEnt',
    'authentic': 'Authentic Gaming',
    'vivo': 'Vivo Gaming',
    'betgames': 'BetGames.TV',
    'tvbet': 'TVBet',
    'xpg': 'XPG',
  }
  
  const lowerName = rouletteName.toLowerCase()
  
  // Tentar encontrar o provedor no nome
  for (const [key, fullName] of Object.entries(providerMap)) {
    if (lowerName.includes(key)) {
      return {
        id: rouletteName,
        name: rouletteName,
        provider: fullName
      }
    }
  }
  
  // Se não encontrar provedor conhecido, retornar sem provedor
  return {
    id: rouletteName,
    name: rouletteName,
    provider: undefined
  }
}

// Formatar nome da roleta para exibição
export function formatRouletteName(rouletteName: string): string {
  const info = parseRouletteName(rouletteName)
  
  if (info.provider) {
    // Extrair apenas o nome sem o provedor
    const namePart = rouletteName
      .replace(/^(pragmatic|evolution|ezugi|playtech|netent|authentic|vivo|betgames|tvbet|xpg)_/i, '')
      .replace(/_/g, ' ')
      .replace(/\b\w/g, char => char.toUpperCase())
    
    return namePart
  }
  
  // Se não tem provedor, formatar o nome completo
  return rouletteName.replace(/_/g, ' ').replace(/\b\w/g, char => char.toUpperCase())
}
