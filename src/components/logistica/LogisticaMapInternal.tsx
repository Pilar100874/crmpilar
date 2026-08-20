import React, { useCallback, useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { VeiculoComStatus } from '@/types/logistica';
import { ParadaMarcada } from '@/types/automacaoLogistica';
import { enquadrarNoMapa } from '@/lib/mapa/enquadrar';
import { Crosshair } from 'lucide-react';


// Fix leaflet default icon issue
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// SVG paths (lucide) para cada tipo de veículo
const TIPO_ICON_SVG: Record<string, string> = {
  'pessoa': '<circle cx="12" cy="7" r="4"/><path d="M5.5 21a6.5 6.5 0 0 1 13 0"/>',
  'celular': '<rect width="14" height="20" x="5" y="2" rx="2"/><path d="M12 18h.01"/>',
  'carro': '<path d="M14 16H9m10 0h3v-3.15a1 1 0 0 0-.84-.99L16 11l-2.7-3.6a1 1 0 0 0-.8-.4H5.24a2 2 0 0 0-1.8 1.1l-.8 1.63A6 6 0 0 0 2 12.42V16h2"/><circle cx="6.5" cy="16.5" r="2.5"/><circle cx="16.5" cy="16.5" r="2.5"/>',
  'van': '<path d="M10 17h4V5H2v12h3"/><path d="M20 17h2v-3.34a4 4 0 0 0-1.17-2.83L19 9h-5"/><path d="M14 17h1"/><circle cx="7.5" cy="17.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/>',
  'caminhão leve': '<path d="M5 18H3c-.6 0-1-.4-1-1V7c0-.6.4-1 1-1h10c.6 0 1 .4 1 1v11"/><path d="M14 9h4l4 4v4c0 .6-.4 1-1 1h-2"/><circle cx="7" cy="18" r="2"/><path d="M15 18H9"/><circle cx="17" cy="18" r="2"/>',
  'caminhão médio': '<path d="M5 18H3c-.6 0-1-.4-1-1V7c0-.6.4-1 1-1h10c.6 0 1 .4 1 1v11"/><path d="M14 9h4l4 4v4c0 .6-.4 1-1 1h-2"/><circle cx="7" cy="18" r="2"/><path d="M15 18H9"/><circle cx="17" cy="18" r="2"/>',
  'caminhão pesado': '<path d="M5 18H3c-.6 0-1-.4-1-1V7c0-.6.4-1 1-1h10c.6 0 1 .4 1 1v11"/><path d="M14 9h4l4 4v4c0 .6-.4 1-1 1h-2"/><circle cx="7" cy="18" r="2"/><path d="M15 18H9"/><circle cx="17" cy="18" r="2"/>',
  'moto': '<circle cx="5.5" cy="17.5" r="3.5"/><circle cx="18.5" cy="17.5" r="3.5"/><path d="M15 6a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm-3 11.5V14l-3-3 4-3 2 3h2"/>',
  'bicicleta': '<circle cx="18.5" cy="17.5" r="3.5"/><circle cx="5.5" cy="17.5" r="3.5"/><circle cx="15" cy="5" r="1"/><path d="M12 17.5V14l-3-3 5-1 2 3h2"/>',
  'outro': '',
};

const getTipoIconSvg = (tipo?: string) => {
  if (!tipo) return '';
  return TIPO_ICON_SVG[tipo.toLowerCase()] ?? '';
};

// Tamanho único para TODOS os símbolos de marcação do mapa
const MARKER_SIZE = 34;
const MARKER_SIZE_COMPACT = 24;
const tamanhoMarcador = (compact = false) => (compact ? MARKER_SIZE_COMPACT : MARKER_SIZE);

interface TempoParadoInfo {
  texto: string;
  cor: string;
  piscar: boolean;
}

interface EnderecoParadoInfo {
  texto: string;
  cor: string;
}

const createVeiculoIcon = (
  status: string,
  compact = false,
  customColor?: string,
  tipoVeiculo?: string,
  ignicao?: boolean | null,
  rotulo?: string,
  tempoParado?: TempoParadoInfo | null,
  enderecoParado?: EnderecoParadoInfo | null,
  labelLado: 'left' | 'right' = 'right',
  labelDeslocY = 0,
) => {
  // Se tiver cor customizada, usa ela; senão usa cor do status
  const color = customColor || (status === 'movendo' ? '#22c55e' : status === 'parado' ? '#eab308' : '#6b7280');
  const size = tamanhoMarcador(compact);
  const borderWidth = compact ? 2 : 3;
  const iconSize = Math.round(size * 0.55);
  const svgPath = getTipoIconSvg(tipoVeiculo);
  const inner = svgPath
    ? `<svg xmlns="http://www.w3.org/2000/svg" width="${iconSize}" height="${iconSize}" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">${svgPath}</svg>`
    : '';
  const badgeSize = compact ? 9 : 12;
  const ignBadge = typeof ignicao === 'boolean'
    ? `<div title="${ignicao ? 'Ignição ligada' : 'Ignição desligada'}" style="position:absolute; top:-2px; right:-2px; width:${badgeSize}px; height:${badgeSize}px; border-radius:50%; border:1.5px solid white; background:${ignicao ? '#059669' : '#9ca3af'}; display:flex; align-items:center; justify-content:center; font-size:${badgeSize - 4}px; line-height:1; color:white; z-index:3;">${ignicao ? '&#9679;' : ''}</div>`
    : '';
  // Halo pulsante para realçar o veículo no mapa (movendo e parado com mesmo tamanho visual)
  const devePulsar = status === 'movendo' || status === 'parado';
  const halo = `<div style="position:absolute; top:50%; left:50%; width:${Math.round(size * 1.9)}px; height:${Math.round(size * 1.9)}px; margin-left:-${Math.round(size * 0.95)}px; margin-top:-${Math.round(size * 0.95)}px; border-radius:50%; background:${color}33; ${devePulsar ? `animation: veiculoPulse ${status === 'movendo' ? '1.8' : '2.2'}s infinite;` : ''}"></div>`;

  const linhas: string[] = [];
  if (rotulo) {
    linhas.push(`<div style="white-space:nowrap; font-size:${compact ? 9 : 11}px; font-weight:700; color:#fff; background:rgba(15,23,42,.85); border:1px solid ${color}; padding:1px 5px; border-radius:6px; letter-spacing:.3px; text-shadow:0 1px 2px rgba(0,0,0,.6);">${rotulo}</div>`);
  }
  if (tempoParado) {
    linhas.push(`<div style="white-space:nowrap; font-size:${compact ? 9 : 11}px; font-weight:800; color:#fff; background:${tempoParado.cor}; border:1px solid rgba(255,255,255,.7); padding:1px 5px; border-radius:6px; box-shadow:0 1px 4px rgba(0,0,0,.45); ${tempoParado.piscar ? 'animation: tempoParadoBlink 1s steps(1, end) infinite;' : ''}">⏱ ${tempoParado.texto}</div>`);
  }
  if (enderecoParado) {
    linhas.push(`<div style="max-width:220px; font-size:${compact ? 9 : 11}px; font-weight:600; color:#0f172a; background:#ffffff; border:2px solid ${enderecoParado.cor}; padding:2px 6px; border-radius:8px; box-shadow:0 2px 6px rgba(0,0,0,.35); line-height:1.25; white-space:normal;">📍 ${enderecoParado.texto}</div>`);
  }
  const posicaoLado = labelLado === 'left'
    ? `right:${size + 6}px; align-items:flex-end;`
    : `left:${size + 6}px; align-items:flex-start;`;
  const label = linhas.length
    ? `<div style="position:absolute; top:50%; ${posicaoLado} transform:translateY(calc(-50% + ${labelDeslocY}px)); display:flex; flex-direction:column; gap:2px; pointer-events:none; z-index:4;">${linhas.join('')}</div>`
    : '';
  return L.divIcon({
    className: 'custom-vehicle-icon',
    html: `<div style="position:relative; width: ${size}px; height: ${size}px;">${halo}<div style="position:relative; background-color: ${color}; width: ${size}px; height: ${size}px; border-radius: 50%; border: ${borderWidth}px solid white; box-shadow: 0 0 0 2px ${color}66, 0 3px 10px rgba(0,0,0,0.45); display:flex; align-items:center; justify-content:center; z-index:2;">${inner}</div>${ignBadge}${label}</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
};

// Formata a duração de parada (ex: 1:30hr / 45 min)
const formatarTempoParado = (inicioIso: string) => {
  const min = Math.max(0, Math.floor((Date.now() - new Date(inicioIso).getTime()) / 60000));
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${h}:${String(m).padStart(2, '0')}hr`;
};


// Ícones para paradas marcadas - usa cor e ícone personalizados
const createParadaIcon = (cor: string, iconeName?: string, compact = false) => {
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

  const size = tamanhoMarcador(compact);
  const borderWidth = compact ? 2 : 3;
  return L.divIcon({
    className: 'custom-parada-icon',
    html: `
      <div style="position: relative; width:${size}px; height:${size}px;">
        <div style="
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: ${Math.round(size * 1.9)}px;
          height: ${Math.round(size * 1.9)}px;
          background-color: ${cor}40;
          border-radius: 50%;
          animation: paradaPulse 2s infinite;
        "></div>
        <div style="
          position: relative;
          background-color: ${cor};
          width: ${size}px;
          height: ${size}px;
          border-radius: 50%;
          border: ${borderWidth}px solid white;
          box-shadow: 0 0 0 2px ${cor}66, 0 3px 10px rgba(0,0,0,0.45);
          display: flex;
          align-items: center;
          justify-content: center;
        ">
          <svg xmlns="http://www.w3.org/2000/svg" width="${Math.round(size * 0.55)}" height="${Math.round(size * 0.55)}" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            ${getIconSvg(iconeName)}
          </svg>
        </div>
      </div>
      <style>
        @keyframes paradaPulse {
          0% { transform: translate(-50%, -50%) scale(0.6); opacity: 1; }
          100% { transform: translate(-50%, -50%) scale(1.3); opacity: 0; }
        }
      </style>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
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
  fitBoundsPadding?: { topLeft?: [number, number]; bottomRight?: [number, number] };
  compactIcons?: boolean;
  disableInteraction?: boolean;
  focusVeiculoId?: string;
  focusTrigger?: number;
  /** Sempre reenquadra no maior zoom possível englobando todos os pontos (modo TV) */
  zoomMaximoSempre?: boolean;
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
  fitBoundsPadding,
  compactIcons = false,
  disableInteraction = false,
  focusVeiculoId,
  focusTrigger,
  zoomMaximoSempre = false,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());
  const paradasMarkersRef = useRef<Map<string, L.Marker>>(new Map());
  const routeLayersRef = useRef<L.Polyline[]>([]);
  const currentMarkerRef = useRef<L.Marker | null>(null);

  const initialBoundsFittedRef = useRef(false);
  // Fallback de endereço (geocodificação no cliente) para paradas sem endereço salvo
  const [enderecosFallback, setEnderecosFallback] = useState<Record<string, string>>({});
  const geocodePendenteRef = useRef<Set<string>>(new Set());
  const ultimoBoundsRef = useRef<L.LatLngBounds | null>(null);
  // Assinaturas para evitar recriar ícones/DOM a cada atualização (causa de "piscar")
  const iconSigRef = useRef<Map<string, string>>(new Map());
  const paradaSigRef = useRef<Map<string, string>>(new Map());
  const ultimoEnquadramentoRef = useRef<string>('');


  // Auto-enquadramento: pausa quando o usuário interage (zoom, arrasto, seleção)
  const [autoPausado, setAutoPausado] = useState(false);
  const autoPausadoRef = useRef(false);

  // Atualiza os rótulos de tempo parado (piscando) a cada 30s
  const [tempoTick, setTempoTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTempoTick(t => t + 1), 30000);
    return () => clearInterval(id);
  }, []);

  const movimentoProgramaticoRef = useRef(false);

  const pausarAuto = useCallback(() => {
    if (autoPausadoRef.current) return;
    autoPausadoRef.current = true;
    setAutoPausado(true);
  }, []);

  // Reenquadra o mapa no maior zoom possível, mantendo tudo centralizado na área visível
  const enquadrarTudo = useCallback((forcar = false) => {
    const map = mapRef.current;
    const bounds = ultimoBoundsRef.current;
    if (!map || !bounds || !fitBounds || autoPausadoRef.current) return;

    if (!forcar && !zoomMaximoSempre) {
      // Histerese: se tudo já está confortavelmente visível e o enquadramento
      // continua adequado, não reposiciona. Reenquadrar a cada nova posição de GPS
      // recarregava todos os tiles e causava a "piscada preta" na TV Box.
      const visivel = map.getBounds();
      const central = visivel.pad(-0.12);
      if (central.contains(bounds)) {
        const spanTelaLat = Math.abs(visivel.getNorth() - visivel.getSouth()) || 1;
        const spanBoundsLat = Math.abs(bounds.getNorth() - bounds.getSouth());
        const spanTelaLng = Math.abs(visivel.getEast() - visivel.getWest()) || 1;
        const spanBoundsLng = Math.abs(bounds.getEast() - bounds.getWest());
        const muitoLonge =
          spanBoundsLat / spanTelaLat < 0.25 && spanBoundsLng / spanTelaLng < 0.25;
        if (!muitoLonge) return;
      }
    }

    if (!forcar) {
      // Trava anti-piscada: ignora variações irrelevantes de GPS.
      // No modo TV a precisão é maior (reenquadra em qualquer mudança real).
      const casas = zoomMaximoSempre ? 4 : 2;
      const sig = [
        bounds.getSouth().toFixed(casas),
        bounds.getWest().toFixed(casas),
        bounds.getNorth().toFixed(casas),
        bounds.getEast().toFixed(casas),
        Math.round(map.getSize().x),
        Math.round(map.getSize().y),
      ].join('|');
      if (sig === ultimoEnquadramentoRef.current) return;
      ultimoEnquadramentoRef.current = sig;
    }

    movimentoProgramaticoRef.current = true;
    enquadrarNoMapa(map, bounds, {
      paddingTopLeft: fitBoundsPadding?.topLeft ?? [16, 16],
      paddingBottomRight: fitBoundsPadding?.bottomRight ?? [16, 16],
      maxZoom: 18,
      zoomPontoUnico: 17,
    });
    window.setTimeout(() => {
      movimentoProgramaticoRef.current = false;
    }, 500);
  }, [fitBounds, fitBoundsPadding, zoomMaximoSempre]);



  const retomarAuto = useCallback(() => {
    autoPausadoRef.current = false;
    setAutoPausado(false);
    requestAnimationFrame(() => {
      mapRef.current?.invalidateSize({ animate: false });
      enquadrarTudo(true);
    });
  }, [enquadrarTudo]);


  // Reset initial bounds flag when fullRouteBounds changes (new data loaded)
  useEffect(() => {
    initialBoundsFittedRef.current = false;
  }, [fullRouteBounds?.length]);

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const mapOptions: L.MapOptions = {
      zoomControl: !disableInteraction,
      zoomSnap: 0,
      zoomDelta: 0.5,
      wheelPxPerZoomLevel: 90,
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

    // Pausa o auto-enquadramento assim que o usuário interage com o mapa
    const map = mapRef.current;
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

    // Paradas com "Tempo Parado no Mapa" ativo → rótulo piscante abaixo do nome
    const tempoPorVeiculo = new Map<string, TempoParadoInfo>();
    const enderecoPorVeiculo = new Map<string, EnderecoParadoInfo>();
    paradasMarcadas.forEach(p => {
      if (p.data_fim || p.ativa === false) return;
      if (p.mostrar_tempo) {
        tempoPorVeiculo.set(p.veiculo_id, {
          texto: formatarTempoParado(p.data_inicio),
          cor: p.cor_icone_parada || '#F43F5E',
          piscar: true,
        });
      }
      if (p.mostrar_endereco) {
        const texto = (p.endereco && String(p.endereco)) || enderecosFallback[p.veiculo_id];
        if (texto) {
          enderecoPorVeiculo.set(p.veiculo_id, { texto, cor: '#0EA5E9' });
        }
      }
    });

    // Remove markers that no longer exist
    const currentIds = new Set(veiculosComPosicao.map(v => v.id));
    currentMarkers.forEach((marker, id) => {
      if (!currentIds.has(id)) {
        marker.remove();
        currentMarkers.delete(id);
        iconSigRef.current.delete(id);
      }
    });

    // Add or update markers
    veiculosComPosicao.forEach(veiculo => {
      const pos: L.LatLngExpression = [veiculo.ultima_posicao!.lat, veiculo.ultima_posicao!.lng];
      const existingMarker = currentMarkers.get(veiculo.id);
      const tempo = veiculo.status === 'movendo' ? null : tempoPorVeiculo.get(veiculo.id) || null;
      const enderecoBalao = veiculo.status === 'movendo' ? null : enderecoPorVeiculo.get(veiculo.id) || null;

      // Assinatura do visual: só recria o ícone quando algo realmente muda
      const sig = [
        veiculo.status,
        compactIcons ? 'c' : 'n',
        veiculo.cor || '',
        veiculo.tipo_veiculo || '',
        String(veiculo.ultima_posicao?.ignicao),
        veiculo.placa || '',
        tempo ? `${tempo.texto}|${tempo.cor}` : '',
        enderecoBalao ? `e:${enderecoBalao.texto}` : '',
      ].join('~');

      const criarIcone = () => createVeiculoIcon(
        veiculo.status,
        compactIcons,
        veiculo.cor,
        veiculo.tipo_veiculo,
        veiculo.ultima_posicao?.ignicao,
        veiculo.placa,
        tempo,
        enderecoBalao,
      );

      if (existingMarker) {
        const atual = existingMarker.getLatLng();
        if (Math.abs(atual.lat - veiculo.ultima_posicao!.lat) > 1e-7 || Math.abs(atual.lng - veiculo.ultima_posicao!.lng) > 1e-7) {
          existingMarker.setLatLng(pos);
        }
        if (iconSigRef.current.get(veiculo.id) !== sig) {
          existingMarker.setIcon(criarIcone());
          iconSigRef.current.set(veiculo.id, sig);
        }
      } else {
        iconSigRef.current.set(veiculo.id, sig);
        const marker = L.marker(pos, { icon: criarIcone(), riseOnHover: true })
          .addTo(map)
          .bindPopup(`

            <div class="text-sm">
              <p class="font-bold">${veiculo.placa}</p>
              <p>${veiculo.descricao || 'Sem descrição'}</p>
              <p>Velocidade: ${Math.round(veiculo.ultima_posicao?.velocidade || 0)} km/h</p>
              ${typeof veiculo.ultima_posicao?.ignicao === 'boolean'
                ? `<p>Ignição: <strong style="color:${veiculo.ultima_posicao.ignicao ? '#059669' : '#6b7280'}">${veiculo.ultima_posicao.ignicao ? '🔑 Ligado' : '⏻ Desligado'}</strong></p>`
                : `<p>Ignição: <strong style="color:#6b7280">Sem sinal</strong></p>`}
              ${typeof veiculo.ultima_posicao?.corte_combustivel === 'boolean'
                ? `<p>Combustível: <strong style="color:${veiculo.ultima_posicao.corte_combustivel ? '#dc2626' : '#059669'}">${veiculo.ultima_posicao.corte_combustivel ? '⛽ Cortado' : '⛽ Liberado'}</strong></p>`
                : `<p>Combustível: <strong style="color:#6b7280">Sem sinal</strong></p>`}

            </div>
          `);

        marker.on('click', () => {
          pausarAuto();
          onVeiculoClick?.(veiculo);
        });
        marker.on('dblclick', () => {
          pausarAuto();
          map.setView(pos, Math.max(map.getZoom(), 17), { animate: true });
          marker.openPopup();
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

    // Fit bounds if enabled — centraliza todos os pontos com o maior zoom possível
    if (fitBounds && allPoints.length > 0) {
      ultimoBoundsRef.current = L.latLngBounds(allPoints);
      enquadrarTudo();
    }

  }, [veiculos, fitBounds, fitBoundsPadding, onVeiculoClick, routes, paradasMarcadas, compactIcons, enquadrarTudo, tempoTick, enderecosFallback]);

  // Geocodifica no cliente as paradas com balão de endereço mas sem endereço salvo
  useEffect(() => {
    const pendentes = paradasMarcadas.filter(
      p => p.mostrar_endereco && !p.endereco && !p.data_fim && p.ativa !== false
    );
    if (!pendentes.length) return;
    let cancelado = false;
    (async () => {
      const { reverseGeocode } = await import('@/services/logisticaAutomacaoExecutor');
      for (const p of pendentes) {
        const chave = `${p.veiculo_id}`;
        if (geocodePendenteRef.current.has(chave) || enderecosFallback[chave]) continue;
        geocodePendenteRef.current.add(chave);
        const texto = await reverseGeocode(Number(p.lat), Number(p.lng), true);
        geocodePendenteRef.current.delete(chave);
        if (cancelado) return;
        if (texto) setEnderecosFallback(prev => ({ ...prev, [chave]: texto }));
      }
    })();
    return () => {
      cancelado = true;
    };
  }, [paradasMarcadas, enderecosFallback]);

  // Reenquadra quando o container muda de tamanho (sidebar, painéis, rotação, resize)
  useEffect(() => {
    const el = mapContainerRef.current;
    if (!el) return;

    let frame: number | null = null;
    const reenquadrar = () => {
      if (frame !== null) cancelAnimationFrame(frame);
      // aguarda o layout estabilizar antes de recalcular tamanho/zoom
      frame = requestAnimationFrame(() => {
        frame = null;
        mapRef.current?.invalidateSize({ animate: false });
        enquadrarTudo();
      });
    };

    const observer = new ResizeObserver(reenquadrar);
    observer.observe(el);
    window.addEventListener('resize', reenquadrar);
    window.addEventListener('orientationchange', reenquadrar);

    // primeiro enquadramento após montagem/layout inicial
    reenquadrar();

    return () => {
      if (frame !== null) cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener('resize', reenquadrar);
      window.removeEventListener('orientationchange', reenquadrar);
    };
  }, [enquadrarTudo]);



  // Focus/zoom on a specific vehicle when requested (e.g., double click on list)
  useEffect(() => {
    if (!mapRef.current || !focusVeiculoId) return;
    const veiculo = veiculos.find(v => v.id === focusVeiculoId && v.ultima_posicao);
    if (!veiculo) return;
    const map = mapRef.current;
    // Selecionar um veículo pausa o auto-enquadramento
    pausarAuto();
    const pos: L.LatLngExpression = [veiculo.ultima_posicao!.lat, veiculo.ultima_posicao!.lng];
    // Defer to next frame so container resize (details panel opening) settles first
    const raf = requestAnimationFrame(() => {
      map.invalidateSize();
      map.setView(pos, Math.max(map.getZoom(), 17), { animate: true });
      const marker = markersRef.current.get(veiculo.id);
      // Open popup without auto-panning so the marker stays centered on screen
      marker?.openPopup();
      // Re-center after popup opens to counter Leaflet's autoPan shift
      setTimeout(() => {
        map.panTo(pos, { animate: true });
      }, 350);
    });
    return () => cancelAnimationFrame(raf);
  }, [focusVeiculoId, focusTrigger, veiculos, pausarAuto]);

  // Update paradas marcadas markers
  useEffect(() => {
    if (!mapRef.current) return;

    const map = mapRef.current;
    const currentParadasMarkers = paradasMarkersRef.current;
    // Paradas com rótulo de tempo no veículo não geram marcador separado
    const paradasVisiveis = paradasMarcadas.filter(p => !p.mostrar_tempo && !p.mostrar_endereco);

    // Remove markers that no longer exist
    const currentIds = new Set(paradasVisiveis.map(p => p.id));
    currentParadasMarkers.forEach((marker, id) => {
      if (!currentIds.has(id)) {
        marker.remove();
        currentParadasMarkers.delete(id);
        paradaSigRef.current.delete(id);
      }
    });

    // Add or update paradas markers
    paradasVisiveis.forEach(parada => {

      const pos: L.LatLngExpression = [parada.lat, parada.lng];
      const existingMarker = currentParadasMarkers.get(parada.id);
      const cor = parada.cor_icone_parada || '#EAB308';
      const icone = parada.icone_parada || 'Pause';
      const legenda = parada.legenda_parada || 'Veículo Parado';
      const sig = `${cor}~${icone}~${compactIcons ? 'c' : 'n'}`;

      if (existingMarker) {
        const atual = existingMarker.getLatLng();
        if (Math.abs(atual.lat - parada.lat) > 1e-7 || Math.abs(atual.lng - parada.lng) > 1e-7) {
          existingMarker.setLatLng(pos);
        }
        if (paradaSigRef.current.get(parada.id) !== sig) {
          existingMarker.setIcon(createParadaIcon(cor, icone, compactIcons));
          paradaSigRef.current.set(parada.id, sig);
        }
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
        paradaSigRef.current.set(parada.id, sig);

        const marker = L.marker(pos, { 
          icon: createParadaIcon(cor, icone, compactIcons),
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
  }, [paradasMarcadas, onParadaClick, compactIcons]);

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

    // Fit bounds to show all routes (respeita a pausa do auto-enquadramento)
    if (fitBounds && allRoutePoints.length > 0 && !autoPausadoRef.current) {
      const bounds = L.latLngBounds(allRoutePoints);
      movimentoProgramaticoRef.current = true;
      map.fitBounds(bounds, { padding: [50, 50] });
      window.setTimeout(() => { movimentoProgramaticoRef.current = false; }, 500);
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
          <div style="position: relative; width:${MARKER_SIZE}px; height:${MARKER_SIZE}px;">
            <div style="
              position: absolute;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -50%);
              width: ${Math.round(MARKER_SIZE * 1.9)}px;
              height: ${Math.round(MARKER_SIZE * 1.9)}px;
              background-color: ${currentMarker.color}40;
              border-radius: 50%;
              animation: currentPulse 1.5s infinite;
            "></div>
            <div style="
              position: relative;
              background-color: ${currentMarker.color};
              width: ${MARKER_SIZE}px;
              height: ${MARKER_SIZE}px;
              border-radius: 50%;
              border: 3px solid white;
              box-shadow: 0 0 0 2px ${currentMarker.color}66, 0 3px 10px rgba(0,0,0,0.45);
            "></div>
          </div>
          <style>
            @keyframes currentPulse {
              0% { transform: translate(-50%, -50%) scale(0.6); opacity: 1; }
              100% { transform: translate(-50%, -50%) scale(1.4); opacity: 0; }
            }
          </style>
        `,
        iconSize: [MARKER_SIZE, MARKER_SIZE],
        iconAnchor: [MARKER_SIZE / 2, MARKER_SIZE / 2],
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
    <div className="relative w-full h-full">
      <div ref={mapContainerRef} className={`logistica-map-container ${className}`} />

      {fitBounds && autoPausado && (
        <button
          type="button"
          onClick={retomarAuto}
          className="absolute top-3 left-1/2 -translate-x-1/2 z-[1000] flex items-center gap-2 rounded-full border border-border bg-background/90 px-3 py-1.5 text-xs font-semibold text-foreground shadow-lg backdrop-blur hover:bg-accent"
        >
          <Crosshair className="h-3.5 w-3.5" />
          Auto-zoom pausado · Retomar
        </button>
      )}

      <style>{`
        @keyframes veiculoPulse {
          0% { transform: scale(0.75); opacity: .9; }
          100% { transform: scale(1.35); opacity: 0; }
        }
        @keyframes tempoParadoBlink {
          0%, 49% { opacity: 1; }
          50%, 100% { opacity: .35; }
        }

        /* Movimento suave dos marcadores entre atualizações de posição */
        .logistica-map-container .leaflet-marker-icon {
          transition: transform .8s linear;
          will-change: transform;
        }
        .logistica-map-container.leaflet-zoom-anim .leaflet-marker-icon,
        .logistica-map-container .leaflet-zoom-anim .leaflet-marker-icon,
        .logistica-map-container .leaflet-drag-target {
          transition: none !important;
        }
        @media (prefers-reduced-motion: reduce) {
          .logistica-map-container .leaflet-marker-icon { transition: none; }
          .logistica-map-container .custom-vehicle-icon * { animation: none !important; }
        }



        .logistica-map-container .leaflet-control-container .leaflet-top.leaflet-left {
          top: auto !important;
          bottom: 16px !important;
          left: 16px !important;
          right: auto !important;
          z-index: 9999 !important;
        }
        .logistica-map-container .leaflet-control-zoom a {
          width: 34px !important;
          height: 34px !important;
          line-height: 34px !important;
          font-size: 20px !important;
        }
        @media (max-width: 768px) {
          .logistica-map-container .leaflet-control-container .leaflet-top.leaflet-left {
            bottom: 80px !important;
            left: auto !important;
            right: 16px !important;
          }
        }
      `}</style>
    </div>
  );
};

export default LogisticaMapInternal;
