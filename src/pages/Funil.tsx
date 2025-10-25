import { useState, useMemo } from 'react';
import { FunilBoard } from '@/components/funil/FunilBoard';
import { FunilHeader } from '@/components/funil/FunilHeader';
import { Deal, FunilStage, FunilColumn } from '@/types/funil';
import { useToast } from '@/hooks/use-toast';

// Mock data inicial
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
  },
];

export default function Funil() {
  const { toast } = useToast();
  const [deals, setDeals] = useState<Deal[]>(mockDeals);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<any>({});

  // Organiza os deals por estágio
  const columns: FunilColumn[] = useMemo(() => {
    const filteredDeals = deals.filter(deal => {
      // Filtro de busca
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          deal.cliente.toLowerCase().includes(query) ||
          deal.responsavel.toLowerCase().includes(query)
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
      return true;
    });

    return [
      {
        id: 'lead',
        title: 'ETAPA DE LEADS DE ENTRADA',
        deals: filteredDeals.filter(d => !d.id || d.id === '1'), // Mock: primeiro deal
      },
      {
        id: 'qualificacao',
        title: 'CONTATO INICIAL',
        deals: filteredDeals.filter(d => d.id === '2'), // Mock: segundo deal
      },
      {
        id: 'proposta',
        title: 'DISCUSSÕES',
        deals: [],
      },
      {
        id: 'negociacao',
        title: 'TOMADA DE DECISÃO',
        deals: filteredDeals.filter(d => d.id === '3'), // Mock: terceiro deal
      },
      {
        id: 'fechamento',
        title: 'DISCUSSÃO DE CONTRATO',
        deals: [],
      },
    ];
  }, [deals, searchQuery, filters]);

  const handleDealMove = (dealId: string, newStage: FunilStage) => {
    setDeals(prevDeals => 
      prevDeals.map(deal => 
        deal.id === dealId ? { ...deal, stage: newStage } : deal
      )
    );
    
    toast({
      title: 'Negócio movido',
      description: 'O negócio foi movido para a nova etapa com sucesso.',
    });
  };

  const handleNewLead = () => {
    toast({
      title: 'Novo Lead',
      description: 'Funcionalidade de criação de novo lead em desenvolvimento.',
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
        />
      </div>
      
      <div className="flex-1 p-6 overflow-hidden">
        <FunilBoard columns={columns} onDealMove={handleDealMove} />
      </div>
    </div>
  );
}
