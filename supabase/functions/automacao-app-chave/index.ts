import { createClient } from "npm:@supabase/supabase-js@2";

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

/** Aplicativos que usam chave de empresa. */
const APPS_VALIDOS = ["pilar-fone", "fone", "automacao", "controle", "sms", "remotas", "coletor", "coletor-tv"];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const corpo = await req.json();
    const chave = corpo?.chave;
    if (!chave) return json({ error: "chave obrigatória" }, 400);

    const app = String(corpo?.app ?? "automacao").trim().toLowerCase();
    if (!APPS_VALIDOS.includes(app)) return json({ error: "aplicativo inválido" }, 400);

    const sb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    const { data: registro, error } = await sb
      .from("automacao_app_chaves")
      .select("id, nome, bloqueado, estabelecimento_id, app, dispositivo_id")
      .eq("chave", String(chave).trim().toUpperCase())
      .maybeSingle();

    if (error) return json({ error: "falha ao validar a chave" }, 500);
    if (!registro) return json({ error: "chave não encontrada" }, 404);
    if (registro.bloqueado) return json({ error: "chave bloqueada" }, 403);
    const appDaChave = registro.app ?? "automacao";
    const coletorCompativel = app === "coletor" && appDaChave === "controle";
    if (appDaChave !== app && !coletorCompativel) {
      return json({ error: "esta chave é de outro aplicativo" }, 403);
    }

    const { data: estabelecimento } = await sb
      .from("estabelecimentos")
      .select("nome")
      .eq("id", registro.estabelecimento_id)
      .maybeSingle();

    await sb
      .from("automacao_app_chaves")
      .update({ ultima_comunicacao: new Date().toISOString() })
      .eq("id", registro.id);

    let deviceToken = "";
    if (app === "sms" && registro.dispositivo_id) {
      const { data: dispositivo, error: dispositivoError } = await sb
        .from("sms_devices")
        .select("token")
        .eq("id", registro.dispositivo_id)
        .eq("estabelecimento_id", registro.estabelecimento_id)
        .eq("tipo_dispositivo", "android")
        .eq("ativo", true)
        .maybeSingle();
      if (dispositivoError || !dispositivo?.token) {
        return json({ error: "aparelho SMS não está disponível" }, 409);
      }
      deviceToken = dispositivo.token;
    }

    return json({
      chave_id: registro.id,
      chave_nome: registro.nome,
      app: registro.app ?? "automacao",
      estabelecimento_id: registro.estabelecimento_id,
      empresa: estabelecimento?.nome ?? "",
      dispositivo_id: registro.dispositivo_id ?? "",
      ...(app === "sms" ? { device_token: deviceToken } : {}),
    });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
