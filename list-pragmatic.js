const WebSocket = require('ws');

const ws = new WebSocket('ws://177.93.108.140:8777');
const pragmaticRoulettes = new Set();
let messageCount = 0;

ws.on('open', () => {
  console.log('✅ Conectado à API');
  console.log('⏳ Aguardando 30 segundos para coletar todas as roletas Pragmatic...\n');
});

ws.on('message', (data) => {
  try {
    const msg = JSON.parse(data);
    messageCount++;
    
    // A API envia mensagens com formato: {game: 'nome-roleta', game_type: 'roleta', results: [...]}
    if (msg.game && msg.game_type === 'roleta') {
      const gameName = msg.game.toLowerCase();
      
      // Verificar se é Pragmatic Play
      if (gameName.includes('pragmatic') || 
          gameName.includes('mega roulette') || 
          gameName.includes('auto mega') ||
          gameName.includes('power up')) {
        
        if (!pragmaticRoulettes.has(msg.game)) {
          pragmaticRoulettes.add(msg.game);
          console.log(`   ✓ Encontrada: ${msg.game}`);
        }
      }
    }
  } catch(e) {
    // Ignora mensagens que não são JSON
  }
});

ws.on('error', (error) => {
  console.error('❌ Erro na conexão:', error.message);
  process.exit(1);
});

// Aguardar 30 segundos para coletar todas as roletas
setTimeout(() => {
  console.log('\n=== RESULTADO ===');
  console.log(`Total de mensagens recebidas: ${messageCount}`);
  console.log(`\n=== ROLETAS PRAGMATIC PLAY NA API ===\n`);
  
  const sorted = Array.from(pragmaticRoulettes).sort();
  sorted.forEach((name, index) => {
    console.log(`${index + 1}. ${name}`);
  });
  
  console.log(`\nTotal: ${sorted.length} roletas Pragmatic Play encontradas\n`);
  
  ws.close();
  process.exit(0);
}, 30000);
