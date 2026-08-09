import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/* ------------------------------------------------------------------ *
 * Detecção e tratamento amigável de erros de IA (créditos / limites)  *
 * ------------------------------------------------------------------ */

const CHAVE_FLAG = "ia_creditos_esgotados_em";
const TTL_MS = 30 * 60 * 1000; // 30 minutos

export type TipoErroIA = "creditos" | "limite" | "outro";

export interface ErroIAInfo {
  tipo: TipoErroIA;
  titulo: string;
  descricao: string;
}

function textoDoErro(err: any): string {
  if (!err) return "";
  if (typeof err === "string") return err;
  return [err.message, err.error, err.details, err?.context?.statusText]
    .filter(Boolean)
    .join(" ");
}

function statusDoErro(err: any): number | undefined {
  return err?.status ?? err?.context?.status ?? err?.statusCode;
}

export function classificarErroIA(err: any): ErroIAInfo {
  const texto = textoDoErro(err).toLowerCase();
  const status = statusDoErro(err);

  const ehCredito =
    status === 402 ||
    /\b402\b|cr[eé]dito|credits|insufficient|payment required|billing|saldo|exclusively available/.test(
      texto
    );
  const ehLimite =
    status === 429 || /\b429\b|rate limit|too many requests|limite de requisi/.test(texto);

  if (ehCredito) {
    return {
      tipo: "creditos",
      titulo: "Sem créditos de IA disponíveis",
      descricao:
        "A inteligência artificial não pôde ser executada porque os créditos de IA do workspace acabaram. Nenhum dado foi perdido — adicione créditos e execute novamente. Em Configurações → IA você também pode escolher um modelo gratuito.",
    };
  }
  if (ehLimite) {
    return {
      tipo: "limite",
      titulo: "Muitas execuções em pouco tempo",
      descricao:
        "O provedor de IA limitou temporariamente as requisições. Aguarde cerca de 1 minuto e tente novamente.",
    };
  }
  return {
    tipo: "outro",
    titulo: "Não foi possível executar a IA",
    descricao: textoDoErro(err) || "Erro desconhecido ao chamar a inteligência artificial.",
  };
}

export function ehErroDeCreditos(err: any): boolean {
  return classificarErroIA(err).tipo === "creditos";
}

/* --------------------------- flag persistida --------------------------- */

export const EVENTO_ESTADO_CREDITOS = "ia:estado-creditos";

function emitirEstadoCreditos() {
  try {
    window.dispatchEvent(new CustomEvent(EVENTO_ESTADO_CREDITOS));
  } catch {
    /* ignore */
  }
}

export function marcarCreditosEsgotados() {
  try {
    localStorage.setItem(CHAVE_FLAG, String(Date.now()));
  } catch {
    /* ignore */
  }
  emitirEstadoCreditos();
}

export function limparAvisoCreditos() {
  try {
    localStorage.removeItem(CHAVE_FLAG);
  } catch {
    /* ignore */
  }
  emitirEstadoCreditos();
}


export function creditosPossivelmenteEsgotados(): boolean {
  try {
    const v = localStorage.getItem(CHAVE_FLAG);
    if (!v) return false;
    if (Date.now() - Number(v) > TTL_MS) {
      localStorage.removeItem(CHAVE_FLAG);
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

/* ------------------------------ avisos UI ------------------------------ */

export const EVENTO_AVISO_IA = "ia:aviso-creditos";
export const EVENTO_ERRO_IA = "ia:erro";

/** Mostra o diálogo explicativo antes de rodar. Retorna true se o usuário quer continuar. */
export function confirmarExecucaoIA(contexto?: string): Promise<boolean> {
  if (!creditosPossivelmenteEsgotados()) return Promise.resolve(true);
  return new Promise((resolve) => {
    window.dispatchEvent(
      new CustomEvent(EVENTO_AVISO_IA, { detail: { contexto, resolve } })
    );
  });
}

/** Notifica o usuário com uma mensagem amigável (e memoriza o estado de créditos). */
export function notificarErroIA(err: any, contexto?: string): ErroIAInfo {
  const info = classificarErroIA(err);
  if (info.tipo === "creditos") {
    marcarCreditosEsgotados();
    window.dispatchEvent(new CustomEvent(EVENTO_ERRO_IA, { detail: { info, contexto } }));
  } else {
    toast.error(contexto ? `${info.titulo} — ${contexto}` : info.titulo, {
      description: info.descricao,
    });
  }
  return info;
}

/* ------------------- interceptor global de edge functions ------------------- */

const PADRAO_FUNCOES_IA =
  /(^|-)(ai|ia)(-|$)|agent|agente|strategy|studio|generate|gerar|prompt|chat|image|imagem|video|audio|tts|copy|humaniz|llm|gemini|openai/i;

let instalado = false;

/**
 * Envolve supabase.functions.invoke para:
 *  1. avisar o usuário ANTES de rodar quando já sabemos que os créditos acabaram;
 *  2. traduzir respostas 402/429 em mensagens amigáveis em todo o sistema.
 */
export function instalarInterceptorIA() {
  if (instalado) return;
  instalado = true;

  const fns: any = (supabase as any).functions;
  const original = fns.invoke.bind(fns);

  fns.invoke = async (nome: string, opts?: any) => {
    const ehIA = PADRAO_FUNCOES_IA.test(nome || "");

    if (ehIA && creditosPossivelmenteEsgotados()) {
      const seguir = await confirmarExecucaoIA(nome);
      if (!seguir) {
        return { data: null, error: new Error("Execução cancelada pelo usuário (sem créditos de IA)") };
      }
    }

    const resultado = await original(nome, opts);
    const erro = resultado?.error;
    const corpo = resultado?.data;

    const falhaCredito =
      (erro && ehErroDeCreditos(erro)) ||
      (corpo && corpo.success === false && ehErroDeCreditos(corpo));

    if (falhaCredito) {
      notificarErroIA(erro || corpo, nome);
    } else if (erro && ehIA && classificarErroIA(erro).tipo === "limite") {
      notificarErroIA(erro, nome);
    } else if (ehIA && !erro) {
      // execução bem-sucedida: some com o aviso antigo
      limparAvisoCreditos();
    }

    return resultado;
  };
}
