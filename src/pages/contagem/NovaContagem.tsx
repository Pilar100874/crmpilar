import { useState, useRef, useCallback, type SyntheticEvent } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { getEstabelecimentoId, getUserIdFromAuth } from "@/lib/estabelecimentoUtils";
import { analyzeContagemImage, resizeContagemImage } from "@/lib/contagemAnalysis";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Camera, Upload, ArrowLeft, Loader2, X, Crop } from "lucide-react";
import { toast } from "sonner";
import ReactCrop, { type PercentCrop, type PixelCrop, centerCrop, makeAspectCrop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";

function createCenteredCrop(mediaWidth: number, mediaHeight: number, aspect: number): PercentCrop {
  const baseWidth = aspect < 0.75 ? 24 : aspect > 1.25 ? 82 : 55;
  return centerCrop(
    makeAspectCrop({ unit: "%", width: baseWidth }, aspect, mediaWidth, mediaHeight),
    mediaWidth,
    mediaHeight,
  );
}

function getCroppedImg(
  imageSrc: string,
  pixelCrop: PixelCrop,
  renderedWidth: number,
  renderedHeight: number,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      if (!pixelCrop.width || !pixelCrop.height || !renderedWidth || !renderedHeight) {
        reject(new Error("Selecione uma área válida para recorte"));
        return;
      }
      const scaleX = img.naturalWidth / renderedWidth;
      const scaleY = img.naturalHeight / renderedHeight;
      const cropWidth = Math.max(1, Math.round(pixelCrop.width * scaleX));
      const cropHeight = Math.max(1, Math.round(pixelCrop.height * scaleY));
      const canvas = document.createElement("canvas");
      canvas.width = cropWidth;
      canvas.height = cropHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) { reject(new Error("Não foi possível preparar o recorte")); return; }
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, pixelCrop.x * scaleX, pixelCrop.y * scaleY, pixelCrop.width * scaleX, pixelCrop.height * scaleY, 0, 0, cropWidth, cropHeight);
      resolve(canvas.toDataURL("image/jpeg", 0.9));
    };
    img.onerror = () => reject(new Error("Erro ao carregar imagem para recorte"));
    img.src = imageSrc;
  });
}

function dataURLtoFile(dataUrl: string, filename: string): File {
  const arr = dataUrl.split(",");
  const mime = arr[0].match(/:(.*?);/)![1];
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) u8arr[n] = bstr.charCodeAt(n);
  return new File([u8arr], filename, { type: mime });
}

