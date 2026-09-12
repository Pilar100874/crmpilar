import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Smartphone, ArrowRight } from "lucide-react";
import { TV_SIGNAGE_MANIFEST_URL } from "@/lib/tvSignageApkUrl";
import VersaoAppBadge from "@/components/apps/VersaoAppBadge";

export default function TvSignageApi() {
  return (
    <div className="space-y-4">
      <Card className="p-5 border-primary/40 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent">
        <div className="flex flex-col md:flex-row md:items-center gap-4 justify-between">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-primary/15 p-2.5">
              <Smartphone className="w-6 h-6 text-primary" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-semibold text-base">App Android TV / Google TV</h2>
                <VersaoAppBadge manifesto={TV_SIGNAGE_MANIFEST_URL} />
              </div>
              <p className="text-sm text-muted-foreground">
                O download do APK foi centralizado em <b>Admin → Apps</b>.
                Aparelhos com câmera (Google TV, tablets, celulares Android) podem parear apenas
                <b> lendo o QR Code</b> — sem digitar nada. Nas TVs sem câmera, digite o código exibido.
              </p>
              <p className="text-xs text-muted-foreground mt-1">Sempre a versão mais recente · Android 7.0+ (API 24) · com leitor de QR embutido</p>
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            <Button asChild size="lg" className="gap-2">
              <Link to="/admin/apps">
                Baixar APK em Admin → Apps <ArrowRight className="w-4 h-4" />
              </Link>
            </Button>
          </div>
        </div>
        <div className="mt-4 grid gap-2 text-xs text-muted-foreground">
          <div><b className="text-foreground">Como instalar:</b></div>
          <ol className="list-decimal list-inside space-y-1 pl-1">
            <li>Nas configurações da TV, habilite <b>Fontes desconhecidas</b> (Segurança / Aplicativos).</li>
            <li>Baixe o APK em <b>Admin → Apps</b> diretamente pelo navegador da TV, envie por pendrive USB ou use <code>adb install pareamento-pilar-remotas.apk</code>.</li>
            <li>Abra <b>Pilar Remotas</b> no launcher. <b>Se o aparelho tiver câmera</b>, toque em <b>📷 Ler QR Code</b> e aponte para o QR gerado em <b>Dispositivos → Novo</b> — o pareamento é automático. Caso contrário, digite o código de 8 caracteres.</li>
            <li>Pronto: a TV assume o dashboard/playlist configurado e recebe comandos remotos em tempo real.</li>
          </ol>
        </div>
      </Card>
    </div>
  );
}
