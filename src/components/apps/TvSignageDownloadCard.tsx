import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Tv, Info } from "lucide-react";
import { toast } from "sonner";
import { getLatestTvSignageApkUrl, TV_SIGNAGE_APK_FILENAME, TV_SIGNAGE_MANIFEST_URL } from "@/lib/tvSignageApkUrl";
import VersaoAppBadge from "@/components/apps/VersaoAppBadge";

const baixar = (file: string, url: string) => {
  try {
    const a = document.createElement("a");
    a.href = url;
    a.download = file;
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
    toast.success("Download iniciado");
  } catch {
    toast.error("Não foi possível iniciar o download");
  }
};

export default function TvSignageDownloadCard() {
  const [apkUrl, setApkUrl] = useState<string>("");

  useEffect(() => {
    getLatestTvSignageApkUrl().then(setApkUrl);
  }, []);

  return (
    <Card className="flex flex-col overflow-hidden rounded-2xl sm:rounded-3xl border shadow-sm transition-all duration-300 hover:shadow-xl hover:border-primary/20">
      <CardContent className="flex-1 p-5 sm:p-7 md:p-8">
        <div className="mb-5 flex items-start justify-between gap-3 sm:mb-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-50 text-green-600 dark:bg-green-950/40 dark:text-green-300 sm:h-14 sm:w-14 sm:rounded-2xl">
            <Tv className="h-8 w-8" />
          </div>
          <span className="rounded-full border bg-muted px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground sm:px-3 sm:text-xs">
            Android TV / Google TV · APK
          </span>
        </div>

        <div className="mb-2 flex flex-wrap items-center gap-2">
          <h2 className="text-xl font-bold text-foreground sm:text-2xl">Pilar Remotas</h2>
          <VersaoAppBadge manifesto={TV_SIGNAGE_MANIFEST_URL} />
        </div>
        <div className="mb-6 text-sm leading-relaxed text-muted-foreground sm:mb-8">
          Aplicativo para <b>Android TV / Google TV</b> que transforma a televisão em uma
          tela remota do CRM (painéis de vendas, portaria, câmeras e avisos). Pareamento por código
          e abertura automática ao ligar a TV.
        </div>

        <div className="mb-6 flex items-center gap-3 rounded-xl border border-dashed p-4 text-xs text-muted-foreground sm:mb-8">
          <Info className="h-4 w-4 text-green-600 dark:text-green-400" />
          <span>
            <b className="text-foreground">Sempre a versão mais nova:</b> o link aponta para a
            última compilação publicada automaticamente.
          </span>
        </div>

        <div className="flex flex-col gap-3 rounded-2xl bg-foreground p-3 sm:flex-row sm:items-center sm:justify-between sm:gap-2 sm:p-2 sm:pl-4">
          <div className="flex min-w-0 flex-col">
            <span className="text-[10px] font-bold uppercase tracking-widest text-background/60">
              Pacote APK
            </span>
            <span className="truncate font-mono text-xs text-background sm:text-sm">
              {TV_SIGNAGE_APK_FILENAME}
            </span>
          </div>
          <Button
            disabled={!apkUrl}
            onClick={() => apkUrl && baixar(TV_SIGNAGE_APK_FILENAME, apkUrl)}
            className="w-full flex-shrink-0 rounded-xl px-5 py-3 text-sm font-bold sm:w-auto sm:px-6 bg-green-600 hover:bg-green-500 text-white"
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
            <p className="text-sm leading-relaxed text-muted-foreground">
              Baixe o APK e transfira para a TV (pendrive, envio por app ou direto pelo navegador da TV).
            </p>
          </li>
          <li className="flex gap-3 sm:gap-4">
            <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border bg-background text-xs font-bold text-foreground">2</span>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Instale permitindo fontes desconhecidas e abra o app <b>Pilar Remotas</b>.
            </p>
          </li>
          <li className="flex gap-3 sm:gap-4">
            <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border bg-background text-xs font-bold text-foreground">3</span>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Digite o <b>código de pareamento</b> gerado em <b>TV → Gerenciador de Telas Remotas</b> e pronto.
            </p>
          </li>
        </ol>
      </div>
    </Card>
  );
}
