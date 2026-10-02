/**
 * Catálogo de TODAS as regras do sistema que criam, alteram ou removem algo na agenda.
 * Exibido em Configurações do Calendário. Toda nova regra que afete a agenda DEVE ser adicionada aqui.
 */
export interface RegraAgenda {
  gatilho: string;
  efeito: string;
}
export interface GrupoRegrasAgenda {
  tela: string;
  descricao: string;
  regras: RegraAgenda[];
}

export const GRUPOS_REGRAS_AGENDA: GrupoRegrasAgenda[] = [
  {
    tela: "Cadastro de empresas",
    descricao: "Regras disparadas ao cadastrar ou editar empresas.",
    regras: [
      { gatilho: "Ao criar uma empresa", efeito: "Cria um contato temporário para a empresa, para que ela já entre no fluxo de atendimento e na agenda." },
      { gatilho: "Ao vincular um contato real à empresa", efeito: "O contato temporário é substituído pelo contato real, mantendo as tarefas da agenda." },
      { gatilho: "Ao vincular a empresa a um vendedor/gerente", efeito: "Cria uma tarefa de acompanhamento na agenda do responsável." },
    ],
  },
  {
    tela: "Cadastro de contatos",
    descricao: "Regras disparadas ao cadastrar ou vincular contatos.",
    regras: [
      { gatilho: "Ao vincular um contato a um gerente/vendedor", efeito: "Cria automaticamente uma tarefa de acompanhamento na agenda do usuário vinculado." },
      { gatilho: "Ao inativar um cliente (com motivo e substituto)", efeito: "Cancela as tarefas futuras do cliente e o retira das listas da agenda." },
      { gatilho: "Ao repassar vendedores de um gerente", efeito: "As tarefas pendentes dos contatos passam a aparecer para o novo responsável." },
    ],
  },
  {
    tela: "Atendimento",
    descricao: "Regras aplicadas nos cartões, abas (Chat, E-mail, Tel, Visita) e na barra de próximo contato.",
    regras: [
      { gatilho: "Ao finalizar atendimento", efeito: "Registra o atendimento, conclui a tarefa do dia e cria a tarefa do próximo contato na data escolhida." },
      { gatilho: "Ao finalizar com uma data futura já existente", efeito: "Pergunta se deve criar nova tarefa ou modificar a data; só fica uma data futura por cliente." },
      { gatilho: "Data sugerida do próximo contato", efeito: "Usa os dias padrão por canal definidos nas configurações de próximo contato." },
      { gatilho: "Ao interagir com o cliente (mensagem, e-mail, anotação)", efeito: "Obriga informar a próxima data antes de trocar de cliente, salvo no modo Atender simultâneo." },
      { gatilho: "Ao inativar cliente pela barra de próximo contato", efeito: "Exige motivo, cancela tarefas futuras e retira o cliente da agenda." },
      { gatilho: "Ignorar movimentação", efeito: "Fecha o atendimento sem alterar as tarefas da agenda." },
      { gatilho: "Discador / ligação pelo fluxo", efeito: "Ao concluir cada ligação, abre a finalização que remarca o próximo contato." },
    ],
  },
  {
    tela: "Calendário",
    descricao: "Regras aplicadas na própria agenda.",
    regras: [
      { gatilho: "Ao criar uma tarefa para um contato que já tem tarefa futura", efeito: "Pergunta \"Trocar pela nova tarefa\" ou \"Manter as duas\"." },
      { gatilho: "Ao arrastar uma tarefa", efeito: "Remarca a tarefa para o novo dia/horário." },
      { gatilho: "Tarefas de hoje com horário vencido", efeito: "Passam a contar como Atrasados." },
      { gatilho: "Regras e automações abaixo", efeito: "Criam tarefas automáticas conforme cada regra cadastrada nesta tela." },
    ],
  },
];
