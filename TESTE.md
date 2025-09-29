# 🧪 Guia de Testes - BLACK SPY

## 📋 Checklist de Testes

### 1. **Teste de Instalação da Extensão**
- [ ] Carregar extensão no Chrome (modo desenvolvedor)
- [ ] Verificar se popup abre corretamente
- [ ] Verificar se ícone aparece na barra de ferramentas

### 2. **Teste de Login**
- [ ] Tentar fazer login com credenciais inválidas
- [ ] Fazer login com credenciais válidas
- [ ] Verificar se sessão persiste após fechar popup
- [ ] Testar logout

### 3. **Teste de Subscrição**
- [ ] Clicar em "Gerir Subscrição" sem login
- [ ] Clicar em "Gerir Subscrição" com login
- [ ] Verificar se modal de planos abre
- [ ] Testar seleção de planos (redirecionamento para Stripe)

### 4. **Teste de Funcionalidade Principal**

#### **Facebook Ads Library**
- [ ] Acessar: https://www.facebook.com/ads/library/
- [ ] Fazer login na extensão
- [ ] Clicar em "Iniciar Pesquisa"
- [ ] Verificar se sidebar aparece
- [ ] Verificar se auto-scroll funciona
- [ ] Verificar se anúncios duplicados são destacados
- [ ] Testar filtro "Mostrar apenas anúncios marcados"

#### **Outros Sites de Anúncios**
- [ ] Testar em Google Ads
- [ ] Testar em LinkedIn Ads
- [ ] Testar em sites com anúncios em geral

### 5. **Teste de Configurações**
- [ ] Alterar quantidade de anúncios (threshold)
- [ ] Testar diferentes velocidades de scroll
- [ ] Testar diferentes durações de pesquisa
- [ ] Verificar se configurações são salvas

### 6. **Teste de Validação de Licença**
- [ ] Testar sem licença ativa
- [ ] Testar com licença expirada
- [ ] Verificar mensagens de erro apropriadas

## 🐛 Problemas Conhecidos e Soluções

### **Problema: Extensão não carrega**
**Solução:**
1. Verificar se manifest.json está correto
2. Verificar se todos os arquivos estão presentes
3. Recarregar extensão no Chrome

### **Problema: Login não funciona**
**Solução:**
1. Verificar se backend está rodando
2. Verificar variáveis de ambiente
3. Verificar logs do console

### **Problema: Anúncios não são detectados**
**Solução:**
1. Verificar se regex está correto
2. Verificar se threshold está configurado
3. Verificar se site tem anúncios com texto esperado

### **Problema: Auto-scroll não funciona**
**Solução:**
1. Verificar se usuário está logado
2. Verificar se licença está ativa
3. Verificar se não há erros no console

## 📊 Sites Recomendados para Teste

### **1. Facebook Ads Library**
- URL: https://www.facebook.com/ads/library/
- Tipo: Anúncios do Facebook/Instagram
- Dificuldade: ⭐⭐⭐ (Médio)
- Notas: Site principal para teste

### **2. Google Ads**
- URL: https://ads.google.com/
- Tipo: Anúncios do Google
- Dificuldade: ⭐⭐⭐⭐ (Difícil)
- Notas: Requer conta de anunciante

### **3. LinkedIn Ads**
- URL: https://www.linkedin.com/campaignmanager/
- Tipo: Anúncios do LinkedIn
- Dificuldade: ⭐⭐⭐⭐ (Difícil)
- Notas: Requer conta de anunciante

### **4. Sites de Teste**
- URL: Qualquer site com anúncios
- Tipo: Anúncios diversos
- Dificuldade: ⭐⭐ (Fácil)
- Notas: Para teste geral

## 🔧 Ferramentas de Debug

### **Console do Chrome**
1. Abrir DevTools (F12)
2. Ir para Console
3. Verificar erros e logs

### **Chrome Extensions**
1. chrome://extensions/
2. Clicar em "Detalhes" na extensão
3. Verificar "Verificar erros"

### **Network Tab**
1. Abrir DevTools
2. Ir para Network
3. Verificar chamadas para API

## 📝 Relatório de Testes

Após cada teste, documente:

- ✅ **Sucesso**: Funcionou perfeitamente
- ⚠️ **Parcial**: Funcionou com limitações
- ❌ **Falha**: Não funcionou
- 🔧 **Correção**: O que foi feito para corrigir

### **Exemplo de Relatório:**

```
Teste: Login na extensão
Data: 2024-01-15
Status: ✅ Sucesso
Observações: Login funcionou perfeitamente, sessão persistiu
```

## 🚀 Próximos Passos

Após completar os testes:

1. **Corrigir bugs encontrados**
2. **Otimizar performance**
3. **Melhorar UX/UI**
4. **Preparar para produção**
5. **Fazer deploy final**

## 📞 Suporte

Se encontrar problemas:

1. Verificar este guia
2. Verificar logs do console
3. Verificar configurações
4. Documentar o problema
5. Buscar ajuda se necessário
