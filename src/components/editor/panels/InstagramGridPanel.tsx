import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "@/lib/toast-config";
import { Download, Upload, Grid, Eye, Instagram, ArrowLeft, Move, ZoomIn, ZoomOut, Save } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";

interface GridLayout {
  id: string;
  name: string;
  description: string;
  cols: number;
  rows: number;
  cells?: [number, number, number, number][];
}

const GRID_LAYOUTS: GridLayout[] = [
  { id: '1x3', name: '1×3 Horizontal', description: '3 posts em linha', cols: 3, rows: 1 },
  { id: '2x3', name: '2×3 Panorama', description: '6 posts (2 linhas)', cols: 3, rows: 2 },
  { id: '3x3', name: '3×3 Mosaico', description: '9 posts (grid completo)', cols: 3, rows: 3 },
  { id: '4x3', name: '4×3 Épico', description: '12 posts (4 linhas)', cols: 3, rows: 4 },
  { id: '5x3', name: '5×3 Gigante', description: '15 posts (5 linhas)', cols: 3, rows: 5 },
  { id: '1x1_center', name: '1×1 Central', description: '1 post quadrado', cols: 1, rows: 1 },
  { id: '2x1', name: '2×1 Duplo', description: '2 posts lado a lado', cols: 2, rows: 1 },
  { 
    id: '3x3_big_left', 
    name: 'Destaque Esquerdo', 
    description: '1 grande + 5 pequenos',
    cols: 3, rows: 3,
    cells: [[0, 0, 2, 2], [0, 2, 1, 1], [1, 2, 1, 1], [2, 0, 1, 1], [2, 1, 1, 1], [2, 2, 1, 1]]
  },
  { 
    id: '3x3_big_right', 
    name: 'Destaque Direito', 
    description: '5 pequenos + 1 grande',
    cols: 3, rows: 3,
    cells: [[0, 0, 1, 1], [1, 0, 1, 1], [0, 1, 2, 2], [2, 0, 1, 1], [2, 1, 1, 1], [2, 2, 1, 1]]
  },
  { 
    id: '3x3_cross', 
    name: 'Cruz Central', 
    description: 'Centro expandido',
    cols: 3, rows: 3,
    cells: [[0, 0, 1, 1], [0, 1, 1, 1], [0, 2, 1, 1], [1, 0, 1, 1], [1, 1, 1, 1], [1, 2, 1, 1], [2, 0, 1, 1], [2, 1, 1, 1], [2, 2, 1, 1]]
  },
  { 
    id: '3x3_top_banner', 
    name: 'Banner Superior', 
    description: 'Linha superior unificada',
    cols: 3, rows: 3,
    cells: [[0, 0, 1, 3], [1, 0, 1, 1], [1, 1, 1, 1], [1, 2, 1, 1], [2, 0, 1, 1], [2, 1, 1, 1], [2, 2, 1, 1]]
  },
  { 
    id: '3x3_bottom_banner', 
    name: 'Banner Inferior', 
    description: 'Linha inferior unificada',
    cols: 3, rows: 3,
    cells: [[0, 0, 1, 1], [0, 1, 1, 1], [0, 2, 1, 1], [1, 0, 1, 1], [1, 1, 1, 1], [1, 2, 1, 1], [2, 0, 1, 3]]
  },
];

type Step = 'select-layout' | 'editor';

