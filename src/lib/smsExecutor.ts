// Executor unificado do bloco "Enviar SMS" usado pelos workflows
// (bot, omnichannel, ads, automação de vendas, logística, e-commerce rules).

import { supabase } from "@/integrations/supabase/client";
import { getEstabelecimentoId } from "@/lib/estabelecimento";

export interface SmsBlockCfg {
  phoneNumbers?: string[];
  phoneNumber?: string;
  message?: string;
  outputVariable?: string;
}

export interface SmsExecCtx {
  variaveis?: Record<string, any>;
  estabelecimento_id?: string;
  workflow_tipo?: string;
  origem?: string;
}

function interpolar(str: string, vars: Record<string, any> = {}): string {
  return String(str || "").replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, path) => {
    const parts = path.split(".");
    let v: any = vars;
    for (const p of parts) v = v?.[p];
    return v == null ? "" : String(v);
  });
}

export async function executarBlocoSms(
  cfg: SmsBlockCfg,
  ctx: SmsExecCtx = {},
): Promise<{ ok: boolean; enviados: number; falhou: number; status: string; erro?: string }> {
  const vars = ctx.variaveis || {};
  const rawNumbers: string[] = Array.isArray(cfg.phoneNumbers)
    ? cfg.phoneNumbers
    : cfg.phoneNumber ? [cfg.phoneNumber] : [];
  const numbers = rawNumbers
    .map((n) => interpolar(String(n || ""), vars).replace(/\D/g, ""))
    .filter(Boolean);
  const msg = interpolar(cfg.message || "", vars);

  if (numbers.length === 0 || !msg) {
    return { ok: false, enviados: 0, falhou: 0, status: "sem_destino", erro: "Número ou mensagem vazio" };
  }

  let estabelecimento_id = ctx.estabelecimento_id;
  if (!estabelecimento_id) {
    try { estabelecimento_id = await getEstabelecimentoId(); } catch { /* ignore */ }
  }
  if (!estabelecimento_id) {
    return { ok: false, enviados: 0, falhou: 0, status: "falhou", erro: "estabelecimento_id ausente" };
  }

  let ok = 0, falhou = 0, lastError: string | undefined;
  for (const destino of numbers) {
    try {
      const { data, error } = await supabase.functions.invoke("send-sms", {
        body: { estabelecimento_id, destino, mensagem: msg },
      });
      if (error) { falhou++; lastError = error.message; continue; }
      if ((data as any)?.success) ok++;
      else { falhou++; lastError = (data as any)?.erro || "Falha ao enviar SMS"; }
    } catch (e: any) {
      falhou++; lastError = e?.message || String(e);
    }
  }
  const status = ok === numbers.length ? "enviado" : ok === 0 ? "falhou" : "parcial";
  return { ok: ok > 0, enviados: ok, falhou, status, erro: lastError };
}
