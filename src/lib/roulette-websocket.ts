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

// 🎯 LISTA DE ROLETAS PERMITIDAS (ESPECÍFICAS)
const ALLOWED_ROULETTES: Record<string, string[]> = {
  'Playtech': [
    'mega fire blaze', // Mega Fire Blaze
    'mega fire blaze espanha', // Mega Fire Blaze Espanha
    'roleta brasileira' // Roleta Brasileira Playtech
  ],
  'Evolution Gaming': [
    'lightning roulette', // Lightning Roulette
    'xxxtreme lightning roulette', // XXXtreme Lightning Roulette
    'immersive roulette', // Immersive Roulette
    'auto roulette vip', // Auto Roulette VIP
    'red door', // Red Door / Porta Vermelha
    'porta vermelha', // Red Door / Porta Vermelha (nome em PT)
    'auto lightning roulette', // Auto Lightning Roulette
    'speed auto roulette' // Speed Auto Roulette
  ],
  'Pragmatic Play': [
    'mega roulette', // Mega Roulette
    'auto mega roulette', // Auto Mega Roulette
    'mega roulette brasil', // Mega Roulette Brasil
    'roleta brasileira pragmatic', // Roleta Brasileira Pragmatic
    'vip auto roulette', // VIP Auto Roulette
    'auto roulette', // Auto Roulette
    'pragmatic-speed-auto-roulette' // Speed Auto Roulette Pragmatic
  ]
}

// Verificar se a roleta específica está na lista permitida
export function isAllowedRoulette(rouletteName: string, provider?: string): boolean {
  if (!provider || !ALLOWED_PROVIDERS.includes(provider)) {
    console.log(`🔍 DEBUG: Roleta rejeitada (sem provedor ou provedor não permitido) - "${rouletteName}" | Provedor: ${provider}`)
    return false
  }
  
  const lowerName = rouletteName.toLowerCase()
  const allowedNames = ALLOWED_ROULETTES[provider] || []
  
  // Verificar se alguma das palavras-chave permitidas está no nome
  const isAllowed = allowedNames.some(keyword => lowerName.includes(keyword))
  
  if (!isAllowed) {
    console.log(`🔍 DEBUG: Roleta rejeitada (não está na lista) - "${rouletteName}" | Provedor: ${provider} | Lower: "${lowerName}"`)
  } else {
    console.log(`✅ DEBUG: Roleta ACEITA - "${rouletteName}" | Provedor: ${provider}`)
  }
  
  return isAllowed
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
    'mega fire blaze': 'Playtech', // Mega Fire Blaze (Playtech)
    'grand roulette': 'Playtech',
    'age of the gods': 'Playtech',
    
    // Evolution Gaming
    'lightning': 'Evolution Gaming', // Lightning Roulette, XXXtreme Lightning, etc
    'speed auto': 'Evolution Gaming', // Speed Auto Roulette
    'relampago': 'Evolution Gaming', // Roleta Relampago
    'bac bo': 'Evolution Gaming',
    'en vivo': 'Evolution Gaming', // Ruleta en Vivo
    'immersive': 'Evolution Gaming', // Immersive Roulette
    'quantum': 'Evolution Gaming', // Quantum Roulette, Quantum Auto Roulette
    'american roulette': 'Evolution Gaming', // American Roulette
    'red door': 'Evolution Gaming', // Red Door Roulette
    'porta vermelha': 'Evolution Gaming', // Porta Vermelha
    
    // Pragmatic Play
    'mega roulette': 'Pragmatic Play', // Mega Roulette (Pragmatic, não Evolution!)
    'auto mega roulette': 'Pragmatic Play',
    'brasileira': 'Pragmatic Play', // Roleta Brasileira
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
    'auto roulette': 'Evolution Gaming', // Auto Roulette
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
