export interface FiltroContato {
  type: "customer" | "empresa";
  id: string;
  email?: string;
}

export interface EscopoEmpresa {
  id: string;
  contatos: Set<string>;
  emails: Set<string>;
}

export function cartaoDoFiltro<T extends { id: string; contactId?: string | null }>(
  itens: T[], filtro: FiltroContato, empresa: EscopoEmpresa | null, contatoAtual?: string | null,
): T | undefined {
  if (filtro.type === "customer") return itens.find(item => item.contactId === filtro.id);
  if (empresa?.id !== filtro.id) return undefined;
  const vinculados = itens.filter(item => !!item.contactId && empresa.contatos.has(item.contactId));
  return vinculados.find(item => item.contactId === contatoAtual) ?? vinculados[0];
}

export function correspondeFiltroContato(
  contatoId: string | null | undefined,
  email: string | null | undefined,
  filtro: FiltroContato | null,
  empresa: EscopoEmpresa | null,
): boolean {
  if (!filtro) return true;
  if (filtro.type === "customer") {
    if (contatoId) return contatoId === filtro.id;
    return !!email && !!filtro.email && email.trim().toLowerCase() === filtro.email.trim().toLowerCase();
  }
  if (empresa?.id !== filtro.id) return false;
  if (contatoId) return empresa.contatos.has(contatoId);
  return !!email && empresa.emails.has(email.trim().toLowerCase());
}