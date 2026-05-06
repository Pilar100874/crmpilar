import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Instagram, MessageCircle, Facebook, Send, Ruler, Grid, ArrowLeft, GalleryHorizontal } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";

export interface GridLayoutConfig {
  id: string;
  name: string;
  description: string;
  cols: number;
  rows: number;
  cells?: [number, number, number, number][];
}

export interface CarouselConfig {
  id: string;
  name: string;
  description: string;
  slides: number;
  slideWidth: number;
  slideHeight: number;
  format: 'square' | 'portrait' | 'landscape';
}

export interface PlatformPreset {
  platform: string;
  type: string;
  width: number;
  height: number;
  label: string;
  gridLayout?: GridLayoutConfig;
  carouselConfig?: CarouselConfig;
}

const GRID_LAYOUTS: GridLayoutConfig[] = [
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

const CAROUSEL_PRESETS: CarouselConfig[] = [
  { id: 'sq-2', name: '2 Slides Quadrado', description: '2 slides 1080×1080', slides: 2, slideWidth: 1080, slideHeight: 1080, format: 'square' },
  { id: 'sq-3', name: '3 Slides Quadrado', description: '3 slides 1080×1080', slides: 3, slideWidth: 1080, slideHeight: 1080, format: 'square' },
  { id: 'sq-4', name: '4 Slides Quadrado', description: '4 slides 1080×1080', slides: 4, slideWidth: 1080, slideHeight: 1080, format: 'square' },
  { id: 'sq-5', name: '5 Slides Quadrado', description: '5 slides 1080×1080', slides: 5, slideWidth: 1080, slideHeight: 1080, format: 'square' },
  { id: 'sq-7', name: '7 Slides Quadrado', description: '7 slides 1080×1080', slides: 7, slideWidth: 1080, slideHeight: 1080, format: 'square' },
  { id: 'sq-10', name: '10 Slides Quadrado', description: '10 slides 1080×1080', slides: 10, slideWidth: 1080, slideHeight: 1080, format: 'square' },
  { id: 'pt-2', name: '2 Slides Retrato', description: '2 slides 1080×1350', slides: 2, slideWidth: 1080, slideHeight: 1350, format: 'portrait' },
  { id: 'pt-3', name: '3 Slides Retrato', description: '3 slides 1080×1350', slides: 3, slideWidth: 1080, slideHeight: 1350, format: 'portrait' },
  { id: 'pt-5', name: '5 Slides Retrato', description: '5 slides 1080×1350', slides: 5, slideWidth: 1080, slideHeight: 1350, format: 'portrait' },
  { id: 'pt-10', name: '10 Slides Retrato', description: '10 slides 1080×1350', slides: 10, slideWidth: 1080, slideHeight: 1350, format: 'portrait' },
  { id: 'ls-2', name: '2 Slides Paisagem', description: '2 slides 1080×566', slides: 2, slideWidth: 1080, slideHeight: 566, format: 'landscape' },
  { id: 'ls-3', name: '3 Slides Paisagem', description: '3 slides 1080×566', slides: 3, slideWidth: 1080, slideHeight: 566, format: 'landscape' },
  { id: 'ls-5', name: '5 Slides Paisagem', description: '5 slides 1080×566', slides: 5, slideWidth: 1080, slideHeight: 566, format: 'landscape' },
];

const platformPresets: PlatformPreset[] = [
  { platform: "instagram", type: "post", width: 1080, height: 1080, label: "Post Quadrado" },
  { platform: "instagram", type: "story", width: 1080, height: 1920, label: "Stories" },
  { platform: "instagram", type: "reel", width: 1080, height: 1920, label: "Reels" },
  { platform: "instagram", type: "landscape", width: 1080, height: 566, label: "Post Paisagem" },
  { platform: "instagram", type: "portrait", width: 1080, height: 1350, label: "Post Retrato" },
  { platform: "instagram", type: "grid", width: 1080, height: 1080, label: "Grid de Perfil" },
  { platform: "instagram", type: "carousel", width: 1080, height: 1080, label: "Carrossel" },
  
  { platform: "whatsapp", type: "status", width: 1080, height: 1920, label: "Status" },
  { platform: "whatsapp", type: "profile", width: 640, height: 640, label: "Foto de Perfil" },
  { platform: "whatsapp", type: "group", width: 640, height: 640, label: "Foto de Grupo" },
  
  { platform: "facebook", type: "post", width: 1200, height: 630, label: "Post" },
  { platform: "facebook", type: "story", width: 1080, height: 1920, label: "Stories" },
  { platform: "facebook", type: "cover", width: 820, height: 312, label: "Capa" },
  { platform: "facebook", type: "profile", width: 180, height: 180, label: "Foto de Perfil" },
  
  { platform: "telegram", type: "post", width: 1280, height: 720, label: "Post" },
  { platform: "telegram", type: "story", width: 1080, height: 1920, label: "Stories" },
  { platform: "telegram", type: "profile", width: 640, height: 640, label: "Foto de Perfil" },
];

interface PlatformSelectionDialogProps {
  open: boolean;
  onSelect: (preset: PlatformPreset) => void;
  onClose: () => void;
}

const renderLayoutPreview = (layout: GridLayoutConfig, size: number = 55) => {
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

const renderCarouselPreview = (config: CarouselConfig, size: number = 55) => {
  const { slides, format } = config;
  const gap = 1;
  const aspectRatio = format === 'portrait' ? 1.25 : format === 'landscape' ? 0.52 : 1;
  const cellW = Math.min((size - (Math.min(slides, 5) - 1) * gap) / Math.min(slides, 5), 16);
  const cellH = cellW * aspectRatio;
  const totalW = Math.min(slides, 5) * (cellW + gap) - gap;

  return (
    <svg width={totalW} height={cellH} className="rounded">
      {Array.from({ length: Math.min(slides, 5) }).map((_, i) => (
        <rect
          key={i}
          x={i * (cellW + gap)}
          y={0}
          width={cellW}
          height={cellH}
          fill="hsl(var(--primary))"
          opacity={0.6 + (i * 0.08)}
          rx="1"
        />
      ))}
      {slides > 5 && (
        <text x={totalW - 2} y={cellH - 2} fontSize="6" fill="hsl(var(--foreground))" textAnchor="end" opacity={0.6}>+{slides - 5}</text>
      )}
    </svg>
  );
};

export const PlatformSelectionDialog = ({ open, onSelect, onClose }: PlatformSelectionDialogProps) => {
  const [selectedPlatform, setSelectedPlatform] = useState<string>("instagram");
  const [selectedType, setSelectedType] = useState<string>("");
  const [customWidth, setCustomWidth] = useState<string>("1080");
  const [customHeight, setCustomHeight] = useState<string>("1080");
  const [subStep, setSubStep] = useState<'main' | 'grid' | 'carousel'>('main');

  const platforms = [
    { id: "instagram", name: "Instagram", icon: Instagram },
    { id: "whatsapp", name: "WhatsApp", icon: MessageCircle },
    { id: "facebook", name: "Facebook", icon: Facebook },
    { id: "telegram", name: "Telegram", icon: Send },
    { id: "custom", name: "Personalizado", icon: Ruler },
  ];

  const availableTypes = platformPresets.filter(p => p.platform === selectedPlatform);

  const handleTypeChange = (type: string) => {
    setSelectedType(type);
    if (type === "grid") {
      setSubStep('grid');
    } else if (type === "carousel") {
      setSubStep('carousel');
    } else {
      setSubStep('main');
    }
  };

  const handleGridLayoutSelect = (layout: GridLayoutConfig) => {
    const totalWidth = 1080 * layout.cols;
    const totalHeight = 1080 * layout.rows;
    onSelect({
      platform: "instagram",
      type: "grid",
      width: totalWidth,
      height: totalHeight,
      label: `Grid ${layout.name}`,
      gridLayout: layout,
    });
    setSubStep('main');
    setSelectedType("");
  };

  const handleCarouselSelect = (config: CarouselConfig) => {
    const totalWidth = config.slideWidth * config.slides;
    onSelect({
      platform: "instagram",
      type: "carousel",
      width: totalWidth,
      height: config.slideHeight,
      label: `Carrossel ${config.name}`,
      carouselConfig: config,
    });
    setSubStep('main');
    setSelectedType("");
  };

  const handleConfirm = () => {
    if (selectedPlatform === "custom") {
      const width = parseInt(customWidth) || 1080;
      const height = parseInt(customHeight) || 1080;
      onSelect({
        platform: "custom",
        type: "custom",
        width,
        height,
        label: `Personalizado ${width}x${height}`,
      });
    } else {
      const preset = platformPresets.find(
        p => p.platform === selectedPlatform && p.type === selectedType
      );
      if (preset) {
        onSelect(preset);
      }
    }
  };

  const isValid = selectedPlatform === "custom" 
    ? customWidth && customHeight 
    : selectedType !== "" && selectedType !== "grid" && selectedType !== "carousel";

  const subStepTitle = subStep === 'grid' 
    ? 'Escolha o Layout do Grid'
    : 'Escolha o Carrossel';

  const subStepDescription = subStep === 'grid'
    ? 'Selecione como deseja dividir o grid do perfil do Instagram'
    : 'Selecione quantos slides e o formato do carrossel';

  const subStepIcon = subStep === 'grid'
    ? <Grid className="h-5 w-5 text-pink-500" />
    : <GalleryHorizontal className="h-5 w-5 text-pink-500" />;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>
            {subStep !== 'main' ? (
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setSubStep('main')}>
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                {subStepIcon}
                {subStepTitle}
              </div>
            ) : (
              "Selecione a Plataforma"
            )}
          </DialogTitle>
          <DialogDescription>
            {subStep !== 'main'
              ? subStepDescription
              : "Escolha onde você irá publicar sua imagem para ajustar o tamanho ideal"
            }
          </DialogDescription>
        </DialogHeader>

        {subStep === 'grid' ? (
          <ScrollArea className="max-h-[400px] py-2">
            <div className="grid grid-cols-3 gap-3 pr-2">
              {GRID_LAYOUTS.map((layout) => (
                <Card
                  key={layout.id}
                  className="p-3 cursor-pointer transition-all hover:scale-105 hover:bg-accent/50 hover:border-primary/50"
                  onClick={() => handleGridLayoutSelect(layout)}
                >
                  <div className="flex flex-col items-center gap-1.5">
                    {renderLayoutPreview(layout, 55)}
                    <span className="text-[11px] font-medium text-center leading-tight">{layout.name}</span>
                    <span className="text-[9px] text-muted-foreground text-center">{layout.description}</span>
                  </div>
                </Card>
              ))}
            </div>
          </ScrollArea>
        ) : subStep === 'carousel' ? (
          <ScrollArea className="max-h-[400px] py-2">
            <div className="space-y-4 pr-2">
              {/* Quadrado */}
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">Quadrado (1080×1080)</h4>
                <div className="grid grid-cols-3 gap-2">
                  {CAROUSEL_PRESETS.filter(c => c.format === 'square').map((config) => (
                    <Card
                      key={config.id}
                      className="p-3 cursor-pointer transition-all hover:scale-105 hover:bg-accent/50 hover:border-primary/50"
                      onClick={() => handleCarouselSelect(config)}
                    >
                      <div className="flex flex-col items-center gap-1.5">
                        {renderCarouselPreview(config)}
                        <span className="text-[11px] font-medium text-center leading-tight">{config.slides} Slides</span>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Retrato */}
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">Retrato (1080×1350)</h4>
                <div className="grid grid-cols-3 gap-2">
                  {CAROUSEL_PRESETS.filter(c => c.format === 'portrait').map((config) => (
                    <Card
                      key={config.id}
                      className="p-3 cursor-pointer transition-all hover:scale-105 hover:bg-accent/50 hover:border-primary/50"
                      onClick={() => handleCarouselSelect(config)}
                    >
                      <div className="flex flex-col items-center gap-1.5">
                        {renderCarouselPreview(config)}
                        <span className="text-[11px] font-medium text-center leading-tight">{config.slides} Slides</span>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Paisagem */}
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">Paisagem (1080×566)</h4>
                <div className="grid grid-cols-3 gap-2">
                  {CAROUSEL_PRESETS.filter(c => c.format === 'landscape').map((config) => (
                    <Card
                      key={config.id}
                      className="p-3 cursor-pointer transition-all hover:scale-105 hover:bg-accent/50 hover:border-primary/50"
                      onClick={() => handleCarouselSelect(config)}
                    >
                      <div className="flex flex-col items-center gap-1.5">
                        {renderCarouselPreview(config)}
                        <span className="text-[11px] font-medium text-center leading-tight">{config.slides} Slides</span>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          </ScrollArea>
        ) : (
          <div className="space-y-6 py-4">
            <RadioGroup value={selectedPlatform} onValueChange={(v) => { setSelectedPlatform(v); setSelectedType(""); setSubStep('main'); }}>
              <div className="grid grid-cols-2 gap-3">
                {platforms.map((platform) => {
                  const Icon = platform.icon;
                  return (
                    <Label
                      key={platform.id}
                      htmlFor={platform.id}
                      className={`
                        flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer transition-all
                        ${selectedPlatform === platform.id 
                          ? 'border-primary bg-primary/5' 
                          : 'border-border hover:border-primary/50'
                        }
                      `}
                    >
                      <RadioGroupItem value={platform.id} id={platform.id} className="sr-only" />
                      <Icon className="h-5 w-5" />
                      <span className="font-medium">{platform.name}</span>
                    </Label>
                  );
                })}
              </div>
            </RadioGroup>

            {selectedPlatform !== "custom" && (
              <div className="space-y-2">
                <Label>Tipo de Conteúdo</Label>
                <Select value={selectedType} onValueChange={handleTypeChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableTypes.map((preset) => (
                      <SelectItem key={`${preset.platform}-${preset.type}`} value={preset.type}>
                        {preset.type === "grid" ? (
                          <span className="flex items-center gap-2">
                            <Grid className="h-3.5 w-3.5" />
                            {preset.label}
                          </span>
                        ) : preset.type === "carousel" ? (
                          <span className="flex items-center gap-2">
                            <GalleryHorizontal className="h-3.5 w-3.5" />
                            {preset.label}
                          </span>
                        ) : (
                          `${preset.label} (${preset.width}x${preset.height}px)`
                        )}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {selectedPlatform === "custom" && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="width">Largura (px)</Label>
                    <Input
                      id="width"
                      type="number"
                      value={customWidth}
                      onChange={(e) => setCustomWidth(e.target.value)}
                      placeholder="1080"
                      min="100"
                      max="4096"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="height">Altura (px)</Label>
                    <Input
                      id="height"
                      type="number"
                      value={customHeight}
                      onChange={(e) => setCustomHeight(e.target.value)}
                      placeholder="1080"
                      min="100"
                      max="4096"
                    />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Tamanho recomendado: entre 640x640 e 1920x1920 pixels
                </p>
              </div>
            )}
          </div>
        )}

        {subStep === 'main' && (
          <DialogFooter>
            <Button variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button onClick={handleConfirm} disabled={!isValid}>
              Confirmar
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
};
