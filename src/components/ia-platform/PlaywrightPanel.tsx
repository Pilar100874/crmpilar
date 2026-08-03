import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Chrome, Play, Loader2, CheckCircle2, XCircle, Clock, Ban } from "lucide-react";
import { toast } from "sonner";
import {
  agentRunner,
  type PlaywrightJob,
  type PlaywrightPasso,
  type PlaywrightRunResult,
  type PlaywrightStatus,
} from "@/lib/aip/runner";

const EXEMPLO = JSON.stringify(
  [
    { acao: "esperar", ms: 1000 },
    { acao: "texto", nome: "conteudo" },
    { acao: "screenshot", nome: "pagina", pagina_inteira: true },
  ],
  null,
  2,
);

const ROTULO_STATUS: Record<string, string> = {
  fila: "Na fila",
  rodando: "Executando",
  concluido: "Concluído",
  erro: "Falhou",
  cancelado: "Cancelado",
};


/**
 * Painel de automação de navegador (Playwright) executada no servidor remoto.
 * Permite validar se o Chromium está instalado e rodar roteiros de teste.
 */
export function PlaywrightPanel() {
  const [url, setUrl] = useState("https://exemplo.com");
  const [passos, setPassos] = useState(EXEMPLO);
  const [rodando, setRodando] = useState(false);
  const [verificando, setVerificando] = useState(false);
  const [status, setStatus] = useState<PlaywrightStatus | null>(null);
  const [resultado, setResultado] = useState<PlaywrightRunResult | null>(null);
  const [job, setJob] = useState<PlaywrightJob | null>(null);
  const pollRef = useRef<number | null>(null);

  useEffect(() => () => {
    if (pollRef.current) window.clearInterval(pollRef.current);
  }, []);

  const lerPassos = (): PlaywrightPasso[] | null => {
    try {
      const lista = JSON.parse(passos);
      if (!Array.isArray(lista)) throw new Error("Os passos devem ser uma lista.");
      return lista;
    } catch (e) {
      toast.error(`Passos inválidos: ${(e as Error).message}`);
      return null;
    }
  };

  const verificar = async () => {
    setVerificando(true);
    try {
      const s = await agentRunner.playwrightStatus();
      setStatus(s);
      toast[s.ok ? "success" : "error"](
        s.ok ? `Chromium pronto (${s.versao_navegador ?? "ok"})` : s.erro ?? "Playwright indisponível",
      );
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setVerificando(false);
    }
  };

  const executar = async () => {
    const lista = lerPassos();
    if (!lista) return;
    setRodando(true);
    setResultado(null);
    setJob(null);
    try {
      const r = await agentRunner.playwrightRun({ url: url.trim() || undefined, passos: lista });
      setResultado(r);
      toast[r.ok ? "success" : "error"](r.ok ? "Automação concluída" : r.erro ?? "Falhou");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setRodando(false);
    }
  };

  /** Acompanha o job no servidor até ele terminar. */
  const acompanhar = (jobId: string) => {
    if (pollRef.current) window.clearInterval(pollRef.current);
    pollRef.current = window.setInterval(async () => {
      try {
        const atual = await agentRunner.playwrightJobStatus(jobId);
        setJob(atual);
        if (atual.status && atual.status !== "rodando" && atual.status !== "fila") {
          if (pollRef.current) window.clearInterval(pollRef.current);
          pollRef.current = null;
          setResultado({
            ok: atual.status === "concluido",
            erro: atual.erro ?? undefined,
            url_final: atual.url_final ?? undefined,
            titulo: atual.titulo ?? undefined,
            logs: atual.logs,
            extraidos: atual.extraidos,
            artefatos: (atual.artefatos ?? []).filter((a) => a.base64 || a.url),
            duracao_ms: atual.duracao_ms ?? undefined,
          });
          toast[atual.status === "concluido" ? "success" : "error"](
            `Rotina ${ROTULO_STATUS[atual.status] ?? atual.status}`,
          );
        }
      } catch {
        if (pollRef.current) window.clearInterval(pollRef.current);
        pollRef.current = null;
      }
    }, 2000);
  };

  const executarRotina = async () => {
    const lista = lerPassos();
    if (!lista) return;
    setResultado(null);
    try {
      const r = await agentRunner.playwrightJob({
        nome: `Automação ${url || "sem endereço"}`.slice(0, 80),
        url: url.trim() || undefined,
        passos: lista,
      });
      if (!r.ok || !r.job_id) throw new Error(r.erro ?? "Não foi possível criar a rotina.");
      setJob({ ok: true, job_id: r.job_id, status: r.status ?? "fila", progresso: { passo: 0, total: r.total_passos ?? lista.length } });
      toast.success("Rotina iniciada em segundo plano");
      acompanhar(r.job_id);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const cancelarRotina = async () => {
    if (!job?.job_id) return;
    try {
      await agentRunner.playwrightJobCancelar(job.job_id);
      toast.success("Cancelamento solicitado");
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const emAndamento = job?.status === "rodando" || job?.status === "fila";


  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2 text-base">
          <Chrome className="h-4 w-4 text-primary" /> Playwright (navegador no servidor)
        </CardTitle>
        <div className="flex items-center gap-2">
          {status && (
            <Badge variant="outline" className={status.ok ? "border-emerald-500/30 text-emerald-600" : "border-destructive/30 text-destructive"}>
              {status.ok ? <CheckCircle2 className="mr-1 h-3 w-3" /> : <XCircle className="mr-1 h-3 w-3" />}
              {status.ok ? "Chromium pronto" : "Indisponível"}
            </Badge>
          )}
          <Button variant="outline" size="sm" onClick={verificar} disabled={verificando}>
            {verificando ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Verificar
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-xs text-muted-foreground">
          O navegador roda no servidor remoto (Railway). Use para abrir sites, preencher formulários,
          capturar telas e extrair conteúdo dentro das rotinas de IA.
        </p>

        <div className="space-y-2">
          <Label htmlFor="pw-url">Endereço inicial</Label>
          <Input id="pw-url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://..." />
        </div>

        <div className="space-y-2">
          <Label htmlFor="pw-passos">
            Passos (JSON) — ações: ir, clicar, preencher, esperar, texto, screenshot, pdf, avaliar
          </Label>
          <Textarea
            id="pw-passos"
            value={passos}
            onChange={(e) => setPassos(e.target.value)}
            rows={10}
            className="font-mono text-xs"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <Button onClick={executar} disabled={rodando || emAndamento}>
            {rodando ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
            Executar agora
          </Button>
          <Button variant="secondary" onClick={executarRotina} disabled={rodando || emAndamento}>
            <Clock className="mr-2 h-4 w-4" />
            Executar como rotina (segundo plano)
          </Button>
          {emAndamento && (
            <Button variant="outline" onClick={cancelarRotina}>
              <Ban className="mr-2 h-4 w-4" />
              Cancelar
            </Button>
          )}
        </div>

        {job && (
          <div className="space-y-2 rounded-lg border p-3">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <Badge variant="outline">{ROTULO_STATUS[job.status ?? ""] ?? job.status}</Badge>
              <span className="font-mono text-muted-foreground">{job.job_id}</span>
              {job.passo_descricao && (
                <span className="text-muted-foreground">{job.passo_descricao}</span>
              )}
            </div>
            <Progress
              value={
                job.progresso?.total
                  ? Math.min(100, (job.progresso.passo / job.progresso.total) * 100)
                  : job.status === "concluido"
                    ? 100
                    : 0
              }
            />
            <p className="text-xs text-muted-foreground">
              Passo {job.progresso?.passo ?? 0} de {job.progresso?.total ?? 0}
            </p>
          </div>
        )}


        {resultado && (
          <div className="space-y-3 rounded-lg border p-3">
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <Badge variant="outline">{resultado.ok ? "Sucesso" : "Erro"}</Badge>
              {resultado.titulo && <span className="truncate">{resultado.titulo}</span>}
              {resultado.url_final && <span className="truncate">{resultado.url_final}</span>}
              <span>{Math.round((resultado.duracao_ms ?? 0) / 100) / 10}s</span>
            </div>

            {resultado.erro && <p className="text-sm text-destructive">{resultado.erro}</p>}

            {!!resultado.logs?.length && (
              <ScrollArea className="h-32 rounded bg-muted/50 p-2">
                <pre className="whitespace-pre-wrap text-[11px] leading-relaxed">
                  {resultado.logs.join("\n")}
                </pre>
              </ScrollArea>
            )}

            {resultado.extraidos && Object.keys(resultado.extraidos).length > 0 && (
              <ScrollArea className="h-32 rounded bg-muted/50 p-2">
                <pre className="whitespace-pre-wrap text-[11px]">
                  {JSON.stringify(resultado.extraidos, null, 2)}
                </pre>
              </ScrollArea>
            )}

            {!!resultado.artefatos?.length && (
              <div className="grid gap-3 sm:grid-cols-2">
                {resultado.artefatos.map((a) => {
                  const fonte = a.base64 ? `data:${a.tipo};base64,${a.base64}` : (a.url ?? "");
                  return (
                    <div key={a.nome} className="space-y-1">
                      <p className="text-xs font-medium">{a.nome}</p>
                      {a.tipo === "image/png" && fonte ? (
                        <img
                          src={fonte}
                          alt={`Captura de tela ${a.nome}`}
                          className="w-full rounded border"
                          loading="lazy"
                        />
                      ) : a.tipo.startsWith("video/") && fonte ? (
                        <video src={fonte} controls className="w-full rounded border" />
                      ) : fonte ? (
                        <a
                          className="text-xs text-primary underline"
                          href={fonte}
                          download={a.nome}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Baixar arquivo
                        </a>
                      ) : (
                        <p className="text-xs text-muted-foreground">Arquivo indisponível</p>
                      )}
                      <p className="text-[10px] text-muted-foreground">
                        {a.armazenado ? "Guardado para auditoria" : "Somente nesta execução"} ·{" "}
                        {Math.max(1, Math.round(a.tamanho_bytes / 1024))} KB
                      </p>
                    </div>
                  );
                })}
              </div>
            )}

          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default PlaywrightPanel;
