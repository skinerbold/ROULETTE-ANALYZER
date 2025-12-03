// Servidor WebSocket para Roleta ao Vivo
// Refatorado para isolar histórico por roleta, persistir lançamentos
// e implementar o protocolo subscribe/unsubscribe/get_history.

const WebSocket = require('ws');
const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const wss = new WebSocket.Server({ port: 3000 });

console.log('🎰 Servidor WebSocket de Roleta rodando em ws://localhost:3000');

// ============================================
// CARREGAR CONFIGURAÇÃO DA API
// ============================================

let API_CONFIG;
const configPath = path.join(__dirname, 'api-config.js');

if (fs.existsSync(configPath)) {
  console.log('📋 Carregando configuração de api-config.js');
  API_CONFIG = require('./api-config.js');

  if (!API_CONFIG.enabled) {
    console.error('❌ API está desabilitada no arquivo de configuração');
    console.error('💡 Configure enabled: true em api-config.js');
    process.exit(1);
  }
} else {
  console.error('❌ ERRO: api-config.js não encontrado!');
  console.error('💡 Copie api-config.example.js para api-config.js e configure seus dados da API');
  process.exit(1);
}

// ============================================
// SUPABASE (PERSISTÊNCIA)
// ============================================

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
let supabaseAdmin = null;

if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
    supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
        auth: { persistSession: false }
    });
    console.log('🗄️  Persistência Supabase habilitada para roulette_history');
} else {
    console.warn('⚠️ Supabase não configurado (SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY). Historico persistido apenas em memória.');
}

// ============================================
// MEMÓRIA E ESTRUTURAS DO SERVIDOR
// ============================================

const MAX_CACHE_LENGTH = 500;
const DEFAULT_HISTORY_LIMIT = 500;
const inMemoryHistory = new Map(); // rouletteId -> [{ value, timestamp }]
const availableRoulettes = new Set();
const rouletteMeta = new Map(); // rouletteId -> { lastTimestamp }
const subscriptionMap = new Map(); // ws -> Set(rouletteId)
const apiHydrationPromises = new Map(); // evita race conditions

let apiWebSocket = null;
let reconnectAttempts = 0;

// Normalização centralizada garante consistência entre cache, storage e clientes.
function normalizeRouletteId(raw) {
    return (raw || '').trim().toLowerCase();
}

function buildHistoryPayload(rouletteId, history) {
    const numbers = history.map(entry => entry.value);
    const entries = history.map(entry => ({ number: entry.value, timestamp: entry.timestamp }));
    return {
        type: 'history',
        roulette: rouletteId,
        data: numbers,
        entries
    };
}

function ensureSubscriptionEntry(ws) {
    if (!subscriptionMap.has(ws)) {
        subscriptionMap.set(ws, new Set());
    }
    return subscriptionMap.get(ws);
}

function broadcastToSubscribers(rouletteId, message) {
    const payload = JSON.stringify(message);
    wss.clients.forEach(client => {
        if (client.readyState !== WebSocket.OPEN) return;
        const subs = subscriptionMap.get(client);
        if (subs && subs.has(rouletteId)) {
            client.send(payload);
        }
    });
}

function registerRoulette(rouletteIdRaw) {
    const rouletteId = normalizeRouletteId(rouletteIdRaw);
    if (!rouletteId) {
        return null;
    }
    if (!availableRoulettes.has(rouletteId)) {
        availableRoulettes.add(rouletteId);
        // Notificamos todos os clientes sobre novas roletas descobertas.
        const listPayload = {
            type: 'roulettes',
            data: Array.from(availableRoulettes.values())
        };
        const serialized = JSON.stringify(listPayload);
        wss.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(serialized);
            }
        });
        console.log(`✅ Nova roleta descoberta e registrada: ${rouletteId}`);
    }
    return rouletteId;
}

// ============================================
// PERSISTÊNCIA SUPABASE
// ============================================

// Cache para rastrear último número persistido por roleta (evita duplicatas)
const lastPersistedNumber = new Map(); // rouletteId -> { number, timestamp }

/**
 * Persiste UM ÚNICO número usando a função RPC update_roulette_history
 * Esta função já implementa a lógica de shift de posições (1-500)
 */
