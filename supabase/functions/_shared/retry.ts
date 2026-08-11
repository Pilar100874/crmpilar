/**
 * Retry com backoff exponencial para chamadas entre Edge Functions.
 *
 * O erro genérico "Edge Function returned a non-2xx status code" esconde a
 * causa real: aqui extraímos o corpo/status da resposta, classificamos se é
 * transitório (429, 5xx, timeout, falha de rede, boot do worker) e só então
 * repetimos a chamada — erros de validação (4xx) falham de imediato.
 */

export interface CausaErro {
  status: number | null;
  mensagem: string;
  corpo: string | null;
  transitorio: boolean;
}

const PADROES_TRANSITORIOS = [
  "non-2xx",
  "timeout",
  "timed out",
  "network",
  "fetch failed",
  "connection",
  "socket",
  "econnreset",
  "worker",
  "boot",
  "shutdown",
  "temporarily",
  "rate limit",
  "too many requests",
];

/** Extrai status, corpo e classificação a partir de um erro do supabase-js. */
export async function analisarErro(erro: any): Promise<CausaErro> {
  let status: number | null = null;
  let corpo: string | null = null;
  const mensagem = erro?.message ? String(erro.message) : String(erro ?? "erro desconhecido");

  const ctx = erro?.context;
  if (ctx) {
    status = typeof ctx.status === "number" ? ctx.status : null;
    try {
      if (typeof ctx.text === "function") corpo = await ctx.text();
      else if (typeof ctx.body === "string") corpo = ctx.body;
    } catch {
      corpo = null;
    }
  }

  const alvo = `${mensagem} ${corpo ?? ""}`.toLowerCase();
  const transitorio = status !== null
    ? status === 408 || status === 425 || status === 429 || status >= 500
    : PADROES_TRANSITORIOS.some((p) => alvo.includes(p));

  return { status, mensagem, corpo, transitorio };
}

export interface OpcoesRetry {
  /** Número máximo de tentativas (inclui a primeira). Padrão: 3. */
  tentativas?: number;
  /** Atraso base em ms (dobra a cada tentativa). Padrão: 800ms. */
  baseMs?: number;
  /** Teto do atraso em ms. Padrão: 15000ms. */
  maxMs?: number;
  /** Rótulo usado nos logs. */
  rotulo?: string;
}

const dormir = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Invoca outra Edge Function repetindo em falhas transitórias.
 * Retorna `{ data, error, causa, tentativas }` — nunca lança.
 */
export async function invokeComRetry(
  supabase: any,
  nomeFuncao: string,
  body: unknown,
  opts: OpcoesRetry = {},
): Promise<{ data: any; error: any; causa: CausaErro | null; tentativas: number }> {
  const tentativasMax = Math.max(1, opts.tentativas ?? 3);
  const baseMs = opts.baseMs ?? 800;
  const maxMs = opts.maxMs ?? 15_000;
  const rotulo = opts.rotulo ?? nomeFuncao;

  let ultimoErro: any = null;
  let ultimaCausa: CausaErro | null = null;

  for (let tentativa = 1; tentativa <= tentativasMax; tentativa++) {
    const { data, error } = await supabase.functions.invoke(nomeFuncao, { body });

    // Falha reportada no corpo (HTTP 200 com success:false) também é avaliada.
    const falhaNoCorpo = !error && data && typeof data === "object" && (data as any).success === false;

    if (!error && !falhaNoCorpo) {
      if (tentativa > 1) console.log(`✅ [${rotulo}] sucesso na tentativa ${tentativa}/${tentativasMax}`);
      return { data, error: null, causa: null, tentativas: tentativa };
    }

    const erroAtual = error ?? new Error((data as any)?.error || "Falha reportada pela função");
    const causa = error ? await analisarErro(error) : {
      status: 200,
      mensagem: String((data as any)?.error || "Falha reportada pela função"),
      corpo: JSON.stringify(data),
      transitorio: false,
    } as CausaErro;

    ultimoErro = erroAtual;
    ultimaCausa = causa;

    console.error(
      `❌ [${rotulo}] tentativa ${tentativa}/${tentativasMax} falhou` +
        ` — status=${causa.status ?? "?"} transitorio=${causa.transitorio}` +
        ` motivo=${causa.mensagem}` +
        (causa.corpo ? ` corpo=${causa.corpo.slice(0, 500)}` : ""),
    );

    if (!causa.transitorio || tentativa === tentativasMax) break;

    const espera = Math.min(maxMs, baseMs * 2 ** (tentativa - 1));
    const jitter = Math.floor(Math.random() * 250);
    console.log(`⏳ [${rotulo}] novo retry em ${espera + jitter}ms`);
    await dormir(espera + jitter);
  }

  return { data: null, error: ultimoErro, causa: ultimaCausa, tentativas: tentativasMax };
}

/** Mensagem amigável a partir da causa detectada. */
export function descreverCausa(causa: CausaErro | null, fallback = "Falha desconhecida"): string {
  if (!causa) return fallback;
  const partes: string[] = [];
  if (causa.status) partes.push(`HTTP ${causa.status}`);
  partes.push(causa.mensagem);
  if (causa.corpo && !causa.mensagem.includes(causa.corpo.slice(0, 40))) {
    partes.push(causa.corpo.slice(0, 300));
  }
  return partes.join(" — ");
}
