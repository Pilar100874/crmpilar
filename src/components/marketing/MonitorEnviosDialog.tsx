import { useCallback, useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CheckCircle2, XCircle, Loader2, AlertTriangle, RefreshCw, Radio, RotateCcw, Settings2, Pause, Play, PauseCircle, StopCircle } from "lucide-react";

interface RetryConfig {
  maxTentativas: number;
  backoffBaseSegundos: number;
  backoffFator: number;
  backoffMaxSegundos: number;
}

const RETRY_PADRAO: RetryConfig = { maxTentativas: 3, backoffBaseSegundos: 60, backoffFator: 2, backoffMaxSegundos: 900 };
const RETRY_STORAGE_KEY = "broadcast_retry_config";

function carregarRetryConfig(): RetryConfig {
  try {
    const raw = localStorage.getItem(RETRY_STORAGE_KEY);
    return raw ? { ...RETRY_PADRAO, ...JSON.parse(raw) } : RETRY_PADRAO;
  } catch {
    return RETRY_PADRAO;
  }
}

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
  pausado: "Pausado",
  cancelado: "Cancelado",
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

  const [reenviando, setReenviando] = useState(false);
  const [retry, setRetry] = useState<RetryConfig>(() => carregarRetryConfig());

  const atualizarRetry = useCallback((patch: Partial<RetryConfig>) => {
    setRetry((prev) => {
      const novo = { ...prev, ...patch };
      try { localStorage.setItem(RETRY_STORAGE_KEY, JSON.stringify(novo)); } catch { /* noop */ }
      return novo;
    });
  }, []);
  const falhasReenviaveis = itens.filter(
    (i) => i.status === "falha" && (i.telefone || "").replace(/\D/g, "").length >= 10,
  ).length;

  const reenviarFalhas = useCallback(async () => {
    if (!monitor?.id) return;
    setReenviando(true);
    try {
      const { data, error } = await supabase.functions.invoke("reenviar-falhas-broadcast", {
        body: { monitorId: monitor.id, ...retry },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      toast.success(
        `Reenviando ${(data as any)?.reenviando ?? ""} envio(s) que falharam — até ${retry.maxTentativas} tentativa(s) com intervalo crescente. Os já enviados foram preservados.`,
      );
      carregar();
    } catch (e: any) {
      toast.error(e?.message || "Não foi possível reenviar as falhas.");
    } finally {
      setReenviando(false);
    }
  }, [monitor?.id, carregar, retry]);


  const [alterandoStatus, setAlterandoStatus] = useState(false);
  const alterarStatus = useCallback(async (novo: "pausado" | "executando" | "cancelado") => {
    if (!monitor?.id) return;
    setAlterandoStatus(true);
    try {
      const { error } = await supabase
        .from("broadcast_monitor" as any)
        .update({
          status: novo,
          pausado_em: novo === "pausado" ? new Date().toISOString() : null,
          atualizado_em: new Date().toISOString(),
        })
        .eq("id", monitor.id);
      if (error) throw error;
      setMonitor((prev) => (prev ? { ...prev, status: novo } : prev));
      toast.success(
        novo === "pausado"
          ? "Disparo pausado. Os destinatários já processados foram preservados."
          : novo === "executando"
            ? "Disparo retomado de onde parou."
            : "Disparo cancelado. O status dos já processados foi mantido.",
      );
    } catch (e: any) {
      toast.error(e?.message || "Não foi possível alterar o status do disparo.");
    } finally {
      setAlterandoStatus(false);
    }
  }, [monitor?.id]);

  const total = monitor?.total || 0;
  const processados = (monitor?.enviados || 0) + (monitor?.falhas || 0);
  const restantes = Math.max(0, total - processados - (monitor?.pulados || 0));
  const pct = total > 0 ? Math.round((processados / total) * 100) : 0;
  const emAndamento = monitor?.status === "executando";
  const pausado = monitor?.status === "pausado";
  const ativo = emAndamento || pausado;

  // ===== Exportação do relatório (CSV / PDF) =====
  const nomeArquivo = useCallback(
    (ext: string) => {
      const base = (automationName || "disparo").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9]+/g, "-").toLowerCase();
      const d = monitor ? new Date(monitor.iniciado_em) : new Date();
      const stamp = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}-${String(d.getHours()).padStart(2, "0")}${String(d.getMinutes()).padStart(2, "0")}`;
      return `monitor-envios-${base}-${stamp}.${ext}`;
    },
    [automationName, monitor],
  );

  const baixar = (conteudo: BlobPart, nome: string, tipo: string) => {
    const url = URL.createObjectURL(new Blob([conteudo], { type: tipo }));
    const a = document.createElement("a");
    a.href = url;
    a.download = nome;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportarCSV = useCallback(() => {
    if (!monitor) return;
    const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const linhas: string[] = [];
    linhas.push(esc("Relatório do Monitor de Envios"));
    linhas.push([esc("Automação"), esc(automationName || "-")].join(";"));
    linhas.push([esc("Status"), esc(statusLabel[monitor.status] || monitor.status)].join(";"));
    linhas.push([esc("Início"), esc(new Date(monitor.iniciado_em).toLocaleString("pt-BR"))].join(";"));
    linhas.push([esc("Fim"), esc(monitor.finalizado_em ? new Date(monitor.finalizado_em).toLocaleString("pt-BR") : "-")].join(";"));
    linhas.push("");
    linhas.push([esc("Total"), esc("Enviados"), esc("Falhas"), esc("Inválidos"), esc("Pulados"), esc("Restantes"), esc("% concluído")].join(";"));
    linhas.push([total, monitor.enviados, monitor.falhas, monitor.invalidos, monitor.pulados, restantes, `${pct}%`].map(esc).join(";"));
    linhas.push("");
    linhas.push([esc("#"), esc("Nome"), esc("Telefone"), esc("Tipo"), esc("Status"), esc("Motivo"), esc("Mensagem")].join(";"));
    itens.forEach((i) => {
      linhas.push([i.ordem, i.nome || "", formatTelefone(i.telefone), i.tipo || "", i.status, i.motivo || "", (i.mensagem || "").replace(/\s+/g, " ")].map(esc).join(";"));
    });
    const falhasList = itens.filter((i) => i.status === "falha" || i.status === "invalido");
    if (falhasList.length) {
      linhas.push("");
      linhas.push(esc(`Falhas e inválidos (${falhasList.length})`));
      linhas.push([esc("#"), esc("Nome"), esc("Telefone"), esc("Status"), esc("Motivo")].join(";"));
      falhasList.forEach((i) => linhas.push([i.ordem, i.nome || "", formatTelefone(i.telefone), i.status, i.motivo || ""].map(esc).join(";")));
    }
    baixar("\uFEFF" + linhas.join("\n"), nomeArquivo("csv"), "text/csv;charset=utf-8;");
    toast.success("Relatório CSV exportado.");
  }, [monitor, itens, automationName, total, restantes, pct, nomeArquivo]);

  const exportarPDF = useCallback(async () => {
    if (!monitor) return;
    try {
      const { default: jsPDF } = await import("jspdf");
      const { default: autoTable } = await import("jspdf-autotable");
      const doc = new jsPDF({ orientation: "landscape", unit: "pt" });
      doc.setFontSize(14);
      doc.text("Relatório do Monitor de Envios", 40, 40);
      doc.setFontSize(9);
      doc.text(
        [
          `Automação: ${automationName || "-"}`,
          `Status: ${statusLabel[monitor.status] || monitor.status}`,
          `Início: ${new Date(monitor.iniciado_em).toLocaleString("pt-BR")}${monitor.finalizado_em ? `   |   Fim: ${new Date(monitor.finalizado_em).toLocaleString("pt-BR")}` : ""}`,
        ].join("\n"),
        40,
        58,
      );

      autoTable(doc, {
        startY: 100,
        head: [["Total", "Enviados", "Falhas", "Inválidos", "Pulados", "Restantes", "% concluído"]],
        body: [[total, monitor.enviados, monitor.falhas, monitor.invalidos, monitor.pulados, restantes, `${pct}%`].map(String)],
        styles: { fontSize: 9 },
        headStyles: { fillColor: [37, 99, 235] },
      });

      const falhasList = itens.filter((i) => i.status === "falha" || i.status === "invalido");
      if (falhasList.length) {
        autoTable(doc, {
          startY: (doc as any).lastAutoTable.finalY + 18,
          head: [[`Falhas e inválidos (${falhasList.length})`, "", "", ""]],
          body: [],
          styles: { fontSize: 9 },
          headStyles: { fillColor: [220, 38, 38] },
        });
        autoTable(doc, {
          startY: (doc as any).lastAutoTable.finalY,
          head: [["#", "Nome", "Telefone", "Motivo"]],
          body: falhasList.map((i) => [String(i.ordem), i.nome || "-", formatTelefone(i.telefone), i.motivo || "-"]),
          styles: { fontSize: 8, cellWidth: "wrap" },
          headStyles: { fillColor: [120, 120, 120] },
        });
      }

      autoTable(doc, {
        startY: (doc as any).lastAutoTable.finalY + 18,
        head: [["#", "Nome", "Telefone", "Status", "Mensagem enviada"]],
        body: itens.map((i) => [
          String(i.ordem),
          i.nome || "-",
          formatTelefone(i.telefone),
          i.status,
          (i.mensagem || "").replace(/\s+/g, " ").slice(0, 300),
        ]),
        styles: { fontSize: 8, overflow: "linebreak" },
        columnStyles: { 4: { cellWidth: 380 } },
        headStyles: { fillColor: [37, 99, 235] },
      });

      doc.save(nomeArquivo("pdf"));
      toast.success("Relatório PDF exportado.");
    } catch (e: any) {
      toast.error(e?.message || "Não foi possível gerar o PDF.");
    }
  }, [monitor, itens, automationName, total, restantes, pct, nomeArquivo]);




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
              {pausado && (
                <p className="text-xs mt-3 flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                  <PauseCircle className="w-3.5 h-3.5" />
                  Disparo pausado — {processados} já processados foram preservados. Retome para continuar de onde parou.
                </p>
              )}
              {ativo && (
                <div className="flex items-center gap-2 mt-3 flex-wrap">
                  {pausado ? (
                    <Button size="sm" onClick={() => alterarStatus("executando")} disabled={alterandoStatus}>
                      <Play className="w-3.5 h-3.5 mr-1" /> Retomar disparo
                    </Button>
                  ) : (
                    <Button size="sm" variant="outline" onClick={() => alterarStatus("pausado")} disabled={alterandoStatus}>
                      <Pause className="w-3.5 h-3.5 mr-1" /> Pausar disparo
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" className="text-destructive" onClick={() => alterarStatus("cancelado")} disabled={alterandoStatus}>
                    <StopCircle className="w-3.5 h-3.5 mr-1" /> Cancelar
                  </Button>
                </div>
              )}

              {monitor.erro && (
                <p className="text-xs mt-2 text-destructive flex items-start gap-1.5">
                  <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" /> {monitor.erro}
                </p>
              )}
            </div>

            {falhasReenviaveis > 0 && !ativo && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 flex items-center justify-between gap-3 flex-wrap">
                <p className="text-xs">
                  <span className="font-semibold text-destructive">{falhasReenviaveis} envio(s) com falha.</span>{" "}
                  <span className="text-muted-foreground">Reenvie somente estes — até {retry.maxTentativas} tentativa(s), intervalo inicial de {retry.backoffBaseSegundos}s. Os já enviados são preservados.</span>
                </p>
                <div className="flex items-center gap-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button size="sm" variant="outline">
                        <Settings2 className="w-3.5 h-3.5 mr-1" /> Retentativas
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80 space-y-3" align="end">
                      <div>
                        <p className="text-sm font-semibold">Configurar retentativas</p>
                        <p className="text-xs text-muted-foreground">
                          O intervalo entre rodadas cresce a cada tentativa (backoff). O progresso já enviado é sempre mantido.
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs">Limite de tentativas (1 a 10)</Label>
                        <Input
                          type="number" min={1} max={10} value={retry.maxTentativas}
                          onChange={(e) => atualizarRetry({ maxTentativas: Math.min(10, Math.max(1, Number(e.target.value) || 1)) })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs">Intervalo inicial (segundos)</Label>
                        <Input
                          type="number" min={5} max={3600} value={retry.backoffBaseSegundos}
                          onChange={(e) => atualizarRetry({ backoffBaseSegundos: Math.min(3600, Math.max(5, Number(e.target.value) || 5)) })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs">Multiplicador do intervalo (1 a 5)</Label>
                        <Input
                          type="number" min={1} max={5} step={0.5} value={retry.backoffFator}
                          onChange={(e) => atualizarRetry({ backoffFator: Math.min(5, Math.max(1, Number(e.target.value) || 1)) })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs">Intervalo máximo (segundos)</Label>
                        <Input
                          type="number" min={retry.backoffBaseSegundos} max={7200} value={retry.backoffMaxSegundos}
                          onChange={(e) => atualizarRetry({ backoffMaxSegundos: Math.min(7200, Math.max(retry.backoffBaseSegundos, Number(e.target.value) || retry.backoffBaseSegundos)) })}
                        />
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        Ex.: {retry.backoffBaseSegundos}s, depois {Math.min(retry.backoffMaxSegundos, Math.round(retry.backoffBaseSegundos * retry.backoffFator))}s,
                        até no máximo {retry.backoffMaxSegundos}s entre as rodadas.
                      </p>
                    </PopoverContent>
                  </Popover>
                  <Button size="sm" onClick={reenviarFalhas} disabled={reenviando}>
                    {reenviando ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5 mr-1" />}
                    Tentar novamente as falhas
                  </Button>
                </div>
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
