/**
 * SCRIPT DE TESTE - LÓGICA DE MARCAÇÃO DE CORES
 * 
 * Este script simula a lógica de marcação de ACTIVATION, GREEN e RED
 * para identificar problemas na implementação atual.
 */

// Importar estratégias
const strategies = require('./src/lib/strategies-simple.js');

// Configuração
const GREEN_RED_ATTEMPTS = 3; // Casas para verificar GREEN/RED

// ========================================
// SIMULAR DADOS DE ROLETA
// ========================================

// Gerar números aleatórios de roleta (0-36)
function generateRouletteNumber() {
  return Math.floor(Math.random() * 37);
}

// Gerar histórico com timestamps
function generateHistory(count) {
  const history = [];
  let timestamp = Date.now();
  
  for (let i = 0; i < count; i++) {
    history.push({
      number: generateRouletteNumber(),
      timestamp: timestamp - (i * 30000) // 30 segundos entre cada número
    });
  }
  
  return history; // [0] = mais recente, [N] = mais antigo
}

// ========================================
// LÓGICA DE MARCAÇÃO (COPIADA DO CÓDIGO)
// ========================================

function calculateStatuses(recentWithTimestamp, strategyNumbers, greenRedAttempts) {
  // Array de status - inicializa TUDO como NEUTRAL
  const statuses = recentWithTimestamp.map(entry => ({
    number: entry.number,
    timestamp: entry.timestamp,
    status: 'NEUTRAL'
  }));
  
  // Processar do mais antigo (índice maior) para o mais recente (índice menor)
  for (let i = recentWithTimestamp.length - 1; i >= 0; i--) {
    const currentNum = recentWithTimestamp[i].number;
    
    // Pula se não for número da estratégia
    if (!strategyNumbers.includes(currentNum)) {
      continue;
    }
    
    // Se já foi marcado como GREEN, não sobrescrever
    if (statuses[i].status === 'GREEN') {
      continue;
    }
    
    // É número da estratégia - marca como ACTIVATION
    statuses[i].status = 'ACTIVATION';
    
    // Procurar GREEN/RED nos próximos números (índices menores = mais recentes)
    let foundGreen = false;
    
    for (let j = 1; j <= greenRedAttempts; j++) {
      const checkIndex = i - j;
      
      // Não há números suficientes no futuro - para por aqui
      if (checkIndex < 0) {
        break;
      }
      
      const checkNum = recentWithTimestamp[checkIndex].number;
      
      // Verifica se este número pertence à estratégia
      if (strategyNumbers.includes(checkNum)) {
        // ACERTO! Marca este número como GREEN
        statuses[checkIndex].status = 'GREEN';
        foundGreen = true;
        break;
      }
      
      // Se é a última tentativa e não encontrou GREEN, marca RED
      if (j === greenRedAttempts && !foundGreen) {
        statuses[checkIndex].status = 'RED';
      }
    }
  }
  
  return statuses;
}

// ========================================
// SIMULAR getNumberColor (DISPLAY)
// ========================================

function simulateDisplay(numbersToAnalyze, statuses, statusMap) {
  // Simular o .reverse() que acontece na renderização
  const reversed = [...numbersToAnalyze].reverse();
  
  const displayResult = [];
  
  reversed.forEach((number, displayIndex) => {
    const totalNumbers = numbersToAnalyze.length;
    
    // LÓGICA DO getNumberColor:
    // const originalIndex = totalNumbers - 1 - displayIndex
    const originalIndex = totalNumbers - 1 - displayIndex;
    
    // Buscar status
    const status = statuses[originalIndex]?.status || 'NEUTRAL';
    const statusNumber = statuses[originalIndex]?.number;
    
    displayResult.push({
      displayIndex,
      originalIndex,
      displayedNumber: number,
      statusForNumber: statusNumber,
      status,
      match: number === statusNumber
    });
  });
  
  return displayResult;
}

// ========================================
// VERIFICAR ERROS
// ========================================

