import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

/**
 * Entrega o google-services.json salvo nas Configurações da Portaria.
 * Usado pelo build do APK (GitHub Actions) quando o segredo não está definido.
 * O conteúdo é a configuração pública do app Android (não contém chaves privadas).
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data, error } = await admin
    .from("port_push_config")
    .select("google_services_json")
    .not("google_services_json", "is", null)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data?.google_services_json) {
    return new Response(
      JSON.stringify({ ok: false, mensagem: "google-services.json ainda não configurado." }),
      { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  return new Response(data.google_services_json, {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
