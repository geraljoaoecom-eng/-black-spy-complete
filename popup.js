'use strict';

const THRESHOLD_KEY = 'duplicateThreshold';
const FILTER_ONLY_MARKED_KEY = 'filterOnlyMarked';
const DIAG_MODE_KEY = 'dupDiagMode';
const ENABLED_KEY = 'dupEnabled';
const SCROLL_SPEED_KEY = 'dupScrollSpeed';
const PAUSED_KEY = 'dupPaused';
const LOGGED_IN_KEY = 'userLoggedIn';
const USER_EMAIL_KEY = 'userEmail';
const SESSION_EXPIRES_KEY = 'sessionExpires';

// Configuração da API
const API_BASE_URL = 'https://black-spy-backend.vercel.app/api';

// Funções de comunicação com API
async function apiRequest(endpoint, options = {}) {
  try {
    const url = `${API_BASE_URL}${endpoint}`;
    console.log(`🌐 API Request: ${options.method || 'GET'} ${url}`);
    
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      console.error(`❌ API Error: ${response.status} - ${data.error || 'Erro na requisição'}`);
      throw new Error(data.error || 'Erro na requisição');
    }
    
    console.log(`✅ API Success: ${endpoint}`);
    return data;
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
}

async function loginUser(email, password) {
  return apiRequest('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password })
  });
}

async function logoutUser(token) {
  return apiRequest('/auth/logout', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
}

async function checkLicense(token) {
  return apiRequest('/license', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
}

async function createCheckoutSession(token, priceId) {
  return apiRequest('/stripe/create-checkout-session', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ priceId })
  });
}

function showSubscriptionPlans() {
  // Criar modal com planos
  const modal = document.createElement('div');
  modal.className = 'subscription-modal';
  modal.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <h3>Escolha seu Plano</h3>
        <button class="modal-close" id="closePlansModal">×</button>
      </div>
      <div class="plans-container">
        <div class="plan-card">
          <h4>Mensal</h4>
          <div class="price">R$ 29,90<span>/mês</span></div>
          <ul class="features">
            <li>✓ Análise ilimitada de anúncios</li>
            <li>✓ Detecção de duplicações</li>
            <li>✓ Auto-scroll inteligente</li>
            <li>✓ Suporte por email</li>
          </ul>
          <button class="btn primary" data-plan="monthly">Escolher Plano</button>
        </div>
        
        <div class="plan-card featured">
          <div class="badge">Mais Popular</div>
          <h4>Trimestral</h4>
          <div class="price">R$ 79,90<span>/trimestre</span></div>
          <div class="savings">Economize 11%</div>
          <ul class="features">
            <li>✓ Tudo do plano mensal</li>
            <li>✓ Relatórios avançados</li>
            <li>✓ Prioridade no suporte</li>
            <li>✓ Atualizações exclusivas</li>
          </ul>
          <button class="btn primary" data-plan="quarterly">Escolher Plano</button>
        </div>
        
        <div class="plan-card">
          <h4>Anual</h4>
          <div class="price">R$ 299,90<span>/ano</span></div>
          <div class="savings">Economize 16%</div>
          <ul class="features">
            <li>✓ Tudo do plano trimestral</li>
            <li>✓ API personalizada</li>
            <li>✓ Suporte prioritário 24/7</li>
            <li>✓ Treinamento personalizado</li>
          </ul>
          <button class="btn primary" data-plan="annual">Escolher Plano</button>
        </div>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  // Event listeners
  modal.querySelector('#closePlansModal').addEventListener('click', () => {
    modal.remove();
  });
  
  // Escolher plano
  modal.querySelectorAll('[data-plan]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const plan = btn.dataset.plan;
      await handlePlanSelection(plan);
      modal.remove();
    });
  });
}

async function handlePlanSelection(planType) {
  try {
    const { userToken } = await chrome.storage.sync.get({ userToken: '' });
    
    // Mapear planos para price IDs do Stripe (você precisa configurar estes no Stripe)
    const priceIds = {
      monthly: 'price_monthly_2990', // Substitua pelos seus price IDs reais
      quarterly: 'price_quarterly_7990',
      annual: 'price_annual_29990'
    };
    
    const priceId = priceIds[planType];
    if (!priceId) {
      showError('Plano inválido');
      return;
    }
    
    // Criar sessão de checkout
    const response = await createCheckoutSession(userToken, priceId);
    
    // Redirecionar para Stripe
    window.open(response.checkoutUrl, '_blank');
    
  } catch (error) {
    showError('Erro ao processar pagamento: ' + error.message);
  }
}

async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

async function loadThreshold() {
  const { [THRESHOLD_KEY]: value } = await chrome.storage.sync.get({ [THRESHOLD_KEY]: 2 });
  return typeof value === 'number' && value >= 2 ? value : 2;
}

