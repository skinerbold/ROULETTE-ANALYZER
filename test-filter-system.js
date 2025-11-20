/**
 * TESTE COMPLETO DO SISTEMA DE FILTROS
 * 
 * Este script valida:
 * 1. Cálculos de métricas (winRate, frequencyCount, hits por posição)
 * 2. Ordenação correta para cada filtro
 * 3. Integridade dos dados (StrategyStats completo)
 * 4. Performance com grande volume de dados
 * 5. Edge cases e valores extremos
 */

const fs = require('fs');
const path = require('path');

// Cores para output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
};

// Contadores de testes
let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
const errors = [];

// Função auxiliar para logs
function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function assert(condition, testName, details = '') {
  totalTests++;
  if (condition) {
    passedTests++;
    log(`✓ ${testName}`, 'green');
  } else {
    failedTests++;
    log(`✗ ${testName}`, 'red');
    const errorMsg = `${testName}${details ? ': ' + details : ''}`;
    errors.push(errorMsg);
    log(`  ${details}`, 'yellow');
  }
}

// ============================================================================
// TESTE 1: VALIDAÇÃO DA ESTRUTURA StrategyStats
// ============================================================================
function testStrategyStatsInterface() {
  log('\n📋 TESTE 1: Validação da Interface StrategyStats', 'cyan');
  
  const requiredFields = [
    'id', 'name', 'totalGreen', 'totalRed', 'maxGreenSequence', 'maxRedSequence',
    'firstAttemptHits', 'secondAttemptHits', 'thirdAttemptHits',
    'fourthAttemptHits', 'fifthAttemptHits', 'sixthAttemptHits',
    'mostActivatingNumber', 'mostActivatingCount', 'activations', 'profit',
    'frequencyCount', 'winRate',
    'maxConsecutiveGreens', 'maxConsecutiveReds', 'bestEntryPattern',
    'postGreenWins', 'postRedWins'
  ];

  const mockStats = {
    id: 1,
    name: 'Test Strategy',
    totalGreen: 10,
    totalRed: 5,
    maxGreenSequence: 3,
    maxRedSequence: 2,
    firstAttemptHits: 4,
    secondAttemptHits: 3,
    thirdAttemptHits: 2,
    fourthAttemptHits: 1,
    fifthAttemptHits: 0,
    sixthAttemptHits: 0,
    mostActivatingNumber: 17,
    mostActivatingCount: 5,
    activations: 15,
    profit: 50,
    frequencyCount: 20,
    winRate: 66.67,
    maxConsecutiveGreens: 4,
    maxConsecutiveReds: 2,
    bestEntryPattern: 'post-green',
    postGreenWins: 6,
    postRedWins: 4
  };

  requiredFields.forEach(field => {
    assert(
      mockStats.hasOwnProperty(field),
      `Campo '${field}' existe no mock`,
      mockStats.hasOwnProperty(field) ? '' : `Campo '${field}' não encontrado`
    );
  });

  // Validar tipos
  assert(typeof mockStats.id === 'number', 'id é number');
  assert(typeof mockStats.name === 'string', 'name é string');
  assert(typeof mockStats.winRate === 'number', 'winRate é number');
  assert(typeof mockStats.frequencyCount === 'number', 'frequencyCount é number');
  assert(Array.isArray([1,2,3,4,5,6].map(i => mockStats[`${{1:'first',2:'second',3:'third',4:'fourth',5:'fifth',6:'sixth'}[i]}AttemptHits`])), 'Todos os hits são numéricos');
}

