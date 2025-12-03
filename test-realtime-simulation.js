// ========================================
// TESTE DE SIMULAÇÃO EM TEMPO REAL
// Simula números chegando e mudando de posição
// ========================================

// Definição de uma estratégia de exemplo (T2-T5-T6)
const STRATEGY_NUMBERS = [2, 5, 6, 12, 15, 16, 22, 25, 26, 32, 35, 36];
const GREEN_RED_ATTEMPTS = 3;
const ANALYSIS_LIMIT = 50; // Usar 50 para visualização, mas testamos com 500

// ========================================
// SIMULAR O ESTADO DO REACT
// ========================================
let recentNumbers = []; // Array de { number, timestamp }
let statusMap = new Map();

// Gerar número aleatório de roleta (0-36)
function randomRouletteNumber() {
  return Math.floor(Math.random() * 37);
}

// ========================================
// FUNÇÃO updateNumberStatuses (EXATAMENTE como no React)
// ========================================
function updateNumberStatuses() {
  if (recentNumbers.length === 0) {
    statusMap = new Map();
    return;
  }

  const numbersToAnalyze = recentNumbers.slice(0, ANALYSIS_LIMIT).map(rn => rn.number);
  const recentWithTimestamp = recentNumbers.slice(0, numbersToAnalyze.length);

  // Array de status - inicializa TUDO como NEUTRAL
  const statuses = recentWithTimestamp.map(entry => ({
    number: entry.number,
    timestamp: entry.timestamp,
    status: 'NEUTRAL'
  }));

  // Processar do mais antigo para o mais recente
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

  // Criar novo statusMap
  const newStatusMap = new Map();
  statuses.forEach(s => newStatusMap.set(s.timestamp, s.status));
  statusMap = newStatusMap;
}

// ========================================
// FUNÇÃO getNumberColor (EXATAMENTE como no React)
// ========================================
function getNumberColor(number, displayIndex, totalNumbers) {
  const originalIndex = totalNumbers - 1 - displayIndex;
  const limitedRecent = recentNumbers.slice(0, totalNumbers);
  const entry = limitedRecent[originalIndex];

  if (!entry) {
    return 'NEUTRAL';
  }

  return statusMap.get(entry.timestamp) || 'NEUTRAL';
}

// ========================================
// FUNÇÃO DE EXIBIÇÃO (simula o render do React)
// ========================================
function renderDisplay() {
  const numbersToAnalyze = recentNumbers.slice(0, ANALYSIS_LIMIT).map(rn => rn.number);
  const displayArray = [...numbersToAnalyze].reverse();
  
  let output = '';
  let errors = 0;
  
  displayArray.forEach((num, displayIndex) => {
    const color = getNumberColor(num, displayIndex, numbersToAnalyze.length);
    const isStrategy = STRATEGY_NUMBERS.includes(num);
    
    // VERIFICAÇÃO: Se não é número da estratégia, cor NUNCA pode ser ACTIVATION ou GREEN
    if (!isStrategy && (color === 'ACTIVATION' || color === 'GREEN')) {
      errors++;
      output += `❌ [${displayIndex}] ${num} → ${color} (ERRO! Não pertence à estratégia)\n`;
    }
  });
  
  return { errors, output, displayArray };
}

// ========================================
// SIMULAR CHEGADA DE NÚMEROS EM TEMPO REAL
// ========================================
function addNewNumber() {
  const newNumber = {
    number: randomRouletteNumber(),
    timestamp: Date.now()
  };
  
  // Adicionar no INÍCIO do array (mais recente primeiro)
  recentNumbers.unshift(newNumber);
  
  // Limitar tamanho (como o WebSocket faz)
  if (recentNumbers.length > 500) {
    recentNumbers = recentNumbers.slice(0, 500);
  }
  
  return newNumber;
}

// ========================================
// TESTE PRINCIPAL
// ========================================
console.log('========================================');
console.log('TESTE DE SIMULAÇÃO EM TEMPO REAL');
console.log('========================================\n');

console.log(`📋 Estratégia: T2-T5-T6 - Números: [${STRATEGY_NUMBERS.join(', ')}]`);
console.log(`🎯 Casas GREEN/RED: ${GREEN_RED_ATTEMPTS}`);
console.log(`📊 Limite de análise: ${ANALYSIS_LIMIT}\n`);

// FASE 1: Carregar 500 números iniciais
console.log('FASE 1: Carregando 500 números iniciais...\n');

