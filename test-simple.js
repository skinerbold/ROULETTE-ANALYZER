/**
 * SCRIPT DE TESTE SIMPLIFICADO - LÓGICA DE MARCAÇÃO DE CORES
 */

// Configuração
const GREEN_RED_ATTEMPTS = 3;

// Estratégia de teste
const strategy = { 
  id: 221, 
  name: 'T2-T5-T6', 
  numbers: [2,5,6,12,15,16,20,22,25,26,32,35,36] 
};

// Histórico FIXO para teste (igual ao que aparece na imagem do usuário)
// Array: [0] = mais recente, [N] = mais antigo
const history = [
  { number: 27, timestamp: 1 },
  { number: 22, timestamp: 2 },
  { number: 36, timestamp: 3 },
  { number: 7, timestamp: 4 },
  { number: 21, timestamp: 5 },
  { number: 36, timestamp: 6 },
  { number: 16, timestamp: 7 },
  { number: 5, timestamp: 8 },
  { number: 26, timestamp: 9 },
  { number: 32, timestamp: 10 },
  { number: 13, timestamp: 11 },
  { number: 0, timestamp: 12 },
  { number: 23, timestamp: 13 },
  { number: 5, timestamp: 14 },
  { number: 34, timestamp: 15 },
  { number: 17, timestamp: 16 },
  { number: 9, timestamp: 17 },
  { number: 10, timestamp: 18 },
  { number: 12, timestamp: 19 },
  { number: 16, timestamp: 20 },
];

console.log('========================================');
console.log('TESTE DE MARCACAO DE CORES');
console.log('========================================');
console.log('');
console.log('Estrategia:', strategy.name);
console.log('Numeros da estrategia:', strategy.numbers);
console.log('');
console.log('Historico de teste (0 = mais recente):');
history.forEach((h, i) => {
  const pertence = strategy.numbers.includes(h.number) ? 'SIM' : 'nao';
  console.log('  [' + i + '] Numero: ' + h.number + ' - Pertence: ' + pertence);
});

console.log('');
console.log('========================================');
console.log('CALCULANDO STATUSES...');
console.log('========================================');
console.log('');

// LÓGICA DE MARCAÇÃO (copiada do código)
const statuses = history.map(entry => ({
  number: entry.number,
  timestamp: entry.timestamp,
  status: 'NEUTRAL'
}));

const strategyNumbers = strategy.numbers;

// Processar do mais antigo (índice maior) para o mais recente (índice menor)
for (let i = history.length - 1; i >= 0; i--) {
  const currentNum = history[i].number;
  
  console.log('Processando indice ' + i + ', numero ' + currentNum);
  
  // Pula se não for número da estratégia
  if (!strategyNumbers.includes(currentNum)) {
    console.log('  -> Nao pertence a estrategia, pulando');
    continue;
  }
  
  // Se já foi marcado como GREEN, não sobrescrever
  if (statuses[i].status === 'GREEN') {
    console.log('  -> Ja esta GREEN, pulando');
    continue;
  }
  
  // É número da estratégia - marca como ACTIVATION
  statuses[i].status = 'ACTIVATION';
  console.log('  -> Marcado como ACTIVATION');
  
  // Procurar GREEN/RED nos próximos números (índices menores = mais recentes)
  let foundGreen = false;
  
  for (let j = 1; j <= GREEN_RED_ATTEMPTS; j++) {
    const checkIndex = i - j;
    
    if (checkIndex < 0) {
      console.log('  -> Verificando j=' + j + ': indice ' + checkIndex + ' invalido, parando');
      break;
    }
    
    const checkNum = history[checkIndex].number;
    console.log('  -> Verificando j=' + j + ': indice ' + checkIndex + ', numero ' + checkNum);
    
    if (strategyNumbers.includes(checkNum)) {
      statuses[checkIndex].status = 'GREEN';
      foundGreen = true;
      console.log('     ENCONTROU! Numero ' + checkNum + ' pertence, marcando GREEN');
      break;
    }
    
    if (j === GREEN_RED_ATTEMPTS && !foundGreen) {
      statuses[checkIndex].status = 'RED';
      console.log('     Ultima tentativa sem GREEN, marcando RED no indice ' + checkIndex);
    }
  }
}

console.log('');
console.log('========================================');
console.log('RESULTADO FINAL:');
console.log('========================================');
console.log('');

statuses.forEach((s, i) => {
  const pertence = strategyNumbers.includes(s.number) ? 'SIM' : 'nao';
  let statusMark = '   ';
  if (s.status === 'ACTIVATION') statusMark = '[A]';
  if (s.status === 'GREEN') statusMark = '[G]';
  if (s.status === 'RED') statusMark = '[R]';
  
  console.log(statusMark + ' [' + i + '] Numero: ' + s.number + ' | Status: ' + s.status + ' | Pertence: ' + pertence);
});

console.log('');
console.log('========================================');
console.log('VERIFICANDO ERROS:');
console.log('========================================');
console.log('');

let errors = 0;

statuses.forEach((s, i) => {
  // Erro 1: ACTIVATION em número que NÃO pertence
  if (s.status === 'ACTIVATION' && !strategyNumbers.includes(s.number)) {
    console.log('ERRO: Numero ' + s.number + ' marcado ACTIVATION mas NAO pertence!');
    errors++;
  }
  
  // Erro 2: GREEN em número que NÃO pertence
  if (s.status === 'GREEN' && !strategyNumbers.includes(s.number)) {
    console.log('ERRO: Numero ' + s.number + ' marcado GREEN mas NAO pertence!');
    errors++;
  }
  
  // Erro 3: Número que pertence mas está NEUTRAL (pode ser válido se não houve ativação anterior)
  if (strategyNumbers.includes(s.number) && s.status === 'NEUTRAL') {
    console.log('AVISO: Numero ' + s.number + ' pertence mas esta NEUTRAL');
  }
});

if (errors === 0) {
  console.log('Nenhum erro encontrado na logica de marcacao!');
}

console.log('');
console.log('Total de erros: ' + errors);
