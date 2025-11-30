import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { VeiculoComStatus } from '@/types/logistica';
import { ParadaMarcada } from '@/types/automacaoLogistica';

// Fix leaflet default icon issue
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const createVeiculoIcon = (status: string) => {
  const color = status === 'movendo' ? '#22c55e' : status === 'parado' ? '#eab308' : '#6b7280';
  return L.divIcon({
    className: 'custom-vehicle-icon',
    html: `<div style="background-color: ${color}; width: 24px; height: 24px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
};

// Ícones para paradas marcadas baseado na categoria de tempo
const createParadaIcon = (categoria: '10_20' | '21_30' | 'mais_30') => {
  const colors: Record<string, { bg: string; border: string; pulse: string }> = {
    '10_20': { bg: '#eab308', border: '#ca8a04', pulse: 'rgba(234, 179, 8, 0.4)' },     // Amarelo
    '21_30': { bg: '#f97316', border: '#ea580c', pulse: 'rgba(249, 115, 22, 0.4)' },    // Laranja
    'mais_30': { bg: '#dc2626', border: '#b91c1c', pulse: 'rgba(220, 38, 38, 0.4)' },   // Vermelho
  };
  
  const color = colors[categoria] || colors['10_20'];
  
  return L.divIcon({
    className: 'custom-parada-icon',
    html: `
      <div style="position: relative;">
        <div style="
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 32px;
          height: 32px;
          background-color: ${color.pulse};
          border-radius: 50%;
          animation: paradaPulse 2s infinite;
        "></div>
        <div style="
          position: relative;
          background-color: ${color.bg};
          width: 20px;
          height: 20px;
          border-radius: 50%;
          border: 3px solid ${color.border};
          box-shadow: 0 2px 6px rgba(0,0,0,0.4);
          display: flex;
          align-items: center;
          justify-content: center;
        ">
          <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
            <rect x="6" y="4" width="4" height="16"/>
            <rect x="14" y="4" width="4" height="16"/>
          </svg>
        </div>
      </div>
      <style>
        @keyframes paradaPulse {
          0% { transform: translate(-50%, -50%) scale(0.8); opacity: 1; }
          100% { transform: translate(-50%, -50%) scale(1.5); opacity: 0; }
        }
      </style>
    `,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  });
};

// Função para obter label da categoria
const getCategoriaLabel = (categoria: '10_20' | '21_30' | 'mais_30') => {
  const labels: Record<string, string> = {
    '10_20': '10-20 minutos',
    '21_30': '21-30 minutos',
    'mais_30': 'Mais de 30 minutos',
  };
  return labels[categoria] || categoria;
};

interface RouteData {
  coordinates: Array<{ lat: number; lng: number }>;
  color?: string;
  distance?: number;
  duration?: number;
}

interface LogisticaMapInternalProps {
  veiculos?: VeiculoComStatus[];
  routes?: RouteData[];
  paradasMarcadas?: ParadaMarcada[];
  center?: [number, number];
  zoom?: number;
  onVeiculoClick?: (veiculo: VeiculoComStatus) => void;
  onParadaClick?: (parada: ParadaMarcada) => void;
  className?: string;
  fitBounds?: boolean;
}

const LogisticaMapInternal: React.FC<LogisticaMapInternalProps> = ({
  veiculos = [],
  routes = [],
  paradasMarcadas = [],
  center = [-15.7801, -47.9292],
  zoom = 4,
  onVeiculoClick,
  onParadaClick,
  className = 'h-full w-full',
  fitBounds = true,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());
  const paradasMarkersRef = useRef<Map<string, L.Marker>>(new Map());
  const routeLayersRef = useRef<L.Polyline[]>([]);

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    mapRef.current = L.map(mapContainerRef.current).setView(center, zoom);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(mapRef.current);

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Update markers when veiculos change
  useEffect(() => {
    if (!mapRef.current) return;

    const map = mapRef.current;
    const currentMarkers = markersRef.current;
    const veiculosComPosicao = veiculos.filter(v => v.ultima_posicao);

    // Remove markers that no longer exist
    const currentIds = new Set(veiculosComPosicao.map(v => v.id));
    currentMarkers.forEach((marker, id) => {
      if (!currentIds.has(id)) {
        marker.remove();
        currentMarkers.delete(id);
      }
    });

    // Add or update markers
    veiculosComPosicao.forEach(veiculo => {
      const pos: L.LatLngExpression = [veiculo.ultima_posicao!.lat, veiculo.ultima_posicao!.lng];
      const existingMarker = currentMarkers.get(veiculo.id);

      if (existingMarker) {
        existingMarker.setLatLng(pos);
        existingMarker.setIcon(createVeiculoIcon(veiculo.status));
      } else {
        const marker = L.marker(pos, { icon: createVeiculoIcon(veiculo.status) })
          .addTo(map)
          .bindPopup(`
            <div class="text-sm">
              <p class="font-bold">${veiculo.placa}</p>
              <p>${veiculo.descricao || 'Sem descrição'}</p>
              <p>Velocidade: ${veiculo.ultima_posicao?.velocidade || 0} km/h</p>
            </div>
          `);

        marker.on('click', () => {
          onVeiculoClick?.(veiculo);
        });

        currentMarkers.set(veiculo.id, marker);
      }
    });

    // Collect all points for bounds
    const allPoints: L.LatLngExpression[] = veiculosComPosicao.map(v => 
      [v.ultima_posicao!.lat, v.ultima_posicao!.lng] as L.LatLngExpression
    );
    
    routes.forEach(route => {
      route.coordinates.forEach(coord => {
        allPoints.push([coord.lat, coord.lng]);
      });
    });

    paradasMarcadas.forEach(parada => {
      allPoints.push([parada.lat, parada.lng]);
    });

    // Fit bounds if enabled
    if (fitBounds && allPoints.length > 0) {
      const bounds = L.latLngBounds(allPoints);
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [veiculos, fitBounds, onVeiculoClick, routes, paradasMarcadas]);

  // Update paradas marcadas markers
  useEffect(() => {
    if (!mapRef.current) return;

    const map = mapRef.current;
    const currentParadasMarkers = paradasMarkersRef.current;

    // Remove markers that no longer exist
    const currentIds = new Set(paradasMarcadas.map(p => p.id));
    currentParadasMarkers.forEach((marker, id) => {
      if (!currentIds.has(id)) {
        marker.remove();
        currentParadasMarkers.delete(id);
      }
    });

    // Add or update paradas markers
    paradasMarcadas.forEach(parada => {
      const pos: L.LatLngExpression = [parada.lat, parada.lng];
      const existingMarker = currentParadasMarkers.get(parada.id);

      if (existingMarker) {
        existingMarker.setLatLng(pos);
      } else {
        const marker = L.marker(pos, { 
          icon: createParadaIcon(parada.categoria_tempo),
          zIndexOffset: 1000 // Paradas ficam acima dos veículos
        })
          .addTo(map)
          .bindPopup(`
            <div class="text-sm p-1">
              <p class="font-bold text-red-600">⚠️ Veículo Parado</p>
              <p><strong>Placa:</strong> ${parada.veiculo?.placa || 'N/A'}</p>
              <p><strong>Tempo:</strong> ${getCategoriaLabel(parada.categoria_tempo)}</p>
              <p><strong>Duração:</strong> ${parada.tempo_parado_minutos} min</p>
              <p><strong>Início:</strong> ${new Date(parada.data_inicio).toLocaleString('pt-BR')}</p>
              ${parada.data_fim ? `<p><strong>Fim:</strong> ${new Date(parada.data_fim).toLocaleString('pt-BR')}</p>` : '<p class="text-orange-600"><strong>Status:</strong> Em andamento</p>'}
            </div>
          `);

        marker.on('click', () => {
          onParadaClick?.(parada);
        });

        currentParadasMarkers.set(parada.id, marker);
      }
    });
  }, [paradasMarcadas, onParadaClick]);

  // Update routes
  useEffect(() => {
    if (!mapRef.current) return;

    const map = mapRef.current;

    // Remove existing route layers
    routeLayersRef.current.forEach(layer => layer.remove());
    routeLayersRef.current = [];

    // Add new routes
    const allRoutePoints: L.LatLngExpression[] = [];
    
    routes.forEach(route => {
      const positions: L.LatLngExpression[] = route.coordinates.map(c => [c.lat, c.lng]);
      const polyline = L.polyline(positions, {
        color: route.color || '#3b82f6',
        weight: 4,
        opacity: 0.8
      }).addTo(map);
      routeLayersRef.current.push(polyline);
      
      // Collect all points for bounds
      positions.forEach(p => allRoutePoints.push(p));
    });

    // Fit bounds to show all routes
    if (fitBounds && allRoutePoints.length > 0) {
      const bounds = L.latLngBounds(allRoutePoints);
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [routes, fitBounds]);

  return (
    <div ref={mapContainerRef} className={className} />
  );
};

export default LogisticaMapInternal;
