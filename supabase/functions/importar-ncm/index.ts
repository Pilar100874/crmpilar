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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch NCM data from official Brazilian government API
    console.log("Fetching NCM data from official API...");
    const response = await fetch(
      "https://portalunico.siscomex.gov.br/classif/api/publico/nomenclatura/download/json"
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch NCM data: ${response.status}`);
    }

    const ncmData = await response.json();
    console.log(`Received ${ncmData.Nomenclaturas?.length || 0} NCM entries`);

    if (!ncmData.Nomenclaturas || ncmData.Nomenclaturas.length === 0) {
      throw new Error("No NCM data received from API");
    }

    // Filter only 8-digit NCM codes (product level)
    const ncmCodes = ncmData.Nomenclaturas
      .filter((item: any) => item.Codigo && item.Codigo.length === 8)
      .map((item: any) => ({
        codigo: item.Codigo,
        descricao: item.Descricao || item.Codigo,
      }));

    console.log(`Filtered ${ncmCodes.length} 8-digit NCM codes`);

    // Clear existing NCM codes
    const { error: deleteError } = await supabase
      .from("ncm_codigos")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000");

    if (deleteError) {
      console.error("Error deleting existing NCM codes:", deleteError);
    }

    // Insert in batches of 500
    const batchSize = 500;
    let inserted = 0;
    let errors = 0;

    for (let i = 0; i < ncmCodes.length; i += batchSize) {
      const batch = ncmCodes.slice(i, i + batchSize);
      
      const { error: insertError } = await supabase
        .from("ncm_codigos")
        .upsert(batch, { onConflict: "codigo" });

      if (insertError) {
        console.error(`Error inserting batch ${i / batchSize + 1}:`, insertError);
        errors++;
      } else {
        inserted += batch.length;
      }
    }

    console.log(`Import complete: ${inserted} inserted, ${errors} batch errors`);

    return new Response(
      JSON.stringify({
        success: true,
        total: ncmCodes.length,
        inserted,
        errors,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error importing NCM:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
