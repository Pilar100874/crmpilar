/** Regras puras do Monitor ao Vivo das ligações da IA. */

/** Número que o ramal do atendente disca para escutar em silêncio a ligação do ramal da IA. */
export function numeroEscuta(codigo: string | null | undefined, ramalIa: string | null | undefined): string | null {
  const c = (codigo ?? "").trim();
  const r = (ramalIa ?? "").replace(/\D/g, "");
  if (!c || !r) return null;
  return `${c}${r}`;
}

/** Ligação da IA que ainda está acontecendo e pode ser escutada ou assumida. */
export function chamadaAoVivo(c: { status: string; modo: string; finalizada_em?: string | null }): boolean {
  return c.status === "em_andamento" && c.modo !== "assistir" && !c.finalizada_em;
}
