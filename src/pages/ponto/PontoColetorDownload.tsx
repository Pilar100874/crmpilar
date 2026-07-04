import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AppWindow, ArrowRight, Camera, Clock, Smartphone } from "lucide-react";

export default function PontoColetorDownload() {
  return (
    <div className="space-y-4 max-w-3xl mx-auto">
      <div>
        <h2 className="text-xl font-semibold sm:text-2xl">Coletor Desktop & Apps</h2>
        <p className="text-sm text-muted-foreground">
          Os downloads dos aplicativos auxiliares foram centralizados no menu
          <b> Admin → Apps</b>.
        </p>
      </div>

      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="space-y-4 p-5">
          <div className="flex items-center gap-2">
            <AppWindow className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Central de Apps do CRM Pilar</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            Baixe e configure em um único lugar:
          </p>
          <ul className="space-y-2 text-sm">
            <li className="flex items-start gap-2">
              <Clock className="mt-0.5 h-4 w-4 text-primary" />
              <span><b>Sistema de Coleta do Ponto</b> — coleta batidas TCP/IP dos relógios REP (Windows · macOS · Linux).</span>
            </li>
            <li className="flex items-start gap-2">
              <Camera className="mt-0.5 h-4 w-4 text-primary" />
              <span><b>Coletor Desktop (Câmeras)</b> — snapshots das câmeras IP para Controle de Veículos.</span>
            </li>
            <li className="flex items-start gap-2">
              <Smartphone className="mt-0.5 h-4 w-4 text-primary" />
              <span><b>Pilar SMS (APK)</b> — envio de SMS pelo chip do celular Android.</span>
            </li>
          </ul>
          <Button asChild size="lg" className="w-full sm:w-auto">
            <Link to="/admin/apps">
              Ir para Admin → Apps <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-2 p-5 text-sm text-muted-foreground">
          <p className="font-medium text-foreground">Por que ficou lá?</p>
          <p>
            Reunimos todos os instaladores auxiliares em uma única tela para facilitar a atualização
            e evitar versões duplicadas. Além do download, a página <b>Admin → Apps</b> traz o passo a passo
            de instalação e os dados de conexão prontos para copiar.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
