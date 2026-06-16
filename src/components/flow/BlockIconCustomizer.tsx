import { useMemo, useState } from "react";
import * as Icons from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Lista curada de ícones populares para personalização de blocos
const ICON_NAMES = [
  "MessageSquare","MessageCircle","Send","Bot","Sparkles","Zap","Star","Heart","Bookmark","Tag",
  "User","Users","UserPlus","UserCheck","Phone","PhoneCall","PhoneIncoming","Mail","MailOpen","AtSign",
  "Image","ImagePlus","Camera","Video","Film","Music","Mic","Volume2","Play","Pause",
  "File","FileText","FilePlus","Folder","FolderOpen","Paperclip","Download","Upload","Save","Printer",
  "ShoppingCart","ShoppingBag","Package","Box","Truck","Gift","CreditCard","DollarSign","Wallet","Receipt",
  "Calendar","CalendarDays","Clock","Timer","AlarmClock","Bell","BellRing","Flag","MapPin","Map",
  "Search","Filter","List","ListChecks","CheckCircle","CheckSquare","Check","X","XCircle","AlertCircle",
  "AlertTriangle","Info","HelpCircle","Settings","Wrench","Cog","Sliders","Lock","Unlock","Key",
  "Home","Building","Building2","Store","Briefcase","BookOpen","Book","GraduationCap","Award","Trophy",
  "TrendingUp","TrendingDown","BarChart","BarChart3","PieChart","Activity","Target","Crosshair","Compass","Navigation",
  "Globe","Wifi","Cloud","CloudUpload","CloudDownload","Database","Server","HardDrive","Cpu","Code",
  "Link","Link2","ExternalLink","Share","Share2","Copy","Clipboard","Edit","Edit2","Edit3",
  "Trash","Trash2","Plus","Minus","RotateCcw","RefreshCw","Repeat","Shuffle","ArrowRight","ArrowLeft",
  "ArrowUp","ArrowDown","ChevronRight","ChevronLeft","CornerDownRight","GitBranch","GitMerge","Workflow","Webhook","Plug",
  "Eye","EyeOff","Sun","Moon","Smile","Frown","ThumbsUp","ThumbsDown","Coffee","Pizza",
];

const COLORS = [
  { name: "Primário", value: "" },
  { name: "Azul", value: "#3B82F6" },
  { name: "Verde", value: "#22C55E" },
  { name: "Amarelo", value: "#EAB308" },
  { name: "Laranja", value: "#F97316" },
  { name: "Vermelho", value: "#DC2626" },
  { name: "Rosa", value: "#EC4899" },
  { name: "Roxo", value: "#8B5CF6" },
  { name: "Ciano", value: "#06B6D4" },
  { name: "Esmeralda", value: "#10B981" },
  { name: "Cinza", value: "#6B7280" },
  { name: "Preto", value: "#0F172A" },
];

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  currentIcon?: string;
  currentColor?: string;
  defaultIcon?: string;
  onSave: (icon: string | undefined, color: string | undefined) => void;
}

export const BlockIconCustomizer = ({
  open,
  onOpenChange,
  currentIcon,
  currentColor,
  defaultIcon,
  onSave,
}: Props) => {
  const [icon, setIcon] = useState<string | undefined>(currentIcon || defaultIcon);
  const [color, setColor] = useState<string | undefined>(currentColor || "");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return ICON_NAMES;
    return ICON_NAMES.filter((n) => n.toLowerCase().includes(q));
  }, [query]);

  const Preview = (Icons as any)[icon || defaultIcon || "Square"] as any;

  const handleSave = () => {
    onSave(
      icon && icon !== defaultIcon ? icon : undefined,
      color && color.length > 0 ? color : undefined,
    );
    onOpenChange(false);
  };

  const handleReset = () => {
    setIcon(defaultIcon);
    setColor("");
    onSave(undefined, undefined);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Personalizar Ícone do Bloco</DialogTitle>
          <DialogDescription>
            Escolha um ícone e uma cor para identificar visualmente este bloco no fluxo.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30">
          <div
            className="p-2 rounded-md border"
            style={{
              backgroundColor: color ? `${color}15` : undefined,
              borderColor: color ? `${color}40` : undefined,
            }}
          >
            {Preview && (
              <Preview
                className="w-6 h-6"
                style={{ color: color || undefined }}
              />
            )}
          </div>
          <div className="text-sm">
            <p className="font-medium">Pré-visualização</p>
            <p className="text-xs text-muted-foreground">
              {icon || defaultIcon || "Selecione um ícone"}
            </p>
          </div>
        </div>

        <div>
          <p className="text-sm font-medium mb-2">Cor</p>
          <div className="flex flex-wrap gap-2">
            {COLORS.map((c) => (
              <button
                key={c.name}
                type="button"
                onClick={() => setColor(c.value)}
                title={c.name}
                className={cn(
                  "w-8 h-8 rounded-full border-2 transition-all",
                  color === c.value ? "ring-2 ring-offset-2 ring-primary scale-110" : "",
                )}
                style={{
                  backgroundColor: c.value || "hsl(var(--primary))",
                  borderColor: c.value || "hsl(var(--primary))",
                }}
              />
            ))}
          </div>
        </div>

        <div>
          <Input
            placeholder="Buscar ícone..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="mb-2"
          />
          <div className="grid grid-cols-10 gap-1 max-h-64 overflow-y-auto p-1 border rounded-md">
            {filtered.map((name) => {
              const I = (Icons as any)[name];
              if (!I) return null;
              const isSelected = icon === name;
              return (
                <button
                  key={name}
                  type="button"
                  onClick={() => setIcon(name)}
                  title={name}
                  className={cn(
                    "p-2 rounded hover:bg-muted transition-colors flex items-center justify-center",
                    isSelected && "bg-primary/15 ring-2 ring-primary",
                  )}
                >
                  <I className="w-4 h-4" style={{ color: color || undefined }} />
                </button>
              );
            })}
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={handleReset}>
            Restaurar Padrão
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default BlockIconCustomizer;
