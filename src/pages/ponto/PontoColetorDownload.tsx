import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Monitor, Apple, Cpu } from "lucide-react";
import { toast } from "sonner";
import winAsset from "../../../public/coletor/PontoColetor-Windows.asset.json";

const platforms = [
  {
    id: "win",
    label: "Windows",
    file: "PontoColetor-Windows.zip",
    icon: Monitor,
    badge: "Pacote portátil (.zip) · x64",
    url: winAsset.url,
  },
  { id: "mac", label: "macOS", file: "PontoColetor-macOS.zip", icon: Apple, badge: "Apple Silicon / Intel" },
  { id: "linux", label: "Linux", file: "PontoColetor-Linux.tar.gz", icon: Cpu, badge: "Debian/Ubuntu/Fedora" },
];

export default function PontoColetorDownload() {
  const [downloading, setDownloading] = useState<string | null>(null);

  const baixar = async (file: string, id: string, customUrl?: string) => {
    setDownloading(id);
    try {
      if (customUrl) {
        const a = document.createElement("a");
        a.href = customUrl;
        a.download = file;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        toast.success("Download iniciado");
        return;
      }
      const res = await fetch(`/coletor/${file}`);
      if (!res.ok) throw new Error("Arquivo indisponível");
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = file;
      a.click();
      URL.revokeObjectURL(a.href);
      toast.success("Download iniciado");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setDownloading(null);
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
              <Button className="w-full" onClick={() => baixar(p.file, p.id, p.url)} disabled={downloading === p.id}>
                <Download className="mr-2 h-4 w-4" />
                {downloading === p.id ? "Baixando…" : "Baixar"}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="space-y-3 p-5">
          <h3 className="font-semibold">Como instalar</h3>
          <ol className="ml-4 list-decimal space-y-2 text-sm text-muted-foreground">
            <li>No Windows, execute o instalador <strong>PontoColetor-Setup.exe</strong>. Nas demais plataformas, descompacte o pacote.</li>
            <li>Execute o aplicativo <strong>Ponto Coletor</strong>.</li>
            <li>Faça login com o usuário e senha do CRM.</li>
            <li>Cadastre os relógios em <strong>Equipamentos</strong> e o coletor reconhece automaticamente.</li>
            <li>O serviço fica rodando em segundo plano e sincroniza a cada 60s.</li>
          </ol>
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
            <li>Conexão direta com Lovable Cloud (Supabase) via HTTPS</li>
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
