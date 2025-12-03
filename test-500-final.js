// ========================================
// TESTE FINAL COMPLETO - 500 NÚMEROS
// Estratégia 2com2v: [17, 25, 2, 21, 4]
// ========================================

const STRATEGY_NUMBERS = [17, 25, 2, 21, 4];
const GREEN_RED_ATTEMPTS = 3;
const ANALYSIS_LIMIT = 500;

let recentNumbers = [];

function randomRouletteNumber() {
  return Math.floor(Math.random() * 37);
}

function updateNumberStatuses(numbers, strategyNumbers, greenRedAttempts) {
  const statusArray = new Array(numbers.length).fill('NEUTRAL');
  
  // Processar do mais antigo (índice maior) para o mais recente (índice menor)
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
    
    if (!foundGreenInWindow && lastCheckedIndex >= 0 && lastCheckedIndex === i - greenRedAttempts) {
      statusArray[lastCheckedIndex] = 'RED';
    }
  }
  
  return statusArray;
}

function verifyColors(numbers, statusArray, strategyNumbers) {
  let errors = [];
  
  numbers.forEach((num, i) => {
    const status = statusArray[i];
    const isStrategy = strategyNumbers.includes(num);
    
    // REGRA 1: ACTIVATION e GREEN só podem aparecer em números da estratégia
    if (!isStrategy && (status === 'ACTIVATION' || status === 'GREEN')) {
      errors.push({
        index: i,
        number: num,
        status,
        error: `Número ${num} NÃO é da estratégia mas está marcado como ${status}`
      });
    }
    
    // REGRA 2: RED só pode aparecer em números que NÃO são da estratégia
    if (isStrategy && status === 'RED') {
      errors.push({
        index: i,
        number: num,
        status,
        error: `Número ${num} É da estratégia mas está marcado como RED`
      });
    }
  });
  
  return errors;
}

// Gerar números
console.log('========================================');
console.log('TESTE FINAL - 500 NÚMEROS ALEATÓRIOS');
console.log('========================================\n');

console.log(`📋 Estratégia: 2com2v - Números: [${STRATEGY_NUMBERS.join(', ')}]`);
console.log(`🎯 greenRedAttempts: ${GREEN_RED_ATTEMPTS}`);
console.log(`📊 Total números: ${ANALYSIS_LIMIT}\n`);

// Gerar 500 números
const numbers = [];
for (let i = 0; i < ANALYSIS_LIMIT; i++) {
  numbers.push(randomRouletteNumber());
}

// Calcular status
const statusArray = updateNumberStatuses(numbers, STRATEGY_NUMBERS, GREEN_RED_ATTEMPTS);

// Verificar erros
const errors = verifyColors(numbers, statusArray, STRATEGY_NUMBERS);

// Contar status
const counts = { ACTIVATION: 0, GREEN: 0, RED: 0, NEUTRAL: 0 };
statusArray.forEach(s => counts[s]++);

console.log('📊 Contagem de status:');
console.log(`   ACTIVATION: ${counts.ACTIVATION}`);
console.log(`   GREEN: ${counts.GREEN}`);
console.log(`   RED: ${counts.RED}`);
console.log(`   NEUTRAL: ${counts.NEUTRAL}`);

// Verificar regras
console.log('\n========================================');
console.log('VERIFICAÇÃO DE REGRAS');
console.log('========================================\n');

if (errors.length === 0) {
  console.log('✅ REGRA 1: ACTIVATION/GREEN só em números da estratégia - OK');
  console.log('✅ REGRA 2: RED só em números fora da estratégia - OK');
} else {
  console.log(`❌ ${errors.length} ERROS ENCONTRADOS:\n`);
  errors.slice(0, 10).forEach(e => {
    console.log(`   [${e.index}] ${e.error}`);
  });
}

// Verificar sequência de ACTIVATION → GREEN/RED
console.log('\n========================================');
console.log('VERIFICAÇÃO DE SEQUÊNCIA');
console.log('========================================\n');

let sequenceErrors = 0;

for (let i = numbers.length - 1; i >= 0; i--) {
  if (statusArray[i] === 'ACTIVATION') {
    // Verificar se há GREEN ou RED nas próximas 3 casas
    let hasGreenOrRed = false;
    let greenIndex = -1;
    let redIndex = -1;
    
    for (let j = 1; j <= GREEN_RED_ATTEMPTS; j++) {
      const checkIndex = i - j;
      if (checkIndex < 0) break;
      
      if (statusArray[checkIndex] === 'GREEN') {
        hasGreenOrRed = true;
        greenIndex = checkIndex;
        break;
      }
      if (statusArray[checkIndex] === 'RED') {
        hasGreenOrRed = true;
        redIndex = checkIndex;
      }
    }
    
    // Se tem 3 casas à frente, deve ter GREEN ou RED
    if (i >= GREEN_RED_ATTEMPTS && !hasGreenOrRed) {
      // Verificar se realmente deveria ter
      let shouldHaveGreen = false;
      for (let j = 1; j <= GREEN_RED_ATTEMPTS; j++) {
        const checkIndex = i - j;
        if (STRATEGY_NUMBERS.includes(numbers[checkIndex])) {
          shouldHaveGreen = true;
          break;
        }
      }
      
      if (!shouldHaveGreen) {
        // Deveria ter RED na 3ª casa
        const redExpectedIndex = i - GREEN_RED_ATTEMPTS;
        if (statusArray[redExpectedIndex] !== 'RED') {
          sequenceErrors++;
          console.log(`❌ [${i}] ACTIVATION sem RED na casa ${redExpectedIndex}`);
        }
      }
    }
  }
}

if (sequenceErrors === 0) {
  console.log('✅ Todas as sequências ACTIVATION → GREEN/RED estão corretas');
}

// Amostra
console.log('\n========================================');
console.log('AMOSTRA (primeiros 40 números)');
console.log('========================================\n');

for (let i = 0; i < 40; i++) {
  const num = numbers[i];
  const status = statusArray[i];
  const isStrat = STRATEGY_NUMBERS.includes(num);
  
  let emoji = '⚪';
  if (status === 'ACTIVATION') emoji = '🟡';
  if (status === 'GREEN') emoji = '🟢';
  if (status === 'RED') emoji = '🔴';
  
  if (status !== 'NEUTRAL' || isStrat) {
    console.log(`[${String(i).padStart(2)}] ${String(num).padStart(2)} ${emoji} ${status.padEnd(10)} ${isStrat ? '★' : ''}`);
  }
}

console.log('\n========================================');
console.log('RESULTADO FINAL');
console.log('========================================');
console.log(errors.length === 0 && sequenceErrors === 0 ? '\n✅ TODOS OS TESTES PASSARAM!' : '\n❌ ALGUNS TESTES FALHARAM!');
