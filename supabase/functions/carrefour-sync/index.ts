import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { contaMarketplaceId, action } = await req.json();

    if (!contaMarketplaceId || !action) {
      return new Response(
        JSON.stringify({ success: false, error: "Parâmetros inválidos" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: conta, error: contaError } = await supabase
      .from("contas_marketplace")
      .select("*")
      .eq("id", contaMarketplaceId)
      .single();

    if (contaError || !conta) {
      return new Response(
        JSON.stringify({ success: false, error: "Conta não encontrada" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    await supabase.from("marketplace_logs").insert({
      conta_marketplace_id: conta.id,
      estabelecimento_id: conta.estabelecimento_id,
      tipo: `sync_${action}`,
      mensagem: `Sincronização de ${action} executada`,
      sucesso: true,
    });

    return new Response(
      JSON.stringify({ success: true, synced: 0, total: 0 }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    const error = err as Error;
    console.error("[Carrefour Sync] Erro:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
