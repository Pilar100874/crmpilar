import { rotuloGatilho, type RegraBase } from "./regrasAutomacao";

export type RegraCatalogo = RegraBase & { chave: string | null; descricao: string | null; tela: string | null; execucoes: number };
export type ModoRegra = "automatico" | "usuario";
export interface ExplicacaoRegra { modo: ModoRegra; disparador: string; condicao: string; resultado: string }

// Documentação de comportamentos já implementados. Não cria automações nem altera estados salvos.
const existentes = [
  ["movimento_sem_conflito", "Movimentação sem conflito", "tarefa_arrastada", "remarcar_tarefa", "Sem impedimentos, a tarefa vai diretamente para a data solicitada, sem janela de conflito."],
  ["atrasada_nao_move", "Tarefa atrasada não pode ser movida", "tarefa_arrastada", "nenhuma", "Tarefas atrasadas não podem ser selecionadas nem arrastadas manualmente."],
  ["mesma_data_nao_move", "Não mover para a mesma data", "tarefa_arrastada", "nenhuma", "Mover fica indisponível quando todas as tarefas selecionadas já estão na data de destino."],
  ["unir_mesmo_contato", "Unir tarefas do mesmo contato", "tarefa_arrastada", "remarcar_tarefa", "Ao mover para um dia com tarefa pendente do mesmo contato, reúne as informações na tarefa existente."],
  ["mistura_dia_todo", "Dia todo junto com outras tarefas", "tarefa_arrastada", "perguntar_conflito", "Ao mover uma seleção mista, avisa que a tarefa de dia todo ficará sem horário definido."],
  ["analise_antecipada", "Analisar destino e próximas datas", "tarefa_arrastada", "sugerir_data", "Analisa fins de semana e reservas de dia todo dos responsáveis envolvidos. A sugestão só é aplicada por escolha do usuário."],
  ["desfazer_movimento", "Desfazer última movimentação", "tarefa_movimento_desfeito", "remarcar_tarefa", "O comando Desfazer restaura datas, horários e tarefas unidas pela última movimentação registrada nesta agenda."],
  ["atrasados_hoje", "Tarefas atrasadas na data atual", "agenda_aberta", "remarcar_tarefa", "Ao abrir a agenda, traz pendências vencidas para hoje e preserva a data original prevista para o contato."],
] as const;

export function completarCatalogo(regras: RegraCatalogo[]): RegraCatalogo[] {
  const catalogo = regras.map(regra => {
    const gatilhos: Record<string, string> = { cal_encaminhamento_obrigatorio_conclusao: "tarefa_concluida", cal_realocacao_diaria_tarefas: "agenda_aberta", cal_alerta_urgente: "agenda_aberta" };
    return { ...regra, gatilho: gatilhos[regra.chave || ""] || regra.gatilho };
  });
  for (const [chave, nome, gatilho, acao, descricao] of existentes) {
    if (catalogo.some(r => r.chave === chave || r.chave === `cal_${chave}`)) continue;
    catalogo.push({ id: `catalogo-${chave}`, chave, nome, gatilho, acao, descricao, tela: "Calendário", ativa: true,
      condicoes: {}, acao_config: {}, relacoes: {}, sistema: true, executor: "tela", prioridade: 100, execucoes: 0 });
  }
  return catalogo.sort((a, b) => a.prioridade - b.prioridade);
}

