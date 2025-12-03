/**
 * Script de Teste Completo de Estratégias
 * Testa TODAS as estratégias do arquivo strategies.ts
 * 
 * Execute com: node test-all-strategies.js
 */

const fs = require('fs');
const path = require('path');

// Cores para output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
}

// Ler e parsear o arquivo de estratégias
function parseStrategiesFile() {
  const filePath = path.join(__dirname, 'src', 'lib', 'strategies.ts');
  const content = fs.readFileSync(filePath, 'utf-8');
  
  const strategies = [];
  
  // Regex para encontrar estratégias: { id: X, name: "Y", numbers: [Z] }
  const regex = /\{\s*id:\s*(\d+),\s*name:\s*["']([^"']+)["'],\s*numbers:\s*\[([^\]]*)\]\s*\}/g;
  
  let match;
  while ((match = regex.exec(content)) !== null) {
    const id = parseInt(match[1]);
    const name = match[2];
    const numbersStr = match[3];
    const numbers = numbersStr.split(',').map(n => parseInt(n.trim())).filter(n => !isNaN(n));
    
    strategies.push({ id, name, numbers });
  }
  
  return strategies;
}

// Simular a lógica de updateNumberStatuses (EXATA do page.tsx)
function simulateColorMarking(numbers, strategyNumbers, greenRedAttempts = 3) {
  // Simular recentNumbers com timestamps
  const recentWithTimestamp = numbers.map((num, i) => ({
    number: num,
    timestamp: Date.now() - (i * 60000)
  }));
  
  // Inverter para processar do mais antigo para o mais recente
  const reversed = [...recentWithTimestamp].reverse();
  
  // Cache de cores
  const colorCache = {};
  
  let i = 0;
  while (i < reversed.length) {
    const currentEntry = reversed[i];
    const currentNum = currentEntry.number;
    const currentTimestamp = currentEntry.timestamp;
    
    // Se já está no cache, pula
    if (colorCache[currentTimestamp]) {
      i++;
      continue;
    }
    
    // Verifica se é um número da estratégia (ativação)
    if (strategyNumbers.includes(currentNum)) {
      colorCache[currentTimestamp] = 'ACTIVATION';
      
      let foundGreen = false;
      let greenIndex = -1;
      let lastCheckIndex = i;
      let hasEnoughFutureNumbers = true;
      
      for (let j = 1; j <= greenRedAttempts; j++) {
        const checkIndex = i + j;
        
        if (checkIndex >= reversed.length) {
          hasEnoughFutureNumbers = false;
          break;
        }
        
        lastCheckIndex = checkIndex;
        
        const intermediateTimestamp = reversed[checkIndex].timestamp;
        if (!colorCache[intermediateTimestamp]) {
          colorCache[intermediateTimestamp] = 'NEUTRAL';
        }
        
        if (strategyNumbers.includes(reversed[checkIndex].number)) {
          foundGreen = true;
          greenIndex = checkIndex;
          break;
        }
      }
      
      if (foundGreen) {
        const greenTimestamp = reversed[greenIndex].timestamp;
        colorCache[greenTimestamp] = 'GREEN';
        i = greenIndex;
      } else if (hasEnoughFutureNumbers) {
        const redTimestamp = reversed[lastCheckIndex].timestamp;
        colorCache[redTimestamp] = 'RED';
        i = lastCheckIndex;
      } else {
        i++;
      }
    } else {
      colorCache[currentTimestamp] = 'NEUTRAL';
      i++;
    }
  }
  
  // Mapear de volta para a ordem original
  return recentWithTimestamp.map(entry => colorCache[entry.timestamp] || 'NEUTRAL');
}

