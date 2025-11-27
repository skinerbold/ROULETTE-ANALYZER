// ============================================
// TESTE COMPLETO DO SERVIDOR WEBSOCKET RAILWAY
// ============================================

const WebSocket = require('ws');
const https = require('https');

// ============================================
// CONFIGURAÇÃO
// ============================================

const RAILWAY_WS_URL = process.env.RAILWAY_WS_URL || 'wss://roulette-websocket-server-production.up.railway.app';
const FLY_API_URL = 'https://roulette-history-api.fly.dev';
const TEST_ROULETTE = 'pragmatic-speed-auto-roulette';
const TEST_LIMIT = 500;

console.log('🧪 INICIANDO TESTES DO SERVIDOR WEBSOCKET RAILWAY');
console.log('=' .repeat(80));
console.log(`🌐 WebSocket URL: ${RAILWAY_WS_URL}`);
console.log(`🚀 API Fly.io URL: ${FLY_API_URL}`);
console.log(`🎰 Roleta de teste: ${TEST_ROULETTE}`);
console.log(`📊 Limite de teste: ${TEST_LIMIT}`);
console.log('=' .repeat(80));
console.log('');

// ============================================
// TESTE 1: API FLY.IO ESTÁ FUNCIONANDO?
// ============================================

async function test1_flyApiWorking() {
    console.log('📋 TESTE 1: Verificar se API Fly.io retorna números históricos');
    console.log('-'.repeat(80));

    return new Promise((resolve, reject) => {
        const url = `${FLY_API_URL}/api/history/${TEST_ROULETTE}?limit=50`;
        
        console.log(`   📡 Request: ${url}`);
        
        https.get(url, (res) => {
            let data = '';

            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    
                    if (json.success && Array.isArray(json.numbers)) {
                        console.log(`   ✅ API Fly.io respondeu com sucesso`);
                        console.log(`   📊 Total de números: ${json.numbers.length}`);
                        console.log(`   🔢 Primeiros 10: [${json.numbers.slice(0, 10).join(', ')}]`);
                        console.log(`   🎯 Roleta confirmada: ${json.rouletteId}`);
                        console.log('');
                        resolve({ success: true, count: json.numbers.length, numbers: json.numbers });
                    } else {
                        console.log(`   ❌ API retornou formato inválido`);
                        console.log(`   📄 Response:`, json);
                        console.log('');
                        resolve({ success: false, error: 'Formato inválido' });
                    }
                } catch (error) {
                    console.log(`   ❌ Erro ao parsear resposta: ${error.message}`);
                    console.log('');
                    reject(error);
                }
            });
        }).on('error', (error) => {
            console.log(`   ❌ Erro de conexão: ${error.message}`);
            console.log('');
            reject(error);
        });
    });
}

// ============================================
// TESTE 2: WEBSOCKET CONECTA?
// ============================================

async function test2_websocketConnection() {
    console.log('📋 TESTE 2: Verificar conexão com WebSocket Railway');
    console.log('-'.repeat(80));

    return new Promise((resolve, reject) => {
        const ws = new WebSocket(RAILWAY_WS_URL);
        let connected = false;

        const timeout = setTimeout(() => {
            if (!connected) {
                console.log(`   ❌ Timeout: WebSocket não conectou em 10 segundos`);
                console.log('');
                ws.close();
                resolve({ success: false, error: 'Timeout' });
            }
        }, 10000);

        ws.on('open', () => {
            connected = true;
            clearTimeout(timeout);
            console.log(`   ✅ WebSocket conectado com sucesso`);
            console.log(`   🔗 ReadyState: ${ws.readyState} (1 = OPEN)`);
            console.log('');
            
            ws.close();
            resolve({ success: true });
        });

        ws.on('error', (error) => {
            clearTimeout(timeout);
            console.log(`   ❌ Erro ao conectar: ${error.message}`);
            console.log('');
            reject(error);
        });
    });
}

// ============================================
// TESTE 3: WEBSOCKET ENVIA LISTA DE ROLETAS?
// ============================================

