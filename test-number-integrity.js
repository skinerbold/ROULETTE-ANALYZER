/**
 * 🔍 SCRIPT DE TESTE DE INTEGRIDADE DOS NÚMEROS DA ROLETA
 * 
 * Este script testa minuciosamente:
 * 1. Conexão WebSocket e recebimento de dados
 * 2. Verificação de números duplicados/repetidos
 * 3. Verificação de timestamps únicos
 * 4. Comparação com dados da API Fly.io
 * 5. Análise de padrões suspeitos (loops)
 * 6. Estado do banco de dados (se houver)
 */

const WebSocket = require('ws')

// Configurações
const WEBSOCKET_URL = 'wss://roulette-websocket-server-production.up.railway.app'
const FLY_API_URL = 'https://roulette-api.fly.dev'
const TEST_ROULETTE = 'roulette_1' // ID de teste
const EXPECTED_COUNT = 500

// Cores para output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m'
}

function log(color, message) {
  console.log(`${colors[color]}${message}${colors.reset}`)
}

function logSection(title) {
  console.log('\n' + '='.repeat(80))
  log('cyan', `📊 ${title}`)
  console.log('='.repeat(80))
}

// Análise de números recebidos
function analyzeNumbers(numbers) {
  logSection('ANÁLISE DE INTEGRIDADE DOS NÚMEROS')
  
  log('blue', `\n1️⃣  Total de números recebidos: ${numbers.length}`)
  
  // Verificar duplicatas exatas
  const uniqueCount = new Set(numbers.map(n => JSON.stringify(n))).size
  log(uniqueCount === numbers.length ? 'green' : 'red', 
    `   Números únicos: ${uniqueCount} ${uniqueCount === numbers.length ? '✅' : '❌ DUPLICATAS DETECTADAS!'}`
  )
  
  // Verificar timestamps únicos
  if (numbers[0]?.timestamp !== undefined) {
    const uniqueTimestamps = new Set(numbers.map(n => n.timestamp)).size
    log(uniqueTimestamps === numbers.length ? 'green' : 'red', 
      `   Timestamps únicos: ${uniqueTimestamps} ${uniqueTimestamps === numbers.length ? '✅' : '❌ TIMESTAMPS DUPLICADOS!'}`
    )
  }
  
  // Detectar padrões de repetição (loops)
  log('blue', '\n2️⃣  Detectando padrões de repetição...')
  const loopSizes = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100]
  let loopDetected = false
  
  for (const loopSize of loopSizes) {
    if (numbers.length >= loopSize * 2) {
      const firstChunk = JSON.stringify(numbers.slice(0, loopSize))
      const secondChunk = JSON.stringify(numbers.slice(loopSize, loopSize * 2))
      
      if (firstChunk === secondChunk) {
        log('red', `   ❌ LOOP DE ${loopSize} NÚMEROS DETECTADO!`)
        log('yellow', `      Primeiros ${loopSize}: ${numbers.slice(0, Math.min(10, loopSize)).map(n => n.number || n).join(', ')}...`)
        log('yellow', `      Próximos ${loopSize}: ${numbers.slice(loopSize, loopSize + Math.min(10, loopSize)).map(n => n.number || n).join(', ')}...`)
        loopDetected = true
        break
      }
    }
  }
  
  if (!loopDetected) {
    log('green', '   ✅ Nenhum loop óbvio detectado')
  }
  
  // Verificar sequências idênticas
  log('blue', '\n3️⃣  Verificando sequências idênticas...')
  const sequenceLength = 5
  const sequences = new Map()
  
  for (let i = 0; i <= numbers.length - sequenceLength; i++) {
    const seq = JSON.stringify(numbers.slice(i, i + sequenceLength))
    sequences.set(seq, (sequences.get(seq) || 0) + 1)
  }
  
  const duplicateSequences = Array.from(sequences.entries()).filter(([_, count]) => count > 1)
  
  if (duplicateSequences.length > 0) {
    log('red', `   ❌ ${duplicateSequences.length} sequências de ${sequenceLength} números repetidas!`)
    duplicateSequences.slice(0, 3).forEach(([seq, count]) => {
      const nums = JSON.parse(seq).map(n => n.number || n)
      log('yellow', `      Sequência [${nums.join(', ')}] aparece ${count}x`)
    })
  } else {
    log('green', `   ✅ Nenhuma sequência de ${sequenceLength} números repetida`)
  }
  
  // Estatísticas básicas
  log('blue', '\n4️⃣  Estatísticas básicas:')
  if (numbers.length > 0) {
    const numValues = numbers.map(n => n.number !== undefined ? n.number : n)
    const min = Math.min(...numValues)
    const max = Math.max(...numValues)
    const avg = (numValues.reduce((a, b) => a + b, 0) / numValues.length).toFixed(2)
    
    log('white', `   Min: ${min}, Max: ${max}, Média: ${avg}`)
    log('white', `   Primeiros 10: [${numValues.slice(0, 10).join(', ')}]`)
    log('white', `   Últimos 10:  [${numValues.slice(-10).join(', ')}]`)
    
    // Distribuição de números
    const distribution = {}
    numValues.forEach(n => {
      distribution[n] = (distribution[n] || 0) + 1
    })
    
    const mostCommon = Object.entries(distribution)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
    
    log('white', '\n   Números mais frequentes:')
    mostCommon.forEach(([num, count]) => {
      const percentage = ((count / numValues.length) * 100).toFixed(2)
      const expectedPercentage = (100 / 37).toFixed(2) // ~2.7% para roleta europeia
      const color = percentage > expectedPercentage * 2 ? 'red' : 'white'
      log(color, `      ${num}: ${count}x (${percentage}%) ${percentage > expectedPercentage * 2 ? '⚠️  SUSPEITO!' : ''}`)
    })
  }
}

