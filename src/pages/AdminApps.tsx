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
import { Check, ChevronDown, KeyRound, Download, Smartphone, Apple, HelpCircle, Monitor, Tv, Phone } from "lucide-react";
import { baixarArquivo } from "@/lib/baixarArquivo";
import { Fragment } from "react";
import ChavesPainel from "@/pages/automacao/AutomacaoChavesApp";

/** Tipos de chave que cada aplicativo aceita, na ordem de preferência. */
const chavesDoApp = (app: { nome: string; icone: string }): string[] => {
  if (app.nome === "Pilar Automação") return ["automacao"];
  if (app.nome === "Pilar SMS") return ["sms"];
  if (app.nome === "Pilar Fone") return ["pilar-fone"];
  if (app.nome === "TV Remotas") return ["coletor-tv"];
  if (app.nome === "Coletor" && app.icone === "android") return ["controle", "voz"];
  return ["coletor", "controle"];
};

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
const HUB_URL = "https://github.com/Pilar100874/crmpilar/releases/download/coletor-v3.3.0/pilar-coletor-v3.3.0.apk";
const INTERFONE_URL = "https://github.com/Pilar100874/crmpilar/releases/download/interfone-v1.7.6/pilar-interfone-v1.7.6.apk";
const AUTOMACAO_URL = "https://github.com/Pilar100874/crmpilar/releases/download/pilar-automacao-latest/pilar-automacao.apk";
const TV_URL = "https://github.com/Pilar100874/crmpilar/releases/download/android-tv-signage-latest/app-release.apk";

const baixar = (file: string, url: string) => baixarArquivo(file, url);

// Colunas de recurso da tabela, na ordem em que aparecem. Os nomes são escritos na vertical no cabeçalho.
const RECURSOS = ["Ponto", "Câmeras", "Automação", "Voz", "SMS", "Interfone", "TV / Mídia"];

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
  /** Identificador usado na central de atualizações (equipamentos instalados). */
  appSlug?: string;
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

