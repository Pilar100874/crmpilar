import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Download, Monitor, CheckCircle2, Copy, Database, Key, Camera,
  Smartphone, Clock, Shield, Info,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import winAsset from "../../public/coletor/ColetorPilar-Setup.msi.asset.json";

const SUPABASE_URL = "https://ioxugupvxlcdweldocmq.supabase.co";
const SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlveHVndXB2eGxjZHdlbGRvY21xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA3MTEwODUsImV4cCI6MjA3NjI4NzA4NX0.WKRpPgsfohk4BRyHthLmz23F2Iab-vPObkioUeFkzWc";

const baixar = (file: string, url: string) => {
  const a = document.createElement("a");
  a.href = url;
  a.download = file;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  toast.success("Download iniciado");
};

export default function AdminApps() {
  const [camerasEnabled, setCamerasEnabled] = useState(false);
  const [pontoEnabled, setPontoEnabled] = useState(true);
  const [cfgId, setCfgId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("cv_coletor_config").select("*").maybeSingle();
      if (data) {
        setCamerasEnabled(data.cameras_habilitado);
        setPontoEnabled((data as any).ponto_habilitado ?? true);
        setCfgId(data.id);
      }
    })();
  }, []);

  const persist = async (patch: { cameras_habilitado?: boolean; ponto_habilitado?: boolean }) => {
    if (cfgId) {
      await supabase.from("cv_coletor_config").update(patch).eq("id", cfgId);
    } else {
      const { data } = await supabase.from("cv_coletor_config").insert(patch).select().single();
      if (data) setCfgId(data.id);
    }
  };

  const toggleCameras = async (v: boolean) => {
    setCamerasEnabled(v);
    await persist({ cameras_habilitado: v });
    toast.success(v ? "Módulo de câmeras habilitado" : "Módulo de câmeras desabilitado");
  };

  const togglePonto = async (v: boolean) => {
    setPontoEnabled(v);
    await persist({ ponto_habilitado: v });
    toast.success(v ? "Módulo de ponto habilitado" : "Módulo de ponto desabilitado");
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 p-4 sm:p-6">
      <div>
        <h1 className="text-2xl font-semibold sm:text-3xl">Apps & Instaladores</h1>
        <p className="text-sm text-muted-foreground">
          Central de downloads dos aplicativos auxiliares do CRM Pilar: Coletor Desktop (Ponto + Câmeras)
          e APK Pilar SMS.
        </p>
      </div>

      {/* Dados de conexão comuns */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="space-y-3 p-5">
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Dados de conexão (para configurar os apps)</h3>
          </div>
          <p className="text-xs text-muted-foreground">
            Após instalar qualquer um dos apps abaixo, cole estes dados na tela de configuração inicial:
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5 rounded-lg border bg-background p-3.5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <Database className="h-3.5 w-3.5 text-primary" /> URL do backend
                </span>
                <Button variant="ghost" size="icon" className="h-7 w-7"
                  onClick={() => { navigator.clipboard.writeText(SUPABASE_URL); toast.success("URL copiada!"); }}>
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              </div>
              <code className="block select-all break-all rounded border bg-muted/60 p-2 text-xs font-mono">
                {SUPABASE_URL}
              </code>
            </div>
            <div className="space-y-1.5 rounded-lg border bg-background p-3.5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <Key className="h-3.5 w-3.5 text-yellow-500" /> Chave Anon
                </span>
                <Button variant="ghost" size="icon" className="h-7 w-7"
                  onClick={() => { navigator.clipboard.writeText(SUPABASE_ANON); toast.success("Chave copiada!"); }}>
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              </div>
              <code className="block select-all break-all rounded border bg-muted/60 p-2 text-xs font-mono truncate max-w-full" title="Clique em copiar">
                eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...eFkzWc
              </code>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Coletor Desktop UNIFICADO */}
      <Card>
        <CardHeader>
          <CardTitle className="flex flex-wrap items-center gap-2">
            <Monitor className="h-5 w-5 text-primary" />
            Coletor Desktop (Ponto + Câmeras)
            <Badge variant="secondary">Windows · MSI x64</Badge>
          </CardTitle>
          <CardDescription>
            Um único aplicativo instalado no PC da rede. Roda como serviço do Windows e pode
            operar os dois módulos ao mesmo tempo, cada um ligado/desligado de forma independente
            direto por esta tela — a configuração é sincronizada com o app em segundos.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Card className="border-primary/20">
              <CardContent className="flex items-start justify-between gap-3 p-4">
                <div className="flex items-start gap-3">
                  <Clock className="mt-0.5 h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium">Módulo de Ponto</p>
                    <p className="text-xs text-muted-foreground">
                      Coleta batidas TCP/IP dos relógios REP (Control iD, Henry, Topdata, ZKTeco…),
                      com assinatura SHA-256, NSR e retenção local de 7 dias.
                    </p>
                  </div>
                </div>
                <Switch checked={pontoEnabled} onCheckedChange={togglePonto} />
              </CardContent>
            </Card>

            <Card className="border-primary/20">
              <CardContent className="flex items-start justify-between gap-3 p-4">
                <div className="flex items-start gap-3">
                  <Camera className="mt-0.5 h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium">Módulo de Câmeras IP</p>
                    <p className="text-xs text-muted-foreground">
                      Captura snapshots das câmeras internas cadastradas em Controle de Veículos → Câmeras.
                    </p>
                  </div>
                </div>
                <Switch checked={camerasEnabled} onCheckedChange={toggleCameras} />
              </CardContent>
            </Card>
          </div>

          <div className="flex items-center justify-between gap-4 rounded-md border p-4">
            <div className="flex items-center gap-3">
              <Monitor className="h-8 w-8 text-primary" />
              <div>
                <p className="font-semibold">Windows 10/11 (Instalador MSI · x64)</p>
                <p className="text-xs text-muted-foreground">
                  Instala em <code>C:\Program Files\ColetorPilar</code> · atalho no Menu Iniciar · inicialização automática com o Windows.
                </p>
              </div>
            </div>
            <Button onClick={() => baixar("ColetorPilar-Setup.msi", winAsset.url)}>
              <Download className="mr-2 h-4 w-4" /> Baixar .msi
            </Button>
          </div>

          <div className="rounded-md bg-muted/40 p-4 text-sm space-y-2">
            <p className="font-medium">Como instalar e usar</p>
            <ol className="ml-5 list-decimal space-y-1 text-muted-foreground">
              <li>Baixe o <b>ColetorPilar-Setup.msi</b> acima e execute com dois cliques. Se o Windows SmartScreen alertar, clique em <b>Mais informações → Executar assim mesmo</b>.</li>
              <li>Abra o app pelo <b>Menu Iniciar → Coletor Pilar</b> (ele também abre sozinho no próximo boot).</li>
              <li>Cole a <b>URL do backend</b> e a <b>Chave Anon</b> mostradas acima, e faça login com seu usuário do CRM.</li>
              <li>Ative os módulos que você vai usar (Ponto e/ou Câmeras) usando os interruptores acima nesta tela.</li>
              <li>Cadastre os equipamentos:
                <ul className="ml-5 list-disc mt-1">
                  <li><b>Ponto:</b> em <b>Controle de Ponto → Equipamentos</b>, informe IP interno, porta e credenciais de cada REP.</li>
                  <li><b>Câmeras:</b> em <b>Controle de Veículos → Câmeras</b>, informe URL RTSP/HTTP de cada câmera.</li>
                </ul>
              </li>
              <li>Sincronização automática: batidas a cada 60s (com NSR + hash SHA-256) e snapshots conforme configurado por câmera. Compatível com Portaria 671/2021.</li>
            </ol>
            <p className="text-xs text-muted-foreground pt-1">
              <b>Marcas de relógio suportadas:</b> Control iD (REP iDClass, iDFace) · Henry (Prisma, Hexa) · Topdata (Inner Rep) · ZKTeco · Madis · qualquer REP compatível com a Portaria 671/2021.
            </p>
          </div>

          <div className="flex items-start gap-2 rounded-md border border-primary/20 bg-primary/5 p-3 text-xs text-muted-foreground">
            <Info className="mt-0.5 h-4 w-4 text-primary flex-shrink-0" />
            <p>
              <b>Dica de infraestrutura:</b> se o PC principal cair, o coletor para. Para produção
              recomendamos um <b>mini-PC dedicado</b> (ex.: Intel NUC) sempre ligado, na mesma rede
              dos relógios e das câmeras.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Pilar SMS (APK) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5 text-primary" />
            Pilar SMS (APK Android)
            <Badge variant="secondary" className="ml-2">Android · Gratuito</Badge>
          </CardTitle>
          <CardDescription>
            App próprio que transforma um celular Android com chip em gateway de SMS do CRM.
            O CRM enfileira as mensagens e o APK consulta a fila a cada 5s, enviando pelo <code>SmsManager</code> nativo.
            Não exige IP público, roteador exposto ou Cloudflare — igual ao Coletor Desktop.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between gap-4 rounded-md border p-4">
            <div className="flex items-center gap-3">
              <Shield className="h-8 w-8 text-primary" />
              <div>
                <p className="font-semibold">Pilar SMS v1.2.0</p>
                <p className="text-xs text-muted-foreground">Modo Fila · consumo mínimo de bateria</p>
              </div>
            </div>
            <Button asChild>
              <a href="/pilar-sms-v1.2.0.apk" download>
                <Download className="mr-2 h-4 w-4" /> Baixar APK
              </a>
            </Button>
          </div>

          <div className="rounded-md bg-muted/40 p-4 text-sm space-y-2">
            <p className="font-medium">Como instalar e usar</p>
            <ol className="ml-5 list-decimal space-y-1 text-muted-foreground">
              <li>Em <b>Atendimento → Configurações → SMS</b>, cadastre um celular autorizado (ex.: "Celular Recepção") e copie o <b>token</b> gerado.</li>
              <li>No Android que ficará ligado 24h com o chip, ative <b>Fontes desconhecidas</b> em Configurações e instale o <b>APK</b> baixado acima.</li>
              <li>Abra o app, conceda permissão de <b>Enviar SMS</b> e <b>desative a otimização de bateria</b> para o Pilar SMS.</li>
              <li>Cole o <b>token</b> no app e toque em <b>Conectar</b>. O app já começa a processar a fila.</li>
              <li>O status do celular (último ping e bateria) aparece automaticamente na lista de celulares autorizados.</li>
            </ol>
            <p className="text-xs text-muted-foreground pt-1">
              <b>Dica:</b> mantenha o celular sempre carregando. Se cair a conexão, os SMS ficam na fila e são reenviados assim que o celular voltar. Vários celulares podem ser cadastrados — eles dividem a fila automaticamente.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-start gap-2 rounded-md border border-primary/20 bg-primary/5 p-3 text-xs text-muted-foreground">
        <Info className="mt-0.5 h-4 w-4 text-primary flex-shrink-0" />
        <p>
          Todos os apps conectam via HTTPS diretamente ao backend, com assinatura digital das mensagens
          e retenção local temporária em caso de queda de rede. Compatíveis com Portaria 671/2021 (ponto) e LGPD.
        </p>
      </div>

      <div className="flex items-center gap-2 rounded-md border p-3 text-sm">
        <CheckCircle2 className="h-4 w-4 text-success" />
        <span>Precisa de ajuda? Abra um <b>Ticket de Suporte</b> no menu de usuário.</span>
      </div>
    </div>
  );
}
