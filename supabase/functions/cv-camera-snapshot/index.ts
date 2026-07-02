// Snapshot de câmera IP (pública). Câmeras internas devem usar o Coletor Desktop.
// Marcas suportadas: TP-Link Tapo, Hikvision (ISAPI), Intelbras, genéricas HTTP.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function pathFor(brand: string, snapshotPath?: string | null) {
  if (snapshotPath) return snapshotPath;
  switch (brand) {
    case "hikvision":
      return "/ISAPI/Streaming/channels/101/picture";
    case "intelbras":
      return "/cgi-bin/snapshot.cgi";
    case "tplink_tapo":
      // Tapo cloud/local usa POST /stok=.../ds — snapshot direto raramente é público.
      // Recomendação: usar Coletor local. Aqui tenta genérico.
      return "/stream/snapshot.jpg";
    default:
      return "/snapshot.jpg";
  }
}

async function fetchSnapshot(cam: any): Promise<Uint8Array> {
  const proto = cam.protocolo === "https" ? "https" : "http";
  const port = cam.porta ?? (proto === "https" ? 443 : 80);
  const path = pathFor(cam.marca, cam.snapshot_path);
  const url = `${proto}://${cam.host}:${port}${path}`;
  const headers: Record<string, string> = {};
  if (cam.usuario) {
    const basic = btoa(`${cam.usuario}:${cam.senha ?? ""}`);
    headers["Authorization"] = `Basic ${basic}`;
  }
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`HTTP ${res.status} do host ${cam.host}`);
  return new Uint8Array(await res.arrayBuffer());
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { camera_id, movement_id } = await req.json();
    if (!camera_id) throw new Error("camera_id obrigatório");
    const sb = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: cam, error } = await sb.from("cv_cameras").select("*").eq("id", camera_id).single();
    if (error || !cam) throw new Error(error?.message || "Câmera não encontrada");
    if (!cam.ativo) throw new Error("Câmera desativada");
    if (cam.tipo_rede === "interna")
      throw new Error("Câmera interna — utilize o Coletor Desktop para capturar");

    const bytes = await fetchSnapshot(cam);
    const path = `cameras/${cam.id}/${Date.now()}-${cam.angulo_key}.jpg`;
    const up = await sb.storage.from("cv-vehicle-photos").upload(path, bytes, {
      contentType: "image/jpeg",
      upsert: false,
    });
    if (up.error) throw up.error;
    const { data: signed } = await sb.storage.from("cv-vehicle-photos").createSignedUrl(path, 3600);
    return new Response(
      JSON.stringify({ photo_path: path, signed_url: signed?.signedUrl, angle_key: cam.angulo_key }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("cv-camera-snapshot error:", (e as Error).message, (e as Error).stack);
    return new Response(JSON.stringify({ error: String((e as Error).message ?? e) }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
