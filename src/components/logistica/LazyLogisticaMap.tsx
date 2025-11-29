import React, { Suspense, lazy } from 'react';
import { VeiculoComStatus } from '@/types/logistica';

interface RouteData {
  coordinates: Array<{ lat: number; lng: number }>;
  color?: string;
  distance?: number;
  duration?: number;
}

interface LazyLogisticaMapProps {
  veiculos?: VeiculoComStatus[];
  routes?: RouteData[];
  center?: [number, number];
  zoom?: number;
  onVeiculoClick?: (veiculo: VeiculoComStatus) => void;
  className?: string;
  fitBounds?: boolean;
}

const LogisticaMapInternal = lazy(() => import('./LogisticaMapInternal'));

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
