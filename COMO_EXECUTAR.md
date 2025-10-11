# 🚀 GUIA DE EXECUÇÃO - ROULETTE ANALYZER

## 📋 **PRÉ-REQUISITOS**

Antes de começar, você precisa ter instalado:

### **1. Node.js (Obrigatório)**
- **Versão mínima**: 18.17 ou superior
- **Download**: https://nodejs.org/
- **Verificar instalação**:
  ```powershell
  node --version
  npm --version
  ```

### **2. Conta Supabase (Obrigatório)**
O projeto usa Supabase para autenticação e banco de dados.

---

## ⚙️ **CONFIGURAÇÃO INICIAL**

### **Passo 1: Configurar o Supabase**

#### **1.1 Criar Projeto no Supabase**
1. Acesse: https://supabase.com
2. Clique em **"Start your project"**
3. Faça login ou crie uma conta
4. Clique em **"New Project"**
5. Preencha:
   - **Name**: Roulette Analyzer (ou qualquer nome)
   - **Database Password**: Crie uma senha forte (anote!)
   - **Region**: Escolha a mais próxima de você
6. Clique em **"Create new project"**
7. Aguarde ~2 minutos (projeto sendo criado)

#### **1.2 Criar Tabela no Banco de Dados**

1. No painel do Supabase, vá em **"SQL Editor"** (menu lateral)
2. Clique em **"New Query"**
3. Cole este SQL:

```sql
-- Criar tabela de sessões de usuário
CREATE TABLE user_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  numbers INTEGER[] NOT NULL DEFAULT '{}',
  selected_strategy INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar índice para melhor performance
CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_updated_at ON user_sessions(updated_at DESC);

-- Habilitar Row Level Security (RLS)
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

-- Política: usuários só veem suas próprias sessões
CREATE POLICY "Users can view own sessions"
  ON user_sessions
  FOR SELECT
  USING (auth.uid() = user_id);

-- Política: usuários só podem inserir suas próprias sessões
CREATE POLICY "Users can insert own sessions"
  ON user_sessions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Política: usuários só podem atualizar suas próprias sessões
CREATE POLICY "Users can update own sessions"
  ON user_sessions
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Política: usuários só podem deletar suas próprias sessões
CREATE POLICY "Users can delete own sessions"
  ON user_sessions
  FOR DELETE
  USING (auth.uid() = user_id);
```

4. Clique em **"Run"** (ou pressione F5)
5. Deve aparecer: **"Success. No rows returned"**

#### **1.3 Obter as Chaves do Projeto**

1. No painel do Supabase, vá em **"Settings"** (⚙️ no menu lateral)
2. Clique em **"API"**
3. Copie estas duas informações:

   - **Project URL**: algo como `https://xxxxxxxxxxxxx.supabase.co`
   - **anon public key**: uma chave longa começando com `eyJ...`

---

### **Passo 2: Configurar Variáveis de Ambiente**

#### **2.1 Criar arquivo `.env.local`**

1. Abra o Visual Studio Code na pasta do projeto
2. Crie um arquivo chamado **`.env.local`** na **raiz do projeto** (mesma pasta do `package.json`)
3. Cole este conteúdo:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=sua_url_aqui
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_chave_aqui
```

4. **Substitua** os valores:
   - `sua_url_aqui` → Cole a **Project URL** que você copiou
   - `sua_chave_aqui` → Cole a **anon public key** que você copiou

**Exemplo de como deve ficar:**
```env
NEXT_PUBLIC_SUPABASE_URL=https://abcdefghijk.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoaWprIiwicm9sZSI6ImFub24iLCJpYXQiOjE2ODk5NTU1NjAsImV4cCI6MjAwNTUzMTU2MH0.xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

---

### **Passo 3: Instalar Dependências**

Abra o PowerShell na pasta do projeto e execute:

```powershell
npm install
```

**O que isso faz:**
- Baixa todas as bibliotecas necessárias (React, Next.js, Supabase, etc.)
- Pode demorar 2-5 minutos dependendo da internet
- Cria uma pasta `node_modules` (não commit isso!)

**Saída esperada:**
```
added 1234 packages in 3m
```

---

## ▶️ **EXECUTAR O PROJETO**

### **Modo Desenvolvimento (Recomendado para testar)**

```powershell
npm run dev
```

**O que acontece:**
- Next.js inicia um servidor local
- Aplicação fica disponível em: http://localhost:3000
- Hot reload ativado (atualiza automaticamente quando editar código)

**Saída esperada:**
```
   ▲ Next.js 15.4.6
   - Local:        http://localhost:3000
   - Environments: .env.local

 ✓ Starting...
 ✓ Ready in 2.3s
```

