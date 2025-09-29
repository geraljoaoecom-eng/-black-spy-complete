# 🚀 Guia de Deploy - BLACK SPY

## 📋 Checklist de Deploy

### **1. GitHub Repository**
- [x] Criar repositório no GitHub
- [x] Conectar repositório local
- [x] Fazer push do código

### **2. Supabase Setup**
- [x] Criar projeto no Supabase
- [x] Executar schema.sql
- [x] Configurar RLS policies
- [x] Obter chaves de API

### **3. Stripe Setup**
- [x] Criar conta no Stripe
- [x] Configurar produtos e preços
- [x] Configurar webhooks
- [x] Obter chaves de API

### **4. Vercel Deploy**
- [ ] Conectar repositório ao Vercel
- [ ] Configurar variáveis de ambiente
- [ ] Fazer deploy
- [ ] Testar endpoints

### **5. Extensão Chrome**
- [ ] Atualizar URL da API
- [ ] Testar extensão
- [ ] Fazer upload para Chrome Web Store (opcional)

---

## 🔧 Configuração Detalhada

### **1. GitHub Repository**

```bash
# Após criar o repositório no GitHub, execute:
git remote add origin https://github.com/SEU_USERNAME/black-spy.git
git push -u origin main
```

### **2. Supabase Configuration**

1. **Criar Projeto:**
   - Acesse [supabase.com](https://supabase.com)
   - Clique em "New Project"
   - Nome: `black-spy`
   - Senha: (anote bem!)

2. **Executar Schema:**
   - Vá para SQL Editor
   - Cole o conteúdo de `black-spy-backend/schema.sql`
   - Execute

3. **Configurar RLS:**
   - As policies já estão no schema.sql
   - Verifique se estão ativas

4. **Obter Chaves:**
   - Vá para Settings → API
   - Copie:
     - `Project URL`
     - `anon public` key
     - `service_role` key

### **3. Stripe Configuration**

1. **Criar Conta:**
   - Acesse [stripe.com](https://stripe.com)
   - Crie conta ou faça login
   - Complete o onboarding

2. **Configurar Produtos:**
   ```bash
   cd black-spy-backend
   npm install
   cp env.example .env
   # Edite .env com suas chaves
   npm run setup-stripe
   ```

3. **Configurar Webhooks:**
   - Vá para Developers → Webhooks
   - Add endpoint: `https://seu-projeto.vercel.app/api/stripe/webhook`
   - Eventos:
     - `checkout.session.completed`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
   - Copie o webhook secret

4. **Obter Chaves:**
   - Vá para Developers → API Keys
   - Copie:
     - `Secret key` (sk_test_...)
     - `Webhook secret` (whsec_...)

### **4. Vercel Deploy**

1. **Conectar Repositório:**
   - Acesse [vercel.com](https://vercel.com)
   - Clique em "New Project"
   - Conecte com GitHub
   - Selecione `black-spy`

2. **Configurar Build:**
   - Framework Preset: `Other`
   - Build Command: `npm install`
   - Output Directory: `black-spy-backend`

3. **Configurar Variáveis de Ambiente:**
   ```
   SUPABASE_URL=sua_url_do_supabase
   SUPABASE_SERVICE_ROLE_KEY=sua_service_role_key
   STRIPE_SECRET_KEY=sua_stripe_secret_key
   STRIPE_WEBHOOK_SECRET=seu_webhook_secret
   JWT_SECRET=seu_jwt_secret
   CORS_ORIGIN=https://seu-projeto.vercel.app
   ```

4. **Deploy:**
   - Clique em "Deploy"
   - Aguarde o deploy completar
   - Teste a URL: `https://seu-projeto.vercel.app/api/health`

### **5. Atualizar Extensão**

1. **Atualizar URL da API:**
   - Edite `popup.js` e `content.js`
   - Substitua `https://black-spy-backend.vercel.app/api` pela sua URL

2. **Testar Extensão:**
   - Carregue no Chrome
   - Teste login
   - Teste funcionalidades

---

## 🧪 Testes Pós-Deploy

### **1. Teste da API**
```bash
# Health check
curl https://seu-projeto.vercel.app/api/health

# Teste de registro
curl -X POST https://seu-projeto.vercel.app/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"123456"}'
```

### **2. Teste da Extensão**
1. Carregar extensão no Chrome
2. Fazer login
3. Testar funcionalidades
4. Verificar logs no console

### **3. Teste de Pagamentos**
1. Criar conta de teste
2. Tentar comprar plano
3. Verificar webhook do Stripe
4. Verificar banco de dados

---

## 🔧 Troubleshooting

### **Erro de CORS**
- Verificar `CORS_ORIGIN` no Vercel
- Verificar se URL está correta

### **Erro de Stripe**
- Verificar chaves do Stripe
- Verificar webhook secret
- Verificar logs do Vercel

### **Erro de Supabase**
- Verificar chaves do Supabase
- Verificar RLS policies
- Verificar logs do Supabase

### **Extensão não funciona**
- Verificar URL da API
- Verificar console do Chrome
- Verificar network tab

---

## 📊 Monitoramento

### **Vercel Dashboard**
- Logs de função
- Métricas de performance
- Status de deploy

### **Supabase Dashboard**
- Logs de query
- Métricas de banco
- Status de API

### **Stripe Dashboard**
- Logs de webhook
- Métricas de pagamento
- Status de transações

---

## 🚀 Próximos Passos

1. **Monitorar métricas**
2. **Otimizar performance**
3. **Adicionar analytics**
4. **Preparar para produção**
5. **Chrome Web Store** (opcional)

---

## 📞 Suporte

Se encontrar problemas:
1. Verificar logs
2. Verificar configurações
3. Testar endpoints
4. Documentar erro
5. Buscar ajuda
