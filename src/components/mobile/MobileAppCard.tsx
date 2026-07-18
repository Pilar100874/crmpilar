import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, Smartphone, Apple, Share2, Plus, BellRing, ExternalLink, Info } from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";

interface BIPEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function MobileAppCard() {
  const [installEvt, setInstallEvt] = useState<BIPEvent | null>(null);
  const [installed, setInstalled] = useState<boolean>(false);
  const [isIOS, setIsIOS] = useState<boolean>(false);
  const [isAndroid, setIsAndroid] = useState<boolean>(false);

  useEffect(() => {
    const ua = navigator.userAgent || "";
    setIsIOS(/iPad|iPhone|iPod/.test(ua));
    setIsAndroid(/android/i.test(ua));
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
          {/* Android */}
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

          {/* iOS */}
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
            <p><b>Rastreamento:</b> para enviar sua localização, abra o app instalado, faça login e ative o <b>Envio de Localização</b> em <Link to="/perfil" className="text-primary underline">Perfil</Link> (concedendo a permissão do navegador). Só depois disso o dispositivo aparece em <b>Logística → Veículos</b> para o administrador aprovar e vincular a um veículo/pessoa.</p>
            <p><b>Só funciona em produção:</b> instale a partir de <code>crmpilar.lovable.app</code> ou do seu domínio publicado — não pelo editor Lovable.</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
