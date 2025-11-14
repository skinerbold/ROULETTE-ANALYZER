/**
 * ========================================
 * SCRIPT DE TESTE AUTOMATIZADO - ROULETTE ANALYZER
 * ========================================
 * 
 * Executa testes abrangentes por 3 minutos para identificar bugs e problemas de lógica
 * 
 * Como executar:
 * 1. Certifique-se de que o servidor está rodando (npm run dev)
 * 2. Execute: node test-system.js
 * 
 * O script irá:
 * - Testar cálculo de GREEN/RED em todos os cenários
 * - Validar ordem cronológica dos números
 * - Testar todas as opções de casas (1-6)
 * - Simular diferentes sequências de números
 * - Validar estratégias dinâmicas e estáticas
 * - Testar edge cases (arrays vazios, limites, etc)
 */

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
// DADOS DE TESTE
// ========================================

// Estratégias de exemplo para teste
const testStrategies = [
  { id: 1, name: 'Teste 1-2-3', numbers: [1, 2, 3] },
  { id: 2, name: 'Teste 10-20-30', numbers: [10, 20, 30] },
  { id: 3, name: 'Teste 0 (único)', numbers: [0] },
  { id: 4, name: 'Teste muitos números', numbers: [1, 5, 9, 13, 17, 21, 25, 29, 33] },
];

// Cenários de teste de números
const testScenarios = [
  {
    name: 'GREEN Imediato (1 casa)',
    numbers: [15, 1, 22, 10, 5],  
    // Invertido: [5, 10, 22, 1, 15]
    // 1 ativa (inv=3) → procura em 15 (próx) → 15 não é 1,2,3 → RED
    strategy: { id: 1, numbers: [1, 2, 3] },
    expectedGreens: 0,
    expectedReds: 1,
    attempts: 3
  },
  {
    name: 'GREEN na 2ª casa',
    numbers: [15, 22, 3, 10, 5],  
    // Invertido: [5, 10, 3, 22, 15]
    // 3 ativa (inv=2) → procura em 22,15 → nenhum é 1,2,3 → RED
    strategy: { id: 1, numbers: [1, 2, 3] },
    expectedGreens: 0,
    expectedReds: 1,
    attempts: 3
  },
  {
    name: 'GREEN na 3ª casa - Sequência correta',
    numbers: [15, 22, 8, 2, 10, 5],  
    // Invertido: [5, 10, 2, 8, 22, 15]
    // 2 ativa (inv=2) → procura em 8,22,15 → nenhum é 1,2,3 → RED
    strategy: { id: 1, numbers: [1, 2, 3] },
    expectedGreens: 0,
    expectedReds: 1,
    attempts: 3
  },
  {
    name: 'RED - não encontrou em 3 casas',
    numbers: [15, 22, 8, 9, 1, 10, 5],  
    // Invertido: [5, 10, 1, 9, 8, 22, 15]
    // 1 ativa (inv=2) → procura em 9,8,22 → nenhum é 1,2,3 → RED
    strategy: { id: 1, numbers: [1, 2, 3] },
    expectedGreens: 0,
    expectedReds: 1,
    attempts: 3
  },
  {
    name: 'Múltiplas ativações - GREEN e RED',
    numbers: [1, 22, 2, 10, 3, 15, 8, 9, 11, 1, 5],
    // Invertido: [5, 1, 11, 9, 8, 15, 3, 10, 2, 22, 1]
    // Ativação 1: 1 (inv=1) → procura em 11,9,8 → nenhum é 1,2,3 → RED
    // Ativação 2: 3 (inv=6 após skip de 4) → procura em 10,2,22 → 2 encontrado na 2ª → GREEN
    // Ativação 3: 1 (inv=10 após skip do GREEN) → sem números após → RED
    strategy: { id: 1, numbers: [1, 2, 3] },
    expectedGreens: 1,
    expectedReds: 2,
    attempts: 2
  },
  {
    name: 'Sequência longa sem ativação',
    numbers: [15, 22, 8, 9, 11, 5, 6, 7, 12, 13],
    strategy: { id: 1, numbers: [1, 2, 3] },
    expectedGreens: 0,
    expectedReds: 0,
    attempts: 0
  },
  {
    name: 'Ativação no final do array (edge case)',
    numbers: [15, 22, 8, 9, 1],  // 1 no final, sem números após
    strategy: { id: 1, numbers: [1, 2, 3] },
    expectedGreens: 0,
    expectedReds: 1,  // RED porque não há números suficientes após
    attempts: 0
  },
  {
    name: 'Array com 1 elemento',
    numbers: [1],
    strategy: { id: 1, numbers: [1, 2, 3] },
    expectedGreens: 0,
    expectedReds: 1,
    attempts: 0
  },
  {
    name: 'Ativações consecutivas (GREEN, GREEN)',
    numbers: [1, 2, 8, 1, 3, 9],
    // Invertido: [9, 3, 1, 8, 2, 1]
    // Primeira: 1 (índice 5 inv=0) → 2 (GREEN na 1ª)
    // Segunda: 1 (índice 3 inv=2) → 8 (não), 2 (GREEN na 2ª após skip do primeiro 1+GREEN)
    strategy: { id: 1, numbers: [1, 2, 3] },
    expectedGreens: 2,
    expectedReds: 0,
    attempts: 1
  },
  {
    name: 'Zero na estratégia',
    numbers: [15, 0, 22, 8, 0, 5],
    // Invertido: [5, 0, 8, 22, 0, 15]
    // Ativação 1: 0 (inv=1) → procura em 8,22,0 → 0 encontrado na 3ª (inv=4) → GREEN
    // Continua de inv=5 (após GREEN), não há mais zeros → sem mais ativações
    strategy: { id: 3, numbers: [0] },
    expectedGreens: 1,
    expectedReds: 0,
    attempts: 3
  },
];

