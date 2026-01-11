import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { supabase } from '@/integrations/supabase/client';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MapPin, Building2, User, RefreshCw, Filter, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

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

interface EmpresaVinculo {
  empresa_id: string;
  usuario_id: string | null;
}

const MapaClientesView: React.FC = () => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const { toast } = useToast();

  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [vinculos, setVinculos] = useState<EmpresaVinculo[]>([]);
  const [selectedUsuarioId, setSelectedUsuarioId] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [geocodingInProgress, setGeocodingInProgress] = useState(false);

  // Fetch data
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [empresasRes, usuariosRes, empresaVinculosRes] = await Promise.all([
        supabase.from('empresas').select('id, nome_fantasia, nome, endereco, cidade, estado, latitude, longitude'),
        supabase.from('usuarios').select('id, nome'),
        supabase.from('empresa_vinculos').select('empresa_id, usuario_id')
      ]);

      if (empresasRes.data) setEmpresas(empresasRes.data);
      if (usuariosRes.data) setUsuarios(usuariosRes.data);
      
      if (empresaVinculosRes.data) {
        setVinculos(empresaVinculosRes.data.map(v => ({
          empresa_id: v.empresa_id,
          usuario_id: v.usuario_id
        })));
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao carregar dados',
        variant: 'destructive'
      });
    }
    setLoading(false);
  };

  // Geocode empresas without coordinates
  const geocodeEmpresas = async () => {
    const empresasSemCoordenadas = empresas.filter(e => 
      !e.latitude && !e.longitude && (e.endereco || e.cidade)
    );

    if (empresasSemCoordenadas.length === 0) {
      toast({
        title: 'Info',
        description: 'Todas as empresas já possuem coordenadas ou não têm endereço'
      });
      return;
    }

    setGeocodingInProgress(true);
    let geocoded = 0;

    for (const empresa of empresasSemCoordenadas) {
      try {
        const addressParts = [empresa.endereco, empresa.cidade, empresa.estado, 'Brasil']
          .filter(Boolean)
          .join(', ');

        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(addressParts)}&limit=1`
        );
        const data = await response.json();

        if (data && data.length > 0) {
          const { lat, lon } = data[0];
          await supabase
            .from('empresas')
            .update({ latitude: parseFloat(lat), longitude: parseFloat(lon) })
            .eq('id', empresa.id);
          geocoded++;
        }

        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`Error geocoding empresa ${empresa.id}:`, error);
      }
    }

    toast({
      title: 'Geocodificação concluída',
      description: `${geocoded} de ${empresasSemCoordenadas.length} empresas geocodificadas`
    });

    setGeocodingInProgress(false);
    fetchData();
  };

  // Filter empresas by usuario
  const filteredEmpresas = React.useMemo(() => {
    if (selectedUsuarioId === 'all') {
      return empresas.filter(e => e.latitude && e.longitude);
    }

    if (selectedUsuarioId === 'none') {
      // Empresas sem vínculo
      const empresasComVinculo = new Set(vinculos.map(v => v.empresa_id));
      return empresas.filter(e => 
        e.latitude && e.longitude && !empresasComVinculo.has(e.id)
      );
    }

    const empresasDoUsuario = vinculos
      .filter(v => v.usuario_id === selectedUsuarioId)
      .map(v => v.empresa_id);

    return empresas.filter(e => 
      e.latitude && e.longitude && empresasDoUsuario.includes(e.id)
    );
  }, [empresas, vinculos, selectedUsuarioId]);

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    mapRef.current = L.map(mapContainerRef.current).setView([-15.7801, -47.9292], 4);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(mapRef.current);

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Update markers
  useEffect(() => {
    if (!mapRef.current) return;

    // Clear existing markers
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    if (filteredEmpresas.length === 0) return;

    const bounds = L.latLngBounds([]);

    filteredEmpresas.forEach(empresa => {
      if (!empresa.latitude || !empresa.longitude) return;

      const marker = L.marker([empresa.latitude, empresa.longitude])
        .addTo(mapRef.current!)
        .bindPopup(`
          <div class="p-2">
            <strong>${empresa.nome_fantasia || empresa.nome}</strong>
            ${empresa.endereco ? `<br/><small>${empresa.endereco}</small>` : ''}
            ${empresa.cidade ? `<br/><small>${empresa.cidade}${empresa.estado ? ` - ${empresa.estado}` : ''}</small>` : ''}
          </div>
        `);

      markersRef.current.push(marker);
      bounds.extend([empresa.latitude, empresa.longitude]);
    });

    if (bounds.isValid()) {
      mapRef.current.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [filteredEmpresas]);

  const empresasSemCoordenadas = empresas.filter(e => 
    !e.latitude && !e.longitude && (e.endereco || e.cidade)
  ).length;

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Filtrar por usuário:</span>
        </div>
        
        <Select value={selectedUsuarioId} onValueChange={setSelectedUsuarioId}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Selecione um usuário" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Todas as empresas
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

        <Button 
          variant="outline" 
          size="sm" 
          onClick={geocodeEmpresas}
          disabled={geocodingInProgress || empresasSemCoordenadas === 0}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${geocodingInProgress ? 'animate-spin' : ''}`} />
          Geocodificar ({empresasSemCoordenadas})
        </Button>

        <div className="flex gap-2">
          <Badge variant="secondary">
            <MapPin className="h-3 w-3 mr-1" />
            {filteredEmpresas.length} no mapa
          </Badge>
          <Badge variant="outline">
            Total: {empresas.length} empresas
          </Badge>
        </div>
      </div>

      {/* Mapa */}
      <Card>
        <CardContent className="p-0">
          <div 
            ref={mapContainerRef} 
            className="w-full h-[500px] rounded-lg"
            style={{ zIndex: 0 }}
          />
        </CardContent>
      </Card>

      {loading && (
        <div className="text-center text-muted-foreground">
          Carregando dados...
        </div>
      )}
    </div>
  );
};

export default MapaClientesView;
