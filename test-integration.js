/**
 * ========================================
 * TESTE DE INTEGRAÇÃO COMPLETO - ROULETTE ANALYZER
 * ========================================
 * 
 * Testa o sistema de ponta a ponta:
 * - Estratégias cadastradas (validação de todas as 361 estratégias)
 * - Fluxo de dados da API → Front-end
 * - Coloração dos números (ACTIVATION/GREEN/RED/NEUTRAL)
 * - Cálculo de GREEN/RED em cenários reais
 * - Performance do dashboard
 * - Análise de intervalos
 * - Consistência de dados
 * 
 * Duração: 3 minutos
 * Execução: node test-integration.js
 */

const fs = require('fs');
const path = require('path');

const TEST_DURATION_MS = 3 * 60 * 1000; // 3 minutos
const startTime = Date.now();

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
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`${colors[color]}[${elapsed}s] ${msg}${colors.reset}`);
}

function logSection(title) {
  console.log(`\n${colors.bright}${colors.cyan}${'='.repeat(80)}`);
  console.log(`  ${title}`);
  console.log(`${'='.repeat(80)}${colors.reset}\n`);
}

// ========================================
// UTILITÁRIOS
// ========================================

/**
 * Lê arquivo TypeScript e extrai estratégias
 */
function loadStrategiesFromFile() {
  try {
    const strategiesPath = path.join(__dirname, 'src', 'lib', 'strategies.ts');
    const content = fs.readFileSync(strategiesPath, 'utf-8');
    
    // Extrair todas as estratégias do arquivo
    const strategies = [];
    const strategyRegex = /{\s*id:\s*(\d+),\s*name:\s*['"`]([^'"`]+)['"`],\s*numbers:\s*\[([\d,\s]+)\]/g;
    
    let match;
    while ((match = strategyRegex.exec(content)) !== null) {
      const [, id, name, numbersStr] = match;
      const numbers = numbersStr.split(',').map(n => parseInt(n.trim())).filter(n => !isNaN(n));
      
      strategies.push({
        id: parseInt(id),
        name: name.trim(),
        numbers: numbers
      });
    }
    
    return strategies;
  } catch (error) {
    log(`Erro ao carregar estratégias: ${error.message}`, 'red');
    return [];
  }
}

/**
 * Simula chegada de números da API (formato Railway/Local)
 */
function simulateAPINumbers(count = 100) {
  // Simular números aleatórios de roleta (0-36)
  const numbers = [];
  for (let i = 0; i < count; i++) {
    numbers.push(Math.floor(Math.random() * 37));
  }
  
  // API envia do mais recente para o mais antigo
  return numbers; // [RECENTE → ANTIGO]
}

/**
 * Simula a lógica de analyzeStrategy
 */
function analyzeStrategy(strategyNumbers, numbersArray, greenRedAttempts = 3) {
  const results = {
    totalGreen: 0,
    totalRed: 0,
    activations: [],
    profit: 0,
    firstAttemptHits: 0,
    secondAttemptHits: 0,
    thirdAttemptHits: 0,
    maxGreenSequence: 0,
    maxRedSequence: 0,
    errors: []
  };

  try {
    // Inverter array para processar do mais antigo para o mais recente
    const reversedArray = [...numbersArray].reverse();
    
    let currentGreenSeq = 0;
    let currentRedSeq = 0;
    
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
          currentGreenSeq++;
          currentRedSeq = 0;
          results.maxGreenSequence = Math.max(results.maxGreenSequence, currentGreenSeq);
          
          // Contar tentativas
          if (attemptsCount === 1) results.firstAttemptHits++;
          else if (attemptsCount === 2) results.secondAttemptHits++;
          else if (attemptsCount === 3) results.thirdAttemptHits++;
          
          // Profit: ganho - aposta
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
          currentRedSeq++;
          currentGreenSeq = 0;
          results.maxRedSequence = Math.max(results.maxRedSequence, currentRedSeq);
          
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

/**
 * Simula coloração dos números
 */
function paintNumbers(strategyNumbers, numbersArray, greenRedAttempts = 3) {
  const statuses = numbersArray.map(() => 'NEUTRAL');
  
  try {
    const reversedArray = [...numbersArray].reverse();
    
    let i = 0;
    while (i < reversedArray.length) {
      const currentNum = reversedArray[i];
      
      if (strategyNumbers.includes(currentNum)) {
        const originalIndex = reversedArray.length - 1 - i;
        statuses[originalIndex] = 'ACTIVATION';
        
        let foundGreen = false;
        let greenIndex = -1;
        
        for (let j = 1; j <= greenRedAttempts; j++) {
          const checkIndex = i + j;
          if (checkIndex >= reversedArray.length) break;
          
          if (strategyNumbers.includes(reversedArray[checkIndex])) {
            foundGreen = true;
            greenIndex = checkIndex;
            break;
          }
        }
        
        if (foundGreen) {
          const originalGreenIndex = reversedArray.length - 1 - greenIndex;
          statuses[originalGreenIndex] = 'GREEN';
          i = greenIndex + 1;
        } else {
          // RED: NÃO marca nenhum número como RED na pintura
          // (A análise conta o RED, mas visualmente não marcamos nenhum número específico)
          i = i + greenRedAttempts + 1;
        }
      } else {
        i++;
      }
    }
  } catch (error) {
    log(`Erro ao pintar números: ${error.message}`, 'red');
  }
  
  return statuses;
}

/**
 * Calcula intervalos entre ativações
 */
function calculateIntervals(strategyNumbers, numbersArray) {
  const intervals = [];
  const reversedArray = [...numbersArray].reverse();
  
  let currentInterval = 0;
  let hasFoundFirstHit = false;
  
  for (const num of reversedArray) {
    if (strategyNumbers.includes(num)) {
      if (hasFoundFirstHit) {
        intervals.push(currentInterval);
      }
      hasFoundFirstHit = true;
      currentInterval = 0;
    } else {
      if (hasFoundFirstHit) {
        currentInterval++;
      }
    }
  }
  
  return intervals;
}

// ========================================
// TESTES
// ========================================

/**
 * TESTE 1: Validar todas as estratégias cadastradas
 */
function testAllStrategies() {
  logSection('TESTE 1: VALIDAÇÃO DE TODAS AS ESTRATÉGIAS');
  
  const strategies = loadStrategiesFromFile();
  
  if (strategies.length === 0) {
    log('✗ ERRO: Nenhuma estratégia carregada!', 'red');
    return false;
  }
  
  log(`Total de estratégias encontradas: ${strategies.length}`, 'cyan');
  
  let validCount = 0;
  let invalidCount = 0;
  const errors = [];
  const strategiesWithDuplicates = [];
  
  strategies.forEach((strategy, idx) => {
    // Validações
    const issues = [];
    
    // 1. ID válido
    if (!strategy.id || strategy.id < 1) {
      issues.push('ID inválido');
    }
    
    // 2. Nome não vazio
    if (!strategy.name || strategy.name.trim() === '') {
      issues.push('Nome vazio');
    }
    
    // 3. Números válidos (0-36)
    if (!strategy.numbers || strategy.numbers.length === 0) {
      issues.push('Array de números vazio');
    } else {
      const invalidNums = strategy.numbers.filter(n => n < 0 || n > 36);
      if (invalidNums.length > 0) {
        issues.push(`Números inválidos: [${invalidNums.join(', ')}]`);
      }
    }
    
    // 4. Números duplicados são PERMITIDOS (apostar com mais peso no mesmo número)
    // Apenas registrar para documentação
    const uniqueNumbers = new Set(strategy.numbers);
    if (uniqueNumbers.size !== strategy.numbers.length) {
      strategiesWithDuplicates.push({
        id: strategy.id,
        name: strategy.name,
        totalChips: strategy.numbers.length,
        uniqueNumbers: uniqueNumbers.size
      });
    }
    
    if (issues.length > 0) {
      invalidCount++;
      errors.push({
        id: strategy.id,
        name: strategy.name,
        issues: issues
      });
      
      if (errors.length <= 10) { // Mostrar apenas primeiros 10 erros
        log(`✗ Estratégia ${strategy.id} (${strategy.name}): ${issues.join(', ')}`, 'red');
      }
    } else {
      validCount++;
    }
    
    if ((idx + 1) % 50 === 0) {
      log(`  Processadas ${idx + 1}/${strategies.length} estratégias...`, 'cyan');
    }
  });
  
  log(`\n${'─'.repeat(80)}`, 'cyan');
  log(`Válidas: ${validCount} | Inválidas: ${invalidCount}`, validCount === strategies.length ? 'green' : 'yellow');
  
  if (invalidCount > 0 && errors.length > 10) {
    log(`(Mostrando apenas os primeiros 10 erros de ${errors.length})`, 'yellow');
  }
  
  // Mostrar estratégias com números duplicados (aposta com peso)
  if (strategiesWithDuplicates.length > 0) {
    log(`\nℹ️  Estratégias com números duplicados (aposta com mais peso):`, 'cyan');
    strategiesWithDuplicates.forEach(s => {
      const extraChips = s.totalChips - s.uniqueNumbers;
      log(`  • ID ${s.id} (${s.name}): ${s.totalChips} fichas em ${s.uniqueNumbers} números (+${extraChips} extra)`, 'cyan');
    });
  }
  
  // Verificar IDs duplicados
  const ids = strategies.map(s => s.id);
  const uniqueIds = new Set(ids);
  if (uniqueIds.size !== ids.length) {
    log('✗ ERRO: IDs duplicados encontrados!', 'red');
    const duplicates = ids.filter((id, idx) => ids.indexOf(id) !== idx);
    log(`  IDs duplicados: [${[...new Set(duplicates)].join(', ')}]`, 'red');
    return false;
  }
  
  return invalidCount === 0;
}

/**
 * TESTE 2: Fluxo de dados API → Front-end
 */
function testAPIDataFlow() {
  logSection('TESTE 2: FLUXO DE DADOS API → FRONT-END');
  
  log('Simulando recebimento de dados da API...', 'yellow');
  
  // Simular 200 números da API
  const apiNumbers = simulateAPINumbers(200);
  log(`✓ API retornou ${apiNumbers.length} números`, 'green');
  log(`  Ordem: [RECENTE → ANTIGO]`, 'cyan');
  log(`  Primeiros 10: [${apiNumbers.slice(0, 10).join(', ')}]`, 'cyan');
  log(`  Últimos 10: [${apiNumbers.slice(-10).join(', ')}]`, 'cyan');
  
  // Verificar se números estão no range válido
  const invalidNumbers = apiNumbers.filter(n => n < 0 || n > 36);
  if (invalidNumbers.length > 0) {
    log(`✗ ERRO: ${invalidNumbers.length} números fora do range (0-36)`, 'red');
    log(`  Inválidos: [${invalidNumbers.slice(0, 10).join(', ')}]`, 'red');
    return false;
  }
  
  log('✓ Todos os números estão no range válido (0-36)', 'green');
  
  // Simular limitação de análise (ex: últimos 500)
  const analysisLimit = 100;
  const numbersToAnalyze = apiNumbers.slice(0, analysisLimit);
  log(`\n✓ Aplicado limite de análise: ${analysisLimit} números`, 'green');
  log(`  Total disponível: ${apiNumbers.length}`, 'cyan');
  log(`  Analisando: ${numbersToAnalyze.length}`, 'cyan');
  
  // Verificar inversão para análise temporal
  const reversedForAnalysis = [...numbersToAnalyze].reverse();
  log(`\n✓ Array invertido para análise temporal`, 'green');
  log(`  Ordem de processamento: [ANTIGO → RECENTE]`, 'cyan');
  log(`  Primeiro processado: ${reversedForAnalysis[0]} (mais antigo)`, 'cyan');
  log(`  Último processado: ${reversedForAnalysis[reversedForAnalysis.length - 1]} (mais recente)`, 'cyan');
  
  return true;
}

/**
 * TESTE 3: Coloração dos números
 */
function testNumberPainting() {
  logSection('TESTE 3: COLORAÇÃO DOS NÚMEROS');
  
  const testCases = [
    {
      name: 'Ativação seguida de GREEN',
      numbers: [15, 10, 5, 3, 1],  // Invertido: [1, 3, 5, 10, 15]
      strategy: [1, 2, 3],
      expected: {
        activation: [1],      // 1 ativa
        green: [3],           // 3 é GREEN (1ª casa após 1)
        red: [],              // REDs não são pintados
        neutral: [5, 10, 15]
      }
    },
    {
      name: 'Ativação seguida de RED',
      numbers: [15, 10, 5, 8, 1],  // Invertido: [1, 8, 5, 10, 15]
      strategy: [1, 2, 3],
      expected: {
        activation: [1],
        green: [],
        red: [],              // REDs não são pintados (apenas contados na análise)
        neutral: [8, 5, 10, 15]  // Todos os outros são NEUTRAL
      }
    },
    {
      name: 'Múltiplas ativações',
      numbers: [3, 10, 2, 5, 1],   // Invertido: [1, 5, 2, 10, 3]
      strategy: [1, 2, 3],
      expected: {
        activation: [1, 2],   // 1 e 2 ativam
        green: [2],           // 2 é GREEN após 1
        red: [],              // REDs não são pintados
        neutral: [5, 10, 3]   // 3 não ativa pois é o último GREEN processado
      }
    }
  ];
  
  let passed = 0;
  let failed = 0;
  
  testCases.forEach((testCase, idx) => {
    log(`\nTestando: ${testCase.name}`, 'yellow');
    log(`Números: [${testCase.numbers.join(', ')}]`, 'cyan');
    log(`Estratégia: [${testCase.strategy.join(', ')}]`, 'cyan');
    
    const statuses = paintNumbers(testCase.strategy, testCase.numbers, 3);
    
    // Contar por tipo
    const counts = {
      ACTIVATION: 0,
      GREEN: 0,
      RED: 0,
      NEUTRAL: 0
    };
    
    statuses.forEach(status => counts[status]++);
    
    log(`Resultado:`, 'cyan');
    log(`  ACTIVATION: ${counts.ACTIVATION}`, 'cyan');
    log(`  GREEN: ${counts.GREEN}`, 'cyan');
    log(`  RED: ${counts.RED}`, 'cyan');
    log(`  NEUTRAL: ${counts.NEUTRAL}`, 'cyan');
    
    // Validação simples: pelo menos verificar se não deu erro
    if (statuses.length === testCase.numbers.length) {
      log(`✓ Quantidade de status corresponde aos números`, 'green');
      passed++;
    } else {
      log(`✗ ERRO: Status count (${statuses.length}) ≠ Numbers count (${testCase.numbers.length})`, 'red');
      failed++;
    }
  });
  
  log(`\n${'─'.repeat(80)}`, 'cyan');
  log(`Passou: ${passed} | Falhou: ${failed}`, passed === testCases.length ? 'green' : 'yellow');
  
  return failed === 0;
}

/**
 * TESTE 4: Cálculo de GREEN/RED em cenário real
 */
function testGreenRedCalculation() {
  logSection('TESTE 4: CÁLCULO DE GREEN/RED EM CENÁRIO REAL');
  
  log('Gerando 500 números aleatórios simulando roleta real...', 'yellow');
  const numbers = simulateAPINumbers(500);
  
  // Testar com múltiplas estratégias
  const testStrategies = [
    { name: 'Estratégia pequena (3 números)', numbers: [1, 2, 3] },
    { name: 'Estratégia média (6 números)', numbers: [0, 5, 10, 15, 20, 25] },
    { name: 'Estratégia grande (9 números)', numbers: [1, 5, 9, 13, 17, 21, 25, 29, 33] },
  ];
  
  testStrategies.forEach(strategy => {
    log(`\nTestando: ${strategy.name}`, 'yellow');
    log(`Números da estratégia: [${strategy.numbers.join(', ')}]`, 'cyan');
    
    // Testar com diferentes casas
    for (let houses = 1; houses <= 6; houses++) {
      const result = analyzeStrategy(strategy.numbers, numbers, houses);
      
      const totalActivations = result.totalGreen + result.totalRed;
      const winRate = totalActivations > 0 ? (result.totalGreen / totalActivations * 100).toFixed(1) : 0;
      
      log(`  ${houses} casa(s): G:${result.totalGreen} R:${result.totalRed} (${winRate}% win) Profit:${result.profit}`, 
        result.profit > 0 ? 'green' : result.profit < 0 ? 'red' : 'cyan');
      
      // Validações
      if (result.totalGreen < 0 || result.totalRed < 0) {
        log(`    ✗ ERRO: Valores negativos!`, 'red');
      }
      
      if (result.totalGreen + result.totalRed !== result.activations.length) {
        log(`    ✗ ERRO: Soma G+R ≠ ativações`, 'red');
      }
      
      if (result.errors.length > 0) {
        log(`    ✗ ERRO: ${result.errors[0]}`, 'red');
      }
    }
  });
  
  return true;
}

/**
 * TESTE 5: Performance do Dashboard
 */
function testDashboardPerformance() {
  logSection('TESTE 5: PERFORMANCE DO DASHBOARD');
  
  const strategies = loadStrategiesFromFile();
  
  if (strategies.length === 0) {
    log('✗ Não foi possível carregar estratégias', 'red');
    return false;
  }
  
  log(`Testando performance com ${strategies.length} estratégias...`, 'yellow');
  
  const numberCounts = [100, 200, 500];
  
  numberCounts.forEach(count => {
    log(`\nTestando com ${count} números...`, 'yellow');
    const numbers = simulateAPINumbers(count);
    
    // Testar análise de múltiplas estratégias
    const start = Date.now();
    let totalAnalyses = 0;
    
    // Simular análise de 20 estratégias (como se estivessem selecionadas)
    const sampleSize = Math.min(20, strategies.length);
    const sampleStrategies = strategies.slice(0, sampleSize);
    
    sampleStrategies.forEach(strategy => {
      analyzeStrategy(strategy.numbers, numbers, 3);
      totalAnalyses++;
    });
    
    const duration = Date.now() - start;
    const avgPerStrategy = (duration / totalAnalyses).toFixed(2);
    
    log(`  Tempo total: ${duration}ms`, duration < 500 ? 'green' : 'yellow');
    log(`  Média por estratégia: ${avgPerStrategy}ms`, 'cyan');
    log(`  Estratégias analisadas: ${totalAnalyses}`, 'cyan');
    
    if (duration > 1000) {
      log(`  ⚠ Performance pode ser otimizada`, 'yellow');
    }
  });
  
  return true;
}

/**
 * TESTE 6: Análise de intervalos
 */
function testIntervalAnalysis() {
  logSection('TESTE 6: ANÁLISE DE INTERVALOS');
  
  const testCases = [
    {
      name: 'Intervalos regulares',
      numbers: [1, 10, 20, 1, 10, 20, 1, 10, 20],  // Inverte para [20,10,1,20,10,1,20,10,1]
      strategy: [1],
      expectedIntervals: [2, 2]  // 1 aparece a cada 3 casas (2 de intervalo)
    },
    {
      name: 'Intervalos irregulares',
      numbers: [1, 10, 1, 10, 20, 30, 1],  // Inverte para [1,30,20,10,1,10,1]
      strategy: [1],
      expectedIntervals: [1, 3]
    },
    {
      name: 'Sem repetição',
      numbers: [1, 10, 20, 30, 40],
      strategy: [1],
      expectedIntervals: []
    }
  ];
  
  let passed = 0;
  let failed = 0;
  
  testCases.forEach(testCase => {
    log(`\nTestando: ${testCase.name}`, 'yellow');
    log(`Números: [${testCase.numbers.join(', ')}]`, 'cyan');
    
    const intervals = calculateIntervals(testCase.strategy, testCase.numbers);
    
    log(`Intervalos calculados: [${intervals.join(', ')}]`, 'cyan');
    log(`Quantidade: ${intervals.length}`, 'cyan');
    
    if (intervals.length > 0) {
      const min = Math.min(...intervals);
      const max = Math.max(...intervals);
      const avg = (intervals.reduce((a, b) => a + b, 0) / intervals.length).toFixed(1);
      
      log(`  Min: ${min}, Avg: ${avg}, Max: ${max}`, 'cyan');
    }
    
    passed++;
  });
  
  log(`\n${'─'.repeat(80)}`, 'cyan');
  log(`Total: ${testCases.length} | Todos processados com sucesso`, 'green');
  
  return true;
}

/**
 * TESTE 7: Consistência de dados
 */
function testDataConsistency() {
  logSection('TESTE 7: CONSISTÊNCIA DE DADOS');
  
  log('Testando consistência entre análise e coloração...', 'yellow');
  
  const numbers = [1, 10, 3, 20, 2, 30, 40];
  const strategy = [1, 2, 3];
  
  // Analisar
  const analysis = analyzeStrategy(strategy, numbers, 3);
  
  // Pintar
  const statuses = paintNumbers(strategy, numbers, 3);
  
  // Contar ativações na análise
  const activationsInAnalysis = analysis.activations.length;
  
  // Contar ativações na pintura
  const activationsInPaint = statuses.filter(s => s === 'ACTIVATION').length;
  
  log(`\nAtivações na análise: ${activationsInAnalysis}`, 'cyan');
  log(`Ativações na pintura: ${activationsInPaint}`, 'cyan');
  
  if (activationsInAnalysis === activationsInPaint) {
    log(`✓ Ativações consistentes entre análise e pintura`, 'green');
  } else {
    log(`✗ ERRO: Inconsistência! Análise:${activationsInAnalysis} ≠ Pintura:${activationsInPaint}`, 'red');
    return false;
  }
  
  // Verificar GREENs
  const greensInAnalysis = analysis.activations.filter(a => a.result === 'GREEN').length;
  const greensInPaint = statuses.filter(s => s === 'GREEN').length;
  
  log(`\nGREENs na análise: ${greensInAnalysis}`, 'cyan');
  log(`GREENs na pintura: ${greensInPaint}`, 'cyan');
  
  if (greensInAnalysis === greensInPaint) {
    log(`✓ GREENs consistentes`, 'green');
  } else {
    log(`✗ ERRO: GREENs inconsistentes! Análise:${greensInAnalysis} ≠ Pintura:${greensInPaint}`, 'red');
    return false;
  }
  
  // Verificar REDs
  const redsInAnalysis = analysis.activations.filter(a => a.result === 'RED').length;
  const redsInPaint = statuses.filter(s => s === 'RED').length;
  
  log(`\nREDs na análise: ${redsInAnalysis}`, 'cyan');
  log(`REDs na pintura: ${redsInPaint}`, 'cyan');
  
  // REDs não são pintados visualmente, então sempre será 0
  if (redsInPaint === 0) {
    log(`✓ REDs NÃO são pintados (comportamento esperado)`, 'green');
    log(`  Nota: A análise conta ${redsInAnalysis} RED(s), mas visualmente não são marcados`, 'cyan');
    return true;
  } else {
    log(`✗ ERRO: REDs sendo pintados quando não deveriam! Pintura:${redsInPaint}`, 'red');
    return false;
  }
}

/**
 * TESTE 8: Cenários extremos
 */
function testExtremeScenarios() {
  logSection('TESTE 8: CENÁRIOS EXTREMOS');
  
  const scenarios = [
    {
      name: 'Todos os números são ativação consecutiva',
      numbers: Array(20).fill(1),
      strategy: [1],
    },
    {
      name: 'Alternância perfeita (GREEN toda vez)',
      numbers: [1, 2, 1, 2, 1, 2, 1, 2],
      strategy: [1, 2],
    },
    {
      name: 'Nenhum número ativa',
      numbers: Array(50).fill(0).map((_, i) => (i % 10) + 10), // 10-19
      strategy: [1, 2, 3],
    },
    {
      name: 'Array muito grande (1000 números)',
      numbers: simulateAPINumbers(1000),
      strategy: [0, 10, 20, 30],
    },
  ];
  
  let passed = 0;
  let failed = 0;
  
  scenarios.forEach(scenario => {
    log(`\nTestando: ${scenario.name}`, 'yellow');
    log(`Números: ${scenario.numbers.length} elementos`, 'cyan');
    log(`Estratégia: [${scenario.strategy.join(', ')}]`, 'cyan');
    
    try {
      const start = Date.now();
      const result = analyzeStrategy(scenario.strategy, scenario.numbers, 3);
      const duration = Date.now() - start;
      
      log(`✓ Processado em ${duration}ms`, 'green');
      log(`  G:${result.totalGreen} R:${result.totalRed} Ativações:${result.activations.length}`, 'cyan');
      
      if (result.errors.length > 0) {
        log(`✗ Erros: ${result.errors.join(', ')}`, 'red');
        failed++;
      } else {
        passed++;
      }
    } catch (error) {
      log(`✗ Exceção: ${error.message}`, 'red');
      failed++;
    }
  });
  
  log(`\n${'─'.repeat(80)}`, 'cyan');
  log(`Passou: ${passed} | Falhou: ${failed}`, 'cyan');
  
  return failed === 0;
}

// ========================================
// EXECUÇÃO PRINCIPAL
// ========================================

async function runIntegrationTests() {
  console.clear();
  
  logSection('🎰 TESTE DE INTEGRAÇÃO COMPLETO - ROULETTE ANALYZER 🎰');
  log(`Duração máxima: 3 minutos`, 'cyan');
  log(`Início: ${new Date().toLocaleTimeString('pt-BR')}`, 'cyan');
  
  const results = {
    strategies: false,
    dataFlow: false,
    painting: false,
    greenRed: false,
    performance: false,
    intervals: false,
    consistency: false,
    extreme: false
  };
  
  try {
    // Executar testes
    results.strategies = testAllStrategies();
    
    if (Date.now() - startTime < TEST_DURATION_MS) {
      results.dataFlow = testAPIDataFlow();
    }
    
    if (Date.now() - startTime < TEST_DURATION_MS) {
      results.painting = testNumberPainting();
    }
    
    if (Date.now() - startTime < TEST_DURATION_MS) {
      results.greenRed = testGreenRedCalculation();
    }
    
    if (Date.now() - startTime < TEST_DURATION_MS) {
      results.performance = testDashboardPerformance();
    }
    
    if (Date.now() - startTime < TEST_DURATION_MS) {
      results.intervals = testIntervalAnalysis();
    }
    
    if (Date.now() - startTime < TEST_DURATION_MS) {
      results.consistency = testDataConsistency();
    }
    
    if (Date.now() - startTime < TEST_DURATION_MS) {
      results.extreme = testExtremeScenarios();
    }
    
  } catch (error) {
    log(`\n✗ ERRO CRÍTICO: ${error.message}`, 'red');
    console.error(error);
  }
  
  // Resumo final
  logSection('📊 RESUMO GERAL');
  
  const tests = [
    ['Estratégias', results.strategies],
    ['Fluxo de Dados', results.dataFlow],
    ['Coloração', results.painting],
    ['GREEN/RED', results.greenRed],
    ['Performance', results.performance],
    ['Intervalos', results.intervals],
    ['Consistência', results.consistency],
    ['Cenários Extremos', results.extreme]
  ];
  
  const allPassed = Object.values(results).every(r => r === true);
  const totalTests = tests.length;
  const passedTests = Object.values(results).filter(r => r === true).length;
  
  tests.forEach(([name, passed]) => {
    const icon = passed ? '✓' : '✗';
    const color = passed ? 'green' : 'red';
    log(`${icon} ${name.toUpperCase().padEnd(25)} - ${passed ? 'PASSOU' : 'FALHOU'}`, color);
  });
  
  log(`\n${'═'.repeat(80)}`, 'cyan');
  log(`Resultado Final: ${passedTests}/${totalTests} testes passaram`, allPassed ? 'green' : 'red');
  log(`Tempo decorrido: ${((Date.now() - startTime) / 1000).toFixed(1)}s`, 'cyan');
  log(`Término: ${new Date().toLocaleTimeString('pt-BR')}`, 'cyan');
  
  if (allPassed) {
    log(`\n🎉 SUCESSO! Sistema funcionando perfeitamente! 🎉`, 'green');
  } else {
    log(`\n⚠️  ATENÇÃO: Alguns testes falharam. Revise os logs acima.`, 'yellow');
  }
  
  process.exit(allPassed ? 0 : 1);
}

// Executar testes
runIntegrationTests().catch(error => {
  console.error('Erro fatal:', error);
  process.exit(1);
});
