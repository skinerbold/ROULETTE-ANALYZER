/**
 * ========================================
 * TESTE AO VIVO - ESTRATÉGIAS COM WEBSOCKET REAL
 * ========================================
 * 
 * Este script conecta ao WebSocket real da roleta e:
 * - Recebe números ao vivo
 * - Testa todas as 348 estratégias em tempo real
 * - Valida cálculos de GREEN/RED
 * - Detecta inconsistências
 * - Monitora performance
 * - Gera relatório detalhado
 * 
 * Duração: Ilimitada (CTRL+C para parar)
 * Execução: node test-live-strategies.js
 */

const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');

// ========================================
// CONFIGURAÇÕES
// ========================================
const WEBSOCKET_URL = 'wss://roulette-soulver.railway.app';
const MIN_NUMBERS_TO_TEST = 50; // Mínimo de números para começar testes
const MAX_NUMBERS_BUFFER = 500; // Máximo de números armazenados
const TEST_INTERVAL_MS = 5000; // Testar a cada 5 segundos

// ========================================
// CORES PARA OUTPUT
// ========================================
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function log(msg, color = 'reset') {
  const timestamp = new Date().toLocaleTimeString('pt-BR');
  console.log(`${colors[color]}[${timestamp}] ${msg}${colors.reset}`);
}

function logSection(title) {
  console.log(`\n${colors.bright}${colors.cyan}${'='.repeat(80)}`);
  console.log(`  ${title}`);
  console.log(`${'='.repeat(80)}${colors.reset}\n`);
}

// ========================================
// ESTADO GLOBAL
// ========================================
const state = {
  connected: false,
  numbersReceived: [],
  totalNumbersReceived: 0,
  testRuns: 0,
  lastTestTime: null,
  errors: [],
  warnings: [],
  strategiesWithIssues: new Map(),
  performanceMetrics: {
    minTime: Infinity,
    maxTime: 0,
    avgTime: 0,
    totalTime: 0
  }
};

