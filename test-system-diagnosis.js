/**
 * 🔬 ANÁLISE PROFUNDA DO SISTEMA - DIAGNÓSTICO COMPLETO
 * 
 * Este script faz uma varredura detalhada para identificar:
 * 1. Por que algumas roletas não têm quantidade suficiente de números
 * 2. Por que algumas roletas recebem números incorretos alternados
 * 
 * Duração: 3 minutos de monitoramento intensivo
 */

const WebSocket = require('ws')

const CONFIG = {
  WS_URL: 'wss://roulette-websocket-server-production.up.railway.app',
  TEST_DURATION: 180000, // 3 minutos
  MAX_HISTORY_SIZE: 500
}

// ========================================
// ESTADO DE ANÁLISE
// ========================================

const ANALYSIS = {
  startTime: Date.now(),
  
  // Rastreamento por roleta
  roulettes: new Map(), // rouletteId -> { numbers: [], messages: [], issues: [] }
  
  // Problemas identificados
  issues: {
    insufficientNumbers: [],
    incorrectNumbers: [],
    duplicateMessages: [],
    outOfOrderMessages: [],
    invalidNumbers: [],
    historyTruncation: []
  },
  
  // Estatísticas
  totalMessages: 0,
  messagesPerRoulette: new Map(),
  numberUpdatesPerRoulette: new Map()
}

function log(emoji, message) {
  const elapsed = Math.floor((Date.now() - ANALYSIS.startTime) / 1000)
  console.log(`[${elapsed}s] ${emoji} ${message}`)
}

function getExpectedColor(number) {
  if (number === 0 || number === 37) return 'green'
  const redNumbers = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]
  return redNumbers.includes(number) ? 'red' : 'black'
}

// ========================================
// RASTREAMENTO DE ROLETAS
// ========================================

function initializeRoulette(rouletteId) {
  if (!ANALYSIS.roulettes.has(rouletteId)) {
    ANALYSIS.roulettes.set(rouletteId, {
      id: rouletteId,
      numbers: [], // Histórico completo ordenado [RECENTE → ANTIGO]
      rawNumbers: [], // Números puros sem timestamp
      messages: [], // Todas as mensagens recebidas
      messageTypes: new Map(),
      issues: [],
      firstMessageTime: Date.now(),
      lastMessageTime: Date.now(),
      totalUpdates: 0,
      maxHistoryReceived: 0
    })
    ANALYSIS.messagesPerRoulette.set(rouletteId, 0)
    ANALYSIS.numberUpdatesPerRoulette.set(rouletteId, 0)
  }
  return ANALYSIS.roulettes.get(rouletteId)
}

function trackMessage(rouletteId, messageType, data) {
  const roulette = initializeRoulette(rouletteId)
  
  roulette.messages.push({
    timestamp: Date.now(),
    type: messageType,
    data: JSON.parse(JSON.stringify(data)) // Deep clone
  })
  
  roulette.lastMessageTime = Date.now()
  
  const count = roulette.messageTypes.get(messageType) || 0
  roulette.messageTypes.set(messageType, count + 1)
  
  const totalMessages = ANALYSIS.messagesPerRoulette.get(rouletteId) || 0
  ANALYSIS.messagesPerRoulette.set(rouletteId, totalMessages + 1)
}

