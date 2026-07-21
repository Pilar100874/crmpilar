import { authenticateDevice, corsHeaders, json, serviceClient } from "../_shared/tv-auth.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const auth = await authenticateDevice(req);
  if (!auth) return json({ error: "não autenticado" }, 401);
  const body = await req.json().catch(() => ({}));
  const sb = serviceClient();
  await sb.from("tv_events").insert({
    device_id: auth.deviceId,
    estabelecimento_id: auth.estabelecimentoId,
    nivel: body.nivel || "info",
    tipo: body.tipo || null,
    mensagem: body.mensagem || null,
    contexto: body.contexto || null,
  });
  return json({ ok: true });
});
