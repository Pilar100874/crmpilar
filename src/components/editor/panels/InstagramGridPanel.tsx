import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "@/lib/toast-config";
import { Download, Upload, Grid, Eye, Instagram } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

// Grid layout definitions
// Each layout defines rows x cols and optionally merged cells
interface GridLayout {
  id: string;
  name: string;
  description: string;
  cols: number;
  rows: number;
  // For complex layouts, define cells as [startRow, startCol, spanRows, spanCols]
  cells?: [number, number, number, number][];
}

const GRID_LAYOUTS: GridLayout[] = [
  { id: '1x3', name: '1×3 Horizontal', description: '3 posts em linha', cols: 3, rows: 1 },
  { id: '2x3', name: '2×3 Panorama', description: '6 posts (2 linhas)', cols: 3, rows: 2 },
  { id: '3x3', name: '3×3 Mosaico', description: '9 posts (grid completo)', cols: 3, rows: 3 },
  { id: '4x3', name: '4×3 Épico', description: '12 posts (4 linhas)', cols: 3, rows: 4 },
  { id: '1x1_center', name: '1×1 Central', description: '1 post quadrado', cols: 1, rows: 1 },
  { id: '2x1', name: '2×1 Duplo', description: '2 posts lado a lado', cols: 2, rows: 1 },
  { 
    id: '3x3_big_left', 
    name: 'Destaque Esquerdo', 
    description: '1 grande + 4 pequenos',
    cols: 3, rows: 3,
    cells: [[0, 0, 2, 2], [0, 2, 1, 1], [1, 2, 1, 1], [2, 0, 1, 1], [2, 1, 1, 1], [2, 2, 1, 1]]
  },
  { 
    id: '3x3_big_right', 
    name: 'Destaque Direito', 
    description: '4 pequenos + 1 grande',
    cols: 3, rows: 3,
    cells: [[0, 0, 1, 1], [1, 0, 1, 1], [0, 1, 2, 2], [2, 0, 1, 1], [2, 1, 1, 1], [2, 2, 1, 1]]
  },
  { 
    id: '3x3_big_center', 
    name: 'Destaque Central', 
    description: '1 central grande + bordas',
    cols: 3, rows: 3,
    cells: [[0, 0, 1, 1], [0, 1, 1, 1], [0, 2, 1, 1], [1, 0, 1, 1], [1, 1, 1, 1], [1, 2, 1, 1], [2, 0, 1, 1], [2, 1, 1, 1], [2, 2, 1, 1]]
  },
  { id: '5x3', name: '5×3 Gigante', description: '15 posts (5 linhas)', cols: 3, rows: 5 },
];

