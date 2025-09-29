// Background script para BLACK SPY
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'OPEN_EXTENSION') {
    // Abrir popup da extensão
    chrome.action.openPopup();
  }
});

// Listener para quando a extensão é instalada
chrome.runtime.onInstalled.addListener(() => {
  console.log('BLACK SPY instalado com sucesso!');
});
