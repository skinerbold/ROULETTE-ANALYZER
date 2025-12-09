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
  maxHistorySize: 500, // Últimos 500 números no frontend (banco tem armazenamento ilimitado)
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

// Provedores permitidos (filtro)
const ALLOWED_PROVIDERS = [
  'Evolution Gaming', 
  'Playtech', 
  'Pragmatic Play'
]

// 🎯 LISTA DE ROLETAS PERMITIDAS (baseada em dados REAIS da API)
const ALLOWED_ROULETTES: Record<string, string[]> = {
  'Playtech': [
    'mega fire blaze roulette live'
  ],
  'Evolution Gaming': [
    'speed',
    'lightning',
    'xxxtreme',
    'spain',
    'auto-roulette',
    'vip'
  ],
  'Pragmatic Play': [
    'mega roulette',
    'auto mega',
    'roleta brasileira pragmatic',
    'pragmatic',
    'power up',
    'speed'
  ]
}

// 🚫 LISTA DE ROLETAS EXPLICITAMENTE BLOQUEADAS
const BLOCKED_ROULETTES = [
  // Variações indesejadas
  'immersive deluxe',
  'immersive roulette deluxe',
  
  // Roletas removidas por solicitação
  'american roulette',
  'arabic roulette',
  'auto roulette', // ❌ "auto roulette" (com espaço) bloqueada, "auto-roulette" (com hífen) permitida
  'bet 365 dutch roulette',
  'bet365 dutch roulette',
  'bet365 roulette',
  'bucharest roulette',
  'football french roulette',
  'football roulette',
  'grand roulette',
  'greek quantum roulette',
  'greek roulette',
  'premier roulette',
  'prestige roulette',
  'prime slingshot',
  'quantum auto roulette',
  'quantum roulette live',
  'roulette italiana',
  'ruleta en espanol',
  'ruleta en vivo',
  'ruleta latinoamerica bet 365',
  'ruleta latinoamerica bet365',
  'spread bet roulette',
  'super roulette',
  'super spin roulette',
  'turkish roulette',
  'slingshot auto'
]

// Função para verificar se nome NÃO é "auto roulette" puro
// Importante: "auto-roulette" e "auto roulette" devem ser permitidas
// Mas "auto roulette la partage" ou outras variações com prefixo devem passar pelo filtro normal
function isBlockedAutoRoulette(name: string): boolean {
  const lowerName = name.toLowerCase().trim()
  
  // Lista de "auto roulette" permitidas (exatas ou com sufixo de número/vip)
  const allowedAutoPatterns = [
    /^auto[- ]?roulette$/i,           // auto roulette, auto-roulette
    /^auto[- ]?roulette \d+$/i,       // auto roulette 1, auto-roulette 2
    /^auto[- ]?roulette vip$/i,       // auto roulette vip
    /^speed auto[- ]?roulette$/i,     // speed auto roulette
  ]
  
  // Se é uma das permitidas, não bloquear
  if (allowedAutoPatterns.some(pattern => pattern.test(lowerName))) {
    return false
  }
  
  return false // Por padrão não bloqueia
}

// Verificar se a roleta específica está na lista permitida
// 🔒 MODO RESTRITO: Apenas roletas explicitamente na lista ALLOWED_ROULETTES
export function isAllowedRoulette(rouletteName: string, provider?: string): boolean {
  const lowerName = rouletteName.toLowerCase().trim()
  
  // 🚫 PRIMEIRO: Verificar se está na lista de bloqueadas
  if (BLOCKED_ROULETTES.some(blocked => lowerName.includes(blocked))) {
    return false
  }
  
  // 🚫 SEGUNDO: Verificar se é "auto roulette" bloqueada
  if (isBlockedAutoRoulette(lowerName)) {
    return false
  }
  
  // ✅ TERCEIRO: Verificar se está na lista de permitidas do provedor
  if (provider && ALLOWED_ROULETTES[provider]) {
    const allowedForProvider = ALLOWED_ROULETTES[provider]
    // Verificar se o nome da roleta contém alguma das palavras-chave permitidas
    return allowedForProvider.some(keyword => lowerName.includes(keyword.toLowerCase()))
  }
  
  // 🆕 ESPECIAL: Roletas sem provedor identificado mas na lista permitida
  if (!provider || provider === '') {
    // Buscar em todos os provedores
    for (const providerRoulettes of Object.values(ALLOWED_ROULETTES)) {
      if (providerRoulettes.some(keyword => lowerName.includes(keyword.toLowerCase()))) {
        return true
      }
    }
    return false
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
    
    // Playtech - Específicos
    'mega fire blaze roulette live': 'Playtech',
    'mega fire blaze': 'Playtech',
    'age of the gods': 'Playtech',
    
    // Evolution Gaming - Específicos
    'lightning': 'Evolution Gaming',
    'speed auto': 'Evolution Gaming',
    'auto-roulette': 'Evolution Gaming', // ✅ com hífen permitida
    'auto-roulette vip': 'Evolution Gaming',
    'relampago': 'Evolution Gaming',
    'bac bo': 'Evolution Gaming',
    'immersive': 'Evolution Gaming',
    'xxxtreme': 'Evolution Gaming',
    'red door': 'Evolution Gaming',
    'porta vermelha': 'Evolution Gaming',
    'vip roulette': 'Evolution Gaming',
    'speed roulette': 'Evolution Gaming',
    'roulette macao': 'Evolution Gaming',
    'macao': 'Evolution Gaming',
    'ao vivo': 'Evolution Gaming',
    
    // Pragmatic Play - Específicos
    'roleta brasileira pragmatic': 'Pragmatic Play',
    'roleta brasileira': 'Pragmatic Play',
    'mega roulette': 'Pragmatic Play',
    'auto mega': 'Pragmatic Play',
    'power up': 'Pragmatic Play',
    
    // Ezugi - Específicos
    'ruby': 'Ezugi',
    'rapida': 'Ezugi',
    'azure': 'Ezugi',
    
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
