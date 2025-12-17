/**
 * Script de teste para entender a lógica de notificação RED
 * 
 * Simula cenários reais para identificar o bug
 */

// Função 1: Calcula streak atual (do mais recente para o mais antigo)
function calculateCurrentRedStreak(numbers, strategyNumbers, attempts) {
  if (numbers.length === 0 || strategyNumbers.length === 0) return 0

  let currentStreak = 0

  // Analisar do mais recente para o mais antigo
  for (let i = 0; i < numbers.length; i++) {
    const num = numbers[i]
    
    if (strategyNumbers.includes(num)) {
      // É uma ativação, verificar se tem GREEN nas próximas X casas
      let foundGreen = false
      
      for (let j = 1; j <= attempts && i + j < numbers.length; j++) {
        if (strategyNumbers.includes(numbers[i + j])) {
          foundGreen = true
          break
        }
      }
      
      if (!foundGreen) {
        currentStreak++
      } else {
        // Encontrou GREEN, parar de contar
        break
      }
    }
  }

  return currentStreak
}

// Função 2: Calcula máximo RED do dia (do mais antigo para o mais recente)
function calculateMaxRedForDay(numbers, strategyNumbers, attempts) {
  let maxStreak = 0
  let currentStreak = 0

  for (let i = 0; i < numbers.length; i++) {
    const num = numbers[i]
    
    if (strategyNumbers.includes(num)) {
      let foundGreen = false
      
      for (let j = 1; j <= attempts && i + j < numbers.length; j++) {
        if (strategyNumbers.includes(numbers[i + j])) {
          foundGreen = true
          break
        }
      }
      
      if (foundGreen) {
        if (currentStreak > 0) {
          maxStreak = Math.max(maxStreak, currentStreak)
        }
        currentStreak = 0
      } else {
        currentStreak++
      }
    }
  }

  if (currentStreak > 0) {
    maxStreak = Math.max(maxStreak, currentStreak)
  }

  return maxStreak
}

// ============ CENÁRIOS DE TESTE ============

console.log('='.repeat(80))
console.log('TESTE 1: Cenário simples - 5 REDs seguidos, depois GREEN')
console.log('='.repeat(80))

// Estratégia: [5, 10]
// Números (mais recente primeiro): [10, 15, 5, 5, 5, 5, 5]
//   Índice 0 (mais recente): 10 - É ativação, próximo (15) não é GREEN, é RED
//   Índice 1: 15 - Não é ativação
//   Índice 2: 5 - É ativação, próximo (5) é GREEN
//   Índice 3-6: 5 - São ativações anteriores

const numbersRecentFirst1 = [10, 15, 5, 5, 5, 5, 5]
const numbersOldFirst1 = [...numbersRecentFirst1].reverse() // [5, 5, 5, 5, 5, 15, 10]
const strategy1 = [5, 10]
const attempts = 1

const currentStreak1 = calculateCurrentRedStreak(numbersRecentFirst1, strategy1, attempts)
const maxStreak1 = calculateMaxRedForDay(numbersOldFirst1, strategy1, attempts)

console.log(`Números (recente→antigo): ${numbersRecentFirst1.join(', ')}`)
console.log(`Números (antigo→recente): ${numbersOldFirst1.join(', ')}`)
console.log(`Estratégia: ${strategy1.join(', ')}`)
console.log(`Casas: ${attempts}`)
console.log(``)
console.log(`✓ Current Streak (tempo real): ${currentStreak1}`)
console.log(`✓ Max Streak (histórico):      ${maxStreak1}`)
console.log(`✓ Dispara notificação?        ${currentStreak1 >= maxStreak1 ? 'SIM ❌' : 'NÃO ✅'}`)

console.log('')
console.log('='.repeat(80))
console.log('TESTE 2: Sequência atual é MENOR que máximo histórico')
console.log('='.repeat(80))

// Histórico do dia: 13 REDs foi o máximo
// Atual: apenas 5 REDs
// Números históricos (antigo→recente): [5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 10, 5, 5, 5, 5, 5, 15]
// Números tempo real (recente→antigo): [15, 5, 5, 5, 5, 5]

const numbersHistorical2 = [5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 10, 5, 5, 5, 5, 5, 15]
const numbersRealTime2 = [15, 5, 5, 5, 5, 5]
const strategy2 = [5, 10]

