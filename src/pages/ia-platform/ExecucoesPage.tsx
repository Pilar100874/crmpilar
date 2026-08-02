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
import { Ban, Eye, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { agentRunner } from "@/lib/aip/runner";

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
      .then(({ data }: any) => setSteps(data ?? []));
  }, [detalhe]);

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
    await db.from("aip_executions").update({ status: "cancelada" }).eq("id", e.id);
    toast.success("Execução cancelada");
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
            {["todos", "executando", "aguardando_aprovacao", "concluida", "erro"].map((s) => (
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
                        <li key={s.id} className="p-3">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-sm">
                              {s.ordem}. {s.nome ?? s.node_id}
                            </span>
                            <Badge variant={s.status === "erro" ? "destructive" : "outline"}>{s.status}</Badge>
                          </div>
                          {s.erro && <p className="text-xs text-destructive">{s.erro}</p>}
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
