import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Eye, EyeOff, Maximize2, ShieldCheck } from "lucide-react";
import { sanitizarHtmlArtefato, SANDBOX_PREVIEW } from "@/lib/aip/sanitizarHtml";
import { MediaPlayerInline } from "./MediaPlayerInline";

export type TipoPreview = "imagem" | "video" | "audio" | "html" | "json" | "texto" | "pdf" | "outro";

/** Descobre o tipo de pré-visualização pelo nome do arquivo (ou mime). */
export function detectarTipoPreview(nome: string, mime?: string | null): TipoPreview {
  const m = (mime ?? "").toLowerCase();
  if (m.startsWith("image/")) return "imagem";
  if (m.startsWith("video/")) return "video";
  if (m.startsWith("audio/")) return "audio";
  if (m === "application/pdf") return "pdf";

  const ext = (nome.split(".").pop() ?? "").toLowerCase();
  if (["png", "jpg", "jpeg", "gif", "webp", "svg", "bmp", "avif"].includes(ext)) return "imagem";
  if (["mp4", "webm", "mov", "mkv"].includes(ext)) return "video";
  if (["mp3", "wav", "ogg", "m4a"].includes(ext)) return "audio";
  if (["html", "htm"].includes(ext)) return "html";
  if (ext === "json") return "json";
  if (["txt", "log", "md", "csv", "yaml", "yml", "xml", "js", "ts", "py", "sh", "css"].includes(ext))
    return "texto";
  if (ext === "pdf") return "pdf";
  return "outro";
}

const LIMITE_TEXTO = 200_000; // ~200 KB de texto exibido inline

interface Props {
  nome: string;
  url?: string | null;
  mime?: string | null;
  /** Abre o preview já expandido (usado para imagens/thumbnails). */
  padraoAberto?: boolean;
  /** Abre o artefato em tela cheia (modal com navegação). */
  onTelaCheia?: () => void;
}

/**
 * Mostra o conteúdo do artefato direto no painel: miniatura de imagem,
 * player de vídeo/áudio, HTML em sandbox e texto/JSON formatado.
 */
export function ArtefatoPreview({ nome, url, mime, padraoAberto, onTelaCheia }: Props) {
  const tipo = detectarTipoPreview(nome, mime);
  const previsivel = tipo !== "outro";
  const [aberto, setAberto] = useState(!!padraoAberto && previsivel);
  const [texto, setTexto] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const precisaBaixar = tipo === "html" || tipo === "json" || tipo === "texto";

  useEffect(() => {
    if (!aberto || !url || !precisaBaixar || texto !== null || carregando) return;
    let cancelado = false;
    setCarregando(true);
    fetch(url)
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const t = await r.text();
        if (!cancelado) setTexto(t.slice(0, LIMITE_TEXTO));
      })
      .catch((e) => !cancelado && setErro(e?.message ?? "Falha ao carregar"))
      .finally(() => !cancelado && setCarregando(false));
    return () => {
      cancelado = true;
    };
  }, [aberto, url, precisaBaixar, texto, carregando]);

  if (!url) return null;
  if (!previsivel) {
    return onTelaCheia ? (
      <Button type="button" size="sm" variant="ghost" className="h-7 gap-1 px-2 text-xs" onClick={onTelaCheia}>
        <Maximize2 className="h-3.5 w-3.5" /> Tela cheia
      </Button>
    ) : null;
  }

  const formatado = (() => {
    if (tipo !== "json" || !texto) return texto;
    try {
      return JSON.stringify(JSON.parse(texto), null, 2);
    } catch {
      return texto;
    }
  })();

  const seguro = tipo === "html" && texto ? sanitizarHtmlArtefato(texto) : null;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-1">
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-7 gap-1 px-2 text-xs"
          onClick={() => setAberto((v) => !v)}
        >
          {aberto ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
          {aberto ? "Ocultar" : "Ver aqui"}
        </Button>
        {onTelaCheia && (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-7 gap-1 px-2 text-xs"
            onClick={onTelaCheia}
          >
            <Maximize2 className="h-3.5 w-3.5" /> Tela cheia
          </Button>
        )}
      </div>

      {aberto && (
        <div className="overflow-hidden rounded-md border bg-background">
          {tipo === "imagem" && (
            <img src={url} alt={nome} loading="lazy" className="max-h-80 w-full object-contain" />
          )}
          {tipo === "video" && <MediaPlayerInline tipo="video" url={url} nome={nome} />}
          {tipo === "audio" && <MediaPlayerInline tipo="audio" url={url} nome={nome} />}
          {tipo === "pdf" && <iframe src={url} title={nome} className="h-80 w-full" />}
          {tipo === "html" && (
            <div>
              <div className="flex items-center gap-1 border-b px-2 py-1 text-[11px] text-muted-foreground">
                <ShieldCheck className="h-3 w-3 text-primary" />
                HTML sanitizado e isolado (sem scripts)
                {!!seguro?.removidos && (
                  <Badge variant="outline" className="ml-1 h-4 px-1 text-[10px]">
                    {seguro.removidos} item(ns) bloqueado(s)
                  </Badge>
                )}
              </div>
              <iframe
                title={nome}
                sandbox={SANDBOX_PREVIEW}
                referrerPolicy="no-referrer"
                srcDoc={seguro?.html ?? ""}
                className="h-80 w-full bg-white"
              />
            </div>
          )}
          {(tipo === "json" || tipo === "texto") && (
            <pre className="max-h-80 overflow-auto whitespace-pre-wrap break-words p-2 text-[11px] leading-relaxed">
              {formatado ?? ""}
            </pre>
          )}
          {carregando && (
            <div className="flex items-center gap-2 p-3 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Carregando pré-visualização…
            </div>
          )}
          {erro && (
            <div className="p-3 text-xs text-destructive">
              Não foi possível pré-visualizar: {erro}
            </div>
          )}
          {texto && texto.length >= LIMITE_TEXTO && (
            <div className="border-t p-2">
              <Badge variant="outline">Prévia truncada — baixe para ver tudo</Badge>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
