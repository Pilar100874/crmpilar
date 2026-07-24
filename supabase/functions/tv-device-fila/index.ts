import { authenticateDevice, corsHeaders, json, serviceClient } from "../_shared/tv-auth.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const auth = await authenticateDevice(req);
  if (!auth) return json({ error: "não autenticado" }, 401);

  const sb = serviceClient();
  const { data, error } = await sb
    .from("tv_workflow_execucoes")
    .select("id,mensagem_renderizada,estilo,duracao_segundos,expira_em,created_at")
    .eq("device_id", auth.deviceId)
    .eq("estabelecimento_id", auth.estabelecimentoId)
    .gt("expira_em", new Date().toISOString())
    .order("created_at", { ascending: true })
    .limit(20);

  if (error) return json({ error: error.message }, 500);
  return json({ fila: data ?? [] });
});
