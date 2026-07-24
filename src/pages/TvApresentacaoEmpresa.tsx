import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
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
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const id = params.get("id");
  const rotateMs = parseInt(params.get("rotate") || "0"); // rotate through multiple presentations (comma-sep in ids?)
  useFullscreen(true);

  const closePreview = useCallback(() => {
    try { window.close(); } catch {}
    navigate(-1);
  }, [navigate]);

  const [apresentacao, setApresentacao] = useState<Apresentacao | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [idx, setIdx] = useState(0);
  const [visible, setVisible] = useState(true);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const [carregando, setCarregando] = useState(true);
  const [progresso, setProgresso] = useState(0);

  const preloadItem = (it: ApresentacaoItem): Promise<void> =>
    new Promise((resolve) => {
      if (!it?.url) return resolve();
      if (it.tipo === "image") {
        const img = new Image();
        img.onload = () => resolve();
        img.onerror = () => resolve();
        img.src = it.url;
      } else {
        const v = document.createElement("video");
        v.preload = "auto";
        v.muted = true;
        v.playsInline = true;
        v.crossOrigin = "anonymous";
        const done = () => resolve();
        v.oncanplaythrough = done;
        v.onloadeddata = done;
        v.onerror = done;
        v.src = it.url;
        try { v.load(); } catch {}
        // Fallback timeout: don't block forever on slow videos
        setTimeout(done, 15000);
      }
    });

  useEffect(() => {
    if (!id) { setErro("Informe ?id=<apresentacao>"); return; }
    (async () => {
      setCarregando(true);
      setProgresso(0);
      const { data, error } = await supabase
        .from("apresentacoes_empresa")
        .select("id,nome,itens,duracao_padrao_imagem,transicao,ativo")
        .eq("id", id)
        .maybeSingle();
      if (error || !data) { setErro("Apresentação não encontrada"); return; }
      const a: Apresentacao = {
        ...(data as any),
        itens: Array.isArray((data as any).itens) ? (data as any).itens : [],
      };
      if (!a.ativo) { setErro("Apresentação está inativa"); return; }
      if (a.itens.length === 0) { setErro("Sem mídias cadastradas"); return; }

      // Pré-carrega todas as mídias antes de iniciar
      let feitos = 0;
      await Promise.all(
        a.itens.map((it) =>
          preloadItem(it).then(() => {
            feitos += 1;
            setProgresso(Math.round((feitos / a.itens.length) * 100));
          })
        )
      );

      setApresentacao(a);
      setIdx(0);
      setCarregando(false);
    })();
  }, [id]);

  const item = useMemo(() => apresentacao?.itens[idx] || null, [apresentacao, idx]);

  const next = useCallback(() => {
    if (!apresentacao) return;
    setVisible(false);
    setTimeout(() => {
      setIdx((i) => (i + 1) % apresentacao.itens.length);
      setVisible(true);
    }, 300);
  }, [apresentacao]);

  // Timer for images (videos advance on 'ended')
  useEffect(() => {
    if (!apresentacao || !item) return;
    if (item.tipo === "image") {
      const dur = (item.duracao ?? apresentacao.duracao_padrao_imagem) * 1000;
      const t = setTimeout(next, dur);
      return () => clearTimeout(t);
    }
  }, [apresentacao, item, next]);

  useEffect(() => {
    if (item?.tipo === "video" && videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play().catch(() => {});
    }
  }, [item]);

  if (erro) {
    return (
      <div className="w-screen h-screen bg-black text-white flex items-center justify-center flex-col gap-3">
        <MonitorPlay className="w-12 h-12 opacity-50" />
        <p className="text-lg">{erro}</p>
      </div>
    );
  }

  if (carregando || !apresentacao || !item) {
    return (
      <div className="w-screen h-screen bg-black text-white flex items-center justify-center flex-col gap-4">
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
      <div
        key={item.id + idx}
        className={`w-full h-full flex items-center justify-center transition-opacity duration-300 ${visible ? "opacity-100" : "opacity-0"}`}
      >
        {item.tipo === "image" ? (
          <img src={item.url} alt={item.nome || ""} className="w-full h-full object-cover" />
        ) : (
          <video
            ref={videoRef}
            src={item.url}
            className="w-full h-full object-cover"
            autoPlay
            muted
            playsInline
            onEnded={next}
            onError={next}
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
