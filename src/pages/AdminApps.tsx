import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Download, Monitor, CheckCircle2, Copy, Database, Key, Camera,
  Smartphone, Clock, Shield, Info, Apple, Terminal,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import winAsset from "../../public/coletor/ColetorPilar-Setup.msi.asset.json";
import macAppleAsset from "../../public/coletor/PontoColetor-macOS-AppleSilicon.asset.json";
import macIntelAsset from "../../public/coletor/PontoColetor-macOS-Intel.asset.json";
import linuxAsset from "../../public/coletor/PontoColetor-Linux.asset.json";

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

type Step = { text: React.ReactNode };

function AppTile(props: {
  accent: "blue" | "green";
  icon: React.ReactNode;
  platform: string;
  title: string;
  description: React.ReactNode;
  modules?: React.ReactNode;
  fileLabelBadge: string;
  fileName: string;
  onDownload: () => void;
  downloadButtonText: string;
  steps: Step[];
  footer?: React.ReactNode;
}) {
  const accentBox = props.accent === "blue"
    ? "bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-300"
    : "bg-green-50 text-green-600 dark:bg-green-950/40 dark:text-green-300";
  const accentHover = props.accent === "blue"
    ? "hover:border-blue-200 dark:hover:border-blue-900"
    : "hover:border-green-200 dark:hover:border-green-900";
  const btnColor = props.accent === "blue"
    ? "bg-blue-500 hover:bg-blue-400 text-white"
    : "bg-green-600 hover:bg-green-500 text-white";

  return (
    <Card className={`flex flex-col overflow-hidden rounded-2xl sm:rounded-3xl border shadow-sm transition-all duration-300 hover:shadow-xl ${accentHover}`}>
      <CardContent className="flex-1 p-5 sm:p-7 md:p-8">
        <div className="mb-5 flex items-start justify-between gap-3 sm:mb-6">
          <div className={`flex h-12 w-12 items-center justify-center rounded-xl sm:h-14 sm:w-14 sm:rounded-2xl ${accentBox}`}>
            {props.icon}
          </div>
          <span className="rounded-full border bg-muted px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground sm:px-3 sm:text-xs">
            {props.platform}
          </span>
        </div>

        <h2 className="mb-2 text-xl font-bold text-foreground sm:text-2xl">{props.title}</h2>
        <div className="mb-6 text-sm leading-relaxed text-muted-foreground sm:mb-8">{props.description}</div>

        {props.modules && <div className="mb-6 space-y-3 sm:mb-8">{props.modules}</div>}

        <div className="flex flex-col gap-3 rounded-2xl bg-foreground p-3 sm:flex-row sm:items-center sm:justify-between sm:gap-2 sm:p-2 sm:pl-4">
          <div className="flex min-w-0 flex-col">
            <span className="text-[10px] font-bold uppercase tracking-widest text-background/60">
              {props.fileLabelBadge}
            </span>
            <span className="truncate font-mono text-xs text-background sm:text-sm">{props.fileName}</span>
          </div>
          <Button
            onClick={props.onDownload}
            className={`w-full flex-shrink-0 rounded-xl px-5 py-3 text-sm font-bold transition-colors sm:w-auto sm:px-6 ${btnColor}`}
          >
            <Download className="mr-2 h-4 w-4" /> {props.downloadButtonText}
          </Button>
        </div>
      </CardContent>

      <div className="border-t bg-muted/40 p-5 sm:p-7 md:p-8">
        <h3 className="mb-4 text-xs font-bold uppercase tracking-widest text-muted-foreground">
          Como instalar e usar
        </h3>
        <ol className="space-y-4">
          {props.steps.map((s, i) => (
            <li key={i} className="flex gap-3 sm:gap-4">
              <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border bg-background text-xs font-bold text-foreground">
                {i + 1}
              </span>
              <p className="text-sm leading-relaxed text-muted-foreground">{s.text}</p>
            </li>
          ))}
        </ol>
        {props.footer}
      </div>
    </Card>
  );
}

