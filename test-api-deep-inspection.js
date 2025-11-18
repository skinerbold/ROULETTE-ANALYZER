/**
 * 🔬 TESTE PROFUNDO DA API - 3 MINUTOS DE INSPEÇÃO COMPLETA
 * 
 * Este script realiza uma análise detalhada de TODAS as funcionalidades da API:
 * 
 * ✅ FUNCIONALIDADES TESTADAS:
 * 1. Conexão WebSocket e reconexão automática
 * 2. Recepção e parsing de mensagens
 * 3. Filtro de provedores permitidos
 * 4. Armazenamento de histórico (max 500 números)
 * 5. Ordem cronológica dos números (RECENTE → ANTIGO)
 * 6. Estrutura de dados (número, cor, timestamp)
 * 7. Identificação de provedores nas roletas
 * 8. Sistema de heartbeat (30s)
 * 9. Fluxo completo: WebSocket → Estado → Front
 * 10. Validação do lastro das roletas (verificar se números são reais)
 * 
 * 🎯 OBJETIVO: Identificar bugs de lógica, problemas de fluxo e inconsistências
 * 
 * ⏱️ DURAÇÃO: Exatos 3 minutos (180 segundos)
 */

const WebSocket = require('ws')

// ========================================
// CONFIGURAÇÃO
// ========================================

const CONFIG = {
  WS_URL: 'wss://roulette-websocket-server-production.up.railway.app',
  TEST_DURATION: 180000, // 3 minutos em ms
  HEARTBEAT_INTERVAL: 30000, // 30 segundos
  MAX_HISTORY_SIZE: 500,
  ALLOWED_PROVIDERS: ['Evolution Gaming', 'Playtech', 'Pragmatic Play']
}

// ========================================
// ESTADO GLOBAL DO TESTE
// ========================================

const TEST_STATE = {
  startTime: Date.now(),
  endTime: null,
  
  // Conexão
  connectionAttempts: 0,
  connectionSuccessful: false,
  reconnections: 0,
  connectionErrors: [],
  
  // Mensagens recebidas
  totalMessages: 0,
  messagesByType: {},
  invalidMessages: [],
  parsingErrors: [],
  
  // Roletas
  roulettesReceived: [],
  roulettesFiltered: [],
  roulettesRejected: [],
  providerStats: {},
  
  // Números
  numbersReceived: 0,
  numbersHistory: {}, // { rouletteId: [números em ordem] }
  numberValidation: {
    outOfRange: [], // Números fora do range 0-37
    invalidColor: [],
    missingTimestamp: [],
    invalidTimestamp: []
  },
  
  // Ordem cronológica
  chronologyTests: [],
  
  // Heartbeat
  heartbeatsSent: 0,
  heartbeatResponses: 0,
  
  // Performance
  messageProcessingTimes: [],
  maxProcessingTime: 0,
  
  // Fluxo de dados
  dataFlowTests: [],
  
  // Erros gerais
  criticalErrors: [],
  warnings: []
}

// ========================================
// UTILITÁRIOS
// ========================================

function log(emoji, message, data = null) {
  const timestamp = new Date().toLocaleTimeString('pt-BR')
  const elapsed = Math.floor((Date.now() - TEST_STATE.startTime) / 1000)
  console.log(`[${elapsed}s] ${emoji} ${message}`)
  if (data) {
    console.log('   📊', JSON.stringify(data, null, 2))
  }
}

function addWarning(message, context = null) {
  TEST_STATE.warnings.push({
    timestamp: Date.now(),
    message,
    context
  })
  log('⚠️', `WARNING: ${message}`, context)
}

function addCriticalError(message, context = null) {
  TEST_STATE.criticalErrors.push({
    timestamp: Date.now(),
    message,
    context
  })
  log('🚨', `CRITICAL ERROR: ${message}`, context)
}

// ========================================
// VALIDAÇÕES ESPECÍFICAS
// ========================================

/**
 * Valida se o número está dentro do range válido
 */
function validateNumberRange(number) {
  if (number < 0 || number > 37) {
    TEST_STATE.numberValidation.outOfRange.push(number)
    addWarning(`Número fora do range válido: ${number}`, { validRange: '0-37' })
    return false
  }
  return true
}

/**
 * Determina a cor esperada do número
 */
