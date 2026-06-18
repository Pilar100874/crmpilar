import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Sparkles, Loader2, Upload, Camera, X, Star, StarOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/lib/toast-config";
import { normalizeImageToSquare, dataUrlToFile } from "@/lib/imageNormalize";
import { cn } from "@/lib/utils";

export interface ProductImage {
  id?: string;            // id do registro em produto_imagens (apenas para já salvas)
  url: string;            // URL pública ou blob URL para preview
  storage_path?: string;  // path no storage (para já salvas)
  file?: File;            // arquivo a ser enviado (apenas para novas)
  is_principal: boolean;
  ordem: number;
}

interface Props {
  productName: string;
  images: ProductImage[];
  onChange: (images: ProductImage[]) => void;
}

type RefSource = "none" | "principal" | "upload";

export function ProductPhotoTab({ productName, images, onChange }: Props) {
  const [prompt, setPrompt] = useState("");
  const [refSource, setRefSource] = useState<RefSource>("none");
  const [refUploadFile, setRefUploadFile] = useState<File | null>(null);
  const [refUploadUrl, setRefUploadUrl] = useState<string>("");
  const [generating, setGenerating] = useState(false);
  const [processing, setProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const refInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!prompt && productName) setPrompt(productName);
  }, [productName]);

  const principal = images.find((i) => i.is_principal);

  const addImage = async (file: File) => {
    setProcessing(true);
    try {
      const normalized = await normalizeImageToSquare(file, 1024);
      const url = URL.createObjectURL(normalized);
      const next: ProductImage = {
        url,
        file: normalized,
        is_principal: images.length === 0, // primeira vira principal automaticamente
        ordem: images.length,
      };
      onChange([...images, next]);
    } catch (err: any) {
      console.error(err);
      toast.error("Erro ao processar imagem");
    } finally {
      setProcessing(false);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    for (const f of files) {
      if (!f.type.startsWith("image/")) continue;
      await addImage(f);
    }
  };

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
    try {
      let referenceImageUrl: string | undefined;
      if (refSource === "principal" && principal?.url) {
        if (principal.file) {
          referenceImageUrl = await fileToDataUrl(principal.file);
        } else {
          referenceImageUrl = principal.url;
        }
      } else if (refSource === "upload" && refUploadFile) {
        referenceImageUrl = await fileToDataUrl(refUploadFile);
      }

      const { data, error } = await supabase.functions.invoke("generate-product-image", {
        body: { prompt, productName, referenceImageUrl },
      });
      if (error) throw error;
      if (!data?.image) throw new Error(data?.error || "Falha ao gerar imagem");

      const file = dataUrlToFile(data.image, `ia-${Date.now()}.png`);
      await addImage(file);
      toast.success("Imagem gerada e adicionada à galeria");
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

  const setPrincipal = (idx: number) => {
    onChange(images.map((img, i) => ({ ...img, is_principal: i === idx })));
  };

  const removeImage = (idx: number) => {
    const wasPrincipal = images[idx].is_principal;
    let next = images.filter((_, i) => i !== idx).map((img, i) => ({ ...img, ordem: i }));
    if (wasPrincipal && next.length > 0) {
      next = next.map((img, i) => ({ ...img, is_principal: i === 0 }));
    }
    onChange(next);
  };

  return (
    <div className="space-y-6">
      {/* Galeria */}
      <div className="space-y-3">
        <div className="flex items-center justify-between border-b pb-2">
          <h4 className="text-xs sm:text-sm font-medium text-muted-foreground">
            Galeria de Fotos ({images.length})
          </h4>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={processing}
          >
            <Upload className="w-4 h-4 mr-2" />
            Adicionar foto
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleUpload}
            className="hidden"
          />
        </div>

        {images.length === 0 ? (
          <div className="rounded-lg border-2 border-dashed bg-muted/30 p-8 text-center">
            <Camera className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">
              Nenhuma foto adicionada. Envie uma foto ou gere com IA abaixo.
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Todas as imagens são padronizadas em 1024×1024 (quadrado).
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {images.map((img, idx) => (
              <div
                key={idx}
                className={cn(
                  "relative group aspect-square rounded-lg overflow-hidden border-2 bg-muted/30",
                  img.is_principal ? "border-primary ring-2 ring-primary/30" : "border-border",
                )}
              >
                <img src={img.url} alt={`Foto ${idx + 1}`} className="w-full h-full object-cover" />
                {img.is_principal && (
                  <div className="absolute top-1 left-1 bg-primary text-primary-foreground text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Star className="w-3 h-3 fill-current" />
                    Principal
                  </div>
                )}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                  {!img.is_principal && (
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={() => setPrincipal(idx)}
                      className="h-8 text-xs"
                    >
                      <Star className="w-3 h-3 mr-1" />
                      Tornar principal
                    </Button>
                  )}
                  <Button
                    type="button"
                    size="sm"
                    variant="destructive"
                    onClick={() => removeImage(idx)}
                    className="h-8 text-xs"
                  >
                    <X className="w-3 h-3 mr-1" />
                    Remover
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
        {processing && (
          <p className="text-xs text-muted-foreground flex items-center gap-2">
            <Loader2 className="w-3 h-3 animate-spin" /> Processando imagem...
          </p>
        )}
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
          <RadioGroup
            value={refSource}
            onValueChange={(v) => setRefSource(v as RefSource)}
            className="gap-2"
          >
            <div className="flex items-center gap-2">
              <RadioGroupItem value="none" id="ref-none" />
              <Label htmlFor="ref-none" className="text-xs cursor-pointer">Sem referência</Label>
            </div>
            <div className="flex items-center gap-2">
              <RadioGroupItem value="principal" id="ref-principal" disabled={!principal} />
              <Label
                htmlFor="ref-principal"
                className={cn("text-xs cursor-pointer", !principal && "opacity-50")}
              >
                Usar foto principal do produto
              </Label>
              {principal && refSource === "principal" && (
                <img src={principal.url} alt="" className="w-8 h-8 object-cover rounded border ml-1" />
              )}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <RadioGroupItem value="upload" id="ref-upload" />
              <Label htmlFor="ref-upload" className="text-xs cursor-pointer">
                Enviar imagem de referência
              </Label>
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
        <p className="text-[11px] text-muted-foreground text-center">
          A imagem gerada é adicionada automaticamente à galeria.
        </p>
      </div>
    </div>
  );
}
