const PADRAO = "https://crmpilar.lovable.app/pilar-sip";

async function abrirPilarFone() {
  const { urlBase } = await chrome.storage.local.get("urlBase");
  const url = urlBase || PADRAO;
  const { janelaId } = await chrome.storage.local.get("janelaId");

  if (janelaId) {
    try {
      await chrome.windows.update(janelaId, { focused: true });
      return;
    } catch (_) {
      // janela foi fechada, cria outra
    }
  }

  const janela = await chrome.windows.create({
    url,
    type: "popup",
    width: 420,
    height: 820,
  });
  await chrome.storage.local.set({ janelaId: janela.id });
}

chrome.runtime.onMessage.addListener((msg) => {
  if (msg?.tipo === "abrir-pilar-fone") abrirPilarFone();
});

chrome.windows.onRemoved.addListener(async (id) => {
  const { janelaId } = await chrome.storage.local.get("janelaId");
  if (janelaId === id) await chrome.storage.local.remove("janelaId");
});
