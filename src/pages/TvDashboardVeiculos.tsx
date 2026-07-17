import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, differenceInMinutes } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  Car, Gauge, Clock, MapPin, 
  WifiOff, Activity, RefreshCw,
  Fuel, Route, Timer, Zap, ArrowLeft, X, List, Pin, Maximize2
} from 'lucide-react';
import { useGrupoFilter, filterByGrupo } from '@/lib/logistica/grupoFilter';
import { GrupoFilterSelect } from '@/components/logistica/GrupoFilterSelect';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { LazyLogisticaMap } from '@/components/logistica/LazyLogisticaMap';
import { VeiculoComStatus, VeiculoPosicao, VeiculoStatus } from '@/types/logistica';
import { ParadaMarcada } from '@/types/automacaoLogistica';
import { getEstabelecimentoId } from '@/lib/estabelecimentoUtils';
import { useFullscreen } from '@/hooks/useFullscreen';
import { useIsMobile } from '@/hooks/use-mobile';
import { fetchMotoristasAtuais } from '@/lib/logistica/cvDriverLookup';
import { FocusLegend } from '@/components/logistica/FocusLegend';

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
  const isMobile = useIsMobile();
  const [listaAberta, setListaAberta] = useState(false);
  useFullscreen(true);
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
  const [focusVeiculoId, setFocusVeiculoId] = useState<string | null>(null);
  const [focusTrigger, setFocusTrigger] = useState(0);
  const [pinnedVeiculoId, setPinnedVeiculoId] = useState<string | null>(null);
  const { grupoId, setGrupoId, unidades } = useGrupoFilter();

  const handleFocus = useCallback((id: string) => {
    setFocusVeiculoId(id);
    setFocusTrigger(t => t + 1);
  }, []);

  const togglePin = useCallback((id: string) => {
    setPinnedVeiculoId(prev => {
      const next = prev === id ? null : id;
      if (next) {
        setFocusVeiculoId(next);
        setFocusTrigger(t => t + 1);
      }
      return next;
    });
  }, []);

  const showAll = useCallback(() => {
    setPinnedVeiculoId(null);
    setFocusVeiculoId(null);
  }, []);

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

      const motoristasMap = await fetchMotoristasAtuais(veiculosComStatus.map(v => v.id));
      const veiculosComMotorista = veiculosComStatus.map(v => ({
        ...v,
        motorista_atual: motoristasMap[v.id] || undefined,
      }));

      setVeiculos(veiculosComMotorista);
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

  const veiculosFiltrados = useMemo(() => filterByGrupo(veiculos, grupoId), [veiculos, grupoId]);
  const veiculosComPosicao = veiculosFiltrados.filter(v => v.ultima_posicao);

  // Follow mode: recentraliza no veículo fixado toda vez que houver nova posição
  useEffect(() => {
    if (!pinnedVeiculoId) return;
    setFocusVeiculoId(pinnedVeiculoId);
    setFocusTrigger(t => t + 1);
  }, [pinnedVeiculoId, veiculos]);

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
    total: veiculosFiltrados.length,
    movendo: veiculosFiltrados.filter(v => v.status === 'movendo').length,
    parado: veiculosFiltrados.filter(v => v.status === 'parado').length,
    offline: veiculosFiltrados.filter(v => v.status === 'offline').length,
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
      {/* Vehicle List - Right Side */}
      {/* Vehicle List - Right Side (desktop) / Bottom sheet (mobile) */}
      <div 
        className={`fixed bg-black/40 backdrop-blur-md rounded-xl border border-white/10 overflow-hidden flex flex-col transition-transform
          md:top-3 md:right-3 md:bottom-3 md:w-64 md:translate-x-0
          ${isMobile 
            ? `left-2 right-2 bottom-2 max-h-[55vh] ${listaAberta ? 'translate-y-0' : 'translate-y-[calc(100%+1rem)]'}`
            : ''}
        `}
        style={{ zIndex: 999999 }}
      >
        <div className="px-3 py-2 border-b border-white/10 flex items-center justify-between">
          <h3 className="font-medium text-xs text-white/90 flex items-center gap-1.5">
            <Car className="h-3 w-3" />
            Veículos ({veiculos.length})
          </h3>
          {isMobile && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setListaAberta(false)}
              className="h-6 w-6 text-white/70 hover:text-white"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
        
        <div className="flex-1 overflow-y-auto">
          {veiculos.length === 0 ? (
            <div className="p-3 text-center text-white/60 text-xs">
              Nenhum veículo
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {veiculos.map((veiculo) => {
                const config = statusConfig[veiculo.status];
                const km = kmRodadosHoje[veiculo.id] || 0;
                
                return (
                  <div
                    key={veiculo.id}
                    onClick={() => handleFocus(veiculo.id)}
                    onDoubleClick={() => handleFocus(veiculo.id)}
                    className={`px-3 py-1.5 hover:bg-white/5 transition-colors cursor-pointer ${
                      focusVeiculoId === veiculo.id ? 'bg-white/10 ring-1 ring-primary' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <div
                          className="w-3 h-3 rounded-full border-2 border-white/50 flex-shrink-0"
                          style={{ backgroundColor: veiculo.cor }}
                        />
                        <span className="font-medium text-xs text-white/90 truncate">{veiculo.placa}</span>
                        <span className={`text-[10px] ${config.textColor} flex-shrink-0`}>({config.label})</span>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-white/60 flex-shrink-0">
                        {veiculo.ultima_posicao && (
                          <>
                            <span>{Math.round(veiculo.ultima_posicao.velocidade)}km/h</span>
                            <span>{km}km</span>
                          </>
                        )}
                      </div>
                    </div>
                    {veiculo.motorista_atual?.nome && (
                      <div className="mt-0.5 pl-4 text-[10px] text-white/70 truncate">
                        👤 {veiculo.motorista_atual.nome}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Mobile FAB para abrir lista */}
      {isMobile && !listaAberta && (
        <Button
          onClick={() => setListaAberta(true)}
          className="fixed bottom-4 right-4 h-12 w-12 rounded-full shadow-xl bg-primary text-primary-foreground"
          style={{ zIndex: 999998 }}
          size="icon"
        >
          <List className="h-5 w-5" />
        </Button>
      )}

      {/* Main Container */}
      <div className="fixed inset-0 bg-background overflow-hidden">
        {/* Fullscreen Map */}
        <div className="absolute inset-0">
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
              className="absolute inset-0"
              fitBounds={!focusVeiculoId}
              compactIcons
              focusVeiculoId={focusVeiculoId || undefined}
              focusTrigger={focusTrigger}
              onVeiculoClick={(v) => handleFocus(v.id)}
            />
          )}
          {focusVeiculoId && (
            <div className="pointer-events-none absolute inset-0" style={{ zIndex: 999999 }}>
              <FocusLegend
                veiculo={veiculos.find(v => v.id === focusVeiculoId)}
                onClose={() => setFocusVeiculoId(null)}
              />
            </div>
          )}
        </div>

        {/* Top Left - Back Button & Clock */}
        <div className="fixed top-3 left-3 flex items-center gap-2" style={{ zIndex: 999999 }}>
          <Button 
            variant="secondary" 
            size="icon"
            onClick={() => navigate(-1)}
            className="h-10 w-10 rounded-xl bg-background/95 backdrop-blur-md shadow-xl"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="px-4 py-2 bg-background/95 backdrop-blur-md rounded-xl shadow-xl">
            <p className="text-sm font-medium">
              {format(lastUpdate, 'HH:mm:ss', { locale: ptBR })}
            </p>
          </div>
        </div>

        {/* Bottom Left - Alerts */}
        <div className="fixed bottom-3 left-3 right-20 md:right-auto space-y-2 md:max-w-[50%]" style={{ zIndex: 999999 }}>
          {/* Alerta de Velocidade */}
          {veiculos.some(v => v.ultima_posicao && v.ultima_posicao.velocidade > 100) && (
            <div className="flex items-center gap-3 px-4 py-3 bg-red-500/20 backdrop-blur-md rounded-xl shadow-xl border border-red-500/30">
              <Zap className="h-5 w-5 text-red-500 animate-pulse flex-shrink-0" />
              <span className="text-sm text-red-500 font-medium truncate">
                Velocidade: {veiculos.filter(v => v.ultima_posicao && v.ultima_posicao.velocidade > 100).map(v => 
                  `${v.placa} (${Math.round(v.ultima_posicao!.velocidade)}km/h)`
                ).join(', ')}
              </span>
            </div>
          )}

          {/* Alerta de Veículos Parados */}
          {veiculosParadosAlerta.length > 0 && (
            <div className="flex items-center gap-3 px-4 py-3 bg-amber-500/20 backdrop-blur-md rounded-xl shadow-xl border border-amber-500/30">
              <Timer className="h-5 w-5 text-amber-500 flex-shrink-0" />
              <span className="text-sm text-amber-600 font-medium truncate">
                Parados: {veiculosParadosAlerta.map(v => {
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
