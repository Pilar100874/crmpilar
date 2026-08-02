import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";

/**
 * Proxy entre o front (Plataforma de Agentes IA) e o servidor de execução
 * que roda o Claude Agent SDK (ex.: Railway). A URL e a chave do servidor
 * ficam apenas aqui, nunca no navegador.
 */

const RUNNER_URL = Deno.env.get("AIP_RUNNER_URL");
const RUNNER_KEY = Deno.env.get("AIP_RUNNER_KEY");

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    // Autenticação: exige um usuário válido do app.
    const authHeader = req.headers.get("Authorization") ?? "";
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData?.user) return json({ error: "Não autenticado" }, 401);

    const body = await req.json().catch(() => ({}));
    const action = String(body.action ?? "");
    if (!action) return json({ error: "Ação não informada" }, 400);

    if (!RUNNER_URL) {
      // Sem servidor configurado: devolve resposta simulada para não travar a UI.
      if (action === "health") return json({ ok: false, motivo: "AIP_RUNNER_URL não configurada" });
      if (action === "stream") {
        const texto =
          "Servidor de execução (Claude Agent SDK) ainda não configurado.\n" +
          "Defina os secrets AIP_RUNNER_URL e AIP_RUNNER_KEY para conectar o runner.";
        const stream = new ReadableStream({
          start(controller) {
            controller.enqueue(
              new TextEncoder().encode(`data: ${JSON.stringify({ text: texto })}\n\ndata: [DONE]\n\n`),
            );
            controller.close();
          },
        });
        return new Response(stream, {
          headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
        });
      }
      return json({ ok: true, simulado: true });
    }

    const rota = action === "stream" ? "stream" : action;
    const upstream = await fetch(`${RUNNER_URL.replace(/\/$/, "")}/${rota}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: action === "stream" ? "text/event-stream" : "application/json",
        ...(RUNNER_KEY ? { "X-Runner-Key": RUNNER_KEY } : {}),
      },
      body: JSON.stringify({ ...body, usuario_id: userData.user.id }),
    });

    if (action === "stream") {
      return new Response(upstream.body, {
        status: upstream.status,
        headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
      });
    }

    const texto = await upstream.text();
    return new Response(texto, {
      status: upstream.status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