// Verificar erros de marcação
function verifyMarking(numbers, strategyNumbers, statuses) {
  const errors = [];
  
  for (let i = 0; i < numbers.length; i++) {
    const num = numbers[i];
    const status = statuses[i];
    const isInStrategy = strategyNumbers.includes(num);
    
    // ERRO CRÍTICO: ACTIVATION ou GREEN em número que NÃO está na estratégia
    if ((status === 'ACTIVATION' || status === 'GREEN') && !isInStrategy) {
      errors.push({
        type: 'INVALID_MARKING',
        position: i,
        number: num,
        status: status,
        message: `Número ${num} marcado como ${status} mas NÃO está na estratégia`
      });
    }
  }
  
  return errors;
}

// Verificar números da estratégia
function verifyStrategyNumbers(strategy) {
  const issues = [];
  
  // Números fora do range 0-36
  const invalid = strategy.numbers.filter(n => n < 0 || n > 36);
  if (invalid.length > 0) {
    issues.push({
      type: 'INVALID_RANGE',
      message: `Números fora do range 0-36: [${invalid.join(', ')}]`
    });
  }
  
  // Duplicatas
  const seen = new Set();
  const duplicates = [];
  for (const n of strategy.numbers) {
    if (seen.has(n)) {
      duplicates.push(n);
    }
    seen.add(n);
  }
  if (duplicates.length > 0) {
    issues.push({
      type: 'DUPLICATES',
      message: `Números duplicados: [${[...new Set(duplicates)].join(', ')}]`
    });
  }
  
  // Vazia
  if (strategy.numbers.length === 0) {
    issues.push({
      type: 'EMPTY',
      message: 'Estratégia sem números!'
    });
  }
  
  return issues;
}

// Gerar números de teste que GARANTEM ter números da estratégia
function generateTestNumbersWithStrategy(strategyNumbers, count = 50) {
  const numbers = [];
  
  for (let i = 0; i < count; i++) {
    // 30% de chance de ser um número da estratégia
    if (Math.random() < 0.3 && strategyNumbers.length > 0) {
      const randomIndex = Math.floor(Math.random() * strategyNumbers.length);
      numbers.push(strategyNumbers[randomIndex]);
    } else {
      numbers.push(Math.floor(Math.random() * 37));
    }
  }
  
  return numbers;
}

// Testar uma estratégia específica
function testStrategy(strategy, testNumbers = null) {
  // Verificar números da estratégia
  const numberIssues = verifyStrategyNumbers(strategy);
  
  if (numberIssues.length > 0) {
    return {
      success: false,
      strategy,
      numberIssues,
      markingErrors: [],
      testNumbers: []
    };
  }
  
  // Gerar números de teste se não fornecidos
  const numbers = testNumbers || generateTestNumbersWithStrategy(strategy.numbers, 100);
  
  // Simular marcação
  const statuses = simulateColorMarking(numbers, strategy.numbers, 3);
  
  // Verificar erros de marcação
  const markingErrors = verifyMarking(numbers, strategy.numbers, statuses);
  
  return {
    success: numberIssues.length === 0 && markingErrors.length === 0,
    strategy,
    numberIssues,
    markingErrors,
    testNumbers: numbers,
    statuses
  };
}

