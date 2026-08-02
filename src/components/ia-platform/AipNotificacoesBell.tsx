import { Bell, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useAipNotificacoes } from "@/hooks/useAipNotificacoes";

const CORES: Record<string, string> = {
  erro: "bg-destructive",
  aviso: "bg-amber-500",
  sucesso: "bg-emerald-500",
  info: "bg-primary",
};

export default function AipNotificacoesBell() {
  const { notificacoes, naoLidas, marcarLida, marcarTodasLidas } = useAipNotificacoes();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="Notificações">
          <Bell className="h-5 w-5" />
          {naoLidas > 0 && (
            <Badge className="absolute -right-1 -top-1 h-5 min-w-5 justify-center px-1 text-[10px]">
              {naoLidas > 99 ? "99+" : naoLidas}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-96 p-0">
        <div className="flex items-center justify-between border-b border-border px-3 py-2">
          <p className="text-sm font-semibold">Notificações</p>
          <Button variant="ghost" size="sm" onClick={marcarTodasLidas} disabled={naoLidas === 0}>
            <CheckCheck className="mr-1 h-4 w-4" /> Marcar lidas
          </Button>
        </div>
        <ScrollArea className="max-h-96">
          {notificacoes.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">
              Nenhuma notificação por enquanto.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {notificacoes.map((n) => (
                <li
                  key={n.id}
                  onClick={() => !n.lida && marcarLida(n.id)}
                  className={cn(
                    "flex cursor-pointer gap-2 px-3 py-2 transition-colors hover:bg-muted/60",
                    !n.lida && "bg-primary/5",
                  )}
                >
                  <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", CORES[n.nivel] ?? "bg-muted-foreground")} />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{n.titulo}</p>
                    {n.mensagem && (
                      <p className="line-clamp-2 text-xs text-muted-foreground">{n.mensagem}</p>
                    )}
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      {new Date(n.created_at).toLocaleString("pt-BR")}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
