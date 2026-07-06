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
  const res = await fetch(url, { headers, signal: AbortSignal.timeout(10000) });
  if (!res.ok) throw new Error(`HTTP ${res.status} do host ${cam.host} (${url})`);
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
    if (cam.tipo_rede === "interna") {
      const latestPath = `cameras/${cam.id}/coletor-latest.jpg`;

      // Metadata anterior — para detectar quando o Coletor sobe um novo snapshot
      let prevUpdated: string | null = null;
      try {
        const { data: list } = await sb.storage
          .from("cv-vehicle-photos")
          .list(`cameras/${cam.id}`, { search: "coletor-latest.jpg", limit: 1 });
        prevUpdated = list?.[0]?.updated_at ?? null;
      } catch {}

      // Dispara snapshot on-demand via Realtime — o Coletor Desktop escuta
      // "snapshot-now" no canal webrtc-signal e captura+upload imediato.
      try {
        const chanNames = ["webrtc-signal"];
        if (cam.filial_id) chanNames.push(`webrtc-signal:${cam.filial_id}`);
        for (const name of chanNames) {
          const ch = sb.channel(name, { config: { broadcast: { self: false, ack: false } } });
          await new Promise<void>((resolve) => {
            ch.subscribe((s) => { if (s === "SUBSCRIBED") resolve(); });
            setTimeout(resolve, 1500);
          });
          await ch.send({
            type: "broadcast",
            event: "msg",
            payload: { type: "snapshot-now", to: "coletor", camera_id: cam.id },
          });
          setTimeout(() => { try { sb.removeChannel(ch); } catch {} }, 500);
        }
      } catch (e) {
        console.error("broadcast snapshot-now:", (e as Error).message);
      }

      // Aguarda até 10s pelo novo snapshot do Coletor
      const deadline = Date.now() + 10_000;
      let currentUpdated: string | null = prevUpdated;
      while (Date.now() < deadline) {
        await new Promise((r) => setTimeout(r, 800));
        try {
          const { data: list } = await sb.storage
            .from("cv-vehicle-photos")
            .list(`cameras/${cam.id}`, { search: "coletor-latest.jpg", limit: 1 });
          const nowUpd = list?.[0]?.updated_at ?? null;
          if (nowUpd && nowUpd !== prevUpdated) { currentUpdated = nowUpd; break; }
        } catch {}
      }

      // Se temos qualquer snapshot armazenado (novo ou antigo), retorna
      if (currentUpdated) {
        const { data: signedLatest } = await sb.storage
          .from("cv-vehicle-photos")
          .createSignedUrl(latestPath, 3600);
        if (signedLatest?.signedUrl) {
          return new Response(
            JSON.stringify({
              photo_path: latestPath,
              signed_url: `${signedLatest.signedUrl}&t=${Date.now()}`,
              angle_key: cam.angulo_key,
              fonte: "coletor",
              atualizado: currentUpdated !== prevUpdated,
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }
      }

      // Sem snapshot — mensagem específica
      const seenMs = cam.ultima_verificacao
        ? Date.now() - new Date(cam.ultima_verificacao).getTime()
        : Infinity;
      const coletorOnline = cam.ultimo_status === "online" && seenMs < 120_000;
      const isRtsp = (cam.protocolo || "").toLowerCase() === "rtsp" || cam.porta === 554;
      if (coletorOnline && isRtsp) {
        throw new Error(
          "Coletor online, mas não conseguiu capturar snapshot RTSP. Verifique se o ffmpeg está disponível (o Coletor v1.4.9+ traz embutido — atualize) e se as credenciais/porta RTSP da câmera estão corretas.",
        );
      }
      if (coletorOnline) {
        throw new Error(
          "Coletor online mas snapshot ainda não disponível. Verifique credenciais e conectividade da câmera na LAN.",
        );
      }
      throw new Error(
        "Câmera interna — Coletor Desktop offline. Abra o Coletor no PC da LAN e ative o módulo de câmeras.",
      );
    }


    try {
      const bytes = await fetchSnapshot(cam);
      const path = `cameras/${cam.id}/${Date.now()}-${cam.angulo_key}.jpg`;
      const up = await sb.storage.from("cv-vehicle-photos").upload(path, bytes, {
        contentType: "image/jpeg",
        upsert: false,
      });
      if (up.error) throw up.error;
      const { data: signed } = await sb.storage.from("cv-vehicle-photos").createSignedUrl(path, 3600);
      // Carimba online — snapshot público funcionou
      await sb.from("cv_cameras").update({
        ultima_verificacao: new Date().toISOString(),
        ultimo_status: "online",
        ultimo_erro: null,
      }).eq("id", cam.id);
      return new Response(
        JSON.stringify({ photo_path: path, signed_url: signed?.signedUrl, angle_key: cam.angulo_key }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    } catch (err) {
      // Carimba erro — falha ao acessar câmera pública
      await sb.from("cv_cameras").update({
        ultima_verificacao: new Date().toISOString(),
        ultimo_status: "erro",
        ultimo_erro: String((err as Error).message ?? err).slice(0, 500),
      }).eq("id", cam.id);
      throw err;
    }

  } catch (e) {
    console.error("cv-camera-snapshot error:", (e as Error).message, (e as Error).stack);
    return new Response(JSON.stringify({ error: String((e as Error).message ?? e) }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
