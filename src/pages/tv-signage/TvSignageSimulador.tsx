import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { X, ChevronLeft, ChevronRight, Pause, Play, Monitor } from "lucide-react";

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
      url = window.location.origin + dsh.rota_interna + (dsh.rota_interna.includes("?") ? "&" : "?") + "tv_simulacao=1";
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
            <Button size="icon" variant="ghost" className="text-white hover:bg-white/10" onClick={() => window.close() || navigate(-1)}><X className="w-4 h-4" /></Button>
          </div>
        </div>
      )}
    </div>
  );
}
