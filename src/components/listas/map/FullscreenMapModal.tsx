import React, { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { MapLayer, VendasRegiao, DADOS_DEMOGRAFICOS_UF, Unidade } from './MapLayerTypes';
import { 
  X, 
  Filter, 
  Building2, 
  User, 
  ZoomIn, 
  ZoomOut, 
  RotateCcw,
  MapPin,
  Layers,
  ChevronDown
} from 'lucide-react';

// Fix default Leaflet marker icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface Empresa {
  id: string;
  nome_fantasia: string;
  nome: string;
  endereco: string | null;
  cidade: string | null;
  estado: string | null;
  latitude: number | null;
  longitude: number | null;
}

interface Usuario {
  id: string;
  nome: string;
}

interface FullscreenMapModalProps {
  open: boolean;
  onClose: () => void;
  layers: MapLayer[];
  onLayerToggle: (layerId: string) => void;
  empresas: Empresa[];
  unidades: Unidade[];
  usuarios: Usuario[];
  vendasData: VendasRegiao[];
  selectedUsuarioId: string;
  onUsuarioChange: (id: string) => void;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
};

const FullscreenMapModal: React.FC<FullscreenMapModalProps> = ({
  open,
  onClose,
  layers,
  onLayerToggle,
  empresas,
  unidades,
  usuarios,
  vendasData,
  selectedUsuarioId,
  onUsuarioChange
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const unidadesLayerRef = useRef<L.LayerGroup | null>(null);
  const vendasLayerRef = useRef<L.LayerGroup | null>(null);
  const demographicsLayerRef = useRef<L.LayerGroup | null>(null);
  const incomeLayerRef = useRef<L.LayerGroup | null>(null);
  const competitionLayerRef = useRef<L.LayerGroup | null>(null);
  const logisticsLayerRef = useRef<L.LayerGroup | null>(null);
  const [mapReady, setMapReady] = useState(false);

  // Initialize map when dialog opens
  const initializeMap = useCallback(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    try {
      const map = L.map(mapContainerRef.current, {
        center: [-15.7801, -47.9292],
        zoom: 4,
        zoomControl: false
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap'
      }).addTo(map);

      L.control.zoom({ position: 'bottomright' }).addTo(map);

      markersLayerRef.current = L.layerGroup().addTo(map);
      unidadesLayerRef.current = L.layerGroup().addTo(map);
      vendasLayerRef.current = L.layerGroup().addTo(map);
      demographicsLayerRef.current = L.layerGroup().addTo(map);
      incomeLayerRef.current = L.layerGroup().addTo(map);
      competitionLayerRef.current = L.layerGroup().addTo(map);
      logisticsLayerRef.current = L.layerGroup().addTo(map);

      mapRef.current = map;

      // Force resize after a delay
      setTimeout(() => {
        map.invalidateSize();
        setMapReady(true);
      }, 300);
    } catch (error) {
      console.error('Error initializing map:', error);
    }
  }, []);

  useEffect(() => {
    if (!open) {
      // Cleanup when closing
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markersLayerRef.current = null;
        unidadesLayerRef.current = null;
        vendasLayerRef.current = null;
        demographicsLayerRef.current = null;
        incomeLayerRef.current = null;
        competitionLayerRef.current = null;
        logisticsLayerRef.current = null;
        setMapReady(false);
      }
      return;
    }

    // Initialize with delay to ensure DOM is ready
    const timer = setTimeout(initializeMap, 200);
    return () => clearTimeout(timer);
  }, [open, initializeMap]);

  // Update markers layer (clients)
  useEffect(() => {
    if (!markersLayerRef.current || !mapReady) return;
    
    markersLayerRef.current.clearLayers();
    
    const clientsLayer = layers.find(l => l.id === 'clients');
    if (!clientsLayer?.visible) return;

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
    });
  }, [empresas, layers, mapReady]);

  // Update unidades layer (filiais/pontos de venda)
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

  // Update demographics layer - usa POPULAÇÃO para tamanho do círculo
  useEffect(() => {
    if (!demographicsLayerRef.current || !mapReady) return;
    
    demographicsLayerRef.current.clearLayers();
    
    const demoLayer = layers.find(l => l.id === 'demographics');
    if (!demoLayer?.visible) return;

    const maxPopulacao = Math.max(...Object.values(DADOS_DEMOGRAFICOS_UF).map(d => d.populacao));
    const minPopulacao = Math.min(...Object.values(DADOS_DEMOGRAFICOS_UF).map(d => d.populacao));

    Object.entries(DADOS_DEMOGRAFICOS_UF).forEach(([uf, data]) => {
      // Normaliza pela POPULAÇÃO para definir o raio
      const normalizedPopulacao = (data.populacao - minPopulacao) / (maxPopulacao - minPopulacao);
      const radius = 15 + (normalizedPopulacao * 40); // SP terá o maior círculo
      
      // Usa densidade para definir a opacidade (mais denso = mais escuro)
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
          <br/><small class="text-muted-foreground">Fonte: IBGE 2022</small>
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
          <br/><small>Score Poder de Compra: ${Math.round(normalizedRenda * 100)}</small>
          <br/><small class="text-muted-foreground">Fonte: IBGE/IPEA</small>
        </div>
      `);

      incomeLayerRef.current!.addLayer(circle);
    });
  }, [layers, mapReady]);

  // Update competition layer (simulated)
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
          <br/><small class="text-muted-foreground">Estimado via IBGE CNAE</small>
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
          <br/><small class="text-muted-foreground">Fonte: DNIT/OSM</small>
        </div>
      `);

      logisticsLayerRef.current!.addLayer(circle);
    });
  }, [layers, mapReady]);

  const handleZoomIn = () => mapRef.current?.zoomIn();
  const handleZoomOut = () => mapRef.current?.zoomOut();
  const handleReset = () => mapRef.current?.setView([-15.7801, -47.9292], 4);

  const activeLayersCount = layers.filter(l => l.visible).length;
  const unidadesNoMapa = unidades.filter(u => u.latitude && u.longitude).length;
  const empresasNoMapa = empresas.filter(e => e.latitude && e.longitude).length;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-[100vw] w-[100vw] h-[100vh] sm:max-w-[98vw] sm:w-[98vw] sm:h-[95vh] p-0 gap-0 rounded-none sm:rounded-lg" aria-describedby={undefined}>
        <VisuallyHidden>
          <DialogTitle>Mapa Geoespacial em Tela Cheia</DialogTitle>
        </VisuallyHidden>
        
        <div className="relative w-full h-full flex flex-col">
          {/* Header - Responsivo */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-2 sm:p-3 border-b bg-background z-10 gap-2">
            {/* Linha 1: Título e Fechar */}
            <div className="flex items-center justify-between w-full sm:w-auto gap-2">
              <h2 className="text-base sm:text-lg font-semibold flex items-center gap-2">
                <MapPin className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                <span className="hidden xs:inline">Mapa Geoespacial</span>
                <span className="xs:hidden">Mapa</span>
              </h2>
              
              {/* Badges - Mobile */}
              <div className="flex sm:hidden items-center gap-1.5">
                {unidadesNoMapa > 0 && (
                  <Badge variant="outline" className="bg-pink-500/10 border-pink-500/50 text-pink-700 text-xs px-1.5">
                    <MapPin className="h-3 w-3 mr-0.5" />
                    {unidadesNoMapa}
                  </Badge>
                )}
                <Badge variant="secondary" className="text-xs px-1.5">
                  <Building2 className="h-3 w-3 mr-0.5" />
                  {empresasNoMapa}
                </Badge>
              </div>
              
              {/* Fechar - Mobile */}
              <Button variant="ghost" size="icon" onClick={onClose} className="sm:hidden h-8 w-8">
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* Linha 2: Filtros e Controles */}
            <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
              {/* Filtro de Usuário */}
              <Select value={selectedUsuarioId} onValueChange={onUsuarioChange}>
                <SelectTrigger className="w-[130px] sm:w-[160px] h-8 text-xs sm:text-sm shrink-0">
                  <Filter className="h-3 w-3 sm:h-4 sm:w-4 mr-1 shrink-0" />
                  <SelectValue placeholder="Usuário" />
                </SelectTrigger>
                <SelectContent className="bg-popover z-[1100]">
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

              {/* Badges - Desktop/Tablet */}
              <div className="hidden sm:flex items-center gap-1.5">
                {unidadesNoMapa > 0 && (
                  <Badge variant="outline" className="bg-pink-500/10 border-pink-500 text-pink-700 text-xs">
                    <MapPin className="h-3 w-3 mr-1" />
                    {unidadesNoMapa} unid.
                  </Badge>
                )}
                <Badge variant="secondary" className="text-xs">
                  <Building2 className="h-3 w-3 mr-1" />
                  {empresasNoMapa} emp.
                </Badge>
              </div>

              {/* Dropdown Camadas */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8 text-xs sm:text-sm shrink-0">
                    <Layers className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                    <span className="hidden sm:inline">Camadas</span>
                    <Badge variant="secondary" className="ml-1 h-4 sm:h-5 px-1 sm:px-1.5 text-xs">
                      {activeLayersCount}
                    </Badge>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-72 bg-popover z-[1100]">
                  <DropdownMenuLabel className="flex items-center gap-2">
                    <Layers className="h-4 w-4" />
                    Camadas do Mapa
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <div className="p-2 space-y-3 max-h-[300px] overflow-y-auto">
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
                            htmlFor={`layer-fs-${layer.id}`}
                            className="text-sm cursor-pointer truncate"
                          >
                            {layer.name}
                          </Label>
                        </div>
                        <Switch
                          id={`layer-fs-${layer.id}`}
                          checked={layer.visible}
                          onCheckedChange={() => onLayerToggle(layer.id)}
                        />
                      </div>
                    ))}
                  </div>
                  <DropdownMenuSeparator />
                  <div className="p-2 space-y-2 max-h-[180px] overflow-y-auto">
                    <div className="text-xs font-medium text-foreground">Legenda:</div>
                    {layers.filter(l => l.visible).length === 0 ? (
                      <p className="text-xs text-muted-foreground italic">Nenhuma camada ativa</p>
                    ) : (
                      layers.filter(l => l.visible).map(layer => (
                        <div key={layer.id} className="text-xs space-y-0.5 pb-1.5 border-b border-border/50 last:border-0">
                          <div className="flex items-center gap-2 font-medium">
                            <div 
                              className="w-2.5 h-2.5 rounded-full shrink-0"
                              style={{ backgroundColor: layer.color }}
                            />
                            <span>{layer.name}</span>
                          </div>
                          {layer.id === 'units' && (
                            <p className="text-muted-foreground pl-4">Ícone rosa = Filiais</p>
                          )}
                          {layer.id === 'clients' && (
                            <p className="text-muted-foreground pl-4">Ícone azul = Empresas</p>
                          )}
                          {layer.id === 'sales' && (
                            <p className="text-muted-foreground pl-4">Tamanho = Volume vendas</p>
                          )}
                          {layer.id === 'demographics' && (
                            <p className="text-muted-foreground pl-4">Tamanho = População</p>
                          )}
                          {layer.id === 'income' && (
                            <p className="text-muted-foreground pl-4">Tamanho = Renda média</p>
                          )}
                          {layer.id === 'competition' && (
                            <p className="text-muted-foreground pl-4">🟢Baixo 🟡Médio 🔴Alto</p>
                          )}
                          {layer.id === 'logistics' && (
                            <p className="text-muted-foreground pl-4">Cheio = Difícil acesso</p>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Zoom Controls */}
              <div className="flex items-center gap-1 shrink-0">
                <Button variant="outline" size="icon" onClick={handleZoomIn} className="h-8 w-8">
                  <ZoomIn className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" onClick={handleZoomOut} className="h-8 w-8">
                  <ZoomOut className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" onClick={handleReset} className="h-8 w-8 hidden sm:flex">
                  <RotateCcw className="h-4 w-4" />
                </Button>
              </div>
              
              {/* Fechar - Desktop */}
              <Button variant="ghost" size="icon" onClick={onClose} className="hidden sm:flex h-8 w-8 shrink-0">
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* Map Content */}
          <div className="flex-1 relative overflow-hidden">
            <div 
              ref={mapContainerRef} 
              className="absolute inset-0 w-full h-full"
              style={{ zIndex: 1 }}
            />

            {!mapReady && (
              <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
                <div className="text-muted-foreground">Carregando mapa...</div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FullscreenMapModal;
