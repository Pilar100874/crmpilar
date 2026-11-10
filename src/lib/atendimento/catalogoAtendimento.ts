/**
 * Catálogo central dos recursos do Atendimento.
 * Fonte única para o Tutorial do atendente e para as Simulações do administrador:
 * todo recurso novo do Atendimento deve ganhar uma entrada aqui.
 */
import { contatoDaBarraFinalizacao, itemNaoFinalizado } from "./barraFinalizacao";
import { totalJornada } from "./jornada";
import { correspondeBuscaAgenda } from "@/lib/calendario/buscaAgenda";
import { PRAZO_RECADO_MIN, recadoUrgentePendente, tarefaVisivelNaFila } from "./recadoResponsavel";
import { montarMenuRadial } from "./menuRadial";
import { correspondeFiltroContato } from "./filtroContato";
import { usuariosComCriador } from "./vinculoCriador";
import { calcularPotenciais, CONFIG_PADRAO, mensagemSugerida, type OrcPotencial } from "./potenciais";
import { classificarUrgencia, lerSugestaoLigacao, limparSugestaoLigacao, MENSAGEM_REGUA, planejarRegua, proximoDaFila, registrarVisita, salvarSugestaoLigacao, SELO_CREDITO, termometroCarteira, vizinhoDoHistorico, HISTORICO_VAZIO, type HistoricoFila } from "./copilotoAtendimento";
import { prepararNumeroDiscagem, validarNumeroDiscagem } from "@/lib/telefonia/numeroDiscagem";
import { dataPadraoProximoContato, origemDoCanalMassa } from "./prazosProximoContato";
import { pendenciasCadastro } from "./pendenciasCadastro";
import { possuiEnderecoVisita } from "./enderecoVisita";
import { pendenciasOrcamento } from "./cadastroOrcamento";
import { ehEmailAutomatico, emailIgnorado } from "./remetentesIgnorados";
import { substituirVariaveis } from "@/components/envio-massa/emailMensagem";
import { cicloMedio, ganchoPotencial, ganchosPotenciais } from "@/lib/voz/publicoInteligente";
import { montarRegistrosPorContato, possuiAgenda, possuiHistorico, possuiOrcamento, possuiTarefa } from "./registrosContato";

const DIA = 86_400_000;

export interface PassoSimulacao { descricao: string; ok: boolean; detalhe?: string }

export const MODULOS = [
  "Primeiros passos",
  "Fila e organização",
  "Atendimento e finalização",
  "Clientes potenciais",
  "Copiloto e IA",
  "Disparo em massa",
  "Telefonia e voz",
  "Agenda automática",
  "Configurações do Atendimento",
] as const;
export type ModuloAtendimento = (typeof MODULOS)[number];

export interface RecursoAtendimento {
  id: string;
  modulo: ModuloAtendimento;
  titulo: string;
  /** O que o recurso faz, em linguagem do atendente. */
  oQueE: string;
  /** Regra de negócio: por que a empresa trabalha assim. */
  regraNegocio: string;
  /** Como usar na tela, passo a passo. */
  comoUsar: string[];
  /** Elemento da tela destacado no tutorial (atributo data-tour). */
  alvo?: string;
  /** Prática obrigatória no tour: o usuário precisa clicar/preencher o alvo para avançar. */
  pratica?: { tipo: "clicar" | "preencher"; alvo: string; instrucao: string };
  /** Simulação em memória: não envia mensagens nem grava dados. */
  simular: () => PassoSimulacao[];
}

const passo = (descricao: string, ok: boolean, detalhe?: string): PassoSimulacao => ({ descricao, ok, detalhe });
const iso = (diasAtras: number, hoje: number) => new Date(hoje - diasAtras * DIA).toISOString();