// Testar estratégia específica com detalhes
function testStrategyDetailed(strategy) {
  console.log(`\n${colors.cyan}========================================${colors.reset}`);
  console.log(`${colors.cyan}Testando: [${strategy.id}] ${strategy.name}${colors.reset}`);
  console.log(`${colors.cyan}========================================${colors.reset}`);
  
  console.log(`\nNúmeros da estratégia (${strategy.numbers.length}):`);
  console.log(`[${strategy.numbers.join(', ')}]`);
  
  // Verificar números
  const numberIssues = verifyStrategyNumbers(strategy);
  if (numberIssues.length > 0) {
    console.log(`\n${colors.red}PROBLEMAS NOS NÚMEROS:${colors.reset}`);
    numberIssues.forEach(issue => {
      console.log(`  ${colors.red}• ${issue.message}${colors.reset}`);
    });
    return { success: false, numberIssues, markingErrors: [] };
  }
  
  // Gerar números de teste específicos
  const testNumbers = generateTestNumbersWithStrategy(strategy.numbers, 30);
  console.log(`\nNúmeros de teste (${testNumbers.length}):`);
  console.log(`[${testNumbers.join(', ')}]`);
  
  // Simular marcação
  const statuses = simulateColorMarking(testNumbers, strategy.numbers, 3);
  
  // Mostrar resultado
  console.log(`\nResultado da marcação:`);
  for (let i = 0; i < testNumbers.length; i++) {
    const num = testNumbers[i];
    const status = statuses[i];
    const isInStrategy = strategy.numbers.includes(num);
    
    let color = colors.reset;
    let marker = '  ';
    
    if (status === 'ACTIVATION') { color = colors.yellow; marker = '⚡'; }
    if (status === 'GREEN') { color = colors.green; marker = '✓ '; }
    if (status === 'RED') { color = colors.red; marker = '✗ '; }
    
    const inStrat = isInStrategy ? `${colors.magenta}★${colors.reset}` : ' ';
    
    // Destacar ERRO: marcação em número que não está na estratégia
    let errorMark = '';
    if ((status === 'ACTIVATION' || status === 'GREEN') && !isInStrategy) {
      errorMark = `${colors.red} ❌ ERRO!${colors.reset}`;
    }
    
    console.log(`  ${inStrat} [${i.toString().padStart(2)}] ${num.toString().padStart(2)} → ${color}${marker} ${status.padEnd(10)}${colors.reset}${errorMark}`);
  }
  
  // Verificar erros
  const markingErrors = verifyMarking(testNumbers, strategy.numbers, statuses);
  
  if (markingErrors.length > 0) {
    console.log(`\n${colors.red}ERROS DE MARCAÇÃO ENCONTRADOS:${colors.reset}`);
    markingErrors.forEach(err => {
      console.log(`  ${colors.red}• Posição ${err.position}: ${err.message}${colors.reset}`);
    });
  } else {
    console.log(`\n${colors.green}✓ Nenhum erro de marcação encontrado${colors.reset}`);
  }
  
  return { success: markingErrors.length === 0, numberIssues, markingErrors };
}

// MAIN
console.log(`${colors.cyan}╔══════════════════════════════════════════════════╗${colors.reset}`);
console.log(`${colors.cyan}║  TESTE COMPLETO DE TODAS AS ESTRATÉGIAS          ║${colors.reset}`);
console.log(`${colors.cyan}╚══════════════════════════════════════════════════╝${colors.reset}`);

// Carregar estratégias
console.log(`\n${colors.blue}Carregando estratégias do arquivo...${colors.reset}`);
const allStrategies = parseStrategiesFile();
console.log(`${colors.green}✓ ${allStrategies.length} estratégias encontradas${colors.reset}`);

// Primeiro: Verificar problemas nos números das estratégias
console.log(`\n${colors.cyan}========================================${colors.reset}`);
console.log(`${colors.cyan}FASE 1: Verificando números das estratégias${colors.reset}`);
console.log(`${colors.cyan}========================================${colors.reset}`);

const strategiesWithNumberIssues = [];
for (const strategy of allStrategies) {
  const issues = verifyStrategyNumbers(strategy);
  if (issues.length > 0) {
    strategiesWithNumberIssues.push({ strategy, issues });
  }
}

if (strategiesWithNumberIssues.length === 0) {
  console.log(`\n${colors.green}✓ Todas as estratégias têm números válidos${colors.reset}`);
} else {
  console.log(`\n${colors.red}${strategiesWithNumberIssues.length} estratégias com problemas nos números:${colors.reset}`);
  for (const { strategy, issues } of strategiesWithNumberIssues) {
    console.log(`\n  ${colors.red}[${strategy.id}] ${strategy.name}${colors.reset}`);
    for (const issue of issues) {
      console.log(`    • ${issue.message}`);
    }
  }
}

