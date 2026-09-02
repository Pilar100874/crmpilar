import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Bell, Copy, Download, Loader2, Save, CheckCircle2, AlertTriangle, Send } from "lucide-react";

interface DadosArquivo {
  projectId: string;
  packageName: string;
  appId: string;
}

/** Extrai os dados úteis do google-services.json (sem depender de campos opcionais). */
function lerArquivo(texto: string): { dados?: DadosArquivo; erro?: string } {
  let json: Record<string, unknown>;
  try {
    json = JSON.parse(texto);
  } catch {
    return { erro: "O conteúdo não é um JSON válido. Cole o arquivo inteiro, do { ao }." };
  }
  const info = json.project_info as { project_id?: string } | undefined;
  const clientes = json.client as Array<Record<string, unknown>> | undefined;
  const cliente = clientes?.[0];
  const clientInfo = cliente?.client_info as
    | { mobilesdk_app_id?: string; android_client_info?: { package_name?: string } }
    | undefined;
  const projectId = info?.project_id;
  const appId = clientInfo?.mobilesdk_app_id;
  const packageName = clientInfo?.android_client_info?.package_name;
  if (!projectId || !appId || !packageName) {
    return { erro: "Arquivo incompleto: use o google-services.json baixado do Firebase (app Android)." };
  }
  return { dados: { projectId, appId, packageName } };
}

const PACOTE_ESPERADO = "br.com.pilar.interfone";

