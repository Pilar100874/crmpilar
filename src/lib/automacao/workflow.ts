import { supabase } from "@/integrations/supabase/client";
import { Bloco, comandoAutomacao } from "@/lib/automacao/api";

/** Tabela nova ainda não está nos tipos gerados. */
const db = supabase as unknown as { from: (t: string) => any };

export type TipoGatilho =
  | "bloco_clicado"
  | "bloco_ligado"
  | "bloco_desligado"
  | "dispositivo_ligado"
  | "dispositivo_desligado"
  | "qualquer_mudanca";

export interface Gatilho {
  tipo: TipoGatilho;
  bloco_id?: string | null;
  device_id?: string | null;
}

export type TipoCondicao =
  | "sempre"
  | "bloco_ligado"
  | "bloco_desligado"
  | "dispositivo_ligado"
  | "dispositivo_desligado"
  | "estado_novo_ligado"
  | "estado_novo_desligado"
  | "horario_entre"
  | "dia_semana";

export interface Condicao {
  tipo: TipoCondicao;
  bloco_id?: string | null;
  device_id?: string | null;
  /** Horário no formato 08:00 */
  de?: string;
  ate?: string;
  /** 0 = domingo ... 6 = sábado */
  dias?: number[];
}

export type TipoAcao = "ligar" | "desligar" | "alternar" | "pulso" | "status" | "esperar" | "mensagem";

export interface Acao {
  tipo: TipoAcao;
  /** Para ações de equipamento: escolher pelo elemento do painel ou direto pelo equipamento. */
  alvo?: "bloco" | "dispositivo";
  bloco_id?: string | null;
  device_id?: string | null;
  canal?: number;
  segundos?: number;
  texto?: string;
}

export interface Regra {
  id: string;
  ambiente_id: string | null;
  nome: string;
  ativo: boolean;
  ordem: number;
  combinador: "todas" | "qualquer";
  gatilho: Gatilho;
  condicoes: Condicao[];
  acoes: Acao[];
}

export const GATILHOS: { valor: TipoGatilho; label: string; descricao: string }[] = [
  { valor: "bloco_clicado", label: "Quando eu tocar em um elemento", descricao: "Serve também para elementos sem equipamento (botão de cena)" },
  { valor: "bloco_ligado", label: "Quando um elemento ligar", descricao: "O elemento escolhido passou para ligado" },
  { valor: "bloco_desligado", label: "Quando um elemento desligar", descricao: "O elemento escolhido passou para desligado" },
  { valor: "dispositivo_ligado", label: "Quando um equipamento ligar", descricao: "Vale para qualquer elemento ligado a esse equipamento" },
  { valor: "dispositivo_desligado", label: "Quando um equipamento desligar", descricao: "Vale para qualquer elemento ligado a esse equipamento" },
  { valor: "qualquer_mudanca", label: "Quando qualquer elemento mudar", descricao: "Dispara em qualquer mudança do painel" },
];

export const CONDICOES: { valor: TipoCondicao; label: string }[] = [
  { valor: "sempre", label: "Sempre (sem condição)" },
  { valor: "bloco_ligado", label: "Outro elemento está ligado" },
  { valor: "bloco_desligado", label: "Outro elemento está desligado" },
  { valor: "dispositivo_ligado", label: "Um equipamento está ligado" },
  { valor: "dispositivo_desligado", label: "Um equipamento está desligado" },
  { valor: "estado_novo_ligado", label: "O elemento que disparou ficou ligado" },
  { valor: "estado_novo_desligado", label: "O elemento que disparou ficou desligado" },
  { valor: "horario_entre", label: "Dentro de um horário" },
  { valor: "dia_semana", label: "Em certos dias da semana" },
];

export const ACOES: { valor: TipoAcao; label: string }[] = [
  { valor: "ligar", label: "Ligar" },
  { valor: "desligar", label: "Desligar" },
  { valor: "alternar", label: "Inverter (liga se estiver desligado)" },
  { valor: "pulso", label: "Acionar por pulso (portão/porta)" },
  { valor: "status", label: "Atualizar a leitura" },
  { valor: "esperar", label: "Esperar alguns segundos" },
  { valor: "mensagem", label: "Mostrar um aviso na tela" },
];

