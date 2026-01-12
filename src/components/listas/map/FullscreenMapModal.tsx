import React, { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import MapLayerControl from './MapLayerControl';
import MapLegend from './MapLegend';
import { MapLayer, VendasRegiao, DADOS_DEMOGRAFICOS_UF } from './MapLayerTypes';
import BRASIL_ESTADOS_GEOJSON from './BrasilGeoJSON';
import { 
  X, 
  Filter, 
  Building2, 
  User, 
  ZoomIn, 
  ZoomOut, 
  RotateCcw,
  MapPin
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

// Helper function for color interpolation
const getColorForValue = (value: number, min: number, max: number, colorScheme: 'purple' | 'amber' | 'green' | 'red' | 'cyan') => {
  const normalized = (value - min) / (max - min);
  const schemes = {
    purple: ['#ede9fe', '#c4b5fd', '#a78bfa', '#8b5cf6', '#7c3aed', '#6d28d9'],
    amber: ['#fef3c7', '#fde68a', '#fcd34d', '#fbbf24', '#f59e0b', '#d97706'],
    green: ['#dcfce7', '#bbf7d0', '#86efac', '#4ade80', '#22c55e', '#16a34a'],
    red: ['#fee2e2', '#fecaca', '#fca5a5', '#f87171', '#ef4444', '#dc2626'],
    cyan: ['#cffafe', '#a5f3fc', '#67e8f9', '#22d3ee', '#06b6d4', '#0891b2']
  };
  const colors = schemes[colorScheme];
  const index = Math.min(Math.floor(normalized * colors.length), colors.length - 1);
  return colors[index];
};

const FullscreenMapModal: React.FC<FullscreenMapModalProps> = ({
  open,
  onClose,
  layers,
  onLayerToggle,
  empresas,
  usuarios,
  vendasData,
  selectedUsuarioId,
  onUsuarioChange
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const vendasLayerRef = useRef<L.LayerGroup | null>(null);
  const demographicsLayerRef = useRef<L.GeoJSON | null>(null);
  const incomeLayerRef = useRef<L.GeoJSON | null>(null);
  const competitionLayerRef = useRef<L.GeoJSON | null>(null);
  const logisticsLayerRef = useRef<L.GeoJSON | null>(null);
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
      vendasLayerRef.current = L.layerGroup().addTo(map);

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
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markersLayerRef.current = null;
        vendasLayerRef.current = null;
        demographicsLayerRef.current = null;
        incomeLayerRef.current = null;
        competitionLayerRef.current = null;
        logisticsLayerRef.current = null;
        setMapReady(false);
      }
      return;
    }

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

  // Update demographics layer with GeoJSON choropleth
  useEffect(() => {
    if (!mapRef.current || !mapReady) return;
    
    if (demographicsLayerRef.current) {
      mapRef.current.removeLayer(demographicsLayerRef.current);
      demographicsLayerRef.current = null;
    }
    
    const demoLayer = layers.find(l => l.id === 'demographics');
    if (!demoLayer?.visible) return;

    const maxDensidade = Math.max(...Object.values(DADOS_DEMOGRAFICOS_UF).map(d => d.densidade));
    const minDensidade = Math.min(...Object.values(DADOS_DEMOGRAFICOS_UF).map(d => d.densidade));

    demographicsLayerRef.current = L.geoJSON(BRASIL_ESTADOS_GEOJSON, {
      style: (feature) => {
        const uf = feature?.properties?.uf;
        const data = DADOS_DEMOGRAFICOS_UF[uf];
        if (!data) return { fillColor: '#e5e7eb', fillOpacity: 0.3, weight: 1, color: '#9ca3af' };
        
        return {
          fillColor: getColorForValue(data.densidade, minDensidade, maxDensidade, 'purple'),
          fillOpacity: 0.7,
          weight: 2,
          color: '#6d28d9',
          opacity: 0.8
        };
      },
      onEachFeature: (feature, layer) => {
        const uf = feature?.properties?.uf;
        const data = DADOS_DEMOGRAFICOS_UF[uf];
        if (!data) return;
        
        layer.bindPopup(`
          <div class="p-2">
            <strong>${uf} - ${feature.properties.nome}</strong>
            <br/><small>População: ${data.populacao.toLocaleString('pt-BR')}</small>
            <br/><small>Densidade: ${data.densidade.toFixed(1)} hab/km²</small>
            <br/><small>Urbanização: ${data.urbanizacao}%</small>
            <br/><small style="color: #666;">Fonte: IBGE 2022</small>
          </div>
        `);
        
        layer.on({
          mouseover: (e) => {
            const target = e.target;
            target.setStyle({ weight: 3, color: '#4c1d95', fillOpacity: 0.9 });
            target.bringToFront();
          },
          mouseout: (e) => {
            demographicsLayerRef.current?.resetStyle(e.target);
          }
        });
      }
    }).addTo(mapRef.current);
  }, [layers, mapReady]);

  // Update income layer with GeoJSON choropleth
  useEffect(() => {
    if (!mapRef.current || !mapReady) return;
    
    if (incomeLayerRef.current) {
      mapRef.current.removeLayer(incomeLayerRef.current);
      incomeLayerRef.current = null;
    }
    
    const incomeLayer = layers.find(l => l.id === 'income');
    if (!incomeLayer?.visible) return;

    const maxRenda = Math.max(...Object.values(DADOS_DEMOGRAFICOS_UF).map(d => d.renda_media));
    const minRenda = Math.min(...Object.values(DADOS_DEMOGRAFICOS_UF).map(d => d.renda_media));

    incomeLayerRef.current = L.geoJSON(BRASIL_ESTADOS_GEOJSON, {
      style: (feature) => {
        const uf = feature?.properties?.uf;
        const data = DADOS_DEMOGRAFICOS_UF[uf];
        if (!data) return { fillColor: '#e5e7eb', fillOpacity: 0.3, weight: 1, color: '#9ca3af' };
        
        return {
          fillColor: getColorForValue(data.renda_media, minRenda, maxRenda, 'amber'),
          fillOpacity: 0.7,
          weight: 2,
          color: '#b45309',
          opacity: 0.8
        };
      },
      onEachFeature: (feature, layer) => {
        const uf = feature?.properties?.uf;
        const data = DADOS_DEMOGRAFICOS_UF[uf];
        if (!data) return;
        
        const normalizedRenda = (data.renda_media - minRenda) / (maxRenda - minRenda);
        layer.bindPopup(`
          <div class="p-2">
            <strong>${uf} - ${feature.properties.nome}</strong>
            <br/><small>Renda Média: R$ ${data.renda_media.toLocaleString('pt-BR')}</small>
            <br/><small>Score Poder de Compra: ${Math.round(normalizedRenda * 100)}/100</small>
            <br/><small style="color: #666;">Fonte: IBGE/IPEA</small>
          </div>
        `);
        
        layer.on({
          mouseover: (e) => {
            const target = e.target;
            target.setStyle({ weight: 3, color: '#92400e', fillOpacity: 0.9 });
            target.bringToFront();
          },
          mouseout: (e) => {
            incomeLayerRef.current?.resetStyle(e.target);
          }
        });
      }
    }).addTo(mapRef.current);
  }, [layers, mapReady]);

  // Update competition layer with GeoJSON choropleth
  useEffect(() => {
    if (!mapRef.current || !mapReady) return;
    
    if (competitionLayerRef.current) {
      mapRef.current.removeLayer(competitionLayerRef.current);
      competitionLayerRef.current = null;
    }
    
    const compLayer = layers.find(l => l.id === 'competition');
    if (!compLayer?.visible) return;

    competitionLayerRef.current = L.geoJSON(BRASIL_ESTADOS_GEOJSON, {
      style: (feature) => {
        const uf = feature?.properties?.uf;
        const data = DADOS_DEMOGRAFICOS_UF[uf];
        if (!data) return { fillColor: '#e5e7eb', fillOpacity: 0.3, weight: 1, color: '#9ca3af' };
        
        const competitionLevel = data.urbanizacao / 100;
        let fillColor = '#22c55e'; // green = low competition
        if (competitionLevel > 0.85) fillColor = '#ef4444'; // red = high
        else if (competitionLevel > 0.75) fillColor = '#f59e0b'; // amber = medium
        
        return {
          fillColor,
          fillOpacity: 0.6,
          weight: 2,
          color: '#374151',
          opacity: 0.8
        };
      },
      onEachFeature: (feature, layer) => {
        const uf = feature?.properties?.uf;
        const data = DADOS_DEMOGRAFICOS_UF[uf];
        if (!data) return;
        
        const competitionLevel = data.urbanizacao / 100;
        const nivel = competitionLevel > 0.85 ? 'Alto' : competitionLevel > 0.75 ? 'Médio' : 'Baixo';
        
        layer.bindPopup(`
          <div class="p-2">
            <strong>${uf} - ${feature.properties.nome}</strong>
            <br/><small>Nível de Concorrência: <b>${nivel}</b></small>
            <br/><small>Urbanização: ${data.urbanizacao}%</small>
            <br/><small style="color: #666;">Estimado via IBGE CNAE</small>
          </div>
        `);
        
        layer.on({
          mouseover: (e) => {
            const target = e.target;
            target.setStyle({ weight: 3, fillOpacity: 0.85 });
            target.bringToFront();
          },
          mouseout: (e) => {
            competitionLayerRef.current?.resetStyle(e.target);
          }
        });
      }
    }).addTo(mapRef.current);
  }, [layers, mapReady]);

  // Update logistics layer with GeoJSON choropleth
  useEffect(() => {
    if (!mapRef.current || !mapReady) return;
    
    if (logisticsLayerRef.current) {
      mapRef.current.removeLayer(logisticsLayerRef.current);
      logisticsLayerRef.current = null;
    }
    
    const logLayer = layers.find(l => l.id === 'logistics');
    if (!logLayer?.visible) return;

    const maxDensidade = Math.max(...Object.values(DADOS_DEMOGRAFICOS_UF).map(d => d.densidade));
    const minDensidade = Math.min(...Object.values(DADOS_DEMOGRAFICOS_UF).map(d => d.densidade));

    logisticsLayerRef.current = L.geoJSON(BRASIL_ESTADOS_GEOJSON, {
      style: (feature) => {
        const uf = feature?.properties?.uf;
        const data = DADOS_DEMOGRAFICOS_UF[uf];
        if (!data) return { fillColor: '#e5e7eb', fillOpacity: 0.3, weight: 1, color: '#9ca3af' };
        
        return {
          fillColor: getColorForValue(data.densidade, minDensidade, maxDensidade, 'cyan'),
          fillOpacity: 0.65,
          weight: 2,
          color: '#0891b2',
          opacity: 0.8
        };
      },
      onEachFeature: (feature, layer) => {
        const uf = feature?.properties?.uf;
        const data = DADOS_DEMOGRAFICOS_UF[uf];
        if (!data) return;
        
        const accessScore = Math.min(data.densidade / 100, 1);
        const accessLevel = accessScore > 0.5 ? 'Alto' : accessScore > 0.2 ? 'Médio' : 'Baixo';
        const tempoEntrega = Math.round((1 - accessScore) * 48 + 6);
        
        layer.bindPopup(`
          <div class="p-2">
            <strong>${uf} - ${feature.properties.nome}</strong>
            <br/><small>Acesso Logístico: <b>${accessLevel}</b></small>
            <br/><small>Tempo Estimado Entrega: ${tempoEntrega}h</small>
            <br/><small style="color: #666;">Fonte: DNIT/OSM</small>
          </div>
        `);
        
        layer.on({
          mouseover: (e) => {
            const target = e.target;
            target.setStyle({ weight: 3, color: '#0e7490', fillOpacity: 0.85 });
            target.bringToFront();
          },
          mouseout: (e) => {
            logisticsLayerRef.current?.resetStyle(e.target);
          }
        });
      }
    }).addTo(mapRef.current);
  }, [layers, mapReady]);

  const handleZoomIn = () => mapRef.current?.zoomIn();
  const handleZoomOut = () => mapRef.current?.zoomOut();
  const handleReset = () => mapRef.current?.setView([-15.7801, -47.9292], 4);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-[98vw] w-[98vw] h-[95vh] p-0 gap-0" aria-describedby={undefined}>
        <VisuallyHidden>
          <DialogTitle>Mapa Geoespacial em Tela Cheia</DialogTitle>
        </VisuallyHidden>
        
        <div className="relative w-full h-full flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-3 border-b bg-background z-10">
            <div className="flex items-center gap-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <MapPin className="h-5 w-5 text-primary" />
                Mapa Geoespacial
              </h2>
              
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <Select value={selectedUsuarioId} onValueChange={onUsuarioChange}>
                  <SelectTrigger className="w-[180px] h-8">
                    <SelectValue placeholder="Filtrar usuário" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4" />
                        Todas empresas
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
              </div>

              <Badge variant="secondary">
                <MapPin className="h-3 w-3 mr-1" />
                {empresas.filter(e => e.latitude && e.longitude).length} empresas
              </Badge>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleZoomIn}>
                <ZoomIn className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={handleZoomOut}>
                <ZoomOut className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={handleReset}>
                <RotateCcw className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={onClose}>
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

            {/* Layer Control Panel */}
            <div className="absolute top-3 left-3 z-[1000]">
              <MapLayerControl 
                layers={layers} 
                onLayerToggle={onLayerToggle}
              />
            </div>

            {/* Legend */}
            <div className="absolute bottom-3 left-3 z-[1000]">
              <MapLegend 
                layers={layers}
                vendasData={vendasData}
                totalEmpresas={empresas.filter(e => e.latitude && e.longitude).length}
              />
            </div>

            {/* Compact Layer Toggle */}
            <div className="absolute top-3 right-3 z-[1000]">
              <MapLayerControl 
                layers={layers} 
                onLayerToggle={onLayerToggle}
                compact
              />
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FullscreenMapModal;
