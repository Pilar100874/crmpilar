/**
 * Catálogo central da Ajuda global: explicações oficiais dos campos do sistema.
 * A busca casa pelo rótulo normalizado (e opcionalmente pela rota), então funciona
 * em qualquer tela sem precisar alterar os formulários. Campos fora do catálogo
 * são explicados pela IA a partir do contexto da tela.
 */
export interface AjudaCampo {
  rotulos: string[];          // rótulos (ou trechos) que identificam o campo
  rota?: string;              // trecho da rota onde vale (opcional)
  tela?: string;
  paraQue: string;
  seVazio?: string;
  exemplo?: string;
}

export const normalizar = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[*:?()]/g, " ").replace(/\s+/g, " ").trim();

/** Troca rótulos dinâmicos (datas, contadores) pelo nome do componente, para a ajuda explicar o papel e não o dado. */
export function rotuloCanonico(rotulo: string): string {
  const r = normalizar(rotulo);
  if (/^selecionar \d{1,2}\/\d{1,2}\/\d{2,4}$/.test(r) || /^\d{1,2}\/\d{1,2}(\/\d{2,4})?$/.test(r)) return "seletor de data da agenda";
  if (/^(hoje|seg|ter|qua|qui|sex|sab|dom)\w*\s*·?\s*\d{1,2}\s*\d*$/.test(r)) return "dia da barra da agenda";
  if (/^atrasados\s*\d*$/.test(r)) return "atrasados da agenda";
  if (/^gravacoes\s*\d*$/.test(r)) return "gravacoes";
  return rotulo;
}