// Segundo: Testar marcação de cores
console.log(`\n${colors.cyan}========================================${colors.reset}`);
console.log(`${colors.cyan}FASE 2: Testando marcação de cores${colors.reset}`);
console.log(`${colors.cyan}========================================${colors.reset}`);

const strategiesWithMarkingErrors = [];
let testedCount = 0;
let passedCount = 0;

process.stdout.write('\nTestando: ');

for (const strategy of allStrategies) {
  // Pular estratégias com problemas nos números
  if (strategiesWithNumberIssues.some(s => s.strategy.id === strategy.id)) {
    process.stdout.write(`${colors.yellow}S${colors.reset}`);
    continue;
  }
  
  testedCount++;
  
  // Testar com múltiplos conjuntos de números aleatórios
  let hasError = false;
  let allErrors = [];
  
  for (let run = 0; run < 5; run++) {
    const result = testStrategy(strategy);
    if (result.markingErrors.length > 0) {
      hasError = true;
      allErrors.push({
        run,
        errors: result.markingErrors,
        testNumbers: result.testNumbers,
        statuses: result.statuses
      });
    }
  }
  
  if (hasError) {
    process.stdout.write(`${colors.red}✗${colors.reset}`);
    strategiesWithMarkingErrors.push({ strategy, errorRuns: allErrors });
  } else {
    passedCount++;
    process.stdout.write(`${colors.green}✓${colors.reset}`);
  }
}

console.log(`\n\n${colors.cyan}========================================${colors.reset}`);
console.log(`${colors.cyan}RESULTADO FINAL${colors.reset}`);
console.log(`${colors.cyan}========================================${colors.reset}`);

console.log(`\nEstratégias testadas: ${testedCount}`);
console.log(`${colors.green}Passaram: ${passedCount}${colors.reset}`);
console.log(`${colors.red}Falharam: ${strategiesWithMarkingErrors.length}${colors.reset}`);
console.log(`${colors.yellow}Puladas (problemas nos números): ${strategiesWithNumberIssues.length}${colors.reset}`);

// Mostrar detalhes dos erros
if (strategiesWithMarkingErrors.length > 0) {
  console.log(`\n${colors.red}═══════════════════════════════════════${colors.reset}`);
  console.log(`${colors.red}ESTRATÉGIAS COM ERROS DE MARCAÇÃO:${colors.reset}`);
  console.log(`${colors.red}═══════════════════════════════════════${colors.reset}`);
  
  for (const { strategy, errorRuns } of strategiesWithMarkingErrors) {
    console.log(`\n${colors.red}[${strategy.id}] ${strategy.name}${colors.reset}`);
    console.log(`Números: [${strategy.numbers.join(', ')}]`);
    
    // Mostrar primeiro erro como exemplo
    const firstErrorRun = errorRuns[0];
    console.log(`\nExemplo de erro (run ${firstErrorRun.run + 1}):`);
    
    for (const err of firstErrorRun.errors.slice(0, 3)) {
      console.log(`  • Posição ${err.position}: número ${err.number} marcado como ${err.status}`);
      console.log(`    Números próximos: [${firstErrorRun.testNumbers.slice(Math.max(0, err.position - 2), err.position + 3).join(', ')}]`);
    }
  }
}

// Testar ImparBaixo especificamente (mencionado pelo usuário)
console.log(`\n${colors.cyan}═══════════════════════════════════════${colors.reset}`);
console.log(`${colors.cyan}TESTE DETALHADO: ImparBaixo${colors.reset}`);
console.log(`${colors.cyan}═══════════════════════════════════════${colors.reset}`);

const imparBaixo = allStrategies.find(s => s.name === 'ImparBaixo');
if (imparBaixo) {
  testStrategyDetailed(imparBaixo);
} else {
  console.log(`${colors.red}Estratégia ImparBaixo não encontrada!${colors.reset}`);
}

console.log(`\n${colors.cyan}========================================${colors.reset}`);
console.log(`${colors.green}Testes concluídos!${colors.reset}`);
console.log(`${colors.cyan}========================================${colors.reset}\n`);
