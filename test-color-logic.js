// ========================================
// TESTE DE LÓGICA DE MARCAÇÃO DE CORES
// Simula 500 números aleatórios e verifica se as cores estão corretas
// ========================================

// Definição de uma estratégia de exemplo (T2-T5-T6)
const STRATEGY_NUMBERS = [2, 5, 6, 12, 15, 16, 22, 25, 26, 32, 35, 36];

// Configuração
const ANALYSIS_LIMIT = 500;
const GREEN_RED_ATTEMPTS = 3; // Casas para verificar GREEN/RED

// Gerar 500 números aleatórios (0-36)
function generateRandomNumbers(count) {
  const numbers = [];
  for (let i = 0; i < count; i++) {
    numbers.push({
      number: Math.floor(Math.random() * 37),
      timestamp: Date.now() - (count - i) * 1000 // Timestamps únicos
    });
  }
  return numbers;
}

// ========================================
// SIMULAR A LÓGICA DE updateNumberStatuses
// ========================================
function calculateStatuses(recentNumbers, strategyNumbers, greenRedAttempts) {
  // Array de status - inicializa TUDO como NEUTRAL
  const statuses = recentNumbers.map(entry => ({
    number: entry.number,
    timestamp: entry.timestamp,
    status: 'NEUTRAL'
  }));

  // Processar do mais antigo (índice maior) para o mais recente (índice menor)
  for (let i = recentNumbers.length - 1; i >= 0; i--) {
    const currentNum = recentNumbers[i].number;

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

      const checkNum = recentNumbers[checkIndex].number;

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
// SIMULAR A LÓGICA DE getNumberColor
// ========================================
function getNumberColorInfo(displayIndex, totalNumbers, recentNumbers, statusMap) {
  // O displayIndex vem do array revertido (0 = mais antigo exibido primeiro)
  // Precisamos converter para o índice do recentNumbers (0 = mais recente)
  const originalIndex = totalNumbers - 1 - displayIndex;

  const limitedRecent = recentNumbers.slice(0, totalNumbers);
  const entry = limitedRecent[originalIndex];

  if (!entry) {
    return { status: 'NEUTRAL', error: 'no entry' };
  }

  const status = statusMap.get(entry.timestamp) || 'NEUTRAL';
  return { 
    status, 
    number: entry.number,
    timestamp: entry.timestamp,
    displayIndex,
    originalIndex
  };
}

// ========================================
// FUNÇÃO DE TESTE PRINCIPAL
// ========================================
function runTest() {
  console.log('========================================');
  console.log('TESTE DE MARCAÇÃO DE CORES - ROLETA');
  console.log('========================================\n');

  // Gerar números aleatórios
  const recentNumbers = generateRandomNumbers(ANALYSIS_LIMIT);
  console.log(`✅ Gerados ${recentNumbers.length} números aleatórios`);
  console.log(`📋 Estratégia: T2-T5-T6 - Números: [${STRATEGY_NUMBERS.join(', ')}]`);
  console.log(`🎯 Casas GREEN/RED: ${GREEN_RED_ATTEMPTS}\n`);

  // Calcular status
  const statuses = calculateStatuses(recentNumbers, STRATEGY_NUMBERS, GREEN_RED_ATTEMPTS);

  // Criar statusMap (timestamp -> status)
  const statusMap = new Map();
  statuses.forEach(s => {
    statusMap.set(s.timestamp, s.status);
  });

  // Contar status
  const counts = {
    ACTIVATION: 0,
    GREEN: 0,
    RED: 0,
    NEUTRAL: 0
  };
  statuses.forEach(s => counts[s.status]++);

  console.log('📊 CONTAGEM DE STATUS:');
  console.log(`   ACTIVATION (amarelo): ${counts.ACTIVATION}`);
  console.log(`   GREEN (verde): ${counts.GREEN}`);
  console.log(`   RED (vermelho): ${counts.RED}`);
  console.log(`   NEUTRAL (cinza): ${counts.NEUTRAL}\n`);

  // ========================================
  // VERIFICAÇÃO DE ERROS
  // ========================================
  let errors = 0;
  const errorDetails = [];

  console.log('🔍 VERIFICANDO ERROS...\n');

  statuses.forEach((s, i) => {
    const isStrategyNumber = STRATEGY_NUMBERS.includes(s.number);
    const status = s.status;

    // REGRA 1: Números que NÃO são da estratégia NUNCA podem ter ACTIVATION ou GREEN
    if (!isStrategyNumber && (status === 'ACTIVATION' || status === 'GREEN')) {
      errors++;
      errorDetails.push({
        index: i,
        number: s.number,
        status: status,
        error: `Número ${s.number} NÃO pertence à estratégia mas foi marcado como ${status}`,
        isStrategyNumber: false
      });
    }

    // REGRA 2: RED só pode aparecer em números que NÃO são da estratégia
    // (RED é marcado em números que vieram DEPOIS de uma ACTIVATION e não eram da estratégia)
    // Esta regra precisa de mais contexto, então vamos verificar se é correto
    if (status === 'RED' && isStrategyNumber) {
      errors++;
      errorDetails.push({
        index: i,
        number: s.number,
        status: status,
        error: `Número ${s.number} pertence à estratégia mas foi marcado como RED`,
        isStrategyNumber: true
      });
    }
  });

  // ========================================
  // RELATÓRIO FINAL
  // ========================================
  if (errors === 0) {
    console.log('✅✅✅ NENHUM ERRO ENCONTRADO! ✅✅✅');
    console.log('A lógica de marcação de cores está CORRETA!\n');
  } else {
    console.log(`❌❌❌ ENCONTRADOS ${errors} ERROS! ❌❌❌\n`);
    
    // Mostrar primeiros 20 erros
    const showErrors = errorDetails.slice(0, 20);
    console.log('Primeiros erros encontrados:');
    showErrors.forEach((e, i) => {
      console.log(`   ${i+1}. [índice ${e.index}] ${e.error}`);
    });
    
    if (errorDetails.length > 20) {
      console.log(`   ... e mais ${errorDetails.length - 20} erros\n`);
    }
  }

  // ========================================
  // TESTE DE CONVERSÃO DE ÍNDICE (getNumberColor)
  // ========================================
  console.log('\n========================================');
  console.log('TESTE DE CONVERSÃO DE ÍNDICE (getNumberColor)');
  console.log('========================================\n');

  // Simular array revertido para exibição
  const displayArray = [...recentNumbers.slice(0, ANALYSIS_LIMIT)].reverse();
  const totalNumbers = displayArray.length;

  let indexErrors = 0;
  const indexErrorDetails = [];

  displayArray.forEach((displayEntry, displayIndex) => {
    // Simular getNumberColor
    const colorInfo = getNumberColorInfo(displayIndex, totalNumbers, recentNumbers, statusMap);
    
    // O número no displayArray[displayIndex] deve corresponder ao número retornado por getNumberColorInfo
    if (colorInfo.number !== displayEntry.number) {
      indexErrors++;
      indexErrorDetails.push({
        displayIndex,
        expectedNumber: displayEntry.number,
        gotNumber: colorInfo.number,
        originalIndex: colorInfo.originalIndex
      });
    }
  });

  if (indexErrors === 0) {
    console.log('✅✅✅ CONVERSÃO DE ÍNDICE CORRETA! ✅✅✅');
    console.log('getNumberColor está mapeando índices corretamente!\n');
  } else {
    console.log(`❌❌❌ ENCONTRADOS ${indexErrors} ERROS DE ÍNDICE! ❌❌❌\n`);
    
    const showIndexErrors = indexErrorDetails.slice(0, 10);
    console.log('Primeiros erros de índice:');
    showIndexErrors.forEach((e, i) => {
      console.log(`   ${i+1}. displayIndex=${e.displayIndex}: esperado ${e.expectedNumber}, obtido ${e.gotNumber} (originalIndex=${e.originalIndex})`);
    });
  }

  // ========================================
  // AMOSTRA DE DADOS
  // ========================================
  console.log('\n========================================');
  console.log('AMOSTRA DE DADOS (primeiros 30 números)');
  console.log('========================================\n');

  console.log('Formato: [displayIndex] número (status) - pertence à estratégia?');
  console.log('(displayIndex 0 = mais antigo exibido primeiro)\n');

  for (let i = 0; i < Math.min(30, displayArray.length); i++) {
    const displayNum = displayArray[i].number;
    const colorInfo = getNumberColorInfo(i, totalNumbers, recentNumbers, statusMap);
    const isStrategy = STRATEGY_NUMBERS.includes(displayNum);
    const strategyMark = isStrategy ? '★' : ' ';
    
    let statusEmoji = '⚪';
    if (colorInfo.status === 'ACTIVATION') statusEmoji = '🟡';
    if (colorInfo.status === 'GREEN') statusEmoji = '🟢';
    if (colorInfo.status === 'RED') statusEmoji = '🔴';
    
    console.log(`[${String(i).padStart(2)}] ${String(displayNum).padStart(2)} ${statusEmoji} ${colorInfo.status.padEnd(10)} ${strategyMark}`);
  }

  // ========================================
  // VERIFICAÇÃO FINAL: Cores em números não-estratégia
  // ========================================
  console.log('\n========================================');
  console.log('VERIFICAÇÃO: Cores em números NÃO da estratégia');
  console.log('========================================\n');

  let nonStrategyColored = 0;
  const nonStrategyColoredDetails = [];

  statuses.forEach((s, i) => {
    if (!STRATEGY_NUMBERS.includes(s.number) && (s.status === 'ACTIVATION' || s.status === 'GREEN')) {
      nonStrategyColored++;
      nonStrategyColoredDetails.push({
        index: i,
        number: s.number,
        status: s.status
      });
    }
  });

  if (nonStrategyColored === 0) {
    console.log('✅ Nenhum número fora da estratégia foi marcado como ACTIVATION ou GREEN');
  } else {
    console.log(`❌ ${nonStrategyColored} números fora da estratégia foram marcados incorretamente:`);
    nonStrategyColoredDetails.slice(0, 10).forEach((e, i) => {
      console.log(`   ${i+1}. Número ${e.number} marcado como ${e.status} (índice ${e.index})`);
    });
  }

  // Retornar resultado para verificação programática
  return {
    totalNumbers: recentNumbers.length,
    statusCounts: counts,
    colorErrors: errors,
    indexErrors: indexErrors,
    nonStrategyColoredCount: nonStrategyColored,
    success: errors === 0 && indexErrors === 0 && nonStrategyColored === 0
  };
}

// Executar teste
const result = runTest();

console.log('\n========================================');
console.log('RESULTADO FINAL');
console.log('========================================');
console.log(result.success ? '✅ TODOS OS TESTES PASSARAM!' : '❌ ALGUNS TESTES FALHARAM');
console.log(`   Erros de cor: ${result.colorErrors}`);
console.log(`   Erros de índice: ${result.indexErrors}`);
console.log(`   Não-estratégia coloridos: ${result.nonStrategyColoredCount}`);