async function saveThreshold(value) {
  const numeric = Number(value);
  const toSave = Number.isFinite(numeric) && numeric >= 2 ? Math.floor(numeric) : 2;
  await chrome.storage.sync.set({ [THRESHOLD_KEY]: toSave });
  return toSave;
}

function showLoginScreen() {
  document.getElementById('loginScreen').style.display = 'block';
  document.getElementById('mainScreen').style.display = 'none';
}

function showMainScreen() {
  document.getElementById('loginScreen').style.display = 'none';
  document.getElementById('mainScreen').style.display = 'block';
}

function showError(message) {
  const errorDiv = document.getElementById('loginError');
  errorDiv.textContent = message;
  errorDiv.style.display = 'block';
}

function hideError() {
  document.getElementById('loginError').style.display = 'none';
}

// Verificar se sessão ainda é válida
function isSessionValid(expiresAt) {
  if (!expiresAt) return false;
  return Date.now() < expiresAt;
}

// Criar nova sessão
function createSession() {
  const now = Date.now();
  const duration = 24 * 60 * 60 * 1000; // 24h fixo
  return now + duration;
}

async function checkLoginStatus() {
  const { 
    [LOGGED_IN_KEY]: isLoggedIn, 
    [USER_EMAIL_KEY]: email, 
    [SESSION_EXPIRES_KEY]: expiresAt,
    userToken
  } = await chrome.storage.sync.get({ 
    [LOGGED_IN_KEY]: false, 
    [USER_EMAIL_KEY]: '',
    [SESSION_EXPIRES_KEY]: 0,
    userToken: ''
  });
  
  if (isLoggedIn && email && isSessionValid(expiresAt) && userToken) {
    try {
      // Verificar se a licença ainda é válida
      const licenseData = await checkLicense(userToken);
      
      if (licenseData.hasLicense) {
        document.getElementById('userEmail').textContent = email;
        showMainScreen();
        return true;
      } else {
        // Licença expirada ou inválida
        showError('Sua licença expirou. Renove sua subscrição para continuar usando a ferramenta.');
        showLoginScreen();
        return false;
      }
    } catch (error) {
      console.error('Erro ao verificar licença:', error);
      // Em caso de erro, permitir uso temporário
      document.getElementById('userEmail').textContent = email;
      showMainScreen();
      return true;
    }
  } else if (isLoggedIn && !isSessionValid(expiresAt)) {
    // Sessão expirada, fazer logout
    await chrome.storage.sync.set({ 
      [LOGGED_IN_KEY]: false, 
      [USER_EMAIL_KEY]: '',
      [SESSION_EXPIRES_KEY]: 0,
      userToken: ''
    });
  }
  
  showLoginScreen();
  return false;
}

