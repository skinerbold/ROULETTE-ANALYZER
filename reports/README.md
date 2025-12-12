# 📊 Relatórios Diários - Roulette Analyzer

Esta pasta contém os relatórios diários gerados automaticamente pelo sistema.

## 📁 Estrutura dos Arquivos

Os relatórios são salvos no formato:
```
relatorio-YYYY-MM-DD.md
```

Exemplo: `relatorio-2025-12-11.md`

## 🤖 Geração Automática

Os relatórios são gerados automaticamente:
- **Quando:** Todo dia à meia-noite (00:00 UTC)
- **Como:** Via Vercel Cron Jobs
- **Análise:** Powered by OpenAI GPT-4o
- **Fonte de Dados:** Tabela `roulette_history` do Supabase (dados já existentes)

## 📋 Conteúdo dos Relatórios

Cada relatório inclui:

1. **Resumo Executivo** - Principais descobertas do dia
2. **Análise por Estratégia** - Desempenho de cada estratégia
3. **Análise por Período** - Melhores horários para cada estratégia
4. **Análise por Roleta** - Números frequentes e estratégias recomendadas
5. **Ranking** - Top 10 melhores e piores estratégias
6. **Padrões** - Sequências e correlações identificadas
7. **Sugestões** - Mínimo 10 novas estratégias sugeridas pela IA
8. **Conclusões** - Recomendações para o próximo dia

## 🚀 Gerar Relatório Manualmente

### Via API
```bash
# Relatório de ontem (padrão)
curl http://localhost:3000/api/daily-report

# Relatório de data específica
curl http://localhost:3000/api/daily-report?date=2025-12-10
```

### Via Script
```bash
# Relatório de ontem
npx ts-node scripts/generate-daily-report.ts

# Relatório de data específica
npx ts-node scripts/generate-daily-report.ts 2025-12-10
```

## ⚙️ Configuração Necessária

1. Configure as variáveis de ambiente em `.env.local`:
   ```
   OPENAI_API_KEY=sk-sua-chave-aqui
   SUPABASE_SERVICE_ROLE_KEY=sua-chave-service-role
   CRON_SECRET=seu-secret-seguro
   ```

2. Execute o script SQL no Supabase:
   ```
   database/create-reports-tables-simple.sql
   ```
   
   **Observação:** O sistema usa a tabela `roulette_history` existente. O SQL cria apenas as tabelas de relatórios: `daily_reports`, `ai_strategy_suggestions`, `report_execution_logs`.

## 📈 Banco de Dados

Os relatórios também são salvos no Supabase na tabela `daily_reports`:
- `report_date` - Data do relatório
- `content` - Conteúdo em Markdown
- `total_lancamentos` - Quantidade de lançamentos analisados
- `total_estrategias` - Quantidade de estratégias analisadas

## ❗ Importante

- Os relatórios são gerados para **análise do programador**
- Não modificam nenhum código ou configuração
- Servem como base para tomada de decisões e melhorias
