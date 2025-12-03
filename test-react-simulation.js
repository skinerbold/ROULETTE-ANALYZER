// ========================================
// TESTE AVANÇADO - SIMULA EXATAMENTE O REACT
// Detecta problemas de dessincronização
// ========================================

// Definição de uma estratégia de exemplo (T2-T5-T6)
const STRATEGY_NUMBERS = [2, 5, 6, 12, 15, 16, 22, 25, 26, 32, 35, 36];

// Configuração
const ANALYSIS_LIMIT = 500;
const GREEN_RED_ATTEMPTS = 3;

// Gerar números com timestamps
function generateRandomNumbers(count) {
  const numbers = [];
  for (let i = 0; i < count; i++) {
    numbers.push({
      number: Math.floor(Math.random() * 37),
      timestamp: Date.now() - (count - i) * 1000
    });
  }
  return numbers;
}

// ========================================
// SIMULAR ESTADOS DO REACT
// ========================================

// 1. recentNumbers - vem do WebSocket hook (sempre atual)
const recentNumbers = generateRandomNumbers(ANALYSIS_LIMIT);

// 2. numbersToAnalyze - NOVA VERSÃO: deriva de recentNumbers
const numbersToAnalyze = recentNumbers.slice(0, ANALYSIS_LIMIT).map(rn => rn.number);

// 3. statusMap - calculado via updateNumberStatuses
function calculateStatuses(recentNums, strategyNumbers, greenRedAttempts) {
  const recentWithTimestamp = recentNums.slice(0, ANALYSIS_LIMIT);
  
  const statuses = recentWithTimestamp.map(entry => ({
    number: entry.number,
    timestamp: entry.timestamp,
    status: 'NEUTRAL'
  }));

  for (let i = recentWithTimestamp.length - 1; i >= 0; i--) {
    const currentNum = recentWithTimestamp[i].number;
    if (!strategyNumbers.includes(currentNum)) continue;
    if (statuses[i].status === 'GREEN') continue;

    statuses[i].status = 'ACTIVATION';

    let foundGreen = false;
    for (let j = 1; j <= greenRedAttempts; j++) {
      const checkIndex = i - j;
      if (checkIndex < 0) break;

      const checkNum = recentWithTimestamp[checkIndex].number;
      if (strategyNumbers.includes(checkNum)) {
        statuses[checkIndex].status = 'GREEN';
        foundGreen = true;
        break;
      }

      if (j === greenRedAttempts && !foundGreen) {
        statuses[checkIndex].status = 'RED';
      }
    }
  }

  const statusMap = new Map();
  statuses.forEach(s => statusMap.set(s.timestamp, s.status));
  return { statuses, statusMap };
}

const { statuses, statusMap } = calculateStatuses(recentNumbers, STRATEGY_NUMBERS, GREEN_RED_ATTEMPTS);

// ========================================
// SIMULAR getNumberColor EXATAMENTE COMO ESTÁ NO CÓDIGO
// ========================================
function getNumberColor(number, displayIndex, totalNumbers) {
  // O displayIndex vem do array revertido (0 = mais antigo exibido primeiro)
  // Precisamos converter para o índice do recentNumbers (0 = mais recente)
  const originalIndex = totalNumbers - 1 - displayIndex;

  // CORREÇÃO: Limitar ao tamanho de totalNumbers (mesmo usado em numbersToAnalyze)
  const limitedRecent = recentNumbers.slice(0, totalNumbers);
  const entry = limitedRecent[originalIndex];

  if (!entry) {
    return { color: 'NEUTRAL', reason: 'no entry' };
  }

  const status = statusMap.get(entry.timestamp) || 'NEUTRAL';
  return { 
    color: status, 
    number: entry.number,
    timestamp: entry.timestamp,
    displayIndex,
    originalIndex
  };
}

// ========================================
// TESTE: SIMULAR O RENDER JSX
// ========================================
console.log('========================================');
console.log('TESTE AVANÇADO - SIMULAÇÃO DO REACT');
console.log('========================================\n');

console.log(`📋 Estratégia: T2-T5-T6 - Números: [${STRATEGY_NUMBERS.join(', ')}]`);
console.log(`🎯 analysisLimit: ${ANALYSIS_LIMIT}`);
console.log(`📊 recentNumbers.length: ${recentNumbers.length}`);
console.log(`📊 numbersToAnalyze.length: ${numbersToAnalyze.length}`);
console.log(`📊 statusMap.size: ${statusMap.size}\n`);

// Simular: [...numbersToAnalyze].reverse().map((number, index) => ...)
const displayArray = [...numbersToAnalyze].reverse();

console.log('========================================');
console.log('VERIFICANDO CADA NÚMERO EXIBIDO');
console.log('========================================\n');

let errors = 0;
const errorDetails = [];

displayArray.forEach((displayedNumber, displayIndex) => {
  const colorInfo = getNumberColor(displayedNumber, displayIndex, numbersToAnalyze.length);
  
  const isStrategyNumber = STRATEGY_NUMBERS.includes(displayedNumber);
  
  // Verificar: o número retornado por getNumberColor deve ser o mesmo que estamos exibindo
  if (colorInfo.number !== displayedNumber) {
    errors++;
    errorDetails.push({
      displayIndex,
      displayedNumber,
      returnedNumber: colorInfo.number,
      originalIndex: colorInfo.originalIndex,
      error: 'NUMBER_MISMATCH'
    });
    return;
  }
  
  // Verificar: se o número NÃO é da estratégia, cor NUNCA pode ser ACTIVATION ou GREEN
  if (!isStrategyNumber && (colorInfo.color === 'ACTIVATION' || colorInfo.color === 'GREEN')) {
    errors++;
    errorDetails.push({
      displayIndex,
      displayedNumber,
      color: colorInfo.color,
      isStrategyNumber: false,
      originalIndex: colorInfo.originalIndex,
      error: 'WRONG_COLOR_NON_STRATEGY'
    });
  }
});

