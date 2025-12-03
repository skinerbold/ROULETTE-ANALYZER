// ========================================
// TESTE DETALHADO - VERIFICAR REGRAS RED/GREEN
// ========================================

const STRATEGY_NUMBERS = [17, 25, 2, 21, 4];
const GREEN_RED_ATTEMPTS = 3; // Filtro de 3 casas

console.log('========================================');
console.log('REGRAS DE MARCAÇÃO');
console.log('========================================\n');

console.log('📋 Estratégia: [17, 25, 2, 21, 4]');
console.log('🎯 Filtro: 3 casas\n');

console.log('REGRAS:');
console.log('1. ACTIVATION (amarelo): Número da estratégia aparece');
console.log('2. GREEN (verde): Número da estratégia aparece DENTRO das N casas seguintes');
console.log('3. RED (vermelho): SOMENTE na última casa (casa N), se não houve GREEN antes');
console.log('4. Fora do intervalo: NEUTRAL (sem marcação)\n');

// Teste com sequência conhecida
// Índice 0 = mais recente, índice maior = mais antigo
const testCases = [
  {
    name: 'Caso 1: GREEN na casa 1',
    // [mais recente] ... [mais antigo]
    sequence: [25, 10, 11, 4, 30], // 25 é GREEN (casa 1 após 4)
    expected: {
      0: 'GREEN',     // 25 - da estratégia, casa 1 após ACTIVATION
      1: 'NEUTRAL',   // 10
      2: 'NEUTRAL',   // 11
      3: 'ACTIVATION', // 4 - da estratégia
      4: 'NEUTRAL',   // 30
    }
  },
  {
    name: 'Caso 2: GREEN na casa 2',
    sequence: [25, 10, 4, 30, 31], // 25 é GREEN (casa 2 após 4)
    expected: {
      0: 'GREEN',     // 25 - da estratégia, casa 2 após ACTIVATION
      1: 'NEUTRAL',   // 10
      2: 'ACTIVATION', // 4 - da estratégia
      3: 'NEUTRAL',   // 30
      4: 'NEUTRAL',   // 31
    }
  },
  {
    name: 'Caso 3: GREEN na casa 3 (última)',
    sequence: [2, 10, 11, 4, 30], // 2 é GREEN (casa 3 após 4)
    expected: {
      0: 'GREEN',     // 2 - da estratégia, casa 3 após ACTIVATION
      1: 'NEUTRAL',   // 10
      2: 'NEUTRAL',   // 11
      3: 'ACTIVATION', // 4 - da estratégia
      4: 'NEUTRAL',   // 30
    }
  },
  {
    name: 'Caso 4: RED na casa 3 (nenhum GREEN)',
    sequence: [10, 11, 12, 4, 30], // 10 é RED (casa 3, sem GREEN)
    expected: {
      0: 'RED',       // 10 - NÃO é da estratégia, casa 3 sem GREEN
      1: 'NEUTRAL',   // 11
      2: 'NEUTRAL',   // 12
      3: 'ACTIVATION', // 4 - da estratégia
      4: 'NEUTRAL',   // 30
    }
  },
  {
    name: 'Caso 5: Apenas ACTIVATION (menos de 3 casas à frente)',
    sequence: [10, 4], // Só tem 1 casa à frente, não pode ter RED ainda
    expected: {
      0: 'NEUTRAL',   // 10 - apenas 1 casa, aguardando
      1: 'ACTIVATION', // 4 - da estratégia
    }
  },
  {
    name: 'Caso 6: ACTIVATION com 2 casas à frente (sem RED)',
    sequence: [10, 11, 4], // Tem 2 casas à frente, não chegou na 3ª
    expected: {
      0: 'NEUTRAL',   // 10 - casa 2, ainda não é a última
      1: 'NEUTRAL',   // 11 - casa 1
      2: 'ACTIVATION', // 4 - da estratégia
    }
  },
  {
    name: 'Caso 7: GREEN na casa 1, sem RED',
    sequence: [10, 11, 12, 21, 4, 30], // 21 é GREEN na casa 1, casas 2 e 3 ficam NEUTRAL
    expected: {
      0: 'NEUTRAL',   // 10 - fora do intervalo de verificação do 4
      1: 'NEUTRAL',   // 11 - fora do intervalo
      2: 'NEUTRAL',   // 12 - fora do intervalo
      3: 'GREEN',     // 21 - da estratégia, casa 1 após 4
      4: 'ACTIVATION', // 4 - da estratégia
      5: 'NEUTRAL',   // 30
    }
  },
];

function updateNumberStatuses(numbers, strategyNumbers, greenRedAttempts) {
  const statusArray = new Array(numbers.length).fill('NEUTRAL');
  
  for (let i = numbers.length - 1; i >= 0; i--) {
    const num = numbers[i];
    
    if (!strategyNumbers.includes(num)) continue;
    if (statusArray[i] === 'GREEN') continue;
    
    statusArray[i] = 'ACTIVATION';
    
    let foundGreenInWindow = false;
    let lastCheckedIndex = -1;
    
    for (let j = 1; j <= greenRedAttempts; j++) {
      const checkIndex = i - j;
      if (checkIndex < 0) break;
      
      lastCheckedIndex = checkIndex;
      const checkNum = numbers[checkIndex];
      
      if (strategyNumbers.includes(checkNum)) {
        statusArray[checkIndex] = 'GREEN';
        foundGreenInWindow = true;
        break;
      }
    }
    
    // RED SOMENTE na última casa (casa N) se verificou todas as N casas
    if (!foundGreenInWindow && lastCheckedIndex >= 0 && lastCheckedIndex === i - greenRedAttempts) {
      statusArray[lastCheckedIndex] = 'RED';
    }
  }
  
  return statusArray;
}

// Executar testes
console.log('========================================');
console.log('EXECUTANDO TESTES');
console.log('========================================\n');

let allPassed = true;

testCases.forEach((testCase, testIndex) => {
  console.log(`\n--- ${testCase.name} ---`);
  console.log(`Sequência: [${testCase.sequence.join(', ')}]`);
  
  const result = updateNumberStatuses(testCase.sequence, STRATEGY_NUMBERS, GREEN_RED_ATTEMPTS);
  
  let passed = true;
  const errors = [];
  
  for (const [idx, expected] of Object.entries(testCase.expected)) {
    const i = parseInt(idx);
    const actual = result[i];
    if (actual !== expected) {
      passed = false;
      errors.push(`[${i}] ${testCase.sequence[i]}: esperado ${expected}, obtido ${actual}`);
    }
  }
  
  console.log('\nResultado:');
  testCase.sequence.forEach((num, i) => {
    const status = result[i];
    const isStrat = STRATEGY_NUMBERS.includes(num);
    let emoji = '⚪';
    if (status === 'ACTIVATION') emoji = '🟡';
    if (status === 'GREEN') emoji = '🟢';
    if (status === 'RED') emoji = '🔴';
    console.log(`  [${i}] ${String(num).padStart(2)} ${emoji} ${status.padEnd(10)} ${isStrat ? '★' : ''}`);
  });
  
  if (passed) {
    console.log('\n✅ PASSOU');
  } else {
    console.log('\n❌ FALHOU:');
    errors.forEach(e => console.log(`   ${e}`));
    allPassed = false;
  }
});

console.log('\n========================================');
console.log('RESULTADO FINAL');
console.log('========================================');
console.log(allPassed ? '\n✅ TODOS OS TESTES PASSARAM!' : '\n❌ ALGUNS TESTES FALHARAM!');