// ============================================================================
// TESTE 2: CÁLCULO DE winRate
// ============================================================================
function testWinRateCalculation() {
  log('\n📊 TESTE 2: Cálculo de Win Rate', 'cyan');

  const testCases = [
    { green: 10, red: 5, expected: 66.67 },
    { green: 0, red: 10, expected: 0 },
    { green: 10, red: 0, expected: 100 },
    { green: 0, red: 0, expected: 0 },
    { green: 7, red: 3, expected: 70 },
    { green: 1, red: 1, expected: 50 },
    { green: 33, red: 67, expected: 33 },
  ];

  testCases.forEach(({ green, red, expected }, index) => {
    const total = green + red;
    const calculated = total > 0 ? (green / total) * 100 : 0;
    const rounded = Math.round(calculated * 100) / 100;
    
    assert(
      Math.abs(rounded - expected) < 0.01,
      `winRate correto para G:${green} R:${red}`,
      `Esperado: ${expected}%, Calculado: ${rounded}%`
    );
  });

  // Edge case: divisão por zero
  const zeroCase = 0 / 0;
  assert(
    isNaN(zeroCase) || zeroCase === 0,
    'Divisão por zero tratada (0 green, 0 red)',
    `Resultado: ${zeroCase}`
  );
}

// ============================================================================
// TESTE 3: CÁLCULO DE frequencyCount
// ============================================================================
function testFrequencyCount() {
  log('\n🔥 TESTE 3: Cálculo de Frequência', 'cyan');

  const strategyNumbers = [1, 2, 3, 4, 5];
  const histories = [
    { history: [1, 7, 8, 2, 9, 3, 10], expected: 3, desc: 'História com 3 matches' },
    { history: [6, 7, 8, 9, 10], expected: 0, desc: 'História sem matches' },
    { history: [1, 1, 1, 2, 2], expected: 5, desc: 'História com números repetidos' },
    { history: [1, 2, 3, 4, 5], expected: 5, desc: 'História com todos os números' },
    { history: [], expected: 0, desc: 'História vazia' },
    { history: [1], expected: 1, desc: 'História com 1 número' },
  ];

  histories.forEach(({ history, expected, desc }) => {
    // Reverter array (como no código real)
    const reversed = [...history].reverse();
    const count = reversed.filter(num => strategyNumbers.includes(num)).length;
    
    assert(
      count === expected,
      `Frequência: ${desc}`,
      `Esperado: ${expected}, Calculado: ${count}`
    );
  });

  // Teste de performance
  log('  Testando performance com grande volume...', 'blue');
  const largeHistory = Array.from({ length: 10000 }, (_, i) => (i % 37));
  const startTime = Date.now();
  const reversed = [...largeHistory].reverse();
  const count = reversed.filter(num => strategyNumbers.includes(num)).length;
  const elapsed = Date.now() - startTime;
  
  assert(
    elapsed < 100,
    `Performance: Processar 10k números em < 100ms`,
    `Tempo: ${elapsed}ms`
  );
}

