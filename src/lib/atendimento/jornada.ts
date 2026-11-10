import { eachDayOfInterval, format, parseISO, subDays } from "date-fns";

export interface DiarioJornada { usuario_id: string; dia: string; metrica: string; valor: number }
export interface DadosJornada {
  usuario_id: string; pode_comparar: boolean;
  usuarios: { id: string; nome: string }[];
  diarios: DiarioJornada[];
  pendencias: { usuario_id: string; atrasados: number; agendados_hoje: number }[];
  sem_autoria: { mensagens: number; pedidos: number };
}
export const METRICAS_JORNADA = [
  { id: "atendimentos", nome: "Atendimentos finalizados", grupo: "Atendimento" },
  { id: "ligacoes_atendidas", nome: "Ligações atendidas", grupo: "Telefonia" },
  { id: "ligacoes_realizadas", nome: "Ligações realizadas", grupo: "Telefonia" },
  { id: "atendimento_telefone", nome: "Atendimentos por telefone", grupo: "Telefonia" },
  { id: "whatsapp_registrados", nome: "Mensagens WhatsApp registradas", grupo: "WhatsApp" },
  { id: "atendimento_whatsapp", nome: "Atendimentos WhatsApp", grupo: "WhatsApp" },
  { id: "massa_whatsapp_encaminhado", nome: "WhatsApp em massa encaminhados", grupo: "WhatsApp" },
  { id: "massa_whatsapp_retornos", nome: "Retornos de WhatsApp em massa", grupo: "WhatsApp" },
  { id: "emails_enviados", nome: "E-mails registrados como enviados", grupo: "E-mail" },
  { id: "emails_respondidos", nome: "Respostas de e-mail registradas", grupo: "E-mail" },
  { id: "massa_email_encaminhado", nome: "E-mails em massa encaminhados", grupo: "E-mail" },
  { id: "atendimento_presencial", nome: "Visitas finalizadas no Atendimento", grupo: "Visitas" },
  { id: "visitas_confirmadas", nome: "Visitas com presença confirmada", grupo: "Visitas" },
  { id: "pedidos_fechados", nome: "Pedidos fechados", grupo: "Vendas" },
  { id: "valor_vendas", nome: "Valor dos pedidos fechados", grupo: "Vendas" },
  { id: "segundos_ligacao", nome: "Tempo em ligação", grupo: "Telefonia" },
] as const;
export function periodoAnterior(inicio: string, fim: string) {
  const dias = eachDayOfInterval({ start: parseISO(inicio), end: parseISO(fim) }).length;
  return { inicio: format(subDays(parseISO(inicio), dias), "yyyy-MM-dd"), fim: format(subDays(parseISO(inicio), 1), "yyyy-MM-dd") };
}
export function totalJornada(diarios: DiarioJornada[], metrica: string, inicio: string, fim: string, usuario = "todos") {
  return diarios.filter(d => d.dia >= inicio && d.dia <= fim && (usuario === "todos" || d.usuario_id === usuario) && (metrica === "atendimentos" ? d.metrica.startsWith("atendimento_") : d.metrica === metrica)).reduce((n, d) => n + Number(d.valor), 0);
}
export function variacaoJornada(atual: number, anterior: number): number | null {
  return anterior === 0 ? null : (atual - anterior) / anterior * 100;
}
export function serieJornada(diarios: DiarioJornada[], metrica: string, inicio: string, fim: string, usuario = "todos", mensal = false) {
  const grupos = new Map<string, number>();
  eachDayOfInterval({ start: parseISO(inicio), end: parseISO(fim) }).forEach(d => {
    const dia = format(d, "yyyy-MM-dd"); const chave = mensal ? dia.slice(0, 7) : dia;
    grupos.set(chave, (grupos.get(chave) || 0) + totalJornada(diarios, metrica, dia, dia, usuario));
  });
  return [...grupos].map(([data, valor]) => ({ data, nome: mensal ? format(parseISO(`${data}-01`), "MM/yyyy") : format(parseISO(data), "dd/MM"), valor }));
}
export const valorJornada = (valor: number, metrica: string) => metrica === "valor_vendas" ? valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : metrica === "segundos_ligacao" ? `${Math.floor(valor / 3600)}h ${Math.floor(valor % 3600 / 60)}min` : valor.toLocaleString("pt-BR");