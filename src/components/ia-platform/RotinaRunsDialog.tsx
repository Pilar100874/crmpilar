import { useCallback, useEffect, useMemo, useState } from "react";
import { db } from "@/lib/aip/db";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  Download,
  ExternalLink,
  Loader2,
  RefreshCw,
  SkipForward,
} from "lucide-react";

const dt = (v?: string | null) => (v ? new Date(v).toLocaleString("pt-BR") : "—");

const dur = (ms?: number | null) => {
  if (ms == null) return "—";
  if (ms < 1000) return `${ms} ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)} s`;
  return `${Math.floor(ms / 60000)}m ${Math.round((ms % 60000) / 1000)}s`;
};

type StatusUi = "queued" | "running" | "completed" | "failed";

const STATUS_MAP: Record<string, StatusUi> = {
  agendada: "queued",
  ignorada: "queued",
  pendente: "queued",
  aguardando: "queued",
  executando: "running",
  running: "running",
  concluida: "completed",
  concluido: "completed",
  sucesso: "completed",
  erro: "failed",
  falha: "failed",
  cancelada: "failed",
};

const statusUi = (s?: string | null): StatusUi => STATUS_MAP[String(s ?? "").toLowerCase()] ?? "queued";

const STATUS_INFO: Record<StatusUi, { label: string; className: string; Icon: typeof Clock }> = {
  queued: { label: "Na fila", className: "bg-muted text-muted-foreground", Icon: Clock },
  running: { label: "Executando", className: "bg-primary/15 text-primary", Icon: Loader2 },
  completed: { label: "Concluída", className: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400", Icon: CheckCircle2 },
  failed: { label: "Falhou", className: "bg-destructive/15 text-destructive", Icon: AlertCircle },
};

function StatusBadge({ status, small }: { status: StatusUi; small?: boolean }) {
  const info = STATUS_INFO[status];
  const Icon = info.Icon;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium ${info.className} ${small ? "text-[10px]" : "text-xs"}`}
    >
      <Icon className={`h-3 w-3 ${status === "running" ? "animate-spin" : ""}`} />
      {info.label}
    </span>
  );
}

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  rotinaId?: string | null;
  rotinaNome?: string;
}

interface RunDetalhe {
  steps: any[];
  assets: any[];
  execution: any | null;
  carregando: boolean;
}

export function RotinaRunsDialog({ open, onOpenChange, rotinaId, rotinaNome }: Props) {
  const [runs, setRuns] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [filtro, setFiltro] = useState<StatusUi | "todos">("todos");
  const [aberto, setAberto] = useState<string | null>(null);
  const [detalhes, setDetalhes] = useState<Record<string, RunDetalhe>>({});

  const carregar = useCallback(async () => {
    if (!rotinaId) return;
    setCarregando(true);
    const { data } = await db
      .from("aip_rotina_runs" as any)
      .select("*")
      .eq("rotina_id", rotinaId)
      .order("iniciado_em", { ascending: false })
      .limit(100);
    setRuns((data as any[]) ?? []);
    setCarregando(false);
  }, [rotinaId]);

  useEffect(() => {
    if (open) {
      setAberto(null);
      setDetalhes({});
      setFiltro("todos");
      carregar();
    }
  }, [open, carregar]);

  // Auto-refresh enquanto houver disparo em andamento
  useEffect(() => {
    if (!open) return;
    const ativo = runs.some((r) => statusUi(r.status) === "running");
    if (!ativo) return;
    const t = setInterval(carregar, 10000);
    return () => clearInterval(t);
  }, [open, runs, carregar]);

  const carregarDetalhe = useCallback(async (run: any) => {
    setDetalhes((d) => ({ ...d, [run.id]: { steps: [], assets: [], execution: null, carregando: true } }));
    const execId = run.execution_id;
    if (!execId) {
      setDetalhes((d) => ({ ...d, [run.id]: { steps: [], assets: [], execution: null, carregando: false } }));
      return;
    }
    const [stepsRes, assetsRes, execRes] = await Promise.all([
      db.from("aip_execution_steps" as any).select("*").eq("execution_id", execId).order("ordem", { ascending: true }),
      db.from("aip_assets" as any).select("*").eq("execution_id", execId).order("created_at", { ascending: true }),
      db.from("aip_executions" as any).select("*").eq("id", execId).maybeSingle(),
    ]);
    setDetalhes((d) => ({
      ...d,
      [run.id]: {
        steps: (stepsRes.data as any[]) ?? [],
        assets: (assetsRes.data as any[]) ?? [],
        execution: (execRes.data as any) ?? null,
        carregando: false,
      },
    }));
  }, []);

  const alternar = (run: any) => {
    if (aberto === run.id) {
      setAberto(null);
      return;
    }
    setAberto(run.id);
    if (!detalhes[run.id]) carregarDetalhe(run);
  };

  const contagens = useMemo(() => {
    const base: Record<string, number> = { todos: runs.length, queued: 0, running: 0, completed: 0, failed: 0 };
    runs.forEach((r) => {
      base[statusUi(r.status)] += 1;
    });
    return base;
  }, [runs]);

  const filtrados = useMemo(
    () => (filtro === "todos" ? runs : runs.filter((r) => statusUi(r.status) === filtro)),
    [runs, filtro],
  );

  const baixarLog = (run: any) => {
    const d = detalhes[run.id];
    const conteudo = JSON.stringify(
      { run, execution: d?.execution ?? null, steps: d?.steps ?? [], artefatos: d?.assets ?? [] },
      null,
      2,
    );
    const url = URL.createObjectURL(new Blob([conteudo], { type: "application/json" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `rotina-run-${run.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] max-w-4xl overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Disparos — {rotinaNome}
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={carregar} disabled={carregando}>
              <RefreshCw className={`h-4 w-4 ${carregando ? "animate-spin" : ""}`} />
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-wrap gap-2">
          {(["todos", "queued", "running", "completed", "failed"] as const).map((f) => (
            <Button
              key={f}
              size="sm"
              variant={filtro === f ? "default" : "outline"}
              className="h-7 text-xs"
              onClick={() => setFiltro(f)}
            >
              {f === "todos" ? "Todos" : STATUS_INFO[f].label}
              <span className="ml-1 opacity-70">{contagens[f] ?? 0}</span>
            </Button>
          ))}
        </div>

        <ScrollArea className="max-h-[62vh] pr-3">
          {carregando && runs.length === 0 ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : filtrados.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Nenhum disparo neste filtro.</p>
          ) : (
            <ul className="space-y-2">
              {filtrados.map((run) => {
                const st = statusUi(run.status);
                const d = detalhes[run.id];
                const expandido = aberto === run.id;
                return (
                  <li key={run.id} className="rounded-lg border border-border bg-card">
                    <button
                      type="button"
                      onClick={() => alternar(run)}
                      className="flex w-full items-center gap-2 px-3 py-2.5 text-left hover:bg-muted/50"
                    >
                      {expandido ? (
                        <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                      )}
                      <StatusBadge status={st} />
                      <span className="text-sm">{dt(run.iniciado_em)}</span>
                      <div className="ml-auto flex flex-wrap items-center justify-end gap-1">
                        <Badge variant="secondary" className="text-[10px]">{run.origem}</Badge>
                        {run.tentativa != null && run.tentativa > 1 && (
                          <Badge variant="outline" className="text-[10px]">tentativa {run.tentativa}</Badge>
                        )}
                        {run.motivo_bloqueio && (
                          <Badge variant="outline" className="gap-1 text-[10px]">
                            <SkipForward className="h-3 w-3" />
                            {run.motivo_bloqueio}
                          </Badge>
                        )}
                        <Badge variant="outline" className="text-[10px]">{dur(run.duracao_ms)}</Badge>
                      </div>
                    </button>

                    {expandido && (
                      <div className="space-y-3 border-t border-border px-3 py-3 text-xs">
                        <div className="grid gap-1 sm:grid-cols-2">
                          <p className="text-muted-foreground">Início: <span className="text-foreground">{dt(run.iniciado_em)}</span></p>
                          <p className="text-muted-foreground">Fim: <span className="text-foreground">{dt(run.finalizado_em)}</span></p>
                          <p className="text-muted-foreground">Status bruto: <span className="text-foreground">{run.status}</span></p>
                          <p className="text-muted-foreground">Execução: <span className="font-mono text-foreground">{run.execution_id ?? "—"}</span></p>
                          {d?.execution && (
                            <>
                              <p className="text-muted-foreground">
                                Tokens: <span className="text-foreground">{(d.execution.tokens_input ?? 0) + (d.execution.tokens_output ?? 0)}</span>
                              </p>
                              <p className="text-muted-foreground">
                                Custo: <span className="text-foreground">US$ {Number(d.execution.custo ?? 0).toFixed(4)}</span>
                              </p>
                            </>
                          )}
                        </div>

                        {run.erro && (
                          <div className="rounded border border-destructive/40 bg-destructive/10 p-2 text-destructive">
                            {run.erro}
                          </div>
                        )}

                        {/* Etapas */}
                        <div>
                          <p className="mb-1 font-medium">Etapas</p>
                          {d?.carregando ? (
                            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                          ) : !d || d.steps.length === 0 ? (
                            <p className="text-muted-foreground">Nenhuma etapa registrada para este disparo.</p>
                          ) : (
                            <ol className="space-y-1.5">
                              {d.steps.map((s, i) => (
                                <li key={s.id} className="rounded border border-border/60 bg-muted/40 p-2">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="font-mono text-[10px] text-muted-foreground">{i + 1}</span>
                                    <span className="font-medium">{s.titulo || s.node_id || s.tipo || "Etapa"}</span>
                                    <StatusBadge status={statusUi(s.status)} small />
                                    {s.tipo && <Badge variant="outline" className="text-[10px]">{s.tipo}</Badge>}
                                    <span className="ml-auto text-[10px] text-muted-foreground">{dur(s.duracao_ms)}</span>
                                  </div>
                                  {s.logs && (
                                    <pre className="mt-1 max-h-32 overflow-auto whitespace-pre-wrap rounded bg-background p-2 text-[10px]">
                                      {s.logs}
                                    </pre>
                                  )}
                                  {s.output && Object.keys(s.output).length > 0 && (
                                    <details className="mt-1">
                                      <summary className="cursor-pointer text-[10px] text-muted-foreground">Saída</summary>
                                      <pre className="mt-1 max-h-40 overflow-auto whitespace-pre-wrap rounded bg-background p-2 text-[10px]">
                                        {JSON.stringify(s.output, null, 2)}
                                      </pre>
                                    </details>
                                  )}
                                </li>
                              ))}
                            </ol>
                          )}
                        </div>

                        {/* Artefatos */}
                        <div>
                          <p className="mb-1 font-medium">Artefatos gerados</p>
                          {!d || d.assets.length === 0 ? (
                            <p className="text-muted-foreground">Nenhum artefato gerado.</p>
                          ) : (
                            <ul className="flex flex-wrap gap-2">
                              {d.assets.map((a) => (
                                <li key={a.id}>
                                  <a
                                    href={a.url ?? "#"}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1 rounded border border-border bg-muted/50 px-2 py-1 hover:bg-muted"
                                  >
                                    <ExternalLink className="h-3 w-3" />
                                    {a.nome}
                                    <Badge variant="outline" className="text-[10px]">{a.tipo}</Badge>
                                  </a>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>

                        {run.detalhes?.resposta && (
                          <div>
                            <p className="mb-1 font-medium">Resposta</p>
                            <pre className="max-h-40 overflow-auto whitespace-pre-wrap rounded bg-muted p-2 text-[10px]">
                              {String(run.detalhes.resposta)}
                            </pre>
                          </div>
                        )}

                        <div className="flex justify-end">
                          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => baixarLog(run)}>
                            <Download className="mr-1 h-3 w-3" />
                            Baixar log (JSON)
                          </Button>
                        </div>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
