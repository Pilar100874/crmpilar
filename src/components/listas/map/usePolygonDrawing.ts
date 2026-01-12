import { useState, useCallback, useRef } from 'react';
import L from 'leaflet';

interface PolygonPoint {
  lat: number;
  lng: number;
}

interface PolygonMetrics {
  totalPopulacao: number;
  pibTotal: number;
  pibMedio: number;
  totalEmpresas: number;
  rendaMedia: number;
  idhMedio: number;
  municipiosCount: number;
  municipios: string[];
  areaKm2: number;
}

interface MunicipioData {
  municipio: string;
  uf: string;
  latitude: number | null;
  longitude: number | null;
  populacao: number | null;
  pib_per_capita: number | null;
  renda_media: number | null;
  idh: number | null;
}

interface EmpresaData {
  municipio: string;
  uf: string;
  latitude?: number | null;
  longitude?: number | null;
  quantidade: number;
}

// Função para verificar se um ponto está dentro de um polígono (Ray-casting algorithm)
const isPointInPolygon = (point: PolygonPoint, polygon: PolygonPoint[]): boolean => {
  if (polygon.length < 3) return false;
  
  let inside = false;
  const x = point.lng;
  const y = point.lat;
  
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].lng;
    const yi = polygon[i].lat;
    const xj = polygon[j].lng;
    const yj = polygon[j].lat;
    
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  
  return inside;
};

// Função para calcular a área do polígono em km²
const calculatePolygonArea = (polygon: PolygonPoint[]): number => {
  if (polygon.length < 3) return 0;
  
  // Usando a fórmula do shoelace para área em coordenadas geográficas
  // Convertendo para área aproximada em km²
  let area = 0;
  const n = polygon.length;
  
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    area += polygon[i].lng * polygon[j].lat;
    area -= polygon[j].lng * polygon[i].lat;
  }
  
  area = Math.abs(area) / 2;
  
  // Conversão aproximada de graus² para km² (varia com a latitude)
  // Usando latitude média do Brasil (~15°S) onde 1° ≈ 110km
  const kmPerDegree = 110;
  return area * kmPerDegree * kmPerDegree;
};

export const usePolygonDrawing = (
  municipiosRenda: MunicipioData[],
  heatmapData: EmpresaData[]
) => {
  const [isDrawing, setIsDrawing] = useState(false);
  const [polygonPoints, setPolygonPoints] = useState<PolygonPoint[]>([]);
  const [metrics, setMetrics] = useState<PolygonMetrics | null>(null);
  const [showResults, setShowResults] = useState(false);
  const polygonLayerRef = useRef<L.LayerGroup | null>(null);
  const tempMarkersRef = useRef<L.LayerGroup | null>(null);

  const startDrawing = useCallback(() => {
    setIsDrawing(true);
    setPolygonPoints([]);
    setMetrics(null);
    setShowResults(false);
  }, []);

  const cancelDrawing = useCallback(() => {
    setIsDrawing(false);
    setPolygonPoints([]);
    setMetrics(null);
    setShowResults(false);
    
    // Limpa marcadores temporários
    if (tempMarkersRef.current) {
      tempMarkersRef.current.clearLayers();
    }
    if (polygonLayerRef.current) {
      polygonLayerRef.current.clearLayers();
    }
  }, []);

  const addPoint = useCallback((lat: number, lng: number) => {
    if (!isDrawing) return;
    
    setPolygonPoints(prev => [...prev, { lat, lng }]);
  }, [isDrawing]);

  const removeLastPoint = useCallback(() => {
    setPolygonPoints(prev => prev.slice(0, -1));
  }, []);

  const finishDrawing = useCallback(() => {
    if (polygonPoints.length < 3) {
      console.log('Polígono precisa de pelo menos 3 pontos');
      return;
    }

    setIsDrawing(false);

    // Calcula métricas dos municípios dentro do polígono
    let totalPopulacao = 0;
    let pibTotal = 0;
    let somaRenda = 0;
    let somaIdh = 0;
    let countRenda = 0;
    let countIdh = 0;
    const municipiosNaArea: string[] = [];

    municipiosRenda.forEach(mun => {
      if (!mun.latitude || !mun.longitude) return;
      
      const ponto = { lat: mun.latitude, lng: mun.longitude };
      
      if (isPointInPolygon(ponto, polygonPoints)) {
        municipiosNaArea.push(`${mun.municipio} - ${mun.uf}`);
        
        if (mun.populacao) {
          totalPopulacao += mun.populacao;
          
          // PIB total = PIB per capita * população
          if (mun.pib_per_capita) {
            pibTotal += mun.pib_per_capita * mun.populacao;
          }
        }
        
        if (mun.renda_media) {
          somaRenda += mun.renda_media;
          countRenda++;
        } else if (mun.pib_per_capita) {
          somaRenda += mun.pib_per_capita;
          countRenda++;
        }
        
        if (mun.idh) {
          somaIdh += mun.idh;
          countIdh++;
        }
      }
    });

    // Calcula empresas dentro do polígono
    let totalEmpresas = 0;
    heatmapData.forEach(emp => {
      if (!emp.latitude || !emp.longitude) return;
      
      const ponto = { lat: emp.latitude, lng: emp.longitude };
      
      if (isPointInPolygon(ponto, polygonPoints)) {
        totalEmpresas += emp.quantidade;
      }
    });

    const areaKm2 = calculatePolygonArea(polygonPoints);
    const pibMedio = municipiosNaArea.length > 0 ? pibTotal / totalPopulacao : 0;
    const rendaMedia = countRenda > 0 ? somaRenda / countRenda : 0;
    const idhMedio = countIdh > 0 ? somaIdh / countIdh : 0;

    const calculatedMetrics: PolygonMetrics = {
      totalPopulacao,
      pibTotal,
      pibMedio,
      totalEmpresas,
      rendaMedia,
      idhMedio,
      municipiosCount: municipiosNaArea.length,
      municipios: municipiosNaArea,
      areaKm2
    };

    console.log('📊 Métricas calculadas:', calculatedMetrics);
    setMetrics(calculatedMetrics);
    setShowResults(true);
  }, [polygonPoints, municipiosRenda, heatmapData]);

  const clearPolygon = useCallback(() => {
    setPolygonPoints([]);
    setMetrics(null);
    setShowResults(false);
    
    if (tempMarkersRef.current) {
      tempMarkersRef.current.clearLayers();
    }
    if (polygonLayerRef.current) {
      polygonLayerRef.current.clearLayers();
    }
  }, []);

  return {
    isDrawing,
    polygonPoints,
    metrics,
    showResults,
    startDrawing,
    cancelDrawing,
    addPoint,
    removeLastPoint,
    finishDrawing,
    clearPolygon,
    setShowResults,
    polygonLayerRef,
    tempMarkersRef
  };
};
