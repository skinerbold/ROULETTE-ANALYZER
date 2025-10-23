// Tipos para a API de Roleta WebSocket
export interface RouletteNumber {
  number: number
  color: 'red' | 'black' | 'green'
  timestamp: number
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
  url: 'ws://localhost:3000',
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
