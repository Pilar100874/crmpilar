import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format, startOfDay, endOfDay, differenceInMinutes } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ArrowLeft, Calendar, Car, Route, Clock, Gauge, Activity, MapPin, Check, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { LazyLogisticaMap } from '@/components/logistica/LazyLogisticaMap';
import { Veiculo, VeiculoPosicao, HistoricoEstatisticas } from '@/types/logistica';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { cn } from '@/lib/utils';

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
}

const LogisticaHistorico: React.FC = () => {
  const { veiculoId: paramVeiculoId } = useParams<{ veiculoId: string }>();
  const navigate = useNavigate();
  
  const [veiculos, setVeiculos] = useState<Veiculo[]>([]);
  const [selectedVeiculoIds, setSelectedVeiculoIds] = useState<string[]>(paramVeiculoId ? [paramVeiculoId] : []);
  const [veiculosHistorico, setVeiculosHistorico] = useState<VeiculoHistorico[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [loading, setLoading] = useState(false);
  const [selectorOpen, setSelectorOpen] = useState(false);

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
    if (selectedVeiculoIds.length > 0 && selectedDate && veiculos.length > 0) {
      fetchAllPosicoes();
    } else if (selectedVeiculoIds.length === 0) {
      setVeiculosHistorico([]);
    }
  }, [selectedVeiculoIds, selectedDate, veiculos]);

  const fetchAllPosicoes = async () => {
    setLoading(true);
    try {
      const start = startOfDay(selectedDate);
      const end = endOfDay(selectedDate);

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

  const routes = veiculosHistorico.map(vh => ({
    coordinates: vh.posicoes.map(p => ({ lat: p.lat, lng: p.lng })),
    color: vh.color,
    distance: vh.estatisticas?.distancia_total_km ? vh.estatisticas.distancia_total_km * 1000 : undefined
  })).filter(r => r.coordinates.length > 0);

  const selectedVeiculosInfo = selectedVeiculoIds.map((id, index) => {
    const v = veiculos.find(v => v.id === id);
    return v ? { ...v, color: ROUTE_COLORS[index % ROUTE_COLORS.length] } : null;
  }).filter(Boolean) as (Veiculo & { color: string })[];

  return (
    <div className="h-[calc(100vh-64px)] flex flex-col">
      {/* Header */}
      <div className="p-4 border-b bg-background flex flex-col gap-3">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/logistica')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl font-semibold flex items-center gap-2">
                <Car className="h-5 w-5" />
                Histórico de Veículos
              </h1>
              <p className="text-sm text-muted-foreground">
                {selectedVeiculoIds.length === 0 
                  ? 'Selecione veículos para visualizar' 
                  : `${selectedVeiculoIds.length} veículo(s) selecionado(s)`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Multi Vehicle Selector */}
            <Popover open={selectorOpen} onOpenChange={setSelectorOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="gap-2 min-w-[200px] justify-start">
                  <Car className="h-4 w-4" />
                  {selectedVeiculoIds.length === 0 
                    ? 'Selecionar veículos' 
                    : `${selectedVeiculoIds.length} selecionado(s)`}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[300px] p-0 bg-popover z-[1000]" align="end">
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
                            <span className="flex-1 truncate">
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

          {/* Date Picker */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Calendar className="h-4 w-4" />
                {format(selectedDate, "dd/MM/yyyy", { locale: ptBR })}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 bg-popover z-[1000]" align="end">
                <CalendarComponent
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => date && setSelectedDate(date)}
                  locale={ptBR}
                  disabled={(date) => date > new Date()}
                />
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
                className="gap-1 pr-1"
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

      {/* Content */}
      <div className="flex-1 flex">
        {/* Map */}
        <div className="flex-1 relative">
          {selectedVeiculoIds.length === 0 ? (
            <div className="h-full flex items-center justify-center bg-muted/50">
              <div className="text-center">
                <Car className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground">Selecione veículos para ver o histórico</p>
              </div>
            </div>
          ) : loading ? (
            <div className="h-full flex items-center justify-center bg-muted/50">
              <div className="text-muted-foreground">Carregando histórico...</div>
            </div>
          ) : routes.length === 0 ? (
            <div className="h-full flex items-center justify-center bg-muted/50">
              <div className="text-center">
                <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground">Nenhum registro para esta data</p>
              </div>
            </div>
          ) : (
            <LazyLogisticaMap
              routes={routes}
              className="h-full w-full"
              fitBounds
            />
          )}
        </div>

        {/* Statistics Panel */}
        <div className="w-80 flex-shrink-0 border-l bg-background p-4 overflow-auto">
          <h2 className="font-semibold text-lg mb-4 flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Estatísticas do Dia
          </h2>

          {selectedVeiculoIds.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              Selecione veículos para ver as estatísticas.
            </p>
          ) : veiculosHistorico.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              Carregando...
            </p>
          ) : (
            <div className="space-y-6">
              {veiculosHistorico.map((vh) => (
                <div key={vh.veiculo.id} className="space-y-3">
                  <div 
                    className="flex items-center gap-2 pb-2 border-b"
                    style={{ borderBottomColor: vh.color }}
                  >
                    <div 
                      className="w-3 h-3 rounded-full flex-shrink-0" 
                      style={{ backgroundColor: vh.color }}
                    />
                    <span className="font-medium">{vh.veiculo.placa}</span>
                    {vh.veiculo.descricao && (
                      <span className="text-sm text-muted-foreground truncate">
                        {vh.veiculo.descricao}
                      </span>
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