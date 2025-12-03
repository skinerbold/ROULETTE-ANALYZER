// ========================================
// TESTE COM NÚMEROS FIXOS PARA VERIFICAR LÓGICA
// Estratégia 2com2v: [17, 25, 2, 21, 4]
// greenRedAttempts = 3
// ========================================

const STRATEGY_NUMBERS = [17, 25, 2, 21, 4];
const GREEN_RED_ATTEMPTS = 3;

// Sequência de teste conhecida (mais recente primeiro = índice 0)
// Vamos criar uma sequência onde sabemos exatamente o que deve acontecer
const testSequence = [
  // Índice 0-4: Sequência recente
  10, // 0 - NEUTRAL (não é da estratégia)
  8,  // 1 - NEUTRAL
  7,  // 2 - NEUTRAL  
  2,  // 3 - Deve ser GREEN (é da estratégia, dentro de 3 casas do 4 no índice 6)
  9,  // 4 - NEUTRAL
  11, // 5 - NEUTRAL
  4,  // 6 - Deve ser ACTIVATION (é da estratégia)
  
  // Índice 7-12: Outra sequência
  30, // 7 - NEUTRAL
  31, // 8 - NEUTRAL
  33, // 9 - Deve ser RED (3ª casa após ACTIVATION no 12, sem GREEN)
  34, // 10 - NEUTRAL (2ª casa)
  35, // 11 - NEUTRAL (1ª casa)
  17, // 12 - Deve ser ACTIVATION (é da estratégia)
  
  // Índice 13+: Mais sequências
  1,  // 13 - NEUTRAL
  25, // 14 - Deve ser GREEN (é da estratégia, dentro de 3 casas do 17)
  3,  // 15 - NEUTRAL
  21, // 16 - Deve ser ACTIVATION
  5,  // 17 - NEUTRAL
  6,  // 18 - NEUTRAL
  4,  // 19 - Deve ser GREEN (é da estratégia, dentro de 3 casas do 21)
  // ...
];

function updateNumberStatuses(numbers, strategyNumbers, greenRedAttempts) {
  const statusArray = new Array(numbers.length).fill('NEUTRAL');
  
  // Processar do mais antigo (índice maior) para o mais recente (índice menor)
  for (let i = numbers.length - 1; i >= 0; i--) {
    const num = numbers[i];
    
    // Se não é número da estratégia, pula
    if (!strategyNumbers.includes(num)) {
      continue;
    }
    
    // Se já foi marcado como GREEN, não sobrescrever
    if (statusArray[i] === 'GREEN') {
      continue;
    }
    
    // É número da estratégia → marca como ACTIVATION
    statusArray[i] = 'ACTIVATION';
    
    // Verificar os próximos greenRedAttempts números (índices menores = mais recentes)
    let foundGreenInWindow = false;
    let lastCheckedIndex = -1;
    
    for (let j = 1; j <= greenRedAttempts; j++) {
      const checkIndex = i - j;
      
      // Se não tem mais números à frente, para
      if (checkIndex < 0) {
        break;
      }
      
      lastCheckedIndex = checkIndex;
      const checkNum = numbers[checkIndex];
      
      // Se este número pertence à estratégia → GREEN!
      if (strategyNumbers.includes(checkNum)) {
        statusArray[checkIndex] = 'GREEN';
        foundGreenInWindow = true;
        break;
      }
    }
    
    // Se verificou todas as N casas e não encontrou GREEN → RED na última casa
    if (!foundGreenInWindow && lastCheckedIndex >= 0 && lastCheckedIndex === i - greenRedAttempts) {
      statusArray[lastCheckedIndex] = 'RED';
    }
  }
  
  return statusArray;
}

// ========================================
// TESTE 1: Sequência conhecida
// ========================================
console.log('========================================');
console.log('TESTE 1: Sequência conhecida');
console.log('========================================\n');

console.log('Números da estratégia 2com2v:', STRATEGY_NUMBERS);
console.log('greenRedAttempts:', GREEN_RED_ATTEMPTS);
console.log('\nSequência de teste (índice 0 = mais recente):');

const statusArray = updateNumberStatuses(testSequence, STRATEGY_NUMBERS, GREEN_RED_ATTEMPTS);

console.log('\nResultado:');
testSequence.forEach((num, i) => {
  const status = statusArray[i];
  const isStrat = STRATEGY_NUMBERS.includes(num);
  
  let emoji = '⚪';
  if (status === 'ACTIVATION') emoji = '🟡';
  if (status === 'GREEN') emoji = '🟢';
  if (status === 'RED') emoji = '🔴';
  
  console.log(`[${String(i).padStart(2)}] ${String(num).padStart(2)} ${emoji} ${status.padEnd(10)} ${isStrat ? '★' : ''}`);
});

// ========================================
// VERIFICAÇÕES ESPERADAS
// ========================================
console.log('\n========================================');
console.log('VERIFICAÇÕES');
console.log('========================================\n');

const expectations = [
  { index: 3, expected: 'GREEN', reason: 'Número 2 (estratégia) dentro de 3 casas da ACTIVATION no índice 6' },
  { index: 6, expected: 'ACTIVATION', reason: 'Número 4 é da estratégia' },
  { index: 9, expected: 'RED', reason: '3ª casa após ACTIVATION no índice 12, sem GREEN nas 3 casas' },
  { index: 12, expected: 'ACTIVATION', reason: 'Número 17 é da estratégia' },
  { index: 14, expected: 'GREEN', reason: 'Número 25 (estratégia) é o GREEN da ACTIVATION em 17? NÃO - 14 está antes de 12' },
  { index: 16, expected: 'ACTIVATION', reason: 'Número 21 é da estratégia' },
  { index: 19, expected: 'GREEN', reason: 'Número 4 (estratégia) dentro de 3 casas da ACTIVATION no índice 16' },
];

