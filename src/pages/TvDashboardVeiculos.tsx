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
    <div className="fixed inset-0 bg-background overflow-hidden">
      {/* Fullscreen Map */}
      <div className="absolute inset-0 z-0">
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
            fitBounds
            compactIcons
            disableInteraction
          />
        )}
      </div>

      {/* Top Left - Back Button & Clock */}
      <div className="absolute top-3 left-3 z-[1000] flex items-center gap-2">
        <Button 
          variant="secondary" 
          size="icon"
          onClick={() => navigate(-1)}
          className="h-9 w-9 rounded-lg bg-background/90 backdrop-blur-sm shadow-lg"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="px-3 py-1.5 bg-background/90 backdrop-blur-sm rounded-lg shadow-lg">
          <p className="text-xs text-muted-foreground">
            {format(lastUpdate, 'HH:mm:ss', { locale: ptBR })}
          </p>
        </div>
      </div>

      {/* Top Right - Legend */}
      <div className="absolute top-3 right-3 z-[1000] flex items-center gap-2 px-3 py-2 bg-background/90 backdrop-blur-sm rounded-lg shadow-lg">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-green-500" />
          <span className="text-xs text-muted-foreground">Movendo</span>
          <span className="text-sm font-bold text-green-600">{stats.movendo}</span>
        </div>
        
        <div className="w-px h-4 bg-border" />
        
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-amber-500" />
          <span className="text-xs text-muted-foreground">Parado</span>
          <span className="text-sm font-bold text-amber-600">{stats.parado}</span>
        </div>
        
        <div className="w-px h-4 bg-border" />
        
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-gray-400" />
          <span className="text-xs text-muted-foreground">Offline</span>
          <span className="text-sm font-bold text-gray-500">{stats.offline}</span>
        </div>
        
        <div className="w-px h-4 bg-border" />
        
        <div className="flex items-center gap-1.5">
          <Car className="h-3 w-3 text-primary" />
          <span className="text-xs text-muted-foreground">Total</span>
          <span className="text-sm font-bold">{stats.total}</span>
        </div>
      </div>

      {/* Bottom Left - Alerts */}
      <div className="absolute bottom-3 left-3 z-[1000] space-y-1.5 max-w-[60%]">
        {/* Alerta de Velocidade */}
        {veiculos.some(v => v.ultima_posicao && v.ultima_posicao.velocidade > 100) && (
          <div className="flex items-center gap-2 px-3 py-2 bg-red-500/20 backdrop-blur-sm rounded-lg shadow-lg border border-red-500/30">
            <Zap className="h-4 w-4 text-red-500 animate-pulse flex-shrink-0" />
            <span className="text-xs text-red-500 font-medium truncate">
              Velocidade: {veiculos.filter(v => v.ultima_posicao && v.ultima_posicao.velocidade > 100).map(v => 
                `${v.placa} (${Math.round(v.ultima_posicao!.velocidade)}km/h)`
              ).join(', ')}
            </span>
          </div>
        )}

        {/* Alerta de Veículos Parados */}
        {veiculosParadosAlerta.length > 0 && (
          <div className="flex items-center gap-2 px-3 py-2 bg-amber-500/20 backdrop-blur-sm rounded-lg shadow-lg border border-amber-500/30">
            <Timer className="h-4 w-4 text-amber-500 flex-shrink-0" />
            <span className="text-xs text-amber-600 font-medium truncate">
              Parados: {veiculosParadosAlerta.map(v => {
                const minutos = differenceInMinutes(new Date(), new Date(v.ultima_posicao!.data_hora));
                return `${v.placa} (${minutos}min)`;
              }).join(', ')}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
