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
  // Usar Railway em produção, localhost em desenvolvimento
  url: process.env.NEXT_PUBLIC_WEBSOCKET_URL || 'wss://roulette-websocket-server-production.up.railway.app',
  reconnectInterval: 5000, // 5 segundos
  maxReconnectAttempts: 10,
  heartbeatInterval: 30000, // 30 segundos
  maxHistorySize: 500, // Últimos 500 números
}

// LOG CRÍTICO: Mostrar configuração carregada
console.log('🔧 WEBSOCKET_CONFIG carregado:')
console.log('   URL:', WEBSOCKET_CONFIG.url)

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

// Provedores permitidos (filtro) - TODOS os provedores conhecidos
const ALLOWED_PROVIDERS = [
  'Evolution Gaming', 
  'Playtech', 
  'Pragmatic Play',
  'Ezugi',
  'NetEnt',
  'Gaming Corps'
]

// 🎯 LISTA DE ROLETAS PERMITIDAS (baseada em dados REAIS da API)
// 🔓 MODO ABERTO: Aceitar TODAS as roletas com provedores conhecidos
const ALLOWED_ROULETTES: Record<string, string[]> = {
  'Playtech': [
    'mega fire blaze roulette live',
    'roleta brasileira',
    'bet365', // bet365 roulettes
    'dutch',
    'spread bet',
    'latinoamérica'
  ],
  'Evolution Gaming': [
    'lightning',
    'xxxtreme',
    'immersive',
    'auto-roulette',
    'auto roulette',
    'vip roulette',
    'speed',
    'quantum',
    'american',
    'roulette macao',
    'arabic',
    'ao vivo',
    'super roulette',
    'football',
    'italiana',
    'bucharest',
    'espanol',
    'en vivo',
    'relampago',
    'premier',
    'prestige',
    'grand roulette',
    'greek'
  ],
  'Pragmatic Play': [
    'mega roulette',
    'auto mega',
    'roleta brasileira pragmatic',
    'pragmatic',
    'power up'
  ],
  'Ezugi': [
    'greek',
    'turkish',
    'ruby',
    'rapida',
    'azure'
  ],
  'NetEnt': [
    'super spin'
  ],
  'Gaming Corps': [
    'slingshot'
  ]
}

// 🚫 LISTA DE ROLETAS EXPLICITAMENTE BLOQUEADAS (apenas variações indesejadas)
const BLOCKED_ROULETTES = [
  'immersive deluxe', // ❌ Immersive Deluxe
  'immersive roulette deluxe' // ❌ Immersive Roulette Deluxe
]

// Verificar se a roleta específica está na lista permitida
// 🔓 MODO ABERTO: Se tem provedor conhecido, aceitar TODAS
export function isAllowedRoulette(rouletteName: string, provider?: string): boolean {
  const lowerName = rouletteName.toLowerCase()
  
  // 🚫 PRIMEIRO: Verificar se está na lista de bloqueadas
  if (BLOCKED_ROULETTES.some(blocked => lowerName.includes(blocked))) {
    return false
  }
  
  // 🆕 MODO ABERTO: Se tem um provedor conhecido, ACEITAR
  // Isso permite todas as roletas que conseguimos identificar o provedor
  if (provider && ALLOWED_PROVIDERS.includes(provider)) {
    return true
  }
  
  // 🆕 ESPECIAL: Roletas sem provedor identificado mas que sabemos que são válidas
  const knownValidRoulettes = [
    'auto roulette',
    'roulette',
    'speed roulette',
    'vip roulette'
  ]
  
  if (!provider || provider === '') {
    // Se não tem provedor, verificar se é uma das roletas conhecidas
    if (knownValidRoulettes.some(keyword => lowerName.includes(keyword))) {
      return true
    }
    return false // Outras sem provedor não são permitidas
  }
  
  return false
}

// Verificar se o provedor está na lista permitida
export function isAllowedProvider(provider?: string): boolean {
  if (!provider) return false
  return ALLOWED_PROVIDERS.includes(provider)
}

// Extrair informações da roleta (nome e provedor)
export function parseRouletteName(rouletteName: string): RouletteInfo {
  // Formato esperado: "provedor_nome" ou apenas "nome"
  // Exemplos: 
  // - "pragmatic_roulette_1" → Pragmatic Play
  // - "evolution_speed_roulette" → Evolution
  // - "ezugi_auto_roulette" → Ezugi
  
  const providerMap: Record<string, string> = {
    // Prefixos conhecidos
    'pragmatic': 'Pragmatic Play',
    'evolution': 'Evolution Gaming',
    'ezugi': 'Ezugi',
    'playtech': 'Playtech',
    'netent': 'NetEnt',
    'authentic': 'Authentic Gaming',
    'vivo gaming': 'Vivo Gaming',
    'betgames': 'BetGames.TV',
    'tvbet': 'TVBet',
    'xpg': 'XPG',
    
    // Playtech - Específicos
    'mega fire blaze roulette live': 'Playtech',
    'mega fire blaze': 'Playtech',
    'age of the gods': 'Playtech',
    'latinoamérica': 'Playtech',
    'bet365': 'Playtech', // bet365 roulettes
    'spread bet': 'Playtech',
    
    // Evolution Gaming - Específicos
    'lightning': 'Evolution Gaming',
    'speed auto': 'Evolution Gaming',
    'auto roulette': 'Evolution Gaming',
    'auto-roulette vip': 'Evolution Gaming',
    'relampago': 'Evolution Gaming',
    'bac bo': 'Evolution Gaming',
    'en vivo': 'Evolution Gaming',
    'immersive': 'Evolution Gaming',
    'quantum': 'Evolution Gaming',
    'american roulette': 'Evolution Gaming',
    'american': 'Evolution Gaming',
    'red door': 'Evolution Gaming',
    'porta vermelha': 'Evolution Gaming',
    'vip roulette': 'Evolution Gaming',
    'prestige': 'Evolution Gaming',
    'speed roulette': 'Evolution Gaming',
    'roulette macao': 'Evolution Gaming',
    'macao': 'Evolution Gaming',
    'arabic': 'Evolution Gaming',
    'ao vivo': 'Evolution Gaming',
    'super roulette': 'Evolution Gaming',
    'football': 'Evolution Gaming',
    'italiana': 'Evolution Gaming',
    'bucharest': 'Evolution Gaming',
    'espanol': 'Evolution Gaming',
    'premier': 'Evolution Gaming',
    'grand roulette': 'Evolution Gaming',
    'greek quantum': 'Evolution Gaming',
    
    // Pragmatic Play - Específicos
    'roleta brasileira pragmatic': 'Pragmatic Play',
    'roleta brasileira': 'Pragmatic Play',
    'mega roulette': 'Pragmatic Play',
    'auto mega': 'Pragmatic Play',
    'power up': 'Pragmatic Play',
    
    // Ezugi - Específicos
    'greek roulette': 'Ezugi',
    'greek': 'Ezugi', // Greek Roulette
    'turkish': 'Ezugi',
    'ruby': 'Ezugi',
    'rapida': 'Ezugi',
    'azure': 'Ezugi',
    
    // NetEnt
    'super spin': 'NetEnt',
    
    // Gaming Corps
    'slingshot': 'Gaming Corps',
    
    // 🆕 FALLBACK: Roletas comuns sem identificação clara → Evolution (maioria)
    'roulette': 'Evolution Gaming' // Fallback genérico
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
