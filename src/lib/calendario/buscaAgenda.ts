import { format } from "date-fns";

interface TarefaPesquisavel {
  title: string;
  description?: string;
  contactName?: string;
  assignedTo?: string;
  userName?: string;
  campaignName?: string;
  date: Date;
}

const normalizar = (valor: string) => valor.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

export function correspondeBuscaAgenda(tarefa: TarefaPesquisavel, busca: string): boolean {
  const termos = normalizar(busca).split(/\s+/).filter(Boolean);
  const texto = normalizar([
    tarefa.title, tarefa.description, tarefa.contactName, tarefa.assignedTo,
    tarefa.userName, tarefa.campaignName, format(tarefa.date, "dd/MM/yyyy"),
  ].filter(Boolean).join(" "));
  return termos.every(termo => texto.includes(termo));
}