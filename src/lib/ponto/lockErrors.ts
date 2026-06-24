import { toast } from "sonner";

/**
 * Mapeia mensagens dos triggers de intertravamento (apuração de ponto)
 * para toasts amigáveis ao usuário, explicando o que está travando e como liberar.
 */
const LOCK_HINTS: Array<{ match: RegExp; titulo: string; descricao: string }> = [
  {
    match: /a data .* está em um mês fechado/i,
    titulo: "Período fechado",
    descricao:
      "Esta batida está em um mês já fechado ou exportado para a folha. Reabra o período em Ponto › Exportação para alterar.",
  },
  {
    match: /ajuste em .* não permitido/i,
    titulo: "Ajuste bloqueado",
    descricao:
      "Não é possível registrar ajustes em períodos fechados/exportados. Reabra o período antes.",
  },
  {
    match: /intervalo .* cobre um mês fechado/i,
    titulo: "Férias/Afastamento bloqueado",
    descricao:
      "O intervalo selecionado cobre um mês fechado/exportado. Reabra o período ou ajuste as datas.",
  },
  {
    match: /alterar escala\/turno/i,
    titulo: "Escala bloqueada",
    descricao:
      "A vigência atual cobre período fechado. Crie uma nova vigência iniciando em data futura não bloqueada.",
  },
  {
    match: /Assinatura de espelho não pode ser removida/i,
    titulo: "Assinatura protegida",
    descricao:
      "Reabra o período de fechamento para corrigir; assinaturas de espelho não podem ser apagadas.",
  },
  {
    match: /alterar feriado/i,
    titulo: "Feriado bloqueado",
    descricao:
      "O feriado está em mês fechado/exportado. Reabra o período para alterá-lo.",
  },
  {
    match: /atestado cobre dia .* em mês fechado/i,
    titulo: "Atestado bloqueado",
    descricao:
      "Algum dia do atestado está em período fechado. Reabra o período antes de salvar.",
  },
  {
    match: /lançamento de banco de horas/i,
    titulo: "Banco de horas bloqueado",
    descricao:
      "Lançamentos em meses fechados/exportados não são permitidos.",
  },
  {
    match: /espelho de .* é somente leitura/i,
    titulo: "Espelho protegido",
    descricao:
      "O espelho deste dia está em mês fechado. Reabra o período para recalcular.",
  },
  {
    match: /alterar a data de admissão|alterar a data de demissão|admissão em |demissão em /i,
    titulo: "Datas do funcionário bloqueadas",
    descricao:
      "A data informada cai em período fechado/exportado. Reabra o período antes de alterar.",
  },
  {
    match: /escala está vinculada a funcionários em período fechado/i,
    titulo: "Escala em uso",
    descricao:
      "Essa escala é usada em períodos fechados. Duplique-a em uma nova escala ou reabra o período.",
  },
  {
    match: /alterar regras de jornada/i,
    titulo: "Regras de jornada bloqueadas",
    descricao:
      "Existem fechamentos. Crie uma nova regra com vigência futura ao invés de alterar.",
  },
  {
    match: /Já existe um fechamento para /i,
    titulo: "Fechamento duplicado",
    descricao:
      "Já existe um fechamento para esse mês nessa empresa.",
  },
  {
    match: /Limite de usuários atingido/i,
    titulo: "Limite de usuários",
    descricao:
      "O estabelecimento atingiu o número máximo de usuários permitidos.",
  },
];

/**
 * Verifica se o erro é de intertravamento e exibe toast explicativo.
 * Retorna true se tratou o erro; false se for erro desconhecido.
 */
export function handlePontoLockError(error: unknown): boolean {
  const msg =
    (error as any)?.message ||
    (error as any)?.error_description ||
    (typeof error === "string" ? error : "") ||
    "";

  if (!msg) return false;

  for (const hint of LOCK_HINTS) {
    if (hint.match.test(msg)) {
      toast.error(hint.titulo, {
        description: hint.descricao,
        duration: 7000,
      });
      return true;
    }
  }

  // Erros genéricos de check_violation do Postgres relacionados a período
  if (/check_violation|período bloqueado|periodo bloqueado/i.test(msg)) {
    toast.error("Operação bloqueada", {
      description: msg.replace(/^.*?:\s*/, ""),
      duration: 7000,
    });
    return true;
  }

  return false;
}

/**
 * Wrapper conveniente: trata erro de bloqueio ou repassa para handler padrão.
 */
export function toastPontoError(error: unknown, fallbackMessage = "Erro ao executar operação") {
  if (!handlePontoLockError(error)) {
    const msg = (error as any)?.message || fallbackMessage;
    toast.error(fallbackMessage, { description: msg });
  }
}
