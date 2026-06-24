// Webhook público para catracas/relógios de ponto enviarem batidas em tempo real.
// Autenticação por token (Bearer <token> ou ?token=...).
// Payload aceito (JSON):
//   { batidas: [{ cpf?: string, matricula?: string, pis?: string, data_hora: ISO8601, tipo?: 'entrada'|'saida' }] }
// Ou uma única batida no nível raiz: { cpf, data_hora, tipo }.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const url = new URL(req.url);
    const auth = req.headers.get("authorization") || "";
    const token = auth.replace(/^Bearer\s+/i, "").trim() || url.searchParams.get("token") || "";
    if (!token) return json({ error: "token ausente" }, 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: tk, error: tErr } = await supabase
      .from("ponto_webhook_tokens")
      .select("id, empresa_id, equipamento_id, ativo")
      .eq("token", token)
      .maybeSingle();
    if (tErr || !tk) return json({ error: "token inválido" }, 401);
    if (!tk.ativo) return json({ error: "token inativo" }, 403);

    const body = await req.json().catch(() => ({}));
    const arr = Array.isArray(body?.batidas) ? body.batidas : [body];

    let ok = 0, fail = 0;
    const erros: any[] = [];

    for (const b of arr) {
      try {
        if (!b?.data_hora) throw new Error("data_hora ausente");
        const filtros: any = { empresa_id: tk.empresa_id };
        let q = supabase.from("ponto_funcionarios").select("id").eq("empresa_id", tk.empresa_id).limit(1);
        if (b.cpf) q = q.eq("cpf", String(b.cpf).replace(/\D/g, ""));
        else if (b.matricula) q = q.eq("matricula", String(b.matricula));
        else if (b.pis) q = q.eq("pis", String(b.pis));
        else throw new Error("identificador (cpf/matricula/pis) ausente");

        const { data: func } = await q.maybeSingle();
        if (!func) throw new Error("funcionário não encontrado");

        const { error: iErr } = await supabase.from("ponto_registros").insert({
          funcionario_id: func.id,
          equipamento_id: tk.equipamento_id,
          data_hora: b.data_hora,
          tipo: b.tipo || "auto",
          origem: "webhook_catraca",
          observacao: b.observacao || null,
        });
        if (iErr) throw iErr;
        ok++;
      } catch (e: any) {
        fail++;
        erros.push({ batida: b, motivo: e.message });
      }
    }

    await supabase.from("ponto_webhook_tokens")
      .update({ ultima_chamada: new Date().toISOString(), total_chamadas: ((tk as any).total_chamadas ?? 0) + 1 })
      .eq("id", tk.id);

    return json({ ok, fail, erros });
  } catch (e: any) {
    return json({ error: e.message }, 500);
  }
});

function json(b: unknown, status = 200) {
  return new Response(JSON.stringify(b), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