async function persistSingleNumber(rouletteId, number, timestamp) {
    if (!supabaseAdmin) {
        return false;
    }
    
    // Verificar se já persistiu este número recentemente (evita duplicatas)
    const lastPersisted = lastPersistedNumber.get(rouletteId);
    if (lastPersisted && lastPersisted.number === number && 
        Math.abs(lastPersisted.timestamp - timestamp) < 5000) {
        console.log(`⏭️ Número ${number} já persistido recentemente para ${rouletteId}, ignorando`);
        return false;
    }
    
    try {
        const { data, error } = await supabaseAdmin.rpc('update_roulette_history', {
            p_roulette_id: rouletteId,
            p_number: number,
            p_timestamp: new Date(timestamp).toISOString()
        });
        
        if (error) {
            console.error(`❌ Erro ao persistir número ${number} para ${rouletteId}:`, error.message);
            return false;
        }
        
        // Atualizar cache de último número persistido
        lastPersistedNumber.set(rouletteId, { number, timestamp });
        
        console.log(`💾 Número ${number} persistido para ${rouletteId} via RPC`);
        return true;
    } catch (err) {
        console.error('❌ Erro inesperado ao persistir número:', err);
        return false;
    }
}

/**
 * @deprecated Use persistSingleNumber para novos números
 * Mantido para compatibilidade com carga inicial do histórico
 */
async function persistEntries(rouletteId, entries) {
    if (!supabaseAdmin || !entries.length) {
        return;
    }
    
    // Para carga inicial, persistir apenas o número mais recente
    // Os outros serão carregados da API quando necessário
    const latestEntry = entries[entries.length - 1]; // último = mais recente na ordem cronológica
    if (latestEntry) {
        await persistSingleNumber(rouletteId, latestEntry.value, latestEntry.timestamp);
    }
}

async function hydrateFromStore(rouletteId) {
    if (!supabaseAdmin) {
        return;
    }

    if (apiHydrationPromises.has(rouletteId)) {
        return apiHydrationPromises.get(rouletteId);
    }

    const promise = (async () => {
        try {
            // CORRIGIDO: Usar nomes corretos das colunas (number, timestamp, position)
            const { data, error } = await supabaseAdmin
                .from('roulette_history')
                .select('number, timestamp, position')
                .eq('roulette_id', rouletteId)
                .order('position', { ascending: true }) // position 1 = mais recente
                .limit(MAX_CACHE_LENGTH);

            if (error) {
                console.error('❌ Erro ao carregar histórico do Supabase:', error.message);
                return;
            }

            if (Array.isArray(data) && data.length) {
                // Mapear para formato interno (value, timestamp)
                const entries = data.map(row => ({
                    value: row.number,  // CORRIGIDO: era row.value
                    timestamp: new Date(row.timestamp).getTime()
                }));
                inMemoryHistory.set(rouletteId, entries);
                rouletteMeta.set(rouletteId, { lastTimestamp: entries[0].timestamp });
                console.log(`💾 Cache de ${rouletteId} hidratado com ${entries.length} lançamentos persistidos.`);
            }
        } finally {
            apiHydrationPromises.delete(rouletteId);
        }
    })();

    apiHydrationPromises.set(rouletteId, promise);
    return promise;
}

async function fetchOlderFromStore(rouletteId, alreadyCached, limit) {
    if (!supabaseAdmin) {
        return [];
    }
    try {
        // CORRIGIDO: Usar nomes corretos das colunas e ordenar por position
        // position já começa em alreadyCached + 1
        const startPosition = alreadyCached + 1;
        const endPosition = alreadyCached + limit;
        
        const { data, error } = await supabaseAdmin
            .from('roulette_history')
            .select('number, timestamp, position')
            .eq('roulette_id', rouletteId)
            .gte('position', startPosition)
            .lte('position', endPosition)
            .order('position', { ascending: true });

        if (error) {
            console.error('❌ Erro ao expandir histórico persistido:', error.message);
            return [];
        }

        // Mapear para formato interno
        return data.map(row => ({ 
            value: row.number,  // CORRIGIDO: era row.value
            timestamp: new Date(row.timestamp).getTime() 
        }));
    } catch (err) {
        console.error('❌ Exceção ao buscar histórico adicional:', err);
        return [];
    }
}