// ========================================
// RELATÓRIO
// ========================================
console.log(`\nTotal verificado: ${displayArray.length} números`);

if (errors === 0) {
  console.log('\n✅✅✅ NENHUM ERRO ENCONTRADO! ✅✅✅');
  console.log('A sincronização está CORRETA!\n');
} else {
  console.log(`\n❌❌❌ ENCONTRADOS ${errors} ERROS! ❌❌❌\n`);
  
  // Agrupar por tipo de erro
  const numberMismatches = errorDetails.filter(e => e.error === 'NUMBER_MISMATCH');
  const wrongColors = errorDetails.filter(e => e.error === 'WRONG_COLOR_NON_STRATEGY');
  
  if (numberMismatches.length > 0) {
    console.log(`❌ NUMBER_MISMATCH: ${numberMismatches.length} casos`);
    console.log('   (O número retornado por getNumberColor não bate com o exibido)');
    numberMismatches.slice(0, 5).forEach(e => {
      console.log(`   - displayIndex=${e.displayIndex}: exibido ${e.displayedNumber}, retornado ${e.returnedNumber}`);
    });
  }
  
  if (wrongColors.length > 0) {
    console.log(`\n❌ WRONG_COLOR_NON_STRATEGY: ${wrongColors.length} casos`);
    console.log('   (Número não pertence à estratégia mas tem cor ACTIVATION/GREEN)');
    wrongColors.slice(0, 10).forEach(e => {
      console.log(`   - [${e.displayIndex}] Número ${e.displayedNumber} marcado como ${e.color}`);
    });
  }
}

// ========================================
// AMOSTRA DETALHADA
// ========================================
console.log('\n========================================');
console.log('AMOSTRA DETALHADA (primeiros 40 números)');
console.log('========================================\n');

console.log('Formato: [displayIdx→originalIdx] número (cor) pertence?');

for (let i = 0; i < Math.min(40, displayArray.length); i++) {
  const num = displayArray[i];
  const colorInfo = getNumberColor(num, i, numbersToAnalyze.length);
  const isStrategy = STRATEGY_NUMBERS.includes(num);
  
  let emoji = '⚪';
  if (colorInfo.color === 'ACTIVATION') emoji = '🟡';
  if (colorInfo.color === 'GREEN') emoji = '🟢';
  if (colorInfo.color === 'RED') emoji = '🔴';
  
  const match = colorInfo.number === num ? '✓' : '✗ MISMATCH!';
  const stratMark = isStrategy ? '★' : ' ';
  
  // Verificar se é erro (cor em número não-estratégia)
  const isError = !isStrategy && (colorInfo.color === 'ACTIVATION' || colorInfo.color === 'GREEN');
  const errorMark = isError ? ' ❌ERROR' : '';
  
  console.log(`[${String(i).padStart(2)}→${String(colorInfo.originalIndex).padStart(3)}] ${String(num).padStart(2)} ${emoji} ${colorInfo.color.padEnd(10)} ${stratMark} ${match}${errorMark}`);
}

// ========================================
// ESTATÍSTICAS FINAIS
// ========================================
console.log('\n========================================');
console.log('ESTATÍSTICAS');
console.log('========================================\n');

const colorCounts = { ACTIVATION: 0, GREEN: 0, RED: 0, NEUTRAL: 0 };
const strategyColorCounts = { ACTIVATION: 0, GREEN: 0, RED: 0, NEUTRAL: 0 };
const nonStrategyColorCounts = { ACTIVATION: 0, GREEN: 0, RED: 0, NEUTRAL: 0 };

displayArray.forEach((num, i) => {
  const colorInfo = getNumberColor(num, i, numbersToAnalyze.length);
  const isStrategy = STRATEGY_NUMBERS.includes(num);
  
  colorCounts[colorInfo.color]++;
  if (isStrategy) {
    strategyColorCounts[colorInfo.color]++;
  } else {
    nonStrategyColorCounts[colorInfo.color]++;
  }
});

console.log('📊 TOTAL:');
console.log(`   ACTIVATION: ${colorCounts.ACTIVATION}`);
console.log(`   GREEN: ${colorCounts.GREEN}`);
console.log(`   RED: ${colorCounts.RED}`);
console.log(`   NEUTRAL: ${colorCounts.NEUTRAL}`);

console.log('\n📊 NÚMEROS DA ESTRATÉGIA:');
console.log(`   ACTIVATION: ${strategyColorCounts.ACTIVATION}`);
console.log(`   GREEN: ${strategyColorCounts.GREEN}`);
console.log(`   RED: ${strategyColorCounts.RED} (deve ser 0)`);
console.log(`   NEUTRAL: ${strategyColorCounts.NEUTRAL}`);

console.log('\n📊 NÚMEROS FORA DA ESTRATÉGIA:');
console.log(`   ACTIVATION: ${nonStrategyColorCounts.ACTIVATION} (deve ser 0)`);
console.log(`   GREEN: ${nonStrategyColorCounts.GREEN} (deve ser 0)`);
console.log(`   RED: ${nonStrategyColorCounts.RED}`);
console.log(`   NEUTRAL: ${nonStrategyColorCounts.NEUTRAL}`);

const success = nonStrategyColorCounts.ACTIVATION === 0 && nonStrategyColorCounts.GREEN === 0;
console.log(`\n${success ? '✅ SUCESSO' : '❌ FALHA'}: Cores em números não-estratégia`);
