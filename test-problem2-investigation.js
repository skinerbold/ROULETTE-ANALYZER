/**
 * 🔬 INVESTIGAÇÃO APROFUNDADA - PROBLEMA #2
 * Números Incorretos Alternados com Corretos
 * 
 * Duração: 10 minutos (600 segundos)
 * Foco: Detectar padrões de números inválidos, alternância suspeita
 */

const WebSocket = require('ws')

// ============================================
// CONFIGURAÇÃO
// ============================================
const WS_URL = 'wss://roulette-websocket-server-production.up.railway.app'
const TEST_DURATION = 600000 // 10 minutos
const SAMPLE_SIZE = 10 // Monitorar 10 roletas simultaneamente

// ============================================
// ESTRUTURAS DE DADOS
// ============================================
const rouletteData = new Map() // rouletteId -> { numbers: [], issues: [], stats: {} }
const globalIssues = []
let allRoulettes = []

// ============================================
// INICIALIZAR DADOS DE ROLETA
// ============================================
function initRouletteData(rouletteId) {
  if (!rouletteData.has(rouletteId)) {
    rouletteData.set(rouletteId, {
      numbers: [],
      issues: [],
      stats: {
        totalNumbers: 0,
        invalidNumbers: 0,
        duplicates: 0,
        timestampIssues: 0,
        colorMismatches: 0,
        suspiciousPatterns: 0,
        outOfRange: 0,
        alternatingInvalid: 0
      },
      lastValidNumber: null,
      lastInvalidNumber: null,
      consecutiveValid: 0,
      consecutiveInvalid: 0,
      alternationCount: 0
    })
  }
  return rouletteData.get(rouletteId)
}

// ============================================
// VALIDAÇÃO DE NÚMEROS
// ============================================

// Calcular cor esperada para um número
function getExpectedColor(number) {
  if (number === 0 || number === 37) return 'green'
  
  const redNumbers = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]
  return redNumbers.includes(number) ? 'red' : 'black'
}

// Validar se número está no range correto
function isValidRange(number) {
  return typeof number === 'number' && number >= 0 && number <= 37
}

// Validar timestamp
function isValidTimestamp(timestamp) {
  const now = Date.now()
  const fiveSecondsAgo = now - 5000
  const fiveSecondsAhead = now + 5000
  
  return timestamp >= fiveSecondsAgo && timestamp <= fiveSecondsAhead
}

// Validar cor
function isValidColor(number, color) {
  const expectedColor = getExpectedColor(number)
  return color === expectedColor
}

// Detectar duplicata imediata
function isDuplicateImmediate(number, history) {
  if (history.length === 0) return false
  return history[0].number === number
}

// Detectar padrão de alternância suspeito
function detectAlternatingPattern(data) {
  const history = data.numbers.slice(0, 10) // Últimos 10 números
  
  if (history.length < 4) return false
  
  // Padrão: válido -> inválido -> válido -> inválido
  let alternations = 0
  for (let i = 1; i < history.length; i++) {
    const prev = history[i - 1]
    const curr = history[i]
    
    if (prev.valid !== curr.valid) {
      alternations++
    }
  }
  
  // Se mais de 50% são alternâncias, é suspeito
  return alternations / (history.length - 1) > 0.5
}

