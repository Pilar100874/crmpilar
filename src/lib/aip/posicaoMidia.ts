/**
 * Guarda a posição de reprodução (segundos) por URL de mídia, para que o
 * usuário continue de onde parou ao alternar entre o preview inline e a
 * visualização em tela cheia. Mantido em memória (por sessão da página).
 */
const posicoes = new Map<string, number>();

/** Chave estável ignorando query de assinatura (links assinados mudam). */
function chave(url: string): string {
  try {
    const u = new URL(url, window.location.origin);
    return `${u.origin}${u.pathname}`;
  } catch {
    return url;
  }
}

export function salvarPosicaoMidia(url: string, segundos: number) {
  if (!url || !isFinite(segundos) || segundos < 0) return;
  posicoes.set(chave(url), segundos);
}

export function obterPosicaoMidia(url: string): number {
  if (!url) return 0;
  return posicoes.get(chave(url)) ?? 0;
}
