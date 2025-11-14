/**
 * ========================================
 * TESTE ACELERADO - SIMULAÇÃO DE NÚMEROS REAIS
 * ========================================
 * 
 * Este script simula recebimento rápido de números e testa
 * todas as estratégias em cenário intensivo para detectar problemas.
 * 
 * Duração: 2 minutos
 * Execução: node test-accelerated.js
 */

const fs = require('fs');
const path = require('path');

const TEST_DURATION_MS = 2 * 60 * 1000; // 2 minutos
const startTime = Date.now();

// ========================================
// CORES PARA OUTPUT
// ========================================
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function log(msg, color = 'reset') {
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`${colors[color]}[${elapsed}s] ${msg}${colors.reset}`);
}

function logSection(title) {
  console.log(`\n${colors.bright}${colors.cyan}${'='.repeat(80)}`);
  console.log(`  ${title}`);
  console.log(`${'='.repeat(80)}${colors.reset}\n`);
}

// ========================================
// CARREGAR ESTRATÉGIAS
// ========================================
function loadStrategiesFromFile() {
  try {
    const strategiesPath = path.join(__dirname, 'src', 'lib', 'strategies.ts');
    const content = fs.readFileSync(strategiesPath, 'utf-8');
    
    const strategies = [];
    const strategyRegex = /{\s*id:\s*(\d+),\s*name:\s*['"`]([^'"`]+)['"`],\s*numbers:\s*\[([\d,\s]+)\]/g;
    
    let match;
    while ((match = strategyRegex.exec(content)) !== null) {
      const [, id, name, numbersStr] = match;
      const numbers = numbersStr.split(',').map(n => parseInt(n.trim())).filter(n => !isNaN(n));
      
      if (numbers.length > 0) {
        strategies.push({
          id: parseInt(id),
          name: name.trim(),
          numbers: numbers
        });
      }
    }
    
    return strategies;
  } catch (error) {
    log(`ERRO ao carregar estratégias: ${error.message}`, 'red');
    return [];
  }
}

// ========================================
// GERAR NÚMEROS SIMULADOS (REALÍSTICO)
// ========================================
function generateRealisticNumbers(count) {
  const numbers = [];
  
  // Distribuição mais realista (alguns números aparecem mais)
  const weights = Array(37).fill(1);
  
  // Dar peso extra a alguns números (simular tendências reais)
  const hotNumbers = [7, 17, 23, 32]; // Números "quentes"
  hotNumbers.forEach(n => weights[n] = 3);
  
  for (let i = 0; i < count; i++) {
    // Weighted random
    const totalWeight = weights.reduce((a, b) => a + b, 0);
    let random = Math.random() * totalWeight;
    
    for (let num = 0; num < 37; num++) {
      random -= weights[num];
      if (random <= 0) {
        numbers.push(num);
        break;
      }
    }
  }
  
  return numbers;
}

// ========================================
// LÓGICA DE ANÁLISE
// ========================================
function analyzeStrategy(strategyNumbers, numbersArray, greenRedAttempts = 3) {
  const results = {
    totalGreen: 0,
    totalRed: 0,
    activations: [],
    profit: 0,
    errors: []
  };

  try {
    const reversedArray = [...numbersArray].reverse();
    
    let i = 0;
    while (i < reversedArray.length) {
      const currentNum = reversedArray[i];
      
      if (strategyNumbers.includes(currentNum)) {
        let foundGreen = false;
        let attemptsCount = 0;
        let greenIndex = -1;
        
        for (let j = 1; j <= greenRedAttempts; j++) {
          const checkIndex = i + j;
          if (checkIndex >= reversedArray.length) break;
          
          attemptsCount = j;
          if (strategyNumbers.includes(reversedArray[checkIndex])) {
            foundGreen = true;
            greenIndex = checkIndex;
            break;
          }
        }
        
        if (foundGreen) {
          results.totalGreen++;
          const chipCount = strategyNumbers.length;
          const profit = (36 - chipCount) - (chipCount * attemptsCount);
          results.profit += profit;
          
          results.activations.push({
            position: i,
            number: currentNum,
            result: 'GREEN',
            attempts: attemptsCount,
            profit: profit
          });
          
          i = greenIndex + 1;
        } else {
          results.totalRed++;
          const chipCount = strategyNumbers.length;
          const loss = -(chipCount * (greenRedAttempts + 1));
          results.profit += loss;
          
          results.activations.push({
            position: i,
            number: currentNum,
            result: 'RED',
            attempts: Math.min(greenRedAttempts, reversedArray.length - i - 1),
            profit: loss
          });
          
          i = i + greenRedAttempts + 1;
        }
      } else {
        i++;
      }
    }
  } catch (error) {
    results.errors.push(`Erro ao analisar: ${error.message}`);
  }

  return results;
}

// ========================================
// VALIDAÇÕES INTENSIVAS
// ========================================
function intensiveValidation(strategy, numbers) {
  const issues = [];
  
  // Testar com diferentes quantidades de números
  const testSizes = [50, 100, 200, 500];
  
  for (const size of testSizes) {
    if (size > numbers.length) continue;
    
    const subset = numbers.slice(0, size);
    
    // Testar com todas as casas (1-6)
    for (let houses = 1; houses <= 6; houses++) {
      try {
        const result = analyzeStrategy(strategy.numbers, subset, houses);
        
        // 1. Validar valores negativos
        if (result.totalGreen < 0 || result.totalRed < 0) {
          issues.push({
            severity: 'CRITICAL',
            test: `${size}n ${houses}c`,
            message: `Valores negativos: G:${result.totalGreen} R:${result.totalRed}`
          });
        }
        
        // 2. Validar soma de ativações
        const totalActivations = result.totalGreen + result.totalRed;
        if (totalActivations !== result.activations.length) {
          issues.push({
            severity: 'MAJOR',
            test: `${size}n ${houses}c`,
            message: `G+R (${totalActivations}) ≠ Ativações (${result.activations.length})`
          });
        }
        
        // 3. Validar erros internos
        if (result.errors.length > 0) {
          issues.push({
            severity: 'CRITICAL',
            test: `${size}n ${houses}c`,
            message: result.errors[0]
          });
        }
        
        // 4. Validar profit extremo (possível bug)
        const maxProfit = totalActivations * 36;
        const minProfit = -(totalActivations * strategy.numbers.length * 10);
        if (result.profit > maxProfit || result.profit < minProfit) {
          issues.push({
            severity: 'WARNING',
            test: `${size}n ${houses}c`,
            message: `Profit extremo: ${result.profit} (fora do range esperado)`
          });
        }
        
        // 5. Validar posições das ativações
        result.activations.forEach((act, idx) => {
          if (act.position < 0 || act.position >= subset.length) {
            issues.push({
              severity: 'CRITICAL',
              test: `${size}n ${houses}c`,
              message: `Posição inválida na ativação ${idx}: ${act.position}`
            });
          }
        });
        
        // 6. Validar resultado vs tentativas
        result.activations.forEach((act, idx) => {
          if (act.result === 'GREEN' && act.attempts > houses) {
            issues.push({
              severity: 'MAJOR',
              test: `${size}n ${houses}c`,
              message: `GREEN com tentativas (${act.attempts}) > casas (${houses})`
            });
          }
        });
        
      } catch (error) {
        issues.push({
          severity: 'CRITICAL',
          test: `${size}n ${houses}c`,
          message: `Exceção: ${error.message}`
        });
      }
    }
  }
  
  return issues;
}

// ========================================
// TESTE DE STRESS
// ========================================
function stressTest(strategy) {
  const issues = [];
  
  try {
    // 1. Array gigante (10000 números)
    const hugeArray = generateRealisticNumbers(10000);
    const start = Date.now();
    const result = analyzeStrategy(strategy.numbers, hugeArray, 3);
    const duration = Date.now() - start;
    
    if (duration > 5000) { // Mais de 5 segundos
      issues.push({
        severity: 'WARNING',
        test: 'Stress (10k)',
        message: `Performance ruim: ${duration}ms para 10k números`
      });
    }
    
    // 2. Todos os números são da estratégia
    const allStrategyNumbers = Array(100).fill(0).map(() => 
      strategy.numbers[Math.floor(Math.random() * strategy.numbers.length)]
    );
    const result2 = analyzeStrategy(strategy.numbers, allStrategyNumbers, 3);
    
    if (result2.totalRed > result2.totalGreen * 2) {
      issues.push({
        severity: 'WARNING',
        test: 'Stress (all)',
        message: `Muitos REDs mesmo com todos números da estratégia`
      });
    }
    
    // 3. Nenhum número da estratégia
    const noStrategyNumbers = Array(100).fill(0).map(() => {
      let num;
      do {
        num = Math.floor(Math.random() * 37);
      } while (strategy.numbers.includes(num));
      return num;
    });
    const result3 = analyzeStrategy(strategy.numbers, noStrategyNumbers, 3);
    
    if (result3.activations.length > 0) {
      issues.push({
        severity: 'CRITICAL',
        test: 'Stress (none)',
        message: `Ativações detectadas sem números da estratégia`
      });
    }
    
  } catch (error) {
    issues.push({
      severity: 'CRITICAL',
      test: 'Stress',
      message: `Exceção no teste de stress: ${error.message}`
    });
  }
  
  return issues;
}

// ========================================
// TESTE PRINCIPAL
// ========================================
function runTests() {
  logSection('🚀 TESTE ACELERADO - VALIDAÇÃO INTENSIVA');
  
  log('Carregando estratégias...', 'yellow');
  const strategies = loadStrategiesFromFile();
  
  if (strategies.length === 0) {
    log('❌ Nenhuma estratégia carregada!', 'red');
    return;
  }
  
  log(`✅ ${strategies.length} estratégias carregadas`, 'green');
  
  log('\nGerando 1000 números simulados (realísticos)...', 'yellow');
  const numbers = generateRealisticNumbers(1000);
  log(`✅ ${numbers.length} números gerados`, 'green');
  
  const allIssues = new Map();
  let criticalTotal = 0;
  let majorTotal = 0;
  let warningTotal = 0;
  
  log(`\nTestando ${strategies.length} estratégias...`, 'yellow');
  
  strategies.forEach((strategy, idx) => {
    // Validação intensiva
    const issues1 = intensiveValidation(strategy, numbers);
    
    // Teste de stress
    const issues2 = stressTest(strategy);
    
    const allStrategyIssues = [...issues1, ...issues2];
    
    if (allStrategyIssues.length > 0) {
      allIssues.set(strategy.id, {
        strategy: strategy,
        issues: allStrategyIssues
      });
      
      allStrategyIssues.forEach(issue => {
        if (issue.severity === 'CRITICAL') criticalTotal++;
        else if (issue.severity === 'MAJOR') majorTotal++;
        else if (issue.severity === 'WARNING') warningTotal++;
      });
    }
    
    if ((idx + 1) % 50 === 0) {
      log(`  Processadas ${idx + 1}/${strategies.length}...`, 'cyan');
    }
  });
  
  // Relatório
  logSection('📊 RESULTADO DOS TESTES');
  
  log(`Total de estratégias testadas: ${strategies.length}`, 'cyan');
  log(`Estratégias com problemas: ${allIssues.size}`, allIssues.size > 0 ? 'red' : 'green');
  
  if (criticalTotal === 0 && majorTotal === 0 && warningTotal === 0) {
    log(`\n🎉 PERFEITO! Nenhum problema encontrado!`, 'green');
    log(`Todas as ${strategies.length} estratégias passaram em todos os testes!`, 'green');
  } else {
    log(`\n⚠️  PROBLEMAS DETECTADOS:`, 'yellow');
    if (criticalTotal > 0) log(`  🔴 CRÍTICO: ${criticalTotal}`, 'red');
    if (majorTotal > 0) log(`  🟡 MAJOR: ${majorTotal}`, 'yellow');
    if (warningTotal > 0) log(`  ⚪ WARNING: ${warningTotal}`, 'cyan');
    
    // Mostrar estratégias problemáticas
    const sorted = Array.from(allIssues.entries())
      .sort((a, b) => {
        const aCritical = a[1].issues.filter(i => i.severity === 'CRITICAL').length;
        const bCritical = b[1].issues.filter(i => i.severity === 'CRITICAL').length;
        return bCritical - aCritical;
      });
    
    log(`\n🔍 DETALHES DAS ESTRATÉGIAS COM PROBLEMAS (TOP 10):`, 'yellow');
    
    sorted.slice(0, 10).forEach(([id, data]) => {
      const criticalCount = data.issues.filter(i => i.severity === 'CRITICAL').length;
      const majorCount = data.issues.filter(i => i.severity === 'MAJOR').length;
      const warningCount = data.issues.filter(i => i.severity === 'WARNING').length;
      
      log(`\n  ━━━ Estratégia #${data.strategy.id}: ${data.strategy.name} ━━━`, 'yellow');
      log(`      Fichas: ${data.strategy.numbers.length} | Números: [${data.strategy.numbers.slice(0, 8).join(', ')}...]`, 'cyan');
      
      if (criticalCount > 0) log(`      🔴 ${criticalCount} problemas CRÍTICOS`, 'red');
      if (majorCount > 0) log(`      🟡 ${majorCount} problemas MAJOR`, 'yellow');
      if (warningCount > 0) log(`      ⚪ ${warningCount} warnings`, 'cyan');
      
      // Mostrar primeiros 3 problemas
      data.issues.slice(0, 3).forEach(issue => {
        const icon = issue.severity === 'CRITICAL' ? '🔴' : issue.severity === 'MAJOR' ? '🟡' : '⚪';
        log(`      ${icon} [${issue.test}] ${issue.message}`, issue.severity === 'CRITICAL' ? 'red' : 'yellow');
      });
      
      if (data.issues.length > 3) {
        log(`      ... e mais ${data.issues.length - 3} problemas`, 'cyan');
      }
    });
    
    if (sorted.length > 10) {
      log(`\n  (Mostrando 10 de ${sorted.length} estratégias com problemas)`, 'cyan');
    }
    
    // Salvar relatório
    const reportPath = path.join(__dirname, 'test-accelerated-report.json');
    const report = {
      timestamp: new Date().toISOString(),
      totalStrategies: strategies.length,
      strategiesWithIssues: sorted.map(([id, data]) => ({
        id: data.strategy.id,
        name: data.strategy.name,
        chips: data.strategy.numbers.length,
        numbers: data.strategy.numbers,
        issues: data.issues
      })),
      summary: {
        critical: criticalTotal,
        major: majorTotal,
        warning: warningTotal
      }
    };
    
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    log(`\n💾 Relatório detalhado salvo em: ${reportPath}`, 'green');
  }
  
  const duration = ((Date.now() - startTime) / 1000).toFixed(1);
  log(`\n⏱️  Tempo total: ${duration}s`, 'cyan');
}

// Executar
console.clear();
runTests();
