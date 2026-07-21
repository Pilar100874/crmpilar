import { authenticateDevice, corsHeaders, json, serviceClient } from "../_shared/tv-auth.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const auth = await authenticateDevice(req);
  if (!auth) return json({ error: "não autenticado" }, 401);
  const body = await req.json().catch(() => ({}));
  const sb = serviceClient();
  const now = new Date().toISOString();

  await sb.from("tv_devices").update({
    ultima_comunicacao: now,
    status: body.status || "online",
    versao_app: body.versao ?? undefined,
    resolucao: body.resolucao ?? undefined,
    ip: body.ip ?? undefined,
    memoria_uso: body.memoria ?? undefined,
    cpu_uso: body.cpu ?? undefined,
    armazenamento: body.armazenamento ?? undefined,
    uptime_segundos: body.uptime ?? undefined,
  }).eq("id", auth.deviceId);

  await sb.from("tv_heartbeats").insert({
    device_id: auth.deviceId,
    estabelecimento_id: auth.estabelecimentoId,
    memoria_uso: body.memoria,
    cpu_uso: body.cpu,
    armazenamento: body.armazenamento,
    uptime_segundos: body.uptime,
    ip: body.ip,
    resolucao: body.resolucao,
    versao_app: body.versao,
  });

  return json({ ok: true });
});
