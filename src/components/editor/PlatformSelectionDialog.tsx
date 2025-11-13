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
import { Instagram, MessageCircle, Facebook, Send, Ruler } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export interface PlatformPreset {
  platform: string;
  type: string;
  width: number;
  height: number;
  label: string;
}

const platformPresets: PlatformPreset[] = [
  // Instagram
  { platform: "instagram", type: "post", width: 1080, height: 1080, label: "Post Quadrado" },
  { platform: "instagram", type: "story", width: 1080, height: 1920, label: "Stories" },
  { platform: "instagram", type: "reel", width: 1080, height: 1920, label: "Reels" },
  { platform: "instagram", type: "landscape", width: 1080, height: 566, label: "Post Paisagem" },
  { platform: "instagram", type: "portrait", width: 1080, height: 1350, label: "Post Retrato" },
  
  // WhatsApp
  { platform: "whatsapp", type: "status", width: 1080, height: 1920, label: "Status" },
  { platform: "whatsapp", type: "profile", width: 640, height: 640, label: "Foto de Perfil" },
  { platform: "whatsapp", type: "group", width: 640, height: 640, label: "Foto de Grupo" },
  
  // Facebook
  { platform: "facebook", type: "post", width: 1200, height: 630, label: "Post" },
  { platform: "facebook", type: "story", width: 1080, height: 1920, label: "Stories" },
  { platform: "facebook", type: "cover", width: 820, height: 312, label: "Capa" },
  { platform: "facebook", type: "profile", width: 180, height: 180, label: "Foto de Perfil" },
  
  // Telegram
  { platform: "telegram", type: "post", width: 1280, height: 720, label: "Post" },
  { platform: "telegram", type: "story", width: 1080, height: 1920, label: "Stories" },
  { platform: "telegram", type: "profile", width: 640, height: 640, label: "Foto de Perfil" },
];

interface PlatformSelectionDialogProps {
  open: boolean;
  onSelect: (preset: PlatformPreset) => void;
  onClose: () => void;
}

export const PlatformSelectionDialog = ({ open, onSelect, onClose }: PlatformSelectionDialogProps) => {
  const [selectedPlatform, setSelectedPlatform] = useState<string>("instagram");
  const [selectedType, setSelectedType] = useState<string>("");
  const [customWidth, setCustomWidth] = useState<string>("1080");
  const [customHeight, setCustomHeight] = useState<string>("1080");

  const platforms = [
    { id: "instagram", name: "Instagram", icon: Instagram },
    { id: "whatsapp", name: "WhatsApp", icon: MessageCircle },
    { id: "facebook", name: "Facebook", icon: Facebook },
    { id: "telegram", name: "Telegram", icon: Send },
    { id: "custom", name: "Personalizado", icon: Ruler },
  ];

  const availableTypes = platformPresets.filter(p => p.platform === selectedPlatform);

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
    : selectedType !== "";

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Selecione a Plataforma</DialogTitle>
          <DialogDescription>
            Escolha onde você irá publicar sua imagem para ajustar o tamanho ideal
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Platform Selection */}
          <RadioGroup value={selectedPlatform} onValueChange={setSelectedPlatform}>
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

          {/* Type Selection */}
          {selectedPlatform !== "custom" && (
            <div className="space-y-2">
              <Label>Tipo de Conteúdo</Label>
              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  {availableTypes.map((preset) => (
                    <SelectItem key={`${preset.platform}-${preset.type}`} value={preset.type}>
                      {preset.label} ({preset.width}x{preset.height}px)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Custom Size */}
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

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={!isValid}>
            Confirmar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