for (let i = 0; i < 500; i++) {
  addNewNumber();
}
updateNumberStatuses();

let result = renderDisplay();
console.log(`Após carga inicial:`);
console.log(`   Total números: ${recentNumbers.length}`);
console.log(`   Erros encontrados: ${result.errors}`);

if (result.errors > 0) {
  console.log('\n❌ ERROS NA CARGA INICIAL:');
  console.log(result.output);
}

// FASE 2: Simular 100 novos números chegando (como em tempo real)
console.log('\n========================================');
console.log('FASE 2: Simulando 100 novos números chegando...');
console.log('========================================\n');

let totalErrors = 0;
const errorLog = [];

for (let round = 1; round <= 100; round++) {
  // Adicionar novo número
  const newNum = addNewNumber();
  
  // RECALCULAR STATUS (como o novo useEffect faz)
  updateNumberStatuses();
  
  // Verificar erros
  result = renderDisplay();
  
  if (result.errors > 0) {
    totalErrors += result.errors;
    errorLog.push({
      round,
      newNumber: newNum.number,
      errors: result.errors,
      details: result.output
    });
  }
  
  // Log a cada 10 rounds
  if (round % 10 === 0) {
    console.log(`Round ${round}: Novo número ${newNum.number} - Erros acumulados: ${totalErrors}`);
  }
}

// ========================================
// RELATÓRIO FINAL
// ========================================
console.log('\n========================================');
console.log('RELATÓRIO FINAL');
console.log('========================================\n');

if (totalErrors === 0) {
  console.log('✅✅✅ NENHUM ERRO DURANTE A SIMULAÇÃO! ✅✅✅');
  console.log('As cores acompanham corretamente os números!\n');
} else {
  console.log(`❌❌❌ ${totalErrors} ERROS DURANTE A SIMULAÇÃO! ❌❌❌\n`);
  
  console.log('Primeiros 5 erros:');
  errorLog.slice(0, 5).forEach(e => {
    console.log(`\nRound ${e.round} (novo número: ${e.newNumber}):`);
    console.log(e.details);
  });
}

// ========================================
// VERIFICAÇÃO FINAL DO ESTADO
// ========================================
console.log('\n========================================');
console.log('VERIFICAÇÃO FINAL DO ESTADO');
console.log('========================================\n');

const finalNumbersToAnalyze = recentNumbers.slice(0, ANALYSIS_LIMIT).map(rn => rn.number);
const finalDisplayArray = [...finalNumbersToAnalyze].reverse();

console.log('Primeiros 20 números exibidos (do mais antigo para o mais recente):');
console.log('Formato: [displayIndex] número (cor) pertence_estratégia?\n');

for (let i = 0; i < 20; i++) {
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

// ========================================
// TESTE DE CONSISTÊNCIA: Verificar se timestamp está correto
// ========================================
console.log('\n========================================');
console.log('TESTE DE CONSISTÊNCIA DE TIMESTAMP');
console.log('========================================\n');

let timestampErrors = 0;

for (let i = 0; i < Math.min(20, finalDisplayArray.length); i++) {
  const displayedNum = finalDisplayArray[i];
  const originalIndex = finalNumbersToAnalyze.length - 1 - i;
  const entry = recentNumbers.slice(0, finalNumbersToAnalyze.length)[originalIndex];
  
  if (!entry) {
    console.log(`[${i}] ❌ Sem entry para originalIndex ${originalIndex}`);
    timestampErrors++;
    continue;
  }
  
  if (entry.number !== displayedNum) {
    console.log(`[${i}] ❌ Mismatch: exibido ${displayedNum}, entry.number ${entry.number}`);
    timestampErrors++;
  }
}

if (timestampErrors === 0) {
  console.log('✅ Todos os timestamps estão consistentes!');
} else {
  console.log(`\n❌ ${timestampErrors} inconsistências de timestamp encontradas!`);
}

// ========================================
// RESULTADO FINAL
// ========================================
console.log('\n========================================');
console.log('RESULTADO FINAL');
console.log('========================================');

const success = totalErrors === 0 && timestampErrors === 0;
console.log(success ? '\n✅ TODOS OS TESTES PASSARAM!' : '\n❌ ALGUNS TESTES FALHARAM!');
console.log(`   Erros de cor: ${totalErrors}`);
console.log(`   Erros de timestamp: ${timestampErrors}`);
