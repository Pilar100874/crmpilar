/**
 * Ritmo Humano — limites anti-bloqueio para disparos de WhatsApp.
 * Configuração por estabelecimento (tabela ritmo_humano_config).
 */

export interface RitmoHumano {
  ativo: boolean;
  delayMinSeg: number;
  delayMaxSeg: number;
  loteTamanho: number;
  pausaLoteMinMinutos: number;
  pausaLoteMaxMinutos: number;
  limiteDiario: number;
  respeitarJanela: boolean;
  horaInicio: number;
  horaFim: number;
  diasSemana: number[];
  variarTexto: boolean;
}

export const RITMO_PADRAO: RitmoHumano = {
  ativo: false,
  delayMinSeg: 25,
  delayMaxSeg: 55,
  loteTamanho: 40,
  pausaLoteMinMinutos: 10,
  pausaLoteMaxMinutos: 20,
  limiteDiario: 250,
  respeitarJanela: true,
  horaInicio: 9,
  horaFim: 18,
  diasSemana: [1, 2, 3, 4, 5],
  variarTexto: true,
};

export const dormir = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function aleatorio(min: number, max: number): number {
  if (max <= min) return min;
  return Math.floor(min + Math.random() * (max - min + 1));
}

export async function carregarRitmo(supabase: any, estabelecimentoId: string): Promise<RitmoHumano> {
  try {
    const { data } = await supabase
      .from("ritmo_humano_config")
      .select("*")
      .eq("estabelecimento_id", estabelecimentoId)
      .maybeSingle();
    if (!data) return RITMO_PADRAO;
    return {
      ativo: !!data.ativo,
      delayMinSeg: Number(data.delay_min_seg ?? RITMO_PADRAO.delayMinSeg),
      delayMaxSeg: Number(data.delay_max_seg ?? RITMO_PADRAO.delayMaxSeg),
      loteTamanho: Number(data.lote_tamanho ?? RITMO_PADRAO.loteTamanho),
      pausaLoteMinMinutos: Number(data.pausa_lote_min_minutos ?? RITMO_PADRAO.pausaLoteMinMinutos),
      pausaLoteMaxMinutos: Number(data.pausa_lote_max_minutos ?? RITMO_PADRAO.pausaLoteMaxMinutos),
      limiteDiario: Number(data.limite_diario ?? RITMO_PADRAO.limiteDiario),
      respeitarJanela: data.respeitar_janela !== false,
      horaInicio: Number(data.hora_inicio ?? RITMO_PADRAO.horaInicio),
      horaFim: Number(data.hora_fim ?? RITMO_PADRAO.horaFim),
      diasSemana: Array.isArray(data.dias_semana) && data.dias_semana.length
        ? data.dias_semana.map((d: any) => Number(d))
        : RITMO_PADRAO.diasSemana,
      variarTexto: data.variar_texto !== false,
    };
  } catch (e) {
    console.warn("[ritmo] falha ao carregar config:", e);
    return RITMO_PADRAO;
  }
}

/** Data/hora atual no fuso de São Paulo (partes). */
function agoraSaoPaulo(): { hora: number; diaSemana: number } {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Sao_Paulo",
    hour12: false,
    weekday: "short",
    hour: "2-digit",
  });
  const partes: Record<string, string> = {};
  for (const p of fmt.formatToParts(new Date())) partes[p.type] = p.value;
  const mapa: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return { hora: Number(partes.hour) % 24, diaSemana: mapa[partes.weekday] ?? 1 };
}

/** Retorna null se pode enviar agora, ou o motivo do bloqueio. */
export function foraDaJanela(ritmo: RitmoHumano): string | null {
  if (!ritmo.ativo || !ritmo.respeitarJanela) return null;
  const { hora, diaSemana } = agoraSaoPaulo();
  if (!ritmo.diasSemana.includes(diaSemana)) {
    return "Ritmo Humano: hoje não é um dia permitido para disparos.";
  }
  if (hora < ritmo.horaInicio || hora >= ritmo.horaFim) {
    return `Ritmo Humano: fora da janela de horário permitida (${ritmo.horaInicio}h às ${ritmo.horaFim}h).`;
  }
  return null;
}

/** Pausa aleatória entre destinatários. */
export async function esperarEntreEnvios(ritmo: RitmoHumano) {
  if (!ritmo.ativo) return;
  await dormir(aleatorio(ritmo.delayMinSeg, ritmo.delayMaxSeg) * 1000);
}

/** Pausa longa a cada lote. Retorna true se pausou. */
export async function esperarLote(ritmo: RitmoHumano, enviadosNoCiclo: number): Promise<boolean> {
  if (!ritmo.ativo || ritmo.loteTamanho <= 0) return false;
  if (enviadosNoCiclo === 0 || enviadosNoCiclo % ritmo.loteTamanho !== 0) return false;
  const min = Math.min(ritmo.pausaLoteMinMinutos, ritmo.pausaLoteMaxMinutos);
  const max = Math.max(ritmo.pausaLoteMinMinutos, ritmo.pausaLoteMaxMinutos);
  const minutos = aleatorio(min, max);
  console.log(`[ritmo] pausa de lote: ${minutos} min após ${enviadosNoCiclo} envios`);
  await dormir(minutos * 60 * 1000);
  return true;
}

/** Incrementa e retorna o total enviado hoje para a sessão. */
export async function consumirCota(
  supabase: any,
  estabelecimentoId: string,
  sessao: string | null,
): Promise<number> {
  try {
    const { data } = await supabase.rpc("ritmo_humano_consumir", {
      p_est: estabelecimentoId,
      p_sessao: sessao || "",
    });
    return Number(data ?? 0);
  } catch (e) {
    console.warn("[ritmo] falha ao consumir cota:", e);
    return 0;
  }
}

/** Aplica pequenas variações ao texto para evitar mensagens idênticas em massa. */
export function variarTexto(texto: string, ritmo: RitmoHumano): string {
  if (!ritmo.ativo || !ritmo.variarTexto || !texto) return texto;
  // Suporte a spintax: {opção A|opção B|opção C}
  let saida = texto.replace(/\{([^{}]*\|[^{}]*)\}/g, (_m, grupo: string) => {
    const opcoes = grupo.split("|");
    return opcoes[Math.floor(Math.random() * opcoes.length)];
  });
  // Variação invisível de pontuação/espaço final (evita hash idêntico)
  const sufixos = ["", " ", "\u200b", "\n"];
  saida += sufixos[Math.floor(Math.random() * sufixos.length)];
  return saida;
}
