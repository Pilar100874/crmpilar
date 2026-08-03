import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Chrome, Play, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";
import {
  agentRunner,
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
    let lista: PlaywrightPasso[];
    try {
      lista = JSON.parse(passos);
      if (!Array.isArray(lista)) throw new Error("Os passos devem ser uma lista.");
    } catch (e) {
      toast.error(`Passos inválidos: ${(e as Error).message}`);
      return;
    }
    setRodando(true);
    setResultado(null);
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

        <Button onClick={executar} disabled={rodando}>
          {rodando ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
          Executar automação
        </Button>

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
                {resultado.artefatos.map((a) => (
                  <div key={a.nome} className="space-y-1">
                    <p className="text-xs font-medium">{a.nome}</p>
                    {a.tipo === "image/png" ? (
                      <img
                        src={`data:image/png;base64,${a.base64}`}
                        alt={`Captura de tela ${a.nome}`}
                        className="w-full rounded border"
                        loading="lazy"
                      />
                    ) : (
                      <a
                        className="text-xs text-primary underline"
                        href={`data:${a.tipo};base64,${a.base64}`}
                        download={a.nome}
                      >
                        Baixar arquivo
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default PlaywrightPanel;
