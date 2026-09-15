import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Smartphone, Info } from "lucide-react";
import { toast } from "sonner";
import { baixarArquivo } from "@/lib/baixarArquivo";

const HUB_FALLBACK_URL =
  "https://github.com/Pilar100874/crmpilar/releases/download/coletor-v3.2.2/pilar-coletor-v3.2.2.apk";
const HUB_FALLBACK_FILENAME = "pilar-coletor-v3.2.2.apk";
const HUB_FALLBACK_VERSION = "3.2.2";

const baixar = (file: string, url: string) => baixarArquivo(file, url);

export default function PilarHubDownloadCard() {
  const [hubInfo, setHubInfo] = useState<{
    version: string;
    downloadUrl: string;
    filename?: string;
    notas?: string;
    disponivel?: boolean;
  } | null>(null);

  useEffect(() => {
    fetch("/coletor/hub-version.json", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => j && setHubInfo(j))
      .catch(() => {});
  }, []);

  const hubVersion = hubInfo?.version || HUB_FALLBACK_VERSION;
  const hubFileName =
    hubInfo?.filename || hubInfo?.downloadUrl?.split("/").pop() || HUB_FALLBACK_FILENAME;
  const hubUrl = hubInfo?.downloadUrl || HUB_FALLBACK_URL;
  const hubNotas = hubInfo?.notas;
  const indisponivel = hubInfo?.disponivel !== true || !hubUrl;

  return (
    <Card className="flex flex-col overflow-hidden rounded-2xl sm:rounded-3xl border shadow-sm transition-all duration-300 hover:shadow-xl hover:border-primary/20">
      <CardContent className="flex-1 p-5 sm:p-7 md:p-8">
        <div className="mb-5 flex items-start justify-between gap-3 sm:mb-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-300 sm:h-14 sm:w-14 sm:rounded-2xl">
            <Smartphone className="h-8 w-8" />
          </div>
          <span className="rounded-full border bg-muted px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground sm:px-3 sm:text-xs">
            Android · APK
          </span>
        </div>

        <h2 className="mb-2 text-xl font-bold text-foreground sm:text-2xl">Pilar Coletor</h2>
        <div className="mb-6 text-sm leading-relaxed text-muted-foreground sm:mb-8">
          Aplicativo Android nativo com <b>Automação</b> e <b>Relógio de Ponto</b>.
          Não inclui SMS nem recursos de câmera.
        </div>

        <div className="mb-6 flex items-center gap-3 rounded-xl border border-dashed p-4 text-xs text-muted-foreground sm:mb-8">
          <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          <span>
            <b className="text-foreground">Versão {hubVersion}</b> · chave multiempresa ·
            login nativo · painel definido para o usuário.
            {hubNotas && (
              <>
                <br />
                <span className="text-xs">{hubNotas}</span>
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
              {hubFileName}
            </span>
          </div>
          <Button
            disabled={indisponivel}
            onClick={() => baixar(hubFileName, hubUrl)}
            className="w-full flex-shrink-0 rounded-xl px-5 py-3 text-sm font-bold sm:w-auto sm:px-6 bg-blue-500 hover:bg-blue-400 text-white disabled:opacity-60"
          >
            <Download className="mr-2 h-4 w-4" />
            {indisponivel ? "Gerando pacote…" : "Baixar APK"}
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
              No Android, mantenha a versão anterior instalada para atualizar sem perder a configuração.
            </p>
          </li>
          <li className="flex gap-3 sm:gap-4">
            <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border bg-background text-xs font-bold text-foreground">2</span>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Baixe o <b>{hubFileName}</b> acima e toque no arquivo para instalar.
            </p>
          </li>
          <li className="flex gap-3 sm:gap-4">
            <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border bg-background text-xs font-bold text-foreground">3</span>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Abra o <b>Pilar Coletor</b>, informe a chave criada em Apps e entre com usuário e senha.
            </p>
          </li>
          <li className="flex gap-3 sm:gap-4">
            <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border bg-background text-xs font-bold text-foreground">4</span>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Use Automação para controlar o painel definido e Relógio de Ponto para registrar marcações.
            </p>
          </li>
        </ol>
      </div>
    </Card>
  );
}
