import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format, startOfDay, endOfDay, differenceInMinutes, subDays, setHours, setMinutes } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ArrowLeft, Calendar, Car, Route, Clock, Gauge, Activity, MapPin, Check, X, ChevronUp, ChevronDown } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { LazyLogisticaMap } from '@/components/logistica/LazyLogisticaMap';
import { HistoricoTimeline } from '@/components/logistica/HistoricoTimeline';
import { Veiculo, VeiculoPosicao, HistoricoEstatisticas } from '@/types/logistica';
import { ParadaMarcada } from '@/types/automacaoLogistica';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { DateRange } from 'react-day-picker';
import { fetchMotoristasAtuais, formatWhatsappNumber, type MotoristaAtual } from '@/lib/logistica/cvDriverLookup';
import { MessageCircle, User } from 'lucide-react';
import { GrupoFilterSelect } from '@/components/logistica/GrupoFilterSelect';
import { useGrupoFilter, filterByGrupo } from '@/lib/logistica/grupoFilter';

const ROUTE_COLORS = [
  '#3b82f6', // blue
  '#ef4444', // red
  '#22c55e', // green
  '#f59e0b', // amber
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#f97316', // orange
];

interface VeiculoHistorico {
  veiculo: Veiculo;
  posicoes: VeiculoPosicao[];
  estatisticas: HistoricoEstatisticas | null;
  color: string;
  motorista_atual?: MotoristaAtual | null;
}

interface LogisticaHistoricoProps {
  embedded?: boolean;
}

