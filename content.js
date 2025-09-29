'use strict';

// Config
const THRESHOLD_KEY = 'duplicateThreshold';
const DEFAULT_THRESHOLD = 2;
const FILTER_ONLY_MARKED_KEY = 'filterOnlyMarked';
const DIAG_MODE_KEY = 'dupDiagMode';
const ENABLED_KEY = 'dupEnabled';
const PAUSED_KEY = 'dupPaused';
const LOGGED_IN_KEY = 'userLoggedIn';
const USER_EMAIL_KEY = 'userEmail';
const SESSION_EXPIRES_KEY = 'sessionExpires';

let isAutoScrolling = false;
let scrollIntervalId = null;
let scrollSpeedMode = 'medium';
let scheduledScan = false;
let processingEnabled = false;
let isPaused = false;
let searchStartTime = null;
let searchDuration = 15; // minutos, padrão 15

const processedNodes = new WeakSet();
const observedRoots = new WeakSet();

// Verificar se usuário está logado
async function isUserLoggedIn() {
  const { 
    [LOGGED_IN_KEY]: isLoggedIn, 
    [SESSION_EXPIRES_KEY]: expiresAt,
    userToken
  } = await chrome.storage.sync.get({ 
    [LOGGED_IN_KEY]: false,
    [SESSION_EXPIRES_KEY]: 0,
    userToken: ''
  });
  
  if (!isLoggedIn || !userToken) return false;
  
  // Verificar se sessão ainda é válida
  if (expiresAt && Date.now() < expiresAt) {
    return true;
  } else {
    // Sessão expirada, fazer logout
    await chrome.storage.sync.set({ 
      [LOGGED_IN_KEY]: false, 
      [USER_EMAIL_KEY]: '',
      [SESSION_EXPIRES_KEY]: 0,
      userToken: ''
    });
    return false;
  }
}

// Normalize string by removing diacritics for robust matching
function normalizeString(input) {
  try {
    return input
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .toLowerCase();
  } catch (_) {
    // Fallback without unicode property escapes
    return input
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
  }
}

// Regex flexível (com acentos) e fallback sem acentos
// Exemplos aceitos: "3 anúncios utilizam estes conteúdos criativos e texto", variações com "usam", com/sem "estes", com ponto final.
const DUP_REGEX_ACCENT = /(\d+)\s+anúncios\s+(?:utilizam|usam)\s+(?:estes\s+)?conteúdos\s+criativos\s+e\s+texto\.?/i;
const DUP_REGEX_NOACCENT = /(\d+)\s+anuncios\s+(?:utilizam|usam)\s+(?:estes\s+)?conteudos\s+criativos\s+e\s+texto\.?/i;

function getRangeClass(count) {
  if (count >= 11) return 'dup-count-high';
  if (count >= 6) return 'dup-count-mid';
  if (count >= 2) return 'dup-count-low';
  return '';
}

async function getThreshold() {
  const data = await chrome.storage.sync.get({ [THRESHOLD_KEY]: DEFAULT_THRESHOLD });
  const value = data[THRESHOLD_KEY];
  return typeof value === 'number' && value >= 2 ? value : DEFAULT_THRESHOLD;
}

function computeScrollParams(mode) {
  switch (mode) {
    case 'slow':
      return { stepPx: 300, intervalMs: 700 };
    case 'fast':
      return { stepPx: 1000, intervalMs: 120 };
    case 'turbo':
      return { stepPx: 3000, intervalMs: 25 };
    case 'medium':
    default:
      return { stepPx: 700, intervalMs: 250 };
  }
}

function startAutoScroll(mode) {
  if (isAutoScrolling) return;
  isAutoScrolling = true;
  searchStartTime = Date.now();
  scrollSpeedMode = mode || scrollSpeedMode || 'medium';
  const { stepPx, intervalMs } = computeScrollParams(scrollSpeedMode);
  clearInterval(scrollIntervalId);
  scrollIntervalId = setInterval(() => {
    if (!isAutoScrolling || isPaused) return;
    
    // Verificar se a duração da pesquisa expirou
    if (searchDuration > 0) {
      const elapsedMinutes = (Date.now() - searchStartTime) / (1000 * 60);
      if (elapsedMinutes >= searchDuration) {
        stopAutoScroll();
        return;
      }
    }
    
    window.scrollBy(0, stepPx);
    const atBottom = window.innerHeight + window.scrollY >= document.body.scrollHeight - 2;
    if (atBottom) {
      // Small bounce to trigger loading
      window.scrollBy(0, -100);
    }
  }, intervalMs);
}

