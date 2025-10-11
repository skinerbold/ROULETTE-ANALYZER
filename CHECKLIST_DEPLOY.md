# ✅ CHECKLIST DE DEPLOY

Use este checklist para garantir que tudo está configurado corretamente.

---

## 📋 **PRÉ-DEPLOY**

### **Ambiente Local:**
- [ ] Node.js 18.17+ instalado
- [ ] Projeto funciona localmente (`npm run dev`)
- [ ] Build funciona (`npm run build`)
- [ ] Sem erros no console do navegador

### **Supabase:**
- [ ] Conta criada em https://supabase.com
- [ ] Projeto criado
- [ ] Tabela `user_sessions` criada (SQL executado)
- [ ] Row Level Security (RLS) configurado
- [ ] Copiou `Project URL`
- [ ] Copiou `anon public key`

### **GitHub:**
- [ ] Conta criada em https://github.com
- [ ] Repositório criado: `ROULETTE-ANALYZER`
- [ ] Personal Access Token gerado (se necessário)

---

## 🚀 **DURANTE O DEPLOY**

### **Passo 1: Git Local**
```powershell
git init
git add .
git commit -m "Initial commit"
git branch -M main
```
- [ ] Git inicializado
- [ ] Arquivos adicionados
- [ ] Commit criado
- [ ] Branch renomeada para main

### **Passo 2: Conectar ao GitHub**
```powershell
git remote add origin https://github.com/skinerbold/ROULETTE-ANALYZER.git
git push -u origin main
```
- [ ] Remote adicionado
- [ ] Push realizado com sucesso
- [ ] Código visível no GitHub

### **Passo 3: Deploy na Vercel**
- [ ] Acessou https://vercel.com
- [ ] Fez login com GitHub
- [ ] Importou projeto ROULETTE-ANALYZER
- [ ] Configurou variáveis de ambiente:
  - [ ] `NEXT_PUBLIC_SUPABASE_URL`
  - [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] Clicou em "Deploy"
- [ ] Deploy concluído (status: Ready)

---

## ✅ **PÓS-DEPLOY**

### **Verificações:**
- [ ] URL da Vercel funciona
- [ ] Página carrega sem erros
- [ ] Pode criar conta
- [ ] Pode fazer login
- [ ] Pode adicionar números
- [ ] Estratégias aparecem corretamente
- [ ] Análise funciona
- [ ] Ao recarregar página, continua logado

### **Configurações Supabase:**
- [ ] Site URL atualizado: `https://seu-app.vercel.app`
- [ ] Redirect URLs configuradas
- [ ] CORS configurado (se necessário)

### **Opcional:**
- [ ] Domínio customizado configurado
- [ ] Analytics configurado
- [ ] Error tracking configurado

---

## 🐛 **TROUBLESHOOTING**

### **Se algo não funcionar:**

**Build falha:**
- [ ] Verifiquei logs na Vercel
- [ ] Testei build localmente
- [ ] Variáveis de ambiente corretas

**Login não funciona:**
- [ ] Site URL correto no Supabase
- [ ] Redirect URLs configuradas
- [ ] Console do navegador sem erros

**Números não salvam:**
- [ ] Tabela `user_sessions` existe
- [ ] RLS configurado
- [ ] Usuário autenticado

---

## 🎉 **DEPLOY COMPLETO**

Quando tudo estiver ✅:

- [x] Projeto no GitHub
- [x] Deploy na Vercel
- [x] Todas as funcionalidades testadas
- [x] Sem erros críticos

**SEU APP ESTÁ NO AR!** 🚀

---

## 📝 **PRÓXIMOS PASSOS**

Depois do deploy:

1. **Compartilhe a URL** do seu app
2. **Teste em diferentes dispositivos** (desktop, mobile, tablet)
3. **Monitore erros** no dashboard da Vercel
4. **Configure domínio customizado** (opcional)
5. **Adicione analytics** (opcional)

---

## 🔄 **ATUALIZAÇÕES FUTURAS**

Para atualizar o app depois de mudanças:

```powershell
git add .
git commit -m "Descrição das mudanças"
git push
```

✨ **A Vercel faz deploy automático!** ✨

---

**Data do deploy**: _________________

**URL do app**: _____________________________________

**Notas**: 

_______________________________________________________

_______________________________________________________

_______________________________________________________
