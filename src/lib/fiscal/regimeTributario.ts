export const REGIMES_TRIBUTARIOS = [
  { valor: "simples_nacional", rotulo: "Simples Nacional" },
  { valor: "mei", rotulo: "Simples Nacional - MEI" },
  { valor: "lucro_presumido", rotulo: "Lucro Presumido" },
  { valor: "lucro_real", rotulo: "Lucro Real" },
] as const;

export type RegimeTributario = (typeof REGIMES_TRIBUTARIOS)[number]["valor"];

/** Converte textos livres (consulta de CNPJ, dados antigos) para um regime padronizado. */
export function normalizarRegime(texto?: string | null): RegimeTributario | "" {
  const t = (texto || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  if (!t) return "";
  if (REGIMES_TRIBUTARIOS.some((r) => r.valor === t)) return t as RegimeTributario;
  if (t.includes("mei") || t.includes("simei")) return "mei";
  if (t.includes("simples")) return "simples_nacional";
  if (t.includes("real") && !t.includes("presumido")) return "lucro_real";
  if (t.includes("presumido")) return "lucro_presumido";
  return "";
}

export function rotuloRegime(valor?: string | null): string {
  return REGIMES_TRIBUTARIOS.find((r) => r.valor === normalizarRegime(valor))?.rotulo || "Não informado";
}

/** Situação da validade do certificado digital. */
export function situacaoCertificado(validoAte?: string | null, hoje = new Date()): "sem" | "vencido" | "vencendo" | "valido" {
  if (!validoAte) return "sem";
  const dias = (new Date(validoAte).getTime() - hoje.getTime()) / 86400000;
  if (dias < 0) return "vencido";
  if (dias <= 30) return "vencendo";
  return "valido";
}