const LogisticaHistorico: React.FC<LogisticaHistoricoProps> = ({ embedded = false }) => {
  const { veiculoId: paramVeiculoId } = useParams<{ veiculoId: string }>();
  const navigate = useNavigate();
  
  const [veiculos, setVeiculos] = useState<Veiculo[]>([]);
  const [selectedVeiculoIds, setSelectedVeiculoIds] = useState<string[]>(paramVeiculoId ? [paramVeiculoId] : []);
  const [veiculosHistorico, setVeiculosHistorico] = useState<VeiculoHistorico[]>([]);
  const [filteredVeiculosHistorico, setFilteredVeiculosHistorico] = useState<VeiculoHistorico[]>([]);
  const [currentMarkerIndex, setCurrentMarkerIndex] = useState<number>(-1);
  const [paradasMarcadas, setParadasMarcadas] = useState<ParadaMarcada[]>([]);
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: new Date(),
    to: new Date()
  });
  const [startTime, setStartTime] = useState<string>('00:00');
  const [endTime, setEndTime] = useState<string>('23:59');
  const [loading, setLoading] = useState(false);
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [statsOpen, setStatsOpen] = useState(false); // Mobile stats panel collapsed by default

  // Helper to combine date and time
  const combineDateAndTime = (date: Date, time: string): Date => {
    const [hours, minutes] = time.split(':').map(Number);
    return setMinutes(setHours(date, hours), minutes);
  };

  // Handle timeline change - filter positions up to current time
  const handleTimelineChange = useCallback((filteredPosicoes: VeiculoPosicao[], currentIndex: number) => {
    if (veiculosHistorico.length === 1) {
      // Single vehicle - filter positions
      setFilteredVeiculosHistorico(prev => {
        const vh = veiculosHistorico[0];
        return [{
          ...vh,
          posicoes: filteredPosicoes,
          estatisticas: calculateEstatisticas(filteredPosicoes)
        }];
      });
      setCurrentMarkerIndex(currentIndex);
    }
  }, [veiculosHistorico]);

  // Sync filtered with full when multiple vehicles or on initial load
  useEffect(() => {
    if (veiculosHistorico.length !== 1) {
      setFilteredVeiculosHistorico(veiculosHistorico);
      setCurrentMarkerIndex(-1);
    }
  }, [veiculosHistorico]);


  // Fetch all vehicles for the selector (admin sees all vehicles)
  useEffect(() => {
    const fetchVeiculos = async () => {
      try {
        const { data, error } = await supabase
          .from('veiculos')
          .select('*')
          .eq('ativo', true)
          .order('placa');
        if (error) throw error;
        setVeiculos((data || []) as Veiculo[]);
      } catch (error) {
        console.error('Error fetching vehicles:', error);
      }
    };
    fetchVeiculos();
  }, []);

  useEffect(() => {
    if (selectedVeiculoIds.length > 0 && dateRange?.from && veiculos.length > 0) {
      fetchAllPosicoes();
      fetchParadasMarcadas();
    } else if (selectedVeiculoIds.length === 0) {
      setVeiculosHistorico([]);
      setParadasMarcadas([]);
    }
  }, [selectedVeiculoIds, dateRange, startTime, endTime, veiculos]);

  const fetchParadasMarcadas = async () => {
    if (!dateRange?.from || selectedVeiculoIds.length === 0) return;

    try {
      const start = combineDateAndTime(dateRange.from, startTime);
      const end = combineDateAndTime(dateRange.to || dateRange.from, endTime);

      const { data, error } = await supabase
        .from('logistica_paradas_marcadas')
        .select(`
          *,
          veiculo:veiculos(placa, descricao)
        `)
        .in('veiculo_id', selectedVeiculoIds)
        .gte('data_inicio', start.toISOString())
        .lte('data_inicio', end.toISOString())
        .order('data_inicio', { ascending: false });

      if (error) throw error;
      
      setParadasMarcadas((data || []) as unknown as ParadaMarcada[]);
    } catch (error) {
      console.error('Error fetching paradas marcadas:', error);
    }
  };

  const fetchAllPosicoes = async () => {
    if (!dateRange?.from) return;
    
    setLoading(true);
    try {
      const start = combineDateAndTime(dateRange.from, startTime);
      const end = combineDateAndTime(dateRange.to || dateRange.from, endTime);

      const results: VeiculoHistorico[] = [];

      for (let i = 0; i < selectedVeiculoIds.length; i++) {
        const veiculoId = selectedVeiculoIds[i];
        const veiculo = veiculos.find(v => v.id === veiculoId);
        
        if (!veiculo) continue;

        const { data, error } = await supabase
          .from('veiculo_posicoes')
          .select('*')
          .eq('veiculo_id', veiculoId)
          .gte('data_hora', start.toISOString())
          .lte('data_hora', end.toISOString())
          .order('data_hora', { ascending: true });

        if (error) throw error;

        const posicoes = (data || []) as VeiculoPosicao[];
        const estatisticas = calculateEstatisticas(posicoes);

        results.push({
          veiculo,
          posicoes,
          estatisticas,
          color: ROUTE_COLORS[i % ROUTE_COLORS.length]
        });
      }

      // Enriquecer com motorista que estava dirigindo no período (referência: fim do range)
      const driverMap = await fetchMotoristasAtuais(results.map(r => r.veiculo.id), end);
      for (const r of results) {
        r.motorista_atual = driverMap[r.veiculo.id] ?? null;
      }

      setVeiculosHistorico(results);
    } catch (error) {
      console.error('Error fetching positions:', error);
      toast.error('Erro ao carregar histórico');
    } finally {
      setLoading(false);
    }
  };

  const calculateEstatisticas = (posicoes: VeiculoPosicao[]): HistoricoEstatisticas | null => {
    if (posicoes.length === 0) {
      return null;
    }

    let distanciaTotal = 0;
    let velocidadeMaxima = 0;
    let somaVelocidades = 0;
    let tempoMovimento = 0;
    let tempoParado = 0;

    for (let i = 0; i < posicoes.length; i++) {
      const posicao = posicoes[i];
      
      if (posicao.velocidade > velocidadeMaxima) {
        velocidadeMaxima = posicao.velocidade;
      }
      somaVelocidades += posicao.velocidade;

      if (i > 0) {
        const prevPosicao = posicoes[i - 1];
        
        const R = 6371;
        const dLat = (posicao.lat - prevPosicao.lat) * Math.PI / 180;
        const dLng = (posicao.lng - prevPosicao.lng) * Math.PI / 180;
        const a = 
          Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos(prevPosicao.lat * Math.PI / 180) * Math.cos(posicao.lat * Math.PI / 180) *
          Math.sin(dLng / 2) * Math.sin(dLng / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const distancia = R * c;
        distanciaTotal += distancia;

        const tempoMinutos = differenceInMinutes(
          new Date(posicao.data_hora),
          new Date(prevPosicao.data_hora)
        );

        const velocidadeMedia = (posicao.velocidade + prevPosicao.velocidade) / 2;
        if (velocidadeMedia > 5) {
          tempoMovimento += tempoMinutos;
        } else {
          tempoParado += tempoMinutos;
        }
      }
    }

    return {
      distancia_total_km: Math.round(distanciaTotal * 10) / 10,
      velocidade_maxima: Math.round(velocidadeMaxima),
      velocidade_media: Math.round(somaVelocidades / posicoes.length),
      tempo_movimento_minutos: tempoMovimento,
      tempo_parado_minutos: tempoParado,
      pontos_total: posicoes.length
    };
  };

  const formatMinutes = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}min`;
    }
    return `${mins} min`;
  };

  const toggleVeiculo = (veiculoId: string) => {
    setSelectedVeiculoIds(prev => {
      if (prev.includes(veiculoId)) {
        return prev.filter(id => id !== veiculoId);
      }
      return [...prev, veiculoId];
    });
  };

  const removeVeiculo = (veiculoId: string) => {
    setSelectedVeiculoIds(prev => prev.filter(id => id !== veiculoId));
  };

  // Use filtered data for display
  const displayData = filteredVeiculosHistorico.length > 0 ? filteredVeiculosHistorico : veiculosHistorico;

  const routes = displayData.map(vh => ({
    coordinates: vh.posicoes.map(p => ({ lat: p.lat, lng: p.lng })),
    color: vh.color,
    distance: vh.estatisticas?.distancia_total_km ? vh.estatisticas.distancia_total_km * 1000 : undefined
  })).filter(r => r.coordinates.length > 0);

  // Current marker position (last point in filtered positions)
  const currentMarkers = displayData.map(vh => {
    if (vh.posicoes.length === 0) return null;
    const lastPos = vh.posicoes[vh.posicoes.length - 1];
    return {
      lat: lastPos.lat,
      lng: lastPos.lng,
      color: vh.color,
      label: vh.veiculo.placa
    };
  }).filter(Boolean);

  const selectedVeiculosInfo = selectedVeiculoIds.map((id, index) => {
    const v = veiculos.find(v => v.id === id);
    return v ? { ...v, color: ROUTE_COLORS[index % ROUTE_COLORS.length] } : null;
  }).filter(Boolean) as (Veiculo & { color: string })[];

  // Get all positions for timeline (only when single vehicle selected)
  const timelinePosicoes = veiculosHistorico.length === 1 ? veiculosHistorico[0].posicoes : [];

  // Full route bounds for initial zoom (all positions, not filtered)
  const fullRouteBounds = veiculosHistorico.length === 1 && veiculosHistorico[0].posicoes.length > 0
    ? veiculosHistorico[0].posicoes.map(p => ({ lat: p.lat, lng: p.lng }))
    : undefined;

  return (
    <div className={cn("flex flex-col", embedded ? "h-full" : "h-[calc(100vh-64px)]")}>
      {/* Header */}
      <div className={cn("border-b bg-background flex flex-col gap-3", embedded ? "p-2" : "p-3 sm:p-4")}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3 sm:gap-4">
            {!embedded && (
              <Button variant="ghost" size="icon" onClick={() => navigate('/logistica')} className="h-8 w-8 sm:h-9 sm:w-9">
                <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
              </Button>
            )}
            <div>
              {!embedded && (
                <h1 className="text-lg sm:text-xl font-semibold flex items-center gap-2">
                  <Car className="h-4 w-4 sm:h-5 sm:w-5" />
                  Histórico de Veículos
                </h1>
              )}
              <p className="text-xs sm:text-sm text-muted-foreground">
                {selectedVeiculoIds.length === 0 
                  ? 'Selecione veículos para visualizar' 
                  : `${selectedVeiculoIds.length} veículo(s) selecionado(s)`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Multi Vehicle Selector */}
            <Popover open={selectorOpen} onOpenChange={setSelectorOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="gap-2 min-w-[140px] sm:min-w-[200px] justify-start text-sm">
                  <Car className="h-4 w-4" />
                  <span className="truncate">
                    {selectedVeiculoIds.length === 0 
                      ? 'Selecionar' 
                      : `${selectedVeiculoIds.length} veículo(s)`}
                  </span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[280px] sm:w-[300px] p-0 bg-popover z-[1000]" align="end">
                <Command>
                  <CommandInput placeholder="Buscar veículo..." />
                  <CommandList>
                    <CommandEmpty>Nenhum veículo encontrado.</CommandEmpty>
                    <CommandGroup>
                      {veiculos.map((v) => {
                        const isSelected = selectedVeiculoIds.includes(v.id);
                        const index = selectedVeiculoIds.indexOf(v.id);
                        return (
                          <CommandItem
                            key={v.id}
                            onSelect={() => toggleVeiculo(v.id)}
                            className="cursor-pointer"
                          >
                            <div className={cn(
                              "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                              isSelected ? "bg-primary text-primary-foreground" : "opacity-50"
                            )}>
                              {isSelected && <Check className="h-3 w-3" />}
                            </div>
                            {isSelected && (
                              <div 
                                className="w-3 h-3 rounded-full mr-2 flex-shrink-0" 
                                style={{ backgroundColor: ROUTE_COLORS[index % ROUTE_COLORS.length] }}
                              />
                            )}
                            <span className="flex-1 truncate text-sm">
                              {v.placa} {v.descricao ? `- ${v.descricao}` : ''}
                            </span>
                          </CommandItem>
                        );
                      })}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>

          {/* Date Range Picker */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="gap-2 text-sm min-w-[180px] sm:min-w-[280px]">
                <Calendar className="h-4 w-4" />
                <span className="truncate">
                  {dateRange?.from ? (
                    dateRange.to && dateRange.from.getTime() !== dateRange.to.getTime() ? (
                      <>
                        <span className="hidden sm:inline">
                          {format(dateRange.from, "dd/MM", { locale: ptBR })} {startTime} - {format(dateRange.to, "dd/MM", { locale: ptBR })} {endTime}
                        </span>
                        <span className="sm:hidden">
                          {format(dateRange.from, "dd/MM", { locale: ptBR })} - {format(dateRange.to, "dd/MM", { locale: ptBR })}
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="hidden sm:inline">{format(dateRange.from, "dd/MM/yyyy", { locale: ptBR })} {startTime} - {endTime}</span>
                        <span className="sm:hidden">{format(dateRange.from, "dd/MM", { locale: ptBR })} {startTime}-{endTime}</span>
                      </>
                    )
                  ) : (
                    "Selecionar período"
                  )}
                </span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 bg-popover z-[1000]" align="end">
              <div className="p-2 border-b flex flex-wrap gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs"
                  onClick={() => {
                    setDateRange({ from: new Date(), to: new Date() });
                    setStartTime('00:00');
                    setEndTime('23:59');
                  }}
                >
                  Hoje
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs"
                  onClick={() => {
                    setDateRange({ from: subDays(new Date(), 1), to: subDays(new Date(), 1) });
                    setStartTime('00:00');
                    setEndTime('23:59');
                  }}
                >
                  Ontem
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs"
                  onClick={() => {
                    setDateRange({ from: subDays(new Date(), 7), to: new Date() });
                    setStartTime('00:00');
                    setEndTime('23:59');
                  }}
                >
                  Últimos 7 dias
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs"
                  onClick={() => {
                    setDateRange({ from: subDays(new Date(), 30), to: new Date() });
                    setStartTime('00:00');
                    setEndTime('23:59');
                  }}
                >
                  Últimos 30 dias
                </Button>
              </div>
              <CalendarComponent
                mode="range"
                selected={dateRange}
                onSelect={setDateRange}
                locale={ptBR}
                disabled={(date) => date > new Date()}
                numberOfMonths={1}
                className="pointer-events-auto"
              />
              {/* Time Range */}
              <div className="p-3 border-t space-y-2">
                <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Filtrar por horário
                </Label>
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <Label className="text-xs text-muted-foreground">Início</Label>
                    <Input
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="h-8 text-sm"
                    />
                  </div>
                  <span className="text-muted-foreground mt-5">até</span>
                  <div className="flex-1">
                    <Label className="text-xs text-muted-foreground">Fim</Label>
                    <Input
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="h-8 text-sm"
                    />
                  </div>
                </div>
              </div>
            </PopoverContent>
          </Popover>
          </div>
        </div>

        {/* Selected vehicles badges */}
        {selectedVeiculosInfo.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {selectedVeiculosInfo.map((v) => (
              <Badge 
                key={v.id} 
                variant="secondary" 
                className="gap-1 pr-1 text-xs"
                style={{ borderLeftColor: v.color, borderLeftWidth: 3 }}
              >
                <span>{v.placa}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-4 w-4 hover:bg-transparent"
                  onClick={() => removeVeiculo(v.id)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Content - Mobile optimized layout */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
        {/* Map - Takes full height on mobile */}
        <div className="flex-1 relative h-full min-h-0">
          {selectedVeiculoIds.length === 0 ? (
            <div className="h-full flex items-center justify-center bg-muted/50">
              <div className="text-center p-4">
                <Car className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Selecione veículos para ver o histórico</p>
              </div>
            </div>
          ) : loading ? (
            <div className="h-full flex items-center justify-center bg-muted/50">
              <div className="text-muted-foreground text-sm">Carregando histórico...</div>
            </div>
          ) : routes.length === 0 ? (
            <div className="h-full flex items-center justify-center bg-muted/50">
              <div className="text-center p-4">
                <MapPin className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Nenhum registro para esta data</p>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col">
              <div className="flex-1 relative min-h-0">
                <LazyLogisticaMap
                  routes={routes}
                  fullRouteBounds={fullRouteBounds}
                  paradasMarcadas={paradasMarcadas}
                  currentMarker={currentMarkers[0] ? {
                    lat: currentMarkers[0].lat,
                    lng: currentMarkers[0].lng,
                    color: currentMarkers[0].color,
                    label: currentMarkers[0].label
                  } : undefined}
                  className="h-full w-full absolute inset-0"
                  fitBounds={currentMarkerIndex === -1}
                />
              </div>
              
              {/* Timeline - only show when single vehicle is selected */}
              {timelinePosicoes.length > 1 && (
                <div className="p-2 sm:p-3 border-t bg-background/95 backdrop-blur-sm">
                  <HistoricoTimeline
                    posicoes={timelinePosicoes}
                    onTimeChange={handleTimelineChange}
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Statistics Panel - Collapsible on mobile, side panel on desktop */}
        {/* Mobile: Bottom sheet style */}
        <div className="md:hidden absolute bottom-0 left-0 right-0 z-10">
          <Collapsible open={statsOpen} onOpenChange={setStatsOpen}>
            <CollapsibleTrigger asChild>
              <Button 
                variant="secondary" 
                className="w-full rounded-none rounded-t-xl h-10 gap-2 bg-background/95 backdrop-blur-sm border-t shadow-lg"
              >
                <Activity className="h-4 w-4" />
                <span className="text-sm font-medium">
                  {displayData.length > 0 && displayData[0].estatisticas 
                    ? `${displayData[0].estatisticas.distancia_total_km} km • ${formatMinutes(displayData[0].estatisticas.tempo_movimento_minutos)}`
                    : 'Estatísticas'
                  }
                </span>
                {statsOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="bg-background/95 backdrop-blur-sm p-3 max-h-[50vh] overflow-auto border-t">
                {selectedVeiculoIds.length === 0 ? (
                  <p className="text-muted-foreground text-xs text-center py-4">
                    Selecione veículos para ver as estatísticas.
                  </p>
                ) : displayData.length === 0 ? (
                  <p className="text-muted-foreground text-xs text-center py-4">
                    Carregando...
                  </p>
                ) : (
                  <div className="space-y-4">
                    {displayData.map((vh) => (
                      <div key={vh.veiculo.id} className="space-y-2">
                        <div 
                          className="flex items-center gap-2 pb-1 border-b"
                          style={{ borderBottomColor: vh.color }}
                        >
                          <div 
                            className="w-2 h-2 rounded-full flex-shrink-0" 
                            style={{ backgroundColor: vh.color }}
                          />
                          <span className="font-medium text-xs">{vh.veiculo.placa}</span>
                          {vh.veiculo.descricao && (
                            <span className="text-[10px] text-muted-foreground truncate">
                              {vh.veiculo.descricao}
                            </span>
                          )}
                        </div>

                        {!vh.estatisticas ? (
                          <p className="text-muted-foreground text-xs">
                            Nenhum registro para esta data
                          </p>
                        ) : (
                          <div className="grid grid-cols-3 gap-2">
                            <div className="bg-muted/50 rounded-lg p-2 text-center">
                              <Route className="h-3 w-3 mx-auto mb-1 text-muted-foreground" />
                              <p className="text-sm font-bold">{vh.estatisticas.distancia_total_km}</p>
                              <p className="text-[10px] text-muted-foreground">km</p>
                            </div>
                            <div className="bg-muted/50 rounded-lg p-2 text-center">
                              <Gauge className="h-3 w-3 mx-auto mb-1 text-muted-foreground" />
                              <p className="text-sm font-bold">{vh.estatisticas.velocidade_maxima}</p>
                              <p className="text-[10px] text-muted-foreground">km/h máx</p>
                            </div>
                            <div className="bg-muted/50 rounded-lg p-2 text-center">
                              <Clock className="h-3 w-3 mx-auto mb-1 text-muted-foreground" />
                              <p className="text-sm font-bold">{formatMinutes(vh.estatisticas.tempo_movimento_minutos)}</p>
                              <p className="text-[10px] text-muted-foreground">mov.</p>
                            </div>
                            <div className="bg-muted/50 rounded-lg p-2 text-center">
                              <Gauge className="h-3 w-3 mx-auto mb-1 text-muted-foreground" />
                              <p className="text-sm font-bold">{vh.estatisticas.velocidade_media}</p>
                              <p className="text-[10px] text-muted-foreground">km/h méd</p>
                            </div>
                            <div className="bg-muted/50 rounded-lg p-2 text-center">
                              <Clock className="h-3 w-3 mx-auto mb-1 text-muted-foreground" />
                              <p className="text-sm font-bold">{formatMinutes(vh.estatisticas.tempo_parado_minutos)}</p>
                              <p className="text-[10px] text-muted-foreground">parado</p>
                            </div>
                            <div className="bg-muted/50 rounded-lg p-2 text-center">
                              <MapPin className="h-3 w-3 mx-auto mb-1 text-muted-foreground" />
                              <p className="text-sm font-bold">{vh.estatisticas.pontos_total}</p>
                              <p className="text-[10px] text-muted-foreground">pontos</p>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>

        {/* Desktop: Side panel (unchanged) */}
        <div className="hidden md:block w-72 lg:w-80 flex-shrink-0 border-l bg-background p-4 overflow-auto">
          <h2 className="font-semibold text-lg mb-4 flex items-center gap-2">
            <Activity className="h-5 w-5" />
            {timelinePosicoes.length > 1 ? 'Estatísticas (até momento selecionado)' : 'Estatísticas do Dia'}
          </h2>

          {selectedVeiculoIds.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              Selecione veículos para ver as estatísticas.
            </p>
          ) : displayData.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              Carregando...
            </p>
          ) : (
            <div className="space-y-6">
              {displayData.map((vh) => (
                <div key={vh.veiculo.id} className="space-y-3">
                  <div 
                    className="flex flex-col gap-1 pb-2 border-b"
                    style={{ borderBottomColor: vh.color }}
                  >
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full flex-shrink-0" 
                        style={{ backgroundColor: vh.color }}
                      />
                      <span className="font-medium text-sm">{vh.veiculo.placa}</span>
                      {vh.veiculo.descricao && (
                        <span className="text-xs text-muted-foreground truncate">
                          {vh.veiculo.descricao}
                        </span>
                      )}
                    </div>
                    {vh.motorista_atual && (
                      <div className="flex items-center gap-2 pl-5 text-xs">
                        <User className="h-3 w-3 text-primary" />
                        <span className="font-medium truncate">{vh.motorista_atual.nome}</span>
                        {vh.motorista_atual.telefone && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const wa = formatWhatsappNumber(vh.motorista_atual!.telefone);
                              if (wa) window.open(`https://wa.me/${wa}`, '_blank');
                            }}
                            className="inline-flex items-center gap-1 text-emerald-600 hover:underline"
                          >
                            <MessageCircle className="h-3 w-3" />
                            {vh.motorista_atual.telefone}
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {!vh.estatisticas ? (
                    <p className="text-muted-foreground text-sm">
                      Nenhum registro para esta data
                    </p>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      <Card className="col-span-2">
                        <CardHeader className="p-3 pb-1">
                          <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                            <Route className="h-3 w-3" />
                            Distância
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="p-3 pt-0">
                          <p className="text-lg font-bold">{vh.estatisticas.distancia_total_km} km</p>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader className="p-3 pb-1">
                          <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                            <Gauge className="h-3 w-3" />
                            Vel. Máx
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="p-3 pt-0">
                          <p className="text-lg font-bold">{vh.estatisticas.velocidade_maxima}</p>
                          <p className="text-xs text-muted-foreground">km/h</p>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader className="p-3 pb-1">
                          <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                            <Gauge className="h-3 w-3" />
                            Vel. Média
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="p-3 pt-0">
                          <p className="text-lg font-bold">{vh.estatisticas.velocidade_media}</p>
                          <p className="text-xs text-muted-foreground">km/h</p>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader className="p-3 pb-1">
                          <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Movimento
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="p-3 pt-0">
                          <p className="text-sm font-bold">{formatMinutes(vh.estatisticas.tempo_movimento_minutos)}</p>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader className="p-3 pb-1">
                          <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Parado
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="p-3 pt-0">
                          <p className="text-sm font-bold">{formatMinutes(vh.estatisticas.tempo_parado_minutos)}</p>
                        </CardContent>
                      </Card>

                      <Card className="col-span-2">
                        <CardHeader className="p-3 pb-1">
                          <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            Pontos Registrados
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="p-3 pt-0">
                          <p className="text-lg font-bold">{vh.estatisticas.pontos_total}</p>
                        </CardContent>
                      </Card>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LogisticaHistorico;