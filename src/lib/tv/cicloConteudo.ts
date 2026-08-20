/**
 * Sinalização de "fim de ciclo" entre players internos (apresentação, mural)
 * e a playlist que os hospeda em um iframe.
 *
 * Quando um item da playlist está configurado com modo_avanco = "fim_conteudo",
 * a playlist não usa temporizador: ela aguarda esta mensagem para trocar de tela.
 */
export const TV_FIM_CONTEUDO = "tv:fim-conteudo";

/** Informa ao container (playlist) que o conteúdo completou um ciclo inteiro. */
export function notificarFimDoConteudo(origem?: string) {
  try {
    const msg = { tipo: TV_FIM_CONTEUDO, origem: origem || window.location.pathname, ts: Date.now() };
    if (window.parent && window.parent !== window) window.parent.postMessage(msg, "*");
  } catch {
    /* ignora */
  }
}