async function test3_rouletteList() {
    console.log('📋 TESTE 3: Verificar se WebSocket envia lista de roletas');
    console.log('-'.repeat(80));

    return new Promise((resolve, reject) => {
        const ws = new WebSocket(RAILWAY_WS_URL);
        let receivedRoulettes = false;

        const timeout = setTimeout(() => {
            if (!receivedRoulettes) {
                console.log(`   ❌ Timeout: Não recebeu lista de roletas em 10 segundos`);
                console.log('');
                ws.close();
                resolve({ success: false, error: 'Timeout aguardando lista' });
            }
        }, 10000);

        ws.on('message', (raw) => {
            try {
                const message = JSON.parse(raw.toString());
                
                if (message.type === 'roulettes') {
                    clearTimeout(timeout);
                    receivedRoulettes = true;
                    
                    console.log(`   ✅ Lista de roletas recebida`);
                    console.log(`   📊 Total de roletas disponíveis: ${message.data.length}`);
                    console.log(`   🎰 Roletas: [${message.data.slice(0, 5).join(', ')}...]`);
                    
                    const hasTestRoulette = message.data.includes(TEST_ROULETTE);
                    console.log(`   🔍 Contém "${TEST_ROULETTE}"? ${hasTestRoulette ? '✅ SIM' : '❌ NÃO'}`);
                    console.log('');
                    
                    ws.close();
                    resolve({ success: true, count: message.data.length, roulettes: message.data, hasTestRoulette });
                }
            } catch (error) {
                console.log(`   ⚠️ Mensagem não-JSON recebida: ${raw.toString().substring(0, 100)}`);
            }
        });

        ws.on('error', (error) => {
            clearTimeout(timeout);
            console.log(`   ❌ Erro: ${error.message}`);
            console.log('');
            reject(error);
        });
    });
}

// ============================================
// TESTE 4: SUBSCRIBE RETORNA HISTÓRICO?
// ============================================

async function test4_subscribeHistory() {
    console.log('📋 TESTE 4: Verificar se subscribe retorna histórico completo');
    console.log('-'.repeat(80));

    return new Promise((resolve, reject) => {
        const ws = new WebSocket(RAILWAY_WS_URL);
        let receivedHistory = false;

        const timeout = setTimeout(() => {
            if (!receivedHistory) {
                console.log(`   ❌ Timeout: Não recebeu histórico em 15 segundos`);
                console.log('');
                ws.close();
                resolve({ success: false, error: 'Timeout aguardando histórico' });
            }
        }, 15000);

        ws.on('open', () => {
            console.log(`   📤 Enviando subscribe para "${TEST_ROULETTE}" com limite ${TEST_LIMIT}`);
            ws.send(JSON.stringify({
                type: 'subscribe',
                roulette: TEST_ROULETTE,
                limit: TEST_LIMIT
            }));
        });

        ws.on('message', (raw) => {
            try {
                const message = JSON.parse(raw.toString());
                
                if (message.type === 'history') {
                    clearTimeout(timeout);
                    receivedHistory = true;
                    
                    const count = Array.isArray(message.data) ? message.data.length : 0;
                    
                    console.log(`   ✅ Histórico recebido`);
                    console.log(`   📊 Total de números recebidos: ${count}`);
                    console.log(`   🎯 Solicitado: ${TEST_LIMIT}`);
                    console.log(`   📈 Percentual: ${((count / TEST_LIMIT) * 100).toFixed(1)}%`);
                    
                    if (count > 0) {
                        console.log(`   🔢 Primeiros 10: [${message.data.slice(0, 10).join(', ')}]`);
                    }
                    
                    const success = count >= TEST_LIMIT * 0.9; // 90% do solicitado
                    if (!success) {
                        console.log(`   ⚠️ PROBLEMA: Recebeu apenas ${count} números de ${TEST_LIMIT} solicitados`);
                    }
                    console.log('');
                    
                    ws.close();
                    resolve({ success, count, requested: TEST_LIMIT, data: message.data });
                }
            } catch (error) {
                console.log(`   ⚠️ Mensagem não-JSON: ${raw.toString().substring(0, 100)}`);
            }
        });

        ws.on('error', (error) => {
            clearTimeout(timeout);
            console.log(`   ❌ Erro: ${error.message}`);
            console.log('');
            reject(error);
        });
    });
}

// ============================================
// TESTE 5: GET_HISTORY FUNCIONA?
// ============================================

async function test5_getHistory() {
    console.log('📋 TESTE 5: Verificar comando get_history');
    console.log('-'.repeat(80));

    return new Promise((resolve, reject) => {
        const ws = new WebSocket(RAILWAY_WS_URL);
        let receivedHistory = false;

        const timeout = setTimeout(() => {
            if (!receivedHistory) {
                console.log(`   ❌ Timeout: Não recebeu histórico via get_history`);
                console.log('');
                ws.close();
                resolve({ success: false, error: 'Timeout' });
            }
        }, 15000);

        ws.on('open', () => {
            console.log(`   📤 Enviando get_history para "${TEST_ROULETTE}" com limite ${TEST_LIMIT}`);
            ws.send(JSON.stringify({
                type: 'get_history',
                roulette: TEST_ROULETTE,
                limit: TEST_LIMIT
            }));
        });

        ws.on('message', (raw) => {
            try {
                const message = JSON.parse(raw.toString());
                
                if (message.type === 'history') {
                    clearTimeout(timeout);
                    receivedHistory = true;
                    
                    const count = Array.isArray(message.data) ? message.data.length : 0;
                    
                    console.log(`   ✅ Histórico recebido via get_history`);
                    console.log(`   📊 Total de números: ${count}`);
                    console.log(`   🎯 Solicitado: ${TEST_LIMIT}`);
                    
                    const success = count >= TEST_LIMIT * 0.9;
                    console.log('');
                    
                    ws.close();
                    resolve({ success, count });
                }
            } catch (error) {
                // Ignora mensagens não-JSON
            }
        });

        ws.on('error', (error) => {
            clearTimeout(timeout);
            console.log(`   ❌ Erro: ${error.message}`);
            console.log('');
            reject(error);
        });
    });
}