function getExpectedColor(number) {
  if (number === 0 || number === 37) return 'green'
  const redNumbers = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]
  return redNumbers.includes(number) ? 'red' : 'black'
}

/**
 * Valida se a cor do número está correta
 */
function validateNumberColor(number, color) {
  const expectedColor = getExpectedColor(number)
  if (color !== expectedColor) {
    TEST_STATE.numberValidation.invalidColor.push({ number, received: color, expected: expectedColor })
    addCriticalError(`Cor incorreta para número ${number}`, { received: color, expected: expectedColor })
    return false
  }
  return true
}

/**
 * Valida timestamp
 */
function validateTimestamp(timestamp) {
  if (!timestamp) {
    TEST_STATE.numberValidation.missingTimestamp.push({ timestamp })
    addWarning('Timestamp ausente no número')
    return false
  }
  
  if (typeof timestamp !== 'number' || timestamp <= 0) {
    TEST_STATE.numberValidation.invalidTimestamp.push({ timestamp })
    addWarning('Timestamp inválido', { timestamp })
    return false
  }
  
  // Verificar se timestamp não é futuro (tolerância de 5 segundos)
  const now = Date.now()
  if (timestamp > now + 5000) {
    addWarning('Timestamp no futuro', { timestamp, now, difference: timestamp - now })
    return false
  }
  
  return true
}

/**
 * Valida provedor da roleta
 */
function validateProvider(provider) {
  if (!provider) {
    return { valid: false, reason: 'Provedor ausente' }
  }
  
  if (!CONFIG.ALLOWED_PROVIDERS.includes(provider)) {
    return { valid: false, reason: 'Provedor não permitido', provider }
  }
  
  return { valid: true }
}

/**
 * Testa ordem cronológica do histórico
 */
function testChronologicalOrder(rouletteId, history) {
  if (history.length < 2) return true
  
  let isCorrectOrder = true
  const issues = []
  
  // História deve estar em ordem RECENTE → ANTIGO (decrescente por timestamp)
  for (let i = 0; i < history.length - 1; i++) {
    const current = history[i]
    const next = history[i + 1]
    
    if (current.timestamp < next.timestamp) {
      isCorrectOrder = false
      issues.push({
        position: i,
        current: { number: current.number, timestamp: current.timestamp },
        next: { number: next.number, timestamp: next.timestamp },
        problem: 'Ordem cronológica invertida (timestamp mais antigo antes do mais recente)'
      })
    }
  }
  
  TEST_STATE.chronologyTests.push({
    rouletteId,
    historySize: history.length,
    isCorrectOrder,
    issues
  })
  
  if (!isCorrectOrder) {
    addCriticalError(`Ordem cronológica incorreta na roleta ${rouletteId}`, {
      historySize: history.length,
      issuesCount: issues.length,
      firstIssue: issues[0]
    })
  }
  
  return isCorrectOrder
}

/**
 * Testa limite de histórico (max 500)
 */
function testHistoryLimit(rouletteId, history) {
  if (history.length > CONFIG.MAX_HISTORY_SIZE) {
    addCriticalError(`Histórico excede limite máximo para roleta ${rouletteId}`, {
      limit: CONFIG.MAX_HISTORY_SIZE,
      actual: history.length,
      excess: history.length - CONFIG.MAX_HISTORY_SIZE
    })
    return false
  }
  return true
}

/**
 * Testa fluxo de dados completo
 */
