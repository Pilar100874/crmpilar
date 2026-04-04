import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { getEstabelecimentoId, getUserIdFromAuth } from "@/lib/estabelecimentoUtils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Camera, Upload, ArrowLeft, Loader2, X } from "lucide-react";
import { toast } from "sonner";

const NovaContagem = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [tipoObjeto, setTipoObjeto] = useState("generico");
  const [quantidadeEsperada, setQuantidadeEsperada] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [analyzing, setAnalyzing] = useState(false);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const clearImage = () => {
    setImagePreview(null);
    setImageFile(null);
  };

  const fileToBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result.split(",")[1]);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const handleAnalyze = async () => {
    if (!imageFile) { toast.error("Selecione uma imagem primeiro"); return; }

    const estabId = await getEstabelecimentoId();
    const usuarioId = await getUserIdFromAuth();
    if (!estabId || !usuarioId) { toast.error("Usuário não identificado"); return; }

    setAnalyzing(true);
    try {
      const fileName = `${estabId}/${Date.now()}_${imageFile.name}`;
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

      const imageBase64 = await fileToBase64(imageFile);
      const { data: session } = await supabase.auth.getSession();

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-image`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.session?.access_token}`,
          },
          body: JSON.stringify({ imageBase64, tipoObjeto }),
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
          {imagePreview ? (
            <div className="relative">
              <img src={imagePreview} alt="Preview" className="w-full rounded-xl max-h-[400px] object-contain bg-muted" />
              <Button variant="destructive" size="icon" className="absolute top-2 right-2" onClick={clearImage}>
                <X className="w-4 h-4" />
              </Button>
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
                  <SelectItem value="caixas">Caixas</SelectItem>
                  <SelectItem value="fardos">Fardos</SelectItem>
                  <SelectItem value="generico">Genérico</SelectItem>
                </SelectContent>
              </Select>
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

          <Button onClick={handleAnalyze} disabled={!imagePreview || analyzing} className="w-full gap-2" size="lg">
            {analyzing ? (<><Loader2 className="w-5 h-5 animate-spin" /> Analisando...</>) : "Analisar Imagem"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default NovaContagem;