// ============================================
// PROCESSAR MENSAGEM DE NÚMERO
// ============================================
function processNumber(rouletteId, number, timestamp, color, source) {
  const data = initRouletteData(rouletteId)
  data.stats.totalNumbers++
  
  const issues = []
  let isValid = true
  
  // 1. Validar range
  if (!isValidRange(number)) {
    issues.push('OUT_OF_RANGE')
    data.stats.outOfRange++
    data.stats.invalidNumbers++
    isValid = false
  }
  
  // 2. Validar timestamp
  if (!isValidTimestamp(timestamp)) {
    issues.push('INVALID_TIMESTAMP')
    data.stats.timestampIssues++
    isValid = false
  }
  
  // 3. Validar cor
  if (color && !isValidColor(number, color)) {
    issues.push('COLOR_MISMATCH')
    data.stats.colorMismatches++
    isValid = false
  }
  
  // 4. Detectar duplicata imediata
  if (isDuplicateImmediate(number, data.numbers)) {
    issues.push('DUPLICATE_IMMEDIATE')
    data.stats.duplicates++
    isValid = false
  }
  
  // Adicionar ao histórico
  const entry = {
    number,
    timestamp,
    color: color || getExpectedColor(number),
    source,
    valid: isValid,
    issues: issues.length > 0 ? issues : null,
    receivedAt: Date.now()
  }
  
  data.numbers.unshift(entry)
  
  // Limitar histórico a 100 números por roleta
  if (data.numbers.length > 100) {
    data.numbers = data.numbers.slice(0, 100)
  }
  
  // Rastrear sequências
  if (isValid) {
    data.consecutiveValid++
    data.consecutiveInvalid = 0
    data.lastValidNumber = entry
  } else {
    data.consecutiveInvalid++
    data.consecutiveValid = 0
    data.lastInvalidNumber = entry
    
    // Registrar issue global
    globalIssues.push({
      rouletteId,
      timestamp: Date.now(),
      number,
      issues,
      source
    })
  }
  
  // Detectar alternância
  if (data.numbers.length >= 2) {
    const prev = data.numbers[1]
    if (prev.valid !== entry.valid) {
      data.alternationCount++
    }
  }
  
  // Detectar padrão suspeito
  if (detectAlternatingPattern(data)) {
    data.stats.suspiciousPatterns++
  }
  
  // Log imediato de problemas
  if (!isValid) {
    console.log(`\n🚨 PROBLEMA DETECTADO!`)
    console.log(`Roleta: ${rouletteId}`)
    console.log(`Número: ${number}`)
    console.log(`Issues: ${issues.join(', ')}`)
    console.log(`Timestamp: ${new Date(timestamp).toISOString()}`)
    console.log(`Color: ${color}`)
    console.log(`Source: ${source}`)
    console.log(`Consecutivos inválidos: ${data.consecutiveInvalid}`)
    console.log(`Alternações: ${data.alternationCount}`)
  }
  
  return isValid
}

// ============================================
// PROCESSAR MENSAGENS WEBSOCKET
// ============================================
function handleMessage(data) {
  try {
    const message = JSON.parse(data)
    
    // FORMATO 1: Lista de roletas
    if (message.type === 'roulettes' && Array.isArray(message.data)) {
      message.data.forEach(roulette => {
        const id = typeof roulette === 'string' ? roulette : roulette?.id
        if (id && !allRoulettes.includes(id)) {
          allRoulettes.push(id)
        }
      })
      return
    }
    
    // FORMATO 2: Resultado individual (Railway)
    if (message.type === 'result' && message.roulette && typeof message.number === 'number') {
      processNumber(
        message.roulette,
        message.number,
        message.timestamp || Date.now(),
        message.color,
        'railway-result'
      )
      return
    }
    
    // FORMATO 3: Histórico Railway
    if (message.type === 'history' && message.roulette && Array.isArray(message.data)) {
      message.data.forEach(item => {
        processNumber(
          message.roulette,
          item.number,
          item.timestamp || Date.now(),
          item.color,
          'railway-history'
        )
      })
      return
    }
    
    // FORMATO 4: API Local - Resultado individual
    if (message.game && message.game_type === 'roleta' && typeof message.number === 'number') {
      processNumber(
        message.game,
        message.number,
        message.timestamp || Date.now(),
        message.color,
        'local-result'
      )
      return
    }
    
    // FORMATO 5: API Local - Histórico completo
    if (message.game && message.game_type === 'roleta' && Array.isArray(message.results)) {
      message.results.forEach(item => {
        processNumber(
          message.game,
          item.number,
          item.timestamp || Date.now(),
          item.color,
          'local-history'
        )
      })
      return
    }
    
  } catch (error) {
    console.error('❌ Erro ao processar mensagem:', error.message)
  }
}

