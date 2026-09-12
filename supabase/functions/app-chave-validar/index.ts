import { APPS_VALIDOS, validarChaveApp, type AppChave } from "../_shared/validar-chave-app.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const body = await req.json().catch(() => ({}));
    const app = String(body?.app ?? "").trim().toLowerCase();
    if (!APPS_VALIDOS.includes(app as AppChave)) {
      return json({ error: "aplicativo inválido" }, 400);
    }

    const resultado = await validarChaveApp(body?.chave, app as AppChave);
    if (!resultado.ok) return json({ error: resultado.erro }, resultado.status);
    return json(resultado.dados);
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