function stopAutoScroll() {
  isAutoScrolling = false;
  isPaused = false;
  if (scrollIntervalId) {
    clearInterval(scrollIntervalId);
    scrollIntervalId = null;
  }
}

function stopOnUserInteractionOnce() {
  const stop = () => {
    stopAutoScroll();
    window.removeEventListener('wheel', stop, { passive: true });
    window.removeEventListener('touchstart', stop, { passive: true });
    window.removeEventListener('keydown', stop, true);
    window.removeEventListener('mousedown', stop, true);
  };
  window.addEventListener('wheel', stop, { passive: true, once: true });
  window.addEventListener('touchstart', stop, { passive: true, once: true });
  window.addEventListener('keydown', stop, { capture: true, once: true });
  window.addEventListener('mousedown', stop, { capture: true, once: true });
}

function scheduleScan() {
  if (scheduledScan) return;
  scheduledScan = true;
  setTimeout(() => {
    scheduledScan = false;
    if (!processingEnabled) return;
    Promise.resolve()
      .then(() => deepScanAllRoots())
      .then(() => applyVisibilityFilter())
      .catch(() => {});
  }, 200);
}

function createChip(textContent, count) {
  const span = document.createElement('span');
  span.className = `dup-chip dup-highlight ${getRangeClass(count)}`.trim();
  span.setAttribute('data-dup-marked', 'true');
  span.textContent = textContent;
  return span;
}

function replaceMatchesInTextNode(textNode, threshold) {
  if (!textNode || processedNodes.has(textNode)) return;
  if (!textNode.nodeValue) return;
  if (textNode.parentElement && textNode.parentElement.closest('[data-dup-marked="true"]')) return;

  const original = textNode.nodeValue;

  // Try accent-aware regex first
  let regex = DUP_REGEX_ACCENT;
  let hasMatch = regex.test(original);
  if (!hasMatch) {
    // Fallback: test normalized
    const normalized = normalizeString(original);
    if (!DUP_REGEX_NOACCENT.test(normalized)) return; // nothing to do
    // If only fallback matched, we cannot safely slice indices; wrap whole node
    const m2 = normalized.match(DUP_REGEX_NOACCENT);
    const count2 = m2 ? parseInt(m2[1], 10) : NaN;
    if (!Number.isFinite(count2) || count2 < threshold || count2 < 2) return;
    const chip = createChip(original, count2);
    textNode.replaceWith(chip);
    processedNodes.add(chip);
    return;
  }

  // Reconstruct parts with global matches
  const globalRegex = new RegExp(DUP_REGEX_ACCENT.source, 'ig');
  const frag = document.createDocumentFragment();
  let lastIndex = 0;
  let match;

  while ((match = globalRegex.exec(original)) !== null) {
    const matchText = match[0];
    const countStr = match[1];
    const count = parseInt(countStr, 10);
    if (!Number.isFinite(count) || count < threshold || count < 2) {
      continue; // skip styling for this match but keep scanning further
    }
    // Append text before the match
    if (match.index > lastIndex) {
      frag.appendChild(document.createTextNode(original.slice(lastIndex, match.index)));
    }
    // Append styled chip for the match
    frag.appendChild(createChip(matchText, count));
    lastIndex = globalRegex.lastIndex;
  }

  // If we built any chips, finalize replacement
  if (lastIndex > 0) {
    if (lastIndex < original.length) {
      frag.appendChild(document.createTextNode(original.slice(lastIndex)));
    }
    textNode.replaceWith(frag);
    processedNodes.add(frag);
  }
}

function collectTextNodesInOrder(root) {
  const walker = (root.ownerDocument || document).createTreeWalker(
    root,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode(node) {
        if (!node || !node.nodeValue) return NodeFilter.FILTER_REJECT;
        if (!node.parentElement) return NodeFilter.FILTER_SKIP;
        if (node.parentElement.closest('[data-dup-marked="true"]')) return NodeFilter.FILTER_SKIP;
        const v = node.nodeValue;
        if (!v || v.trim().length < 2) return NodeFilter.FILTER_SKIP;
        return NodeFilter.FILTER_ACCEPT;
      }
    }
  );
  const textNodes = [];
  let n;
  while ((n = walker.nextNode())) textNodes.push(n);
  return textNodes;
}

function buildConcatIndex(textNodes) {
  const parts = [];
  const map = [];
  let offset = 0;
  for (let i = 0; i < textNodes.length; i += 1) {
    const t = textNodes[i].nodeValue || '';
    parts.push(t);
    map.push({ index: i, start: offset, end: offset + t.length });
    offset += t.length;
  }
  return { concatenated: parts.join(''), indexMap: map };
}

