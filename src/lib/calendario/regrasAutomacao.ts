/**
 * Criador de regras da agenda (gatilho → ação). Todas as regras do sistema que afetam a agenda
 * ficam na tabela calendario_regras_automacao (sistema=true). Regra nova que mexa na agenda:
 * adicionar em semear_regras_sistema (banco) e, se for gatilho/ação nova, nas listas abaixo.
 */
export type Condicao = "canais" | "status" | "texto" | "dias" | "valor";
export interface OpcaoGatilho { valor: string; rotulo: string; tela: string; condicoes: Condicao[]; somenteSistema?: boolean; evento: string }

export const GATILHOS: OpcaoGatilho[] = [
  { valor: "contato_criado", rotulo: "Ao criar contato", tela: "Cadastro de contatos", condicoes: [], evento: "cadastro" },
  { valor: "contato_vinculado_usuario", rotulo: "Ao vincular contato a um usuário", tela: "Cadastro de contatos", condicoes: [], somenteSistema: true, evento: "cadastro" },
  { valor: "cliente_inativado", rotulo: "Ao inativar cliente", tela: "Cadastro de contatos", condicoes: [], somenteSistema: true, evento: "inativacao" },
  { valor: "vendedores_repassados", rotulo: "Ao repassar vendedores", tela: "Cadastro de contatos", condicoes: [], somenteSistema: true, evento: "cadastro" },
  { valor: "empresa_criada", rotulo: "Ao criar empresa", tela: "Cadastro de empresas", condicoes: [], evento: "cadastro" },
  { valor: "contato_vinculado_empresa", rotulo: "Ao vincular contato real à empresa", tela: "Cadastro de empresas", condicoes: [], somenteSistema: true, evento: "cadastro" },
  { valor: "empresa_vinculada_usuario", rotulo: "Ao vincular empresa a um usuário", tela: "Cadastro de empresas", condicoes: [], somenteSistema: true, evento: "cadastro" },
  { valor: "atendimento_finalizado", rotulo: "Ao finalizar atendimento", tela: "Atendimento", condicoes: ["canais", "texto"], evento: "atendimento" },
  { valor: "interacao_cliente", rotulo: "Ao interagir com o cliente", tela: "Atendimento", condicoes: [], somenteSistema: true, evento: "atendimento" },
  { valor: "atendimento_ignorado", rotulo: "Ao ignorar movimentação", tela: "Atendimento", condicoes: [], somenteSistema: true, evento: "atendimento" },
  { valor: "ligacao_discador", rotulo: "Ao concluir ligação do discador", tela: "Atendimento", condicoes: [], somenteSistema: true, evento: "atendimento" },
  { valor: "tarefa_criada_manual", rotulo: "Ao criar tarefa manualmente", tela: "Calendário", condicoes: [], somenteSistema: true, evento: "agenda" },
  { valor: "tarefa_arrastada", rotulo: "Ao arrastar tarefa", tela: "Calendário", condicoes: [], somenteSistema: true, evento: "agenda" },
  { valor: "horario_vencido", rotulo: "Quando o horário da tarefa vence", tela: "Calendário", condicoes: [], somenteSistema: true, evento: "agenda" },
  { valor: "sem_contato_dias", rotulo: "Cliente sem contato há X dias", tela: "Verificação diária", condicoes: ["dias"], evento: "diario" },
  { valor: "orcamento_criado", rotulo: "Ao criar orçamento", tela: "Orçamentos", condicoes: ["valor"], evento: "orcamento" },
  { valor: "orcamento_status", rotulo: "Ao mudar status do orçamento (fechar/perder)", tela: "Orçamentos", condicoes: ["status", "valor"], evento: "orcamento" },
  { valor: "pedido_criado", rotulo: "Ao criar pedido", tela: "Pedidos", condicoes: [], evento: "pedido" },
  { valor: "pedido_alterado", rotulo: "Ao mudar status do pedido", tela: "Pedidos", condicoes: ["status"], evento: "pedido" },
  { valor: "pedido_aprovado", rotulo: "Ao aprovar pedido (aprovado/pago)", tela: "Pedidos", condicoes: [], evento: "pedido" },
  { valor: "whatsapp_recebido", rotulo: "Ao receber WhatsApp", tela: "WhatsApp", condicoes: ["texto"], evento: "mensagem" },
  { valor: "whatsapp_enviado", rotulo: "Ao enviar WhatsApp", tela: "WhatsApp", condicoes: ["texto"], evento: "mensagem" },
  { valor: "bloco_bot", rotulo: "Ao rodar bloco do bot", tela: "Bot de atendimento", condicoes: ["texto"], evento: "mensagem" },
  { valor: "email_recebido", rotulo: "Ao receber e-mail (inclusive em segundo plano)", tela: "E-mail", condicoes: ["texto"], evento: "mensagem" },
  { valor: "email_enviado", rotulo: "Ao enviar e-mail", tela: "E-mail", condicoes: ["texto"], evento: "mensagem" },
  { valor: "email_aberto", rotulo: "Quando o cliente abrir o e-mail", tela: "E-mail", condicoes: [], evento: "mensagem" },
  { valor: "ligacao_recebida", rotulo: "Ao receber ligação", tela: "Telefonia", condicoes: ["status"], evento: "ligacao" },
  { valor: "ligacao_realizada", rotulo: "Ao fazer ligação", tela: "Telefonia", condicoes: ["status"], evento: "ligacao" },
];