const maxStreak2 = calculateMaxRedForDay(numbersHistorical2, strategy2, attempts)
const currentStreak2 = calculateCurrentRedStreak(numbersRealTime2, strategy2, attempts)

console.log(`Números histórico (antigo→recente): ${numbersHistorical2.join(', ')}`)
console.log(`Números tempo real (recente→antigo): ${numbersRealTime2.join(', ')}`)
console.log(`Estratégia: ${strategy2.join(', ')}`)
console.log(`Casas: ${attempts}`)
console.log(``)
console.log(`✓ Max Streak (histórico dia):  ${maxStreak2}`)
console.log(`✓ Current Streak (tempo real): ${currentStreak2}`)
console.log(`✓ Dispara notificação?         ${currentStreak2 >= maxStreak2 ? 'SIM ❌ (ERRO!)' : 'NÃO ✅ (CORRETO)'}`)

console.log('')
console.log('='.repeat(80))
console.log('TESTE 3: Investigar se está comparando dados de dias diferentes')
console.log('='.repeat(80))

// Problema potencial: 
// - calculateMaxRedForNotification usa dados de ONTEM (ou data selecionada)
// - calculateCurrentRedStreak usa dados de HOJE (tempo real)
// 
// Se ONTEM teve max 5 REDs, e HOJE tem sequência atual de 5 REDs,
// vai disparar notificação mesmo que HOJE já tenha tido 13 REDs antes!

const yesterdayNumbers = [5, 5, 5, 5, 5, 10] // Máximo de ontem: 5 REDs
const todayNumbers = [10, 15, 15, 15, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 10, 5, 5, 5, 5, 5] 
// Hoje: teve 13 REDs no meio do dia, agora tem 5 REDs

const strategy3 = [5, 10]

const maxStreakYesterday = calculateMaxRedForDay(yesterdayNumbers, strategy3, attempts)
const currentStreakToday = calculateCurrentRedStreak(todayNumbers.slice().reverse(), strategy3, attempts)
const maxStreakToday = calculateMaxRedForDay(todayNumbers, strategy3, attempts)

console.log(`Números ONTEM: ${yesterdayNumbers.join(', ')}`)
console.log(`Números HOJE:  ${todayNumbers.join(', ')}`)
console.log(`Estratégia: ${strategy3.join(', ')}`)
console.log(``)
console.log(`✓ Max de ONTEM:          ${maxStreakYesterday}`)
console.log(`✓ Max de HOJE (real):    ${maxStreakToday}`)
console.log(`✓ Current de HOJE:       ${currentStreakToday}`)
console.log(``)
console.log(`🐛 BUG IDENTIFICADO:`)
console.log(`   Sistema compara: currentToday (${currentStreakToday}) >= maxYesterday (${maxStreakYesterday})`)
console.log(`   Deveria comparar: currentToday (${currentStreakToday}) >= maxToday (${maxStreakToday})`)
console.log(`   Dispara notificação? ${currentStreakToday >= maxStreakYesterday ? 'SIM ❌ (INCORRETO!)' : 'NÃO'}`)
console.log(`   Deveria disparar?    ${currentStreakToday >= maxStreakToday ? 'SIM' : 'NÃO ✅'}`)

console.log('')
console.log('='.repeat(80))
console.log('CONCLUSÃO')
console.log('='.repeat(80))
console.log(`
O BUG está em comparar:
  - Sequência ATUAL de HOJE (tempo real)
  - Máximo de ONTEM (ou data selecionada)

Deveria comparar:
  - Sequência ATUAL de HOJE (tempo real)  
  - Máximo de HOJE (ou mesma fonte de dados)

Problema adicional:
  - calculateCurrentRedStreak recebe números em ordem inversa (recente→antigo)
  - calculateMaxRedForNotification recebe números em ordem normal (antigo→recente)
  - Isso pode causar inconsistências na lógica de contagem

SOLUÇÃO:
  1. Garantir que ambas as funções usem a mesma ordem de dados
  2. Comparar currentStreak com maxStreak DO MESMO DIA/FONTE
  3. Se o usuário está vendo dados em tempo real, usar máximo de HOJE
  4. Se o usuário selecionou uma data histórica, desabilitar notificações
`)
