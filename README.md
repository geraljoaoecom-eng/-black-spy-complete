# 🕵️ BLACK SPY - Análise de Anúncios

Uma extensão do Chrome que analisa e filtra anúncios com destaque de duplicações e auto-scroll inteligente.

## ✨ Funcionalidades

- 🔍 **Detecção de Anúncios Duplicados**: Identifica anúncios que utilizam os mesmos conteúdos criativos
- 🚀 **Auto-Scroll Inteligente**: Navega automaticamente pela página para encontrar anúncios
- 🎯 **Filtragem Avançada**: Mostra apenas anúncios marcados como duplicados
- ⚡ **Velocidades Configuráveis**: Lenta, média, rápida e turbo
- ⏱️ **Duração Personalizável**: 15 min, 30 min, 1 hora ou infinito
- 🔐 **Sistema de Licenças**: Controle de acesso via subscrições
- 💳 **Pagamentos Stripe**: Planos mensais, trimestrais e anuais

## 🚀 Instalação

### 1. Clone o repositório
```bash
git clone https://github.com/SEU_USERNAME/black-spy.git
cd black-spy
```

### 2. Configure o Backend
```bash
cd black-spy-backend
npm install
cp env.example .env
# Edite o .env com suas credenciais
```

### 3. Configure o Supabase
1. Crie um projeto no [Supabase](https://supabase.com)
2. Execute o arquivo `black-spy-backend/schema.sql` no SQL Editor
3. Configure as variáveis de ambiente

### 4. Configure o Stripe
1. Crie uma conta no [Stripe](https://stripe.com)
2. Execute o script de configuração:
```bash
cd black-spy-backend
npm run setup-stripe
```

### 5. Deploy do Backend
```bash
cd black-spy-backend
./deploy.sh
```

### 6. Instale a Extensão
1. Abra o Chrome e vá para `chrome://extensions/`
2. Ative o "Modo do desenvolvedor"
3. Clique em "Carregar sem compactação"
4. Selecione a pasta do projeto

## 🛠️ Desenvolvimento

### Estrutura do Projeto
```
black-spy/
├── manifest.json          # Configuração da extensão
├── popup.html            # Interface do popup
├── popup.js              # Lógica do popup
├── content.js            # Script de conteúdo
├── background.js         # Service worker
├── style.css             # Estilos
├── assets/               # Ícones e imagens
├── black-spy-backend/    # API Backend
│   ├── api/
│   ├── schema.sql
│   ├── setup-stripe.js
│   └── deploy.sh
└── TESTE.md             # Guia de testes
```

### Scripts Disponíveis
```bash
# Backend
cd black-spy-backend
npm start                 # Executar localmente
npm run dev              # Modo desenvolvimento
npm run setup-stripe     # Configurar produtos Stripe
./deploy.sh              # Deploy para Vercel

# Extensão
# Carregar no Chrome em modo desenvolvedor
```

## 📊 Planos de Subscrição

| Plano | Preço | Recursos |
|-------|-------|----------|
| **Mensal** | R$ 29,90/mês | Análise ilimitada, detecção de duplicações, auto-scroll |
| **Trimestral** | R$ 79,90/trimestre | Tudo do mensal + relatórios avançados + prioridade |
| **Anual** | R$ 299,90/ano | Tudo do trimestral + API personalizada + suporte 24/7 |

## 🧪 Testes

Execute os testes seguindo o guia em `TESTE.md`:

1. **Teste de Instalação**
2. **Teste de Login**
3. **Teste de Subscrição**
4. **Teste de Funcionalidade Principal**
5. **Teste de Configurações**

### Sites Recomendados para Teste
- [Facebook Ads Library](https://www.facebook.com/ads/library/)
- [Google Ads](https://ads.google.com/)
- [LinkedIn Ads](https://www.linkedin.com/campaignmanager/)

## 🔧 Configuração

### Variáveis de Ambiente (Backend)
```env
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_webhook_secret
JWT_SECRET=your_jwt_secret
CORS_ORIGIN=https://your-domain.com
```

### Configurações da Extensão
- **Threshold**: Quantidade mínima de anúncios para destacar
- **Velocidade**: Lenta, média, rápida ou turbo
- **Duração**: 15 min, 30 min, 1 hora ou infinito
- **Filtro**: Mostrar apenas anúncios marcados

## 🐛 Solução de Problemas

### Extensão não carrega
1. Verificar se manifest.json está correto
2. Recarregar extensão no Chrome
3. Verificar console para erros

### Login não funciona
1. Verificar se backend está rodando
2. Verificar variáveis de ambiente
3. Verificar logs do console

### Anúncios não são detectados
1. Verificar se regex está correto
2. Verificar threshold configurado
3. Verificar se site tem anúncios esperados

## 📈 Roadmap

- [ ] Suporte a mais plataformas de anúncios
- [ ] Relatórios avançados
- [ ] API para desenvolvedores
- [ ] Integração com outras ferramentas
- [ ] Análise de sentimentos
- [ ] Exportação de dados

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo `LICENSE` para mais detalhes.

## 📞 Suporte

- 📧 Email: suporte@blackspy.com
- 🐛 Issues: [GitHub Issues](https://github.com/SEU_USERNAME/black-spy/issues)
- 📖 Documentação: [Wiki](https://github.com/SEU_USERNAME/black-spy/wiki)

## 🙏 Agradecimentos

- Supabase pela infraestrutura de banco de dados
- Stripe pelos pagamentos
- Vercel pelo hosting
- Chrome Extensions API

---

**Desenvolvido com ❤️ para otimizar a análise de anúncios**