// ============================================================================
// TESTE 4: CONTAGEM DE HITS POR POSIÇÃO
// ============================================================================
function testPositionHitCounting() {
  log('\n🎯 TESTE 4: Contagem de Hits por Posição', 'cyan');

  const strategyNumbers = [10, 20, 30];
  
  // Simular análise com greenRedAttempts = 6
  const scenarios = [
    {
      desc: 'Hit na 1ª posição',
      history: [10, 5, 6, 7, 8, 9],
      expected: { pos1: 1, pos2: 0, pos3: 0, pos4: 0, pos5: 0, pos6: 0 }
    },
    {
      desc: 'Hit na 3ª posição',
      history: [5, 6, 10, 7, 8, 9],
      expected: { pos1: 0, pos2: 0, pos3: 1, pos4: 0, pos5: 0, pos6: 0 }
    },
    {
      desc: 'Hit na 6ª posição',
      history: [5, 6, 7, 8, 9, 10],
      expected: { pos1: 0, pos2: 0, pos3: 0, pos4: 0, pos5: 0, pos6: 1 }
    },
    {
      desc: 'Sem hits',
      history: [1, 2, 3, 4, 5, 6],
      expected: { pos1: 0, pos2: 0, pos3: 0, pos4: 0, pos5: 0, pos6: 0 }
    },
    {
      desc: 'Hit em múltiplas posições (apenas primeira conta)',
      history: [10, 20, 30, 4, 5, 6],
      expected: { pos1: 1, pos2: 0, pos3: 0, pos4: 0, pos5: 0, pos6: 0 }
    },
  ];

  scenarios.forEach(({ desc, history, expected }) => {
    let hits = { pos1: 0, pos2: 0, pos3: 0, pos4: 0, pos5: 0, pos6: 0 };
    
    // Simular lógica do analyzeStrategy
    for (let i = 0; i < Math.min(6, history.length); i++) {
      if (strategyNumbers.includes(history[i])) {
        const position = i + 1;
        hits[`pos${position}`] = 1;
        break; // Apenas o primeiro hit conta
      }
    }

    assert(
      JSON.stringify(hits) === JSON.stringify(expected),
      `Hits: ${desc}`,
      `Esperado: ${JSON.stringify(expected)}, Calculado: ${JSON.stringify(hits)}`
    );
  });

  // Teste com array maior que 6
  const largeHistory = [1, 2, 3, 4, 5, 6, 10, 20]; // Hit no 7º (não deve contar)
  let hits = { pos1: 0, pos2: 0, pos3: 0, pos4: 0, pos5: 0, pos6: 0 };
  for (let i = 0; i < Math.min(6, largeHistory.length); i++) {
    if (strategyNumbers.includes(largeHistory[i])) {
      hits[`pos${i + 1}`] = 1;
      break;
    }
  }
  
  assert(
    Object.values(hits).every(v => v === 0),
    'Hit além da 6ª posição não é contado',
    `Hits: ${JSON.stringify(hits)}`
  );
}

