// Teste rápido para verificar a lógica de cores

const STRATEGY_NUMBERS = [17, 25, 2, 21, 4];
const GREEN_RED_ATTEMPTS = 3;

function updateNumberStatuses(numbers, strategyNumbers, greenRedAttempts) {
  const statusArray = new Array(numbers.length).fill('NEUTRAL');
  
  for (let i = numbers.length - 1; i >= 0; i--) {
    const num = numbers[i];
    
    if (!strategyNumbers.includes(num)) continue;
    if (statusArray[i] === 'GREEN') continue;
    
    statusArray[i] = 'ACTIVATION';
    
    let foundGreenInWindow = false;
    let lastCheckedIndex = -1;
    
    for (let j = 1; j <= greenRedAttempts; j++) {
      const checkIndex = i - j;
      if (checkIndex < 0) break;
      
      lastCheckedIndex = checkIndex;
      const checkNum = numbers[checkIndex];
      
      if (strategyNumbers.includes(checkNum)) {
        statusArray[checkIndex] = 'GREEN';
        foundGreenInWindow = true;
        break;
      }
    }
    
    if (!foundGreenInWindow && lastCheckedIndex >= 0 && lastCheckedIndex === i - greenRedAttempts) {
      statusArray[lastCheckedIndex] = 'RED';
    }
  }
  
  return statusArray;
}

// Teste: Ativação na posição 3, números 10, 11, 12 nas casas 1, 2, 3
// Esperado: RED na casa 3 (índice 0)
const test1 = [10, 11, 12, 4, 30];
console.log('Teste 1: RED deve estar no índice 0');
console.log('Números:', test1);
console.log('Resultado:', updateNumberStatuses(test1, STRATEGY_NUMBERS, GREEN_RED_ATTEMPTS));

// Teste: Ativação na posição 3, GREEN na casa 2
const test2 = [10, 25, 12, 4, 30];
console.log('\nTeste 2: GREEN deve estar no índice 1');
console.log('Números:', test2);
console.log('Resultado:', updateNumberStatuses(test2, STRATEGY_NUMBERS, GREEN_RED_ATTEMPTS));

// Teste: Ativação na posição 3, apenas 2 casas à frente (sem RED)
const test3 = [10, 11, 4];
console.log('\nTeste 3: Sem RED (só 2 casas, precisa de 3)');
console.log('Números:', test3);
console.log('Resultado:', updateNumberStatuses(test3, STRATEGY_NUMBERS, GREEN_RED_ATTEMPTS));

// Teste: GREEN na casa 9 (fora do intervalo)
const test4 = [10, 11, 12, 13, 14, 15, 16, 17, 18, 4, 30];
console.log('\nTeste 4: GREEN deveria estar no índice 6 (17), não deveria ter GREEN após índice 6');
console.log('Números:', test4);
console.log('Resultado:', updateNumberStatuses(test4, STRATEGY_NUMBERS, GREEN_RED_ATTEMPTS));
console.log('NOTA: índice 0 é RED pq não houve GREEN dentro de 3 casas da ACTIVATION em índice 3');
