import React, { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { MapLayer, VendasRegiao, DADOS_DEMOGRAFICOS_UF, Unidade } from './MapLayerTypes';
import { CnaeFilterSelect } from './CnaeFilterSelect';
import { CnaeHeatmapImporter } from './CnaeHeatmapImporter';

import { IBGEDataLoader } from './IBGEDataLoader';
import { IsochronePanel } from './IsochronePanel';
import { useCnaeHeatmap } from './useCnaeHeatmap';
import { useMunicipiosRenda } from './useMunicipiosRenda';
import { useIsochrone } from './useIsochrone';
import { useZoomLevelData } from './useZoomLevelData';
import { 
  X, 
  Filter, 
  Building2, 
  User, 
  ZoomIn, 
  ZoomOut, 
  RotateCcw,
  MapPin,
  Layers,
  ChevronDown,
  Upload,
  MousePointer,
  PenTool,
  Check,
  Undo2,
  Trash2
} from 'lucide-react';
import { usePolygonDrawing } from './usePolygonDrawing';
import { PolygonResultsPanel } from './PolygonResultsPanel';

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
  cnae_principal?: string | null;
  cnae_descricao?: string | null;
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
  unidades: Unidade[];
  usuarios: Usuario[];
  vendasData: VendasRegiao[];
  selectedUsuarioId: string;
  onUsuarioChange: (id: string) => void;
  // Novos props para CNAE
  selectedCnaes?: string[];
  onCnaesChange?: (cnaes: string[]) => void;
  empresasByCnae?: Empresa[];
  concorrenciaPorUF?: Record<string, { count: number; empresas: Empresa[] }>;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
};

