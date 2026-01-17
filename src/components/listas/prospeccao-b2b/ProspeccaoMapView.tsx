import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Search, 
  Pencil, 
  Trash2, 
  X, 
  Undo2, 
  Check, 
  Building2,
  AlertTriangle,
  Loader2,
  Settings
} from 'lucide-react';
import { ProspectB2B, PolygonPoint, ConfigB2B } from './types';
import { useToast } from '@/hooks/use-toast';

// Fix Leaflet icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface ProspeccaoMapViewProps {
  prospects: ProspectB2B[];
  config: ConfigB2B | null;
  searching: boolean;
  searchProgress: number;
  searchPlaces: (keyword: string, polygon: PolygonPoint[]) => Promise<void>;
  getGastosInfo: () => { custoMensal: number; limiteAtingido: boolean };
}

const ProspeccaoMapView: React.FC<ProspeccaoMapViewProps> = ({
  prospects,
  config,
  searching,
  searchProgress,
  searchPlaces,
  getGastosInfo
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const polygonLayerRef = useRef<L.Polygon | null>(null);
  const drawingLayerRef = useRef<L.LayerGroup | null>(null);
  
  const [keyword, setKeyword] = useState('');
  const [isDrawing, setIsDrawing] = useState(false);
  const [polygonPoints, setPolygonPoints] = useState<PolygonPoint[]>([]);
  const [mapReady, setMapReady] = useState(false);
  const { toast } = useToast();

  const gastosInfo = getGastosInfo();

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current).setView([-15.7801, -47.9292], 4);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap'
    }).addTo(map);

    markersLayerRef.current = L.layerGroup().addTo(map);
    drawingLayerRef.current = L.layerGroup().addTo(map);

    mapRef.current = map;
    setMapReady(true);

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Handle map click for polygon drawing
  useEffect(() => {
    if (!mapRef.current || !mapReady) return;

    const handleClick = (e: L.LeafletMouseEvent) => {
      if (!isDrawing) return;

      const newPoint: PolygonPoint = { lat: e.latlng.lat, lng: e.latlng.lng };
      setPolygonPoints(prev => [...prev, newPoint]);
    };

    mapRef.current.on('click', handleClick);

    return () => {
      mapRef.current?.off('click', handleClick);
    };
  }, [isDrawing, mapReady]);

  // Update polygon visualization
  useEffect(() => {
    if (!drawingLayerRef.current || !mapReady) return;
    drawingLayerRef.current.clearLayers();

    if (polygonPoints.length > 0) {
      // Draw points
      polygonPoints.forEach((point, index) => {
        L.circleMarker([point.lat, point.lng], {
          radius: 6,
          color: '#3b82f6',
          fillColor: '#3b82f6',
          fillOpacity: 1
        })
          .bindTooltip(`Ponto ${index + 1}`)
          .addTo(drawingLayerRef.current!);
      });

      // Draw lines
      if (polygonPoints.length > 1) {
        const latLngs = polygonPoints.map(p => [p.lat, p.lng] as [number, number]);
        L.polyline(latLngs, {
          color: '#3b82f6',
          weight: 2,
          dashArray: '5, 5'
        }).addTo(drawingLayerRef.current!);
      }

      // Draw filled polygon if closed
      if (polygonPoints.length >= 3 && !isDrawing) {
        const latLngs = polygonPoints.map(p => [p.lat, p.lng] as [number, number]);
        polygonLayerRef.current = L.polygon(latLngs, {
          color: '#3b82f6',
          fillColor: '#3b82f6',
          fillOpacity: 0.2
        }).addTo(drawingLayerRef.current!);
      }
    }
  }, [polygonPoints, isDrawing, mapReady]);

  // Update prospect markers
  useEffect(() => {
    if (!markersLayerRef.current || !mapReady) return;
    markersLayerRef.current.clearLayers();

    prospects.forEach(prospect => {
      if (!prospect.latitude || !prospect.longitude) return;

      const statusColors: Record<string, string> = {
        novo: '#22c55e',
        contatado: '#3b82f6',
        qualificado: '#a855f7',
        nao_interessado: '#6b7280',
        cliente: '#f59e0b'
      };

      const color = statusColors[prospect.status_lead || 'novo'] || '#22c55e';

      const customIcon = L.divIcon({
        className: 'custom-marker',
        html: `<div style="background: ${color}; width: 28px; height: 28px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center;">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
            <path d="M3 21h18M5 21V7l8-4 8 4v14M9 21v-6h6v6"/>
          </svg>
        </div>`,
        iconSize: [28, 28],
        iconAnchor: [14, 14]
      });

      L.marker([prospect.latitude, prospect.longitude], { icon: customIcon })
        .addTo(markersLayerRef.current!)
        .bindPopup(`
          <div class="p-2 min-w-[200px]">
            <strong class="text-base">${prospect.nome}</strong>
            ${prospect.categoria ? `<br/><span class="text-xs text-gray-500">${prospect.categoria}</span>` : ''}
            ${prospect.endereco_completo ? `<br/><small>${prospect.endereco_completo}</small>` : ''}
            ${prospect.rating ? `<br/><span class="text-sm">⭐ ${prospect.rating} (${prospect.total_avaliacoes || 0} avaliações)</span>` : ''}
            ${prospect.telefone ? `<br/><a href="tel:${prospect.telefone}" class="text-blue-600">${prospect.telefone}</a>` : ''}
            ${prospect.website ? `<br/><a href="${prospect.website}" target="_blank" class="text-blue-600 text-xs">Visitar site</a>` : ''}
          </div>
        `);
    });
  }, [prospects, mapReady]);

  const startDrawing = () => {
    setIsDrawing(true);
    setPolygonPoints([]);
    toast({ title: 'Modo desenho', description: 'Clique no mapa para adicionar pontos' });
  };

  const cancelDrawing = () => {
    setIsDrawing(false);
    setPolygonPoints([]);
  };

  const undoLastPoint = () => {
    setPolygonPoints(prev => prev.slice(0, -1));
  };

  const finishDrawing = () => {
    if (polygonPoints.length < 3) {
      toast({ 
        title: 'Área inválida', 
        description: 'Desenhe pelo menos 3 pontos', 
        variant: 'destructive' 
      });
      return;
    }
    setIsDrawing(false);
  };

  const clearPolygon = () => {
    setPolygonPoints([]);
    if (drawingLayerRef.current) {
      drawingLayerRef.current.clearLayers();
    }
  };

  const handleSearch = async () => {
    if (gastosInfo.limiteAtingido) {
      toast({ 
        title: 'Limite de custo atingido', 
        description: 'Você atingiu o limite de custo mensal configurado', 
        variant: 'destructive' 
      });
      return;
    }
    await searchPlaces(keyword, polygonPoints);
  };

  const cfg = config as any;
  const hasApiKey = !!cfg?.google_places_api_key;

  return (
    <div className="space-y-4">
      {/* Alerts */}
      {!hasApiKey && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>Configure sua API Key do Google Places na aba "Parâmetros" para começar.</span>
            <Settings className="h-4 w-4" />
          </AlertDescription>
        </Alert>
      )}

      {gastosInfo.limiteAtingido && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Limite de custo mensal atingido! Aumente o limite nos parâmetros para continuar.
          </AlertDescription>
        </Alert>
      )}

      {/* Search Controls */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Keyword Input */}
            <div className="flex-1">
              <Input
                placeholder="Palavra-chave (ex: papelaria, gráfica, embalagem)"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                disabled={searching || !hasApiKey}
              />
            </div>

            {/* Drawing Controls */}
            <div className="flex gap-2 flex-wrap">
              {!isDrawing && polygonPoints.length === 0 && (
                <Button
                  variant="outline"
                  onClick={startDrawing}
                  disabled={searching || !hasApiKey}
                >
                  <Pencil className="h-4 w-4 mr-2" />
                  Desenhar Área
                </Button>
              )}

              {isDrawing && (
                <>
                  <Button variant="outline" onClick={undoLastPoint} disabled={polygonPoints.length === 0}>
                    <Undo2 className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" onClick={cancelDrawing}>
                    <X className="h-4 w-4" />
                  </Button>
                  <Button onClick={finishDrawing} disabled={polygonPoints.length < 3}>
                    <Check className="h-4 w-4 mr-2" />
                    Finalizar ({polygonPoints.length} pts)
                  </Button>
                </>
              )}

              {!isDrawing && polygonPoints.length >= 3 && (
                <>
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <Check className="h-3 w-3" />
                    Área definida
                  </Badge>
                  <Button variant="ghost" size="sm" onClick={clearPolygon}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </>
              )}
            </div>

            {/* Search Button */}
            <Button
              onClick={handleSearch}
              disabled={searching || !keyword || polygonPoints.length < 3 || !hasApiKey || gastosInfo.limiteAtingido}
            >
              {searching ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Search className="h-4 w-4 mr-2" />
              )}
              Buscar Empresas
            </Button>
          </div>

          {/* Progress Bar */}
          {searching && (
            <div className="mt-4">
              <div className="flex items-center justify-between text-sm text-muted-foreground mb-1">
                <span>Buscando empresas...</span>
                <span>{searchProgress}%</span>
              </div>
              <Progress value={searchProgress} />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="flex gap-2 flex-wrap">
        <Badge variant="outline" className="flex items-center gap-1">
          <Building2 className="h-3 w-3" />
          {prospects.length} prospects
        </Badge>
        <Badge variant="outline">
          Custo mensal: ${gastosInfo.custoMensal.toFixed(2)}
        </Badge>
      </div>

      {/* Map */}
      <Card>
        <CardContent className="p-0 relative">
          <div
            ref={mapContainerRef}
            className="w-full h-[500px] sm:h-[600px] rounded-lg"
            style={{ zIndex: 0 }}
          />
          {isDrawing && (
            <div className="absolute top-4 left-4 bg-background/90 backdrop-blur p-3 rounded-lg shadow-lg z-10">
              <p className="text-sm font-medium">Modo de desenho ativo</p>
              <p className="text-xs text-muted-foreground">Clique no mapa para adicionar pontos</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Legend */}
      <Card>
        <CardContent className="p-3">
          <div className="flex flex-wrap gap-4 text-sm">
            <span className="font-medium">Status:</span>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <span>Novo</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-blue-500" />
              <span>Contatado</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-purple-500" />
              <span>Qualificado</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-gray-500" />
              <span>Não interessado</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-amber-500" />
              <span>Cliente</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProspeccaoMapView;
