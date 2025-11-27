import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Navigation,
  Copy,
  Check,
  Map
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { toast } from "sonner";
import { RouteMapEmbed } from "./RouteMapEmbed";

interface RouteDataDialogProps {
  open: boolean;
  onClose: () => void;
  rawResponse: any;
  origemCoords: { lat: number; lng: number } | null;
  destinoCoords: { lat: number; lng: number } | null;
  origemEndereco?: string | null;
  destinoEndereco?: string | null;
}

export function RouteDataDialog({ 
  open, 
  onClose, 
  rawResponse, 
  origemCoords, 
  destinoCoords,
  origemEndereco,
  destinoEndereco
}: RouteDataDialogProps) {
  const [copied, setCopied] = useState(false);

  const getGoogleMapsUrl = () => {
    if (origemEndereco && destinoEndereco) {
      const origem = encodeURIComponent(`${origemEndereco}, Brasil`);
      const destino = encodeURIComponent(`${destinoEndereco}, Brasil`);
      return `https://www.google.com/maps/dir/${origem}/${destino}`;
    }
    if (origemCoords && destinoCoords) {
      return `https://www.google.com/maps/dir/${origemCoords.lat},${origemCoords.lng}/${destinoCoords.lat},${destinoCoords.lng}`;
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
            Dados da Rota
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="map" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="map" className="gap-1">
              <Map className="w-3 h-3" />
              Mapa
            </TabsTrigger>
            <TabsTrigger value="summary">Resumo</TabsTrigger>
          </TabsList>

          <TabsContent value="map" className="mt-4">
            <RouteMapEmbed
              origemCoords={origemCoords}
              destinoCoords={destinoCoords}
              origemEndereco={origemEndereco}
              destinoEndereco={destinoEndereco}
            />
          </TabsContent>

          <TabsContent value="summary" className="mt-4">
            <div className="space-y-4">
              {/* Ação de copiar link */}
              {googleMapsUrl && (
                <div className="flex flex-col gap-2">
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

              {/* Endereços */}
              {(origemEndereco || destinoEndereco) && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <h4 className="text-sm font-medium mb-2">Endereço de Origem</h4>
                    <p className="text-sm text-muted-foreground">
                      {origemEndereco || 'Não disponível'}
                    </p>
                  </div>
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <h4 className="text-sm font-medium mb-2">Endereço de Destino</h4>
                    <p className="text-sm text-muted-foreground">
                      {destinoEndereco || 'Não disponível'}
                    </p>
                  </div>
                </div>
              )}

              {/* Coordenadas */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-muted/50 rounded-lg">
                  <h4 className="text-sm font-medium mb-2">Coordenadas Origem</h4>
                  {origemCoords ? (
                    <div className="space-y-1 text-sm">
                      <p>Latitude: <Badge variant="outline">{origemCoords.lat.toFixed(6)}</Badge></p>
                      <p>Longitude: <Badge variant="outline">{origemCoords.lng.toFixed(6)}</Badge></p>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Não disponível</p>
                  )}
                </div>
                <div className="p-4 bg-muted/50 rounded-lg">
                  <h4 className="text-sm font-medium mb-2">Coordenadas Destino</h4>
                  {destinoCoords ? (
                    <div className="space-y-1 text-sm">
                      <p>Latitude: <Badge variant="outline">{destinoCoords.lat.toFixed(6)}</Badge></p>
                      <p>Longitude: <Badge variant="outline">{destinoCoords.lng.toFixed(6)}</Badge></p>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Não disponível</p>
                  )}
                </div>
              </div>

              {/* Métricas principais */}
              {rawResponse && (
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800 text-center">
                    <p className="text-xs text-muted-foreground mb-1">Distância Total</p>
                    <p className="text-xl font-bold text-blue-700 dark:text-blue-300">
                      {rawResponse.distanciaTotalKm?.toFixed(1) || 0} km
                    </p>
                  </div>
                  <div className="p-4 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-800 text-center">
                    <p className="text-xs text-muted-foreground mb-1">Tempo Total</p>
                    <p className="text-xl font-bold text-green-700 dark:text-green-300">
                      {rawResponse.tempoTotalMin ? 
                        `${Math.floor(rawResponse.tempoTotalMin / 60)}h ${Math.round(rawResponse.tempoTotalMin % 60)}min` : 
                        '0min'}
                    </p>
                  </div>
                  <div className="p-4 bg-primary/10 rounded-lg border border-primary/20 text-center">
                    <p className="text-xs text-muted-foreground mb-1">Pedágio Total</p>
                    <p className="text-xl font-bold text-primary">
                      {new Intl.NumberFormat('pt-BR', {
                        style: 'currency',
                        currency: 'BRL'
                      }).format(rawResponse.total || 0)}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
