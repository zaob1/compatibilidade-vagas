// Menu de contexto "Analisar compatibilidade" e abertura do painel lateral.
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'analisar-vaga',
    title: 'Analisar compatibilidade com meu perfil',
    contexts: ['selection']
  });
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId !== 'analisar-vaga') return;
  // Abrir o painel precisa acontecer logo no clique (gesto do usuário).
  chrome.sidePanel.open({ windowId: tab.windowId });
  capturarSelecao(info, tab).then(texto =>
    chrome.storage.session.set({ vagaPendente: { texto, ts: Date.now() } })
  );
});

// selectionText do menu perde as quebras de linha, e elas importam (seções e listas).
// Por isso lemos a seleção direto da página; se não der (PDF, páginas internas), usamos o texto do menu.
async function capturarSelecao(info, tab) {
  try {
    const resultados = await chrome.scripting.executeScript({
      target: { tabId: tab.id, allFrames: true },
      func: () => (window.getSelection ? window.getSelection().toString() : '')
    });
    const textos = resultados.map(r => r.result || '').filter(t => t.trim());
    if (textos.length) return textos.sort((a, b) => b.length - a.length)[0];
  } catch (e) { /* página sem permissão de script: usa o texto do menu */ }
  return info.selectionText || '';
}
