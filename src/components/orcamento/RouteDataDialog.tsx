import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Code, 
  MapPin, 
  Navigation,
  ExternalLink
} from "lucide-react";
import { Button } from "@/components/ui/button";

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
  const getGoogleMapsUrl = () => {
    if (origemCoords && destinoCoords) {
      return `https://www.google.com/maps/dir/?api=1&origin=${origemCoords.lat},${origemCoords.lng}&destination=${destinoCoords.lat},${destinoCoords.lng}&travelmode=driving`;
    }
    return null;
  };

  const googleMapsUrl = getGoogleMapsUrl();

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-3xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Navigation className="w-5 h-5 text-primary" />
            Dados da Rota - TollGuru
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="summary" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="summary">Resumo</TabsTrigger>
            <TabsTrigger value="coordinates">Coordenadas</TabsTrigger>
            <TabsTrigger value="raw">Dados Brutos</TabsTrigger>
          </TabsList>

          <TabsContent value="summary" className="mt-4">
            <div className="space-y-4">
              {/* Ações rápidas */}
              <div className="flex gap-2">
                {googleMapsUrl ? (
                  <a 
                    href={googleMapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-3"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Abrir no Google Maps
                  </a>
                ) : (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    disabled
                    className="gap-2"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Abrir no Google Maps
                  </Button>
                )}
              </div>

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

              {/* Dados resumidos */}
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

          <TabsContent value="coordinates" className="mt-4">
            <div className="space-y-4">
              <div className="p-4 bg-muted/50 rounded-lg">
                <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Coordenadas de Origem
                </h4>
                {origemCoords ? (
                  <div className="font-mono text-sm bg-background p-3 rounded border">
                    {JSON.stringify(origemCoords, null, 2)}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Não disponível</p>
                )}
              </div>

              <div className="p-4 bg-muted/50 rounded-lg">
                <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Coordenadas de Destino
                </h4>
                {destinoCoords ? (
                  <div className="font-mono text-sm bg-background p-3 rounded border">
                    {JSON.stringify(destinoCoords, null, 2)}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Não disponível</p>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="raw" className="mt-4">
            <ScrollArea className="h-[400px]">
              <div className="p-4 bg-muted/50 rounded-lg">
                <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                  <Code className="w-4 h-4" />
                  Resposta da API TollGuru
                </h4>
                {rawResponse ? (
                  <pre className="font-mono text-xs bg-background p-4 rounded border overflow-auto whitespace-pre-wrap">
                    {JSON.stringify(rawResponse, null, 2)}
                  </pre>
                ) : (
                  <p className="text-sm text-muted-foreground">Nenhum dado disponível</p>
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
