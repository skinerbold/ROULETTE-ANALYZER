// ========================================
// TESTE FINAL - ESTRATÉGIA 2com2v (ID 186)
// Números: [17, 25, 2, 21, 4]
// ========================================

// Estratégia 2com2v
const STRATEGY_NUMBERS = [17, 25, 2, 21, 4];
const STRATEGY_NAME = "2com2v";
const GREEN_RED_ATTEMPTS = 3;
const ANALYSIS_LIMIT = 50;

let recentNumbers = [];
let statusMap = new Map();

function randomRouletteNumber() {
  return Math.floor(Math.random() * 37);
}

// FUNÇÃO CORRIGIDA: Usa recentNumbers diretamente com analysisLimit
function updateNumberStatuses() {
  // CORREÇÃO: Usar recentNumbers diretamente com analysisLimit
  const currentNumbers = recentNumbers.slice(0, ANALYSIS_LIMIT);
  
  if (currentNumbers.length === 0) {
    statusMap = new Map();
    return;
  }

  // Obter números da estratégia
  const numbersOnly = currentNumbers.map(n => n.number);
  const strategyNumbers = STRATEGY_NUMBERS;

  // Array de status - inicializa TUDO como NEUTRAL
  const statuses = currentNumbers.map(entry => ({
    number: entry.number,
    timestamp: entry.timestamp,
    status: 'NEUTRAL'
  }));

  // Processar do mais antigo para o mais recente
  for (let i = currentNumbers.length - 1; i >= 0; i--) {
    const currentNum = currentNumbers[i].number;
    
    if (!strategyNumbers.includes(currentNum)) continue;
    if (statuses[i].status === 'GREEN') continue;

    statuses[i].status = 'ACTIVATION';

    let foundGreen = false;
    for (let j = 1; j <= GREEN_RED_ATTEMPTS; j++) {
      const checkIndex = i - j;
      if (checkIndex < 0) break;

      const checkNum = currentNumbers[checkIndex].number;
      if (strategyNumbers.includes(checkNum)) {
        statuses[checkIndex].status = 'GREEN';
        foundGreen = true;
        break;
      }

      if (j === GREEN_RED_ATTEMPTS && !foundGreen) {
        statuses[checkIndex].status = 'RED';
      }
    }
  }

  // Criar novo statusMap usando timestamp como chave
  const newStatusMap = new Map();
  statuses.forEach((s, i) => {
    const timestamp = currentNumbers[i]?.timestamp;
    if (timestamp) {
      newStatusMap.set(timestamp, s.status);
    }
  });
  statusMap = newStatusMap;
}

// FUNÇÃO getNumberColor: Busca cor pelo timestamp
function getNumberColor(number, displayIndex, totalNumbers) {
  const originalIndex = totalNumbers - 1 - displayIndex;
  const limitedRecent = recentNumbers.slice(0, totalNumbers);
  const entry = limitedRecent[originalIndex];

  if (!entry) {
    return 'NEUTRAL';
  }

  return statusMap.get(entry.timestamp) || 'NEUTRAL';
}

function addNewNumber() {
  const newNumber = {
    number: randomRouletteNumber(),
    timestamp: Date.now() + Math.random()
  };
  
  recentNumbers.unshift(newNumber);
  
  if (recentNumbers.length > 500) {
    recentNumbers = recentNumbers.slice(0, 500);
  }
  
  return newNumber;
}

function verifyColors() {
  // numbersToAnalyze = recentNumbers.slice(0, analysisLimit).map(rn => rn.number)
  const numbersToAnalyze = recentNumbers.slice(0, ANALYSIS_LIMIT).map(rn => rn.number);
  const displayArray = [...numbersToAnalyze].reverse();
  
  let errors = [];
  
  displayArray.forEach((num, displayIndex) => {
    const color = getNumberColor(num, displayIndex, numbersToAnalyze.length);
    const isStrategy = STRATEGY_NUMBERS.includes(num);
    
    // Erro: número não é da estratégia mas tem cor ACTIVATION ou GREEN
    if (!isStrategy && (color === 'ACTIVATION' || color === 'GREEN')) {
      errors.push({
        displayIndex,
        number: num,
        color,
        isStrategy
      });
    }
  });
  
  return errors;
}

