/** Opções do criador de regras da agenda (gatilho → ação). Executadas pelo backend. */
export interface OpcaoGatilho { valor: string; rotulo: string; tela: string; condicoes: ("canais" | "status" | "texto" | "dias")[] }

export const GATILHOS: OpcaoGatilho[] = [
  { valor: "contato_criado", rotulo: "Ao criar contato", tela: "Cadastro de contatos", condicoes: [] },
  { valor: "empresa_criada", rotulo: "Ao criar empresa", tela: "Cadastro de empresas", condicoes: [] },
  { valor: "atendimento_finalizado", rotulo: "Ao finalizar atendimento", tela: "Atendimento", condicoes: ["canais", "texto"] },
  { valor: "sem_contato_dias", rotulo: "Cliente sem contato há X dias", tela: "Verificação diária", condicoes: ["dias"] },
  { valor: "orcamento_criado", rotulo: "Ao criar orçamento", tela: "Orçamentos", condicoes: [] },
  { valor: "orcamento_status", rotulo: "Ao mudar status do orçamento (fechar/perder)", tela: "Orçamentos", condicoes: ["status"] },
  { valor: "pedido_criado", rotulo: "Ao criar pedido", tela: "Pedidos", condicoes: [] },
  { valor: "pedido_alterado", rotulo: "Ao mudar status do pedido", tela: "Pedidos", condicoes: ["status"] },
  { valor: "pedido_aprovado", rotulo: "Ao aprovar pedido (aprovado/pago)", tela: "Pedidos", condicoes: [] },
  { valor: "whatsapp_recebido", rotulo: "Ao receber WhatsApp", tela: "WhatsApp", condicoes: ["texto"] },
  { valor: "whatsapp_enviado", rotulo: "Ao enviar WhatsApp", tela: "WhatsApp", condicoes: ["texto"] },
  { valor: "bloco_bot", rotulo: "Ao rodar bloco do bot", tela: "Bot de atendimento", condicoes: ["texto"] },
  { valor: "email_recebido", rotulo: "Ao receber e-mail (inclusive em segundo plano)", tela: "E-mail", condicoes: ["texto"] },
  { valor: "email_enviado", rotulo: "Ao enviar e-mail", tela: "E-mail", condicoes: ["texto"] },
  { valor: "email_aberto", rotulo: "Quando o cliente abrir o e-mail", tela: "E-mail", condicoes: [] },
  { valor: "ligacao_recebida", rotulo: "Ao receber ligação", tela: "Telefonia", condicoes: ["status"] },
  { valor: "ligacao_realizada", rotulo: "Ao fazer ligação", tela: "Telefonia", condicoes: ["status"] },
];

export const ACOES = [
  { valor: "criar_tarefa", rotulo: "Criar tarefa na agenda" },
  { valor: "remarcar_tarefa", rotulo: "Remarcar tarefas pendentes do cliente" },
  { valor: "concluir_tarefas", rotulo: "Concluir tarefas pendentes (até hoje)" },
  { valor: "cancelar_tarefas", rotulo: "Cancelar tarefas futuras do cliente" },
];

export const CANAIS_REGRA = [
  { valor: "whatsapp", rotulo: "WhatsApp" },
  { valor: "telefone", rotulo: "Telefone" },
  { valor: "email", rotulo: "E-mail" },
  { valor: "presencial", rotulo: "Visita" },
  { valor: "chat", rotulo: "Chat" },
];

export const rotuloGatilho = (v: string) => GATILHOS.find((g) => g.valor === v)?.rotulo || v;
export const rotuloAcao = (v: string) => ACOES.find((a) => a.valor === v)?.rotulo || v;
