import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Clock, MessageSquare, Image as ImageIcon, Video, FileText, Music, Bell, Webhook, Users, CheckCircle2, XCircle, Eye, ChevronDown, ChevronUp } from "lucide-react";
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
  providerStatus?: string | null;
  messageId?: string | null;
  attempts?: number | null;
  startedAt?: string | null;
  finishedAt?: string | null;
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

type StatusKind = "ack" | "pendente" | "enviado" | "invalido" | "falha" | "outro";
function normalizeStatus(r: Recipient): StatusKind {
  const s = String(r.status || "").toLowerCase();
  if (s === "ack") return "ack";
  if (s === "pendente" || s === "pending") return "pendente";
  if (s === "invalido" || s === "invalid") return "invalido";
  if (s === "enviado" || s === "ok") return "enviado";
  if (s === "falha" || s === "erro" || s === "error") return "falha";
  return "outro";
}
function StatusPill({ r }: { r: Recipient }) {
  const k = normalizeStatus(r);
  const cfg: Record<StatusKind, { label: string; cls: string; title?: string }> = {
    ack:      { label: "Entregue (ACK)", cls: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30" },
    enviado:  { label: "Enviado",        cls: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30" },
    pendente: { label: "PENDING",        cls: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
                title: "Aceito pelo Evolution mas ainda sem confirmação do WhatsApp" },
    invalido: { label: "Inválido",       cls: "bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/30" },
    falha:    { label: "Falha",          cls: "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30" },
    outro:    { label: r.status || "—",  cls: "bg-muted text-muted-foreground border-border" },
  };
  const c = cfg[k];
  return (
    <span
      title={r.motivo || c.title || ""}
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${c.cls}`}
    >
      {c.label}
      {r.attempts && r.attempts > 1 ? <span className="opacity-70">·{r.attempts}x</span> : null}
    </span>
  );
}
function fmtHms(iso?: string | null) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  } catch { return ""; }
}

export default function HistoricoEnviosDialog({ open, onOpenChange, automationId, automationName }: Props) {
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [detalhe, setDetalhe] = useState<LogRow | null>(null);


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

        <ScrollArea className="flex-1 min-h-0 max-h-[70vh] pr-4 -mr-4">

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

                      {/* Resumo por status */}
                      {log.recipients?.length > 0 && (() => {
                        const c = { ack: 0, enviado: 0, pendente: 0, invalido: 0, falha: 0, outro: 0 };
                        for (const r of log.recipients) c[normalizeStatus(r)]++;
                        return (
                          <div className="flex flex-wrap gap-1.5">
                            {c.ack > 0 && <span className="text-[10px] rounded-full border px-2 py-0.5 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30">{c.ack} entregue{c.ack > 1 ? "s" : ""} (ACK)</span>}
                            {c.enviado > 0 && <span className="text-[10px] rounded-full border px-2 py-0.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">{c.enviado} enviado{c.enviado > 1 ? "s" : ""}</span>}
                            {c.pendente > 0 && <span className="text-[10px] rounded-full border px-2 py-0.5 bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30">{c.pendente} PENDING</span>}
                            {c.invalido > 0 && <span className="text-[10px] rounded-full border px-2 py-0.5 bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/30">{c.invalido} inválido{c.invalido > 1 ? "s" : ""}</span>}
                            {c.falha > 0 && <span className="text-[10px] rounded-full border px-2 py-0.5 bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30">{c.falha} falha{c.falha > 1 ? "s" : ""}</span>}
                          </div>
                        );
                      })()}

                      {/* Prévia + botão para ver detalhes */}
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="text-xs text-muted-foreground flex items-center gap-3">
                          <span className="inline-flex items-center gap-1">
                            <MessageSquare className="w-3.5 h-3.5" /> {log.items?.length ?? 0} itens
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <Users className="w-3.5 h-3.5" /> {enviados}/{total}{falhas ? ` · ${falhas} falhas` : ""}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => setDetalhe(log)}
                            className="h-7 px-2 text-xs"
                          >
                            <Eye className="w-3.5 h-3.5 mr-1" />
                            Linha do tempo
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setExpanded((p) => ({ ...p, [log.id]: !p[log.id] }))}
                            className="h-7 px-2 text-xs"
                          >
                            {expanded[log.id] ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          </Button>
                        </div>
                      </div>

                      {expanded[log.id] && (
                        <>
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

                          <div className="space-y-2">
                            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
                              <Users className="w-3 h-3" />
                              Destinatários {total > 0 && `(${enviados}/${total}${falhas ? ` · ${falhas} falhas` : ""})`}
                            </p>
                            {log.recipients?.length > 0 ? (
                              <div className="max-h-56 overflow-y-auto rounded-md border divide-y">
                                {log.recipients.map((r, i) => (
                                  <div key={i} className="px-2 py-1.5 flex items-center gap-2 text-xs hover:bg-muted/50">
                                    <div className="flex-1 min-w-0">
                                      <div className="font-medium truncate">{r.nome || r.telefone || r.email || "—"}</div>
                                      <div className="text-[10px] text-muted-foreground truncate">
                                        {r.telefone || r.email || ""}
                                        {r.motivo ? ` · ${r.motivo}` : ""}
                                      </div>
                                    </div>
                                    <StatusPill r={r} />
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-xs text-muted-foreground italic">Sem destinatários registrados.</p>
                            )}
                          </div>
                        </>
                      )}

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

      {/* Dialog de detalhes de um envio específico */}
      <Dialog open={!!detalhe} onOpenChange={(o) => !o && setDetalhe(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>O que foi enviado</DialogTitle>
            <DialogDescription>
              {detalhe && (
                <>
                  {new Date(detalhe.executed_at).toLocaleDateString("pt-BR")} às{" "}
                  {new Date(detalhe.executed_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                  {detalhe.metodo ? ` · ${detalhe.metodo}` : ""}
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="flex-1 min-h-0 max-h-[70vh] pr-4 -mr-4">
            {detalhe && (
              <div className="space-y-4">
                {detalhe.items?.length ? (
                  <div className="space-y-2">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Conteúdo ({detalhe.items.length})
                    </p>
                    {detalhe.items.map((it, idx) => (
                      <div key={idx} className="flex gap-3 rounded-md bg-muted/40 p-3">
                        <div className="mt-0.5 text-muted-foreground shrink-0">{iconFor(it.tipo)}</div>
                        <div className="flex-1 min-w-0 space-y-1">
                          <p className="text-[10px] uppercase text-muted-foreground">{it.tipo}</p>
                          {it.titulo && <p className="text-sm font-medium">{it.titulo}</p>}
                          {it.url && (it.tipo === "imagem" ? (
                            <img src={it.url} alt="" className="max-h-72 rounded border object-contain" />
                          ) : it.tipo === "video" ? (
                            <video src={it.url} controls className="max-h-72 rounded border" />
                          ) : it.tipo === "audio" ? (
                            <audio src={it.url} controls className="w-full" />
                          ) : (
                            <a href={it.url} target="_blank" rel="noreferrer" className="text-xs text-primary underline break-all">
                              {it.nome || it.url}
                            </a>
                          ))}
                          {(it.conteudo || it.legenda) && (
                            <p className="text-sm whitespace-pre-wrap break-words">{it.conteudo || it.legenda}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground italic">Nenhum conteúdo registrado neste envio.</p>
                )}

                {detalhe.recipients?.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
                      <Users className="w-3 h-3" /> Destinatários ({detalhe.recipients.length})
                    </p>
                    <div className="rounded-md border">
                      <table className="w-full text-xs">
                        <tbody>
                          {detalhe.recipients.map((r, i) => (
                            <tr key={i} className="border-b last:border-0">
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
                  </div>
                )}

                {detalhe.error_message && (
                  <p className="text-xs text-destructive">{detalhe.error_message}</p>
                )}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}

