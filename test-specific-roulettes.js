const WebSocket = require('ws');

console.log('🔍 VERIFICANDO NOMES EXATOS DAS ROLETAS SOLICITADAS...\n');

const ws = new WebSocket('wss://roulette-websocket-server-production.up.railway.app');

const allRoulettes = new Set();
let timeout;

ws.on('open', () => {
  console.log('✅ Conectado ao WebSocket\n');
  
  timeout = setTimeout(() => {
    console.log('\n⏱️  Tempo esgotado (45s)\n');
    printResults();
    ws.close();
  }, 45000);
});

ws.on('message', (data) => {
  try {
    const message = JSON.parse(data.toString());
    
    if (message.roulettes && Array.isArray(message.roulettes)) {
      message.roulettes.forEach(name => allRoulettes.add(name));
    }
    
    if (message.type === 'result' && message.roulette) {
      allRoulettes.add(message.roulette);
    }
    
    if (message.roulette && message.results) {
      allRoulettes.add(message.roulette);
    }
    
  } catch (err) {}
});

ws.on('error', (error) => {
  console.error('❌ Erro:', error.message);
});

ws.on('close', () => {
  clearTimeout(timeout);
  console.log('🔌 Conexão fechada');
  process.exit(0);
});

function printResults() {
  const wanted = {
    evolution: [
      'lightning',
      'xtreme',
      'immersive',
      'auto roulette',
      'vip',
      'red door',
      'porta vermelha',
      'speed auto',
      'auto lightning'
    ],
    pragmatic: [
      'mega roulette',
      'auto mega',
      'mega roulette brasil',
      'vip auto',
      'brasileira',
      'speed'
    ]
  };
  
  const allArray = Array.from(allRoulettes).sort();
  
  console.log('═══════════════════════════════════════════════════════════');
  console.log('🎯 ROLETAS EVOLUTION GAMING:');
  console.log('═══════════════════════════════════════════════════════════\n');
  
  allArray.forEach(name => {
    const lower = name.toLowerCase();
    const hasEvolution = wanted.evolution.some(keyword => lower.includes(keyword));
    
    if (hasEvolution) {
      console.log(`✅ ${name}`);
      console.log(`   → Keyword: '${lower}'\n`);
    }
  });
  
  console.log('═══════════════════════════════════════════════════════════');
  console.log('🎯 ROLETAS PRAGMATIC PLAY:');
  console.log('═══════════════════════════════════════════════════════════\n');
  
  allArray.forEach(name => {
    const lower = name.toLowerCase();
    const isPragmatic = lower.includes('pragmatic') || 
                       wanted.pragmatic.some(keyword => lower.includes(keyword));
    
    if (isPragmatic) {
      console.log(`✅ ${name}`);
      console.log(`   → Keyword: '${lower}'\n`);
    }
  });
  
  console.log('═══════════════════════════════════════════════════════════');
  console.log('📋 TODAS AS ROLETAS DISPONÍVEIS:');
  console.log('═══════════════════════════════════════════════════════════\n');
  allArray.forEach((name, i) => {
    console.log(`${(i+1).toString().padStart(2)}. ${name}`);
  });
}