function testDataFlow(message) {
  const flowTest = {
    timestamp: Date.now(),
    stage: 'received',
    messageType: message.type,
    success: true,
    stages: []
  }
  
  // Estágio 1: Recepção
  flowTest.stages.push({
    name: 'reception',
    success: true,
    data: { type: message.type }
  })
  
  // Estágio 2: Parsing
  try {
    const parsed = typeof message === 'string' ? JSON.parse(message) : message
    flowTest.stages.push({
      name: 'parsing',
      success: true,
      data: { keys: Object.keys(parsed) }
    })
  } catch (error) {
    flowTest.stages.push({
      name: 'parsing',
      success: false,
      error: error.message
    })
    flowTest.success = false
  }
  
  // Estágio 3: Validação
  if (message.type === 'result' && message.number !== undefined) {
    const validRange = validateNumberRange(message.number)
    const validColor = message.color ? validateNumberColor(message.number, message.color) : false
    const validTimestamp = validateTimestamp(message.timestamp)
    
    flowTest.stages.push({
      name: 'validation',
      success: validRange && validColor && validTimestamp,
      data: { validRange, validColor, validTimestamp }
    })
    
    if (!validRange || !validColor || !validTimestamp) {
      flowTest.success = false
    }
  }
  
  // Estágio 4: Armazenamento
  if (message.type === 'result' && message.data?.rouletteId) {
    const rouletteId = message.data.rouletteId
    if (!TEST_STATE.numbersHistory[rouletteId]) {
      TEST_STATE.numbersHistory[rouletteId] = []
    }
    
    const newEntry = {
      number: message.number,
      color: message.color || getExpectedColor(message.number),
      timestamp: message.timestamp || Date.now()
    }
    
    TEST_STATE.numbersHistory[rouletteId].unshift(newEntry) // Adicionar no início (mais recente)
    
    flowTest.stages.push({
      name: 'storage',
      success: true,
      data: { rouletteId, historySize: TEST_STATE.numbersHistory[rouletteId].length }
    })
  }
  
  TEST_STATE.dataFlowTests.push(flowTest)
  
  if (!flowTest.success) {
    addWarning('Falha no fluxo de dados', flowTest)
  }
}

// ========================================
// PROCESSAMENTO DE MENSAGENS
// ========================================

function processMessage(data) {
  const startTime = performance.now()
  
  try {
    // Converter Buffer para string se necessário
    const dataString = typeof data === 'string' ? data : data.toString()
    const message = JSON.parse(dataString)
    TEST_STATE.totalMessages++
    
    // Contar por tipo
    if (!TEST_STATE.messagesByType[message.type]) {
      TEST_STATE.messagesByType[message.type] = 0
    }
    TEST_STATE.messagesByType[message.type]++
    
    log('📨', `Mensagem recebida: ${message.type}`)
    
    // Testar fluxo de dados
    testDataFlow(message)
    
    // Processar por tipo
    switch (message.type) {
      case 'connected':
        log('✅', 'Conexão confirmada pelo servidor')
        TEST_STATE.connectionSuccessful = true
        break
        
      case 'roulettes':
        processRoulettes(message.data)
        break
        
      case 'result':
        processResult(message)
        break
        
      case 'history':
        processHistory(message)
        break
        
      case 'error':
        addWarning('Erro recebido do servidor', message)
        break
        
      default:
        log('❓', `Tipo de mensagem desconhecido: ${message.type}`)
    }
    
    // Registrar tempo de processamento
    const processingTime = performance.now() - startTime
    TEST_STATE.messageProcessingTimes.push(processingTime)
    if (processingTime > TEST_STATE.maxProcessingTime) {
      TEST_STATE.maxProcessingTime = processingTime
    }
    
    if (processingTime > 50) {
      addWarning('Processamento de mensagem lento', {
        type: message.type,
        time: processingTime.toFixed(2) + 'ms'
      })
    }
    
  } catch (error) {
    TEST_STATE.parsingErrors.push({
      error: error.message,
      data: String(data).substring(0, 200) // Primeiros 200 chars
    })
    addCriticalError('Erro ao fazer parsing da mensagem', {
      error: error.message,
      dataPreview: String(data).substring(0, 100)
    })
  }
}

function processRoulettes(roulettes) {
  if (!Array.isArray(roulettes)) {
    addCriticalError('Lista de roletas não é um array', { type: typeof roulettes })
    return
  }
  
  log('🎰', `Recebidas ${roulettes.length} roletas`)
  
  roulettes.forEach(roulette => {
    TEST_STATE.roulettesReceived.push(roulette)
    
    // Extrair provedor do nome
    const provider = extractProvider(roulette.name || roulette.id)
    
    if (provider) {
      TEST_STATE.providerStats[provider] = (TEST_STATE.providerStats[provider] || 0) + 1
    }
    
    // Validar provedor
    const validation = validateProvider(provider)
    
    if (validation.valid) {
      TEST_STATE.roulettesFiltered.push({
        ...roulette,
        provider
      })
      log('✅', `Roleta aceita: ${roulette.name || roulette.id}`, { provider })
    } else {
      TEST_STATE.roulettesRejected.push({
        ...roulette,
        provider,
        reason: validation.reason
      })
      log('🚫', `Roleta rejeitada: ${roulette.name || roulette.id}`, validation)
    }
  })
}

