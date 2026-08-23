import { PhoneCall, PhoneOff, MicOff, Video, DoorOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

/**
 * Tela de interfone (SIP/WebRTC do iDFace Max).
 * A integração exige servidor SIP/WebRTC intermediário — a interface já está pronta
 * para receber o fluxo quando o IntercomService for conectado.
 */
export default function PortariaInterfone() {
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <h2 className="text-xl font-bold">Interfone</h2>
        <Badge variant="secondary">Integração pendente</Badge>
      </div>
      <p className="text-sm text-muted-foreground">
        O iDFace Max possui SIP. A chamada de vídeo será entregue via servidor SIP/WebRTC.
        Enquanto a infraestrutura não é conectada, esta tela permanece em modo demonstração.
      </p>

      <div className="rounded-xl border bg-card overflow-hidden max-w-2xl">
        <div className="aspect-video bg-muted flex flex-col items-center justify-center gap-2 text-muted-foreground">
          <Video className="h-10 w-10" />
          <p className="text-sm">Sem chamada ativa</p>
        </div>
        <div className="p-4 grid grid-cols-2 sm:grid-cols-3 gap-2">
          <Button disabled className="h-12"><PhoneCall className="h-4 w-4 mr-2" />Atender</Button>
          <Button disabled variant="destructive" className="h-12"><PhoneOff className="h-4 w-4 mr-2" />Rejeitar</Button>
          <Button disabled variant="outline" className="h-12"><MicOff className="h-4 w-4 mr-2" />Silenciar</Button>
          <Button disabled variant="secondary" className="h-12"><DoorOpen className="h-4 w-4 mr-2" />Abrir porta</Button>
          <Button disabled variant="secondary" className="h-12"><DoorOpen className="h-4 w-4 mr-2" />Abrir portão</Button>
          <Button disabled variant="outline" className="h-12"><PhoneOff className="h-4 w-4 mr-2" />Encerrar</Button>
        </div>
      </div>
    </div>
  );
}