const NovaContagem = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);

  const [rawImage, setRawImage] = useState<string | null>(null);
  const [finalPreview, setFinalPreview] = useState<string | null>(null);
  const [descricaoContagem, setDescricaoContagem] = useState("");
  const [quantidadeEsperada, setQuantidadeEsperada] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [analyzing, setAnalyzing] = useState(false);

  const [cropDialogOpen, setCropDialogOpen] = useState(false);
  const [crop, setCrop] = useState<PercentCrop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop | null>(null);
  const [cropAspect, setCropAspect] = useState<number | undefined>(undefined);

  const aspectOptions = [
    { label: "Livre", value: undefined },
    { label: "Faixa Vertical", value: 1 / 4 },
    { label: "Faixa Horizontal", value: 4 / 1 },
    { label: "Quadrado", value: 1 },
  ];

  const handleCropImageLoad = useCallback((e: SyntheticEvent<HTMLImageElement>) => {
    imageRef.current = e.currentTarget;
    if (cropAspect) {
      setCrop(createCenteredCrop(e.currentTarget.width, e.currentTarget.height, cropAspect));
    } else {
      setCrop(undefined);
    }
    setCompletedCrop(null);
  }, [cropAspect]);

  const handleAspectChange = useCallback((aspect: number | undefined) => {
    setCropAspect(aspect);
    setCompletedCrop(null);
    if (!aspect || !imageRef.current) { setCrop(undefined); return; }
    setCrop(createCenteredCrop(imageRef.current.width, imageRef.current.height, aspect));
  }, []);

  const openCropDialog = useCallback(() => {
    setCropAspect(undefined);
    setCrop(undefined);
    setCompletedCrop(null);
    setCropDialogOpen(true);
  }, []);

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setRawImage(dataUrl);
      setCropAspect(undefined);
      setCrop(undefined);
      setCompletedCrop(null);
      setCropDialogOpen(true);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleCropConfirm = async () => {
    if (!rawImage || !completedCrop || !imageRef.current) {
      toast.error("Desenhe a área do recorte antes de aplicar");
      return;
    }
    try {
      const cropped = await getCroppedImg(rawImage, completedCrop, imageRef.current.width, imageRef.current.height);
      const resized = await resizeContagemImage(cropped);
      setFinalPreview(resized);
      setCropDialogOpen(false);
    } catch {
      toast.error("Erro ao recortar imagem");
    }
  };

  const handleSkipCrop = async () => {
    if (!rawImage) return;
    try {
      const resized = await resizeContagemImage(rawImage);
      setFinalPreview(resized);
      setCropDialogOpen(false);
    } catch {
      toast.error("Erro ao preparar imagem");
    }
  };

  const clearImage = () => {
    setFinalPreview(null);
    setRawImage(null);
    setCrop(undefined);
    setCompletedCrop(null);
    setCropAspect(undefined);
  };

  const handleAnalyze = async () => {
    if (!finalPreview) { toast.error("Selecione uma imagem primeiro"); return; }
    if (!descricaoContagem.trim()) {
      toast.error("Descreva o que deseja contar");
      return;
    }

    const estabId = await getEstabelecimentoId();
    const usuarioId = await getUserIdFromAuth();
    if (!estabId || !usuarioId) { toast.error("Usuário não identificado"); return; }

    setAnalyzing(true);
    try {
      const qtdEsperada = quantidadeEsperada ? Number.parseInt(quantidadeEsperada, 10) : null;
      const imageFile = dataURLtoFile(finalPreview, `contagem_${Date.now()}.jpg`);
      const fileName = `${estabId}/${Date.now()}_contagem.jpg`;
      const { error: uploadError } = await supabase.storage.from("contagens-images").upload(fileName, imageFile);
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from("contagens-images").getPublicUrl(fileName);

      const { data: contagem, error: createError } = await supabase
        .from("contagens")
        .insert({
          usuario_id: usuarioId,
          estabelecimento_id: estabId,
          tipo_objeto: descricaoContagem.trim(),
          quantidade_esperada: qtdEsperada,
          observacoes: observacoes || null,
          status: "processando",
          imagem_url: urlData.publicUrl,
        } as any)
        .select()
        .single();
      if (createError) throw createError;

      const result = await analyzeContagemImage({
        imageDataUrl: finalPreview,
        tipoObjeto: descricaoContagem.trim(),
        quantidadeEsperada: qtdEsperada,
        observacoes,
      });

      const qtdDetectada = result.total_detectado || 0;
      const divergencia = qtdEsperada !== null && qtdEsperada !== qtdDetectada;

      await supabase
        .from("contagens")
        .update({
          quantidade_detectada: qtdDetectada,
          confianca_media: result.confianca_media ? Math.round(result.confianca_media * 100) : null,
          bounding_boxes: result.deteccoes || [],
          status: "concluido",
          divergencia,
          data_analise: new Date().toISOString(),
        } as any)
        .eq("id", (contagem as any).id);

      toast.success(`${qtdDetectada} objeto(s) detectado(s)!`);
      navigate(`/contagem/resultado/${(contagem as any).id}`);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Erro ao processar imagem");
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/contagem")}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-xl font-bold">Nova Contagem</h1>
      </div>

      <Card>
        <CardContent className="p-4 space-y-4">
          {finalPreview ? (
            <div className="relative">
              <img src={finalPreview} alt="Preview" className="w-full rounded-xl max-h-[400px] object-contain bg-muted" />
              <div className="absolute top-2 right-2 flex gap-1">
                <Button variant="secondary" size="icon" className="h-8 w-8" onClick={openCropDialog}>
                  <Crop className="w-4 h-4" />
                </Button>
                <Button variant="destructive" size="icon" className="h-8 w-8" onClick={clearImage}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => cameraInputRef.current?.click()}
                className="flex flex-col items-center justify-center gap-3 p-8 rounded-xl border-2 border-dashed border-primary/30 hover:border-primary/60 hover:bg-primary/5 transition-all"
              >
                <Camera className="w-10 h-10 text-primary" />
                <span className="text-sm font-medium">Tirar Foto</span>
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex flex-col items-center justify-center gap-3 p-8 rounded-xl border-2 border-dashed border-muted-foreground/30 hover:border-muted-foreground/60 hover:bg-muted/50 transition-all"
              >
                <Upload className="w-10 h-10 text-muted-foreground" />
                <span className="text-sm font-medium">Enviar Foto</span>
              </button>
            </div>
          )}

          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />
          <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleImageSelect} />

          <div className="space-y-3">
            <div>
              <Label>O que deseja contar? <span className="text-destructive">*</span></Label>
              <Input
                placeholder="Ex: caixas de papelão, resmas de papel, garrafas, fardos..."
                value={descricaoContagem}
                onChange={e => setDescricaoContagem(e.target.value)}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Descreva exatamente o que contar. Pallets, estrados, fitas e embalagens serão ignorados automaticamente.
              </p>
            </div>

            <div>
              <Label>Quantidade Esperada (opcional)</Label>
              <Input type="number" placeholder="Ex: 50" value={quantidadeEsperada} onChange={e => setQuantidadeEsperada(e.target.value)} />
            </div>
            <div>
              <Label>Observações</Label>
              <Textarea placeholder="Informações adicionais..." value={observacoes} onChange={e => setObservacoes(e.target.value)} rows={2} />
            </div>
          </div>

          <Button onClick={handleAnalyze} disabled={!finalPreview || analyzing || !descricaoContagem.trim()} className="w-full gap-2" size="lg">
            {analyzing ? (<><Loader2 className="w-5 h-5 animate-spin" /> Analisando...</>) : "Analisar Imagem"}
          </Button>
        </CardContent>
      </Card>

      <Dialog open={cropDialogOpen} onOpenChange={setCropDialogOpen}>
        <DialogContent className="max-w-[95vw] md:max-w-2xl p-0 gap-0">
          <DialogHeader className="p-4 pb-2">
            <DialogTitle className="flex items-center gap-2">
              <Crop className="w-5 h-5" /> Recortar Imagem
            </DialogTitle>
          </DialogHeader>
          <div className="px-4 pb-2">
            <p className="text-sm text-muted-foreground">
              Clique e arraste sobre a imagem para desenhar a área do recorte.
            </p>
          </div>
          <div className="flex items-center justify-center w-full min-h-[50vh] md:min-h-[60vh] bg-black px-3 py-3 overflow-auto">
            {rawImage && (
              <ReactCrop
                crop={crop}
                onChange={(_, percentCrop) => setCrop(percentCrop)}
                onComplete={(pixelCrop) => setCompletedCrop(pixelCrop)}
                aspect={cropAspect}
                keepSelection
                ruleOfThirds
                minWidth={40}
                minHeight={40}
              >
                <img
                  ref={imageRef}
                  src={rawImage}
                  alt="Imagem para recorte"
                  onLoad={handleCropImageLoad}
                  className="max-h-[50vh] md:max-h-[60vh] w-auto object-contain"
                />
              </ReactCrop>
            )}
          </div>
          <div className="p-4 space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-muted-foreground font-medium">Formato:</span>
              {aspectOptions.map((opt) => (
                <Button
                  key={opt.label}
                  size="sm"
                  variant={cropAspect === opt.value ? "default" : "outline"}
                  className="text-xs h-7 px-2"
                  onClick={() => handleAspectChange(opt.value)}
                >
                  {opt.label}
                </Button>
              ))}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={handleSkipCrop}>
                Usar Original
              </Button>
              <Button className="flex-1" onClick={handleCropConfirm}>
                Aplicar Recorte
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default NovaContagem;
