import { useCallback, useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CheckCircle2, XCircle, Loader2, AlertTriangle, RefreshCw, Radio, RotateCcw } from "lucide-react";

interface Monitor {
  id: string;
  status: string;
  total: number;
  enviados: number;
  falhas: number;
  invalidos: number;
  pulados: number;
  atual: number;
  atual_nome: string | null;
  atual_telefone: string | null;
  mensagem_base: string | null;
  erro: string | null;
  iniciado_em: string;
  finalizado_em: string | null;
}

interface MonitorItem {
  id: string;
  ordem: number;
  nome: string | null;
  telefone: string | null;
  tipo: string | null;
  status: string;
  mensagem: string | null;
  motivo: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  automationId: string | null;
  automationName?: string;
}

const statusLabel: Record<string, string> = {
  executando: "Em andamento",
  concluido: "Concluído",
  parcial: "Concluído com falhas",
  falha: "Falhou",
  bloqueado: "Bloqueado",
};

function formatTelefone(tel?: string | null) {
  const d = (tel || "").replace(/\D/g, "");
  if (d.length === 13) return `+${d.slice(0, 2)} (${d.slice(2, 4)}) ${d.slice(4, 9)}-${d.slice(9)}`;
  if (d.length === 12) return `+${d.slice(0, 2)} (${d.slice(2, 4)}) ${d.slice(4, 8)}-${d.slice(8)}`;
  return tel || "";
}

