import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Download, Loader2, ShieldCheck } from "lucide-react";
import { detectarTipoPreview } from "@/components/ia-platform/ArtefatoPreview";
import { sanitizarHtmlArtefato, SANDBOX_PREVIEW } from "@/lib/aip/sanitizarHtml";

export interface ArtefatoLightboxItem {
  nome: string;
  url?: string | null;
  mime?: string | null;
}

interface Props {
  itens: ArtefatoLightboxItem[];
  indice: number | null;
  onIndiceChange: (i: number | null) => void;
}

/** Visualização em tela cheia dos artefatos, com navegação entre eles. */
export function ArtefatoLightbox({ itens, indice, onIndiceChange }: Props) {
  const aberto = indice !== null && indice >= 0 && indice < itens.length;
  const atual = aberto ? itens[indice!] : null;
  const [texto, setTexto] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const tipo = atual ? detectarTipoPreview(atual.nome, atual.mime) : "outro";
  const precisaBaixar = tipo === "html" || tipo === "json" || tipo === "texto";

  const irPara = (delta: number) => {
    if (indice === null || itens.length === 0) return;
    onIndiceChange((indice + delta + itens.length) % itens.length);
  };

  useEffect(() => {
    setTexto(null);
    setErro(null);
  }, [indice]);

  useEffect(() => {
    if (!aberto || !atual?.url || !precisaBaixar || texto !== null) return;
    let cancelado = false;
    setCarregando(true);
    fetch(atual.url)
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const t = await r.text();
        if (!cancelado) setTexto(t.slice(0, 500_000));
      })
      .catch((e) => !cancelado && setErro(e?.message ?? "Falha ao carregar"))
      .finally(() => !cancelado && setCarregando(false));
    return () => {
      cancelado = true;
    };
  }, [aberto, atual?.url, precisaBaixar, texto]);

  useEffect(() => {
    if (!aberto) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") irPara(1);
      if (e.key === "ArrowLeft") irPara(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

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
    <Dialog open={aberto} onOpenChange={(o) => !o && onIndiceChange(null)}>
      <DialogContent className="max-w-[95vw] h-[92vh] p-0 gap-0 flex flex-col">
        <div className="flex items-center gap-2 border-b p-3">
          <DialogTitle className="min-w-0 flex-1 truncate font-mono text-sm">
            {atual?.nome ?? ""}
          </DialogTitle>
          <Badge variant="outline">
            {(indice ?? 0) + 1} / {itens.length}
          </Badge>
          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => irPara(-1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => irPara(1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          {atual?.url && (
            <Button asChild size="sm" variant="outline" className="mr-8 h-8 gap-1">
              <a href={atual.url} target="_blank" rel="noopener noreferrer" download>
                <Download className="h-3.5 w-3.5" /> Baixar
              </a>
            </Button>
          )}
        </div>

        <div className="min-h-0 flex-1 overflow-auto bg-muted/30">
          {!atual?.url && (
            <div className="p-6 text-sm text-muted-foreground">Arquivo não disponível.</div>
          )}
          {atual?.url && tipo === "imagem" && (
            <img src={atual.url} alt={atual.nome} className="mx-auto h-full w-auto object-contain" />
          )}
          {atual?.url && tipo === "video" && (
            <video src={atual.url} controls className="mx-auto h-full w-auto" />
          )}
          {atual?.url && tipo === "audio" && <audio src={atual.url} controls className="w-full p-4" />}
          {atual?.url && tipo === "pdf" && (
            <iframe src={atual.url} title={atual.nome} className="h-full w-full" />
          )}
          {atual?.url && tipo === "html" && (
            <iframe title={atual.nome} sandbox="" srcDoc={formatado ?? ""} className="h-full w-full bg-white" />
          )}
          {atual?.url && (tipo === "json" || tipo === "texto") && (
            <pre className="whitespace-pre-wrap break-words p-4 text-xs leading-relaxed">
              {formatado ?? ""}
            </pre>
          )}
          {atual?.url && tipo === "outro" && (
            <div className="p-6 text-sm text-muted-foreground">
              Sem pré-visualização para este formato — use o botão Baixar.
            </div>
          )}
          {carregando && (
            <div className="flex items-center gap-2 p-4 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Carregando…
            </div>
          )}
          {erro && <div className="p-4 text-xs text-destructive">Não foi possível abrir: {erro}</div>}
        </div>
      </DialogContent>
    </Dialog>
  );
}
