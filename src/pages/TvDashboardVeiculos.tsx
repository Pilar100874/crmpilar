import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useTvMode } from "@/lib/tvMode";
import { useAutoReload } from "@/lib/tvAutoReload";
import { useSaidaOculta } from "@/lib/tvSaidaOculta";
import { SaidaOcultaOverlay } from "@/components/tv/SaidaOcultaOverlay";
import TvNotificationBarAuto from "@/components/tv/TvNotificationBarAuto";
import { useSearchParams, useNavigate } from 'react-router-dom';
import { format, differenceInMinutes } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  Car, Gauge, Clock, MapPin, 
  WifiOff, Activity, RefreshCw,
  Fuel, Route, Timer, Zap, X, List, Pin, KeyRound, Power, ArrowLeft, Maximize2, Crosshair } from 'lucide-react';
import { GrupoFilterSelect } from '@/components/logistica/GrupoFilterSelect';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { LazyLogisticaMap } from '@/components/logistica/LazyLogisticaMap';
import { VeiculoComStatus, VeiculoPosicao, VeiculoStatus } from '@/types/logistica';
import { CorteCombustivelBadge } from '@/components/logistica/CorteCombustivelBadge';
import { ParadaMarcada } from '@/types/automacaoLogistica';
import { getEstabelecimentoId } from '@/lib/estabelecimentoUtils';
import { useFullscreen } from '@/hooks/useFullscreen';
import { useIsMobile } from '@/hooks/use-mobile';
import { rodarAutomacoesLogistica } from '@/lib/logistica/automacaoRunner';
import { fetchMotoristasAtuais } from '@/lib/logistica/cvDriverLookup';
import { FocusLegend } from '@/components/logistica/FocusLegend';
import { callTvDeviceFunction, getTvDeviceToken } from '@/lib/tvDeviceClient';
import { AutomacaoMensagensFila } from '@/components/logistica/AutomacaoMensagensFila';
import { TrilhaFocoControls } from '@/components/logistica/TrilhaFocoControls';
import { carregarCicloConfig, lerCicloConfigCache, type TvVeiculosCicloConfig } from '@/lib/tv/veiculosCicloConfig';
import { useGrupoFilter, filterByGrupo } from '@/lib/logistica/grupoFilter';



