import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Building2, User, RefreshCw, Filter, X, Maximize2, Layers } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useMapLayers } from './map/useMapLayers';
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
    setSelectedUsuarioId,
    selectedCnaes,
    setSelectedCnaes,
    empresasByCnae,
    concorrenciaPorUF
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

  // Update client markers - always show clients in compact map (ignore layer visibility)
  useEffect(() => {
    if (!markersLayerRef.current || !mapReady) return;
    markersLayerRef.current.clearLayers();

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
  }, [empresas, mapReady]);

  // Update unidades layer - disabled in compact map
  useEffect(() => {
    if (!unidadesLayerRef.current || !mapReady) return;
    unidadesLayerRef.current.clearLayers();
    // Only show units layer in fullscreen mode
  }, [mapReady]);

  // Update vendas layer - disabled in compact map
  useEffect(() => {
    if (!vendasLayerRef.current || !mapReady) return;
    vendasLayerRef.current.clearLayers();
    // Only show sales layer in fullscreen mode
  }, [mapReady]);

  // Update demographics layer - disabled in compact map
  useEffect(() => {
    if (!demographicsLayerRef.current || !mapReady) return;
    demographicsLayerRef.current.clearLayers();
    // Only show demographics layer in fullscreen mode
  }, [mapReady]);

  // Update income layer - disabled in compact map
  useEffect(() => {
    if (!incomeLayerRef.current || !mapReady) return;
    incomeLayerRef.current.clearLayers();
    // Only show income layer in fullscreen mode
  }, [mapReady]);

  // Update competition layer - disabled in compact map
  useEffect(() => {
    if (!competitionLayerRef.current || !mapReady) return;
    competitionLayerRef.current.clearLayers();
    // Only show competition layer in fullscreen mode
  }, [mapReady]);

  // Update logistics layer - disabled in compact map
  useEffect(() => {
    if (!logisticsLayerRef.current || !mapReady) return;
    logisticsLayerRef.current.clearLayers();
    // Only show logistics layer in fullscreen mode
  }, [mapReady]);

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
            <Badge variant="secondary" className="text-xs">
              <Building2 className="h-3 w-3 mr-1" />
              {empresas.length} clientes
            </Badge>
          </div>

          <Button variant="default" size="sm" onClick={() => setIsFullscreen(true)} className="h-9 gap-1.5">
            <Maximize2 className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Expandir</span>
            <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs bg-primary-foreground/20 text-primary-foreground">
              <Layers className="h-3 w-3 mr-0.5" />
              +{layers.length - 1}
            </Badge>
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
        selectedCnaes={selectedCnaes}
        onCnaesChange={setSelectedCnaes}
        empresasByCnae={empresasByCnae}
        concorrenciaPorUF={concorrenciaPorUF}
      />
    </div>
  );
};

export default MapaClientesView;