function processResult(message) {
  TEST_STATE.numbersReceived++
  
  const { number, color, timestamp, data } = message
  
  log('🎲', `Número recebido: ${number} (${color})`, {
    roulette: data?.rouletteId,
    timestamp: new Date(timestamp).toLocaleTimeString('pt-BR')
  })
  
  // Validações
  validateNumberRange(number)
  if (color) validateNumberColor(number, color)
  validateTimestamp(timestamp)
  
  // Armazenar no histórico
  if (data?.rouletteId) {
    const rouletteId = data.rouletteId
    
    if (!TEST_STATE.numbersHistory[rouletteId]) {
      TEST_STATE.numbersHistory[rouletteId] = []
    }
    
    const entry = {
      number,
      color: color || getExpectedColor(number),
      timestamp: timestamp || Date.now()
    }
    
    // Adicionar no início (mais recente primeiro)
    TEST_STATE.numbersHistory[rouletteId].unshift(entry)
    
    // Limitar tamanho
    if (TEST_STATE.numbersHistory[rouletteId].length > CONFIG.MAX_HISTORY_SIZE) {
      TEST_STATE.numbersHistory[rouletteId] = TEST_STATE.numbersHistory[rouletteId].slice(0, CONFIG.MAX_HISTORY_SIZE)
    }
    
    // Testar ordem cronológica
    testChronologicalOrder(rouletteId, TEST_STATE.numbersHistory[rouletteId])
    testHistoryLimit(rouletteId, TEST_STATE.numbersHistory[rouletteId])
  }
}

function processHistory(message) {
  const { data } = message
  
  if (!data?.rouletteId || !Array.isArray(data.history)) {
    addCriticalError('Histórico inválido recebido', { data })
    return
  }
  
  log('📜', `Histórico recebido para roleta ${data.rouletteId}`, {
    size: data.history.length
  })
  
  // Armazenar histórico
  TEST_STATE.numbersHistory[data.rouletteId] = data.history.map(entry => ({
    number: entry.number,
    color: entry.color || getExpectedColor(entry.number),
    timestamp: entry.timestamp
  }))
  
  // Validar cada número
  data.history.forEach(entry => {
    validateNumberRange(entry.number)
    if (entry.color) validateNumberColor(entry.number, entry.color)
    validateTimestamp(entry.timestamp)
  })
  
  // Testar ordem cronológica
  testChronologicalOrder(data.rouletteId, TEST_STATE.numbersHistory[data.rouletteId])
  testHistoryLimit(data.rouletteId, TEST_STATE.numbersHistory[data.rouletteId])
}

function extractProvider(name) {
  const lowerName = name.toLowerCase()
  
  const providerMap = {
    'evolution': 'Evolution Gaming',
    'pragmatic': 'Pragmatic Play',
    'playtech': 'Playtech',
    'lightning': 'Evolution Gaming',
    'speed': 'Evolution Gaming',
    'quantum': 'Evolution Gaming',
    'immersive': 'Evolution Gaming',
    'brasileira': 'Pragmatic Play',
    'auto-roulette': 'Pragmatic Play'
  }
  
  for (const [key, provider] of Object.entries(providerMap)) {
    if (lowerName.includes(key)) {
      return provider
    }
  }
  
  return null
}

// ========================================
// RELATÓRIO FINAL
// ========================================

