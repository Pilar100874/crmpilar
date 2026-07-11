import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Smartphone, Info } from "lucide-react";
import { toast } from "sonner";

const SMS_FALLBACK_URL =
  "https://github.com/Pilar100874/crmpilar/releases/download/sms-v1.4.9/pilar-sms-v1.4.9.apk";
const SMS_FALLBACK_FILENAME = "pilar-sms-v1.4.9.apk";
const SMS_FALLBACK_VERSION = "1.4.9";

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

export default function PilarSmsDownloadCard() {
  const [smsInfo, setSmsInfo] = useState<{
    version: string;
    downloadUrl: string;
    filename?: string;
    notas?: string;
  } | null>(null);

  useEffect(() => {
    fetch("/coletor/sms-version.json", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => j && setSmsInfo(j))
      .catch(() => {});
  }, []);

  const smsVersion = smsInfo?.version || SMS_FALLBACK_VERSION;
  const smsFileName =
    smsInfo?.filename || smsInfo?.downloadUrl?.split("/").pop() || SMS_FALLBACK_FILENAME;
  const smsUrl = smsInfo?.downloadUrl || SMS_FALLBACK_URL;
  const smsNotas = smsInfo?.notas;

  return (
    <Card className="flex flex-col overflow-hidden rounded-2xl sm:rounded-3xl border shadow-sm">
      <CardContent className="flex-1 p-5 sm:p-7">
        <div className="mb-5 flex items-start justify-between gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-300 sm:h-14 sm:w-14 sm:rounded-2xl">
            <Smartphone className="h-8 w-8" />
          </div>
          <span className="rounded-full border bg-muted px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground sm:px-3 sm:text-xs">
            Android · APK
          </span>
        </div>

        <h2 className="mb-2 text-xl font-bold text-foreground sm:text-2xl">
          SMS Pilar (App Android)
        </h2>
        <div className="mb-6 text-sm leading-relaxed text-muted-foreground">
          Aplicativo Android que transforma um celular com chip em <b>gateway de SMS</b> do CRM.
          Recebe da fila do CRM os SMS a enviar e dispara pelo <b>SMS nativo da operadora</b>.
        </div>

        <div className="flex items-center gap-3 rounded-xl border border-dashed p-4 text-xs text-muted-foreground mb-6">
          <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          <span>
            <b className="text-foreground">Versão {smsVersion}</b> · SMS via rádio GSM · relatório
            de entrega · roda em segundo plano com wake-lock.
            {smsNotas && (
              <>
                <br />
                <span className="text-xs">{smsNotas}</span>
              </>
            )}
          </span>
        </div>

        <div className="flex flex-col gap-3 rounded-2xl bg-foreground p-3 sm:flex-row sm:items-center sm:justify-between sm:gap-2 sm:p-2 sm:pl-4">
          <div className="flex min-w-0 flex-col">
            <span className="text-[10px] font-bold uppercase tracking-widest text-background/60">
              Pacote APK
            </span>
            <span className="truncate font-mono text-xs text-background sm:text-sm">
              {smsFileName}
            </span>
          </div>
          <Button
            onClick={() => baixar(smsFileName, smsUrl)}
            className="w-full flex-shrink-0 rounded-xl px-5 py-3 text-sm font-bold sm:w-auto sm:px-6 bg-blue-500 hover:bg-blue-400 text-white"
          >
            <Download className="mr-2 h-4 w-4" /> Baixar APK
          </Button>
        </div>
      </CardContent>

      <div className="border-t bg-muted/40 p-5 sm:p-7">
        <h3 className="mb-4 text-xs font-bold uppercase tracking-widest text-muted-foreground">
          Como instalar e usar
        </h3>
        <ol className="space-y-4">
          <li className="flex gap-3">
            <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border bg-background text-xs font-bold">1</span>
            <p className="text-sm leading-relaxed text-muted-foreground">
              No Android, remova qualquer versão anterior do <b>SMS Pilar</b> e permita a instalação
              quando o navegador perguntar.
            </p>
          </li>
          <li className="flex gap-3">
            <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border bg-background text-xs font-bold">2</span>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Baixe o <b>{smsFileName}</b> acima e toque no arquivo para instalar.
            </p>
          </li>
          <li className="flex gap-3">
            <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border bg-background text-xs font-bold">3</span>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Abra o app <b>SMS Pilar</b>, cole o <b>token do dispositivo</b> (gerado em{" "}
              <b>Celulares Pilar SMS</b> acima) e conceda a permissão de <b>SMS</b>.
            </p>
          </li>
          <li className="flex gap-3">
            <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border bg-background text-xs font-bold">4</span>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Pronto. A cada atualização do CRM, o app carrega a versão nova automaticamente ao abrir.
            </p>
          </li>
        </ol>
      </div>
    </Card>
  );
}
