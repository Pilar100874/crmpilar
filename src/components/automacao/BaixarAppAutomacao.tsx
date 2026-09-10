import { useEffect, useState } from "react";
import { Download, Smartphone, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";

type Manifesto = {
  url: string;
  versionName?: string;
  size?: number;
  updated_at?: string;
};

/** Botão de download do aplicativo de celular/tablet que abre o painel de automação. */
export default function BaixarAppAutomacao({ ambienteId, ambienteNome }: { ambienteId?: string; ambienteNome?: string }) {
  const [aberto, setAberto] = useState(false);
  const [info, setInfo] = useState<Manifesto | null>(null);

  useEffect(() => {
    if (!aberto || info) return;
    fetch("/apps/pilar-automacao-latest.json", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setInfo(d))
      .catch(() => setInfo(null));
  }, [aberto, info]);

  const tamanho = info?.size ? `${(info.size / 1024 / 1024).toFixed(1)} MB` : null;

  const copiar = async () => {
    if (!ambienteId) return;
    await navigator.clipboard.writeText(ambienteId);
    toast.success("Código do ambiente copiado");
  };

  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" title="Baixar o aplicativo para celular ou tablet">
          <Smartphone className="h-4 w-4 mr-1" /> Baixar app
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Aplicativo Pilar Automação</DialogTitle>
          <DialogDescription>
            Instale no celular ou tablet para abrir direto o painel escolhido, em tela cheia.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 text-sm">
          <div className="rounded-lg border bg-muted/40 p-3">
            <p className="font-medium">Como usar</p>
            <ol className="mt-1 list-decimal space-y-1 pl-4 text-muted-foreground">
              <li>Baixe e instale o arquivo no aparelho (permita instalar de fonte desconhecida).</li>
              <li>Ao abrir, confirme o endereço do sistema.</li>
              <li>Cole o código do painel abaixo ou deixe vazio para escolher automaticamente.</li>
            </ol>
          </div>

          {ambienteId && (
            <div className="flex items-center gap-2">
              <div className="min-w-0 flex-1 rounded-md border px-2 py-1 font-mono text-xs truncate">
                {ambienteId}
              </div>
              <Button size="sm" variant="outline" onClick={copiar}>
                <Copy className="h-4 w-4 mr-1" /> Copiar
              </Button>
            </div>
          )}
          {ambienteNome && (
            <p className="text-xs text-muted-foreground">Painel atual: {ambienteNome}</p>
          )}

          <Button
            className="w-full"
            onClick={() => {
              const url = info?.url
                ?? "https://github.com/Pilar100874/crmpilar/releases/download/pilar-automacao-latest/pilar-automacao.apk";
              window.open(url, "_blank", "noopener");
            }}
          >
            <Download className="h-4 w-4 mr-2" />
            Baixar aplicativo {info?.versionName ? `v${info.versionName}` : ""}
          </Button>
          {tamanho && <p className="text-center text-xs text-muted-foreground">{tamanho}</p>}
        </div>
      </DialogContent>
    </Dialog>
  );
}