// ============================================
// CONEXÃO COM WEBSOCKET DA API REAL
// ============================================

function connectToAPIWebSocket() {
    const wsUrl = API_CONFIG.websocketUrl || 'ws://177.93.108.140:8777';

    console.log(`🔌 Conectando ao WebSocket da API: ${wsUrl}`);

    try {
        apiWebSocket = new WebSocket(wsUrl);

        apiWebSocket.on('open', () => {
            console.log('✅ Conectado ao WebSocket da API!');
            reconnectAttempts = 0;

            try {
                apiWebSocket.send(JSON.stringify({ type: 'get_roulettes', action: 'list_tables' }));
            } catch (error) {
                console.error('Erro ao solicitar roletas:', error);
            }
        });

        apiWebSocket.on('message', async raw => {
            try {
                const message = JSON.parse(raw.toString());

                if (API_CONFIG.verbose) {
                    console.log('📨 Mensagem da API:', message);
                }

                if (message.game && message.game_type === 'roleta' && Array.isArray(message.results)) {
                    await processApiHistory(message.game, message.results);
                }
            } catch (error) {
                if (API_CONFIG.verbose) {
                    console.log('📨 Mensagem da API (não-JSON ou inválida):', raw.toString().substring(0, 100));
                }
            }
        });

        apiWebSocket.on('error', error => {
            console.error('❌ Erro no WebSocket da API:', error.message);
        });

        apiWebSocket.on('close', (code, reason) => {
            console.log(`⚠️ WebSocket da API fechado. Código: ${code}, Motivo: ${reason}`);

            if (API_CONFIG.reconnect && reconnectAttempts < API_CONFIG.maxReconnectAttempts) {
                reconnectAttempts += 1;
                console.log(`🔄 Tentando reconectar (${reconnectAttempts}/${API_CONFIG.maxReconnectAttempts})...`);
                setTimeout(connectToAPIWebSocket, API_CONFIG.reconnectInterval);
            } else {
                console.error('❌ Máximo de tentativas de reconexão atingido');
                process.exit(1);
            }
        });
    } catch (error) {
        console.error('❌ Erro ao criar conexão WebSocket:', error.message);
        process.exit(1);
    }
}