/** Conteúdo do painel expandido de um aplicativo: chaves, cada uma com a atualização remota do aparelho que a usa. */
function PainelExpandido({ app }: { app: AppRow }) {
  return (
    <div className="space-y-3">
      <ChavesPainel apps={chavesDoApp(app)} appSlug={app.appSlug} />
      {!app.appSlug && (
        <p className="text-xs text-muted-foreground">
          <b className="text-foreground">Atualização:</b> este aplicativo se atualiza manualmente — baixe a versão nova acima e instale no aparelho.
        </p>
      )}
    </div>
  );
}

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
  const [chavesAberta, setChavesAberta] = useState<string | null>(null);
  const [datasDownloads, setDatasDownloads] = useState<Record<string, string>>({});

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
      recursos: ["Automação"],
      arquivo: "pilar-automacao.apk",
      url: automacaoInfo?.url || AUTOMACAO_URL,
      versao: automacaoInfo?.versionName ? `v${automacaoInfo.versionName}` : undefined,
      appSlug: "automacao",
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
      recursos: ["SMS"],
      arquivo: "pilar-sms-v1.11.0.apk",
      url: SMS_URL,
      versao: "v1.11.0",
      appSlug: "sms",
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
      nome: "Coletor",
      descricao: "Ponto, câmeras, automação e Pilar Voz no aparelho Android.",
      icone: "android",
      sistemas: ["Android"],
      recursos: ["Ponto", "Câmeras", "Automação", "Voz"],
      arquivo: "pilar-coletor-v3.3.0.apk",
      url: HUB_URL,
      versao: "v3.3.0",
      appSlug: "hub",
      ajuda: {
        titulo: "Coletor — como instalar",
        passos: [
          "Instale o APK em um aparelho Android que fique ligado na mesma rede das câmeras e relógios de ponto.",
          "Faça login com sua conta do CRM Pilar.",
          "Ative os módulos desejados na tela do app.",
          "Para o agente de voz, toque em \"Pilar Voz\" e informe os dados da central (a chave de voz usa a própria chave de ativação do app).",
        ],
      },
    },
    {
      nome: "Pilar Fone",
      descricao: "Interfone da portaria com abertura remota pelo CRM.",
      icone: "android",
      sistemas: ["Android"],
      recursos: ["Interfone"],
      arquivo: "pilar-interfone-v1.7.6.apk",
      url: INTERFONE_URL,
      versao: "v1.7.6",
      ajuda: {
        titulo: "Pilar Fone — como instalar",
        passos: [
          "Instale o APK no tablet ou celular Android da portaria.",
          "Faça login com a conta da portaria no CRM.",
          "As chamadas de interfone passam a chegar neste aparelho.",
        ],
      },
    },
    {
      nome: "TV Remotas",
      descricao: "Painel de TV: exibe mídias e avisos em TVs Android.",
      icone: "tv",
      sistemas: ["Android TV"],
      recursos: ["TV / Mídia"],
      arquivo: "app-release.apk",
      url: tvInfo?.url || TV_URL,
      versao: tvInfo?.versionName ? `v${tvInfo.versionName}` : undefined,
      appSlug: "remotas",
      ajuda: {
        titulo: "TV Remotas — como instalar",
        passos: [
          "Baixe o APK e instale na TV ou TV Box Android (por USB ou app de transferência).",
          "Abra o app e anote o código de pareamento exibido na tela.",
          "No CRM, em Marketing → TV, vincule a TV pelo código e escolha o conteúdo.",
        ],
      },
    },
    {
      nome: "Coletor",
      descricao: "Ponto, câmeras, automação e Pilar Voz num PC Windows ligado 24/7.",
      icone: "windows",
      sistemas: ["Windows"],
      recursos: ["Ponto", "Câmeras", "Automação", "Voz"],
      arquivo: coletorFileName,
      url: coletorUrl,
      versao: coletorVersao,
      appSlug: "coletor",
      ajuda: {
        titulo: "Coletor (Windows) — como instalar",
        passos: [
          `Baixe e execute o ${coletorFileName} em um PC Windows que fique ligado 24/7 na mesma rede das câmeras e relógios de ponto.`,
          "Faça login com sua conta do CRM Pilar. O Coletor vincula ao seu tenant automaticamente.",
          "Ative os módulos Câmeras, Ponto, Automação e/ou Pilar Voz na tela principal. O ícone deve ficar verde (online).",
        ],
        observacao: coletorInfo?.notas ? `Novidades: ${coletorInfo.notas}` : undefined,
      },
    },
    {
      nome: "Coletor (Apple Silicon)",
      descricao: "Mesmo Coletor para Macs com chip M1, M2, M3 ou M4.",
      icone: "mac",
      sistemas: ["macOS"],
      recursos: ["Ponto", "Câmeras", "Automação", "Voz"],
      arquivo: "ColetorPilar-Mac-AppleSilicon.zip",
      url: coletorMacAsUrl,
      versao: coletorVersao,
      appSlug: "coletor",
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
      nome: "Coletor (Mac Intel)",
      descricao: "Mesmo Coletor para Macs com processador Intel.",
      icone: "mac",
      sistemas: ["macOS"],
      recursos: ["Ponto", "Câmeras", "Automação", "Voz"],
      arquivo: "ColetorPilar-Mac-Intel.zip",
      url: coletorMacIntelUrl,
      versao: coletorVersao,
      appSlug: "coletor",
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
      nome: "Coletor (Linux)",
      descricao: "AppImage x64 para Debian, Ubuntu, Mint etc.",
      icone: "linux",
      sistemas: ["Linux"],
      recursos: ["Ponto", "Câmeras", "Automação", "Voz"],
      arquivo: "ColetorPilar-Linux.AppImage",
      url: coletorLinuxUrl,
      versao: coletorVersao,
      appSlug: "coletor",
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
      nome: "Coletor (Appliance ISO)",
      descricao: "Instala Linux + Coletor em modo kiosk num mini-PC, com SSH e Cockpit.",
      icone: "linux",
      sistemas: ["Linux"],
      recursos: ["Ponto", "Câmeras", "Automação", "Voz"],
      arquivo: "coletor-pilar-appliance-amd64.iso",
      url: APPLIANCE_ISO_URL,
      appSlug: "coletor",
      ajuda: {
        titulo: "Coletor (Appliance ISO) — como instalar",
        passos: [
          "Grave a ISO num pendrive (Rufus, Balena Etcher) e dê boot pelo mini-PC.",
          "A instalação é automática: Linux + Coletor em modo kiosk.",
          "Para atualizar depois: sudo /opt/coletor/update.sh.",
        ],
      },
    },
  ];

  const urlsDownloads = apps.map((app) => app.url).join("\n");

  useEffect(() => {
    let cancelado = false;
    const grupos = new Map<string, { url: string; arquivo: string }[]>();
    for (const url of urlsDownloads.split("\n")) {
      const partes = url.match(/^https:\/\/github\.com\/([^/]+\/[^/]+)\/releases\/(?:download\/([^/]+)|latest\/download)\/(.+)$/);
      if (!partes) continue;
      const endpoint = `https://api.github.com/repos/${partes[1]}/releases/${partes[2] ? `tags/${partes[2]}` : "latest"}`;
      const itens = grupos.get(endpoint) || [];
      itens.push({ url, arquivo: decodeURIComponent(partes[3]) });
      grupos.set(endpoint, itens);
    }
    void Promise.all(Array.from(grupos, async ([endpoint, itens]) => {
      try {
        const resposta = await fetch(endpoint);
        if (!resposta.ok) return;
        const release = await resposta.json() as {
          published_at?: string;
          assets?: { name: string; updated_at?: string }[];
        };
        const datas: Record<string, string> = {};
        for (const item of itens) {
          const data = release.assets?.find((asset) => asset.name === item.arquivo)?.updated_at || release.published_at;
          if (data && !Number.isNaN(Date.parse(data))) {
            datas[item.url] = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo" }).format(new Date(data));
          }
        }
        if (!cancelado) setDatasDownloads((anteriores) => ({ ...anteriores, ...datas }));
      } catch {
        // Sem data confirmada, a tabela mantém "Não informada".
      }
    }));
    return () => { cancelado = true; };
  }, [urlsDownloads]);

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
          <div className="hidden w-full max-w-full overflow-x-hidden lg:block">
            <Table className="table-auto">
              <TableHeader>
                <TableRow>
                  <TableHead>Aplicativo</TableHead>
                  <TableHead className="hidden sm:table-cell w-28">Sistema</TableHead>
                  {RECURSOS.map((r) => (
                    <TableHead key={r} className="hidden w-9 p-0 align-bottom text-center lg:table-cell">
                      <span className="mx-auto flex h-20 items-end justify-center">
                        <span className="inline-block whitespace-nowrap text-[11px] font-medium tracking-wide text-muted-foreground [writing-mode:vertical-rl] rotate-180">
                          {r}
                        </span>
                      </span>
                    </TableHead>
                  ))}
                  <TableHead className="w-24 sm:w-28">Versão / Data</TableHead>
                  <TableHead className="hidden 2xl:table-cell">Arquivo</TableHead>
                  <TableHead className="text-right w-16 sm:w-48">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {apps.map((app) => {
                  const id = `${app.nome}-${app.sistemas.join("-")}`;
                  const aberta = chavesAberta === id;
                  return (
                  <Fragment key={id}>
                  <TableRow>
                    <TableCell>
                      <div className="flex items-center gap-2 sm:gap-3">
                        <div className={`hidden h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl sm:flex ${corIcone[app.icone]}`}>
                          <IconeSistema tipo={app.icone} />
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold leading-tight break-words">{app.nome}</p>
                          <p className="text-xs text-muted-foreground line-clamp-2">{app.descricao}</p>
                          <div className="mt-1 flex flex-wrap gap-1 lg:hidden">
                            {app.sistemas.map((s) => (<Badge key={s} variant="outline" className="text-[10px] uppercase sm:hidden">{s}</Badge>))}
                            {app.recursos.map((r) => (
                              <span
                                key={r}
                                className="inline-flex items-center gap-1 rounded-full border bg-muted/40 px-1.5 py-0.5 text-[10px] font-medium text-foreground"
                              >
                                <Check className="h-2.5 w-2.5 text-primary" />
                                {r}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <div className="flex flex-wrap gap-1">
                        {app.sistemas.map((s) => (
                          <Badge key={s} variant="outline" className="text-[10px] uppercase tracking-wider">
                            {s}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    {RECURSOS.map((r) => (
                      <TableCell
                        key={r}
                        title={`${app.nome} · ${r}`}
                        className="hidden w-9 p-1 text-center align-middle lg:table-cell"
                      >
                        {app.recursos.includes(r) ? (
                          <span className="mx-auto flex h-6 w-6 items-center justify-center rounded-md border border-primary/25 bg-primary/10">
                            <Check className="h-3.5 w-3.5 text-primary" />
                          </span>
                        ) : (
                          <span className="mx-auto block h-6 w-6 rounded-md bg-muted/40" aria-hidden="true" />
                        )}
                      </TableCell>
                    ))}
                    <TableCell className="text-xs sm:text-sm">
                      <p className="font-medium break-words">{app.versao || "Não informada"}</p>
                      <p className="mt-1 text-xs text-muted-foreground" title="Data de atualização do arquivo de download">
                        {datasDownloads[app.url] || "Não informada"}
                      </p>
                    </TableCell>
                    <TableCell className="hidden 2xl:table-cell">
                      <code className="text-xs text-muted-foreground">{app.arquivo}</code>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex flex-wrap justify-end gap-2">
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
                        <Button
                          size="sm"
                          variant={aberta ? "secondary" : "outline"}
                          className="gap-1.5"
                          aria-expanded={aberta}
                          onClick={() => setChavesAberta(aberta ? null : id)}
                        >
                          <KeyRound className="h-4 w-4" />
                          <span className="hidden sm:inline">Chaves</span>
                          <ChevronDown className={`h-3.5 w-3.5 transition-transform ${aberta ? "rotate-180" : ""}`} />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                  {aberta && (
                    <TableRow className="bg-muted/30 hover:bg-muted/30">
                      <TableCell colSpan={RECURSOS.length + 5} className="p-3 sm:p-4">
                        <PainelExpandido app={app} />
                      </TableCell>
                    </TableRow>
                  )}
                  </Fragment>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* Celular e tablet: cartões em vez da tabela, para nada ficar espremido. */}
          <div className="space-y-3 p-3 lg:hidden">
            {apps.map((app) => {
              const id = `${app.nome}-${app.sistemas.join("-")}`;
              const aberta = chavesAberta === id;
              return (
                <div key={id} className="rounded-xl border bg-card p-3 shadow-sm">
                  <div className="flex items-start gap-3">
                    <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl ${corIcone[app.icone]}`}>
                      <IconeSistema tipo={app.icone} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold leading-tight break-words">{app.nome}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground break-words">{app.descricao}</p>
                    </div>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-1">
                    {app.sistemas.map((s) => (
                      <Badge key={s} variant="outline" className="text-[10px] uppercase tracking-wider">{s}</Badge>
                    ))}
                    <Badge variant="secondary" className="text-[10px]">{app.versao || "versão não informada"}</Badge>
                    <span className="text-[10px] text-muted-foreground">{datasDownloads[app.url] || ""}</span>
                  </div>
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {app.recursos.map((r) => (
                      <span key={r} className="inline-flex items-center gap-1 rounded-full border bg-muted/40 px-1.5 py-0.5 text-[10px] font-medium text-foreground">
                        <Check className="h-2.5 w-2.5 text-primary" />
                        {r}
                      </span>
                    ))}
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    <Button size="sm" className="gap-1.5 px-2" onClick={() => baixar(app.arquivo, app.url)}>
                      <Download className="h-4 w-4 shrink-0" /> Baixar
                    </Button>
                    <Button size="sm" variant="outline" className="gap-1.5 px-2" onClick={() => setAjudaAberta(app.ajuda)}>
                      <HelpCircle className="h-4 w-4 shrink-0" /> Ajuda
                    </Button>
                    <Button
                      size="sm"
                      variant={aberta ? "secondary" : "outline"}
                      className="gap-1.5 px-2"
                      aria-expanded={aberta}
                      onClick={() => setChavesAberta(aberta ? null : id)}
                    >
                      <KeyRound className="h-4 w-4 shrink-0" /> Chaves
                      <ChevronDown className={`h-3.5 w-3.5 shrink-0 transition-transform ${aberta ? "rotate-180" : ""}`} />
                    </Button>
                  </div>
                  {aberta && (
                    <div className="mt-3 rounded-lg border bg-muted/30 p-3">
                      <PainelExpandido app={app} />
                    </div>
                  )}
                </div>
              );
            })}
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
