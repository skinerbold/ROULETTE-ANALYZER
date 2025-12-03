/**
 * Script de Teste de Estratégias - Versão JavaScript
 * Verifica se a marcação de cores (ACTIVATION, GREEN, RED) está correta
 * 
 * Execute com: node test-strategies-simple.js
 */

// Cores para output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
}

// Estratégias de exemplo para testar a lógica
const testStrategies = [
  { id: 1, name: "Pretos baixos", numbers: [2,4,6,8,10,11,13,15,17] },
  { id: 2, name: "Vermelhos Altos", numbers: [21,19,23,25,27,30,32,34,36] },
  { id: 3, name: "Pretos Altos", numbers: [20,22,24,26,28,29,31,33,35] },
  { id: 4, name: "Vermelhos Baixos", numbers: [1,3,5,7,9,12,14,16,18] },
  // Terminal 0
  { id: 75, name: "T0", numbers: [0, 10, 20, 30] },
  // Terminal 5
  { id: 80, name: "T5", numbers: [5, 15, 25, 35] },
  // Rua D1
  { id: 100, name: "R1D1 (1-2-3)", numbers: [1,2,3] },
  // União T0-T1
  { id: 200, name: "T0-T1", numbers: [0,1,10,11,20,21,30,31] },
]

// Simular a lógica de updateNumberStatuses (EXATA do page.tsx)
function simulateColorMarking(numbers, strategyNumbers, greenRedAttempts = 3) {
  const statuses = new Array(numbers.length).fill('NEUTRAL')
  const details = []
  
  // Simular recentNumbers com timestamps
  const recentWithTimestamp = numbers.map((num, i) => ({
    number: num,
    timestamp: Date.now() - (i * 60000) // Mais recente tem timestamp maior
  }))
  
  // Inverter para processar do mais antigo para o mais recente
  const reversed = [...recentWithTimestamp].reverse()
  const reversedStatuses = new Array(reversed.length).fill('NEUTRAL')
  
  // Cache de cores (simulando numberColorCache)
  const colorCache = {}
  
  let i = 0
  while (i < reversed.length) {
    const currentEntry = reversed[i]
    const currentNum = currentEntry.number
    const currentTimestamp = currentEntry.timestamp
    
    // Se já está no cache, pula
    if (colorCache[currentTimestamp]) {
      i++
      continue
    }
    
    // Verifica se é um número da estratégia (ativação)
    if (strategyNumbers.includes(currentNum)) {
      // Marca como ACTIVATION (amarelo)
      colorCache[currentTimestamp] = 'ACTIVATION'
      
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
        
        // Marcar intermediários como NEUTRAL
        const intermediateTimestamp = reversed[checkIndex].timestamp
        if (!colorCache[intermediateTimestamp]) {
          colorCache[intermediateTimestamp] = 'NEUTRAL'
        }
        
        if (strategyNumbers.includes(reversed[checkIndex].number)) {
          foundGreen = true
          greenIndex = checkIndex
          break
        }
      }
      
      if (foundGreen) {
        // GREEN: sobrescreve
        const greenTimestamp = reversed[greenIndex].timestamp
        colorCache[greenTimestamp] = 'GREEN'
        details.push(`[${i}] ${currentNum} → ACTIVATION, [${greenIndex}] ${reversed[greenIndex].number} → GREEN (${greenIndex - i} pos)`)
        i = greenIndex // Continuar a partir do GREEN
      } else if (hasEnoughFutureNumbers) {
        // RED
        const redTimestamp = reversed[lastCheckIndex].timestamp
        colorCache[redTimestamp] = 'RED'
        details.push(`[${i}] ${currentNum} → ACTIVATION, [${lastCheckIndex}] ${reversed[lastCheckIndex].number} → RED`)
        i = lastCheckIndex
      } else {
        details.push(`[${i}] ${currentNum} → ACTIVATION (aguardando)`)
        i++
      }
    } else {
      colorCache[currentTimestamp] = 'NEUTRAL'
      i++
    }
  }
  
  // Mapear de volta para a ordem original
  const finalStatuses = recentWithTimestamp.map(entry => colorCache[entry.timestamp] || 'NEUTRAL')
  
  return { statuses: finalStatuses, details }
}

