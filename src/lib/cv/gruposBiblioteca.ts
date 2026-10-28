export const GRUPOS_BIBLIOTECA = [
  "Motor", "Freios", "Pneus e Rodas", "Direção e Suspensão",
  "Elétrica e Iluminação", "Fluidos", "Carroceria e Cabine",
  "Documentação", "Segurança", "Carga", "Transmissão", "Geral",
] as const;

export function normalizarGrupo(grupo: string): string {
  const equivalencias: Record<string, string> = {
    Pneus: "Pneus e Rodas", Rodas: "Pneus e Rodas", Direção: "Direção e Suspensão",
    Suspensão: "Direção e Suspensão", Elétrica: "Elétrica e Iluminação", Iluminação: "Elétrica e Iluminação",
    Arrefecimento: "Fluidos", Cabine: "Carroceria e Cabine", Chassi: "Carroceria e Cabine",
    Conservação: "Carroceria e Cabine", Documentos: "Documentação",
  };
  return equivalencias[grupo] ?? grupo;
}

export interface UsoChecklist {
  uso_manutencao: boolean;
  checklist_responsaveis: string[];
  checklist_selecionados: string[];
  checklist_tipos: string[];
}

/** A seleção do formulário nunca pode promover um item a manutenção. */
export function selecionarResponsavel(item: UsoChecklist, responsavel: string, selecionado: boolean): string[] {
  if (!item.checklist_responsaveis.includes(responsavel)) return item.checklist_selecionados;
  return selecionado
    ? Array.from(new Set([...item.checklist_selecionados, responsavel]))
    : item.checklist_selecionados.filter(r => r !== responsavel);
}

export function disponivelNoChecklist(item: UsoChecklist & { ativo: boolean; sistema: string }, responsavel: string, grupo: string, tipo: string): boolean {
  return item.ativo && item.checklist_responsaveis.includes(responsavel)
    && (grupo === "todos" || normalizarGrupo(item.sistema) === grupo)
    && (tipo === "todos" || !item.checklist_tipos.length || item.checklist_tipos.includes(tipo));
}