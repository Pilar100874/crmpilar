import { authenticateDevice, corsHeaders, json, serviceClient } from "../_shared/tv-auth.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const auth = await authenticateDevice(req);
  if (!auth) return json({ error: "não autenticado" }, 401);
  const sb = serviceClient();

  const { data: commands } = await sb.from("tv_commands")
    .select("*")
    .eq("device_id", auth.deviceId)
    .eq("status", "pendente")
    .order("created_at", { ascending: true })
    .limit(50);

  if (commands && commands.length > 0) {
    const ids = commands.map((c: any) => c.id);
    await sb.from("tv_commands").update({ status: "enviado" }).in("id", ids);
  }

  return json({ commands: commands || [] });
});