export default function MonitorEnviosDialog({ open, onOpenChange, automationId, automationName }: Props) {
  const [monitor, setMonitor] = useState<Monitor | null>(null);
  const [itens, setItens] = useState<MonitorItem[]>([]);
  const [loading, setLoading] = useState(false);
  const listEndRef = useRef<HTMLDivElement | null>(null);

  const carregar = useCallback(async () => {
    if (!automationId) return;
    setLoading(true);
    const { data } = await supabase
      .from("broadcast_monitor" as any)
      .select("*")
      .eq("automation_id", automationId)
      .order("iniciado_em", { ascending: false })
      .limit(1)
      .maybeSingle();
    const mon = (data as any) || null;
    setMonitor(mon);
    if (mon?.id) {
      const { data: its } = await supabase
        .from("broadcast_monitor_itens" as any)
        .select("*")
        .eq("monitor_id", mon.id)
        .order("ordem", { ascending: true });
      setItens(((its as any) || []) as MonitorItem[]);
    } else {
      setItens([]);
    }
    setLoading(false);
  }, [automationId]);

  useEffect(() => {
    if (!open) return;
    carregar();
  }, [open, carregar]);

  // Realtime: acompanha o disparo mensagem por mensagem
  useEffect(() => {
    if (!open || !automationId) return;
    const channel = supabase
      .channel(`monitor-envios-${automationId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "broadcast_monitor", filter: `automation_id=eq.${automationId}` },
        (payload) => {
          const novo = payload.new as any;
          if (!novo) return;
          setMonitor((prev) => (!prev || prev.id === novo.id || new Date(novo.iniciado_em) >= new Date(prev.iniciado_em) ? novo : prev));
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "broadcast_monitor_itens" },
        (payload) => {
          const item = (payload.new || payload.old) as any;
          if (!item) return;
          setMonitor((prev) => {
            if (!prev || item.monitor_id !== prev.id) return prev;
            setItens((old) => {
              const idx = old.findIndex((i) => i.id === item.id);
              if (idx === -1) return [...old, item as MonitorItem].sort((a, b) => a.ordem - b.ordem);
              const copia = [...old];
              copia[idx] = item as MonitorItem;
              return copia;
            });
            return prev;
          });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [open, automationId]);

  useEffect(() => {
    listEndRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [itens.length]);

  const total = monitor?.total || 0;
  const processados = (monitor?.enviados || 0) + (monitor?.falhas || 0);
  const restantes = Math.max(0, total - processados - (monitor?.pulados || 0));
  const pct = total > 0 ? Math.round((processados / total) * 100) : 0;
  const emAndamento = monitor?.status === "executando";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Radio className={`w-4 h-4 ${emAndamento ? "text-emerald-500 animate-pulse" : "text-muted-foreground"}`} />
            Monitor de envios
          </DialogTitle>
          <DialogDescription>
            {automationName ? `Acompanhe o disparo em massa de "${automationName}" em tempo real.` : "Acompanhe o disparo em massa em tempo real."}
          </DialogDescription>
        </DialogHeader>

        {!monitor ? (
          <div className="py-10 text-center text-sm text-muted-foreground">
            {loading ? "Carregando..." : "Nenhum disparo em massa registrado para esta automação ainda."}
          </div>
        ) : (
          <div className="flex-1 min-h-0 flex flex-col gap-4">
            <div className="rounded-lg border p-3 sm:p-4 bg-muted/30">
              <div className="flex items-center justify-between gap-2 mb-2">
                <Badge variant={emAndamento ? "default" : monitor.status === "concluido" ? "secondary" : "outline"}>
                  {statusLabel[monitor.status] || monitor.status}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  Início: {new Date(monitor.iniciado_em).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>

              <Progress value={pct} className="h-2.5" />
              <div className="flex items-center justify-between mt-1.5 text-xs">
                <span className="font-medium">{processados} de {total} ({pct}%)</span>
                <span className="text-muted-foreground">{restantes} restantes</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3">
                <div className="rounded-md border bg-background p-2 text-center">
                  <p className="text-[10px] uppercase text-muted-foreground">Enviados</p>
                  <p className="text-base font-semibold text-emerald-600 dark:text-emerald-400">{monitor.enviados}</p>
                </div>
                <div className="rounded-md border bg-background p-2 text-center">
                  <p className="text-[10px] uppercase text-muted-foreground">Falhas</p>
                  <p className="text-base font-semibold text-destructive">{monitor.falhas}</p>
                </div>
                <div className="rounded-md border bg-background p-2 text-center">
                  <p className="text-[10px] uppercase text-muted-foreground">Inválidos</p>
                  <p className="text-base font-semibold text-amber-600 dark:text-amber-400">{monitor.invalidos}</p>
                </div>
                <div className="rounded-md border bg-background p-2 text-center">
                  <p className="text-[10px] uppercase text-muted-foreground">Pulados</p>
                  <p className="text-base font-semibold text-muted-foreground">{monitor.pulados}</p>
                </div>
              </div>

              {emAndamento && monitor.atual_nome && (
                <p className="text-xs mt-3 flex items-center gap-1.5">
                  <Loader2 className="w-3 h-3 animate-spin text-primary" />
                  Enviando #{monitor.atual}: <span className="font-medium">{monitor.atual_nome}</span>
                  <span className="text-muted-foreground">{formatTelefone(monitor.atual_telefone)}</span>
                </p>
              )}
              {monitor.erro && (
                <p className="text-xs mt-2 text-destructive flex items-start gap-1.5">
                  <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" /> {monitor.erro}
                </p>
              )}
            </div>

            {falhasReenviaveis > 0 && !emAndamento && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 flex items-center justify-between gap-3 flex-wrap">
                <p className="text-xs">
                  <span className="font-semibold text-destructive">{falhasReenviaveis} envio(s) com falha.</span>{" "}
                  <span className="text-muted-foreground">Reenvie somente estes — os já enviados são preservados.</span>
                </p>
                <Button size="sm" onClick={reenviarFalhas} disabled={reenviando}>
                  {reenviando ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5 mr-1" />}
                  Tentar novamente as falhas
                </Button>
              </div>
            )}

            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Mensagem por mensagem</p>
              <Button variant="ghost" size="sm" onClick={carregar} disabled={loading}>
                <RefreshCw className={`w-3.5 h-3.5 mr-1 ${loading ? "animate-spin" : ""}`} /> Atualizar
              </Button>
            </div>


            <ScrollArea className="flex-1 min-h-0 rounded-lg border">
              <div className="divide-y">
                {itens.length === 0 && (
                  <p className="p-4 text-sm text-muted-foreground text-center">Aguardando o primeiro envio...</p>
                )}
                {itens.map((item) => (
                  <div key={item.id} className="p-3 flex gap-3">
                    <div className="pt-0.5">
                      {item.status === "enviado" ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      ) : item.status === "enviando" ? (
                        <Loader2 className="w-4 h-4 animate-spin text-primary" />
                      ) : item.status === "invalido" ? (
                        <AlertTriangle className="w-4 h-4 text-amber-500" />
                      ) : (
                        <XCircle className="w-4 h-4 text-destructive" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs text-muted-foreground">#{item.ordem}</span>
                        <span className="text-sm font-medium truncate">{item.nome || formatTelefone(item.telefone)}</span>
                        <span className="text-xs text-muted-foreground">{formatTelefone(item.telefone)}</span>
                      </div>
                      {item.mensagem && (
                        <p className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap line-clamp-4">{item.mensagem}</p>
                      )}
                      {item.motivo && <p className="text-xs text-destructive mt-1">{item.motivo}</p>}
                    </div>
                  </div>
                ))}
                <div ref={listEndRef} />
              </div>
            </ScrollArea>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