const InstagramGridPanel = () => {
  const [step, setStep] = useState<Step>('select-layout');
  const [selectedLayout, setSelectedLayout] = useState<GridLayout | null>(null);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [generatedPieces, setGeneratedPieces] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Image positioning state
  const [imgScale, setImgScale] = useState(1);
  const [imgX, setImgX] = useState(0);
  const [imgY, setImgY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const canvasRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  const handleLayoutSelect = (layout: GridLayout) => {
    setSelectedLayout(layout);
    setStep('editor');
    setUploadedImage(null);
    setGeneratedPieces([]);
    setImgScale(1);
    setImgX(0);
    setImgY(0);
  };

  const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const src = ev.target?.result as string;
      setUploadedImage(src);
      setGeneratedPieces([]);
      // Auto-fit image
      const img = new Image();
      img.onload = () => {
        imgRef.current = img;
        // Fit to canvas area
        if (canvasRef.current && selectedLayout) {
          const canvasW = canvasRef.current.clientWidth;
          const canvasH = canvasRef.current.clientHeight;
          const scaleX = canvasW / img.width;
          const scaleY = canvasH / img.height;
          const fitScale = Math.max(scaleX, scaleY);
          setImgScale(fitScale);
          setImgX((canvasW - img.width * fitScale) / 2);
          setImgY((canvasH - img.height * fitScale) / 2);
        }
      };
      img.src = src;
      toast.success('Imagem carregada! Arraste para posicionar.');
    };
    reader.readAsDataURL(file);
  }, [selectedLayout]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!uploadedImage) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - imgX, y: e.clientY - imgY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setImgX(e.clientX - dragStart.x);
    setImgY(e.clientY - dragStart.y);
  };

  const handleMouseUp = () => setIsDragging(false);

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.05 : 0.05;
    setImgScale(prev => Math.max(0.1, Math.min(5, prev + delta)));
  };

  const generateGridPieces = useCallback(async () => {
    if (!uploadedImage || !selectedLayout || !canvasRef.current) {
      toast.error('Insira uma imagem primeiro');
      return;
    }

    setIsProcessing(true);
    try {
      const canvasW = canvasRef.current.clientWidth;
      const canvasH = canvasRef.current.clientHeight;

      // First render the positioned image onto a canvas matching the grid area
      const compositeCanvas = document.createElement('canvas');
      compositeCanvas.width = canvasW * 2; // 2x for quality
      compositeCanvas.height = canvasH * 2;
      const cctx = compositeCanvas.getContext('2d')!;
      
      const img = new Image();
      img.crossOrigin = 'anonymous';
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = reject;
        img.src = uploadedImage;
      });

      const scale2x = 2;
      cctx.drawImage(
        img,
        imgX * scale2x,
        imgY * scale2x,
        img.width * imgScale * scale2x,
        img.height * imgScale * scale2x
      );

      const { cols, rows, cells } = selectedLayout;
      const pieces: string[] = [];

      if (cells) {
        const cellW = compositeCanvas.width / cols;
        const cellH = compositeCanvas.height / rows;
        for (const [startRow, startCol, spanRows, spanCols] of cells) {
          const pieceCanvas = document.createElement('canvas');
          pieceCanvas.width = cellW * spanCols;
          pieceCanvas.height = cellH * spanRows;
          const ctx = pieceCanvas.getContext('2d')!;
          ctx.drawImage(
            compositeCanvas,
            startCol * cellW, startRow * cellH,
            cellW * spanCols, cellH * spanRows,
            0, 0,
            pieceCanvas.width, pieceCanvas.height
          );
          pieces.push(pieceCanvas.toDataURL('image/jpeg', 0.95));
        }
      } else {
        const cellW = compositeCanvas.width / cols;
        const cellH = compositeCanvas.height / rows;
        // Posting order: bottom-right to top-left
        for (let r = rows - 1; r >= 0; r--) {
          for (let c = cols - 1; c >= 0; c--) {
            const pieceCanvas = document.createElement('canvas');
            pieceCanvas.width = cellW;
            pieceCanvas.height = cellH;
            const ctx = pieceCanvas.getContext('2d')!;
            ctx.drawImage(
              compositeCanvas,
              c * cellW, r * cellH,
              cellW, cellH,
              0, 0,
              cellW, cellH
            );
            pieces.push(pieceCanvas.toDataURL('image/jpeg', 0.95));
          }
        }
      }

      setGeneratedPieces(pieces);
      setPreviewOpen(true);
      toast.success(`${pieces.length} posts gerados!`);
    } catch (err) {
      console.error(err);
      toast.error('Erro ao processar imagem');
    } finally {
      setIsProcessing(false);
    }
  }, [uploadedImage, selectedLayout, imgX, imgY, imgScale]);

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
    const aspectH = size * (rows / Math.max(cols, rows));
    
    if (cells) {
      const cellW = (size - (cols - 1) * gap) / cols;
      const cellH = (aspectH - (rows - 1) * gap) / rows;
      return (
        <svg width={size} height={aspectH} className="rounded">
          <rect width={size} height={aspectH} fill="hsl(var(--muted))" rx="2" />
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
    const cellH = (aspectH - (rows - 1) * gap) / rows;
    return (
      <svg width={size} height={aspectH} className="rounded">
        <rect width={size} height={aspectH} fill="hsl(var(--muted))" rx="2" />
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

  // Render grid mask overlay on the editor canvas
  const renderGridMask = () => {
    if (!selectedLayout) return null;
    const { cols, rows, cells } = selectedLayout;
    
    if (cells) {
      // For complex layouts, draw lines between cells
      return (
        <div className="absolute inset-0 pointer-events-none z-10">
          {/* Grid lines */}
          {Array.from({ length: cols - 1 }).map((_, i) => (
            <div
              key={`v-${i}`}
              className="absolute top-0 bottom-0 border-l-2 border-white/60 border-dashed"
              style={{ left: `${((i + 1) / cols) * 100}%` }}
            />
          ))}
          {Array.from({ length: rows - 1 }).map((_, i) => (
            <div
              key={`h-${i}`}
              className="absolute left-0 right-0 border-t-2 border-white/60 border-dashed"
              style={{ top: `${((i + 1) / rows) * 100}%` }}
            />
          ))}
          {/* Cell numbers */}
          {cells.map(([sr, sc, spanR, spanC], idx) => (
            <div
              key={idx}
              className="absolute flex items-center justify-center"
              style={{
                left: `${(sc / cols) * 100}%`,
                top: `${(sr / rows) * 100}%`,
                width: `${(spanC / cols) * 100}%`,
                height: `${(spanR / rows) * 100}%`,
              }}
            >
              <span className="bg-black/50 text-white text-xs font-bold px-1.5 py-0.5 rounded">
                {idx + 1}
              </span>
            </div>
          ))}
        </div>
      );
    }

    return (
      <div className="absolute inset-0 pointer-events-none z-10">
        {/* Vertical lines */}
        {Array.from({ length: cols - 1 }).map((_, i) => (
          <div
            key={`v-${i}`}
            className="absolute top-0 bottom-0 border-l-2 border-white/60 border-dashed"
            style={{ left: `${((i + 1) / cols) * 100}%` }}
          />
        ))}
        {/* Horizontal lines */}
        {Array.from({ length: rows - 1 }).map((_, i) => (
          <div
            key={`h-${i}`}
            className="absolute left-0 right-0 border-t-2 border-white/60 border-dashed"
            style={{ top: `${((i + 1) / rows) * 100}%` }}
          />
        ))}
        {/* Cell numbers */}
        {Array.from({ length: rows }).map((_, r) =>
          Array.from({ length: cols }).map((_, c) => {
            // Posting order is bottom-right to top-left
            const postNum = (rows - 1 - r) * cols + (cols - 1 - c) + 1;
            return (
              <div
                key={`n-${r}-${c}`}
                className="absolute flex items-center justify-center"
                style={{
                  left: `${(c / cols) * 100}%`,
                  top: `${(r / rows) * 100}%`,
                  width: `${(1 / cols) * 100}%`,
                  height: `${(1 / rows) * 100}%`,
                }}
              >
                <span className="bg-black/50 text-white text-[10px] font-bold px-1 py-0.5 rounded">
                  {postNum}º
                </span>
              </div>
            );
          })
        )}
      </div>
    );
  };

  // STEP 1: Layout selection
  if (step === 'select-layout') {
    return (
      <div className="p-4 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Instagram className="h-5 w-5 text-pink-500" />
          <h3 className="font-semibold text-sm">Grid Instagram</h3>
        </div>

        <p className="text-xs text-muted-foreground">
          Escolha um layout de grid para seu perfil do Instagram:
        </p>

        <ScrollArea className="h-[420px]">
          <div className="grid grid-cols-2 gap-2">
            {GRID_LAYOUTS.map((layout) => (
              <Card
                key={layout.id}
                className="p-2 cursor-pointer transition-all hover:scale-105 hover:bg-accent/50"
                onClick={() => handleLayoutSelect(layout)}
              >
                <div className="flex flex-col items-center gap-1">
                  {renderLayoutPreview(layout, 55)}
                  <span className="text-[10px] font-medium text-center leading-tight">{layout.name}</span>
                  <span className="text-[9px] text-muted-foreground text-center">{layout.description}</span>
                </div>
              </Card>
            ))}
          </div>
        </ScrollArea>
      </div>
    );
  }

  // STEP 2: Editor with mask overlay
  return (
    <div className="p-4 space-y-3 flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setStep('select-layout')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <Instagram className="h-4 w-4 text-pink-500" />
        <span className="text-sm font-semibold">{selectedLayout?.name}</span>
        <span className="text-[10px] text-muted-foreground ml-auto">
          {selectedLayout?.cols}×{selectedLayout?.rows} = {selectedLayout?.cells?.length || (selectedLayout?.cols || 0) * (selectedLayout?.rows || 0)} posts
        </span>
      </div>

      {/* Upload button */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleImageUpload}
      />

      {!uploadedImage && (
        <Button
          variant="outline"
          className="w-full h-16 border-dashed flex flex-col gap-1"
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="h-5 w-5" />
          <span className="text-xs">Inserir imagem</span>
        </Button>
      )}

      {/* Canvas area with grid mask */}
      {selectedLayout && (
        <div
          ref={canvasRef}
          className="relative w-full bg-muted/50 rounded-lg border border-border overflow-hidden cursor-move select-none"
          style={{
            aspectRatio: `${selectedLayout.cols} / ${selectedLayout.rows}`,
            minHeight: 200,
          }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
        >
          {/* Image layer */}
          {uploadedImage && (
            <img
              src={uploadedImage}
              alt="Grid image"
              className="absolute pointer-events-none"
              style={{
                left: imgX,
                top: imgY,
                width: imgRef.current ? imgRef.current.width * imgScale : 'auto',
                height: imgRef.current ? imgRef.current.height * imgScale : 'auto',
                maxWidth: 'none',
              }}
              draggable={false}
            />
          )}

          {/* Grid mask overlay */}
          {renderGridMask()}

          {/* Outer border */}
          <div className="absolute inset-0 border-2 border-white/40 rounded-lg pointer-events-none z-10" />

          {/* Empty state */}
          {!uploadedImage && (
            <div className="absolute inset-0 flex items-center justify-center text-muted-foreground text-xs">
              <span>Insira uma imagem acima</span>
            </div>
          )}
        </div>
      )}

      {/* Controls */}
      {uploadedImage && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <ZoomOut className="h-3 w-3 text-muted-foreground" />
            <Slider
              value={[imgScale * 100]}
              onValueChange={([v]) => setImgScale(v / 100)}
              min={10}
              max={500}
              step={5}
              className="flex-1"
            />
            <ZoomIn className="h-3 w-3 text-muted-foreground" />
            <span className="text-[10px] text-muted-foreground w-10 text-right">{Math.round(imgScale * 100)}%</span>
          </div>

          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <Move className="h-3 w-3" />
            <span>Arraste para posicionar • Scroll para zoom</span>
          </div>

          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="h-3 w-3 mr-1" />
            Trocar imagem
          </Button>
        </div>
      )}

      {/* Generate / Save */}
      <div className="mt-auto space-y-2 pt-2">
        <Button
          className="w-full"
          disabled={!uploadedImage || isProcessing}
          onClick={generateGridPieces}
        >
          <Save className="h-4 w-4 mr-2" />
          {isProcessing ? 'Processando...' : 'Salvar Posts'}
        </Button>

        {generatedPieces.length > 0 && (
          <>
            <Button variant="outline" className="w-full" onClick={() => setPreviewOpen(true)}>
              <Eye className="h-4 w-4 mr-2" />
              Ver Prévia do Perfil
            </Button>
            <Button variant="secondary" className="w-full" onClick={downloadAll}>
              <Download className="h-4 w-4 mr-2" />
              Baixar Todas ({generatedPieces.length} imagens)
            </Button>
          </>
        )}
      </div>

      {/* Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Instagram className="h-5 w-5 text-pink-500" />
              Prévia do Perfil Instagram
            </DialogTitle>
          </DialogHeader>

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

            <div 
              className="grid gap-[2px]"
              style={{ gridTemplateColumns: `repeat(3, 1fr)` }}
            >
              {[...generatedPieces].reverse().map((piece, idx) => (
                <div
                  key={idx}
                  className="aspect-square relative group cursor-pointer"
                  onClick={() => downloadPiece(piece, generatedPieces.length - 1 - idx)}
                >
                  <img src={piece} alt={`Grid ${idx + 1}`} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Download className="h-4 w-4 text-white" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-3">
            <p className="text-xs font-medium text-muted-foreground mb-2">
              📋 Ordem de postagem (poste nessa sequência):
            </p>
            <div className="grid grid-cols-4 gap-1">
              {generatedPieces.map((piece, idx) => (
                <div key={idx} className="relative">
                  <img src={piece} alt={`Post ${idx + 1}`} className="w-full aspect-square object-cover rounded border" />
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