const FullscreenMapModal: React.FC<FullscreenMapModalProps> = ({
  open,
  onClose,
  layers,
  onLayerToggle,
  empresas,
  unidades,
  usuarios,
  vendasData,
  selectedUsuarioId,
  onUsuarioChange,
  selectedCnaes = [],
  onCnaesChange,
  empresasByCnae = [],
  concorrenciaPorUF = {}
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const unidadesLayerRef = useRef<L.LayerGroup | null>(null);
  const vendasLayerRef = useRef<L.LayerGroup | null>(null);
  const demographicsLayerRef = useRef<L.LayerGroup | null>(null);
  const incomeLayerRef = useRef<L.LayerGroup | null>(null);
  const competitionLayerRef = useRef<L.LayerGroup | null>(null);
  const logisticsLayerRef = useRef<L.LayerGroup | null>(null);
  const cnaeMarkersLayerRef = useRef<L.LayerGroup | null>(null);
  const heatmapLayerRef = useRef<L.LayerGroup | null>(null);
  const isochroneLayerRef = useRef<L.LayerGroup | null>(null);
  const municipalIncomeLayerRef = useRef<L.LayerGroup | null>(null);
  const densityLayerRef = useRef<L.LayerGroup | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [selectedMapPoint, setSelectedMapPoint] = useState<{ lat: number; lng: number } | null>(null);
  const [isSelectingPoint, setIsSelectingPoint] = useState(false);
  const [currentZoom, setCurrentZoom] = useState(4);

  // Hook para dados do heatmap por município
  const { heatmapData, heatmapByUF, loading: heatmapLoading, refetch: refetchHeatmap } = useCnaeHeatmap(selectedCnaes);
  
  // Hook para dados de renda por município
  const { municipiosRenda, rendaPorUF, loading: rendaLoading, refetch: refetchRenda } = useMunicipiosRenda();
  
  // Hook para isócronas
  const { isocronas, fetchSavedIsochrones } = useIsochrone();
  
  // Hook para dados baseados em zoom
  const { currentLevel, stateData, regionData, municipalData, loading: municipalLoading } = useZoomLevelData(currentZoom);

  // Hook para desenho de polígono
  const {
    isDrawing,
    polygonPoints,
    metrics: polygonMetrics,
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
  } = usePolygonDrawing(municipiosRenda, heatmapData);

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
      unidadesLayerRef.current = L.layerGroup().addTo(map);
      vendasLayerRef.current = L.layerGroup().addTo(map);
      demographicsLayerRef.current = L.layerGroup().addTo(map);
      incomeLayerRef.current = L.layerGroup().addTo(map);
      competitionLayerRef.current = L.layerGroup().addTo(map);
      logisticsLayerRef.current = L.layerGroup().addTo(map);
      cnaeMarkersLayerRef.current = L.layerGroup().addTo(map);
      heatmapLayerRef.current = L.layerGroup().addTo(map);
      isochroneLayerRef.current = L.layerGroup().addTo(map);
      municipalIncomeLayerRef.current = L.layerGroup().addTo(map);
      densityLayerRef.current = L.layerGroup().addTo(map);

      // Click handler é gerenciado via useEffect separado para suportar desenho de polígono
      
      // Zoom handler para atualizar nível de detalhe
      map.on('zoomend', () => {
        setCurrentZoom(map.getZoom());
      });

      mapRef.current = map;

      // Force resize after a delay
      setTimeout(() => {
        map.invalidateSize();
        setMapReady(true);
      }, 300);
    } catch (error) {
      console.error('Error initializing map:', error);
    }
  }, [isSelectingPoint]);

  useEffect(() => {
    if (!open) {
      // Cleanup when closing
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markersLayerRef.current = null;
        unidadesLayerRef.current = null;
        vendasLayerRef.current = null;
        demographicsLayerRef.current = null;
        incomeLayerRef.current = null;
        competitionLayerRef.current = null;
        logisticsLayerRef.current = null;
        cnaeMarkersLayerRef.current = null;
        heatmapLayerRef.current = null;
        isochroneLayerRef.current = null;
        municipalIncomeLayerRef.current = null;
        densityLayerRef.current = null;
        setMapReady(false);
        setSelectedMapPoint(null);
      }
      return;
    }

    // Initialize with delay to ensure DOM is ready
    const timer = setTimeout(initializeMap, 200);
    return () => clearTimeout(timer);
  }, [open, initializeMap, isSelectingPoint]);

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

  // Update unidades layer (filiais/pontos de venda)
  useEffect(() => {
    if (!unidadesLayerRef.current || !mapReady) return;
    
    unidadesLayerRef.current.clearLayers();
    
    const unitsLayer = layers.find(l => l.id === 'units');
    if (!unitsLayer?.visible) return;

    unidades.forEach(unidade => {
      if (!unidade.latitude || !unidade.longitude) return;

      const customIcon = L.divIcon({
        className: 'custom-marker',
        html: `<div style="background: #ec4899; width: 32px; height: 32px; border-radius: 50%; border: 3px solid white; box-shadow: 0 3px 6px rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center;">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
            <circle cx="12" cy="10" r="3" fill="#ec4899"/>
          </svg>
        </div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 16]
      });

      const enderecoCompleto = [
        unidade.logradouro,
        unidade.numero,
        unidade.bairro,
        unidade.cidade,
        unidade.uf
      ].filter(Boolean).join(', ');

      L.marker([unidade.latitude, unidade.longitude], { icon: customIcon })
        .addTo(unidadesLayerRef.current!)
        .bindPopup(`
          <div class="p-2">
            <div style="background: #ec4899; color: white; padding: 4px 8px; border-radius: 4px; font-weight: bold; margin-bottom: 8px; display: inline-block;">
              📍 UNIDADE/FILIAL
            </div>
            <br/>
            <strong>${unidade.nome}</strong>
            ${enderecoCompleto ? `<br/><small>${enderecoCompleto}</small>` : ''}
            ${unidade.cep ? `<br/><small>CEP: ${unidade.cep}</small>` : ''}
          </div>
        `);
    });
  }, [unidades, layers, mapReady]);

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

  // Update demographics layer - ZOOM DINÂMICO com suporte a municípios
  useEffect(() => {
    if (!demographicsLayerRef.current || !mapReady) return;
    
    demographicsLayerRef.current.clearLayers();
    
    const demoLayer = layers.find(l => l.id === 'demographics');
    if (!demoLayer?.visible) return;

    // Nível de zoom determina o que mostrar
    if (currentLevel === 'country' || currentLevel === 'region') {
      // Mostra regiões agregadas
      regionData.forEach(region => {
        const radius = Math.max(20, Math.min(region.populacao / 2000000, 50));
        
        const circle = L.circleMarker([region.lat, region.lng], {
          radius: radius,
          fillColor: '#8b5cf6',
          color: '#6d28d9',
          weight: 3,
          opacity: 0.9,
          fillOpacity: 0.5
        });

        circle.bindPopup(`
          <div class="p-3">
            <strong style="font-size: 14px;">🗺️ Região ${region.regiao}</strong>
            <hr style="margin: 8px 0; border-color: #e5e7eb;"/>
            <div style="display: grid; gap: 4px;">
              <div>👥 <strong>População:</strong> ${region.populacao.toLocaleString('pt-BR')}</div>
              <div>💰 <strong>Renda Média:</strong> R$ ${region.renda_media.toLocaleString('pt-BR')}</div>
              <div>📍 <strong>Estados:</strong> ${region.ufs.join(', ')}</div>
            </div>
            <p style="font-size: 10px; color: #6b7280; margin-top: 8px;">🔍 Dê zoom para ver detalhes por UF</p>
          </div>
        `);

        demographicsLayerRef.current!.addLayer(circle);
      });
    } else if (currentLevel === 'state') {
      // Mostra UFs com dados completos
      const maxPopulacao = Math.max(...stateData.map(d => d.populacao));
      const minPopulacao = Math.min(...stateData.map(d => d.populacao));
      const maxDensidade = Math.max(...stateData.map(d => d.densidade));

      stateData.forEach(data => {
        const normalizedPopulacao = (data.populacao - minPopulacao) / (maxPopulacao - minPopulacao);
        const radius = 15 + (normalizedPopulacao * 40);
        const normalizedDensity = data.densidade / maxDensidade;
        const opacity = 0.25 + (normalizedDensity * 0.5);

        const circle = L.circleMarker([data.lat, data.lng], {
          radius: radius,
          fillColor: '#8b5cf6',
          color: '#6d28d9',
          weight: 2,
          opacity: 0.8,
          fillOpacity: opacity
        });

        circle.bindPopup(`
          <div class="p-3">
            <strong style="font-size: 14px;">📍 ${data.uf}</strong>
            <hr style="margin: 8px 0; border-color: #e5e7eb;"/>
            <div style="display: grid; gap: 4px;">
              <div>👥 <strong>População:</strong> ${data.populacao.toLocaleString('pt-BR')}</div>
              <div>📊 <strong>Densidade:</strong> ${data.densidade.toFixed(1)} hab/km²</div>
              <div>🏙️ <strong>Urbanização:</strong> ${data.urbanizacao}%</div>
              <div>💰 <strong>Renda Média:</strong> R$ ${data.renda_media.toLocaleString('pt-BR')}</div>
            </div>
            <p style="font-size: 10px; color: #6b7280; margin-top: 8px;">🔍 Dê zoom para ver municípios</p>
          </div>
        `);

        demographicsLayerRef.current!.addLayer(circle);
      });
    } else {
      // Mostra MUNICÍPIOS com dados demográficos
      if (municipalData.length === 0) {
        // Mostra mensagem de carregamento
        const center = mapRef.current?.getCenter();
        if (center && municipalLoading) {
          const marker = L.marker([center.lat, center.lng], {
            icon: L.divIcon({
              className: 'custom-info-marker',
              html: `<div style="background: #f3e8ff; border: 2px solid #8b5cf6; border-radius: 8px; padding: 8px 12px; white-space: nowrap; font-size: 12px;">
                ⏳ Carregando dados de ${municipalData.length > 0 ? municipalData.length : '5570'} municípios...
              </div>`,
              iconSize: [280, 40],
              iconAnchor: [140, 20]
            })
          });
          demographicsLayerRef.current.addLayer(marker);
        }
        return;
      }

      // Calcula valores para normalização
      const populacoes = municipalData.filter(m => m.populacao).map(m => m.populacao!);
      const maxPop = Math.max(...populacoes, 1);
      const minPop = Math.min(...populacoes, 0);

      municipalData.forEach(mun => {
        if (!mun.populacao) return;

        const normalized = (mun.populacao - minPop) / (maxPop - minPop);
        const radius = 4 + (normalized * 20);

        // Cor baseada na população
        let fillColor = '#c4b5fd'; // Baixa
        if (normalized > 0.3) fillColor = '#8b5cf6'; // Média
        if (normalized > 0.6) fillColor = '#6d28d9'; // Alta

        const circle = L.circleMarker([mun.latitude, mun.longitude], {
          radius: radius,
          fillColor: fillColor,
          color: '#4c1d95',
          weight: 1,
          opacity: 0.7,
          fillOpacity: 0.5
        });

        circle.bindPopup(`
          <div class="p-3">
            <strong style="font-size: 14px;">📍 ${mun.municipio} - ${mun.uf}</strong>
            <hr style="margin: 8px 0; border-color: #e5e7eb;"/>
            <div style="display: grid; gap: 4px;">
              <div>👥 <strong>População:</strong> ${mun.populacao.toLocaleString('pt-BR')}</div>
              ${mun.renda_media ? `<div>💰 <strong>PIB per capita:</strong> R$ ${mun.renda_media.toLocaleString('pt-BR')}</div>` : ''}
              ${mun.idh ? `<div>📈 <strong>IDH:</strong> ${mun.idh.toFixed(3)}</div>` : ''}
              ${mun.empresas_count ? `<div>🏢 <strong>Empresas:</strong> ${mun.empresas_count.toLocaleString('pt-BR')}</div>` : ''}
            </div>
            <p style="font-size: 10px; color: #6b7280; margin-top: 8px;">Fonte: IBGE</p>
          </div>
        `);

        demographicsLayerRef.current!.addLayer(circle);
      });

      console.log(`✅ Demografia: ${municipalData.length} municípios renderizados`);
    }
  }, [layers, mapReady, currentLevel, stateData, regionData, municipalData, municipalLoading]);

  // Update income layer - agora com dados municipais em zoom alto
  useEffect(() => {
    if (!incomeLayerRef.current || !mapReady) return;
    
    incomeLayerRef.current.clearLayers();
    
    const incomeLayer = layers.find(l => l.id === 'income');
    if (!incomeLayer?.visible) return;

    // Em zoom baixo (< 6): mostra por UF
    // Em zoom alto (>= 6): mostra por município usando municipiosRenda
    if (currentZoom < 6) {
      // Visão por UF
      const maxRenda = Math.max(...Object.values(DADOS_DEMOGRAFICOS_UF).map(d => d.renda_media));
      const minRenda = Math.min(...Object.values(DADOS_DEMOGRAFICOS_UF).map(d => d.renda_media));

      Object.entries(DADOS_DEMOGRAFICOS_UF).forEach(([uf, data]) => {
        const normalizedRenda = (data.renda_media - minRenda) / (maxRenda - minRenda);
        const opacity = 0.3 + (normalizedRenda * 0.5);
        const radius = 15 + (normalizedRenda * 25);

        const circle = L.circleMarker([data.lat, data.lng], {
          radius: radius,
          fillColor: '#f59e0b',
          color: '#b45309',
          weight: 1,
          opacity: 0.7,
          fillOpacity: opacity
        });

        circle.bindPopup(`
          <div class="p-2">
            <strong>${uf}</strong>
            <br/><small>Renda Média: R$ ${data.renda_media.toLocaleString('pt-BR')}</small>
            <br/><small>Score Poder de Compra: ${Math.round(normalizedRenda * 100)}</small>
            <br/><small class="text-muted-foreground">Fonte: IBGE/IPEA</small>
          </div>
        `);

        incomeLayerRef.current!.addLayer(circle);
      });
    } else {
      // Visão por município - usa PIB per capita dos dados municipais
      const municipiosComDados = municipiosRenda.filter(m => 
        m.latitude && m.longitude && (m.renda_media || (m.pib_per_capita && m.pib_per_capita > 0))
      );

      if (municipiosComDados.length === 0) {
        console.log('📊 Renda: Sem dados municipais, aguardando carregamento...');
        return;
      }

      const valoresRenda = municipiosComDados.map(m => m.renda_media || m.pib_per_capita!);
      const maxRenda = Math.max(...valoresRenda, 1);
      const minRenda = Math.min(...valoresRenda.filter(v => v > 0));

      let addedCount = 0;
      municipiosComDados.forEach(mun => {
        const valorRenda = mun.renda_media || mun.pib_per_capita!;

        // Normalização logarítmica para melhor distribuição visual
        const logMax = Math.log10(maxRenda);
        const logMin = Math.log10(Math.max(minRenda, 1));
        const logValor = Math.log10(Math.max(valorRenda, 1));
        const normalized = (logValor - logMin) / (logMax - logMin);
        
        const radius = Math.max(4, 4 + (normalized * 16));

        // Cor: vermelho (baixa) -> amarelo -> verde (alta)
        let fillColor = '#ef4444';
        if (normalized > 0.6) fillColor = '#22c55e';
        else if (normalized > 0.3) fillColor = '#f59e0b';

        const circle = L.circleMarker([mun.latitude!, mun.longitude!], {
          radius: radius,
          fillColor: fillColor,
          color: '#b45309',
          weight: 1,
          opacity: 0.8,
          fillOpacity: 0.6
        });

        const tipoValor = mun.renda_media ? 'Renda Média' : 'PIB per Capita';
        circle.bindPopup(`
          <div class="p-3">
            <strong style="font-size: 14px;">💰 ${mun.municipio} - ${mun.uf}</strong>
            <hr style="margin: 8px 0; border-color: #e5e7eb;"/>
            <div style="display: grid; gap: 4px;">
              <div>💵 <strong>${tipoValor}:</strong> R$ ${valorRenda.toLocaleString('pt-BR')}</div>
              ${mun.idh ? `<div>📈 <strong>IDH:</strong> ${mun.idh.toFixed(3)}</div>` : ''}
              ${mun.populacao ? `<div>👥 <strong>População:</strong> ${mun.populacao.toLocaleString('pt-BR')}</div>` : ''}
            </div>
            <p style="font-size: 10px; color: #6b7280; margin-top: 8px;">Fonte: IBGE</p>
          </div>
        `);

        incomeLayerRef.current!.addLayer(circle);
        addedCount++;
      });

      console.log(`✅ Renda: ${addedCount} municípios renderizados`);
    }
  }, [layers, mapReady, currentZoom, municipiosRenda]);

  // Update competition layer - agora usa dados de CNAE
  useEffect(() => {
    if (!competitionLayerRef.current || !mapReady) return;
    
    competitionLayerRef.current.clearLayers();
    
    const compLayer = layers.find(l => l.id === 'competition');
    if (!compLayer?.visible) return;

    // Se há CNAEs selecionados, mostra baseado nas empresas reais
    if (selectedCnaes.length > 0 && Object.keys(concorrenciaPorUF).length > 0) {
      const maxCount = Math.max(...Object.values(concorrenciaPorUF).map(d => d.count), 1);
      
      Object.entries(concorrenciaPorUF).forEach(([uf, data]) => {
        const ufData = DADOS_DEMOGRAFICOS_UF[uf];
        if (!ufData) return;

        const normalizedCount = data.count / maxCount;
        let fillColor = '#22c55e'; // verde - baixa concorrência
        if (normalizedCount > 0.6) fillColor = '#ef4444'; // vermelho - alta
        else if (normalizedCount > 0.3) fillColor = '#f59e0b'; // amarelo - média
        
        const radius = 15 + (normalizedCount * 30);

        const circle = L.circleMarker([ufData.lat, ufData.lng], {
          radius: radius,
          fillColor: fillColor,
          color: '#374151',
          weight: 2,
          opacity: 0.8,
          fillOpacity: 0.6
        });

        circle.bindPopup(`
          <div class="p-2">
            <strong>${uf} - Concorrência CNAE</strong>
            <br/><small>Empresas encontradas: ${data.count}</small>
            <br/><small>Nível: ${normalizedCount > 0.6 ? 'Alto' : normalizedCount > 0.3 ? 'Médio' : 'Baixo'}</small>
            <br/><small>CNAEs filtrados: ${selectedCnaes.length}</small>
            <br/><small class="text-muted-foreground">Fonte: Base de empresas</small>
          </div>
        `);

        competitionLayerRef.current!.addLayer(circle);
      });
    } else {
      // Fallback: mostra baseado em urbanização (comportamento anterior)
      Object.entries(DADOS_DEMOGRAFICOS_UF).forEach(([uf, data]) => {
        const competitionLevel = data.urbanizacao / 100;
        let fillColor = '#22c55e';
        if (competitionLevel > 0.85) fillColor = '#ef4444';
        else if (competitionLevel > 0.75) fillColor = '#f59e0b';

        const circle = L.circleMarker([data.lat, data.lng], {
          radius: 18,
          fillColor: fillColor,
          color: '#374151',
          weight: 1,
          opacity: 0.7,
          fillOpacity: 0.5
        });

        circle.bindPopup(`
          <div class="p-2">
            <strong>${uf} - Concorrência</strong>
            <br/><small>Nível: ${competitionLevel > 0.85 ? 'Alto' : competitionLevel > 0.75 ? 'Médio' : 'Baixo'}</small>
            <br/><small>Urbanização: ${data.urbanizacao}%</small>
            <br/><small class="text-muted-foreground">Selecione CNAEs para dados reais</small>
          </div>
        `);

        competitionLayerRef.current!.addLayer(circle);
      });
    }
  }, [layers, mapReady, selectedCnaes, concorrenciaPorUF]);

  // Marcadores individuais de empresas por CNAE
  useEffect(() => {
    if (!cnaeMarkersLayerRef.current || !mapReady) return;
    
    cnaeMarkersLayerRef.current.clearLayers();
    
    const compLayer = layers.find(l => l.id === 'competition');
    if (!compLayer?.visible || selectedCnaes.length === 0) return;

    empresasByCnae.forEach(empresa => {
      if (!empresa.latitude || !empresa.longitude) return;

      const customIcon = L.divIcon({
        className: 'custom-marker',
        html: `<div style="background: #ef4444; width: 20px; height: 20px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center;">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="white">
            <path d="M3 21h18M5 21V7l8-4 8 4v14M9 21v-6h6v6"/>
          </svg>
        </div>`,
        iconSize: [20, 20],
        iconAnchor: [10, 10]
      });

      L.marker([empresa.latitude, empresa.longitude], { icon: customIcon })
        .addTo(cnaeMarkersLayerRef.current!)
        .bindPopup(`
          <div class="p-2">
            <div style="background: #ef4444; color: white; padding: 4px 8px; border-radius: 4px; font-weight: bold; margin-bottom: 8px; display: inline-block; font-size: 11px;">
              🏪 CONCORRENTE
            </div>
            <br/>
            <strong>${empresa.nome_fantasia || empresa.nome}</strong>
            ${empresa.cnae_principal ? `<br/><small><strong>CNAE:</strong> ${empresa.cnae_principal}</small>` : ''}
            ${empresa.cnae_descricao ? `<br/><small>${empresa.cnae_descricao}</small>` : ''}
            ${empresa.endereco ? `<br/><small>${empresa.endereco}</small>` : ''}
            ${empresa.cidade ? `<br/><small>${empresa.cidade}${empresa.estado ? ` - ${empresa.estado}` : ''}</small>` : ''}
          </div>
        `);
    });
  }, [empresasByCnae, layers, mapReady, selectedCnaes]);

  // Update logistics layer - agora com dados municipais
  useEffect(() => {
    if (!logisticsLayerRef.current || !mapReady) return;
    
    logisticsLayerRef.current.clearLayers();
    
    const logLayer = layers.find(l => l.id === 'logistics');
    if (!logLayer?.visible) return;

    // Em zoom baixo (< 6): mostra por UF
    // Em zoom alto (>= 6): mostra por município usando dados de municipiosRenda
    if (currentZoom < 6) {
      // Visão por UF
      Object.entries(DADOS_DEMOGRAFICOS_UF).forEach(([uf, data]) => {
        const accessScore = Math.min(data.densidade / 100, 1);
        let accessLevel = 'baixo';
        let fillOpacity = 1;
        
        if (accessScore > 0.5) {
          accessLevel = 'alto';
          fillOpacity = 0;
        } else if (accessScore > 0.2) {
          accessLevel = 'medio';
          fillOpacity = 0.3;
        }

        const circle = L.circleMarker([data.lat, data.lng], {
          radius: 15,
          fillColor: '#06b6d4',
          color: '#06b6d4',
          weight: 2,
          opacity: 0.8,
          fillOpacity: fillOpacity
        });

        const tempoEntrega = Math.round((1 - accessScore) * 48 + 6);

        circle.bindPopup(`
          <div class="p-2">
            <strong>${uf} - Logística</strong>
            <br/><small>Acesso: ${accessLevel.charAt(0).toUpperCase() + accessLevel.slice(1)}</small>
            <br/><small>Tempo Estimado: ${tempoEntrega}h</small>
            <br/><small class="text-muted-foreground">Fonte: DNIT/OSM</small>
          </div>
        `);

        logisticsLayerRef.current!.addLayer(circle);
      });
    } else {
      // Visão por município - usa população como proxy de acessibilidade logística
      // (municípios maiores geralmente têm melhor infraestrutura)
      const municipiosComDados = municipiosRenda.filter(m => 
        m.latitude && m.longitude && m.populacao && m.populacao > 0
      );

      if (municipiosComDados.length === 0) {
        console.log('📦 Logística: Sem dados municipais, aguardando carregamento...');
        return;
      }

      // Calcula score de acessibilidade baseado em população (proxy)
      const maxPop = Math.max(...municipiosComDados.map(m => m.populacao!));
      const minPop = Math.min(...municipiosComDados.filter(m => m.populacao! > 1000).map(m => m.populacao!));

      municipiosComDados.forEach(mun => {
        const pop = mun.populacao!;
        
        // Normalização logarítmica para melhor distribuição
        const logMax = Math.log10(maxPop);
        const logMin = Math.log10(Math.max(minPop, 1000));
        const logPop = Math.log10(Math.max(pop, 1000));
        const accessScore = Math.min((logPop - logMin) / (logMax - logMin), 1);
        
        let accessLevel = 'baixo';
        let fillColor = '#ef4444'; // vermelho
        let fillOpacity = 0.6;
        let tempoEntrega = 72; // horas
        
        if (accessScore > 0.6) {
          accessLevel = 'alto';
          fillColor = '#22c55e'; // verde
          fillOpacity = 0.6;
          tempoEntrega = 6;
        } else if (accessScore > 0.3) {
          accessLevel = 'medio';
          fillColor = '#f59e0b'; // amarelo
          fillOpacity = 0.6;
          tempoEntrega = 24;
        } else {
          tempoEntrega = Math.round((1 - accessScore) * 48 + 24);
        }

        const radius = Math.max(4, 4 + (accessScore * 12));

        const circle = L.circleMarker([mun.latitude!, mun.longitude!], {
          radius: radius,
          fillColor: fillColor,
          color: '#0891b2',
          weight: 1,
          opacity: 0.8,
          fillOpacity: fillOpacity
        });

        circle.bindPopup(`
          <div class="p-3">
            <strong style="font-size: 14px;">🚚 ${mun.municipio} - ${mun.uf}</strong>
            <hr style="margin: 8px 0; border-color: #e5e7eb;"/>
            <div style="display: grid; gap: 4px;">
              <div>📦 <strong>Acesso Logístico:</strong> ${accessLevel.charAt(0).toUpperCase() + accessLevel.slice(1)}</div>
              <div>⏱️ <strong>Tempo Estimado:</strong> ${tempoEntrega}h</div>
              <div>👥 <strong>População:</strong> ${pop.toLocaleString('pt-BR')}</div>
              ${mun.regiao ? `<div>🗺️ <strong>Região:</strong> ${mun.regiao}</div>` : ''}
            </div>
            <p style="font-size: 10px; color: #6b7280; margin-top: 8px;">Estimativa baseada em infraestrutura regional</p>
          </div>
        `);

        logisticsLayerRef.current!.addLayer(circle);
      });

      console.log(`✅ Logística: ${municipiosComDados.length} municípios renderizados`);
    }
  }, [layers, mapReady, currentZoom, municipiosRenda]);

  // NOVA CAMADA: Heatmap por Município (dados importados)
  useEffect(() => {
    if (!heatmapLayerRef.current || !mapReady) return;
    
    heatmapLayerRef.current.clearLayers();
    
    const compLayer = layers.find(l => l.id === 'competition');
    if (!compLayer?.visible || selectedCnaes.length === 0 || heatmapData.length === 0) return;

    // Calcula max para normalização
    const maxQuantidade = Math.max(...heatmapData.map(d => d.quantidade), 1);
    
    // Renderiza círculos por município
    heatmapData.forEach(data => {
      if (!data.latitude || !data.longitude) return;
      
      const normalized = data.quantidade / maxQuantidade;
      
      // Cor baseada na intensidade (verde -> amarelo -> vermelho)
      let fillColor = '#22c55e'; // verde
      if (normalized > 0.6) fillColor = '#ef4444'; // vermelho
      else if (normalized > 0.3) fillColor = '#f59e0b'; // amarelo
      
      // Tamanho proporcional à quantidade
      const radius = Math.max(5, Math.min(normalized * 25 + 5, 30));
      
      const circle = L.circleMarker([data.latitude, data.longitude], {
        radius: radius,
        fillColor: fillColor,
        color: '#374151',
        weight: 1,
        opacity: 0.8,
        fillOpacity: 0.6
      });

      circle.bindPopup(`
        <div class="p-2">
          <strong>${data.municipio} - ${data.uf}</strong>
          <br/><small>📊 Empresas: <strong>${data.quantidade.toLocaleString('pt-BR')}</strong></small>
          ${data.cnae_descricao ? `<br/><small>CNAE: ${data.cnae_descricao}</small>` : ''}
          <br/><small>Densidade: ${normalized > 0.6 ? 'Alta' : normalized > 0.3 ? 'Média' : 'Baixa'}</small>
          <br/><small class="text-muted-foreground">Fonte: Dados importados</small>
        </div>
      `);

      heatmapLayerRef.current!.addLayer(circle);
    });
  }, [layers, mapReady, selectedCnaes, heatmapData]);

  // NOVA CAMADA: Renda Municipal (dados importados) - só aparece com zoom alto
  useEffect(() => {
    if (!municipalIncomeLayerRef.current || !mapReady) return;
    
    municipalIncomeLayerRef.current.clearLayers();
    
    const incomeLayer = layers.find(l => l.id === 'municipal_income');
    if (!incomeLayer?.visible) return;

    // Se não há dados municipais, mostra mensagem no centro
    if (municipiosRenda.length === 0) {
      const center = mapRef.current?.getCenter();
      if (center) {
        const marker = L.marker([center.lat, center.lng], {
          icon: L.divIcon({
            className: 'custom-info-marker',
            html: `<div style="background: #fef3c7; border: 2px solid #f59e0b; border-radius: 8px; padding: 8px 12px; white-space: nowrap; font-size: 12px;">
              📊 Importe dados de renda usando o botão "Importar Renda"
            </div>`,
            iconSize: [280, 40],
            iconAnchor: [140, 20]
          })
        });
        municipalIncomeLayerRef.current.addLayer(marker);
      }
      return;
    }

    // Mostra dados municipais - usa renda_media ou pib_per_capita como fallback
    // Filtra municípios com dados válidos (PIB > 0 é suficiente já que renda_media está vazia)
    const municipiosComDados = municipiosRenda.filter(m => 
      m.latitude && m.longitude && (m.renda_media || (m.pib_per_capita && m.pib_per_capita > 0))
    );
    
    console.log(`📊 Renda Municipal: ${municipiosComDados.length} municípios com dados válidos de ${municipiosRenda.length} total`);
    
    if (municipiosComDados.length === 0) {
      console.log('Nenhum município com dados de renda/PIB encontrado');
      return;
    }
    
    const valoresRenda = municipiosComDados.map(m => m.renda_media || m.pib_per_capita!);
    const maxRenda = Math.max(...valoresRenda, 1);
    const minRenda = Math.min(...valoresRenda.filter(v => v > 0));

    let addedCount = 0;
    municipiosComDados.forEach(mun => {
      // Usa renda_media se disponível, senão pib_per_capita
      const valorRenda = mun.renda_media || mun.pib_per_capita!;

      // Normalização logarítmica para melhor distribuição visual (PIB varia muito)
      const logMax = Math.log10(maxRenda);
      const logMin = Math.log10(Math.max(minRenda, 1));
      const logValor = Math.log10(Math.max(valorRenda, 1));
      const normalized = (logValor - logMin) / (logMax - logMin);
      
      // Raio mínimo de 4 para garantir visibilidade
      const radius = Math.max(4, 4 + (normalized * 16));

      // Cor: vermelho (baixa) -> amarelo -> verde (alta)
      let fillColor = '#ef4444';
      if (normalized > 0.6) fillColor = '#22c55e';
      else if (normalized > 0.3) fillColor = '#f59e0b';

      const circle = L.circleMarker([mun.latitude!, mun.longitude!], {
        radius: radius,
        fillColor: fillColor,
        color: '#374151',
        weight: 1,
        opacity: 0.8,
        fillOpacity: 0.6
      });

      const tipoValor = mun.renda_media ? 'Renda Média' : 'PIB per Capita';
      circle.bindPopup(`
        <div class="p-3">
          <strong style="font-size: 14px;">📍 ${mun.municipio} - ${mun.uf}</strong>
          <hr style="margin: 8px 0; border-color: #e5e7eb;"/>
          <div style="display: grid; gap: 4px;">
            <div>💰 <strong>${tipoValor}:</strong> R$ ${valorRenda.toLocaleString('pt-BR')}</div>
            ${mun.idh ? `<div>📈 <strong>IDH:</strong> ${mun.idh.toFixed(3)}</div>` : ''}
            ${mun.populacao ? `<div>👥 <strong>População:</strong> ${mun.populacao.toLocaleString('pt-BR')}</div>` : ''}
          </div>
          <p style="font-size: 10px; color: #6b7280; margin-top: 8px;">Fonte: IBGE</p>
        </div>
      `);

      municipalIncomeLayerRef.current!.addLayer(circle);
      addedCount++;
    });
    
    console.log(`✅ Renda Municipal: ${addedCount} marcadores adicionados ao mapa`);
  }, [layers, mapReady, municipiosRenda]);

  // NOVA CAMADA: Densidade de Estabelecimentos por município
  useEffect(() => {
    if (!densityLayerRef.current || !mapReady) return;
    
    densityLayerRef.current.clearLayers();
    
    const densityLayer = layers.find(l => l.id === 'density');
    if (!densityLayer?.visible || heatmapData.length === 0) return;

    const maxQtd = Math.max(...heatmapData.map(d => d.quantidade), 1);

    heatmapData.forEach(data => {
      if (!data.latitude || !data.longitude) return;

      const normalized = data.quantidade / maxQtd;
      const radius = 6 + (normalized * 25);

      const circle = L.circleMarker([data.latitude, data.longitude], {
        radius: radius,
        fillColor: '#f97316',
        color: '#c2410c',
        weight: 1,
        opacity: 0.8,
        fillOpacity: 0.5
      });

      circle.bindPopup(`
        <div class="p-3">
          <strong style="font-size: 14px;">🏢 ${data.municipio} - ${data.uf}</strong>
          <hr style="margin: 8px 0; border-color: #e5e7eb;"/>
          <div style="display: grid; gap: 4px;">
            <div>📊 <strong>Empresas:</strong> ${data.quantidade.toLocaleString('pt-BR')}</div>
            ${data.cnae_descricao ? `<div>🏷️ <strong>CNAE:</strong> ${data.cnae_descricao}</div>` : ''}
          </div>
        </div>
      `);

      densityLayerRef.current!.addLayer(circle);
    });
  }, [layers, mapReady, heatmapData]);

  // Effect para gerenciar click do mapa para desenho de polígono
  useEffect(() => {
    if (!mapRef.current || !mapReady) return;

    const map = mapRef.current;
    
    // Inicializa layers do polígono se necessário
    if (!polygonLayerRef.current) {
      polygonLayerRef.current = L.layerGroup().addTo(map);
    }
    if (!tempMarkersRef.current) {
      tempMarkersRef.current = L.layerGroup().addTo(map);
    }

    const handleMapClick = (e: L.LeafletMouseEvent) => {
      if (isDrawing) {
        addPoint(e.latlng.lat, e.latlng.lng);
      } else if (isSelectingPoint) {
        setSelectedMapPoint({ lat: e.latlng.lat, lng: e.latlng.lng });
        setIsSelectingPoint(false);
      }
    };

    map.on('click', handleMapClick);

    return () => {
      map.off('click', handleMapClick);
    };
  }, [mapReady, isDrawing, isSelectingPoint, addPoint]);

  // Effect para renderizar o polígono sendo desenhado
  useEffect(() => {
    if (!polygonLayerRef.current || !tempMarkersRef.current || !mapReady) return;

    // Limpa layers
    polygonLayerRef.current.clearLayers();
    tempMarkersRef.current.clearLayers();

    if (polygonPoints.length === 0) return;

    // Adiciona marcadores para cada ponto
    polygonPoints.forEach((point, idx) => {
      const marker = L.circleMarker([point.lat, point.lng], {
        radius: 6,
        fillColor: idx === 0 ? '#22c55e' : '#3b82f6',
        color: '#ffffff',
        weight: 2,
        fillOpacity: 1
      });
      
      marker.bindTooltip(`Ponto ${idx + 1}`, { permanent: false });
      tempMarkersRef.current!.addLayer(marker);
    });

    // Desenha as linhas do polígono
    if (polygonPoints.length >= 2) {
      const latlngs = polygonPoints.map(p => [p.lat, p.lng] as [number, number]);
      
      // Se não está mais desenhando (polígono fechado), fecha o polígono
      if (!isDrawing && polygonPoints.length >= 3) {
        latlngs.push(latlngs[0]); // Fecha o polígono
      }
      
      const polyline = L.polyline(latlngs, {
        color: '#3b82f6',
        weight: 3,
        opacity: 0.8,
        dashArray: isDrawing ? '10, 10' : undefined
      });
      
      polygonLayerRef.current.addLayer(polyline);

      // Se fechou o polígono, adiciona área preenchida
      if (!isDrawing && polygonPoints.length >= 3) {
        const polygon = L.polygon(polygonPoints.map(p => [p.lat, p.lng] as [number, number]), {
          color: '#3b82f6',
          fillColor: '#3b82f6',
          fillOpacity: 0.2,
          weight: 2
        });
        polygonLayerRef.current.addLayer(polygon);
      }
    }
  }, [polygonPoints, isDrawing, mapReady]);

  const handleZoomIn = () => mapRef.current?.zoomIn();
  const handleZoomOut = () => mapRef.current?.zoomOut();
  const handleReset = () => mapRef.current?.setView([-15.7801, -47.9292], 4);

  const activeLayersCount = layers.filter(l => l.visible).length;
  const unidadesNoMapa = unidades.filter(u => u.latitude && u.longitude).length;
  const empresasNoMapa = empresas.filter(e => e.latitude && e.longitude).length;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-[100vw] w-[100vw] h-[100vh] sm:max-w-[98vw] sm:w-[98vw] sm:h-[95vh] p-0 gap-0 rounded-none sm:rounded-lg z-[9999]" aria-describedby={undefined}>
        <VisuallyHidden>
          <DialogTitle>Mapa Geoespacial em Tela Cheia</DialogTitle>
        </VisuallyHidden>
        
        <div className="relative w-full h-full flex flex-col">
          {/* Header - Responsivo */}
          <div className="flex flex-col gap-2 p-2 sm:p-3 border-b bg-background z-10">
            {/* Linha 1: Título, Badges e Fechar */}
            <div className="flex items-center justify-between w-full">
              <h2 className="text-sm sm:text-lg font-semibold flex items-center gap-1.5 sm:gap-2">
                <MapPin className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                <span className="hidden sm:inline">Mapa Geoespacial</span>
                <span className="sm:hidden">Mapa</span>
              </h2>
              
              {/* Badges */}
              <div className="flex items-center gap-1.5">
                {unidadesNoMapa > 0 && (
                  <Badge variant="outline" className="bg-pink-500/10 border-pink-500/50 text-pink-700 text-[10px] sm:text-xs px-1 sm:px-1.5 h-5 sm:h-6">
                    <MapPin className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-0.5" />
                    {unidadesNoMapa}
                  </Badge>
                )}
                <Badge variant="secondary" className="text-[10px] sm:text-xs px-1 sm:px-1.5 h-5 sm:h-6">
                  <Building2 className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-0.5" />
                  {empresasNoMapa}
                </Badge>
              </div>
              
              {/* Fechar */}
              <Button variant="ghost" size="icon" onClick={onClose} className="h-7 w-7 sm:h-8 sm:w-8 ml-1">
                <X className="h-4 w-4 sm:h-5 sm:w-5" />
              </Button>
            </div>

            {/* Linha 2: Filtros e Controles - scrollável horizontalmente */}
            <div className="flex items-center gap-1.5 sm:gap-2 w-full overflow-x-auto pb-1 scrollbar-hide">
              {/* Filtro de CNAE para Concorrência */}
              {onCnaesChange && (
                <CnaeFilterSelect
                  selectedCnaes={selectedCnaes}
                  onCnaesChange={onCnaesChange}
                />
              )}

              {/* Importador de dados CNAE - hidden on mobile */}
              <div className="hidden sm:block">
                <CnaeHeatmapImporter onImportComplete={refetchHeatmap} />
              </div>
              
              {/* Carregar dados IBGE - hidden on mobile */}
              <div className="hidden sm:block">
                <IBGEDataLoader onLoadComplete={refetchRenda} />
              </div>
              
              {/* Painel de Isócronas */}
              <IsochronePanel selectedPoint={selectedMapPoint} />

              {/* Controles de Desenho de Polígono */}
              <div className="flex items-center gap-1 shrink-0">
                {!isDrawing && !showResults && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-7 sm:h-8 text-[10px] sm:text-xs px-2 sm:px-3 shrink-0"
                    onClick={startDrawing}
                  >
                    <PenTool className="h-3 w-3 mr-0.5 sm:mr-1" />
                    <span className="hidden sm:inline">Desenhar</span>
                    <span className="sm:hidden">Área</span>
                  </Button>
                )}
                
                {isDrawing && (
                  <>
                    <Badge variant="secondary" className="h-7 sm:h-8 px-1.5 sm:px-2 flex items-center gap-0.5 text-[10px] sm:text-xs">
                      <PenTool className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                      {polygonPoints.length}
                    </Badge>
                    <Button 
                      variant="outline" 
                      size="icon"
                      className="h-7 w-7 sm:h-8 sm:w-8"
                      onClick={removeLastPoint}
                      disabled={polygonPoints.length === 0}
                    >
                      <Undo2 className="h-3 w-3 sm:h-4 sm:w-4" />
                    </Button>
                    <Button 
                      variant="default" 
                      size="sm"
                      className="h-7 sm:h-8 text-[10px] sm:text-xs px-2"
                      onClick={finishDrawing}
                      disabled={polygonPoints.length < 3}
                    >
                      <Check className="h-3 w-3 sm:h-4 sm:w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      className="h-7 w-7 sm:h-8 sm:w-8"
                      onClick={cancelDrawing}
                    >
                      <X className="h-3 w-3 sm:h-4 sm:w-4" />
                    </Button>
                  </>
                )}
                
                {showResults && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="h-7 sm:h-8 text-[10px] sm:text-xs px-2"
                    onClick={clearPolygon}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                )}
              </div>

              {/* Filtro de Usuário */}
              <Select value={selectedUsuarioId} onValueChange={onUsuarioChange}>
                <SelectTrigger className="w-[100px] sm:w-[140px] h-7 sm:h-8 text-[10px] sm:text-xs shrink-0">
                  <Filter className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-0.5 sm:mr-1 shrink-0" />
                  <SelectValue placeholder="Usuário" />
                </SelectTrigger>
                <SelectContent 
                  className="bg-popover" 
                  style={{ zIndex: 99999 }}
                  position="popper"
                  sideOffset={4}
                >
                  <SelectItem value="all">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      Todas
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

              {/* Dropdown Camadas */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-7 sm:h-8 text-[10px] sm:text-xs px-2 sm:px-3 shrink-0">
                    <Layers className="h-3 w-3 mr-0.5 sm:mr-1" />
                    <span className="hidden sm:inline">Camadas</span>
                    <Badge variant="secondary" className="ml-0.5 sm:ml-1 h-4 sm:h-5 px-1 text-[10px] sm:text-xs">
                      {activeLayersCount}
                    </Badge>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-72 bg-popover" style={{ zIndex: 99999 }}>
                  <DropdownMenuLabel className="flex items-center gap-2">
                    <Layers className="h-4 w-4" />
                    Camadas do Mapa
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <div className="p-2 space-y-3 max-h-[300px] overflow-y-auto">
                    {layers.map((layer) => (
                      <div 
                        key={layer.id} 
                        className="flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <div 
                            className="w-3 h-3 rounded-full shrink-0"
                            style={{ backgroundColor: layer.color }}
                          />
                          <Label 
                            htmlFor={`layer-fs-${layer.id}`}
                            className="text-sm cursor-pointer truncate"
                          >
                            {layer.name}
                          </Label>
                        </div>
                        <Switch
                          id={`layer-fs-${layer.id}`}
                          checked={layer.visible}
                          onCheckedChange={() => onLayerToggle(layer.id)}
                        />
                      </div>
                    ))}
                  </div>
                  <DropdownMenuSeparator />
                  <div className="p-2 space-y-2 max-h-[180px] overflow-y-auto">
                    <div className="text-xs font-medium text-foreground">Legenda:</div>
                    {layers.filter(l => l.visible).length === 0 ? (
                      <p className="text-xs text-muted-foreground italic">Nenhuma camada ativa</p>
                    ) : (
                      layers.filter(l => l.visible).map(layer => (
                        <div key={layer.id} className="text-xs space-y-0.5 pb-1.5 border-b border-border/50 last:border-0">
                          <div className="flex items-center gap-2 font-medium">
                            <div 
                              className="w-2.5 h-2.5 rounded-full shrink-0"
                              style={{ backgroundColor: layer.color }}
                            />
                            <span>{layer.name}</span>
                          </div>
                          {layer.id === 'units' && (
                            <div className="text-muted-foreground pl-4 space-y-0.5">
                              <p>📍 Marcador rosa = Filiais da empresa</p>
                              <p>Clique para ver detalhes da unidade</p>
                            </div>
                          )}
                          {layer.id === 'clients' && (
                            <div className="text-muted-foreground pl-4 space-y-0.5">
                              <p>🏢 Marcador azul = Empresas cadastradas</p>
                              <p>Clique para ver dados do cliente</p>
                            </div>
                          )}
                          {layer.id === 'sales' && (
                            <div className="text-muted-foreground pl-4 space-y-0.5">
                              <p>📊 Tamanho do círculo = Volume de vendas</p>
                              <p>🟢 Verde = Maior faturamento</p>
                            </div>
                          )}
                          {layer.id === 'demographics' && (
                            <div className="text-muted-foreground pl-4 space-y-0.5">
                              <p>👥 Zoom baixo: Regiões e Estados</p>
                              <p>👥 Zoom alto: 5570 Municípios</p>
                              <p>Círculo maior = Maior população</p>
                              <p>Exibe: População, PIB e IDH</p>
                            </div>
                          )}
                          {layer.id === 'income' && (
                            <div className="text-muted-foreground pl-4 space-y-0.5">
                              <p>💰 Renda média por região</p>
                              <p>Tamanho = Poder de compra</p>
                            </div>
                          )}
                          {layer.id === 'competition' && (
                            <div className="text-muted-foreground pl-4 space-y-0.5">
                              <p>🏪 Concorrentes por região</p>
                              <p>🟢 Baixa | 🟡 Média | 🔴 Alta concorrência</p>
                            </div>
                          )}
                          {layer.id === 'logistics' && (
                            <div className="text-muted-foreground pl-4 space-y-0.5">
                              <p>🚚 Análise de acessibilidade</p>
                              <p>Preenchido = Difícil acesso logístico</p>
                            </div>
                          )}
                          {layer.id === 'isochrone' && (
                            <div className="text-muted-foreground pl-4 space-y-0.5">
                              <p>⏱️ Área de cobertura por tempo</p>
                              <p>Selecione um ponto no mapa</p>
                            </div>
                          )}
                          {layer.id === 'density' && (
                            <div className="text-muted-foreground pl-4 space-y-0.5">
                              <p>🟠 Empresas por município</p>
                              <p>Círculo maior = Mais empresas</p>
                              <p>Baseado nos CNAEs selecionados</p>
                            </div>
                          )}
                          {layer.id === 'municipal_income' && (
                            <div className="text-muted-foreground pl-4 space-y-0.5">
                              <p>💵 PIB per capita por município</p>
                              <p>🟢 Alto | 🟡 Médio | 🔴 Baixo</p>
                              <p>Fonte: Dados IBGE</p>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Zoom Controls */}
              <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
                <Button variant="outline" size="icon" onClick={handleZoomIn} className="h-7 w-7 sm:h-8 sm:w-8">
                  <ZoomIn className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </Button>
                <Button variant="outline" size="icon" onClick={handleZoomOut} className="h-7 w-7 sm:h-8 sm:w-8">
                  <ZoomOut className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </Button>
                <Button variant="outline" size="icon" onClick={handleReset} className="h-7 w-7 sm:h-8 sm:w-8 hidden sm:flex">
                  <RotateCcw className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Map Content */}
          <div className="flex-1 relative overflow-hidden">
            <div 
              ref={mapContainerRef} 
              className="absolute inset-0 w-full h-full"
              style={{ zIndex: 1 }}
            />

            {/* Indicador de modo de desenho */}
            {isDrawing && (
              <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-blue-500 text-white rounded-lg px-4 py-2 z-20 flex items-center gap-2 shadow-lg">
                <PenTool className="h-4 w-4 animate-pulse" />
                <span className="text-sm font-medium">
                  Clique no mapa para adicionar pontos ({polygonPoints.length} de 3 mín.)
                </span>
              </div>
            )}

            {/* Painel de resultados do polígono */}
            {showResults && polygonMetrics && (
              <PolygonResultsPanel
                metrics={polygonMetrics}
                onClose={() => setShowResults(false)}
                onClear={clearPolygon}
              />
            )}

            {/* Indicador de nível de zoom */}
            {mapReady && !showResults && (
              <div className="absolute bottom-4 left-4 bg-background/90 backdrop-blur-sm border rounded-lg px-3 py-2 z-10 text-xs max-w-xs">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Nível:</span>
                  <Badge variant={currentLevel === 'municipal' || currentLevel === 'local' ? 'default' : 'secondary'}>
                    {currentLevel === 'country' && '🌎 País'}
                    {currentLevel === 'region' && '🗺️ Região'}
                    {currentLevel === 'state' && '📍 Estado'}
                    {currentLevel === 'municipal' && '🏙️ Município'}
                    {currentLevel === 'local' && '📌 Local'}
                  </Badge>
                  <span className="text-muted-foreground">Zoom: {currentZoom}</span>
                </div>
                {(currentLevel === 'country' || currentLevel === 'region') && (
                  <p className="text-muted-foreground mt-1">🔍 Dê zoom para ver detalhes por UF</p>
                )}
                {municipiosRenda.length === 0 && currentLevel === 'state' && (
                  <p className="text-amber-600 mt-1">⚠️ Use "Carregar Dados IBGE" para dados municipais</p>
                )}
              </div>
            )}
            
            {/* Alerta de dados não carregados */}
            {mapReady && municipiosRenda.length === 0 && (currentLevel === 'municipal' || currentLevel === 'local') && !isDrawing && (
              <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2 z-10 flex items-center gap-3 shadow-lg">
                <span className="text-amber-700 text-sm">📊 Dados municipais não carregados</span>
                <IBGEDataLoader onLoadComplete={refetchRenda} />
              </div>
            )}

            {!mapReady && (
              <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
                <div className="text-muted-foreground">Carregando mapa...</div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FullscreenMapModal;