function wireUI() {
  const emailInput = document.getElementById('emailInput');
  const passwordInput = document.getElementById('passwordInput');
  const loginBtn = document.getElementById('loginBtn');
  const logoutBtn = document.getElementById('logoutBtn');
  const manageSubscriptionBtn = document.getElementById('manageSubscriptionBtn');
  const thresholdInput = document.getElementById('thresholdInput');
  const onlyMarkedToggle = document.getElementById('onlyMarkedToggle');
  const toggleScrollBtn = document.getElementById('toggleScrollBtn');

  // Verificar status de login ao carregar
  checkLoginStatus();

  // Event listeners de login
  loginBtn.addEventListener('click', async () => {
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    
    hideError();
    
    if (!email || !password) {
      showError('Por favor, preencha todos os campos');
      return;
    }
    
    try {
      // Fazer login via API
      const response = await loginUser(email, password);
      
      // Salvar dados da sessão
      await chrome.storage.sync.set({ 
        [LOGGED_IN_KEY]: true, 
        [USER_EMAIL_KEY]: email,
        [SESSION_EXPIRES_KEY]: new Date(response.expiresAt).getTime(),
        userToken: response.token
      });
      
      document.getElementById('userEmail').textContent = email;
      showMainScreen();
    } catch (error) {
      showError(error.message || 'Erro ao fazer login');
    }
  });

  // Enter para fazer login
  [emailInput, passwordInput].forEach(input => {
    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        loginBtn.click();
      }
    });
  });

  // Logout
  logoutBtn.addEventListener('click', async () => {
    try {
      // Obter token para logout
      const { userToken } = await chrome.storage.sync.get({ userToken: '' });
      
      if (userToken) {
        // Fazer logout via API
        await logoutUser(userToken);
      }
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    } finally {
      // Limpar dados locais
      await chrome.storage.sync.set({ 
        [LOGGED_IN_KEY]: false, 
        [USER_EMAIL_KEY]: '',
        [SESSION_EXPIRES_KEY]: 0,
        userToken: ''
      });
      showLoginScreen();
      emailInput.value = '';
      passwordInput.value = '';
    }
  });

  // Gerir Subscrição
  manageSubscriptionBtn.addEventListener('click', async () => {
    try {
      const { userToken } = await chrome.storage.sync.get({ userToken: '' });
      
      if (!userToken) {
        showError('Faça login primeiro para gerenciar sua subscrição');
        return;
      }
      
      // Verificar status da licença
      const licenseData = await checkLicense(userToken);
      
      if (licenseData.hasLicense) {
        // Usuário já tem licença ativa
        const message = `Sua subscrição está ativa!\n\nPlano: ${licenseData.subscription.planType}\nVálida até: ${new Date(licenseData.subscription.currentPeriodEnd).toLocaleDateString('pt-BR')}\n\nPara gerenciar sua subscrição, acesse o portal do cliente.`;
        alert(message);
      } else {
        // Usuário não tem licença, mostrar opções de planos
        showSubscriptionPlans();
      }
    } catch (error) {
      showError('Erro ao verificar subscrição: ' + error.message);
    }
  });

  // Carregar configurações da ferramenta
  loadThreshold().then((v) => {
    thresholdInput.value = String(v);
  });

  // Auto-save threshold on change
  const autoSave = async () => {
    const saved = await saveThreshold(thresholdInput.value);
    thresholdInput.value = String(saved);
    const tab = await getActiveTab();
    if (tab && tab.id != null) {
      chrome.tabs.sendMessage(tab.id, { type: 'APPLY_VISIBILITY' });
    }
  };
  
  thresholdInput.addEventListener('change', autoSave);
  thresholdInput.addEventListener('keyup', (e) => {
    if (['ArrowUp', 'ArrowDown'].includes(e.key)) {
      autoSave();
    }
  });

  // Toggle de mostrar apenas marcados
  onlyMarkedToggle.addEventListener('change', async () => {
    const onlyMarked = Boolean(onlyMarkedToggle.checked);
    await chrome.storage.sync.set({
      [FILTER_ONLY_MARKED_KEY]: onlyMarked
    });
    const tab = await getActiveTab();
    if (tab && tab.id != null) {
      chrome.tabs.sendMessage(tab.id, { type: 'APPLY_VISIBILITY' });
    }
  });

  // Botão de iniciar/pausar pesquisa
  async function refreshToggleLabel() {
    const { [ENABLED_KEY]: enabled, [PAUSED_KEY]: paused } = await chrome.storage.sync.get({ 
      [ENABLED_KEY]: false, 
      [PAUSED_KEY]: false 
    });
    const active = enabled && !paused;
    toggleScrollBtn.textContent = active ? 'Pausar Pesquisa' : 'Iniciar Pesquisa';
    toggleScrollBtn.classList.toggle('warning', active);
    toggleScrollBtn.classList.toggle('primary', !active);
  }

  toggleScrollBtn.addEventListener('click', async () => {
    const { [ENABLED_KEY]: enabled, [PAUSED_KEY]: paused } = await chrome.storage.sync.get({ 
      [ENABLED_KEY]: false, 
      [PAUSED_KEY]: false 
    });
    const tab = await getActiveTab();
    if (!tab || tab.id == null) return;
    
    const active = enabled && !paused;
    if (!active) {
      // Verificar licença antes de iniciar
      try {
        const { userToken } = await chrome.storage.sync.get({ userToken: '' });
        
        if (!userToken) {
          showError('Faça login primeiro para usar a ferramenta');
          return;
        }

        const licenseData = await checkLicense(userToken);
        
        if (!licenseData.hasLicense) {
          showError('Sua licença expirou. Renove sua subscrição para continuar usando a ferramenta.');
          return;
        }
      } catch (error) {
        console.error('Erro ao verificar licença:', error);
        // Em caso de erro, permitir uso temporário
      }
      
      await chrome.storage.sync.set({ [ENABLED_KEY]: true });
      chrome.tabs.sendMessage(tab.id, { type: 'START_SCROLL', speed: 'medium' });
    } else {
      await chrome.storage.sync.set({ [PAUSED_KEY]: true });
      chrome.tabs.sendMessage(tab.id, { type: 'PAUSE_SCROLL' });
    }
    refreshToggleLabel();
  });

  // Carregar preferências
  chrome.storage.sync.get({
    [FILTER_ONLY_MARKED_KEY]: true,
    [ENABLED_KEY]: false,
    [SCROLL_SPEED_KEY]: 'medium'
  }).then((data) => {
    try {
      onlyMarkedToggle.checked = Boolean(data[FILTER_ONLY_MARKED_KEY]);
      refreshToggleLabel();
    } catch (_) {}
  });

  // Abrir sidebar na página quando popup abre (apenas se logado)
  getActiveTab().then((tab) => {
    if (tab && tab.id != null) {
      chrome.tabs.sendMessage(tab.id, { type: 'TOGGLE_SIDEBAR' });
      window.close();
    }
  });
}

document.addEventListener('DOMContentLoaded', wireUI);