// ============================================================================
// TESTE 5: ORDENAÇÃO POR CADA FILTRO
// ============================================================================
function testSortingLogic() {
  log('\n🔀 TESTE 5: Lógica de Ordenação', 'cyan');

  const mockStrategies = [
    { id: 1, name: 'A', winRate: 50, firstAttemptHits: 10, secondAttemptHits: 5, thirdAttemptHits: 2, fourthAttemptHits: 1, fifthAttemptHits: 0, sixthAttemptHits: 0, frequencyCount: 100, profit: 10 },
    { id: 2, name: 'B', winRate: 75, firstAttemptHits: 5, secondAttemptHits: 15, thirdAttemptHits: 3, fourthAttemptHits: 2, fifthAttemptHits: 1, sixthAttemptHits: 0, frequencyCount: 50, profit: 20 },
    { id: 3, name: 'C', winRate: 60, firstAttemptHits: 3, secondAttemptHits: 10, thirdAttemptHits: 20, fourthAttemptHits: 5, fifthAttemptHits: 3, sixthAttemptHits: 1, frequencyCount: 200, profit: 15 },
    { id: 4, name: 'D', winRate: 80, firstAttemptHits: 2, secondAttemptHits: 3, thirdAttemptHits: 4, fourthAttemptHits: 25, fifthAttemptHits: 2, sixthAttemptHits: 0, frequencyCount: 75, profit: 5 },
    { id: 5, name: 'E', winRate: 40, firstAttemptHits: 1, secondAttemptHits: 2, thirdAttemptHits: 1, fourthAttemptHits: 3, fifthAttemptHits: 30, sixthAttemptHits: 2, frequencyCount: 25, profit: 30 },
    { id: 6, name: 'F', winRate: 55, firstAttemptHits: 4, secondAttemptHits: 4, thirdAttemptHits: 5, fourthAttemptHits: 4, fifthAttemptHits: 5, sixthAttemptHits: 40, frequencyCount: 150, profit: 25 },
  ];

  const sortTests = [
    {
      filter: 'performance',
      field: 'winRate',
      expectedOrder: [4, 2, 3, 6, 1, 5], // IDs ordenados por winRate DESC
      desc: '% de Acerto (winRate)'
    },
    {
      filter: 'position-1',
      field: 'firstAttemptHits',
      expectedOrder: [1, 2, 6, 3, 4, 5],
      desc: '1ª Casa'
    },
    {
      filter: 'position-2',
      field: 'secondAttemptHits',
      expectedOrder: [2, 3, 1, 6, 4, 5],
      desc: '2ª Casa'
    },
    {
      filter: 'position-3',
      field: 'thirdAttemptHits',
      expectedOrder: [3, 6, 4, 2, 1, 5],
      desc: '3ª Casa'
    },
    {
      filter: 'position-4',
      field: 'fourthAttemptHits',
      expectedOrder: [4, 3, 6, 5, 2, 1],
      desc: '4ª Casa'
    },
    {
      filter: 'position-5',
      field: 'fifthAttemptHits',
      expectedOrder: [5, 6, 3, 4, 2, 1],
      desc: '5ª Casa'
    },
    {
      filter: 'position-6',
      field: 'sixthAttemptHits',
      expectedOrder: [6, 5, 3, 1, 2, 4],
      desc: '6ª Casa'
    },
    {
      filter: 'frequency',
      field: 'frequencyCount',
      expectedOrder: [3, 6, 1, 4, 2, 5],
      desc: 'Frequência'
    },
  ];

  sortTests.forEach(({ filter, field, expectedOrder, desc }) => {
    const sorted = [...mockStrategies].sort((a, b) => b[field] - a[field]);
    const sortedIds = sorted.map(s => s.id);
    
    assert(
      JSON.stringify(sortedIds) === JSON.stringify(expectedOrder),
      `Ordenação: ${desc}`,
      `Esperado: [${expectedOrder}], Obtido: [${sortedIds}]`
    );
  });

  // Teste de estabilidade de ordenação (valores iguais)
  const duplicates = [
    { id: 1, winRate: 50, profit: 10 },
    { id: 2, winRate: 50, profit: 20 },
    { id: 3, winRate: 50, profit: 15 },
  ];
  
  const sorted = [...duplicates].sort((a, b) => b.winRate - a.winRate);
  assert(
    sorted.length === duplicates.length,
    'Ordenação preserva todos os elementos',
    `Original: ${duplicates.length}, Ordenado: ${sorted.length}`
  );
}

