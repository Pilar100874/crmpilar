// Endpoint nativo para Control iD iDClass / iDFace / iDX
// Configurar no relógio em: Eventos → Webhook → URL desta função
// Autenticação via ?token=<token> (gerado em Ponto → Webhooks de Catracas)
//
// Payload nativo Control iD (event "access" ou "identification"):
// { "event":"access", "time":1735689600, "object_id":123, "device_id":"...", "user_id":123 }
// OU lote: { "events":[ { ... }, { ... } ] }
//
// object_id / user_id é o ID interno do relógio → resolvemos via ponto_funcionarios.codigo_relogio
// time é unix timestamp (segundos) → convertemos pra ISO.
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

    const { data: tk } = await supabase
      .from("ponto_webhook_tokens")
      .select("id, empresa_id, equipamento_id, ativo")
      .eq("token", token).maybeSingle();
    if (!tk) return json({ error: "token inválido" }, 401);
    if (!tk.ativo) return json({ error: "token inativo" }, 403);

    const body = await req.json().catch(() => ({}));
    const events = Array.isArray(body?.events) ? body.events
                 : Array.isArray(body?.access_logs) ? body.access_logs
                 : [body];

    let ok = 0, fail = 0;
    const erros: any[] = [];

    for (const ev of events) {
      try {
        // Resolve timestamp (Control iD envia em unix seconds)
        let dataHora: string;
        if (typeof ev.time === "number") {
          dataHora = new Date(ev.time * 1000).toISOString();
        } else if (typeof ev.time === "string") {
          dataHora = new Date(ev.time).toISOString();
        } else if (ev.data_hora) {
          dataHora = new Date(ev.data_hora).toISOString();
        } else {
          throw new Error("campo 'time' ausente");
        }

        // Resolve funcionário via codigo_relogio (object_id/user_id) ou cpf/pis
        const codigo = ev.object_id ?? ev.user_id ?? ev.id ?? ev.codigo;
        let q = supabase.from("ponto_funcionarios").select("id, registra_ponto, status")
          .eq("empresa_id", tk.empresa_id).limit(1);

        if (codigo != null) q = q.eq("codigo_relogio", String(codigo));
        else if (ev.cpf) q = q.eq("cpf", String(ev.cpf).replace(/\D/g, ""));
        else if (ev.pis) q = q.eq("pis", String(ev.pis));
        else throw new Error("identificador ausente (object_id/user_id/cpf/pis)");

        const { data: func } = await q.maybeSingle();
        if (!func) throw new Error(`funcionário não encontrado (codigo=${codigo})`);
        if (func.registra_ponto === false) throw new Error("funcionário não registra ponto");

        const { error: iErr } = await supabase.from("ponto_registros").insert({
          funcionario_id: func.id,
          equipamento_id: tk.equipamento_id,
          data_hora: dataHora,
          tipo: ev.tipo || ev.event_type || "auto",
          origem: "controlid_push",
          observacao: ev.event || ev.message || null,
        });
        if (iErr) throw iErr;
        ok++;
      } catch (e: any) {
        fail++;
        erros.push({ ev, motivo: e.message });
      }
    }

    await supabase.from("ponto_webhook_tokens")
      .update({ ultima_chamada: new Date().toISOString(), total_chamadas: ((tk as any).total_chamadas ?? 0) + 1 })
      .eq("id", tk.id);

    return json({ ok, fail, erros: erros.slice(0, 20) });
  } catch (e: any) {
    return json({ error: e.message }, 500);
  }
});

function json(b: unknown, status = 200) {
  return new Response(JSON.stringify(b), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