export const ACOES: { valor: string; rotulo: string; somenteSistema?: boolean; mexe: "cria" | "muda" | "remove" | "nenhum" }[] = [
  { valor: "criar_tarefa", rotulo: "Criar tarefa na agenda", mexe: "cria" },
  { valor: "remarcar_tarefa", rotulo: "Remarcar tarefas pendentes do cliente", mexe: "muda" },
  { valor: "concluir_tarefas", rotulo: "Concluir tarefas pendentes (até hoje)", mexe: "remove" },
  { valor: "cancelar_tarefas", rotulo: "Cancelar tarefas futuras do cliente", mexe: "remove" },
  { valor: "transferir_tarefas", rotulo: "Passar tarefas pendentes para o responsável", mexe: "muda" },
  { valor: "criar_contato_temporario", rotulo: "Criar contato temporário", somenteSistema: true, mexe: "cria" },
  { valor: "perguntar_conflito", rotulo: "Perguntar qual data manter", somenteSistema: true, mexe: "muda" },
  { valor: "sugerir_data", rotulo: "Sugerir data pelos dias padrão", somenteSistema: true, mexe: "nenhum" },
  { valor: "exigir_finalizacao", rotulo: "Exigir finalização com próxima data", somenteSistema: true, mexe: "cria" },
  { valor: "abrir_finalizacao", rotulo: "Abrir finalização do atendimento", somenteSistema: true, mexe: "cria" },
  { valor: "marcar_atrasado", rotulo: "Marcar como atrasado", somenteSistema: true, mexe: "nenhum" },
  { valor: "nenhuma", rotulo: "Não alterar a agenda", somenteSistema: true, mexe: "nenhum" },
];

export const CANAIS_REGRA = [
  { valor: "whatsapp", rotulo: "WhatsApp" },
  { valor: "telefone", rotulo: "Telefone" },
  { valor: "email", rotulo: "E-mail" },
  { valor: "presencial", rotulo: "Visita" },
  { valor: "chat", rotulo: "Chat" },
];

export const DIAS_SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export const MODOS_RELACAO = [
  { valor: "junto", rotulo: "Executar as duas" },
  { valor: "sobrepor", rotulo: "Esta sobrepõe a outra" },
  { valor: "ceder", rotulo: "Ignorar esta quando a outra rodar" },
  { valor: "desativar", rotulo: "Desativar a outra regra" },
];

