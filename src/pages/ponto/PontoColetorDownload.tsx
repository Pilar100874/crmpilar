import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Monitor, Apple, Cpu, CheckCircle2, Copy, Check, Database, Key } from "lucide-react";
import { toast } from "sonner";
import winAsset from "../../../public/coletor/PontoColetor-Windows.asset.json";
import linuxAsset from "../../../public/coletor/PontoColetor-Linux.asset.json";
import macIntelAsset from "../../../public/coletor/PontoColetor-macOS-Intel.asset.json";
import macArmAsset from "../../../public/coletor/PontoColetor-macOS-AppleSilicon.asset.json";

type Platform = {
  id: string;
  label: string;
  file: string;
  icon: any;
  badge: string;
  url?: string;
  variants?: { label: string; file: string; url: string }[];
};

const platforms: Platform[] = [
  {
    id: "win",
    label: "Windows",
    file: "PontoColetor-Windows.zip",
    icon: Monitor,
    badge: "Pacote portátil (.zip) · x64",
    url: winAsset.url,
  },
  {
    id: "mac",
    label: "macOS",
    file: "PontoColetor-macOS.zip",
    icon: Apple,
    badge: "Apple Silicon (M1/M2/M3) ou Intel",
    variants: [
      { label: "Apple Silicon (M1/M2/M3)", file: "PontoColetor-macOS-AppleSilicon.zip", url: macArmAsset.url },
      { label: "Intel", file: "PontoColetor-macOS-Intel.zip", url: macIntelAsset.url },
    ],
  },
  {
    id: "linux",
    label: "Linux",
    file: "PontoColetor-Linux.tar.gz",
    icon: Cpu,
    badge: "Debian/Ubuntu/Fedora · x64",
    url: linuxAsset.url,
  },
];