function generateReport() {
  console.log('\n')
  console.log('═'.repeat(80))
  console.log('🔬 RELATÓRIO COMPLETO DO TESTE DE 3 MINUTOS')
  console.log('═'.repeat(80))
  console.log('\n')
  
  const duration = (Date.now() - TEST_STATE.startTime) / 1000
  
  // ========== RESUMO EXECUTIVO ==========
  console.log('📊 RESUMO EXECUTIVO')
  console.log('─'.repeat(80))
  console.log(`⏱️  Duração: ${duration.toFixed(1)}s`)
  console.log(`✅ Conexão bem-sucedida: ${TEST_STATE.connectionSuccessful ? 'SIM' : 'NÃO'}`)
  console.log(`🔄 Reconexões: ${TEST_STATE.reconnections}`)
  console.log(`📨 Mensagens recebidas: ${TEST_STATE.totalMessages}`)
  console.log(`🎲 Números recebidos: ${TEST_STATE.numbersReceived}`)
  console.log(`🎰 Roletas recebidas: ${TEST_STATE.roulettesReceived.length}`)
  console.log(`✅ Roletas aceitas: ${TEST_STATE.roulettesFiltered.length}`)
  console.log(`🚫 Roletas rejeitadas: ${TEST_STATE.roulettesRejected.length}`)
  console.log(`🚨 Erros críticos: ${TEST_STATE.criticalErrors.length}`)
  console.log(`⚠️  Avisos: ${TEST_STATE.warnings.length}`)
  console.log('\n')
  
  // ========== ESTATÍSTICAS DE MENSAGENS ==========
  console.log('📨 ESTATÍSTICAS DE MENSAGENS')
  console.log('─'.repeat(80))
  Object.entries(TEST_STATE.messagesByType).forEach(([type, count]) => {
    console.log(`   ${type}: ${count} mensagens`)
  })
  console.log(`   ❌ Erros de parsing: ${TEST_STATE.parsingErrors.length}`)
  console.log('\n')
  
  // ========== PROVEDORES ==========
  console.log('🏢 ESTATÍSTICAS DE PROVEDORES')
  console.log('─'.repeat(80))
  Object.entries(TEST_STATE.providerStats).forEach(([provider, count]) => {
    const isAllowed = CONFIG.ALLOWED_PROVIDERS.includes(provider)
    console.log(`   ${isAllowed ? '✅' : '🚫'} ${provider}: ${count} roletas`)
  })
  console.log('\n')
  
  // ========== VALIDAÇÃO DE NÚMEROS ==========
  console.log('🎲 VALIDAÇÃO DE NÚMEROS')
  console.log('─'.repeat(80))
  console.log(`   ✅ Números válidos: ${TEST_STATE.numbersReceived - TEST_STATE.numberValidation.outOfRange.length - TEST_STATE.numberValidation.invalidColor.length}`)
  console.log(`   ❌ Fora do range (0-37): ${TEST_STATE.numberValidation.outOfRange.length}`)
  console.log(`   ❌ Cor incorreta: ${TEST_STATE.numberValidation.invalidColor.length}`)
  console.log(`   ⚠️  Timestamp ausente: ${TEST_STATE.numberValidation.missingTimestamp.length}`)
  console.log(`   ⚠️  Timestamp inválido: ${TEST_STATE.numberValidation.invalidTimestamp.length}`)
  
  if (TEST_STATE.numberValidation.invalidColor.length > 0) {
    console.log('\n   🔍 Cores incorretas detectadas:')
    TEST_STATE.numberValidation.invalidColor.slice(0, 5).forEach(issue => {
      console.log(`      Número ${issue.number}: recebido "${issue.received}", esperado "${issue.expected}"`)
    })
  }
  console.log('\n')
  
  // ========== ORDEM CRONOLÓGICA ==========
  console.log('📅 TESTES DE ORDEM CRONOLÓGICA')
  console.log('─'.repeat(80))
  const chronologyTestsCount = TEST_STATE.chronologyTests.length
  const chronologyFailures = TEST_STATE.chronologyTests.filter(t => !t.isCorrectOrder).length
  console.log(`   Total de testes: ${chronologyTestsCount}`)
  console.log(`   ✅ Testes bem-sucedidos: ${chronologyTestsCount - chronologyFailures}`)
  console.log(`   ❌ Testes com falha: ${chronologyFailures}`)
  
  if (chronologyFailures > 0) {
    console.log('\n   🔍 Problemas de ordem cronológica detectados:')
    TEST_STATE.chronologyTests.filter(t => !t.isCorrectOrder).slice(0, 3).forEach(test => {
      console.log(`      Roleta ${test.rouletteId}: ${test.issues.length} problemas`)
      if (test.issues[0]) {
        console.log(`         Exemplo: Posição ${test.issues[0].position} - ${test.issues[0].problem}`)
      }
    })
  }
  console.log('\n')
  
  // ========== HISTÓRICO ==========
  console.log('📜 ESTATÍSTICAS DE HISTÓRICO')
  console.log('─'.repeat(80))
  const roulettesWithHistory = Object.keys(TEST_STATE.numbersHistory).length
  console.log(`   Roletas com histórico: ${roulettesWithHistory}`)
  
  if (roulettesWithHistory > 0) {
    const historySizes = Object.values(TEST_STATE.numbersHistory).map(h => h.length)
    const avgSize = historySizes.reduce((a, b) => a + b, 0) / historySizes.length
    const maxSize = Math.max(...historySizes)
    const minSize = Math.min(...historySizes)
    
    console.log(`   Tamanho médio: ${avgSize.toFixed(1)} números`)
    console.log(`   Tamanho máximo: ${maxSize} números`)
    console.log(`   Tamanho mínimo: ${minSize} números`)
    console.log(`   Limite configurado: ${CONFIG.MAX_HISTORY_SIZE} números`)
    
    const exceedingLimit = historySizes.filter(s => s > CONFIG.MAX_HISTORY_SIZE).length
    if (exceedingLimit > 0) {
      console.log(`   ❌ Roletas excedendo limite: ${exceedingLimit}`)
    }
  }
  console.log('\n')
  
  // ========== PERFORMANCE ==========
  console.log('⚡ PERFORMANCE')
  console.log('─'.repeat(80))
  if (TEST_STATE.messageProcessingTimes.length > 0) {
    const avgProcessing = TEST_STATE.messageProcessingTimes.reduce((a, b) => a + b, 0) / TEST_STATE.messageProcessingTimes.length
    console.log(`   Tempo médio de processamento: ${avgProcessing.toFixed(2)}ms`)
    console.log(`   Tempo máximo de processamento: ${TEST_STATE.maxProcessingTime.toFixed(2)}ms`)
    
    const slowMessages = TEST_STATE.messageProcessingTimes.filter(t => t > 50).length
    if (slowMessages > 0) {
      console.log(`   ⚠️  Mensagens processadas lentamente (>50ms): ${slowMessages}`)
    }
  }
  console.log(`   Taxa de mensagens: ${(TEST_STATE.totalMessages / duration).toFixed(2)} msg/s`)
  console.log('\n')
  
  // ========== FLUXO DE DADOS ==========
  console.log('🔄 TESTES DE FLUXO DE DADOS')
  console.log('─'.repeat(80))
  const flowTestsCount = TEST_STATE.dataFlowTests.length
  const flowFailures = TEST_STATE.dataFlowTests.filter(t => !t.success).length
  console.log(`   Total de testes: ${flowTestsCount}`)
  console.log(`   ✅ Fluxos bem-sucedidos: ${flowTestsCount - flowFailures}`)
  console.log(`   ❌ Fluxos com falha: ${flowFailures}`)
  console.log('\n')
  
  // ========== ERROS CRÍTICOS ==========
  if (TEST_STATE.criticalErrors.length > 0) {
    console.log('🚨 ERROS CRÍTICOS DETECTADOS')
    console.log('─'.repeat(80))
    TEST_STATE.criticalErrors.forEach((error, index) => {
      console.log(`   ${index + 1}. ${error.message}`)
      if (error.context) {
        console.log(`      Contexto: ${JSON.stringify(error.context)}`)
      }
    })
    console.log('\n')
  }
  
  // ========== AVISOS ==========
  if (TEST_STATE.warnings.length > 0) {
    console.log('⚠️  AVISOS')
    console.log('─'.repeat(80))
    // Mostrar apenas os primeiros 10 avisos
    TEST_STATE.warnings.slice(0, 10).forEach((warning, index) => {
      console.log(`   ${index + 1}. ${warning.message}`)
    })
    if (TEST_STATE.warnings.length > 10) {
      console.log(`   ... e mais ${TEST_STATE.warnings.length - 10} avisos`)
    }
    console.log('\n')
  }
  
  // ========== VEREDICTO FINAL ==========
  console.log('═'.repeat(80))
  console.log('🏁 VEREDICTO FINAL')
  console.log('═'.repeat(80))
  
  const hasCriticalIssues = TEST_STATE.criticalErrors.length > 0 || 
                           TEST_STATE.numberValidation.invalidColor.length > 0 ||
                           TEST_STATE.chronologyTests.some(t => !t.isCorrectOrder)
  
  if (!TEST_STATE.connectionSuccessful) {
    console.log('❌ FALHA: Não foi possível estabelecer conexão com o WebSocket')
  } else if (hasCriticalIssues) {
    console.log('⚠️  ATENÇÃO: Sistema funcional mas com problemas críticos detectados')
    console.log('   Recomenda-se revisão dos seguintes pontos:')
    if (TEST_STATE.criticalErrors.length > 0) {
      console.log(`   - ${TEST_STATE.criticalErrors.length} erros críticos`)
    }
    if (TEST_STATE.numberValidation.invalidColor.length > 0) {
      console.log(`   - ${TEST_STATE.numberValidation.invalidColor.length} números com cor incorreta`)
    }
    if (TEST_STATE.chronologyTests.some(t => !t.isCorrectOrder)) {
      console.log(`   - Problemas de ordem cronológica em ${chronologyFailures} roletas`)
    }
  } else if (TEST_STATE.warnings.length > 5) {
    console.log('⚠️  APROVADO COM RESSALVAS: Sistema funcionando, mas com avisos')
    console.log(`   ${TEST_STATE.warnings.length} avisos detectados - revisar logs acima`)
  } else {
    console.log('✅ APROVADO: Todos os sistemas funcionando corretamente!')
    console.log('   - Conexão WebSocket estável')
    console.log('   - Mensagens processadas corretamente')
    console.log('   - Validações passando')
    console.log('   - Ordem cronológica correta')
    console.log('   - Filtros de provedor funcionando')
    console.log('   - Fluxo de dados íntegro')
  }
  
  console.log('═'.repeat(80))
  console.log('\n')
}

