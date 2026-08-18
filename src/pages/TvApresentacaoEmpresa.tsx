import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useTvMode } from "@/lib/tvMode";
import { useAutoReload } from "@/lib/tvAutoReload";
import { useSaidaOculta } from "@/lib/tvSaidaOculta";
import { SaidaOcultaOverlay } from "@/components/tv/SaidaOcultaOverlay";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { callTvDeviceFunction, getTvDeviceToken } from "@/lib/tvDeviceClient";
import { useFullscreen } from "@/hooks/useFullscreen";
import { MonitorPlay, X } from "lucide-react";
import { Button } from "@/components/ui/button";

type ItemTipo = "image" | "video";
interface ApresentacaoItem {
  id: string;
  tipo: ItemTipo;
  url: string;
  nome?: string;
  duracao?: number;
}
interface Apresentacao {
  id: string;
  nome: string;
  itens: ApresentacaoItem[];
  duracao_padrao_imagem: number;
  transicao: string;
  ativo: boolean;
}

export default function TvApresentacaoEmpresa() {
  const modoTv = useTvMode();
  // Sem reload por tempo (a TV ficava preta); só recarrega se a apresentação travar.
  // O player já possui recuperação local. Recarregar a página pelo watchdog
  // fazia algumas WebViews voltarem para a tela nativa com o símbolo de play.
  const { marcarAtividade } = useAutoReload({ minutosPadrao: 0, watchdogMinutos: 0 });

  const [params] = useSearchParams();

  const navigate = useNavigate();
  const id = params.get("id");
  const rotateMs = parseInt(params.get("rotate") || "0"); // rotate through multiple presentations (comma-sep in ids?)
  useFullscreen(true);

  const closePreview = useCallback(() => {
    try { window.close(); } catch {}
    navigate(-1);
  }, [navigate]);

  // Saída oculta: manter pressionado por 5s (ou segurar ESC) para sair
  const { progresso: progressoSaida } = useSaidaOculta(closePreview);

  const [apresentacao, setApresentacao] = useState<Apresentacao | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [idx, setIdx] = useState(0);
  const [visible, setVisible] = useState(true);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [videoRecoveryKey, setVideoRecoveryKey] = useState(0);

  const [carregando, setCarregando] = useState(true);
  const [progresso, setProgresso] = useState(0);

  // Só pré-carrega imagens (leve). Vídeos são transmitidos direto — em TV Box o
  // "canplaythrough" muitas vezes nunca dispara e a tela ficava presa no loading.
  const preloadItem = (it: ApresentacaoItem): Promise<void> =>
    new Promise((resolve) => {
      if (!it?.url || it.tipo !== "image") return resolve();
      const img = new Image();
      img.onload = () => resolve();
      img.onerror = () => resolve();
      img.src = it.url;
      setTimeout(resolve, 8000);
    });

  useEffect(() => {
    if (!id) { setErro("Informe ?id=<apresentacao>"); return; }
    let cancelado = false;
    let tentativa = 0;
    let retryTimer: number | null = null;
    let carregouOk = false;


    const carregar = async () => {
      setErro(null);
      setCarregando(true);
      setProgresso(0);

      let data: any = null;
      const tvToken = getTvDeviceToken();
      if (tvToken) {
        // Dispositivo de sinalização (TV Box) — não tem sessão de usuário
        try {
          const resp = await callTvDeviceFunction<{ apresentacao: any }>(
            `tv-apresentacao?id=${encodeURIComponent(id)}`,
            tvToken,
          );
          data = resp?.apresentacao ?? null;
        } catch (e: any) {
          return falhar(e?.message || "Falha ao carregar apresentação no dispositivo");
        }
      } else {
        const res = await supabase
          .from("apresentacoes_empresa")
          .select("id,nome,itens,duracao_padrao_imagem,transicao,ativo")
          .eq("id", id)
          .maybeSingle();
        data = res.data;
      }
      if (cancelado) return;
      if (!data) return falhar("Apresentação não encontrada");
      const a: Apresentacao = {
        ...(data as any),
        itens: Array.isArray((data as any).itens) ? (data as any).itens : [],
      };
      if (!a.ativo) return falhar("Apresentação está inativa");
      if (a.itens.length === 0) return falhar("Sem mídias cadastradas");

      // Pré-carrega apenas as imagens antes de iniciar
      let feitos = 0;
      await Promise.all(
        a.itens.map((it) =>
          preloadItem(it).then(() => {
            feitos += 1;
            setProgresso(Math.round((feitos / a.itens.length) * 100));
          })
        )
      );
      if (cancelado) return;

      setApresentacao(a);
      setIdx(0);
      setCarregando(false);
      carregouOk = true;
    };

    const falhar = (msg: string) => {
      if (cancelado) return;
      setErro(msg);
      setCarregando(false);
      tentativa += 1;
      const espera = Math.min(30000, 5000 * tentativa);
      retryTimer = window.setTimeout(carregar, espera);
    };

    carregar();

    // TV Box recém-ligada: a rede costuma subir depois do app. Retenta ao voltar
    // a conexão ou quando a tela volta a ficar visível — apenas se ainda NÃO
    // conseguimos carregar, para não reiniciar a apresentação já em execução.
    const retomar = () => {
      if (cancelado || carregouOk) return;
      if (retryTimer) window.clearTimeout(retryTimer);
      tentativa = 0;
      carregar();
    };
    const aoVisibilidade = () => {
      if (document.visibilityState === "visible") retomar();
    };
    window.addEventListener("online", retomar);
    document.addEventListener("visibilitychange", aoVisibilidade);


    return () => {
      cancelado = true;
      if (retryTimer) window.clearTimeout(retryTimer);
      window.removeEventListener("online", retomar);
      document.removeEventListener("visibilitychange", aoVisibilidade);
    };
  }, [id]);



  const item = useMemo(() => apresentacao?.itens[idx] || null, [apresentacao, idx]);

  const reconstruirVideo = useCallback(() => {
    // Remontar o elemento é mais confiável que apenas chamar load() em WebViews
    // antigas: depois de horas o decodificador pode ficar em estado zumbi.
    setVideoRecoveryKey((key) => key + 1);
    ultimoAvanco.current = Date.now();
  }, []);

  const next = useCallback(() => {
    if (!apresentacao) return;
    marcarAtividade();
    if (apresentacao.itens.length === 1) {
      if (apresentacao.itens[0]?.tipo === "video") reconstruirVideo();
      return;
    }
    // Avança imediatamente (não depende de setTimeout, que pode ser
    // descartado em WebViews de TV Box após horas ligadas).
    setIdx((i) => (i + 1) % apresentacao.itens.length);
    setVisible(false);
    window.setTimeout(() => setVisible(true), 60);
  }, [apresentacao, marcarAtividade, reconstruirVideo]);


  // Timer for images (videos advance on 'ended')
  // Usa relógio de parede + interval: em TV Box, setTimeout longo pode ser
  // descartado/congelado após horas, travando a apresentação.
  useEffect(() => {
    if (!apresentacao || !item) return;
    if (item.tipo !== "image") return;
    const dur = (item.duracao ?? apresentacao.duracao_padrao_imagem) * 1000;
    const fim = Date.now() + dur;
    const iv = window.setInterval(() => {
      if (Date.now() >= fim) {
        window.clearInterval(iv);
        next();
      }
    }, 1000);
    return () => window.clearInterval(iv);
  }, [apresentacao, item, next]);

  // Guarda de travamento global: se a apresentação não avançar de item por
  // muito tempo (timers mortos, vídeo zumbi, WebView congelada), recupera.
  const ultimoAvanco = useRef<number>(Date.now());
  useEffect(() => {
    ultimoAvanco.current = Date.now();
  }, [idx]);
  useEffect(() => {
    if (!apresentacao || apresentacao.itens.length === 0) return;
    const limiteMs = Math.max(
      10 * 60_000,
      (apresentacao.duracao_padrao_imagem || 10) * 1000 * 6,
    );
    const iv = window.setInterval(() => {
      if (Date.now() - ultimoAvanco.current < limiteMs) return;
      // Tenta destravar sem recarregar a página primeiro.
      ultimoAvanco.current = Date.now();
      setVisible(true);
      if (apresentacao.itens.length > 1) {
        next();
      } else if (apresentacao.itens[0]?.tipo === "video") reconstruirVideo();
    }, 30_000);
    return () => window.clearInterval(iv);
  }, [apresentacao, next, reconstruirVideo]);


  // Vídeo: em TV Box o autoplay falha silenciosamente (fica no ícone de play).
  // Insiste no play, recarrega o vídeo se não avançar e, em último caso, pula o item.
  useEffect(() => {
    if (item?.tipo !== "video") return;
    let ultimoTempo = -1;
    let paradoDesde = Date.now();
    let tentativasPlay = 0;

    const tentarPlay = () => {
      const v = videoRef.current;
      if (!v) return;
      v.muted = true;
      v.play().catch(() => {});
    };

    const v0 = videoRef.current;
    if (v0) {
      try { v0.currentTime = 0; } catch { /* ignore */ }
    }
    tentarPlay();

    const iv = window.setInterval(() => {
      const v = videoRef.current;
      if (!v) return;
      tentarPlay();

      // Watchdog: o tempo do vídeo precisa avançar; se ficar travado, reage.
      // Ao dar loop, currentTime volta a ~0 — isso também é progresso.
      if (v.currentTime > ultimoTempo + 0.15 || v.currentTime < ultimoTempo - 0.15) {
        ultimoTempo = v.currentTime;
        paradoDesde = Date.now();
        tentativasPlay = 0;
        marcarAtividade();
        return;
      }

      const travadoMs = Date.now() - paradoDesde;
      if (travadoMs > 5000 && tentativasPlay < 2) {
        tentativasPlay += 1;
        tentarPlay();
      } else if (travadoMs > 12000) {
        // Não reutiliza o mesmo elemento travado: derruba e cria um player novo.
        reconstruirVideo();
      }
    }, 1500);

    return () => window.clearInterval(iv);
  }, [item, videoRecoveryKey, reconstruirVideo, marcarAtividade]);

  // Ao acordar a TV/retomar o app, continue do próprio player sem recarregar a
  // página. O evento também é disparado pelo bridge Android continuamente.
  useEffect(() => {
    const retomarVideo = () => {
      const v = videoRef.current;
      if (!v) return;
      v.muted = true;
      v.play().catch(() => {});
    };
    const aoVisibilidade = () => {
      if (document.visibilityState === "visible") retomarVideo();
    };
    document.addEventListener("visibilitychange", aoVisibilidade);
    window.addEventListener("focus", retomarVideo);
    window.addEventListener("pilar-tv-retomar-video", retomarVideo);
    return () => {
      document.removeEventListener("visibilitychange", aoVisibilidade);
      window.removeEventListener("focus", retomarVideo);
      window.removeEventListener("pilar-tv-retomar-video", retomarVideo);
    };
  }, []);

  // Primeiro gesto do usuário (ou do bridge nativo) libera o autoplay em WebViews antigas
  useEffect(() => {
    const liberar = () => {
      const v = videoRef.current;
      if (v?.paused) v.play().catch(() => {});
    };
    window.addEventListener("pointerdown", liberar, true);
    window.addEventListener("keydown", liberar, true);
    return () => {
      window.removeEventListener("pointerdown", liberar, true);
      window.removeEventListener("keydown", liberar, true);
    };
  }, []);


  const CloseBtn = () => (modoTv || getTvDeviceToken()) ? (
    <SaidaOcultaOverlay progresso={progressoSaida} />
  ) : (
    <Button
      size="icon"
      variant="ghost"
      aria-label="Fechar prévia"
      className="fixed top-3 right-3 z-[10000] h-10 w-10 rounded-full bg-black/60 text-white hover:bg-black/80"
      onClick={closePreview}
    >
      <X className="w-5 h-5" />
    </Button>
  );

  if (erro) {
    return (
      <div className="w-screen h-screen bg-black text-white flex items-center justify-center flex-col gap-3">
        <CloseBtn />
        <MonitorPlay className="w-12 h-12 opacity-50" />
        <p className="text-lg">{erro}</p>
      </div>
    );
  }

  if (carregando || !apresentacao || !item) {
    return (
      <div className="w-screen h-screen bg-black text-white flex items-center justify-center flex-col gap-4">
        <CloseBtn />
        <MonitorPlay className="w-12 h-12 opacity-60 animate-pulse" />
        <p className="text-lg">Carregando mídias… {progresso}%</p>
        <div className="w-64 h-1.5 bg-white/10 rounded-full overflow-hidden">
          <div className="h-full bg-white transition-all" style={{ width: `${progresso}%` }} />
        </div>
      </div>
    );
  }

  return (
    <div className="w-screen h-screen bg-black overflow-hidden flex items-center justify-center relative">
      <CloseBtn />
      <div
        key={item.id + idx}
        className={`w-full h-full flex items-center justify-center transition-opacity duration-300 ${visible ? "opacity-100" : "opacity-0"}`}
      >
        {item.tipo === "image" ? (
          <img src={item.url} alt={item.nome || ""} className="w-full h-full object-cover" />
        ) : (
          <video
            key={`${item.id}-${videoRecoveryKey}`}
            ref={videoRef}
            src={item.url}
            className="w-full h-full object-cover"
            autoPlay
            muted
            preload="auto"
            playsInline
            disablePictureInPicture
            controls={false}
            onLoadedMetadata={() => videoRef.current?.play().catch(() => {})}
            onCanPlay={() => videoRef.current?.play().catch(() => {})}
            onPause={() => {
              const v = videoRef.current;
              if (v && !v.ended) v.play().catch(() => {});
            }}
            loop={apresentacao.itens.length === 1}
            onEnded={() => {
              if (apresentacao.itens.length === 1 && videoRef.current) {

                try { videoRef.current.currentTime = 0; videoRef.current.play(); } catch {}
                return;
              }
              next();
            }}
            onError={() => {
              if (apresentacao.itens.length > 1) next();
              else window.setTimeout(reconstruirVideo, 1500);
            }}
          />
        )}
      </div>
      {/* Progress dots */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1">
        {apresentacao.itens.map((_, i) => (
          <span
            key={i}
            className={`h-1.5 rounded-full transition-all ${i === idx ? "w-6 bg-white" : "w-1.5 bg-white/40"}`}
          />
        ))}
      </div>
    </div>
  );
}
