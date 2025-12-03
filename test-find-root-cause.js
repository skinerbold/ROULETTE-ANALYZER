// ========================================
// DEBUG DO BUG - ENCONTRAR A CAUSA RAIZ
// ========================================

const STRATEGY_NUMBERS = [2, 5, 6, 12, 15, 16, 22, 25, 26, 32, 35, 36];
const GREEN_RED_ATTEMPTS = 3;
const ANALYSIS_LIMIT = 50;

let recentNumbers = [];
let statusMap = new Map();

function randomRouletteNumber() {
  return Math.floor(Math.random() * 37);
}

function updateNumberStatuses() {
  if (recentNumbers.length === 0) {
    statusMap = new Map();
    return;
  }

  // IMPORTANTE: Usar o mesmo slice que numbersToAnalyze usa
  const numbersToAnalyze = recentNumbers.slice(0, ANALYSIS_LIMIT);
  const recentWithTimestamp = numbersToAnalyze;

  const statuses = recentWithTimestamp.map(entry => ({
    number: entry.number,
    timestamp: entry.timestamp,
    status: 'NEUTRAL'
  }));

  for (let i = recentWithTimestamp.length - 1; i >= 0; i--) {
    const currentNum = recentWithTimestamp[i].number;
    if (!STRATEGY_NUMBERS.includes(currentNum)) continue;
    if (statuses[i].status === 'GREEN') continue;

    statuses[i].status = 'ACTIVATION';

    let foundGreen = false;
    for (let j = 1; j <= GREEN_RED_ATTEMPTS; j++) {
      const checkIndex = i - j;
      if (checkIndex < 0) break;

      const checkNum = recentWithTimestamp[checkIndex].number;
      if (STRATEGY_NUMBERS.includes(checkNum)) {
        statuses[checkIndex].status = 'GREEN';
        foundGreen = true;
        break;
      }

      if (j === GREEN_RED_ATTEMPTS && !foundGreen) {
        statuses[checkIndex].status = 'RED';
      }
    }
  }

  const newStatusMap = new Map();
  statuses.forEach(s => newStatusMap.set(s.timestamp, s.status));
  statusMap = newStatusMap;
}

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
  const numbersToAnalyze = recentNumbers.slice(0, ANALYSIS_LIMIT).map(rn => rn.number);
  const displayArray = [...numbersToAnalyze].reverse();
  
  let errors = [];
  
  displayArray.forEach((num, displayIndex) => {
    const color = getNumberColor(num, displayIndex, numbersToAnalyze.length);
    const isStrategy = STRATEGY_NUMBERS.includes(num);
    
    if (!isStrategy && (color === 'ACTIVATION' || color === 'GREEN')) {
      // Verificar detalhes do erro
      const originalIndex = numbersToAnalyze.length - 1 - displayIndex;
      const entry = recentNumbers.slice(0, numbersToAnalyze.length)[originalIndex];
      
      errors.push({
        displayIndex,
        displayedNumber: num,
        originalIndex,
        entryNumber: entry?.number,
        entryTimestamp: entry?.timestamp,
        color,
        statusMapValue: statusMap.get(entry?.timestamp),
        isStrategy
      });
    }
  });
  
  return errors;
}

// ========================================
// TESTE
// ========================================

console.log('Carregando 500 números iniciais...');
for (let i = 0; i < 500; i++) {
  addNewNumber();
}
updateNumberStatuses();

let errors = verifyColors();
console.log(`Após carga inicial: ${errors.length} erros`);

// Simular 20 novos números
console.log('\nSimulando 20 novos números...\n');

for (let round = 1; round <= 20; round++) {
  const newNum = addNewNumber();
  updateNumberStatuses();
  
  errors = verifyColors();
  
  if (errors.length > 0) {
    console.log(`\n❌ Round ${round}: Novo número ${newNum.number} - ${errors.length} erros`);
    
    // Mostrar primeiro erro em detalhe
    const firstError = errors[0];
    console.log(`   Primeiro erro:`);
    console.log(`      displayIndex: ${firstError.displayIndex}`);
    console.log(`      displayedNumber: ${firstError.displayedNumber}`);
    console.log(`      originalIndex: ${firstError.originalIndex}`);
    console.log(`      entryNumber: ${firstError.entryNumber}`);
    console.log(`      color: ${firstError.color}`);
    console.log(`      isStrategy: ${firstError.isStrategy}`);
    console.log(`      match: ${firstError.displayedNumber === firstError.entryNumber}`);
    
    // IMPORTANTE: Se displayedNumber !== entryNumber, o problema é no mapeamento
    if (firstError.displayedNumber !== firstError.entryNumber) {
      console.log(`\n   🔴 MISMATCH DETECTADO!`);
      console.log(`      O número exibido (${firstError.displayedNumber}) não é o mesmo do entry (${firstError.entryNumber})`);
      console.log(`      Isso indica que getNumberColor está pegando o entry errado!`);
      
      // Verificar o que está em recentNumbers
      console.log(`\n   📋 Diagnóstico:`);
      const slice = recentNumbers.slice(0, ANALYSIS_LIMIT);
      console.log(`      recentNumbers[${firstError.originalIndex}].number = ${slice[firstError.originalIndex]?.number}`);
      console.log(`      displayArray[${firstError.displayIndex}] = ${firstError.displayedNumber}`);
      
      // O displayArray vem de: [...numbersToAnalyze].reverse()
      // numbersToAnalyze vem de: recentNumbers.slice(0, ANALYSIS_LIMIT).map(rn => rn.number)
      const numbersToAnalyze = recentNumbers.slice(0, ANALYSIS_LIMIT).map(rn => rn.number);
      const displayArray = [...numbersToAnalyze].reverse();
      console.log(`      Recalculando: displayArray[${firstError.displayIndex}] = ${displayArray[firstError.displayIndex]}`);
      console.log(`      Recalculando: numbersToAnalyze[${firstError.originalIndex}] = ${numbersToAnalyze[firstError.originalIndex]}`);
    }
    
    break; // Parar no primeiro erro para análise
  } else {
    console.log(`✅ Round ${round}: OK`);
  }
}
