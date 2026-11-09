/**
 * Registros existentes por contato.
 *
 * Controla quais atalhos (Histórico, Tarefa, Agenda, Orçamentos) fazem sentido mostrar:
 * um contato recém-cadastrado ou importado ainda não tem nada para abrir, então o botão
 * que só exibiria uma lista vazia some da tela.
 */

export interface RegistrosContato {
  /** Tarefas de agenda do contato (qualquer status). */
  tarefas: number;
  /** Conversas de WhatsApp/chat do contato. */
  conversas: number;
  /** E-mails trocados com o contato. */
  emails: number;
  /** Orçamentos do contato. */
  orcamentos: number;
}

export const REGISTROS_VAZIOS: RegistrosContato = { tarefas: 0, conversas: 0, emails: 0, orcamentos: 0 };

export function totalRegistros(registros: RegistrosContato): number {
  return registros.tarefas + registros.conversas + registros.emails + registros.orcamentos;
}

/** Histórico: qualquer registro (tarefa, conversa, e-mail ou orçamento). */
export function possuiHistorico(registros?: RegistrosContato | null): boolean {
  return !!registros && totalRegistros(registros) > 0;
}

/** Atalho "Tarefa": abre a última tarefa do contato, então precisa existir tarefa. */
export function possuiTarefa(registros?: RegistrosContato | null): boolean {
  return !!registros && registros.tarefas > 0;
}

/** Atalho "Agenda": lista agendamentos e a sequência de tarefas do contato. */
export function possuiAgenda(registros?: RegistrosContato | null): boolean {
  return possuiTarefa(registros);
}

/** Atalho "Orçamentos": lista os orçamentos do contato. */
export function possuiOrcamento(registros?: RegistrosContato | null): boolean {
  return !!registros && registros.orcamentos > 0;
}

/** Endereços de um campo de e-mail, aceitando "Nome <a@b>" e listas separadas por vírgula/ponto e vírgula. */
export function extrairEnderecos(valor: string | null | undefined): string[] {
  return String(valor || "")
    .toLowerCase()
    .split(/[,;]/)
    .map((parte) => (parte.match(/<([^>]+)>/)?.[1] || parte).trim())
    .filter((endereco) => endereco.includes("@"));
}

export interface FontesRegistros {
  contatos: Array<{ id: string; email?: string | null }>;
  tarefas: Array<{ contact_id?: string | null }>;
  conversas: Array<{ customer_id?: string | null }>;
  emails: Array<{ from_email?: string | null; to_email?: string | null }>;
  orcamentos: Array<{ cliente_id?: string | null }>;
}

/**
 * Monta a contagem de registros de cada contato a partir das listas já carregadas
 * na tela. Nenhum contato entra no mapa sem existir na lista de contatos.
 */
export function montarRegistrosPorContato(fontes: FontesRegistros): Map<string, RegistrosContato> {
  const mapa = new Map<string, RegistrosContato>();
  const garantir = (id: string): RegistrosContato => {
    let atual = mapa.get(id);
    if (!atual) {
      atual = { ...REGISTROS_VAZIOS };
      mapa.set(id, atual);
    }
    return atual;
  };

  fontes.contatos.forEach((contato) => {
    if (contato?.id) garantir(contato.id);
  });
  fontes.tarefas.forEach((tarefa) => {
    if (tarefa?.contact_id) garantir(tarefa.contact_id).tarefas += 1;
  });
  fontes.conversas.forEach((conversa) => {
    if (conversa?.customer_id) garantir(conversa.customer_id).conversas += 1;
  });
  fontes.orcamentos.forEach((orcamento) => {
    if (orcamento?.cliente_id) garantir(orcamento.cliente_id).orcamentos += 1;
  });

  const contatoPorEndereco = new Map<string, string>();
  fontes.contatos.forEach((contato) => {
    const endereco = String(contato?.email || "").toLowerCase().trim();
    if (endereco) contatoPorEndereco.set(endereco, contato.id);
  });
  fontes.emails.forEach((email) => {
    const vistos = new Set<string>();
    [...extrairEnderecos(email?.from_email), ...extrairEnderecos(email?.to_email)].forEach((endereco) => {
      const contatoId = contatoPorEndereco.get(endereco);
      if (!contatoId || vistos.has(contatoId)) return;
      vistos.add(contatoId);
      garantir(contatoId).emails += 1;
    });
  });

  return mapa;
}