function checkForErrors(statuses, strategyNumbers) {
  const errors = [];
  
  statuses.forEach((s, index) => {
    // Erro 1: ACTIVATION em número que NÃO pertence à estratégia
    if (s.status === 'ACTIVATION' && !strategyNumbers.includes(s.number)) {
      errors.push({
        type: 'WRONG_ACTIVATION',
        index,
        number: s.number,
        message: `Número ${s.number} marcado como ACTIVATION mas NÃO pertence à estratégia [${strategyNumbers.join(',')}]`
      });
    }
    
    // Erro 2: GREEN em número que NÃO pertence à estratégia
    if (s.status === 'GREEN' && !strategyNumbers.includes(s.number)) {
      errors.push({
        type: 'WRONG_GREEN',
        index,
        number: s.number,
        message: `Número ${s.number} marcado como GREEN mas NÃO pertence à estratégia [${strategyNumbers.join(',')}]`
      });
    }
    
    // Erro 3: Número da estratégia não marcado (deveria ser ACTIVATION ou GREEN)
    if (strategyNumbers.includes(s.number) && s.status === 'NEUTRAL') {
      errors.push({
        type: 'MISSING_MARK',
        index,
        number: s.number,
        message: `Número ${s.number} pertence à estratégia mas está NEUTRAL (deveria ser ACTIVATION ou GREEN)`
      });
    }
  });
  
  // Erro 4: Dois ACTIVATION seguidos
  for (let i = 0; i < statuses.length - 1; i++) {
    if (statuses[i].status === 'ACTIVATION' && statuses[i+1].status === 'ACTIVATION') {
      errors.push({
        type: 'CONSECUTIVE_ACTIVATION',
        index: i,
        message: `Dois ACTIVATION seguidos: índice ${i} (${statuses[i].number}) e ${i+1} (${statuses[i+1].number})`
      });
    }
  }
  
  return errors;
}

// ========================================
// TESTE PRINCIPAL
// ========================================

function runTest() {
  console.log('========================================');
  console.log('TESTE DE MARCAÇÃO DE CORES');
  console.log('========================================\n');
  
  // Pegar algumas estratégias para testar
  const testStrategies = [
    { id: 19, name: 'Vermelho do meio', numbers: [36,27,34,25,1,14,9,18] },
    { id: 8, name: '2DV + proteção no 4', numbers: [14,16,18,19,21,23,4] },
    { id: 221, name: 'T2-T5-T6', numbers: [2,5,6,12,15,16,20,22,25,26,32,35,36] }
  ];
  
  // Gerar histórico de teste
  const history = generateHistory(50);
  
  console.log('📊 HISTÓRICO GERADO (primeiros 20):');
  console.log('   [índice 0 = mais recente]\n');
  history.slice(0, 20).forEach((h, i) => {
    console.log(`   [${i}] Número: ${h.number}`);
  });
  
  console.log('\n========================================\n');
  
  testStrategies.forEach(strategy => {
    console.log(`\n🎯 TESTANDO ESTRATÉGIA: ${strategy.name}`);
    console.log(`   Números da estratégia: [${strategy.numbers.join(', ')}]`);
    console.log('----------------------------------------');
    
    // Calcular statuses
    const statuses = calculateStatuses(history, strategy.numbers, GREEN_RED_ATTEMPTS);
    
    // Mostrar statuses não-neutros
    console.log('\n   📌 Status calculados (não-neutros):');
    statuses.forEach((s, i) => {
      if (s.status !== 'NEUTRAL') {
        const pertence = strategy.numbers.includes(s.number) ? '✅' : '❌';
        console.log(`      [${i}] Número ${s.number} → ${s.status} ${pertence}`);
      }
    });
    
    // Verificar erros
    const errors = checkForErrors(statuses, strategy.numbers);
    
    if (errors.length > 0) {
      console.log('\n   ⚠️ ERROS ENCONTRADOS:');
      errors.forEach(err => {
        console.log(`      ❌ ${err.type}: ${err.message}`);
      });
    } else {
      console.log('\n   ✅ Nenhum erro encontrado na lógica!');
    }
    
    // Simular display
    console.log('\n   🖥️ SIMULAÇÃO DO DISPLAY (reversed):');
    const display = simulateDisplay(history.map(h => h.number), statuses, null);
    
    const displayErrors = display.filter(d => !d.match && d.status !== 'NEUTRAL');
    if (displayErrors.length > 0) {
      console.log('      ⚠️ DESSINCRONIZAÇÃO NO DISPLAY:');
      displayErrors.forEach(d => {
        console.log(`         displayIndex=${d.displayIndex}, originalIndex=${d.originalIndex}`);
        console.log(`         Exibido: ${d.displayedNumber}, Status para: ${d.statusForNumber}`);
        console.log(`         Status: ${d.status}, Match: ${d.match}`);
      });
    } else {
      console.log('      ✅ Display sincronizado corretamente!');
    }
    
    console.log('\n========================================');
  });
}