// Teste WebSocket
async function testWebSocket() {
  return new Promise((resolve, reject) => {
    logSection('TESTE WEBSOCKET (RAILWAY)')
    
    log('blue', `\nConectando ao WebSocket: ${WEBSOCKET_URL}`)
    
    const ws = new WebSocket(WEBSOCKET_URL)
    let numbers = []
    let receivedHistory = false
    
    const timeout = setTimeout(() => {
      ws.close()
      reject(new Error('Timeout: não recebeu dados em 10 segundos'))
    }, 10000)
    
    ws.on('open', () => {
      log('green', '✅ Conectado ao WebSocket')
      
      // Aguardar lista de roletas primeiro
      log('blue', '⏳ Aguardando lista de roletas...')
    })
    
    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString())
        
        if (message.type === 'roulettes') {
          log('cyan', `\n📋 Roletas disponíveis recebidas: ${message.data?.length || 0}`)
          if (message.data && message.data.length > 0) {
            log('white', `   Primeiras 5: ${message.data.slice(0, 5).map(r => r.name || r.id).join(', ')}`)
            
            // Usar a primeira roleta disponível
            const firstRoulette = message.data[0]
            const rouletteId = firstRoulette.id || firstRoulette
            
            log('blue', `\n📤 Solicitando histórico para: ${rouletteId}`)
            
            // Enviar múltiplos formatos de requisição
            ws.send(JSON.stringify({ type: 'subscribe', roulette: rouletteId, limit: EXPECTED_COUNT }))
            ws.send(JSON.stringify({ type: 'get_history', roulette: rouletteId, limit: EXPECTED_COUNT }))
            
            log('blue', `   ✅ Requisições enviadas (limite: ${EXPECTED_COUNT})`)
          }
        }
        
        if (message.type === 'history') {
          clearTimeout(timeout)
          receivedHistory = true
          numbers = message.data || []
          
          log('green', `\n✅ Histórico recebido!`)
          log('white', `   Números recebidos: ${numbers.length}`)
          log('white', `   Esperado: ${EXPECTED_COUNT}`)
          
          if (numbers.length !== EXPECTED_COUNT) {
            log('yellow', `   ⚠️  Quantidade diferente do esperado!`)
          }
          
          analyzeNumbers(numbers)
          
          ws.close()
          resolve({ source: 'websocket', numbers })
        }
        
        if (message.type === 'error') {
          log('red', `❌ Erro recebido: ${message.error}`)
        }
        
      } catch (err) {
        log('red', `❌ Erro ao processar mensagem: ${err.message}`)
      }
    })
    
    ws.on('error', (error) => {
      clearTimeout(timeout)
      log('red', `❌ Erro WebSocket: ${error.message}`)
      reject(error)
    })
    
    ws.on('close', () => {
      clearTimeout(timeout)
      if (!receivedHistory) {
        reject(new Error('WebSocket fechou sem enviar histórico'))
      }
    })
  })
}

// Teste API Fly.io
async function testFlyAPI() {
  logSection('TESTE API FLY.IO (FONTE ORIGINAL)')
  
  try {
    log('blue', `\nBuscando roletas disponíveis da API Fly.io...`)
    
    // Primeiro, pegar lista de roletas
    const roulettesResponse = await fetch(`${FLY_API_URL}/roulettes`)
    
    if (!roulettesResponse.ok) {
      throw new Error(`API retornou status ${roulettesResponse.status}`)
    }
    
    const roulettes = await roulettesResponse.json()
    log('green', `✅ ${roulettes.length} roletas disponíveis`)
    
    if (roulettes.length > 0) {
      const testRoulette = roulettes[0]
      log('blue', `\nTestando com: ${testRoulette.name} (${testRoulette.id})`)
      
      // Buscar histórico
      const historyResponse = await fetch(
        `${FLY_API_URL}/roulette/${testRoulette.id}/history?limit=${EXPECTED_COUNT}`
      )
      
      if (!historyResponse.ok) {
        throw new Error(`Histórico retornou status ${historyResponse.status}`)
      }
      
      const history = await historyResponse.json()
      const numbers = history.results || history.data || history
      
      log('green', `✅ Histórico recebido da API Fly.io`)
      log('white', `   Números recebidos: ${numbers.length}`)
      
      analyzeNumbers(numbers)
      
      return { source: 'flyapi', numbers }
    }
    
  } catch (error) {
    log('red', `❌ Erro ao testar API Fly.io: ${error.message}`)
    return null
  }
}

