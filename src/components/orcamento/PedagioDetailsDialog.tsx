import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { 
  MapPin, 
  Navigation, 
  ArrowRight,
  Route,
  Map,
  Copy,
  Check,
  Info,
  Tag,
  CheckCircle2
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { RouteMapEmbed } from "./RouteMapEmbed";

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
  regrasAplicadas?: Array<{ nome: string; detalhes: string; desconto?: number; percentual?: number }>;
  defaultTab?: string;
}

export function PedagioDetailsDialog({ open, onClose, pedagioData, regrasAplicadas = [], defaultTab = "map" }: PedagioDetailsDialogProps) {
  const [copied, setCopied] = useState(false);

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

  const getGoogleMapsUrl = () => {
    if (pedagioData.origemEndereco && pedagioData.destinoEndereco) {
      const origem = encodeURIComponent(`${pedagioData.origemEndereco}, Brasil`);
      const destino = encodeURIComponent(`${pedagioData.destinoEndereco}, Brasil`);
      return `https://www.google.com/maps/dir/${origem}/${destino}`;
    }
    if (pedagioData.origemCoords && pedagioData.destinoCoords) {
      return `https://www.google.com/maps/dir/${pedagioData.origemCoords.lat},${pedagioData.origemCoords.lng}/${pedagioData.destinoCoords.lat},${pedagioData.destinoCoords.lng}`;
    }
    return null;
  };

  const googleMapsUrl = getGoogleMapsUrl();

  const copyToClipboard = async () => {
    if (googleMapsUrl) {
      try {
        await navigator.clipboard.writeText(googleMapsUrl);
        setCopied(true);
        toast.success("Link copiado! Cole em uma nova aba do navegador.");
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        toast.error("Erro ao copiar link");
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-3xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Navigation className="w-5 h-5 text-primary" />
            Detalhes da Rota e Pedágio
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue={defaultTab} className="w-full">
          <TabsList className={`grid w-full ${regrasAplicadas.length > 0 ? 'grid-cols-3' : 'grid-cols-2'}`}>
            <TabsTrigger value="map" className="gap-1">
              <Map className="w-3 h-3" />
              Mapa
            </TabsTrigger>
            <TabsTrigger value="details" className="gap-1">
              <Info className="w-3 h-3" />
              Detalhes
            </TabsTrigger>
            {regrasAplicadas.length > 0 && (
              <TabsTrigger value="regras" className="gap-1">
                <Tag className="w-3 h-3" />
                Regras ({regrasAplicadas.length})
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="map" className="mt-4">
            <RouteMapEmbed
              origemCoords={pedagioData.origemCoords}
              destinoCoords={pedagioData.destinoCoords}
              origemEndereco={pedagioData.origemEndereco}
              destinoEndereco={pedagioData.destinoEndereco}
              origemCep={pedagioData.origemCep}
              destinoCep={pedagioData.destinoCep}
            />
            {googleMapsUrl && (
              <div className="flex flex-col gap-2 mt-4">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={copyToClipboard}
                  className="gap-2 w-fit"
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {copied ? "Copiado!" : "Copiar Link do Google Maps"}
                </Button>
                <p className="text-xs text-muted-foreground">
                  Cole o link em uma nova aba do navegador para ver no Google Maps.
                </p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="details" className="mt-4">
            <ScrollArea className="max-h-[calc(85vh-200px)]">
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
          </TabsContent>

          {regrasAplicadas.length > 0 && (
            <TabsContent value="regras" className="mt-4">
              <ScrollArea className="max-h-[calc(85vh-200px)]">
                <div className="space-y-3 pr-4">
                  <h3 className="text-sm font-semibold text-foreground mb-3">
                    Regras Aplicadas ({regrasAplicadas.length})
                  </h3>
                  {regrasAplicadas.map((regra, index) => (
                    <Card key={index} className="p-3 border-border hover:border-primary/50 transition-colors">
                      <div className="flex items-start gap-3">
                        <div className="p-1.5 rounded-full bg-green-500/10">
                          <CheckCircle2 className="w-4 h-4 text-green-600" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-foreground">{regra.nome}</p>
                          <p className="text-xs text-muted-foreground mt-1">{regra.detalhes}</p>
                          {regra.desconto !== undefined && regra.desconto > 0 && (
                            <p className="text-xs text-green-600 mt-1">
                              Desconto: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(regra.desconto)}
                              {regra.percentual ? ` (${regra.percentual}%)` : ''}
                            </p>
                          )}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>
          )}
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
