// ========================================
// DEBUG DETALHADO DO BUG
// ========================================

const STRATEGY_NUMBERS = [2, 5, 6, 12, 15, 16, 22, 25, 26, 32, 35, 36];
const GREEN_RED_ATTEMPTS = 3;
const ANALYSIS_LIMIT = 10; // Pequeno para debug

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

  const numbersToAnalyze = recentNumbers.slice(0, ANALYSIS_LIMIT).map(rn => rn.number);
  const recentWithTimestamp = recentNumbers.slice(0, numbersToAnalyze.length);

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
  
  return statuses;
}

function getNumberColor(number, displayIndex, totalNumbers) {
  const originalIndex = totalNumbers - 1 - displayIndex;
  const limitedRecent = recentNumbers.slice(0, totalNumbers);
  const entry = limitedRecent[originalIndex];

  if (!entry) {
    return { color: 'NEUTRAL', entry: null, originalIndex };
  }

  const status = statusMap.get(entry.timestamp) || 'NEUTRAL';
  return { color: status, entry, originalIndex, timestamp: entry.timestamp };
}

function addNewNumber(num = null) {
  const newNumber = {
    number: num !== null ? num : randomRouletteNumber(),
    timestamp: Date.now() + Math.random() // Garantir timestamp único
  };
  
  recentNumbers.unshift(newNumber);
  
  if (recentNumbers.length > 500) {
    recentNumbers = recentNumbers.slice(0, 500);
  }
  
  return newNumber;
}

// ========================================
// DEBUG PASSO A PASSO
// ========================================

console.log('========================================');
console.log('DEBUG PASSO A PASSO');
console.log('========================================\n');

// Adicionar números conhecidos para debug
// Vou adicionar: 10, 5, 20, 30, 2, 15, 8, 9, 22, 1
// Estratégia tem: 2, 5, 6, 12, 15, 16, 22, 25, 26, 32, 35, 36
const initialNumbers = [10, 5, 20, 30, 2, 15, 8, 9, 22, 1];

console.log('Adicionando números (mais recente primeiro):');
initialNumbers.forEach((n, i) => {
  addNewNumber(n);
  console.log(`   [${i}] Adicionado ${n}`);
});

console.log('\n📋 recentNumbers (índice 0 = mais recente):');
recentNumbers.forEach((rn, i) => {
  const isStrat = STRATEGY_NUMBERS.includes(rn.number);
  console.log(`   [${i}] número=${rn.number} ${isStrat ? '★' : ''}`);
});

// Calcular status
console.log('\n🎯 Calculando status...');
const statuses = updateNumberStatuses();

console.log('\n📊 Status calculados (índice 0 = mais recente):');
statuses.forEach((s, i) => {
  const isStrat = STRATEGY_NUMBERS.includes(s.number);
  console.log(`   [${i}] número=${s.number} status=${s.status} ${isStrat ? '★' : ''}`);
});

// Simular render
console.log('\n🖥️ Simulando RENDER (array revertido, índice 0 = mais antigo):');
const numbersToAnalyze = recentNumbers.slice(0, ANALYSIS_LIMIT).map(rn => rn.number);
const displayArray = [...numbersToAnalyze].reverse();

displayArray.forEach((num, displayIndex) => {
  const colorInfo = getNumberColor(num, displayIndex, numbersToAnalyze.length);
  const isStrat = STRATEGY_NUMBERS.includes(num);
  const isError = !isStrat && (colorInfo.color === 'ACTIVATION' || colorInfo.color === 'GREEN');
  
  console.log(`   displayIndex=${displayIndex} → originalIndex=${colorInfo.originalIndex}`);
  console.log(`      Número exibido: ${num} ${isStrat ? '★' : ''}`);
  console.log(`      Entry encontrado: ${colorInfo.entry?.number}`);
  console.log(`      Cor retornada: ${colorInfo.color} ${isError ? '❌ ERRO!' : ''}`);
  console.log('');
});

// AGORA: Adicionar um novo número e ver o que acontece
console.log('========================================');
console.log('APÓS ADICIONAR NOVO NÚMERO (35)');
console.log('========================================\n');

addNewNumber(35); // 35 é da estratégia
updateNumberStatuses();

console.log('📋 recentNumbers APÓS novo número:');
recentNumbers.slice(0, ANALYSIS_LIMIT).forEach((rn, i) => {
  const isStrat = STRATEGY_NUMBERS.includes(rn.number);
  console.log(`   [${i}] número=${rn.number} ${isStrat ? '★' : ''}`);
});

console.log('\n🖥️ RENDER APÓS novo número:');
const newNumbersToAnalyze = recentNumbers.slice(0, ANALYSIS_LIMIT).map(rn => rn.number);
const newDisplayArray = [...newNumbersToAnalyze].reverse();

newDisplayArray.forEach((num, displayIndex) => {
  const colorInfo = getNumberColor(num, displayIndex, newNumbersToAnalyze.length);
  const isStrat = STRATEGY_NUMBERS.includes(num);
  const isError = !isStrat && (colorInfo.color === 'ACTIVATION' || colorInfo.color === 'GREEN');
  
  const emoji = colorInfo.color === 'ACTIVATION' ? '🟡' : 
                colorInfo.color === 'GREEN' ? '🟢' : 
                colorInfo.color === 'RED' ? '🔴' : '⚪';
  
  console.log(`   [${displayIndex}] ${num} ${emoji} ${colorInfo.color} ${isStrat ? '★' : ''} ${isError ? '❌' : ''}`);
});