// ========================================
// CARREGAR ESTRATÉGIAS
// ========================================
function loadStrategiesFromFile() {
  try {
    const strategiesPath = path.join(__dirname, 'src', 'lib', 'strategies.ts');
    const content = fs.readFileSync(strategiesPath, 'utf-8');
    
    const strategies = [];
    const strategyRegex = /{\s*id:\s*(\d+),\s*name:\s*['"`]([^'"`]+)['"`],\s*numbers:\s*\[([\d,\s]+)\]/g;
    
    let match;
    while ((match = strategyRegex.exec(content)) !== null) {
      const [, id, name, numbersStr] = match;
      const numbers = numbersStr.split(',').map(n => parseInt(n.trim())).filter(n => !isNaN(n));
      
      if (numbers.length > 0) {
        strategies.push({
          id: parseInt(id),
          name: name.trim(),
          numbers: numbers
        });
      }
    }
    
    return strategies;
  } catch (error) {
    log(`ERRO ao carregar estratégias: ${error.message}`, 'red');
    return [];
  }
}

// ========================================
// LÓGICA DE ANÁLISE (IGUAL AO FRONT-END)
// ========================================
function analyzeStrategy(strategyNumbers, numbersArray, greenRedAttempts = 3) {
  const results = {
    totalGreen: 0,
    totalRed: 0,
    activations: [],
    profit: 0,
    errors: []
  };

  try {
    const reversedArray = [...numbersArray].reverse();
    
    let i = 0;
    while (i < reversedArray.length) {
      const currentNum = reversedArray[i];
      
      if (strategyNumbers.includes(currentNum)) {
        let foundGreen = false;
        let attemptsCount = 0;
        let greenIndex = -1;
        
        for (let j = 1; j <= greenRedAttempts; j++) {
          const checkIndex = i + j;
          if (checkIndex >= reversedArray.length) break;
          
          attemptsCount = j;
          if (strategyNumbers.includes(reversedArray[checkIndex])) {
            foundGreen = true;
            greenIndex = checkIndex;
            break;
          }
        }
        
        if (foundGreen) {
          results.totalGreen++;
          const chipCount = strategyNumbers.length;
          const profit = (36 - chipCount) - (chipCount * attemptsCount);
          results.profit += profit;
          
          results.activations.push({
            position: i,
            number: currentNum,
            result: 'GREEN',
            attempts: attemptsCount,
            profit: profit
          });
          
          i = greenIndex + 1;
        } else {
          results.totalRed++;
          const chipCount = strategyNumbers.length;
          const loss = -(chipCount * (greenRedAttempts + 1));
          results.profit += loss;
          
          results.activations.push({
            position: i,
            number: currentNum,
            result: 'RED',
            attempts: Math.min(greenRedAttempts, reversedArray.length - i - 1),
            profit: loss
          });
          
          i = i + greenRedAttempts + 1;
        }
      } else {
        i++;
      }
    }
  } catch (error) {
    results.errors.push(`Erro ao analisar: ${error.message}`);
  }

  return results;
}

// ========================================
// VALIDAÇÕES
// ========================================
function validateStrategy(strategy, numbers) {
  const issues = [];
  
  // 1. Validar estrutura da estratégia
  if (!strategy.id || !strategy.name || !Array.isArray(strategy.numbers)) {
    issues.push({
      severity: 'CRITICAL',
      message: 'Estrutura da estratégia inválida'
    });
    return issues;
  }
  
  // 2. Validar números da estratégia
  const invalidNums = strategy.numbers.filter(n => n < 0 || n > 36);
  if (invalidNums.length > 0) {
    issues.push({
      severity: 'CRITICAL',
      message: `Números fora do range: [${invalidNums.join(', ')}]`
    });
  }
  
  // 3. Testar análise com diferentes casas
  for (let houses = 1; houses <= 6; houses++) {
    try {
      const result = analyzeStrategy(strategy.numbers, numbers, houses);
      
      // Validar valores negativos
      if (result.totalGreen < 0 || result.totalRed < 0) {
        issues.push({
          severity: 'CRITICAL',
          message: `${houses} casa(s): Valores negativos detectados (G:${result.totalGreen} R:${result.totalRed})`
        });
      }
      
      // Validar soma de ativações
      if (result.totalGreen + result.totalRed !== result.activations.length) {
        issues.push({
          severity: 'MAJOR',
          message: `${houses} casa(s): Soma G+R (${result.totalGreen + result.totalRed}) ≠ Ativações (${result.activations.length})`
        });
      }
      
      // Validar erros internos
      if (result.errors.length > 0) {
        issues.push({
          severity: 'CRITICAL',
          message: `${houses} casa(s): ${result.errors[0]}`
        });
      }
      
      // Verificar comportamento anormal (sem ativações com muitos números)
      if (numbers.length >= 100 && result.activations.length === 0 && strategy.numbers.length >= 5) {
        issues.push({
          severity: 'WARNING',
          message: `${houses} casa(s): Nenhuma ativação em 100+ números (pode ser normal)`
        });
      }
      
    } catch (error) {
      issues.push({
        severity: 'CRITICAL',
        message: `${houses} casa(s): Exceção - ${error.message}`
      });
    }
  }
  
  return issues;
}

// ========================================
// TESTAR TODAS AS ESTRATÉGIAS
// ========================================
function testAllStrategies(strategies, numbers) {
  logSection(`🧪 TESTE #${state.testRuns + 1} - ${numbers.length} NÚMEROS AO VIVO`);
  
  const startTime = Date.now();
  let criticalCount = 0;
  let majorCount = 0;
  let warningCount = 0;
  const strategiesWithNewIssues = [];
  
  log(`Testando ${strategies.length} estratégias...`, 'yellow');
  
  strategies.forEach((strategy, idx) => {
    const issues = validateStrategy(strategy, numbers);
    
    if (issues.length > 0) {
      const criticalIssues = issues.filter(i => i.severity === 'CRITICAL');
      const majorIssues = issues.filter(i => i.severity === 'MAJOR');
      const warningIssues = issues.filter(i => i.severity === 'WARNING');
      
      criticalCount += criticalIssues.length;
      majorCount += majorIssues.length;
      warningCount += warningIssues.length;
      
      // Registrar estratégia com problemas
      const key = `${strategy.id}`;
      if (!state.strategiesWithIssues.has(key)) {
        state.strategiesWithIssues.set(key, {
          strategy: strategy,
          issues: issues,
          firstSeen: new Date().toISOString()
        });
        
        strategiesWithNewIssues.push({
          strategy: strategy,
          issues: issues
        });
      }
    }
    
    // Log de progresso
    if ((idx + 1) % 100 === 0) {
      log(`  Processadas ${idx + 1}/${strategies.length}...`, 'cyan');
    }
  });
  
  const duration = Date.now() - startTime;
  
  // Atualizar métricas de performance
  state.performanceMetrics.minTime = Math.min(state.performanceMetrics.minTime, duration);
  state.performanceMetrics.maxTime = Math.max(state.performanceMetrics.maxTime, duration);
  state.performanceMetrics.totalTime += duration;
  state.performanceMetrics.avgTime = state.performanceMetrics.totalTime / (state.testRuns + 1);
  
  // Relatório
  log(`\n${'─'.repeat(80)}`, 'cyan');
  log(`Tempo de execução: ${duration}ms`, 'cyan');
  log(`Performance: ${(duration / strategies.length).toFixed(2)}ms por estratégia`, 'cyan');
  
  if (criticalCount === 0 && majorCount === 0 && warningCount === 0) {
    log(`\n✅ NENHUM PROBLEMA ENCONTRADO!`, 'green');
    log(`Todas as ${strategies.length} estratégias funcionando perfeitamente!`, 'green');
  } else {
    log(`\n⚠️  PROBLEMAS DETECTADOS:`, 'yellow');
    if (criticalCount > 0) log(`  🔴 CRÍTICO: ${criticalCount}`, 'red');
    if (majorCount > 0) log(`  🟡 MAJOR: ${majorCount}`, 'yellow');
    if (warningCount > 0) log(`  ⚪ WARNING: ${warningCount}`, 'cyan');
  }
  
  // Mostrar novos problemas detectados
  if (strategiesWithNewIssues.length > 0) {
    log(`\n🆕 NOVOS PROBLEMAS DETECTADOS (${strategiesWithNewIssues.length} estratégias):`, 'red');
    
    strategiesWithNewIssues.slice(0, 5).forEach(item => {
      log(`\n  Estratégia #${item.strategy.id}: ${item.strategy.name}`, 'yellow');
      log(`    Fichas: ${item.strategy.numbers.length} | Números: [${item.strategy.numbers.slice(0, 10).join(', ')}...]`, 'cyan');
      
      item.issues.forEach(issue => {
        const icon = issue.severity === 'CRITICAL' ? '🔴' : issue.severity === 'MAJOR' ? '🟡' : '⚪';
        log(`    ${icon} ${issue.message}`, issue.severity === 'CRITICAL' ? 'red' : 'yellow');
      });
    });
    
    if (strategiesWithNewIssues.length > 5) {
      log(`\n  (Mostrando 5 de ${strategiesWithNewIssues.length} problemas...)`, 'cyan');
    }
  }
  
  state.testRuns++;
  state.lastTestTime = new Date();
}

// ========================================
// WEBSOCKET
// ========================================
function connectWebSocket() {
  log('Conectando ao WebSocket...', 'yellow');
  
  const ws = new WebSocket(WEBSOCKET_URL);
  
  ws.on('open', () => {
    state.connected = true;
    log('✅ Conectado ao WebSocket!', 'green');
    log(`URL: ${WEBSOCKET_URL}`, 'cyan');
    log(`Aguardando números da roleta...`, 'cyan');
  });
  
  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data.toString());
      
      if (message.type === 'number' && typeof message.number === 'number') {
        const num = message.number;
        
        // Adicionar número ao buffer
        state.numbersReceived.unshift(num); // Adicionar no início (mais recente)
        state.totalNumbersReceived++;
        
        // Limitar buffer
        if (state.numbersReceived.length > MAX_NUMBERS_BUFFER) {
          state.numbersReceived.pop();
        }
        
        log(`📊 Número recebido: ${num} | Total: ${state.totalNumbersReceived} | Buffer: ${state.numbersReceived.length}`, 'green');
      }
    } catch (error) {
      log(`Erro ao processar mensagem: ${error.message}`, 'red');
    }
  });
  
  ws.on('error', (error) => {
    log(`❌ Erro no WebSocket: ${error.message}`, 'red');
    state.connected = false;
  });
  
  ws.on('close', () => {
    log('❌ WebSocket desconectado!', 'red');
    state.connected = false;
    
    // Tentar reconectar após 5 segundos
    log('Tentando reconectar em 5 segundos...', 'yellow');
    setTimeout(() => connectWebSocket(), 5000);
  });
}

