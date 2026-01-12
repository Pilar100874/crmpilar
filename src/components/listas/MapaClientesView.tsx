import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MapPin, Building2, User, RefreshCw, Filter, X, Maximize2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useMapLayers } from './map/useMapLayers';
import MapLayerControl from './map/MapLayerControl';
import FullscreenMapModal from './map/FullscreenMapModal';

// Fix default Leaflet marker icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const MapaClientesView: React.FC = () => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const { toast } = useToast();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [geocodingInProgress, setGeocodingInProgress] = useState(false);

  const {
    layers,
    toggleLayer,
    empresas,
    allEmpresas,
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
    mapRef.current = L.map(mapContainerRef.current).setView([-15.7801, -47.9292], 4);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap'
    }).addTo(mapRef.current);

    return () => {
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }
    };
  }, []);

  // Update markers
  useEffect(() => {
    if (!mapRef.current) return;
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    const clientsLayer = layers.find(l => l.id === 'clients');
    if (!clientsLayer?.visible || empresas.length === 0) return;

    const bounds = L.latLngBounds([]);
    empresas.forEach(empresa => {
      if (!empresa.latitude || !empresa.longitude) return;
      const marker = L.marker([empresa.latitude, empresa.longitude])
        .addTo(mapRef.current!)
        .bindPopup(`<strong>${empresa.nome_fantasia || empresa.nome}</strong><br/>${empresa.cidade || ''}`);
      markersRef.current.push(marker);
      bounds.extend([empresa.latitude, empresa.longitude]);
    });

    if (bounds.isValid()) mapRef.current.fitBounds(bounds, { padding: [50, 50] });
  }, [empresas, layers]);

  const empresasSemCoordenadas = allEmpresas.filter(e => !e.latitude && !e.longitude && (e.endereco || e.cidade)).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={selectedUsuarioId} onValueChange={setSelectedUsuarioId}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filtrar usuário" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all"><Building2 className="h-4 w-4 inline mr-2" />Todas</SelectItem>
                <SelectItem value="none"><X className="h-4 w-4 inline mr-2" />Sem vínculo</SelectItem>
                {usuarios.map(u => (
                  <SelectItem key={u.id} value={u.id}><User className="h-4 w-4 inline mr-2" />{u.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button variant="outline" size="sm" onClick={geocodeEmpresas} disabled={geocodingInProgress || empresasSemCoordenadas === 0}>
            <RefreshCw className={`h-4 w-4 mr-2 ${geocodingInProgress ? 'animate-spin' : ''}`} />
            Geocodificar ({empresasSemCoordenadas})
          </Button>

          <Badge variant="secondary"><MapPin className="h-3 w-3 mr-1" />{empresas.length} no mapa</Badge>
        </div>

        <div className="flex items-center gap-2">
          <MapLayerControl layers={layers} onLayerToggle={toggleLayer} compact />
          <Button variant="default" size="sm" onClick={() => setIsFullscreen(true)}>
            <Maximize2 className="h-4 w-4 mr-2" />
            Tela Cheia
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <div ref={mapContainerRef} className="w-full h-[500px] rounded-lg" style={{ zIndex: 0 }} />
        </CardContent>
      </Card>

      {loading && <div className="text-center text-muted-foreground">Carregando...</div>}

      <FullscreenMapModal
        open={isFullscreen}
        onClose={() => setIsFullscreen(false)}
        layers={layers}
        onLayerToggle={toggleLayer}
        empresas={empresas}
        usuarios={usuarios}
        vendasData={vendasData}
        selectedUsuarioId={selectedUsuarioId}
        onUsuarioChange={setSelectedUsuarioId}
      />
    </div>
  );
};

export default MapaClientesView;
