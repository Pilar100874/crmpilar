import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { 
  MapPin, 
  Navigation, 
  ArrowRight,
  Route,
  Truck
} from "lucide-react";

interface PedagioDetailsDialogProps {
  open: boolean;
  onClose: () => void;
  pedagioData: {
    ida: number;
    volta: number;
    total: number;
    distanciaIdaKm: number;
    distanciaVoltaKm: number;
    distanciaTotalKm: number;
    tempoIdaMin: number;
    tempoVoltaMin: number;
    tempoTotalMin: number;
    origemCep: string | null;
    destinoCep: string | null;
    origemEndereco?: string | null;
    destinoEndereco?: string | null;
    origemCoords: { lat: number; lng: number } | null;
    destinoCoords: { lat: number; lng: number } | null;
    rawResponse: any | null;
  };
}

export function PedagioDetailsDialog({ open, onClose, pedagioData }: PedagioDetailsDialogProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return hours > 0 ? `${hours}h ${mins}min` : `${mins}min`;
  };

  const formatCep = (cep: string | null) => {
    if (!cep) return 'N/A';
    return cep.replace(/(\d{5})(\d{3})/, '$1-$2');
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Navigation className="w-5 h-5 text-primary" />
            Detalhes do Pedágio
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(85vh-100px)]">
          <div className="space-y-6 pr-4">
            {/* CEPs e Coordenadas */}
            <div className="bg-muted/50 rounded-lg p-4">
              <h3 className="font-medium text-sm mb-3 flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                Trajeto
              </h3>
              <div className="flex items-center gap-4">
                <div className="flex-1 p-3 bg-background rounded-lg border">
                  <p className="text-xs text-muted-foreground mb-1">Origem</p>
                  <p className="font-medium">{formatCep(pedagioData.origemCep)}</p>
                  {pedagioData.origemEndereco && (
                    <p className="text-xs text-muted-foreground mt-1">{pedagioData.origemEndereco}</p>
                  )}
                  {pedagioData.origemCoords && (
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {pedagioData.origemCoords.lat.toFixed(4)}, {pedagioData.origemCoords.lng.toFixed(4)}
                    </p>
                  )}
                </div>
                <ArrowRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                <div className="flex-1 p-3 bg-background rounded-lg border">
                  <p className="text-xs text-muted-foreground mb-1">Destino</p>
                  <p className="font-medium">{formatCep(pedagioData.destinoCep)}</p>
                  {pedagioData.destinoEndereco && (
                    <p className="text-xs text-muted-foreground mt-1">{pedagioData.destinoEndereco}</p>
                  )}
                  {pedagioData.destinoCoords && (
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {pedagioData.destinoCoords.lat.toFixed(4)}, {pedagioData.destinoCoords.lng.toFixed(4)}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Resumo da Rota */}
            <div className="grid grid-cols-2 gap-4">
              {/* Ida */}
              <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                <h3 className="font-medium text-sm mb-3 flex items-center gap-2 text-blue-700 dark:text-blue-300">
                  <Route className="w-4 h-4" />
                  Ida
                </h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Distância</span>
                    <span className="font-medium">{pedagioData.distanciaIdaKm.toFixed(1)} km</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Tempo</span>
                    <span className="font-medium">{formatTime(pedagioData.tempoIdaMin)}</span>
                  </div>
                  <Separator className="my-2" />
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Pedágio</span>
                    <span className="font-semibold text-blue-700 dark:text-blue-300">
                      {formatCurrency(pedagioData.ida)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Volta */}
              <div className="bg-green-50 dark:bg-green-950/30 rounded-lg p-4 border border-green-200 dark:border-green-800">
                <h3 className="font-medium text-sm mb-3 flex items-center gap-2 text-green-700 dark:text-green-300">
                  <Route className="w-4 h-4 rotate-180" />
                  Volta
                </h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Distância</span>
                    <span className="font-medium">{pedagioData.distanciaVoltaKm.toFixed(1)} km</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Tempo</span>
                    <span className="font-medium">{formatTime(pedagioData.tempoVoltaMin)}</span>
                  </div>
                  <Separator className="my-2" />
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Pedágio</span>
                    <span className="font-semibold text-green-700 dark:text-green-300">
                      {formatCurrency(pedagioData.volta)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
