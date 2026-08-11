/**
 * Chamada de Edge Function com retry e backoff exponencial.
 *
 * O supabase-js reporta qualquer falha como
 * "Edge Function returned a non-2xx status code" — aqui lemos o corpo real da
 * resposta, registramos a causa e repetimos apenas quando o erro é transitório
 * (429, 5xx, timeout, queda de rede). Erros de validação (4xx) falham na hora.
 */
import { FunctionsHttpError } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export interface CausaErroIA {
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
  "failed to fetch",
  "fetch failed",
  "connection",
  "socket",
  "worker",
  "boot",
  "shutdown",
  "temporarily",
  "rate limit",
  "too many requests",
];

/** Extrai status, corpo e classificação de um erro do supabase-js. */
export async function analisarErroFuncao(erro: any): Promise<CausaErroIA> {
  let status: number | null = null;
  let corpo: string | null = null;
  const mensagem = erro?.message ? String(erro.message) : String(erro ?? "Erro desconhecido");

  if (erro instanceof FunctionsHttpError || erro?.context) {
    const ctx = erro.context;
    status = typeof ctx?.status === "number" ? ctx.status : null;
    try {
      if (typeof ctx?.text === "function") corpo = await ctx.text();
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

/** Texto amigável com a causa real do erro. */
export function descreverCausaFuncao(causa: CausaErroIA | null, fallback = "Falha desconhecida"): string {
  if (!causa) return fallback;
  let detalhe = causa.mensagem;
  if (causa.corpo) {
    try {
      const j = JSON.parse(causa.corpo);
      detalhe = j?.error || j?.message || detalhe;
    } catch {
      detalhe = causa.corpo.slice(0, 300) || detalhe;
    }
  }
  return causa.status ? `${detalhe} (HTTP ${causa.status})` : detalhe;
}

export interface OpcoesInvokeRetry {
  /** Tentativas totais (inclui a primeira). Padrão: 3. */
  tentativas?: number;
  /** Atraso base em ms, dobrado a cada tentativa. Padrão: 800. */
  baseMs?: number;
  /** Teto do atraso em ms. Padrão: 15000. */
  maxMs?: number;
  /** Chamado antes de cada nova tentativa (para feedback na UI). */
  onRetry?: (tentativa: number, causa: CausaErroIA, esperaMs: number) => void;
}

const dormir = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Invoca uma Edge Function com backoff exponencial em erros transitórios.
 * Lança um Error com a causa detalhada quando todas as tentativas falham.
 */
export async function invokeComRetry<T = any>(
  nomeFuncao: string,
  body?: unknown,
  opts: OpcoesInvokeRetry = {},
): Promise<T> {
  const tentativasMax = Math.max(1, opts.tentativas ?? 3);
  const baseMs = opts.baseMs ?? 800;
  const maxMs = opts.maxMs ?? 15_000;

  let ultimaCausa: CausaErroIA | null = null;

  for (let tentativa = 1; tentativa <= tentativasMax; tentativa++) {
    const { data, error } = await supabase.functions.invoke(nomeFuncao, { body: body as any });

    if (!error) return data as T;

    const causa = await analisarErroFuncao(error);
    ultimaCausa = causa;

    console.error(
      `[${nomeFuncao}] tentativa ${tentativa}/${tentativasMax} falhou —`,
      `status=${causa.status ?? "?"} transitorio=${causa.transitorio}`,
      `motivo=${causa.mensagem}`,
      causa.corpo ? `corpo=${causa.corpo.slice(0, 500)}` : "",
    );

    if (!causa.transitorio || tentativa === tentativasMax) break;

    const espera = Math.min(maxMs, baseMs * 2 ** (tentativa - 1)) + Math.floor(Math.random() * 250);
    opts.onRetry?.(tentativa, causa, espera);
    await dormir(espera);
  }

  throw new Error(descreverCausaFuncao(ultimaCausa, `Falha ao chamar ${nomeFuncao}`));
}
