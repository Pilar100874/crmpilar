import { useMemo, useState } from "react";
import * as LucideIcons from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

// Curated list of icons useful for menus / folders / programs
export const MENU_ICON_LIBRARY: string[] = [
  "Folder", "FolderOpen", "FolderPlus", "FolderTree", "Files", "FileText", "File",
  "LayoutGrid", "LayoutDashboard", "Grid3x3", "Grid2x2", "Menu", "List", "Rows3",
  "Home", "Building", "Building2", "Factory", "Store", "ShoppingBag", "ShoppingCart",
  "Package", "Boxes", "Box", "Archive", "Warehouse", "Truck", "Car", "Bike", "Plane",
  "Users", "User", "UserCog", "UserPlus", "Contact", "IdCard", "Briefcase",
  "Phone", "PhoneCall", "MessageSquare", "MessageCircle", "Mail", "Send", "Bell",
  "Calendar", "CalendarDays", "Clock", "Timer", "AlarmClock",
  "BarChart3", "BarChart", "LineChart", "PieChart", "TrendingUp", "Activity",
  "DollarSign", "CreditCard", "Wallet", "Receipt", "Banknote", "Coins",
  "Settings", "Settings2", "SlidersHorizontal", "Wrench", "Cog", "Tool" as any,
  "Shield", "ShieldCheck", "Lock", "Unlock", "Key", "KeyRound", "Eye",
  "Star", "Heart", "Bookmark", "Flag", "Award", "Trophy", "Gift", "Sparkles",
  "MapPin", "Map", "Navigation", "Compass", "Route", "Globe", "Globe2",
  "Camera", "Image", "Video", "Film", "Music", "Mic", "Headphones",
  "Zap", "Flame", "Rocket", "Lightbulb", "Battery", "Wifi", "Cloud",
  "Search", "Filter", "Tag", "Tags", "Link", "Paperclip", "Pin",
  "CheckSquare", "CheckCircle", "Circle", "Square", "Triangle", "Hexagon",
  "AlertTriangle", "AlertCircle", "Info", "HelpCircle", "Ban",
  "Play", "Pause", "StopCircle", "SkipForward", "Volume2",
  "Database", "Server", "HardDrive", "Cpu", "Monitor", "Smartphone", "Tablet",
  "Bot", "Brain", "Wand2", "Puzzle", "Layers", "Workflow", "Network", "GitBranch",
  "BookOpen", "Book", "GraduationCap", "School", "Newspaper", "FileSpreadsheet",
  "Palette", "Paintbrush", "Pencil", "Edit", "Type", "Highlighter",
  "Sun", "Moon", "Coffee", "Umbrella", "TreePine", "Leaf",
  "AppWindow", "LifeBuoy", "RefreshCw", "LogOut", "LogIn", "Power",
];

interface Props {
  value?: string | null;
  onChange: (iconName: string | null) => void;
  trigger?: React.ReactNode;
  size?: number;
}

export function MenuIconPicker({ value, onChange, trigger, size = 16 }: Props) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");

  const IconsMap = LucideIcons as unknown as Record<string, React.ComponentType<any>>;
  const Current = (value && IconsMap[value]) || LucideIcons.Folder;

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    const seen = new Set<string>();
    const list = MENU_ICON_LIBRARY.filter((name) => {
      if (seen.has(name)) return false;
      seen.add(name);
      if (!IconsMap[name]) return false;
      return !query || name.toLowerCase().includes(query);
    });
    return list;
  }, [q, IconsMap]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {trigger ?? (
          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6"
            title="Escolher ícone"
            onClick={(e) => e.stopPropagation()}
          >
            <Current className="w-3.5 h-3.5" />
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-72 p-3 bg-popover z-50"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 mb-2">
          <Input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar ícone..."
            className="h-8 text-xs"
          />
          {value && (
            <Button
              size="sm"
              variant="ghost"
              className="h-8 px-2 text-xs"
              onClick={() => {
                onChange(null);
                setOpen(false);
              }}
              title="Restaurar ícone padrão"
            >
              Padrão
            </Button>
          )}
        </div>
        <ScrollArea className="h-64">
          <div className="grid grid-cols-8 gap-1 pr-2">
            {filtered.map((name) => {
              const Icon = IconsMap[name];
              const active = value === name;
              return (
                <button
                  key={name}
                  onClick={() => {
                    onChange(name);
                    setOpen(false);
                  }}
                  title={name}
                  className={cn(
                    "h-8 w-8 flex items-center justify-center rounded-md hover:bg-muted transition-colors",
                    active && "bg-primary/15 ring-2 ring-primary"
                  )}
                >
                  <Icon className="w-4 h-4" style={{ width: size, height: size }} />
                </button>
              );
            })}
            {filtered.length === 0 && (
              <div className="col-span-8 text-xs text-muted-foreground text-center py-6">
                Nenhum ícone encontrado
              </div>
            )}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}

export function resolveMenuIcon(iconName?: string | null): React.ComponentType<any> | null {
  if (!iconName) return null;
  const IconsMap = LucideIcons as unknown as Record<string, React.ComponentType<any>>;
  return IconsMap[iconName] || null;
}
