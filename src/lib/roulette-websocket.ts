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

// Provedores permitidos (filtro)
const ALLOWED_PROVIDERS = ['Evolution Gaming', 'Playtech', 'Pragmatic Play']

// 🎯 LISTA DE ROLETAS PERMITIDAS (baseada em dados REAIS da API)
const ALLOWED_ROULETTES: Record<string, string[]> = {
  'Playtech': [
    'mega fire blaze roulette live', // ✅ Existe como "mega fire blaze roulette live"
    'grand roulette', // ✅ Existe como "grand roulette"
    'roleta brasileira' // ✅ Existe como "roleta brasileira" (ambígua Playtech/Pragmatic)
  ],
  'Evolution Gaming': [
    'lightning roulette', // ✅ Existe como "lightning roulette"
    'xxxtreme lightning roulette', // ✅ Existe como "xxxtreme lightning roulette"
    'immersive roulette', // ✅ Existe como "immersive roulette" (SEM deluxe)
    'auto-roulette vip', // ✅ Existe como "auto-roulette vip" (COM hífen)
    'speed auto roulette' // ✅ Existe como "speed auto roulette"
  ],
  'Pragmatic Play': [
    'mega roulette', // ✅ Existe como "mega roulette"
    'auto mega roulette', // ✅ Existe como "auto mega roulette"
    'roleta brasileira pragmatic', // ✅ Existe como "roleta brasileira pragmatic"
    'pragmatic-speed-auto-roulette', // ✅ Existe como "pragmatic-speed-auto-roulette"
    'auto-roulette' // ✅ Existe como "auto-roulette" (COM hífen)
  ]
}

// 🚫 LISTA DE ROLETAS EXPLICITAMENTE BLOQUEADAS
const BLOCKED_ROULETTES = [
  'immersive deluxe', // ❌ Immersive Deluxe
  'immersive roulette deluxe', // ❌ Immersive Roulette Deluxe
  'quantum', // ❌ Quantum (todas variações)
  'bet365', // ❌ Bet365 (todas variações)
  'brasileira bet365', // ❌ Brasileira Bet365
  'roleta brasileira bet365' // ❌ Roleta Brasileira Bet365
]

// Verificar se a roleta específica está na lista permitida
export function isAllowedRoulette(rouletteName: string, provider?: string): boolean {
  if (!provider || !ALLOWED_PROVIDERS.includes(provider)) {
    return false
  }
  
  const lowerName = rouletteName.toLowerCase()
  
  // 🚫 PRIMEIRO: Verificar se está na lista de bloqueadas
  if (BLOCKED_ROULETTES.some(blocked => lowerName.includes(blocked))) {
    return false
  }
  
  const allowedNames = ALLOWED_ROULETTES[provider] || []
  
  // Verificar se alguma das palavras-chave permitidas está no nome
  return allowedNames.some(keyword => lowerName.includes(keyword))
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
    
    // Playtech - DEVE VIR ANTES para não conflitar
    'mega fire blaze roulette live': 'Playtech', // Mega Fire Blaze Roulette Live (exato)
    'mega fire blaze': 'Playtech', // Mega Fire Blaze (genérico)
    'grand roulette': 'Playtech',
    'age of the gods': 'Playtech',
    
    // Evolution Gaming
    'lightning': 'Evolution Gaming', // Lightning Roulette, XXXtreme Lightning, etc
    'speed auto': 'Evolution Gaming', // Speed Auto Roulette
    'auto roulette': 'Evolution Gaming', // Auto Roulette (sem hífen)
    'relampago': 'Evolution Gaming', // Roleta Relampago
    'bac bo': 'Evolution Gaming',
    'en vivo': 'Evolution Gaming', // Ruleta en Vivo
    'immersive': 'Evolution Gaming', // Immersive Roulette
    'quantum': 'Evolution Gaming', // Quantum Roulette, Quantum Auto Roulette
    'american roulette': 'Evolution Gaming', // American Roulette
    'red door': 'Evolution Gaming', // Red Door Roulette
    'porta vermelha': 'Evolution Gaming', // Porta Vermelha
    
    // Pragmatic Play - DEVE VIR ANTES para pegar brasileira
    'roleta brasileira': 'Pragmatic Play', // Roleta Brasileira (exato)
    'mega roulette': 'Pragmatic Play', // Mega Roulette (Pragmatic, não Evolution!)
    'auto mega roulette': 'Pragmatic Play',
    'brasileira': 'Pragmatic Play', // Roleta Brasileira (keyword)
    'auto-roulette': 'Pragmatic Play', // Auto-Roulette
    
    // Ezugi
    'greek roulette': 'Ezugi',
    'turkish roulette': 'Ezugi',
    'ruby roulette': 'Ezugi',
    'rapida': 'Ezugi', // Roleta Rapida
    
    // Playtech (continuação)
    'latinoamérica': 'Playtech', // Ruleta Latinoamérica
    'bet365 roulette': 'Playtech', // bet365 Roulette
    'bet365 dutch': 'Playtech', // bet365 Dutch Roulette
    'spread bet': 'Playtech', // Spread Bet Roulette
    
    // Gaming Corps
    'slingshot': 'Gaming Corps', // Slingshot, Prime Slingshot
    
    // Outros identificados
    'vip roulette': 'Evolution Gaming', // VIP Roulette
    'prestige': 'Evolution Gaming', // Prestige Roulette
    'super spin': 'NetEnt', // Super Spin Roulette
    'speed roulette': 'Evolution Gaming', // Speed Roulette
    'power up': 'Pragmatic Play', // Power Up Roulette
    'roulette macao': 'Evolution Gaming', // Roulette Macao
    'arabic': 'Evolution Gaming', // Arabic Roulette
    'ao vivo': 'Evolution Gaming', // Roleta ao Vivo
    'super roulette': 'Evolution Gaming', // Super Roulette
    'football roulette': 'Evolution Gaming', // Football Roulette
    'football french': 'Evolution Gaming', // Football French Roulette
    'azure': 'Ezugi', // Roleta Azure
    'italiana': 'Evolution Gaming', // Roulette Italiana
    'bucharest': 'Evolution Gaming', // Bucharest Roulette
    'espanol': 'Evolution Gaming', // Ruleta en Espanol
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
