import { useEffect, useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Loader2, BookOpen, Calendar, AlertCircle, Package, Download } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { loadActiveCatalogs, generateCatalogPdf, SavedCatalog } from "@/lib/catalogPdfGenerator";
import { toast } from "@/lib/toast-config";
import { WaitingMessageField } from "./WaitingMessageField";
import { MediaCaptionFields } from "./MediaCaptionFields";

const DEFAULT_WAITING_CATALOG = "⏳ Aguarde... gerando catálogo em tempo real.";

interface Props {
  selectedNode: any;
  handleConfigChange: (key: string, value: any) => void;
}

export const AttachCatalogConfig = ({ selectedNode, handleConfigChange }: Props) => {
  const config = selectedNode?.data?.config || {};
  const mode: "latest" | "specific" = config.mode || "latest";
  const selectedIds: string[] = Array.isArray(config.catalogIds) ? config.catalogIds : [];
  const caption: string = config.caption || "";

  const [catalogs, setCatalogs] = useState<SavedCatalog[]>([]);
  const [loading, setLoading] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const handleDownload = async (catalog: SavedCatalog) => {
    try {
      setDownloadingId(catalog.id);
      const result = await generateCatalogPdf(catalog);
      if (!result) {
        toast.error("Catálogo incompleto — não foi possível gerar o PDF.");
        return;
      }
      const a = document.createElement("a");
      a.href = result.url;
      a.download = result.fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(result.url), 1000);
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Erro ao gerar PDF do catálogo.");
    } finally {
      setDownloadingId(null);
    }
  };

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const list = await loadActiveCatalogs();
        setCatalogs(list);
        // Garante PDF cacheado para o bot do WhatsApp (gera em background
        // qualquer catálogo sem pdf_url ou cujo PDF esteja desatualizado).
        list.forEach((c) => {
          const stale =
            !c.pdf_url ||
            (c.pdf_generated_at &&
              new Date(c.pdf_generated_at).getTime() <
                new Date(c.updated_at).getTime());
          if (stale) {
            generateCatalogPdf(c).catch((e) =>
              console.warn("[AttachCatalogConfig] auto-gen PDF falhou:", e)
            );
          }
        });
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const toggleCatalog = (id: string, checked: boolean) => {
    const next = checked ? [...selectedIds, id] : selectedIds.filter((x) => x !== id);
    handleConfigChange("catalogIds", next);
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label className="text-xs">Como enviar o catálogo?</Label>
        <RadioGroup
          value={mode}
          onValueChange={(v) => handleConfigChange("mode", v)}
          className="space-y-2"
        >
          <div className="flex items-start gap-2 p-3 rounded-lg border border-border hover:bg-muted/40 transition-colors">
            <RadioGroupItem value="latest" id="cat-latest" className="mt-0.5" />
            <Label htmlFor="cat-latest" className="cursor-pointer flex-1 font-normal">
              <div className="text-sm font-semibold">Mais recente</div>
              <div className="text-[11px] text-muted-foreground">
                Envia sempre o catálogo ativo mais recentemente atualizado.
              </div>
            </Label>
          </div>
          <div className="flex items-start gap-2 p-3 rounded-lg border border-border hover:bg-muted/40 transition-colors">
            <RadioGroupItem value="specific" id="cat-specific" className="mt-0.5" />
            <Label htmlFor="cat-specific" className="cursor-pointer flex-1 font-normal">
              <div className="text-sm font-semibold">Catálogo(s) específico(s)</div>
              <div className="text-[11px] text-muted-foreground">
                Selecione um ou mais catálogos abaixo (somente ativos).
              </div>
            </Label>
          </div>
        </RadioGroup>
      </div>

      {mode === "specific" && (
        <div className="space-y-2">
          <Label className="text-xs">Catálogos ativos</Label>
          <ScrollArea className="h-64 rounded-lg border border-border bg-background">
            <div className="p-2 space-y-1">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : catalogs.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-xs">
                  <BookOpen className="h-6 w-6 mx-auto mb-2 opacity-50" />
                  Nenhum catálogo ativo encontrado.
                </div>
              ) : (
                catalogs.map((c) => {
                  const checked = selectedIds.includes(c.id);
                  return (
                    <label
                      key={c.id}
                      className="flex items-start gap-2 p-2 rounded-md hover:bg-muted/50 cursor-pointer"
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(v) => toggleCatalog(c.id, !!v)}
                        className="mt-0.5"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-medium truncate text-foreground">
                            {c.nome}
                          </span>
                          <Badge variant="secondary" className="text-[10px] flex-shrink-0">
                            <Package className="h-3 w-3 mr-1" />
                            {c.products_page?.products?.length || 0}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 mt-0.5 text-[10px] text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(c.updated_at), "dd/MM/yy", { locale: ptBR })}
                          </span>
                          {!c.data_indeterminada && c.data_validade && (
                            <span className="flex items-center gap-1 text-amber-600">
                              <AlertCircle className="h-3 w-3" />
                              Até {format(new Date(c.data_validade), "dd/MM/yy")}
                            </span>
                          )}
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 flex-shrink-0"
                        title="Baixar PDF deste catálogo"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleDownload(c);
                        }}
                        disabled={downloadingId === c.id}
                      >
                        {downloadingId === c.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Download className="h-3.5 w-3.5" />
                        )}
                      </Button>
                    </label>
                  );
                })
              )}
            </div>
          </ScrollArea>
          {selectedIds.length > 0 && (
            <p className="text-[11px] text-muted-foreground">
              {selectedIds.length} catálogo(s) selecionado(s).
            </p>
          )}
        </div>
      )}

      {mode === "latest" && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full"
          disabled={loading || catalogs.length === 0 || downloadingId !== null}
          onClick={() => {
            const latest = [...catalogs].sort(
              (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
            )[0];
            if (latest) handleDownload(latest);
          }}
        >
          {downloadingId ? (
            <><Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" /> Gerando PDF...</>
          ) : (
            <><Download className="w-3.5 h-3.5 mr-2" /> Baixar catálogo mais recente</>
          )}
        </Button>
      )}

      <WaitingMessageField
        enabled={config.waitingMessageEnabled !== false}
        message={config.waitingMessage || ""}
        defaultMessage={DEFAULT_WAITING_CATALOG}
        onChange={(patch) => {
          if ("waitingMessageEnabled" in patch)
            handleConfigChange("waitingMessageEnabled", patch.waitingMessageEnabled);
          if ("waitingMessage" in patch)
            handleConfigChange("waitingMessage", patch.waitingMessage);
        }}
      />

      <MediaCaptionFields
        title={config.mediaTitle || ""}
        description={config.mediaDescription || caption}
        footer={config.mediaFooter || ""}
        onChange={(patch) => {
          if ("mediaTitle" in patch) handleConfigChange("mediaTitle", patch.mediaTitle);
          if ("mediaDescription" in patch) handleConfigChange("mediaDescription", patch.mediaDescription);
          if ("mediaFooter" in patch) handleConfigChange("mediaFooter", patch.mediaFooter);
        }}
        placeholders={{ title: "Ex.: 📄 Catálogo atualizado", description: "Texto enviado junto com o PDF" }}
      />
    </div>
  );
};

export default AttachCatalogConfig;