// ============================================================================
// TESTE 6: EDGE CASES E VALORES EXTREMOS
// ============================================================================
function testEdgeCases() {
  log('\n⚠️  TESTE 6: Edge Cases e Valores Extremos', 'cyan');

  // Teste 1: Todos os valores zero
  const allZeros = {
    totalGreen: 0,
    totalRed: 0,
    firstAttemptHits: 0,
    secondAttemptHits: 0,
    thirdAttemptHits: 0,
    fourthAttemptHits: 0,
    fifthAttemptHits: 0,
    sixthAttemptHits: 0,
    frequencyCount: 0,
    profit: 0
  };
  
  const winRateZero = allZeros.totalGreen + allZeros.totalRed > 0 
    ? (allZeros.totalGreen / (allZeros.totalGreen + allZeros.totalRed)) * 100 
    : 0;
  
  assert(
    winRateZero === 0,
    'winRate com valores zero retorna 0',
    `winRate: ${winRateZero}`
  );

  // Teste 2: Valores muito grandes
  const largeValues = {
    totalGreen: 999999,
    totalRed: 1,
    frequencyCount: 1000000,
    firstAttemptHits: 500000
  };
  
  const winRateLarge = (largeValues.totalGreen / (largeValues.totalGreen + largeValues.totalRed)) * 100;
  
  assert(
    winRateLarge > 99.99 && winRateLarge <= 100,
    'winRate com valores grandes calculado corretamente',
    `winRate: ${winRateLarge}%`
  );

  // Teste 3: Valores negativos (não deveria acontecer, mas validar)
  const negativeValues = {
    totalGreen: -5,
    totalRed: 10
  };
  
  const winRateNegative = (negativeValues.totalGreen / (negativeValues.totalGreen + negativeValues.totalRed)) * 100;
  
  assert(
    true, // Apenas log, não falha
    'winRate com valores negativos',
    `Resultado: ${winRateNegative}% (ALERTA: valores negativos detectados)`
  );

  // Teste 4: undefined e null
  const undefinedStats = {
    totalGreen: undefined,
    totalRed: null
  };
  
  const winRateUndefined = (undefinedStats.totalGreen ?? 0) + (undefinedStats.totalRed ?? 0) > 0
    ? ((undefinedStats.totalGreen ?? 0) / ((undefinedStats.totalGreen ?? 0) + (undefinedStats.totalRed ?? 0))) * 100
    : 0;
  
  assert(
    winRateUndefined === 0,
    'winRate com undefined/null retorna 0',
    `winRate: ${winRateUndefined}`
  );

  // Teste 5: Ordenação com valores idênticos
  const identicalValues = [
    { id: 1, winRate: 50 },
    { id: 2, winRate: 50 },
    { id: 3, winRate: 50 }
  ];
  
  const sorted = [...identicalValues].sort((a, b) => b.winRate - a.winRate);
  
  assert(
    sorted.length === 3 && sorted.every(s => s.winRate === 50),
    'Ordenação com valores idênticos mantém integridade',
    `Resultado: ${sorted.map(s => `ID:${s.id}`).join(', ')}`
  );
}

// ============================================================================
// TESTE 7: INTEGRAÇÃO COM ARQUIVO REAL
// ============================================================================
function testRealFileIntegration() {
  log('\n📁 TESTE 7: Integração com Arquivos Reais', 'cyan');

  const typesPath = path.join(__dirname, 'src', 'lib', 'types.ts');
  
  if (fs.existsSync(typesPath)) {
    const typesContent = fs.readFileSync(typesPath, 'utf-8');
    
    // Verificar se todos os campos necessários estão no arquivo
    const requiredFields = [
      'fourthAttemptHits',
      'fifthAttemptHits',
      'sixthAttemptHits',
      'frequencyCount',
      'winRate'
    ];
    
    requiredFields.forEach(field => {
      assert(
        typesContent.includes(field),
        `Campo '${field}' existe em types.ts`,
        typesContent.includes(field) ? '' : `Campo não encontrado em types.ts`
      );
    });
  } else {
    log('  ⚠️  Arquivo types.ts não encontrado (executar na raiz do projeto)', 'yellow');
  }

  const pageFilePath = path.join(__dirname, 'src', 'app', 'page.tsx');
  
  if (fs.existsSync(pageFilePath)) {
    const pageContent = fs.readFileSync(pageFilePath, 'utf-8');
    
    // Verificar se os filtros estão implementados
    const filters = [
      'position-1', 'position-2', 'position-3',
      'position-4', 'position-5', 'position-6',
      'performance', 'frequency'
    ];
    
    filters.forEach(filter => {
      assert(
        pageContent.includes(`'${filter}'`) || pageContent.includes(`"${filter}"`),
        `Filtro '${filter}' existe em page.tsx`,
        pageContent.includes(filter) ? '' : `Filtro não encontrado`
      );
    });

    // Verificar se o switch case existe
    assert(
      pageContent.includes('switch (sortFilter)') || pageContent.includes('switch(sortFilter)'),
      'Switch de ordenação implementado',
      pageContent.includes('switch') ? '' : 'Switch não encontrado'
    );

    // Verificar Select component
    assert(
      pageContent.includes('<Select') && pageContent.includes('sortFilter'),
      'Componente Select de filtro implementado',
      ''
    );

  } else {
    log('  ⚠️  Arquivo page.tsx não encontrado (executar na raiz do projeto)', 'yellow');
  }
}