function trackNumberUpdate(rouletteId, numbers, source) {
  const roulette = initializeRoulette(rouletteId)
  
  // Rastrear atualização
  roulette.totalUpdates++
  const updates = ANALYSIS.numberUpdatesPerRoulette.get(rouletteId) || 0
  ANALYSIS.numberUpdatesPerRoulette.set(rouletteId, updates + 1)
  
  // Atualizar histórico máximo recebido
  if (numbers.length > roulette.maxHistoryReceived) {
    roulette.maxHistoryReceived = numbers.length
  }
  
  // Verificar se os números são válidos
  const invalidNums = numbers.filter(n => n < 0 || n > 37)
  if (invalidNums.length > 0) {
    const issue = {
      type: 'INVALID_NUMBERS',
      rouletteId,
      source,
      invalidNumbers: invalidNums,
      timestamp: Date.now()
    }
    roulette.issues.push(issue)
    ANALYSIS.issues.invalidNumbers.push(issue)
    log('🚨', `NÚMERO INVÁLIDO em ${rouletteId}: [${invalidNums.join(', ')}]`)
  }
  
  // Verificar ordem cronológica (se temos timestamps)
  if (roulette.numbers.length > 0 && numbers.length > 0) {
    const oldFirst = roulette.numbers[0]
    const newFirst = numbers[0]
    
    // Se o primeiro número mudou, pode ser um novo spin ou ordem invertida
    if (oldFirst !== newFirst && numbers.includes(oldFirst)) {
      // O número antigo ainda está na lista, verificar posição
      const oldIndex = numbers.indexOf(oldFirst)
      if (oldIndex > 0) {
        // Número antigo não está mais na primeira posição - OK (novo spin)
      } else {
        // Possível problema de ordem
        const issue = {
          type: 'ORDER_ISSUE',
          rouletteId,
          source,
          oldFirst,
          newFirst,
          timestamp: Date.now()
        }
        roulette.issues.push(issue)
        log('⚠️', `Possível inversão de ordem em ${rouletteId}: ${oldFirst} → ${newFirst}`)
      }
    }
  }
  
  // Atualizar histórico
  const previousLength = roulette.numbers.length
  roulette.numbers = [...numbers]
  roulette.rawNumbers = [...numbers]
  
  // Verificar se houve truncamento inesperado
  if (previousLength > 0 && numbers.length < previousLength - 1) {
    const issue = {
      type: 'HISTORY_TRUNCATION',
      rouletteId,
      source,
      oldLength: previousLength,
      newLength: numbers.length,
      diff: previousLength - numbers.length,
      timestamp: Date.now()
    }
    roulette.issues.push(issue)
    ANALYSIS.issues.historyTruncation.push(issue)
    log('📉', `Histórico truncado em ${rouletteId}: ${previousLength} → ${numbers.length}`)
  }
  
  log('📊', `${rouletteId}: ${numbers.length} números (fonte: ${source})`)
}

// ========================================
// PROCESSAMENTO DE MENSAGENS
// ========================================

function processMessage(data) {
  try {
    const dataString = typeof data === 'string' ? data : data.toString()
    const message = JSON.parse(dataString)
    ANALYSIS.totalMessages++
    
    // Formato 1: Lista de roletas
    if (message.type === 'roulettes' && Array.isArray(message.data)) {
      log('📋', `Lista de roletas: ${message.data.length}`)
      message.data.forEach(roulette => {
        const name = typeof roulette === 'string' ? roulette : roulette.name || roulette.id
        initializeRoulette(name)
      })
      return
    }
    
    // Formato 2: Resultado individual (Railway)
    if (message.type === 'result' && message.roulette && typeof message.number === 'number') {
      const rouletteId = message.roulette
      const number = message.number
      
      trackMessage(rouletteId, 'result', { number, timestamp: message.timestamp })
      
      // Validar número
      if (number < 0 || number > 37) {
        log('🚨', `NÚMERO INVÁLIDO: ${number} em ${rouletteId}`)
      }
      
      // Adicionar ao histórico (simulando comportamento do front)
      const roulette = initializeRoulette(rouletteId)
      const newHistory = [number, ...roulette.rawNumbers].slice(0, CONFIG.MAX_HISTORY_SIZE)
      trackNumberUpdate(rouletteId, newHistory, 'result')
      
      return
    }
    
    // Formato 3: Histórico completo (API Local)
    if (message.game && message.game_type === 'roleta' && Array.isArray(message.results)) {
      const rouletteId = message.game
      
      trackMessage(rouletteId, 'history', { resultsCount: message.results.length })
      
      // Converter para números
      const numbers = message.results
        .map(r => parseInt(r))
        .filter(n => !isNaN(n) && n >= 0 && n <= 37)
      
      trackNumberUpdate(rouletteId, numbers, 'history')
      
      return
    }
    
    // Formato 4: Histórico (Railway)
    if (message.type === 'history') {
      const numbers = message.numbers || message.data || []
      const rouletteId = message.roulette || 'unknown'
      
      trackMessage(rouletteId, 'history', { numbersCount: numbers.length })
      
      if (rouletteId !== 'unknown') {
        trackNumberUpdate(rouletteId, numbers, 'history-railway')
      }
      
      return
    }
    
  } catch (error) {
    log('❌', `Erro no processamento: ${error.message}`)
  }
}

