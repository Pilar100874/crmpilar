import { CalendarDays, Users, Inbox, Sparkles, Send, UserPlus, User, Clock, FileText, MessageSquare, Phone, Mail, MapPin, Receipt, Wrench, type LucideIcon } from "lucide-react";
import type { RadialMenuItem } from "@/components/ui/radial-menu";

export interface ContextoRadial {
  cliente: boolean;
  whatsapp: boolean;
  telefone: boolean;
  email: boolean;
  visita: boolean;
  historico: boolean;
  tarefa: boolean;
  agenda: boolean;
  orcamentos: boolean;
}
const item = (id: string, label: string, icon: LucideIcon): RadialMenuItem => ({ id, label, icon });
export function montarMenuRadial(contexto: ContextoRadial, ferramentas: RadialMenuItem[]): RadialMenuItem[] {
  const cliente: RadialMenuItem[] = [];
  if (contexto.cliente) {
    if (contexto.whatsapp) cliente.push(item("cliente-chat", "WhatsApp", MessageSquare));
    if (contexto.telefone) cliente.push(item("cliente-tel", "Telefone", Phone));
    if (contexto.email) cliente.push(item("cliente-email", "E-mail", Mail));
    if (contexto.visita) cliente.push(item("cliente-visita", "Visita", MapPin));
    if (contexto.historico) cliente.push(item("cliente-historico", "Histórico", Clock));
    if (contexto.tarefa) cliente.push(item("cliente-tarefa", "Tarefa", FileText));
    if (contexto.agenda) cliente.push(item("cliente-agenda", "Agenda do cliente", CalendarDays));
    if (contexto.orcamentos) cliente.push(item("cliente-orcamentos", "Orçamentos", Receipt));
  }
  return [
    { ...item("fila", "Contatos", Users), subItems: [item("fila-tudo", "Todos os contatos", Users), item("fila-agendados", "Agendados", CalendarDays), item("fila-recebidos", "Recebidos", Inbox), item("fila-potenciais", "Potenciais", Sparkles)] },
    item("agenda", "Minha agenda", CalendarDays),
    item("disparo", "Disparo em massa", Send),
    item("cadastro", "Puxar ou criar cadastro", UserPlus),
    ...(cliente.length ? [{ ...item("cliente", "Cliente selecionado", User), subItems: cliente }] : []),
    ...(ferramentas.length ? [{ ...item("tools", "Ferramentas", Wrench), subItems: ferramentas }] : []),
  ];
}