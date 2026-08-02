import { useEffect, useMemo, useState } from "react";
import { useAipTable, db } from "@/lib/aip/db";
import { AipExecution } from "@/lib/aip/types";
import { AipToolbar } from "@/components/ia-platform/AipToolbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Ban, Eye, FileJson, FileText, Loader2, RefreshCw, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { agentRunner } from "@/lib/aip/runner";
import { executarWorkflow, cancelarExecucao } from "@/lib/aip/execute";
import { exportarRelatorioJSON, exportarRelatorioPDF } from "@/lib/aip/report";

const CORES: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  concluida: "default",
  executando: "secondary",
  pendente: "outline",
  aguardando_aprovacao: "secondary",
  erro: "destructive",
  cancelada: "outline",
};

export default function ExecucoesPage() {
  const { items, loading, refetch } = useAipTable<AipExecution>("aip_executions");
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState("todos");
  const [detalhe, setDetalhe] = useState<AipExecution | null>(null);
  const [steps, setSteps] = useState<any[]>([]);
  const [reexecutando, setReexecutando] = useState<string | null>(null);
  const [exportando, setExportando] = useState<string | null>(null);

  const exportar = async (id: string, formato: "pdf" | "json") => {
    setExportando(`${id}-${formato}`);
    try {
      if (formato === "pdf") await exportarRelatorioPDF(id);
      else await exportarRelatorioJSON(id);
      toast.success(`Relatório ${formato.toUpperCase()} gerado`);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setExportando(null);
    }
  };

  useEffect(() => {
    const t = setInterval(refetch, 15000);
    return () => clearInterval(t);
  }, [refetch]);

  useEffect(() => {
    if (!detalhe) return;
    db.from("aip_execution_steps")
      .select("*")
      .eq("execution_id", detalhe.id)
      .order("ordem", { ascending: true })
      .order("tentativa", { ascending: true })
      .then(({ data }: any) => setSteps(data ?? []));
  }, [detalhe, reexecutando]);

  /** Retry manual: reexecuta a execução a partir do bloco que falhou. */
  const reexecutar = async (e: AipExecution, nodeId?: string) => {
    setReexecutando(e.id);
    let erroFinal: string | null = null;
    try {
      await executarWorkflow(
        { executionId: e.id, retryNodeId: nodeId, origem: "retry" },
        (ev) => {
          if (ev.evento === "retry") {
            toast.info(`Nova tentativa (${ev.tentativa}/${ev.tentativas_max}) em "${ev.titulo}"`);
          }
          if (ev.evento === "fim") {
            if (ev.status === "erro") erroFinal = ev.erro ?? "Falha na reexecução";
          }
        },
      );
      if (erroFinal) toast.error(erroFinal);
      else toast.success("Reexecução concluída");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setReexecutando(null);
      refetch();
    }
  };

  const filtrados = useMemo(
    () =>
      items
        .filter((e) => filtro === "todos" || e.status === filtro)
        .filter((e) =>
          `${e.origem} ${e.modelo ?? ""} ${e.prompt ?? ""}`.toLowerCase().includes(busca.toLowerCase()),
        ),
    [items, busca, filtro],
  );

  const cancelar = async (e: AipExecution) => {
    try {
      await agentRunner.cancel(e.id);
    } catch {
      /* servidor pode estar offline */
    }
    try {
      // Sinaliza o motor: ele para na etapa atual e registra o motivo no histórico.
      await cancelarExecucao(e.id);
      toast.success("Cancelamento solicitado — a execução para na etapa atual");
    } catch (err) {
      toast.error((err as Error).message);
    }
    refetch();
  };

  return (
    <>
      <AipToolbar
        busca={busca}
        onBusca={setBusca}
        loading={loading}
        vazio={filtrados.length === 0}
        vazioTexto="Nenhuma execução registrada."
        acoes={
          <div className="flex flex-wrap gap-1">
            {["todos", "executando", "aguardando_aprovacao", "concluida", "erro", "cancelada"].map((s) => (
              <Button
                key={s}
                size="sm"
                variant={filtro === s ? "default" : "outline"}
                onClick={() => setFiltro(s)}
              >
                {s.replace("_", " ")}
              </Button>
            ))}
            <Button size="sm" variant="outline" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        }
      >
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="p-3">Início</th>
                <th className="p-3">Origem</th>
                <th className="p-3">Modelo</th>
                <th className="p-3">Versão</th>

                <th className="p-3">Status</th>
                <th className="p-3">Tokens</th>
                <th className="p-3">Custo</th>
                <th className="sticky right-0 bg-muted/50 p-3">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.map((e) => (
                <tr key={e.id} className="border-t border-border">
                  <td className="p-3 whitespace-nowrap">{new Date(e.iniciado_em).toLocaleString("pt-BR")}</td>
                  <td className="p-3">{e.origem}</td>
                  <td className="p-3">{e.modelo ?? "—"}</td>
                  <td className="p-3">
                    {(e as any).workflow_versao ? (
                      <Badge variant="outline" title="Snapshot imutável do workflow usado nesta execução">
                        v{(e as any).workflow_versao}
                      </Badge>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="p-3">

                    <Badge variant={CORES[e.status] ?? "outline"}>{e.status.replace("_", " ")}</Badge>
                  </td>
                  <td className="p-3">{(e.tokens_input ?? 0) + (e.tokens_output ?? 0)}</td>
                  <td className="p-3">
                    {Number(e.custo ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                  </td>
                  <td className="sticky right-0 bg-card p-3">
                    <div className="flex flex-nowrap gap-1">
                      <Button size="sm" variant="outline" onClick={() => setDetalhe(e)}>
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        title="Exportar relatório em PDF"
                        disabled={exportando === `${e.id}-pdf`}
                        onClick={() => exportar(e.id, "pdf")}
                      >
                        {exportando === `${e.id}-pdf` ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <FileText className="h-3.5 w-3.5" />
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        title="Exportar relatório em JSON"
                        disabled={exportando === `${e.id}-json`}
                        onClick={() => exportar(e.id, "json")}
                      >
                        {exportando === `${e.id}-json` ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <FileJson className="h-3.5 w-3.5" />
                        )}
                      </Button>

                      {["erro", "cancelada"].includes(e.status) && (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={reexecutando === e.id}
                          title="Reexecutar do ponto do erro"
                          onClick={() => reexecutar(e)}
                        >
                          {reexecutando === e.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <RotateCcw className="h-3.5 w-3.5" />
                          )}
                        </Button>
                      )}
                      {["executando", "pendente", "aguardando_aprovacao"].includes(e.status) && (
                        <Button size="sm" variant="outline" onClick={() => cancelar(e)}>
                          <Ban className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </AipToolbar>

      <Dialog open={!!detalhe} onOpenChange={(o) => !o && setDetalhe(null)}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes da execução</DialogTitle>
          </DialogHeader>
          {detalhe && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                <Card>
                  <CardContent className="p-3">
                    <p className="text-xs text-muted-foreground">Status</p>
                    <p className="font-medium">{detalhe.status}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-3">
                    <p className="text-xs text-muted-foreground">Duração</p>
                    <p className="font-medium">{detalhe.duracao_ms ? `${detalhe.duracao_ms} ms` : "—"}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-3">
                    <p className="text-xs text-muted-foreground">Tokens</p>
                    <p className="font-medium">
                      {(detalhe.tokens_input ?? 0) + (detalhe.tokens_output ?? 0)}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-3">
                    <p className="text-xs text-muted-foreground">Custo</p>
                    <p className="font-medium">
                      {Number(detalhe.custo ?? 0).toLocaleString("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      })}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {(detalhe as any).motivo_interrupcao &&
                (detalhe as any).motivo_interrupcao !== "erro" && (
                  <div className="rounded-lg border border-border bg-muted/40 p-3 text-sm">
                    Motivo da interrupção:{" "}
                    <strong>
                      {(detalhe as any).motivo_interrupcao === "timeout"
                        ? "tempo limite da etapa excedido"
                        : "cancelada pelo usuário"}
                    </strong>
                    {(detalhe as any).cancelado_em
                      ? ` · ${new Date((detalhe as any).cancelado_em).toLocaleString("pt-BR")}`
                      : ""}
                  </div>
                )}

              {detalhe.erro && (
                <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                  {detalhe.erro}
                </div>
              )}

              <div className="space-y-2">
                <p className="text-sm font-medium">Passos</p>
                <ScrollArea className="max-h-64 rounded-lg border border-border">
                  {steps.length === 0 ? (
                    <p className="p-3 text-sm text-muted-foreground">Nenhum passo registrado.</p>
                  ) : (
                    <ul className="divide-y divide-border">
                      {steps.map((s) => (
                        <li key={s.id} className="space-y-1 p-3">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-sm">
                              {s.ordem}. {s.titulo ?? s.node_id}
                            </span>
                            <div className="flex items-center gap-1">
                              {Number(s.tentativas_max ?? 1) > 1 || Number(s.tentativa ?? 1) > 1 ? (
                                <Badge variant="secondary" className="text-[10px]">
                                  tentativa {s.tentativa ?? 1}/{s.tentativas_max ?? 1}
                                </Badge>
                              ) : null}
                              {s.duracao_ms != null && (
                                <Badge variant="outline" className="text-[10px]">{s.duracao_ms} ms</Badge>
                              )}
                              <Badge variant={s.status === "erro" ? "destructive" : "outline"} title={s.motivo_interrupcao ?? undefined}>
                                {String(s.status).replace("_", " ")}
                              </Badge>
                            </div>
                          </div>
                          {s.tipo && <p className="text-[11px] text-muted-foreground">{s.tipo}</p>}
                          {s.motivo_interrupcao && s.motivo_interrupcao !== "erro" && (
                            <p className="text-[11px] font-medium text-muted-foreground">
                              {s.motivo_interrupcao === "timeout"
                                ? `Interrompida por tempo limite${s.timeout_ms ? ` (${Math.round(Number(s.timeout_ms) / 1000)}s)` : ""}`
                                : "Interrompida por cancelamento"}
                            </p>
                          )}
                          {s.logs && <p className="text-xs text-muted-foreground">{s.logs}</p>}
                          {["erro", "cancelada"].includes(String(s.status)) && detalhe && ["erro", "cancelada"].includes(detalhe.status) && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs"
                              disabled={reexecutando === detalhe.id}
                              onClick={() => reexecutar(detalhe, s.node_id)}
                            >
                              {reexecutando === detalhe.id ? (
                                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                              ) : (
                                <RotateCcw className="mr-1 h-3 w-3" />
                              )}
                              Reexecutar a partir desta etapa
                            </Button>
                          )}
                          {s.output && Object.keys(s.output).length > 0 && (
                            <pre className="max-h-32 overflow-auto whitespace-pre-wrap rounded bg-muted p-2 text-[11px]">
                              {JSON.stringify(s.output, null, 2)}
                            </pre>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </ScrollArea>
              </div>

              {detalhe.resposta && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Resposta</p>
                  <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded-lg bg-muted p-3 text-xs">
                    {detalhe.resposta}
                  </pre>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
