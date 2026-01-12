import React from 'react';
import { X, Users, DollarSign, Building2, MapPin, TrendingUp, Calculator, ChevronUp, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useState } from 'react';

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
  const [isExpanded, setIsExpanded] = useState(false);
  
  if (!metrics) return null;

  return (
    <>
      {/* Mobile: Bottom Sheet Style */}
      <div className="md:hidden absolute bottom-0 left-0 right-0 bg-background/95 backdrop-blur-md border-t rounded-t-2xl shadow-2xl z-[1000] flex flex-col max-h-[70vh]">
        {/* Handle + Header */}
        <div 
          className="flex flex-col items-center pt-2 pb-1 cursor-pointer"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="w-10 h-1 bg-muted-foreground/30 rounded-full mb-2" />
          <div className="flex items-center justify-between w-full px-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <Calculator className="h-4 w-4 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-sm">Área Selecionada</h3>
                <p className="text-[10px] text-muted-foreground">
                  {formatNumber(metrics.areaKm2)} km² • {metrics.municipiosCount} municípios
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 rounded-full hover:bg-destructive/10 hover:text-destructive" 
                onClick={(e) => { e.stopPropagation(); onClose(); }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Resumo compacto (sempre visível) */}
        <div className="grid grid-cols-4 gap-2 px-4 py-3 border-t">
          <div className="text-center">
            <Users className="h-4 w-4 mx-auto text-blue-500 mb-0.5" />
            <div className="text-xs font-bold">{formatNumber(metrics.totalPopulacao)}</div>
            <div className="text-[9px] text-muted-foreground">Pop.</div>
          </div>
          <div className="text-center">
            <DollarSign className="h-4 w-4 mx-auto text-green-500 mb-0.5" />
            <div className="text-xs font-bold">{formatCurrency(metrics.pibTotal).replace('R$ ', '')}</div>
            <div className="text-[9px] text-muted-foreground">PIB</div>
          </div>
          <div className="text-center">
            <Building2 className="h-4 w-4 mx-auto text-orange-500 mb-0.5" />
            <div className="text-xs font-bold">{formatNumber(metrics.totalEmpresas)}</div>
            <div className="text-[9px] text-muted-foreground">Emp.</div>
          </div>
          <div className="text-center">
            <TrendingUp className="h-4 w-4 mx-auto text-purple-500 mb-0.5" />
            <div className="text-xs font-bold">{metrics.idhMedio > 0 ? metrics.idhMedio.toFixed(2) : '-'}</div>
            <div className="text-[9px] text-muted-foreground">IDH</div>
          </div>
        </div>

        {/* Detalhes expandidos */}
        {isExpanded && (
          <div className="px-4 pb-3 space-y-2 overflow-y-auto border-t">
            <div className="pt-3 space-y-2">
              {/* PIB per capita */}
              <div className="flex items-center justify-between p-2 bg-muted/30 rounded-lg">
                <span className="text-xs text-muted-foreground">PIB per capita</span>
                <span className="text-xs font-medium">{formatCurrency(metrics.pibMedio)}</span>
              </div>
              
              {/* Lista de municípios */}
              {metrics.municipios.length > 0 && (
                <div className="p-2 bg-muted/30 rounded-lg">
                  <div className="flex items-center gap-1.5 mb-2">
                    <MapPin className="h-3 w-3 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">
                      Municípios ({metrics.municipios.length})
                    </span>
                  </div>
                  <ScrollArea className="h-24">
                    <div className="flex flex-wrap gap-1">
                      {metrics.municipios.slice(0, 20).map((mun, idx) => (
                        <span key={idx} className="text-[10px] px-2 py-0.5 bg-background rounded-full border">
                          {mun}
                        </span>
                      ))}
                      {metrics.municipios.length > 20 && (
                        <span className="text-[10px] px-2 py-0.5 text-muted-foreground">
                          +{metrics.municipios.length - 20}
                        </span>
                      )}
                    </div>
                  </ScrollArea>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Ação */}
        <div className="p-3 border-t">
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full h-10 text-sm rounded-full" 
            onClick={onClear}
          >
            Limpar Seleção
          </Button>
        </div>
      </div>

      {/* Desktop: Card lateral */}
      <div className="hidden md:flex absolute left-4 bottom-4 bg-background/95 backdrop-blur-md border rounded-xl shadow-xl z-[1000] w-80 max-h-[60vh] flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <Calculator className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-sm">Resumo da Área</h3>
              <p className="text-[10px] text-muted-foreground">
                {formatNumber(metrics.areaKm2)} km²
              </p>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Métricas */}
        <div className="p-3 space-y-2 overflow-y-auto flex-1">
          {/* Grid de métricas */}
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-muted/50 rounded-lg p-2.5 text-center">
              <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Municípios</div>
              <div className="font-bold text-lg">{metrics.municipiosCount}</div>
            </div>
            <div className="bg-blue-500/10 rounded-lg p-2.5 text-center">
              <div className="text-[10px] text-blue-600 uppercase tracking-wide">População</div>
              <div className="font-bold text-lg text-blue-700">{formatNumber(metrics.totalPopulacao)}</div>
            </div>
          </div>

          {/* PIB */}
          <div className="flex items-center gap-3 p-2.5 bg-green-500/10 rounded-lg">
            <div className="bg-green-500/20 p-2 rounded-lg">
              <DollarSign className="h-5 w-5 text-green-600" />
            </div>
            <div className="flex-1">
              <div className="text-[10px] text-muted-foreground">PIB Total</div>
              <div className="font-bold text-base">{formatCurrency(metrics.pibTotal)}</div>
              <div className="text-[10px] text-muted-foreground">
                Per capita: {formatCurrency(metrics.pibMedio)}
              </div>
            </div>
          </div>

          {/* Empresas */}
          <div className="flex items-center gap-3 p-2.5 bg-orange-500/10 rounded-lg">
            <div className="bg-orange-500/20 p-2 rounded-lg">
              <Building2 className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <div className="text-[10px] text-muted-foreground">Total de Empresas</div>
              <div className="font-bold text-base">{formatNumber(metrics.totalEmpresas)}</div>
            </div>
          </div>

          {/* IDH */}
          {metrics.idhMedio > 0 && (
            <div className="flex items-center gap-3 p-2.5 bg-purple-500/10 rounded-lg">
              <div className="bg-purple-500/20 p-2 rounded-lg">
                <TrendingUp className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <div className="text-[10px] text-muted-foreground">IDH Médio</div>
                <div className="font-bold text-base">{metrics.idhMedio.toFixed(3)}</div>
              </div>
            </div>
          )}

          {/* Lista de municípios */}
          {metrics.municipios.length > 0 && (
            <div className="p-2 bg-muted/30 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground font-medium">
                  Municípios ({metrics.municipios.length})
                </span>
              </div>
              <ScrollArea className="h-24">
                <div className="space-y-1">
                  {metrics.municipios.slice(0, 30).map((mun, idx) => (
                    <div key={idx} className="text-xs px-2 py-1 bg-background rounded">
                      {mun}
                    </div>
                  ))}
                  {metrics.municipios.length > 30 && (
                    <div className="text-xs px-2 py-1 text-muted-foreground italic">
                      ... e mais {metrics.municipios.length - 30}
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>
          )}
        </div>

        {/* Ações */}
        <div className="p-3 border-t">
          <Button variant="outline" size="sm" className="w-full h-9 text-sm rounded-lg" onClick={onClear}>
            Limpar Seleção
          </Button>
        </div>
      </div>
    </>
  );
};