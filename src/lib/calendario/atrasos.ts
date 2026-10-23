import { format, isBefore, isSameDay, startOfDay } from "date-fns";

export interface TarefaAtraso { status: string; date: Date; time?: string; dataOriginal?: Date }

/** Data em que o contato deveria ter acontecido, quando a tarefa foi empurrada para frente. */
export function dataPrevistaAtraso(task: TarefaAtraso): Date | undefined {
  if (!task.dataOriginal) return undefined;
  return isBefore(startOfDay(task.dataOriginal), startOfDay(task.date)) ? task.dataOriginal : undefined;
}

/** Pendente e vencida, ou remarcada automaticamente por não ter sido finalizada no dia previsto. */
export function tarefaAtrasada(task: TarefaAtraso, agora = new Date()): boolean {
  if (task.status !== "pending") return false;
  const hoje = startOfDay(agora);
  if (isBefore(startOfDay(task.date), hoje)) return true;
  if (isSameDay(task.date, hoje) && !!task.time && task.time < format(agora, "HH:mm")) return true;
  return !!dataPrevistaAtraso(task) && isBefore(startOfDay(task.dataOriginal!), hoje);
}