function ModuleToggle({ icon: Icon, label, description, checked, onChange, accent }: {
  icon: any; label: string; description: string; checked: boolean; onChange: (v: boolean) => void; accent: "blue" | "green";
}) {
  const dot = accent === "blue" ? "bg-blue-500" : "bg-green-500";
  return (
    <div className="flex items-start justify-between gap-3 rounded-xl border bg-muted/40 p-4">
      <div className="flex items-start gap-3">
        <div className="mt-1 flex flex-col items-center gap-1">
          <span className={`h-2 w-2 rounded-full ${dot}`} />
        </div>
        <div>
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            <Icon className="h-4 w-4 text-muted-foreground" />
            {label}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

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
    <div className="mx-auto max-w-6xl space-y-5 p-3 sm:space-y-6 sm:p-6 md:p-8">
      <div>
        <h1 className="text-xl font-semibold sm:text-3xl">Apps &amp; Instaladores</h1>
        <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
          Central de downloads dos aplicativos auxiliares do CRM Pilar: Coletor Desktop (Ponto + Câmeras) e APK Pilar SMS.
        </p>
      </div>


      {/* Dados de conexão */}
      <Card className="rounded-3xl border-primary/20 bg-primary/5">
        <CardContent className="space-y-3 p-5 sm:p-6">
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Dados de conexão (para configurar os apps)</h3>
          </div>
          <p className="text-xs text-muted-foreground">
            Após instalar qualquer um dos apps abaixo, cole estes dados na tela de configuração inicial:
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="min-w-0 space-y-1.5 overflow-hidden rounded-lg border bg-background p-3.5 shadow-sm">
              <div className="flex items-center justify-between gap-2">
                <span className="flex min-w-0 items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <Database className="h-3.5 w-3.5 flex-shrink-0 text-primary" />
                  <span className="truncate">URL do backend</span>
                </span>
                <Button variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0"
                  onClick={() => { navigator.clipboard.writeText(SUPABASE_URL); toast.success("URL copiada!"); }}>
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              </div>
              <code className="block w-full select-all break-all rounded border bg-muted/60 p-2 font-mono text-[11px] leading-snug">
                {SUPABASE_URL}
              </code>
            </div>
            <div className="min-w-0 space-y-1.5 overflow-hidden rounded-lg border bg-background p-3.5 shadow-sm">
              <div className="flex items-center justify-between gap-2">
                <span className="flex min-w-0 items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <Key className="h-3.5 w-3.5 flex-shrink-0 text-yellow-500" />
                  <span className="truncate">Chave Anon</span>
                </span>
                <Button variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0"
                  onClick={() => { navigator.clipboard.writeText(SUPABASE_ANON); toast.success("Chave copiada!"); }}>
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              </div>
              <code className="block w-full select-all truncate rounded border bg-muted/60 p-2 font-mono text-[11px] leading-snug" title="Clique em copiar">
                eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9…eFkzWc
              </code>
            </div>
          </div>

        </CardContent>
      </Card>

      {/* Grid de apps */}
      <div className="grid grid-cols-1 gap-6 sm:gap-8 xl:grid-cols-2">
        <AppTile
          accent="blue"
          icon={<Monitor className="h-8 w-8" />}
          platform="Windows · MSI"
          title="Coletor Desktop"
          description={
            <>
              Um único aplicativo instalado no PC da rede. Roda como serviço do Windows e opera os módulos
              de <b>Ponto</b> e <b>Câmeras</b> ao mesmo tempo. Ative ou desative cada módulo direto por esta tela —
              a configuração é sincronizada com o app em segundos.
            </>
          }
          modules={
            <>
              <ModuleToggle
                accent="blue"
                icon={Clock}
                label="Módulo de Ponto"
                description="Coleta batidas TCP/IP dos relógios REP (Control iD, Henry, Topdata, ZKTeco…), com assinatura SHA-256, NSR e retenção local de 7 dias."
                checked={pontoEnabled}
                onChange={togglePonto}
              />
              <ModuleToggle
                accent="blue"
                icon={Camera}
                label="Módulo de Câmeras IP"
                description="Captura snapshots das câmeras internas cadastradas em Controle de Veículos → Câmeras."
                checked={camerasEnabled}
                onChange={toggleCameras}
              />
            </>
          }
          fileLabelBadge="Instalador"
          fileName="ColetorPilar-Setup.msi"
          onDownload={() => baixar("ColetorPilar-Setup.msi", winAsset.url)}
          downloadButtonText="Baixar .msi"
          steps={[
            { text: <>Baixe o <b>ColetorPilar-Setup.msi</b> acima e execute com dois cliques. Se o SmartScreen alertar, clique em <b>Mais informações → Executar assim mesmo</b>.</> },
            { text: <>Abra o app pelo <b>Menu Iniciar → Coletor Pilar</b> (ele também abre sozinho no próximo boot).</> },
            { text: <>Cole a <b>URL do backend</b> e a <b>Chave Anon</b> mostradas acima, e faça login com seu usuário do CRM.</> },
            { text: <>Ative os módulos que você vai usar (Ponto e/ou Câmeras) usando os interruptores acima nesta tela.</> },
            { text: <>Cadastre os equipamentos: relógios em <b>Controle de Ponto → Equipamentos</b> e câmeras em <b>Controle de Veículos → Câmeras</b>.</> },
            { text: <>Sincronização automática: batidas a cada 60s (NSR + hash SHA-256) e snapshots conforme configurado por câmera. Compatível com Portaria 671/2021.</> },
          ]}
          footer={
            <div className="mt-4 flex items-start gap-2 rounded-md border border-primary/20 bg-primary/5 p-3 text-xs text-muted-foreground">
              <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
              <p>
                <b>Dica:</b> se o PC principal cair, o coletor para. Para produção recomendamos um{" "}
                <b>mini-PC dedicado</b> (ex.: Intel NUC), sempre ligado, na mesma rede dos relógios e câmeras.
              </p>
            </div>
          }
        />

        {/* Coletor Desktop macOS / Linux */}
        <Card className="flex flex-col overflow-hidden rounded-2xl sm:rounded-3xl border shadow-sm transition-all duration-300 hover:shadow-xl hover:border-slate-300 dark:hover:border-slate-700">
          <CardContent className="flex-1 p-5 sm:p-7 md:p-8">
            <div className="mb-5 flex items-start justify-between gap-3 sm:mb-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl sm:h-14 sm:w-14 sm:rounded-2xl bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                <Apple className="h-8 w-8" />
              </div>
              <span className="rounded-full border bg-muted px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground sm:px-3 sm:text-xs">
                macOS · Linux
              </span>
            </div>

            <h2 className="mb-2 text-xl font-bold text-foreground sm:text-2xl">Coletor Desktop (Mac / Linux)</h2>
            <div className="mb-6 text-sm leading-relaxed text-muted-foreground sm:mb-8">
              Mesma funcionalidade do Coletor Windows, empacotado para <b>macOS</b> (Apple Silicon &amp; Intel)
              e <b>Linux</b>. Roda como app de bandeja com auto-início. Escolha o pacote correto para
              a arquitetura do seu Mac (M1/M2/M3 = Apple Silicon; Macs antigos = Intel).
            </div>

            <div className="space-y-3">
              <div className="flex flex-col gap-3 rounded-2xl bg-foreground p-3 sm:flex-row sm:items-center sm:justify-between sm:gap-2 sm:p-2 sm:pl-4">
                <div className="flex min-w-0 flex-col">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-background/60">
                    macOS · Apple Silicon (M1/M2/M3)
                  </span>
                  <span className="truncate font-mono text-xs text-background sm:text-sm">PontoColetor-macOS-AppleSilicon.zip</span>
                </div>
                <Button
                  onClick={() => baixar("PontoColetor-macOS-AppleSilicon.zip", macAppleAsset.url)}
                  className="w-full flex-shrink-0 rounded-xl bg-slate-200 px-5 py-3 text-sm font-bold text-slate-900 transition-colors hover:bg-slate-100 sm:w-auto sm:px-6"
                >
                  <Download className="mr-2 h-4 w-4" /> Baixar .zip
                </Button>
              </div>

              <div className="flex flex-col gap-3 rounded-2xl bg-foreground p-3 sm:flex-row sm:items-center sm:justify-between sm:gap-2 sm:p-2 sm:pl-4">
                <div className="flex min-w-0 flex-col">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-background/60">
                    macOS · Intel
                  </span>
                  <span className="truncate font-mono text-xs text-background sm:text-sm">PontoColetor-macOS-Intel.zip</span>
                </div>
                <Button
                  onClick={() => baixar("PontoColetor-macOS-Intel.zip", macIntelAsset.url)}
                  className="w-full flex-shrink-0 rounded-xl bg-slate-200 px-5 py-3 text-sm font-bold text-slate-900 transition-colors hover:bg-slate-100 sm:w-auto sm:px-6"
                >
                  <Download className="mr-2 h-4 w-4" /> Baixar .zip
                </Button>
              </div>

              <div className="flex flex-col gap-3 rounded-2xl bg-foreground p-3 sm:flex-row sm:items-center sm:justify-between sm:gap-2 sm:p-2 sm:pl-4">
                <div className="flex min-w-0 flex-col">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-background/60">
                    Linux · x64
                  </span>
                  <span className="truncate font-mono text-xs text-background sm:text-sm">PontoColetor-Linux.zip</span>
                </div>
                <Button
                  onClick={() => baixar("PontoColetor-Linux.zip", linuxAsset.url)}
                  className="w-full flex-shrink-0 rounded-xl bg-slate-200 px-5 py-3 text-sm font-bold text-slate-900 transition-colors hover:bg-slate-100 sm:w-auto sm:px-6"
                >
                  <Download className="mr-2 h-4 w-4" /> Baixar .zip
                </Button>
              </div>
            </div>
          </CardContent>

          <div className="border-t bg-muted/40 p-5 sm:p-7 md:p-8">
            <h3 className="mb-4 text-xs font-bold uppercase tracking-widest text-muted-foreground">
              Como instalar no macOS
            </h3>
            <ol className="space-y-4">
              {[
                <>Descubra sua arquitetura: menu <b>Apple → Sobre este Mac</b>. Se aparecer <b>Apple M1/M2/M3</b>, baixe o pacote <b>Apple Silicon</b>. Se aparecer <b>Intel</b>, baixe o pacote <b>Intel</b>.</>,
                <>Descompacte o <b>.zip</b> baixado e arraste o app <b>PontoColetor.app</b> para a pasta <b>Aplicativos</b>.</>,
                <>Na primeira execução, o macOS pode bloquear por ser um app não notarizado. Vá em <b>Ajustes do Sistema → Privacidade e Segurança</b> e clique em <b>Abrir mesmo assim</b>.</>,
                <>Ao abrir, cole a <b>URL do backend</b> e a <b>Chave Anon</b> mostradas acima, e faça login com seu usuário do CRM.</>,
                <>Para iniciar automaticamente no boot: <b>Ajustes do Sistema → Geral → Itens de Início de Sessão</b> → adicione o <b>PontoColetor.app</b>.</>,
                <>Cadastre os relógios em <b>Controle de Ponto → Equipamentos</b>. O Mac precisa estar na mesma rede dos relógios REP.</>,
              ].map((t, i) => (
                <li key={i} className="flex gap-3 sm:gap-4">
                  <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border bg-background text-xs font-bold text-foreground">{i + 1}</span>
                  <p className="text-sm leading-relaxed text-muted-foreground">{t}</p>
                </li>
              ))}
            </ol>

            <div className="mt-6 rounded-md border bg-background/60 p-3">
              <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                <Terminal className="h-3.5 w-3.5" /> Linux (opcional)
              </div>
              <p className="text-xs leading-relaxed text-muted-foreground">
                Descompacte o <b>.zip</b>, dê permissão de execução (<code>chmod +x PontoColetor</code>) e rode
                <code> ./PontoColetor</code>. Para iniciar no boot, crie um serviço systemd apontando para o binário.
              </p>
            </div>

            <div className="mt-4 flex items-start gap-2 rounded-md border border-primary/20 bg-primary/5 p-3 text-xs text-muted-foreground">
              <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
              <p>
                A versão Mac/Linux cobre o <b>Módulo de Ponto</b>. O <b>Módulo de Câmeras IP</b> (RTSP contínuo) hoje só está no
                pacote <b>Windows MSI</b> — em Macs use a mesma máquina para ponto e um mini-PC Windows para câmeras.
              </p>
            </div>
          </div>
        </Card>


        <AppTile
          accent="green"
          icon={<Smartphone className="h-8 w-8" />}
          platform="Android · APK"
          title="Pilar SMS"
          description={
            <>
              App próprio que transforma um celular Android com chip em <b>gateway de SMS</b> do CRM.
              O CRM enfileira as mensagens e o APK consulta a fila a cada 5s, enviando pelo{" "}
              <code>SmsManager</code> nativo. Não exige IP público, roteador exposto ou Cloudflare —
              igual ao Coletor Desktop.
            </>
          }
          modules={
            <div className="flex items-center gap-3 rounded-xl border border-dashed p-4 text-xs text-muted-foreground">
              <Shield className="h-4 w-4 text-green-600 dark:text-green-400" />
              <span>
                <b className="text-foreground">Modo Fila</b> · consumo mínimo de bateria · vários celulares
                podem ser cadastrados e dividem a fila automaticamente.
              </span>
            </div>
          }
          fileLabelBadge="Pacote APK"
          fileName="pilar-sms-v1.2.0.apk"
          onDownload={() => baixar("pilar-sms-v1.2.0.apk", "/pilar-sms-v1.2.0.apk")}
          downloadButtonText="Baixar APK"
          steps={[
            { text: <>Em <b>Atendimento → Configurações → SMS</b>, cadastre um celular autorizado (ex.: "Celular Recepção") e copie o <b>token</b> gerado.</> },
            { text: <>No Android que ficará ligado 24h com o chip, ative <b>Fontes desconhecidas</b> nas Configurações e instale o <b>APK</b> baixado acima.</> },
            { text: <>Abra o app, conceda permissão de <b>Enviar SMS</b> e <b>desative a otimização de bateria</b> para o Pilar SMS.</> },
            { text: <>Cole o <b>token</b> no app e toque em <b>Conectar</b>. O app já começa a processar a fila.</> },
            { text: <>O status do celular (último ping e bateria) aparece automaticamente na lista de celulares autorizados.</> },
          ]}
          footer={
            <div className="mt-4 flex items-start gap-2 rounded-md border border-primary/20 bg-primary/5 p-3 text-xs text-muted-foreground">
              <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
              <p>
                <b>Dica:</b> mantenha o celular sempre carregando. Se cair a conexão, os SMS ficam na fila
                e são reenviados assim que o celular voltar.
              </p>
            </div>
          }
        />
      </div>

      <div className="flex items-start gap-2 rounded-md border border-primary/20 bg-primary/5 p-3 text-xs text-muted-foreground">
        <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
        <p>
          Todos os apps conectam via HTTPS diretamente ao backend, com assinatura digital das mensagens e
          retenção local temporária em caso de queda de rede. Compatíveis com Portaria 671/2021 (ponto) e LGPD.
        </p>
      </div>

      <div className="flex items-center gap-2 rounded-md border p-3 text-sm">
        <CheckCircle2 className="h-4 w-4 text-success" />
        <span>Precisa de ajuda? Abra um <b>Ticket de Suporte</b> no menu de usuário.</span>
      </div>
    </div>
  );
}