function findNodeAtOffset(indexMap, offset) {
  for (let i = 0; i < indexMap.length; i += 1) {
    const rec = indexMap[i];
    if (offset >= rec.start && offset < rec.end) return { mapIndex: i, innerOffset: offset - rec.start };
  }
  return null;
}

function splitTextNodeAt(node, innerOffset) {
  if (innerOffset <= 0) return [null, node];
  if (innerOffset >= (node.nodeValue || '').length) return [node, null];
  const right = node.splitText(innerOffset);
  return [node, right];
}

function wrapMatchAcrossNodes(textNodes, indexMap, matchStart, matchEnd, chip) {
  const startInfo = findNodeAtOffset(indexMap, matchStart);
  const endInfo = findNodeAtOffset(indexMap, matchEnd - 1);
  if (!startInfo || !endInfo) return false;

  const startNode = textNodes[startInfo.mapIndex];
  let [, afterStart] = splitTextNodeAt(startNode, startInfo.innerOffset);
  const first = afterStart || startNode; // node at exact start

  const endNode = textNodes[endInfo.mapIndex];
  let [beforeEnd] = splitTextNodeAt(endNode, (endInfo.innerOffset + 1)); // +1 since matchEnd is exclusive
  const last = beforeEnd || endNode;

  // Collect nodes from first..last (inclusive) in DOM order
  const nodesToReplace = [];
  let collecting = false;
  for (const tn of collectTextNodesInOrder(first.getRootNode().body ? first.getRootNode().body : first.getRootNode())) {
    if (tn === first) collecting = true;
    if (collecting) nodesToReplace.push(tn);
    if (tn === last) break;
  }

  if (nodesToReplace.length === 0) return false;

  const parent = nodesToReplace[0].parentNode;
  // Insert chip before first node
  parent.insertBefore(chip, nodesToReplace[0]);
  // Remove/trim nodes covered by match
  for (const tn of nodesToReplace) tn.remove();
  return true;
}

async function scanRootForDuplicates(root) {
  const threshold = await getThreshold();

  // Quick skip if root has no relevant keywords
  const textSnapshot = (root.textContent || '').toLowerCase();
  if (!(textSnapshot.includes('anúncios') || textSnapshot.includes('anuncios'))) return;
  if (!(textSnapshot.includes('utilizam') || textSnapshot.includes('usam'))) return;

  const textNodes = collectTextNodesInOrder(root);
  if (textNodes.length === 0) return;

  const { concatenated, indexMap } = buildConcatIndex(textNodes);

  // Try accent regex, then no-accent fallback based on normalized string
  const tryFind = (source, regex) => {
    const results = [];
    const global = new RegExp(regex.source, 'ig');
    let m;
    while ((m = global.exec(source)) !== null) {
      results.push({ start: m.index, end: m.index + m[0].length, count: parseInt(m[1], 10), text: m[0] });
    }
    return results;
  };

  let matches = tryFind(concatenated, DUP_REGEX_ACCENT);
  if (matches.length === 0) {
    const normalized = normalizeString(concatenated);
    matches = tryFind(normalized, DUP_REGEX_NOACCENT).map((r) => ({ ...r, text: concatenated.slice(r.start, r.end) }));
  }

  for (const match of matches) {
    const { count, start, end, text } = match;
    if (!Number.isFinite(count) || count < 2 || count < threshold) continue;
    const chip = createChip(text, count);
    wrapMatchAcrossNodes(textNodes, indexMap, start, end, chip);
  }
}

async function deepScanAllRoots() {
  try {
    await scanRootForDuplicates(document.body);
  } catch (_) {}

  // Scan shadow roots recursively
  const stack = [];
  document.querySelectorAll('*').forEach((el) => {
    if (el.shadowRoot) stack.push(el.shadowRoot);
  });
  while (stack.length) {
    const root = stack.pop();
    try {
      await scanRootForDuplicates(root);
    } catch (_) {}
    // discover nested shadow roots
    root.querySelectorAll('*').forEach((el) => {
      if (el.shadowRoot) stack.push(el.shadowRoot);
    });
  }

  // Scan same-origin iframes
  const iframes = document.querySelectorAll('iframe');
  for (const frame of iframes) {
    try {
      const doc = frame.contentDocument;
      if (doc && doc.body) {
        await scanRootForDuplicates(doc.body);
        // Also shadow roots inside iframe
        const localStack = [];
        doc.querySelectorAll('*').forEach((el) => {
          if (el.shadowRoot) localStack.push(el.shadowRoot);
        });
        while (localStack.length) {
          const root = localStack.pop();
          try {
            await scanRootForDuplicates(root);
          } catch (_) {}
          root.querySelectorAll('*').forEach((el) => {
            if (el.shadowRoot) localStack.push(el.shadowRoot);
          });
        }
      }
    } catch (_) {
      // cross-origin iframe; ignore
    }
  }

  // After finishing all scans, ensure visibility is applied
  try { await applyVisibilityFilter(); } catch (_) {}
}