export const DIAS_SEMANA = [
  { valor: 0, label: "Dom" },
  { valor: 1, label: "Seg" },
  { valor: 2, label: "Ter" },
  { valor: 3, label: "Qua" },
  { valor: 4, label: "Qui" },
  { valor: 5, label: "Sex" },
  { valor: 6, label: "Sáb" },
];

const normalizar = (r: any): Regra => ({
  id: r.id,
  ambiente_id: r.ambiente_id ?? null,
  nome: r.nome ?? "",
  ativo: r.ativo !== false,
  ordem: r.ordem ?? 0,
  combinador: r.combinador === "qualquer" ? "qualquer" : "todas",
  gatilho: (r.gatilho ?? { tipo: "bloco_clicado" }) as Gatilho,
  condicoes: Array.isArray(r.condicoes) ? (r.condicoes as Condicao[]) : [],
  acoes: Array.isArray(r.acoes) ? (r.acoes as Acao[]) : [],
});

export async function listarRegras(): Promise<Regra[]> {
  const { data } = await db.from("automacao_regras").select("*").order("ordem").order("nome");
  return ((data ?? []) as any[]).map(normalizar);
}

export async function salvarRegra(r: Partial<Regra>): Promise<Regra | null> {
  const payload = {
    ambiente_id: r.ambiente_id ?? null,
    nome: r.nome ?? "Nova automação",
    ativo: r.ativo !== false,
    ordem: r.ordem ?? 0,
    combinador: r.combinador ?? "todas",
    gatilho: r.gatilho ?? { tipo: "bloco_clicado" },
    condicoes: r.condicoes ?? [],
    acoes: r.acoes ?? [],
  };
  if (r.id) {
    const { data } = await db.from("automacao_regras").update(payload).eq("id", r.id).select().maybeSingle();
    return data ? normalizar(data) : null;
  }
  const { data } = await db.from("automacao_regras").insert(payload).select().maybeSingle();
  return data ? normalizar(data) : null;
}

export async function excluirRegra(id: string) {
  await db.from("automacao_regras").delete().eq("id", id);
}

/** O que aconteceu no painel. */
export interface EventoPainel {
  tipo: "clique" | "mudanca";
  bloco: Bloco;
  /** Estado depois da mudança (quando houver). */
  ligado?: boolean | null;
}

export interface ContextoExecucao {
  regras: Regra[];
  blocos: Bloco[];
  /** Estado atual conhecido de cada elemento do painel. */
  estados: Record<string, boolean | null>;
  /** Avisa a tela que um equipamento mudou de estado. */
  aplicarEstado: (deviceId: string | null, blocoId: string | null, ligado: boolean | null) => void;
  aviso?: (texto: string, erro?: boolean) => void;
}

const esperar = (s: number) => new Promise((r) => setTimeout(r, Math.max(0, s) * 1000));

const dentroDoHorario = (de?: string, ate?: string) => {
  if (!de || !ate) return true;
  const agora = new Date();
  const minutos = agora.getHours() * 60 + agora.getMinutes();
  const conv = (h: string) => {
    const [a, b] = h.split(":").map((x) => Number(x) || 0);
    return a * 60 + b;
  };
  const i = conv(de);
  const f = conv(ate);
  // Faixa que passa da meia-noite (ex.: 22:00 até 06:00).
  return i <= f ? minutos >= i && minutos <= f : minutos >= i || minutos <= f;
};

/** Estado conhecido de um equipamento a partir dos elementos do painel. */
function estadoDoDispositivo(ctx: ContextoExecucao, deviceId?: string | null): boolean | null {
  if (!deviceId) return null;
  for (const b of ctx.blocos) {
    if (b.device_id === deviceId) {
      const v = ctx.estados[b.id];
      if (v === true || v === false) return v;
    }
  }
  return null;
}

async function estadoRealDoDispositivo(ctx: ContextoExecucao, deviceId?: string | null): Promise<boolean | null> {
  const conhecido = estadoDoDispositivo(ctx, deviceId);
  if (conhecido !== null || !deviceId) return conhecido;
  const r = await comandoAutomacao(deviceId, "status");
  return r.ok ? r.ligado ?? null : null;
}

