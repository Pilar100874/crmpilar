const PADRAO = "https://crmpilar.lovable.app/pilar-sip";
const campo = document.getElementById("url");

chrome.storage.local.get("urlBase").then(({ urlBase }) => {
  campo.value = urlBase || PADRAO;
});

document.getElementById("abrir").addEventListener("click", async () => {
  const url = campo.value.trim() || PADRAO;
  await chrome.storage.local.set({ urlBase: url });
  chrome.runtime.sendMessage({ tipo: "abrir-pilar-fone" });
  window.close();
});