// Verificar se a marcação está correta
function verifyMarking(numbers, strategyNumbers, statuses) {
  const errors = []
  
  for (let i = 0; i < numbers.length; i++) {
    const num = numbers[i]
    const status = statuses[i]
    const isInStrategy = strategyNumbers.includes(num)
    
    // ACTIVATION ou GREEN só pode ser número da estratégia
    if ((status === 'ACTIVATION' || status === 'GREEN') && !isInStrategy) {
      errors.push(`ERRO: Número ${num} (pos ${i}) marcado como ${status} mas NÃO está na estratégia`)
    }
    
    // RED NÃO pode ser número da estratégia (pois RED indica que não acertou)
    // Na verdade, RED marca a ÚLTIMA POSIÇÃO verificada, não necessariamente fora da estratégia
    // Então esse teste não se aplica
  }
  
  return errors
}

// Testar uma estratégia
function testStrategy(strategy, testNumbers, greenRedAttempts = 3) {
  const { statuses, details } = simulateColorMarking(testNumbers, strategy.numbers, greenRedAttempts)
  const errors = verifyMarking(testNumbers, strategy.numbers, statuses)
  
  return { 
    success: errors.length === 0, 
    errors, 
    statuses, 
    details,
    strategy 
  }
}

// Gerar números aleatórios
function generateTestNumbers(count) {
  return Array.from({ length: count }, () => Math.floor(Math.random() * 37))
}

// TESTE 1: Caso específico manual
function runManualTest() {
  console.log(`\n${colors.cyan}========================================${colors.reset}`)
  console.log(`${colors.cyan}TESTE 1: Caso Manual${colors.reset}`)
  console.log(`${colors.cyan}========================================${colors.reset}\n`)
  
  // Estratégia "Pretos baixos" (ID 1): [2,4,6,8,10,11,13,15,17]
  const strategy = testStrategies[0]
  const testNumbers = [15, 3, 22, 2, 8, 30, 4, 17, 5, 6, 1, 10, 33, 11, 2, 20]
  
  console.log(`Estratégia: ${strategy.name}`)
  console.log(`Números da estratégia: [${strategy.numbers.join(', ')}]`)
  console.log(`\nNúmeros de teste: [${testNumbers.join(', ')}]`)
  console.log(`(mais recente ← → mais antigo)\n`)
  
  const result = testStrategy(strategy, testNumbers, 3)
  
  console.log('Processamento:')
  result.details.forEach(d => console.log(`  ${d}`))
  
  console.log('\nResultado:')
  testNumbers.forEach((num, i) => {
    const status = result.statuses[i]
    const isInStrategy = strategy.numbers.includes(num)
    let color = colors.reset
    if (status === 'ACTIVATION') color = colors.yellow
    if (status === 'GREEN') color = colors.green
    if (status === 'RED') color = colors.red
    
    const marker = isInStrategy ? '★' : ' '
    console.log(`  ${marker} [${i.toString().padStart(2)}] ${num.toString().padStart(2)} → ${color}${status.padEnd(10)}${colors.reset}`)
  })
  
  if (result.errors.length > 0) {
    console.log(`\n${colors.red}ERROS:${colors.reset}`)
    result.errors.forEach(e => console.log(`  ${colors.red}• ${e}${colors.reset}`))
  } else {
    console.log(`\n${colors.green}✓ Sem erros de marcação${colors.reset}`)
  }
}

// TESTE 2: Todas estratégias de exemplo
function runAllTests() {
  console.log(`\n${colors.cyan}========================================${colors.reset}`)
  console.log(`${colors.cyan}TESTE 2: Todas Estratégias de Exemplo${colors.reset}`)
  console.log(`${colors.cyan}========================================${colors.reset}\n`)
  
  const testNumbers = generateTestNumbers(50)
  console.log(`Testando com 50 números aleatórios...\n`)
  
  let passed = 0
  let failed = 0
  const failures = []
  
  for (const strategy of testStrategies) {
    const result = testStrategy(strategy, testNumbers, 3)
    
    if (result.success) {
      passed++
      process.stdout.write(`${colors.green}✓${colors.reset}`)
    } else {
      failed++
      process.stdout.write(`${colors.red}✗${colors.reset}`)
      failures.push({ strategy: strategy.name, errors: result.errors })
    }
  }
  
  console.log(`\n\n${passed}/${testStrategies.length} passaram`)
  
  if (failures.length > 0) {
    console.log(`\n${colors.red}Falhas:${colors.reset}`)
    for (const f of failures) {
      console.log(`  ${f.strategy}:`)
      f.errors.forEach(e => console.log(`    - ${e}`))
    }
  }
}

