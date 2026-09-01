import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Smartphone, Info, ExternalLink } from "lucide-react";
import { toast } from "sonner";

const FALLBACK = {
  version: "1.0.0",
  downloadUrl:
    "https://github.com/Pilar100874/crmpilar/releases/download/interfone-v1.0.0/pilar-interfone-v1.0.0.apk",
  filename: "pilar-interfone-v1.0.0.apk",
  notas:
    "Atendimento do interfone no celular: câmeras, abrir porta/portão, áudio ao vivo e push da campainha.",
};

type Info = { version: string; downloadUrl: string; filename?: string; notas?: string };

const baixar = (file: string, url: string) => {
  try {
    const a = document.createElement("a");
    a.href = url;
    a.download = file;
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
  } catch {
    toast.error("Não foi possível iniciar o download");
  }
};

export default function InterfoneAppDownloadCard() {
  const [info, setInfo] = useState<Info | null>(null);

  useEffect(() => {
    fetch("/coletor/interfone-version.json", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => j && setInfo(j))
      .catch(() => {});
  }, []);

  const versao = info?.version || FALLBACK.version;
  const arquivo =
    info?.filename || info?.downloadUrl?.split("/").pop() || FALLBACK.filename;
  const url = info?.downloadUrl || FALLBACK.downloadUrl;
  const notas = info?.notas || FALLBACK.notas;

  return (
    <Card className="overflow-hidden rounded-2xl border shadow-sm">
      <CardContent className="p-5 sm:p-7">
        <div className="mb-5 flex items-start justify-between gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-300 sm:h-14 sm:w-14 sm:rounded-2xl">
            <Smartphone className="h-7 w-7" />
          </div>
          <span className="rounded-full border bg-muted px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground sm:px-3 sm:text-xs">
            Android · APK
          </span>
        </div>

        <h2 className="mb-2 text-xl font-bold text-foreground sm:text-2xl">
          Pilar Interfone (App Android)
        </h2>
        <p className="mb-5 text-sm leading-relaxed text-muted-foreground">
          Atenda a campainha pelo celular: câmeras do interfone, botões de abrir porta/portão,
          áudio ao vivo com quem está na entrada e alerta em tempo real.
        </p>

        <div className="mb-5 flex items-start gap-3 rounded-xl border border-dashed p-4 text-xs text-muted-foreground">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
          <span>
            <b className="text-foreground">Versão {versao}</b> · {notas}
          </span>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <Button className="flex-1" onClick={() => baixar(arquivo, url)}>
            <Download className="mr-2 h-4 w-4" />
            Baixar APK
          </Button>
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => window.open("/app/interfone", "_blank", "noopener")}
          >
            <ExternalLink className="mr-2 h-4 w-4" />
            Abrir no navegador
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