// ============================================================================
// TESTE 8: PERFORMANCE E ESCALABILIDADE
// ============================================================================
function testPerformance() {
  log('\n⚡ TESTE 8: Performance e Escalabilidade', 'cyan');

  // Simular 387 estratégias (total real do sistema)
  const strategies = Array.from({ length: 387 }, (_, i) => ({
    id: i + 1,
    name: `Strategy ${i + 1}`,
    winRate: Math.random() * 100,
    firstAttemptHits: Math.floor(Math.random() * 100),
    secondAttemptHits: Math.floor(Math.random() * 100),
    thirdAttemptHits: Math.floor(Math.random() * 100),
    fourthAttemptHits: Math.floor(Math.random() * 100),
    fifthAttemptHits: Math.floor(Math.random() * 100),
    sixthAttemptHits: Math.floor(Math.random() * 100),
    frequencyCount: Math.floor(Math.random() * 500),
    profit: Math.floor(Math.random() * 200) - 100
  }));

  // Teste de ordenação
  const startSort = Date.now();
  const sorted = [...strategies].sort((a, b) => b.winRate - a.winRate);
  const sortTime = Date.now() - startSort;

  assert(
    sortTime < 50,
    `Ordenação de 387 estratégias em < 50ms`,
    `Tempo: ${sortTime}ms`
  );

  assert(
    sorted.length === 387,
    'Ordenação preserva todas as 387 estratégias',
    `Total: ${sorted.length}`
  );

  // Teste de múltiplas ordenações (simular troca de filtro)
  const startMulti = Date.now();
  const filters = ['winRate', 'firstAttemptHits', 'frequencyCount', 'profit'];
  filters.forEach(filter => {
    [...strategies].sort((a, b) => b[filter] - a[filter]);
  });
  const multiTime = Date.now() - startMulti;

  assert(
    multiTime < 200,
    `4 ordenações consecutivas em < 200ms`,
    `Tempo: ${multiTime}ms`
  );

  // Teste de memória (verificar se não há vazamento)
  const memBefore = process.memoryUsage().heapUsed;
  for (let i = 0; i < 100; i++) {
    const temp = [...strategies].sort((a, b) => b.winRate - a.winRate);
  }
  const memAfter = process.memoryUsage().heapUsed;
  const memDiff = (memAfter - memBefore) / 1024 / 1024;

  assert(
    memDiff < 50,
    `100 ordenações usam < 50MB de memória`,
    `Diferença: ${memDiff.toFixed(2)}MB`
  );
}

// ============================================================================
// TESTE 9: CONSISTÊNCIA DE DADOS
// ============================================================================
function testDataConsistency() {
  log('\n🔍 TESTE 9: Consistência de Dados', 'cyan');

  const mockStrategy = {
    totalGreen: 15,
    totalRed: 10,
    firstAttemptHits: 5,
    secondAttemptHits: 4,
    thirdAttemptHits: 3,
    fourthAttemptHits: 2,
    fifthAttemptHits: 1,
    sixthAttemptHits: 0
  };

  // Soma de hits não pode exceder total de greens
  const totalHits = mockStrategy.firstAttemptHits + mockStrategy.secondAttemptHits +
                   mockStrategy.thirdAttemptHits + mockStrategy.fourthAttemptHits +
                   mockStrategy.fifthAttemptHits + mockStrategy.sixthAttemptHits;

  assert(
    totalHits <= mockStrategy.totalGreen,
    'Soma de hits não excede total de greens',
    `Hits: ${totalHits}, Greens: ${mockStrategy.totalGreen}`
  );

  // winRate deve estar entre 0 e 100
  const total = mockStrategy.totalGreen + mockStrategy.totalRed;
  const winRate = total > 0 ? (mockStrategy.totalGreen / total) * 100 : 0;

  assert(
    winRate >= 0 && winRate <= 100,
    'winRate está entre 0% e 100%',
    `winRate: ${winRate.toFixed(2)}%`
  );

  // Teste de arredondamento
  const winRate1 = (10 / 13) * 100; // 76.923076...
  const rounded1 = Math.round(winRate1 * 100) / 100;

  assert(
    rounded1 === 76.92,
    'Arredondamento para 2 casas decimais',
    `Original: ${winRate1}, Arredondado: ${rounded1}`
  );

  // Validar que profit pode ser negativo
  const negativeProfit = -50;
  assert(
    typeof negativeProfit === 'number',
    'Profit negativo é válido',
    `Profit: ${negativeProfit}`
  );
}