export default function PushFirebaseCard() {
  const { toast } = useToast();
  const [id, setId] = useState<string | null>(null);
  const [texto, setTexto] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [testando, setTestando] = useState(false);

  const carregar = useCallback(async () => {
    setCarregando(true);
    const { data } = await supabase
      .from("port_push_config")
      .select("id, google_services_json")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (data) {
      setId(data.id as string);
      setTexto((data.google_services_json as string) ?? "");
    }
    setCarregando(false);
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const leitura = useMemo(() => (texto.trim() ? lerArquivo(texto) : {}), [texto]);

  const salvar = async () => {
    const { dados, erro } = lerArquivo(texto);
    if (erro || !dados) {
      toast({ title: "Arquivo inválido", description: erro, variant: "destructive" });
      return;
    }
    setSalvando(true);
    const payload = {
      google_services_json: texto.trim(),
      project_id: dados.projectId,
      package_name: dados.packageName,
      app_id: dados.appId,
      updated_at: new Date().toISOString(),
    };
    const { error } = id
      ? await supabase.from("port_push_config").update(payload).eq("id", id)
      : await supabase.from("port_push_config").insert(payload);
    setSalvando(false);
    if (error) {
      toast({ title: "Não foi possível salvar", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Configuração salva", description: "O próximo APK gerado já sai com o push ativo." });
    await carregar();
  };

  const copiar = async () => {
    await navigator.clipboard.writeText(texto);
    toast({ title: "Copiado", description: "Cole no segredo GOOGLE_SERVICES_JSON do GitHub." });
  };

  const baixar = () => {
    const url = URL.createObjectURL(new Blob([texto], { type: "application/json" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "google-services.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const testar = async (tipo: "campainha" | "sip") => {
    setTestando(true);
    const { data, error } = await supabase.functions.invoke("portaria-push-campainha", {
      body: {
        tipo,
        titulo: tipo === "sip" ? "Teste do ramal SIP" : "Teste da campainha",
        corpo: "Se você recebeu esta notificação, o push está funcionando.",
      },
    });
    setTestando(false);
    const resposta = data as { ok?: boolean; enviados?: number; mensagem?: string } | null;
    toast({
      title: resposta?.ok ? `Enviado para ${resposta.enviados ?? 0} aparelho(s)` : "Não foi possível enviar",
      description: resposta?.mensagem ?? error?.message,
      variant: resposta?.ok ? undefined : "destructive",
    });
  };

  const pacoteDiferente = leitura.dados && leitura.dados.packageName !== PACOTE_ESPERADO;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Push nativo (Firebase)
          </CardTitle>
          <CardDescription>
            Cole aqui o arquivo <strong>google-services.json</strong> do Firebase. Ele é usado para gerar o APK
            <strong> Pilar Portaria</strong> com aviso de campainha e de chamada no ramal SIP mesmo com o app fechado.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Conteúdo do google-services.json</Label>
            <Textarea
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              placeholder='{ "project_info": { ... }, "client": [ ... ] }'
              className="font-mono text-xs min-h-[180px]"
              disabled={carregando}
            />
          </div>

          {leitura.erro && texto.trim() && (
            <p className="text-sm text-destructive flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" /> {leitura.erro}
            </p>
          )}

          {leitura.dados && (
            <div className="flex flex-wrap gap-2 text-xs">
              <Badge variant="secondary">Projeto: {leitura.dados.projectId}</Badge>
              <Badge variant="secondary">Pacote: {leitura.dados.packageName}</Badge>
              <Badge variant="secondary">App ID: {leitura.dados.appId}</Badge>
              {pacoteDiferente ? (
                <Badge variant="destructive">Pacote diferente do app ({PACOTE_ESPERADO})</Badge>
              ) : (
                <Badge className="bg-emerald-600 hover:bg-emerald-600">
                  <CheckCircle2 className="h-3 w-3 mr-1" /> Pacote correto
                </Badge>
              )}
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <Button onClick={salvar} disabled={salvando || carregando || !texto.trim()}>
              {salvando ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Salvar
            </Button>
            <Button variant="outline" onClick={copiar} disabled={!texto.trim()}>
              <Copy className="h-4 w-4 mr-2" /> Copiar
            </Button>
            <Button variant="outline" onClick={baixar} disabled={!texto.trim()}>
              <Download className="h-4 w-4 mr-2" /> Baixar arquivo
            </Button>
            <Button variant="secondary" onClick={() => testar("campainha")} disabled={testando}>
              {testando ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
              Testar campainha
            </Button>
            <Button variant="secondary" onClick={() => testar("sip")} disabled={testando}>
              <Send className="h-4 w-4 mr-2" /> Testar ramal SIP
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Passo a passo para gerar o arquivo</CardTitle>
          <CardDescription>Leva cerca de 5 minutos e só precisa ser feito uma vez.</CardDescription>
        </CardHeader>
        <CardContent>
          <ol className="list-decimal pl-5 space-y-2 text-sm text-muted-foreground">
            <li>
              Acesse <strong>console.firebase.google.com</strong> e entre com a conta Google da empresa.
            </li>
            <li>
              Clique em <strong>Adicionar projeto</strong>, dê o nome <strong>Pilar Portaria</strong> e conclua
              (o Google Analytics pode ficar desativado).
            </li>
            <li>
              Dentro do projeto, clique no ícone do <strong>Android</strong> para registrar o aplicativo.
            </li>
            <li>
              Em <strong>Nome do pacote Android</strong>, informe exatamente:{" "}
              <code className="px-1 py-0.5 bg-muted rounded text-xs">{PACOTE_ESPERADO}</code>. Apelido:{" "}
              <strong>Pilar Portaria</strong>. O certificado SHA-1 pode ficar em branco.
            </li>
            <li>
              Clique em <strong>Registrar app</strong> e depois em{" "}
              <strong>Fazer download do google-services.json</strong>.
            </li>
            <li>
              Em <strong>Configurações do projeto → Cloud Messaging</strong>, confirme que a{" "}
              <strong>Firebase Cloud Messaging API (V1)</strong> está ativada.
            </li>
            <li>
              Abra o arquivo baixado em um editor de texto, copie todo o conteúdo e cole no campo acima. Clique em{" "}
              <strong>Salvar</strong>.
            </li>
            <li>
              Gere o APK novamente (workflow <strong>Build Pilar Interfone APK</strong>). O build pega este arquivo
              automaticamente e o app passa a receber campainha e chamadas do ramal SIP com o celular bloqueado.
            </li>
            <li>
              Por fim, em <strong>Configurações do projeto → Contas de serviço</strong>, gere uma{" "}
              <strong>nova chave privada</strong> e nos envie para cadastrarmos o envio das notificações pelo servidor
              (isso é feito uma única vez).
            </li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
