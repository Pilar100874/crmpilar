import { useState, useMemo, useEffect } from 'react';
import { FunilBoard } from '@/components/funil/FunilBoard';
import { FunilListView } from '@/components/funil/FunilListView';
import { FunilHeader } from '@/components/funil/FunilHeader';
import { NewDealDialog } from '@/components/funil/NewDealDialog';
import { DealDetailsDialog } from '@/components/funil/DealDetailsDialog';
import { ConfigureStagesDialog } from '@/components/funil/ConfigureStagesDialog';
import { FunilSelector } from '@/components/funil/FunilSelector';
import { NewFunilDialog } from '@/components/funil/NewFunilDialog';
import { ManageFunisDialog } from '@/components/funil/ManageFunisDialog';
import { Deal, FunilStage, FunilColumn } from '@/types/funil';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { getEstabelecimentoId } from '@/lib/estabelecimentoUtils';

interface StageConfig {
  id: string;
  title: string;
  isDefault: boolean;
}

export default function Funil() {
  const { toast } = useToast();
  const [selectedFunilId, setSelectedFunilId] = useState<string | null>(null);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<any>({});
  const [newDealOpen, setNewDealOpen] = useState(false);
  const [newFunilOpen, setNewFunilOpen] = useState(false);
  const [manageFunisOpen, setManageFunisOpen] = useState(false);
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [configureStagesOpen, setConfigureStagesOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
  const [stagesConfig, setStagesConfig] = useState<StageConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [funilSelectorKey, setFunilSelectorKey] = useState(0);

  // Carrega dados quando o funil é selecionado
  useEffect(() => {
    if (selectedFunilId) {
      loadStages();
      loadDeals();
    }
  }, [selectedFunilId]);

  const loadStages = async () => {
    if (!selectedFunilId) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('funil_stages')
        .select('*')
        .eq('funil_id', selectedFunilId)
        .order('ordem', { ascending: true });

      if (error) throw error;
      
      setStagesConfig(data?.map(stage => ({
        id: stage.id,
        title: stage.nome,
        isDefault: false,
      })) || []);
    } catch (error) {
      console.error('Erro ao carregar etapas:', error);
      toast({ title: 'Erro ao carregar etapas', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const loadDeals = async () => {
    if (!selectedFunilId) return;

    try {
      const { data, error } = await supabase
        .from('funil_deals')
        .select(`
          *,
          stage:funil_stages(id, nome),
          responsavel:usuarios(nome)
        `)
        .eq('funil_id', selectedFunilId);

      if (error) throw error;
      
      const agora = Date.now();
      setDeals(data?.map(deal => ({
        id: deal.id,
        cliente: deal.cliente_nome,
        valor: Number(deal.valor),
        dataEstimada: deal.data_estimada || '',
        responsavel: deal.responsavel?.nome || 'Sem responsável',
        responsavelId: deal.responsavel_id,
        clienteId: deal.cliente_id,
        origem: deal.origem,
        status: deal.status as any,
        saude: deal.saude as any,
        diasParado: Math.max(0, Math.floor((agora - new Date(deal.ultima_interacao || deal.updated_at || deal.created_at || agora).getTime()) / 86400000)),
        ultimaInteracao: deal.ultima_interacao || deal.updated_at || deal.created_at || undefined,
        segmento: typeof deal.custom_fields === 'object' && deal.custom_fields && !Array.isArray(deal.custom_fields) ? String((deal.custom_fields as Record<string, unknown>).segmento || '') : '',
        cluster: typeof deal.custom_fields === 'object' && deal.custom_fields && !Array.isArray(deal.custom_fields) ? String((deal.custom_fields as Record<string, unknown>).cluster || '') : '',
        tags: deal.tags || [],
        stage: deal.stage_id,
      })) || []);
    } catch (error) {
      console.error('Erro ao carregar deals:', error);
      toast({ title: 'Erro ao carregar negócios', variant: 'destructive' });
    }
  };

  // Organiza os deals por estágio usando as configurações salvas
  const columns: FunilColumn[] = useMemo(() => {
    const filteredDeals = deals.filter(deal => {
      // Filtro de busca
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          deal.cliente.toLowerCase().includes(query) ||
          deal.responsavel.toLowerCase().includes(query) ||
          (deal.origem && deal.origem.toLowerCase().includes(query))
        );
      }
      return true;
    }).filter(deal => {
      // Filtros adicionais
      if (filters.responsavel && filters.responsavel !== 'todos') {
        return deal.responsavel.toLowerCase() === filters.responsavel.toLowerCase();
      }
      if (filters.status && filters.status !== 'todos') {
        return deal.status === filters.status;
      }
      if (filters.origem && filters.origem !== 'todos') {
        return deal.origem?.toLowerCase() === filters.origem.toLowerCase();
      }
      return true;
    });

    // Gera colunas dinamicamente baseado nas configurações
    return stagesConfig.map(stage => ({
      id: stage.id as FunilStage,
      title: stage.title,
      deals: filteredDeals.filter(d => (d as any).stage === stage.id),
    }));
  }, [deals, searchQuery, filters, stagesConfig]);

  const handleDealMove = async (dealId: string, newStage: FunilStage) => {
    const deal = deals.find(d => d.id === dealId);
    
    // Atualizar no banco de dados
    try {
      const { error } = await supabase
        .from('funil_deals')
        .update({ 
          stage_id: newStage,
          dias_parado: 0,
          ultima_interacao: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', dealId);

      if (error) throw error;

      // Atualizar estado local
      setDeals(prevDeals => 
        prevDeals.map(d => 
          d.id === dealId ? { ...d, stage: newStage, diasParado: 0, ultimaInteracao: new Date().toISOString() } as any : d
        )
      );
      
      toast({
        title: 'Negócio movido',
        description: `${deal?.cliente} foi movido para ${getStageTitle(newStage)}`,
      });

      // Simular playbook automático
      if (newStage === 'qualificacao') {
        setTimeout(() => {
          toast({
            title: '🤖 Playbook ativado',
            description: 'Tarefa automática criada: Enviar script de qualificação',
          });
        }, 1000);
      }
    } catch (error) {
      console.error('Erro ao mover negócio:', error);
      toast({
        title: 'Erro ao mover negócio',
        description: 'Não foi possível mover o negócio. Tente novamente.',
        variant: 'destructive',
      });
    }
  };

  const getStageTitle = (stage: FunilStage | string): string => {
    // Busca o título da etapa nas configurações
    const stageConfig = stagesConfig.find(s => s.id === stage);
    return stageConfig?.title || stage.toString();
  };

  const handleNewLead = () => {
    setNewDealOpen(true);
  };

  const handleSaveNewDeal = async (newDeal: Omit<Deal, 'id'>): Promise<boolean> => {
    if (!selectedFunilId) {
      toast({
        title: 'Erro',
        description: 'Nenhum funil selecionado',
        variant: 'destructive',
      });
      return false;
    }

    try {
      const estabId = await getEstabelecimentoId();
      if (!estabId) {
        toast({
          title: 'Erro',
          description: 'Estabelecimento não identificado',
          variant: 'destructive',
        });
        return false;
      }

      // Buscar o stage_id da primeira etapa do funil
      const firstStage = stagesConfig[0];
      if (!firstStage) {
        toast({
          title: 'Erro',
          description: 'Nenhuma etapa configurada neste funil',
          variant: 'destructive',
        });
        return false;
      }

      // Preparar dados para inserir no banco
      const dealData = {
        funil_id: selectedFunilId,
        estabelecimento_id: estabId,
        stage_id: newDeal.stage || firstStage.id,
        cliente_id: newDeal.clienteId || null,
        cliente_nome: newDeal.cliente,
        valor: newDeal.valor,
        data_estimada: newDeal.dataEstimada,
        origem: newDeal.origem,
        status: newDeal.status || 'ativo',
        saude: newDeal.saude || 'verde',
        dias_parado: 0,
        prioridade: newDeal.prioridade || 0,
        tags: newDeal.tags || [],
        responsavel_id: newDeal.responsavelId || null,
        ultima_interacao: new Date().toISOString(),
        custom_fields: { segmento: newDeal.segmento || null, cluster: newDeal.cluster || null },
      };

      const { data, error } = await supabase
        .from('funil_deals')
        .insert([dealData])
        .select()
        .single();

      if (error) throw error;

      // Recarregar deals do banco
      await loadDeals();
      
      toast({
        title: 'Lead criado',
        description: `${newDeal.cliente} foi adicionado ao funil com sucesso.`,
      });
      return true;
    } catch (error) {
      console.error('Erro ao salvar lead:', error);
      toast({
        title: 'Erro ao criar lead',
        description: 'Não foi possível salvar o lead. Tente novamente.',
        variant: 'destructive',
      });
      return false;
    }
  };

  const handleDealClick = (deal: Deal) => {
    setSelectedDeal(deal);
    setDetailsOpen(true);
  };

  const handleUpdateDeal = async (dealId: string, updates: Partial<Deal>) => {
    try {
      // Preparar dados para atualizar no banco
      const updateData: any = {};
      
      if (updates.cliente) updateData.cliente_nome = updates.cliente;
      if (updates.valor !== undefined) updateData.valor = updates.valor;
      if (updates.dataEstimada) updateData.data_estimada = updates.dataEstimada;
      if (updates.origem) updateData.origem = updates.origem;
      if (updates.status) updateData.status = updates.status;
      if (updates.saude) updateData.saude = updates.saude;
      if (updates.diasParado !== undefined) updateData.dias_parado = updates.diasParado;
      if (updates.prioridade !== undefined) updateData.prioridade = updates.prioridade;
      if (updates.tags) updateData.tags = updates.tags;
      
      updateData.updated_at = new Date().toISOString();

      const { error } = await supabase
        .from('funil_deals')
        .update(updateData)
        .eq('id', dealId);

      if (error) throw error;

      // Atualizar estado local
      setDeals(prev => prev.map(d => 
        d.id === dealId ? { ...d, ...updates } : d
      ));
      
      toast({
        title: 'Negócio atualizado',
        description: 'As alterações foram salvas com sucesso.',
      });
    } catch (error) {
      console.error('Erro ao atualizar negócio:', error);
      toast({
        title: 'Erro ao atualizar negócio',
        description: 'Não foi possível salvar as alterações. Tente novamente.',
        variant: 'destructive',
      });
    }
  };

  const handleConfigureStages = () => {
    setConfigureStagesOpen(true);
  };

  const handleSaveStages = async (stages: StageConfig[], moves: { from: string; to: string }[]): Promise<boolean> => {
    if (!selectedFunilId) return false;
    try {
      const atuais = new Set(stagesConfig.map((stage) => stage.id));
      const idsPersistidos = new Map<string, string>();
      for (const [ordem, stage] of stages.entries()) {
        if (atuais.has(stage.id)) {
          const { error } = await supabase.from('funil_stages').update({ nome: stage.title, ordem }).eq('id', stage.id).eq('funil_id', selectedFunilId);
          if (error) throw error;
          idsPersistidos.set(stage.id, stage.id);
        } else {
          const { data, error } = await supabase.from('funil_stages').insert({ funil_id: selectedFunilId, nome: stage.title, ordem }).select('id').single();
          if (error) throw error;
          idsPersistidos.set(stage.id, data.id);
        }
      }
      for (const move of moves) {
        const destino = idsPersistidos.get(move.to) || move.to;
        const { error } = await supabase.from('funil_deals').update({ stage_id: destino, ultima_interacao: new Date().toISOString() }).eq('stage_id', move.from).eq('funil_id', selectedFunilId);
        if (error) throw error;
      }
      const mantidos = new Set(stages.map((stage) => stage.id));
      for (const antiga of stagesConfig.filter((stage) => !mantidos.has(stage.id))) {
        const { error } = await supabase.from('funil_stages').delete().eq('id', antiga.id).eq('funil_id', selectedFunilId);
        if (error) throw error;
      }
      await Promise.all([loadStages(), loadDeals()]);
      toast({ title: 'Etapas configuradas', description: `${stages.length} etapas foram salvas.` });
      return true;
    } catch (error) {
      console.error('Erro ao salvar etapas:', error);
      toast({ title: 'Erro ao salvar etapas', description: 'Nenhuma confirmação foi exibida porque a gravação não terminou.', variant: 'destructive' });
      return false;
    }
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  const handleFilterChange = (newFilters: any) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  const handleViewModeChange = (mode: 'kanban' | 'list') => {
    setViewMode(mode);
  };

  // Lista plana de deals para a visualização em lista
  const flatDeals = useMemo(() => {
    return deals.filter(deal => {
      // Filtro de busca
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          deal.cliente.toLowerCase().includes(query) ||
          deal.responsavel.toLowerCase().includes(query) ||
          (deal.origem && deal.origem.toLowerCase().includes(query))
        );
      }
      return true;
    }).filter(deal => {
      // Filtros adicionais
      if (filters.responsavel && filters.responsavel !== 'todos') {
        return deal.responsavel.toLowerCase() === filters.responsavel.toLowerCase();
      }
      if (filters.status && filters.status !== 'todos') {
        return deal.status === filters.status;
      }
      if (filters.origem && filters.origem !== 'todos') {
        return deal.origem?.toLowerCase() === filters.origem.toLowerCase();
      }
      return true;
    });
  }, [deals, searchQuery, filters]);

  const totalValue = deals.reduce((sum, deal) => sum + deal.valor, 0);
  const leadsAtivos = deals.length;

  const handleFunilChange = (funilId: string) => {
    setSelectedFunilId(funilId);
  };

  const handleNewFunil = () => {
    setNewFunilOpen(true);
  };

  const handleManageFunis = () => {
    setManageFunisOpen(true);
  };

  const handleFunilCreated = (funilId: string) => {
    setSelectedFunilId(funilId);
    setFunilSelectorKey(prev => prev + 1); // Força recarga do FunilSelector
  };

  const handleFunilsUpdated = () => {
    setFunilSelectorKey(prev => prev + 1); // Força recarga do FunilSelector
    // Recarrega os dados
    if (selectedFunilId) {
      loadStages();
      loadDeals();
    }
  };

  if (!selectedFunilId) {
    return (
      <div className="h-full flex flex-col bg-background">
        <div className="p-6 border-b bg-card">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold">Funil de Vendas</h1>
            <FunilSelector
              key={funilSelectorKey}
              selectedFunilId={selectedFunilId}
              onFunilChange={handleFunilChange}
              onNewFunil={handleNewFunil}
              onManageFunis={handleManageFunis}
            />
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-4">
            <p className="text-muted-foreground">Selecione ou crie um funil para começar</p>
          </div>
        </div>
        <NewFunilDialog
          open={newFunilOpen}
          onOpenChange={setNewFunilOpen}
          onSuccess={handleFunilCreated}
        />
        <ManageFunisDialog
          open={manageFunisOpen}
          onOpenChange={setManageFunisOpen}
          onFunilsUpdated={handleFunilsUpdated}
        />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-background">
      <div className="p-6 border-b bg-card">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold">Funil de Vendas</h1>
          <FunilSelector
            key={funilSelectorKey}
            selectedFunilId={selectedFunilId}
            onFunilChange={handleFunilChange}
            onNewFunil={handleNewFunil}
            onManageFunis={handleManageFunis}
          />
        </div>
        <FunilHeader
          leadsAtivos={leadsAtivos}
          totalValue={totalValue}
          onNewLead={handleNewLead}
          onSearch={handleSearch}
          onFilterChange={handleFilterChange}
          onConfigureStages={handleConfigureStages}
          viewMode={viewMode}
          onViewModeChange={handleViewModeChange}
        />
      </div>
      
      <div className="flex-1 p-6 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center space-y-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
              <p className="text-muted-foreground">Carregando funil...</p>
            </div>
          </div>
        ) : viewMode === 'kanban' ? (
          <FunilBoard 
            columns={columns} 
            onDealMove={handleDealMove}
            onDealClick={handleDealClick}
          />
        ) : (
          <FunilListView
            deals={flatDeals}
            stages={stagesConfig}
            onDealClick={handleDealClick}
          />
        )}
      </div>

      <NewDealDialog
        open={newDealOpen}
        onOpenChange={setNewDealOpen}
        onSave={handleSaveNewDeal}
        stages={stagesConfig}
      />

      <DealDetailsDialog
        deal={selectedDeal}
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        onUpdate={handleUpdateDeal}
      />

      <ConfigureStagesDialog
        open={configureStagesOpen}
        onOpenChange={setConfigureStagesOpen}
        onSave={handleSaveStages}
        currentDeals={deals}
        initialStages={stagesConfig}
      />

      <NewFunilDialog
        open={newFunilOpen}
        onOpenChange={setNewFunilOpen}
        onSuccess={handleFunilCreated}
      />

      <ManageFunisDialog
        open={manageFunisOpen}
        onOpenChange={setManageFunisOpen}
        onFunilsUpdated={handleFunilsUpdated}
      />
    </div>
  );
}
