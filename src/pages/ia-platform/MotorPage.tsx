import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import {
  Server,
  CheckCircle2,
  XCircle,
  Loader2,
  PlugZap,
  Copy,
  FileCode2,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { agentRunner } from "@/lib/aip/runner";
import { getMotor, setMotor, MOTORES, MotorExecucao } from "@/lib/aip/motor";

const PAYLOAD_EXEMPLO = `{
  "execution_id": "uuid-da-execucao",
  "modelo": "claude-sonnet-4-5",
  "prompt": "Gere um vídeo institucional de 30s",
  "agent": { "nome": "Produtor", "prompt_principal": "Você é ..." },
  "skills": [{ "nome": "roteiro", "conteudo_md": "# Como escrever ..." }],
  "tools": [{ "nome": "remotion.render", "tipo": "http" }],
  "mcps": [{ "nome": "Pilar CRM", "endpoint": "https://.../functions/v1/mcp" }],
  "input": { "produto": "Linha X" }
}`;

export default function MotorPage() {
  const [motor, setMotorLocal] = useState<MotorExecucao>(getMotor());
  const [testando, setTestando] = useState(false);
  const [saude, setSaude] = useState<any>(null);

  useEffect(() => {
    void testar(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const escolher = (valor: MotorExecucao) => {
    setMotorLocal(valor);
    setMotor(valor);
    toast.success(`Motor de execução: ${MOTORES.find((m) => m.valor === valor)?.nome}`);
  };

  const testar = async (silencioso = false) => {
    setTestando(true);
    try {
      const r = await agentRunner.health();
      setSaude(r);
      if (!silencioso) {
        r?.ok
          ? toast.success("Servidor de execução respondeu com sucesso")
          : toast.warning(r?.motivo ?? "Servidor não configurado");
      }
    } catch (e) {
      setSaude({ ok: false, motivo: (e as Error).message });
      if (!silencioso) toast.error(`Falha no teste: ${(e as Error).message}`);
    } finally {
      setTestando(false);
    }
  };

  const copiar = (texto: string) => {
    navigator.clipboard.writeText(texto);
    toast.success("Copiado");
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Motor de execução</h2>
        <p className="text-sm text-muted-foreground">
          Os agentes e workflows são executados no servidor Claude Agent SDK. O cadastro (agentes,
          skills, tools, MCPs e rotinas) continua sempre aqui no Pilar.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {MOTORES.map((m) => {
          const ativo = motor === m.valor;
          const Icone = Server;
          return (
            <Card
              key={m.valor}
              onClick={() => escolher(m.valor)}
              className={cn(
                "cursor-pointer transition-all hover:shadow-md",
                ativo ? "border-primary ring-1 ring-primary" : "border-border",
              )}
            >
              <CardContent className="space-y-3 p-4">
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-lg",
                      ativo ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
                    )}
                  >
                    <Icone className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{m.nome}</p>
                    {ativo && (
                      <Badge variant="secondary" className="mt-1 gap-1">
                        <CheckCircle2 className="h-3 w-3" /> em uso
                      </Badge>
                    )}
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">{m.descricao}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="flex items-center gap-2 text-base">
            <PlugZap className="h-4 w-4 text-primary" /> Conexão com o servidor (Railway)
          </CardTitle>
          <Button size="sm" variant="outline" onClick={() => testar()} disabled={testando}>
            {testando ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Testar conexão
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2 text-sm">
            {saude?.ok ? (
              <>
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <span>Servidor online</span>
                {saude.versao && <Badge variant="outline">v{saude.versao}</Badge>}
                {saude.anthropic === false && (
                  <Badge variant="destructive">sem ANTHROPIC_API_KEY</Badge>
                )}
              </>
            ) : (
              <>
                <XCircle className="h-4 w-4 text-destructive" />
                <span className="text-muted-foreground">
                  {saude?.motivo ?? "Servidor não configurado"}
                </span>
              </>
            )}
          </div>

          <Separator />

          <div className="space-y-2 text-sm">
            <p className="font-medium">Como ligar o servidor</p>
            <ol className="list-decimal space-y-1 pl-5 text-muted-foreground">
              <li>
                Suba a pasta <code className="rounded bg-muted px-1">agent-sdk-server/</code> deste
                repositório no Railway (ela já tem Dockerfile, railway.json e README).
              </li>
              <li>
                No Railway defina <code className="rounded bg-muted px-1">RUNNER_KEY</code>,{" "}
                <code className="rounded bg-muted px-1">ANTHROPIC_API_KEY</code>,{" "}
                <code className="rounded bg-muted px-1">SUPABASE_URL</code> e{" "}
                <code className="rounded bg-muted px-1">SUPABASE_SERVICE_ROLE_KEY</code>.
              </li>
              <li>
                Aqui no Pilar cadastre os secrets{" "}
                <code className="rounded bg-muted px-1">AIP_RUNNER_URL</code> (URL do Railway) e{" "}
                <code className="rounded bg-muted px-1">AIP_RUNNER_KEY</code> (mesmo valor do
                RUNNER_KEY) — peça isso no chat que eu abro o formulário seguro.
              </li>
              <li>Clique em “Testar conexão”.</li>
            </ol>
          </div>

          <Alert>
            <AlertTitle>O navegador nunca fala direto com o Railway</AlertTitle>
            <AlertDescription>
              Toda chamada passa pela função <code>aip-run-proxy</code>, que guarda a URL e a chave
              do servidor e valida o usuário logado.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="flex items-center gap-2 text-base">
            <FileCode2 className="h-4 w-4 text-primary" /> Parâmetros enviados ao servidor
          </CardTitle>
          <Button size="sm" variant="ghost" onClick={() => copiar(PAYLOAD_EXEMPLO)}>
            <Copy className="mr-2 h-4 w-4" /> Copiar
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            O Pilar monta este pacote com o que você cadastrou (agente, skills, tools, MCPs e
            entradas do wizard) e o servidor devolve o texto em streaming, gravando resposta,
            tokens e custo na execução.
          </p>
          <pre className="overflow-auto rounded-lg border border-border bg-muted/40 p-3 text-xs">
            {PAYLOAD_EXEMPLO}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}
