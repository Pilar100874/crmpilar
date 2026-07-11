import React, { Suspense, lazy } from 'react';
import { VeiculoComStatus } from '@/types/logistica';
import { ParadaMarcada } from '@/types/automacaoLogistica';

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

interface LazyLogisticaMapProps {
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
}

// Retry dynamic import; se o chunk sumiu após novo deploy, força reload uma vez.
const LogisticaMapInternal = lazy(() =>
  import('./LogisticaMapInternal').catch((err) => {
    if (!sessionStorage.getItem('reloadedForChunkError')) {
      sessionStorage.setItem('reloadedForChunkError', '1');
      window.location.reload();
    }
    throw err;
  })
);

const MapFallback = ({ className }: { className?: string }) => (
  <div className={`${className} flex items-center justify-center bg-muted/50`}>
    <div className="text-muted-foreground">Carregando mapa...</div>
  </div>
);

export const LazyLogisticaMap: React.FC<LazyLogisticaMapProps> = (props) => {
  return (
    <Suspense fallback={<MapFallback className={props.className} />}>
      <LogisticaMapInternal {...props} />
    </Suspense>
  );
};

export default LazyLogisticaMap;