async function processApiHistory(rawRouletteId, numbers) {
    const rouletteId = registerRoulette(rawRouletteId);
    if (!rouletteId) {
        return;
    }

    await hydrateFromStore(rouletteId);

    const normalizedNumbers = numbers.map(n => {
        if (n === '00') return 37;
        const parsed = parseInt(n, 10);
        return Number.isNaN(parsed) ? 0 : Math.max(0, Math.min(parsed, 37));
    });

    const existing = inMemoryHistory.get(rouletteId) || [];
    const existingValues = existing.map(entry => entry.value);
    const now = Date.now();

    // ============================================
    // LÓGICA CORRIGIDA: Detectar apenas números NOVOS
    // ============================================
    
    // Se já temos dados no cache, verificar apenas o número mais recente
    if (existing.length > 0) {
        const latestIncoming = normalizedNumbers[0];
        const latestExisting = existing[0]?.value;
        
        // Se o número mais recente é igual ao que já temos, não há novidade
        if (latestIncoming === latestExisting) {
            return; // Nada novo
        }
        
        // Encontrar quantos números novos chegaram
        // Procurar onde o número mais recente do cache aparece no incoming
        let newCount = 0;
        for (let i = 0; i < normalizedNumbers.length; i++) {
            if (normalizedNumbers[i] === latestExisting) {
                newCount = i;
                break;
            }
            // Se não encontrou até o fim, assumir que é apenas 1 novo
            if (i === normalizedNumbers.length - 1) {
                newCount = 1;
            }
        }
        
        // Limitar a 10 novos por vez (proteção contra carga inicial duplicada)
        newCount = Math.min(newCount, 10);
        
        if (newCount === 0) {
            newCount = 1; // Pelo menos 1 novo
        }
        
        // Criar entradas apenas para os novos números
        const newEntries = [];
        for (let i = 0; i < newCount; i++) {
            const timestamp = now - i * 100; // Pequena diferença para ordem
            newEntries.push({ value: normalizedNumbers[i], timestamp });
        }
        
        // Atualizar cache em memória
        const updatedHistory = [...newEntries, ...existing].slice(0, MAX_CACHE_LENGTH);
        inMemoryHistory.set(rouletteId, updatedHistory);
        rouletteMeta.set(rouletteId, { lastTimestamp: updatedHistory[0].timestamp });
        
        // PERSISTIR APENAS O NÚMERO MAIS RECENTE (1 por vez)
        const latest = newEntries[0];
        await persistSingleNumber(rouletteId, latest.value, latest.timestamp);
        
        // Broadcast para clientes
        broadcastToSubscribers(rouletteId, {
            type: 'result',
            roulette: rouletteId,
            number: latest.value,
            timestamp: latest.timestamp
        });
        
        console.log(`📊 ${rouletteId}: ${newCount} novo(s) número(s), último: ${latest.value}`);
        return;
    }
    
    // ============================================
    // PRIMEIRO CARREGAMENTO (cache vazio)
    // Carregar em memória mas NÃO persistir todo o histórico
    // ============================================
    
    const newEntries = [];
    for (let i = 0; i < normalizedNumbers.length; i += 1) {
        const timestamp = now - i * 1000;
        newEntries.push({ value: normalizedNumbers[i], timestamp });
    }
    
    // Salvar em memória
    inMemoryHistory.set(rouletteId, newEntries.slice(0, MAX_CACHE_LENGTH));
    rouletteMeta.set(rouletteId, { lastTimestamp: newEntries[0]?.timestamp || now });
    
    // PERSISTIR APENAS O NÚMERO MAIS RECENTE (não todo o histórico!)
    if (newEntries.length > 0) {
        const latest = newEntries[0];
        await persistSingleNumber(rouletteId, latest.value, latest.timestamp);
        
        broadcastToSubscribers(rouletteId, {
            type: 'result',
            roulette: rouletteId,
            number: latest.value,
            timestamp: latest.timestamp
        });
    }
    
    console.log(`🆕 ${rouletteId}: Primeiro carregamento - ${newEntries.length} números em memória, 1 persistido`);
}

// ============================================
// FUNÇÕES DE API REAL (FALLBACK HTTP)
// ============================================

function fetchFromAPI(url, headers = {}) {
    return new Promise((resolve, reject) => {
        const parsedUrl = new URL(url);
        const protocol = parsedUrl.protocol === 'https:' ? https : http;

        const options = {
            hostname: parsedUrl.hostname,
            port: parsedUrl.port,
            path: parsedUrl.pathname + parsedUrl.search,
            method: 'GET',
            headers: { ...API_CONFIG.headers, ...headers }
        };

        const req = protocol.request(options, res => {
            let data = '';

            res.on('data', chunk => {
                data += chunk;
            });

            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch (err) {
                    reject(new Error('Resposta inválida da API'));
                }
            });
        });

        req.on('error', reject);

        req.setTimeout(5000, () => {
            req.destroy();
            reject(new Error('Timeout ao conectar à API'));
        });

        req.end();
    });
}

async function fetchRoulettesFromAPI() {
    const url = API_CONFIG.baseUrl + API_CONFIG.endpoints.roulettes;
    if (API_CONFIG.verbose) console.log(`📡 Buscando roletas da API: ${url}`);

    const response = await fetchFromAPI(url);
    const roulettes = API_CONFIG.parseRoulettesResponse(response);

    if (Array.isArray(roulettes) && roulettes.length > 0) {
        console.log(`✅ ${roulettes.length} roletas carregadas da API`);
        return roulettes.map(r => (typeof r === 'string' ? r : r.name || r.id || r.toString()));
    }

    throw new Error('API não retornou roletas válidas');
}