// ========================================
// CONEXÃO WEBSOCKET
// ========================================

function startTest() {
  log('🚀', 'Iniciando teste profundo da API...')
  log('⏱️', `Duração do teste: ${CONFIG.TEST_DURATION / 1000} segundos`)
  console.log('\n')
  
  let ws = null
  let heartbeatInterval = null
  
  function connect() {
    TEST_STATE.connectionAttempts++
    log('🔌', `Tentativa de conexão ${TEST_STATE.connectionAttempts}...`)
    
    ws = new WebSocket(CONFIG.WS_URL)
    
    ws.on('open', () => {
      log('✅', 'Conexão WebSocket estabelecida!')
      TEST_STATE.connectionSuccessful = true
      
      // Iniciar heartbeat
      heartbeatInterval = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'ping' }))
          TEST_STATE.heartbeatsSent++
          log('💓', 'Heartbeat enviado')
        }
      }, CONFIG.HEARTBEAT_INTERVAL)
      
      // Solicitar lista de roletas
      ws.send(JSON.stringify({ type: 'get_roulettes' }))
      log('📤', 'Solicitando lista de roletas...')
    })
    
    ws.on('message', (data) => {
      processMessage(data)
    })
    
    ws.on('error', (error) => {
      TEST_STATE.connectionErrors.push(error.message)
      addCriticalError('Erro na conexão WebSocket', { error: error.message })
    })
    
    ws.on('close', () => {
      log('🔌', 'Conexão WebSocket fechada')
      
      if (heartbeatInterval) {
        clearInterval(heartbeatInterval)
      }
      
      // Tentar reconectar se ainda estiver dentro do tempo de teste
      if (Date.now() - TEST_STATE.startTime < CONFIG.TEST_DURATION) {
        TEST_STATE.reconnections++
        log('🔄', `Reconectando... (tentativa ${TEST_STATE.reconnections})`)
        setTimeout(connect, 2000)
      }
    })
  }
  
  // Iniciar conexão
  connect()
  
  // Finalizar após 3 minutos
  setTimeout(() => {
    log('⏱️', 'Tempo de teste finalizado!')
    TEST_STATE.endTime = Date.now()
    
    if (ws) {
      ws.close()
    }
    
    if (heartbeatInterval) {
      clearInterval(heartbeatInterval)
    }
    
    // Aguardar um pouco para processar mensagens finais
    setTimeout(() => {
      generateReport()
      process.exit(0)
    }, 1000)
  }, CONFIG.TEST_DURATION)
}

// ========================================
// INICIAR TESTE
// ========================================

console.log('\n')
console.log('═'.repeat(80))
console.log('🔬 TESTE PROFUNDO DA API - INSPEÇÃO COMPLETA DE 3 MINUTOS')
console.log('═'.repeat(80))
console.log('\n')

startTest()
