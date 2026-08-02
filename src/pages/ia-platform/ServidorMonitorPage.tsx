import { useCallback, useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Activity,
  CheckCircle2,
  Cpu,
  MemoryStick,
  RefreshCw,
  Server,
  Timer,
  Trash2,
  XCircle,
  Ban,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { agentRunner, type RunResumo, type RunsResult } from "@/lib/aip/runner";

const STATUS_ESTILO: Record<string, string> = {
  executando: "bg-primary/10 text-primary border-primary/30",
  concluida: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30",
  erro: "bg-destructive/10 text-destructive border-destructive/30",
  cancelada: "bg-muted text-muted-foreground border-border",
  pendente: "bg-amber-500/10 text-amber-600 border-amber-500/30",
};

function duracao(ms?: number) {
  if (!ms || ms < 0) return "—";
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  return `${m}m ${s % 60}s`;
}

function uptime(segundos?: number) {
  if (!segundos && segundos !== 0) return "—";
  const d = Math.floor(segundos / 86400);
  const h = Math.floor((segundos % 86400) / 3600);
  const m = Math.floor((segundos % 3600) / 60);
  if (d) return `${d}d ${h}h`;
  if (h) return `${h}h ${m}m`;
  return `${m}m ${segundos % 60}s`;
}

function Metrica({
  icone: Icone,
  titulo,
  valor,
  detalhe,
}: {
  icone: typeof Server;
  titulo: string;
  valor: string;
  detalhe?: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icone className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">{titulo}</p>
          <p className="truncate text-lg font-semibold">{valor}</p>
          {detalhe && <p className="truncate text-xs text-muted-foreground">{detalhe}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

export default function ServidorMonitorPage() {
  const [dados, setDados] = useState<RunsResult | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [auto, setAuto] = useState(true);
  const [selecionada, setSelecionada] = useState<RunResumo | null>(null);
  const timer = useRef<number | null>(null);

  const carregar = useCallback(async (silencioso = true) => {
    if (!silencioso) setCarregando(true);
    try {
      const r = await agentRunner.runs(100);
      if (r?.ok === false || r?.simulado) {
        setErro(r?.motivo ?? "Servidor de execução remoto não configurado.");
        setDados(null);
      } else {
        setDados(r);
        setErro(null);
      }
    } catch (e) {
      setErro((e as Error).message);
      setDados(null);
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    void carregar(false);
  }, [carregar]);

  useEffect(() => {
    if (!auto) return;
    timer.current = window.setInterval(() => void carregar(), 5000);
    return () => {
      if (timer.current) window.clearInterval(timer.current);
    };
  }, [auto, carregar]);

  const limpar = async () => {
    try {
      const r = await agentRunner.limparRuns();
      toast.success(`${r?.removidas ?? 0} execução(ões) removidas da memória`);
      void carregar();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const cancelar = async (id: string) => {
    try {
      await agentRunner.cancel(id);
      toast.success("Execução cancelada");
      void carregar();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const s = dados?.servidor;
  const ativas = dados?.contagem?.executando ?? 0;
  const online = Boolean(dados?.ok);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Monitor do servidor</h2>
          <p className="text-sm text-muted-foreground">
            Saúde do motor remoto (Railway) e o que está rodando agora.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Switch id="auto" checked={auto} onCheckedChange={setAuto} />
            <Label htmlFor="auto" className="text-sm text-muted-foreground">
              Auto (5s)
            </Label>
          </div>
          <Button variant="outline" size="sm" onClick={() => void carregar(false)}>
            <RefreshCw className={cn("mr-2 h-4 w-4", carregando && "animate-spin")} />
            Atualizar
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="flex flex-wrap items-center gap-3 p-4">
          {online ? (
            <>
              <span className="relative flex h-3 w-3">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-60" />
                <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-500" />
              </span>
              <span className="font-medium">Servidor online</span>
              <Badge variant="outline">v{s?.versao ?? "?"}</Badge>
              {s?.commit && <Badge variant="secondary">{s.commit}</Badge>}
              {s?.ambiente && <Badge variant="outline">{s.ambiente}</Badge>}
              <Badge variant={s?.anthropic ? "secondary" : "destructive"} className="gap-1">
                {s?.anthropic ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                Anthropic
              </Badge>
              <Badge variant={s?.supabase ? "secondary" : "destructive"} className="gap-1">
                {s?.supabase ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                Banco
              </Badge>
              {dados?.verificado_em && (
                <span className="ml-auto text-xs text-muted-foreground">
                  verificado {new Date(dados.verificado_em).toLocaleTimeString("pt-BR")}
                </span>
              )}
            </>
          ) : (
            <>
              <XCircle className="h-4 w-4 text-destructive" />
              <span className="text-muted-foreground">{erro ?? "Servidor offline"}</span>
            </>
          )}
        </CardContent>
      </Card>

      {!online && (
        <Alert>
          <AlertTitle>Motor remoto indisponível</AlertTitle>
          <AlertDescription>
            Confira em <strong>Motor de execução</strong> se os secrets{" "}
            <code>AIP_RUNNER_URL</code> e <code>AIP_RUNNER_KEY</code> estão cadastrados e se o
            serviço está de pé no Railway.
          </AlertDescription>
        </Alert>
      )}

      {online && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Metrica
              icone={Activity}
              titulo="Executando agora"
              valor={String(ativas)}
              detalhe={`${dados?.total ?? 0} execuções em memória`}
            />
            <Metrica
              icone={Timer}
              titulo="Uptime"
              valor={uptime(s?.uptime_s)}
              detalhe={
                s?.iniciado_em ? `desde ${new Date(s.iniciado_em).toLocaleString("pt-BR")}` : undefined
              }
            />
            <Metrica
              icone={MemoryStick}
              titulo="Memória"
              valor={`${s?.memoria_mb ?? 0} MB`}
              detalhe={`heap ${s?.heap_mb ?? 0} MB`}
            />
            <Metrica icone={Cpu} titulo="Runtime" valor={s?.node ?? "—"} detalhe={`versão ${s?.versao}`} />
          </div>

          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle className="flex items-center gap-2 text-base">
                <Server className="h-4 w-4 text-primary" /> Execuções no servidor
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={limpar}>
                <Trash2 className="mr-2 h-4 w-4" /> Limpar finalizadas
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Execução</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Início</TableHead>
                      <TableHead>Duração</TableHead>
                      <TableHead className="text-right">Tokens</TableHead>
                      <TableHead className="text-right">Custo</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(dados?.execucoes ?? []).length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                          Nenhuma execução no servidor no momento.
                        </TableCell>
                      </TableRow>
                    )}
                    {(dados?.execucoes ?? []).map((r) => (
                      <TableRow
                        key={r.id}
                        className="cursor-pointer"
                        onClick={() => setSelecionada(r)}
                      >
                        <TableCell className="font-mono text-xs">{r.id.slice(0, 8)}…</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={cn(STATUS_ESTILO[r.status])}>
                            {r.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {new Date(r.criado_em).toLocaleString("pt-BR")}
                        </TableCell>
                        <TableCell className="text-xs">{duracao(r.duracao_ms)}</TableCell>
                        <TableCell className="text-right text-xs">
                          {(r.tokens_input ?? 0) + (r.tokens_output ?? 0)}
                        </TableCell>
                        <TableCell className="text-right text-xs">
                          {(r.custo ?? 0).toLocaleString("pt-BR", {
                            style: "currency",
                            currency: "USD",
                          })}
                        </TableCell>
                        <TableCell className="text-right">
                          {r.status === "executando" && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation();
                                void cancelar(r.id);
                              }}
                            >
                              <Ban className="mr-1 h-3.5 w-3.5" /> Cancelar
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {selecionada && (
            <Card>
              <CardHeader className="flex-row items-center justify-between space-y-0">
                <CardTitle className="text-base">
                  Última saída — <span className="font-mono text-xs">{selecionada.id}</span>
                </CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setSelecionada(null)}>
                  Fechar
                </Button>
              </CardHeader>
              <CardContent>
                {selecionada.erro && (
                  <p className="mb-2 text-sm text-destructive">{selecionada.erro}</p>
                )}
                <ScrollArea className="h-48 rounded-lg border border-border bg-muted/40 p-3">
                  <pre className="whitespace-pre-wrap text-xs">
                    {selecionada.previa || "Sem saída registrada."}
                  </pre>
                </ScrollArea>
              </CardContent>
            </Card>
          )}
        </>
      )}

    </div>
  );
}
