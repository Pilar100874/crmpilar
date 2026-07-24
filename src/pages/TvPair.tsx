import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { QRCodeCanvas } from "qrcode.react";
import { Download, Smartphone, QrCode as QrIcon, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { downloadApk } from "@/lib/downloadApk";
import { getLatestTvSignageApkUrl, TV_SIGNAGE_APK_FILENAME } from "@/lib/tvSignageApkUrl";

export default function TvPair() {
  const [params] = useSearchParams();
  const codigo = params.get("codigo") || "";
  const token = params.get("token") || "";
  const api_url = params.get("api") || window.location.origin;

  const isAndroid = useMemo(() => /android/i.test(navigator.userAgent), []);
  const payload = useMemo(
    () => JSON.stringify({ codigo, token, api_url }),
    [codigo, token, api_url],
  );

  const valid = codigo && token;

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-lg mx-auto space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex w-14 h-14 rounded-2xl bg-primary/10 items-center justify-center mx-auto">
            <Smartphone className="w-7 h-7 text-primary" />
          </div>
          <h1 className="text-2xl font-bold">Pareamento Pilar Remotas</h1>
          <p className="text-sm text-muted-foreground">
            Instale o aplicativo e finalize o pareamento em segundos.
          </p>
        </div>

        {!valid && (
          <Card className="border-destructive/40">
            <CardContent className="pt-6 text-sm text-destructive">
              QR inválido ou expirado. Gere um novo QR na tela de <b>Dispositivos</b>.
            </CardContent>
          </Card>
        )}

        {valid && (
          <>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <span className="inline-flex w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs items-center justify-center">1</span>
                  Baixe e instale o app
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button size="lg" className="w-full gap-2" onClick={() => downloadApk(APK_URL, APK_FILENAME)}>
                  <Download className="w-5 h-5" /> Baixar APK (27 MB)
                </Button>
                {!isAndroid && (
                  <p className="text-xs text-muted-foreground">
                    ⚠️ Você não está em um dispositivo Android. Baixe o APK e transfira para a TV/tablet Android.
                  </p>
                )}
                <ol className="text-xs text-muted-foreground space-y-1 list-decimal pl-4">
                  <li>Toque no arquivo baixado para instalar.</li>
                  <li>Se pedir, autorize <b>Instalar apps desconhecidos</b> nas configurações.</li>
                  <li>Abra o app <b>Pilar Remotas</b>.</li>
                </ol>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <span className="inline-flex w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs items-center justify-center">2</span>
                  Finalize o pareamento
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  No app, toque em <b>📷 Ler QR Code</b> e aponte para o QR abaixo — ou digite o código manualmente.
                </p>
                <div className="flex justify-center bg-white p-4 rounded-lg">
                  <QRCodeCanvas value={payload} size={220} />
                </div>
                <div className="space-y-1.5 text-sm">
                  <div>
                    <span className="text-muted-foreground">Código: </span>
                    <code className="bg-muted px-2 py-0.5 rounded">{codigo}</code>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Token: </span>
                    <code className="bg-muted px-2 py-0.5 rounded text-xs break-all">{token}</code>
                  </div>
                </div>
                <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/40 p-3 rounded-lg">
                  <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <span>Após o pareamento, o dispositivo passa a receber conteúdos e comandos automaticamente.</span>
                </div>
              </CardContent>
            </Card>
          </>
        )}

        <div className="text-center text-xs text-muted-foreground flex items-center justify-center gap-1">
          <QrIcon className="w-3 h-3" /> Pilar Remotas
        </div>
      </div>
    </div>
  );
}
