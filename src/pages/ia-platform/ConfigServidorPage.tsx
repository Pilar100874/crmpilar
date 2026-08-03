import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  PlugZap,
  Save,
  SendHorizonal,
  ShieldCheck,
  Trash2,
  Wand2,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { agentRunner } from "@/lib/aip/runner";

interface ItemConfig {
  chave: string;
  mascara: string | null;
  atualizado_em: string;
  enviado_em: string | null;
}

const CAMPOS: { chave: string; rotulo: string; ajuda: string; segredo: boolean }[] = [
  {
    chave: "ANTHROPIC_API_KEY",
    rotulo: "Anthropic API Key",
    ajuda: "Chave do Claude usada pelo Agent SDK (console.anthropic.com).",
    segredo: true,
  },
  {
    chave: "SUPABASE_URL",
    rotulo: "URL do backend",
    ajuda: "URL do backend que o servidor usa para gravar execuções e assets.",
    segredo: false,
  },
  {
    chave: "SUPABASE_SERVICE_ROLE_KEY",
    rotulo: "Chave de serviço do backend",
    ajuda: "Permite ao servidor gravar resultados. Guarde com muito cuidado.",
    segredo: true,
  },
  {
    chave: "RAILWAY_DEPLOY_HOOK_URL",
    rotulo: "Deploy Hook (Railway)",
    ajuda: "URL do Deploy Hook usada para redeploy remoto do servidor.",
    segredo: true,
  },
  {
    chave: "WORKSPACE_DIR",
    rotulo: "Diretório de trabalho",
    ajuda: "Pasta usada nas execuções (padrão /tmp).",
    segredo: false,
  },
  { chave: "APP_VERSION", rotulo: "Versão exibida", ajuda: "Rótulo de versão do servidor.", segredo: false },
  {
    chave: "HIGGSFIELD_API_KEY",
    rotulo: "Higgsfield API Key",
    ajuda: "Geração de vídeos/imagens pelo Higgsfield.",
    segredo: true,
  },
  {
    chave: "REMOTION_LICENSE_KEY",
    rotulo: "Remotion License Key",
    ajuda: "Renderização de vídeos com Remotion.",
    segredo: true,
  },
  { chave: "OPENAI_API_KEY", rotulo: "OpenAI API Key", ajuda: "Modelos e imagens da OpenAI.", segredo: true },
  {
    chave: "PLAYWRIGHT_BROWSERS_PATH",
    rotulo: "Playwright browsers path",
    ajuda: "Caminho dos navegadores do Playwright no servidor.",
    segredo: false,
  },
];

/** Valores que o próprio CRM já conhece e podem ser preenchidos sozinhos. */
function sugestoesAutomaticas(): Record<string, string> {
  const s: Record<string, string> = {
    WORKSPACE_DIR: "/tmp",
    PLAYWRIGHT_BROWSERS_PATH: "/ms-playwright",
    APP_VERSION: `crm-pilar-${new Date().toISOString().slice(0, 10)}`,
  };
  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  if (url) s.SUPABASE_URL = url;
  return s;
}

async function chamar(acao: string, extra: Record<string, unknown> = {}) {
  const { data, error } = await supabase.functions.invoke("aip-server-config", {
    body: { acao, ...extra },
  });
  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(data.error);
  return data;
}

