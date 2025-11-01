# 🚀 GUIA: Como Ativar o Servidor WebSocket no Desenvolvimento

## ✅ PROBLEMA RESOLVIDO!

O código estava tentando conectar em `ws://localhost:3000` (que não existe).  
O servidor correto é: `ws://177.93.108.140:8777`

---

## 📝 PASSO A PASSO

### 1️⃣ Configuração Adicionada

Já adicionei a configuração correta no arquivo `.env.local`:

```bash
NEXT_PUBLIC_WEBSOCKET_URL=ws://177.93.108.140:8777
```

### 2️⃣ Reiniciar o Servidor de Desenvolvimento

**IMPORTANTE**: O Next.js só carrega variáveis de ambiente ao INICIAR.  
Você precisa **parar** e **reiniciar** o servidor.

#### OPÇÃO A: Se estiver rodando em um terminal

1. Vá no terminal onde está rodando `npm run dev`
2. Pressione `Ctrl + C` para parar
3. Execute novamente:
   ```bash
   npm run dev
   ```

#### OPÇÃO B: Matar todos os processos Node

Se não souber qual terminal está rodando:

```powershell
# Parar TODOS os processos Node
Get-Process node | Stop-Process -Force

# Depois iniciar de novo
cd "c:\Users\ASUS\Desktop\Projetos Prog\Roleta\Roleta"
npm run dev
```

### 3️⃣ Verificar Conexão

Após reiniciar, abra o navegador em `http://localhost:3000` e:

1. Abra o **Console** (F12)
2. Procure por logs como:
   ```
   🔌 Conectando ao WebSocket: ws://177.93.108.140:8777
   ✅ Conectado ao servidor de roleta
   ```

3. Se aparecer **✅ Conectado**, está funcionando!

---

## 🔍 Troubleshooting

### Problema: Ainda conecta em ws://localhost:3000

**Causa**: Next.js não recarregou as variáveis de ambiente

**Solução**:
```bash
# 1. Pare TUDO
Get-Process node | Stop-Process -Force

# 2. Limpe cache do Next.js
cd "c:\Users\ASUS\Desktop\Projetos Prog\Roleta\Roleta"
Remove-Item -Recurse -Force .next

# 3. Reinstale (opcional, só se necessário)
npm install

# 4. Inicie de novo
npm run dev
```

### Problema: Erro "WebSocket connection failed"

**Causa**: Firewall ou servidor offline

**Teste**:
```bash
# Testar conexão direta
node -e "const WebSocket = require('ws'); const ws = new WebSocket('ws://177.93.108.140:8777'); ws.on('open', () => { console.log('OK'); process.exit(0); }); ws.on('error', (e) => { console.error(e.message); process.exit(1); });"
```

Se retornar **OK** → servidor está online ✅  
Se der erro → servidor pode estar offline ❌

### Problema: "require is not defined" (no navegador)

**Causa**: Código tentando usar WebSocket do Node no browser

**Verificação**: 
- WebSocket no **browser** = `new WebSocket(url)`
- WebSocket no **Node.js** = `require('ws')`

O código do frontend já está correto (usa WebSocket nativo do browser).

---

## 📋 Checklist Rápido

- [ ] `.env.local` tem `NEXT_PUBLIC_WEBSOCKET_URL=ws://177.93.108.140:8777`
- [ ] Parou o servidor (`Ctrl+C` ou `Stop-Process`)
- [ ] Iniciou novamente (`npm run dev`)
- [ ] Abriu `http://localhost:3000`
- [ ] Console mostra "✅ Conectado ao servidor"
- [ ] Roletas aparecem no dropdown

---

## 🎯 Resultado Esperado

No console do navegador, você deve ver:

```
🔌 Conectando ao WebSocket: ws://177.93.108.140:8777
✅ Conectado ao servidor de roleta
✨ Nova roleta descoberta: Greek Roulette (Evolution Gaming)
✨ Nova roleta descoberta: Speed Roulette (Evolution Gaming)
✨ Nova roleta descoberta: Immersive Roulette (Evolution Gaming)
...
🎰 Selecionando primeira roleta disponível: {...}
📜 [SELECIONADA] Inicializado Greek Roulette: 20 números - [8, 32, 36, 21, 20...]
```

---

## ⚠️ IMPORTANTE

**NÃO** faça commit do arquivo `.env.local` no Git!  
Ele já está no `.gitignore`.

---

**Status**: ✅ **CONFIGURADO - PRONTO PARA USAR**  
**Próximo passo**: Reiniciar servidor e testar