// ========================================
// TESTE EM TEMPO REAL (4 MINUTOS)
// ========================================

function runRealTimeTest(durationMinutes = 4) {
  console.log('\n========================================');
  console.log('TESTE EM TEMPO REAL');
  console.log(`Duração: ${durationMinutes} minutos`);
  console.log('========================================\n');
  
  const strategy = { 
    id: 221, 
    name: 'T2-T5-T6', 
    numbers: [2,5,6,12,15,16,20,22,25,26,32,35,36] 
  };
  
  console.log(`🎯 Estratégia: ${strategy.name}`);
  console.log(`   Números: [${strategy.numbers.join(', ')}]\n`);
  
  let history = [];
  let totalNumbers = 0;
  let totalErrors = 0;
  
  const intervalMs = 3000; // Novo número a cada 3 segundos
  const endTime = Date.now() + (durationMinutes * 60 * 1000);
  
  const interval = setInterval(() => {
    if (Date.now() >= endTime) {
      clearInterval(interval);
      console.log('\n========================================');
      console.log('FIM DO TESTE');
      console.log(`Total de números: ${totalNumbers}`);
      console.log(`Total de erros: ${totalErrors}`);
      console.log('========================================');
      return;
    }
    
    // Adicionar novo número
    const newNumber = generateRouletteNumber();
    history.unshift({
      number: newNumber,
      timestamp: Date.now()
    });
    
    // Manter máximo de 100 números
    if (history.length > 100) {
      history = history.slice(0, 100);
    }
    
    totalNumbers++;
    
    // Calcular statuses
    const statuses = calculateStatuses(history, strategy.numbers, GREEN_RED_ATTEMPTS);
    
    // Verificar erros
    const errors = checkForErrors(statuses, strategy.numbers);
    
    // Mostrar resultado
    const pertence = strategy.numbers.includes(newNumber);
    const status = statuses[0]?.status || 'NEUTRAL';
    
    console.log(`[${new Date().toLocaleTimeString()}] Novo: ${newNumber.toString().padStart(2)} | ${pertence ? '✅ Pertence' : '  Não pertence'} | Status: ${status.padEnd(10)}`);
    
    if (errors.length > 0) {
      totalErrors += errors.length;
      errors.forEach(err => {
        console.log(`   ⚠️ ERRO: ${err.message}`);
      });
    }
    
    // Mostrar últimos 5 com cores
    if (totalNumbers % 10 === 0) {
      console.log('\n   📊 Últimos 10 números com status:');
      statuses.slice(0, 10).forEach((s, i) => {
        const mark = strategy.numbers.includes(s.number) ? '✅' : '  ';
        console.log(`      [${i}] ${s.number.toString().padStart(2)} → ${s.status.padEnd(10)} ${mark}`);
      });
      console.log('');
    }
    
  }, intervalMs);
  
  console.log('Iniciando teste... (Ctrl+C para parar)\n');
}

// ========================================
// EXECUTAR
// ========================================

// Primeiro rodar teste estático
runTest();

// Depois rodar teste em tempo real
console.log('\n\n');
runRealTimeTest(4);
