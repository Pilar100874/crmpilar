import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { differenceInMinutes } from 'date-fns';
import { LogisticaMap } from '@/components/logistica/LogisticaMap';
import { VeiculosList } from '@/components/logistica/VeiculosList';
import { VeiculoDetailsPanel } from '@/components/logistica/VeiculoDetailsPanel';
import { VeiculoComStatus, VeiculoPosicao, VeiculoStatus } from '@/types/logistica';
import { getEstabelecimentoId } from '@/lib/estabelecimentoUtils';

const LogisticaDashboard: React.FC = () => {
  const [veiculos, setVeiculos] = useState<VeiculoComStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVeiculo, setSelectedVeiculo] = useState<VeiculoComStatus | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('todos');
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
    
    // Subscribe to realtime updates
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
          console.log('New position received:', payload);
          handleNewPosition(payload.new as VeiculoPosicao);
        }
      )
      .subscribe();

    // Refresh every 30 seconds
    const interval = setInterval(fetchVeiculos, 30000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [estabelecimentoId]);

  const fetchVeiculos = async () => {
    if (!estabelecimentoId) return;
    
    try {

      // Fetch vehicles with latest position
      const { data: veiculosData, error } = await supabase
        .from('veiculos')
        .select('*')
        .eq('estabelecimento_id', estabelecimentoId)
        .eq('ativo', true)
        .order('placa');

      if (error) throw error;

      // Fetch latest position for each vehicle
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
    
    // If no update in 10 minutes, consider offline
    if (minutesSinceUpdate > 10) return 'offline';
    
    // If speed > 5 km/h, consider moving
    if (posicao.velocidade > 5) return 'movendo';
    
    return 'parado';
  };

  const handleNewPosition = (posicao: VeiculoPosicao) => {
    setVeiculos(prev => prev.map(v => {
      if (v.id === posicao.veiculo_id) {
        const status = calculateStatus(posicao);
        return {
          ...v,
          ultima_posicao: posicao,
          status,
          ultima_atualizacao: posicao.data_hora
        };
      }
      return v;
    }));

    // Update selected vehicle if it's the one that received the update
    setSelectedVeiculo(prev => {
      if (prev?.id === posicao.veiculo_id) {
        const status = calculateStatus(posicao);
        return {
          ...prev,
          ultima_posicao: posicao,
          status,
          ultima_atualizacao: posicao.data_hora
        };
      }
      return prev;
    });
  };

  const handleVeiculoSelect = (veiculo: VeiculoComStatus) => {
    setSelectedVeiculo(veiculo);
  };

  return (
    <div className="h-[calc(100vh-64px)] flex">
      {/* Vehicles List */}
      <div className="w-80 flex-shrink-0">
        <VeiculosList
          veiculos={veiculos}
          selectedVeiculoId={selectedVeiculo?.id}
          onVeiculoSelect={handleVeiculoSelect}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
        />
      </div>

      {/* Map */}
      <div className="flex-1 relative">
        {loading ? (
          <div className="h-full flex items-center justify-center bg-muted/50">
            <div className="text-muted-foreground">Carregando mapa...</div>
          </div>
        ) : (
          <LogisticaMap
            veiculos={veiculos}
            onVeiculoClick={handleVeiculoSelect}
            className="h-full w-full"
          />
        )}
      </div>

      {/* Details Panel */}
      {selectedVeiculo && (
        <div className="w-80 flex-shrink-0">
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