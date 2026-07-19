import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Bot, KeyRound, ShieldCheck, Copy, Check, BookOpen, Sparkles, Terminal, ExternalLink } from "lucide-react";

const MCP_URL = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/mcp`;

const FERRAMENTAS = [
  { nome: "whoami", desc: "Retorna dados do usuário autenticado (id, e-mail, papel)." },
  { nome: "list_empresas", desc: "Lista as empresas visíveis ao usuário conectado, respeitando as permissões (RLS)." },
  { nome: "list_produtos", desc: "Lista os produtos cadastrados que o usuário pode acessar." },
];

const EXEMPLOS = [
  {
    titulo: "No ChatGPT",
    passos: [
      'Abra Configurações → Conectores → “Adicionar conector personalizado (MCP)”.',
      `Cole a URL: ${MCP_URL}`,
      "Faça login com seu usuário do Pilar quando abrir a janela de consentimento.",
      'Pergunte por exemplo: “Liste minhas empresas cadastradas no Pilar”.',
    ],
  },
  {
    titulo: "No Claude Desktop / Cursor",
    passos: [
      "Vá em Settings → MCP Servers → Add server.",
      `Informe a URL: ${MCP_URL} (tipo: OAuth 2.1).`,
      "Aprove o acesso na tela de consentimento do Pilar.",
      'Digite: “Quais os últimos 10 produtos cadastrados?” ou “Quem sou eu no sistema?”.',
    ],
  },
  {
    titulo: "Casos de uso",
    passos: [
      "Consultar rapidamente empresas, contatos e produtos sem abrir o sistema.",
      "Pedir para a IA gerar relatórios cruzando dados que ela consulta via MCP.",
      "Automatizar respostas de atendimento baseadas em dados reais da sua conta.",
      "Criar assistentes de vendas que respondem sobre o catálogo em tempo real.",
    ],
  },
];

export default function AgentIntegrations() {
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState("");
  const [autenticando, setAutenticando] = useState(false);
  const [autenticado, setAutenticado] = useState(false);
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user?.email) setEmail(data.user.email);
      if (data.user) setAutenticado(true);
    });
  }, []);

  const handleAutenticar = async () => {
    if (!email || !password) {
      toast.error("Informe e-mail e senha");
      return;
    }
    setAutenticando(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setAutenticando(false);
    if (error) {
      toast.error("Falha ao autenticar: " + error.message);
      setAutenticado(false);
      return;
    }
    toast.success("Autenticado com sucesso!");
    setAutenticado(true);
    setPassword("");
  };

  const copiarUrl = async () => {
    await navigator.clipboard.writeText(MCP_URL);
    setCopiado(true);
    toast.success("URL copiada");
    setTimeout(() => setCopiado(false), 2000);
  };

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-start gap-3">
        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <Bot className="w-6 h-6 text-primary" />
        </div>
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold">Integrações com Agentes (MCP)</h1>
          <p className="text-sm text-muted-foreground">
            Conecte o Pilar ao ChatGPT, Claude, Cursor e outros assistentes de IA através do protocolo MCP.
          </p>
        </div>
      </div>

      <Alert>
        <ShieldCheck className="h-4 w-4" />
        <AlertTitle>Conexão segura com OAuth 2.1</AlertTitle>
        <AlertDescription>
          Cada assistente acessa apenas os dados que <b>você mesmo</b> pode enxergar no sistema. As permissões (RLS)
          são aplicadas normalmente, como se você estivesse usando o Pilar.
        </AlertDescription>
      </Alert>

      <Tabs defaultValue="manual" className="w-full">
        <TabsList className="grid grid-cols-3 w-full sm:w-auto">
          <TabsTrigger value="manual"><BookOpen className="w-4 h-4 mr-2" />Manual</TabsTrigger>
          <TabsTrigger value="exemplos"><Sparkles className="w-4 h-4 mr-2" />Exemplos</TabsTrigger>
          <TabsTrigger value="autenticar"><KeyRound className="w-4 h-4 mr-2" />Autenticar</TabsTrigger>
        </TabsList>

        <TabsContent value="manual" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">O que é?</CardTitle>
              <CardDescription>
                MCP (Model Context Protocol) é um padrão que permite que assistentes de IA conversem diretamente com o
                seu sistema Pilar, consultando dados e executando ações em seu nome.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-xs uppercase text-muted-foreground">URL do Servidor MCP</Label>
                <div className="flex gap-2 mt-1">
                  <Input readOnly value={MCP_URL} className="font-mono text-xs" />
                  <Button variant="outline" size="icon" onClick={copiarUrl}>
                    {copiado ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <Terminal className="w-4 h-4" /> Como conectar (passo a passo)
                </h3>
                <ol className="list-decimal pl-6 space-y-2 text-sm text-foreground/90">
                  <li>Copie a URL do servidor MCP acima.</li>
                  <li>No seu assistente (ChatGPT, Claude, Cursor…), procure a opção <b>Conectores MCP</b> ou <b>Add MCP Server</b>.</li>
                  <li>Cole a URL e escolha o tipo de autenticação <b>OAuth 2.1</b>.</li>
                  <li>O assistente abrirá uma janela de consentimento do Pilar — faça login e clique em <b>Aprovar</b>.</li>
                  <li>Pronto! Você já pode pedir para o assistente consultar dados do seu Pilar.</li>
                </ol>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Ferramentas disponíveis</h3>
                <div className="space-y-2">
                  {FERRAMENTAS.map((f) => (
                    <div key={f.nome} className="border rounded-md p-3 flex items-start gap-3">
                      <Badge variant="secondary" className="font-mono">{f.nome}</Badge>
                      <p className="text-sm text-muted-foreground flex-1">{f.desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              <Alert>
                <AlertDescription className="text-xs">
                  💡 Dica: novas ferramentas podem ser publicadas ao longo do tempo. Basta reconectar seu assistente
                  para atualizar a lista.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="exemplos" className="space-y-4 mt-4">
          {EXEMPLOS.map((ex) => (
            <Card key={ex.titulo}>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <ExternalLink className="w-4 h-4 text-primary" /> {ex.titulo}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ol className="list-decimal pl-6 space-y-1.5 text-sm text-foreground/90">
                  {ex.passos.map((p, i) => <li key={i}>{p}</li>)}
                </ol>
              </CardContent>
            </Card>
          ))}

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Perguntas que você pode fazer</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                {[
                  '“Quem sou eu no sistema Pilar?”',
                  '“Liste as 20 empresas mais recentes do meu cadastro.”',
                  '“Quais produtos com preço acima de R$ 500?”',
                  '“Monte um resumo em texto do meu catálogo por categoria.”',
                  '“Gere um relatório com os últimos clientes cadastrados.”',
                ].map((p, i) => (
                  <li key={i} className="bg-accent/40 border rounded-md p-3">{p}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="autenticar" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <KeyRound className="w-5 h-5" /> Autenticação
              </CardTitle>
              <CardDescription>
                Confirme sua senha para validar o acesso deste dispositivo. Isso garante que apenas você autorize
                a conexão de agentes ao seu Pilar.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 max-w-md">
              {autenticado && (
                <Alert>
                  <ShieldCheck className="h-4 w-4" />
                  <AlertTitle>Sessão ativa</AlertTitle>
                  <AlertDescription className="text-xs">
                    Você já está autenticado como <b>{email}</b>. Reautentique abaixo apenas se necessário.
                  </AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Digite sua senha"
                  onKeyDown={(e) => e.key === "Enter" && handleAutenticar()}
                />
              </div>

              <Button onClick={handleAutenticar} disabled={autenticando} className="w-full">
                {autenticando ? "Autenticando..." : "Autenticar"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