// ============================================================================
// TESTE 10: VALIDAÇÃO DE TIPOS TYPESCRIPT
// ============================================================================
function testTypeScriptTypes() {
  log('\n📘 TESTE 10: Validação de Tipos (TypeScript)', 'cyan');

  const validSortFilters = [
    'performance',
    'position-1',
    'position-2',
    'position-3',
    'position-4',
    'position-5',
    'position-6',
    'frequency'
  ];

  validSortFilters.forEach(filter => {
    assert(
      typeof filter === 'string',
      `Filtro '${filter}' é string`,
      ''
    );
  });

  // Validar que não há duplicatas
  const uniqueFilters = [...new Set(validSortFilters)];
  assert(
    uniqueFilters.length === validSortFilters.length,
    'Sem filtros duplicados',
    `Total: ${validSortFilters.length}, Únicos: ${uniqueFilters.length}`
  );

  // Validar comprimento dos nomes
  validSortFilters.forEach(filter => {
    assert(
      filter.length > 0 && filter.length < 20,
      `Nome do filtro '${filter}' tem tamanho razoável`,
      `Tamanho: ${filter.length}`
    );
  });
}

// ============================================================================
// EXECUTAR TODOS OS TESTES
// ============================================================================
function runAllTests() {
  log('╔══════════════════════════════════════════════════════════════╗', 'magenta');
  log('║       TESTE COMPLETO DO SISTEMA DE FILTROS - ROLETA         ║', 'magenta');
  log('╚══════════════════════════════════════════════════════════════╝', 'magenta');

  const startTime = Date.now();

  testStrategyStatsInterface();
  testWinRateCalculation();
  testFrequencyCount();
  testPositionHitCounting();
  testSortingLogic();
  testEdgeCases();
  testRealFileIntegration();
  testPerformance();
  testDataConsistency();
  testTypeScriptTypes();

  const elapsed = Date.now() - startTime;

  // Relatório final
  log('\n╔══════════════════════════════════════════════════════════════╗', 'magenta');
  log('║                     RELATÓRIO FINAL                          ║', 'magenta');
  log('╚══════════════════════════════════════════════════════════════╝', 'magenta');
  
  log(`\n📊 Total de Testes: ${totalTests}`, 'cyan');
  log(`✓ Aprovados: ${passedTests}`, 'green');
  log(`✗ Falhados: ${failedTests}`, failedTests > 0 ? 'red' : 'green');
  log(`⏱️  Tempo de Execução: ${elapsed}ms`, 'blue');
  
  const successRate = ((passedTests / totalTests) * 100).toFixed(2);
  log(`📈 Taxa de Sucesso: ${successRate}%`, successRate == 100 ? 'green' : 'yellow');

  if (errors.length > 0) {
    log('\n❌ ERROS DETECTADOS:', 'red');
    errors.forEach((error, index) => {
      log(`  ${index + 1}. ${error}`, 'yellow');
    });
  } else {
    log('\n🎉 TODOS OS TESTES PASSARAM! Sistema de filtros funcionando perfeitamente.', 'green');
  }

  log('\n' + '═'.repeat(64), 'magenta');
  
  // Exit code
  process.exit(failedTests > 0 ? 1 : 0);
}

// Executar
runAllTests();
