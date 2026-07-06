import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, Smartphone, Apple, Share2, Plus, BellRing, ExternalLink, Info, Monitor, Camera, Clock } from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import crmApkAsset from "../../public/coletor/crm-pilar-v1.0.0.apk.asset.json";
import coletorMsiAsset from "../../public/coletor/ColetorPilar-Setup.msi.asset.json";

interface BIPEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function MobileAppCard() {
  const [installEvt, setInstallEvt] = useState<BIPEvent | null>(null);
  const [installed, setInstalled] = useState<boolean>(false);

  useEffect(() => {
    const standalone =
      window.matchMedia?.("(display-mode: standalone)").matches ||
      // @ts-ignore
      window.navigator.standalone === true;
    setInstalled(!!standalone);

    const handler = (e: Event) => {
      e.preventDefault();
      setInstallEvt(e as BIPEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!installEvt) {
      toast.info("Use o menu do navegador: 'Instalar aplicativo' ou 'Adicionar à tela inicial'");
      return;
    }
    await installEvt.prompt();
    const res = await installEvt.userChoice;
    if (res.outcome === "accepted") toast.success("App instalado! Abra pelo ícone na tela inicial.");
    setInstallEvt(null);
  };

  return (
    <Card className="rounded-3xl border-orange-500/30 bg-gradient-to-br from-orange-500/5 via-background to-primary/5 shadow-md">
      <CardContent className="p-5 sm:p-7">
        <div className="mb-5 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-500/15 text-orange-500">
              <Smartphone className="h-7 w-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold sm:text-2xl">App Mobile Pilar</h2>
                {installed && <Badge className="bg-green-500/15 text-green-600 border-green-500/40">Instalado</Badge>}
              </div>
              <p className="text-sm text-muted-foreground">
                Instale no iPhone e Android. Atualiza sozinho, sem reinstalar. Com push notifications.
              </p>
            </div>
          </div>
          <Badge variant="outline" className="hidden sm:inline-flex gap-1">
            <BellRing className="h-3.5 w-3.5" /> Push habilitado
          </Badge>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border bg-card p-5 space-y-3">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-green-500/15 text-green-600">
                <Smartphone className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold">Android</h3>
                <p className="text-xs text-muted-foreground">Chrome, Edge ou Samsung Internet</p>
              </div>
            </div>
            <Button onClick={handleInstall} className="w-full gap-2 bg-green-600 hover:bg-green-500">
              <Download className="h-4 w-4" />
              {installEvt ? "Instalar app agora" : (installed ? "Já instalado" : "Adicionar à tela inicial")}
            </Button>
            <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
              <li>Abra este site pelo Chrome no celular</li>
              <li>Toque em "Instalar app agora" acima</li>
              <li>Confirme "Instalar"</li>
              <li>Abra pelo ícone na tela inicial</li>
            </ol>
          </div>

          <div className="rounded-2xl border bg-card p-5 space-y-3">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-500/15 text-slate-600 dark:text-slate-300">
                <Apple className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold">iPhone / iPad (iOS 16.4+)</h3>
                <p className="text-xs text-muted-foreground">Requer Safari</p>
              </div>
            </div>
            <div className="rounded-lg border border-dashed p-3 text-xs space-y-1.5">
              <p className="flex items-center gap-1.5"><Share2 className="h-3.5 w-3.5" /> 1. Toque em <b>Compartilhar</b> na barra do Safari</p>
              <p className="flex items-center gap-1.5"><Plus className="h-3.5 w-3.5" /> 2. Escolha <b>Adicionar à Tela de Início</b></p>
              <p className="flex items-center gap-1.5"><Smartphone className="h-3.5 w-3.5" /> 3. Abra pelo ícone e ative notificações em Configurações</p>
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <Link to="/config/push">
            <Button variant="outline" size="sm" className="gap-2">
              <BellRing className="h-4 w-4" /> Ativar notificações neste dispositivo
            </Button>
          </Link>
          <a href="https://crmpilar.lovable.app" target="_blank" rel="noreferrer">
            <Button variant="ghost" size="sm" className="gap-2">
              <ExternalLink className="h-4 w-4" /> Abrir URL pública para instalar
            </Button>
          </a>
        </div>

        <div className="mt-4 flex gap-2 rounded-lg bg-muted/40 p-3 text-xs">
          <Info className="h-4 w-4 shrink-0 text-primary" />
          <div className="space-y-1">
            <p><b>Atualização automática:</b> toda vez que abrir o app, ele carrega a versão mais nova. Nunca precisa reinstalar.</p>
            <p><b>Push notifications:</b> após instalar, ative as notificações em <Link to="/config/push" className="text-primary underline">Configurações → Push</Link>.</p>
            <p><b>Só funciona em produção:</b> instale a partir de <code>crmpilar.lovable.app</code> ou do seu domínio publicado — não pelo editor Lovable.</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

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
  return (
    <div className="mx-auto max-w-6xl space-y-5 p-3 sm:space-y-6 sm:p-6 md:p-8">
      <div>
        <h1 className="text-xl font-semibold sm:text-3xl">Aplicativo</h1>
        <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
          Instale o CRM Pilar no celular ou tablet para acessar de qualquer lugar.
        </p>
      </div>

      <MobileAppCard />

      <Card className="flex flex-col overflow-hidden rounded-2xl sm:rounded-3xl border shadow-sm transition-all duration-300 hover:shadow-xl hover:border-primary/20">
        <CardContent className="flex-1 p-5 sm:p-7 md:p-8">
          <div className="mb-5 flex items-start justify-between gap-3 sm:mb-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-300 sm:h-14 sm:w-14 sm:rounded-2xl">
              <Smartphone className="h-8 w-8" />
            </div>
            <span className="rounded-full border bg-muted px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground sm:px-3 sm:text-xs">
              Android · APK
            </span>
          </div>

          <h2 className="mb-2 text-xl font-bold text-foreground sm:text-2xl">CRM Pilar (App Android)</h2>
          <div className="mb-6 text-sm leading-relaxed text-muted-foreground sm:mb-8">
            Aplicativo nativo do <b>CRM Pilar</b> para celulares e tablets Android. Abre em tela cheia,
            com ícone próprio na Home. Toda vez que o CRM é atualizado, o app <b>atualiza automaticamente</b>{" "}
            sem precisar reinstalar. Suporta <b>notificações push</b> configuradas nos workflows.
          </div>

          <div className="flex items-center gap-3 rounded-xl border border-dashed p-4 text-xs text-muted-foreground mb-6 sm:mb-8">
            <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <span>
              <b className="text-foreground">Auto-update</b> · sem necessidade de Play Store · push habilitado ·
              mesma conta e permissões do CRM web.
            </span>
          </div>

          <div className="flex flex-col gap-3 rounded-2xl bg-foreground p-3 sm:flex-row sm:items-center sm:justify-between sm:gap-2 sm:p-2 sm:pl-4">
            <div className="flex min-w-0 flex-col">
              <span className="text-[10px] font-bold uppercase tracking-widest text-background/60">
                Pacote APK
              </span>
              <span className="truncate font-mono text-xs text-background sm:text-sm">crm-pilar-v1.0.0.apk</span>
            </div>
            <Button
              onClick={() => baixar("crm-pilar-v1.0.0.apk", crmApkAsset.url)}
              className="w-full flex-shrink-0 rounded-xl px-5 py-3 text-sm font-bold transition-colors sm:w-auto sm:px-6 bg-blue-500 hover:bg-blue-400 text-white"
            >
              <Download className="mr-2 h-4 w-4" /> Baixar APK
            </Button>
          </div>
        </CardContent>

        <div className="border-t bg-muted/40 p-5 sm:p-7 md:p-8">
          <h3 className="mb-4 text-xs font-bold uppercase tracking-widest text-muted-foreground">
            Como instalar e usar
          </h3>
          <ol className="space-y-4">
            <li className="flex gap-3 sm:gap-4">
              <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border bg-background text-xs font-bold text-foreground">1</span>
              <p className="text-sm leading-relaxed text-muted-foreground">No Android, ative <b>Fontes desconhecidas</b> em <b>Configurações → Segurança</b> (ou permita a instalação quando o navegador perguntar).</p>
            </li>
            <li className="flex gap-3 sm:gap-4">
              <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border bg-background text-xs font-bold text-foreground">2</span>
              <p className="text-sm leading-relaxed text-muted-foreground">Baixe o <b>crm-pilar-v1.0.0.apk</b> acima e toque no arquivo para instalar.</p>
            </li>
            <li className="flex gap-3 sm:gap-4">
              <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border bg-background text-xs font-bold text-foreground">3</span>
              <p className="text-sm leading-relaxed text-muted-foreground">Abra o app <b>CRM Pilar</b> na Home. Faça login com sua conta habitual do CRM.</p>
            </li>
            <li className="flex gap-3 sm:gap-4">
              <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border bg-background text-xs font-bold text-foreground">4</span>
              <p className="text-sm leading-relaxed text-muted-foreground">Nas primeiras notificações, autorize <b>Notificações</b> quando o Android pedir — é o que habilita os push dos workflows.</p>
            </li>
            <li className="flex gap-3 sm:gap-4">
              <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border bg-background text-xs font-bold text-foreground">5</span>
              <p className="text-sm leading-relaxed text-muted-foreground">Pronto. A cada atualização do CRM, o app carrega a versão nova automaticamente ao abrir.</p>
            </li>
          </ol>
          <div className="mt-4 flex items-start gap-2 rounded-md border border-primary/20 bg-primary/5 p-3 text-xs text-muted-foreground">
            <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
            <p>
              <b>iOS:</b> a versão iPhone/iPad exige compilação em Mac + Xcode e não pode ser gerada aqui.
              No iPhone, use a <b>PWA</b> — abra <code>crmpilar.lovable.app</code> no Safari, toque em{" "}
              <b>Compartilhar → Adicionar à Tela de Início</b>. Funciona igual ao APK, com push a partir do iOS 16.4.
            </p>
          </div>
        </div>
      </Card>

      <Card className="flex flex-col overflow-hidden rounded-2xl sm:rounded-3xl border shadow-sm transition-all duration-300 hover:shadow-xl hover:border-primary/20">
        <CardContent className="flex-1 p-5 sm:p-7 md:p-8">
          <div className="mb-5 flex items-start justify-between gap-3 sm:mb-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-950/40 dark:text-purple-300 sm:h-14 sm:w-14 sm:rounded-2xl">
              <Monitor className="h-8 w-8" />
            </div>
            <span className="rounded-full border bg-muted px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground sm:px-3 sm:text-xs">
              Windows · MSI
            </span>
          </div>

          <h2 className="mb-2 text-xl font-bold text-foreground sm:text-2xl">Coletor Desktop (Windows)</h2>
          <div className="mb-6 text-sm leading-relaxed text-muted-foreground sm:mb-8">
            Instale em <b>um PC da mesma rede local</b> para habilitar duas funções:
            <b> câmeras IP</b> (snapshot e ao vivo de Hikvision, Intelbras, Tapo etc. que não estão na internet) e
            <b> relógios de ponto</b> (coleta automática de batidas de Control iD, Henry, ZKTeco, Topdata e Madis na LAN).
            Sem o Coletor rodando, a nuvem não consegue acessar equipamentos com IP privado.
          </div>

          <div className="flex items-center gap-3 rounded-xl border border-dashed p-4 text-xs text-muted-foreground mb-6 sm:mb-8">
            <Camera className="h-4 w-4 text-purple-600 dark:text-purple-400" />
            <Clock className="h-4 w-4 text-purple-600 dark:text-purple-400" />
            <span>
              <b className="text-foreground">Necessário para</b> câmeras internas (LAN) e relógios de ponto na rede local.
              Câmeras públicas (com IP externo / port-forward) funcionam direto pela nuvem, sem Coletor.
            </span>
          </div>

          <div className="flex flex-col gap-3 rounded-2xl bg-foreground p-3 sm:flex-row sm:items-center sm:justify-between sm:gap-2 sm:p-2 sm:pl-4">
            <div className="flex min-w-0 flex-col">
              <span className="text-[10px] font-bold uppercase tracking-widest text-background/60">
                Instalador Windows
              </span>
              <span className="truncate font-mono text-xs text-background sm:text-sm">ColetorPilar-Setup.msi</span>
            </div>
            <Button
              onClick={() => baixar("ColetorPilar-Setup.msi", coletorMsiAsset.url)}
              className="w-full flex-shrink-0 rounded-xl px-5 py-3 text-sm font-bold transition-colors sm:w-auto sm:px-6 bg-purple-500 hover:bg-purple-400 text-white"
            >
              <Download className="mr-2 h-4 w-4" /> Baixar Coletor
            </Button>
          </div>
        </CardContent>

        <div className="border-t bg-muted/40 p-5 sm:p-7 md:p-8">
          <h3 className="mb-4 text-xs font-bold uppercase tracking-widest text-muted-foreground">
            Como instalar e usar
          </h3>
          <ol className="space-y-4">
            <li className="flex gap-3 sm:gap-4">
              <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border bg-background text-xs font-bold text-foreground">1</span>
              <p className="text-sm leading-relaxed text-muted-foreground">Baixe e execute o <b>ColetorPilar-Setup.msi</b> em um PC Windows que fique <b>ligado 24/7</b> na mesma rede das câmeras e relógios de ponto.</p>
            </li>
            <li className="flex gap-3 sm:gap-4">
              <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border bg-background text-xs font-bold text-foreground">2</span>
              <p className="text-sm leading-relaxed text-muted-foreground">Faça login com sua conta do CRM Pilar. O Coletor vincula ao seu tenant automaticamente.</p>
            </li>
            <li className="flex gap-3 sm:gap-4">
              <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border bg-background text-xs font-bold text-foreground">3</span>
              <p className="text-sm leading-relaxed text-muted-foreground">Ative os módulos <b>Câmeras</b> e/ou <b>Ponto</b> na tela principal. O ícone deve ficar verde (online) — a nuvem passa a enviar comandos de snapshot, streaming e coleta de batidas.</p>
            </li>
          </ol>
        </div>
      </Card>
    </div>
  );
}