// Recalcular expectativas corretas
console.log('Análise detalhada:\n');

// Índice 19 (4): É estratégia, mais antigo, processa primeiro
console.log('[19] 4 → ACTIVATION (é da estratégia)');
console.log('   Verifica [18], [17], [16]: 6, 5, 21');
console.log('   [16] = 21 é da estratégia → GREEN!');
console.log('');

// Índice 16 (21): Já é GREEN
console.log('[16] 21 → já é GREEN (marcado pelo 4)');
console.log('');

// Índice 14 (25): É estratégia
console.log('[14] 25 → ACTIVATION (é da estratégia)');
console.log('   Verifica [13], [12], [11]: 1, 17, 35');
console.log('   [12] = 17 é da estratégia → GREEN!');
console.log('');

// Índice 12 (17): Já é GREEN
console.log('[12] 17 → já é GREEN (marcado pelo 25)');
console.log('');

// Índice 6 (4): É estratégia
console.log('[6] 4 → ACTIVATION (é da estratégia)');
console.log('   Verifica [5], [4], [3]: 11, 9, 2');
console.log('   [3] = 2 é da estratégia → GREEN!');
console.log('');

// Índice 3 (2): Já é GREEN
console.log('[3] 2 → já é GREEN (marcado pelo 4)');

console.log('\n========================================');
console.log('RESULTADO ESPERADO vs OBTIDO');
console.log('========================================\n');

const expectedResults = {
  0: 'NEUTRAL',  // 10
  1: 'NEUTRAL',  // 8
  2: 'NEUTRAL',  // 7
  3: 'GREEN',    // 2 - GREEN do 4
  4: 'NEUTRAL',  // 9
  5: 'NEUTRAL',  // 11
  6: 'ACTIVATION', // 4
  7: 'NEUTRAL',  // 30
  8: 'NEUTRAL',  // 31
  9: 'NEUTRAL',  // 33 - NÃO é RED porque 17 virou GREEN
  10: 'NEUTRAL', // 34
  11: 'NEUTRAL', // 35
  12: 'GREEN',   // 17 - GREEN do 25
  13: 'NEUTRAL', // 1
  14: 'ACTIVATION', // 25
  15: 'NEUTRAL', // 3
  16: 'GREEN',   // 21 - GREEN do 4 (índice 19)
  17: 'NEUTRAL', // 5
  18: 'NEUTRAL', // 6
  19: 'ACTIVATION', // 4
};

let errors = 0;
for (const [idx, expected] of Object.entries(expectedResults)) {
  const i = parseInt(idx);
  const actual = statusArray[i];
  const match = actual === expected;
  if (!match) {
    console.log(`❌ [${i}] ${testSequence[i]}: esperado ${expected}, obtido ${actual}`);
    errors++;
  }
}

if (errors === 0) {
  console.log('✅ Todos os resultados estão corretos!');
} else {
  console.log(`\n❌ ${errors} erros encontrados`);
}

// ========================================
// TESTE 2: Verificar que RED só aparece quando deve
// ========================================
console.log('\n========================================');
console.log('TESTE 2: Verificar RED');
console.log('========================================\n');

// Sequência onde RED DEVE aparecer:
// ACTIVATION → 3 números que NÃO são da estratégia
const testRedSequence = [
  10, // 0 - 3ª casa, deve ser RED
  11, // 1 - 2ª casa
  12, // 2 - 1ª casa (nota: 12 NÃO está em [17,25,2,21,4])
  4,  // 3 - ACTIVATION (4 é da estratégia)
  30, // 4 - NEUTRAL
];

console.log('Testando sequência com RED esperado:');
console.log('Estratégia: [17, 25, 2, 21, 4]');
console.log('Sequência:', testRedSequence);
console.log('');

const redStatusArray = updateNumberStatuses(testRedSequence, STRATEGY_NUMBERS, GREEN_RED_ATTEMPTS);

testRedSequence.forEach((num, i) => {
  const status = redStatusArray[i];
  const isStrat = STRATEGY_NUMBERS.includes(num);
  
  let emoji = '⚪';
  if (status === 'ACTIVATION') emoji = '🟡';
  if (status === 'GREEN') emoji = '🟢';
  if (status === 'RED') emoji = '🔴';
  
  console.log(`[${i}] ${String(num).padStart(2)} ${emoji} ${status.padEnd(10)} ${isStrat ? '★' : ''}`);
});

const redExpected = {
  0: 'RED',        // 10 - 3ª casa sem GREEN
  1: 'NEUTRAL',    // 11
  2: 'NEUTRAL',    // 12
  3: 'ACTIVATION', // 4
  4: 'NEUTRAL',    // 30
};

console.log('\nVerificação RED:');
let redErrors = 0;
for (const [idx, expected] of Object.entries(redExpected)) {
  const i = parseInt(idx);
  const actual = redStatusArray[i];
  const match = actual === expected;
  console.log(`[${i}] ${testRedSequence[i]}: esperado ${expected}, obtido ${actual} ${match ? '✅' : '❌'}`);
  if (!match) redErrors++;
}

console.log('\n' + (redErrors === 0 ? '✅ TESTE RED PASSOU!' : `❌ ${redErrors} erros no teste RED`));
