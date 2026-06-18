import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Sparkles, Loader2, Upload, Camera, X, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/lib/toast-config";

interface Props {
  productName: string;
  currentPhotoUrl: string;
  selectedFile: File | null;
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onPhotoChange: (url: string) => void;
}

type RefSource = "none" | "current" | "upload";

export function ProductPhotoTab({
  productName,
  currentPhotoUrl,
  selectedFile,
  onFileSelect,
  onPhotoChange,
}: Props) {
  const [prompt, setPrompt] = useState("");
  const [refSource, setRefSource] = useState<RefSource>(currentPhotoUrl ? "current" : "none");
  const [refUploadFile, setRefUploadFile] = useState<File | null>(null);
  const [refUploadUrl, setRefUploadUrl] = useState<string>("");
  const [generating, setGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const refInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!prompt && productName) setPrompt(productName);
  }, [productName]);

  const handleRefUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Selecione um arquivo de imagem");
      return;
    }
    setRefUploadFile(file);
    setRefUploadUrl(URL.createObjectURL(file));
    setRefSource("upload");
  };

  const fileToDataUrl = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error("Descreva ou informe o nome do produto");
      return;
    }
    setGenerating(true);
    setGeneratedImage("");
    try {
      let referenceImageUrl: string | undefined;
      if (refSource === "current" && currentPhotoUrl) {
        referenceImageUrl = currentPhotoUrl;
      } else if (refSource === "upload" && refUploadFile) {
        referenceImageUrl = await fileToDataUrl(refUploadFile);
      }

      const { data, error } = await supabase.functions.invoke("generate-product-image", {
        body: { prompt, productName, referenceImageUrl },
      });
      if (error) throw error;
      if (!data?.image) throw new Error(data?.error || "Falha ao gerar imagem");
      setGeneratedImage(data.image);
      toast.success("Imagem gerada! Clique em 'Usar esta imagem' para aplicar.");
    } catch (err: any) {
      console.error(err);
      const msg = err?.message || "";
      if (msg.includes("429")) toast.error("Limite de requisições. Tente novamente em alguns segundos.");
      else if (msg.includes("402")) toast.error("Créditos insuficientes no workspace.");
      else toast.error(msg || "Erro ao gerar imagem");
    } finally {
      setGenerating(false);
    }
  };

  const handleUseGenerated = () => {
    if (!generatedImage) return;
    onPhotoChange(generatedImage);
    setGeneratedImage("");
    toast.success("Imagem aplicada ao produto");
  };

  return (
    <div className="space-y-6">
      {/* Foto atual + upload manual */}
      <div className="space-y-3">
        <h4 className="text-xs sm:text-sm font-medium text-muted-foreground border-b pb-2">Foto Atual</h4>
        <div className="flex items-start gap-4">
          <div className="w-32 h-32 rounded-lg border-2 border-dashed bg-muted/30 flex items-center justify-center overflow-hidden shrink-0">
            {currentPhotoUrl ? (
              <img src={currentPhotoUrl} alt="Foto do produto" className="w-full h-full object-cover" />
            ) : (
              <Camera className="w-8 h-8 text-muted-foreground" />
            )}
          </div>
          <div className="flex-1 space-y-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="w-4 h-4 mr-2" />
              {selectedFile || currentPhotoUrl ? "Trocar foto" : "Enviar foto"}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={onFileSelect}
              className="hidden"
            />
            {currentPhotoUrl && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onPhotoChange("")}
                className="text-destructive hover:text-destructive"
              >
                <X className="w-4 h-4 mr-2" />
                Remover
              </Button>
            )}
            <p className="text-xs text-muted-foreground">
              Envie uma foto manualmente ou gere com IA abaixo.
            </p>
          </div>
        </div>
      </div>

      {/* Geração por IA */}
      <div className="space-y-3 rounded-lg border bg-gradient-to-br from-primary/5 to-transparent p-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          <h4 className="text-sm font-medium">Gerar com IA</h4>
        </div>

        <div className="space-y-2">
          <Label className="text-xs">Descrição do produto</Label>
          <Textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Ex: Caixa de papelão kraft 30x20x15cm com tampa"
            className="min-h-[70px] text-sm"
          />
          <p className="text-[11px] text-muted-foreground">
            Inicia com o nome do produto. Ajuste para detalhar cor, formato, contexto etc.
          </p>
        </div>

        <div className="space-y-2">
          <Label className="text-xs">Imagem de referência (opcional)</Label>
          <RadioGroup value={refSource} onValueChange={(v) => setRefSource(v as RefSource)} className="gap-2">
            <div className="flex items-center gap-2">
              <RadioGroupItem value="none" id="ref-none" />
              <Label htmlFor="ref-none" className="text-xs cursor-pointer">Sem referência</Label>
            </div>
            <div className="flex items-center gap-2">
              <RadioGroupItem value="current" id="ref-current" disabled={!currentPhotoUrl} />
              <Label htmlFor="ref-current" className={`text-xs cursor-pointer ${!currentPhotoUrl ? "opacity-50" : ""}`}>
                Usar foto atual do produto
              </Label>
              {currentPhotoUrl && refSource === "current" && (
                <img src={currentPhotoUrl} alt="" className="w-8 h-8 object-cover rounded border ml-1" />
              )}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <RadioGroupItem value="upload" id="ref-upload" />
              <Label htmlFor="ref-upload" className="text-xs cursor-pointer">Enviar imagem de referência</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                onClick={() => refInputRef.current?.click()}
              >
                <Upload className="w-3 h-3 mr-1" />
                {refUploadFile ? "Trocar" : "Selecionar"}
              </Button>
              {refUploadUrl && (
                <img src={refUploadUrl} alt="" className="w-8 h-8 object-cover rounded border" />
              )}
              <input
                ref={refInputRef}
                type="file"
                accept="image/*"
                onChange={handleRefUpload}
                className="hidden"
              />
            </div>
          </RadioGroup>
        </div>

        <Button
          type="button"
          onClick={handleGenerate}
          disabled={generating || !prompt.trim()}
          className="w-full"
        >
          {generating ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Gerando...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-2" />
              Gerar imagem
            </>
          )}
        </Button>

        {generatedImage && (
          <div className="space-y-2 pt-2 border-t">
            <Label className="text-xs">Pré-visualização</Label>
            <div className="rounded-lg overflow-hidden border bg-background">
              <img src={generatedImage} alt="Gerada" className="w-full max-h-80 object-contain" />
            </div>
            <div className="flex gap-2">
              <Button type="button" size="sm" onClick={handleUseGenerated} className="flex-1">
                <Check className="w-4 h-4 mr-2" />
                Usar esta imagem
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={() => setGeneratedImage("")}>
                <X className="w-4 h-4 mr-2" />
                Descartar
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
