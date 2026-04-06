import { useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { getEstabelecimentoId, getUserIdFromAuth } from "@/lib/estabelecimentoUtils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { Camera, Upload, ArrowLeft, Loader2, X, Crop, RotateCw, ZoomIn } from "lucide-react";
import { toast } from "sonner";
import Cropper, { Area } from "react-easy-crop";

const MAX_IMAGE_SIZE = 1200;

function resizeImage(dataUrl: string, maxSize: number): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;
      if (width > maxSize || height > maxSize) {
        if (width > height) {
          height = Math.round((height * maxSize) / width);
          width = maxSize;
        } else {
          width = Math.round((width * maxSize) / height);
          height = maxSize;
        }
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL("image/jpeg", 0.8));
    };
    img.src = dataUrl;
  });
}

function getCroppedImg(imageSrc: string, pixelCrop: Area): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = pixelCrop.width;
      canvas.height = pixelCrop.height;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height, 0, 0, pixelCrop.width, pixelCrop.height);
      resolve(canvas.toDataURL("image/jpeg", 0.85));
    };
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

  const [rawImage, setRawImage] = useState<string | null>(null);
  const [finalPreview, setFinalPreview] = useState<string | null>(null);
  const [tipoObjeto, setTipoObjeto] = useState("generico");
  const [genericoDescricao, setGenericoDescricao] = useState("");
  const [quantidadeEsperada, setQuantidadeEsperada] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [analyzing, setAnalyzing] = useState(false);

  // Crop state
  const [cropDialogOpen, setCropDialogOpen] = useState(false);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  const onCropComplete = useCallback((_: Area, croppedPixels: Area) => {
    setCroppedAreaPixels(croppedPixels);
  }, []);

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      setRawImage(dataUrl);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setRotation(0);
      setCropDialogOpen(true);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleCropConfirm = async () => {
    if (!rawImage || !croppedAreaPixels) return;
    try {
      const cropped = await getCroppedImg(rawImage, croppedAreaPixels);
      const resized = await resizeImage(cropped, MAX_IMAGE_SIZE);
      setFinalPreview(resized);
      setCropDialogOpen(false);
    } catch {
      toast.error("Erro ao recortar imagem");
    }
  };

  const handleSkipCrop = async () => {
    if (!rawImage) return;
    const resized = await resizeImage(rawImage, MAX_IMAGE_SIZE);
    setFinalPreview(resized);
    setCropDialogOpen(false);
  };

  const clearImage = () => {
    setFinalPreview(null);
    setRawImage(null);
  };

  const handleAnalyze = async () => {
    if (!finalPreview) { toast.error("Selecione uma imagem primeiro"); return; }
    if (tipoObjeto === "generico" && !genericoDescricao.trim()) {
      toast.error("Informe o que deseja contar");
      return;
    }

    const estabId = await getEstabelecimentoId();
    const usuarioId = await getUserIdFromAuth();
    if (!estabId || !usuarioId) { toast.error("Usuário não identificado"); return; }

    setAnalyzing(true);
    try {
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
          tipo_objeto: tipoObjeto,
          quantidade_esperada: quantidadeEsperada ? parseInt(quantidadeEsperada) : null,
          observacoes: observacoes || null,
          status: "processando",
          imagem_url: urlData.publicUrl,
        } as any)
        .select()
        .single();
      if (createError) throw createError;

      const imageBase64 = finalPreview.split(",")[1];
      const { data: session } = await supabase.auth.getSession();

      const tipoEnvio = tipoObjeto === "generico" ? genericoDescricao.trim() : tipoObjeto;

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-image`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.session?.access_token}`,
          },
          body: JSON.stringify({ imageBase64, tipoObjeto: tipoEnvio }),
        }
      );

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Erro ao analisar imagem");
      }

      const result = await response.json();
      const qtdDetectada = result.total_detectado || 0;
      const qtdEsperada = quantidadeEsperada ? parseInt(quantidadeEsperada) : null;
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
                <Button variant="secondary" size="icon" className="h-8 w-8" onClick={() => { setCropDialogOpen(true); }}>
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
              <Label>Tipo de Objeto</Label>
              <Select value={tipoObjeto} onValueChange={setTipoObjeto}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pacotes_graficos">Pacotes Gráficos</SelectItem>
                  <SelectItem value="resma">Resmas de Papel</SelectItem>
                  <SelectItem value="caixas">Caixas</SelectItem>
                  <SelectItem value="fardos">Fardos</SelectItem>
                  <SelectItem value="generico">Genérico</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {tipoObjeto === "generico" && (
              <div>
                <Label>O que deseja contar? <span className="text-destructive">*</span></Label>
                <Input
                  placeholder="Ex: garrafas, paletes, sacolas..."
                  value={genericoDescricao}
                  onChange={e => setGenericoDescricao(e.target.value)}
                />
              </div>
            )}

            <div>
              <Label>Quantidade Esperada (opcional)</Label>
              <Input type="number" placeholder="Ex: 50" value={quantidadeEsperada} onChange={e => setQuantidadeEsperada(e.target.value)} />
            </div>
            <div>
              <Label>Observações</Label>
              <Textarea placeholder="Informações adicionais..." value={observacoes} onChange={e => setObservacoes(e.target.value)} rows={2} />
            </div>
          </div>

          <Button onClick={handleAnalyze} disabled={!finalPreview || analyzing} className="w-full gap-2" size="lg">
            {analyzing ? (<><Loader2 className="w-5 h-5 animate-spin" /> Analisando...</>) : "Analisar Imagem"}
          </Button>
        </CardContent>
      </Card>

      {/* Crop Dialog */}
      <Dialog open={cropDialogOpen} onOpenChange={setCropDialogOpen}>
        <DialogContent className="max-w-[95vw] md:max-w-2xl p-0 gap-0">
          <DialogHeader className="p-4 pb-2">
            <DialogTitle className="flex items-center gap-2">
              <Crop className="w-5 h-5" /> Recortar Imagem
            </DialogTitle>
          </DialogHeader>
          {tipoObjeto === "resma" && (
            <div className="px-4 pb-2">
              <p className="text-sm text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
                📐 <strong>Modo Resma:</strong> Selecione uma faixa vertical fina que cruze todas as resmas empilhadas de cima a baixo. Isso melhora a precisão da contagem.
              </p>
            </div>
          )}
          <div className="relative w-full h-[50vh] md:h-[60vh] bg-black">
            {rawImage && (
              <Cropper
                image={rawImage}
                crop={crop}
                zoom={zoom}
                rotation={rotation}
                aspect={tipoObjeto === "resma" ? 1 / 5 : undefined}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onRotationChange={setRotation}
                onCropComplete={onCropComplete}
              />
            )}
          </div>
          <div className="p-4 space-y-3">
            <div className="flex items-center gap-3">
              <ZoomIn className="w-4 h-4 text-muted-foreground shrink-0" />
              <Slider value={[zoom]} onValueChange={([v]) => setZoom(v)} min={1} max={3} step={0.1} className="flex-1" />
              <span className="text-xs text-muted-foreground w-10 text-right">{zoom.toFixed(1)}x</span>
            </div>
            <div className="flex items-center gap-3">
              <RotateCw className="w-4 h-4 text-muted-foreground shrink-0" />
              <Slider value={[rotation]} onValueChange={([v]) => setRotation(v)} min={0} max={360} step={1} className="flex-1" />
              <span className="text-xs text-muted-foreground w-10 text-right">{rotation}°</span>
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