// ============================================
// GERAR RELATÓRIO
// ============================================
function generateReport() {
  console.log('\n')
  console.log('═'.repeat(80))
  console.log('🔬 RELATÓRIO DE INVESTIGAÇÃO - PROBLEMA #2')
  console.log('═'.repeat(80))
  
  // Estatísticas globais
  let totalNumbers = 0
  let totalInvalid = 0
  let totalRoulettesWithIssues = 0
  
  const roulettesWithIssues = []
  
  rouletteData.forEach((data, rouletteId) => {
    totalNumbers += data.stats.totalNumbers
    totalInvalid += data.stats.invalidNumbers
    
    if (data.stats.invalidNumbers > 0 || data.stats.suspiciousPatterns > 0) {
      totalRoulettesWithIssues++
      roulettesWithIssues.push({ rouletteId, ...data.stats })
    }
  })
  
  console.log('\n📊 ESTATÍSTICAS GLOBAIS')
  console.log('─'.repeat(80))
  console.log(`Roletas monitoradas: ${rouletteData.size}`)
  console.log(`Total de números recebidos: ${totalNumbers}`)
  console.log(`Números inválidos detectados: ${totalInvalid} (${((totalInvalid / totalNumbers) * 100).toFixed(2)}%)`)
  console.log(`Roletas com problemas: ${totalRoulettesWithIssues}`)
  console.log(`Issues globais registrados: ${globalIssues.length}`)
  
  // Detalhamento por tipo de issue
  console.log('\n🔍 DETALHAMENTO POR TIPO DE PROBLEMA')
  console.log('─'.repeat(80))
  
  const issueTypes = {
    outOfRange: { count: 0, label: 'Números fora do range (0-37)' },
    timestampIssues: { count: 0, label: 'Timestamps inválidos' },
    colorMismatches: { count: 0, label: 'Cores incompatíveis' },
    duplicates: { count: 0, label: 'Duplicatas imediatas' },
    suspiciousPatterns: { count: 0, label: 'Padrões de alternância suspeitos' }
  }
  
  rouletteData.forEach((data) => {
    issueTypes.outOfRange.count += data.stats.outOfRange
    issueTypes.timestampIssues.count += data.stats.timestampIssues
    issueTypes.colorMismatches.count += data.stats.colorMismatches
    issueTypes.duplicates.count += data.stats.duplicates
    issueTypes.suspiciousPatterns.count += data.stats.suspiciousPatterns
  })
  
  Object.entries(issueTypes).forEach(([key, { count, label }]) => {
    if (count > 0) {
      console.log(`❌ ${label}: ${count}`)
    } else {
      console.log(`✅ ${label}: 0`)
    }
  })
  
  // Roletas com mais problemas
  if (roulettesWithIssues.length > 0) {
    console.log('\n🎯 ROLETAS COM PROBLEMAS DETECTADOS')
    console.log('─'.repeat(80))
    
    roulettesWithIssues
      .sort((a, b) => b.invalidNumbers - a.invalidNumbers)
      .slice(0, 10)
      .forEach(({ rouletteId, totalNumbers, invalidNumbers, outOfRange, timestampIssues, colorMismatches, duplicates, suspiciousPatterns }) => {
        console.log(`\n📍 ${rouletteId}`)
        console.log(`   Total números: ${totalNumbers}`)
        console.log(`   Inválidos: ${invalidNumbers} (${((invalidNumbers / totalNumbers) * 100).toFixed(1)}%)`)
        if (outOfRange > 0) console.log(`   - Fora do range: ${outOfRange}`)
        if (timestampIssues > 0) console.log(`   - Timestamp inválido: ${timestampIssues}`)
        if (colorMismatches > 0) console.log(`   - Cor incompatível: ${colorMismatches}`)
        if (duplicates > 0) console.log(`   - Duplicatas: ${duplicates}`)
        if (suspiciousPatterns > 0) console.log(`   - Padrões suspeitos: ${suspiciousPatterns}`)
        
        // Mostrar últimos 10 números desta roleta
        const data = rouletteData.get(rouletteId)
        const last10 = data.numbers.slice(0, 10)
        console.log(`   Últimos 10 números:`)
        last10.forEach((entry, i) => {
          const status = entry.valid ? '✅' : '❌'
          const issuesStr = entry.issues ? ` [${entry.issues.join(', ')}]` : ''
          console.log(`      ${i + 1}. ${status} ${entry.number} (${entry.color})${issuesStr}`)
        })
      })
  } else {
    console.log('\n✅ NENHUMA ROLETA COM PROBLEMAS DETECTADOS')
  }
  
  // Timeline de issues (últimos 20)
  if (globalIssues.length > 0) {
    console.log('\n⏱️ TIMELINE DE ISSUES (Últimos 20)')
    console.log('─'.repeat(80))
    
    globalIssues
      .slice(-20)
      .forEach(({ rouletteId, timestamp, number, issues, source }) => {
        const time = new Date(timestamp).toLocaleTimeString()
        console.log(`[${time}] ${rouletteId} - Número ${number} - ${issues.join(', ')} (${source})`)
      })
  }
  
  // Análise de padrões de alternância
  console.log('\n🔄 ANÁLISE DE PADRÕES DE ALTERNÂNCIA')
  console.log('─'.repeat(80))
  
  const roulettesWithAlternation = []
  rouletteData.forEach((data, rouletteId) => {
    if (data.numbers.length >= 10) {
      const alternationRate = data.alternationCount / (data.numbers.length - 1)
      if (alternationRate > 0.3) { // Mais de 30% de alternâncias
        roulettesWithAlternation.push({
          rouletteId,
          alternationRate: (alternationRate * 100).toFixed(1),
          alternationCount: data.alternationCount,
          totalNumbers: data.numbers.length
        })
      }
    }
  })
  
  if (roulettesWithAlternation.length > 0) {
    console.log('⚠️ Roletas com alta taxa de alternância (válido/inválido):')
    roulettesWithAlternation.forEach(({ rouletteId, alternationRate, alternationCount, totalNumbers }) => {
      console.log(`   ${rouletteId}: ${alternationRate}% (${alternationCount}/${totalNumbers - 1} transições)`)
    })
  } else {
    console.log('✅ Nenhuma roleta com padrão de alternância suspeito')
  }
  
  // Conclusão
  console.log('\n')
  console.log('═'.repeat(80))
  console.log('📋 CONCLUSÃO')
  console.log('═'.repeat(80))
  
  if (totalInvalid === 0) {
    console.log('✅ PROBLEMA #2 NÃO DETECTADO')
    console.log('   Todos os números recebidos são válidos')
    console.log('   Nenhuma alternância suspeita identificada')
    console.log('   Possíveis explicações:')
    console.log('   - Problema ocorre apenas em condições específicas')
    console.log('   - Problema foi corrigido na API')
    console.log('   - Problema é intermitente e não ocorreu neste período')
  } else {
    console.log('🚨 PROBLEMA #2 CONFIRMADO')
    console.log(`   ${totalInvalid} números inválidos detectados em ${totalNumbers} números`)
    console.log(`   ${totalRoulettesWithIssues} roletas afetadas`)
    console.log('')
    console.log('   TIPOS DE PROBLEMAS ENCONTRADOS:')
    Object.entries(issueTypes).forEach(([key, { count, label }]) => {
      if (count > 0) {
        console.log(`   - ${label}: ${count} ocorrências`)
      }
    })
  }
  
  console.log('\n═'.repeat(80))
}

