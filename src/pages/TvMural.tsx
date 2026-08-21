import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { callTvDeviceFunction, getTvDeviceToken } from "@/lib/tvDeviceClient";
import { useTvMode } from "@/lib/tvMode";
import { useKioskMode } from "@/lib/tv/kioskMode";

import { notificarFimDoConteudo } from "@/lib/tv/cicloConteudo";
import { useTvWatchdog } from "@/lib/tv/watchdogRede";
import { TvWatchdogAviso } from "@/components/tv/TvWatchdogAviso";

/** Modo de exibição da mídia na tela da TV. */
export type MuralAjuste = "esticar" | "conter" | "preencher";

export const AJUSTES_MURAL = [
  { value: "esticar", label: "Esticar (ocupa a tela toda, pode deformar)" },
  { value: "conter", label: "Conter (mostra tudo, pode ter bordas)" },
  { value: "preencher", label: "Preencher (sem bordas, pode cortar)" },
] as const;

/** Classe de object-fit correspondente ao modo escolhido (padrão: esticar). */
export function classeAjuste(ajuste?: MuralAjuste) {
  switch (ajuste) {
    case "conter": return "object-contain";
    case "preencher": return "object-cover";
    default: return "object-fill";
  }
}

export interface MuralItem {
  id: string;
  tipo: "image" | "video";
  url: string;
  nome?: string;
  duracao?: number;
  legenda?: string;
  /** Modo de exibição desta mídia. Padrão "esticar" para não cortar textos. */
  ajuste?: MuralAjuste;
}


export interface Mural {
  id: string;
  nome: string;
  itens: MuralItem[];
  duracao_padrao_imagem: number;
  transicao: string;
  transicao_ms: number;
  loop: boolean;
  embaralhar: boolean;
  ativo: boolean;
}

/** Transições cinematográficas disponíveis. */
export const TRANSICOES_MURAL = [
  { value: "cinematic_fade", label: "Fade cinematográfico" },
  { value: "ken_burns", label: "Ken Burns (zoom lento)" },
  { value: "zoom_blur", label: "Zoom com desfoque" },
  { value: "slide_cine", label: "Deslize panorâmico" },
  { value: "wipe_cine", label: "Cortina (wipe)" },
  { value: "flash", label: "Corte com flash" },
  { value: "aleatoria", label: "Aleatória" },
] as const;

const TRANSICOES_SORTEAVEIS = ["cinematic_fade", "ken_burns", "zoom_blur", "slide_cine", "wipe_cine", "flash"];

function classeEntrada(t: string) {
  switch (t) {
    case "ken_burns": return "mural-in-kenburns";
    case "zoom_blur": return "mural-in-zoomblur";
    case "slide_cine": return "mural-in-slide";
    case "wipe_cine": return "mural-in-wipe";
    case "flash": return "mural-in-flash";
    default: return "mural-in-fade";
  }
}
function classeSaida(t: string) {
  switch (t) {
    case "slide_cine": return "mural-out-slide";
    case "zoom_blur": return "mural-out-zoomblur";
    default: return "mural-out-fade";
  }
}

function embaralharArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function TvMural() {
  const [params] = useSearchParams();
  const id = params.get("id");
  const modoTv = useTvMode();
  useKioskMode(modoTv, { pausaFalhaSegundos: 60 });

  const [mural, setMural] = useState<Mural | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [indice, setIndice] = useState(0);
  const [anterior, setAnterior] = useState<number | null>(null);
  const [transicaoAtual, setTransicaoAtual] = useState("cinematic_fade");
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const timerRef = useRef<number | null>(null);
  const [recoveryKey, setRecoveryKey] = useState(0);

  // Watchdog: perda de rede ou ciclo travado -> reconecta e retoma
  const watchdog = useTvWatchdog({
    segundosSemProgresso: 300,
    segundosSemRede: 20,
    aoRecuperar: () => {
      setAnterior(null);
      setRecoveryKey((k) => k + 1);
      setIndice((i) => i + 1);
    },
  });

  // ---- Carregamento ----
  useEffect(() => {
    if (!id) { setErro("Informe ?id=<mural>"); setCarregando(false); return; }
    let cancelado = false;
    const carregar = async () => {
      setCarregando(true);
      setErro(null);
      let data: any = null;
      const tvToken = getTvDeviceToken();
      try {
        if (tvToken) {
          const resp = await callTvDeviceFunction<{ mural: any }>(`tv-mural?id=${encodeURIComponent(id)}`, tvToken);
          data = resp?.mural ?? null;
        } else {
          const res = await supabase
            .from("tv_murais")
            .select("id,nome,itens,duracao_padrao_imagem,transicao,transicao_ms,loop,embaralhar,ativo")
            .eq("id", id)
            .maybeSingle();
          data = res.data;
        }
      } catch (e: any) {
        if (!cancelado) { setErro(e?.message || "Falha ao carregar mural"); setCarregando(false); }
        return;
      }
      if (cancelado) return;
      if (!data) { setErro("Mural não encontrado"); setCarregando(false); return; }
      const itensBrutos: MuralItem[] = Array.isArray(data.itens) ? data.itens.filter((i: any) => i?.url) : [];
      if (!data.ativo) { setErro("Mural está inativo"); setCarregando(false); return; }
      if (itensBrutos.length === 0) { setErro("Sem mídias cadastradas"); setCarregando(false); return; }
      setMural({ ...data, itens: data.embaralhar ? embaralharArray(itensBrutos) : itensBrutos });
      setIndice(0);
      setAnterior(null);
      setCarregando(false);
    };
    carregar();
    const recarregar = window.setInterval(carregar, 10 * 60 * 1000);
    return () => { cancelado = true; window.clearInterval(recarregar); };
  }, [id]);

  const itens = mural?.itens ?? [];
  const atual = itens[indice];
  const itemAnterior = anterior != null ? itens[anterior] : null;
  const duracaoTransicao = Math.max(200, mural?.transicao_ms ?? 1200);

  const avancar = useCallback(() => {
    if (!mural || itens.length === 0) return;
    const proximo = indice + 1;
    // Ciclo completo do mural: avisa a playlist que hospeda esta tela
    if (proximo >= itens.length) notificarFimDoConteudo("mural");
    if (proximo >= itens.length && !mural.loop) return;
    const escolhida = mural.transicao === "aleatoria"
      ? TRANSICOES_SORTEAVEIS[Math.floor(Math.random() * TRANSICOES_SORTEAVEIS.length)]
      : mural.transicao;
    setTransicaoAtual(escolhida);
    setAnterior(indice);
    setIndice(proximo % itens.length);
  }, [mural, itens.length, indice]);

  // Sinaliza progresso do ciclo ao watchdog
  useEffect(() => { watchdog.marcarProgresso(); }, [indice, watchdog.marcarProgresso]);

  // Remove a camada anterior quando a transição termina
  useEffect(() => {
    if (anterior == null) return;
    const t = window.setTimeout(() => setAnterior(null), duracaoTransicao + 120);
    return () => window.clearTimeout(t);
  }, [anterior, duracaoTransicao]);

  // Agenda a troca (imagens por tempo; vídeos pelo fim da reprodução)
  useEffect(() => {
    if (!atual) return;
    if (timerRef.current) window.clearTimeout(timerRef.current);
    if (atual.tipo === "image") {
      const seg = Math.max(2, atual.duracao || mural?.duracao_padrao_imagem || 8);
      timerRef.current = window.setTimeout(avancar, seg * 1000);
    }
    return () => { if (timerRef.current) window.clearTimeout(timerRef.current); };
  }, [atual, indice, avancar, mural?.duracao_padrao_imagem]);

  // Vídeo travado: avança por segurança
  useEffect(() => {
    if (!atual || atual.tipo !== "video") return;
    const limite = window.setTimeout(() => avancar(), 15 * 60 * 1000);
    return () => window.clearTimeout(limite);
  }, [atual, indice, avancar]);

  const estiloDuracao = useMemo(
    () => ({ ["--mural-dur" as any]: `${duracaoTransicao}ms` }) as React.CSSProperties,
    [duracaoTransicao],
  );

  if (carregando) {
    // Sem spinner: tela preta neutra para uma transição fluida entre conteúdos.
    return <div className="fixed inset-0 bg-black" />;
  }

  if (erro) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center p-8 text-center">
        <p className="text-white/80 text-xl">{erro}</p>
      </div>
    );
  }

  const renderMidia = (item: MuralItem, camada: "atual" | "anterior") => (
    <div
      key={`${camada}-${item.id}-${indice}-${recoveryKey}`}
      className={`absolute inset-0 ${camada === "atual" ? classeEntrada(transicaoAtual) : classeSaida(transicaoAtual)}`}
      style={estiloDuracao}
    >
      {item.tipo === "video" ? (
        <video
          ref={camada === "atual" ? videoRef : undefined}
          src={item.url}
          /* object-fill: estica para ocupar 100% da tela, sem bordas pretas e sem cortes */
          className="absolute inset-0 w-full h-full object-fill bg-black"
          autoPlay
          muted
          playsInline
          onEnded={camada === "atual" ? avancar : undefined}
          onError={camada === "atual" ? avancar : undefined}
        />
      ) : (
        <img
          src={item.url}
          alt={item.legenda || item.nome || "Mídia do mural"}
          className="absolute inset-0 w-full h-full object-fill bg-black"
        />
      )}

      {camada === "atual" && item.legenda && (
        <div className="absolute bottom-0 inset-x-0 p-[3vh] bg-gradient-to-t from-black/80 to-transparent">
          <p className="text-white text-[3vh] font-semibold drop-shadow-lg">{item.legenda}</p>
        </div>
      )}
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black overflow-hidden">
      {itemAnterior && renderMidia(itemAnterior, "anterior")}
      {atual && renderMidia(atual, "atual")}
      <TvWatchdogAviso mensagem={watchdog.mensagem} online={watchdog.online} />
    </div>
  );
}