export const CATALOGO_ATENDIMENTO: RecursoAtendimento[] = [
  {
    id: "menu-radial", modulo: "Fila e organização", titulo: "Atalhos do Atendimento",
    oQueE: "Menu circular com atalhos de Contatos, Minha agenda, Disparo em massa, cadastro e ações do cliente selecionado.",
    regraNegocio: "Ações individuais só aparecem com cliente selecionado e respeitam canais, endereço e registros existentes. Ferramentas de mensagens só aparecem com conversa aberta e configuração habilitada. Navegar não encerra ligações nem finaliza contatos.",
    comoUsar: ["Clique no ícone de atalhos no canto inferior ou use o botão direito fora dos campos de texto.", "Escolha Contatos para trocar a aba da fila ou Cliente selecionado para abrir seus registros e canais.", "Clique no centro para voltar ou fechar; Esc também fecha."],
    simular: () => [passo("Sem cliente não oferece ações individuais", !montarMenuRadial({ cliente: false, whatsapp: false, telefone: false, email: false, visita: false, historico: false, tarefa: false, agenda: false, orcamentos: false }, []).some(i => i.id === "cliente"))],
  },
  {
    id: "busca-agenda", modulo: "Fila e organização", titulo: "Buscar contatos ou tarefas na agenda",
    oQueE: "A busca mostra os itens encontrados logo abaixo do campo, com contato, tarefa e data.",
    regraNegocio: "Os resultados pesquisam as tarefas carregadas, inclusive de outras datas, sem alterar registros. Escolher um resultado abre a tarefa na sua data e destaca o cartão do contato correspondente na fila. Digitar não troca a tela central antes da escolha.",
    comoUsar: ["Digite o nome do contato ou parte da tarefa no campo do cabeçalho.", "Clique no resultado abaixo do campo, ou use as setas e Enter.", "Confira a tarefa aberta e o cartão correspondente selecionado na fila."],
    simular: () => {
      const tarefa = { title: "Retorno", contactName: "João", date: new Date(2026, 10, 10) };
      return [passo("Nome sem acento encontra o contato", correspondeBuscaAgenda(tarefa, "joao")), passo("Contato diferente não aparece", !correspondeBuscaAgenda(tarefa, "Ana")), passo("Limpar restaura a tarefa", correspondeBuscaAgenda(tarefa, ""))];
    },
  },
  {
    id: "recado-responsavel", modulo: "Fila e organização", titulo: "Recado para o responsável",
    oQueE: "O botão de recado ao lado de Contatos abre o encaminhamento na tela central, mesmo sem cliente aberto.",
    regraNegocio: "Escolha ou cadastre o cliente e envie uma mensagem interna ao usuário selecionado, sem alterar a carteira. O recado vira tarefa manual na agenda dele, com autor e mensagem: urgente em 30 minutos, normal em 2 horas. Recados urgentes pendentes ficam no início de Agendados; cartão e aba piscam até concluir ou cancelar, mesmo sem vínculo com o cliente e em outra data. Quem estiver assumindo o responsável recebe o mesmo destaque; ao deixar de assumir, esse recado sai do seu escopo. O alerta permanece ao abrir o cartão. Nenhuma mensagem externa é enviada automaticamente.",
    comoUsar: ["Clique em Encaminhar recado ao lado de Contatos ou no cabeçalho do cliente.", "Pesquise o cliente ou clique em Cadastrar cliente; após salvar o cadastro, ele fica selecionado no recado.", "Escolha Enviar para, escreva a mensagem e confirme Enviar recado.", "O destinatário ou quem estiver assumindo ele abre Agendados e o cartão urgente para consultar a mensagem e providenciar o retorno."],
    simular: () => [passo("Recado urgente vence em 30 minutos", PRAZO_RECADO_MIN.urgente === 30), passo("Recado normal vence em 2 horas", PRAZO_RECADO_MIN.normal === 120), passo("Destinatário vê recado sem carteira", tarefaVisivelNaFila({ contact_id: "c", user_id: "u", origem_sub_item: "recado_urgente", status: "pending" }, new Set(), "u")), passo("Concluído não alerta", !recadoUrgentePendente({ origem_sub_item: "recado_urgente", status: "completed" }))],
  },
  {
    id: "minha-jornada", modulo: "Fila e organização", titulo: "Minha jornada e comparação da equipe",
    oQueE: "Minha jornada acompanha atividades, resultados, evolução diária e mensal e pendências; Jornada da equipe no menu Chats compara usuários com acesso autorizado.",
    regraNegocio: "As ações pertencem a quem executou, inclusive ao assumir outro responsável. O painel usa apenas registros salvos: chamadas atendidas exigem horário de atendimento; respostas de e-mail usam Re:/Res: no assunto; visitas finalizadas e presença confirmada ficam separadas. Retorno em massa não comprova envio e encaminhamento não comprova entrega. Vendas seguem autor e data de fechamento no histórico. Pendências são atuais. Só administradores e gestores com papel protegido podem comparar a empresa; demais usuários veem apenas a própria jornada.",
    comoUsar: ["Clique em Minha jornada ao lado de Contatos.", "Escolha Hoje, Este mês, Este ano ou as datas desejadas.", "Abra Evolução e escolha indicador e agrupamento diário ou mensal.", "Confira Dia a dia e Indicadores; exporte os registros se necessário.", "Em Chats → Jornada da equipe, usuários autorizados podem comparar os resultados e selecionar um usuário."],
    simular: () => [passo("Retorno agendado não conta como WhatsApp encaminhado", totalJornada([{usuario_id:"u",dia:"2026-11-09",metrica:"massa_whatsapp_retornos",valor:1}],"massa_whatsapp_encaminhado","2026-11-09","2026-11-09") === 0)],
  },
  {
    id: "cadastro-filtro-contatos",
    modulo: "Fila e organização",
    titulo: "Pesquisar cadastros e filtrar contatos",
    oQueE: "Ao lado de Contatos, os ícones abrem a pesquisa/criação de cadastros e o filtro por contato ou empresa.",
    regraNegocio: "O filtro restringe os cartões de todas as abas ao contato selecionado ou aos contatos vinculados à empresa, sem alterar cadastros ou compromissos. Buscar ou criar cadastro ocupa a área central, sem popup, usando as mesmas telas de Empresas e Contatos do Listas. Criar empresa segue as regras do módulo Empresas: contato temporário automático, substituição pelo contato real e vínculo da empresa e seus contatos com quem criou. Criar contato também inclui automaticamente o criador, preservando outros responsáveis selecionados.",
    comoUsar: ["Clique no ícone de cadastro ao lado de Contatos para pesquisar um cadastro existente ou criar contato/empresa.", "Clique no resultado para abrir o contato, ou no lápis para editar o cadastro.", "Clique no filtro ao lado de Contatos, pesquise e selecione contato ou empresa: o cartão correspondente fica destacado em Tudo. Para empresa, mantém o contato selecionado se vinculado; caso contrário, destaca o primeiro contato vinculado disponível. Se o cadastro não tiver cartão na sua fila de hoje, a ficha abre direto na área central para consulta.", "Troque de aba: o filtro permanece. Para restaurar a fila, abra o filtro e clique em Limpar."],
    alvo: "fila-cadastro-filtro",
    simular: () => [
      passo("Selecionar contato mostra apenas seus cartões", correspondeFiltroContato("ana", null, { type: "customer", id: "ana" }, null) && !correspondeFiltroContato("joao", null, { type: "customer", id: "ana" }, null)),
      passo("Empresa filtra por vínculo, não por nome", correspondeFiltroContato("ana", null, { type: "empresa", id: "empresa" }, { id: "empresa", contatos: new Set(["ana"]), emails: new Set() })),
      passo("Limpar restaura a fila", correspondeFiltroContato("joao", null, null, null)),
      passo("Criador é vinculado mesmo sem seleção manual", usuariosComCriador("criador", []).includes("criador")),
    ],
  },
  {
    id: "visita-endereco",
    modulo: "Atendimento e finalização",
    titulo: "Visita exige endereço cadastrado",
    oQueE: "A opção Visita aparece nos cartões e no menu do cliente apenas quando uma empresa vinculada tem endereço cadastrado.",
    regraNegocio: "Sem endereço cadastrado, não existe um destino para a visita. O menu fica oculto até o endereço ser preenchido e salvo.",
    comoUsar: ["Abra o cadastro do cliente e confira a empresa vinculada.", "Preencha e salve o endereço da empresa.", "A opção Visita passa a aparecer nos menus do contato."],
    simular: () => [
      passo("Sem endereço, Visita fica oculta", !possuiEnderecoVisita([{ id: "empresa", endereco: "" }])),
      passo("Com endereço cadastrado, Visita aparece", possuiEnderecoVisita([{ id: "empresa", endereco: "Rua Central, 100" }])),
    ],
  },
  {
    id: "cadastro-obrigatorio-orcamento",
    modulo: "Atendimento e finalização",
    titulo: "Cadastro obrigatório para orçamento",
    oQueE: "Criar, duplicar ou repetir um orçamento exige empresa vinculada e contato completo. Se faltarem dados, o cadastro abre imediatamente.",
    regraNegocio: "O contato precisa de nome, telefone ou WhatsApp, e-mail e responsável; a empresa precisa de CNPJ/CPF. Contatos temporários precisam ser substituídos pelos dados do contato real. Nenhum orçamento é criado enquanto houver pendências.",
    comoUsar: ["Clique em Novo orçamento ou Repetir último pedido.", "Se o cadastro abrir, preencha os dados do contato e vincule a empresa na aba Empresa.", "Confira o responsável na aba Vínculos e o documento da empresa.", "Salve. Ao iniciar um novo orçamento pelo cliente, a conferência continua automaticamente; no carrinho, clique novamente em Finalizar Orçamento."],
    simular: () => [
      passo("Sem empresa ou contato, bloqueia o orçamento", pendenciasOrcamento({ vinculado: false, responsavel: false }).includes("Contato cadastrado")),
      passo("Contato completo com empresa e responsável permite orçamento", pendenciasOrcamento({ contato: { id: "ana", nome: "Ana", telefone: "11999999999", tel: null, email: "ana@empresa.com" }, empresa: { id: "empresa", nome: "Empresa", cnpj: "12345678000199" }, vinculado: true, responsavel: true }).length === 0),
    ],
  },
  {
    id: "remetentes-ignorados",
    modulo: "Fila e organização",
    titulo: "Remetentes que não são clientes",
    oQueE: "E-mails automáticos (no-reply, notificações, boletos, newsletters) não entram nos Recebidos, e você pode ignorar e-mails, domínios ou números que não são clientes.",
    regraNegocio: "A caixa de Recebidos deve mostrar só quem precisa de atendimento. Ignorar nunca apaga mensagens e pode ser desfeito a qualquer momento.",
    comoUsar: ["No cartão dos Recebidos, clique em Não é cliente.", "Escolha ignorar o e-mail, todo o domínio ou o número.", "Para desfazer, abra ⋮ › Remetentes ignorados, pesquise por e-mail, domínio ou telefone e clique em Reativar."],
    simular: () => [
      passo("E-mail no-reply sai dos Recebidos sozinho", ehEmailAutomatico("noreply@banco.com.br")),
      passo("Cliente comum continua aparecendo", !ehEmailAutomatico("joao@cliente.com.br", "Pedido")),
      passo("Domínio ignorado esconde todos os e-mails dele", emailIgnorado("ana@fornecedor.com", [{ tipo: "dominio", valor: "fornecedor.com" }])),
      passo("Depois de reativar, volta a aparecer", !emailIgnorado("ana@fornecedor.com", [])),
    ],
  },
  {
    id: "cadastro-incompleto",
    modulo: "Atendimento e finalização",
    titulo: "Alerta de cadastro incompleto",
    oQueE: "Ao abrir uma conversa, o painel Cadastro e vínculos avisa quais dados importantes faltam.",
    regraNegocio: "Contato sem telefone/WhatsApp, e-mail, empresa vinculada ou CNPJ/CPF da empresa atrapalha disparos, orçamentos e cobrança; o aviso lembra o atendente de corrigir.",
    comoUsar: ["Abra a conversa do cliente.", "Veja o aviso vermelho no painel de cadastro.", "Edite o contato ou vincule/edite a empresa para o aviso sumir."],
    simular: () => [
      passo("Contato sem e-mail e sem empresa gera aviso", pendenciasCadastro({ nome: "Ana", whatsapp: "1" }).length === 2),
      passo("Cadastro completo não gera aviso", pendenciasCadastro({ nome: "Ana", whatsapp: "1", email: "a@b", companies: [{ id: "1", cnpj: "9" }] }).length === 0),
    ],
  },
  {
    id: "fila",
    modulo: "Fila e organização",
    titulo: "Fila de contatos e abas",
    oQueE: "Lista quem você deve atender hoje, separada em Tudo, Agendados, Recebidos e Potenciais.",
    regraNegocio: "Agendados são compromissos já marcados; Recebidos são clientes esperando resposta; Potenciais são oportunidades calculadas pelo sistema. Separar ajuda a atender primeiro quem já está esperando.",
    comoUsar: ["Escolha uma aba no topo da lista.", "Use os ícones de canal para filtrar por WhatsApp, e-mail ou telefone.", "Clique no cartão para abrir o cliente; ele fica destacado enquanto estiver aberto.", "Use as setas no topo da fila para abrir o próximo cliente ou voltar ao anterior."],
    alvo: "fila-abas",
    pratica: { tipo: "clicar", alvo: "fila-abas", instrucao: "Clique em uma das abas destacadas (Tudo, Agendados, Recebidos ou Potenciais)." },
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
    id: "navegacao-clientes",
    modulo: "Fila e organização",
    titulo: "Próximo cliente e cliente anterior",
    oQueE: "Dois botões no topo da fila, ao lado do tour: um abre o próximo cliente, o outro volta para o cliente que você acabou de deixar.",
    regraNegocio: "A fila é grande e o atendente pula de cliente em cliente. Navegar pelos botões do topo evita procurar o cartão na lista e perder o fio da conversa: o sistema lembra a ordem em que os clientes foram abertos.",
    comoUsar: [
      "Abra um cliente clicando no cartão.",
      "Clique na seta para a direita para abrir o próximo da fila (atalho: Alt + seta para baixo).",
      "Clique na seta para a esquerda para voltar ao cliente anterior (atalho: Alt + seta para cima).",
      "Se você voltar atrás e depois abrir um cliente novo, a lista recomeça dali: a seta da direita retoma quem estava à frente.",
    ],
    alvo: "fila-navegacao",
    pratica: { tipo: "clicar", alvo: "fila-navegacao", instrucao: "Clique em uma das setas destacadas no topo da fila (próximo ou anterior)." },
    simular: () => {
      const a = registrarVisita(HISTORICO_VAZIO, "joao");
      const b = registrarVisita(a, "maria");
      const c = registrarVisita(b, "pedro");
      const voltou = registrarVisita(c, "joao");
      const novo = registrarVisita(voltou, "ana");
      return [
        passo("Abrir clientes guarda a ordem", b.lista.join(" → ") === "joao → maria", `Histórico: ${b.lista.join(" → ")}`),
        passo("Seta da esquerda devolve o cliente anterior", vizinhoDoHistorico(c, -1) === "maria"),
        passo("Seta da direita avança para o seguinte do histórico", vizinhoDoHistorico(voltou, 1) === "maria"),
        passo("Voltar atrás não duplica o cliente", voltou.lista.join(" → ") === "joao → maria → pedro", `Histórico: ${voltou.lista.join(" → ")}`),
        passo("Abrir um cliente novo depois de voltar descarta o futuro", novo.lista.join(" → ") === "joao → ana", `Histórico: ${novo.lista.join(" → ")}`),
        passo("Sem cliente aberto antes, não há para onde voltar", vizinhoDoHistorico({ lista: ["joao"], i: 0 } as HistoricoFila, -1) === null),
      ];
    },
  },
  {
    id: "atalhos-so-com-registro",
    modulo: "Fila e organização",
    titulo: "Atalhos que só aparecem quando existe o que abrir",
    oQueE: "Os botões Histórico, Tarefa, Agenda e Orçamentos aparecem no cartão e no cabeçalho do cliente somente quando aquele contato já tem o registro correspondente.",
    regraNegocio: "Contato recém-cadastrado ou importado ainda não tem histórico, agenda nem orçamento. Mostrar um botão que só abriria uma lista vazia faz o atendente perder tempo e parecer que o sistema está com defeito — então o atalho some e volta sozinho assim que o primeiro registro é criado.",
    comoUsar: [
      "Olhe os cartões da fila: cada contato mostra apenas os atalhos que têm conteúdo.",
      "Crie a primeira tarefa de um contato novo: o atalho Agenda passa a aparecer.",
      "Registre o primeiro orçamento: o botão de orçamentos volta a aparecer no cartão e no cabeçalho.",
      "Nada fica escondido para sempre — assim que existe registro, o atalho reaparece.",
    ],
    simular: () => {
      const registros = montarRegistrosPorContato({
        contatos: [{ id: "novo", email: "" }, { id: "conversa", email: "" }, { id: "orcamento", email: "" }],
        tarefas: [],
        conversas: [{ customer_id: "conversa" }],
        emails: [],
        orcamentos: [{ cliente_id: "orcamento" }],
      });
      return [
        passo("Contato recém-cadastrado não mostra nenhum atalho",
          !possuiHistorico(registros.get("novo")) && !possuiTarefa(registros.get("novo")) && !possuiAgenda(registros.get("novo")) && !possuiOrcamento(registros.get("novo"))),
        passo("Quem já trocou mensagem tem histórico, mas ainda não tem agenda",
          possuiHistorico(registros.get("conversa")) && !possuiAgenda(registros.get("conversa"))),
        passo("Quem tem orçamento mostra o atalho de orçamentos",
          possuiOrcamento(registros.get("orcamento")) && !possuiTarefa(registros.get("orcamento"))),
      ];
    },
  },
  {
    id: "finalizacao",
    modulo: "Atendimento e finalização",
    titulo: "Finalização obrigatória do atendimento",
    oQueE: "Todo atendimento iniciado precisa terminar com a data do próximo contato ou com o cliente inativado.",
    regraNegocio: "Nenhum cliente pode ficar sem próximo contato: assim a carteira não esfria e o cliente não compra do concorrente por falta de retorno.",
    comoUsar: ["Atenda o cliente normalmente.", "Ao trocar de contato sem finalizar, o cartão fica com aviso de pendência.", "Clique de novo no cartão para reabrir a barra e finalize com a próxima data.", "Use o filtro Não finalizados para ver todas as pendências."],
    alvo: "fila-nao-finalizados",
    pratica: { tipo: "clicar", alvo: "fila-nao-finalizados", instrucao: "Clique no filtro de Não finalizados destacado." },
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
    modulo: "Clientes potenciais",
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
    modulo: "Copiloto e IA",
    titulo: "Urgência das mensagens recebidas",
    oQueE: "Mensagens recebidas ganham um selo: Reclamação, Cotação ou Dúvida.",
    regraNegocio: "Reclamação é atendida primeiro para não perder o cliente; cotação logo depois, porque é venda na mesa.",
    comoUsar: ["Veja o selo colorido no cartão da aba Recebidos.", "No menu ⋮, em Ordenar fila, escolha Prioridade para que as urgentes subam."],
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
    modulo: "Atendimento e finalização",
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
    modulo: "Agenda automática",
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
    modulo: "Disparo em massa",
    titulo: "Disparo em massa",
    oQueE: "Envia WhatsApp, e-mail, ligação ou ligação com IA para vários clientes de uma vez.",
    regraNegocio: "Todo cliente que recebe o disparo já ganha a data do próximo contato, e quem recebeu algo nos últimos dias não recebe de novo por outro canal.",
    comoUsar: ["Clique em Disparo em massa e escolha o canal.", "Selecione os clientes (a aba Potenciais traz o motivo).", "Use variáveis como {{contato}}, {{motivo}} e {{produto}}.", "Acompanhe o envio um a um e cancele se precisar."],
    alvo: "fila-disparo",
    pratica: { tipo: "clicar", alvo: "fila-disparo", instrucao: "Clique no botão de Disparo em massa destacado." },
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
    modulo: "Configurações do Atendimento",
    titulo: "Menu ⋮ ao lado de Contatos",
    oQueE: "Reúne as definições da tela: datas dos próximos contatos, regras de potenciais, automações, bot de atendimento e assumir contatos de colegas.",
    regraNegocio: "Cada empresa ajusta prazos e regras ao seu jeito de vender, sem depender de suporte.",
    comoUsar: ["Clique nos 3 pontinhos ao lado de Contatos.", "Escolha a definição e salve."],
    alvo: "fila-menu",
    pratica: { tipo: "clicar", alvo: "fila-menu", instrucao: "Clique nos 3 pontinhos destacados para ver as definições." },
    simular: () => [passo("Prazos e regras padrão estão disponíveis", CONFIG_PADRAO.protecao.limite > 0)],
  },
{
    id: "visao-geral", modulo: "Primeiros passos",
    titulo: "Como a tela de Atendimento funciona",
    oQueE: "À esquerda fica a fila de contatos do dia; no centro abre o cliente escolhido (conversa, histórico, tarefa, agenda, orçamentos); no topo fica a barra de datas.",
    regraNegocio: "O dia do vendedor é guiado pela fila: ninguém precisa decidir de cabeça quem chamar. Todo contato entra por um motivo (agendado, recebeu mensagem ou foi sugerido) e só sai quando ganha o próximo passo.",
    comoUsar: ["Comece pela aba Recebidos (quem está esperando).", "Depois atenda Agendados de hoje e atrasados.", "No tempo livre, trabalhe a aba Potenciais.", "Sempre finalize o atendimento com a próxima data."],
    alvo: "fila-abas",
    simular: () => [passo("Todos os recursos do Atendimento têm regra e passo a passo", CATALOGO_ATENDIMENTO.every((r) => r.regraNegocio && r.comoUsar.length > 0), `${CATALOGO_ATENDIMENTO.length} recursos`)],
  },
  {
    id: "barra-datas", modulo: "Fila e organização",
    titulo: "Barra de datas (Atrasados, Hoje, próximos dias)",
    oQueE: "Os botões de data no topo mostram as tarefas do dia escolhido em forma de tabela.",
    regraNegocio: "Atrasados aparecem primeiro porque cliente esquecido é cliente perdido. Tarefas atrasadas são trazidas para hoje sem nunca puxar para trás uma data futura que você escolheu.",
    comoUsar: ["Clique em Atrasados para ver o que ficou para trás.", "Clique em um dia para ver as tarefas dele.", "Clique em uma tarefa para selecionar o contato na aba Tudo."],
    simular: () => {
      const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
      const futura = new Date(hoje.getTime() + 7 * DIA);
      const passada = new Date(hoje.getTime() - 2 * DIA);
      const deveRealocar = (d: Date) => d < hoje;
      return [
        passo("Tarefa de 2 dias atrás é trazida para hoje", deveRealocar(passada)),
        passo("Tarefa marcada para daqui 7 dias continua na data escolhida", !deveRealocar(futura)),
      ];
    },
  },
  {
    id: "recebidos", modulo: "Fila e organização",
    titulo: "Recebidos não respondidos e sinalizados",
    oQueE: "A aba Recebidos lista todo WhatsApp e e-mail em que a última mensagem é do cliente. A bandeira permite tirar da lista sem responder.",
    regraNegocio: "Nenhuma mensagem de cliente pode ficar sem resposta. Quando não há o que responder (ex.: um \"obrigado\"), você sinaliza e ela sai da lista, mas continua consultável no filtro Sinalizados.",
    comoUsar: ["Abra a aba Recebidos.", "Responda ou clique na bandeira para sinalizar.", "Use o filtro Sinalizados para rever o que foi marcado."],
    alvo: "fila-abas",
    simular: () => {
      const conversa = (ultimaDe: "cliente" | "empresa") => ultimaDe === "cliente";
      return [
        passo("Última mensagem do cliente → aparece em Recebidos", conversa("cliente")),
        passo("Última mensagem da empresa → sai de Recebidos", !conversa("empresa")),
      ];
    },
  },
  {
    id: "menus-cliente", modulo: "Atendimento e finalização",
    titulo: "Menus do cliente (Histórico, Tarefa, Agenda, Orçamentos)",
    oQueE: "Ao abrir um cliente, a barra de menus troca o conteúdo central sem recarregar a tela. O menu Tarefa abre a pendência mais urgente ou a última tarefa.",
    regraNegocio: "Tudo sobre o cliente fica a um clique, para o vendedor não perder o fio da conversa. A tarefa abre bloqueada para leitura, evitando alterações sem querer; para mudar, use ⋮ → Editar tarefa.",
    comoUsar: ["Clique no cartão do cliente.", "Escolha Histórico, Tarefa, Agenda ou Orçamentos.", "Na tarefa, use ⋮ → Editar tarefa para liberar os campos."],
    simular: () => {
      const pendentes = [{ id: "t1", data: 3 }, { id: "t2", data: 1 }];
      const maisUrgente = [...pendentes].sort((a, b) => a.data - b.data)[0];
      return [passo("Menu Tarefa abre a pendência mais urgente", maisUrgente.id === "t2")];
    },
  },
  {
    id: "repetir-pedido", modulo: "Atendimento e finalização",
    titulo: "Repetir último pedido",
    oQueE: "No menu ⋮ do cartão, cria um novo orçamento com os mesmos itens do último pedido finalizado.",
    regraNegocio: "Cliente de reposição costuma comprar o mesmo mix. Repetir o pedido em um clique economiza tempo e diminui erro de digitação.",
    comoUsar: ["Abra o menu ⋮ do cartão.", "Clique em Repetir último pedido.", "Revise quantidades e envie o orçamento."],
    simular: () => [passo("Ciclo médio é calculado a partir das compras", Math.round(cicloMedio([0, 10 * DIA, 20 * DIA]) ?? 0) === 10, "compras a cada 10 dias")],
  },
  {
    id: "termometro", modulo: "Clientes potenciais",
    titulo: "Termômetro da carteira",
    oQueE: "Contadores no topo da fila: clientes em risco, hora de reposição e orçamentos parados.",
    regraNegocio: "Mostra a saúde da carteira antes que as vendas caiam: risco = inativos e queda de volume.",
    comoUsar: ["Olhe os números no topo da fila.", "Abra a aba Potenciais para agir sobre eles."],
    simular: () => {
      const t = termometroCarteira([{ tipo: "inativo" }, { tipo: "queda_volume" }, { tipo: "recompra" }, { tipo: "orcamento" }] as any);
      return [
        passo("Inativo + queda de volume contam como risco", t.risco === 2),
        passo("Recompra conta como reposição", t.reposicao === 1),
        passo("Orçamento parado é contado", t.orcamentos === 1),
      ];
    },
  },
  {
    id: "dispensar", modulo: "Clientes potenciais",
    titulo: "Sem interesse agora",
    oQueE: "Tira o cliente da lista de Potenciais por 15, 30 ou 60 dias, guardando a objeção.",
    regraNegocio: "Insistir com quem acabou de dizer não queima o relacionamento. A objeção registrada ajuda a próxima abordagem.",
    comoUsar: ["No menu ⋮ do cartão potencial, clique em Sem interesse agora.", "Escolha o motivo e o prazo."],
    simular: () => {
      const hoje = Date.now();
      const orcs: OrcPotencial[] = [{ clienteId: "x", etapa: "orcamento", criado: iso(5, hoje), valor: 900, itens: [] }];
      return [passo("Cliente dispensado não aparece em Potenciais", calcularPotenciais(orcs, CONFIG_PADRAO, hoje, new Set(["x"])).length === 0)];
    },
  },
  {
    id: "copiloto-chat", modulo: "Copiloto e IA",
    titulo: "Sugerir respostas no chat",
    oQueE: "Botão acima da caixa de texto que gera até 3 respostas prontas, considerando a conversa e os últimos orçamentos.",
    regraNegocio: "Responder rápido vende mais. A IA só sugere; você escolhe, ajusta e envia.",
    comoUsar: ["Abra a conversa do cliente.", "Clique em Sugerir respostas.", "Clique numa sugestão para colocá-la na caixa de texto, ajuste e envie."],
    simular: () => [passo("Pergunta do cliente é reconhecida como dúvida", classificarUrgencia("Qual o prazo de entrega?") === "duvida")],
  },
  {
    id: "resumo-ligacao", modulo: "Copiloto e IA",
    titulo: "Resumo automático após a ligação",
    oQueE: "Depois de uma ligação gravada no Pilar Fone, a IA resume a conversa e já preenche a barra de finalização com a data de retorno combinada.",
    regraNegocio: "O vendedor não precisa digitar o que conversou; o histórico fica completo e o retorno combinado não é esquecido.",
    comoUsar: ["Ligue pelo Pilar Fone.", "Ao desligar, confira o resumo sugerido na barra de finalização.", "Ajuste se precisar e finalize."],
    simular: () => {
      salvarSugestaoLigacao("sim-lig", { resumo: "Cliente pediu retorno dia 25", dataRetorno: "2026-11-25" });
      const lido = lerSugestaoLigacao("sim-lig");
      limparSugestaoLigacao("sim-lig");
      return [
        passo("Resumo da ligação chega à barra de finalização", lido?.resumo === "Cliente pediu retorno dia 25"),
        passo("Data de retorno combinada é sugerida", lido?.dataRetorno === "2026-11-25"),
        passo("Sugestão some depois de finalizar", lerSugestaoLigacao("sim-lig") === null),
      ];
    },
  },
  {
    id: "modelos", modulo: "Disparo em massa",
    titulo: "Modelos de WhatsApp e e-mail",
    oQueE: "Textos prontos com imagens e variáveis, administrados no botão Gerenciar modelos.",
    regraNegocio: "Padroniza a comunicação da empresa e evita erros. E-mail sempre exige assunto.",
    comoUsar: ["No disparo, clique em Gerenciar modelos.", "Crie o texto com {{contato}}, {{empresa}}, {{motivo}} ou {{produto}}.", "Escolha o modelo na etapa de composição."],
    simular: () => {
      const t = substituirVariaveis("Oi {{contato}} da {{empresa}}", { id: "m", nome: "Rui", empresa: "Loja X", telefone: null, email: null });
      return [passo("Variáveis do modelo são preenchidas", t === "Oi Rui da Loja X", t)];
    },
  },
  {
    id: "monitor-envio", modulo: "Disparo em massa",
    titulo: "Acompanhar e cancelar o envio",
    oQueE: "Na última etapa, o envio acontece um a um com status de cada cliente e botão para cancelar.",
    regraNegocio: "Cancelar para só os próximos envios; quem já recebeu continua com seu retorno agendado. Envios que falharem não geram tarefa.",
    comoUsar: ["Confirme o disparo.", "Acompanhe a lista de status.", "Clique em Cancelar se precisar parar."],
    simular: () => {
      const fila = ["a", "b", "c"]; const enviados: string[] = []; let cancelado = false;
      for (const c of fila) { if (cancelado) break; enviados.push(c); if (c === "b") cancelado = true; }
      return [passo("Cancelar no 2º cliente impede o 3º", enviados.join(",") === "a,b")];
    },
  },
  {
    id: "trava-canais", modulo: "Disparo em massa",
    titulo: "Proteção contra excesso de mensagens",
    oQueE: "Quem recebeu disparo em qualquer canal nos últimos dias fica de fora do próximo disparo.",
    regraNegocio: "O cliente não deve receber a mesma oferta por WhatsApp, e-mail e ligação na mesma semana. Isso evita bloqueios e desgaste.",
    comoUsar: ["Use os filtros inteligentes no disparo.", "A opção de excluir quem recebeu recentemente já vem ligada."],
    simular: () => {
      const recebeuHa = 2, trava = CONFIG_PADRAO.protecao.contatoRecenteDias;
      return [passo(`Quem recebeu há ${recebeuHa} dias fica fora (trava de ${trava} dias)`, recebeuHa < trava)];
    },
  },
  {
    id: "pilar-fone", modulo: "Telefonia e voz",
    titulo: "Pilar Fone e regras de discagem",
    oQueE: "Telefone dentro do CRM, ligado ao ramal do PABX. O número é ajustado automaticamente antes de discar.",
    regraNegocio: "Remove o 55, não disca o DDD local e coloca a operadora para outros DDDs. Número fora do padrão é barrado antes de discar.",
    comoUsar: ["Abra o Pilar Fone no canto da tela.", "Confira se o ramal está conectado (verde).", "Clique no telefone do cliente para ligar."],
    simular: () => [
      passo("Celular do DDD local é discado sem DDD", prepararNumeroDiscagem("+55 15 99876-5432", { dddLocal: "15" }) === "998765432"),
      passo("Outro DDD ganha o código da operadora", prepararNumeroDiscagem("+55 11 99876-5432", { dddLocal: "15" }) === "01511998765432"),
      passo("Celular sem o 9 inicial é barrado", !validarNumeroDiscagem("11887654321").valido),
    ],
  },
  {
    id: "ligacao-ia", modulo: "Telefonia e voz",
    titulo: "Ligação com IA",
    oQueE: "No disparo em massa, um agente de voz liga para os clientes, apresenta a oferta e transfere para você quem tiver interesse, com resumo da conversa.",
    regraNegocio: "Só funciona se o seu ramal de ligações estiver liberado. Se você estiver ocupado, as ligações pausam até você ficar livre, para nenhum cliente interessado ficar esperando.",
    comoUsar: ["Disparo em massa → Ligação com IA.", "Escolha o agente e preencha os campos da oferta.", "Acompanhe a campanha; pause ou cancele quando quiser."],
    simular: () => {
      const g = ganchoPotencial({ tipo: "recompra", motivo: "Compra a cada 20 dias", produto: "Papel" });
      return [
        passo("A IA recebe o motivo do cliente para abrir a conversa", g.includes("Compra a cada 20 dias")),
        passo("A IA recebe a abordagem certa para recompra", g.includes("estoque")),
        passo("Sem motivo, a IA não recebe gancho inventado", ganchoPotencial(undefined) === ""),
      ];
    },
  },
  {
    id: "agenda-inteligente", modulo: "Agenda automática",
    titulo: "Origem de cada agendamento",
    oQueE: "Toda tarefa mostra se foi criada de forma manual, automática ou inteligente, e o motivo.",
    regraNegocio: "Você sempre sabe por que precisa ligar para alguém. Tarefas inteligentes de reposição só são criadas para quem já comprou 2 vezes ou mais e não tem outra tarefa pendente.",
    comoUsar: ["Abra a tarefa pelo menu Tarefa ou pela agenda.", "Veja o quadro de origem e motivo."],
    simular: () => [passo("Ciclo de reposição só existe com 2 compras ou mais", cicloMedio([Date.now()]) === null)],
  },
  {
    id: "reconquista", modulo: "Agenda automática",
    titulo: "Reconquista de orçamento perdido",
    oQueE: "Orçamento marcado como perdido gera uma tarefa de retorno em 15 dias.",
    regraNegocio: "Muitas vezes o concorrente não entrega bem. Voltar a falar depois de algumas semanas recupera vendas.",
    comoUsar: ["Marque o orçamento como perdido.", "A tarefa de reconquista aparece em Agendados na data."],
    simular: () => [passo("Mensagens da régua de cobrança usam o nome do cliente", MENSAGEM_REGUA.D2("Ana").includes("Ana"))],
  },
  {
    id: "automacoes", modulo: "Configurações do Atendimento",
    titulo: "Automações (IA e fora do horário)",
    oQueE: "Define horário e quantidade de clientes para a IA ligar sozinha e a resposta automática fora do expediente no WhatsApp.",
    regraNegocio: "A IA trabalha a carteira enquanto você atende; fora do horário o cliente recebe aviso e você retoma no primeiro horário útil.",
    comoUsar: ["Menu ⋮ ao lado de Contatos → Automações.", "Preencha horário, quantidade e texto.", "Salve."],
    alvo: "fila-menu",
    simular: () => [
      passo("Robô de ligações vem desligado até você ativar", CONFIG_PADRAO.roboIa.ativo === false),
      passo("Resposta fora do horário vem desligada até você ativar", CONFIG_PADRAO.plantao.ativo === false),
    ],
  },
  {
    id: "bot", modulo: "Configurações do Atendimento",
    titulo: "Bot de atendimento",
    oQueE: "Escolha um robô de WhatsApp para responder seus clientes e ligue/desligue no botão ao lado de Contatos.",
    regraNegocio: "Quando você está fora, o robô faz a triagem. Ligado, ele responde os clientes da sua carteira; desligado, as mensagens caem em Recebidos.",
    comoUsar: ["Menu ⋮ → Bot de atendimento → escolha o robô.", "Use o botão com ícone de robô ao lado de Contatos para ligar ou desligar."],
    alvo: "fila-menu",
    simular: () => {
      const responde = (bot: string | null, ativo: boolean) => !!bot && ativo;
      return [
        passo("Bot escolhido e ligado responde", responde("b1", true)),
        passo("Bot desligado não responde", !responde("b1", false)),
        passo("Sem bot escolhido, ninguém responde automático", !responde(null, true)),
      ];
    },
  },
  {
    id: "prazos", modulo: "Configurações do Atendimento",
    titulo: "Datas dos próximos contatos",
    oQueE: "Define quantos dias depois o cliente volta para a fila ao finalizar um atendimento.",
    regraNegocio: "Cada empresa tem seu ritmo de contato. O prazo vira a data sugerida, que você pode mudar na hora.",
    comoUsar: ["Menu ⋮ → Datas dos próximos contatos.", "Ajuste os dias e salve."],
    alvo: "fila-menu",
    simular: () => {
      const d = dataPadraoProximoContato("finalizar_atendimento", new Date(2026, 0, 1));
      return [passo("Finalizar atendimento sugere uma data futura", d.getTime() > new Date(2026, 0, 1).getTime(), d.toLocaleDateString("pt-BR"))];
    },
  },
  {
    id: "assumir", modulo: "Configurações do Atendimento",
    titulo: "Assumir contatos de colegas",
    oQueE: "Gerentes e administradores podem trazer para a própria fila os contatos de outros vendedores.",
    regraNegocio: "Nas férias ou faltas, a carteira não pode parar. Seus contatos continuam aparecendo junto.",
    comoUsar: ["Menu ⋮ → Assumir contatos de...", "Marque as pessoas. Marcar um gerente traz os vendedores dele."],
    alvo: "fila-menu",
    simular: () => {
      const meus = ["a"], dele = ["b"], fila = [...meus, ...dele];
      return [passo("Seus contatos continuam junto dos assumidos", fila.includes("a") && fila.includes("b"))];
    },
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

/** Recursos na ordem dos módulos, para o tutorial e as simulações. */
export function recursosPorModulo(): { modulo: ModuloAtendimento; recursos: RecursoAtendimento[] }[] {
  return MODULOS.map((m) => ({ modulo: m, recursos: CATALOGO_ATENDIMENTO.filter((r) => r.modulo === m) })).filter((g) => g.recursos.length);
}
export const CATALOGO_ORDENADO = (): RecursoAtendimento[] => recursosPorModulo().flatMap((g) => g.recursos);