async function condicaoAtendida(c: Condicao, ev: EventoPainel, ctx: ContextoExecucao): Promise<boolean> {
  switch (c.tipo) {
    case "sempre":
      return true;
    case "bloco_ligado":
    case "bloco_desligado": {
      const alvo = ctx.blocos.find((b) => b.id === c.bloco_id);
      let v = c.bloco_id ? ctx.estados[c.bloco_id] ?? null : null;
      if (v === null && alvo?.device_id) v = await estadoRealDoDispositivo(ctx, alvo.device_id);
      return c.tipo === "bloco_ligado" ? v === true : v === false;
    }
    case "dispositivo_ligado":
    case "dispositivo_desligado": {
      const v = await estadoRealDoDispositivo(ctx, c.device_id);
      return c.tipo === "dispositivo_ligado" ? v === true : v === false;
    }
    case "estado_novo_ligado":
      return ev.ligado === true;
    case "estado_novo_desligado":
      return ev.ligado === false;
    case "horario_entre":
      return dentroDoHorario(c.de, c.ate);
    case "dia_semana":
      return !c.dias?.length || c.dias.includes(new Date().getDay());
    default:
      return true;
  }
}

function combina(g: Gatilho, ev: EventoPainel): boolean {
  switch (g.tipo) {
    case "bloco_clicado":
      return ev.tipo === "clique" && (!g.bloco_id || g.bloco_id === ev.bloco.id);
    case "bloco_ligado":
      return ev.ligado === true && (!g.bloco_id || g.bloco_id === ev.bloco.id);
    case "bloco_desligado":
      return ev.ligado === false && (!g.bloco_id || g.bloco_id === ev.bloco.id);
    case "dispositivo_ligado":
      return ev.ligado === true && !!g.device_id && g.device_id === ev.bloco.device_id;
    case "dispositivo_desligado":
      return ev.ligado === false && !!g.device_id && g.device_id === ev.bloco.device_id;
    case "qualquer_mudanca":
      return true;
    default:
      return false;
  }
}

async function executarAcao(a: Acao, ctx: ContextoExecucao) {
  if (a.tipo === "esperar") {
    await esperar(a.segundos ?? 1);
    return;
  }
  if (a.tipo === "mensagem") {
    ctx.aviso?.(a.texto || "Aviso da automação.");
    return;
  }
  const blocoAlvo = a.alvo === "bloco" ? ctx.blocos.find((b) => b.id === a.bloco_id) ?? null : null;
  const deviceId = a.alvo === "bloco" ? blocoAlvo?.device_id ?? null : a.device_id ?? null;
  if (!deviceId) {
    ctx.aviso?.("Uma ação da automação está sem equipamento escolhido.", true);
    return;
  }
  const canal = a.alvo === "bloco" ? blocoAlvo?.canal ?? 0 : a.canal ?? 0;

  let acao: "ligar" | "desligar" | "pulso" | "status" = "status";
  if (a.tipo === "alternar") {
    const atual = await estadoRealDoDispositivo(ctx, deviceId);
    acao = atual === true ? "desligar" : "ligar";
  } else {
    acao = a.tipo;
  }

  const r = await comandoAutomacao(deviceId, acao, canal);
  if (!r.ok) {
    ctx.aviso?.(r.mensagem, true);
    return;
  }
  const novo = r.ligado ?? (acao === "ligar" ? true : acao === "desligar" ? false : null);
  if (acao !== "pulso") ctx.aplicarEstado(deviceId, blocoAlvo?.id ?? null, novo);
}

/**
 * Roda as automações que combinam com o que aconteceu no painel.
 * Devolve quantas automações foram executadas.
 */
export async function rodarRegras(ev: EventoPainel, ctx: ContextoExecucao): Promise<number> {
  const candidatas = ctx.regras
    .filter((r) => r.ativo)
    .filter((r) => !r.ambiente_id || r.ambiente_id === ev.bloco.ambiente_id)
    .filter((r) => combina(r.gatilho, ev))
    .sort((a, b) => a.ordem - b.ordem);

  let executadas = 0;
  for (const regra of candidatas) {
    const testes = regra.condicoes.length ? regra.condicoes : [{ tipo: "sempre" } as Condicao];
    const resultados: boolean[] = [];
    for (const c of testes) resultados.push(await condicaoAtendida(c, ev, ctx));
    const passou = regra.combinador === "qualquer" ? resultados.some(Boolean) : resultados.every(Boolean);
    if (!passou) continue;
    for (const a of regra.acoes) await executarAcao(a, ctx);
    executadas += 1;
  }
  return executadas;
}
