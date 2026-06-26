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

      <Card>
        <CardContent className="space-y-3 p-5">
          <h3 className="font-semibold">Como instalar</h3>
          <div className="space-y-3 text-sm text-muted-foreground">
            <div>
              <p className="font-medium text-foreground">Windows</p>
              <ol className="ml-4 list-decimal space-y-1">
                <li>Descompacte o <strong>.zip</strong> em uma pasta (ex.: <code>C:\PontoColetor</code>).</li>
                <li>Execute <strong>PontoColetor.exe</strong> dentro da pasta extraída.</li>
                <li>Opcional: crie um atalho na Área de Trabalho ou na Inicialização.</li>
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
