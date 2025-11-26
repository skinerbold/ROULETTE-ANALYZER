# 🗄️ Database - Roulette History System

## Estrutura do Banco de Dados

Este diretório contém todos os scripts SQL para criar e gerenciar o sistema de histórico de roletas.

## 📋 Scripts de Migração

Execute os scripts na seguinte ordem:

### 1. `001_create_roulette_history.sql`
Cria a tabela principal que armazena os últimos 500 números de cada roleta.

**Campos:**
- `id` - Chave primária autoincrementada
- `roulette_id` - Identificador da roleta
- `number` - Número sorteado (0-36)
- `timestamp` - Data/hora do sorteio
- `position` - Posição na fila (1 = mais recente, 500 = mais antigo)

**Índices:**
- `idx_roulette_history_roulette_id` - Busca por roleta
- `idx_roulette_history_position` - Consultas ordenadas
- `idx_roulette_history_timestamp` - Consultas por data

### 2. `002_create_roulette_metadata.sql`
Cria tabela de metadados com estatísticas de cada roleta.

**Campos:**
- `roulette_id` - Chave primária
- `last_number` - Último número sorteado
- `last_update` - Última atualização
- `total_spins` - Total de giros monitorados
- `history_count` - Quantidade de registros no histórico

### 3. `003_create_update_function.sql`
Cria a função PL/pgSQL `update_roulette_history` que:
1. Remove o registro da posição 500
2. Incrementa todas as posições (`position = position + 1`)
3. Insere o novo número na posição 1
4. Atualiza os metadados

### 4. `004_test_queries.sql`
Queries de teste e validação do sistema.

## 🚀 Como Executar no Supabase

### Opção 1: Via Dashboard (Recomendado)

1. Acesse seu projeto no Supabase
2. Vá em **SQL Editor**
3. Crie uma nova query
4. Cole e execute cada script na ordem (001 → 002 → 003)
5. Execute `004_test_queries.sql` para validar

### Opção 2: Via CLI

```bash
# Instalar Supabase CLI
npm install -g supabase

# Login
supabase login

# Link ao projeto
supabase link --project-ref your-project-ref

# Executar migrations
supabase db push
```

### Opção 3: Via Script Node.js

```javascript
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

async function runMigration(filename) {
  const sql = fs.readFileSync(`./database/${filename}`, 'utf-8')
  const { data, error } = await supabase.rpc('exec_sql', { sql })
  if (error) console.error(`Erro em ${filename}:`, error)
  else console.log(`✓ ${filename} executado com sucesso`)
}

await runMigration('001_create_roulette_history.sql')
await runMigration('002_create_roulette_metadata.sql')
await runMigration('003_create_update_function.sql')
```

## 📊 Exemplos de Uso

### Inserir um novo número
```sql
SELECT * FROM update_roulette_history('pragmatic-speed-auto-roulette', 17);
```

### Consultar últimos 100 números
```sql
SELECT number, timestamp, position
FROM roulette_history
WHERE roulette_id = 'pragmatic-speed-auto-roulette'
ORDER BY position ASC
LIMIT 100;
```

### Ver estatísticas da roleta
```sql
SELECT * FROM roulette_metadata 
WHERE roulette_id = 'pragmatic-speed-auto-roulette';
```

## 🔒 Políticas RLS (Row Level Security)

Por padrão, as tabelas serão acessadas via **Service Role Key** no worker.
Para acesso público via API, configure RLS:

```sql
-- Habilitar RLS
ALTER TABLE roulette_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE roulette_metadata ENABLE ROW LEVEL SECURITY;

-- Permitir leitura pública
CREATE POLICY "Allow public read access" ON roulette_history
FOR SELECT USING (true);

CREATE POLICY "Allow public read access" ON roulette_metadata
FOR SELECT USING (true);

-- Apenas service role pode escrever
CREATE POLICY "Only service role can write" ON roulette_history
FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Only service role can write" ON roulette_metadata
FOR ALL USING (auth.role() = 'service_role');
```

## 🧪 Testes de Performance

```sql
-- Testar performance de insert
EXPLAIN ANALYZE
SELECT * FROM update_roulette_history('test-roulette', 17);

-- Testar performance de query
EXPLAIN ANALYZE
SELECT number FROM roulette_history 
WHERE roulette_id = 'test-roulette' 
ORDER BY position ASC 
LIMIT 500;
```

## 📈 Monitoramento

### Verificar tamanho da tabela
```sql
SELECT pg_size_pretty(pg_total_relation_size('roulette_history'));
```

### Verificar uso de índices
```sql
SELECT 
  schemaname, tablename, indexname, idx_scan, idx_tup_read
FROM pg_stat_user_indexes
WHERE tablename = 'roulette_history';
```

### Estatísticas por roleta
```sql
SELECT 
  roulette_id,
  COUNT(*) as records,
  MAX(timestamp) as last_update,
  MIN(timestamp) as oldest_record
FROM roulette_history
GROUP BY roulette_id;
```

## 🔧 Manutenção

### Limpar histórico de uma roleta
```sql
DELETE FROM roulette_history WHERE roulette_id = 'roulette-id';
DELETE FROM roulette_metadata WHERE roulette_id = 'roulette-id';
```

### Reindexar tabelas (se necessário)
```sql
REINDEX TABLE roulette_history;
REINDEX TABLE roulette_metadata;
```

### Vacuum (limpeza)
```sql
VACUUM ANALYZE roulette_history;
VACUUM ANALYZE roulette_metadata;
```

## ⚠️ Considerações Importantes

1. **Atomicidade**: A função `update_roulette_history` roda em uma transação automática
2. **Performance**: Com índices otimizados, queries < 10ms
3. **Limite**: Máximo 500 registros por roleta (hard limit)
4. **Concorrência**: Suporta múltiplas atualizações simultâneas
5. **Backup**: Configure backup automático no Supabase

## 📚 Próximos Passos

Após executar os scripts:
1. ✅ Validar com `004_test_queries.sql`
2. ➡️ Implementar Worker (Fase 2)
3. ➡️ Implementar API (Fase 3)
4. ➡️ Integrar com Front-end (Fase 4)
