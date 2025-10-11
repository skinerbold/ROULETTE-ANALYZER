# 🎲 Roulette Analyzer

Sistema profissional de análise de estratégias de roleta com **318 estratégias** integradas.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/skinerbold/ROULETTE-ANALYZER)

---

## 🚀 **Deploy Rápido (1 Clique)**

1. Clique no botão "Deploy with Vercel" acima
2. Conecte sua conta GitHub
3. Configure as variáveis de ambiente (veja abaixo)
4. Aguarde o deploy (2-5 minutos)
5. Pronto! Seu app está no ar 🎉

---

## ✨ **Funcionalidades**

- ✅ **318 Estratégias Pré-configuradas**
  - 12 pastas na categoria "Até 9 fichas" (223 estratégias)
  - 6 pastas na categoria "Mais de 9 fichas" (95 estratégias)
- ✅ **Análise em Tempo Real**
  - Identificação automática de GREEN, RED e ativações
  - Cálculo de profit individual por estratégia
  - Ranking automático (melhor → pior)
- ✅ **Multi-seleção de Estratégias**
  - Selecione quantas estratégias quiser
  - Compare o desempenho lado a lado
  - Botão "Selecionar todas" por pasta
- ✅ **Sistema de Autenticação**
  - Login/Cadastro com Supabase
  - Sessão persistente (7 dias)
  - Dados salvos por usuário
- ✅ **Interface Responsiva**
  - Desktop: 3 painéis (estratégias, números, análise)
  - Mobile: Menu adaptativo
  - Dark mode elegante

---

## 🛠️ **Tecnologias**

- **Framework**: Next.js 15.4.6 (App Router)
- **UI**: React 19.1.0 + TypeScript 5
- **Styling**: Tailwind CSS 4
- **Componentes**: shadcn/ui (35+ componentes)
- **Backend**: Supabase (Auth + PostgreSQL)
- **Deploy**: Vercel (grátis)

---

## 📋 **Pré-requisitos**

- Node.js 18.17 ou superior
- Conta no Supabase (grátis)
- Conta na Vercel (grátis) ou GitHub

---

## ⚙️ **Configuração Local**

### **1. Clone o repositório**

```bash
git clone https://github.com/skinerbold/ROULETTE-ANALYZER.git
cd ROULETTE-ANALYZER
```

### **2. Instale as dependências**

```bash
npm install
```

### **3. Configure o Supabase**

