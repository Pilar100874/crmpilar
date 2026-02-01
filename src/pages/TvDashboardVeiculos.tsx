import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, differenceInMinutes } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  Car, Gauge, Clock, MapPin, AlertTriangle, 
  Wifi, WifiOff, Activity, RefreshCw, Tv,
  Navigation, Circle, Fuel, Route, Timer, Zap, ArrowLeft
} from 'lucide-react';
import { Button } from '@/components/ui/button';
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

// Configuração de consumo por tipo de veículo (L/100km)
const consumoPorTipo: Record<string, number> = {
  'carro': 10,
  'moto': 5,
  'van': 12,
  'caminhao': 25,
  'caminhonete': 14,
  'default': 12,
};

export default function TvDashboardVeiculos() {
  const navigate = useNavigate();
  const [veiculos, setVeiculos] = useState<VeiculoComStatus[]>([]);
  const [paradasMarcadas, setParadasMarcadas] = useState<ParadaMarcada[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [estabelecimentoId, setEstabelecimentoId] = useState<string | null>(null);
  const [selectedVeiculoId, setSelectedVeiculoId] = useState<string | null>(null);
  const [precosCombustivel, setPrecosCombustivel] = useState<{
    gasolina: number;
    diesel: number;
    etanol: number;
  }>({ gasolina: 5.50, diesel: 5.80, etanol: 4.20 });
  const [kmRodadosHoje, setKmRodadosHoje] = useState<Record<string, number>>({});

  useEffect(() => {
    const fetchEstabelecimento = async () => {
      const estabId = await getEstabelecimentoId();
      setEstabelecimentoId(estabId);
    };
    fetchEstabelecimento();
  }, []);

  const fetchPrecosCombustivel = useCallback(async () => {
    if (!estabelecimentoId) return;
    
    const { data, error } = await supabase
      .from('combustiveis_precos')
      .select('*')
      .eq('estabelecimento_id', estabelecimentoId)
      .maybeSingle();

    if (!error && data) {
      setPrecosCombustivel({
        gasolina: data.preco_gasolina || 5.50,
        diesel: data.preco_diesel || 5.80,
        etanol: data.preco_etanol || 4.20,
      });
    }
  }, [estabelecimentoId]);

  const fetchKmRodadosHoje = useCallback(async () => {
    if (!estabelecimentoId) return;
    
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    // Buscar todas as posições de hoje para calcular distância
    const { data: veiculosData } = await supabase
      .from('veiculos')
      .select('id')
      .eq('ativo', true);

    if (!veiculosData) return;

    const kmMap: Record<string, number> = {};

    for (const veiculo of veiculosData) {
      const { data: posicoes } = await supabase
        .from('veiculo_posicoes')
        .select('lat, lng')
        .eq('veiculo_id', veiculo.id)
        .gte('data_hora', hoje.toISOString())
        .order('data_hora', { ascending: true });

      if (posicoes && posicoes.length > 1) {
        let totalKm = 0;
        for (let i = 1; i < posicoes.length; i++) {
          const dist = calcularDistancia(
            posicoes[i - 1].lat, posicoes[i - 1].lng,
            posicoes[i].lat, posicoes[i].lng
          );
          totalKm += dist;
        }
        kmMap[veiculo.id] = Math.round(totalKm * 10) / 10;
      } else {
        kmMap[veiculo.id] = 0;
      }
    }

    setKmRodadosHoje(kmMap);
  }, [estabelecimentoId]);

  // Fórmula de Haversine para calcular distância entre dois pontos
  const calcularDistancia = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 6371; // Raio da Terra em km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

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
      await Promise.all([
        fetchParadasMarcadas(),
        fetchKmRodadosHoje(),
      ]);
    } catch (error) {
      console.error('Error fetching vehicles:', error);
      toast.error('Erro ao carregar veículos');
    } finally {
      setLoading(false);
    }
  }, [estabelecimentoId, fetchParadasMarcadas, fetchKmRodadosHoje]);

  useEffect(() => {
    if (estabelecimentoId) {
      fetchVeiculos();
      fetchPrecosCombustivel();
    }
  }, [estabelecimentoId, fetchVeiculos, fetchPrecosCombustivel]);

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

  // Calcular veículos parados há muito tempo (mais de 30 min)
  const veiculosParadosAlerta = useMemo(() => {
    return veiculos.filter(v => {
      if (v.status !== 'parado' || !v.ultima_posicao) return false;
      const minutosParado = differenceInMinutes(new Date(), new Date(v.ultima_posicao.data_hora));
      return minutosParado >= 30;
    });
  }, [veiculos]);

  // Calcular consumo estimado de combustível
  const consumoEstimado = useMemo(() => {
    let totalKm = 0;
    let totalCusto = 0;

    veiculos.forEach(v => {
      const km = kmRodadosHoje[v.id] || 0;
      totalKm += km;
      
      const tipoVeiculo = v.tipo_veiculo?.toLowerCase() || 'default';
      const consumoL100km = consumoPorTipo[tipoVeiculo] || consumoPorTipo.default;
      const litrosGastos = (km / 100) * consumoL100km;
      
      // Assumir gasolina como padrão
      totalCusto += litrosGastos * precosCombustivel.gasolina;
    });

    return {
      totalKm: Math.round(totalKm),
      totalCusto: Math.round(totalCusto * 100) / 100,
      litrosEstimados: Math.round((totalKm / 100) * 12), // Média de 12L/100km
    };
  }, [veiculos, kmRodadosHoje, precosCombustivel]);

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

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
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
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => navigate(-1)}
              className="h-10 w-10 rounded-xl"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
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
          <div className="flex items-center gap-2">
            <Card className="p-2 bg-background/80 backdrop-blur-sm border-primary/20">
              <div className="flex items-center gap-2">
                <Car className="h-4 w-4 text-primary" />
                <div>
                  <p className="text-[10px] text-muted-foreground">Total</p>
                  <p className="text-lg font-bold">{stats.total}</p>
                </div>
              </div>
            </Card>
            
            <Card className="p-2 bg-green-500/10 backdrop-blur-sm border-green-500/30">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-green-500" />
                <div>
                  <p className="text-[10px] text-muted-foreground">Movendo</p>
                  <p className="text-lg font-bold text-green-600">{stats.movendo}</p>
                </div>
              </div>
            </Card>

            <Card className="p-2 bg-amber-500/10 backdrop-blur-sm border-amber-500/30">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-amber-500" />
                <div>
                  <p className="text-[10px] text-muted-foreground">Parado</p>
                  <p className="text-lg font-bold text-amber-600">{stats.parado}</p>
                </div>
              </div>
            </Card>

            <Card className="p-2 bg-gray-500/10 backdrop-blur-sm border-gray-500/30">
              <div className="flex items-center gap-2">
                <WifiOff className="h-4 w-4 text-gray-400" />
                <div>
                  <p className="text-[10px] text-muted-foreground">Offline</p>
                  <p className="text-lg font-bold text-gray-500">{stats.offline}</p>
                </div>
              </div>
            </Card>

            <Card className="p-2 bg-blue-500/10 backdrop-blur-sm border-blue-500/30">
              <div className="flex items-center gap-2">
                <Gauge className="h-4 w-4 text-blue-500" />
                <div>
                  <p className="text-[10px] text-muted-foreground">Vel. Média</p>
                  <p className="text-lg font-bold text-blue-600">{stats.velocidadeMedia} km/h</p>
                </div>
              </div>
            </Card>

            {/* KM Rodados Hoje */}
            <Card className="p-2 bg-purple-500/10 backdrop-blur-sm border-purple-500/30">
              <div className="flex items-center gap-2">
                <Route className="h-4 w-4 text-purple-500" />
                <div>
                  <p className="text-[10px] text-muted-foreground">Km Hoje</p>
                  <p className="text-lg font-bold text-purple-600">{consumoEstimado.totalKm}</p>
                </div>
              </div>
            </Card>

            {/* Consumo Estimado */}
            <Card className="p-2 bg-orange-500/10 backdrop-blur-sm border-orange-500/30">
              <div className="flex items-center gap-2">
                <Fuel className="h-4 w-4 text-orange-500" />
                <div>
                  <p className="text-[10px] text-muted-foreground">Combustível</p>
                  <p className="text-lg font-bold text-orange-600">{formatCurrency(consumoEstimado.totalCusto)}</p>
                </div>
              </div>
            </Card>

            <Badge variant="outline" className="text-sm px-2 py-1">
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
            <ScrollArea className="h-[calc(100vh-280px)]">
              <div className="p-2 space-y-1">
                {veiculos.map(v => {
                  const config = statusConfig[v.status];
                  const StatusIcon = config.icon;
                  const isSelected = selectedVeiculoId === v.id;
                  const minutosParado = v.ultima_posicao && v.status === 'parado'
                    ? differenceInMinutes(new Date(), new Date(v.ultima_posicao.data_hora))
                    : 0;
                  const kmHoje = kmRodadosHoje[v.id] || 0;
                  
                  return (
                    <div
                      key={v.id}
                      className={cn(
                        "p-3 rounded-lg border cursor-pointer transition-all hover:shadow-md",
                        isSelected 
                          ? "bg-primary/10 border-primary" 
                          : minutosParado >= 30
                            ? "bg-amber-500/10 border-amber-500/50"
                            : "bg-background hover:bg-muted/50 border-border"
                      )}
                      onClick={() => setSelectedVeiculoId(v.id === selectedVeiculoId ? null : v.id)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className={cn("w-2 h-2 rounded-full", config.color)} />
                          <span className="font-bold text-sm">{v.placa}</span>
                          {minutosParado >= 30 && (
                            <Badge variant="destructive" className="text-[10px] px-1 py-0">
                              <Timer className="h-2 w-2 mr-0.5" />
                              {minutosParado}min
                            </Badge>
                          )}
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
                        <div className="grid grid-cols-3 gap-2 text-xs">
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
                          <div className="flex items-center gap-1 text-purple-500">
                            <Route className="h-3 w-3" />
                            <span>{kmHoje} km</span>
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
      <div className="absolute bottom-4 left-4 right-96 z-10 space-y-2">
        {/* Alerta de Velocidade */}
        {veiculos.some(v => v.ultima_posicao && v.ultima_posicao.velocidade > 100) && (
          <Card className="bg-red-500/10 border-red-500/30 backdrop-blur-sm">
            <CardContent className="p-3">
              <div className="flex items-center gap-2 text-red-500">
                <Zap className="h-5 w-5 animate-pulse" />
                <span className="font-medium">Alerta de Velocidade!</span>
                <span className="text-sm">
                  {veiculos.filter(v => v.ultima_posicao && v.ultima_posicao.velocidade > 100).map(v => 
                    `${v.placa} (${Math.round(v.ultima_posicao!.velocidade)}km/h)`
                  ).join(', ')}
                </span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Alerta de Veículos Parados */}
        {veiculosParadosAlerta.length > 0 && (
          <Card className="bg-amber-500/10 border-amber-500/30 backdrop-blur-sm">
            <CardContent className="p-3">
              <div className="flex items-center gap-2 text-amber-600">
                <Timer className="h-5 w-5" />
                <span className="font-medium">Veículos Parados há Muito Tempo</span>
                <span className="text-sm">
                  {veiculosParadosAlerta.map(v => {
                    const minutos = differenceInMinutes(new Date(), new Date(v.ultima_posicao!.data_hora));
                    return `${v.placa} (${minutos}min)`;
                  }).join(', ')}
                </span>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
