/**
 * Catálogo central dos recursos do Atendimento.
 * Fonte única para o Tutorial do atendente e para as Simulações do administrador:
 * todo recurso novo do Atendimento deve ganhar uma entrada aqui.
 */
import { contatoDaBarraFinalizacao, itemNaoFinalizado } from "./barraFinalizacao";
import { calcularPotenciais, CONFIG_PADRAO, mensagemSugerida, type OrcPotencial } from "./potenciais";
import { classificarUrgencia, planejarRegua, proximoDaFila, SELO_CREDITO } from "./copilotoAtendimento";
import { origemDoCanalMassa } from "./prazosProximoContato";
import { substituirVariaveis } from "@/components/envio-massa/emailMensagem";
import { ganchosPotenciais } from "@/lib/voz/publicoInteligente";

const DIA = 86_400_000;

export interface PassoSimulacao { descricao: string; ok: boolean; detalhe?: string }

export interface RecursoAtendimento {
  id: string;
  titulo: string;
  /** O que o recurso faz, em linguagem do atendente. */
  oQueE: string;
  /** Regra de negócio: por que a empresa trabalha assim. */
  regraNegocio: string;
  /** Como usar na tela, passo a passo. */
  comoUsar: string[];
  /** Elemento da tela destacado no tutorial (atributo data-tour). */
  alvo?: string;
  /** Simulação em memória: não envia mensagens nem grava dados. */
  simular: () => PassoSimulacao[];
}

const passo = (descricao: string, ok: boolean, detalhe?: string): PassoSimulacao => ({ descricao, ok, detalhe });
const iso = (diasAtras: number, hoje: number) => new Date(hoje - diasAtras * DIA).toISOString();

