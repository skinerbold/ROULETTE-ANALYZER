// ============================================
// CONFIGURAÇÃO DA API DE ROLETAS - OBRIGATÓRIA
// ============================================
// 
// ⚠️ ATENÇÃO: Este servidor REQUER uma API real configurada.
// NÃO HÁ SIMULAÇÃO de dados. O servidor não funcionará sem API válida.
//
// INSTRUÇÕES:
// 1. Copy-Item api-config.example.js api-config.js
// 2. Edite api-config.js com suas credenciais REAIS
// 3. Configure enabled: true
// 4. Reinicie o servidor: node websocket-server.js
// 5. Se a API falhar, o servidor será encerrado automaticamente
//

module.exports = {
  // ⚠️ DEVE ser true para o servidor funcionar (não há fallback simulado)
  enabled: false, // ALTERE PARA true APÓS CONFIGURAR CORRETAMENTE
  
  // URL base da sua API
  baseUrl: 'https://sua-api.exemplo.com',
  
  // Endpoints da API
  endpoints: {
    // Endpoint para listar todas as roletas disponíveis
    // Resposta esperada: Array de roletas
    // Exemplo: ["Roleta 1", "Roleta 2"] ou [{ name: "Roleta 1" }, { name: "Roleta 2" }]
    roulettes: '/api/roulettes',
    
    // Endpoint para obter histórico de uma roleta específica
    // {id} será substituído pelo nome/ID da roleta
    // Resposta esperada: Array de números (0-36)
    // Exemplo: [17, 23, 0, 5, 12, ...]
    history: '/api/roulettes/{id}/history?limit=500',
    
    // (Opcional) Endpoint para receber novos números em tempo real
    // Se não disponível, o servidor simulará números
    realtime: '/api/roulettes/{id}/stream'
  },
  
  // Headers HTTP para autenticação e outras configurações
  headers: {
    'Content-Type': 'application/json',
    // Descomente e configure se sua API precisa de autenticação:
    // 'Authorization': 'Bearer SEU_TOKEN_AQUI',
    // 'API-Key': 'SUA_CHAVE_AQUI',
    // 'X-Custom-Header': 'valor'
  },
  
  // Função para parsear a resposta da lista de roletas
  // Ajuste de acordo com o formato da sua API
  parseRoulettesResponse: (response) => {
    // Exemplo 1: API retorna array direto
    // return response;
    
    // Exemplo 2: API retorna { data: [...] }
    // return response.data;
    
    // Exemplo 3: API retorna array de objetos com propriedade "name"
    // return response.map(r => r.name);
    
    // Exemplo 4: API retorna { roulettes: [{ id, name }] }
    // return response.roulettes.map(r => r.name);
    
    return Array.isArray(response) ? response : response.data || [];
  },
  
  // Função para parsear a resposta do histórico
  // Ajuste de acordo com o formato da sua API
  parseHistoryResponse: (response) => {
    // Exemplo 1: API retorna array direto de números
    // return response;
    
    // Exemplo 2: API retorna { numbers: [...] }
    // return response.numbers;
    
    // Exemplo 3: API retorna { data: { history: [...] } }
    // return response.data.history;
    
    // Exemplo 4: API retorna array de objetos { number, timestamp }
    // return response.map(r => r.number);
    
    return Array.isArray(response) ? response : response.data || response.numbers || [];
  },
  
  // Timeout para requisições (ms)
  timeout: 10000,
  
  // Intervalo para polling de novos números (ms)
  // Usado se a API não tiver streaming em tempo real
  pollingInterval: 5000,
  
  // Logs detalhados (útil para debug)
  verbose: true
};
