import { useCallback, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Play, Square, CheckCircle2, XCircle, Loader2, Clock, ExternalLink, RotateCcw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { executarWorkflow, EventoExecucao } from "@/lib/aip/execute";

interface EtapaUI {
  node_id: string;
  ordem: number;
  titulo: string;
  tipo?: string;
  status: "executando" | "concluida" | "erro" | "aguardando_aprovacao";
  duracao_ms?: number;
  logs?: string | null;
  erro?: string;
  texto?: string;
  tentativa?: number;
  tentativas_max?: number;
}

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  workflowId?: string;
  executionId?: string;
  nomeWorkflow?: string;
  onFinalizado?: (status: string) => void;
}

const ICONE: Record<EtapaUI["status"], JSX.Element> = {
  executando: <Loader2 className="h-4 w-4 animate-spin text-primary" />,
  concluida: <CheckCircle2 className="h-4 w-4 text-primary" />,
  erro: <XCircle className="h-4 w-4 text-destructive" />,
  aguardando_aprovacao: <Clock className="h-4 w-4 text-muted-foreground" />,
};

export function WorkflowRunPanel({
  open,
  onOpenChange,
  workflowId,
  executionId,
  nomeWorkflow,
  onFinalizado,
}: Props) {
  const navigate = useNavigate();
  const [inputTexto, setInputTexto] = useState("{}");
  const [rodando, setRodando] = useState(false);
  const [etapas, setEtapas] = useState<EtapaUI[]>([]);
  const [total, setTotal] = useState(0);
  const [statusFinal, setStatusFinal] = useState<string | null>(null);
  const [execId, setExecId] = useState<string | null>(executionId ?? null);
  const [saida, setSaida] = useState("");
  const [nodeErro, setNodeErro] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const aplicarEvento = useCallback((e: EventoExecucao) => {
    switch (e.evento) {
      case "execucao":
        setExecId(e.execution_id ?? null);
        setTotal(e.total_etapas ?? 0);
        break;
      case "etapa_inicio":
        setEtapas((prev) => [
          ...prev,
          {
            node_id: e.node_id!,
            ordem: e.ordem ?? prev.length + 1,
            titulo: e.titulo ?? e.node_id!,
            tipo: e.tipo,
            status: "executando",
            tentativa: e.tentativa ?? 1,
            tentativas_max: e.tentativas_max ?? 1,
          },
        ]);
        break;
      case "texto":
        setSaida((s) => `${s}${s ? "\n\n" : ""}${e.texto ?? ""}`);
        setEtapas((prev) =>
          prev.map((et) => (et.node_id === e.node_id ? { ...et, texto: e.texto } : et)),
        );
        break;
      case "etapa_fim":
        setEtapas((prev) =>
          prev.map((et) =>
            et.node_id === e.node_id &&
            et.ordem === e.ordem &&
            (et.tentativa ?? 1) === (e.tentativa ?? et.tentativa ?? 1)
              ? {
                  ...et,
                  status: (e.status as EtapaUI["status"]) ?? "concluida",
                  duracao_ms: e.duracao_ms,
                  logs: e.logs,
                  erro: e.erro,
                }
              : et,
          ),
        );
        break;
      case "retry":
        toast.info(
          `Falha em "${e.titulo}" — nova tentativa automática (${e.tentativa}/${e.tentativas_max})`,
        );
        break;
      case "aprovacao":
        setEtapas((prev) =>
          prev.map((et) =>
            et.node_id === e.node_id ? { ...et, status: "aguardando_aprovacao" } : et,
          ),
        );
        break;
      case "fim":
        setStatusFinal(e.status ?? "concluida");
        if (e.resposta) setSaida(e.resposta);
        if (e.status === "erro") {
          setNodeErro(e.node_id ?? null);
          toast.error(e.erro ?? "Execução falhou");
        }
        else if (e.status === "aguardando_aprovacao") toast.info("Execução pausada: aprovação humana pendente");
        else toast.success("Execução concluída");
        break;
    }
  }, []);

  const iniciar = async (retry?: { executionId: string; retryNodeId?: string }) => {
    let input: Record<string, unknown> = {};
    if (inputTexto.trim()) {
      try {
        input = JSON.parse(inputTexto);
      } catch {
        return toast.error("Entrada inválida: informe um JSON válido");
      }
    }
    if (!retry) setEtapas([]);
    setSaida("");
    setStatusFinal(null);
    setNodeErro(null);
    setRodando(true);
    abortRef.current = new AbortController();
    try {
      await executarWorkflow(
        retry
          ? { executionId: retry.executionId, retryNodeId: retry.retryNodeId, origem: "retry", signal: abortRef.current.signal }
          : { workflowId, executionId, input, signal: abortRef.current.signal },
        aplicarEvento,
      );
    } catch (err) {
      if ((err as Error).name !== "AbortError") toast.error((err as Error).message);
    } finally {
      setRodando(false);
      onFinalizado?.(statusFinal ?? "concluida");
    }
  };

  const parar = () => {
    abortRef.current?.abort();
    setRodando(false);
    toast.info("Acompanhamento interrompido (a execução continua registrada no histórico)");
  };

  const concluidas = etapas.filter((e) => e.status !== "executando").length;

  return (
    <Sheet open={open} onOpenChange={(o) => (!rodando || !o ? onOpenChange(o) : null)}>
      <SheetContent className="flex w-full flex-col gap-4 sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>Executar workflow</SheetTitle>
          <SheetDescription>
            {nomeWorkflow ?? "Workflow"} — cada etapa é registrada no histórico de execuções.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-2">
          <Label>Entrada (JSON) — disponível como {"{{input.campo}}"}</Label>
          <Textarea
            rows={3}
            className="font-mono text-xs"
            value={inputTexto}
            onChange={(e) => setInputTexto(e.target.value)}
            disabled={rodando}
          />
        </div>

        <div className="flex items-center gap-2">
          {!rodando ? (
            <Button onClick={() => iniciar()} className="flex-1">
              <Play className="mr-2 h-4 w-4" /> {statusFinal ? "Executar novamente" : "Executar"}
            </Button>
          ) : (
            <Button variant="outline" onClick={parar} className="flex-1">
              <Square className="mr-2 h-4 w-4" /> Parar acompanhamento
            </Button>
          )}
          {!rodando && statusFinal === "erro" && execId && (
            <Button
              variant="secondary"
              className="flex-1"
              onClick={() => iniciar({ executionId: execId, retryNodeId: nodeErro ?? undefined })}
            >
              <RotateCcw className="mr-2 h-4 w-4" /> Reexecutar do erro
            </Button>
          )}
          {execId && (
            <Button variant="outline" onClick={() => navigate("/ia-platform/execucoes")}>
              <ExternalLink className="h-4 w-4" />
            </Button>
          )}
        </div>

        {total > 0 && (
          <div className="space-y-1">
            <Progress value={total ? (concluidas / total) * 100 : 0} />
            <p className="text-xs text-muted-foreground">
              {concluidas}/{total} etapas
              {statusFinal ? ` · ${statusFinal.replace("_", " ")}` : ""}
            </p>
          </div>
        )}

        <ScrollArea className="flex-1 rounded-lg border border-border">
          {etapas.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">
              Nenhuma etapa executada ainda. Clique em Executar para iniciar.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {etapas.map((e) => (
                <li key={`${e.node_id}-${e.ordem}-${e.tentativa ?? 1}`} className="space-y-1 p-3">
                  <div className="flex items-center gap-2">
                    {ICONE[e.status]}
                    <span className="flex-1 truncate text-sm font-medium">
                      {e.ordem}. {e.titulo}
                    </span>
                    {(e.tentativa ?? 1) > 1 && (
                      <Badge variant="secondary" className="text-[10px]">
                        tentativa {e.tentativa}/{e.tentativas_max ?? e.tentativa}
                      </Badge>
                    )}
                    {e.duracao_ms != null && (
                      <Badge variant="outline" className="text-[10px]">
                        {e.duracao_ms} ms
                      </Badge>
                    )}
                  </div>
                  {e.tipo && <p className="pl-6 text-[11px] text-muted-foreground">{e.tipo}</p>}
                  {e.logs && <p className="pl-6 text-xs text-muted-foreground">{e.logs}</p>}
                  {e.erro && <p className="pl-6 text-xs text-destructive">{e.erro}</p>}
                  {e.texto && (
                    <pre className="ml-6 max-h-40 overflow-auto whitespace-pre-wrap rounded bg-muted p-2 text-xs">
                      {e.texto}
                    </pre>
                  )}
                </li>
              ))}
            </ul>
          )}
        </ScrollArea>

        {saida && (
          <div className="space-y-1">
            <Label>Resposta final</Label>
            <pre className="max-h-40 overflow-auto whitespace-pre-wrap rounded-lg bg-muted p-3 text-xs">
              {saida}
            </pre>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