export default function ConfigServidorPage() {
  const [itens, setItens] = useState<ItemConfig[]>([]);
  const [valores, setValores] = useState<Record<string, string>>({});
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [testando, setTestando] = useState(false);
  const [saude, setSaude] = useState<Record<string, unknown> | null>(null);

  const testarConexao = async (silencioso = false) => {
    setTestando(true);
    try {
      const r = await agentRunner.health();
      setSaude(r ?? { ok: false, motivo: "Sem resposta do servidor" });
      if (!silencioso) {
        r?.ok
          ? toast.success("Servidor online")
          : toast.warning(r?.motivo ?? "Servidor não respondeu corretamente");
      }
    } catch (e) {
      setSaude({ ok: false, motivo: (e as Error).message });
      if (!silencioso) toast.error(`Falha na conexão: ${(e as Error).message}`);
    } finally {
      setTestando(false);
    }
  };



  const preencherAuto = (salvos: ItemConfig[], avisar = false) => {
    const sug = sugestoesAutomaticas();
    const faltantes = Object.entries(sug).filter(([chave]) => !salvos.some((i) => i.chave === chave));
    if (!faltantes.length) {
      if (avisar) toast.info("Todos os valores automáticos já estão salvos");
      return;
    }
    setValores((v) => {
      const novo = { ...v };
      faltantes.forEach(([chave, valor]) => {
        if (!novo[chave]?.trim()) novo[chave] = valor;
      });
      return novo;
    });
    if (avisar) toast.success(`${faltantes.length} campo(s) preenchido(s) automaticamente`);
  };

  const carregar = async () => {
    setCarregando(true);
    try {
      const r = await chamar("listar");
      const lista: ItemConfig[] = r.itens ?? [];
      setItens(lista);
      preencherAuto(lista);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    void carregar();
  }, []);


  const salvar = async () => {
    const preenchidos = Object.entries(valores)
      .filter(([, v]) => v.trim())
      .map(([chave, valor]) => ({ chave, valor }));
    if (!preenchidos.length) {
      toast.warning("Preencha ao menos um campo");
      return 0;
    }
    setSalvando(true);
    try {
      const r = await chamar("salvar", { itens: preenchidos });
      toast.success(`${r.gravadas?.length ?? 0} configuração(ões) salva(s) com segurança`);
      setValores({});
      await carregar();
      return r.gravadas?.length ?? preenchidos.length;
    } catch (e) {
      toast.error((e as Error).message);
      throw e;
    } finally {
      setSalvando(false);
    }
  };

  /** Salva → envia ao servidor → confirma que ficou online já com as chaves novas. */
  const salvarEAplicar = async () => {
    const pendentes = Object.values(valores).filter((v) => v.trim()).length;
    setAplicando(true);
    setEtapas([
      { rotulo: "Salvar com segurança", estado: "rodando" },
      { rotulo: "Enviar ao servidor", estado: "pendente" },
      { rotulo: "Confirmar aplicação", estado: "pendente" },
    ]);
    const marcar = (i: number, estado: Etapa["estado"], detalhe?: string) =>
      setEtapas((e) => e.map((x, idx) => (idx === i ? { ...x, estado, detalhe } : x)));

    try {
      if (pendentes) {
        const n = await salvar();
        marcar(0, "ok", `${n} valor(es) gravado(s)`);
      } else {
        marcar(0, "ok", "nenhum valor novo — usando os já salvos");
      }

      marcar(1, "rodando");
      const envio = await chamar("enviar");
      if (!envio?.ok) {
        marcar(1, "erro", envio?.erro ?? "Falha ao enviar as chaves");
        toast.error(envio?.erro ?? "Falha ao enviar as chaves");
        return;
      }
      const aplicadas = (envio.aplicadas ?? []).length;
      marcar(1, "ok", `${aplicadas} chave(s) aplicada(s)`);
      await carregar();

      marcar(2, "rodando");
      // O servidor reinicia o processo ao aplicar as chaves: aguardar e reconferir.
      let saudavel: Record<string, unknown> | null = null;
      for (let tentativa = 0; tentativa < 6; tentativa++) {
        await new Promise((r) => setTimeout(r, tentativa === 0 ? 1500 : 2500));
        try {
          const r = await agentRunner.health();
          if (r?.ok) {
            saudavel = r;
            break;
          }
          saudavel = r ?? null;
        } catch {
          saudavel = null;
        }
      }
      setSaude(saudavel ?? { ok: false, motivo: "Servidor não respondeu após aplicar as chaves" });
      if (saudavel?.ok) {
        marcar(2, "ok", "servidor online com as configurações novas");
        toast.success("Configurações aplicadas e confirmadas no servidor");
      } else {
        marcar(2, "erro", "servidor não confirmou o retorno — tente testar a conexão de novo");
        toast.warning("Chaves enviadas, mas o servidor ainda não respondeu");
      }
    } catch (e) {
      setEtapas((et) => et.map((x) => (x.estado === "rodando" ? { ...x, estado: "erro", detalhe: (e as Error).message } : x)));
      toast.error((e as Error).message);
    } finally {
      setAplicando(false);
    }
  };



  const enviar = async () => {
    setEnviando(true);
    try {
      const r = await chamar("enviar");
      r.ok
        ? toast.success(`Enviado ao servidor: ${(r.aplicadas ?? []).length} chave(s) aplicada(s)`)
        : toast.error(r.erro ?? "Falha ao enviar");
      await carregar();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setEnviando(false);
    }
  };

  const remover = async (chave: string) => {
    try {
      await chamar("remover", { chave });
      toast.success(`${chave} removida`);
      await carregar();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const salvo = (chave: string) => itens.find((i) => i.chave === chave);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Configurações do servidor</h2>
        <p className="text-sm text-muted-foreground">
          Envie pelo CRM as chaves usadas pelo servidor de execução (Claude Agent SDK). Os valores
          ficam criptografados no banco e só são decifrados no momento do envio.
        </p>
      </div>

      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Área sensível</AlertTitle>
        <AlertDescription>
          Chaves enviadas por aqui dão ao servidor acesso a serviços pagos e ao banco de dados.
          Somente perfis <strong>admin</strong> e <strong>gestor</strong> conseguem usar esta tela e
          nenhum valor volta em claro para o navegador.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <PlugZap className="h-4 w-4 text-primary" /> Conexão com o backend
          </CardTitle>
          <CardDescription>
            Verifique se o servidor de execução está online e se as chaves essenciais foram
            reconhecidas.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" onClick={() => testarConexao()} disabled={testando}>
              {testando ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <PlugZap className="mr-2 h-4 w-4" />
              )}
              Testar conexão
            </Button>
            {saude === null ? (
              <Badge variant="outline">não testado</Badge>
            ) : saude.ok ? (
              <Badge className="gap-1 bg-emerald-600">
                <CheckCircle2 className="h-3.5 w-3.5" /> Online
              </Badge>
            ) : (
              <Badge variant="destructive" className="gap-1">
                <XCircle className="h-3.5 w-3.5" /> Offline
              </Badge>
            )}
            {saude?.ok && saude.versao ? (
              <Badge variant="secondary">versão {String(saude.versao)}</Badge>
            ) : null}
            {saude?.ok && typeof saude.anthropic === "boolean" && (
              <Badge variant={saude.anthropic ? "secondary" : "outline"}>
                Anthropic {saude.anthropic ? "ok" : "sem chave"}
              </Badge>
            )}
            {saude?.ok && typeof saude.supabase === "boolean" && (
              <Badge variant={saude.supabase ? "secondary" : "outline"}>
                Backend {saude.supabase ? "ok" : "sem chave"}
              </Badge>
            )}
          </div>
          {saude && !saude.ok && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Não foi possível conectar</AlertTitle>
              <AlertDescription className="break-words">
                {String(saude.motivo ?? saude.erro ?? "Erro desconhecido ao contatar o servidor.")}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldCheck className="h-4 w-4 text-primary" /> Valores
          </CardTitle>
          <CardDescription>
            Deixe em branco para manter o valor já salvo. Ao salvar, clique em “Enviar ao servidor”
            para aplicar sem precisar mexer no Railway.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {carregando ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Carregando…
            </div>
          ) : (
            CAMPOS.map((campo) => {
              const atual = salvo(campo.chave);
              return (
                <div key={campo.chave} className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <Label htmlFor={campo.chave}>{campo.rotulo}</Label>
                    <code className="rounded bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground">
                      {campo.chave}
                    </code>
                    {atual ? (
                      <Badge variant="secondary">salvo: {atual.mascara}</Badge>
                    ) : (
                      <Badge variant="outline">não configurado</Badge>
                    )}
                    {atual?.enviado_em && <Badge className="bg-emerald-600">enviado</Badge>}
                    {atual && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-destructive"
                        onClick={() => remover(campo.chave)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                  <Input
                    id={campo.chave}
                    type={campo.segredo ? "password" : "text"}
                    autoComplete="off"
                    placeholder={atual ? "•••••• (manter atual)" : campo.ajuda}
                    value={valores[campo.chave] ?? ""}
                    onChange={(e) =>
                      setValores((v) => ({ ...v, [campo.chave]: e.target.value }))
                    }
                  />
                  <p className="text-xs text-muted-foreground">{campo.ajuda}</p>
                </div>
              );
            })
          )}

          <Separator />
          <div className="flex flex-wrap gap-2">
            <Button onClick={salvar} disabled={salvando}>
              {salvando ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Salvar com segurança
            </Button>
            <Button variant="secondary" onClick={enviar} disabled={enviando}>
              {enviando ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <SendHorizonal className="mr-2 h-4 w-4" />
              )}
              Enviar ao servidor
            </Button>
            <Button variant="outline" onClick={() => preencherAuto(itens, true)}>
              <Wand2 className="mr-2 h-4 w-4" /> Preencher automático
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            O preenchimento automático usa os valores que o próprio CRM já conhece (URL do backend,
            diretório de trabalho, caminho do Playwright e versão). Chaves secretas continuam sendo
            digitadas manualmente.
          </p>

        </CardContent>
      </Card>
    </div>
  );
}
