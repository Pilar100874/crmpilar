import { useEffect, useRef, useState } from "react";
import { useTvWatchdog } from "@/lib/tv/watchdogRede";
import { TvWatchdogAviso } from "@/components/tv/TvWatchdogAviso";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Pause, Play, Monitor, X } from "lucide-react";
import TvNotificationBar from "@/components/tv/TvNotificationBar";
import TvPainelPlayer from "@/components/tv/TvPainelPlayer";
import TvSplitLayout, { type TvVisibilidade } from "@/components/tv/TvSplitLayout";
import { useFullscreen } from "@/hooks/useFullscreen";
import { TV_FIM_CONTEUDO } from "@/lib/tv/cicloConteudo";

type Item = { url: string; nome: string; duracao: number; refresh: number; aoFinal?: boolean };

export default function TvSignageSimulador() {
  const { deviceId, deviceCode } = useParams();
  const navigate = useNavigate();
  useFullscreen(true);
  const [device, setDevice] = useState<any>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [itemsB, setItemsB] = useState<Item[]>([]);
  const [itemsC, setItemsC] = useState<Item[]>([]);
  const [split, setSplit] = useState<{
    modo: "horizontal" | "vertical";
    paineis: number;
    proporcao: number;
    proporcaoB: number;
    zoomA: number;
    zoomB: number;
    zoomC: number;
    visB: TvVisibilidade;
    visC: TvVisibilidade;
  } | null>(null);

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
    // Playlists rodam de forma fluida: sem refresh automático (evita tela de carregando)
    return { url, nome: dsh.nome, duracao: 0, refresh: 0 };

  };

  /** Monta a lista de itens de um painel a partir de um dashboard fixo ou de uma playlist. */
  const buildLista = async (dashboardId: string | null, playlistId: string | null, devId?: string): Promise<Item[]> => {
    if (playlistId) {
      const { data: pl } = await supabase.from("tv_playlists").select("id").eq("id", playlistId).maybeSingle();
      if (pl) {
        const { data: its } = await supabase
          .from("tv_playlist_items")
          .select("*, dashboard:tv_dashboards(*)")
          .eq("playlist_id", pl.id)
          .order("ordem", { ascending: true });
        return ((its || [])
          .map((it: any) => {
            const b = buildUrl(it.dashboard, devId);
            return b ? { ...b, duracao: it.duracao_segundos || 10, aoFinal: it.modo_avanco === "fim_conteudo" } : null;
          })
          .filter(Boolean) as Item[]);
      }
    }
    if (dashboardId) {
      const { data } = await supabase.from("tv_dashboards").select("*").eq("id", dashboardId).maybeSingle();
      const b = buildUrl(data, devId);
      if (b) return [{ ...b, duracao: 0 }];
    }
    return [];
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
              return b ? { ...b, duracao: it.duracao_segundos || 10, aoFinal: it.modo_avanco === "fim_conteudo" } : null;
            })
            .filter(Boolean) as Item[];
        } else if (dashboard) {
          const b = buildUrl(dashboard, previewDeviceId);
          if (b) list = [{ ...b, duracao: 0 }];
        }
        // Tela dividida em modo prévia/ad-hoc (?split=horizontal&b_dashboard_id=...)
        const modoSplitPrev = qs.get("split") || "nenhum";
        let listBPrev: Item[] = [];
        let listCPrev: Item[] = [];
        if (modoSplitPrev === "horizontal" || modoSplitPrev === "vertical") {
          const paineisPrev = Number(qs.get("paineis") || 2) === 3 ? 3 : 2;
          listBPrev = await buildLista(qs.get("b_dashboard_id"), qs.get("b_playlist_id"), previewDeviceId);
          if (paineisPrev === 3) {
            listCPrev = await buildLista(qs.get("c_dashboard_id"), qs.get("c_playlist_id"), previewDeviceId);
          }
          setSplit({
            modo: modoSplitPrev,
            paineis: paineisPrev,
            proporcao: Number(qs.get("proporcao") || 50),
            proporcaoB: Number(qs.get("proporcao_b") || 25),
            zoomA: Number(qs.get("zoom_a") || 100),
            zoomB: Number(qs.get("zoom_b") || 100),
            zoomC: Number(qs.get("zoom_c") || 100),
            visB: {
              modo: (qs.get("b_visivel") as any) === "intervalo" ? "intervalo" : "sempre",
              intervalo: Number(qs.get("b_intervalo") || 300),
              duracao: Number(qs.get("b_duracao") || 30),
            },
            visC: {
              modo: (qs.get("c_visivel") as any) === "intervalo" ? "intervalo" : "sempre",
              intervalo: Number(qs.get("c_intervalo") || 300),
              duracao: Number(qs.get("c_duracao") || 30),
            },
          });
        } else {
          setSplit(null);
        }
        setItemsC(listCPrev);


        if (!list.length && !listBPrev.length) {
          console.warn("[Simulador] prévia sem itens", { previewDashboardId, previewPlaylistId, previewRota, dashboard, playlist });
          setErro(
            previewPlaylistId
              ? "A playlist selecionada está vazia ou seus dashboards não estão acessíveis."
              : previewDashboardId
              ? "O dashboard selecionado não foi encontrado ou está sem tipo/rota configurada."
              : "Nada para exibir na prévia"
          );
        }
        setItems(list);
        setItemsB(listBPrev);
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

      // 2) Carrega dashboard/playlist — prioriza overrides da URL (modo prévia)
      //    para que o botão "Simular" sempre reflita o que foi solicitado.
      const targetDashboardId = previewDashboardId || dev.dashboard_atual_id;
      const targetPlaylistId = previewPlaylistId || dev.playlist_id;

      let dashboard: any = null;
      if (targetDashboardId) {
        const { data } = await supabase.from("tv_dashboards").select("*").eq("id", targetDashboardId).maybeSingle();
        dashboard = data;
      }
      let playlist: any = null;
      if (targetPlaylistId) {
        const { data: pl } = await supabase.from("tv_playlists").select("*").eq("id", targetPlaylistId).maybeSingle();
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
          return b ? { ...b, duracao: it.duracao_segundos || 10, aoFinal: it.modo_avanco === "fim_conteudo" } : null;
        }).filter(Boolean) as Item[];
      }
      if (!list.length && dashboard) {
        const b = buildUrl(dashboard, dev.id);
        if (b) list = [{ ...b, duracao: 0 }];
      }
      if (!list.length && previewRota) {
        const b = buildUrl({ nome: "Prévia", tipo: "tela_interna", rota_interna: previewRota, refresh_segundos: 0 }, dev.id);
        if (b) list = [{ ...b, duracao: 0 }];
      }

      // Tela dividida: painéis B e C configurados no dispositivo
      const modoSplit = (qs.get("split") || dev.split_modo || "nenhum") as string;
      let listB: Item[] = [];
      let listC: Item[] = [];
      if (modoSplit === "horizontal" || modoSplit === "vertical") {
        const paineis = Number(qs.get("paineis") || dev.split_paineis || 2) === 3 ? 3 : 2;
        listB = await buildLista(
          qs.get("b_dashboard_id") || dev.split_b_dashboard_id || null,
          qs.get("b_playlist_id") || dev.split_b_playlist_id || null,
          dev.id,
        );
        if (paineis === 3) {
          listC = await buildLista(
            qs.get("c_dashboard_id") || dev.split_c_dashboard_id || null,
            qs.get("c_playlist_id") || dev.split_c_playlist_id || null,
            dev.id,
          );
        }
        setSplit({
          modo: modoSplit as any,
          paineis,
          proporcao: Number(qs.get("proporcao") || dev.split_proporcao || 50),
          proporcaoB: Number(qs.get("proporcao_b") || dev.split_proporcao_b || 25),
          zoomA: Number(qs.get("zoom_a") || dev.split_zoom_a || 100),
          zoomB: Number(qs.get("zoom_b") || dev.split_zoom_b || 100),
          zoomC: Number(qs.get("zoom_c") || dev.split_zoom_c || 100),
          visB: {
            modo: (qs.get("b_visivel") || dev.split_b_visivel_modo) === "intervalo" ? "intervalo" : "sempre",
            intervalo: Number(qs.get("b_intervalo") || dev.split_b_intervalo_segundos || 300),
            duracao: Number(qs.get("b_duracao") || dev.split_b_duracao_segundos || 30),
          },
          visC: {
            modo: (qs.get("c_visivel") || dev.split_c_visivel_modo) === "intervalo" ? "intervalo" : "sempre",
            intervalo: Number(qs.get("c_intervalo") || dev.split_c_intervalo_segundos || 300),
            duracao: Number(qs.get("c_duracao") || dev.split_c_duracao_segundos || 30),
          },
        });
      } else {
        setSplit(null);
      }
      setItemsC(listC);


      if (!list.length && !listB.length) {
        setErro(
          targetDashboardId || targetPlaylistId
            ? "Não foi possível carregar o conteúdo da prévia. Verifique se o dashboard/playlist ainda existe."
            : "Nenhum dashboard/playlist configurado neste dispositivo"
        );
      }
      setItems(list);
      setItemsB(listB);
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


  // Referência aos iframes montados (ativo + pré-carregado) para identificar a origem
  // das mensagens de fim de conteúdo.
  const iframesRef = useRef<Record<number, HTMLIFrameElement | null>>({});

  // Rotação da playlist

  useEffect(() => {
    if (paused || items.length <= 1) return;
    const cur = items[idx];
    if (!cur) return;
    // Modo "ao final do conteúdo": aguarda o aviso do player interno.
    // Nada de temporizador aqui — cortar no meio da apresentação é justamente o que
    // esse modo evita.
    if (cur.aoFinal) return;
    if (!cur.duracao) return;
    const t = setTimeout(() => setIdx((i) => (i + 1) % items.length), cur.duracao * 1000);
    return () => clearTimeout(t);
  }, [idx, items, paused]);

  // Aviso de fim de ciclo enviado pelos players internos (apresentação/mural).
  // Só aceitamos o aviso da janela do item ATIVO — o próximo item já fica pré-carregado
  // (invisível) e também emite esse evento; se aceitássemos, a apresentação atual seria
  // cortada no meio.
  useEffect(() => {
    const onMsg = (ev: MessageEvent) => {
      if ((ev.data as any)?.tipo !== TV_FIM_CONTEUDO) return;
      if (paused || items.length <= 1) return;
      if (!items[idx]?.aoFinal) return;
      const ativo = iframesRef.current[idx];
      if (ativo && ev.source && ev.source !== ativo.contentWindow) return;
      setIdx((i) => (i + 1) % items.length);
    };
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, [idx, items, paused]);


  // Auto-hide da barra
  useEffect(() => {
    if (!showBar) return;
    const t = setTimeout(() => setShowBar(false), 3500);
    return () => clearTimeout(t);
  }, [showBar, idx]);

  const cur = items[idx];
  const proxIdx = items.length > 1 ? (idx + 1) % items.length : -1;

  // Watchdog: reconexão e retomada automática do ciclo da playlist.
  // Em itens "ao final do conteúdo" o ciclo pode demorar muito (apresentação longa),
  // então o avanço por inatividade fica praticamente desativado.
  const watchdog = useTvWatchdog({
    segundosSemProgresso: cur?.aoFinal ? 24 * 60 * 60 : 300,
    segundosSemRede: 20,
    ativo: !paused,
    aoRecuperar: () => {
      setReloadKey((k) => k + 1);
      if (items.length > 1 && !items[idx]?.aoFinal) setIdx((i) => (i + 1) % items.length);
    },
  });
  useEffect(() => { watchdog.marcarProgresso(); }, [idx, reloadKey, watchdog.marcarProgresso]);

  const montarUrl = (item: Item) => `${item.url}${item.url.includes("?") ? "&" : "?"}_r=${reloadKey}`;

  return (
    <div className="fixed inset-0 bg-black z-[9999]" onMouseMove={() => setShowBar(true)}>
      <TvWatchdogAviso mensagem={watchdog.mensagem} online={watchdog.online} />
      {loading && <div className="absolute inset-0 bg-black" />}
      {erro && (
        <div className="flex h-full items-center justify-center flex-col gap-3 text-white">
          <Monitor className="w-12 h-12 opacity-50" />
          <p>{erro}</p>
          <Button variant="secondary" onClick={() => navigate(-1)}>Voltar</Button>
        </div>
      )}
      {/* Tela dividida: dois painéis independentes (cada um com dashboard fixo ou playlist) */}
      {split && !erro && (
        <TvSplitLayout
          modo={split.modo}
          paused={paused}
          reloadKey={reloadKey}
          paineis={[
            { items, proporcao: split.proporcao, zoom: split.zoomA },
            {
              items: itemsB,
              proporcao: split.paineis === 3 ? split.proporcaoB : 100 - split.proporcao,
              zoom: split.zoomB,
              visibilidade: split.visB,
            },
            ...(split.paineis === 3
              ? [{
                  items: itemsC,
                  proporcao: Math.max(5, 100 - split.proporcao - split.proporcaoB),
                  zoom: split.zoomC,
                  visibilidade: split.visC,
                }]
              : []),
          ]}
        />
      )}


      {/* Transição fluida: o próximo item já fica pré-carregado (invisível) e a troca
          é apenas um cross-fade — sem tela de carregando entre um conteúdo e outro.
          Exceção: itens "ao final do conteúdo" NÃO são pré-carregados, senão a
          apresentação já começa a rodar escondida e entra no ar pela metade. */}
      {!split && items.map((item, i) => {
        const preCarregar = i === proxIdx && !item.aoFinal;
        if (i !== idx && !preCarregar) return null;
        const ativo = i === idx;

        return (
          <iframe
            key={`${i}-${reloadKey}`}
            ref={(el) => { iframesRef.current[i] = el; }}
            src={montarUrl(item)}

            title={item.nome}
            className={`absolute inset-0 w-full h-full border-0 transition-opacity duration-700 ${ativo ? "opacity-100 z-10" : "opacity-0 z-0 pointer-events-none"}`}
            allow="fullscreen; autoplay; camera; microphone; geolocation"
          />
        );
      })}

      {(showBar || !cur) && device && (
        <div className="absolute top-0 left-0 right-0 z-20 bg-black/70 backdrop-blur text-white px-4 py-2 flex items-center gap-3 text-sm">
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
            <Button size="icon" variant="ghost" className="text-white hover:bg-white/10" onClick={() => { try { window.close(); } catch {} navigate(-1); }}><X className="w-4 h-4" /></Button>
          </div>

        </div>
      )}
      <Button
        size="icon"
        variant="ghost"
        aria-label="Fechar prévia"
        className="fixed top-3 right-3 z-[10000] h-10 w-10 rounded-full bg-black/60 text-white hover:bg-black/80"
        onClick={() => { try { window.close(); } catch {} navigate(-1); }}
      >
        <X className="w-5 h-5" />
      </Button>
      <TvNotificationBar deviceId={deviceId} />
    </div>
  );
}