// ============================================
// TESTE 6: SERVIDOR BUSCA DA API FLY.IO?
// ============================================

async function test6_railwayIntegration() {
    console.log('📋 TESTE 6: Verificar se Railway integra com API Fly.io');
    console.log('-'.repeat(80));

    const flyResult = await test1_flyApiWorking();
    
    if (!flyResult.success) {
        console.log('   ⚠️ Não foi possível testar integração - API Fly.io não respondeu');
        console.log('');
        return { success: false, error: 'API Fly.io indisponível' };
    }

    const wsResult = await test4_subscribeHistory();
    
    if (!wsResult.success) {
        console.log('   ⚠️ Não foi possível testar integração - WebSocket não retornou histórico');
        console.log('');
        return { success: false, error: 'WebSocket não retorna histórico' };
    }

    // Comparar se os números batem
    const flyNumbers = flyResult.numbers.slice(0, 10);
    const wsNumbers = wsResult.data.slice(0, 10);
    
    const match = JSON.stringify(flyNumbers) === JSON.stringify(wsNumbers);
    
    console.log('   🔍 Comparando primeiros 10 números:');
    console.log(`   🚀 API Fly.io: [${flyNumbers.join(', ')}]`);
    console.log(`   🌐 WebSocket:  [${wsNumbers.join(', ')}]`);
    console.log(`   ${match ? '✅ NÚMEROS BATEM - Railway está usando Fly.io' : '❌ NÚMEROS DIFERENTES - Railway NÃO está usando Fly.io'}`);
    console.log('');
    
    return { success: match, flyNumbers, wsNumbers };
}

// ============================================
// EXECUTAR TODOS OS TESTES
// ============================================

async function runAllTests() {
    const results = {
        test1: null,
        test2: null,
        test3: null,
        test4: null,
        test5: null,
        test6: null
    };

    try {
        results.test1 = await test1_flyApiWorking();
        results.test2 = await test2_websocketConnection();
        results.test3 = await test3_rouletteList();
        results.test4 = await test4_subscribeHistory();
        results.test5 = await test5_getHistory();
        results.test6 = await test6_railwayIntegration();

    } catch (error) {
        console.error('❌ Erro durante execução dos testes:', error);
    }

    // RESUMO FINAL
    console.log('');
    console.log('=' .repeat(80));
    console.log('📊 RESUMO DOS TESTES');
    console.log('=' .repeat(80));
    console.log('');

    const checkMark = (result) => result && result.success ? '✅' : '❌';

    console.log(`${checkMark(results.test1)} Teste 1: API Fly.io funcionando`);
    console.log(`${checkMark(results.test2)} Teste 2: WebSocket conecta`);
    console.log(`${checkMark(results.test3)} Teste 3: Lista de roletas recebida`);
    console.log(`${checkMark(results.test4)} Teste 4: Subscribe retorna histórico (${results.test4?.count || 0}/${TEST_LIMIT})`);
    console.log(`${checkMark(results.test5)} Teste 5: get_history funciona (${results.test5?.count || 0}/${TEST_LIMIT})`);
    console.log(`${checkMark(results.test6)} Teste 6: Railway integrado com Fly.io`);
    console.log('');

    // DIAGNÓSTICO
    console.log('🔍 DIAGNÓSTICO:');
    console.log('-'.repeat(80));

    if (!results.test1?.success) {
        console.log('❌ PROBLEMA CRÍTICO: API Fly.io não está respondendo');
        console.log('   → Verifique se o worker está rodando');
    }

    if (results.test4?.count < TEST_LIMIT * 0.5) {
        console.log(`⚠️ PROBLEMA: WebSocket retorna apenas ${results.test4?.count} números de ${TEST_LIMIT}`);
        console.log('   → Railway não está buscando dados suficientes da API');
        console.log('   → Possível causa: fetchHistoryFromAPI() não está sendo chamado');
    }

    if (!results.test6?.success) {
        console.log('❌ PROBLEMA CRÍTICO: Railway NÃO está integrado com API Fly.io');
        console.log('   → Railway está usando fonte de dados diferente');
        console.log('   → Verificar variáveis de ambiente no Railway');
    }

    console.log('');
    console.log('=' .repeat(80));
    console.log('✅ TESTES CONCLUÍDOS');
    console.log('=' .repeat(80));
}

// Executar
runAllTests().catch(console.error);