// TESTE 3: Verificar números inválidos nas estratégias
function verifyStrategyNumbers() {
  console.log(`\n${colors.cyan}========================================${colors.reset}`)
  console.log(`${colors.cyan}TESTE 3: Verificar Números das Estratégias${colors.reset}`)
  console.log(`${colors.cyan}========================================${colors.reset}\n`)
  
  const issues = []
  
  for (const strategy of testStrategies) {
    // Números fora do range 0-36
    const invalid = strategy.numbers.filter(n => n < 0 || n > 36)
    if (invalid.length > 0) {
      issues.push(`[${strategy.id}] ${strategy.name}: números inválidos [${invalid.join(', ')}]`)
    }
    
    // Duplicatas
    const unique = new Set(strategy.numbers)
    if (unique.size !== strategy.numbers.length) {
      const dups = strategy.numbers.filter((n, i) => strategy.numbers.indexOf(n) !== i)
      issues.push(`[${strategy.id}] ${strategy.name}: duplicados [${[...new Set(dups)].join(', ')}]`)
    }
    
    // Vazia
    if (strategy.numbers.length === 0) {
      issues.push(`[${strategy.id}] ${strategy.name}: sem números!`)
    }
  }
  
  if (issues.length === 0) {
    console.log(`${colors.green}✓ Todas estratégias têm números válidos${colors.reset}`)
  } else {
    console.log(`${colors.red}Problemas encontrados:${colors.reset}`)
    issues.forEach(i => console.log(`  ${colors.red}• ${i}${colors.reset}`))
  }
}

// TESTE 4: Simular cenário problemático específico
function testProblematicScenario() {
  console.log(`\n${colors.cyan}========================================${colors.reset}`)
  console.log(`${colors.cyan}TESTE 4: Cenário Problemático${colors.reset}`)
  console.log(`${colors.cyan}========================================${colors.reset}\n`)
  
  // Cenário: Estratégia Terminal 0 [0, 10, 20, 30]
  // Números onde deve haver ACTIVATION seguido de GREEN em 3 tentativas
  const strategy = { id: 75, name: "T0", numbers: [0, 10, 20, 30] }
  
  // Cenário 1: GREEN na 1ª tentativa
  console.log(`${colors.blue}Cenário A: GREEN na 1ª tentativa${colors.reset}`)
  let nums = [30, 10, 5, 7, 20, 3, 0, 8, 9, 10]
  //           ^GRN ^ACT          ^GRN    ^ACT
  let result = testStrategy(strategy, nums, 3)
  console.log(`Números: [${nums.join(', ')}]`)
  console.log('Resultado:', result.statuses.map((s, i) => `${nums[i]}:${s.charAt(0)}`).join(' '))
  console.log('')
  
  // Cenário 2: GREEN na 3ª tentativa (limite)
  console.log(`${colors.blue}Cenário B: GREEN na 3ª tentativa${colors.reset}`)
  nums = [30, 5, 7, 10, 3, 2, 20, 8, 9, 0]
  //       ^GRN       ^ACT        ^GRN       ^ACT
  result = testStrategy(strategy, nums, 3)
  console.log(`Números: [${nums.join(', ')}]`)
  console.log('Resultado:', result.statuses.map((s, i) => `${nums[i]}:${s.charAt(0)}`).join(' '))
  console.log('')
  
  // Cenário 3: RED (não encontrou em 3 tentativas)
  console.log(`${colors.blue}Cenário C: RED (não encontrou)${colors.reset}`)
  nums = [5, 7, 8, 9, 10, 3, 2, 1, 6, 4]
  //                  ^ACT → vai marcar RED no 9 (ou outro)
  result = testStrategy(strategy, nums, 3)
  console.log(`Números: [${nums.join(', ')}]`)
  console.log('Resultado:', result.statuses.map((s, i) => `${nums[i]}:${s.charAt(0)}`).join(' '))
  console.log('')
  
  // Cenário 4: ACTIVATION no final (aguardando)
  console.log(`${colors.blue}Cenário D: ACTIVATION no final (aguardando)${colors.reset}`)
  nums = [10, 5, 7]
  result = testStrategy(strategy, nums, 3)
  console.log(`Números: [${nums.join(', ')}]`)
  console.log('Resultado:', result.statuses.map((s, i) => `${nums[i]}:${s.charAt(0)}`).join(' '))
}

// Executar todos os testes
console.log(`${colors.cyan}╔════════════════════════════════════════╗${colors.reset}`)
console.log(`${colors.cyan}║   SCRIPT DE TESTE DE ESTRATÉGIAS       ║${colors.reset}`)
console.log(`${colors.cyan}╚════════════════════════════════════════╝${colors.reset}`)

verifyStrategyNumbers()
runManualTest()
runAllTests()
testProblematicScenario()

console.log(`\n${colors.cyan}========================================${colors.reset}`)
console.log(`${colors.green}Testes concluídos!${colors.reset}`)
console.log(`${colors.cyan}========================================${colors.reset}\n`)
