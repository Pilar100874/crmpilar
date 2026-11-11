// Decide se um aviso de silêncio do aparelho chegou cedo demais.
// Aparelhos com versão antiga contam como "silêncio" o áudio guardado enquanto a IA falava,
// e diziam "Desculpe, não ouvi" logo que a IA terminava, antes de o cliente responder.
// A duração da fala é estimada pelo tamanho do texto (~14 caracteres por segundo na voz da IA).
export const ESPERA_MINIMA_SEG = 7;

export function silencioPrematuro(
  transcricao: { papel?: string; texto?: string; em?: string }[] | null | undefined,
  agora = Date.now(),
): boolean {
  const lista = Array.isArray(transcricao) ? transcricao : [];
  const ultima = [...lista].reverse().find((t) => t?.papel === "agente" && t?.em);
  if (!ultima) return false;
  // Se o cliente falou depois da última fala da IA, não é silêncio de espera.
  const iUltima = lista.lastIndexOf(ultima);
  if (lista.slice(iUltima + 1).some((t) => t?.papel === "cliente" && String(t?.texto ?? "").trim())) return false;
  const quando = Date.parse(String(ultima.em));
  if (!Number.isFinite(quando)) return false;
  const falaSeg = String(ultima.texto ?? "").length / 14;
  return agora - quando < (falaSeg + ESPERA_MINIMA_SEG) * 1000;
}
