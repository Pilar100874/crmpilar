import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { differenceInMinutes } from 'date-fns';
import { VeiculosList } from '@/components/logistica/VeiculosList';
import { VeiculoDetailsPanel } from '@/components/logistica/VeiculoDetailsPanel';
import { VeiculoComStatus, VeiculoPosicao, VeiculoStatus } from '@/types/logistica';
import { ParadaMarcada } from '@/types/automacaoLogistica';
import { getEstabelecimentoId } from '@/lib/estabelecimentoUtils';
import { LazyLogisticaMap } from '@/components/logistica/LazyLogisticaMap';
import { fetchMotoristasAtuais } from '@/lib/logistica/cvDriverLookup';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { List, X, Info, PanelLeftClose, PanelLeft, Car, Activity, Clock, WifiOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { GrupoFilterSelect } from '@/components/logistica/GrupoFilterSelect';
import { useGrupoFilter, filterByGrupo } from '@/lib/logistica/grupoFilter';

const LogisticaDashboard: React.FC = () => {
  const [veiculos, setVeiculos] = useState<VeiculoComStatus[]>([]);
  const [paradasMarcadas, setParadasMarcadas] = useState<ParadaMarcada[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVeiculo, setSelectedVeiculo] = useState<VeiculoComStatus | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('todos');
  const [estabelecimentoId, setEstabelecimentoId] = useState<string | null>(null);
  const [mobileListOpen, setMobileListOpen] = useState(false);
  const [mobileDetailsOpen, setMobileDetailsOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [focusVehicle, setFocusVehicle] = useState<{ id: string; nonce: number } | null>(null);
  const { grupoId, setGrupoId, unidades } = useGrupoFilter(estabelecimentoId);
  const veiculosFiltrados = React.useMemo(() => filterByGrupo(veiculos, grupoId), [veiculos, grupoId]);


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
    fetchParadasMarcadas();
    
    const channel = supabase
      .channel('veiculo-posicoes-updates')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'veiculo_posicoes'
        },
        (payload) => {
          handleNewPosition(payload.new as VeiculoPosicao);
        }
      )
      .subscribe();

    // Canal para atualizações de paradas marcadas em tempo real
    const paradasChannel = supabase
      .channel('paradas-marcadas-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'logistica_paradas_marcadas'
        },
        () => {
          fetchParadasMarcadas();
        }
      )
      .subscribe();

    const interval = setInterval(() => {
      fetchVeiculos();
      fetchParadasMarcadas();
    }, 30000);

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(paradasChannel);
      clearInterval(interval);
    };
  }, [estabelecimentoId]);

  const fetchParadasMarcadas = async () => {
    if (!estabelecimentoId) return;
    
    try {
      const { data, error } = await supabase
        .from('logistica_paradas_marcadas')
        .select(`
          *,
          veiculo:veiculos(placa, descricao)
        `)
        .eq('estabelecimento_id', estabelecimentoId)
        .eq('ativa', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      setParadasMarcadas((data || []) as unknown as ParadaMarcada[]);
    } catch (error) {
      console.error('Error fetching paradas marcadas:', error);
    }
  };

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

      // Enriquece com motorista atual (baseado em cv_vehicle_movements)
      try {
        const motoristasMap = await fetchMotoristasAtuais(veiculosComPosicao.map(v => v.id));
        for (const v of veiculosComPosicao) {
          v.motorista_atual = motoristasMap[v.id] ?? null;
        }
      } catch (e) {
        console.warn('Falha ao buscar motoristas atuais', e);
      }

      setVeiculos(veiculosComPosicao);
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

  const handleNewPosition = (posicao: VeiculoPosicao) => {
    setVeiculos(prev => prev.map(v => {
      if (v.id === posicao.veiculo_id) {
        const status = calculateStatus(posicao);
        return { ...v, ultima_posicao: posicao, status, ultima_atualizacao: posicao.data_hora };
      }
      return v;
    }));

    setSelectedVeiculo(prev => {
      if (prev?.id === posicao.veiculo_id) {
        const status = calculateStatus(posicao);
        return { ...prev, ultima_posicao: posicao, status, ultima_atualizacao: posicao.data_hora };
      }
      return prev;
    });
  };

  const handleVeiculoSelect = (veiculo: VeiculoComStatus | null) => {
    setSelectedVeiculo(veiculo);
    setMobileListOpen(false);
    if (veiculo) {
      setMobileDetailsOpen(true);
    }
  };

  const stats = React.useMemo(() => ({
    total: veiculosPorGrupo.length,
    movendo: veiculosPorGrupo.filter(v => v.status === 'movendo').length,
    parado: veiculosPorGrupo.filter(v => v.status === 'parado').length,
    offline: veiculosPorGrupo.filter(v => v.status === 'offline').length,
  }), [veiculosPorGrupo]);

  return (
    <div className="h-[calc(100dvh-64px)] flex flex-col overflow-hidden bg-muted/30">
      {/* Header */}
      <div className="shrink-0 border-b bg-background/80 backdrop-blur-md p-3 sm:p-4 flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-lg sm:text-xl font-semibold flex items-center gap-2">
              <Car className="h-4 w-4 sm:h-5 sm:w-5" />
              Painel de Logística
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Frota em tempo real no mapa
            </p>
          </div>
          <GrupoFilterSelect value={grupoId} onChange={setGrupoId} unidades={unidades} className="w-full sm:w-56" />
        </div>

        {/* Filtros rápidos */}
        <div className="flex flex-wrap items-center gap-2">
          {([
            { key: 'todos', label: 'Total', value: stats.total, dot: 'bg-primary', text: 'text-foreground', ring: 'ring-primary', Icon: Car },
            { key: 'movendo', label: 'Em rota', value: stats.movendo, dot: 'bg-green-500', text: 'text-green-600', ring: 'ring-green-500', Icon: Activity },
            { key: 'parado', label: 'Parado', value: stats.parado, dot: 'bg-amber-500', text: 'text-amber-600', ring: 'ring-amber-500', Icon: Clock },
            { key: 'offline', label: 'Offline', value: stats.offline, dot: 'bg-muted-foreground/50', text: 'text-muted-foreground', ring: 'ring-muted-foreground', Icon: WifiOff },
          ] as const).map(({ key, label, value, dot, text, ring, Icon }) => {
            const active = statusFilter === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setStatusFilter(active && key !== 'todos' ? 'todos' : key)}
                title={`Filtrar: ${label}`}
                className={cn(
                  "flex items-center gap-2 rounded-full border border-border/60 bg-card/70 backdrop-blur-md px-3 py-1 shadow-sm transition-all hover:bg-accent",
                  active && cn("ring-2 ring-offset-1 ring-offset-background bg-card", ring)
                )}
              >
                <span className={cn("h-2 w-2 rounded-full", dot, key === 'movendo' && 'animate-pulse')} />
                <Icon className={cn("h-3.5 w-3.5", text)} />
                <span className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</span>
                <span className={cn("text-sm font-bold tabular-nums", text)}>{value}</span>
              </button>
            );
          })}
          {statusFilter !== 'todos' && (
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setStatusFilter('todos')}>
              Limpar filtro
            </Button>
          )}
        </div>
      </div>

      {/* Conteúdo - mapa como foco principal */}
      <div className="flex-1 min-h-0 relative overflow-hidden p-2">
        <div className="absolute inset-2 overflow-hidden rounded-xl border border-border/60 shadow-sm bg-card">
          {loading ? (
            <div className="h-full flex items-center justify-center bg-muted/50">
              <div className="text-muted-foreground">Carregando...</div>
            </div>
          ) : (
            <LazyLogisticaMap
              veiculos={veiculosFiltrados}
              paradasMarcadas={paradasMarcadas}
              onVeiculoClick={(v) => {
                setSelectedVeiculo(v);
                if (window.innerWidth < 1024) {
                  setMobileDetailsOpen(true);
                }
              }}
              focusVeiculoId={focusVehicle?.id}
              focusTrigger={focusVehicle?.nonce}
              className="h-full w-full"
              fitBounds={!focusVehicle}
              fitBoundsPadding={{ topLeft: [300, 40], bottomRight: [selectedVeiculo ? 300 : 40, 40] }}
            />
          )}
        </div>

        {/* Botões flutuantes (mobile/tablet) */}
        <div className="lg:hidden absolute top-4 left-4 right-4 z-[500] flex justify-between">
          <Sheet open={mobileListOpen} onOpenChange={setMobileListOpen}>
            <SheetTrigger asChild>
              <Button variant="secondary" size="sm" className="shadow-lg">
                <List className="h-4 w-4 mr-2" />
                Veículos ({veiculosFiltrados.length})
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[85vw] sm:w-[350px] p-0">
              <div className="flex flex-col h-full">
                <div className="p-2 border-b">
                  <GrupoFilterSelect value={grupoId} onChange={setGrupoId} unidades={unidades} className="w-full" />
                </div>
                <div className="flex-1 min-h-0">
                  <VeiculosList
                    veiculos={veiculosPorGrupo}
                    selectedVeiculoId={selectedVeiculo?.id}
                    onVeiculoSelect={handleVeiculoSelect}
                    onVeiculoDoubleClick={(v) => { setSelectedVeiculo(v); setFocusVehicle({ id: v.id, nonce: Date.now() }); setMobileListOpen(false); }}
                    searchTerm={searchTerm}
                    onSearchChange={setSearchTerm}
                    statusFilter={statusFilter}
                    onStatusFilterChange={setStatusFilter}
                  />
                </div>
              </div>
            </SheetContent>
          </Sheet>

          {selectedVeiculo && (
            <Sheet open={mobileDetailsOpen} onOpenChange={setMobileDetailsOpen}>
              <SheetTrigger asChild>
                <Button variant="secondary" size="sm" className="shadow-lg">
                  <Info className="h-4 w-4 mr-2" />
                  Detalhes
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[85vw] sm:w-[350px] p-0">
                <VeiculoDetailsPanel
                  veiculo={selectedVeiculo}
                  onClose={() => {
                    setMobileDetailsOpen(false);
                    setSelectedVeiculo(null);
                  }}
                />
              </SheetContent>
            </Sheet>
          )}
        </div>

        {/* Painel flutuante de veículos (desktop) */}
        {!sidebarCollapsed ? (
          <div className="hidden lg:flex absolute top-4 left-4 bottom-4 w-72 z-[500] flex-col rounded-xl border border-border/60 bg-background/85 backdrop-blur-md shadow-xl overflow-hidden">
            <div className="px-3 py-2 border-b border-border/60 flex items-center justify-between">
              <h3 className="font-medium text-xs uppercase tracking-wide flex items-center gap-2">
                <Car className="h-3.5 w-3.5" />
                Veículos ({veiculosFiltrados.length})
              </h3>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setSidebarCollapsed(true)} title="Recolher">
                <PanelLeftClose className="h-3.5 w-3.5" />
              </Button>
            </div>
            <div className="flex-1 min-h-0">
              <VeiculosList
                veiculos={veiculosPorGrupo}
                selectedVeiculoId={selectedVeiculo?.id}
                onVeiculoSelect={setSelectedVeiculo}
                onVeiculoDoubleClick={(v) => { setSelectedVeiculo(v); setFocusVehicle({ id: v.id, nonce: Date.now() }); }}
                searchTerm={searchTerm}
                onSearchChange={setSearchTerm}
                statusFilter={statusFilter}
                onStatusFilterChange={setStatusFilter}
              />
            </div>
          </div>
        ) : (
          <Button
            variant="secondary"
            size="sm"
            className="hidden lg:flex absolute top-4 left-4 z-[500] shadow-lg"
            onClick={() => setSidebarCollapsed(false)}
          >
            <PanelLeft className="h-4 w-4 mr-2" />
            Veículos ({veiculosFiltrados.length})
          </Button>
        )}

        {/* Painel flutuante de detalhes (desktop) */}
        {selectedVeiculo && (
          <div className="hidden lg:flex absolute top-4 right-4 bottom-4 w-72 z-[500] flex-col rounded-xl border border-border/60 bg-background/85 backdrop-blur-md shadow-xl overflow-hidden">
            <VeiculoDetailsPanel
              veiculo={selectedVeiculo}
              onClose={() => setSelectedVeiculo(null)}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default LogisticaDashboard;
