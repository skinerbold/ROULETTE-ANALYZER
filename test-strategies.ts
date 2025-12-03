/**
 * Script de Teste de Estratégias
 * Verifica se a marcação de cores (ACTIVATION, GREEN, RED) está correta
 * 
 * Execute com: npx ts-node test-strategies.ts
 */

import { getAllStrategies, getStrategyNumbers, getStrategyById, ChipCategory } from './src/lib/strategies'

// Cores para output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
}

// Simular a lógica de updateNumberStatuses
function simulateColorMarking(
  numbers: number[], 
  strategyNumbers: number[], 
  greenRedAttempts: number = 3
): { statuses: ('ACTIVATION' | 'GREEN' | 'RED' | 'NEUTRAL')[], details: string[] } {
  const statuses: ('ACTIVATION' | 'GREEN' | 'RED' | 'NEUTRAL')[] = new Array(numbers.length).fill('NEUTRAL')
  const details: string[] = []
  
  // Processar do mais antigo (último) para o mais recente (primeiro)
  // Mas como o array numbers já vem com mais antigo no final, invertemos para processar
  const reversed = [...numbers].reverse()
  const reversedStatuses: ('ACTIVATION' | 'GREEN' | 'RED' | 'NEUTRAL')[] = new Array(reversed.length).fill('NEUTRAL')
  
  let i = 0
  while (i < reversed.length) {
    const currentNum = reversed[i]
    
    // Verifica se é um número da estratégia (ativação)
    if (strategyNumbers.includes(currentNum)) {
      reversedStatuses[i] = 'ACTIVATION'
      
      // Procura por GREEN nas próximas N posições
      let foundGreen = false
      let greenIndex = -1
      let lastCheckIndex = i
      let hasEnoughFutureNumbers = true
      
      for (let j = 1; j <= greenRedAttempts; j++) {
        const checkIndex = i + j
        
        if (checkIndex >= reversed.length) {
          hasEnoughFutureNumbers = false
          break
        }
        
        lastCheckIndex = checkIndex
        
        // Marcar intermediários como NEUTRAL se não marcados
        if (reversedStatuses[checkIndex] === 'NEUTRAL') {
          // Mantém NEUTRAL
        }
        
        if (strategyNumbers.includes(reversed[checkIndex])) {
          foundGreen = true
          greenIndex = checkIndex
          break
        }
      }
      
      if (foundGreen) {
        reversedStatuses[greenIndex] = 'GREEN'
        details.push(`[${i}] ${currentNum} → ACTIVATION, [${greenIndex}] ${reversed[greenIndex]} → GREEN (encontrado em ${greenIndex - i} posições)`)
        i = greenIndex // Continuar a partir do GREEN
      } else if (hasEnoughFutureNumbers) {
        reversedStatuses[lastCheckIndex] = 'RED'
        details.push(`[${i}] ${currentNum} → ACTIVATION, [${lastCheckIndex}] ${reversed[lastCheckIndex]} → RED (não encontrou em ${greenRedAttempts} tentativas)`)
        i = lastCheckIndex // Continuar a partir do RED
      } else {
        details.push(`[${i}] ${currentNum} → ACTIVATION (aguardando mais números)`)
        i++
      }
    } else {
      i++
    }
  }
  
  // Reverter de volta para a ordem original (mais recente primeiro)
  for (let j = 0; j < reversed.length; j++) {
    statuses[reversed.length - 1 - j] = reversedStatuses[j]
  }
  
  return { statuses, details }
}

