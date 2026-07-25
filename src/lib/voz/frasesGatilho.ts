// Frases (aliases) que disparam ações do Assistente de Voz "Pilar".
// Cada grupo tem um conjunto padrão (embutido no sistema) e pode ser
// estendido/editado/reduzido pelo usuário via tela de configuração.
// Os overrides ficam em assistente_voz_config.frases_customizadas (JSONB):
//   { voltar: string[], "voltar:removidos": string[], ... }
//   Para rotas: { "rota:/x": string[], "rota:/x:removidos": string[] }

import type { RotaSistema } from "@/lib/voz/rotasSistema";

export type FraseGrupoId = "voltar" | "avancar" | "pdf" | "relatorios";

export const GRUPOS_FRASES: {
  id: FraseGrupoId;
  titulo: string;
  descricao: string;
  exemplo: string;
}[] = [
  {
    id: "voltar",
    titulo: "Voltar (tela anterior)",
    descricao: "Frases que navegam para a tela anterior no histórico.",
    exemplo: "voltar",
  },
  {
    id: "avancar",
    titulo: "Avançar (tela posterior)",
    descricao: "Frases que navegam para a próxima tela no histórico.",
    exemplo: "avançar",
  },
  {
    id: "pdf",
    titulo: "Gerar PDF do relatório",
    descricao: "Frases que exportam o relatório aberto como PDF.",
    exemplo: "gerar pdf",
  },
  {
    id: "relatorios",
    titulo: "Abrir lista de relatórios",
    descricao: "Frases que abrem o menu de relatórios cadastrados por voz.",
    exemplo: "meus relatórios",
  },
];

export const FRASES_PADRAO: Record<FraseGrupoId, string[]> = {
  voltar: [
    "voltar", "volta", "voltar tela", "voltar para tela anterior",
    "voltar para a tela anterior", "ir para tela anterior",
    "ir para a tela anterior", "tela anterior", "pagina anterior",
    "página anterior", "voltar pagina", "voltar página",
    "voltar para pagina anterior", "voltar para página anterior",
    "voltar uma tela", "voltar uma pagina", "voltar uma página",
    "retornar", "retornar tela", "retornar para tela anterior",
    "retornar para a tela anterior", "ir para trás", "voltar atrás",
  ],
  avancar: [
    "avancar", "avançar", "avanca", "avança", "proxima tela", "próxima tela",
    "próxima página", "proxima pagina", "tela posterior",
    "voltar para tela posterior", "ir para tela posterior",
    "ir para a tela posterior", "pagina posterior", "página posterior",
    "ir para frente", "avancar tela", "avançar tela",
    "avançar uma tela", "avançar uma pagina", "avançar uma página",
    "ir para próxima tela", "ir para proxima tela", "ir para próxima página",
    "ir para proxima pagina", "tela seguinte", "pagina seguinte",
    "página seguinte", "passar tela", "passar pagina", "passar página",
    "passar para frente", "seguir em frente", "seguir tela",
  ],
  pdf: [
    "gerar pdf", "gerar pdf do relatorio", "gerar pdf do relatório",
    "exportar pdf", "baixar pdf", "salvar pdf", "pdf",
  ],
  relatorios: [
    "relatorios", "relatorio", "meus relatorios", "lista de relatorios",
    "menu de relatorios", "mostrar relatorios", "ver relatorios",
    "abrir relatorios",
  ],
};

export const norm = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

function mergeAliases(padrao: string[], extras: string[], removidos: string[]): string[] {
  const rm = new Set(removidos.map(norm));
  const out = new Map<string, string>();
  for (const f of [...padrao, ...extras]) {
    const k = norm(f);
    if (!k || rm.has(k)) continue;
    if (!out.has(k)) out.set(k, f);
  }
  return Array.from(out.values());
}

/** Retorna a lista final (padrão + customizadas – removidas) sem duplicatas. */
export function frasesEfetivas(
  grupo: FraseGrupoId,
  customizadas?: Record<string, string[]> | null,
): string[] {
  const extras = Array.isArray(customizadas?.[grupo]) ? customizadas![grupo] : [];
  const removidos = Array.isArray(customizadas?.[`${grupo}:removidos`])
    ? customizadas![`${grupo}:removidos`]
    : [];
  return mergeAliases(FRASES_PADRAO[grupo], extras, removidos);
}

export function aliasesEfetivosRota(
  rota: RotaSistema,
  customizadas?: Record<string, string[]> | null,
): string[] {
  const extras = Array.isArray(customizadas?.[`rota:${rota.path}`])
    ? customizadas![`rota:${rota.path}`]
    : [];
  const removidos = Array.isArray(customizadas?.[`rota:${rota.path}:removidos`])
    ? customizadas![`rota:${rota.path}:removidos`]
    : [];
  return mergeAliases(rota.aliases || [], extras, removidos);
}

/** Retorna o título efetivo da rota — customizado pelo usuário ou o original. */
export function tituloEfetivoRota(
  rota: RotaSistema,
  customizadas?: Record<string, string[]> | null,
): { titulo: string; original: string; customizado: boolean } {
  const custom = customizadas?.[`rota:${rota.path}:titulo`];
  const primeiro = Array.isArray(custom) ? (custom[0] || "").trim() : "";
  if (primeiro) return { titulo: primeiro, original: rota.titulo, customizado: true };
  return { titulo: rota.titulo, original: rota.titulo, customizado: false };
}

/** Clona a lista de rotas aplicando aliases e título customizados por rota.
 *  Ao renomear o título, o título original é preservado como apelido. */
export function rotasEfetivas(
  rotas: RotaSistema[],
  customizadas?: Record<string, string[]> | null,
): RotaSistema[] {
  if (!customizadas) return rotas;
  return rotas.map((r) => {
    const aliases = aliasesEfetivosRota(r, customizadas);
    const { titulo, original, customizado } = tituloEfetivoRota(r, customizadas);
    const aliasesFinais = customizado
      ? Array.from(new Set([original, ...aliases]))
      : aliases;
    return { ...r, titulo, aliases: aliasesFinais };
  });
}
