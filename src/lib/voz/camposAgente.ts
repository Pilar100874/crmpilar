export type TipoCampo = "texto" | "produto" | "numero" | "opcoes";
export interface CampoAgente { id: string; rotulo: string; tipo: TipoCampo; obrigatorio: boolean; opcoes?: string[]; dica?: string }
export type ValorCampo = string | { id: string; nome: string } | null;

export const TIPOS_CAMPO: { id: TipoCampo; rotulo: string }[] = [
  { id: "texto", rotulo: "Texto livre" },
  { id: "produto", rotulo: "Produto do sistema" },
  { id: "numero", rotulo: "Número" },
  { id: "opcoes", rotulo: "Lista de opções" },
];

export function lerCampos(config: unknown): CampoAgente[] {
  const c = (config as any)?.campos;
  return Array.isArray(c) ? c.filter((x) => x && x.id && x.rotulo) : [];
}

const texto = (v: ValorCampo) => (v == null ? "" : typeof v === "string" ? v.trim() : v.nome);

/** Campos obrigatórios ainda sem resposta. */
export function camposPendentes(campos: CampoAgente[], valores: Record<string, ValorCampo>) {
  return campos.filter((c) => c.obrigatorio && !texto(valores[c.id] ?? null));
}

/** Transforma as respostas do formulário em instruções para o agente. */
export function textoCampos(campos: CampoAgente[], valores: Record<string, ValorCampo>) {
  return campos.map((c) => [c.rotulo, texto(valores[c.id] ?? null)] as const)
    .filter(([, v]) => v).map(([r, v]) => `${r}: ${v}.`).join(" ");
}