// Testar uma estratégia específica
function testStrategy(strategyId: number, testNumbers: number[], greenRedAttempts: number = 3) {
  // Tentar encontrar em todas as categorias
  let strategy = getStrategyById('all', strategyId)
  if (!strategy) {
    console.log(`${colors.red}Estratégia ID ${strategyId} não encontrada${colors.reset}`)
    return { success: false, errors: ['Estratégia não encontrada'] }
  }
  
  const strategyNumbers = getStrategyNumbers(strategyId, testNumbers)
  const { statuses, details } = simulateColorMarking(testNumbers, strategyNumbers, greenRedAttempts)
  
  const errors: string[] = []
  
  // Verificar regras:
  // 1. ACTIVATION só pode existir se o número está na estratégia
  // 2. GREEN só pode existir após ACTIVATION (dentro de greenRedAttempts posições)
  // 3. RED só pode existir se ACTIVATION não teve GREEN em greenRedAttempts posições
  
  for (let i = 0; i < testNumbers.length; i++) {
    const num = testNumbers[i]
    const status = statuses[i]
    const isInStrategy = strategyNumbers.includes(num)
    
    if (status === 'ACTIVATION' && !isInStrategy) {
      errors.push(`ERRO: Número ${num} (posição ${i}) marcado como ACTIVATION mas não está na estratégia [${strategy.numbers.join(',')}]`)
    }
    
    if (status === 'GREEN' && !isInStrategy) {
      errors.push(`ERRO: Número ${num} (posição ${i}) marcado como GREEN mas não está na estratégia [${strategy.numbers.join(',')}]`)
    }
  }
  
  return { success: errors.length === 0, errors, statuses, details, strategy, strategyNumbers }
}

// Gerar números de teste aleatórios
function generateTestNumbers(count: number): number[] {
  const numbers: number[] = []
  for (let i = 0; i < count; i++) {
    numbers.push(Math.floor(Math.random() * 37)) // 0-36
  }
  return numbers
}

// Caso de teste específico
function runSpecificTest() {
  console.log(`\n${colors.cyan}========================================${colors.reset}`)
  console.log(`${colors.cyan}TESTE ESPECÍFICO - Caso Manual${colors.reset}`)
  console.log(`${colors.cyan}========================================${colors.reset}\n`)
  
  // Exemplo: Estratégia "Pretos baixos" (ID 1): [2,4,6,8,10,11,13,15,17]
  const testNumbers = [15, 3, 22, 2, 8, 30, 4, 17, 5, 6, 1, 10, 33, 11, 2, 20]
  //                   ^ACT      ^GRN                             ^ACT ^GRN
  
  console.log(`Números de teste: [${testNumbers.join(', ')}]`)
  console.log(`Ordem: mais recente (esquerda) → mais antigo (direita)\n`)
  
  const result = testStrategy(1, testNumbers, 3)
  
  if (result.strategy) {
    console.log(`${colors.blue}Estratégia: ${result.strategy.name}${colors.reset}`)
    console.log(`Números da estratégia: [${result.strategyNumbers?.join(', ')}]\n`)
  }
  
  console.log('Detalhes do processamento:')
  result.details?.forEach(d => console.log(`  ${d}`))
  
  console.log('\nResultado final (mais recente → mais antigo):')
  testNumbers.forEach((num, i) => {
    const status = result.statuses?.[i] || 'NEUTRAL'
    const isInStrategy = result.strategyNumbers?.includes(num)
    let color = colors.reset
    if (status === 'ACTIVATION') color = colors.yellow
    if (status === 'GREEN') color = colors.green
    if (status === 'RED') color = colors.red
    
    console.log(`  [${i}] ${num} → ${color}${status}${colors.reset} ${isInStrategy ? '(na estratégia)' : ''}`)
  })
  
  if (result.errors && result.errors.length > 0) {
    console.log(`\n${colors.red}ERROS ENCONTRADOS:${colors.reset}`)
    result.errors.forEach(e => console.log(`  ${colors.red}• ${e}${colors.reset}`))
  } else {
    console.log(`\n${colors.green}✓ Nenhum erro encontrado${colors.reset}`)
  }
}