const statusConfig = {
  movendo: { label: 'Em movimento', color: 'bg-green-500', textColor: 'text-green-400', hex: '#22C55E', icon: Activity },
  parado: { label: 'Parado', color: 'bg-amber-500', textColor: 'text-amber-400', hex: '#F59E0B', icon: Clock },
  offline: { label: 'Offline', color: 'bg-gray-400', textColor: 'text-gray-300', hex: '#9CA3AF', icon: WifiOff }
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
  const modoTv = useTvMode();
  const navigate = useNavigate();
  // Sem reload periódico: os dados já atualizam sozinhos a cada 30s e o reload
  // fazia a TV piscar/ficar preta.
  useAutoReload({ minutosPadrao: 0 });


  const { progresso: progressoSaida } = useSaidaOculta(() => { try { window.close(); } catch {} navigate(-1); });
  const isMobile = useIsMobile();
  const tvDeviceToken = useMemo(() => getTvDeviceToken(), []);
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
  const [modoFoco, setModoFoco] = useState(false);
  const modoFocoRef = useRef(false);
  useEffect(() => { modoFocoRef.current = modoFoco; }, [modoFoco]);
  const [trilhaMinutos, setTrilhaMinutos] = useState<number>(() => Number(localStorage.getItem('logistica:trilhaMinutos') || 15));
  const [trilhaLimparToken, setTrilhaLimparToken] = useState(0);
  useEffect(() => { localStorage.setItem('logistica:trilhaMinutos', String(trilhaMinutos)); }, [trilhaMinutos]);
  const { grupoId, setGrupoId, unidades } = useGrupoFilter();
  const [searchParams] = useSearchParams();
  // Grupos fixados pelo dashboard remoto (?grupos=id1,id2)
  const gruposFixos = useMemo(
    () => (searchParams.get('grupos') || '').split(',').map(s => s.trim()).filter(Boolean),
    [searchParams]
  );


  const handleFocus = useCallback((id: string) => {
    setFocusVeiculoId(id);
    setFocusTrigger(t => t + 1);
    // Modo foco: segue automaticamente o veículo selecionado
    if (modoFocoRef.current) setPinnedVeiculoId(id);
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
    setModoFoco(false);
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
      if (tvDeviceToken) {
        const data = await callTvDeviceFunction<{
          estabelecimento_id: string;
          veiculos: VeiculoComStatus[];
          paradasMarcadas: ParadaMarcada[];
          kmRodadosHoje: Record<string, number>;
          precosCombustivel: { gasolina: number; diesel: number; etanol: number };
        }>('tv-dashboard-veiculos', tvDeviceToken);
        setEstabelecimentoId(data.estabelecimento_id);
        setVeiculos(data.veiculos || []);
        setParadasMarcadas(data.paradasMarcadas || []);
        setKmRodadosHoje(data.kmRodadosHoje || {});
        setPrecosCombustivel(data.precosCombustivel || { gasolina: 5.50, diesel: 5.80, etanol: 4.20 });
        setLastUpdate(new Date());
        return;
      }

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
            // Mesmo limiar do cadastro de veículos (30 min = Online)
            if (minutosDesdeUltima <= 30) {
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
      // Automações de logística rodam em qualquer mapa (throttle global evita duplicidade)
      await rodarAutomacoesLogistica(veiculosComMotorista, estabelecimentoId);
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
  }, [tvDeviceToken, estabelecimentoId, fetchParadasMarcadas, fetchKmRodadosHoje]);

  useEffect(() => {
    if (estabelecimentoId || tvDeviceToken) {
      fetchVeiculos();
      if (!tvDeviceToken) fetchPrecosCombustivel();
    }
  }, [estabelecimentoId, tvDeviceToken, fetchVeiculos, fetchPrecosCombustivel]);

  useEffect(() => {
    if (!estabelecimentoId && !tvDeviceToken) return;

    const interval = setInterval(fetchVeiculos, 30000);
    return () => clearInterval(interval);
  }, [estabelecimentoId, tvDeviceToken, fetchVeiculos]);

  // Real-time subscription (com debounce para não repintar a tela toda hora)
  useEffect(() => {
    if (!estabelecimentoId || tvDeviceToken) return;

    let timer: number | null = null;
    const agendarAtualizacao = () => {
      if (timer !== null) return;
      timer = window.setTimeout(() => {
        timer = null;
        fetchVeiculos();
      }, 8000);
    };

    const channel = supabase
      .channel('tv-veiculos-monitor')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'veiculo_posicoes'
        },
        agendarAtualizacao
      )
      .subscribe();

    return () => {
      if (timer !== null) window.clearTimeout(timer);
      supabase.removeChannel(channel);
    };
  }, [estabelecimentoId, tvDeviceToken, fetchVeiculos]);


  const statusOrder: Record<VeiculoStatus, number> = { movendo: 0, parado: 1, offline: 2 };
  const veiculosFiltrados = useMemo(() => {
    const base = gruposFixos.length
      ? veiculos.filter(v => {
          const gid = (v as any).logistica_grupo_id || (v as any).grupo_id;
          return gid && gruposFixos.includes(gid);
        })
      : filterByGrupo(veiculos, grupoId);
    return [...base].sort((a, b) => {
      const so = statusOrder[a.status] - statusOrder[b.status];
      if (so !== 0) return so;
      // dentro de "movendo", mais rápidos primeiro
      if (a.status === 'movendo' && b.status === 'movendo') {
        return (b.ultima_posicao?.velocidade || 0) - (a.ultima_posicao?.velocidade || 0);
      }
      return (a.placa || '').localeCompare(b.placa || '');
    });
  }, [veiculos, grupoId, gruposFixos]);

  const veiculosComPosicao = veiculosFiltrados.filter(v => v.ultima_posicao);

  // Padding do mapa para não deixar veículos atrás dos painéis
  const fitBoundsPadding = useMemo(() => {
    if (isMobile) {
      // Lista aparece embaixo (max 55vh) quando aberta; senão FAB pequeno
      const bottom = listaAberta ? Math.round(window.innerHeight * 0.55) + 24 : 90;
      return { topLeft: [60, 20] as [number, number], bottomRight: [20, bottom] as [number, number] };
    }
    // Desktop/tablet: painel direito estreito (md:w-56 lg:w-64) + margens; topo com relógio/botões
    return { topLeft: [80, 20] as [number, number], bottomRight: [20, 280] as [number, number] };
  }, [isMobile, listaAberta]);

  // Follow mode: mantém o id do veículo fixado, mas não dispara novo foco a cada atualização de GPS.
  // O componente de mapa faz o seguimento suave internamente (panTo com duração).
  useEffect(() => {
    if (!pinnedVeiculoId) return;
    if (focusVeiculoId !== pinnedVeiculoId) {
      setFocusVeiculoId(pinnedVeiculoId);
    }
    // Não incrementa focusTrigger aqui; o mapa segue via modoFoco + focoVeiculoId.
  }, [pinnedVeiculoId, veiculos, focusVeiculoId]);

  // ===== Modo autônomo (TV sem mouse/teclado) =====
  // Alterna sozinho entre visão geral (todos os veículos) e foco em cada veículo.
  const [cicloConfig, setCicloConfig] = useState<TvVeiculosCicloConfig>(() => lerCicloConfigCache());
  useEffect(() => {
    let vivo = true;
    const carregar = () => { carregarCicloConfig().then(c => { if (vivo) setCicloConfig(c); }); };
    carregar();
    const t = window.setInterval(carregar, 5 * 60 * 1000);
    return () => { vivo = false; window.clearInterval(t); };
  }, []);
  const autonomoAtivo = (modoTv || !!tvDeviceToken) && cicloConfig.autonomo_ativo;
  const OVERVIEW_MS = Math.max(5, cicloConfig.overview_segundos) * 1000;
  const FOCO_MS = Math.max(3, cicloConfig.foco_segundos) * 1000;
  const autoEtapaRef = useRef<{ fase: 'geral' | 'foco'; indice: number; ate: number }>({ fase: 'geral', indice: 0, ate: 0 });
  const interacaoAteRef = useRef(0);

  useEffect(() => {
    if (!autonomoAtivo) return;
    const marcar = () => { interacaoAteRef.current = Date.now() + Math.max(0, cicloConfig.pausa_interacao_segundos) * 1000; };
    window.addEventListener('pointerdown', marcar);
    window.addEventListener('keydown', marcar);
    return () => {
      window.removeEventListener('pointerdown', marcar);
      window.removeEventListener('keydown', marcar);
    };
  }, [autonomoAtivo, cicloConfig.pausa_interacao_segundos]);

  const idsRotacao = useMemo(
    () => veiculosComPosicao.map(v => v.id).sort(),
    [veiculosComPosicao],
  );
  const idsRotacaoRef = useRef<string[]>([]);
  useEffect(() => { idsRotacaoRef.current = idsRotacao; }, [idsRotacao]);

  useEffect(() => {
    if (!autonomoAtivo) return;
    autoEtapaRef.current = { fase: 'geral', indice: 0, ate: Date.now() + OVERVIEW_MS };
    const tick = () => {
      if (Date.now() < interacaoAteRef.current) return;
      const etapa = autoEtapaRef.current;
      if (Date.now() < etapa.ate) return;
      const ids = idsRotacaoRef.current;
      if (ids.length === 0) {
        etapa.ate = Date.now() + OVERVIEW_MS;
        return;
      }
      if (etapa.fase === 'geral') {
        const idx = etapa.indice % ids.length;
        autoEtapaRef.current = { fase: 'foco', indice: idx, ate: Date.now() + FOCO_MS };
        setModoFoco(true);
        setPinnedVeiculoId(ids[idx]);
        setFocusVeiculoId(ids[idx]);
        setFocusTrigger(t => t + 1);
      } else {
        const proximo = etapa.indice + 1;
        if (proximo >= ids.length) {
          // Ciclo completo: volta para a visão geral
          autoEtapaRef.current = { fase: 'geral', indice: 0, ate: Date.now() + OVERVIEW_MS };
          setModoFoco(false);
          setPinnedVeiculoId(null);
          setFocusVeiculoId(null);
        } else {
          autoEtapaRef.current = { fase: 'foco', indice: proximo, ate: Date.now() + FOCO_MS };
          setPinnedVeiculoId(ids[proximo]);
          setFocusVeiculoId(ids[proximo]);
          setFocusTrigger(t => t + 1);
        }
      }
    };
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [autonomoAtivo, OVERVIEW_MS, FOCO_MS]);

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
      <AutomacaoMensagensFila posicao="bottom-left" tvMode maxVisiveis={3} />
      {/* Vehicle List - Right Side */}
      {/* Vehicle List - Right Side (desktop) / Bottom sheet (mobile) */}
      <div 
        className={`fixed bg-black/55 backdrop-blur-sm rounded-xl border border-white/10 overflow-hidden flex flex-col transition-transform
          md:top-3 md:right-3 md:bottom-3 md:w-56 lg:w-64 md:translate-x-0
          ${isMobile 
            ? `left-2 right-2 bottom-2 max-h-[55vh] ${listaAberta ? 'translate-y-0' : 'translate-y-[calc(100%+1rem)]'}`
            : ''}
        `}
        style={{ zIndex: 999999 }}
      >

        <div className="px-2 py-1.5 border-b border-white/10 flex items-center justify-between">
          <h3 className="font-medium text-[10px] text-white/90 flex items-center gap-1">
            <Car className="h-3 w-3" />
            Veículos ({veiculosFiltrados.length})
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

        {/* Legenda de cores por status */}
        <div className="px-2 py-1 border-b border-white/10 flex flex-wrap items-center gap-x-2 gap-y-0.5">
          {(Object.keys(statusConfig) as Array<keyof typeof statusConfig>).map((k) => (
            <span key={k} className="flex items-center gap-1 text-[9px] text-white/70 whitespace-nowrap">
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: statusConfig[k].hex }} />
              {statusConfig[k].label} ({stats[k as 'movendo' | 'parado' | 'offline']})
            </span>
          ))}
        </div>

        
        <div className="flex-1 overflow-y-auto">
          {veiculosFiltrados.length === 0 ? (
            <div className="p-3 text-center text-white/60 text-xs">
              Nenhum veículo
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {veiculosFiltrados.map((veiculo) => {
                const config = statusConfig[veiculo.status];
                const km = kmRodadosHoje[veiculo.id] || 0;
                const isPinned = pinnedVeiculoId === veiculo.id;
                
                return (
                  <div
                    key={veiculo.id}
                    onClick={() => handleFocus(veiculo.id)}
                    onDoubleClick={() => handleFocus(veiculo.id)}
                    className={`px-2 py-1 hover:bg-white/5 transition-colors cursor-pointer ${
                      focusVeiculoId === veiculo.id ? 'bg-white/10 ring-1 ring-primary' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1.5">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <div
                          className="w-2.5 h-2.5 rounded-full border border-white/50 flex-shrink-0"
                          style={{ backgroundColor: veiculo.cor }}
                        />
                        <span
                          className="font-semibold text-[11px] whitespace-nowrap shrink-0"
                          style={{ color: config.hex }}
                          title={config.label}
                        >
                          {veiculo.placa}
                        </span>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); togglePin(veiculo.id); }}
                        title={isPinned ? 'Desafixar' : 'Fixar no mapa'}
                        className={`p-0.5 rounded hover:bg-white/10 shrink-0 ${isPinned ? 'text-primary' : 'text-white/50'}`}
                      >
                        <Pin className={`h-2.5 w-2.5 ${isPinned ? 'fill-current' : ''}`} />
                      </button>
                    </div>

                    <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                      {veiculo.ultima_posicao && (
                        <>
                          <span className="text-[9px] text-white/60 whitespace-nowrap">
                            {Math.round(veiculo.ultima_posicao.velocidade)}km/h
                          </span>
                          <span className="text-[9px] text-white/60 whitespace-nowrap">
                            {km}km
                          </span>
                          <span
                            title={
                              typeof veiculo.ultima_posicao.ignicao === 'boolean'
                                ? veiculo.ultima_posicao.ignicao ? 'Ignição ligada' : 'Ignição desligada'
                                : 'Sem informação de ignição'
                            }
                            className={`inline-flex items-center gap-0.5 px-1 rounded ${
                              veiculo.ultima_posicao.ignicao
                                ? 'bg-emerald-500/20 text-emerald-300'
                                : 'bg-white/10 text-white/50'
                            }`}
                          >
                            {veiculo.ultima_posicao.ignicao ? <KeyRound className="h-2.5 w-2.5" /> : <Power className="h-2.5 w-2.5" />}
                          </span>
                          <CorteCombustivelBadge
                            corte={veiculo.ultima_posicao.corte_combustivel}
                            compact
                            className="bg-white/10 text-white/80 text-[9px] px-1"
                          />
                        </>
                      )}
                    </div>

                    {veiculo.motorista_atual?.nome && (
                      <div className="mt-0.5 text-[9px] text-white/70 truncate" title={veiculo.motorista_atual.nome}>
                        {veiculo.motorista_atual.nome}
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
              fitBounds={!pinnedVeiculoId}
              fitBoundsPadding={fitBoundsPadding}
              zoomMaximoSempre={!pinnedVeiculoId}
              compactIcons
              focusVeiculoId={focusVeiculoId || undefined}
              focusTrigger={focusTrigger}
              modoFoco={modoFoco}
              focoZoom={modoFoco ? 18 : 17}
              trilhaMinutos={modoFoco ? (autonomoAtivo ? cicloConfig.trilha_minutos : trilhaMinutos) : 0}
              trilhaLimparToken={trilhaLimparToken}
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

        {/* Top Left - Relógio (+ controles somente fora do modo dispositivo/TV) */}
        <div className="fixed top-3 left-3 flex items-center gap-2" style={{ zIndex: 999999 }}>
          {!modoTv && !tvDeviceToken && (
            <Button
              variant="secondary"
              size="icon"
              onClick={() => navigate(-1)}
              className="h-10 w-10 rounded-xl bg-background/95 backdrop-blur-md shadow-xl"
              data-tv-hide
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          )}
          <div className="px-4 py-2 bg-background/95 backdrop-blur-md rounded-xl shadow-xl">
            <p className="text-sm font-medium">
              {format(lastUpdate, 'HH:mm:ss', { locale: ptBR })}
            </p>
          </div>
          {autonomoAtivo && (
            <div className="px-3 py-2 bg-primary/90 text-primary-foreground rounded-xl shadow-xl flex items-center gap-1.5">
              <Crosshair className="h-4 w-4" />
              <span className="text-sm font-medium">
                {modoFoco ? 'Foco automático' : 'Visão geral'}
              </span>
            </div>
          )}
          {!modoTv && !tvDeviceToken && (
            <>
              {gruposFixos.length > 0 ? (
                <div className="px-4 py-2 bg-background/95 backdrop-blur-md rounded-xl shadow-xl text-sm font-medium" data-tv-hide>
                  {gruposFixos.length === 1
                    ? unidades.find(u => u.id === gruposFixos[0])?.nome || 'Grupo'
                    : `${gruposFixos.length} grupos`}
                </div>
              ) : (
                <div className="bg-background/95 backdrop-blur-md rounded-xl shadow-xl" data-tv-hide>
                  <GrupoFilterSelect value={grupoId} onChange={setGrupoId} unidades={unidades} size="sm" />
                </div>
              )}
              <Button
                variant={modoFoco ? 'default' : 'secondary'}
                size="sm"
                onClick={() => {
                  setModoFoco(prev => {
                    const next = !prev;
                    if (next && focusVeiculoId) setPinnedVeiculoId(focusVeiculoId);
                    if (!next) setPinnedVeiculoId(null);
                    return next;
                  });
                }}
                className="h-10 rounded-xl bg-background/95 backdrop-blur-md shadow-xl gap-1"
                title="Modo foco: centraliza e amplia no veículo selecionado"
                data-tv-hide
              >
                <Crosshair className="h-4 w-4" />
                Modo Foco
              </Button>
              {modoFoco && (
                <TrilhaFocoControls
                  minutos={trilhaMinutos}
                  onMinutosChange={setTrilhaMinutos}
                  onLimpar={() => setTrilhaLimparToken(Date.now())}
                  className="h-10"
                  compacto
                />
              )}
              <Button
                variant="secondary"
                size="sm"
                onClick={showAll}
                className="h-10 rounded-xl bg-background/95 backdrop-blur-md shadow-xl gap-1"
                title="Mostrar todos os veículos no mapa"
                data-tv-hide
              >
                <Maximize2 className="h-4 w-4" />
                Ver todos
              </Button>
            </>
          )}
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
      <SaidaOcultaOverlay progresso={progressoSaida} />
      <TvNotificationBarAuto />
    </>
  );
}