// ========================================
// ANÁLISE E DIAGNÓSTICO
// ========================================

function analyzeRoulette(roulette) {
  const issues = []
  
  // PROBLEMA 1: Quantidade insuficiente de números
  if (roulette.maxHistoryReceived < 50) {
    issues.push({
      severity: 'HIGH',
      type: 'INSUFFICIENT_NUMBERS',
      description: `Apenas ${roulette.maxHistoryReceived} números recebidos (esperado: 50-500)`,
      possibleCauses: [
        'Roleta nova/recém-iniciada',
        'API não está enviando histórico completo',
        'Mensagens sendo perdidas',
        'Roleta com pouca atividade'
      ]
    })
    
    ANALYSIS.issues.insufficientNumbers.push({
      rouletteId: roulette.id,
      maxReceived: roulette.maxHistoryReceived,
      totalUpdates: roulette.totalUpdates
    })
  }
  
  // PROBLEMA 2: Números incorretos alternados
  if (roulette.rawNumbers.length > 10) {
    // Verificar se há números repetidos em sequência
    const repeats = []
    for (let i = 0; i < roulette.rawNumbers.length - 1; i++) {
      if (roulette.rawNumbers[i] === roulette.rawNumbers[i + 1]) {
        repeats.push({ number: roulette.rawNumbers[i], position: i })
      }
    }
    
    if (repeats.length > 2) {
      issues.push({
        severity: 'MEDIUM',
        type: 'DUPLICATE_NUMBERS',
        description: `${repeats.length} números duplicados em sequência`,
        data: repeats.slice(0, 5)
      })
    }
    
    // Verificar padrões anormais (números alternando de forma suspeita)
    const firstTen = roulette.rawNumbers.slice(0, 10)
    const uniqueInFirstTen = new Set(firstTen).size
    if (uniqueInFirstTen < 5) {
      issues.push({
        severity: 'HIGH',
        type: 'SUSPICIOUS_PATTERN',
        description: `Apenas ${uniqueInFirstTen} números únicos nos últimos 10 (possível alternância incorreta)`,
        data: firstTen
      })
      
      ANALYSIS.issues.incorrectNumbers.push({
        rouletteId: roulette.id,
        pattern: firstTen,
        uniqueCount: uniqueInFirstTen
      })
    }
  }
  
  // PROBLEMA 3: Mensagens duplicadas
  const messageTimestamps = roulette.messages.map(m => m.timestamp)
  const duplicateTimestamps = messageTimestamps.filter((t, i) => 
    messageTimestamps.indexOf(t) !== i
  )
  
  if (duplicateTimestamps.length > 0) {
    issues.push({
      severity: 'MEDIUM',
      type: 'DUPLICATE_MESSAGES',
      description: `${duplicateTimestamps.length} mensagens com timestamp duplicado`,
      possibleCauses: [
        'Reconexões causando re-envio',
        'API enviando mensagens duplicadas',
        'Cliente processando mensagens múltiplas vezes'
      ]
    })
    
    ANALYSIS.issues.duplicateMessages.push({
      rouletteId: roulette.id,
      count: duplicateTimestamps.length
    })
  }
  
  // PROBLEMA 4: Taxa de atualização
  const duration = (roulette.lastMessageTime - roulette.firstMessageTime) / 1000
  const updatesPerMinute = duration > 0 ? (roulette.totalUpdates / duration) * 60 : 0
  
  if (updatesPerMinute > 20) {
    issues.push({
      severity: 'LOW',
      type: 'HIGH_UPDATE_RATE',
      description: `Taxa muito alta: ${updatesPerMinute.toFixed(1)} atualizações/minuto`,
      possibleCauses: [
        'Múltiplas fontes enviando dados simultaneamente',
        'Mensagens duplicadas',
        'API muito verbosa'
      ]
    })
  }
  
  return issues
}