// ========================================
// TESTE
// ========================================

console.log('========================================');
console.log('TESTE FINAL - ESTRATÉGIA 2com2v');
console.log('========================================\n');

console.log(`📋 Estratégia: ${STRATEGY_NAME} - Números: [${STRATEGY_NUMBERS.join(', ')}]`);
console.log(`🎯 Casas GREEN/RED: ${GREEN_RED_ATTEMPTS}`);
console.log(`📊 Limite de análise: ${ANALYSIS_LIMIT}\n`);

// FASE 1: Carregar números iniciais
console.log('FASE 1: Carregando 500 números iniciais...\n');
for (let i = 0; i < 500; i++) {
  addNewNumber();
}
updateNumberStatuses();

let errors = verifyColors();
console.log(`Após carga inicial: ${errors.length} erros\n`);

// FASE 2: Simular 100 novos números
console.log('FASE 2: Simulando 100 novos números chegando...\n');

let totalErrors = 0;
const errorRounds = [];

for (let round = 1; round <= 100; round++) {
  const newNum = addNewNumber();
  updateNumberStatuses();
  
  errors = verifyColors();
  
  if (errors.length > 0) {
    totalErrors += errors.length;
    errorRounds.push({ round, errors: errors.length, newNumber: newNum.number });
  }
  
  if (round % 20 === 0) {
    console.log(`Round ${round}: Erros acumulados = ${totalErrors}`);
  }
}

// ========================================
// RESULTADO FINAL
// ========================================
console.log('\n========================================');
console.log('RESULTADO FINAL');
console.log('========================================\n');

if (totalErrors === 0) {
  console.log('✅✅✅ NENHUM ERRO! AS CORES ACOMPANHAM OS NÚMEROS CORRETAMENTE! ✅✅✅\n');
} else {
  console.log(`❌❌❌ ${totalErrors} ERROS ENCONTRADOS! ❌❌❌\n`);
  console.log('Rounds com erros:');
  errorRounds.slice(0, 10).forEach(e => {
    console.log(`   Round ${e.round}: ${e.errors} erros (novo número: ${e.newNumber})`);
  });
}

// Mostrar amostra final
console.log('\n📊 Amostra final (primeiros 30 números exibidos):');
console.log(`   Números da estratégia ${STRATEGY_NAME}: [${STRATEGY_NUMBERS.join(', ')}]\n`);

const finalNumbersToAnalyze = recentNumbers.slice(0, ANALYSIS_LIMIT).map(rn => rn.number);
const finalDisplayArray = [...finalNumbersToAnalyze].reverse();

for (let i = 0; i < 30; i++) {
  const num = finalDisplayArray[i];
  const color = getNumberColor(num, i, finalNumbersToAnalyze.length);
  const isStrategy = STRATEGY_NUMBERS.includes(num);
  
  let emoji = '⚪';
  if (color === 'ACTIVATION') emoji = '🟡';
  if (color === 'GREEN') emoji = '🟢';
  if (color === 'RED') emoji = '🔴';
  
  const stratMark = isStrategy ? '★' : ' ';
  const isError = !isStrategy && (color === 'ACTIVATION' || color === 'GREEN');
  const errorMark = isError ? ' ❌' : '';
  
  console.log(`[${String(i).padStart(2)}] ${String(num).padStart(2)} ${emoji} ${color.padEnd(10)} ${stratMark}${errorMark}`);
}

// Contar quantos números da estratégia apareceram
const strategyCount = finalDisplayArray.filter(n => STRATEGY_NUMBERS.includes(n)).length;
console.log(`\n📈 Estatísticas:`);
console.log(`   Total de números exibidos: ${finalDisplayArray.length}`);
console.log(`   Números da estratégia: ${strategyCount}`);
console.log(`   Probabilidade teórica: ${(STRATEGY_NUMBERS.length / 37 * 100).toFixed(1)}%`);
console.log(`   Probabilidade real: ${(strategyCount / finalDisplayArray.length * 100).toFixed(1)}%`);

console.log('\n' + (totalErrors === 0 ? '✅ TESTE PASSOU!' : '❌ TESTE FALHOU!'));