export default function PontoColetorDownload() {
  const [downloading, setDownloading] = useState<string | null>(null);

  const baixar = (file: string, id: string, url: string) => {
    setDownloading(id);
    try {
      const a = document.createElement("a");
      a.href = url;
      a.download = file;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      toast.success("Download iniciado");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setTimeout(() => setDownloading(null), 1000);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold sm:text-2xl">Coletor Desktop</h2>
        <p className="text-sm text-muted-foreground">
          Programa para instalar no computador que fica na rede dos relógios. Coleta as batidas
          via TCP/IP, valida, e envia para o controle de ponto.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {platforms.map((p) => (
          <Card key={p.id}>
            <CardContent className="space-y-3 p-5 text-center">
              <p.icon className="mx-auto h-10 w-10 text-primary" />
              <h3 className="font-semibold">{p.label}</h3>
              <p className="text-xs text-muted-foreground">{p.badge}</p>
              {p.variants ? (
                <div className="space-y-2">
                  {p.variants.map((v) => (
                    <Button
                      key={v.file}
                      className="w-full"
                      variant="outline"
                      onClick={() => baixar(v.file, `${p.id}-${v.label}`, v.url)}
                      disabled={downloading === `${p.id}-${v.label}`}
                    >
                      <Download className="mr-2 h-4 w-4" />
                      {v.label}
                    </Button>
                  ))}
                </div>
              ) : (
                <Button
                  className="w-full"
                  onClick={() => baixar(p.file, p.id, p.url!)}
                  disabled={downloading === p.id}
                >
                  <Download className="mr-2 h-4 w-4" />
                  {downloading === p.id ? "Baixando…" : "Baixar"}
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-primary/20 bg-primary/5 dark:bg-primary/5">
        <CardContent className="space-y-4 p-5">
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5 text-primary" />
            <h3 className="font-semibold text-foreground">Dados de Conexão (Para colar no Coletor Desktop)</h3>
          </div>
          <p className="text-xs text-muted-foreground">
            Ao configurar o Coletor Desktop, use estes dados exatos para conectá-lo à nuvem:
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5 rounded-lg border bg-background p-3.5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  <Database className="h-3.5 w-3.5 text-primary" /> URL do Supabase
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => {
                    navigator.clipboard.writeText("https://ioxugupvxlcdweldocmq.supabase.co");
                    toast.success("URL copiada!");
                  }}
                >
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              </div>
              <code className="block select-all break-all rounded bg-muted/60 p-2 text-xs font-mono text-foreground font-medium border">
                https://ioxugupvxlcdweldocmq.supabase.co
              </code>
            </div>

            <div className="space-y-1.5 rounded-lg border bg-background p-3.5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  <Key className="h-3.5 w-3.5 text-yellow-500" /> Chave Anon (Anon Key)
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => {
                    navigator.clipboard.writeText("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlveHVndXB2eGxjZHdlbGRvY21xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA3MTEwODUsImV4cCI6MjA3NjI4NzA4NX0.WKRpPgsfohk4BRyHthLmz23F2Iab-vPObkioUeFkzWc");
                    toast.success("Chave Anon copiada!");
                  }}
                >
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              </div>
              <code className="block select-all break-all rounded bg-muted/60 p-2 text-xs font-mono text-foreground font-medium border truncate max-w-full" title="Clique para copiar">
                eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...eFkzWc
              </code>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3 p-5">
          <h3 className="font-semibold">Como instalar</h3>
          <div className="space-y-3 text-sm text-muted-foreground">
            <div>
              <p className="font-medium text-foreground">Windows</p>
              <ol className="ml-4 list-decimal space-y-1">
                <li>Descompacte o arquivo <strong>.zip</strong> em qualquer pasta de sua preferência.</li>
                <li>Execute o <strong>PontoColetor.exe</strong>. O Electron (utilizando o instalador padrão Squirrel) fará uma instalação automática ultra rápida e abrirá o aplicativo diretamente.</li>
                <li className="text-amber-600 dark:text-amber-400 font-medium">⚠️ Por que não cria atalho automático em alguns sistemas?</li>
                <p className="text-xs text-muted-foreground pl-4 mt-0.5">
                  Por se tratar de um pacote portátil do Windows, o aplicativo é instalado e executado a partir da sua pasta de dados locais. Para abrir de forma rápida sem disparar a tela de configuração novamente:
                </p>
                <ul className="ml-8 list-disc space-y-1 text-xs mt-1">
                  <li>Abra o menu Executar do Windows (pressione as teclas <strong>Win + R</strong>).</li>
                  <li>Digite exatamente: <code className="bg-muted px-1 py-0.5 rounded font-mono font-semibold">%localappdata%\PontoColetor</code> e dê Enter.</li>
                  <li>Na pasta que abrir, clique com o botão direito sobre o arquivo <strong>PontoColetor.exe</strong> (ou o ícone azul do app) → Escolha <strong>Enviar para</strong> → <strong>Área de trabalho (criar atalho)</strong>.</li>
                  <li>Pronto! Use esse novo atalho da Área de Trabalho para abrir o app instantaneamente de forma definitiva.</li>
                </ul>
              </ol>
            </div>
            <div>
              <p className="font-medium text-foreground">macOS</p>
              <ol className="ml-4 list-decimal space-y-1">
                <li>Descompacte o <strong>.zip</strong> baixado.</li>
                <li>Arraste <strong>PontoColetor.app</strong> para a pasta <strong>Aplicativos</strong>.</li>
                <li>Na primeira execução, clique com botão direito → <strong>Abrir</strong> (app não notarizado).</li>
              </ol>
            </div>
            <div>
              <p className="font-medium text-foreground">Linux</p>
              <ol className="ml-4 list-decimal space-y-1">
                <li>Extraia o arquivo: <code>tar -xzf PontoColetor-Linux.tar.gz</code></li>
                <li>Entre na pasta: <code>cd PontoColetor-linux-x64</code></li>
                <li>Dê permissão e execute: <code>chmod +x PontoColetor && ./PontoColetor</code></li>
              </ol>
            </div>
            <p>Após abrir o app: faça login com o usuário do CRM, cadastre os relógios em <strong>Equipamentos</strong> e o coletor sincroniza a cada 60s.</p>
          </div>
          <div className="rounded-md bg-muted/50 p-3 text-xs">
            <p className="font-medium mb-1">Marcas e protocolos suportados</p>
            <p className="text-muted-foreground">
              Control iD (REP iDClass, iDFace) · Henry (Prisma, Hexa) · Topdata (Inner Rep) · ZKTeco · Madis · qualquer relógio compatível com Portaria 671/2021.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-2 p-5">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-success" />
            <h3 className="font-semibold">Status da integração</h3>
          </div>
          <ul className="ml-7 list-disc space-y-1 text-sm text-muted-foreground">
            <li>Conexão direta com Lovable Cloud via HTTPS</li>
            <li>Assinatura digital de cada batida (hash SHA-256)</li>
            <li>NSR (Número Sequencial de Registro) gerado pelo REP</li>
            <li>Retenção local de 7 dias caso a internet caia</li>
            <li>Compatível com exportação para Domínio Sistemas Web (folha)</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
