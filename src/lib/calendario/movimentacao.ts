import { closestCenter, pointerWithin, type CollisionDetection } from "@dnd-kit/core";
import { format, isSameDay, startOfDay } from "date-fns";

// Cards sortables não são destinos: só datas e faixas de horário aceitam tarefas.
export const detectarDestinoCalendario: CollisionDetection = (args) => {
  const datas = args.droppableContainers.filter(container => container.data.current?.date);
  const filtrados = { ...args, droppableContainers: datas };
  return args.pointerCoordinates ? pointerWithin(filtrados) : closestCenter(filtrados);
};

export function prepararMovimento(
  tarefa: { date: Date; time?: string },
  destino: Date,
  regras: { bloquear_datas_passadas: boolean; bloquear_horarios_passados: boolean; realocacao_diaria: boolean },
  agora = new Date(),
) {
  if (regras.bloquear_datas_passadas && startOfDay(destino) < startOfDay(agora)) return null;
  let time = tarefa.time;
  if (regras.realocacao_diaria && !isSameDay(tarefa.date, destino)) time = "";
  if (regras.bloquear_horarios_passados && time && isSameDay(destino, agora) && time < format(agora, "HH:mm")) {
    time = format(agora, "HH:mm");
  }
  return { date: destino, time };
}