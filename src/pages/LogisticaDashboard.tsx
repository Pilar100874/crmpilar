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
import { List, X, Info, PanelLeftClose, PanelLeft } from 'lucide-react';
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

  return (
    <div className="h-[calc(100vh-64px)] flex flex-col md:flex-row relative">
      {/* Mobile Header with buttons */}
      <div className="md:hidden absolute top-2 left-2 right-2 z-10 flex justify-between">
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
                  veiculos={veiculosFiltrados}
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

      {/* Desktop Left Sidebar */}
      <div className={cn(
        "hidden md:flex flex-col flex-shrink-0 border-r transition-all duration-300",
        sidebarCollapsed ? "w-0 overflow-hidden" : "w-72 lg:w-80"
      )}>
        <div className="p-2 border-b">
          <GrupoFilterSelect value={grupoId} onChange={setGrupoId} unidades={unidades} className="w-full" />
        </div>
        <div className="flex-1 min-h-0">
          <VeiculosList
            veiculos={veiculosFiltrados}
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

      {/* Map Container */}
      <div className="flex-1 relative min-h-[300px]">
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
              // Open details on mobile when clicking marker
              if (window.innerWidth < 768) {
                setMobileDetailsOpen(true);
              }
            }}
            focusVeiculoId={focusVehicle?.id}
            focusTrigger={focusVehicle?.nonce}
            className="h-full w-full"
            fitBounds={!focusVehicle}
          />
        )}
        
        {/* Collapse/Expand sidebar button - positioned below map zoom controls */}
        <Button
          variant="outline"
          size="icon"
          className="hidden md:flex absolute left-[10px] top-[82px] z-[400] h-[30px] w-[30px] bg-background border-2 border-[rgba(0,0,0,0.2)] shadow-none hover:bg-accent rounded-sm"
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          title={sidebarCollapsed ? "Mostrar veículos" : "Ocultar veículos"}
        >
          {sidebarCollapsed ? (
            <PanelLeft className="h-4 w-4" />
          ) : (
            <PanelLeftClose className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Desktop Right Sidebar - Details Panel */}
      {selectedVeiculo && (
        <div className="hidden md:block w-72 lg:w-80 flex-shrink-0 border-l">
          <VeiculoDetailsPanel
            veiculo={selectedVeiculo}
            onClose={() => setSelectedVeiculo(null)}
          />
        </div>
      )}
    </div>
  );
};

export default LogisticaDashboard;
