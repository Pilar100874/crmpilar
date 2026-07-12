import { useEffect, useState } from "react";
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from "@/components/ui/command";
import { LayoutDashboard, Target, Zap, Clock, Key, FileBarChart, Bell, FileText, Sparkles, PlayCircle, HelpCircle } from "lucide-react";

interface Props {
  onNavigate: (tab: string) => void;
}

const items = [
  { id: "dashboard", label: "Dashboard Geral", icon: LayoutDashboard, keywords: "inicio home resumo" },
  { id: "wizard", label: "Wizard de Setup", icon: Sparkles, keywords: "assistente configurar guia" },
  { id: "campaigns", label: "Campanhas", icon: Target, keywords: "anuncios ads" },
  { id: "automation", label: "Automações", icon: Zap, keywords: "regras robo automatico" },
  { id: "scheduler", label: "Agendamento", icon: Clock, keywords: "cron horario execucao" },
  { id: "connections", label: "Conexões", icon: Key, keywords: "credenciais tokens contas apps" },
  { id: "reports", label: "Relatórios", icon: FileBarChart, keywords: "export csv pdf" },
  { id: "alerts", label: "Alertas", icon: Bell, keywords: "notificacoes avisos" },
  { id: "logs", label: "Logs de Coleta", icon: FileText, keywords: "historico execucoes debug" },
];

const platforms = [
  { id: "google", label: "Google Ads" },
  { id: "meta", label: "Meta Ads (Facebook/Instagram)" },
  { id: "tiktok", label: "TikTok Ads" },
  { id: "mercadolivre", label: "Mercado Livre Ads" },
  { id: "amazon", label: "Amazon Ads" },
];

export const AdsCommandPalette: React.FC<Props> = ({ onNavigate }) => {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.key === "k" && (e.metaKey || e.ctrlKey)) || e.key === "F1") {
        e.preventDefault();
        setOpen((o) => !o);
      }
      if (e.key === "?" && !(e.target as HTMLElement)?.matches("input, textarea")) {
        e.preventDefault();
        setOpen(true);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const go = (tab: string) => {
    onNavigate(tab);
    setOpen(false);
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Buscar telas, ações, plataformas..." />
      <CommandList>
        <CommandEmpty>Nada encontrado.</CommandEmpty>
        <CommandGroup heading="Navegação">
          {items.map((i) => {
            const Icon = i.icon;
            return (
              <CommandItem key={i.id} value={`${i.label} ${i.keywords}`} onSelect={() => go(i.id)}>
                <Icon className="mr-2 h-4 w-4" /> {i.label}
              </CommandItem>
            );
          })}
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Dashboards por plataforma">
          {platforms.map((p) => (
            <CommandItem key={p.id} value={p.label} onSelect={() => go(p.id)}>
              <Target className="mr-2 h-4 w-4" /> {p.label}
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Ajuda">
          <CommandItem onSelect={() => go("wizard")}>
            <HelpCircle className="mr-2 h-4 w-4" /> Abrir Wizard de Configuração
          </CommandItem>
        </CommandGroup>
      </CommandList>
      <div className="border-t px-3 py-2 text-xs text-muted-foreground flex items-center gap-3">
        <span><kbd className="px-1.5 py-0.5 rounded bg-muted">⌘K</kbd> abrir</span>
        <span><kbd className="px-1.5 py-0.5 rounded bg-muted">↑↓</kbd> navegar</span>
        <span><kbd className="px-1.5 py-0.5 rounded bg-muted">↵</kbd> abrir</span>
        <span><kbd className="px-1.5 py-0.5 rounded bg-muted">Esc</kbd> fechar</span>
      </div>
    </CommandDialog>
  );
};