async function fetchHistoryFromAPI(rouletteName, limit = DEFAULT_HISTORY_LIMIT) {
    let url = API_CONFIG.baseUrl + API_CONFIG.endpoints.history.replace('{id}', encodeURIComponent(rouletteName));

    if (!url.includes('limit=')) {
        url += (url.includes('?') ? '&' : '?') + `limit=${limit}`;
    }

    if (API_CONFIG.verbose) console.log(`📡 Buscando histórico da API: ${url}`);

    const response = await fetchFromAPI(url);
    const history = API_CONFIG.parseHistoryResponse(response);

    if (Array.isArray(history) && history.length > 0) {
        console.log(`✅ ${history.length} números carregados da API para ${rouletteName}`);
        return history.map(n => {
            if (n === '00') return 37;
            const num = typeof n === 'number' ? n : parseInt(n, 10);
            return Number.isNaN(num) ? 0 : Math.max(0, Math.min(num, 37));
        }).slice(0, limit);
    }

    throw new Error('API não retornou histórico válido');
}

async function initializeFromAPI() {
    console.log('🔄 Inicializando conexão com WebSocket da API...');

    try {
        connectToAPIWebSocket();

        await new Promise(resolve => setTimeout(resolve, 2000));

        if (!availableRoulettes.size && API_CONFIG.baseUrl) {
            console.log('⚠️ Tentando buscar roletas via HTTP como fallback...');
            const apiRoulettes = await fetchRoulettesFromAPI();

            apiRoulettes.forEach(roulette => registerRoulette(roulette));

            for (const roulette of apiRoulettes) {
                const numbers = await fetchHistoryFromAPI(roulette, MAX_CACHE_LENGTH);
                await processApiHistory(roulette, numbers);
            }
        }

        console.log('✅ Inicialização completa - Conectado à API real');
    } catch (error) {
        console.error('❌ Erro na inicialização:', error.message);
        console.error('Continuando com conexão WebSocket...');
    }
}

// ============================================
// WEBSOCKET SERVER (CLIENTES)
// ============================================

wss.on('connection', ws => {
    console.log('✅ Novo cliente conectado');

    ensureSubscriptionEntry(ws);

    ws.send(JSON.stringify({ type: 'connected', timestamp: Date.now() }));
    ws.send(JSON.stringify({ type: 'roulettes', data: Array.from(availableRoulettes.values()) }));

    ws.on('message', async raw => {
        try {
            const data = JSON.parse(raw.toString());
            await handleClientMessage(ws, data);
        } catch (err) {
            console.error('❌ Erro ao processar mensagem do cliente:', err);
            ws.send(JSON.stringify({ type: 'error', error: 'Mensagem inválida' }));
        }
    });

    ws.on('close', () => {
        subscriptionMap.delete(ws);
        console.log('🔌 Cliente desconectado');
    });

    ws.on('error', error => {
        console.error('❌ Erro no WebSocket do cliente:', error);
    });
});

wss.on('error', error => {
    console.error('❌ Erro no servidor:', error);
});

async function handleClientMessage(ws, message) {
    switch (message.type) {
        case 'get_roulettes':
            ws.send(JSON.stringify({ type: 'roulettes', data: Array.from(availableRoulettes.values()) }));
            break;

        case 'subscribe': {
            const rouletteId = normalizeRouletteId(message.roulette);
            const limit = Number(message.limit) || DEFAULT_HISTORY_LIMIT;

            if (!rouletteId) {
                ws.send(JSON.stringify({ type: 'error', error: 'Roulette inválida' }));
                return;
            }

            registerRoulette(rouletteId);
            const subs = ensureSubscriptionEntry(ws);
            subs.add(rouletteId);

            await hydrateFromStore(rouletteId);

            await ensureHistoryLength(rouletteId, limit);

            const history = (inMemoryHistory.get(rouletteId) || []).slice(0, limit);
            ws.send(JSON.stringify(buildHistoryPayload(rouletteId, history)));
            break;
        }

        case 'unsubscribe': {
            const rouletteId = normalizeRouletteId(message.roulette);
            if (!rouletteId) return;
            const subs = ensureSubscriptionEntry(ws);
            subs.delete(rouletteId);
            break;
        }

        case 'get_history': {
            const rouletteId = normalizeRouletteId(message.roulette);
            const limit = Number(message.limit) || DEFAULT_HISTORY_LIMIT;

            if (!rouletteId) {
                ws.send(JSON.stringify({ type: 'error', error: 'Roulette inválida' }));
                return;
            }

            await hydrateFromStore(rouletteId);
            await ensureHistoryLength(rouletteId, limit);

            const history = (inMemoryHistory.get(rouletteId) || []).slice(0, limit);
            ws.send(JSON.stringify(buildHistoryPayload(rouletteId, history)));
            break;
        }

        case 'ping':
            ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
            break;

        default:
            console.log('⚠️ Tipo de mensagem desconhecido:', message.type);
            ws.send(JSON.stringify({ type: 'error', error: `Comando desconhecido: ${message.type}` }));
    }
}

