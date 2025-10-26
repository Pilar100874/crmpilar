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

// Mock data inicial com stages
const mockDeals: Deal[] = [
  {
    id: '1',
    cliente: 'Kommo Demo',
    valor: 5000,
    dataEstimada: '2025-11-20',
    responsavel: 'Menu',
    origem: 'WhatsApp',
    status: 'normal',
    saude: 'verde',
    tags: [],
    stage: 'lead',
  },
  {
    id: '2',
    cliente: 'Marcos PAPÉIS',
    valor: 820298.64,
    dataEstimada: '2025-11-22',
    responsavel: 'Marcos',
    origem: 'Site',
    status: 'normal',
    saude: 'amarelo',
    tags: ['Sem Tarefas'],
    stage: 'qualificacao',
  },
  {
    id: '3',
    cliente: 'Marcos Pilar',
    valor: 15000,
    dataEstimada: '2025-11-14',
    responsavel: 'Pilar',
    origem: 'Indicação',
    status: 'urgente',
    saude: 'vermelho',
    diasParado: 5,
    tags: ['Sem Tarefas'],
    stage: 'negociacao',
  },
];

interface StageConfig {
  id: string;
  title: string;
  isDefault: boolean;
}

const defaultStages: StageConfig[] = [
  { id: 'lead', title: 'ETAPA DE LEADS DE ENTRADA', isDefault: true },
  { id: 'qualificacao', title: 'CONTATO INICIAL', isDefault: true },
  { id: 'proposta', title: 'DISCUSSÕES', isDefault: true },
  { id: 'negociacao', title: 'TOMADA DE DECISÃO', isDefault: true },
  { id: 'fechamento', title: 'DISCUSSÃO DE CONTRATO', isDefault: true },
];

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
      
      setDeals(data?.map(deal => ({
        id: deal.id,
        cliente: deal.cliente_nome,
        valor: Number(deal.valor),
        dataEstimada: deal.data_estimada || '',
        responsavel: deal.responsavel?.nome || 'Sem responsável',
        origem: deal.origem,
        status: deal.status as any,
        saude: deal.saude as any,
        diasParado: deal.dias_parado,
        tags: deal.tags || [],
        stage: deal.stage_id,
      })) || []);
    } catch (error) {
      console.error('Erro ao carregar deals:', error);
      toast({ title: 'Erro ao carregar negócios', variant: 'destructive' });
    }
  };

  // Simular detecção de SLA (negócios parados)
  useEffect(() => {
    const interval = setInterval(() => {
      setDeals(prev => prev.map(deal => ({
        ...deal,
        diasParado: deal.diasParado ? deal.diasParado + 1 : 1,
      })));
    }, 60000); // Atualiza a cada minuto (em produção seria diário)

    return () => clearInterval(interval);
  }, []);

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

  const handleDealMove = (dealId: string, newStage: FunilStage) => {
    const deal = deals.find(d => d.id === dealId);
    
    setDeals(prevDeals => 
      prevDeals.map(d => 
        d.id === dealId ? { ...d, stage: newStage, diasParado: 0 } as any : d
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
  };

  const getStageTitle = (stage: FunilStage | string): string => {
    // Busca o título da etapa nas configurações
    const stageConfig = stagesConfig.find(s => s.id === stage);
    return stageConfig?.title || stage.toString();
  };

  const handleNewLead = () => {
    setNewDealOpen(true);
  };

  const handleSaveNewDeal = (newDeal: Omit<Deal, 'id'>) => {
    const deal: Deal = {
      ...newDeal,
      id: `deal-${Date.now()}`,
    };
    
    setDeals(prev => [...prev, deal as any]);
    
    toast({
      title: 'Lead criado',
      description: `${deal.cliente} foi adicionado ao funil com sucesso.`,
    });
  };

  const handleDealClick = (deal: Deal) => {
    setSelectedDeal(deal);
    setDetailsOpen(true);
  };

  const handleUpdateDeal = (dealId: string, updates: Partial<Deal>) => {
    setDeals(prev => prev.map(d => 
      d.id === dealId ? { ...d, ...updates } : d
    ));
    
    toast({
      title: 'Negócio atualizado',
      description: 'As alterações foram salvas com sucesso.',
    });
  };

  const handleConfigureStages = () => {
    setConfigureStagesOpen(true);
  };

  const handleSaveStages = (stages: StageConfig[], moves: { from: string; to: string }[]) => {
    // Salva as configurações no estado e no localStorage
    setStagesConfig(stages);
    localStorage.setItem('funilStagesConfig', JSON.stringify(stages));

    const stageIds = new Set(stages.map(s => s.id));
    const movesMap = new Map(moves.map(m => [m.from, m.to] as const));
    const fallbackStage = stages[0]?.id;

    // Aplica movimentações e garante que todos os deals tenham estágio válido
    setDeals(prev => prev.map(d => {
      const currentStage = (d as any).stage as string | undefined;
      const movedTo = currentStage ? movesMap.get(currentStage) : undefined;
      const nextStage = movedTo || (currentStage && stageIds.has(currentStage) ? currentStage : fallbackStage);
      return { ...d, stage: nextStage } as any;
    }));
    
    toast({
      title: 'Etapas configuradas',
      description: `${stages.length} etapas foram configuradas com sucesso.`,
    });
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
