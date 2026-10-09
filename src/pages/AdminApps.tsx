import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Check, Download, Smartphone, Apple, HelpCircle, Monitor, Tv, Phone } from "lucide-react";
import { baixarArquivo } from "@/lib/baixarArquivo";

// Fallbacks fixos caso os manifestos estejam indisponíveis.
const COLETOR_FALLBACK_URL = "https://github.com/Pilar100874/crmpilar/releases/latest/download/ColetorPilar-Setup.exe";
const COLETOR_FALLBACK_FILENAME = "ColetorPilar-Setup.exe";
const COLETOR_LINUX_FALLBACK_URL =
  "https://github.com/Pilar100874/crmpilar/releases/download/coletor-v2.1.0/ColetorPilar-Linux.AppImage";
const COLETOR_MAC_APPLE_SILICON_FALLBACK_URL =
  "https://github.com/Pilar100874/crmpilar/releases/download/coletor-v2.1.0/ColetorPilar-Mac-AppleSilicon.zip";
const COLETOR_MAC_INTEL_FALLBACK_URL =
  "https://github.com/Pilar100874/crmpilar/releases/download/coletor-v2.1.0/ColetorPilar-Mac-Intel.zip";
const APPLIANCE_ISO_URL =
  "https://github.com/Pilar100874/crmpilar/releases/download/appliance-latest/coletor-pilar-appliance-amd64.iso";
const SMS_URL = "https://github.com/Pilar100874/crmpilar/releases/download/sms-v1.11.0/pilar-sms-v1.11.0.apk";
const HUB_URL = "https://github.com/Pilar100874/crmpilar/releases/download/coletor-v3.2.2/pilar-coletor-v3.2.2.apk";
const INTERFONE_URL = "https://github.com/Pilar100874/crmpilar/releases/download/interfone-v1.7.6/pilar-interfone-v1.7.6.apk";
const AUTOMACAO_URL = "https://github.com/Pilar100874/crmpilar/releases/download/pilar-automacao-latest/pilar-automacao.apk";
const TV_URL = "https://github.com/Pilar100874/crmpilar/releases/download/android-tv-signage-latest/app-release.apk";

const baixar = (file: string, url: string) => baixarArquivo(file, url);

type Ajuda = { titulo: string; passos: string[]; observacao?: string };

type AppRow = {
  nome: string;
  descricao: string;
  icone: "android" | "windows" | "mac" | "linux" | "tv";
  sistemas: string[];
  recursos: string[];
  arquivo: string;
  url: string;
  versao?: string;
  ajuda: Ajuda;
};

const IconeSistema = ({ tipo }: { tipo: AppRow["icone"] }) => {
  const cls = "h-5 w-5";
  switch (tipo) {
    case "android":
      return <Smartphone className={cls} />;
    case "windows":
      return <Monitor className={cls} />;
    case "mac":
      return <Apple className={cls} />;
    case "linux":
      return <Monitor className={cls} />;
    case "tv":
      return <Tv className={cls} />;
  }
};

const corIcone: Record<AppRow["icone"], string> = {
  android: "bg-green-500/15 text-green-600",
  windows: "bg-purple-500/15 text-purple-600 dark:text-purple-300",
  mac: "bg-secondary text-foreground",
  linux: "bg-amber-500/15 text-amber-600 dark:text-amber-300",
  tv: "bg-blue-500/15 text-blue-600 dark:text-blue-300",
};