// ========================================
// GERAR RELATÓRIO FINAL
// ========================================
function generateFinalReport() {
  logSection('📊 RELATÓRIO FINAL - TESTES AO VIVO');
  
  log(`Total de números recebidos: ${state.totalNumbersReceived}`, 'cyan');
  log(`Total de testes executados: ${state.testRuns}`, 'cyan');
  log(`Buffer atual: ${state.numbersReceived.length} números`, 'cyan');
  
  if (state.testRuns > 0) {
    log(`\nPerformance:`, 'cyan');
    log(`  Tempo mínimo: ${state.performanceMetrics.minTime}ms`, 'cyan');
    log(`  Tempo máximo: ${state.performanceMetrics.maxTime}ms`, 'cyan');
    log(`  Tempo médio: ${state.performanceMetrics.avgTime.toFixed(0)}ms`, 'cyan');
  }
  
  if (state.strategiesWithIssues.size > 0) {
    log(`\n⚠️  ESTRATÉGIAS COM PROBLEMAS (${state.strategiesWithIssues.size}):`, 'red');
    
    const sorted = Array.from(state.strategiesWithIssues.entries())
      .sort((a, b) => {
        const aCritical = a[1].issues.filter(i => i.severity === 'CRITICAL').length;
        const bCritical = b[1].issues.filter(i => i.severity === 'CRITICAL').length;
        return bCritical - aCritical;
      });
    
    sorted.slice(0, 10).forEach(([key, data]) => {
      const criticalCount = data.issues.filter(i => i.severity === 'CRITICAL').length;
      const majorCount = data.issues.filter(i => i.severity === 'MAJOR').length;
      const warningCount = data.issues.filter(i => i.severity === 'WARNING').length;
      
      log(`\n  ID ${data.strategy.id}: ${data.strategy.name}`, 'yellow');
      log(`    Fichas: ${data.strategy.numbers.length}`, 'cyan');
      if (criticalCount > 0) log(`    🔴 Crítico: ${criticalCount}`, 'red');
      if (majorCount > 0) log(`    🟡 Major: ${majorCount}`, 'yellow');
      if (warningCount > 0) log(`    ⚪ Warning: ${warningCount}`, 'cyan');
      log(`    Detectado em: ${new Date(data.firstSeen).toLocaleString('pt-BR')}`, 'cyan');
    });
    
    if (sorted.length > 10) {
      log(`\n  (Mostrando 10 de ${sorted.length} estratégias com problemas)`, 'cyan');
    }
    
    // Salvar relatório em arquivo
    const reportPath = path.join(__dirname, 'test-live-report.json');
    const report = {
      timestamp: new Date().toISOString(),
      totalNumbers: state.totalNumbersReceived,
      totalTests: state.testRuns,
      performance: state.performanceMetrics,
      strategiesWithIssues: Array.from(state.strategiesWithIssues.entries()).map(([key, data]) => ({
        id: data.strategy.id,
        name: data.strategy.name,
        chips: data.strategy.numbers.length,
        issues: data.issues,
        firstSeen: data.firstSeen
      }))
    };
    
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    log(`\n💾 Relatório salvo em: ${reportPath}`, 'green');
  } else {
    log(`\n✅ NENHUM PROBLEMA DETECTADO!`, 'green');
    log(`Todas as estratégias testadas estão funcionando perfeitamente!`, 'green');
  }
}