const explicacoes: Record<string, ExplicacaoRegra> = {
  movimento_sem_conflito: { modo: "automatico", disparador: "Arrastar a tarefa para outro dia ou selecionar tarefas, escolher a data e clicar em Mover.", condicao: "Tarefa não atrasada, data diferente e nenhuma validação exige decisão.", resultado: "Salva diretamente na data solicitada. Não abre aviso de conflito." },
  atrasada_nao_move: { modo: "automatico", disparador: "Abrir a agenda ou tentar selecionar uma tarefa atrasada.", condicao: "A tarefa pendente está atrasada, inclusive após realocação automática.", resultado: "Seleção e movimentação manual ficam bloqueadas; o motivo aparece ao lado da seleção." },
  mesma_data_nao_move: { modo: "automatico", disparador: "Selecionar tarefas e escolher a data de destino.", condicao: "Todas as tarefas selecionadas já estão nessa data.", resultado: "O botão Mover fica desativado. Escolha uma data diferente." },
  unir_mesmo_contato: { modo: "automatico", disparador: "Confirmar uma movimentação para outro dia.", condicao: "Há outra tarefa pendente do mesmo contato na data de destino.", resultado: "Preserva a tarefa existente, combina as informações e remove a tarefa movida; informa a união." },
  mistura_dia_todo: { modo: "usuario", disparador: "Selecionar uma tarefa de dia todo junto com tarefas que não são de dia todo e pedir para mover.", condicao: "A seleção mistura os dois tipos de tarefa.", resultado: "Leia o aviso e confirme para a tarefa de dia todo passar a ficar sem horário definido, ou cancele." },
  analise_antecipada: { modo: "automatico", disparador: "Escolher uma data com conflito na movimentação.", condicao: "A data cai no fim de semana ou possui reserva de dia todo para os responsáveis envolvidos.", resultado: "Apresenta a primeira data útil disponível e os motivos. Não aplica a sugestão automaticamente." },
  desfazer_movimento: { modo: "usuario", disparador: "Clicar na seta Desfazer depois de uma movimentação.", condicao: "Existe uma última movimentação registrada na agenda aberta.", resultado: "Restaura a movimentação e eventuais uniões de tarefas daquele movimento." },
  atrasados_hoje: { modo: "automatico", disparador: "Abrir Calendário ou a agenda do Atendimento.", condicao: "Existem tarefas pendentes de dias anteriores.", resultado: "Traz as tarefas para hoje, preserva a data original e mantém sua indicação em Atrasados." },
  bloqueio_finais_semana: { modo: "usuario", disparador: "Criar ou mover uma tarefa para sábado ou domingo.", condicao: "A regra está em execução e a data é fim de semana.", resultado: "Escolha manter a data, usar a sugestão ou escolher outra data. Confira o resumo e finalize." },
  pergunta_dia_todo: { modo: "usuario", disparador: "Criar, editar ou mover uma tarefa para um dia ocupado.", condicao: "Há tarefa de dia todo para o responsável, ou a tarefa de dia todo encontra outras tarefas no destino.", resultado: "Escolha a sugestão, mantenha as tarefas juntas ou mova as demais quando essa alternativa estiver disponível. Confira e finalize." },
  encaminhamento_obrigatorio_conclusao: { modo: "usuario", disparador: "Marcar a tarefa como concluída pela agenda ou pelo painel lateral.", condicao: "É necessário garantir o próximo contato ou inativar o cliente.", resultado: "Reprograme uma tarefa futura ou inative o cliente. Se já houver tarefa futura, mantenha a data, altere-a ou mantenha ambas. Cancelar não conclui." },
  bloquear_datas_passadas: { modo: "automatico", disparador: "Escolher uma data ao criar, editar ou mover uma tarefa.", condicao: "A regra está em execução e a data solicitada está no passado.", resultado: "Impede salvar ou mover para a data passada. Escolha uma data permitida." },
  bloquear_horarios_passados: { modo: "automatico", disparador: "Mover uma tarefa com horário para hoje.", condicao: "O horário da tarefa já passou e a regra está em execução.", resultado: "Ajusta o horário passado conforme a validação da movimentação; não mantém horário vencido." },
  deteccao_conflitos: { modo: "usuario", disparador: "Criar, editar ou mover uma tarefa com horário.", condicao: "Outra tarefa do mesmo responsável ocupa o mesmo horário, com a regra em execução.", resultado: "O aviso apresenta o conflito. Escolha manter as tarefas no horário ou a alternativa oferecida e confirme." },
  horario_comercial: { modo: "usuario", disparador: "Criar ou editar uma tarefa com horário definido.", condicao: "O horário solicitado fica fora do período de trabalho do responsável, com a regra em execução.", resultado: "Para tarefa manual, escolha ajustar ou manter conforme o aviso. Tarefas automáticas são ajustadas sem essa escolha." },
  validacao_dia_todo: { modo: "automatico", disparador: "Gerar uma tarefa automática futura ou analisar reservas de dia todo.", condicao: "Há reserva de dia todo para o mesmo responsável e a regra está em execução.", resultado: "Tarefas automáticas avançam para o próximo dia disponível. Tarefas manuais seguem a escolha do usuário no aviso de conflito." },
  realocacao_diaria_tarefas: { modo: "automatico", disparador: "Abrir a agenda e verificar as pendências, ou mudar o dia de uma tarefa.", condicao: "Há tarefa pendente vencida ou uma mudança de dia, conforme a configuração de realocação.", resultado: "Realoca as pendências para hoje preservando a data original; a movimentação entre dias pode retirar o horário conforme a configuração." },
  alerta_urgente: { modo: "automatico", disparador: "Visualizar os contatos e tarefas na agenda.", condicao: "A tarefa atinge os níveis de dias configurados para os alertas.", resultado: "Mostra o destaque de urgência correspondente. Os níveis podem ser ajustados no catálogo." },
  substituir_contato_inativado: { modo: "usuario", disparador: "Solicitar a inativação de um contato.", condicao: "A inativação exige motivo e escolha de substituto conforme o fluxo do cadastro.", resultado: "Informe o motivo e escolha o substituto solicitado antes de concluir a inativação." },
  nova_tarefa_conflito: { modo: "usuario", disparador: "Criar uma nova tarefa para um contato com tarefa futura pendente.", condicao: "O mesmo contato já possui uma tarefa futura.", resultado: "Escolha trocar pela nova tarefa ou manter as duas. A escolha não exige uma segunda confirmação de exclusão nesse fluxo." },
};