1. Crie uma conta em [Supabase](https://supabase.com)
2. Crie um novo projeto
3. Execute o SQL abaixo no SQL Editor:

```sql
-- Criar tabela de sessões
CREATE TABLE user_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  numbers INTEGER[] NOT NULL DEFAULT '{}',
  chip_category TEXT DEFAULT 'up-to-9',
  selected_strategies INTEGER[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_updated_at ON user_sessions(updated_at DESC);

-- Row Level Security
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own sessions"
  ON user_sessions FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sessions"
  ON user_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sessions"
  ON user_sessions FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own sessions"
  ON user_sessions FOR DELETE USING (auth.uid() = user_id);
```

### **4. Configure as variáveis de ambiente**

Copie o arquivo de exemplo:

```bash
cp .env.example .env.local
```

Edite `.env.local` e adicione suas credenciais do Supabase:

```env
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-chave-anon-aqui
```

**📝 Onde pegar essas informações:**
- Supabase Dashboard → Settings → API
- Project URL → `NEXT_PUBLIC_SUPABASE_URL`
- anon public key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### **5. Execute o projeto**

```bash
npm run dev
```

Acesse: http://localhost:3000

---

## 🌐 **Deploy na Vercel**

### **Método 1: Via GitHub (Automático)**

1. Faça push do código para seu repositório GitHub
2. Acesse [Vercel](https://vercel.com)
3. Clique em "Import Project"
4. Selecione seu repositório
5. Configure as variáveis de ambiente:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
6. Clique em "Deploy"

### **Método 2: Via CLI**

```bash
# Instalar Vercel CLI
npm i -g vercel

# Fazer login
vercel login

# Deploy
vercel

# Deploy para produção
vercel --prod
```

**📖 Guia completo**: Veja [DEPLOY.md](./DEPLOY.md)

---

## 📚 **Estrutura do Projeto**

```
ROULETTE-ANALYZER/
├── src/
│   ├── app/
│   │   ├── page.tsx          # Página principal
│   │   ├── layout.tsx        # Layout raiz
│   │   └── globals.css       # Estilos globais
│   ├── components/
│   │   ├── AuthForm.tsx      # Login/Cadastro
│   │   ├── Header.tsx        # Cabeçalho
│   │   ├── ProfileEdit.tsx   # Edição de perfil
│   │   └── ui/               # 35+ componentes shadcn/ui
│   ├── lib/
│   │   ├── strategies.ts     # 318 estratégias
│   │   ├── analyzer.ts       # Lógica de análise
│   │   ├── supabase.ts       # Cliente Supabase
│   │   └── types.ts          # TypeScript types
│   └── hooks/
│       ├── use-mobile.ts     # Detecção mobile
│       └── use-toast.ts      # Sistema de toasts
├── public/
├── .env.example              # Exemplo de variáveis
├── .gitignore
├── package.json
├── DEPLOY.md                 # Guia completo de deploy
└── README.md                 # Este arquivo
```

---

## 🎯 **Como Usar**

### **1. Criar Conta**

- Acesse o app
- Clique em "Criar uma nova conta"
- Preencha email, senha e nome
- Faça login

### **2. Selecionar Estratégias**

- Escolha a categoria: "Até 9 fichas" ou "Mais de 9 fichas"
- Expanda as pastas de estratégias
- Marque as estratégias que deseja analisar
- Ou clique em "Selecionar todas" em uma pasta

### **3. Adicionar Números**

- Digite os números sorteados (0-36)
- Separe por vírgula, espaço ou linha
- Pressione Enter ou clique em "Adicionar"

### **4. Visualizar Análise**

- **Cores dos números**:
  - 🟡 Amarelo: Ativou a estratégia
  - 🟢 Verde: GREEN (acerto)
  - 🔴 Vermelho: RED (erro)
  - ⚪ Cinza: Neutro
- **Painel de métricas**:
  - Profit individual por estratégia
  - Total de GREEN e RED
  - Número de ativações
  - Ranking automático

---

## 📊 **Estratégias Disponíveis**

### **Até 9 Fichas (223 estratégias)**

1. **Cores Altos e Baixos** - 4 estratégias
2. **Cores Dúzia** - 6 estratégias
3. **Cores Coluna** - 7 estratégias
4. **Cores Setores** - 8 estratégias
5. **Cores Cavalos** - 6 estratégias
6. **Terminais Unidos** - 46 estratégias
7. **Terminal Seco** - 10 estratégias
8. **Todos com 4 Vizinhos** - 37 estratégias
9. **Vizinhos Aleatórios** - 13 estratégias
10. **Números Aleatórios** - 46 estratégias
11. **Todos com 2 Vizinhos** - 37 estratégias
12. **Combinações de Terminais Cruzados** - 3 estratégias

### **Mais de 9 Fichas (95 estratégias)**

1. **Números em lugares aleatórios** - 13 estratégias
2. **Cavalo, Coluna, Dúzia** - 13 estratégias
3. **Terminal Iniciante** - 3 estratégias
4. **SETORES** - 6 estratégias
5. **Jogadas nos Vizinhos** - 27 estratégias
6. **Números que se Puxam** - 37 estratégias

---

## 🔒 **Segurança**

- ✅ Autenticação via Supabase (JWT tokens)
- ✅ Row Level Security (RLS) no banco de dados
- ✅ Tokens auto-renovados (sessão de 7 dias)
- ✅ HTTPS automático na Vercel
- ✅ Variáveis de ambiente protegidas
- ✅ Senhas NUNCA armazenadas localmente

---

## 🐛 **Solução de Problemas**

### **Build falha na Vercel**
- Verifique se as variáveis de ambiente estão corretas
- Teste o build localmente: `npm run build`
- Veja os logs completos na Vercel

### **Não consegue fazer login**
- Verifique URL do Supabase
- Configure Site URL no Supabase: `https://seu-app.vercel.app`
- Verifique Redirect URLs

### **Sessão não persiste**
- Limpe o cache do navegador
- Verifique localStorage (DevTools → Application)
- Certifique-se que está em HTTPS

**📖 Mais soluções**: Veja [DEPLOY.md](./DEPLOY.md#-solução-de-problemas)

---

## 📝 **Licença**

Este projeto está sob a licença MIT. Veja o arquivo `LICENSE` para mais detalhes.

---

## 🤝 **Contribuindo**

Contribuições são bem-vindas! Para contribuir:

1. Faça um Fork do projeto
2. Crie uma branch para sua feature (`git checkout -b feature/MinhaFeature`)
3. Commit suas mudanças (`git commit -m 'Add: Nova funcionalidade'`)
4. Push para a branch (`git push origin feature/MinhaFeature`)
5. Abra um Pull Request

---

## 📞 **Contato**

- **GitHub**: [@skinerbold](https://github.com/skinerbold)
- **Repositório**: [ROULETTE-ANALYZER](https://github.com/skinerbold/ROULETTE-ANALYZER)

---

## 🎉 **Agradecimentos**

- [Next.js](https://nextjs.org) - Framework React
- [Supabase](https://supabase.com) - Backend as a Service
- [Vercel](https://vercel.com) - Plataforma de deploy
- [shadcn/ui](https://ui.shadcn.com) - Componentes UI
- [Tailwind CSS](https://tailwindcss.com) - Framework CSS

---

## 📈 **Status do Projeto**

- ✅ **Versão**: 1.0.0
- ✅ **Status**: Produção
- ✅ **Estratégias**: 318
- ✅ **Última atualização**: 11 de outubro de 2025

---

**Feito com ❤️ para análise profissional de estratégias de roleta** 🎲

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/skinerbold/ROULETTE-ANALYZER)
