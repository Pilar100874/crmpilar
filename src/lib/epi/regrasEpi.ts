// Regras de EPI (NR-6): prazo de troca pela vida útil, CA vencido e estoque mínimo.
export const MOTIVOS_ENTREGA: Record<string, string> = {
  primeira_entrega: "Primeira entrega",
  substituicao: "Substituição (vida útil)",
  desgaste: "Desgaste / dano",
  perda: "Perda / extravio",
  tamanho: "Troca de tamanho",
};

export const CATEGORIAS_EPI = [
  "Proteção da cabeça", "Proteção dos olhos e face", "Proteção auditiva",
  "Proteção respiratória", "Proteção das mãos", "Proteção dos pés",
  "Proteção do corpo", "Proteção contra quedas",
];

const dia = 86_400_000;
const paraData = (s: string) => new Date(`${s}T00:00:00`);
const iso = (d: Date) => d.toISOString().slice(0, 10);

export function trocaPrevista(dataEntrega: string, vidaUtilDias?: number | null): string | null {
  if (!vidaUtilDias || vidaUtilDias <= 0) return null;
  return iso(new Date(paraData(dataEntrega).getTime() + vidaUtilDias * dia));
}

export type SituacaoEntrega = "devolvido" | "vencida" | "vence_em_breve" | "em_uso";

export function situacaoEntrega(
  e: { troca_prevista: string | null; data_devolucao: string | null },
  hoje: string,
  avisoDias = 15,
): SituacaoEntrega {
  if (e.data_devolucao) return "devolvido";
  if (!e.troca_prevista) return "em_uso";
  const diff = (paraData(e.troca_prevista).getTime() - paraData(hoje).getTime()) / dia;
  if (diff < 0) return "vencida";
  if (diff <= avisoDias) return "vence_em_breve";
  return "em_uso";
}

export function caVencido(caValidade: string | null | undefined, hoje: string, validadeIndeterminada = false): boolean {
  if (validadeIndeterminada) return false;
  return !!caValidade && caValidade < hoje;
}

export function estoqueBaixo(i: { estoque: number; estoque_minimo: number }): boolean {
  return i.estoque_minimo > 0 && i.estoque <= i.estoque_minimo;
}

/** Bloqueios antes de registrar uma entrega. */
export function validarEntrega(
  epi: { ca_numero: string | null; ca_validade: string | null; ca_validade_indeterminada?: boolean; estoque: number },
  quantidade: number,
  hoje: string,
): string | null {
  if (quantidade <= 0) return "Informe a quantidade.";
  if (!epi.ca_numero) return "EPI sem Certificado de Aprovação (CA) cadastrado.";
  if (caVencido(epi.ca_validade, hoje, epi.ca_validade_indeterminada)) return "O CA deste EPI está vencido.";
  if (epi.estoque < quantidade) return "Estoque insuficiente.";
  return null;
}

/** EPIs exigidos pelo setor que o funcionário não tem em uso (sem devolução e com troca não vencida). */
export function episFaltantes(
  exigidos: { epi_id: string; quantidade: number }[],
  entregasFuncionario: { epi_id: string; quantidade: number; data_devolucao: string | null; troca_prevista: string | null }[],
  hoje: string,
): { epi_id: string; falta: number }[] {
  return exigidos
    .map((x) => {
      const emUso = entregasFuncionario
        .filter((e) => e.epi_id === x.epi_id && !e.data_devolucao && (!e.troca_prevista || e.troca_prevista >= hoje))
        .reduce((s, e) => s + e.quantidade, 0);
      return { epi_id: x.epi_id, falta: Math.max(0, x.quantidade - emUso) };
    })
    .filter((x) => x.falta > 0);
}