// Testar todas as estratégias com números aleatórios
function runAllStrategiesTest() {
  console.log(`\n${colors.cyan}========================================${colors.reset}`)
  console.log(`${colors.cyan}TESTE DE TODAS AS ESTRATÉGIAS${colors.reset}`)
  console.log(`${colors.cyan}========================================${colors.reset}\n`)
  
  const allFolders = getAllStrategies('all')
  const testNumbers = generateTestNumbers(100)
  
  let totalStrategies = 0
  let passedStrategies = 0
  let failedStrategies: { id: number, name: string, errors: string[] }[] = []
  
  for (const folder of allFolders) {
    console.log(`\n${colors.blue}Pasta: ${folder.name}${colors.reset}`)
    
    for (const strategy of folder.strategies) {
      totalStrategies++
      const result = testStrategy(strategy.id, testNumbers, 3)
      
      if (result.success) {
        passedStrategies++
        process.stdout.write(`${colors.green}.${colors.reset}`)
      } else {
        process.stdout.write(`${colors.red}X${colors.reset}`)
        failedStrategies.push({
          id: strategy.id,
          name: strategy.name,
          errors: result.errors
        })
      }
    }
  }
  
  console.log(`\n\n${colors.cyan}========================================${colors.reset}`)
  console.log(`RESULTADO: ${passedStrategies}/${totalStrategies} estratégias passaram`)
  console.log(`${colors.cyan}========================================${colors.reset}`)
  
  if (failedStrategies.length > 0) {
    console.log(`\n${colors.red}ESTRATÉGIAS COM PROBLEMAS:${colors.reset}\n`)
    for (const failed of failedStrategies) {
      console.log(`${colors.red}[ID ${failed.id}] ${failed.name}${colors.reset}`)
      failed.errors.forEach(e => console.log(`  • ${e}`))
      console.log('')
    }
  }
}

// Verificar consistência dos números das estratégias
function verifyStrategyNumbers() {
  console.log(`\n${colors.cyan}========================================${colors.reset}`)
  console.log(`${colors.cyan}VERIFICAÇÃO DE NÚMEROS DAS ESTRATÉGIAS${colors.reset}`)
  console.log(`${colors.cyan}========================================${colors.reset}\n`)
  
  const allFolders = getAllStrategies('all')
  let issues: { id: number, name: string, issue: string }[] = []
  
  for (const folder of allFolders) {
    for (const strategy of folder.strategies) {
      // Verificar se todos os números estão no range válido (0-36)
      const invalidNumbers = strategy.numbers.filter(n => n < 0 || n > 36)
      if (invalidNumbers.length > 0) {
        issues.push({
          id: strategy.id,
          name: strategy.name,
          issue: `Números inválidos: [${invalidNumbers.join(', ')}]`
        })
      }
      
      // Verificar duplicatas
      const uniqueNumbers = new Set(strategy.numbers)
      if (uniqueNumbers.size !== strategy.numbers.length) {
        const duplicates = strategy.numbers.filter((n, i) => strategy.numbers.indexOf(n) !== i)
        issues.push({
          id: strategy.id,
          name: strategy.name,
          issue: `Números duplicados: [${[...new Set(duplicates)].join(', ')}]`
        })
      }
      
      // Verificar se está vazia
      if (strategy.numbers.length === 0) {
        issues.push({
          id: strategy.id,
          name: strategy.name,
          issue: `Estratégia sem números!`
        })
      }
    }
  }
  
  if (issues.length === 0) {
    console.log(`${colors.green}✓ Todas as estratégias têm números válidos${colors.reset}`)
  } else {
    console.log(`${colors.red}PROBLEMAS ENCONTRADOS:${colors.reset}\n`)
    for (const issue of issues) {
      console.log(`${colors.red}[ID ${issue.id}] ${issue.name}${colors.reset}`)
      console.log(`  • ${issue.issue}\n`)
    }
  }
  
  return issues
}

// Executar todos os testes
console.log(`${colors.cyan}╔════════════════════════════════════════╗${colors.reset}`)
console.log(`${colors.cyan}║   SCRIPT DE TESTE DE ESTRATÉGIAS       ║${colors.reset}`)
console.log(`${colors.cyan}╚════════════════════════════════════════╝${colors.reset}`)

verifyStrategyNumbers()
runSpecificTest()
runAllStrategiesTest()