export function explicarRegra(regra: RegraCatalogo): ExplicacaoRegra {
  const chave = regra.chave?.replace(/^cal_/, "") || "";
  const conhecida = explicacoes[chave];
  if (conhecida) return conhecida;
  const interativa = ["perguntar_conflito", "exigir_finalizacao", "abrir_finalizacao"].includes(regra.acao) ||
    ["finalizar_atendimento", "inativar_cliente", "inativar_pela_barra", "nova_tarefa_conflito", "uma_data_futura"].includes(chave);
  const condicoes = Object.entries(regra.condicoes || {}).map(([k, v]) => {
    const nomes: Record<string, string> = { canais: "Canal", status: "Status", texto_contem: "Texto contém", dias_sem_contato: "Dias sem contato", valor_minimo: "Valor mínimo", tipos_cliente: "Tipo de cliente", estados: "Estado", cidades: "Cidade", tags: "Marcadores", usuarios: "Responsáveis", dias_semana: "Dias da semana", hora_de: "A partir de", hora_ate: "Até", tem_tarefa_pendente: "Possui tarefa pendente" };
    return `${nomes[k] || k}: ${Array.isArray(v) ? v.join(", ") : String(v)}`;
  });
  return { modo: interativa ? "usuario" : "automatico", disparador: rotuloGatilho(regra.gatilho),
    condicao: condicoes.join(" · ") || "O acontecimento deve ocorrer e a regra deve estar em execução.",
    resultado: regra.descricao || "Executa a ação configurada quando as condições forem atendidas." };
}

export interface EtapaFluxo { id: string; titulo: string; detalhe: string; modo: ModoRegra; tipo?: "condicao" | "resultado"; rotulo?: string; filhos?: EtapaFluxo[] }
export function fluxoMovimentacao(regras: RegraCatalogo[]): EtapaFluxo {
  const ativa = (chave: string) => regras.some(r => r.chave === chave && r.ativa);
  const fimSemana = ativa("cal_bloqueio_finais_semana");
  const diaTodo = ativa("cal_pergunta_dia_todo");
  const horario = ativa("cal_deteccao_conflitos");
  const opcoes: EtapaFluxo[] = [
    { id: "sugerida", titulo: "Usar a data sugerida", detalhe: "Escolha o primeiro dia útil sem reserva de dia todo. Exemplo: sábado → segunda ocupada → terça disponível.", modo: "usuario" },
    { id: "manter", titulo: "Manter a data solicitada", detalhe: "Escolha manter no sábado/domingo ou junto com a tarefa de dia todo. As tarefas existentes ficam no dia.", modo: "usuario" },
  ];
  if (diaTodo) opcoes.push({ id: "mover-outras", titulo: "Mover as outras tarefas", detalhe: "Quando oferecida para esse conflito, envie as demais para o próximo dia disponível e deixe a tarefa solicitada no dia escolhido.", modo: "usuario" });
  opcoes.push({ id: "outra-data", titulo: "Escolher outra data", detalhe: "Clique no ícone de calendário. A nova data é analisada novamente antes da confirmação.", modo: "usuario" });
  const conflitos = [fimSemana && "fim de semana", diaTodo && "reserva de dia todo ou outras tarefas para uma tarefa de dia todo", horario && "mesmo horário ocupado", "seleção mista de dia todo e outras tarefas"].filter(Boolean).join("; ");
  return { id: "inicio", titulo: "Pedir para mover uma tarefa", detalhe: "Arraste para outro dia ou selecione uma ou várias tarefas, escolha a data e clique em Mover.", modo: "usuario", filhos: [
    { id: "permitido", titulo: "A movimentação é permitida?", detalhe: "Verifica atraso, mesma data e bloqueios de datas/horários passados conforme a configuração.", modo: "automatico", tipo: "condicao", filhos: [
      { id: "bloqueado", rotulo: "Não", titulo: "Não movimentar", detalhe: "Tarefa atrasada ou mesma data: Mover indisponível. Outros impedimentos exibem o motivo; escolha um destino permitido.", modo: "automatico", tipo: "resultado" },
      { id: "conflito", rotulo: "Sim", titulo: "Há algum conflito que exige decisão?", detalhe: `Condições em execução: ${conflitos}. Considera os responsáveis das tarefas, não todos os usuários do CRM.`, modo: "automatico", tipo: "condicao", filhos: [
        { id: "direto", rotulo: "Não", titulo: "Mover diretamente para a data pedida", detalhe: "Sem janela de conflito. Preserva o horário conforme a configuração. Se já houver tarefa pendente do mesmo contato, une as informações.", modo: "automatico", tipo: "resultado" },
        { id: "analisar", rotulo: "Sim", titulo: "Analisar a data e os próximos dias", detalhe: "Mostra os motivos juntos e sugere uma data útil disponível. Nenhuma tarefa foi movida nesta etapa.", modo: "automatico", filhos: [
          { id: "decidir", titulo: "O usuário escolhe o que fazer", detalhe: "As alternativas dependem do conflito encontrado. A sugestão nunca é aplicada sem sua escolha.", modo: "usuario", filhos: opcoes }, resumo,
        ] },
      ] },
    ] },
  ] };
}