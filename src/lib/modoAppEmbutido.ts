/**
 * Detecta quando o sistema está sendo aberto dentro de um aplicativo instalado
 * (Pilar Automação, Pilar Controle etc.). Nesse modo mostramos apenas o painel,
 * sem assistente de voz, chat interno ou Pilar Fone.
 */
const CHAVE = "pilar_modo_app";

export function marcarModoApp(): void {
  try {
    const url = new URL(window.location.href);
    const parametro = url.searchParams.get("app");
    const agente = navigator.userAgent || "";
    const porAgente = /PilarAutomacao|PilarControle|PilarApp/i.test(agente);
    if (parametro === "1" || parametro === "automacao" || porAgente) {
      sessionStorage.setItem(CHAVE, "1");
    }
  } catch {
    /* ambiente sem acesso a sessionStorage */
  }
}

export function modoAppEmbutido(): boolean {
  try {
    marcarModoApp();
    return sessionStorage.getItem(CHAVE) === "1";
  } catch {
    return false;
  }
}