async function ensureHistoryLength(rouletteId, limit) {
    const current = inMemoryHistory.get(rouletteId) || [];

    if (current.length >= limit) {
        return;
    }

    console.log(`📊 Cache tem ${current.length} números, mas precisa de ${limit}. Buscando mais...`);

    // Primeiro: tentar buscar do Supabase (armazenamento persistente)
    const missing = limit - current.length;
    const olderEntries = await fetchOlderFromStore(rouletteId, current.length, missing);
    
    if (olderEntries.length > 0) {
        const merged = [...current, ...olderEntries].slice(0, MAX_CACHE_LENGTH);
        inMemoryHistory.set(rouletteId, merged);
        console.log(`💾 ${olderEntries.length} números carregados do Supabase. Total: ${merged.length}`);
    }

    // Segundo: se ainda não tiver o suficiente, buscar da API Fly.io
    const afterSupabase = inMemoryHistory.get(rouletteId) || [];
    if (afterSupabase.length < limit) {
        console.log(`🚀 Buscando ${limit} números da API Fly.io para ${rouletteId}...`);
        
        try {
            // Usar a API Fly.io para preencher histórico
            const flyApiUrl = process.env.FLY_API_URL || 'https://roulette-history-api.fly.dev';
            const apiNumbers = await fetchFromFlyApi(flyApiUrl, rouletteId, limit);
            
            if (apiNumbers && apiNumbers.length > 0) {
                // Converter números da API para formato interno
                const now = Date.now();
                const entries = apiNumbers.map((num, index) => ({
                    value: num,
                    timestamp: now - (index * 1000)
                }));
                
                inMemoryHistory.set(rouletteId, entries.slice(0, MAX_CACHE_LENGTH));
                console.log(`✅ ${entries.length} números carregados da API Fly.io (apenas memória, sem persistir)`);
                
                // NÃO PERSISTIR dados históricos do Fly.io!
                // O Supabase só deve receber números NOVOS em tempo real
                // Os dados do Fly.io são apenas para consulta imediata
            }
        } catch (error) {
            console.error(`❌ Erro ao buscar histórico da API Fly.io: ${error.message}`);
        }
    }
}

async function fetchFromFlyApi(baseUrl, rouletteId, limit) {
    return new Promise((resolve, reject) => {
        const url = `${baseUrl}/api/history/${encodeURIComponent(rouletteId)}?limit=${limit}`;
        
        https.get(url, (res) => {
            let data = '';

            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    if (json.success && Array.isArray(json.numbers)) {
                        resolve(json.numbers);
                    } else {
                        resolve([]);
                    }
                } catch (err) {
                    console.error(`❌ Erro ao parsear resposta da API Fly.io: ${err.message}`);
                    resolve([]);
                }
            });
        }).on('error', (error) => {
            console.error(`❌ Erro de conexão com API Fly.io: ${error.message}`);
            reject(error);
        });
    });
}

// ============================================
// INICIALIZAÇÃO
// ============================================

initializeFromAPI().then(() => {
    console.log('🚀 Servidor pronto para aceitar conexões');
});

// ============================================
// ENCERRAMENTO GRACIOSO
// ============================================

process.on('SIGINT', () => {
    console.log('\n🛑 Encerrando servidor...');
    wss.close(() => {
        console.log('✅ Servidor encerrado');
        process.exit(0);
    });
});
