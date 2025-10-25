import { useState, useMemo, useEffect } from 'react';
import { FunilBoard } from '@/components/funil/FunilBoard';
import { FunilHeader } from '@/components/funil/FunilHeader';
import { NewDealDialog } from '@/components/funil/NewDealDialog';
import { DealDetailsDialog } from '@/components/funil/DealDetailsDialog';
import { ConfigureStagesDialog } from '@/components/funil/ConfigureStagesDialog';
import { Deal, FunilStage, FunilColumn } from '@/types/funil';
import { useToast } from '@/hooks/use-toast';

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
  const [deals, setDeals] = useState<Deal[]>(mockDeals);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<any>({});
  const [newDealOpen, setNewDealOpen] = useState(false);
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [configureStagesOpen, setConfigureStagesOpen] = useState(false);
  const [stagesConfig, setStagesConfig] = useState<StageConfig[]>(() => {
    // Tentar carregar do localStorage
    const saved = localStorage.getItem('funilStagesConfig');
    return saved ? JSON.parse(saved) : defaultStages;
  });

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

  const handleSaveStages = (stages: StageConfig[]) => {
    // Salva as configurações no estado e no localStorage
    setStagesConfig(stages);
    localStorage.setItem('funilStagesConfig', JSON.stringify(stages));
    
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

  const totalValue = deals.reduce((sum, deal) => sum + deal.valor, 0);
  const leadsAtivos = deals.length;

  return (
    <div className="h-full flex flex-col bg-background">
      <div className="p-6 border-b bg-card">
        <FunilHeader
          leadsAtivos={leadsAtivos}
          totalValue={totalValue}
          onNewLead={handleNewLead}
          onSearch={handleSearch}
          onFilterChange={handleFilterChange}
          onConfigureStages={handleConfigureStages}
        />
      </div>
      
      <div className="flex-1 p-6 overflow-hidden">
        <FunilBoard 
          columns={columns} 
          onDealMove={handleDealMove}
          onDealClick={handleDealClick}
        />
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
    </div>
  );
}
