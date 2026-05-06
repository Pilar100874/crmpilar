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
import { Instagram, MessageCircle, Facebook, Send, Ruler, Grid, ArrowLeft } from "lucide-react";
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

export interface PlatformPreset {
  platform: string;
  type: string;
  width: number;
  height: number;
  label: string;
  gridLayout?: GridLayoutConfig;
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

const platformPresets: PlatformPreset[] = [
  { platform: "instagram", type: "post", width: 1080, height: 1080, label: "Post Quadrado" },
  { platform: "instagram", type: "story", width: 1080, height: 1920, label: "Stories" },
  { platform: "instagram", type: "reel", width: 1080, height: 1920, label: "Reels" },
  { platform: "instagram", type: "landscape", width: 1080, height: 566, label: "Post Paisagem" },
  { platform: "instagram", type: "portrait", width: 1080, height: 1350, label: "Post Retrato" },
  { platform: "instagram", type: "grid", width: 1080, height: 1080, label: "Grid de Perfil" },
  
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

export const PlatformSelectionDialog = ({ open, onSelect, onClose }: PlatformSelectionDialogProps) => {
  const [selectedPlatform, setSelectedPlatform] = useState<string>("instagram");
  const [selectedType, setSelectedType] = useState<string>("");
  const [customWidth, setCustomWidth] = useState<string>("1080");
  const [customHeight, setCustomHeight] = useState<string>("1080");
  const [showGridSelection, setShowGridSelection] = useState(false);

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
      setShowGridSelection(true);
    } else {
      setShowGridSelection(false);
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
    setShowGridSelection(false);
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
    : selectedType !== "" && selectedType !== "grid";

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>
            {showGridSelection ? (
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowGridSelection(false)}>
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <Grid className="h-5 w-5 text-pink-500" />
                Escolha o Layout do Grid
              </div>
            ) : (
              "Selecione a Plataforma"
            )}
          </DialogTitle>
          <DialogDescription>
            {showGridSelection
              ? "Selecione como deseja dividir o grid do perfil do Instagram"
              : "Escolha onde você irá publicar sua imagem para ajustar o tamanho ideal"
            }
          </DialogDescription>
        </DialogHeader>

        {showGridSelection ? (
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
        ) : (
          <div className="space-y-6 py-4">
            <RadioGroup value={selectedPlatform} onValueChange={(v) => { setSelectedPlatform(v); setSelectedType(""); setShowGridSelection(false); }}>
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

        {!showGridSelection && (
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
