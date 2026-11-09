export type TipoCampo = "texto" | "produto" | "numero" | "opcoes";
export type ValorCampo = string | { id: string; nome: string } | null;
/** fixo = valor definido por quem cria o agente; senão, o usuário preenche (obrigatório) no disparo. */
export interface CampoAgente {
  id: string; rotulo: string; tipo: TipoCampo; fixo?: boolean; valor?: ValorCampo; opcoes?: string[];
  /** Legado: campos antigos do usuário. Campos do usuário agora são sempre obrigatórios. */
  obrigatorio?: boolean;
}

export const TIPOS_CAMPO: { id: TipoCampo; rotulo: string }[] = [
  { id: "texto", rotulo: "Texto livre" },
  { id: "produto", rotulo: "Produto do sistema" },
  { id: "numero", rotulo: "Número" },
  { id: "opcoes", rotulo: "Lista de opções" },
];

/** Lê todos os campos (inclusive os ainda sem rótulo, para edição). */
export function lerCampos(config: unknown): CampoAgente[] {
  const c = (config as any)?.campos;
  return Array.isArray(c) ? c.filter((x) => x && x.id) : [];
}
/** Campos válidos para usar no disparo (com rótulo). */
export const camposUsaveis = (config: unknown) => lerCampos(config).filter((c) => c.rotulo?.trim());

const texto = (v: ValorCampo | undefined) => (v == null ? "" : typeof v === "string" ? v.trim() : v.nome);
const valorDe = (c: CampoAgente, valores: Record<string, ValorCampo>) => (c.fixo ? c.valor : valores[c.id]);

/** Campos do usuário ainda sem resposta (todos são obrigatórios). */
export function camposPendentes(campos: CampoAgente[], valores: Record<string, ValorCampo>) {
  return campos.filter((c) => !c.fixo && !texto(valores[c.id]));
}

/** Transforma campos fixos e respostas do usuário em instruções para o agente. */
export function textoCampos(campos: CampoAgente[], valores: Record<string, ValorCampo>) {
  return campos.map((c) => [c.rotulo, texto(valorDe(c, valores))] as const)
    .filter(([, v]) => v).map(([r, v]) => `${r}: ${v}.`).join(" ");
}
