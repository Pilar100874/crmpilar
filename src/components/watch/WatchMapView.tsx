import { useCallback, useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { VeiculoComStatus } from '@/types/logistica';
import { enquadrarNoMapa, boundsDePontos } from '@/lib/mapa/enquadrar';


// Fix for default marker icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Tamanho único para todos os símbolos de marcação
const MARKER_SIZE = 34;
const MARKER_SIZE_COMPACT = 24;

const createVehicleIcon = (status: 'movendo' | 'parado' | 'offline', compact = false, rotulo?: string) => {
  const colors = {
    movendo: '#22c55e',
    parado: '#fbbf24',
    offline: '#6b7280'
  };

  const color = colors[status];
  const size = compact ? MARKER_SIZE_COMPACT : MARKER_SIZE;
  const iconSize = Math.round(size * 0.55);
  const devePulsar = status === 'movendo' || status === 'parado';
  const halo = `<div style="position:absolute; top:50%; left:50%; width:${Math.round(size * 1.9)}px; height:${Math.round(size * 1.9)}px; margin-left:-${Math.round(size * 0.95)}px; margin-top:-${Math.round(size * 0.95)}px; border-radius:50%; background:${color}33; ${devePulsar ? `animation: veiculoPulse ${status === 'movendo' ? '1.8' : '2.2'}s infinite;` : ''}"></div>`;
  const label = rotulo
    ? `<div style="position:absolute; top:50%; left:${size + 5}px; transform:translateY(-50%); white-space:nowrap; font-size:${compact ? 8 : 10}px; font-weight:700; color:#fff; background:rgba(15,23,42,.85); border:1px solid ${color}; padding:0 4px; border-radius:6px; pointer-events:none;">${rotulo}</div>`
    : '';

  return L.divIcon({
    className: 'custom-vehicle-icon',
    html: `
      <div style="position:relative; width:${size}px; height:${size}px;">
        ${halo}
        <div style="
          position:relative;
          width: ${size}px;
          height: ${size}px;
          background: ${color};
          border: 2px solid white;
          border-radius: 50%;
          box-shadow: 0 0 0 2px ${color}66, 0 2px 8px rgba(0,0,0,0.45);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 2;
        ">
          <svg width="${iconSize}" height="${iconSize}" viewBox="0 0 24 24" fill="white">
            <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/>
          </svg>
        </div>
        ${label}
      </div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2]
  });
};

interface WatchMapViewProps {
  veiculos: VeiculoComStatus[];
  selectedVeiculoId: string | null;
  onVeiculoClick?: (id: string) => void;
  compact?: boolean;
}

const WatchMapView = ({ veiculos, onVeiculoClick, compact = false }: WatchMapViewProps) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());
  const ultimoBoundsRef = useRef<L.LatLngBounds | null>(null);
  const iconSigRef = useRef<Map<string, string>>(new Map());
  const ultimoEnquadramentoRef = useRef<string>('');

  const [autoPausado, setAutoPausado] = useState(false);
  const autoPausadoRef = useRef(false);
  const movimentoProgramaticoRef = useRef(false);

  const pausarAuto = useCallback(() => {
    if (autoPausadoRef.current) return;
    autoPausadoRef.current = true;
    setAutoPausado(true);
  }, []);

  const enquadrarTudo = useCallback((forcar = false) => {
    const map = mapRef.current;
    const bounds = ultimoBoundsRef.current;
    if (!map || !bounds || autoPausadoRef.current) return;
    const sig = [
      bounds.getSouth().toFixed(4),
      bounds.getWest().toFixed(4),
      bounds.getNorth().toFixed(4),
      bounds.getEast().toFixed(4),
      Math.round(map.getSize().x),
      Math.round(map.getSize().y),
    ].join('|');
    if (!forcar && sig === ultimoEnquadramentoRef.current) return;
    ultimoEnquadramentoRef.current = sig;
    movimentoProgramaticoRef.current = true;
    enquadrarNoMapa(map, bounds, {
      paddingTopLeft: [8, 8],
      paddingBottomRight: [8, 8],
      maxZoom: 18,
      zoomPontoUnico: 16,
    });
    window.setTimeout(() => { movimentoProgramaticoRef.current = false; }, 500);
  }, []);


  const retomarAuto = useCallback(() => {
    autoPausadoRef.current = false;
    setAutoPausado(false);
    requestAnimationFrame(() => {
      mapRef.current?.invalidateSize({ animate: false });
      enquadrarTudo(true);
    });
  }, [enquadrarTudo]);


  const validVeiculos = veiculos.filter(v => v.ultima_posicao);
  const defaultCenter: [number, number] = validVeiculos.length > 0 
    ? [validVeiculos[0].ultima_posicao!.lat, validVeiculos[0].ultima_posicao!.lng]
    : [-23.5505, -46.6333];

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current, {
      zoomControl: false,
      attributionControl: false,
      zoomSnap: 0,
      zoomDelta: 0.5
    }).setView(defaultCenter, 13);
    mapRef.current = map;


    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

    const aoInteragir = () => {
      if (movimentoProgramaticoRef.current) return;
      pausarAuto();
    };
    map.on('dragstart', aoInteragir);
    map.on('zoomstart', aoInteragir);
    map.on('mousedown', aoInteragir);
    const el = mapContainerRef.current;
    el.addEventListener('wheel', aoInteragir, { passive: true });
    el.addEventListener('touchstart', aoInteragir, { passive: true });

    return () => {
      el.removeEventListener('wheel', aoInteragir);
      el.removeEventListener('touchstart', aoInteragir);
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [pausarAuto]);

  // Update markers when veiculos change
  useEffect(() => {
    if (!mapRef.current) return;

    const map = mapRef.current;
    const currentMarkers = markersRef.current;

    // Remove markers that no longer exist
    const currentIds = new Set(validVeiculos.map(v => v.id));
    currentMarkers.forEach((marker, id) => {
      if (!currentIds.has(id)) {
        marker.remove();
        currentMarkers.delete(id);
        iconSigRef.current.delete(id);
      }
    });

    // Add or update markers
    validVeiculos.forEach(veiculo => {
      const pos: L.LatLngExpression = [veiculo.ultima_posicao!.lat, veiculo.ultima_posicao!.lng];
      const existingMarker = currentMarkers.get(veiculo.id);
      const sig = `${veiculo.status}~${compact ? 'c' : 'n'}~${veiculo.placa || ''}`;

      if (existingMarker) {
        const atual = existingMarker.getLatLng();
        if (Math.abs(atual.lat - veiculo.ultima_posicao!.lat) > 1e-7 || Math.abs(atual.lng - veiculo.ultima_posicao!.lng) > 1e-7) {
          existingMarker.setLatLng(pos);
        }
        if (iconSigRef.current.get(veiculo.id) !== sig) {
          existingMarker.setIcon(createVehicleIcon(veiculo.status, compact, veiculo.placa));
          iconSigRef.current.set(veiculo.id, sig);
        }
      } else {
        iconSigRef.current.set(veiculo.id, sig);
        const marker = L.marker(pos, { icon: createVehicleIcon(veiculo.status, compact, veiculo.placa), riseOnHover: true })
          .addTo(map)
          .bindPopup(`

            <div style="font-size: 10px; line-height: 1.2; min-width: 80px;">
              <strong>${veiculo.placa}</strong>
              ${veiculo.motorista ? `<br/>${veiculo.motorista}` : ''}
              <br/>${Math.round(veiculo.ultima_posicao!.velocidade)} km/h
            </div>
          `);

        marker.on('click', () => {
          pausarAuto();
          onVeiculoClick?.(veiculo.id);
        });

        currentMarkers.set(veiculo.id, marker);
      }
    });

    // Mantém todos os veículos centralizados com o maior zoom possível
    ultimoBoundsRef.current = boundsDePontos(
      validVeiculos.map(v => [v.ultima_posicao!.lat, v.ultima_posicao!.lng] as [number, number])
    );
    enquadrarTudo();

  }, [veiculos, onVeiculoClick, compact, enquadrarTudo, pausarAuto]);

  // Reenquadra automaticamente após qualquer mudança de tamanho do container
  useEffect(() => {
    const el = mapContainerRef.current;
    if (!el) return;

    let frame: number | null = null;
    const reenquadrar = () => {
      if (frame !== null) cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        frame = null;
        enquadrarTudo();
      });
    };

    const observer = new ResizeObserver(reenquadrar);
    observer.observe(el);
    window.addEventListener('resize', reenquadrar);
    window.addEventListener('orientationchange', reenquadrar);
    reenquadrar();

    return () => {
      if (frame !== null) cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener('resize', reenquadrar);
      window.removeEventListener('orientationchange', reenquadrar);
    };
  }, [enquadrarTudo]);


  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }} />
      {autoPausado && (
        <button
          type="button"
          onClick={retomarAuto}
          style={{
            position: 'absolute',
            bottom: '18%',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 500,
            fontSize: 10,
            fontWeight: 600,
            color: '#fff',
            background: 'rgba(0,0,0,.75)',
            border: '1px solid rgba(255,255,255,.25)',
            borderRadius: 12,
            padding: '3px 10px',
          }}
        >
          Retomar auto-zoom
        </button>
      )}
      <style>{`
        @keyframes veiculoPulse {
          0% { transform: scale(0.75); opacity: .9; }
          100% { transform: scale(1.35); opacity: 0; }
        }
        .leaflet-container {
          background: #1a1a2e;
        }
        .leaflet-popup-content-wrapper {
          border-radius: 8px;
          padding: 2px;
        }
        .leaflet-popup-content {
          margin: 6px 8px;
        }
      `}</style>
    </div>
  );
};

export default WatchMapView;