export default function AdminApps() {
  const [coletorInfo, setColetorInfo] = useState<{
    version: string;
    downloadUrl: string;
    downloadUrlLinux?: string;
    downloadUrlMacAppleSilicon?: string;
    downloadUrlMacIntel?: string;
    notas?: string;
  } | null>(null);
  const [automacaoInfo, setAutomacaoInfo] = useState<{ url?: string; versionName?: string } | null>(null);
  const [tvInfo, setTvInfo] = useState<{ url?: string; versionName?: string } | null>(null);
  const [ajudaAberta, setAjudaAberta] = useState<Ajuda | null>(null);

  useEffect(() => {
    fetch("/coletor/version.json", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => data && setColetorInfo(data))
      .catch(() => {});
    fetch("/apps/pilar-automacao-latest.json", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => data && setAutomacaoInfo(data))
      .catch(() => {});
    fetch("/apps/android-tv-signage-latest.json", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => data && setTvInfo(data))
      .catch(() => {});
  }, []);

  const coletorFileName = coletorInfo?.downloadUrl?.split("/").pop() || COLETOR_FALLBACK_FILENAME;
  const coletorUrl = coletorInfo?.downloadUrl || COLETOR_FALLBACK_URL;
  const coletorLinuxUrl = coletorInfo?.downloadUrlLinux || COLETOR_LINUX_FALLBACK_URL;
  const coletorMacAsUrl = coletorInfo?.downloadUrlMacAppleSilicon || COLETOR_MAC_APPLE_SILICON_FALLBACK_URL;
  const coletorMacIntelUrl = coletorInfo?.downloadUrlMacIntel || COLETOR_MAC_INTEL_FALLBACK_URL;
  const coletorVersao = coletorInfo?.version ? `v${coletorInfo.version}` : undefined;

  const apps: AppRow[] = [
    {
      nome: "Pilar Automação",
      descricao: "Abre os painéis de automação em tela cheia, por ambiente.",
      icone: "android",
      sistemas: ["Android"],
      arquivo: "pilar-automacao.apk",
      url: automacaoInfo?.url || AUTOMACAO_URL,
      versao: automacaoInfo?.versionName ? `v${automacaoInfo.versionName}` : undefined,
      ajuda: {
        titulo: "Pilar Automação — como instalar",
        passos: [
          "Baixe e instale o APK no celular ou tablet Android (permita fontes desconhecidas).",
          "Ao abrir, informe o endereço do sistema e, se quiser, cole o código do painel desejado.",
          "O app abre o painel em tela cheia. Você define qual ambiente cada usuário vê em Configurações → Usuários.",
        ],
      },
    },
    {
      nome: "Pilar SMS",
      descricao: "Celular Android vira modem de SMS para os disparos do CRM.",
      icone: "android",
      sistemas: ["Android"],
      arquivo: "pilar-sms-v1.11.0.apk",
      url: SMS_URL,
      versao: "v1.11.0",
      ajuda: {
        titulo: "Pilar SMS — como instalar",
        passos: [
          "Instale o APK em um celular Android com chip (SIM) ativo e saldo para SMS.",
          "Abra o app, faça login com sua conta do CRM e autorize as permissões de SMS.",
          "Deixe o celular ligado e conectado: os disparos de SMS do CRM saem por ele.",
        ],
      },
    },
    {
      nome: "Pilar Hub",
      descricao: "Coletor Android: ponto, câmeras e automação na rede local.",
      icone: "android",
      sistemas: ["Android"],
      arquivo: "pilar-coletor-v3.2.2.apk",
      url: HUB_URL,
      versao: "v3.2.2",
      ajuda: {
        titulo: "Pilar Hub — como instalar",
        passos: [
          "Instale o APK em um aparelho Android que fique ligado na mesma rede das câmeras e relógios de ponto.",
          "Faça login com sua conta do CRM Pilar.",
          "Ative os módulos desejados na tela do app.",
        ],
      },
    },
    {
      nome: "Pilar Interfone",
      descricao: "Interfone da portaria com abertura remota pelo CRM.",
      icone: "android",
      sistemas: ["Android"],
      arquivo: "pilar-interfone-v1.7.6.apk",
      url: INTERFONE_URL,
      versao: "v1.7.6",
      ajuda: {
        titulo: "Pilar Interfone — como instalar",
        passos: [
          "Instale o APK no tablet ou celular Android da portaria.",
          "Faça login com a conta da portaria no CRM.",
          "As chamadas de interfone passam a chegar neste aparelho.",
        ],
      },
    },
    {
      nome: "TV Signage",
      descricao: "Painel de TV: exibe mídias e avisos em TVs Android.",
      icone: "tv",
      sistemas: ["Android TV"],
      arquivo: "app-release.apk",
      url: tvInfo?.url || TV_URL,
      versao: tvInfo?.versionName ? `v${tvInfo.versionName}` : undefined,
      ajuda: {
        titulo: "TV Signage — como instalar",
        passos: [
          "Baixe o APK e instale na TV ou TV Box Android (por USB ou app de transferência).",
          "Abra o app e anote o código de pareamento exibido na tela.",
          "No CRM, em Marketing → TV, vincule a TV pelo código e escolha o conteúdo.",
        ],
      },
    },
    {
      nome: "Coletor Desktop",
      descricao: "Ponto, câmeras, automação e Pilar Voz num PC Windows ligado 24/7.",
      icone: "windows",
      sistemas: ["Windows"],
      arquivo: coletorFileName,
      url: coletorUrl,
      versao: coletorVersao,
      ajuda: {
        titulo: "Coletor Desktop (Windows) — como instalar",
        passos: [
          `Baixe e execute o ${coletorFileName} em um PC Windows que fique ligado 24/7 na mesma rede das câmeras e relógios de ponto.`,
          "Faça login com sua conta do CRM Pilar. O Coletor vincula ao seu tenant automaticamente.",
          "Ative os módulos Câmeras, Ponto, Automação e/ou Pilar Voz na tela principal. O ícone deve ficar verde (online).",
        ],
        observacao: coletorInfo?.notas ? `Novidades: ${coletorInfo.notas}` : undefined,
      },
    },
    {
      nome: "Coletor Desktop (Apple Silicon)",
      descricao: "Mesmo Coletor para Macs com chip M1, M2, M3 ou M4.",
      icone: "mac",
      sistemas: ["macOS"],
      arquivo: "ColetorPilar-Mac-AppleSilicon.zip",
      url: coletorMacAsUrl,
      versao: coletorVersao,
      ajuda: {
        titulo: "Coletor no Mac — como instalar",
        passos: [
          "Dê dois cliques no .zip baixado e arraste o Coletor Pilar para a pasta Aplicativos.",
          "Na primeira vez, abra com clique direito → Abrir e confirme em Abrir. Depois abre normal.",
          "Entre com sua conta do CRM e ligue só os módulos que este computador deve rodar.",
        ],
        observacao: "Não sabe o processador? Menu da maçã → Sobre Este Mac: Chip Apple M… = Apple Silicon; Processador Intel = versão Intel.",
      },
    },
    {
      nome: "Coletor Desktop (Mac Intel)",
      descricao: "Mesmo Coletor para Macs com processador Intel.",
      icone: "mac",
      sistemas: ["macOS"],
      arquivo: "ColetorPilar-Mac-Intel.zip",
      url: coletorMacIntelUrl,
      versao: coletorVersao,
      ajuda: {
        titulo: "Coletor no Mac — como instalar",
        passos: [
          "Dê dois cliques no .zip baixado e arraste o Coletor Pilar para a pasta Aplicativos.",
          "Na primeira vez, abra com clique direito → Abrir e confirme em Abrir. Depois abre normal.",
          "Entre com sua conta do CRM e ligue só os módulos que este computador deve rodar.",
        ],
        observacao: "Não sabe o processador? Menu da maçã → Sobre Este Mac: Chip Apple M… = Apple Silicon; Processador Intel = versão Intel.",
      },
    },
    {
      nome: "Coletor Desktop (Linux)",
      descricao: "AppImage x64 para Debian, Ubuntu, Mint etc.",
      icone: "linux",
      sistemas: ["Linux"],
      arquivo: "ColetorPilar-Linux.AppImage",
      url: coletorLinuxUrl,
      versao: coletorVersao,
      ajuda: {
        titulo: "Coletor no Linux — como instalar",
        passos: [
          "Baixe o AppImage e dê permissão: chmod +x ColetorPilar-Linux.AppImage",
          "Execute ./ColetorPilar-Linux.AppImage e faça login com sua conta do CRM.",
          "Ative os módulos desejados na tela principal.",
        ],
      },
    },
    {
      nome: "Appliance (ISO)",
      descricao: "Instala Linux + Coletor em modo kiosk num mini-PC, com SSH e Cockpit.",
      icone: "linux",
      sistemas: ["Linux"],
      arquivo: "coletor-pilar-appliance-amd64.iso",
      url: APPLIANCE_ISO_URL,
      ajuda: {
        titulo: "Appliance (ISO) — como instalar",
        passos: [
          "Grave a ISO num pendrive (Rufus, Balena Etcher) e dê boot pelo mini-PC.",
          "A instalação é automática: Linux + Coletor em modo kiosk.",
          "Para atualizar depois: sudo /opt/coletor/update.sh.",
        ],
      },
    },
  ];

  return (
    <div className="mx-auto max-w-screen-2xl space-y-5 p-3 sm:space-y-6 sm:p-5 lg:p-6">
      <div>
        <h1 className="text-xl font-semibold sm:text-3xl">Aplicativos e downloads</h1>
        <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
          Todos os aplicativos do CRM Pilar, por sistema operacional. Clique em <b>Ajuda</b> para ver o passo a passo de instalação.
        </p>
      </div>

      <Card className="overflow-hidden rounded-xl border shadow-sm">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[220px]">Aplicativo</TableHead>
                  <TableHead>Sistema</TableHead>
                  <TableHead className="hidden md:table-cell">Versão</TableHead>
                  <TableHead className="hidden lg:table-cell">Arquivo</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {apps.map((app) => (
                  <TableRow key={app.nome}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl ${corIcone[app.icone]}`}>
                          <IconeSistema tipo={app.icone} />
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold leading-tight">{app.nome}</p>
                          <p className="text-xs text-muted-foreground line-clamp-2">{app.descricao}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {app.sistemas.map((s) => (
                          <Badge key={s} variant="outline" className="text-[10px] uppercase tracking-wider">
                            {s}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                      {app.versao || "—"}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <code className="text-xs text-muted-foreground">{app.arquivo}</code>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          className="gap-1.5"
                          onClick={() => baixar(app.arquivo, app.url)}
                        >
                          <Download className="h-4 w-4" />
                          <span className="hidden sm:inline">Baixar</span>
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1.5"
                          onClick={() => setAjudaAberta(app.ajuda)}
                        >
                          <HelpCircle className="h-4 w-4" />
                          <span className="hidden sm:inline">Ajuda</span>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-start gap-2 rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground">
        <Phone className="h-4 w-4 shrink-0 text-primary" />
        <p>
          <b className="text-foreground">App mobile do CRM (celular):</b> não precisa de APK — abra{" "}
          <code>crmpilar.lovable.app</code> no navegador do celular e use "Instalar aplicativo" (Android) ou
          "Adicionar à Tela de Início" (iPhone). Ele atualiza sozinho a cada abertura.
        </p>
      </div>

      <Dialog open={!!ajudaAberta} onOpenChange={(aberto) => !aberto && setAjudaAberta(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{ajudaAberta?.titulo}</DialogTitle>
            <DialogDescription>Siga os passos abaixo para instalar e usar.</DialogDescription>
          </DialogHeader>
          <ol className="space-y-3 pt-2">
            {ajudaAberta?.passos.map((passo, i) => (
              <li key={i} className="flex gap-3">
                <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border bg-background text-xs font-bold">
                  {i + 1}
                </span>
                <p className="text-sm leading-relaxed text-muted-foreground">{passo}</p>
              </li>
            ))}
          </ol>
          {ajudaAberta?.observacao && (
            <p className="rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground">{ajudaAberta.observacao}</p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
