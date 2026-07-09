import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Search, Send, Package, Filter, X, Check, Columns3, ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Produto {
  id: string;
  nome: string;
  codigo: string | null;
  estoque: number | null;
  grupo_id: string | null;
  categoria_id: string | null;
  marca: string | null;
  preco_tabela: number | null;
  campos_customizados: Record<string, any> | null;
}

interface Grupo { id: string; nome: string; }
interface Categoria { id: string; nome: string; grupo: string | null; }

interface CampoCustomizado {
  id: string; nome: string; campo_key: string; tipo: string;
  unidade: string | null; pesquisa_faixa: boolean | null;
  placeholder: string | null; opcoes: any; ordem: number | null;
}

interface CustomFieldFilters {
  range: Record<string, { min?: string; max?: string }>;
  text: Record<string, string>;
  select: Record<string, string>;
  checkbox: Record<string, boolean>;
  number: Record<string, string>;
}

const emptyFilters: CustomFieldFilters = { range: {}, text: {}, select: {}, checkbox: {}, number: {} };

type ColumnKey = 'nome' | 'codigo' | 'grupo' | 'estoque';
interface ColumnDef { key: ColumnKey; label: string; defaultWidth: number; minWidth: number; }

const ALL_COLUMNS: ColumnDef[] = [
  { key: 'nome', label: 'Produto', defaultWidth: 200, minWidth: 100 },
  { key: 'codigo', label: 'Código', defaultWidth: 90, minWidth: 60 },
  { key: 'grupo', label: 'Grupo', defaultWidth: 110, minWidth: 70 },
  { key: 'estoque', label: 'Estoque', defaultWidth: 80, minWidth: 50 },
];

type SortDir = 'asc' | 'desc' | null;

interface ConsultaEstoqueDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  estabelecimentoId: string;
  onEnviarParaConversa: (texto: string) => void;
  actionLabel?: string;
  actionLabelShort?: string;
}

