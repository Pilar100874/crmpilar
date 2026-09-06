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

  // Tela dividida: conteúdo dos painéis B e C
  const splitModo = device.split_modo || "nenhum";
  const carregarPainel = async (dashboardId: string | null, playlistId: string | null) => {
    let dashboard = null;
    let playlist = null;
    if (dashboardId) {
      const { data } = await sb.from("tv_dashboards").select("*").eq("id", dashboardId).maybeSingle();
      dashboard = data;
    }
    if (playlistId) {
      const { data: pl } = await sb.from("tv_playlists").select("*").eq("id", playlistId).maybeSingle();
      const { data: items } = await sb.from("tv_playlist_items")
        .select("*, dashboard:tv_dashboards(*)")
        .eq("playlist_id", playlistId)
        .order("ordem", { ascending: true });
      playlist = { ...pl, items };
    }
    return { dashboard, playlist };
  };

  const painelB = splitModo !== "nenhum"
    ? await carregarPainel(device.split_b_dashboard_id, device.split_b_playlist_id)
    : { dashboard: null, playlist: null };
  const paineis = Number(device.split_paineis ?? 2) === 3 ? 3 : 2;
  const painelC = splitModo !== "nenhum" && paineis === 3
    ? await carregarPainel(device.split_c_dashboard_id, device.split_c_playlist_id)
    : { dashboard: null, playlist: null };

  return json({
    split: {
      modo: splitModo,
      paineis,
      proporcao: device.split_proporcao ?? 50,
      proporcao_b: device.split_proporcao_b ?? 25,
      zoom_a: device.split_zoom_a ?? 100,
      zoom_b: device.split_zoom_b ?? 100,
      zoom_c: device.split_zoom_c ?? 100,
      b_visivel: device.split_b_visivel_modo ?? "sempre",
      b_intervalo: device.split_b_intervalo_segundos ?? 300,
      b_duracao: device.split_b_duracao_segundos ?? 30,
      c_visivel: device.split_c_visivel_modo ?? "sempre",
      c_intervalo: device.split_c_intervalo_segundos ?? 300,
      c_duracao: device.split_c_duracao_segundos ?? 30,
      painel_b: painelB,
      painel_c: painelC,
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
