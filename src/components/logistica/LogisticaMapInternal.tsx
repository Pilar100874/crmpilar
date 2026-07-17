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

const createVeiculoIcon = (status: string, compact = false, customColor?: string) => {
  // Se tiver cor customizada, usa ela; senão usa cor do status
  const color = customColor || (status === 'movendo' ? '#22c55e' : status === 'parado' ? '#eab308' : '#6b7280');
  const size = compact ? 14 : 24;
  const borderWidth = compact ? 2 : 3;
  return L.divIcon({
    className: 'custom-vehicle-icon',
    html: `<div style="background-color: ${color}; width: ${size}px; height: ${size}px; border-radius: 50%; border: ${borderWidth}px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
};

// Ícones para paradas marcadas - usa cor e ícone personalizados
const createParadaIcon = (cor: string, iconeName?: string) => {
  // Gera SVG baseado no nome do ícone
  const getIconSvg = (name?: string) => {
    const icons: Record<string, string> = {
      'MapPin': '<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>',
      'Car': '<path d="M14 16H9m10 0h3v-3.15a1 1 0 0 0-.84-.99L16 11l-2.7-3.6a1 1 0 0 0-.8-.4H5.24a2 2 0 0 0-1.8 1.1l-.8 1.63A6 6 0 0 0 2 12.42V16h2"/><circle cx="6.5" cy="16.5" r="2.5"/><circle cx="16.5" cy="16.5" r="2.5"/>',
      'Truck': '<path d="M5 18H3c-.6 0-1-.4-1-1V7c0-.6.4-1 1-1h10c.6 0 1 .4 1 1v11"/><path d="M14 9h4l4 4v4c0 .6-.4 1-1 1h-2"/><circle cx="7" cy="18" r="2"/><path d="M15 18H9"/><circle cx="17" cy="18" r="2"/>',
      'Clock': '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
      'Pause': '<rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>',
      'AlertTriangle': '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
      'AlertCircle': '<circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/>',
      'Ban': '<circle cx="12" cy="12" r="10"/><path d="m4.9 4.9 14.2 14.2"/>',
      'Timer': '<line x1="10" x2="14" y1="2" y2="2"/><line x1="12" x2="15" y1="14" y2="11"/><circle cx="12" cy="14" r="8"/>',
      'Flag': '<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" x2="4" y1="22" y2="15"/>',
      'Target': '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>',
      'Star': '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>',
      'Zap': '<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>',
      'Flame': '<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>',
      'Circle': '<circle cx="12" cy="12" r="10"/>',
      'Square': '<rect width="18" height="18" x="3" y="3" rx="2"/>',
    };
    return icons[name || 'Pause'] || icons['Pause'];
  };

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
          background-color: ${cor}40;
          border-radius: 50%;
          animation: paradaPulse 2s infinite;
        "></div>
        <div style="
          position: relative;
          background-color: ${cor};
          width: 24px;
          height: 24px;
          border-radius: 50%;
          border: 3px solid white;
          box-shadow: 0 2px 6px rgba(0,0,0,0.4);
          display: flex;
          align-items: center;
          justify-content: center;
        ">
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            ${getIconSvg(iconeName)}
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
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
};

interface RouteData {
  coordinates: Array<{ lat: number; lng: number }>;
  color?: string;
  distance?: number;
  duration?: number;
}

interface CurrentMarker {
  lat: number;
  lng: number;
  color: string;
  label?: string;
}

interface LogisticaMapInternalProps {
  veiculos?: VeiculoComStatus[];
  routes?: RouteData[];
  fullRouteBounds?: Array<{ lat: number; lng: number }>;
  paradasMarcadas?: ParadaMarcada[];
  currentMarker?: CurrentMarker;
  center?: [number, number];
  zoom?: number;
  onVeiculoClick?: (veiculo: VeiculoComStatus) => void;
  onParadaClick?: (parada: ParadaMarcada) => void;
  className?: string;
  fitBounds?: boolean;
  compactIcons?: boolean;
  disableInteraction?: boolean;
  focusVeiculoId?: string;
  focusTrigger?: number;
}

const LogisticaMapInternal: React.FC<LogisticaMapInternalProps> = ({
  veiculos = [],
  routes = [],
  fullRouteBounds,
  paradasMarcadas = [],
  currentMarker,
  center = [-15.7801, -47.9292],
  zoom = 4,
  onVeiculoClick,
  onParadaClick,
  className = 'h-full w-full',
  fitBounds = true,
  compactIcons = false,
  disableInteraction = false,
  focusVeiculoId,
  focusTrigger,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());
  const paradasMarkersRef = useRef<Map<string, L.Marker>>(new Map());
  const routeLayersRef = useRef<L.Polyline[]>([]);
  const currentMarkerRef = useRef<L.Marker | null>(null);

  const initialBoundsFittedRef = useRef(false);

  // Reset initial bounds flag when fullRouteBounds changes (new data loaded)
  useEffect(() => {
    initialBoundsFittedRef.current = false;
  }, [fullRouteBounds?.length]);

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const mapOptions: L.MapOptions = {
      zoomControl: !disableInteraction,
      scrollWheelZoom: !disableInteraction,
      doubleClickZoom: !disableInteraction,
      touchZoom: !disableInteraction,
      dragging: !disableInteraction,
      keyboard: !disableInteraction,
      boxZoom: !disableInteraction,
    };

    mapRef.current = L.map(mapContainerRef.current, mapOptions).setView(center, zoom);

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

  // Fit to full route bounds on initial load (for timeline preview)
  useEffect(() => {
    if (!mapRef.current || !fullRouteBounds || fullRouteBounds.length === 0) return;
    if (initialBoundsFittedRef.current) return;

    const bounds = L.latLngBounds(fullRouteBounds.map(c => [c.lat, c.lng] as L.LatLngExpression));
    mapRef.current.fitBounds(bounds, { padding: [50, 50] });
    initialBoundsFittedRef.current = true;
  }, [fullRouteBounds]);

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
        existingMarker.setIcon(createVeiculoIcon(veiculo.status, compactIcons, veiculo.cor));
      } else {
        const marker = L.marker(pos, { icon: createVeiculoIcon(veiculo.status, compactIcons, veiculo.cor) })
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
  }, [veiculos, fitBounds, onVeiculoClick, routes, paradasMarcadas, compactIcons]);

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
      const cor = parada.cor_icone_parada || '#EAB308';
      const icone = parada.icone_parada || 'Pause';
      const legenda = parada.legenda_parada || 'Veículo Parado';

      if (existingMarker) {
        // Update position and icon
        existingMarker.setLatLng(pos);
        existingMarker.setIcon(createParadaIcon(cor, icone));
        // Update popup content
        existingMarker.setPopupContent(`
          <div class="text-sm p-1">
            <p class="font-bold" style="color: ${cor}">⚠️ ${legenda}</p>
            <p><strong>Placa:</strong> ${parada.veiculo?.placa || 'N/A'}</p>
            <p><strong>Duração:</strong> ${parada.tempo_parado_minutos} min</p>
            <p><strong>Início:</strong> ${new Date(parada.data_inicio).toLocaleString('pt-BR')}</p>
            ${parada.data_fim ? `<p><strong>Fim:</strong> ${new Date(parada.data_fim).toLocaleString('pt-BR')}</p>` : '<p class="text-orange-600"><strong>Status:</strong> Em andamento</p>'}
          </div>
        `);
      } else {
        const marker = L.marker(pos, { 
          icon: createParadaIcon(cor, icone),
          zIndexOffset: 1000 // Paradas ficam acima dos veículos
        })
          .addTo(map)
          .bindPopup(`
            <div class="text-sm p-1">
              <p class="font-bold" style="color: ${cor}">⚠️ ${legenda}</p>
              <p><strong>Placa:</strong> ${parada.veiculo?.placa || 'N/A'}</p>
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

  // Update current position marker (for timeline)
  useEffect(() => {
    if (!mapRef.current) return;

    const map = mapRef.current;

    // Remove existing current marker
    if (currentMarkerRef.current) {
      currentMarkerRef.current.remove();
      currentMarkerRef.current = null;
    }

    // Add new current marker if provided
    if (currentMarker) {
      const icon = L.divIcon({
        className: 'current-position-marker',
        html: `
          <div style="position: relative;">
            <div style="
              position: absolute;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -50%);
              width: 40px;
              height: 40px;
              background-color: ${currentMarker.color}40;
              border-radius: 50%;
              animation: currentPulse 1.5s infinite;
            "></div>
            <div style="
              position: relative;
              background-color: ${currentMarker.color};
              width: 20px;
              height: 20px;
              border-radius: 50%;
              border: 3px solid white;
              box-shadow: 0 2px 8px rgba(0,0,0,0.4);
            "></div>
          </div>
          <style>
            @keyframes currentPulse {
              0% { transform: translate(-50%, -50%) scale(0.8); opacity: 1; }
              100% { transform: translate(-50%, -50%) scale(2); opacity: 0; }
            }
          </style>
        `,
        iconSize: [20, 20],
        iconAnchor: [10, 10],
      });

      currentMarkerRef.current = L.marker([currentMarker.lat, currentMarker.lng], { 
        icon,
        zIndexOffset: 2000 
      })
        .addTo(map)
        .bindPopup(`
          <div class="text-sm">
            <p class="font-bold">${currentMarker.label || 'Posição atual'}</p>
          </div>
        `);
    }
  }, [currentMarker]);

  return (
    <div ref={mapContainerRef} className={className} />
  );
};

export default LogisticaMapInternal;
