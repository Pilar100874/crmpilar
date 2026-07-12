import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Keyboard } from "lucide-react";

const SHORTCUTS: { keys: string[]; label: string }[] = [
  { keys: ["⌘", "K"], label: "Abrir busca global (Command Palette)" },
  { keys: ["Ctrl", "K"], label: "Abrir busca global (Windows/Linux)" },
  { keys: ["F1"], label: "Abrir busca global" },
  { keys: ["?"], label: "Abrir busca global (fora de campos de texto)" },
  { keys: ["Shift", "?"], label: "Mostrar esta lista de atalhos" },
  { keys: ["Esc"], label: "Fechar diálogos abertos" },
  { keys: ["↑", "↓"], label: "Navegar em listas do Command Palette" },
  { keys: ["↵"], label: "Confirmar / abrir item selecionado" },
];

export const AdsShortcutsDialog: React.FC = () => {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const inField = (e.target as HTMLElement)?.matches?.("input, textarea, [contenteditable]");
      if (e.shiftKey && e.key === "?" && !inField) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="h-4 w-4" /> Atalhos de teclado
          </DialogTitle>
          <DialogDescription>Aumente sua produtividade no painel de Ads.</DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          {SHORTCUTS.map((s, i) => (
            <div key={i} className="flex items-center justify-between text-sm py-1.5 border-b last:border-b-0">
              <span className="text-muted-foreground">{s.label}</span>
              <span className="flex gap-1">
                {s.keys.map((k, j) => (
                  <kbd key={j} className="px-1.5 py-0.5 rounded bg-muted text-xs font-mono">{k}</kbd>
                ))}
              </span>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};
