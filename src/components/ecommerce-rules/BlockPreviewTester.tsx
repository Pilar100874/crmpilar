import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Eye, Maximize2, Minimize2, Smartphone, Monitor } from "lucide-react";
import { Slider } from "@/components/ui/slider";

interface BlockPreviewTesterProps {
  blockType: string;
  config: Record<string, any>;
  onConfigUpdate: (key: string, value: any) => void;
}

const TESTABLE_BLOCKS = [
  "acao_banner_promocional",
  "acao_popup_promocional",
  "acao_mensagem_carrinho",
];

export function isTestableBlock(type: string) {
  return TESTABLE_BLOCKS.includes(type);
}

export function BlockPreviewTester({ blockType, config, onConfigUpdate }: BlockPreviewTesterProps) {
  const [open, setOpen] = useState(false);
  const [viewport, setViewport] = useState<"desktop" | "mobile">("desktop");
  const [imageWidth, setImageWidth] = useState(config.previewImageWidth || 100);
  const [imageHeight, setImageHeight] = useState(config.previewImageHeight || 200);
  const [fontSize, setFontSize] = useState(config.previewFontSize || 16);
  const [titleSize, setTitleSize] = useState(config.previewTitleSize || 24);

  const saveLayout = () => {
    onConfigUpdate("previewImageWidth", imageWidth);
    onConfigUpdate("previewImageHeight", imageHeight);
    onConfigUpdate("previewFontSize", fontSize);
    onConfigUpdate("previewTitleSize", titleSize);
  };

  const renderBannerPreview = () => (
    <div
      className="rounded-lg overflow-hidden w-full"
      style={{ backgroundColor: config.corFundo || "#f59e0b" }}
    >
      <div className="flex flex-col items-center gap-3 p-4">
        {config.imagem && (
          <div className="w-full flex justify-center">
            <img
              src={config.imagem}
              alt="Banner"
              className="rounded-md object-cover"
              style={{
                width: `${imageWidth}%`,
                height: `${imageHeight}px`,
              }}
            />
          </div>
        )}
        {config.titulo && (
          <h2 className="font-bold text-white text-center" style={{ fontSize: `${titleSize}px` }}>
            {config.titulo}
          </h2>
        )}
        {config.link && (
          <span className="text-white/80 text-sm underline">{config.link}</span>
        )}
      </div>
    </div>
  );

  const renderPopupPreview = () => (
    <div className="bg-background border border-border rounded-xl shadow-2xl max-w-md mx-auto overflow-hidden">
      {config.imagem && (
        <div className="w-full flex justify-center bg-muted">
          <img
            src={config.imagem}
            alt="Popup"
            className="object-cover"
            style={{
              width: `${imageWidth}%`,
              height: `${imageHeight}px`,
            }}
          />
        </div>
      )}
      <div className="p-6 text-center space-y-3">
        {config.titulo && (
          <h3 className="font-bold" style={{ fontSize: `${titleSize}px` }}>
            {config.titulo}
          </h3>
        )}
        {config.mensagem && (
          <p className="text-muted-foreground" style={{ fontSize: `${fontSize}px` }}>
            {config.mensagem}
          </p>
        )}
        <Button className="w-full">
          {config.botaoTexto || "Aproveitar!"}
        </Button>
      </div>
    </div>
  );

  const renderMessagePreview = () => {
    const typeStyles: Record<string, string> = {
      info: "bg-blue-50 border-blue-200 text-blue-800",
      sucesso: "bg-green-50 border-green-200 text-green-800",
      alerta: "bg-yellow-50 border-yellow-200 text-yellow-800",
      urgencia: "bg-red-50 border-red-200 text-red-800",
    };
    const style = typeStyles[config.tipoMensagem || "info"] || typeStyles.info;
    return (
      <div className={`rounded-lg border p-4 ${style}`}>
        <p style={{ fontSize: `${fontSize}px` }}>
          {config.mensagem || "Mensagem de exemplo no carrinho"}
        </p>
      </div>
    );
  };

  const renderPreview = () => {
    switch (blockType) {
      case "acao_banner_promocional": return renderBannerPreview();
      case "acao_popup_promocional": return renderPopupPreview();
      case "acao_mensagem_carrinho": return renderMessagePreview();
      default: return <p className="text-muted-foreground text-sm">Preview não disponível</p>;
    }
  };

  const hasImage = blockType === "acao_banner_promocional" || blockType === "acao_popup_promocional";
  const hasText = true;

  return (
    <>
      <Button variant="outline" size="sm" className="w-full text-xs gap-2" onClick={() => setOpen(true)}>
        <Eye className="h-3 w-3" /> Testar / Pré-visualizar
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Pré-visualização do Bloco</span>
              <div className="flex gap-1">
                <Button
                  variant={viewport === "desktop" ? "default" : "outline"}
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setViewport("desktop")}
                >
                  <Monitor className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant={viewport === "mobile" ? "default" : "outline"}
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setViewport("mobile")}
                >
                  <Smartphone className="h-3.5 w-3.5" />
                </Button>
              </div>
            </DialogTitle>
          </DialogHeader>

          <div className="flex gap-4 flex-1 overflow-hidden">
            {/* Preview area */}
            <div className="flex-1 overflow-auto rounded-lg border bg-muted/30 p-4">
              <div
                className="mx-auto transition-all duration-300"
                style={{
                  maxWidth: viewport === "mobile" ? "375px" : "100%",
                }}
              >
                {renderPreview()}
              </div>
            </div>

            {/* Controls sidebar */}
            <div className="w-56 space-y-4 overflow-y-auto shrink-0">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase">Ajustes de Layout</h4>

              {hasImage && config.imagem && (
                <>
                  <div className="space-y-2">
                    <label className="text-xs font-medium">Largura da Imagem ({imageWidth}%)</label>
                    <Slider
                      value={[imageWidth]}
                      onValueChange={([v]) => setImageWidth(v)}
                      min={20}
                      max={100}
                      step={5}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-medium">Altura da Imagem ({imageHeight}px)</label>
                    <Slider
                      value={[imageHeight]}
                      onValueChange={([v]) => setImageHeight(v)}
                      min={50}
                      max={600}
                      step={10}
                    />
                  </div>
                </>
              )}

              {hasText && (
                <>
                  <div className="space-y-2">
                    <label className="text-xs font-medium">Título ({titleSize}px)</label>
                    <Slider
                      value={[titleSize]}
                      onValueChange={([v]) => setTitleSize(v)}
                      min={12}
                      max={48}
                      step={1}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-medium">Texto ({fontSize}px)</label>
                    <Slider
                      value={[fontSize]}
                      onValueChange={([v]) => setFontSize(v)}
                      min={10}
                      max={32}
                      step={1}
                    />
                  </div>
                </>
              )}

              <Button size="sm" className="w-full text-xs" onClick={() => { saveLayout(); setOpen(false); }}>
                Salvar Ajustes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