---

## 🌐 **ACESSAR A APLICAÇÃO**

### **1. Abrir no Navegador**
- Acesse: http://localhost:3000
- Ou clique no link que aparece no terminal (Ctrl + clique)

### **2. Criar sua Conta**
1. Na tela de login, clique em **"Não tem conta? Criar uma nova"**
2. Preencha:
   - **Nome completo**: Seu nome
   - **Email**: Um email válido
   - **Senha**: Mínimo 6 caracteres
3. Clique em **"Criar Conta"**
4. Você será redirecionado para a tela principal

### **3. Usar a Aplicação**

#### **Adicionar Números:**
1. No campo de entrada no topo, digite números de 0 a 36
2. Pode separar por:
   - Vírgula: `5, 12, 18, 22`
   - Espaço: `5 12 18 22`
   - Quebra de linha (cole uma lista)
3. Pressione **Enter** ou clique em **"Adicionar"**
4. Os números aparecem no grid

#### **Visualizar Análise:**
- **Desktop**: Veja o menu lateral com estratégias e painel com métricas
- **Mobile**: Use os botões "Estratégias" e "Métricas"

#### **Cores dos Números:**
- 🟡 **Amarelo**: Número que ativou a estratégia
- 🟢 **Verde**: Acerto (GREEN)
- 🔴 **Vermelho**: Erro (RED)
- ⚪ **Cinza**: Número neutro

#### **Trocar de Estratégia:**
- Clique em uma estratégia diferente no menu lateral
- As cores dos números atualizam automaticamente

#### **Remover Números:**
- Passe o mouse sobre um número
- Clique no ❌ vermelho que aparece

#### **Limpar Tudo:**
- Clique no botão com ícone de lixeira 🗑️

---

## 🛑 **PARAR O SERVIDOR**

No terminal onde o servidor está rodando:
- Pressione **Ctrl + C**
- Confirme com **Y** se pedir

---

## 📦 **COMPILAR PARA PRODUÇÃO**

Se quiser criar uma versão otimizada:

```powershell
# Build
npm run build

# Executar versão de produção
npm start
```

---

## 🐛 **RESOLUÇÃO DE PROBLEMAS**

### **Erro: "Cannot find module"**
**Solução:**
```powershell
# Deletar node_modules e reinstalar
Remove-Item -Recurse -Force node_modules
npm install
```

### **Erro: "Port 3000 already in use"**
**Solução 1** - Parar o processo:
```powershell
# Encontrar processo na porta 3000
netstat -ano | findstr :3000

# Matar processo (substitua XXXX pelo PID)
taskkill /PID XXXX /F
```

**Solução 2** - Usar outra porta:
```powershell
npm run dev -- -p 3001
```

### **Erro: "Supabase URL or Key not found"**
**Solução:**
1. Verifique se o arquivo `.env.local` existe
2. Verifique se as chaves estão corretas
3. **Reinicie o servidor** (Ctrl+C e `npm run dev` novamente)
4. Variáveis de ambiente só são lidas na inicialização!

### **Erro ao fazer login/cadastro**
**Verificar:**
1. URL do Supabase está correta?
2. Tabela `user_sessions` foi criada?
3. RLS (Row Level Security) está configurado?
4. Teste diretamente no Supabase Dashboard → Authentication

### **Números não aparecem após adicionar**
**Verificar:**
1. Abra o Console do navegador (F12)
2. Veja se há erros em vermelho
3. Verifique se o array `numbers` está atualizando (React DevTools)

### **Sessão não salva/carrega**
**Verificar:**
1. Usuário está autenticado? (veja Header com nome)
2. Tabela `user_sessions` existe?
3. Abra Network tab (F12) → veja requisições ao Supabase
4. Verifique políticas RLS no Supabase

---

## 📁 **ESTRUTURA DE ARQUIVOS IMPORTANTES**

```
Roleta/
├── .env.local              ← CRIAR ESTE! (chaves do Supabase)
├── package.json            ← Dependências
├── next.config.ts          ← Configuração Next.js
├── tsconfig.json           ← Configuração TypeScript
├── src/
│   ├── app/
│   │   ├── page.tsx        ← Página principal
│   │   └── layout.tsx      ← Layout raiz
│   ├── components/         ← Componentes React
│   ├── lib/                ← Lógica e utilitários
│   └── hooks/              ← Custom hooks
└── node_modules/           ← NÃO COMMITAR (gerado por npm install)
```

---

## 🔐 **SEGURANÇA**

### **Nunca commitar:**
- ❌ `.env.local` - Contém chaves secretas!
- ❌ `node_modules/` - Muito grande, regenerável
- ✅ `.gitignore` já está configurado para ignorar