// ========================================
// LOOP DE TESTES
// ========================================
function startTestLoop(strategies) {
  setInterval(() => {
    if (state.numbersReceived.length >= MIN_NUMBERS_TO_TEST) {
      testAllStrategies(strategies, state.numbersReceived);
    } else {
      log(`Aguardando mais números... (${state.numbersReceived.length}/${MIN_NUMBERS_TO_TEST})`, 'yellow');
    }
  }, TEST_INTERVAL_MS);
}

// ========================================
// MAIN
// ========================================
async function main() {
  console.clear();
  
  logSection('🎰 TESTE AO VIVO - ESTRATÉGIAS COM WEBSOCKET REAL 🎰');
  
  log('Carregando estratégias...', 'yellow');
  const strategies = loadStrategiesFromFile();
  
  if (strategies.length === 0) {
    log('❌ ERRO: Nenhuma estratégia carregada!', 'red');
    process.exit(1);
  }
  
  log(`✅ ${strategies.length} estratégias carregadas`, 'green');
  
  log(`\nConfigurações:`, 'cyan');
  log(`  WebSocket: ${WEBSOCKET_URL}`, 'cyan');
  log(`  Mínimo de números: ${MIN_NUMBERS_TO_TEST}`, 'cyan');
  log(`  Buffer máximo: ${MAX_NUMBERS_BUFFER}`, 'cyan');
  log(`  Intervalo de testes: ${TEST_INTERVAL_MS / 1000}s`, 'cyan');
  
  // Conectar ao WebSocket
  connectWebSocket();
  
  // Iniciar loop de testes
  log(`\nIniciando loop de testes...`, 'yellow');
  log(`Pressione CTRL+C para parar\n`, 'yellow');
  
  startTestLoop(strategies);
  
  // Capturar CTRL+C para gerar relatório final
  process.on('SIGINT', () => {
    log('\n\n⏹️  Parando testes...', 'yellow');
    generateFinalReport();
    process.exit(0);
  });
}

// Executar
main().catch(error => {
  console.error('Erro fatal:', error);
  process.exit(1);
});