export function ConsultaEstoqueDialog({ open, onOpenChange, estabelecimentoId, onEnviarParaConversa, actionLabel, actionLabelShort }: ConsultaEstoqueDialogProps) {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [camposCustomizados, setCamposCustomizados] = useState<CampoCustomizado[]>([]);
  const [search, setSearch] = useState('');
  const [grupoFilter, setGrupoFilter] = useState<string>('all');
  const [categoriaFilter, setCategoriaFilter] = useState<string>('all');
  const [customFieldFilters, setCustomFieldFilters] = useState<CustomFieldFilters>(emptyFilters);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  // Column visibility, sorting, widths
  const [visibleCols, setVisibleCols] = useState<Set<ColumnKey>>(new Set(ALL_COLUMNS.map(c => c.key)));
  const [sortCol, setSortCol] = useState<ColumnKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>(null);
  const [colWidths, setColWidths] = useState<Record<ColumnKey, number>>(
    Object.fromEntries(ALL_COLUMNS.map(c => [c.key, c.defaultWidth])) as Record<ColumnKey, number>
  );

  // Resize state
  const resizingRef = useRef<{ col: ColumnKey; startX: number; startW: number } | null>(null);

  useEffect(() => {
    if (open && estabelecimentoId) loadData();
  }, [open, estabelecimentoId]);

  useEffect(() => {
    if (!open) {
      setSelectedIds(new Set());
      setSearch('');
      setGrupoFilter('all');
      setCategoriaFilter('all');
      setCustomFieldFilters(emptyFilters);
      setCamposCustomizados([]);
      setShowFilters(false);
    }
  }, [open]);

  useEffect(() => {
    setCategoriaFilter('all');
    setCustomFieldFilters(emptyFilters);
    if (grupoFilter !== 'all') {
      loadCamposCustomizados(grupoFilter);
      setShowFilters(true);
    } else {
      setCamposCustomizados([]);
      setShowFilters(false);
    }
  }, [grupoFilter]);

  // Global mouse handlers for column resize
  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!resizingRef.current) return;
      const { col, startX, startW } = resizingRef.current;
      const def = ALL_COLUMNS.find(c => c.key === col)!;
      const newW = Math.max(def.minWidth, startW + (e.clientX - startX));
      setColWidths(prev => ({ ...prev, [col]: newW }));
    };
    const onMouseUp = () => { resizingRef.current = null; };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => { window.removeEventListener('mousemove', onMouseMove); window.removeEventListener('mouseup', onMouseUp); };
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [prodRes, grupoRes, catRes] = await Promise.all([
        supabase.from('produtos')
          .select('id, nome, codigo, estoque, grupo_id, categoria_id, marca, preco_tabela, campos_customizados')
          .eq('estabelecimento_id', estabelecimentoId).eq('ativo', true).order('nome'),
        supabase.from('produto_grupos').select('id, nome')
          .eq('estabelecimento_id', estabelecimentoId).order('nome'),
        supabase.from('produto_categorias').select('id, nome, grupo')
          .eq('estabelecimento_id', estabelecimentoId).order('nome')
      ]);
      if (prodRes.data) setProdutos(prodRes.data as Produto[]);
      if (grupoRes.data) setGrupos(grupoRes.data);
      if (catRes.data) setCategorias(catRes.data);
    } catch (err) {
      console.error('Erro ao carregar produtos:', err);
    } finally { setLoading(false); }
  };

  const loadCamposCustomizados = async (grupoId: string) => {
    const { data } = await supabase.from('produto_campos_customizados')
      .select('id, nome, campo_key, tipo, unidade, pesquisa_faixa, placeholder, opcoes, ordem')
      .eq('estabelecimento_id', estabelecimentoId).eq('grupo_id', grupoId).eq('ativo', true).order('ordem');
    if (data) setCamposCustomizados(data);
  };

  const categoriasDoGrupo = useMemo(() => {
    if (grupoFilter === 'all') return [];
    const g = grupos.find(g => g.id === grupoFilter);
    if (!g) return [];
    return categorias.filter(c => c.grupo === g.id || c.grupo === g.nome);
  }, [categorias, grupoFilter, grupos]);

  const hasCustomFilters = useMemo(() => {
    const { range, text, select, number } = customFieldFilters;
    return Object.values(range).some(v => v.min || v.max)
      || Object.values(text).some(v => v)
      || Object.values(select).some(v => v)
      || Object.values(number).some(v => v);
  }, [customFieldFilters]);

  const grupoName = (id: string | null) => {
    if (!id) return '—';
    return grupos.find(g => g.id === id)?.nome || '—';
  };

  const getColValue = (p: Produto, col: ColumnKey): string | number => {
    switch (col) {
      case 'nome': return p.nome;
      case 'codigo': return p.codigo || '';
      case 'grupo': return grupoName(p.grupo_id);
      case 'estoque': return p.estoque ?? 0;
    }
  };

  const filtered = useMemo(() => {
    let result = produtos.filter(p => {
      const matchSearch = !search ||
        p.nome.toLowerCase().includes(search.toLowerCase()) ||
        (p.codigo && p.codigo.toLowerCase().includes(search.toLowerCase())) ||
        (p.marca && p.marca.toLowerCase().includes(search.toLowerCase()));
      const matchGrupo = grupoFilter === 'all' || p.grupo_id === grupoFilter;
      const matchCategoria = categoriaFilter === 'all' || p.categoria_id === categoriaFilter;
      if (!matchSearch || !matchGrupo || !matchCategoria) return false;

      if (hasCustomFilters && p.campos_customizados) {
        const cc = p.campos_customizados as Record<string, any>;
        for (const campo of camposCustomizados) {
          const key = campo.campo_key;
          const val = cc[key];
          if (campo.pesquisa_faixa || campo.tipo === 'numero') {
            const rangeF = customFieldFilters.range[key];
            if (rangeF) {
              const numVal = parseFloat(val);
              if (!isNaN(numVal)) {
                if (rangeF.min && numVal < parseFloat(rangeF.min)) return false;
                if (rangeF.max && numVal > parseFloat(rangeF.max)) return false;
              } else if (rangeF.min || rangeF.max) return false;
            }
          }
          const textF = customFieldFilters.text[key];
          if (textF && typeof val === 'string' && !val.toLowerCase().includes(textF.toLowerCase())) return false;
          if (textF && !val) return false;
          const numF = customFieldFilters.number[key];
          if (numF) {
            const numVal = parseFloat(val);
            if (isNaN(numVal) || numVal !== parseFloat(numF)) return false;
          }
          const selF = customFieldFilters.select[key];
          if (selF && val !== selF) return false;
        }
      }
      return true;
    });

    // Sort
    if (sortCol && sortDir) {
      result = [...result].sort((a, b) => {
        const va = getColValue(a, sortCol);
        const vb = getColValue(b, sortCol);
        const mult = sortDir === 'asc' ? 1 : -1;
        if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * mult;
        return String(va).localeCompare(String(vb), 'pt-BR', { sensitivity: 'base' }) * mult;
      });
    }
    return result;
  }, [produtos, search, grupoFilter, categoriaFilter, hasCustomFilters, customFieldFilters, camposCustomizados, sortCol, sortDir]);

  const toggleItem = useCallback((id: string) => {
    setSelectedIds(prev => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  }, []);

  const toggleAll = () => {
    if (selectedIds.size === filtered.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(filtered.map(p => p.id)));
  };

  const toggleCol = (col: ColumnKey) => {
    setVisibleCols(prev => {
      const next = new Set(prev);
      if (next.has(col) && next.size > 1) next.delete(col);
      else next.add(col);
      return next;
    });
  };

  const handleSort = (col: ColumnKey) => {
    if (sortCol === col) {
      if (sortDir === 'asc') setSortDir('desc');
      else if (sortDir === 'desc') { setSortCol(null); setSortDir(null); }
    } else {
      setSortCol(col);
      setSortDir('asc');
    }
  };

  const startResize = (e: React.MouseEvent, col: ColumnKey) => {
    e.preventDefault();
    e.stopPropagation();
    resizingRef.current = { col, startX: e.clientX, startW: colWidths[col] };
  };

  const handleEnviar = () => {
    const selected = produtos.filter(p => selectedIds.has(p.id));
    if (selected.length === 0) { toast.warning('Selecione ao menos um produto'); return; }

    const visCols = ALL_COLUMNS.filter(c => visibleCols.has(c.key));
    const lines = selected.map(p => {
      const parts: string[] = [];
      for (const col of visCols) {
        switch (col.key) {
          case 'nome': parts.push(`*${p.nome}*`); break;
          case 'codigo': if (p.codigo) parts.push(`(${p.codigo})`); break;
          case 'grupo': parts.push(grupoName(p.grupo_id)); break;
          case 'estoque': parts.push(`Estoque: *${p.estoque ?? 0}*`); break;
        }
      }
      return `📦 ${parts.join(' — ')}`;
    });
    onEnviarParaConversa(`*Consulta de Estoque*\n${lines.join('\n')}`);
    onOpenChange(false);
    toast.success(`${selected.length} produto(s) enviado(s)`);
  };

  const clearFilters = () => {
    setGrupoFilter('all');
    setCategoriaFilter('all');
    setCustomFieldFilters(emptyFilters);
    setSearch('');
  };

  const updateRange = (key: string, field: 'min' | 'max', value: string) => {
    setCustomFieldFilters(prev => ({ ...prev, range: { ...prev.range, [key]: { ...prev.range[key], [field]: value } } }));
  };
  const updateText = (key: string, value: string) => {
    setCustomFieldFilters(prev => ({ ...prev, text: { ...prev.text, [key]: value } }));
  };
  const updateSelect = (key: string, value: string) => {
    setCustomFieldFilters(prev => ({ ...prev, select: { ...prev.select, [key]: value } }));
  };

  const allSelected = filtered.length > 0 && selectedIds.size === filtered.length;
  const activeFilterCount = (grupoFilter !== 'all' ? 1 : 0) + (categoriaFilter !== 'all' ? 1 : 0) + (hasCustomFilters ? 1 : 0);

  const visibleColumns = ALL_COLUMNS.filter(c => visibleCols.has(c.key));

  const renderSortIcon = (col: ColumnKey) => {
    if (sortCol !== col) return <ArrowUpDown className="h-3 w-3 opacity-40" />;
    if (sortDir === 'asc') return <ArrowUp className="h-3 w-3 text-primary" />;
    return <ArrowDown className="h-3 w-3 text-primary" />;
  };

  const renderCampoFilter = (campo: CampoCustomizado) => {
    const label = campo.nome + (campo.unidade ? ` (${campo.unidade})` : '');
    if (campo.pesquisa_faixa || campo.tipo === 'numero') {
      const range = customFieldFilters.range[campo.campo_key] || {};
      return (
        <div key={campo.id} className="border border-border/50 rounded-lg p-3">
          <label className="text-xs font-medium text-muted-foreground mb-2 block">{label}</label>
          <div className="flex items-center gap-2">
            <Input placeholder="De" type="number" value={range.min || ''} onChange={e => updateRange(campo.campo_key, 'min', e.target.value)} className="h-8 text-xs flex-1" />
            <span className="text-xs text-muted-foreground">até</span>
            <Input placeholder="Até" type="number" value={range.max || ''} onChange={e => updateRange(campo.campo_key, 'max', e.target.value)} className="h-8 text-xs flex-1" />
          </div>
        </div>
      );
    }
    if (campo.tipo === 'select' && campo.opcoes) {
      const opcoes = Array.isArray(campo.opcoes) ? campo.opcoes : [];
      return (
        <div key={campo.id} className="border border-border/50 rounded-lg p-3">
          <label className="text-xs font-medium text-muted-foreground mb-2 block">{label}</label>
          <Select value={customFieldFilters.select[campo.campo_key] || ''} onValueChange={v => updateSelect(campo.campo_key, v === '_all_' ? '' : v)}>
            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Todos" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="_all_">Todos</SelectItem>
              {opcoes.map((op: string) => <SelectItem key={op} value={op}>{op}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      );
    }
    return (
      <div key={campo.id} className="border border-border/50 rounded-lg p-3">
        <label className="text-xs font-medium text-muted-foreground mb-2 block">{label}</label>
        <Input placeholder={campo.placeholder || `Filtrar ${campo.nome.toLowerCase()}...`} value={customFieldFilters.text[campo.campo_key] || ''} onChange={e => updateText(campo.campo_key, e.target.value)} className="h-8 text-xs" />
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange} modal={false}>
      <DialogContent className="w-[95vw] max-w-4xl max-h-[90vh] sm:max-h-[85vh] flex flex-col p-0 gap-0">
        {/* Header */}
        <DialogHeader className="px-3 sm:px-4 pt-3 sm:pt-4 pb-2 sm:pb-3 border-b">
          <DialogTitle className="flex items-center gap-2 text-sm sm:text-base pr-8">
            <Package className="h-4 w-4 sm:h-5 sm:w-5 text-primary shrink-0" />
            Consulta de Estoque
          </DialogTitle>
        </DialogHeader>

        {/* Filters */}
        <div className="px-3 sm:px-4 py-2 sm:py-3 border-b space-y-2">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar nome, código ou marca..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-8 text-sm" />
            </div>
            {grupoFilter !== 'all' && camposCustomizados.length > 0 && (
              <Button variant={showFilters ? 'default' : 'outline'} size="sm" className="h-8 gap-1 text-xs shrink-0" onClick={() => setShowFilters(!showFilters)}>
                <Filter className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Filtros</span>
                {hasCustomFilters && <span className="bg-primary-foreground text-primary rounded-full h-4 w-4 flex items-center justify-center text-[10px]">!</span>}
              </Button>
            )}
            {activeFilterCount > 0 && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8 gap-1 text-xs text-muted-foreground shrink-0">
                <X className="h-3 w-3" /> Limpar
              </Button>
            )}
            {/* Column visibility */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 gap-1 text-xs shrink-0">
                  <Columns3 className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Colunas</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-48 p-2" align="end">
                <p className="text-xs font-semibold text-muted-foreground mb-2">Colunas visíveis</p>
                {ALL_COLUMNS.map(col => (
                  <label key={col.key} className="flex items-center gap-2 py-1.5 px-1 rounded hover:bg-muted/50 cursor-pointer text-sm">
                    <Checkbox checked={visibleCols.has(col.key)} onCheckedChange={() => toggleCol(col.key)} className="h-4 w-4" />
                    {col.label}
                  </label>
                ))}
              </PopoverContent>
            </Popover>
          </div>

          {/* Group + Category */}
          <div className="flex flex-col sm:flex-row gap-2">
            {grupos.length > 0 && (
              <div className="flex-1">
                <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1 block">Grupo</label>
                <Select value={grupoFilter} onValueChange={setGrupoFilter}>
                  <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Todos os grupos" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os grupos</SelectItem>
                    {grupos.map(g => <SelectItem key={g.id} value={g.id}>{g.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            {grupoFilter !== 'all' && categoriasDoGrupo.length > 0 && (
              <div className="flex-1">
                <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1 block">Categoria</label>
                <Select value={categoriaFilter} onValueChange={setCategoriaFilter}>
                  <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Todas as categorias" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as categorias</SelectItem>
                    {categoriasDoGrupo.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </div>

        {/* Product list */}
        <ScrollArea className="flex-1 min-h-0" style={{ maxHeight: '50vh' }}>
          <div className="px-3 sm:px-4 py-1">
            {/* Custom field filters inline */}
            {showFilters && camposCustomizados.length > 0 && (
              <div className="py-2 mb-2 border-b">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {camposCustomizados.map(renderCampoFilter)}
                </div>
                <div className="flex justify-end mt-2">
                  <Button size="sm" className="h-7 gap-1 text-xs" onClick={() => setShowFilters(false)}>
                    <Check className="h-3.5 w-3.5" /> OK
                  </Button>
                </div>
              </div>
            )}

            {/* Desktop table header */}
            <div className="hidden sm:flex items-center py-2 px-1 text-xs font-semibold text-muted-foreground border-b select-none">
              <div className="w-8 shrink-0 flex items-center">
                <Checkbox checked={allSelected} onCheckedChange={toggleAll} className="h-4 w-4" />
              </div>
              {visibleColumns.map((col, i) => (
                <div
                  key={col.key}
                  className="relative flex items-center gap-1 px-1"
                  style={{
                    width: col.key === 'nome' ? undefined : colWidths[col.key],
                    flex: col.key === 'nome' ? '1 1 0%' : '0 0 auto',
                    minWidth: col.minWidth,
                  }}
                >
                  <button
                    className="flex items-center gap-1 hover:text-foreground transition-colors"
                    onClick={() => handleSort(col.key)}
                  >
                    {col.label}
                    {renderSortIcon(col.key)}
                  </button>
                  {/* Resize handle */}
                  <div
                    className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-primary/30 rounded"
                    onMouseDown={e => startResize(e, col.key)}
                  />
                </div>
              ))}
            </div>

            {/* Mobile select all */}
            <div className="flex sm:hidden items-center gap-2 py-2 px-1 border-b">
              <Checkbox checked={allSelected} onCheckedChange={toggleAll} className="h-4 w-4" />
              <span className="text-xs text-muted-foreground">Selecionar todos ({filtered.length})</span>
            </div>

            {loading ? (
              <div className="py-8 text-center text-sm text-muted-foreground">Carregando...</div>
            ) : filtered.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">Nenhum produto encontrado</div>
            ) : (
              filtered.map(p => {
                const isSelected = selectedIds.has(p.id);
                const estoque = p.estoque ?? 0;
                const estoqueColor = estoque <= 0 ? 'text-destructive font-bold' : estoque < 10 ? 'text-amber-600 font-medium' : 'text-primary font-medium';

                return (
                  <div
                    key={p.id}
                    onClick={() => toggleItem(p.id)}
                    className={`cursor-pointer transition-colors rounded-md ${
                      isSelected ? 'bg-primary/10 border border-primary/30' : 'hover:bg-muted/50 border border-transparent'
                    }`}
                  >
                    {/* Desktop row */}
                    <div className="hidden sm:flex items-center py-2 px-1 text-sm">
                      <div className="w-8 shrink-0 flex items-center">
                        <Checkbox checked={isSelected} className="h-4 w-4" />
                      </div>
                      {visibleColumns.map(col => {
                        const cellStyle: React.CSSProperties = {
                          width: col.key === 'nome' ? undefined : colWidths[col.key],
                          flex: col.key === 'nome' ? '1 1 0%' : '0 0 auto',
                          minWidth: col.minWidth,
                        };
                        switch (col.key) {
                          case 'nome':
                            return <span key={col.key} className="truncate font-medium px-1" style={cellStyle}>{p.nome}</span>;
                          case 'codigo':
                            return <span key={col.key} className="text-xs text-muted-foreground truncate px-1 text-center" style={cellStyle}>{p.codigo || '—'}</span>;
                          case 'grupo':
                            return <span key={col.key} className="text-xs text-muted-foreground truncate px-1 text-center" style={cellStyle}>{grupoName(p.grupo_id)}</span>;
                          case 'estoque':
                            return <span key={col.key} className={`text-sm px-1 text-right ${estoqueColor}`} style={cellStyle}>{estoque}</span>;
                          default:
                            return null;
                        }
                      })}
                    </div>
                    {/* Mobile card */}
                    <div className="flex sm:hidden items-start gap-2 py-2.5 px-2">
                      <Checkbox checked={isSelected} className="h-4 w-4 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        {visibleCols.has('nome') && <p className="text-sm font-medium truncate">{p.nome}</p>}
                        <div className="flex items-center gap-3 mt-0.5">
                          {visibleCols.has('codigo') && p.codigo && <span className="text-[11px] text-muted-foreground">{p.codigo}</span>}
                          {visibleCols.has('grupo') && <span className="text-[11px] text-muted-foreground">{grupoName(p.grupo_id)}</span>}
                        </div>
                      </div>
                      {visibleCols.has('estoque') && (
                        <div className="text-right shrink-0">
                          <span className={`text-sm ${estoqueColor}`}>{estoque}</span>
                          <p className="text-[10px] text-muted-foreground">estoque</p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="px-3 sm:px-4 py-2 sm:py-3 border-t flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            {selectedIds.size} de {filtered.length} selecionado(s)
          </span>
          <Button onClick={handleEnviar} disabled={selectedIds.size === 0} size="sm" className="gap-1.5 h-8">
            <Send className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{actionLabel ?? "Enviar para conversa"}</span>
            <span className="sm:hidden">{actionLabelShort ?? actionLabel ?? "Enviar"}</span>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