export const rotuloGatilho = (v: string) => GATILHOS.find((g) => g.valor === v)?.rotulo || v;
export const rotuloAcao = (v: string) => {
  if (v.startsWith("validar_")) return "Validar ao agendar";
  return ACOES.find((a) => a.valor === v)?.rotulo || v;
};
export const telaDoGatilho = (v: string) => GATILHOS.find((g) => g.valor === v)?.tela || "Outros";
const mexe = (a: string) => ACOES.find((x) => x.valor === a)?.mexe || (a.startsWith("validar_") ? "muda" : "nenhum");

export interface RegraBase { id: string; nome: string; gatilho: string; acao: string; ativa: boolean; condicoes: any; acao_config: any; relacoes: Record<string, string>; sistema: boolean; executor: string; prioridade: number }
export interface Interferencia { regra: RegraBase; nivel: "alto" | "medio" | "baixo"; motivos: string[] }

/** Encontra regras que podem interferir com a regra informada. */
export function analisarInterferencias(alvo: Pick<RegraBase, "id" | "gatilho" | "acao" | "condicoes">, todas: RegraBase[]): Interferencia[] {
  const evAlvo = GATILHOS.find((g) => g.valor === alvo.gatilho)?.evento;
  const mA = mexe(alvo.acao);
  const out: Interferencia[] = [];
  for (const r of todas) {
    if (r.id === alvo.id || !r.ativa) continue;
    const mB = mexe(r.acao);
    const motivos: string[] = [];
    let nivel: Interferencia["nivel"] = "baixo";
    const opostas = (mA === "cria" && mB === "remove") || (mA === "remove" && mB === "cria") || (mA === "muda" && mB === "remove") || (mA === "remove" && mB === "muda");
    if (r.gatilho === alvo.gatilho) {
      motivos.push("Disparam no mesmo momento");
      nivel = "medio";
      if (mA === "cria" && mB === "cria") { motivos.push("As duas criam tarefa: pode duplicar ou uma impedir a outra"); nivel = "alto"; }
      if (opostas) { motivos.push("Ações opostas: uma cria/muda e a outra remove tarefas"); nivel = "alto"; }
      if (mA === "muda" && mB === "muda") { motivos.push("As duas alteram as mesmas tarefas; a de menor prioridade roda depois"); nivel = "alto"; }
      const cA = alvo.condicoes?.canais || [], cB = r.condicoes?.canais || [];
      if (cA.length && cB.length && !cA.some((c: string) => cB.includes(c))) { motivos.push("Canais diferentes — só interferem se o canal mudar"); nivel = "baixo"; }
    } else if (evAlvo && GATILHOS.find((g) => g.valor === r.gatilho)?.evento === evAlvo && mA !== "nenhum" && mB !== "nenhum") {
      motivos.push("Eventos ligados na mesma tela/processo");
      if (opostas) { motivos.push("Ações opostas sobre as tarefas do cliente"); nivel = "medio"; }
    } else if (opostas) {
      motivos.push("Ações opostas sobre as tarefas do cliente em momentos diferentes");
    }
    if (motivos.length) out.push({ regra: r, nivel, motivos });
  }
  const peso = { alto: 0, medio: 1, baixo: 2 };
  return out.sort((a, b) => peso[a.nivel] - peso[b.nivel]);
}

/** Descreve como duas regras se relacionam pelas escolhas salvas. */
export function relacaoEntre(a: RegraBase, b: RegraBase): string | null {
  const ab = a.relacoes?.[b.id], ba = b.relacoes?.[a.id];
  if (ab === "sobrepor" || ba === "ceder") return `"${a.nome}" sobrepõe "${b.nome}"`;
  if (ba === "sobrepor" || ab === "ceder") return `"${b.nome}" sobrepõe "${a.nome}"`;
  if (ab === "junto" || ba === "junto") return "Executam juntas";
  return null;
}
