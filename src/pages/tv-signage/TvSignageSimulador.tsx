import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { X, ChevronLeft, ChevronRight, Pause, Play, Monitor } from "lucide-react";
import TvNotificationBar from "@/components/tv/TvNotificationBar";
import { useFullscreen } from "@/hooks/useFullscreen";

type Item = { url: string; nome: string; duracao: number; refresh: number };

export default function TvSignageSimulador() {
  const { deviceId, deviceCode } = useParams();
  const navigate = useNavigate();
  useFullscreen(true);
  const [device, setDevice] = useState<any>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  const [showBar, setShowBar] = useState(true);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const qs = new URLSearchParams(window.location.search);
  const previewDeviceId = qs.get("preview_device_id") || qs.get("device_id") || "";

  const buildUrl = (dsh: any, currentDeviceId?: string): Item | null => {
    if (!dsh) return null;
    let url = "";
    if (dsh.tipo === "tela_interna" && dsh.rota_interna) {
      const sep = dsh.rota_interna.includes("?") ? "&" : "?";
      const propagatedDeviceId = currentDeviceId || previewDeviceId || deviceId || "";
      url =
        window.location.origin +
        dsh.rota_interna +
        sep +
        "tv_simulacao=1" +
        (propagatedDeviceId ? `&device_id=${encodeURIComponent(propagatedDeviceId)}` : "");
    } else if (dsh.tipo === "url_externa" && dsh.url) {
      url = dsh.url;
    } else return null;
    return { url, nome: dsh.nome, duracao: 0, refresh: dsh.refresh_segundos || 0 };
  };


  useEffect(() => {
    (async () => {
      setLoading(true);
      setErro(null);
      const rawDeviceParam = deviceId || deviceCode || qs.get("device_code") || qs.get("codigo") || qs.get("device_id") || "";
      const normalizedCode = rawDeviceParam.trim().toUpperCase();

      // Modo prévia sem dispositivo: aceita ?dashboard_id=, ?playlist_id= ou ?rota=
      const previewDashboardId = qs.get("dashboard_id");
      const previewPlaylistId = qs.get("playlist_id");
      const previewRota = qs.get("rota");

      // 1) Busca o dispositivo isoladamente para evitar que falhas em joins
      //    (RLS de dashboards/playlists) façam parecer que o device não existe.
      let dev: any = null;
      let errorMessage = "";

      if (rawDeviceParam) {
        const { data, error } = await supabase
          .from("tv_devices")
          .select("*")
          .eq("id", rawDeviceParam)
          .maybeSingle();

        if (data) {
          dev = data;
        } else if (error?.code !== "22P02") {
          errorMessage = error?.message || "";
        }
      }

      if (!dev && normalizedCode) {
        const { data, error } = await supabase
          .from("tv_devices")
          .select("*")
          .eq("codigo", normalizedCode)
          .maybeSingle();

        if (data) {
          dev = data;
        } else if (error) {
          errorMessage = error.message;
        }
      }

      // Se não há dispositivo mas há parâmetros de prévia, roda em modo ad-hoc
      if (!dev && (previewDashboardId || previewPlaylistId || previewRota)) {
        let dashboard: any = null;
        let playlist: any = null;

        if (previewPlaylistId) {
          const { data: pl } = await supabase.from("tv_playlists").select("*").eq("id", previewPlaylistId).maybeSingle();
          if (pl) {
            const { data: its } = await supabase
              .from("tv_playlist_items")
              .select("*, dashboard:tv_dashboards(*)")
              .eq("playlist_id", pl.id)
              .order("ordem", { ascending: true });
            playlist = { ...pl, itens: its || [] };
          }
        } else if (previewDashboardId) {
          const { data } = await supabase.from("tv_dashboards").select("*").eq("id", previewDashboardId).maybeSingle();
          dashboard = data;
        } else if (previewRota) {
          dashboard = { nome: "Prévia", tipo: "tela_interna", rota_interna: previewRota, refresh_segundos: 0 };
        }

        const fake = { id: previewDeviceId || "preview", nome: "Prévia", dashboard, playlist };
        setDevice(fake);

        let list: Item[] = [];
        if (playlist) {
          list = (playlist.itens || [])
            .map((it: any) => {
              const b = buildUrl(it.dashboard, previewDeviceId);
              return b ? { ...b, duracao: it.duracao_segundos || 10 } : null;
            })
            .filter(Boolean) as Item[];
        } else if (dashboard) {
          const b = buildUrl(dashboard, previewDeviceId);
          if (b) list = [{ ...b, duracao: 0 }];
        }
        if (!list.length) setErro("Nada para exibir na prévia");
        setItems(list);
        setLoading(false);
        return;
      }

      if (!dev) {
        // Sem device e sem parâmetros de prévia
        if (!rawDeviceParam) {
          setErro("Informe ?dashboard_id=, ?playlist_id= ou ?rota= para pré-visualizar sem dispositivo");
        } else {
          console.error("[Simulador] device not found", { rawDeviceParam, errorMessage });
          setErro(errorMessage ? `Dispositivo não encontrado: ${errorMessage}` : "Dispositivo não encontrado");
        }
        setLoading(false);
        return;
      }

      // 2) Carrega dashboard/playlist em consultas separadas
      let dashboard: any = null;
      if (dev.dashboard_atual_id) {
        const { data } = await supabase.from("tv_dashboards").select("*").eq("id", dev.dashboard_atual_id).maybeSingle();
        dashboard = data;
      }
      let playlist: any = null;
      if (dev.playlist_id) {
        const { data: pl } = await supabase.from("tv_playlists").select("*").eq("id", dev.playlist_id).maybeSingle();
        if (pl) {
          const { data: its } = await supabase
            .from("tv_playlist_items")
            .select("*, dashboard:tv_dashboards(*)")
            .eq("playlist_id", pl.id)
            .order("ordem", { ascending: true });
          playlist = { ...pl, itens: its || [] };
        }
      }
      const devFull = { ...dev, dashboard, playlist };
      setDevice(devFull);

      let list: Item[] = [];
      if (playlist) {
        list = (playlist.itens || []).map((it: any) => {
          const b = buildUrl(it.dashboard, dev.id);
          return b ? { ...b, duracao: it.duracao_segundos || 10 } : null;
        }).filter(Boolean) as Item[];
      } else if (dashboard) {
        const b = buildUrl(dashboard, dev.id);
        if (b) list = [{ ...b, duracao: 0 }];
      }
      if (!list.length) setErro("Nenhum dashboard/playlist configurado neste dispositivo");
      setItems(list);
      setLoading(false);
    })();
  }, [deviceId, deviceCode]);

  // Agendador local para preview: dispara workflows do tipo intervalo/cron do
  // estabelecimento deste dispositivo. Cada workflow tem seu próprio timer.
  useEffect(() => {
    if (!device?.estabelecimento_id) return;
    let cancelled = false;
    const timers: ReturnType<typeof setInterval>[] = [];

    const parseCronMinuto = (cron: string): number | null => {
      // Suporta apenas o campo minuto para "*/N * * * *" ou "N * * * *"
      const parts = (cron || "").trim().split(/\s+/);
      if (parts.length < 5) return null;
      const m = parts[0];
      const every = m.match(/^\*\/(\d+)$/);
      if (every) return Math.max(1, parseInt(every[1], 10));
      if (/^\d+$/.test(m)) return 60; // fixo em minuto X → 1x por hora
      if (m === "*") return 1;
      return null;
    };

    (async () => {
      const { data: wfs } = await supabase
        .from("tv_workflows")
        .select("id, ativo, flow_json")
        .eq("estabelecimento_id", device.estabelecimento_id)
        .eq("ativo", true);
      if (cancelled || !wfs) return;

      for (const wf of wfs) {
        const nodes = (wf.flow_json as any)?.nodes || [];
        let minutos: number | null = null;
        for (const n of nodes) {
          const t = n.data?.type;
          const cfg = n.data?.config || {};
          if (t === "gatilho_intervalo") {
            const m = parseInt(cfg.intervalo_min, 10);
            if (m > 0) minutos = minutos == null ? m : Math.min(minutos, m);
          } else if (t === "gatilho_agendado") {
            const m = parseCronMinuto(cfg.cron || "");
            if (m) minutos = minutos == null ? m : Math.min(minutos, m);
          }
        }
        if (!minutos) continue;

        const disparar = () => {
          supabase.functions.invoke("tv-workflow-dispatch", {
            body: { workflow_id: wf.id, payload: { preview: true } },
          });
        };
        // Dispara logo (após 3s) e depois no intervalo configurado
        const kickoff = setTimeout(disparar, 3000);
        const timer = setInterval(disparar, minutos * 60 * 1000);
        timers.push(timer);
        timers.push(kickoff as any);
      }
    })();

    return () => {
      cancelled = true;
      timers.forEach((t) => clearInterval(t));
    };
  }, [device?.estabelecimento_id]);


  // Rotação da playlist
  useEffect(() => {
    if (paused || items.length <= 1) return;
    const cur = items[idx];
    if (!cur || !cur.duracao) return;
    const t = setTimeout(() => setIdx((i) => (i + 1) % items.length), cur.duracao * 1000);
    return () => clearTimeout(t);
  }, [idx, items, paused]);

  // Refresh do dashboard atual
  useEffect(() => {
    const cur = items[idx];
    if (!cur?.refresh) return;
    const t = setInterval(() => setReloadKey((k) => k + 1), cur.refresh * 1000);
    return () => clearInterval(t);
  }, [idx, items]);

  // Auto-hide da barra
  useEffect(() => {
    if (!showBar) return;
    const t = setTimeout(() => setShowBar(false), 3500);
    return () => clearTimeout(t);
  }, [showBar, idx]);

  const cur = items[idx];
  const url = useMemo(() => cur ? `${cur.url}${cur.url.includes("?") ? "&" : "?"}_r=${reloadKey}` : "", [cur, reloadKey]);

  return (
    <div className="fixed inset-0 bg-black z-[9999]" onMouseMove={() => setShowBar(true)}>
      {loading && <div className="flex h-full items-center justify-center text-white">Carregando simulação…</div>}
      {erro && (
        <div className="flex h-full items-center justify-center flex-col gap-3 text-white">
          <Monitor className="w-12 h-12 opacity-50" />
          <p>{erro}</p>
          <Button variant="secondary" onClick={() => navigate(-1)}>Voltar</Button>
        </div>
      )}
      {cur && (
        <iframe
          key={url}
          src={url}
          title={cur.nome}
          className="w-full h-full border-0"
          allow="fullscreen; autoplay; camera; microphone; geolocation"
        />
      )}
      {(showBar || !cur) && device && (
        <div className="absolute top-0 left-0 right-0 bg-black/70 backdrop-blur text-white px-4 py-2 flex items-center gap-3 text-sm">
          <Monitor className="w-4 h-4" />
          <span className="font-medium">Simulação:</span>
          <span>{device.nome}</span>
          {cur && (
            <span className="text-white/70">
              — {cur.nome} {items.length > 1 && `(${idx + 1}/${items.length})`}
            </span>
          )}
          <div className="ml-auto flex items-center gap-1">
            {items.length > 1 && (
              <>
                <Button size="icon" variant="ghost" className="text-white hover:bg-white/10" onClick={() => setIdx((i) => (i - 1 + items.length) % items.length)}><ChevronLeft className="w-4 h-4" /></Button>
                <Button size="icon" variant="ghost" className="text-white hover:bg-white/10" onClick={() => setPaused((p) => !p)}>{paused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}</Button>
                <Button size="icon" variant="ghost" className="text-white hover:bg-white/10" onClick={() => setIdx((i) => (i + 1) % items.length)}><ChevronRight className="w-4 h-4" /></Button>
              </>
            )}
            <Button size="icon" variant="ghost" className="text-white hover:bg-white/10" onClick={() => { window.close(); navigate(-1); }}><X className="w-4 h-4" /></Button>
          </div>
        </div>
      )}
      <TvNotificationBar deviceId={deviceId} />
    </div>
  );
}