// Comparar fontes
function compareSources(wsData, apiData) {
  if (!wsData || !apiData) {
    log('yellow', '\n⚠️  Não foi possível comparar as fontes (dados incompletos)')
    return
  }
  
  logSection('COMPARAÇÃO WEBSOCKET vs API FLY.IO')
  
  const wsNumbers = wsData.numbers.map(n => n.number !== undefined ? n.number : n)
  const apiNumbers = apiData.numbers.map(n => n.number !== undefined ? n.number : n)
  
  log('blue', `\nWebSocket: ${wsNumbers.length} números`)
  log('blue', `API Fly.io: ${apiNumbers.length} números`)
  
  // Comparar primeiros 10
  const ws10 = wsNumbers.slice(0, 10)
  const api10 = apiNumbers.slice(0, 10)
  
  log('white', `\nPrimeiros 10 do WebSocket: [${ws10.join(', ')}]`)
  log('white', `Primeiros 10 da API:       [${api10.join(', ')}]`)
  
  const match = JSON.stringify(ws10) === JSON.stringify(api10)
  log(match ? 'green' : 'red', match ? '✅ Primeiros 10 coincidem!' : '❌ Primeiros 10 NÃO coincidem!')
  
  // Verificar se WebSocket é subconjunto da API
  const wsSet = new Set(wsNumbers)
  const apiSet = new Set(apiNumbers)
  
  const wsInApi = Array.from(wsSet).filter(n => apiSet.has(n)).length
  const percentage = ((wsInApi / wsSet.size) * 100).toFixed(2)
  
  log('white', `\n${wsInApi}/${wsSet.size} números únicos do WebSocket existem na API (${percentage}%)`)
}

// Executar todos os testes
async function runAllTests() {
  console.clear()
  log('magenta', '\n' + '█'.repeat(80))
  log('magenta', '█' + ' '.repeat(78) + '█')
  log('magenta', '█' + '  🔍 TESTE DE INTEGRIDADE DOS NÚMEROS DA ROLETA'.padEnd(78) + '█')
  log('magenta', '█' + ' '.repeat(78) + '█')
  log('magenta', '█'.repeat(80))
  
  let wsData = null
  let apiData = null
  
  try {
    // Teste 1: WebSocket
    wsData = await testWebSocket()
  } catch (error) {
    log('red', `\n❌ Teste WebSocket falhou: ${error.message}`)
  }
  
  try {
    // Teste 2: API Fly.io
    apiData = await testFlyAPI()
  } catch (error) {
    log('red', `\n❌ Teste API Fly.io falhou: ${error.message}`)
  }
  
  // Comparação
  if (wsData && apiData) {
    compareSources(wsData, apiData)
  }
  
  // Resumo final
  logSection('RESUMO FINAL')
  
  if (wsData) {
    const wsNumbers = wsData.numbers
    const hasLoop = detectSimpleLoop(wsNumbers, 60)
    
    log(hasLoop ? 'red' : 'green', 
      `\nWebSocket: ${hasLoop ? '❌ PROBLEMA DETECTADO - Loop de 60 números!' : '✅ Parece estar OK'}`
    )
  }
  
  if (apiData) {
    const apiNumbers = apiData.numbers
    const hasLoop = detectSimpleLoop(apiNumbers, 60)
    
    log(hasLoop ? 'red' : 'green', 
      `API Fly.io: ${hasLoop ? '❌ Problema detectado' : '✅ Parece estar OK'}`
    )
  }
  
  log('cyan', '\n' + '='.repeat(80))
  log('cyan', '✅ Testes concluídos!')
  log('cyan', '='.repeat(80) + '\n')
}

// Detector de loop simples
function detectSimpleLoop(numbers, loopSize) {
  if (numbers.length < loopSize * 2) return false
  
  const first = JSON.stringify(numbers.slice(0, loopSize))
  const second = JSON.stringify(numbers.slice(loopSize, loopSize * 2))
  
  return first === second
}

// Executar
runAllTests().catch(error => {
  log('red', `\n💥 Erro fatal: ${error.message}`)
  console.error(error)
  process.exit(1)
})
