import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getEstabelecimentoId } from "@/lib/estabelecimentoUtils";
import { toast } from "@/lib/toast-config";
import { Orcamento, OrcamentoEtapa } from "@/types/orcamento";
import { Plus, Search, Filter, LayoutGrid, List, Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import OrcamentoBoard from "@/components/orcamento/OrcamentoBoard";
import OrcamentoListView from "@/components/orcamento/OrcamentoListView";
import OrcamentoDetailsDialog from "@/components/orcamento/OrcamentoDetailsDialog";
import POSView from "@/components/orcamento/POSView";

type ViewMode = 'kanban' | 'list' | 'pos';

const ETAPAS_CONFIG = [
  { id: 'orcamento', title: 'Orçamento', color: '#3b82f6' },
  { id: 'negociacao', title: 'Negociação', color: '#f59e0b' },
  { id: 'aprovacao_gerencia', title: 'Aprovação Gerência', color: '#f97316' },
  { id: 'perdido', title: 'Perdido', color: '#ef4444' },
  { id: 'finalizado', title: 'Finalizado', color: '#10b981' },
];

export default function Orcamentos() {
  const [orcamentos, setOrcamentos] = useState<Orcamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterVendedor, setFilterVendedor] = useState<string>("");
  const [filterEtapa, setFilterEtapa] = useState<string>("");
  const [viewMode, setViewMode] = useState<ViewMode>('kanban');
  const [estabelecimentoId, setEstabelecimentoId] = useState<string>("");
  const [selectedOrcamento, setSelectedOrcamento] = useState<Orcamento | null>(null);
  const [showOnlyMine, setShowOnlyMine] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Carregar ID do usuário logado
  useEffect(() => {
    const loadCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: userData } = await supabase
          .from('usuarios')
          .select('id')
          .eq('auth_user_id', user.id)
          .single();
        if (userData) {
          setCurrentUserId(userData.id);
        }
      }
    };
    loadCurrentUser();
  }, []);

  useEffect(() => {
    loadOrcamentos();
  }, []);

  const loadOrcamentos = async () => {
    try {
      setLoading(true);
      const estabId = await getEstabelecimentoId();
      
      if (!estabId) {
        toast.error("Selecione um estabelecimento");
        return;
      }

      setEstabelecimentoId(estabId);

      const { data, error } = await supabase
        .from('orcamentos')
        .select(`
          *,
          empresa:empresas!left(id, nome_fantasia, cnpj),
          cliente:customers!left(id, nome, email, telefone),
          vendedor:usuarios!left(id, nome),
          condicao_pagamento:condicoes_pagamento!left(id, nome),
          itens:orcamento_itens(
            *,
            produto:produtos(id, nome, foto_url)
          )
        `)
        .eq('estabelecimento_id', estabId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Buscar vínculos dos clientes para filtro "Meus"
      const clienteIds = data?.map(o => o.cliente_id).filter(Boolean) || [];
      let vinculosMap: Record<string, any[]> = {};
      
      if (clienteIds.length > 0) {
        const { data: vinculosData } = await supabase
          .from('customer_vinculos')
          .select('customer_id, usuario_id')
          .in('customer_id', clienteIds);
        
        if (vinculosData) {
          vinculosData.forEach(v => {
            if (!vinculosMap[v.customer_id]) {
              vinculosMap[v.customer_id] = [];
            }
            vinculosMap[v.customer_id].push(v);
          });
        }
      }
      
      // Adicionar vínculos aos orçamentos
      const orcamentosComVinculos = (data || []).map(orc => ({
        ...orc,
        cliente: orc.cliente ? {
          ...orc.cliente,
          customer_vinculos: vinculosMap[orc.cliente_id] || []
        } : null
      }));
      
      setOrcamentos(orcamentosComVinculos as any);
    } catch (error: any) {
      console.error('Erro ao carregar orçamentos:', error);
      toast.error("Erro ao carregar orçamentos");
    } finally {
      setLoading(false);
    }
  };

  const columns = useMemo(() => {
    let filtered = orcamentos;

    // Filtrar apenas meus orçamentos - verifica se o contato tem vínculo com o usuário logado
    if (showOnlyMine && currentUserId) {
      filtered = filtered.filter(o => {
        const customerVinculos = o.cliente?.customer_vinculos || [];
        return customerVinculos.some((v: any) => v.usuario_id === currentUserId);
      });
    }

    if (searchQuery) {
      filtered = filtered.filter(o => 
        o.cliente?.nome?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        o.id.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (filterVendedor) {
      filtered = filtered.filter(o => o.vendedor_id === filterVendedor);
    }

    if (filterEtapa) {
      filtered = filtered.filter(o => o.etapa === filterEtapa);
    }

    return ETAPAS_CONFIG.map(etapa => ({
      id: etapa.id as OrcamentoEtapa,
      title: etapa.title,
      color: etapa.color,
      orcamentos: filtered.filter(o => o.etapa === etapa.id),
    }));
  }, [orcamentos, searchQuery, filterVendedor, filterEtapa, showOnlyMine, currentUserId]);

  const flatOrcamentos = useMemo(() => {
    return columns.flatMap(col => col.orcamentos);
  }, [columns]);

  const handleOrcamentoMove = async (orcamentoId: string, newEtapa: OrcamentoEtapa) => {
    try {
      const { error } = await supabase
        .from('orcamentos')
        .update({ etapa: newEtapa })
        .eq('id', orcamentoId);

      if (error) throw error;

      setOrcamentos(prev => prev.map(o => 
        o.id === orcamentoId ? { ...o, etapa: newEtapa } : o
      ));

      toast.success("Orçamento movido com sucesso");
    } catch (error: any) {
      console.error('Erro ao mover orçamento:', error);
      toast.error("Erro ao mover orçamento");
    }
  };

  const handleOrcamentoDelete = async (orcamentoId: string) => {
    if (!confirm("Tem certeza que deseja excluir este orçamento?")) return;

    try {
      // Primeiro deletar os itens
      const { error: itensError } = await supabase
        .from('orcamento_itens')
        .delete()
        .eq('orcamento_id', orcamentoId);

      if (itensError) throw itensError;

      // Depois deletar o orçamento
      const { error } = await supabase
        .from('orcamentos')
        .delete()
        .eq('id', orcamentoId);

      if (error) throw error;

      setOrcamentos(prev => prev.filter(o => o.id !== orcamentoId));
      toast.success("Orçamento excluído com sucesso");
    } catch (error: any) {
      console.error('Erro ao excluir orçamento:', error);
      toast.error("Erro ao excluir orçamento");
    }
  };

  const handleOrcamentoClick = (orcamento: Orcamento) => {
    setSelectedOrcamento(orcamento);
    setViewMode('pos');
  };

  const handleOrcamentoSaved = () => {
    loadOrcamentos();
    setSelectedOrcamento(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header - Escondido no modo POS */}
      {viewMode !== 'pos' && (
        <div className="border-b bg-card">
        <div className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">Orçamentos</h1>
            <div className="flex gap-2">
              <Button onClick={() => setViewMode('pos')}>
                <Plus className="w-4 h-4 mr-2" />
                Novo Orçamento
              </Button>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-3">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por cliente ou ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            <Select value={filterEtapa || "all"} onValueChange={(value) => setFilterEtapa(value === "all" ? "" : value)}>
              <SelectTrigger className="w-[180px]">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Filtrar status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="orcamento">Orçamento</SelectItem>
                <SelectItem value="negociacao">Negociação</SelectItem>
                <SelectItem value="aprovacao_gerencia">Aprovação Gerência</SelectItem>
              </SelectContent>
            </Select>

            {/* Toggle Meus/Todos */}
            <div className="flex gap-1 border rounded-md">
              <Button
                variant={!showOnlyMine ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setShowOnlyMine(false)}
                title="Ver todos os orçamentos"
                className="px-3"
              >
                Todos
              </Button>
              <Button
                variant={showOnlyMine ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setShowOnlyMine(true)}
                title="Ver apenas meus orçamentos"
                className="px-3"
              >
                Meus
              </Button>
            </div>

            <div className="flex gap-1 border rounded-md">
              <Button
                variant={viewMode === 'kanban' ? 'secondary' : 'ghost'}
                size="icon"
                onClick={() => setViewMode('kanban')}
                title="Kanban"
              >
                <LayoutGrid className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                size="icon"
                onClick={() => setViewMode('list')}
                title="Lista"
              >
                <List className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {ETAPAS_CONFIG.map(etapa => {
              const count = columns.find(c => c.id === etapa.id)?.orcamentos.length || 0;
              const total = columns.find(c => c.id === etapa.id)?.orcamentos
                .reduce((sum, o) => sum + (o.valor_total || 0), 0) || 0;
              
              return (
                <Card key={etapa.id} className="p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium">{etapa.title}</span>
                    <Badge 
                      variant="secondary" 
                      style={{ backgroundColor: `${etapa.color}20`, color: etapa.color }}
                    >
                      {count}
                    </Badge>
                  </div>
                  <p className="text-xl font-bold">
                    {new Intl.NumberFormat('pt-BR', {
                      style: 'currency',
                      currency: 'BRL'
                    }).format(total)}
                  </p>
                </Card>
              );
            })}
          </div>
        </div>
      </div>
      )}

      {/* Content */}
      {viewMode === 'pos' ? (
        <div className="flex-1 overflow-hidden">
          <POSView 
            estabelecimentoId={estabelecimentoId}
            orcamentoId={selectedOrcamento?.id}
            onClose={() => {
              setViewMode('kanban');
              setSelectedOrcamento(null);
              loadOrcamentos();
            }}
          />
        </div>
      ) : (
        <div className="flex-1 overflow-hidden">
          {viewMode === 'kanban' ? (
            <OrcamentoBoard
              columns={columns}
              onOrcamentoMove={handleOrcamentoMove}
              onOrcamentoClick={handleOrcamentoClick}
              onOrcamentoDelete={handleOrcamentoDelete}
              etapas={ETAPAS_CONFIG}
            />
          ) : (
            <OrcamentoListView
              orcamentos={flatOrcamentos}
              onOrcamentoClick={handleOrcamentoClick}
            />
          )}
        </div>
      )}

      {/* Dialogs - Não mostrar se estiver no modo POS */}
      {selectedOrcamento && viewMode !== 'pos' && (
        <OrcamentoDetailsDialog
          orcamento={selectedOrcamento}
          open={!!selectedOrcamento}
          onOpenChange={(open) => !open && setSelectedOrcamento(null)}
          onSave={handleOrcamentoSaved}
        />
      )}
    </div>
  );
}