function observeRoot(root) {
  if (!root || observedRoots.has(root)) return;
  const observer = new MutationObserver(() => scheduleScan());
  observer.observe(root, { childList: true, subtree: true, characterData: true });
  observedRoots.add(root);
}

function setupMutationObserver() {
  observeRoot(document.body);
  // Observe shadow roots
  document.querySelectorAll('*').forEach((el) => {
    if (el.shadowRoot) observeRoot(el.shadowRoot);
  });

  // Intercept novos shadow roots (open)
  const origAttach = Element.prototype.attachShadow;
  if (typeof origAttach === 'function' && !Element.prototype.__dupPatched) {
    Element.prototype.attachShadow = function patchedInit(init) {
      const root = origAttach.call(this, init);
      try { observeRoot(root); } catch (_) {}
      scheduleScan();
      return root;
    };
    Object.defineProperty(Element.prototype, '__dupPatched', { value: true, configurable: false });
  }
}

function setProcessingEnabled(enabled) {
  processingEnabled = Boolean(enabled);
  if (processingEnabled) {
    try { setupMutationObserver(); } catch (_) {}
    scheduleScan();
  } else {
    // Restore visibility and remove diag marks when disabled
    try {
      document.querySelectorAll('[data-dup-hidden="true"]').forEach((el) => {
        el.removeAttribute('data-dup-hidden');
        el.classList.remove('dup-hide');
        el.style.removeProperty('display');
      });
      document.querySelectorAll('.dup-diag-badge').forEach((n) => n.remove());
      document.querySelectorAll('.dup-diag-outline').forEach((n) => n.classList.remove('dup-diag-outline'));
    } catch (_) {}
  }
}

