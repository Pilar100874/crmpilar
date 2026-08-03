/**
 * Gatilho por agendamento das automações de logística.
 *
 * Permite disparar os blocos de ação em horários definidos (diário, semanal,
 * mensal) ou a cada X minutos, independentemente do estado do veículo.
 * O controle do último disparo fica em localStorage para sobreviver a
 * recarregamentos e evitar disparos duplicados entre abas/mapas.
 */

export type AgendaModo = 'intervalo' | 'diario' | 'semanal' | 'mensal';

export interface AgendaConfig {
  agenda_modo?: AgendaModo;
  agenda_intervalo_minutos?: number;
  agenda_horarios?: string[];
  agenda_dias_semana?: string[];
  agenda_dias_mes?: number[];
  agenda_tolerancia_minutos?: number;
}

const PREFIX = 'logistica:agendamento:';
const DIAS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'];

export const DIAS_SEMANA_AGENDA = ['seg', 'ter', 'qua', 'qui', 'sex', 'sab', 'dom'];

function lerUltimo(key: string): number {
  try {
    return Number(localStorage.getItem(key)) || 0;
  } catch {
    return 0;
  }
}

function salvarUltimo(key: string, ts: number) {
  try {
    localStorage.setItem(key, String(ts));
  } catch {
    /* noop */
  }
}

/** Retorna true (e registra o disparo) quando o agendamento está vencido agora. */
export function agendamentoDevido(chave: string, cfg: AgendaConfig, agora = new Date()): boolean {
  const key = `${PREFIX}${chave}`;
  const modo: AgendaModo = cfg.agenda_modo || 'diario';
  const ultimo = lerUltimo(key);

  if (modo === 'intervalo') {
    const intervalo = Math.max(1, Number(cfg.agenda_intervalo_minutos) || 60) * 60000;
    if (agora.getTime() - ultimo < intervalo) return false;
    salvarUltimo(key, agora.getTime());
    return true;
  }

  // Filtro de dia
  if (modo === 'semanal') {
    const dias = cfg.agenda_dias_semana?.length
      ? cfg.agenda_dias_semana
      : ['seg', 'ter', 'qua', 'qui', 'sex'];
    if (!dias.includes(DIAS[agora.getDay()])) return false;
  }
  if (modo === 'mensal') {
    const dias = cfg.agenda_dias_mes?.length ? cfg.agenda_dias_mes : [1];
    if (!dias.map(Number).includes(agora.getDate())) return false;
  }

  const horarios = cfg.agenda_horarios?.length ? cfg.agenda_horarios : ['08:00'];
  const tolerancia = Math.max(1, Number(cfg.agenda_tolerancia_minutos) || 5) * 60000;

  for (const h of horarios) {
    const [hh, mm] = String(h).split(':').map(Number);
    if (!Number.isFinite(hh) || !Number.isFinite(mm)) continue;
    const slot = new Date(agora);
    slot.setHours(hh, mm, 0, 0);
    const slotTs = slot.getTime();
    if (agora.getTime() < slotTs) continue;
    if (agora.getTime() - slotTs > tolerancia) continue;
    if (ultimo >= slotTs) continue;
    salvarUltimo(key, agora.getTime());
    return true;
  }
  return false;
}

/**
 * Identificador do período atual do agendamento.
 * Usado como janela da trava anti-duplicidade: dentro do mesmo período,
 * cada destinatário só recebe uma vez.
 */
export function periodoAgendamento(cfg: AgendaConfig | null | undefined, agora = new Date()): string {
  const modo: AgendaModo = cfg?.agenda_modo || (cfg ? 'diario' : 'diario');
  if (!cfg) {
    // Sem gatilho de agendamento: janela diária como padrão seguro.
    return `dia:${agora.toISOString().slice(0, 10)}`;
  }
  if (modo === 'intervalo') {
    const intervalo = Math.max(1, Number(cfg.agenda_intervalo_minutos) || 60) * 60000;
    return `int:${Math.floor(agora.getTime() / intervalo)}`;
  }
  const dia = `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, '0')}-${String(agora.getDate()).padStart(2, '0')}`;
  const horarios = cfg.agenda_horarios?.length ? cfg.agenda_horarios : ['08:00'];
  // Slot mais recente já atingido no dia
  let slotAtual = horarios[0];
  for (const h of horarios) {
    const [hh, mm] = String(h).split(':').map(Number);
    if (!Number.isFinite(hh) || !Number.isFinite(mm)) continue;
    const slot = new Date(agora);
    slot.setHours(hh, mm, 0, 0);
    if (agora.getTime() >= slot.getTime()) slotAtual = h;
  }
  return `${modo}:${dia}:${slotAtual}`;
}

/** Texto curto do agendamento, para exibir no bloco. */

export function descreverAgendamento(cfg: AgendaConfig): string {
  const modo: AgendaModo = cfg.agenda_modo || 'diario';
  const horarios = cfg.agenda_horarios?.length ? cfg.agenda_horarios.join(', ') : '08:00';
  if (modo === 'intervalo') return `A cada ${Number(cfg.agenda_intervalo_minutos) || 60} min`;
  if (modo === 'diario') return `Todo dia às ${horarios}`;
  if (modo === 'semanal') {
    const dias = cfg.agenda_dias_semana?.length ? cfg.agenda_dias_semana.join(', ') : 'seg a sex';
    return `${dias} às ${horarios}`;
  }
  const diasMes = cfg.agenda_dias_mes?.length ? cfg.agenda_dias_mes.join(', ') : '1';
  return `Dia ${diasMes} do mês às ${horarios}`;
}
