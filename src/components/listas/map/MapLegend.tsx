import React from 'react';
import { MapLayer, VendasRegiao } from './MapLayerTypes';
import { Card } from '@/components/ui/card';
import { TrendingUp, MapPin, Users, Wallet, Store, Truck } from 'lucide-react';

interface MapLegendProps {
  layers: MapLayer[];
  vendasData?: VendasRegiao[];
  totalEmpresas?: number;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
};

const MapLegend: React.FC<MapLegendProps> = ({ layers, vendasData = [], totalEmpresas = 0 }) => {
  const activeLayers = layers.filter(l => l.visible);
  
  const totalVendas = vendasData.reduce((acc, v) => acc + v.total_vendas, 0);
  const totalOrcamentos = vendasData.reduce((acc, v) => acc + v.total_orcamentos, 0);
  const valorTotal = vendasData.reduce((acc, v) => acc + v.valor_total, 0);

  return (
    <Card className="p-3 bg-card/95 backdrop-blur-sm">
      <div className="text-xs font-semibold mb-2 text-muted-foreground">LEGENDA</div>
      
      <div className="space-y-2">
        {/* Clientes */}
        {activeLayers.find(l => l.id === 'clients') && (
          <div className="flex items-center gap-2 text-xs">
            <div className="w-3 h-3 rounded-full bg-blue-500" />
            <span>Empresas ({totalEmpresas})</span>
          </div>
        )}

        {/* Vendas */}
        {activeLayers.find(l => l.id === 'sales') && (
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs">
              <TrendingUp className="h-3 w-3 text-green-500" />
              <span>Orçamentos: {totalOrcamentos}</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <span>Vendas: {totalVendas}</span>
            </div>
            <div className="text-xs text-muted-foreground pl-5">
              Total: {formatCurrency(valorTotal)}
            </div>
          </div>
        )}

        {/* Demographics */}
        {activeLayers.find(l => l.id === 'demographics') && (
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs">
              <Users className="h-3 w-3 text-purple-500" />
              <span>População (IBGE 2022)</span>
            </div>
            <div className="flex gap-1 pl-5">
              <div className="w-4 h-2 bg-purple-200 rounded-sm" />
              <div className="w-4 h-2 bg-purple-400 rounded-sm" />
              <div className="w-4 h-2 bg-purple-600 rounded-sm" />
              <div className="w-4 h-2 bg-purple-800 rounded-sm" />
            </div>
            <div className="text-xs text-muted-foreground pl-5">
              Menor → Maior densidade
            </div>
          </div>
        )}

        {/* Renda */}
        {activeLayers.find(l => l.id === 'income') && (
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs">
              <Wallet className="h-3 w-3 text-amber-500" />
              <span>Renda Média (IBGE)</span>
            </div>
            <div className="flex gap-1 pl-5">
              <div className="w-4 h-2 bg-amber-200 rounded-sm" />
              <div className="w-4 h-2 bg-amber-400 rounded-sm" />
              <div className="w-4 h-2 bg-amber-600 rounded-sm" />
              <div className="w-4 h-2 bg-amber-800 rounded-sm" />
            </div>
            <div className="text-xs text-muted-foreground pl-5">
              R$ 876 → R$ 3.245
            </div>
          </div>
        )}

        {/* Concorrência */}
        {activeLayers.find(l => l.id === 'competition') && (
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs">
              <Store className="h-3 w-3 text-red-500" />
              <span>Concorrência</span>
            </div>
            <div className="flex gap-1 pl-5">
              <div className="w-4 h-2 bg-green-400 rounded-sm" title="Baixa" />
              <div className="w-4 h-2 bg-yellow-400 rounded-sm" title="Média" />
              <div className="w-4 h-2 bg-red-400 rounded-sm" title="Alta" />
            </div>
            <div className="text-xs text-muted-foreground pl-5">
              Baixa → Alta saturação
            </div>
          </div>
        )}

        {/* Logística */}
        {activeLayers.find(l => l.id === 'logistics') && (
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs">
              <Truck className="h-3 w-3 text-cyan-500" />
              <span>Acesso Logístico</span>
            </div>
            <div className="flex gap-1 items-center pl-5 text-xs">
              <div className="w-3 h-3 rounded-full border-2 border-cyan-500 bg-transparent" />
              <span className="text-muted-foreground">Alto</span>
              <div className="w-3 h-3 rounded-full border-2 border-cyan-500 bg-cyan-200 ml-2" />
              <span className="text-muted-foreground">Médio</span>
              <div className="w-3 h-3 rounded-full bg-cyan-500 ml-2" />
              <span className="text-muted-foreground">Baixo</span>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};

export default MapLegend;
