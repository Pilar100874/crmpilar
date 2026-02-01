import React, { useState, useEffect, useCallback } from 'react';
import { format, differenceInMinutes } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  Car, Gauge, Clock, MapPin, AlertTriangle, 
  Wifi, WifiOff, Activity, RefreshCw, Tv,
  Navigation, Circle, Fuel, Route
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { LazyLogisticaMap } from '@/components/logistica/LazyLogisticaMap';
import { VeiculoComStatus, VeiculoPosicao, VeiculoStatus } from '@/types/logistica';
import { ParadaMarcada } from '@/types/automacaoLogistica';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { getEstabelecimentoId } from '@/lib/estabelecimentoUtils';

const statusConfig = {
  movendo: { label: 'Em movimento', color: 'bg-green-500', textColor: 'text-green-600', icon: Activity },
  parado: { label: 'Parado', color: 'bg-amber-500', textColor: 'text-amber-600', icon: Clock },
  offline: { label: 'Offline', color: 'bg-gray-400', textColor: 'text-gray-500', icon: WifiOff }
};

export default function TvDashboardVeiculos() {
  const [veiculos, setVeiculos] = useState<VeiculoComStatus[]>([]);
  const [paradasMarcadas, setParadasMarcadas] = useState<ParadaMarcada[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [estabelecimentoId, setEstabelecimentoId] = useState<string | null>(null);
  const [selectedVeiculoId, setSelectedVeiculoId] = useState<string | null>(null);

  useEffect(() => {
    const fetchEstabelecimento = async () => {
      const estabId = await getEstabelecimentoId();
      setEstabelecimentoId(estabId);
    };
    fetchEstabelecimento();
  }, []);

  const fetchParadasMarcadas = useCallback(async () => {
    if (!estabelecimentoId) return;
    
    const { data, error } = await supabase
      .from('logistica_paradas_marcadas')
      .select(`
        *,
        veiculo:veiculos(placa, descricao)
      `)
      .eq('estabelecimento_id', estabelecimentoId)
      .eq('ativa', true)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setParadasMarcadas((data || []) as unknown as ParadaMarcada[]);
    }
  }, [estabelecimentoId]);

  const fetchVeiculos = useCallback(async () => {
    try {
      const { data: veiculosData, error: veiculosError } = await supabase
        .from('veiculos')
        .select('*')
        .eq('ativo', true)
        .order('placa');

      if (veiculosError) throw veiculosError;

      const veiculosComStatus: VeiculoComStatus[] = await Promise.all(
        (veiculosData || []).map(async (veiculo) => {
          const { data: posicaoData } = await supabase
            .from('veiculo_posicoes')
            .select('*')
            .eq('veiculo_id', veiculo.id)
            .order('data_hora', { ascending: false })
            .limit(1);

          const ultimaPosicao = posicaoData?.[0] as VeiculoPosicao | undefined;
          let status: VeiculoStatus = 'offline';

          if (ultimaPosicao) {
            const minutosDesdeUltima = differenceInMinutes(new Date(), new Date(ultimaPosicao.data_hora));
            if (minutosDesdeUltima < 10) {
              status = ultimaPosicao.velocidade > 5 ? 'movendo' : 'parado';
            }
          }

          return {
            ...veiculo,
            status,
            ultima_posicao: ultimaPosicao,
            ultima_atualizacao: ultimaPosicao?.data_hora
          } as VeiculoComStatus;
        })
      );

      setVeiculos(veiculosComStatus);
      setLastUpdate(new Date());
      await fetchParadasMarcadas();
    } catch (error) {
      console.error('Error fetching vehicles:', error);
      toast.error('Erro ao carregar veículos');
    } finally {
      setLoading(false);
    }
  }, [estabelecimentoId, fetchParadasMarcadas]);

  useEffect(() => {
    if (estabelecimentoId) {
      fetchVeiculos();
    }
  }, [estabelecimentoId, fetchVeiculos]);

  useEffect(() => {
    if (!estabelecimentoId) return;

    const interval = setInterval(fetchVeiculos, 30000);
    return () => clearInterval(interval);
  }, [estabelecimentoId, fetchVeiculos]);

  // Real-time subscription
  useEffect(() => {
    if (!estabelecimentoId) return;

    const channel = supabase
      .channel('tv-veiculos-monitor')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'veiculo_posicoes'
        },
        () => {
          fetchVeiculos();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [estabelecimentoId, fetchVeiculos]);

  const veiculosComPosicao = veiculos.filter(v => v.ultima_posicao);

  const stats = {
    total: veiculos.length,
    movendo: veiculos.filter(v => v.status === 'movendo').length,
    parado: veiculos.filter(v => v.status === 'parado').length,
    offline: veiculos.filter(v => v.status === 'offline').length,
    velocidadeMedia: veiculosComPosicao.length > 0
      ? Math.round(veiculosComPosicao.reduce((acc, v) => acc + (v.ultima_posicao?.velocidade || 0), 0) / veiculosComPosicao.length)
      : 0,
    velocidadeMax: veiculosComPosicao.length > 0
      ? Math.round(Math.max(...veiculosComPosicao.map(v => v.ultima_posicao?.velocidade || 0)))
      : 0,
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-background flex items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-background via-background to-muted/20 overflow-hidden">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-10 p-4 bg-gradient-to-b from-background via-background/95 to-transparent">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10">
              <Tv className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Monitoramento de Frota</h1>
              <p className="text-sm text-muted-foreground">
                Atualizado às {format(lastUpdate, 'HH:mm:ss', { locale: ptBR })}
              </p>
            </div>
          </div>

          {/* Stats Cards - Horizontal */}
          <div className="flex items-center gap-3">
            <Card className="p-3 bg-background/80 backdrop-blur-sm border-primary/20">
              <div className="flex items-center gap-2">
                <Car className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-xs text-muted-foreground">Total</p>
                  <p className="text-xl font-bold">{stats.total}</p>
                </div>
              </div>
            </Card>
            
            <Card className="p-3 bg-green-500/10 backdrop-blur-sm border-green-500/30">
              <div className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-green-500" />
                <div>
                  <p className="text-xs text-muted-foreground">Movendo</p>
                  <p className="text-xl font-bold text-green-600">{stats.movendo}</p>
                </div>
              </div>
            </Card>

            <Card className="p-3 bg-amber-500/10 backdrop-blur-sm border-amber-500/30">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-amber-500" />
                <div>
                  <p className="text-xs text-muted-foreground">Parado</p>
                  <p className="text-xl font-bold text-amber-600">{stats.parado}</p>
                </div>
              </div>
            </Card>

            <Card className="p-3 bg-gray-500/10 backdrop-blur-sm border-gray-500/30">
              <div className="flex items-center gap-2">
                <WifiOff className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-xs text-muted-foreground">Offline</p>
                  <p className="text-xl font-bold text-gray-500">{stats.offline}</p>
                </div>
              </div>
            </Card>

            <Card className="p-3 bg-blue-500/10 backdrop-blur-sm border-blue-500/30">
              <div className="flex items-center gap-2">
                <Gauge className="h-5 w-5 text-blue-500" />
                <div>
                  <p className="text-xs text-muted-foreground">Vel. Média</p>
                  <p className="text-xl font-bold text-blue-600">{stats.velocidadeMedia} km/h</p>
                </div>
              </div>
            </Card>

            <Badge variant="outline" className="text-base px-3 py-1">
              {format(new Date(), 'dd/MM/yyyy', { locale: ptBR })}
            </Badge>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="absolute inset-0 pt-24 flex">
        {/* Map - Takes most of the screen */}
        <div className="flex-1 relative">
          {veiculosComPosicao.length === 0 ? (
            <div className="h-full w-full flex items-center justify-center bg-muted/50">
              <div className="text-center">
                <MapPin className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <p className="text-xl text-muted-foreground">Nenhum veículo com posição</p>
                <p className="text-sm text-muted-foreground mt-2">Aguardando dados de GPS...</p>
              </div>
            </div>
          ) : (
            <LazyLogisticaMap
              veiculos={veiculosComPosicao}
              paradasMarcadas={paradasMarcadas}
              onVeiculoClick={(v) => setSelectedVeiculoId(v.id === selectedVeiculoId ? null : v.id)}
              className="absolute inset-0"
              fitBounds
            />
          )}
        </div>

        {/* Right Panel - Vehicle List */}
        <Card className="w-80 m-4 ml-0 bg-background/95 backdrop-blur-sm border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Car className="h-4 w-4" />
              Veículos ({veiculos.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[calc(100vh-220px)]">
              <div className="p-2 space-y-1">
                {veiculos.map(v => {
                  const config = statusConfig[v.status];
                  const StatusIcon = config.icon;
                  const isSelected = selectedVeiculoId === v.id;
                  
                  return (
                    <div
                      key={v.id}
                      className={cn(
                        "p-3 rounded-lg border cursor-pointer transition-all hover:shadow-md",
                        isSelected 
                          ? "bg-primary/10 border-primary" 
                          : "bg-background hover:bg-muted/50 border-border"
                      )}
                      onClick={() => setSelectedVeiculoId(v.id === selectedVeiculoId ? null : v.id)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className={cn("w-2 h-2 rounded-full", config.color)} />
                          <span className="font-bold text-sm">{v.placa}</span>
                        </div>
                        <Badge variant="outline" className={cn("text-xs", config.textColor)}>
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {config.label}
                        </Badge>
                      </div>
                      
                      {v.descricao && (
                        <p className="text-xs text-muted-foreground mb-2 truncate">{v.descricao}</p>
                      )}
                      
                      {v.ultima_posicao && (
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Gauge className="h-3 w-3" />
                            <span className={v.ultima_posicao.velocidade > 100 ? 'text-red-500 font-bold' : ''}>
                              {Math.round(v.ultima_posicao.velocidade)} km/h
                            </span>
                          </div>
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Navigation 
                              className="h-3 w-3" 
                              style={{ transform: `rotate(${v.ultima_posicao.direcao || 0}deg)` }}
                            />
                            <span>{v.ultima_posicao.direcao || 0}°</span>
                          </div>
                          <div className="col-span-2 flex items-center gap-1 text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            <span>
                              {format(new Date(v.ultima_posicao.data_hora), 'HH:mm:ss', { locale: ptBR })}
                            </span>
                          </div>
                        </div>
                      )}
                      
                      {v.motorista && (
                        <div className="mt-2 pt-2 border-t border-border/50">
                          <p className="text-xs text-muted-foreground">
                            🧑‍✈️ {v.motorista}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Alerts Panel - Bottom */}
      {veiculos.some(v => v.ultima_posicao && v.ultima_posicao.velocidade > 100) && (
        <div className="absolute bottom-4 left-4 right-96 z-10">
          <Card className="bg-red-500/10 border-red-500/30 backdrop-blur-sm">
            <CardContent className="p-3">
              <div className="flex items-center gap-2 text-red-500">
                <AlertTriangle className="h-5 w-5 animate-pulse" />
                <span className="font-medium">Alerta de Velocidade!</span>
                <span className="text-sm">
                  {veiculos.filter(v => v.ultima_posicao && v.ultima_posicao.velocidade > 100).map(v => v.placa).join(', ')}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
