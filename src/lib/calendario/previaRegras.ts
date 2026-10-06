import { format, isSameDay, startOfDay } from "date-fns";
import { rotuloAcao } from "./regrasAutomacao";

export type AcaoAgenda = "criar" | "editar" | "mover" | "concluir" | "reabrir" | "excluir";
export type SituacaoPasso = "vai_executar" | "nao_se_aplica" | "desativada";

export interface PassoPrevia {
  regra: string;
  situacao: SituacaoPasso;
  descricao: string;
}

export interface RegrasCalendario {
  bloquear_datas_passadas: boolean;
  bloquear_horarios_passados: boolean;
  deteccao_conflitos: boolean;
  bloqueio_finais_semana: boolean;
  horario_comercial: boolean;
  validacao_dia_todo: boolean;
  realocacao_diaria: boolean;
}

export interface AutomacaoAgenda { nome: string; gatilho: string; acao: string; ativa: boolean }

interface Contexto {
  acao: AcaoAgenda;
  regras: RegrasCalendario;
  automacoes: AutomacaoAgenda[];
  data?: Date;
  dataOriginal?: Date;
  horario?: string;
  diaTodo?: boolean;
  automatica?: boolean;
  conflitos?: number;
}

const fmt = (d?: Date) => (d ? format(d, "dd/MM/yyyy") : "-");
const fimDeSemana = (d?: Date) => !!d && (d.getDay() === 0 || d.getDay() === 6);

export const TITULO_ACAO: Record<AcaoAgenda, string> = {
  criar: "Criar tarefa",
  editar: "Salvar alterações da tarefa",
  mover: "Mover tarefa (arrastar)",
  concluir: "Concluir tarefa",
  reabrir: "Reabrir tarefa",
  excluir: "Excluir tarefa",
};

export function montarPassos(c: Contexto): PassoPrevia[] {
  const p: PassoPrevia[] = [];
  const r = c.regras;
  const add = (regra: string, ativa: boolean, aplica: boolean, sim: string, nao: string) =>
    p.push({ regra, situacao: !ativa ? "desativada" : aplica ? "vai_executar" : "nao_se_aplica", descricao: !ativa ? "Regra desligada nas configurações — nada será verificado." : aplica ? sim : nao });

  const hoje = startOfDay(new Date());
  const agora = new Date();

  if (c.acao === "criar" || c.acao === "editar" || c.acao === "mover") {
    const passada = !!c.data && startOfDay(c.data) < hoje;
    if (c.acao === "mover") {
      add("Bloquear datas passadas", r.bloquear_datas_passadas, passada,
        `A data ${fmt(c.data)} já passou: a tarefa NÃO será movida e aparecerá um aviso.`,
        `A data ${fmt(c.data)} não está no passado, segue.`);
      let horaPassada = false;
      if (c.horario && c.data && isSameDay(c.data, agora)) {
        const [h, m] = c.horario.split(":").map(Number);
        const dt = new Date(c.data); dt.setHours(h, m, 0, 0); horaPassada = dt < agora;
      }
      add("Bloquear horários passados", r.bloquear_horarios_passados, horaPassada,
        `O horário ${c.horario} de hoje já passou: será ajustado para ${format(agora, "HH:mm")}.`,
        "O horário não está no passado, segue sem ajuste.");
      add("Realocação diária", r.realocacao_diaria, !!c.dataOriginal && !!c.data && !isSameDay(c.dataOriginal, c.data),
        `Troca de dia ${fmt(c.dataOriginal)} → ${fmt(c.data)} registrada como realocação.`,
        "A tarefa continua no mesmo dia.");
    }

    if (c.acao !== "mover") {
      const aplicaDiaTodo = !c.diaTodo && !!c.automatica && !!c.data && startOfDay(c.data) > hoje;
      add("Validação de dia todo", r.validacao_dia_todo, aplicaDiaTodo,
        "Vai consultar se já existe tarefa de dia todo nesta data para o responsável; se existir, a tarefa automática é empurrada para o próximo dia livre.",
        c.automatica ? "Tarefa sem data futura ou marcada como dia todo — não verifica." : "Tarefa manual: o usuário tem controle, não realoca.");
    }

    const fds = fimDeSemana(c.data);
    add("Bloqueio de finais de semana", r.bloqueio_finais_semana, fds,
      c.automatica
        ? `${fmt(c.data)} cai em fim de semana: será realocada automaticamente para o próximo dia útil.`
        : `${fmt(c.data)} cai em fim de semana: vai abrir uma tela perguntando se você quer manter no fim de semana ou passar para o próximo dia útil (verificando tarefas de dia todo nesse dia).`,
      `${fmt(c.data)} é dia útil, segue.`);

    if (c.acao !== "mover") {
      add("Horário comercial", r.horario_comercial, !c.diaTodo && !!c.horario,
        c.automatica
          ? `Vai conferir ${c.horario} com o horário de trabalho do usuário; se estiver fora, ajusta automaticamente.`
          : `Vai conferir ${c.horario} com o horário de trabalho do usuário; se estiver fora, abre uma tela perguntando se quer ajustar.`,
        "Tarefa sem horário ou dia todo — não verifica.");
    }

    add("Detecção de conflitos", r.deteccao_conflitos, !!c.horario,
      (c.conflitos ?? 0) > 0
        ? `Existem ${c.conflitos} tarefa(s) do mesmo responsável às ${c.horario}: vai abrir uma tela para substituir ou manter todas.`
        : `Vai procurar outras tarefas do mesmo responsável às ${c.horario} — nenhuma encontrada agora.`,
      "Tarefa sem horário — não verifica conflito.");
  }

  if (c.acao === "concluir" || c.acao === "reabrir") {
    p.push({ regra: "Atualizar status", situacao: "vai_executar", descricao: c.acao === "concluir" ? "A tarefa será marcada como concluída." : "A tarefa voltará a ficar pendente." });
  }
  if (c.acao === "excluir") {
    p.push({ regra: "Exclusão", situacao: "vai_executar", descricao: "A tarefa será apagada definitivamente da agenda." });
  }

  p.push({ regra: "Gravar no banco", situacao: "vai_executar", descricao: "Salva a alteração e avisa as outras telas abertas (agenda, atendimento) para atualizar." });

  const gatilho = c.acao === "criar" ? "tarefa_criada_manual" : c.acao === "mover" ? "tarefa_arrastada" : null;
  if (gatilho) {
    const lista = c.automacoes.filter((a) => a.gatilho === gatilho);
    if (lista.length === 0) {
      p.push({ regra: "Automações da agenda", situacao: "nao_se_aplica", descricao: "Nenhuma automação cadastrada para este gatilho." });
    }
    lista.forEach((a) => p.push({
      regra: `Automação: ${a.nome}`,
      situacao: a.ativa ? "vai_executar" : "desativada",
      descricao: a.ativa ? `Depois de salvar: ${rotuloAcao(a.acao)}.` : "Automação desligada.",
    }));
  }
  return p;
}