function generateReport() {
  console.log('\n')
  console.log('═'.repeat(100))
  console.log('🔬 RELATÓRIO COMPLETO DE DIAGNÓSTICO DO SISTEMA')
  console.log('═'.repeat(100))
  console.log('\n')
  
  const duration = (Date.now() - ANALYSIS.startTime) / 1000
  
  // ========== RESUMO EXECUTIVO ==========
  console.log('📊 RESUMO EXECUTIVO')
  console.log('─'.repeat(100))
  console.log(`⏱️  Duração: ${duration.toFixed(1)}s`)
  console.log(`📨 Mensagens totais: ${ANALYSIS.totalMessages}`)
  console.log(`🎰 Roletas monitoradas: ${ANALYSIS.roulettes.size}`)
  console.log(`🚨 Problemas críticos: ${ANALYSIS.issues.incorrectNumbers.length + ANALYSIS.issues.insufficientNumbers.length}`)
  console.log('\n')
  
  // ========== ANÁLISE POR ROLETA ==========
  console.log('🎰 ANÁLISE DETALHADA POR ROLETA')
  console.log('─'.repeat(100))
  
  const roulettesArray = Array.from(ANALYSIS.roulettes.values())
  roulettesArray.forEach((roulette, index) => {
    console.log(`\n${index + 1}. ${roulette.id}`)
    console.log(`   📊 Números armazenados: ${roulette.numbers.length}`)
    console.log(`   📈 Máximo recebido: ${roulette.maxHistoryReceived}`)
    console.log(`   🔄 Total de atualizações: ${roulette.totalUpdates}`)
    console.log(`   📨 Mensagens recebidas: ${ANALYSIS.messagesPerRoulette.get(roulette.id) || 0}`)
    
    if (roulette.numbers.length > 0) {
      console.log(`   🎲 Primeiros 10: [${roulette.numbers.slice(0, 10).join(', ')}]`)
      console.log(`   🎲 Últimos 10: [${roulette.numbers.slice(-10).join(', ')}]`)
    }
    
    // Tipos de mensagens
    if (roulette.messageTypes.size > 0) {
      console.log(`   📋 Tipos de mensagens:`)
      roulette.messageTypes.forEach((count, type) => {
        console.log(`      - ${type}: ${count}`)
      })
    }
    
    // Análise de problemas
    const issues = analyzeRoulette(roulette)
    if (issues.length > 0) {
      console.log(`   ⚠️  PROBLEMAS IDENTIFICADOS: ${issues.length}`)
      issues.forEach((issue, i) => {
        console.log(`      ${i + 1}. [${issue.severity}] ${issue.type}`)
        console.log(`         ${issue.description}`)
        if (issue.possibleCauses) {
          console.log(`         Causas possíveis:`)
          issue.possibleCauses.forEach(cause => {
            console.log(`            - ${cause}`)
          })
        }
        if (issue.data) {
          console.log(`         Dados: ${JSON.stringify(issue.data)}`)
        }
      })
    } else {
      console.log(`   ✅ Nenhum problema identificado`)
    }
  })
  
  console.log('\n')
  
  // ========== PROBLEMAS GLOBAIS ==========
  console.log('🚨 PROBLEMAS GLOBAIS IDENTIFICADOS')
  console.log('─'.repeat(100))
  
  let totalIssues = 0
  
  if (ANALYSIS.issues.insufficientNumbers.length > 0) {
    totalIssues++
    console.log(`\n${totalIssues}. QUANTIDADE INSUFICIENTE DE NÚMEROS`)
    console.log(`   Roletas afetadas: ${ANALYSIS.issues.insufficientNumbers.length}`)
    ANALYSIS.issues.insufficientNumbers.forEach(issue => {
      console.log(`      - ${issue.rouletteId}: ${issue.maxReceived} números (${issue.totalUpdates} atualizações)`)
    })
    console.log(`   ❗ CAUSAS PROVÁVEIS:`)
    console.log(`      1. Roletas recém-iniciadas (pouco histórico disponível)`)
    console.log(`      2. API não envia histórico completo no primeiro connect`)
    console.log(`      3. Falta de mensagens 'history' com snapshot completo`)
    console.log(`      4. maxHistorySize (500) não está sendo respeitado pela API`)
  }
  
  if (ANALYSIS.issues.incorrectNumbers.length > 0) {
    totalIssues++
    console.log(`\n${totalIssues}. NÚMEROS INCORRETOS ALTERNADOS`)
    console.log(`   Roletas afetadas: ${ANALYSIS.issues.incorrectNumbers.length}`)
    ANALYSIS.issues.incorrectNumbers.forEach(issue => {
      console.log(`      - ${issue.rouletteId}: padrão suspeito [${issue.pattern.join(', ')}]`)
      console.log(`        Apenas ${issue.uniqueCount} números únicos em 10 posições`)
    })
    console.log(`   ❗ CAUSAS PROVÁVEIS:`)
    console.log(`      1. Mensagens de múltiplas roletas sendo misturadas`)
    console.log(`      2. Filtro de roleta selecionada não funcionando corretamente`)
    console.log(`      3. selectedRouletteRef desatualizado durante processamento`)
    console.log(`      4. Race condition entre mensagens de diferentes roletas`)
  }
  
  if (ANALYSIS.issues.duplicateMessages.length > 0) {
    totalIssues++
    console.log(`\n${totalIssues}. MENSAGENS DUPLICADAS`)
    console.log(`   Roletas afetadas: ${ANALYSIS.issues.duplicateMessages.length}`)
    ANALYSIS.issues.duplicateMessages.forEach(issue => {
      console.log(`      - ${issue.rouletteId}: ${issue.count} duplicatas`)
    })
    console.log(`   ❗ CAUSAS PROVÁVEIS:`)
    console.log(`      1. Reconexões automáticas causando re-processamento`)
    console.log(`      2. API enviando mensagens duplicadas`)
    console.log(`      3. Cliente não detectando duplicatas`)
  }
  
  if (ANALYSIS.issues.historyTruncation.length > 0) {
    totalIssues++
    console.log(`\n${totalIssues}. TRUNCAMENTO DE HISTÓRICO`)
    console.log(`   Ocorrências: ${ANALYSIS.issues.historyTruncation.length}`)
    ANALYSIS.issues.historyTruncation.forEach(issue => {
      console.log(`      - ${issue.rouletteId}: ${issue.oldLength} → ${issue.newLength} (perdeu ${issue.diff})`)
    })
    console.log(`   ❗ CAUSAS PROVÁVEIS:`)
    console.log(`      1. slice(0, maxHistorySize) sendo aplicado incorretamente`)
    console.log(`      2. API enviando histórico parcial`)
    console.log(`      3. Cliente substituindo histórico ao invés de mesclar`)
  }
  
  if (ANALYSIS.issues.invalidNumbers.length > 0) {
    totalIssues++
    console.log(`\n${totalIssues}. NÚMEROS INVÁLIDOS`)
    console.log(`   Ocorrências: ${ANALYSIS.issues.invalidNumbers.length}`)
    ANALYSIS.issues.invalidNumbers.forEach(issue => {
      console.log(`      - ${issue.rouletteId}: [${issue.invalidNumbers.join(', ')}]`)
    })
    console.log(`   ❗ CAUSAS PROVÁVEIS:`)
    console.log(`      1. API enviando números fora do range 0-37`)
    console.log(`      2. Parsing incorreto de strings para números`)
    console.log(`      3. Corrupção de dados durante transmissão`)
  }
  
  if (totalIssues === 0) {
    console.log(`✅ Nenhum problema global identificado!`)
  }
  
  console.log('\n')
  
  // ========== RECOMENDAÇÕES ==========
  console.log('💡 RECOMENDAÇÕES DE CORREÇÃO')
  console.log('─'.repeat(100))
  console.log(`\n📋 LISTA DE CORREÇÕES NECESSÁRIAS:\n`)
  
  let recommendationNumber = 1
  
  if (ANALYSIS.issues.insufficientNumbers.length > 0) {
    console.log(`${recommendationNumber}. IMPLEMENTAR SOLICITAÇÃO DE HISTÓRICO COMPLETO`)
    console.log(`   Ao conectar ou selecionar roleta, enviar mensagem explícita:`)
    console.log(`   { type: 'subscribe', roulette: 'id', limit: 500 }`)
    console.log(`   E aguardar resposta 'history' antes de considerar dados prontos\n`)
    recommendationNumber++
  }
  
  if (ANALYSIS.issues.incorrectNumbers.length > 0) {
    console.log(`${recommendationNumber}. FORTALECER FILTRO DE ROLETA SELECIONADA`)
    console.log(`   - Garantir que selectedRouletteRef é atualizado ANTES de processar mensagens`)
    console.log(`   - Adicionar validação: if (message.roulette !== selectedRouletteRef.current) return`)
    console.log(`   - Usar lock/semaphore para evitar race conditions`)
    console.log(`   - Adicionar log detalhado de qual roleta cada mensagem pertence\n`)
    recommendationNumber++
  }
  
  if (ANALYSIS.issues.duplicateMessages.length > 0) {
    console.log(`${recommendationNumber}. IMPLEMENTAR DEDUPLICAÇÃO DE MENSAGENS`)
    console.log(`   - Manter Set<messageId> de mensagens já processadas`)
    console.log(`   - Usar timestamp + roulette + number como chave única`)
    console.log(`   - Limpar Set periodicamente (ex: a cada 5 minutos)\n`)
    recommendationNumber++
  }
  
  if (ANALYSIS.issues.historyTruncation.length > 0) {
    console.log(`${recommendationNumber}. REVISAR LÓGICA DE ATUALIZAÇÃO DE HISTÓRICO`)
    console.log(`   - Nunca substituir histórico completo, apenas adicionar novos números`)
    console.log(`   - Aplicar slice(0, 500) apenas DEPOIS de adicionar novos números`)
    console.log(`   - Manter histórico em ref para evitar perda durante re-renders\n`)
    recommendationNumber++
  }
  
  console.log(`${recommendationNumber}. ADICIONAR VALIDAÇÃO RIGOROSA DE DADOS`)
  console.log(`   - Validar range: 0 <= number <= 37`)
  console.log(`   - Validar timestamp: não pode ser futuro`)
  console.log(`   - Validar color: deve corresponder ao número`)
  console.log(`   - Rejeitar mensagens com dados inválidos\n`)
  recommendationNumber++
  
  console.log(`${recommendationNumber}. IMPLEMENTAR LOGS DE DEBUG ESTRUTURADOS`)
  console.log(`   - Adicionar prefixo [ROULETTE_ID] em todos os logs`)
  console.log(`   - Log de TODAS as mensagens recebidas com timestamp`)
  console.log(`   - Log de TODAS as atualizações de estado`)
  console.log(`   - Facilitar rastreamento de fluxo de dados\n`)
  
  console.log('═'.repeat(100))
  console.log('\n')
}

// ========================================
// INICIAR ANÁLISE
// ========================================

function startAnalysis() {
  log('🚀', 'Iniciando análise profunda do sistema...')
  console.log('\n')
  
  const ws = new WebSocket(CONFIG.WS_URL)
  
  ws.on('open', () => {
    log('✅', 'Conectado ao WebSocket')
    ws.send(JSON.stringify({ type: 'get_roulettes' }))
    
    setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'ping' }))
      }
    }, 30000)
  })
  
  ws.on('message', (data) => {
    processMessage(data)
  })
  
  ws.on('error', (error) => {
    log('❌', `Erro: ${error.message}`)
  })
  
  setTimeout(() => {
    log('⏱️', 'Análise finalizada!')
    ws.close()
    
    setTimeout(() => {
      generateReport()
      process.exit(0)
    }, 1000)
  }, CONFIG.TEST_DURATION)
}

console.log('\n')
console.log('═'.repeat(100))
console.log('🔬 ANÁLISE PROFUNDA DO SISTEMA - DIAGNÓSTICO DE PROBLEMAS')
console.log('═'.repeat(100))
console.log('\n')

startAnalysis()
