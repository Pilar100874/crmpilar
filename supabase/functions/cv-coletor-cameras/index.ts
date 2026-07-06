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
      // Busca protocolo das câmeras reportadas para reinterpretar erros de RTSP.
      const ids = body.reports.map((r: any) => r?.id).filter(Boolean);
      const { data: metas } = await supabase
        .from("cv_cameras")
        .select("id,protocolo,porta")
        .in("id", ids);
      const metaById = new Map<string, any>((metas ?? []).map((m: any) => [m.id, m]));

      // Erros de socket em porta RTSP que na verdade indicam que a câmera ESTÁ online
      // (TCP handshake completou, mas o Coletor mandou HTTP para um servidor RTSP).
      const RTSP_ALIVE_HINTS = [
        "socket hang up",
        "econnreset",
        "epipe",
        "eproto",
        "parse error",
        "invalid http",
        "unexpected end",
      ];

      for (const r of body.reports) {
        if (!r?.id) continue;
        const meta = metaById.get(r.id);
        const isRtsp = meta?.protocolo === "rtsp" || meta?.porta === 554;
        const errLower = String(r.erro || "").toLowerCase();
        const rtspAlive = isRtsp && r.status !== "online"
          && RTSP_ALIVE_HINTS.some((h) => errLower.includes(h));

        const finalStatus = (r.status === "online" || rtspAlive) ? "online" : "erro";
        const finalErro = finalStatus === "online"
          ? null
          : (r.erro || null);

        await supabase.from("cv_cameras").update({
          ultima_verificacao: new Date().toISOString(),
          ultimo_status: finalStatus,
          ultimo_erro: finalErro,
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

    // Criação em lote a partir da tela de descoberta do Coletor Desktop.
    // Cria as câmeras já DESATIVADAS (ativo=false) para o operador revisar
    // no CRM antes de habilitar.
    if (body?.action === "bulk_create_cameras" && Array.isArray(body?.cameras)) {
      const filial = body.filial_id || null;
      const ALLOWED_MARCA = new Set(["tplink_tapo", "hikvision", "intelbras", "generica_http", "generica_rtsp"]);
      const ALLOWED_PROTO = new Set(["http", "https", "rtsp"]);
      const rows = body.cameras
        .filter((c: any) => c && c.host && c.marca)
        .map((c: any) => ({
          nome: String(c.nome || `${c.marca} ${c.host}`).slice(0, 120),
          marca: ALLOWED_MARCA.has(c.marca) ? c.marca : "generica_rtsp",
          host: String(c.host),
          porta: c.porta ? Number(c.porta) : null,
          protocolo: ALLOWED_PROTO.has(c.protocolo) ? c.protocolo : "rtsp",
          usuario: c.usuario || null,
          senha: c.senha || null,
          snapshot_path: c.snapshot_path || null,
          angulo_key: c.angulo_key || "frente",
          tipo_rede: c.tipo_rede === "publica" ? "publica" : "interna",
          filial_id: filial,
          ativo: false,
        }));
      if (!rows.length) throw new Error("nenhuma câmera válida no lote");
      const { error: insErr, data: ins } = await supabase
        .from("cv_cameras").insert(rows).select("id");
      if (insErr) throw insErr;
      return new Response(JSON.stringify({ ok: true, created: ins?.length || 0 }), {
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