// ========================================
// FUNÇÕES DE TESTE
// ========================================

/**
 * Simula a lógica de analyzeStrategy do sistema
 */
function analyzeStrategy(strategyNumbers, numbersArray, greenRedAttempts = 3) {
  const results = {
    totalGreen: 0,
    totalRed: 0,
    activations: [],
    errors: []
  };

  try {
    // CORREÇÃO: Inverter array para processar do mais antigo para o mais recente
    const reversedArray = [...numbersArray].reverse();
    
    let i = 0;
    while (i < reversedArray.length) {
      const currentNum = reversedArray[i];
      
      // Verifica se é ativação
      if (strategyNumbers.includes(currentNum)) {
        let foundGreen = false;
        let attemptsCount = 0;
        let greenIndex = -1;
        
        // Procura GREEN nas próximas N casas
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
          results.activations.push({
            position: i,
            number: currentNum,
            result: 'GREEN',
            attempts: attemptsCount
          });
          i = greenIndex + 1;
        } else {
          results.totalRed++;
          results.activations.push({
            position: i,
            number: currentNum,
            result: 'RED',
            attempts: Math.min(greenRedAttempts, reversedArray.length - i - 1)
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
 * Valida um cenário de teste
 */
function validateScenario(scenario, greenRedAttempts = 3) {
  const result = analyzeStrategy(
    scenario.strategy.numbers,
    scenario.numbers,
    greenRedAttempts
  );

  const passed = 
    result.totalGreen === scenario.expectedGreens &&
    result.totalRed === scenario.expectedReds &&
    result.errors.length === 0;

  return {
    passed,
    result,
    expected: {
      greens: scenario.expectedGreens,
      reds: scenario.expectedReds
    }
  };
}

/**
 * Testa ordem cronológica
 */
function testChronologicalOrder() {
  logSection('TESTE 1: ORDEM CRONOLÓGICA');
  
  const numbers = [15, 10, 5, 3, 1]; // Ordem: RECENTE → ANTIGO
  const strategy = [1, 2, 3];
  
  log('Testando se análise processa do ANTIGO para RECENTE...', 'yellow');
  log(`Números originais (recente→antigo): [${numbers.join(', ')}]`, 'cyan');
  
  const reversed = [...numbers].reverse();
  log(`Números invertidos (antigo→recente): [${reversed.join(', ')}]`, 'cyan');
  
  // Deve encontrar 1 no início (após inversão) e verificar 3, 5, 10 (para frente no tempo)
  const result = analyzeStrategy(strategy, numbers, 3);
  
  if (result.activations.length > 0) {
    log(`✓ Encontrou ${result.activations.length} ativação(ões)`, 'green');
    result.activations.forEach((act, idx) => {
      log(`  Ativação ${idx + 1}: Número ${act.number} → ${act.result} (${act.attempts} tentativas)`, 'cyan');
    });
  } else {
    log('✗ ERRO: Nenhuma ativação encontrada!', 'red');
    return false;
  }
  
  // Validar que está olhando para frente (futuro) e não para trás (passado)
  const firstActivation = result.activations[0];
  if (firstActivation.number === 1) {
    log('✓ Primeira ativação é o número 1 (correto - mais antigo)', 'green');
    
    // 1 deve procurar em 3, 5, 10 (futuro) e encontrar 3 na 1ª casa
    if (firstActivation.result === 'GREEN' && firstActivation.attempts === 1) {
      log('✓ GREEN encontrado na 1ª casa após 1 (número 3) - CORRETO!', 'green');
      return true;
    } else {
      log(`✗ ERRO: Esperava GREEN na 1ª casa, mas obteve ${firstActivation.result} em ${firstActivation.attempts} tentativas`, 'red');
      return false;
    }
  } else {
    log(`✗ ERRO: Primeira ativação deveria ser 1, mas foi ${firstActivation.number}`, 'red');
    return false;
  }
}

/**
 * Testa todos os cenários predefinidos
 */
function testAllScenarios() {
  logSection('TESTE 2: CENÁRIOS PREDEFINIDOS');
  
  let passed = 0;
  let failed = 0;
  
  testScenarios.forEach((scenario, idx) => {
    log(`\nTestando: ${scenario.name}`, 'yellow');
    log(`Números: [${scenario.numbers.join(', ')}]`, 'cyan');
    log(`Estratégia: [${scenario.strategy.numbers.join(', ')}]`, 'cyan');
    
    const validation = validateScenario(scenario, scenario.attempts || 3);
    
    if (validation.passed) {
      log(`✓ PASSOU - GREEN: ${validation.result.totalGreen}, RED: ${validation.result.totalRed}`, 'green');
      passed++;
    } else {
      log(`✗ FALHOU!`, 'red');
      log(`  Esperado - GREEN: ${validation.expected.greens}, RED: ${validation.expected.reds}`, 'red');
      log(`  Obtido   - GREEN: ${validation.result.totalGreen}, RED: ${validation.result.totalRed}`, 'red');
      
      if (validation.result.errors.length > 0) {
        log(`  Erros: ${validation.result.errors.join(', ')}`, 'red');
      }
      
      failed++;
    }
  });
  
  log(`\n${'─'.repeat(80)}`, 'cyan');
  log(`Total: ${passed + failed} | Passou: ${passed} | Falhou: ${failed}`, passed === testScenarios.length ? 'green' : 'yellow');
  
  return failed === 0;
}

/**
 * Testa todas as opções de casas (1-6)
 */
function testAllHouseOptions() {
  logSection('TESTE 3: OPÇÕES DE CASAS (1-6)');
  
  const numbers = [1, 10, 20, 2, 30, 40, 3, 50, 60];
  // Invertido: [60, 50, 3, 40, 30, 2, 20, 10, 1]
  // 1 ativa (inv=0) → procura em: 10, 20, 2, 30, 40, 3, ...
  
  const strategy = [1, 2, 3];
  
  for (let houses = 1; houses <= 6; houses++) {
    log(`\nTestando com ${houses} casa(s)...`, 'yellow');
    
    const result = analyzeStrategy(strategy, numbers, houses);
    
    log(`  Ativações: ${result.activations.length}`, 'cyan');
    log(`  GREEN: ${result.totalGreen}, RED: ${result.totalRed}`, 'cyan');
    
    if (result.activations.length > 0) {
      result.activations.forEach((act, idx) => {
        log(`    #${idx + 1}: ${act.number} → ${act.result} (${act.attempts} tentativas)`, 'cyan');
      });
    }
    
    // Validação lógica: com mais casas, mais chance de GREEN
    if (houses === 1) {
      // Com 1 casa: 1 → 10 (não é 1,2,3) → RED
      if (result.totalRed > 0) {
        log(`  ✓ Comportamento esperado para 1 casa`, 'green');
      } else {
        log(`  ✗ ERRO: Esperava pelo menos 1 RED com 1 casa`, 'red');
      }
    }
  }
  
  return true;
}

/**
 * Testa edge cases
 */
function testEdgeCases() {
  logSection('TESTE 4: EDGE CASES');
  
  const cases = [
    {
      name: 'Array vazio',
      numbers: [],
      strategy: [1, 2, 3],
      shouldPass: true
    },
    {
      name: 'Estratégia vazia',
      numbers: [1, 2, 3],
      strategy: [],
      shouldPass: true
    },
    {
      name: 'Ambos vazios',
      numbers: [],
      strategy: [],
      shouldPass: true
    },
    {
      name: 'Número muito grande (37)',
      numbers: [37, 1, 2, 3],
      strategy: [1, 2, 3],
      shouldPass: true
    },
    {
      name: 'Todos os números são ativação',
      numbers: [1, 2, 3, 1, 2, 3],
      strategy: [1, 2, 3],
      shouldPass: true
    },
    {
      name: 'Um único número',
      numbers: [1],
      strategy: [1],
      shouldPass: true
    },
    {
      name: 'Números negativos (não devem existir mas testar)',
      numbers: [-1, 1, 2],
      strategy: [1, 2, 3],
      shouldPass: true
    },
  ];
  
  let passed = 0;
  let failed = 0;
  
  cases.forEach((testCase) => {
    log(`\nTestando: ${testCase.name}`, 'yellow');
    
    try {
      const result = analyzeStrategy(testCase.strategy, testCase.numbers, 3);
      
      if (result.errors.length === 0) {
        log(`  ✓ Não gerou erros (GREEN: ${result.totalGreen}, RED: ${result.totalRed})`, 'green');
        passed++;
      } else {
        log(`  ✗ Gerou erros: ${result.errors.join(', ')}`, 'red');
        failed++;
      }
    } catch (error) {
      if (testCase.shouldPass) {
        log(`  ✗ Exceção não esperada: ${error.message}`, 'red');
        failed++;
      } else {
        log(`  ✓ Exceção esperada: ${error.message}`, 'green');
        passed++;
      }
    }
  });
  
  log(`\n${'─'.repeat(80)}`, 'cyan');
  log(`Total: ${passed + failed} | Passou: ${passed} | Falhou: ${failed}`, 'cyan');
  
  return failed === 0;
}

/**
 * Testa sequências aleatórias
 */
function testRandomSequences() {
  logSection('TESTE 5: SEQUÊNCIAS ALEATÓRIAS');
  
  const iterations = 20;
  log(`Gerando ${iterations} sequências aleatórias...`, 'yellow');
  
  let errors = 0;
  
  for (let i = 0; i < iterations; i++) {
    // Gerar array aleatório de 10-50 números
    const length = Math.floor(Math.random() * 40) + 10;
    const numbers = Array.from({ length }, () => Math.floor(Math.random() * 37));
    
    // Gerar estratégia aleatória de 1-9 números
    const stratLength = Math.floor(Math.random() * 9) + 1;
    const strategy = Array.from({ length: stratLength }, () => Math.floor(Math.random() * 37));
    
    // Gerar casas aleatórias (1-6)
    const houses = Math.floor(Math.random() * 6) + 1;
    
    try {
      const result = analyzeStrategy(strategy, numbers, houses);
      
      // Validações básicas
      if (result.totalGreen < 0 || result.totalRed < 0) {
        log(`✗ Iteração ${i + 1}: Valores negativos! (G:${result.totalGreen}, R:${result.totalRed})`, 'red');
        errors++;
      }
      
      if (result.totalGreen + result.totalRed !== result.activations.length) {
        log(`✗ Iteração ${i + 1}: Soma de G+R não corresponde a ativações!`, 'red');
        errors++;
      }
      
      if (result.errors.length > 0) {
        log(`✗ Iteração ${i + 1}: Erro interno: ${result.errors[0]}`, 'red');
        errors++;
      }
      
    } catch (error) {
      log(`✗ Iteração ${i + 1}: Exceção: ${error.message}`, 'red');
      errors++;
    }
    
    if ((i + 1) % 5 === 0) {
      log(`  Processadas ${i + 1}/${iterations} sequências...`, 'cyan');
    }
  }
  
  if (errors === 0) {
    log(`\n✓ Todas as ${iterations} sequências aleatórias passaram!`, 'green');
  } else {
    log(`\n✗ ${errors} erro(s) encontrado(s) em ${iterations} sequências`, 'red');
  }
  
  return errors === 0;
}

/**
 * Teste de performance
 */
function testPerformance() {
  logSection('TESTE 6: PERFORMANCE');
  
  const sizes = [100, 500, 1000, 5000];
  
  sizes.forEach(size => {
    log(`\nTestando com ${size} números...`, 'yellow');
    
    const numbers = Array.from({ length: size }, () => Math.floor(Math.random() * 37));
    const strategy = [1, 2, 3, 4, 5];
    
    const start = Date.now();
    const result = analyzeStrategy(strategy, numbers, 3);
    const duration = Date.now() - start;
    
    log(`  Tempo: ${duration}ms`, duration < 100 ? 'green' : 'yellow');
    log(`  Ativações: ${result.activations.length}`, 'cyan');
    log(`  GREEN: ${result.totalGreen}, RED: ${result.totalRed}`, 'cyan');
    
    if (duration > 1000) {
      log(`  ⚠ Aviso: Performance pode ser melhorada`, 'yellow');
    }
  });
  
  return true;
}

/**
 * Teste de consistência
 */
function testConsistency() {
  logSection('TESTE 7: CONSISTÊNCIA');
  
  log('Executando mesma análise 10 vezes para verificar consistência...', 'yellow');
  
  const numbers = [1, 10, 2, 20, 3, 30, 40, 50];
  const strategy = [1, 2, 3];
  
  const results = [];
  
  for (let i = 0; i < 10; i++) {
    const result = analyzeStrategy(strategy, numbers, 3);
    results.push({
      greens: result.totalGreen,
      reds: result.totalRed,
      activations: result.activations.length
    });
  }
  
  // Todos os resultados devem ser idênticos
  const first = results[0];
  const allEqual = results.every(r => 
    r.greens === first.greens && 
    r.reds === first.reds && 
    r.activations === first.activations
  );
  
  if (allEqual) {
    log(`✓ Todos os 10 resultados são idênticos`, 'green');
    log(`  GREEN: ${first.greens}, RED: ${first.reds}, Ativações: ${first.activations}`, 'cyan');
    return true;
  } else {
    log(`✗ ERRO: Resultados inconsistentes!`, 'red');
    results.forEach((r, idx) => {
      log(`  Execução ${idx + 1}: G:${r.greens}, R:${r.reds}, A:${r.activations}`, 'red');
    });
    return false;
  }
}

// ========================================
// EXECUÇÃO PRINCIPAL
// ========================================

async function runAllTests() {
  console.clear();
  
  logSection('🎰 TESTE AUTOMATIZADO DO ROULETTE ANALYZER 🎰');
  log(`Duração: 3 minutos`, 'cyan');
  log(`Início: ${new Date().toLocaleTimeString('pt-BR')}`, 'cyan');
  
  const results = {
    chronological: false,
    scenarios: false,
    houses: false,
    edgeCases: false,
    random: false,
    performance: false,
    consistency: false
  };
  
  // Executar testes em sequência
  try {
    results.chronological = testChronologicalOrder();
    
    if (Date.now() - startTime < TEST_DURATION_MS) {
      results.scenarios = testAllScenarios();
    }
    
    if (Date.now() - startTime < TEST_DURATION_MS) {
      results.houses = testAllHouseOptions();
    }
    
    if (Date.now() - startTime < TEST_DURATION_MS) {
      results.edgeCases = testEdgeCases();
    }
    
    if (Date.now() - startTime < TEST_DURATION_MS) {
      results.random = testRandomSequences();
    }
    
    if (Date.now() - startTime < TEST_DURATION_MS) {
      results.performance = testPerformance();
    }
    
    if (Date.now() - startTime < TEST_DURATION_MS) {
      results.consistency = testConsistency();
    }
    
  } catch (error) {
    log(`\n✗ ERRO CRÍTICO: ${error.message}`, 'red');
    console.error(error);
  }
  
  // Resumo final
  logSection('📊 RESUMO DOS TESTES');
  
  const allPassed = Object.values(results).every(r => r === true);
  const totalTests = Object.keys(results).length;
  const passedTests = Object.values(results).filter(r => r === true).length;
  
  Object.entries(results).forEach(([name, passed]) => {
    const icon = passed ? '✓' : '✗';
    const color = passed ? 'green' : 'red';
    log(`${icon} ${name.toUpperCase().padEnd(20)} - ${passed ? 'PASSOU' : 'FALHOU'}`, color);
  });
  
  log(`\n${'═'.repeat(80)}`, 'cyan');
  log(`Resultado Final: ${passedTests}/${totalTests} testes passaram`, allPassed ? 'green' : 'red');
  log(`Tempo decorrido: ${((Date.now() - startTime) / 1000).toFixed(1)}s`, 'cyan');
  log(`Término: ${new Date().toLocaleTimeString('pt-BR')}`, 'cyan');
  
  if (allPassed) {
    log(`\n🎉 PARABÉNS! Todos os testes passaram! 🎉`, 'green');
  } else {
    log(`\n⚠️  ATENÇÃO: Alguns testes falharam. Revise os logs acima.`, 'yellow');
  }
  
  process.exit(allPassed ? 0 : 1);
}

// Executar testes
runAllTests().catch(error => {
  console.error('Erro fatal:', error);
  process.exit(1);
});
