import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Clock, MessageSquare, Image as ImageIcon, Video, FileText, Music, Bell, Webhook, Users, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "@/lib/toast-config";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  automationId: string | null;
  automationName?: string;
}

interface LogItem {
  tipo: string;
  conteudo?: string;
  titulo?: string;
  url?: string;
  legenda?: string;
  nome?: string;
}
interface Recipient {
  nome?: string | null;
  telefone?: string | null;
  email?: string | null;
  status?: string | null;
  motivo?: string | null;
}
interface LogRow {
  id: string;
  executed_at: string;
  metodo: string | null;
  status: string;
  error_message: string | null;
  items: LogItem[];
  recipients: Recipient[];
  totals: { total?: number; enviados?: number; falhas?: number };
}

const iconFor = (tipo: string) => {
  switch (tipo) {
    case "imagem": return <ImageIcon className="w-4 h-4" />;
    case "video": return <Video className="w-4 h-4" />;
    case "audio": return <Music className="w-4 h-4" />;
    case "arquivo": return <FileText className="w-4 h-4" />;
    case "push": return <Bell className="w-4 h-4" />;
    case "webhook": return <Webhook className="w-4 h-4" />;
    default: return <MessageSquare className="w-4 h-4" />;
  }
};

export default function HistoricoEnviosDialog({ open, onOpenChange, automationId, automationName }: Props) {
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<LogRow[]>([]);

  useEffect(() => {
    if (!open || !automationId) return;
    (async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("marketing_automation_execution_logs" as any)
          .select("*")
          .eq("automation_id", automationId)
          .order("executed_at", { ascending: false })
          .limit(100);
        if (error) throw error;
        setLogs((data as any) || []);
      } catch (e: any) {
        toast.error("Erro ao carregar histórico: " + (e?.message ?? e));
      } finally {
        setLoading(false);
      }
    })();
  }, [open, automationId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Histórico de envios</DialogTitle>
          <DialogDescription>
            {automationName ? `Automação: ${automationName}` : "Sequência do que foi enviado"}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4 -mr-4">
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-32 w-full" />
              ))}
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Clock className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Nenhum envio registrado ainda.</p>
            </div>
          ) : (
            <div className="relative pl-6 space-y-6">
              {/* linha vertical da timeline */}
              <div className="absolute left-2 top-1 bottom-1 w-px bg-border" />
              {logs.map((log) => {
                const when = new Date(log.executed_at);
                const total = log.totals?.total ?? 0;
                const enviados = log.totals?.enviados ?? 0;
                const falhas = log.totals?.falhas ?? 0;
                return (
                  <div key={log.id} className="relative">
                    <div className="absolute -left-[22px] top-1.5 w-3 h-3 rounded-full bg-primary ring-4 ring-background" />
                    <div className="rounded-lg border bg-card p-4 space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2 text-sm font-medium">
                          <Clock className="w-4 h-4 text-muted-foreground" />
                          {when.toLocaleDateString("pt-BR")} às {when.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                        </div>
                        <div className="flex items-center gap-1.5">
                          {log.metodo && <Badge variant="outline" className="text-[10px]">{log.metodo}</Badge>}
                          {log.status === "ok" ? (
                            <Badge className="text-[10px] bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
                              <CheckCircle2 className="w-3 h-3 mr-1" /> Sucesso
                            </Badge>
                          ) : (
                            <Badge variant="destructive" className="text-[10px]">
                              <XCircle className="w-3 h-3 mr-1" /> Falha
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Conteúdo enviado */}
                      {log.items?.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                            Conteúdo enviado ({log.items.length})
                          </p>
                          <div className="space-y-2">
                            {log.items.map((it, idx) => (
                              <div key={idx} className="flex gap-3 rounded-md bg-muted/40 p-2.5">
                                <div className="mt-0.5 text-muted-foreground shrink-0">{iconFor(it.tipo)}</div>
                                <div className="flex-1 min-w-0 space-y-1">
                                  <p className="text-[10px] uppercase text-muted-foreground">{it.tipo}</p>
                                  {it.titulo && <p className="text-sm font-medium">{it.titulo}</p>}
                                  {it.url && (it.tipo === "imagem" ? (
                                    <img src={it.url} alt="" className="max-h-40 rounded border object-cover" />
                                  ) : it.tipo === "video" ? (
                                    <video src={it.url} controls className="max-h-40 rounded border" />
                                  ) : it.tipo === "audio" ? (
                                    <audio src={it.url} controls className="w-full" />
                                  ) : (
                                    <a href={it.url} target="_blank" rel="noreferrer" className="text-xs text-primary underline break-all">
                                      {it.nome || it.url}
                                    </a>
                                  ))}
                                  {(it.conteudo || it.legenda) && (
                                    <p className="text-xs whitespace-pre-wrap break-words">{it.conteudo || it.legenda}</p>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Destinatários */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
                            <Users className="w-3 h-3" />
                            Destinatários {total > 0 && `(${enviados}/${total}${falhas ? ` · ${falhas} falhas` : ""})`}
                          </p>
                        </div>
                        {log.recipients?.length > 0 ? (
                          <div className="max-h-40 overflow-y-auto rounded-md border">
                            <table className="w-full text-xs">
                              <tbody>
                                {log.recipients.map((r, i) => (
                                  <tr key={i} className="border-b last:border-0 hover:bg-muted/50">
                                    <td className="px-2 py-1.5">{r.nome || "—"}</td>
                                    <td className="px-2 py-1.5 text-muted-foreground">{r.telefone || r.email || "—"}</td>
                                    <td className="px-2 py-1.5 text-right">
                                      {r.status === "enviado" || r.status === "ok" ? (
                                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 inline" />
                                      ) : (
                                        <span className="text-destructive" title={r.motivo || ""}>
                                          <XCircle className="w-3.5 h-3.5 inline" />
                                        </span>
                                      )}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <p className="text-xs text-muted-foreground italic">Sem destinatários registrados.</p>
                        )}
                      </div>

                      {log.error_message && (
                        <p className="text-xs text-destructive">{log.error_message}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
