import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Send, Package } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Produto {
  id: string;
  nome: string;
  codigo: string | null;
  estoque: number | null;
  grupo_id: string | null;
  marca: string | null;
  preco_tabela: number | null;
}

interface Grupo {
  id: string;
  nome: string;
}

interface ConsultaEstoqueDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  estabelecimentoId: string;
  onEnviarParaConversa: (texto: string) => void;
}

export function ConsultaEstoqueDialog({ open, onOpenChange, estabelecimentoId, onEnviarParaConversa }: ConsultaEstoqueDialogProps) {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [search, setSearch] = useState('');
  const [grupoFilter, setGrupoFilter] = useState<string>('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && estabelecimentoId) {
      loadData();
    }
  }, [open, estabelecimentoId]);

  useEffect(() => {
    if (!open) {
      setSelectedIds(new Set());
      setSearch('');
      setGrupoFilter('all');
    }
  }, [open]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [prodRes, grupoRes] = await Promise.all([
        supabase
          .from('produtos')
          .select('id, nome, codigo, estoque, grupo_id, marca, preco_tabela')
          .eq('estabelecimento_id', estabelecimentoId)
          .eq('ativo', true)
          .order('nome'),
        supabase
          .from('produto_grupos')
          .select('id, nome')
          .eq('estabelecimento_id', estabelecimentoId)
          .order('nome')
      ]);

      if (prodRes.data) setProdutos(prodRes.data);
      if (grupoRes.data) setGrupos(grupoRes.data);
    } catch (err) {
      console.error('Erro ao carregar produtos:', err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    return produtos.filter(p => {
      const matchSearch = !search || 
        p.nome.toLowerCase().includes(search.toLowerCase()) ||
        (p.codigo && p.codigo.toLowerCase().includes(search.toLowerCase())) ||
        (p.marca && p.marca.toLowerCase().includes(search.toLowerCase()));
      const matchGrupo = grupoFilter === 'all' || p.grupo_id === grupoFilter;
      return matchSearch && matchGrupo;
    });
  }, [produtos, search, grupoFilter]);

  const toggleItem = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map(p => p.id)));
    }
  };

  const handleEnviar = () => {
    const selected = produtos.filter(p => selectedIds.has(p.id));
    if (selected.length === 0) {
      toast.warning('Selecione ao menos um produto');
      return;
    }

    const lines = selected.map(p => {
      const estoque = p.estoque != null ? p.estoque : 0;
      const code = p.codigo ? ` (${p.codigo})` : '';
      return `📦 *${p.nome}*${code} — Estoque: *${estoque}*`;
    });

    const texto = `*Consulta de Estoque*\n${lines.join('\n')}`;
    onEnviarParaConversa(texto);
    onOpenChange(false);
    toast.success(`${selected.length} produto(s) enviado(s) para a conversa`);
  };

  const grupoName = (id: string | null) => {
    if (!id) return '—';
    return grupos.find(g => g.id === id)?.nome || '—';
  };

  const allSelected = filtered.length > 0 && selectedIds.size === filtered.length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange} modal={false}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-4 pt-4 pb-3 border-b">
          <DialogTitle className="flex items-center gap-2 text-base">
            <Package className="h-5 w-5 text-emerald-600" />
            Consulta de Estoque
          </DialogTitle>
        </DialogHeader>

        {/* Filtros */}
        <div className="px-4 py-3 border-b space-y-2">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, código ou marca..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9 h-9"
              />
            </div>
          </div>

          {/* Filtros de grupo em chips */}
          {grupos.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              <Badge
                variant={grupoFilter === 'all' ? 'default' : 'outline'}
                className="cursor-pointer text-xs px-2.5 py-1 hover:opacity-80 transition-opacity"
                onClick={() => setGrupoFilter('all')}
              >
                Todos
              </Badge>
              {grupos.map(g => (
                <Badge
                  key={g.id}
                  variant={grupoFilter === g.id ? 'default' : 'outline'}
                  className="cursor-pointer text-xs px-2.5 py-1 hover:opacity-80 transition-opacity"
                  onClick={() => setGrupoFilter(grupoFilter === g.id ? 'all' : g.id)}
                >
                  {g.nome}
                  {grupoFilter === g.id && (
                    <X className="h-3 w-3 ml-1" />
                  )}
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* Lista */}
        <ScrollArea className="flex-1 min-h-0" style={{ maxHeight: '50vh' }}>
          <div className="px-4 py-2">
            {/* Header */}
            <div className="flex items-center gap-3 py-2 px-2 text-xs font-semibold text-muted-foreground border-b">
              <Checkbox 
                checked={allSelected} 
                onCheckedChange={toggleAll}
                className="h-4 w-4"
              />
              <span className="flex-1">Produto</span>
              <span className="w-20 text-center">Código</span>
              <span className="w-24 text-center">Grupo</span>
              <span className="w-20 text-right">Estoque</span>
            </div>

            {loading ? (
              <div className="py-8 text-center text-sm text-muted-foreground">Carregando...</div>
            ) : filtered.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">Nenhum produto encontrado</div>
            ) : (
              filtered.map(p => {
                const isSelected = selectedIds.has(p.id);
                const estoque = p.estoque ?? 0;
                const estoqueColor = estoque <= 0 ? 'text-red-600 font-bold' : estoque < 10 ? 'text-amber-600 font-medium' : 'text-emerald-600 font-medium';
                return (
                  <div
                    key={p.id}
                    onClick={() => toggleItem(p.id)}
                    className={`flex items-center gap-3 py-2 px-2 rounded-md cursor-pointer transition-colors text-sm ${
                      isSelected ? 'bg-emerald-50 border border-emerald-200' : 'hover:bg-muted/50 border border-transparent'
                    }`}
                  >
                    <Checkbox checked={isSelected} className="h-4 w-4" />
                    <span className="flex-1 truncate font-medium">{p.nome}</span>
                    <span className="w-20 text-center text-xs text-muted-foreground truncate">{p.codigo || '—'}</span>
                    <span className="w-24 text-center text-xs text-muted-foreground truncate">{grupoName(p.grupo_id)}</span>
                    <span className={`w-20 text-right text-sm ${estoqueColor}`}>{estoque}</span>
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="px-4 py-3 border-t flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            {selectedIds.size} de {filtered.length} selecionado(s)
          </span>
          <Button
            onClick={handleEnviar}
            disabled={selectedIds.size === 0}
            size="sm"
            className="gap-2 bg-emerald-600 hover:bg-emerald-700"
          >
            <Send className="h-4 w-4" />
            Enviar para conversa
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
