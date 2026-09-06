import { authenticateDevice, corsHeaders, json, serviceClient } from "../_shared/tv-auth.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const auth = await authenticateDevice(req);
  if (!auth) return json({ error: "não autenticado" }, 401);

  const sb = serviceClient();
  const { data: device } = await sb.from("tv_devices").select("*").eq("id", auth.deviceId).maybeSingle();
  if (!device) return json({ error: "não encontrado" }, 404);
  if (device.bloqueado) return json({ error: "bloqueado", bloqueado: true }, 403);

  let dashboard = null;
  let playlist = null;

  if (device.dashboard_atual_id) {
    const { data } = await sb.from("tv_dashboards").select("*").eq("id", device.dashboard_atual_id).maybeSingle();
    dashboard = data;
  }
  if (device.playlist_id) {
    const { data: pl } = await sb.from("tv_playlists").select("*").eq("id", device.playlist_id).maybeSingle();
    const { data: items } = await sb.from("tv_playlist_items")
      .select("*, dashboard:tv_dashboards(*)")
      .eq("playlist_id", device.playlist_id)
      .order("ordem", { ascending: true });
    playlist = { ...pl, items };
  }

  // Tela dividida: conteúdo do painel B
  let splitDashboard = null;
  let splitPlaylist = null;
  const splitModo = device.split_modo || "nenhum";
  if (splitModo !== "nenhum") {
    if (device.split_b_dashboard_id) {
      const { data } = await sb.from("tv_dashboards").select("*").eq("id", device.split_b_dashboard_id).maybeSingle();
      splitDashboard = data;
    }
    if (device.split_b_playlist_id) {
      const { data: pl } = await sb.from("tv_playlists").select("*").eq("id", device.split_b_playlist_id).maybeSingle();
      const { data: items } = await sb.from("tv_playlist_items")
        .select("*, dashboard:tv_dashboards(*)")
        .eq("playlist_id", device.split_b_playlist_id)
        .order("ordem", { ascending: true });
      splitPlaylist = { ...pl, items };
    }
  }

  return json({
    split: {
      modo: splitModo,
      proporcao: device.split_proporcao ?? 50,
      zoom_a: device.split_zoom_a ?? 100,
      zoom_b: device.split_zoom_b ?? 100,
      painel_b: { dashboard: splitDashboard, playlist: splitPlaylist },
    },
    device: {
      id: device.id,
      nome: device.nome,
      tema: device.tema,
      idioma: device.idioma,
      versao_min_requerida: device.versao_min_requerida,
    },
    dashboard,
    playlist,
  });
});