// ============================================
// MAIN
// ============================================
async function main() {
  console.log('🔬 INICIANDO INVESTIGAÇÃO APROFUNDADA - PROBLEMA #2')
  console.log('═'.repeat(80))
  console.log(`URL: ${WS_URL}`)
  console.log(`Duração: ${TEST_DURATION / 1000} segundos (${TEST_DURATION / 60000} minutos)`)
  console.log(`Foco: Detectar números incorretos alternados com corretos`)
  console.log('═'.repeat(80))
  console.log('\nConectando...\n')
  
  const ws = new WebSocket(WS_URL)
  
  ws.on('open', () => {
    console.log('✅ Conectado ao WebSocket')
    console.log('⏳ Aguardando lista de roletas...\n')
    
    // Solicitar lista de roletas
    ws.send(JSON.stringify({ type: 'get_roulettes' }))
    
    // Após 5 segundos, inscrever em amostra de roletas
    setTimeout(() => {
      const sampled = allRoulettes.slice(0, SAMPLE_SIZE)
      console.log(`📝 Inscrevendo em ${sampled.length} roletas:`)
      sampled.forEach(id => console.log(`   - ${id}`))
      console.log('\n🔍 Monitoramento iniciado...\n')
      
      sampled.forEach(rouletteId => {
        ws.send(JSON.stringify({
          type: 'subscribe',
          roulette: rouletteId,
          limit: 100
        }))
      })
    }, 5000)
  })
  
  ws.on('message', (data) => {
    handleMessage(data.toString())
  })
  
  ws.on('error', (error) => {
    console.error('❌ Erro WebSocket:', error.message)
  })
  
  ws.on('close', () => {
    console.log('\n❌ Conexão fechada')
    generateReport()
    process.exit(0)
  })
  
  // Progress indicator a cada 30 segundos
  let elapsed = 0
  const progressInterval = setInterval(() => {
    elapsed += 30
    const remaining = (TEST_DURATION / 1000) - elapsed
    let totalNumbers = 0
    let totalInvalid = 0
    rouletteData.forEach((data) => {
      totalNumbers += data.stats.totalNumbers
      totalInvalid += data.stats.invalidNumbers
    })
    
    console.log(`⏱️ [${elapsed}s] Monitorando... (${remaining}s restantes) | Números: ${totalNumbers} | Inválidos: ${totalInvalid}`)
  }, 30000)
  
  // Finalizar teste após duração especificada
  setTimeout(() => {
    clearInterval(progressInterval)
    console.log('\n⏰ Tempo esgotado! Finalizando teste...\n')
    ws.close()
  }, TEST_DURATION)
}

main().catch(console.error)
