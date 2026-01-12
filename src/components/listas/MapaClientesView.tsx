import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { MapPin, Building2, User, RefreshCw, Filter, X, Maximize2, Layers } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useMapLayers, DADOS_DEMOGRAFICOS_UF } from './map/useMapLayers';
import FullscreenMapModal from './map/FullscreenMapModal';

// Fix default Leaflet marker icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
};

const MapaClientesView: React.FC = () => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const unidadesLayerRef = useRef<L.LayerGroup | null>(null);
  const vendasLayerRef = useRef<L.LayerGroup | null>(null);
  const demographicsLayerRef = useRef<L.LayerGroup | null>(null);
  const incomeLayerRef = useRef<L.LayerGroup | null>(null);
  const competitionLayerRef = useRef<L.LayerGroup | null>(null);
  const logisticsLayerRef = useRef<L.LayerGroup | null>(null);
  const { toast } = useToast();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [geocodingInProgress, setGeocodingInProgress] = useState(false);
  const [mapReady, setMapReady] = useState(false);

  const {
    layers,
    toggleLayer,
    empresas,
    allEmpresas,
    unidades,
    usuarios,
    vendasData,
    loading,
    fetchData,
    selectedUsuarioId,
    setSelectedUsuarioId
  } = useMapLayers();

  const geocodeEmpresas = async () => {
    const empresasSemCoordenadas = allEmpresas.filter(e => 
      !e.latitude && !e.longitude && (e.endereco || e.cidade)
    );

    if (empresasSemCoordenadas.length === 0) {
      toast({ title: 'Info', description: 'Todas as empresas já possuem coordenadas' });
      return;
    }

    setGeocodingInProgress(true);
    let geocoded = 0;

    for (const empresa of empresasSemCoordenadas.slice(0, 10)) {
      try {
        const addressParts = [empresa.endereco, empresa.cidade, empresa.estado, 'Brasil'].filter(Boolean).join(', ');
        const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(addressParts)}&limit=1`);
        const data = await response.json();
        if (data?.[0]) geocoded++;
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`Error geocoding:`, error);
      }
    }

    toast({ title: 'Geocodificação', description: `${geocoded} empresas processadas` });
    setGeocodingInProgress(false);
    fetchData();
  };

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;
    
    const map = L.map(mapContainerRef.current).setView([-15.7801, -47.9292], 4);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap'
    }).addTo(map);

    // Initialize layer groups
    markersLayerRef.current = L.layerGroup().addTo(map);
    unidadesLayerRef.current = L.layerGroup().addTo(map);
    vendasLayerRef.current = L.layerGroup().addTo(map);
    demographicsLayerRef.current = L.layerGroup().addTo(map);
    incomeLayerRef.current = L.layerGroup().addTo(map);
    competitionLayerRef.current = L.layerGroup().addTo(map);
    logisticsLayerRef.current = L.layerGroup().addTo(map);

    mapRef.current = map;
    setMapReady(true);

    return () => {
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }
    };
  }, []);

  // Update client markers
  useEffect(() => {
    if (!markersLayerRef.current || !mapReady) return;
    markersLayerRef.current.clearLayers();

    const clientsLayer = layers.find(l => l.id === 'clients');
    if (!clientsLayer?.visible) return;

    const bounds = L.latLngBounds([]);
    empresas.forEach(empresa => {
      if (!empresa.latitude || !empresa.longitude) return;

      const customIcon = L.divIcon({
        className: 'custom-marker',
        html: `<div style="background: #3b82f6; width: 24px; height: 24px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center;">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="white">
            <path d="M3 21h18M5 21V7l8-4 8 4v14M9 21v-6h6v6"/>
          </svg>
        </div>`,
        iconSize: [24, 24],
        iconAnchor: [12, 12]
      });

      L.marker([empresa.latitude, empresa.longitude], { icon: customIcon })
        .addTo(markersLayerRef.current!)
        .bindPopup(`
          <div class="p-2">
            <strong>${empresa.nome_fantasia || empresa.nome}</strong>
            ${empresa.endereco ? `<br/><small>${empresa.endereco}</small>` : ''}
            ${empresa.cidade ? `<br/><small>${empresa.cidade}${empresa.estado ? ` - ${empresa.estado}` : ''}</small>` : ''}
          </div>
        `);
      bounds.extend([empresa.latitude, empresa.longitude]);
    });

    if (bounds.isValid()) mapRef.current?.fitBounds(bounds, { padding: [50, 50] });
  }, [empresas, layers, mapReady]);

  // Update unidades layer
  useEffect(() => {
    if (!unidadesLayerRef.current || !mapReady) return;
    unidadesLayerRef.current.clearLayers();

    const unitsLayer = layers.find(l => l.id === 'units');
    if (!unitsLayer?.visible) return;

    unidades.forEach(unidade => {
      if (!unidade.latitude || !unidade.longitude) return;

      const customIcon = L.divIcon({
        className: 'custom-marker',
        html: `<div style="background: #ec4899; width: 32px; height: 32px; border-radius: 50%; border: 3px solid white; box-shadow: 0 3px 6px rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center;">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
            <circle cx="12" cy="10" r="3" fill="#ec4899"/>
          </svg>
        </div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 16]
      });

      const enderecoCompleto = [
        unidade.logradouro,
        unidade.numero,
        unidade.bairro,
        unidade.cidade,
        unidade.uf
      ].filter(Boolean).join(', ');

      L.marker([unidade.latitude, unidade.longitude], { icon: customIcon })
        .addTo(unidadesLayerRef.current!)
        .bindPopup(`
          <div class="p-2">
            <div style="background: #ec4899; color: white; padding: 4px 8px; border-radius: 4px; font-weight: bold; margin-bottom: 8px; display: inline-block;">
              📍 UNIDADE/FILIAL
            </div>
            <br/>
            <strong>${unidade.nome}</strong>
            ${enderecoCompleto ? `<br/><small>${enderecoCompleto}</small>` : ''}
            ${unidade.cep ? `<br/><small>CEP: ${unidade.cep}</small>` : ''}
          </div>
        `);
    });
  }, [unidades, layers, mapReady]);

  // Update vendas layer
  useEffect(() => {
    if (!vendasLayerRef.current || !mapReady) return;
    vendasLayerRef.current.clearLayers();

    const salesLayer = layers.find(l => l.id === 'sales');
    if (!salesLayer?.visible) return;

    vendasData.forEach(venda => {
      if (!venda.latitude || !venda.longitude) return;

      const radius = Math.min(Math.max(venda.total_vendas * 5, 10), 50);
      
      const circle = L.circleMarker([venda.latitude, venda.longitude], {
        radius: radius,
        fillColor: '#22c55e',
        color: '#15803d',
        weight: 2,
        opacity: 0.8,
        fillOpacity: 0.4
      });

      circle.bindPopup(`
        <div class="p-2">
          <strong>${venda.cidade} - ${venda.uf}</strong>
          <br/><small>Orçamentos: ${venda.total_orcamentos}</small>
          <br/><small>Vendas: ${venda.total_vendas}</small>
          <br/><small>Total: ${formatCurrency(venda.valor_total)}</small>
          <br/><small>Ticket Médio: ${formatCurrency(venda.ticket_medio)}</small>
        </div>
      `);

      vendasLayerRef.current!.addLayer(circle);
    });
  }, [vendasData, layers, mapReady]);

  // Update demographics layer
  useEffect(() => {
    if (!demographicsLayerRef.current || !mapReady) return;
    demographicsLayerRef.current.clearLayers();

    const demoLayer = layers.find(l => l.id === 'demographics');
    if (!demoLayer?.visible) return;

    const maxPopulacao = Math.max(...Object.values(DADOS_DEMOGRAFICOS_UF).map(d => d.populacao));
    const minPopulacao = Math.min(...Object.values(DADOS_DEMOGRAFICOS_UF).map(d => d.populacao));

    Object.entries(DADOS_DEMOGRAFICOS_UF).forEach(([uf, data]) => {
      const normalizedPopulacao = (data.populacao - minPopulacao) / (maxPopulacao - minPopulacao);
      const radius = 15 + (normalizedPopulacao * 40);
      
      const maxDensidade = Math.max(...Object.values(DADOS_DEMOGRAFICOS_UF).map(d => d.densidade));
      const normalizedDensity = data.densidade / maxDensidade;
      const opacity = 0.25 + (normalizedDensity * 0.5);

      const circle = L.circleMarker([data.lat, data.lng], {
        radius: radius,
        fillColor: '#8b5cf6',
        color: '#6d28d9',
        weight: 2,
        opacity: 0.8,
        fillOpacity: opacity
      });

      circle.bindPopup(`
        <div class="p-2">
          <strong>${uf}</strong>
          <br/><small>População: ${data.populacao.toLocaleString('pt-BR')}</small>
          <br/><small>Densidade: ${data.densidade.toFixed(1)} hab/km²</small>
          <br/><small>Urbanização: ${data.urbanizacao}%</small>
        </div>
      `);

      demographicsLayerRef.current!.addLayer(circle);
    });
  }, [layers, mapReady]);

  // Update income layer
  useEffect(() => {
    if (!incomeLayerRef.current || !mapReady) return;
    incomeLayerRef.current.clearLayers();

    const incomeLayer = layers.find(l => l.id === 'income');
    if (!incomeLayer?.visible) return;

    const maxRenda = Math.max(...Object.values(DADOS_DEMOGRAFICOS_UF).map(d => d.renda_media));
    const minRenda = Math.min(...Object.values(DADOS_DEMOGRAFICOS_UF).map(d => d.renda_media));

    Object.entries(DADOS_DEMOGRAFICOS_UF).forEach(([uf, data]) => {
      const normalizedRenda = (data.renda_media - minRenda) / (maxRenda - minRenda);
      const opacity = 0.3 + (normalizedRenda * 0.5);
      const radius = 15 + (normalizedRenda * 25);

      const circle = L.circleMarker([data.lat, data.lng], {
        radius: radius,
        fillColor: '#f59e0b',
        color: '#b45309',
        weight: 1,
        opacity: 0.7,
        fillOpacity: opacity
      });

      circle.bindPopup(`
        <div class="p-2">
          <strong>${uf}</strong>
          <br/><small>Renda Média: R$ ${data.renda_media.toLocaleString('pt-BR')}</small>
          <br/><small>Score: ${Math.round(normalizedRenda * 100)}</small>
        </div>
      `);

      incomeLayerRef.current!.addLayer(circle);
    });
  }, [layers, mapReady]);

  // Update competition layer
  useEffect(() => {
    if (!competitionLayerRef.current || !mapReady) return;
    competitionLayerRef.current.clearLayers();

    const compLayer = layers.find(l => l.id === 'competition');
    if (!compLayer?.visible) return;

    Object.entries(DADOS_DEMOGRAFICOS_UF).forEach(([uf, data]) => {
      const competitionLevel = data.urbanizacao / 100;
      let fillColor = '#22c55e';
      if (competitionLevel > 0.85) fillColor = '#ef4444';
      else if (competitionLevel > 0.75) fillColor = '#f59e0b';

      const circle = L.circleMarker([data.lat, data.lng], {
        radius: 18,
        fillColor: fillColor,
        color: '#374151',
        weight: 1,
        opacity: 0.7,
        fillOpacity: 0.5
      });

      circle.bindPopup(`
        <div class="p-2">
          <strong>${uf} - Concorrência</strong>
          <br/><small>Nível: ${competitionLevel > 0.85 ? 'Alto' : competitionLevel > 0.75 ? 'Médio' : 'Baixo'}</small>
          <br/><small>Urbanização: ${data.urbanizacao}%</small>
        </div>
      `);

      competitionLayerRef.current!.addLayer(circle);
    });
  }, [layers, mapReady]);

  // Update logistics layer
  useEffect(() => {
    if (!logisticsLayerRef.current || !mapReady) return;
    logisticsLayerRef.current.clearLayers();

    const logLayer = layers.find(l => l.id === 'logistics');
    if (!logLayer?.visible) return;

    Object.entries(DADOS_DEMOGRAFICOS_UF).forEach(([uf, data]) => {
      const accessScore = Math.min(data.densidade / 100, 1);
      let accessLevel = 'baixo';
      let fillOpacity = 1;
      
      if (accessScore > 0.5) {
        accessLevel = 'alto';
        fillOpacity = 0;
      } else if (accessScore > 0.2) {
        accessLevel = 'medio';
        fillOpacity = 0.3;
      }

      const circle = L.circleMarker([data.lat, data.lng], {
        radius: 15,
        fillColor: '#06b6d4',
        color: '#06b6d4',
        weight: 2,
        opacity: 0.8,
        fillOpacity: fillOpacity
      });

      const tempoEntrega = Math.round((1 - accessScore) * 48 + 6);

      circle.bindPopup(`
        <div class="p-2">
          <strong>${uf} - Logística</strong>
          <br/><small>Acesso: ${accessLevel.charAt(0).toUpperCase() + accessLevel.slice(1)}</small>
          <br/><small>Tempo Estimado: ${tempoEntrega}h</small>
        </div>
      `);

      logisticsLayerRef.current!.addLayer(circle);
    });
  }, [layers, mapReady]);

  const empresasSemCoordenadas = allEmpresas.filter(e => !e.latitude && !e.longitude && (e.endereco || e.cidade)).length;
  const activeLayersCount = layers.filter(l => l.visible).length;
  const unidadesNoMapa = unidades.filter(u => u.latitude && u.longitude).length;

  return (
    <div className="space-y-3">
      {/* Header responsivo */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        {/* Filtros */}
        <div className="flex flex-wrap gap-2 items-center w-full sm:w-auto">
          <Select value={selectedUsuarioId} onValueChange={setSelectedUsuarioId}>
            <SelectTrigger className="w-full sm:w-[160px] h-9">
              <Filter className="h-3.5 w-3.5 mr-1.5 shrink-0" />
              <SelectValue placeholder="Usuário" />
            </SelectTrigger>
            <SelectContent className="bg-popover z-50">
              <SelectItem value="all">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Todas
                </div>
              </SelectItem>
              <SelectItem value="none">
                <div className="flex items-center gap-2">
                  <X className="h-4 w-4" />
                  Sem vínculo
                </div>
              </SelectItem>
              {usuarios.map(u => (
                <SelectItem key={u.id} value={u.id}>
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    {u.nome}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {empresasSemCoordenadas > 0 && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={geocodeEmpresas} 
              disabled={geocodingInProgress}
              className="h-9"
            >
              <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${geocodingInProgress ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Geocodificar</span>
              <span className="sm:hidden">Geo</span>
              ({empresasSemCoordenadas})
            </Button>
          )}
        </div>

        {/* Ações e Badges */}
        <div className="flex flex-wrap gap-2 items-center w-full sm:w-auto justify-between sm:justify-end">
          {/* Badges */}
          <div className="flex gap-1.5">
            {unidadesNoMapa > 0 && (
              <Badge variant="outline" className="bg-pink-500/10 border-pink-500/50 text-pink-700 text-xs">
                <MapPin className="h-3 w-3 mr-1" />
                {unidadesNoMapa}
              </Badge>
            )}
            <Badge variant="secondary" className="text-xs">
              <Building2 className="h-3 w-3 mr-1" />
              {empresas.length}
            </Badge>
          </div>

          {/* Dropdown Camadas */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-9">
                <Layers className="h-3.5 w-3.5 mr-1.5" />
                Camadas
                <Badge variant="secondary" className="ml-1.5 h-5 px-1.5 text-xs">
                  {activeLayersCount}
                </Badge>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64 bg-popover z-50">
              <DropdownMenuLabel className="flex items-center gap-2">
                <Layers className="h-4 w-4" />
                Camadas do Mapa
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <div className="p-2 space-y-3">
                {layers.map((layer) => (
                  <div 
                    key={layer.id} 
                    className="flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <div 
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: layer.color }}
                      />
                      <Label 
                        htmlFor={`layer-main-${layer.id}`}
                        className="text-sm cursor-pointer truncate"
                      >
                        {layer.name}
                      </Label>
                    </div>
                    <Switch
                      id={`layer-main-${layer.id}`}
                      checked={layer.visible}
                      onCheckedChange={() => toggleLayer(layer.id)}
                    />
                  </div>
                ))}
              </div>
              <DropdownMenuSeparator />
              <div className="p-2 space-y-2 max-h-[200px] overflow-y-auto">
                <div className="text-xs font-medium text-foreground mb-2">Legenda das Camadas Ativas:</div>
                {layers.filter(l => l.visible).length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">Nenhuma camada ativa</p>
                ) : (
                  layers.filter(l => l.visible).map(layer => (
                    <div key={layer.id} className="text-xs space-y-1 pb-2 border-b border-border/50 last:border-0">
                      <div className="flex items-center gap-2 font-medium">
                        <div 
                          className="w-3 h-3 rounded-full shrink-0"
                          style={{ backgroundColor: layer.color }}
                        />
                        <span>{layer.name}</span>
                      </div>
                      <p className="text-muted-foreground pl-5">{layer.description}</p>
                      {layer.id === 'units' && (
                        <p className="text-muted-foreground pl-5 italic">• Ícone rosa maior = Filiais/Pontos de venda</p>
                      )}
                      {layer.id === 'clients' && (
                        <p className="text-muted-foreground pl-5 italic">• Ícone azul = Empresas cadastradas</p>
                      )}
                      {layer.id === 'sales' && (
                        <p className="text-muted-foreground pl-5 italic">• Tamanho = Volume de vendas</p>
                      )}
                      {layer.id === 'demographics' && (
                        <p className="text-muted-foreground pl-5 italic">• Tamanho = População | Opacidade = Densidade</p>
                      )}
                      {layer.id === 'income' && (
                        <p className="text-muted-foreground pl-5 italic">• Tamanho/Opacidade = Renda média</p>
                      )}
                      {layer.id === 'competition' && (
                        <p className="text-muted-foreground pl-5 italic">• Verde = Baixo | Amarelo = Médio | Vermelho = Alto</p>
                      )}
                      {layer.id === 'logistics' && (
                        <p className="text-muted-foreground pl-5 italic">• Preenchido = Difícil acesso | Vazio = Fácil acesso</p>
                      )}
                    </div>
                  ))
                )}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button variant="default" size="sm" onClick={() => setIsFullscreen(true)} className="h-9">
            <Maximize2 className="h-3.5 w-3.5 sm:mr-1.5" />
            <span className="hidden sm:inline">Expandir</span>
          </Button>
        </div>
      </div>

      {/* Mapa */}
      <Card>
        <CardContent className="p-0 relative">
          <div 
            ref={mapContainerRef} 
            className="w-full h-[400px] sm:h-[500px] md:h-[600px] rounded-lg" 
            style={{ zIndex: 0 }} 
          />
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/50 rounded-lg">
              <div className="flex items-center gap-2 text-muted-foreground">
                <RefreshCw className="h-4 w-4 animate-spin" />
                Carregando...
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <FullscreenMapModal
        open={isFullscreen}
        onClose={() => setIsFullscreen(false)}
        layers={layers}
        onLayerToggle={toggleLayer}
        empresas={empresas}
        unidades={unidades}
        usuarios={usuarios}
        vendasData={vendasData}
        selectedUsuarioId={selectedUsuarioId}
        onUsuarioChange={setSelectedUsuarioId}
      />
    </div>
  );
};

export default MapaClientesView;
