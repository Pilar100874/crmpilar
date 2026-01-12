import React from 'react';
import { X, Users, DollarSign, Building2, MapPin, TrendingUp, Calculator } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

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

interface PolygonResultsPanelProps {
  metrics: PolygonMetrics | null;
  onClose: () => void;
  onClear: () => void;
}

const formatNumber = (value: number): string => {
  if (value >= 1e12) return `${(value / 1e12).toFixed(2)} tri`;
  if (value >= 1e9) return `${(value / 1e9).toFixed(2)} bi`;
  if (value >= 1e6) return `${(value / 1e6).toFixed(2)} mi`;
  if (value >= 1e3) return `${(value / 1e3).toFixed(1)} mil`;
  return value.toLocaleString('pt-BR');
};

const formatCurrency = (value: number): string => {
  if (value >= 1e12) return `R$ ${(value / 1e12).toFixed(2)} tri`;
  if (value >= 1e9) return `R$ ${(value / 1e9).toFixed(2)} bi`;
  if (value >= 1e6) return `R$ ${(value / 1e6).toFixed(2)} mi`;
  return `R$ ${value.toLocaleString('pt-BR')}`;
};

export const PolygonResultsPanel: React.FC<PolygonResultsPanelProps> = ({
  metrics,
  onClose,
  onClear
}) => {
  if (!metrics) return null;

  return (
    <div className="absolute bottom-4 left-4 bg-background/95 backdrop-blur-sm border rounded-lg shadow-lg z-[1000] w-80 max-h-[60vh] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b">
        <div className="flex items-center gap-2">
          <Calculator className="h-5 w-5 text-primary" />
          <h3 className="font-semibold text-sm">Resumo da Área</h3>
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Métricas principais */}
      <div className="p-3 space-y-3">
        {/* Área e municípios */}
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-muted/50 rounded-lg p-2 text-center">
            <div className="text-xs text-muted-foreground">Área</div>
            <div className="font-bold text-lg">{formatNumber(metrics.areaKm2)} km²</div>
          </div>
          <div className="bg-muted/50 rounded-lg p-2 text-center">
            <div className="text-xs text-muted-foreground">Municípios</div>
            <div className="font-bold text-lg">{metrics.municipiosCount}</div>
          </div>
        </div>

        <Separator />

        {/* População */}
        <div className="flex items-center gap-3 p-2 bg-blue-500/10 rounded-lg">
          <div className="bg-blue-500/20 p-2 rounded-lg">
            <Users className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <div className="text-xs text-muted-foreground">População Total</div>
            <div className="font-bold text-lg">{formatNumber(metrics.totalPopulacao)}</div>
          </div>
        </div>

        {/* PIB */}
        <div className="flex items-center gap-3 p-2 bg-green-500/10 rounded-lg">
          <div className="bg-green-500/20 p-2 rounded-lg">
            <DollarSign className="h-5 w-5 text-green-600" />
          </div>
          <div className="flex-1">
            <div className="text-xs text-muted-foreground">PIB Total Estimado</div>
            <div className="font-bold text-lg">{formatCurrency(metrics.pibTotal)}</div>
            <div className="text-xs text-muted-foreground">
              Média per capita: {formatCurrency(metrics.pibMedio)}
            </div>
          </div>
        </div>

        {/* Empresas */}
        <div className="flex items-center gap-3 p-2 bg-orange-500/10 rounded-lg">
          <div className="bg-orange-500/20 p-2 rounded-lg">
            <Building2 className="h-5 w-5 text-orange-600" />
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Total de Empresas</div>
            <div className="font-bold text-lg">{formatNumber(metrics.totalEmpresas)}</div>
            <div className="text-xs text-muted-foreground">
              {metrics.totalEmpresas > 0 && metrics.totalPopulacao > 0 
                ? `${((metrics.totalEmpresas / metrics.totalPopulacao) * 1000).toFixed(1)} por mil hab.`
                : 'Selecione CNAEs para ver empresas'
              }
            </div>
          </div>
        </div>

        {/* IDH */}
        {metrics.idhMedio > 0 && (
          <div className="flex items-center gap-3 p-2 bg-purple-500/10 rounded-lg">
            <div className="bg-purple-500/20 p-2 rounded-lg">
              <TrendingUp className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground">IDH Médio</div>
              <div className="font-bold text-lg">{metrics.idhMedio.toFixed(3)}</div>
            </div>
          </div>
        )}
      </div>

      {/* Lista de municípios */}
      {metrics.municipios.length > 0 && (
        <>
          <Separator />
          <div className="p-2">
            <div className="flex items-center gap-2 px-2 py-1">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground font-medium">
                Municípios na área ({metrics.municipios.length})
              </span>
            </div>
            <ScrollArea className="h-32">
              <div className="space-y-1 p-1">
                {metrics.municipios.slice(0, 50).map((mun, idx) => (
                  <div key={idx} className="text-xs px-2 py-1 bg-muted/30 rounded">
                    {mun}
                  </div>
                ))}
                {metrics.municipios.length > 50 && (
                  <div className="text-xs px-2 py-1 text-muted-foreground italic">
                    ... e mais {metrics.municipios.length - 50} municípios
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        </>
      )}

      {/* Ações */}
      <div className="p-2 border-t">
        <Button variant="outline" size="sm" className="w-full" onClick={onClear}>
          Limpar Seleção
        </Button>
      </div>
    </div>
  );
};
