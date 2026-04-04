import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Download, Camera, CheckCircle, AlertTriangle, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

interface Detection {
  id: number;
  label: string;
  confianca: number;
  bbox: { x: number; y: number; width: number; height: number };
}

interface Contagem {
  id: string;
  tipo_objeto: string;
  quantidade_detectada: number;
  quantidade_esperada: number | null;
  confianca_media: number | null;
  observacoes: string | null;
  status: string;
  imagem_url: string | null;
  bounding_boxes: Detection[];
  divergencia: boolean;
  data_analise: string | null;
  created_at: string;
}

const tipoLabel: Record<string, string> = {
  pacotes_graficos: "Pacotes Gráficos",
  caixas: "Caixas",
  fardos: "Fardos",
  generico: "Genérico",
};

const COLORS = [
  "#22c55e", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6",
  "#ec4899", "#14b8a6", "#f97316", "#06b6d4", "#84cc16",
];

const ResultadoContagem = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [contagem, setContagem] = useState<Contagem | null>(null);
  const [loading, setLoading] = useState(true);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [canvasReady, setCanvasReady] = useState(false);

  useEffect(() => {
    if (id) loadContagem();
  }, [id]);

  const loadContagem = async () => {
    const { data } = await supabase
      .from("contagens")
      .select("*")
      .eq("id", id)
      .single();
    setContagem(data as any);
    setLoading(false);
  };

  useEffect(() => {
    if (!contagem?.imagem_url || !canvasRef.current || !containerRef.current) return;

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = canvasRef.current!;
      const container = containerRef.current!;
      const containerWidth = container.clientWidth;

      // Scale canvas to fit container width
      const scale = containerWidth / img.naturalWidth;
      const displayWidth = containerWidth;
      const displayHeight = img.naturalHeight * scale;

      canvas.width = displayWidth;
      canvas.height = displayHeight;
      canvas.style.width = `${displayWidth}px`;
      canvas.style.height = `${displayHeight}px`;

      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, displayWidth, displayHeight);

      // Draw bounding boxes with numbers
      const boxes: Detection[] = (contagem.bounding_boxes as any) || [];
      const fontSize = Math.max(14, Math.min(20, displayWidth * 0.035));
      const lineWidth = Math.max(2, Math.min(4, displayWidth * 0.005));

      boxes.forEach((det, i) => {
        const x = (det.bbox.x / 100) * displayWidth;
        const y = (det.bbox.y / 100) * displayHeight;
        const w = (det.bbox.width / 100) * displayWidth;
        const h = (det.bbox.height / 100) * displayHeight;
        const color = COLORS[i % COLORS.length];

        // Box
        ctx.strokeStyle = color;
        ctx.lineWidth = lineWidth;
        ctx.strokeRect(x, y, w, h);

        // Number circle
        const circleR = fontSize * 0.9;
        const cx = x + circleR + 2;
        const cy = y + circleR + 2;
        ctx.beginPath();
        ctx.arc(cx, cy, circleR, 0, 2 * Math.PI);
        ctx.fillStyle = color;
        ctx.fill();
        ctx.strokeStyle = "#fff";
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Number text
        ctx.fillStyle = "#fff";
        ctx.font = `bold ${fontSize}px sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(`${i + 1}`, cx, cy);
      });

      setCanvasReady(true);
    };
    img.onerror = () => {
      console.error("Failed to load image:", contagem.imagem_url);
      setCanvasReady(true);
    };
    img.src = contagem.imagem_url;
  }, [contagem]);

  const handleDownload = () => {
    if (!canvasRef.current) return;
    const link = document.createElement("a");
    link.download = `contagem_${id}.png`;
    link.href = canvasRef.current.toDataURL();
    link.click();
    toast.success("Imagem baixada!");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!contagem) {
    return (
      <div className="p-6 text-center text-muted-foreground">Análise não encontrada</div>
    );
  }

  const boxes: Detection[] = (contagem.bounding_boxes as any) || [];

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/contagem")}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-xl font-bold">Resultado da Contagem</h1>
      </div>

      {/* Status Banner */}
      {contagem.divergencia && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-orange-500/10 border border-orange-500/20">
          <AlertTriangle className="w-5 h-5 text-orange-500 flex-shrink-0" />
          <div>
            <p className="font-medium text-orange-600 dark:text-orange-400">Divergência Detectada</p>
            <p className="text-sm text-muted-foreground">
              Esperado: {contagem.quantidade_esperada} | Detectado: {contagem.quantidade_detectada}
            </p>
          </div>
        </div>
      )}

      {!contagem.divergencia && contagem.status === "concluido" && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-green-500/10 border border-green-500/20">
          <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
          <p className="font-medium text-green-600 dark:text-green-400">Análise Concluída com Sucesso</p>
        </div>
      )}

      {/* Image with bounding boxes */}
      <Card>
        <CardContent className="p-4">
          <div ref={containerRef} className="w-full">
            {!canvasReady && (
              <div className="flex items-center justify-center h-48 bg-muted rounded-xl">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            )}
            <canvas
              ref={canvasRef}
              className={`rounded-xl ${canvasReady ? "block" : "hidden"}`}
            />
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-primary">{contagem.quantidade_detectada}</p>
            <p className="text-xs text-muted-foreground mt-1">Detectados</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold">
              {contagem.confianca_media != null ? `${contagem.confianca_media}%` : "—"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Confiança</p>
          </CardContent>
        </Card>
      </div>

      {/* Detection List */}
      {boxes.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <p className="text-sm font-medium mb-3">Itens Detectados</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-60 overflow-y-auto">
              {boxes.map((det, i) => (
                <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-muted/50 text-sm">
                  <span
                    className="flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold text-white shrink-0"
                    style={{ backgroundColor: COLORS[i % COLORS.length] }}
                  >
                    {i + 1}
                  </span>
                  <span className="truncate">{det.label}</span>
                  <span className="ml-auto text-xs text-muted-foreground">
                    {Math.round(det.confianca * 100)}%
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Details */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Tipo</span>
            <Badge variant="secondary">{tipoLabel[contagem.tipo_objeto] || contagem.tipo_objeto}</Badge>
          </div>
          {contagem.quantidade_esperada != null && (
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Quantidade Esperada</span>
              <span className="font-medium">{contagem.quantidade_esperada}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Data/Hora</span>
            <span className="text-sm">
              {format(new Date(contagem.data_analise || contagem.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
            </span>
          </div>
          {contagem.observacoes && (
            <div>
              <span className="text-sm text-muted-foreground">Observações</span>
              <p className="text-sm mt-1">{contagem.observacoes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="grid grid-cols-2 gap-3">
        <Button variant="outline" onClick={handleDownload} className="gap-2">
          <Download className="w-4 h-4" /> Baixar Imagem
        </Button>
        <Button onClick={() => navigate("/contagem/nova")} className="gap-2">
          <Camera className="w-4 h-4" /> Nova Contagem
        </Button>
      </div>
    </div>
  );
};

export default ResultadoContagem;