const InstagramGridPanel = () => {
  const [selectedLayout, setSelectedLayout] = useState<GridLayout | null>(null);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [generatedPieces, setGeneratedPieces] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setUploadedImage(ev.target?.result as string);
      setGeneratedPieces([]);
      toast.success('Imagem carregada!');
    };
    reader.readAsDataURL(file);
  }, []);

  const generateGridPieces = useCallback(async () => {
    if (!uploadedImage || !selectedLayout) {
      toast.error('Selecione um layout e uma imagem');
      return;
    }

    setIsProcessing(true);

    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = reject;
        img.src = uploadedImage;
      });

      const { cols, rows, cells } = selectedLayout;
      const pieces: string[] = [];

      if (cells) {
        // Complex layout with custom cells
        const cellW = img.width / cols;
        const cellH = img.height / rows;

        for (const [startRow, startCol, spanRows, spanCols] of cells) {
          const canvas = document.createElement('canvas');
          canvas.width = cellW * spanCols;
          canvas.height = cellH * spanRows;
          const ctx = canvas.getContext('2d')!;
          ctx.drawImage(
            img,
            startCol * cellW, startRow * cellH,
            cellW * spanCols, cellH * spanRows,
            0, 0,
            canvas.width, canvas.height
          );
          pieces.push(canvas.toDataURL('image/jpeg', 0.95));
        }
      } else {
        // Simple grid: row by row, left to right
        // Instagram posting order: last row first (bottom-up), but within each row left to right
        // Actually for Instagram grid display, posts are shown newest first (top-left = most recent)
        // So we need to output in REVERSE order: bottom-right first → top-left last
        const cellW = img.width / cols;
        const cellH = img.height / rows;

        // Generate in posting order (bottom-right to top-left)
        for (let r = rows - 1; r >= 0; r--) {
          for (let c = cols - 1; c >= 0; c--) {
            const canvas = document.createElement('canvas');
            canvas.width = cellW;
            canvas.height = cellH;
            const ctx = canvas.getContext('2d')!;
            ctx.drawImage(
              img,
              c * cellW, r * cellH,
              cellW, cellH,
              0, 0,
              cellW, cellH
            );
            pieces.push(canvas.toDataURL('image/jpeg', 0.95));
          }
        }
      }

      setGeneratedPieces(pieces);
      setPreviewOpen(true);
      toast.success(`${pieces.length} peças geradas na sequência correta!`);
    } catch (err) {
      console.error(err);
      toast.error('Erro ao processar imagem');
    } finally {
      setIsProcessing(false);
    }
  }, [uploadedImage, selectedLayout]);

  const downloadAll = useCallback(() => {
    generatedPieces.forEach((piece, idx) => {
      const link = document.createElement('a');
      link.href = piece;
      link.download = `instagram_grid_${String(idx + 1).padStart(2, '0')}.jpg`;
      link.click();
    });
    toast.success('Todas as peças baixadas!');
  }, [generatedPieces]);

  const downloadPiece = useCallback((piece: string, idx: number) => {
    const link = document.createElement('a');
    link.href = piece;
    link.download = `instagram_grid_${String(idx + 1).padStart(2, '0')}.jpg`;
    link.click();
  }, []);

  // Render grid layout preview thumbnail
  const renderLayoutPreview = (layout: GridLayout, size: number = 60) => {
    const { cols, rows, cells } = layout;
    const gap = 1;
    
    if (cells) {
      const cellW = (size - (cols - 1) * gap) / cols;
      const cellH = (size - (rows - 1) * gap) / rows;
      return (
        <svg width={size} height={size} className="rounded">
          <rect width={size} height={size} fill="hsl(var(--muted))" rx="2" />
          {cells.map(([sr, sc, spanR, spanC], i) => (
            <rect
              key={i}
              x={sc * (cellW + gap)}
              y={sr * (cellH + gap)}
              width={cellW * spanC + (spanC - 1) * gap}
              height={cellH * spanR + (spanR - 1) * gap}
              fill="hsl(var(--primary))"
              opacity={0.7}
              rx="1"
            />
          ))}
        </svg>
      );
    }

    const cellW = (size - (cols - 1) * gap) / cols;
    const cellH = (size - (rows - 1) * gap) / rows;
    return (
      <svg width={size} height={size * (rows / Math.max(cols, rows))} className="rounded">
        <rect width={size} height={size * (rows / Math.max(cols, rows))} fill="hsl(var(--muted))" rx="2" />
        {Array.from({ length: rows }).map((_, r) =>
          Array.from({ length: cols }).map((_, c) => (
            <rect
              key={`${r}-${c}`}
              x={c * (cellW + gap)}
              y={r * (cellH + gap)}
              width={cellW}
              height={cellH}
              fill="hsl(var(--primary))"
              opacity={0.7}
              rx="1"
            />
          ))
        )}
      </svg>
    );
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Instagram className="h-5 w-5 text-pink-500" />
        <h3 className="font-semibold text-sm">Grid Instagram</h3>
      </div>

      {/* Image upload */}
      <div>
        <Label className="text-xs text-muted-foreground mb-1 block">Imagem Base</Label>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleImageUpload}
        />
        {uploadedImage ? (
          <div className="relative group">
            <img
              src={uploadedImage}
              alt="Preview"
              className="w-full h-32 object-cover rounded-lg border border-border"
            />
            <Button
              size="sm"
              variant="secondary"
              className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={() => fileInputRef.current?.click()}
            >
              Trocar
            </Button>
          </div>
        ) : (
          <Button
            variant="outline"
            className="w-full h-24 border-dashed flex flex-col gap-1"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="h-5 w-5" />
            <span className="text-xs">Carregar imagem</span>
          </Button>
        )}
      </div>

      {/* Layout selection */}
      <div>
        <Label className="text-xs text-muted-foreground mb-2 block">Escolha o Layout</Label>
        <ScrollArea className="h-[300px]">
          <div className="grid grid-cols-2 gap-2">
            {GRID_LAYOUTS.map((layout) => (
              <Card
                key={layout.id}
                className={`p-2 cursor-pointer transition-all hover:scale-105 ${
                  selectedLayout?.id === layout.id
                    ? 'ring-2 ring-primary bg-primary/5'
                    : 'hover:bg-accent/50'
                }`}
                onClick={() => setSelectedLayout(layout)}
              >
                <div className="flex flex-col items-center gap-1">
                  {renderLayoutPreview(layout, 50)}
                  <span className="text-[10px] font-medium text-center leading-tight">{layout.name}</span>
                  <span className="text-[9px] text-muted-foreground text-center">{layout.description}</span>
                </div>
              </Card>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Generate button */}
      <Button
        className="w-full"
        disabled={!uploadedImage || !selectedLayout || isProcessing}
        onClick={generateGridPieces}
      >
        <Grid className="h-4 w-4 mr-2" />
        {isProcessing ? 'Processando...' : 'Gerar Grid'}
      </Button>

      {generatedPieces.length > 0 && (
        <div className="space-y-2">
          <Button variant="outline" className="w-full" onClick={() => setPreviewOpen(true)}>
            <Eye className="h-4 w-4 mr-2" />
            Ver Prévia do Perfil
          </Button>
          <Button variant="secondary" className="w-full" onClick={downloadAll}>
            <Download className="h-4 w-4 mr-2" />
            Baixar Todas ({generatedPieces.length} imagens)
          </Button>
        </div>
      )}

      {/* Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Instagram className="h-5 w-5 text-pink-500" />
              Prévia do Perfil Instagram
            </DialogTitle>
          </DialogHeader>

          {/* Mock Instagram profile header */}
          <div className="border rounded-lg p-3 bg-background">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 p-[2px]">
                <div className="w-full h-full rounded-full bg-background flex items-center justify-center">
                  <Instagram className="h-5 w-5 text-muted-foreground" />
                </div>
              </div>
              <div>
                <p className="font-semibold text-sm">seu_perfil</p>
                <p className="text-xs text-muted-foreground">Prévia do grid</p>
              </div>
            </div>

            {/* Grid preview - shows how it will look on profile */}
            <div 
              className="grid gap-[2px]"
              style={{ gridTemplateColumns: `repeat(3, 1fr)` }}
            >
              {/* Posts appear newest first on Instagram, so reverse for display */}
              {[...generatedPieces].reverse().map((piece, idx) => (
                <div
                  key={idx}
                  className="aspect-square relative group cursor-pointer"
                  onClick={() => downloadPiece(piece, generatedPieces.length - 1 - idx)}
                >
                  <img
                    src={piece}
                    alt={`Grid ${idx + 1}`}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Download className="h-4 w-4 text-white" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Posting order */}
          <div className="mt-3">
            <p className="text-xs font-medium text-muted-foreground mb-2">
              📋 Ordem de postagem (poste nessa sequência):
            </p>
            <div className="grid grid-cols-4 gap-1">
              {generatedPieces.map((piece, idx) => (
                <div key={idx} className="relative">
                  <img
                    src={piece}
                    alt={`Post ${idx + 1}`}
                    className="w-full aspect-square object-cover rounded border"
                  />
                  <span className="absolute top-0 left-0 bg-primary text-primary-foreground text-[9px] font-bold px-1 rounded-br">
                    {idx + 1}º
                  </span>
                </div>
              ))}
            </div>
          </div>

          <Button className="w-full mt-3" onClick={downloadAll}>
            <Download className="h-4 w-4 mr-2" />
            Baixar Todas na Ordem Correta
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default InstagramGridPanel;
