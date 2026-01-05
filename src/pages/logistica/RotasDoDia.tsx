import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { format, startOfDay, endOfDay, differenceInMinutes } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { VeiculoComStatus, VeiculoPosicao, VeiculoStatus } from '@/types/logistica';
import { getEstabelecimentoId } from '@/lib/estabelecimentoUtils';
import { LogisticaLayout } from '@/components/logistica/LogisticaLayout';
import { LazyLogisticaMap } from '@/components/logistica/LazyLogisticaMap';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Car, Route, MapPin, Clock, Gauge, Calendar,
  ChevronRight, Play, Navigation, RefreshCw, TrendingUp
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface RouteData {
  coordinates: Array<{ lat: number; lng: number }>;
  color?: string;
  distance?: number;
  duration?: number;
}

const RotasDoDia: React.FC = () => {
  const [veiculos, setVeiculos] = useState<VeiculoComStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVeiculoId, setSelectedVeiculoId] = useState<string | null>(null);
  const [routeData, setRouteData] = useState<RouteData[]>([]);
  const [routeStats, setRouteStats] = useState<{
    distancia_km: number;
    velocidade_media: number;
    velocidade_maxima: number;
    pontos: number;
  } | null>(null);
  const [loadingRoute, setLoadingRoute] = useState(false);
  const [estabelecimentoId, setEstabelecimentoId] = useState<string | null>(null);

  useEffect(() => {
    const initEstabelecimento = async () => {
      const estabId = await getEstabelecimentoId();
      setEstabelecimentoId(estabId);
    };
    initEstabelecimento();
  }, []);

  useEffect(() => {
    if (!estabelecimentoId) return;
    fetchVeiculos();
  }, [estabelecimentoId]);

  useEffect(() => {
    if (selectedVeiculoId) {
      fetchDayRoute(selectedVeiculoId);
    } else {
      setRouteData([]);
      setRouteStats(null);
    }
  }, [selectedVeiculoId]);

  const fetchVeiculos = async () => {
    if (!estabelecimentoId) return;
    
    try {
      const { data: veiculosData, error } = await supabase
        .from('veiculos')
        .select('*')
        .eq('estabelecimento_id', estabelecimentoId)
        .eq('ativo', true)
        .order('placa');

      if (error) throw error;

      const veiculosComPosicao: VeiculoComStatus[] = await Promise.all(
        (veiculosData || []).map(async (veiculo) => {
          const { data: posicao } = await supabase
            .from('veiculo_posicoes')
            .select('*')
            .eq('veiculo_id', veiculo.id)
            .order('data_hora', { ascending: false })
            .limit(1)
            .single();

          const status = calculateStatus(posicao as VeiculoPosicao | null);

          return {
            ...veiculo,
            ultima_posicao: posicao as VeiculoPosicao | undefined,
            status,
            ultima_atualizacao: posicao?.data_hora
          } as VeiculoComStatus;
        })
      );

      setVeiculos(veiculosComPosicao);
      
      // Auto-select first vehicle with positions
      if (veiculosComPosicao.length > 0 && !selectedVeiculoId) {
        const firstWithPosition = veiculosComPosicao.find(v => v.ultima_posicao);
        if (firstWithPosition) {
          setSelectedVeiculoId(firstWithPosition.id);
        }
      }
    } catch (error) {
      console.error('Error fetching vehicles:', error);
      toast.error('Erro ao carregar veículos');
    } finally {
      setLoading(false);
    }
  };

  const calculateStatus = (posicao: VeiculoPosicao | null): VeiculoStatus => {
    if (!posicao) return 'offline';
    const minutesSinceUpdate = differenceInMinutes(new Date(), new Date(posicao.data_hora));
    if (minutesSinceUpdate > 10) return 'offline';
    if (posicao.velocidade > 5) return 'movendo';
    return 'parado';
  };

  const fetchDayRoute = async (veiculoId: string) => {
    setLoadingRoute(true);
    
    try {
      const today = new Date();
      const start = startOfDay(today).toISOString();
      const end = endOfDay(today).toISOString();

      const { data: posicoes, error } = await supabase
        .from('veiculo_posicoes')
        .select('*')
        .eq('veiculo_id', veiculoId)
        .gte('data_hora', start)
        .lte('data_hora', end)
        .order('data_hora', { ascending: true });

      if (error) throw error;

      if (!posicoes || posicoes.length === 0) {
        setRouteData([]);
        setRouteStats(null);
        toast.info('Nenhuma posição registrada hoje para este veículo');
        return;
      }

      // Convert to route coordinates
      const coordinates = posicoes.map(p => ({ lat: p.lat, lng: p.lng }));
      
      // Calculate stats
      let totalDistance = 0;
      let maxSpeed = 0;
      let totalSpeed = 0;
      
      for (let i = 1; i < posicoes.length; i++) {
        const prev = posicoes[i - 1];
        const curr = posicoes[i];
        
        // Haversine distance
        const R = 6371; // km
        const dLat = (curr.lat - prev.lat) * Math.PI / 180;
        const dLon = (curr.lng - prev.lng) * Math.PI / 180;
        const a = 
          Math.sin(dLat/2) * Math.sin(dLat/2) +
          Math.cos(prev.lat * Math.PI / 180) * Math.cos(curr.lat * Math.PI / 180) *
          Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        totalDistance += R * c;
        
        if (curr.velocidade > maxSpeed) maxSpeed = curr.velocidade;
        totalSpeed += curr.velocidade;
      }

      setRouteData([{
        coordinates,
        color: '#3b82f6',
        distance: totalDistance * 1000,
        duration: posicoes.length > 1 
          ? (new Date(posicoes[posicoes.length - 1].data_hora).getTime() - new Date(posicoes[0].data_hora).getTime()) / 1000
          : 0
      }]);

      setRouteStats({
        distancia_km: totalDistance,
        velocidade_media: totalSpeed / posicoes.length,
        velocidade_maxima: maxSpeed,
        pontos: posicoes.length
      });

    } catch (error) {
      console.error('Error fetching route:', error);
      toast.error('Erro ao carregar rota');
    } finally {
      setLoadingRoute(false);
    }
  };

  const selectedVeiculo = veiculos.find(v => v.id === selectedVeiculoId);

  return (
    <LogisticaLayout activeTab="rotas">
      <div className="h-full flex flex-col lg:flex-row">
        {/* Left Panel - Vehicle Selection */}
        <div className="lg:w-80 xl:w-96 border-b lg:border-b-0 lg:border-r flex flex-col">
          <div className="p-4 border-b">
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="h-5 w-5 text-primary" />
              <h2 className="font-semibold">Rotas do Dia</h2>
              <Badge variant="outline" className="ml-auto">
                {format(new Date(), "dd/MM/yyyy", { locale: ptBR })}
              </Badge>
            </div>
            
            <Select value={selectedVeiculoId || ''} onValueChange={setSelectedVeiculoId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um veículo" />
              </SelectTrigger>
              <SelectContent>
                {veiculos.map(v => (
                  <SelectItem key={v.id} value={v.id}>
                    <div className="flex items-center gap-2">
                      <Car className="h-4 w-4" />
                      <span className="font-medium">{v.placa}</span>
                      {v.descricao && <span className="text-muted-foreground text-xs">- {v.descricao}</span>}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Route Stats */}
          {routeStats && (
            <div className="p-4 space-y-3">
              <Card>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Route className="h-4 w-4" />
                      <span className="text-sm">Distância Total</span>
                    </div>
                    <span className="font-bold text-lg">{routeStats.distancia_km.toFixed(2)} km</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Gauge className="h-4 w-4" />
                      <span className="text-sm">Vel. Média</span>
                    </div>
                    <span className="font-medium">{Math.round(routeStats.velocidade_media)} km/h</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <TrendingUp className="h-4 w-4" />
                      <span className="text-sm">Vel. Máxima</span>
                    </div>
                    <span className="font-medium">{Math.round(routeStats.velocidade_maxima)} km/h</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      <span className="text-sm">Pontos GPS</span>
                    </div>
                    <span className="font-medium">{routeStats.pontos}</span>
                  </div>
                </CardContent>
              </Card>

              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => selectedVeiculoId && fetchDayRoute(selectedVeiculoId)}
                disabled={loadingRoute}
              >
                <RefreshCw className={cn("h-4 w-4 mr-2", loadingRoute && "animate-spin")} />
                Atualizar Rota
              </Button>
            </div>
          )}

          {/* Vehicle List for quick selection */}
          <ScrollArea className="flex-1 lg:max-h-none max-h-40">
            <div className="p-4 pt-0 space-y-2">
              <p className="text-xs text-muted-foreground font-medium uppercase mb-2">Veículos Ativos</p>
              {veiculos.map(veiculo => (
                <div
                  key={veiculo.id}
                  onClick={() => setSelectedVeiculoId(veiculo.id)}
                  className={cn(
                    "flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors",
                    selectedVeiculoId === veiculo.id 
                      ? "bg-primary/10 border border-primary/20" 
                      : "hover:bg-muted"
                  )}
                >
                  <div className={cn(
                    "w-2 h-2 rounded-full",
                    veiculo.status === 'movendo' && "bg-green-500",
                    veiculo.status === 'parado' && "bg-amber-500",
                    veiculo.status === 'offline' && "bg-gray-400"
                  )} />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{veiculo.placa}</p>
                    {veiculo.motorista && (
                      <p className="text-xs text-muted-foreground truncate">{veiculo.motorista}</p>
                    )}
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* Map */}
        <div className="flex-1 relative min-h-[300px]">
          {loading || loadingRoute ? (
            <div className="h-full flex items-center justify-center bg-muted/50">
              <div className="text-muted-foreground">
                {loadingRoute ? 'Carregando rota...' : 'Carregando...'}
              </div>
            </div>
          ) : (
            <LazyLogisticaMap
              veiculos={selectedVeiculo ? [selectedVeiculo] : []}
              routes={routeData}
              fullRouteBounds={routeData[0]?.coordinates}
              className="h-full w-full"
              fitBounds={routeData.length > 0}
            />
          )}

          {/* No route message */}
          {!loading && !loadingRoute && routeData.length === 0 && selectedVeiculoId && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <Card className="pointer-events-auto">
                <CardContent className="p-6 text-center">
                  <Route className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                  <p className="font-medium">Nenhuma rota registrada hoje</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Este veículo ainda não enviou posições hoje
                  </p>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </LogisticaLayout>
  );
};

export default RotasDoDia;
