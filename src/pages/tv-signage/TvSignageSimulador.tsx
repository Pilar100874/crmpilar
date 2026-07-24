import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { X, ChevronLeft, ChevronRight, Pause, Play, Monitor } from "lucide-react";
import TvNotificationBar from "@/components/tv/TvNotificationBar";
import { useFullscreen } from "@/hooks/useFullscreen";

type Item = { url: string; nome: string; duracao: number; refresh: number };

export default function TvSignageSimulador() {
  const { deviceId } = useParams();
  const navigate = useNavigate();
  const [device, setDevice] = useState<any>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  const [showBar, setShowBar] = useState(true);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const buildUrl = (dsh: any): Item | null => {
    if (!dsh) return null;
    let url = "";
    if (dsh.tipo === "tela_interna" && dsh.rota_interna) {
      const sep = dsh.rota_interna.includes("?") ? "&" : "?";
      url =
        window.location.origin +
        dsh.rota_interna +
        sep +
        "tv_simulacao=1" +
        (deviceId ? `&device_id=${deviceId}` : "");
    } else if (dsh.tipo === "url_externa" && dsh.url) {
      url = dsh.url;
    } else return null;
    return { url, nome: dsh.nome, duracao: 0, refresh: dsh.refresh_segundos || 0 };
  };


  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: dev, error } = await supabase
        .from("tv_devices")
        .select("*, dashboard:tv_dashboards(*), playlist:tv_playlists(*, itens:tv_playlist_items(*, dashboard:tv_dashboards(*)))")
        .eq("id", deviceId)
        .maybeSingle();
      if (error || !dev) { setErro("Dispositivo não encontrado"); setLoading(false); return; }
      setDevice(dev);
      let list: Item[] = [];
      if (dev.playlist_id && dev.playlist) {
        const its = (dev.playlist.itens || []).sort((a: any, b: any) => a.ordem - b.ordem);
        list = its.map((it: any) => {
          const b = buildUrl(it.dashboard);
          return b ? { ...b, duracao: it.duracao_segundos || 10 } : null;
        }).filter(Boolean) as Item[];
      } else if (dev.dashboard_atual_id && dev.dashboard) {
        const b = buildUrl(dev.dashboard);
        if (b) list = [{ ...b, duracao: 0 }];
      }
      if (!list.length) setErro("Nenhum dashboard/playlist configurado neste dispositivo");
      setItems(list);
      setLoading(false);
    })();
  }, [deviceId]);

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
