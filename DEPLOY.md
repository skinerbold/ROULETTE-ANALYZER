# 🚀 GUIA COMPLETO DE DEPLOY - ROULETTE ANALYZER
## Deploy Gratuito na Vercel

---

## 📋 **PRÉ-REQUISITOS**

Antes de começar, você precisa ter:

- [x] Conta no GitHub (já tem: https://github.com/skinerbold)
- [x] Projeto Supabase configurado
- [ ] Conta na Vercel (vamos criar)

---

## 🎯 **PASSO A PASSO COMPLETO**

### **PARTE 1: Preparar o Repositório GitHub**

#### **1.1 Inicializar Git Local (se ainda não fez)**

Abra o PowerShell na pasta do projeto e execute:

```powershell
# Entrar na pasta do projeto
cd "C:\Users\ASUS\Desktop\Projetos Prog\Roleta\Roleta"

# Inicializar Git
git init

# Verificar status
git status
```

---

#### **1.2 Adicionar Arquivos ao Git**

```powershell
# Adicionar todos os arquivos (exceto os do .gitignore)
git add .

# Verificar o que será commitado
git status

# Criar primeiro commit
git commit -m "Initial commit: Roulette Analyzer with 318 strategies"
```

---

#### **1.3 Conectar ao Repositório GitHub**

```powershell
# Adicionar remote (seu repositório)
git remote add origin https://github.com/skinerbold/ROULETTE-ANALYZER.git

# Verificar se conectou
git remote -v

# Enviar para GitHub (primeira vez)
git push -u origin main
```

**⚠️ Se der erro "main doesn't exist", tente:**
```powershell
# Renomear branch para main
git branch -M main

# Tentar push novamente
git push -u origin main
```

**⚠️ Se pedir autenticação:**
- Use seu **Personal Access Token** em vez de senha
- Crie em: https://github.com/settings/tokens
- Permissões necessárias: `repo` (full control)

---

### **PARTE 2: Preparar Variáveis de Ambiente**

#### **2.1 Criar arquivo com variáveis de exemplo**

Já criamos o arquivo `.env.example` para você copiar no deploy.

**⚠️ IMPORTANTE**: O arquivo `.env.local` **NÃO vai para o GitHub** (está no `.gitignore`).  
Você vai configurar as variáveis diretamente na Vercel.

---

### **PARTE 3: Deploy na Vercel (GRÁTIS)**

#### **3.1 Criar Conta na Vercel**

1. Acesse: https://vercel.com
2. Clique em **"Sign Up"**
3. Escolha **"Continue with GitHub"**
4. Autorize a Vercel a acessar seus repositórios

---

#### **3.2 Importar Projeto**

1. No dashboard da Vercel, clique em **"Add New..."** → **"Project"**
2. Você verá a lista dos seus repositórios GitHub
3. Encontre **`ROULETTE-ANALYZER`**
4. Clique em **"Import"**

---

#### **3.3 Configurar Projeto**

Na tela de configuração:

**1. Framework Preset:**
- ✅ Deve detectar automaticamente: **Next.js**
- Se não detectar, selecione manualmente

**2. Root Directory:**
- ✅ Deixe como: `.` (raiz do projeto)

**3. Build and Output Settings:**
- ✅ Build Command: `npm run build` (já preenchido)
- ✅ Output Directory: `.next` (já preenchido)
- ✅ Install Command: `npm install` (já preenchido)

**4. Environment Variables (IMPORTANTE!):**

Clique em **"Environment Variables"** e adicione:

| Name | Value |
|------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | Cole sua URL do Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Cole sua chave anon do Supabase |

**📝 Como pegar essas informações:**
1. Vá no Supabase Dashboard: https://supabase.com/dashboard
2. Selecione seu projeto
3. Vá em **Settings** → **API**
4. Copie:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

---

#### **3.4 Fazer Deploy**

1. Depois de adicionar as variáveis de ambiente, clique em **"Deploy"**
2. Aguarde 2-5 minutos (a Vercel vai:
   - Instalar dependências
   - Compilar o projeto
   - Fazer deploy)
3. Você verá um log em tempo real do processo

---

#### **3.5 Deploy Concluído! 🎉**

Quando terminar, você verá:

- ✅ **Status**: Ready
- 🌐 **URL do seu app**: `https://roulette-analyzer.vercel.app` (ou similar)
- 🎯 **Domains**: Você pode customizar depois

---

### **PARTE 4: Testar o Deploy**

#### **4.1 Acessar o App**

1. Clique na URL fornecida pela Vercel
2. Ou acesse: `https://roulette-analyzer-[seu-usuario].vercel.app`

#### **4.2 Verificar Funcionalidades**

- [ ] Página carrega sem erros
- [ ] Consegue criar conta
- [ ] Consegue fazer login
- [ ] Consegue adicionar números
- [ ] Estratégias aparecem
- [ ] Análise funciona
- [ ] Sessão persiste após recarregar

---

### **PARTE 5: Configurações Adicionais (Opcional)**

#### **5.1 Domínio Customizado**

**Grátis com Vercel:**
- Seu app já vem com: `roulette-analyzer-[usuario].vercel.app`

**Domínio próprio (opcional):**
1. Na Vercel, vá em **Settings** → **Domains**
2. Adicione seu domínio (ex: `meuapp.com`)
3. Configure DNS conforme instruções

---

#### **5.2 Configurar CORS no Supabase**

Se tiver problemas de CORS:

1. Supabase Dashboard → **Settings** → **API**
2. Role até **CORS Configuration**
3. Adicione sua URL da Vercel:
   ```
   https://roulette-analyzer-[seu-usuario].vercel.app
   ```

---

#### **5.3 Configurar Autenticação por Email**

No Supabase, para produção:

1. **Authentication** → **Settings**
2. **Site URL**: `https://roulette-analyzer-[seu-usuario].vercel.app`
3. **Redirect URLs**: Adicione:
   ```
   https://roulette-analyzer-[seu-usuario].vercel.app/**
   ```

---

### **PARTE 6: Atualizações Futuras**

#### **6.1 Como Atualizar o App**

Sempre que você fizer mudanças:

```powershell
# Adicionar mudanças
git add .

# Commit
git commit -m "Descrição das mudanças"

# Enviar para GitHub
git push
```

**✨ AUTOMÁTICO**: A Vercel detecta o push e faz deploy automaticamente!

---

#### **6.2 Ver Logs de Deploy**

1. Acesse: https://vercel.com/dashboard
2. Clique no seu projeto
3. Vá em **Deployments**
4. Clique em qualquer deploy para ver logs

---

#### **6.3 Rollback (Voltar Versão Anterior)**

Se algo der errado:

1. Vercel Dashboard → **Deployments**
2. Encontre o deploy anterior que funcionava
3. Clique nos **3 pontinhos** → **Promote to Production**

---

## 🆓 **PLANO GRÁTIS DA VERCEL**

O que você tem de GRAÇA:

- ✅ **100 GB de Bandwidth/mês**
- ✅ **Deploy ilimitados**
- ✅ **Domínio .vercel.app gratuito**
- ✅ **HTTPS automático**
- ✅ **CDN global**
- ✅ **Rollback ilimitado**
- ✅ **Logs de deploy**
- ✅ **Integração com GitHub**
- ✅ **Deploy automático**

**Limites:**
- 🚫 Máximo de 100 GB/mês de bandwidth
- 🚫 Máximo de 100 GB/mês de serverless execution
- 🚫 Builds podem levar um pouco mais de tempo

**Para este projeto, o plano grátis é MAIS que suficiente!** 🎉

---

## 🐛 **SOLUÇÃO DE PROBLEMAS**

### **Erro: "Build failed"**

**Verificar:**
1. Variáveis de ambiente estão corretas?
2. Projeto compila localmente? (`npm run build`)
3. Ver logs do build na Vercel

**Solução:**
```powershell
# Testar build localmente
npm run build

# Se funcionar, problema está nas variáveis de ambiente da Vercel
```

---

### **Erro: "Cannot connect to Supabase"**

**Verificar:**
1. URLs do Supabase estão corretas?
2. CORS configurado?
3. Site URL configurado no Supabase?

**Solução:**
1. Vercel Dashboard → Settings → Environment Variables
2. Verificar se `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` estão corretas
3. **Redeploy** depois de corrigir

---

### **Erro: "Authentication not working"**

**Verificar:**
1. Site URL no Supabase aponta para URL da Vercel?
2. Redirect URLs configuradas?

**Solução:**
1. Supabase → Authentication → Settings
2. Site URL: `https://seu-app.vercel.app`
3. Redirect URLs: `https://seu-app.vercel.app/**`

---

### **Erro: Git push rejected**

**Causa:** Branch protegida ou conflito

**Solução:**
```powershell
# Ver status
git status

# Pull primeiro (se já existe conteúdo no GitHub)
git pull origin main --rebase

# Resolver conflitos (se houver)

# Push novamente
git push origin main
```

---

## 📱 **ALTERNATIVAS DE DEPLOY GRATUITO**

Se preferir outras plataformas:

### **1. Netlify (Similar à Vercel)**
- URL: https://netlify.com
- Processo similar
- Também grátis com bons limites

### **2. Railway**
- URL: https://railway.app
- Ótimo para apps full-stack
- $5 grátis/mês

### **3. Render**
- URL: https://render.com
- Free tier disponível
- Boa para apps com banco de dados

**Recomendação: Use Vercel** (melhor para Next.js)

---

## ✅ **CHECKLIST FINAL**

Antes de fazer deploy, verificar:

- [ ] Código funciona localmente (`npm run dev`)
- [ ] Build funciona localmente (`npm run build`)
- [ ] Arquivo `.env.local` NÃO está no Git
- [ ] `.gitignore` configurado corretamente
- [ ] Projeto commitado no Git
- [ ] Projeto enviado para GitHub
- [ ] Conta na Vercel criada
- [ ] Variáveis de ambiente configuradas na Vercel
- [ ] Deploy realizado com sucesso
- [ ] App acessível pela URL da Vercel
- [ ] Autenticação funcionando
- [ ] Análise de estratégias funcionando

---

## 🎓 **COMANDOS ÚTEIS**

```powershell
# Ver status do Git
git status

# Ver histórico de commits
git log --oneline

# Ver remotes
git remote -v

# Criar nova branch
git checkout -b nome-da-branch

# Voltar para main
git checkout main

# Desfazer último commit (mantém arquivos)
git reset --soft HEAD~1

# Ver diferenças
git diff

# Limpar cache do Git
git rm -r --cached .
git add .
git commit -m "Fix .gitignore"
```

---

## 📚 **RECURSOS ÚTEIS**

- **Vercel Docs**: https://vercel.com/docs
- **Next.js Deploy**: https://nextjs.org/docs/deployment
- **Supabase Docs**: https://supabase.com/docs
- **Git Docs**: https://git-scm.com/doc

---

## 🆘 **PRECISA DE AJUDA?**

Se encontrar problemas:

1. **Logs da Vercel**: Ver o que deu errado no build
2. **Console do navegador**: Ver erros de runtime
3. **Supabase Logs**: Ver erros de autenticação/banco
4. **GitHub Issues**: Perguntar na comunidade

---

## 🎉 **PARABÉNS!**

Se seguiu todos os passos, seu Roulette Analyzer está:

- ✅ No ar e acessível pela internet
- ✅ Com HTTPS seguro
- ✅ Deploy automático a cada push
- ✅ Totalmente GRATUITO
- ✅ Com 318 estratégias funcionando
- ✅ Pronto para ser usado por qualquer pessoa!

**🌐 Compartilhe sua URL com o mundo!** 🚀

---

**Última atualização**: 11 de outubro de 2025  
**Versão do sistema**: 1.0.0  
**Total de estratégias**: 318  
**Plataforma**: Vercel (Grátis)
