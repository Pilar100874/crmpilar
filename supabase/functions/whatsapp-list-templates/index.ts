import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { numero_id, estabelecimento_id } = await req.json();
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // 1) Load numbers
    let numbersQuery = supabase
      .from("whatsapp_numeros")
      .select("id,nome,telefone,provider,cloud_phone_number_id,cloud_access_token,cloud_business_account_id,ativo")
      .eq("ativo", true);
    if (estabelecimento_id) numbersQuery = numbersQuery.eq("estabelecimento_id", estabelecimento_id);
    const { data: numeros, error: numErr } = await numbersQuery;
    if (numErr) throw numErr;

    let templates: any[] = [];
    let activeNumber: any = null;

    if (numero_id) {
      activeNumber = (numeros || []).find((n) => n.id === numero_id);
      if (
        activeNumber &&
        activeNumber.provider === "cloud" &&
        activeNumber.cloud_access_token &&
        activeNumber.cloud_business_account_id
      ) {
        const url = `https://graph.facebook.com/v20.0/${activeNumber.cloud_business_account_id}/message_templates?limit=200&fields=name,language,status,category,components`;
        const resp = await fetch(url, {
          headers: { Authorization: `Bearer ${activeNumber.cloud_access_token}` },
        });
        const json = await resp.json();
        if (!resp.ok) {
          return new Response(
            JSON.stringify({ numeros, templates: [], error: json?.error?.message || "Falha ao listar templates" }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }
        templates = (json.data || []).filter((t: any) => t.status === "APPROVED");
      }
    }

    return new Response(JSON.stringify({ numeros: numeros || [], templates }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e?.message || e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
