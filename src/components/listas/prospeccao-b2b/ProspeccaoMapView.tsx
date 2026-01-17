import React, { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
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
  Settings,
  MapPin,
  Globe
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

// Estados do Brasil
const ESTADOS_BRASIL = [
  { uf: 'AC', nome: 'Acre' },
  { uf: 'AL', nome: 'Alagoas' },
  { uf: 'AP', nome: 'Amapá' },
  { uf: 'AM', nome: 'Amazonas' },
  { uf: 'BA', nome: 'Bahia' },
  { uf: 'CE', nome: 'Ceará' },
  { uf: 'DF', nome: 'Distrito Federal' },
  { uf: 'ES', nome: 'Espírito Santo' },
  { uf: 'GO', nome: 'Goiás' },
  { uf: 'MA', nome: 'Maranhão' },
  { uf: 'MT', nome: 'Mato Grosso' },
  { uf: 'MS', nome: 'Mato Grosso do Sul' },
  { uf: 'MG', nome: 'Minas Gerais' },
  { uf: 'PA', nome: 'Pará' },
  { uf: 'PB', nome: 'Paraíba' },
  { uf: 'PR', nome: 'Paraná' },
  { uf: 'PE', nome: 'Pernambuco' },
  { uf: 'PI', nome: 'Piauí' },
  { uf: 'RJ', nome: 'Rio de Janeiro' },
  { uf: 'RN', nome: 'Rio Grande do Norte' },
  { uf: 'RS', nome: 'Rio Grande do Sul' },
  { uf: 'RO', nome: 'Rondônia' },
  { uf: 'RR', nome: 'Roraima' },
  { uf: 'SC', nome: 'Santa Catarina' },
  { uf: 'SP', nome: 'São Paulo' },
  { uf: 'SE', nome: 'Sergipe' },
  { uf: 'TO', nome: 'Tocantins' }
];

interface Municipio {
  id: number;
  nome: string;
}

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
  const drawingLayerRef = useRef<L.LayerGroup | null>(null);
  
  const [keyword, setKeyword] = useState('');
  const [searchMode, setSearchMode] = useState<'area' | 'cidade'>('cidade');
  const [isDrawing, setIsDrawing] = useState(false);
  const [polygonPoints, setPolygonPoints] = useState<PolygonPoint[]>([]);
  const [mapReady, setMapReady] = useState(false);
  
  // Estados para busca por cidade
  const [selectedUF, setSelectedUF] = useState<string>('');
  const [municipios, setMunicipios] = useState<Municipio[]>([]);
  const [selectedMunicipios, setSelectedMunicipios] = useState<string[]>([]);
  const [loadingMunicipios, setLoadingMunicipios] = useState(false);
  const [municipioFilter, setMunicipioFilter] = useState('');
  
  const { toast } = useToast();
  const gastosInfo = getGastosInfo();

  // Carregar municípios quando selecionar UF
  useEffect(() => {
    if (!selectedUF) {
      setMunicipios([]);
      setSelectedMunicipios([]);
      return;
    }

    const loadMunicipios = async () => {
      setLoadingMunicipios(true);
      try {
        const response = await fetch(
          `https://servicodados.ibge.gov.br/api/v1/localidades/estados/${selectedUF}/municipios?orderBy=nome`
        );
        const data = await response.json();
        setMunicipios(data.map((m: any) => ({ id: m.id, nome: m.nome })));
      } catch (error) {
        console.error('Erro ao carregar municípios:', error);
        toast({ title: 'Erro', description: 'Falha ao carregar municípios', variant: 'destructive' });
      } finally {
        setLoadingMunicipios(false);
      }
    };

    loadMunicipios();
  }, [selectedUF, toast]);

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [-15.7801, -47.9292],
      zoom: 4,
      zoomControl: true
    });
    
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
  const handleMapClick = useCallback((e: L.LeafletMouseEvent) => {
    if (!isDrawing) return;
    const newPoint: PolygonPoint = { lat: e.latlng.lat, lng: e.latlng.lng };
    setPolygonPoints(prev => [...prev, newPoint]);
  }, [isDrawing]);

  useEffect(() => {
    if (!mapRef.current || !mapReady) return;

    mapRef.current.on('click', handleMapClick);

    return () => {
      mapRef.current?.off('click', handleMapClick);
    };
  }, [handleMapClick, mapReady]);

  // Update polygon visualization
  useEffect(() => {
    if (!drawingLayerRef.current || !mapReady) return;
    drawingLayerRef.current.clearLayers();

    if (polygonPoints.length > 0) {
      // Draw points
      polygonPoints.forEach((point, index) => {
        L.circleMarker([point.lat, point.lng], {
          radius: 8,
          color: '#3b82f6',
          fillColor: '#3b82f6',
          fillOpacity: 1,
          weight: 2
        })
          .bindTooltip(`Ponto ${index + 1}`, { permanent: false })
          .addTo(drawingLayerRef.current!);
      });

      // Draw lines connecting points
      if (polygonPoints.length > 1) {
        const latLngs = polygonPoints.map(p => [p.lat, p.lng] as [number, number]);
        L.polyline(latLngs, {
          color: '#3b82f6',
          weight: 3,
          dashArray: '8, 8'
        }).addTo(drawingLayerRef.current!);
      }

      // Draw filled polygon when finished
      if (polygonPoints.length >= 3 && !isDrawing) {
        const latLngs = polygonPoints.map(p => [p.lat, p.lng] as [number, number]);
        L.polygon(latLngs, {
          color: '#3b82f6',
          fillColor: '#3b82f6',
          fillOpacity: 0.2,
          weight: 3
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
    if (mapRef.current) {
      mapRef.current.getContainer().style.cursor = 'crosshair';
    }
    toast({ title: 'Modo desenho ativado', description: 'Clique no mapa para adicionar pontos da área' });
  };

  const cancelDrawing = () => {
    setIsDrawing(false);
    setPolygonPoints([]);
    if (mapRef.current) {
      mapRef.current.getContainer().style.cursor = '';
    }
  };

  const undoLastPoint = () => {
    setPolygonPoints(prev => prev.slice(0, -1));
  };

  const finishDrawing = () => {
    if (polygonPoints.length < 3) {
      toast({ 
        title: 'Área inválida', 
        description: 'Desenhe pelo menos 3 pontos para formar uma área', 
        variant: 'destructive' 
      });
      return;
    }
    setIsDrawing(false);
    if (mapRef.current) {
      mapRef.current.getContainer().style.cursor = '';
    }
    toast({ title: 'Área definida', description: `Polígono com ${polygonPoints.length} pontos criado` });
  };

  const clearPolygon = () => {
    setPolygonPoints([]);
    if (drawingLayerRef.current) {
      drawingLayerRef.current.clearLayers();
    }
  };

  // Geocodificar cidade para obter coordenadas
  const geocodeCidade = async (cidade: string, uf: string): Promise<PolygonPoint[] | null> => {
    try {
      const query = encodeURIComponent(`${cidade}, ${uf}, Brasil`);
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${query}&format=json&limit=1&polygon_geojson=1`
      );
      const data = await response.json();
      
      if (data.length === 0) return null;
      
      const result = data[0];
      
      // Se tem polígono, usar os pontos do polígono
      if (result.geojson && result.geojson.type === 'Polygon') {
        const coords = result.geojson.coordinates[0];
        return coords.slice(0, -1).map((c: number[]) => ({ lat: c[1], lng: c[0] }));
      }
      
      // Senão, criar um bounding box baseado nos limites
      if (result.boundingbox) {
        const [south, north, west, east] = result.boundingbox.map(Number);
        return [
          { lat: north, lng: west },
          { lat: north, lng: east },
          { lat: south, lng: east },
          { lat: south, lng: west }
        ];
      }
      
      // Fallback: criar círculo ao redor do ponto central
      const lat = parseFloat(result.lat);
      const lng = parseFloat(result.lon);
      const offset = 0.1; // ~10km
      return [
        { lat: lat + offset, lng: lng - offset },
        { lat: lat + offset, lng: lng + offset },
        { lat: lat - offset, lng: lng + offset },
        { lat: lat - offset, lng: lng - offset }
      ];
    } catch (error) {
      console.error('Erro ao geocodificar:', error);
      return null;
    }
  };

  const handleSearchByArea = async () => {
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

  const handleSearchByCidade = async () => {
    if (gastosInfo.limiteAtingido) {
      toast({ 
        title: 'Limite de custo atingido', 
        description: 'Você atingiu o limite de custo mensal configurado', 
        variant: 'destructive' 
      });
      return;
    }

    if (!keyword || selectedMunicipios.length === 0) {
      toast({ 
        title: 'Dados incompletos', 
        description: 'Informe a palavra-chave e selecione pelo menos um município', 
        variant: 'destructive' 
      });
      return;
    }

    // Buscar cada município
    for (let i = 0; i < selectedMunicipios.length; i++) {
      const municipioNome = selectedMunicipios[i];
      toast({ 
        title: `Buscando ${i + 1}/${selectedMunicipios.length}`, 
        description: `Processando: ${municipioNome}` 
      });

      const polygon = await geocodeCidade(municipioNome, selectedUF);
      if (polygon && polygon.length >= 3) {
        await searchPlaces(keyword, polygon);
      } else {
        console.warn(`Não foi possível geocodificar: ${municipioNome}`);
      }
    }
  };

  const toggleMunicipio = (nome: string) => {
    setSelectedMunicipios(prev => 
      prev.includes(nome) 
        ? prev.filter(m => m !== nome)
        : [...prev, nome]
    );
  };

  const selectAllMunicipios = () => {
    const filtered = municipios.filter(m => 
      m.nome.toLowerCase().includes(municipioFilter.toLowerCase())
    );
    setSelectedMunicipios(filtered.map(m => m.nome));
  };

  const clearMunicipios = () => {
    setSelectedMunicipios([]);
  };

  const filteredMunicipios = municipios.filter(m => 
    m.nome.toLowerCase().includes(municipioFilter.toLowerCase())
  );

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
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Configurar Busca</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Keyword Input */}
          <div>
            <label className="text-sm font-medium mb-1 block">Palavra-chave</label>
            <Input
              placeholder="Ex: papelaria, gráfica, embalagem, restaurante..."
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              disabled={searching || !hasApiKey}
            />
          </div>

          {/* Search Mode Tabs */}
          <Tabs value={searchMode} onValueChange={(v) => setSearchMode(v as 'area' | 'cidade')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="cidade" className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Por Cidade
              </TabsTrigger>
              <TabsTrigger value="area" className="flex items-center gap-2">
                <Globe className="h-4 w-4" />
                Por Área
              </TabsTrigger>
            </TabsList>

            {/* Busca por Cidade */}
            <TabsContent value="cidade" className="space-y-4 mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Seleção de UF */}
                <div>
                  <label className="text-sm font-medium mb-1 block">Estado (UF)</label>
                  <select
                    value={selectedUF}
                    onChange={(e) => setSelectedUF(e.target.value)}
                    className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                    disabled={searching || !hasApiKey}
                  >
                    <option value="">Selecione o estado</option>
                    {ESTADOS_BRASIL.map(estado => (
                      <option key={estado.uf} value={estado.uf}>
                        {estado.uf} - {estado.nome}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Filtro de municípios */}
                {selectedUF && (
                  <div>
                    <label className="text-sm font-medium mb-1 block">Filtrar municípios</label>
                    <Input
                      placeholder="Digite para filtrar..."
                      value={municipioFilter}
                      onChange={(e) => setMunicipioFilter(e.target.value)}
                      disabled={searching || loadingMunicipios}
                    />
                  </div>
                )}
              </div>

              {/* Lista de municípios */}
              {selectedUF && (
                <div className="border rounded-lg">
                  <div className="p-2 border-b bg-muted/50 flex items-center justify-between">
                    <span className="text-sm font-medium">
                      {loadingMunicipios ? 'Carregando...' : `${filteredMunicipios.length} municípios`}
                    </span>
                    <div className="flex gap-2">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={selectAllMunicipios}
                        disabled={searching || loadingMunicipios}
                      >
                        Selecionar todos
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={clearMunicipios}
                        disabled={searching}
                      >
                        Limpar
                      </Button>
                    </div>
                  </div>
                  
                  {loadingMunicipios ? (
                    <div className="p-4 text-center">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                    </div>
                  ) : (
                    <ScrollArea className="h-[200px]">
                      <div className="p-2 space-y-1">
                        {filteredMunicipios.map(municipio => (
                          <label 
                            key={municipio.id} 
                            className="flex items-center gap-2 p-2 hover:bg-muted rounded cursor-pointer"
                          >
                            <Checkbox
                              checked={selectedMunicipios.includes(municipio.nome)}
                              onCheckedChange={() => toggleMunicipio(municipio.nome)}
                              disabled={searching}
                            />
                            <span className="text-sm">{municipio.nome}</span>
                          </label>
                        ))}
                      </div>
                    </ScrollArea>
                  )}

                  {selectedMunicipios.length > 0 && (
                    <div className="p-2 border-t bg-muted/50">
                      <Badge variant="secondary">
                        {selectedMunicipios.length} município(s) selecionado(s)
                      </Badge>
                    </div>
                  )}
                </div>
              )}

              {/* Botão de busca por cidade */}
              <Button
                onClick={handleSearchByCidade}
                disabled={searching || !keyword || selectedMunicipios.length === 0 || !hasApiKey || gastosInfo.limiteAtingido}
                className="w-full"
              >
                {searching ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Search className="h-4 w-4 mr-2" />
                )}
                Buscar em {selectedMunicipios.length} município(s)
              </Button>
            </TabsContent>

            {/* Busca por Área */}
            <TabsContent value="area" className="space-y-4 mt-4">
              <div className="flex gap-2 flex-wrap">
                {!isDrawing && polygonPoints.length === 0 && (
                  <Button
                    variant="outline"
                    onClick={startDrawing}
                    disabled={searching || !hasApiKey}
                  >
                    <Pencil className="h-4 w-4 mr-2" />
                    Desenhar Área no Mapa
                  </Button>
                )}

                {isDrawing && (
                  <>
                    <Button variant="outline" onClick={undoLastPoint} disabled={polygonPoints.length === 0}>
                      <Undo2 className="h-4 w-4 mr-1" />
                      Desfazer
                    </Button>
                    <Button variant="outline" onClick={cancelDrawing}>
                      <X className="h-4 w-4 mr-1" />
                      Cancelar
                    </Button>
                    <Button onClick={finishDrawing} disabled={polygonPoints.length < 3}>
                      <Check className="h-4 w-4 mr-2" />
                      Finalizar ({polygonPoints.length} pontos)
                    </Button>
                  </>
                )}

                {!isDrawing && polygonPoints.length >= 3 && (
                  <>
                    <Badge variant="secondary" className="flex items-center gap-1 px-3 py-2">
                      <Check className="h-3 w-3" />
                      Área definida ({polygonPoints.length} pontos)
                    </Badge>
                    <Button variant="ghost" size="sm" onClick={clearPolygon}>
                      <Trash2 className="h-4 w-4 mr-1" />
                      Limpar
                    </Button>
                  </>
                )}
              </div>

              {isDrawing && (
                <Alert>
                  <MapPin className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Modo de desenho ativo!</strong> Clique no mapa abaixo para adicionar pontos. 
                    Adicione pelo menos 3 pontos para formar uma área de busca.
                  </AlertDescription>
                </Alert>
              )}

              <Button
                onClick={handleSearchByArea}
                disabled={searching || !keyword || polygonPoints.length < 3 || !hasApiKey || gastosInfo.limiteAtingido}
                className="w-full"
              >
                {searching ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Search className="h-4 w-4 mr-2" />
                )}
                Buscar na Área Desenhada
              </Button>
            </TabsContent>
          </Tabs>

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
            <div className="absolute top-4 left-4 bg-background/95 backdrop-blur p-3 rounded-lg shadow-lg z-[1000] border">
              <p className="text-sm font-medium text-primary">🎯 Modo de desenho ativo</p>
              <p className="text-xs text-muted-foreground mt-1">
                Clique no mapa para adicionar pontos
              </p>
              <p className="text-xs font-medium mt-2">
                Pontos: {polygonPoints.length} / mín. 3
              </p>
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