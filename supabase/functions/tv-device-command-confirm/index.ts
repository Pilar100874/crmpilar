import { authenticateDevice, corsHeaders, json, serviceClient } from "../_shared/tv-auth.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const auth = await authenticateDevice(req);
  if (!auth) return json({ error: "não autenticado" }, 401);
  const { command_id, status, resultado } = await req.json().catch(() => ({}));
  if (!command_id) return json({ error: "command_id obrigatório" }, 400);
  const sb = serviceClient();
  await sb.from("tv_commands").update({
    status: status === "erro" ? "erro" : "confirmado",
    confirmado_em: new Date().toISOString(),
    resultado: resultado || null,
  }).eq("id", command_id).eq("device_id", auth.deviceId);
  return json({ ok: true });
});
