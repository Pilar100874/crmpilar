// Frases (aliases) que disparam ações do Assistente de Voz "Pilar".
// Cada grupo tem um conjunto padrão (embutido no sistema) e pode ser
// estendido pelo usuário via tela de configuração — os extras ficam
// armazenados em assistente_voz_config.frases_customizadas (JSONB).

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

const norm = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

/** Retorna a lista final (padrão + customizadas do usuário) sem duplicatas. */
export function frasesEfetivas(
  grupo: FraseGrupoId,
  customizadas?: Record<string, string[]> | null,
): string[] {
  const extras = Array.isArray(customizadas?.[grupo]) ? customizadas![grupo] : [];
  const set = new Map<string, string>();
  for (const f of [...FRASES_PADRAO[grupo], ...extras]) {
    const k = norm(f);
    if (k && !set.has(k)) set.set(k, f);
  }
  return Array.from(set.values());
}