### **Se expor as chaves acidentalmente:**
1. Vá no Supabase Dashboard
2. Settings → API
3. Clique em "Reset" nas chaves
4. Atualize `.env.local` com as novas

---

## 📱 **TESTAR EM DISPOSITIVOS MÓVEIS**

### **Na mesma rede WiFi:**

1. Descubra seu IP local:
   ```powershell
   ipconfig
   ```
   Procure por "IPv4 Address" (algo como `192.168.1.100`)

2. No celular/tablet, acesse:
   ```
   http://SEU_IP:3000
   ```
   Exemplo: `http://192.168.1.100:3000`

---

## 🚀 **DEPLOY (PUBLICAR NA INTERNET)**

### **Opção 1: Vercel (Recomendado - Grátis)**

1. Acesse: https://vercel.com
2. Faça login com GitHub
3. Clique em **"Add New Project"**
4. Importe seu repositório
5. Configure as variáveis de ambiente:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
6. Clique em **"Deploy"**
7. Aguarde 2-3 minutos
8. Acesse a URL fornecida (algo como `seu-projeto.vercel.app`)

### **Opção 2: Netlify**

Similar à Vercel:
1. https://netlify.com
2. Import from Git
3. Configure env vars
4. Deploy

---

## 📚 **COMANDOS ÚTEIS**

```powershell
# Instalar dependências
npm install

# Rodar em desenvolvimento
npm run dev

# Build para produção
npm run build

# Rodar versão de produção
npm start

# Verificar erros de lint
npm run lint

# Limpar cache e reinstalar
Remove-Item -Recurse -Force node_modules
Remove-Item -Recurse -Force .next
npm install
```

---

## 🆘 **PRECISA DE AJUDA?**

### **Documentação Oficial:**
- **Next.js**: https://nextjs.org/docs
- **Supabase**: https://supabase.com/docs
- **React**: https://react.dev

### **Comunidades:**
- Discord do Next.js
- Discord do Supabase
- Stack Overflow

---

## ❓ **PERGUNTAS FREQUENTES**

### **P: Preciso fazer login toda vez que recarrego a página?**
**R:** NÃO! O sistema está configurado para manter você logado por **7 dias**. Suas credenciais são salvas de forma segura no navegador. Você só precisará fazer login novamente se:
- Fizer logout manualmente
- Limpar os dados do navegador
- Não usar o app por mais de 7 dias

### **P: Como funciona a persistência da sessão?**
**R:** O Supabase salva seus tokens de autenticação no `localStorage` do navegador. Isso significa:
- ✅ Pode fechar o navegador e voltar depois - continuará logado
- ✅ Pode recarregar a página - continuará logado
- ✅ Token de acesso renova automaticamente a cada hora
- ✅ Sessão expira apenas após 7 dias de inatividade

### **P: É seguro salvar dados no localStorage?**
**R:** SIM! O sistema salva apenas **tokens JWT assinados criptograficamente**, nunca sua senha. Os tokens:
- Expiram automaticamente (1 hora para access token, 7 dias para refresh token)
- São validados no servidor a cada requisição
- Não podem ser falsificados
- Suas senhas nunca são armazenadas localmente

### **P: Posso usar em múltiplos dispositivos?**
**R:** SIM! Você pode fazer login no celular, tablet e computador simultaneamente. Cada dispositivo terá sua própria sessão independente.

### **P: E se eu limpar os dados do navegador?**
**R:** Se você limpar cookies/localStorage, precisará fazer login novamente, mas seus dados (números, estratégias) estarão salvos no banco de dados do Supabase e serão restaurados automaticamente após o login.

---

## ✅ **CHECKLIST RÁPIDO**

Antes de rodar o projeto, verifique:

- [ ] Node.js instalado (v18.17+)
- [ ] Projeto Supabase criado
- [ ] Tabela `user_sessions` criada no banco
- [ ] Arquivo `.env.local` criado na raiz
- [ ] Chaves do Supabase copiadas no `.env.local`
- [ ] `npm install` executado com sucesso
- [ ] `npm run dev` rodando sem erros
- [ ] http://localhost:3000 abrindo no navegador
- [ ] Consegue criar conta e fazer login
- [ ] **Recarregar página (F5) mantém usuário logado** ✅

---

**Boa sorte! 🎲🎰**

Se tudo funcionou, você está pronto para analisar estratégias de roleta! 🚀

**🔐 Observação sobre Segurança**: Suas sessões são gerenciadas com segurança pelo Supabase. Você ficará logado por 7 dias automaticamente!
