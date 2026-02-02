import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, differenceInMinutes } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  Car, Gauge, Clock, MapPin, 
  WifiOff, Activity, RefreshCw,
  Fuel, Route, Timer, Zap, ArrowLeft
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { LazyLogisticaMap } from '@/components/logistica/LazyLogisticaMap';
import { VeiculoComStatus, VeiculoPosicao, VeiculoStatus } from '@/types/logistica';
import { ParadaMarcada } from '@/types/automacaoLogistica';
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

// Paleta de cores vibrantes para identificar veículos no mapa
const veiculoCores = [
  '#3B82F6', // blue
  '#EF4444', // red
  '#10B981', // emerald
  '#F59E0B', // amber
  '#8B5CF6', // violet
  '#EC4899', // pink
  '#06B6D4', // cyan
  '#F97316', // orange
  '#6366F1', // indigo
  '#14B8A6', // teal
  '#A855F7', // purple
  '#84CC16', // lime
  '#E11D48', // rose
  '#0EA5E9', // sky
  '#22C55E', // green
  '#FACC15', // yellow
];

export default function TvDashboardVeiculos() {
  const navigate = useNavigate();
  const [veiculos, setVeiculos] = useState<VeiculoComStatus[]>([]);
  const [paradasMarcadas, setParadasMarcadas] = useState<ParadaMarcada[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [estabelecimentoId, setEstabelecimentoId] = useState<string | null>(null);
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
        (veiculosData || []).map(async (veiculo, index) => {
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

          // Atribui uma cor única baseada no índice
          const cor = veiculoCores[index % veiculoCores.length];

          return {
            ...veiculo,
            status,
            ultima_posicao: ultimaPosicao,
            ultima_atualizacao: ultimaPosicao?.data_hora,
            cor
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
    <>
      {/* Vehicle List - Right Side - Optimized for 4K */}
      <div 
        className="fixed top-4 right-4 bottom-4 w-[400px] bg-slate-900/90 backdrop-blur-md rounded-2xl border border-slate-700/50 overflow-hidden flex flex-col shadow-2xl"
        style={{ zIndex: 999999 }}
      >
        <div className="px-5 py-4 border-b border-slate-700/50 bg-slate-800/50">
          <h3 className="font-semibold text-lg text-slate-100 flex items-center gap-2">
            <Car className="h-5 w-5 text-blue-400" />
            Veículos ({veiculos.length})
          </h3>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          {veiculos.length === 0 ? (
            <div className="p-6 text-center text-slate-400 text-base">
              Nenhum veículo cadastrado
            </div>
          ) : (
            <div className="divide-y divide-slate-700/30">
              {veiculos.map((veiculo) => {
                const config = statusConfig[veiculo.status];
                const km = kmRodadosHoje[veiculo.id] || 0;
                const StatusIcon = config.icon;
                
                return (
                  <div 
                    key={veiculo.id}
                    className="px-5 py-3 hover:bg-slate-800/50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-4 h-4 rounded-full ring-2 ring-slate-600" 
                          style={{ backgroundColor: veiculo.cor }}
                        />
                        <span className="font-bold text-base text-slate-100">{veiculo.placa}</span>
                        <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                          veiculo.status === 'movendo' ? 'bg-green-500/20 text-green-400' :
                          veiculo.status === 'parado' ? 'bg-amber-500/20 text-amber-400' :
                          'bg-slate-600/20 text-slate-400'
                        }`}>
                          <StatusIcon className="h-3 w-3" />
                          {config.label}
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-sm">
                        {veiculo.ultima_posicao && (
                          <>
                            <div className="flex items-center gap-1.5">
                              <Gauge className="h-4 w-4 text-cyan-400" />
                              <span className="font-semibold text-cyan-300">{Math.round(veiculo.ultima_posicao.velocidade)} km/h</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Route className="h-4 w-4 text-emerald-400" />
                              <span className="font-semibold text-emerald-300">{km} km</span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Stats Footer */}
        <div className="px-5 py-3 border-t border-slate-700/50 bg-slate-800/50">
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <p className="text-xs text-slate-500 uppercase">Movendo</p>
              <p className="text-lg font-bold text-green-400">{stats.movendo}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase">Parados</p>
              <p className="text-lg font-bold text-amber-400">{stats.parado}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase">Offline</p>
              <p className="text-lg font-bold text-slate-400">{stats.offline}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="fixed inset-0 bg-slate-950 overflow-hidden">
        {/* Fullscreen Map */}
        <div className="absolute inset-0">
          {veiculosComPosicao.length === 0 ? (
            <div className="h-full w-full flex items-center justify-center bg-slate-900">
              <div className="text-center">
                <MapPin className="h-20 w-20 text-slate-600 mx-auto mb-6" />
                <p className="text-2xl text-slate-400 font-medium">Nenhum veículo com posição</p>
                <p className="text-base text-slate-500 mt-3">Aguardando dados de GPS...</p>
              </div>
            </div>
          ) : (
            <LazyLogisticaMap
              veiculos={veiculosComPosicao}
              paradasMarcadas={paradasMarcadas}
              className="absolute inset-0"
              fitBounds
              compactIcons
              disableInteraction
            />
          )}
        </div>

        {/* Top Left - Back Button & Clock */}
        <div className="fixed top-4 left-4 flex items-center gap-3" style={{ zIndex: 999999 }}>
          <Button 
            variant="secondary" 
            size="icon"
            onClick={() => navigate(-1)}
            className="h-12 w-12 rounded-xl bg-slate-900/95 backdrop-blur-md shadow-2xl border border-slate-700/50 hover:bg-slate-800"
          >
            <ArrowLeft className="h-6 w-6 text-slate-100" />
          </Button>
          <div className="px-5 py-3 bg-slate-900/95 backdrop-blur-md rounded-xl shadow-2xl border border-slate-700/50">
            <p className="text-lg font-semibold text-slate-100">
              {format(lastUpdate, 'HH:mm:ss', { locale: ptBR })}
            </p>
          </div>
        </div>

        {/* Top Center - KPI Summary */}
        <div className="fixed top-4 left-1/2 -translate-x-1/2 flex items-center gap-4" style={{ zIndex: 999999 }}>
          <div className="flex items-center gap-6 px-6 py-3 bg-slate-900/95 backdrop-blur-md rounded-xl shadow-2xl border border-slate-700/50">
            <div className="flex items-center gap-2">
              <Route className="h-5 w-5 text-emerald-400" />
              <span className="text-base text-slate-400">Total:</span>
              <span className="text-xl font-bold text-emerald-300">{consumoEstimado.totalKm} km</span>
            </div>
            <div className="w-px h-6 bg-slate-700" />
            <div className="flex items-center gap-2">
              <Fuel className="h-5 w-5 text-amber-400" />
              <span className="text-base text-slate-400">Custo:</span>
              <span className="text-xl font-bold text-amber-300">{formatCurrency(consumoEstimado.totalCusto)}</span>
            </div>
            <div className="w-px h-6 bg-slate-700" />
            <div className="flex items-center gap-2">
              <Gauge className="h-5 w-5 text-cyan-400" />
              <span className="text-base text-slate-400">Vel. Média:</span>
              <span className="text-xl font-bold text-cyan-300">{stats.velocidadeMedia} km/h</span>
            </div>
          </div>
        </div>

        {/* Bottom Left - Alerts */}
        <div className="fixed bottom-4 left-4 space-y-3 max-w-[50%]" style={{ zIndex: 999999 }}>
          {/* Alerta de Velocidade */}
          {veiculos.some(v => v.ultima_posicao && v.ultima_posicao.velocidade > 100) && (
            <div className="flex items-center gap-4 px-5 py-4 bg-red-950/90 backdrop-blur-md rounded-xl shadow-2xl border border-red-500/40">
              <Zap className="h-6 w-6 text-red-400 animate-pulse flex-shrink-0" />
              <span className="text-base text-red-300 font-semibold truncate">
                ⚠️ Alta Velocidade: {veiculos.filter(v => v.ultima_posicao && v.ultima_posicao.velocidade > 100).map(v => 
                  `${v.placa} (${Math.round(v.ultima_posicao!.velocidade)}km/h)`
                ).join(', ')}
              </span>
            </div>
          )}

          {/* Alerta de Veículos Parados */}
          {veiculosParadosAlerta.length > 0 && (
            <div className="flex items-center gap-4 px-5 py-4 bg-amber-950/90 backdrop-blur-md rounded-xl shadow-2xl border border-amber-500/40">
              <Timer className="h-6 w-6 text-amber-400 flex-shrink-0" />
              <span className="text-base text-amber-300 font-semibold truncate">
                ⏱️ Parados: {veiculosParadosAlerta.map(v => {
                  const minutos = differenceInMinutes(new Date(), new Date(v.ultima_posicao!.data_hora));
                  return `${v.placa} (${minutos}min)`;
                }).join(', ')}
              </span>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
