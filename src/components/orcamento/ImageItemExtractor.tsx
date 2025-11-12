import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/lib/toast-config";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Camera, Upload, Loader2, X, Check, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ExtractedItem {
  quantidade: number;
  material: string;
  valor_unitario: number;
  confianca: "alta" | "media" | "baixa";
}

interface ImageItemExtractorProps {
  onItemsExtracted: (items: ExtractedItem[]) => void;
}

export default function ImageItemExtractor({ onItemsExtracted }: ImageItemExtractorProps) {
  const [loading, setLoading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [extractedItems, setExtractedItems] = useState<ExtractedItem[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const convertToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validar tipo de arquivo
    if (!file.type.startsWith('image/')) {
      toast.error("Por favor, selecione uma imagem");
      return;
    }

    // Validar tamanho (máximo 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Imagem muito grande. Máximo 10MB");
      return;
    }

    try {
      setLoading(true);
      const base64Image = await convertToBase64(file);
      setImagePreview(base64Image);

      toast.info("Processando imagem com IA...");

      const { data, error } = await supabase.functions.invoke('extract-orcamento-items', {
        body: { imageBase64: base64Image }
      });

      if (error) throw error;

      if (!data.success || !data.items || data.items.length === 0) {
        toast.error("Nenhum item foi reconhecido na imagem. Tente uma imagem mais nítida.");
        return;
      }

      setExtractedItems(data.items);
      toast.success(`${data.items.length} item(ns) reconhecido(s)! Revise e confirme.`);

    } catch (error: any) {
      console.error('Erro ao processar imagem:', error);
      toast.error(error.message || "Erro ao processar imagem");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = () => {
    if (extractedItems.length === 0) {
      toast.error("Nenhum item para adicionar");
      return;
    }
    onItemsExtracted(extractedItems);
    handleReset();
  };

  const handleReset = () => {
    setImagePreview(null);
    setExtractedItems([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const getConfiancaBadge = (confianca: string) => {
    const variants = {
      alta: "default",
      media: "secondary",
      baixa: "destructive"
    };
    const labels = {
      alta: "Alta confiança",
      media: "Média confiança",
      baixa: "Baixa confiança - revisar"
    };
    return (
      <Badge variant={variants[confianca as keyof typeof variants] as any} className="text-xs">
        {labels[confianca as keyof typeof labels]}
      </Badge>
    );
  };

  return (
    <Card className="p-4">
      <div className="space-y-4">
        <div>
          <Label className="text-sm font-medium">Reconhecimento de Texto (OCR)</Label>
          <p className="text-xs text-muted-foreground mt-1">
            Tire uma foto ou envie uma imagem do orçamento manuscrito. A IA extrairá os itens automaticamente.
          </p>
        </div>

        {!imagePreview ? (
          <div className="space-y-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
              disabled={loading}
            />
            
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={loading}
                className="w-full"
              >
                <Upload className="w-4 h-4 mr-2" />
                Enviar Foto
              </Button>
              
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  const input = fileInputRef.current;
                  if (input) {
                    input.setAttribute('capture', 'environment');
                    input.click();
                  }
                }}
                disabled={loading}
                className="w-full"
              >
                <Camera className="w-4 h-4 mr-2" />
                Tirar Foto
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Preview da imagem */}
            <div className="relative">
              <img 
                src={imagePreview} 
                alt="Preview" 
                className="w-full h-48 object-contain rounded border bg-muted"
              />
              {!loading && extractedItems.length === 0 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute top-2 right-2"
                  onClick={handleReset}
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>

            {/* Estado de carregamento */}
            {loading && (
              <div className="flex items-center justify-center py-4 space-x-2">
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
                <span className="text-sm text-muted-foreground">Analisando imagem com IA...</span>
              </div>
            )}

            {/* Itens extraídos */}
            {extractedItems.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Itens Reconhecidos</Label>
                  <Badge variant="outline" className="text-xs">
                    {extractedItems.length} item(ns)
                  </Badge>
                </div>

                <div className="space-y-2 max-h-64 overflow-y-auto border rounded-md p-3">
                  {extractedItems.map((item, idx) => (
                    <Card key={idx} className="p-3 space-y-2">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">#{idx + 1}</span>
                            {getConfiancaBadge(item.confianca)}
                          </div>
                          <p className="text-sm font-medium">{item.material}</p>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span>Qtd: <strong>{item.quantidade}</strong></span>
                            <span>Valor: <strong>R$ {item.valor_unitario.toFixed(2)}</strong></span>
                            <span>Subtotal: <strong>R$ {(item.quantidade * item.valor_unitario).toFixed(2)}</strong></span>
                          </div>
                        </div>
                      </div>
                      
                      {item.confianca === "baixa" && (
                        <div className="flex items-start gap-2 text-xs text-amber-600 bg-amber-50 dark:bg-amber-950/20 p-2 rounded">
                          <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                          <span>Revise este item - reconhecimento com baixa confiança</span>
                        </div>
                      )}
                    </Card>
                  ))}
                </div>

                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleReset}
                    className="flex-1"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Cancelar
                  </Button>
                  <Button
                    type="button"
                    onClick={handleConfirm}
                    className="flex-1"
                  >
                    <Check className="w-4 h-4 mr-2" />
                    Adicionar Itens
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