async function renderSidebar() {
  if (document.querySelector('.dup-sidebar')) return;
  
  // Verificar se usuário está logado
  const loggedIn = await isUserLoggedIn();
  if (!loggedIn) {
    // Mostrar tela de login na sidebar
    const wrap = document.createElement('div');
    wrap.className = 'dup-sidebar';
    wrap.innerHTML = `
      <button class="dup-close" id="dup-close" aria-label="Fechar">×</button>
      <div class="dup-header">
        <img src="https://i.postimg.cc/sDVgbd9k/black-spy.png" alt="BLACK SPY" class="dup-main-logo" />
        <h2>BLACK SPY</h2>
      </div>
      <div class="login-screen">
        <div class="login-form">
          <h3>Fazer Login</h3>
          <p class="login-subtitle">Acesse sua conta para usar a ferramenta</p>
          
          <div class="form-group">
            <label for="sidebar-email" class="form-label">Email</label>
            <input id="sidebar-email" type="email" class="form-input" placeholder="seu@email.com" />
          </div>
          
          <div class="form-group">
            <label for="sidebar-password" class="form-label">Senha</label>
            <input id="sidebar-password" type="password" class="form-input" placeholder="Sua senha" />
          </div>
          
          <button id="sidebar-login" class="btn primary">Entrar</button>
          
          <div class="login-actions">
            <button id="sidebar-subscription" class="btn secondary">Subscrição</button>
          </div>
          
          <div id="sidebar-login-error" class="error-message" style="display: none;">
            Email ou senha incorretos
          </div>
        </div>
      </div>
    `;
    document.documentElement.appendChild(wrap);
    
    // Event listeners
    const emailInput = wrap.querySelector('#sidebar-email');
    const passwordInput = wrap.querySelector('#sidebar-password');
    const loginBtn = wrap.querySelector('#sidebar-login');
    const subscriptionBtn = wrap.querySelector('#sidebar-subscription');
    const errorDiv = wrap.querySelector('#sidebar-login-error');
    
    // Login
    loginBtn.addEventListener('click', async () => {
      const email = emailInput.value.trim();
      const password = passwordInput.value;
      
      errorDiv.style.display = 'none';
      
      if (!email || !password) {
        errorDiv.textContent = 'Por favor, preencha todos os campos';
        errorDiv.style.display = 'block';
        return;
      }
      
      try {
        // Fazer login via API
        const response = await fetch('https://black-spy-backend.vercel.app/api/auth/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ email, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
          // Login válido
          await chrome.storage.sync.set({ 
            [LOGGED_IN_KEY]: true, 
            [USER_EMAIL_KEY]: email,
            [SESSION_EXPIRES_KEY]: new Date(data.expiresAt).getTime(),
            userToken: data.token
          });
          
          // Recarregar sidebar com ferramenta
          wrap.remove();
          renderSidebar();
        } else {
          errorDiv.textContent = data.error || 'Email ou senha incorretos';
          errorDiv.style.display = 'block';
        }
      } catch (error) {
        errorDiv.textContent = 'Erro ao conectar com o servidor';
        errorDiv.style.display = 'block';
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
    
    // Subscrição
    subscriptionBtn.addEventListener('click', async () => {
      const { subscriptionUrl } = await chrome.storage.sync.get({ subscriptionUrl: 'https://example.com/planos' });
      window.open(subscriptionUrl, '_blank', 'noopener');
    });
    
    wrap.querySelector('#dup-close').addEventListener('click', () => {
      wrap.remove();
    });
    
    return;
  }
  
  const wrap = document.createElement('div');
  wrap.className = 'dup-sidebar';
  wrap.innerHTML = `
    <button class="dup-close" id="dup-close" aria-label="Fechar">×</button>
    <div class="dup-header">
      <img src="https://i.postimg.cc/sDVgbd9k/black-spy.png" alt="BLACK SPY" class="dup-main-logo" />
      <h2>BLACK SPY</h2>
      <button class="dup-settings-btn" id="dup-settings" aria-label="Configurações da pesquisa">⚙️</button>
    </div>
    <div class="row"><label>Quantidade de anúncios</label><input id="dup-threshold" type="number" min="2" step="1" class="input" /></div>
    <div class="row"><label><input id="dup-only" type="checkbox" /> Mostrar apenas anúncios marcados</label></div>
    <div class="row"><button id="dup-toggle" class="btn primary">Iniciar Scroll</button></div>
    
    <!-- Modal de Configurações -->
    <div class="dup-modal" id="dup-settings-modal" style="display: none;">
      <div class="dup-modal-content">
        <div class="dup-modal-header">
          <h3>Configurações da pesquisa</h3>
          <button class="dup-modal-close" id="dup-modal-close">×</button>
        </div>
        <div class="dup-modal-body">
          <div class="row">
            <label>Duração da pesquisa</label>
            <select id="dup-duration" class="input">
              <option value="15">15 minutos</option>
              <option value="30">30 minutos</option>
              <option value="60">1 hora</option>
              <option value="0" selected>Infinito</option>
            </select>
          </div>
          <div class="row">
            <label>Velocidade do scroll</label>
            <select id="dup-speed" class="input">
              <option value="slow" selected>Lenta</option>
              <option value="medium">Média</option>
              <option value="fast">Rápida</option>
              <option value="turbo">Turbo</option>
            </select>
          </div>
        </div>
        <div class="dup-modal-footer">
          <button id="dup-save-settings" class="btn primary">Salvar</button>
        </div>
      </div>
    </div>
  `;
  document.documentElement.appendChild(wrap);

  // load prefs
  chrome.storage.sync.get({ [THRESHOLD_KEY]: 2, [FILTER_ONLY_MARKED_KEY]: true, [DIAG_MODE_KEY]: false, dupScrollSpeed: 'slow', dupSearchDuration: 15, [ENABLED_KEY]: false, [PAUSED_KEY]: false }).then((d) => {
    try {
      wrap.querySelector('#dup-threshold').value = String(typeof d[THRESHOLD_KEY] === 'number' ? d[THRESHOLD_KEY] : 2);
      wrap.querySelector('#dup-only').checked = !!d[FILTER_ONLY_MARKED_KEY];
      wrap.querySelector('#dup-diag').checked = !!d[DIAG_MODE_KEY];
      wrap.querySelector('#dup-speed').value = String(d.dupScrollSpeed || 'slow');
      wrap.querySelector('#dup-duration').value = String(d.dupSearchDuration || 15);
      searchDuration = d.dupSearchDuration || 15;
      const active = d[ENABLED_KEY] && !d[PAUSED_KEY];
      const btn = wrap.querySelector('#dup-toggle');
      btn.textContent = active ? 'Pausar Pesquisa' : 'Iniciar Pesquisa';
      btn.classList.toggle('warning', active);
      btn.classList.toggle('primary', !active);
    } catch (_) {}
  });

  // wire events
  const autoSaveThreshold = async () => {
    const v = parseInt(wrap.querySelector('#dup-threshold').value, 10);
    const toSave = Number.isFinite(v) && v >= 2 ? v : 2;
    await chrome.storage.sync.set({ [THRESHOLD_KEY]: toSave });
    try { applyVisibilityFilter(); } catch (_) {}
  };
  wrap.querySelector('#dup-threshold').addEventListener('change', autoSaveThreshold);
  wrap.querySelector('#dup-threshold').addEventListener('keyup', (e) => {
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') autoSaveThreshold();
  });
  wrap.querySelector('#dup-only').addEventListener('change', async () => {
    const only = !!wrap.querySelector('#dup-only').checked;
    await chrome.storage.sync.set({ [FILTER_ONLY_MARKED_KEY]: only });
    applyVisibilityFilter();
  });
  wrap.querySelector('#dup-close').addEventListener('click', () => {
    wrap.remove();
  });
  
  // Event listeners do modal de configurações
  wrap.querySelector('#dup-settings').addEventListener('click', () => {
    wrap.querySelector('#dup-settings-modal').style.display = 'block';
  });
  
  wrap.querySelector('#dup-modal-close').addEventListener('click', () => {
    wrap.querySelector('#dup-settings-modal').style.display = 'none';
  });
  
  wrap.querySelector('#dup-save-settings').addEventListener('click', async () => {
    const duration = parseInt(wrap.querySelector('#dup-duration').value, 10);
    const speed = wrap.querySelector('#dup-speed').value;
    searchDuration = duration;
    scrollSpeedMode = speed;
    await chrome.storage.sync.set({ 
      dupSearchDuration: duration,
      dupScrollSpeed: speed 
    });
    wrap.querySelector('#dup-settings-modal').style.display = 'none';
  });
  // Verificar licença antes de iniciar pesquisa
  async function checkLicenseBeforeStart() {
    try {
      const { userToken } = await chrome.storage.sync.get({ userToken: '' });
      
      if (!userToken) {
        alert('Faça login primeiro para usar a ferramenta');
        return false;
      }

      const response = await fetch('https://black-spy-backend.vercel.app/api/license', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${userToken}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      
      if (!data.hasLicense) {
        alert('Sua licença expirou. Renove sua subscrição para continuar usando a ferramenta.');
        return false;
      }

      return true;
    } catch (error) {
      console.error('Erro ao verificar licença:', error);
      // Em caso de erro, permitir uso temporário
      return true;
    }
  }

  wrap.querySelector('#dup-toggle').addEventListener('click', async () => {
    const data = await chrome.storage.sync.get({ [ENABLED_KEY]: false, [PAUSED_KEY]: false, dupScrollSpeed: 'medium' });
    const active = data[ENABLED_KEY] && !data[PAUSED_KEY];
    
    if (!active) {
      // Verificar licença antes de iniciar
      const hasValidLicense = await checkLicenseBeforeStart();
      if (!hasValidLicense) return;
      
      await chrome.storage.sync.set({ [ENABLED_KEY]: true });
      startAutoScroll(data.dupScrollSpeed || 'medium');
      setProcessingEnabled(true);
      isPaused = false;
    } else {
      isPaused = true;
    }
    const btn = wrap.querySelector('#dup-toggle');
    btn.textContent = (!active) ? 'Pausar Pesquisa' : 'Iniciar Pesquisa';
    btn.classList.toggle('warning', !active);
    btn.classList.toggle('primary', active);
  });
}

function toggleSidebar() {
  const el = document.querySelector('.dup-sidebar');
  if (el) { el.remove(); return; }
  renderSidebar();
}

function init() {
  // Load enabled state but do not start by default
  chrome.storage.sync.get({ [ENABLED_KEY]: false }).then((data) => {
    setProcessingEnabled(Boolean(data[ENABLED_KEY]));
  });

  // Messages from popup to control scrolling
  chrome.runtime.onMessage.addListener((message) => {
    if (!message || typeof message.type !== 'string') return;
    if (message.type === 'TOGGLE_SIDEBAR') {
      try { toggleSidebar(); } catch (_) {}
      return;
    }
    if (message.type === 'START_SCROLL') {
      setProcessingEnabled(true);
      if (message && typeof message.speed === 'string') scrollSpeedMode = message.speed;
      startAutoScroll(scrollSpeedMode);
      stopOnUserInteractionOnce();
      isPaused = false;
      try { chrome.storage.sync.set({ [PAUSED_KEY]: false, [ENABLED_KEY]: true }); } catch (_) {}
    } else if (message.type === 'STOP_SCROLL') {
      stopAutoScroll();
      setProcessingEnabled(false);
      try { chrome.storage.sync.set({ [PAUSED_KEY]: false, [ENABLED_KEY]: false }); } catch (_) {}
    } else if (message.type === 'PAUSE_SCROLL') {
      isPaused = true;
      try { chrome.storage.sync.set({ [PAUSED_KEY]: true }); } catch (_) {}
    } else if (message.type === 'SET_SPEED') {
      if (message && typeof message.speed === 'string') {
        scrollSpeedMode = message.speed;
        if (isAutoScrolling) {
          // restart interval with new params
          const wasPaused = isPaused;
          stopAutoScroll();
          if (!wasPaused) startAutoScroll(scrollSpeedMode);
        }
      }
    } else if (message.type === 'APPLY_VISIBILITY') {
      if (processingEnabled) applyVisibilityFilter();
    }
  });

  // Apply visibility on threshold changes or initial load
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'sync') return;
    if (changes[ENABLED_KEY]) {
      setProcessingEnabled(Boolean(changes[ENABLED_KEY].newValue));
    }
    if (changes[FILTER_ONLY_MARKED_KEY]) {
      if (processingEnabled) applyVisibilityFilter();
    }
  });

  // Do nothing on load; waits for enable
}

// Ensure a page refresh disables future auto-start, but keeps current DOM untouched
try {
  window.addEventListener('beforeunload', () => {
    try { chrome.storage.sync.set({ [ENABLED_KEY]: false, [PAUSED_KEY]: false }); } catch (_) {}
  });
} catch (_) {}

// Utilities for deep DOM traversal (shadow roots / iframes)
function collectAllDocuments() {
  const docs = [document];
  document.querySelectorAll('iframe').forEach((frame) => {
    try {
      if (frame.contentDocument && frame.contentDocument.body) docs.push(frame.contentDocument);
    } catch (_) {}
  });
  return docs;
}

function queryAllDeep(root, selector) {
  const out = [];
  const queue = [root];
  while (queue.length) {
    const node = queue.shift();
    try {
      if (node.querySelectorAll) node.querySelectorAll(selector).forEach((el) => out.push(el));
    } catch (_) {}
    try {
      const all = node.querySelectorAll ? node.querySelectorAll('*') : [];
      all.forEach((el) => { if (el.shadowRoot) queue.push(el.shadowRoot); });
    } catch (_) {}
  }
  return out;
}

function closestAcrossShadows(start, selector) {
  let el = start;
  while (el) {
    const found = el.closest ? el.closest(selector) : null;
    if (found) return found;
    const root = el.getRootNode && el.getRootNode();
    if (root && root.host) {
      el = root.host; // climb out of shadow root
      continue;
    }
    return null;
  }
  return null;
}

function buildDomainCardSelector() {
  const isMetaAdsLibrary =
    (location.hostname.includes('facebook.com') || location.hostname.includes('fb.com')) &&
    location.pathname.includes('/ads/library');
  if (isMetaAdsLibrary) {
    // Prefer wrappers típicos de cartões na Ads Library
    return '[data-visualcompletion="cell"], [data-ad-preview], [data-ad], [data-ad-card], [data-pagelet*="ad" i], article, div[role="article"], [aria-labelledby][role="region"], [role="main"] > div, div.x1plvlek.xryxfnj.x1gzqxud';
  }
  return 'article, div[role="article"], [data-ad], [data-ad-card], [role="feed"] > *, section';
}

// Heurística para refinar o alvo real a esconder (subir para um wrapper mais estável)
function refineCardTarget(element) {
  if (!element) return null;
  let current = element;
  const stopAt = document.body;
  // Parar se encontrar region/role=main/section/article grandes
  const hardStopSelector = '[role="main"], main, header, footer, nav';
  const preferredSelector = '[data-visualcompletion], [data-ad-card], [data-ad], article, [role="article"], [aria-labelledby][role="region"]';
  while (current && current !== stopAt) {
    if (current.matches(hardStopSelector)) break;
    // Se o pai direto agrupar múltiplos cartões (grid/list), mantemos o atual
    const parent = current.parentElement;
    if (!parent) break;
    const siblings = parent.children;
    // Se muitos irmãos com classes semelhantes, então o parent é a grelha e o current é o cartão
    if (siblings && siblings.length >= 3) {
      // se o current já corresponde a um preferido, usamos ele
      if (current.matches(preferredSelector)) return current;
      // se o pai é claramente uma grid, não subimos demais
      const parentIsGrid = getComputedStyle(parent).display.includes('grid') || getComputedStyle(parent).display.includes('flex');
      if (parentIsGrid) return current;
    }
    // Subir um nível e tentar combinar preferred
    const candidate = parent;
    if (candidate.matches(preferredSelector)) current = candidate;
    else current = candidate;
  }
  return current || element;
}

async function applyVisibilityFilter() {
  try {
    const data = await chrome.storage.sync.get({
      [FILTER_ONLY_MARKED_KEY]: true,
      [DIAG_MODE_KEY]: false
    });
    if (!processingEnabled) {
      // ensure no leftovers
      document.querySelectorAll('.dup-hide').forEach((el) => {
        el.classList.remove('dup-hide');
        el.style.removeProperty('display');
      });
      return;
    }
    const onlyMarked = Boolean(data[FILTER_ONLY_MARKED_KEY]);
    const diagMode = Boolean(data[DIAG_MODE_KEY]);

    const cardSelector = buildDomainCardSelector();

    // 1) Coletar todos os cartões candidatos (todos os documentos + shadow roots)
    const containers = [];
    for (const doc of collectAllDocuments()) {
      queryAllDeep(doc, cardSelector).forEach((el) => { if (!containers.includes(el)) containers.push(el); });
    }
    // Fallback por proximidade de chips
    if (containers.length === 0) {
      const set = new Set();
      for (const doc of collectAllDocuments()) {
        queryAllDeep(doc, '.dup-chip').forEach((chip) => {
          const card = closestAcrossShadows(chip, cardSelector) || chip.closest('div, article, section');
          if (card) set.add(card);
        });
      }
      set.forEach((el) => { if (!containers.includes(el)) containers.push(el); });
    }

    const HIDDEN_ATTR = 'data-dup-hidden';
    const HIDDEN_STYLE = 'display: none !important;';

    // If not filtering, restore all previously hidden
    if (!onlyMarked) {
      document.querySelectorAll('[' + HIDDEN_ATTR + "='true']").forEach((el) => {
        el.removeAttribute(HIDDEN_ATTR);
        el.style.removeProperty('display');
        el.classList.remove('dup-hide');
      });
      return;
    }

    // 2) Construir um Set de cartões marcados a partir dos chips (atravessando shadow/iframes)
    const markedCards = new Set();
    for (const doc of collectAllDocuments()) {
      queryAllDeep(doc, '.dup-chip').forEach((chip) => {
        const base = closestAcrossShadows(chip, cardSelector) || chip.closest('div, article, section');
        const card = refineCardTarget(base) || base;
        if (card) markedCards.add(card);
      });
    }

    // 3) Esconder todos que não estejam marcados
    containers.forEach((raw) => {
      const card = refineCardTarget(raw) || raw;
      const keep = markedCards.has(card);
      if (!keep) {
        card.setAttribute(HIDDEN_ATTR, 'true');
        card.classList.add('dup-hide');
        card.setAttribute('style', HIDDEN_STYLE);
      } else {
        card.removeAttribute(HIDDEN_ATTR);
        card.classList.remove('dup-hide');
        card.style.removeProperty('display');
      }
    });

    // 4) Diagnóstico visual opcional: contornar cartões e etiquetar se KEEP/HIDE
    try {
      document.querySelectorAll('.dup-diag-badge').forEach((n) => n.remove());
      document.querySelectorAll('.dup-diag-outline').forEach((n) => n.classList.remove('dup-diag-outline'));
    } catch (_) {}
    if (diagMode) {
      containers.forEach((raw, idx) => {
        const card = refineCardTarget(raw) || raw;
        card.classList.add('dup-diag-outline');
        const badge = document.createElement('div');
        badge.className = 'dup-diag-badge';
        const keep = markedCards.has(card);
        badge.textContent = `#${idx + 1} ${keep ? 'KEEP' : 'HIDE'}`;
        badge.style.cssText = 'position:absolute; z-index:999999; top:2px; left:2px; font-size:11px; background: ' + (keep ? '#2e7d32' : '#c62828') + '; color:white; padding:2px 4px; border-radius:3px;';
        // tentar inserir no próprio card
        const pos = getComputedStyle(card).position;
        if (pos === 'static') card.style.position = 'relative';
        card.appendChild(badge);
      });
    }
  } catch (_) {}
}

// Delay init until DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init, { once: true });
} else {
  init();
}