export const CATALOGO_ATENDIMENTO: RecursoAtendimento[] = [
  {
    id: "fila",
    titulo: "Fila de contatos e abas",
    oQueE: "Lista quem você deve atender hoje, separada em Tudo, Agendados, Recebidos e Potenciais.",
    regraNegocio: "Agendados são compromissos já marcados; Recebidos são clientes esperando resposta; Potenciais são oportunidades calculadas pelo sistema. Separar ajuda a atender primeiro quem já está esperando.",
    comoUsar: ["Escolha uma aba no topo da lista.", "Use os ícones de canal para filtrar por WhatsApp, e-mail ou telefone.", "Clique no cartão para abrir o cliente; ele fica destacado enquanto estiver aberto."],
    alvo: "fila-abas",
    simular: () => {
      const lista = [{ id: "a" }, { id: "b" }, { id: "c" }];
      const p1 = proximoDaFila(lista, "a");
      const p2 = proximoDaFila(lista, null);
      return [
        passo("Botão Próximo cliente avança para o seguinte da fila", p1?.id === "b", `Atual A → ${p1?.id?.toUpperCase() ?? "nenhum"}`),
        passo("Sem cliente aberto, começa pelo primeiro", p2?.id === "a"),
        passo("Nunca devolve o próprio cliente aberto", proximoDaFila([{ id: "a" }], "a") === null),
      ];
    },
  },
  {
    id: "finalizacao",
    titulo: "Finalização obrigatória do atendimento",
    oQueE: "Todo atendimento iniciado precisa terminar com a data do próximo contato ou com o cliente inativado.",
    regraNegocio: "Nenhum cliente pode ficar sem próximo contato: assim a carteira não esfria e o cliente não compra do concorrente por falta de retorno.",
    comoUsar: ["Atenda o cliente normalmente.", "Ao trocar de contato sem finalizar, o cartão fica com aviso de pendência.", "Clique de novo no cartão para reabrir a barra e finalize com a próxima data.", "Use o filtro Não finalizados para ver todas as pendências."],
    alvo: "fila-nao-finalizados",
    simular: () => {
      const pend = ["joao", "maria"];
      return [
        passo("A barra abre só para o cartão clicado", contatoDaBarraFinalizacao("joao", "joao", pend) === "joao"),
        passo("Trocar de contato esconde a barra do anterior", contatoDaBarraFinalizacao("joao", "maria", pend) === null),
        passo("Sem clique no cartão, nenhuma pendência é aberta", contatoDaBarraFinalizacao(null, "joao", pend) === null),
        passo("Filtro Não finalizados mantém quem tem pendência", itemNaoFinalizado("maria", pend)),
        passo("Contato finalizado sai do filtro", !itemNaoFinalizado("pedro", pend)),
      ];
    },
  },
  {
    id: "potenciais",
    titulo: "Clientes potenciais",
    oQueE: "O sistema sugere clientes com chance de compra e sempre mostra o motivo.",
    regraNegocio: "Quem compra a cada X dias, tem orçamento parado, parou de comprar ou caiu de volume precisa ser procurado antes do concorrente. Nada vira tarefa sozinho: você decide.",
    comoUsar: ["Abra a aba Potenciais.", "Leia o motivo no cartão.", "No menu ⋮ do cartão: copie a mensagem sugerida, agende retorno ou marque Sem interesse agora.", "As regras ficam no menu ⋮ ao lado de Contatos → Regras de clientes potenciais."],
    alvo: "fila-abas",
    simular: () => {
      const hoje = Date.now();
      const orcs: OrcPotencial[] = [
        { clienteId: "orc", etapa: "orcamento", criado: iso(5, hoje), valor: 1500, itens: [] },
        { clienteId: "ina", etapa: "finalizado", criado: iso(90, hoje), valor: 300, itens: [] },
        { clienteId: "ina", etapa: "finalizado", criado: iso(120, hoje), valor: 300, itens: [] },
      ];
      const r = calcularPotenciais(orcs, CONFIG_PADRAO, hoje);
      const orc = r.find((p) => p.clienteId === "orc");
      const ina = r.find((p) => p.clienteId === "ina");
      const bloq = calcularPotenciais(orcs, CONFIG_PADRAO, hoje, new Set(["orc"]));
      return [
        passo("Orçamento aberto há 5 dias vira potencial", orc?.tipo === "orcamento", orc?.motivo),
        passo("Cliente sem comprar há 90 dias vira inativo", ina?.tipo === "inativo", ina?.motivo),
        passo("Cliente com tarefa pendente não aparece", !bloq.some((p) => p.clienteId === "orc")),
        passo("Mensagem sugerida usa o nome do cliente", !!orc && mensagemSugerida(orc, "Ana").includes("Ana")),
      ];
    },
  },
  {
    id: "urgencia",
    titulo: "Urgência das mensagens recebidas",
    oQueE: "Mensagens recebidas ganham um selo: Reclamação, Cotação ou Dúvida.",
    regraNegocio: "Reclamação é atendida primeiro para não perder o cliente; cotação logo depois, porque é venda na mesa.",
    comoUsar: ["Veja o selo colorido no cartão da aba Recebidos.", "Ordene por Prioridade para que as urgentes subam."],
    alvo: "fila-abas",
    simular: () => [
      passo("\"Produto chegou quebrado\" é reclamação", classificarUrgencia("O produto chegou quebrado") === "reclamacao"),
      passo("\"Quero um orçamento\" é cotação", classificarUrgencia("Quero um orçamento de papel") === "cotacao"),
      passo("Reclamação vence cotação na mesma mensagem", classificarUrgencia("Orçamento veio errado, péssimo atendimento") === "reclamacao"),
      passo("Mensagem vazia não recebe selo", classificarUrgencia("") === null),
    ],
  },
  {
    id: "credito",
    titulo: "Selo de crédito",
    oQueE: "O cartão mostra se o cliente está liberado, com boleto a vencer ou bloqueado no financeiro.",
    regraNegocio: "Evita perder tempo negociando com quem está bloqueado antes de falar com o financeiro.",
    comoUsar: ["No menu ⋮ do cartão, escolha Situação de crédito.", "O selo aparece para toda a equipe."],
    simular: () => [
      passo("Existem as situações Liberado, A vencer e Bloqueado", ["liberado", "a_vencer", "bloqueado"].every((k) => k in SELO_CREDITO)),
    ],
  },
  {
    id: "regua",
    titulo: "Régua de follow-up de orçamentos",
    oQueE: "Orçamento sem resposta gera tarefa de cobrança: D+2 por WhatsApp e D+5 por e-mail.",
    regraNegocio: "Ninguém precisa lembrar de cobrar proposta. O sistema só cria a tarefa com a mensagem pronta; nenhuma mensagem sai sem você.",
    comoUsar: ["As tarefas aparecem em Agendados com o motivo.", "Se o cliente responder, a régua para."],
    simular: () => {
      const hoje = Date.now();
      const o = (id: string, dias: number) => ({ id, clienteId: id, etapa: "orcamento", enviado: iso(dias, hoje), valor: 1000 });
      const r = planejarRegua([o("d2", 2), o("d5", 6), o("resp", 3)], hoje, new Map([["resp", hoje]]), new Set());
      return [
        passo("2 dias sem resposta → tarefa de WhatsApp", r.some((p) => p.orcamentoId === "d2" && p.canal === "whatsapp")),
        passo("5 dias sem resposta → tarefa de e-mail", r.some((p) => p.orcamentoId === "d5" && p.canal === "email")),
        passo("Cliente que respondeu sai da régua", !r.some((p) => p.orcamentoId === "resp")),
      ];
    },
  },
  {
    id: "disparo",
    titulo: "Disparo em massa",
    oQueE: "Envia WhatsApp, e-mail, ligação ou ligação com IA para vários clientes de uma vez.",
    regraNegocio: "Todo cliente que recebe o disparo já ganha a data do próximo contato, e quem recebeu algo nos últimos dias não recebe de novo por outro canal.",
    comoUsar: ["Clique em Disparo em massa e escolha o canal.", "Selecione os clientes (a aba Potenciais traz o motivo).", "Use variáveis como {{contato}}, {{motivo}} e {{produto}}.", "Acompanhe o envio um a um e cancele se precisar."],
    alvo: "fila-disparo",
    simular: () => {
      ganchosPotenciais.set("sim-1", { tipo: "recompra", motivo: "Compra a cada 20 dias", produto: "Papel toalha" } as any);
      const texto = substituirVariaveis("Olá {{contato}}, {{motivo}} — {{produto}}", { id: "sim-1", nome: "Ana", telefone: null, email: null });
      ganchosPotenciais.delete("sim-1");
      return [
        passo("Variáveis são trocadas pelos dados do cliente", texto === "Olá Ana, Compra a cada 20 dias — Papel toalha", texto),
        passo("Canal e-mail usa o prazo de e-mail", origemDoCanalMassa("email") === "massa_email"),
        passo("Canal WhatsApp usa o prazo de WhatsApp", origemDoCanalMassa("whatsapp") === "massa_whatsapp"),
      ];
    },
  },
  {
    id: "configuracoes",
    titulo: "Menu ⋮ ao lado de Contatos",
    oQueE: "Reúne as definições da tela: datas dos próximos contatos, regras de potenciais, automações, bot de atendimento e assumir contatos de colegas.",
    regraNegocio: "Cada empresa ajusta prazos e regras ao seu jeito de vender, sem depender de suporte.",
    comoUsar: ["Clique nos 3 pontinhos ao lado de Contatos.", "Escolha a definição e salve."],
    alvo: "fila-menu",
    simular: () => [passo("Prazos e regras padrão estão disponíveis", CONFIG_PADRAO.protecao.limite > 0)],
  },
];

export interface ResultadoSimulacao { recurso: RecursoAtendimento; passos: PassoSimulacao[]; ok: boolean; ms: number }

export function simularRecurso(r: RecursoAtendimento): ResultadoSimulacao {
  const t0 = performance.now();
  let passos: PassoSimulacao[];
  try { passos = r.simular(); }
  catch (e) { passos = [passo("Erro ao simular", false, e instanceof Error ? e.message : String(e))]; }
  return { recurso: r, passos, ok: passos.length > 0 && passos.every((p) => p.ok), ms: Math.round(performance.now() - t0) };
}