export const CATALOGO_CAMPOS: AjudaCampo[] = [
  { rotulos: ["gravacoes"], tela: "Pilar Fone / Atendimento",
    paraQue: "Lista as ligações gravadas pelo Pilar Fone (áudio do seu microfone e do cliente) com data, número e duração, para ouvir de novo o que foi combinado. No Atendimento mostra só as gravações do cliente aberto.",
    seVazio: "Sem gravações, a lista aparece vazia; as ligações só são gravadas quando feitas pelo Pilar Fone.",
    exemplo: "Ouça a última ligação antes de retornar um orçamento para não pedir ao cliente que repita prazos e quantidades." },
  { rotulos: ["seletor de data da agenda", "dia da barra da agenda"], tela: "Minha agenda",
    paraQue: "Abre na área central as tarefas daquele dia em lista, com o número de contatos previstos, para você ver a carga de trabalho e escolher quem atender. O cliente aberto na fila continua o mesmo.",
    exemplo: "Clique em amanhã no fim do dia para ver se cabe mais um retorno antes de marcar com o cliente." },
  { rotulos: ["atrasados da agenda", "atrasados"], tela: "Minha agenda",
    paraQue: "Mostra as tarefas com data já vencida que ainda não foram concluídas. São clientes que ficaram sem contato no dia combinado.",
    exemplo: "Comece o dia por aqui: resolva ou reprograme os atrasados antes das tarefas de hoje." },
  { rotulos: ["abrir agenda de hoje"], tela: "Minha agenda",
    paraQue: "Volta a agenda para o dia de hoje no modo Dia, com as tarefas por horário." },
  { rotulos: ["telas de automacao", "painel no celular", "painel no tablet"], tela: "Cadastro de usuários",
    paraQue: "Define qual painel do módulo de Automação (luzes, portões, relés) abre direto quando o usuário entra pelo celular ou tablet.",
    seVazio: "O sistema escolhe automaticamente o painel padrão da automação.", exemplo: "Celular: \"Portaria\"; Tablet: \"Painel geral\"." },
  { rotulos: ["ramal para fazer ligacoes"], tela: "Cadastro de usuários",
    paraQue: "Ramal do PABX usado pelas ligações com IA disparadas por este usuário e como destino das transferências.",
    seVazio: "Os botões Ligação com IA, Ligar agora e Ouvir em silêncio ficam desativados para o usuário.", exemplo: "2050" },
  { rotulos: ["pode escutar ramais de outros usuarios"], tela: "Cadastro de usuários",
    paraQue: "Permite que o usuário escute em silêncio a ligação de qualquer outro usuário, escolhendo pelo nome na aba Chamadas → Ao vivo.",
    seVazio: "Desligado: o usuário só escuta as ligações da IA que ele mesmo disparou.", exemplo: "Ligue apenas para supervisores." },
  { rotulos: ["codigo de escuta silenciosa", "codigo de escuta"], tela: "Configuração PABX",
    paraQue: "Código do PABX que inicia a escuta sem o cliente perceber. O sistema disca esse código seguido do ramal.",
    seVazio: "Usa *54, o padrão do Grandstream UCM.", exemplo: "*54" },
  { rotulos: ["dados que o usuario preenche ao disparar"], tela: "Roteiros de voz",
    paraQue: "Escolhe quais informações (produto, condição, desconto, aviso) quem dispara a campanha precisa preencher. Elas entram nas falas como {produto}, {condicao}...",
    seVazio: "O disparo não pede nenhum dado extra.", exemplo: "Marque Produto e Desconto máximo para uma campanha promocional." },
  { rotulos: ["roteiro ativo"], tela: "Roteiros de voz",
    paraQue: "Quando ligado, o roteiro aparece na lista do Disparo em massa → Ligação com IA.",
    seVazio: "Desligado, o roteiro fica como rascunho e não pode ser disparado." },
  { rotulos: ["motivo da perda", "motivo"], rota: "orcamento", tela: "Orçamentos",
    paraQue: "Registra por que o pedido foi perdido; alimenta a tela Pedidos perdidos.",
    seVazio: "Obrigatório: o orçamento não pode ser marcado como perdido sem motivo." },
  { rotulos: ["marca"], rota: "produto", tela: "Produtos",
    paraQue: "Marca do produto, usada nos filtros de Pedidos perdidos e relatórios.", seVazio: "Obrigatório para salvar o produto." },
  { rotulos: ["proximo contato", "data do proximo contato"], tela: "Atendimento",
    paraQue: "Data em que o cliente volta para a fila do dia. Todo atendimento finalizado precisa de uma próxima data.",
    seVazio: "O atendimento fica como não finalizado e o cartão mostra aviso." },
  { rotulos: ["ouvir em silencio"], tela: "Agentes de voz → Chamadas",
    paraQue: "Escuta a ligação da IA sem o cliente perceber, para acompanhar a qualidade e decidir se precisa assumir.",
    seVazio: "Desativado se você não tiver ramal cadastrado no seu usuário: o PABX precisa do seu ramal para tocar a escuta." },
  { rotulos: ["assumir ligacao"], tela: "Agentes de voz → Chamadas",
    paraQue: "Tira a ligação da IA e passa para você: na próxima fala a IA se despede e transfere o cliente com o resumo da conversa." },
  { rotulos: ["ligacao com ia"], tela: "Disparo em massa",
    paraQue: "Liga para a lista de clientes, um por vez, usando um agente de voz e um roteiro; quando o cliente quer avançar, transfere para o seu ramal.",
    seVazio: "Indisponível sem ramal no seu usuário, porque a transferência não teria destino." },
  { rotulos: ["finalizar atendimento", "finalizar"], rota: "atendimento", tela: "Atendimento",
    paraQue: "Encerra o atendimento do cliente clicado e agenda o próximo contato, para ele voltar à fila na data certa.",
    seVazio: "Sem finalizar, o cartão fica marcado como não finalizado." },
  { rotulos: ["mudar status para"], tela: "Orçamentos no Atendimento",
    paraQue: "Move o orçamento no funil (enviado, negociação, ganho, perdido) sem sair do atendimento.",
    seVazio: "Ao escolher Perdido, é obrigatório informar o motivo, que alimenta a tela Pedidos perdidos." },
  { rotulos: ["roteiro inteligente", "inteligente"], rota: "voz", tela: "Disparo de ligação com IA",
    paraQue: "O sistema escolhe para cada cliente o roteiro e o produto mais adequados pelos dados dele, em vez de usar o mesmo para todos." },
  { rotulos: ["cartao do cliente na fila do dia"], tela: "Atendimento → Fila do dia",
    paraQue: "Cada cartão é um cliente da sua carteira que precisa de contato hoje: tarefa agendada, mensagem recebida ou potencial de compra. Clicar abre o atendimento dele no centro da tela; Histórico, Tarefa, Agenda e Orçamentos só aparecem quando existem registros.",
    seVazio: "Ao atender, finalize com a data do próximo contato; sem ela o cartão fica marcado como não finalizado. Cliente com pedido em aberto aparece todo dia até o pedido ser finalizado ou cancelado.",
    exemplo: "Comece pelos cartões com tarja vermelha (atrasados) e pelos recados urgentes, que piscam." },
];

export function buscarAjuda(rotulo: string, rota = ""): AjudaCampo | null {
  const r = normalizar(rotuloCanonico(rotulo));
  if (!r) return null;
  const rt = rota.toLowerCase();
  let melhor: { a: AjudaCampo; p: number } | null = null;
  for (const a of CATALOGO_CAMPOS) {
    if (a.rota && !rt.includes(a.rota)) continue;
    for (const x of a.rotulos) {
      const p = r === x ? 3 : r.startsWith(x) || x.startsWith(r) && r.length >= 6 ? 2 : r.includes(x) && x.length >= 8 ? 1 : 0;
      if (p && (!melhor || p > melhor.p)) melhor = { a, p };
    }
  }
  return melhor?.a ?? null;
}

export const textoOficial = (a: AjudaCampo | null) =>
  a ? [a.paraQue, a.seVazio && `Se ficar vazio: ${a.seVazio}`, a.exemplo && `Exemplo: ${a.exemplo}`].filter(Boolean).join("\n") : "";
