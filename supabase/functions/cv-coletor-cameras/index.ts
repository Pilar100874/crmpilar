// Coletor Desktop ↔ câmeras:
//  - default: lista câmeras ativas (bypass RLS via service role)
//  - action "upload_snapshot": recebe imagem capturada na LAN e grava no storage
//    para o CRM exibir (câmeras internas que o servidor não alcança).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const body = await req.json().catch(() => ({}));

    // Coletor reporta status por câmera (batch)
    if (body?.action === "report_status" && Array.isArray(body?.reports)) {
      for (const r of body.reports) {
        if (!r?.id) continue;
        await supabase.from("cv_cameras").update({
          ultima_verificacao: new Date().toISOString(),
          ultimo_status: r.status === "online" ? "online" : "erro",
          ultimo_erro: r.status === "online" ? null : (r.erro || null),
        }).eq("id", r.id);
      }
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (body?.action === "upload_snapshot") {
      const { camera_id, image_base64, content_type } = body;
      if (!camera_id || !image_base64) throw new Error("camera_id e image_base64 obrigatórios");
      // valida que a câmera existe e está ativa
      const { data: cam, error: camErr } = await supabase
        .from("cv_cameras")
        .select("id, ativo")
        .eq("id", camera_id)
        .single();
      if (camErr || !cam) throw new Error("Câmera não encontrada");
      if (!cam.ativo) throw new Error("Câmera desativada");

      const bin = Uint8Array.from(atob(image_base64), (c) => c.charCodeAt(0));
      const path = `cameras/${camera_id}/coletor-latest.jpg`;
      const up = await supabase.storage.from("cv-vehicle-photos").upload(path, bin, {
        contentType: content_type || "image/jpeg",
        upsert: true,
      });
      if (up.error) throw up.error;
      // Também marca online (snapshot chegou = coletor está falando com a câmera)
      await supabase.from("cv_cameras").update({
        ultima_verificacao: new Date().toISOString(),
        ultimo_status: "online",
        ultimo_erro: null,
      }).eq("id", camera_id);
      return new Response(JSON.stringify({ ok: true, path }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }


    let camQ = supabase
      .from("cv_cameras")
      .select("id,nome,marca,tipo_rede,host,porta,protocolo,usuario,senha,snapshot_path,angulo_key,grupo_id,filial_id")
      .eq("ativo", true);
    // Quando o coletor informa a filial, inclui também câmeras SEM filial atribuída
    // (fallback) — evita ficar invisível ao coletor após passar a exigir filial.
    if (body.filial_id) camQ = camQ.or(`filial_id.eq.${body.filial_id},filial_id.is.null`);
    const { data, error } = await camQ;
    if (error) throw error;
    return new Response(JSON.stringify({ cameras: data ?? [] }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[cv-coletor-cameras]", e);
    return new Response(JSON.stringify({ error: String((e as Error).message || e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
