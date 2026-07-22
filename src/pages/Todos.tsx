import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Checkbox } from "@/components/ui/checkbox";
import { Search, Filter, Building2, User, Settings2, ChevronDown, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown, Edit, GripVertical, UserCog, Truck, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getEstabelecimentoId } from "@/lib/estabelecimentoUtils";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  useSortable,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

export interface TableColumn {
  id: string;
  label: string;
  visible: boolean;
  width: number;
  locked?: boolean;
}

interface Contato {
  id: string;
  nome: string;
  telefone: string;
  email: string;
  tipo_operador: boolean;
  custom_fields: any;
}

interface Empresa {
  id: string;
  nome_fantasia: string;
  nome: string | null;
  cnpj: string | null;
  telefone: string | null;
  email: string | null;
  endereco: string | null;
  cidade: string | null;
  estado: string | null;
  cep: string | null;
  bairro: string | null;
  custom_fields?: any;
}

// Componente interno para item ordenável
interface SortableColumnItemProps {
  column: TableColumn;
  onToggle: (id: string) => void;
}

function SortableColumnItem({ column, onToggle }: SortableColumnItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: column.id, disabled: column.locked });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 p-3 border border-border rounded-lg bg-card hover:bg-accent/50 transition-colors"
    >
      {!column.locked && (
        <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
          <GripVertical className="w-4 h-4 text-muted-foreground" />
        </div>
      )}
      
      <Checkbox
        id={column.id}
        checked={column.visible}
        onCheckedChange={() => onToggle(column.id)}
        disabled={column.locked}
      />
      
      <label
        htmlFor={column.id}
        className="flex-1 text-sm font-medium cursor-pointer"
      >
        {column.label}
      </label>
      
      {column.locked && (
        <span className="text-xs text-muted-foreground">(fixo)</span>
      )}
    </div>
  );
}

// Componente para o painel de configuração de colunas
interface ColumnConfigPanelProps {
  columns: TableColumn[];
  onColumnsChange: (columns: TableColumn[]) => void;
}

function ColumnConfigPanel({ columns, onColumnsChange }: ColumnConfigPanelProps) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = columns.findIndex((col) => col.id === active.id);
      const newIndex = columns.findIndex((col) => col.id === over.id);
      onColumnsChange(arrayMove(columns, oldIndex, newIndex));
    }
  };

  const handleToggleColumn = (id: string) => {
    const updatedColumns = columns.map(col =>
      col.id === id ? { ...col, visible: !col.visible } : col
    );
    onColumnsChange(updatedColumns);
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Selecione quais colunas exibir e arraste para reordenar
      </p>
      
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={columns.map(c => c.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-2">
            {columns.map((column) => (
              <SortableColumnItem
                key={column.id}
                column={column}
                onToggle={handleToggleColumn}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}

function SimpleListaComVinculos({
  titulo, icone, itens, getNome, getSub, vinculos, vinculoLabel, expandedRows, toggleRow, renderVinculo,
}: {
  titulo: string;
  icone: React.ReactNode;
  itens: any[];
  getNome: (item: any) => string;
  getSub: (item: any) => string | null | undefined;
  vinculos: Record<string, any[]>;
  vinculoLabel: string;
  expandedRows: Set<string>;
  toggleRow: (id: string) => void;
  renderVinculo: (v: any) => React.ReactNode;
}) {
  if (itens.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
          {icone}
        </div>
        <p className="text-lg font-medium text-muted-foreground mb-1">
          Nenhum(a) {titulo} encontrado(a)
        </p>
      </div>
    );
  }
  return (
    <div className="bg-card rounded-2xl border border-border/40 shadow-lg overflow-auto">
      <table className="w-full">
        <thead className="border-b border-border/40 bg-gradient-to-r from-muted/40 to-muted/20">
          <tr>
            <th className="px-4 py-3.5 w-[30px]"></th>
            <th className="px-4 py-3.5 w-[40px]"></th>
            <th className="text-left px-4 py-3.5 font-semibold text-xs uppercase tracking-wider text-muted-foreground/80">Nome</th>
            <th className="text-left px-4 py-3.5 font-semibold text-xs uppercase tracking-wider text-muted-foreground/80">Detalhe</th>
            <th className="text-left px-4 py-3.5 font-semibold text-xs uppercase tracking-wider text-muted-foreground/80">Vínculos</th>
          </tr>
        </thead>
        <tbody>
          {itens.map((item: any) => {
            const links = vinculos[item.id] || [];
            const hasLinks = links.length > 0;
            const isExpanded = expandedRows.has(item.id);
            return (
              <React.Fragment key={item.id}>
                <tr className="border-b border-border/30 hover:bg-muted/40 transition-colors">
                  <td className="p-3">
                    {hasLinks && (
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0 rounded-full" onClick={() => toggleRow(item.id)}>
                        {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      </Button>
                    )}
                  </td>
                  <td className="p-3">{icone}</td>
                  <td className="p-3 font-medium">{getNome(item)}</td>
                  <td className="p-3 text-sm text-muted-foreground">{getSub(item) || "-"}</td>
                  <td className="p-3 text-sm text-muted-foreground">{links.length}</td>
                </tr>
                {isExpanded && hasLinks && (
                  <tr>
                    <td colSpan={5} className="bg-muted/20 p-4 border-l-4 border-l-primary/40">
                      <div className="ml-8">
                        <p className="text-sm font-semibold mb-3">{vinculoLabel}:</p>
                        <div className="space-y-2">
                          {links.map((v: any) => (
                            <React.Fragment key={v.id}>{renderVinculo(v)}</React.Fragment>
                          ))}
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}


export default function Todos() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [contatos, setContatos] = useState<Contato[]>([]);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [vendedores, setVendedores] = useState<Empresa[]>([]);
  const [transportadoras, setTransportadoras] = useState<Empresa[]>([]);
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [vendedorEmpresas, setVendedorEmpresas] = useState<Record<string, any[]>>({});
  const [usuarioEmpresas, setUsuarioEmpresas] = useState<Record<string, any[]>>({});
  const [estabelecimentoId, setEstabelecimentoId] = useState<string | null>(null);
  const [showConfigSheet, setShowConfigSheet] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [contatoEmpresas, setContatoEmpresas] = useState<Record<string, any[]>>({});
  const [empresaContatos, setEmpresaContatos] = useState<Record<string, any[]>>({});

  // Estados de ordenação
  const [todosSortConfig, setTodosSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
  const [contatosSortConfig, setContatosSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
  const [empresasSortConfig, setEmpresasSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);

  // Campos dinâmicos carregados do banco
  const [contatoFieldsFromDB, setContatoFieldsFromDB] = useState<any[]>([]);
  const [empresaFieldsFromDB, setEmpresaFieldsFromDB] = useState<any[]>([]);

  // Gerenciamento de colunas da tabela - Todos (aba combinada)
  const [todosTableColumns, setTodosTableColumns] = useState<TableColumn[]>(() => {
    const saved = localStorage.getItem("todosAllTableColumns");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {}
    }
    return [
      { id: "tipo", label: "Tipo", visible: true, width: 80, locked: true },
      { id: "nome", label: "Nome", visible: true, width: 250, locked: true },
      { id: "email", label: "E-mail", visible: true, width: 250 },
      { id: "telefone", label: "Telefone", visible: true, width: 150 },
      { id: "status", label: "Status", visible: true, width: 120 },
    ];
  });

  // Gerenciamento de colunas - gerar dinamicamente baseado nos campos do banco
  const [contatosTableColumns, setContatosTableColumns] = useState<TableColumn[]>(() => {
    const saved = localStorage.getItem("todosContatosTableColumns");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {}
    }
    return [
      { id: "actions", label: "Ações", visible: true, width: 100, locked: true },
      { id: "nome", label: "Nome", visible: true, width: 250, locked: true },
    ];
  });

  const [empresasTableColumns, setEmpresasTableColumns] = useState<TableColumn[]>(() => {
    const saved = localStorage.getItem("todosEmpresasTableColumns");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {}
    }
    return [
      { id: "actions", label: "Ações", visible: true, width: 100, locked: true },
      { id: "nome_fantasia", label: "Nome Fantasia", visible: true, width: 250, locked: true },
    ];
  });

  useEffect(() => {
    localStorage.setItem("todosAllTableColumns", JSON.stringify(todosTableColumns));
  }, [todosTableColumns]);

  useEffect(() => {
    localStorage.setItem("todosContatosTableColumns", JSON.stringify(contatosTableColumns));
  }, [contatosTableColumns]);

  useEffect(() => {
    localStorage.setItem("todosEmpresasTableColumns", JSON.stringify(empresasTableColumns));
  }, [empresasTableColumns]);

  useEffect(() => {
    const fetchData = async () => {
      const estabId = await getEstabelecimentoId();
      setEstabelecimentoId(estabId);
      
      if (estabId) {
        // Carregar campos configurados
        const { data: contatoConfigs } = await supabase
          .from('form_field_configs')
          .select('*')
          .eq('estabelecimento_id', estabId)
          .eq('form_type', 'contato')
          .order('field_order');

        if (contatoConfigs) {
          setContatoFieldsFromDB(contatoConfigs);
          // Atualizar colunas baseado nos campos
          const newCols: TableColumn[] = [
            { id: "actions", label: "Ações", visible: true, width: 100, locked: true },
          ];
          contatoConfigs.forEach(cfg => {
            newCols.push({
              id: cfg.field_id,
              label: cfg.field_label,
              visible: true,
              width: 180,
            });
          });
          setContatosTableColumns(newCols);
        }

        const { data: empresaConfigs } = await supabase
          .from('form_field_configs')
          .select('*')
          .eq('estabelecimento_id', estabId)
          .eq('form_type', 'empresa')
          .order('field_order');

        if (empresaConfigs) {
          setEmpresaFieldsFromDB(empresaConfigs);
          const newCols: TableColumn[] = [
            { id: "actions", label: "Ações", visible: true, width: 100, locked: true },
          ];
          empresaConfigs.forEach(cfg => {
            newCols.push({
              id: cfg.field_id,
              label: cfg.field_label,
              visible: true,
              width: 180,
            });
          });
          setEmpresasTableColumns(newCols);
        }

        // Buscar contatos
        const { data: contatosData } = await supabase
          .from('customers')
          .select('*')
          .eq('estabelecimento_id', estabId)
          .order('nome');

        if (contatosData) setContatos(contatosData);

        // Buscar empresas (todos os tipos)
        const { data: empresasData } = await supabase
          .from('empresas')
          .select('*')
          .eq('estabelecimento_id', estabId)
          .order('nome_fantasia');

        if (empresasData) {
          const clientes = empresasData.filter((e: any) => !['vendedor', 'transportadora'].includes(e.tipo_cliente));
          const vends = empresasData.filter((e: any) => e.tipo_cliente === 'vendedor');
          const transps = empresasData.filter((e: any) => e.tipo_cliente === 'transportadora');
          setEmpresas(clientes);
          setVendedores(vends);
          setTransportadoras(transps);
        }

        // Buscar usuários do sistema
        const { data: usuariosData } = await supabase
          .from('usuarios')
          .select('id, nome, email, telefone')
          .eq('estabelecimento_id', estabId)
          .eq('tipo', 'gerente')
          .order('nome');
        if (usuariosData) setUsuarios(usuariosData);

        // Vínculos vendedor/usuário -> empresas
        const { data: vinculosEmp } = await supabase
          .from('empresa_vinculos')
          .select('empresa_id, usuario_id, vendedor_id, empresas:empresa_id (id, nome_fantasia, cnpj)');

        if (vinculosEmp) {
          const vendMap: Record<string, any[]> = {};
          const userMap: Record<string, any[]> = {};
          vinculosEmp.forEach((v: any) => {
            if (v.vendedor_id && v.empresas) {
              (vendMap[v.vendedor_id] ||= []).push(v.empresas);
            }
            if (v.usuario_id && v.empresas) {
              (userMap[v.usuario_id] ||= []).push(v.empresas);
            }
          });
          setVendedorEmpresas(vendMap);
          setUsuarioEmpresas(userMap);
        }

        // Buscar vínculos
        const { data: vinculos } = await supabase
          .from('customer_empresas')
          .select(`
            customer_id,
            empresa_id,
            empresas (
              id,
              nome_fantasia,
              cnpj,
              custom_fields
            )
          `);

        if (vinculos) {
          const contatoEmpresasMap: Record<string, any[]> = {};
          vinculos.forEach((v: any) => {
            if (!contatoEmpresasMap[v.customer_id]) {
              contatoEmpresasMap[v.customer_id] = [];
            }
            if (v.empresas) {
              contatoEmpresasMap[v.customer_id].push(v.empresas);
            }
          });
          setContatoEmpresas(contatoEmpresasMap);

          const empresaContatosMap: Record<string, any[]> = {};
          vinculos.forEach((v: any) => {
            if (!empresaContatosMap[v.empresa_id]) {
              empresaContatosMap[v.empresa_id] = [];
            }
            const contato = contatosData?.find(c => c.id === v.customer_id);
            if (contato) {
              empresaContatosMap[v.empresa_id].push(contato);
            }
          });
          setEmpresaContatos(empresaContatosMap);
        }
      }
    };

    fetchData();
  }, []);

  const filteredContatos = contatos.filter(c =>
    c.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.telefone?.includes(searchTerm)
  );

  const filteredEmpresas = empresas.filter(e =>
    e.nome_fantasia?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.cnpj?.includes(searchTerm) ||
    e.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const matchTexto = (e: Empresa) =>
    e.nome_fantasia?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.cnpj?.includes(searchTerm) ||
    e.email?.toLowerCase().includes(searchTerm.toLowerCase());

  const filteredVendedores = vendedores.filter(matchTexto);
  const filteredTransportadoras = transportadoras.filter(matchTexto);
  const filteredUsuarios = usuarios.filter((u: any) =>
    u.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.telefone?.includes(searchTerm)
  );

  // Aplicar ordenação para Todos
  let todosItens: any[] = [
    ...filteredContatos.map(c => ({ ...c, type: 'contato' as const })),
    ...filteredEmpresas.map(e => ({ ...e, type: 'empresa' as const })),
    ...filteredVendedores.map(e => ({ ...e, type: 'vendedor' as const })),
    ...filteredTransportadoras.map(e => ({ ...e, type: 'transportadora' as const })),
    ...filteredUsuarios.map(u => ({ ...u, type: 'usuario' as const })),
  ];

  const getNome = (a: any) => (a.type === 'contato' || a.type === 'usuario') ? (a.nome || '') : (a.nome_fantasia || a.nome || '');

  if (todosSortConfig) {
    todosItens = [...todosItens].sort((a, b) => {
      let aValue = '', bValue = '';
      if (todosSortConfig.key === 'nome') {
        aValue = getNome(a); bValue = getNome(b);
      } else if (todosSortConfig.key === 'email') {
        aValue = a.email || ''; bValue = b.email || '';
      } else if (todosSortConfig.key === 'telefone') {
        aValue = a.telefone || ''; bValue = b.telefone || '';
      }
      return todosSortConfig.direction === 'asc'
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue);
    });
  } else {
    todosItens = todosItens.sort((a, b) => getNome(a).localeCompare(getNome(b)));
  }

  // Aplicar ordenação para Contatos
  let sortedContatos = [...filteredContatos];
  if (contatosSortConfig) {
    sortedContatos = sortedContatos.sort((a, b) => {
      let aValue, bValue;
      if (contatosSortConfig.key === 'nome') {
        aValue = a.nome || '';
        bValue = b.nome || '';
      } else if (contatosSortConfig.key === 'email') {
        aValue = a.email || '';
        bValue = b.email || '';
      } else if (contatosSortConfig.key === 'telefone') {
        aValue = a.telefone || '';
        bValue = b.telefone || '';
      } else if (contatosSortConfig.key === 'position') {
        aValue = a.custom_fields?.position || '';
        bValue = b.custom_fields?.position || '';
      } else {
        aValue = '';
        bValue = '';
      }
      
      if (contatosSortConfig.direction === 'asc') {
        return aValue.localeCompare(bValue);
      } else {
        return bValue.localeCompare(aValue);
      }
    });
  }

  // Aplicar ordenação para Empresas
  let sortedEmpresas = [...filteredEmpresas];
  if (empresasSortConfig) {
    sortedEmpresas = sortedEmpresas.sort((a, b) => {
      let aValue, bValue;
      if (empresasSortConfig.key === 'nome_fantasia') {
        aValue = a.nome_fantasia || '';
        bValue = b.nome_fantasia || '';
      } else if (empresasSortConfig.key === 'nome') {
        aValue = a.nome || '';
        bValue = b.nome || '';
      } else if (empresasSortConfig.key === 'cnpj') {
        aValue = a.cnpj || '';
        bValue = b.cnpj || '';
      } else if (empresasSortConfig.key === 'email') {
        aValue = a.email || '';
        bValue = b.email || '';
      } else if (empresasSortConfig.key === 'telefone') {
        aValue = a.telefone || '';
        bValue = b.telefone || '';
      } else if (empresasSortConfig.key === 'cidade') {
        aValue = a.cidade || '';
        bValue = b.cidade || '';
      } else {
        aValue = '';
        bValue = '';
      }
      
      if (empresasSortConfig.direction === 'asc') {
        return aValue.localeCompare(bValue);
      } else {
        return bValue.localeCompare(aValue);
      }
    });
  }

  const toggleRow = (itemId: string) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };

  const visibleTodosColumns = todosTableColumns.filter(col => col.visible);
  const visibleContatosColumns = contatosTableColumns.filter(col => col.visible);
  const visibleEmpresasColumns = empresasTableColumns.filter(col => col.visible);

  // Funções de ordenação
  const handleTodosSort = (columnId: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (todosSortConfig && todosSortConfig.key === columnId) {
      if (todosSortConfig.direction === 'asc') {
        direction = 'desc';
      } else {
        setTodosSortConfig(null);
        return;
      }
    }
    setTodosSortConfig({ key: columnId, direction });
  };

  const handleContatosSort = (columnId: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (contatosSortConfig && contatosSortConfig.key === columnId) {
      if (contatosSortConfig.direction === 'asc') {
        direction = 'desc';
      } else {
        setContatosSortConfig(null);
        return;
      }
    }
    setContatosSortConfig({ key: columnId, direction });
  };

  const handleEmpresasSort = (columnId: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (empresasSortConfig && empresasSortConfig.key === columnId) {
      if (empresasSortConfig.direction === 'asc') {
        direction = 'desc';
      } else {
        setEmpresasSortConfig(null);
        return;
      }
    }
    setEmpresasSortConfig({ key: columnId, direction });
  };

  const getSortIcon = (columnId: string, sortConfig: any) => {
    if (!sortConfig || sortConfig.key !== columnId) {
      return <ArrowUpDown className="w-3 h-3 text-muted-foreground" />;
    }
    return sortConfig.direction === 'asc' 
      ? <ArrowUp className="w-3 h-3 text-primary" />
      : <ArrowDown className="w-3 h-3 text-primary" />;
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-gradient-to-br from-background to-muted/20">
      <div className="border-b border-border/40 bg-card/80 backdrop-blur-sm px-8 py-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-light tracking-tight text-foreground">
              Todos os Contatos e Empresas
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Visualize e gerencie todos os registros do sistema
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowConfigSheet(true)}
              className="gap-2 border-border/40"
            >
              <Settings2 className="w-4 h-4" />
              Configurar
            </Button>
          </div>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar contatos e empresas..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 h-10 border-border/40 focus-visible:ring-1 bg-background/50"
          />
        </div>
      </div>

      <Tabs defaultValue="all" className="flex-1 flex flex-col">
        <div className="border-b border-border/40 bg-card/50 backdrop-blur-sm px-8">
          <TabsList className="bg-transparent h-auto p-0 gap-6">
            <TabsTrigger 
              value="all" 
              className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none bg-transparent px-0 font-medium"
            >
              Todos ({todosItens.length})
            </TabsTrigger>
            <TabsTrigger 
              value="contacts"
              className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none bg-transparent px-0 font-medium"
            >
              Contatos ({filteredContatos.length})
            </TabsTrigger>
            <TabsTrigger 
              value="companies"
              className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none bg-transparent px-0 font-medium"
            >
              Empresas ({filteredEmpresas.length})
            </TabsTrigger>
            <TabsTrigger 
              value="vendedores"
              className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none bg-transparent px-0 font-medium"
            >
              Vendedores ({filteredVendedores.length})
            </TabsTrigger>
            <TabsTrigger 
              value="transportadoras"
              className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none bg-transparent px-0 font-medium"
            >
              Transportadoras ({filteredTransportadoras.length})
            </TabsTrigger>
            <TabsTrigger 
              value="usuarios"
              className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none bg-transparent px-0 font-medium"
            >
              Gerentes ({filteredUsuarios.length})
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="all" className="flex-1 p-8 overflow-auto">
          {todosItens.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                <Search className="w-8 h-8 text-muted-foreground/50" />
              </div>
              <p className="text-lg font-medium text-muted-foreground mb-1">
                Nenhum registro encontrado
              </p>
              <p className="text-sm text-muted-foreground/70">
                Tente ajustar os filtros de pesquisa
              </p>
            </div>
          ) : (
            <div className="bg-card rounded-2xl border border-border/40 shadow-lg overflow-auto">
              <table className="w-full">
                <thead className="border-b border-border/40 bg-gradient-to-r from-muted/40 to-muted/20 backdrop-blur-sm">
                  <tr>
                    <th className="px-4 py-3.5 w-[30px]"></th>
                    {visibleTodosColumns.map((column) => (
                      <th
                        key={column.id}
                        className="text-left px-4 py-3.5 font-semibold text-xs uppercase tracking-wider text-muted-foreground/80 relative"
                        style={{ width: column.width, minWidth: column.width }}
                      >
                        <div className="flex items-center justify-between gap-2 pr-4">
                          <span>{column.label}</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5 hover:bg-background/50 rounded-full"
                            onClick={() => handleTodosSort(column.id)}
                          >
                            {getSortIcon(column.id, todosSortConfig)}
                          </Button>
                        </div>
                        <div
                          className="absolute right-0 top-0 bottom-0 w-3 cursor-col-resize hover:bg-primary/60 hover:w-1 bg-border/30 transition-all"
                          style={{ touchAction: 'none' }}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            const startX = e.clientX;
                            const startWidth = column.width;

                            const handleMouseMove = (moveEvent: MouseEvent) => {
                              const diff = moveEvent.clientX - startX;
                              const newWidth = Math.max(80, startWidth + diff);
                              setTodosTableColumns(prev =>
                                prev.map(col =>
                                  col.id === column.id ? { ...col, width: newWidth } : col
                                )
                              );
                            };

                            const handleMouseUp = () => {
                              document.removeEventListener('mousemove', handleMouseMove);
                              document.removeEventListener('mouseup', handleMouseUp);
                              document.body.style.cursor = '';
                            };

                            document.body.style.cursor = 'col-resize';
                            document.addEventListener('mousemove', handleMouseMove);
                            document.addEventListener('mouseup', handleMouseUp);
                          }}
                        />
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {todosItens.map(item => {
                    const isExpanded = expandedRows.has(item.id);
                    const vinculosLista: any[] =
                      item.type === 'contato' ? (contatoEmpresas[item.id] || [])
                      : item.type === 'empresa' ? (empresaContatos[item.id] || [])
                      : item.type === 'vendedor' ? (vendedorEmpresas[item.id] || [])
                      : item.type === 'usuario' ? (usuarioEmpresas[item.id] || [])
                      : [];
                    const hasVinculos = vinculosLista.length > 0;
                    const vinculosLabel =
                      item.type === 'contato' ? 'Empresas Vinculadas:'
                      : item.type === 'empresa' ? 'Contatos Vinculados:'
                      : item.type === 'vendedor' ? 'Empresas atendidas por este vendedor:'
                      : item.type === 'usuario' ? 'Empresas sob responsabilidade deste usuário:'
                      : 'Vínculos:';

                    return (
                      <>
                        <tr key={`${item.type}-${item.id}`} className="border-b border-border/30 hover:bg-gradient-to-r hover:from-muted/50 hover:to-muted/30 hover:shadow-sm transition-all duration-200">
                          <td className="p-3">
                            {hasVinculos && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 rounded-full hover:bg-muted"
                                onClick={() => toggleRow(item.id)}
                              >
                                {isExpanded ? (
                                  <ChevronDown className="w-4 h-4" />
                                ) : (
                                  <ChevronRight className="w-4 h-4" />
                                )}
                              </Button>
                            )}
                          </td>
                          {visibleTodosColumns.map(col => {
                            if (col.id === "tipo") {
                              return (
                                <td key={col.id} className="p-3">
                                  {item.type === 'contato' && <User className="w-4 h-4 text-blue-500" />}
                                  {item.type === 'empresa' && <Building2 className="w-4 h-4 text-purple-500" />}
                                  {item.type === 'vendedor' && <UserCog className="w-4 h-4 text-emerald-500" />}
                                  {item.type === 'transportadora' && <Truck className="w-4 h-4 text-orange-500" />}
                                  {item.type === 'usuario' && <Users className="w-4 h-4 text-indigo-500" />}
                                </td>
                              );
                            }
                            
                            if (col.id === "nome") {
                              return (
                                <td key={col.id} className="p-3 font-medium">
                                  {(item.type === 'contato' || item.type === 'usuario') ? item.nome : (item.nome_fantasia || item.nome)}
                                </td>
                              );
                            }
                            
                            if (col.id === "email") {
                              return (
                                <td key={col.id} className="p-3 text-muted-foreground">
                                  {item.email || "-"}
                                </td>
                              );
                            }
                            
                            if (col.id === "telefone") {
                              return (
                                <td key={col.id} className="p-3 text-muted-foreground">
                                  {item.telefone || "-"}
                                </td>
                              );
                            }
                            
                            if (col.id === "status") {
                              const badgeMap: Record<string, { label: string; variant: any }> = {
                                empresa: { label: 'Empresa', variant: 'outline' },
                                vendedor: { label: 'Vendedor', variant: 'default' },
                                transportadora: { label: 'Transportadora', variant: 'secondary' },
                                usuario: { label: 'Usuário', variant: 'outline' },
                              };
                              return (
                                <td key={col.id} className="p-3">
                                  {item.type === 'contato' ? (
                                    <Badge variant={item.tipo_operador ? "default" : "secondary"} className="rounded-full">
                                      {item.tipo_operador ? "Cliente" : "Prospect"}
                                    </Badge>
                                  ) : (
                                    <Badge variant={badgeMap[item.type]?.variant || 'outline'} className="rounded-full">
                                      {badgeMap[item.type]?.label || '-'}
                                    </Badge>
                                  )}
                                </td>
                              );
                            }
                            
                            return <td key={col.id} className="p-3">-</td>;
                          })}
                        </tr>
                        {isExpanded && hasVinculos && (
                          <tr>
                            <td colSpan={visibleTodosColumns.length + 1} className="bg-gradient-to-r from-muted/30 to-muted/10 p-4 border-l-4 border-l-primary/40">
                              <div className="ml-8">
                                <p className="text-sm font-semibold text-foreground mb-3">
                                  {vinculosLabel}
                                </p>
                                <div className="space-y-2">
                                  {vinculosLista.map((v: any) => {
                                    const isContato = item.type === 'empresa';
                                    return (
                                      <div key={v.id} className="flex items-center gap-2 text-sm bg-background/50 rounded-lg p-2 hover:bg-background/80 transition-colors">
                                        {isContato ? <User className="w-4 h-4 text-blue-500" /> : <Building2 className="w-4 h-4 text-purple-500" />}
                                        <span className="font-medium">{isContato ? v.nome : v.nome_fantasia}</span>
                                        {(v.cnpj || v.email) && (
                                          <span className="text-muted-foreground text-xs">({v.cnpj || v.email})</span>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="contacts" className="flex-1 p-8 overflow-auto">
          {filteredContatos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                <User className="w-8 h-8 text-muted-foreground/50" />
              </div>
              <p className="text-lg font-medium text-muted-foreground mb-1">
                Nenhum contato encontrado
              </p>
              <p className="text-sm text-muted-foreground/70">
                Tente ajustar os filtros de pesquisa
              </p>
            </div>
          ) : (
            <div className="bg-card rounded-2xl border border-border/40 shadow-lg overflow-auto">
              <table className="w-full">
                <thead className="border-b border-border/40 bg-gradient-to-r from-muted/40 to-muted/20 backdrop-blur-sm">
                  <tr>
                    <th className="px-4 py-3.5 w-[30px]"></th>
                    {visibleContatosColumns.map((column) => (
                      <th
                        key={column.id}
                        className="text-left px-4 py-3.5 font-semibold text-xs uppercase tracking-wider text-muted-foreground/80 relative"
                        style={{ width: column.width, minWidth: column.width }}
                      >
                        <div className="flex items-center justify-between gap-2 pr-4">
                          <span>{column.label}</span>
                          {column.id !== 'actions' && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-5 w-5 hover:bg-background/50 rounded-full"
                              onClick={() => handleContatosSort(column.id)}
                            >
                              {getSortIcon(column.id, contatosSortConfig)}
                            </Button>
                          )}
                        </div>
                        {column.id !== 'actions' && (
                          <div
                            className="absolute right-0 top-0 bottom-0 w-3 cursor-col-resize hover:bg-primary/60 hover:w-1 bg-border/30 transition-all"
                            style={{ touchAction: 'none' }}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            const startX = e.clientX;
                            const startWidth = column.width;

                            const handleMouseMove = (moveEvent: MouseEvent) => {
                              const diff = moveEvent.clientX - startX;
                              const newWidth = Math.max(80, startWidth + diff);
                              setContatosTableColumns(prev =>
                                prev.map(col =>
                                  col.id === column.id ? { ...col, width: newWidth } : col
                                )
                              );
                            };

                            const handleMouseUp = () => {
                              document.removeEventListener('mousemove', handleMouseMove);
                              document.removeEventListener('mouseup', handleMouseUp);
                              document.body.style.cursor = '';
                            };

                            document.body.style.cursor = 'col-resize';
                            document.addEventListener('mousemove', handleMouseMove);
                            document.addEventListener('mouseup', handleMouseUp);
                          }}
                        />
                        )}
                      </th>
                    ))}
                  </tr>
                </thead>
                 <tbody>
                  {sortedContatos.map(contato => {
                    const isExpanded = expandedRows.has(contato.id);
                    const hasEmpresas = (contatoEmpresas[contato.id]?.length || 0) > 0;

                    return (
                      <>
                        <tr key={contato.id} className="border-b border-border/30 hover:bg-gradient-to-r hover:from-muted/50 hover:to-muted/30 hover:shadow-sm transition-all duration-200">
                          <td className="p-3">
                            <div className="flex items-center gap-1">
                              {hasEmpresas && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0 rounded-full hover:bg-muted"
                                  onClick={() => toggleRow(contato.id)}
                                >
                                  {isExpanded ? (
                                    <ChevronDown className="w-4 h-4" />
                                  ) : (
                                    <ChevronRight className="w-4 h-4" />
                                  )}
                                </Button>
                              )}
                            </div>
                          </td>
                          {visibleContatosColumns.map(col => {
                            if (col.id === "actions") {
                              return (
                                <td key={col.id} className="p-3">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => navigate('/contatos', { state: { editContactId: contato.id } })}
                                    className="h-8 px-2 rounded-full hover:bg-primary hover:text-primary-foreground transition-all duration-200 border-primary/20"
                                  >
                                    <Edit className="w-4 h-4" />
                                  </Button>
                                </td>
                              );
                            }
                            
                            // Campos fixos
                            if (col.id === "name" || col.id === "nome") {
                              return <td key={col.id} className="p-3 font-medium">{contato.nome}</td>;
                            }
                            if (col.id === "email") {
                              return <td key={col.id} className="p-3 text-muted-foreground">{contato.email || "-"}</td>;
                            }
                            if (col.id === "phone" || col.id === "telefone") {
                              return <td key={col.id} className="p-3 text-muted-foreground">{contato.telefone || "-"}</td>;
                            }
                            
                            // Campos customizados
                            const customValue = contato.custom_fields?.[col.id];
                            return (
                              <td key={col.id} className="p-3 text-muted-foreground">
                                {customValue || "-"}
                              </td>
                            );
                          })}
                        </tr>
                        {isExpanded && hasEmpresas && (
                          <tr>
                            <td colSpan={visibleContatosColumns.length + 1} className="bg-gradient-to-r from-muted/30 to-muted/10 p-4 border-l-4 border-l-primary/40">
                              <div className="ml-8">
                                <p className="text-sm font-semibold text-foreground mb-3">
                                  Empresas Vinculadas:
                                </p>
                                <div className="space-y-2">
                                  {contatoEmpresas[contato.id]?.map((emp: any) => (
                                    <div key={emp.id} className="flex items-center gap-2 text-sm bg-background/50 rounded-lg p-2 hover:bg-background/80 transition-colors">
                                      <Building2 className="w-4 h-4 text-purple-500" />
                                      <span className="font-medium">{emp.nome_fantasia}</span>
                                      {emp.cnpj && (
                                        <span className="text-muted-foreground text-xs">({emp.cnpj})</span>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="companies" className="flex-1 p-8 overflow-auto">
          {filteredEmpresas.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                <Building2 className="w-8 h-8 text-muted-foreground/50" />
              </div>
              <p className="text-lg font-medium text-muted-foreground mb-1">
                Nenhuma empresa encontrada
              </p>
              <p className="text-sm text-muted-foreground/70">
                Tente ajustar os filtros de pesquisa
              </p>
            </div>
          ) : (
            <div className="bg-card rounded-2xl border border-border/40 shadow-lg overflow-auto">
              <table className="w-full">
                <thead className="border-b border-border/40 bg-gradient-to-r from-muted/40 to-muted/20 backdrop-blur-sm">
                  <tr>
                    <th className="px-4 py-3.5 w-[30px]"></th>
                    {visibleEmpresasColumns.map((column) => (
                      <th
                        key={column.id}
                        className="text-left px-4 py-3.5 font-semibold text-xs uppercase tracking-wider text-muted-foreground/80 relative"
                        style={{ width: column.width, minWidth: column.width }}
                      >
                        <div className="flex items-center justify-between gap-2 pr-4">
                          <span>{column.label}</span>
                          {column.id !== 'actions' && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-5 w-5 hover:bg-background/50 rounded-full"
                              onClick={() => handleEmpresasSort(column.id)}
                            >
                              {getSortIcon(column.id, empresasSortConfig)}
                            </Button>
                          )}
                        </div>
                        {column.id !== 'actions' && (
                          <div
                            className="absolute right-0 top-0 bottom-0 w-3 cursor-col-resize hover:bg-primary/60 hover:w-1 bg-border/30 transition-all"
                            style={{ touchAction: 'none' }}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            const startX = e.clientX;
                            const startWidth = column.width;

                            const handleMouseMove = (moveEvent: MouseEvent) => {
                              const diff = moveEvent.clientX - startX;
                              const newWidth = Math.max(80, startWidth + diff);
                              setEmpresasTableColumns(prev =>
                                prev.map(col =>
                                  col.id === column.id ? { ...col, width: newWidth } : col
                                )
                              );
                            };

                            const handleMouseUp = () => {
                              document.removeEventListener('mousemove', handleMouseMove);
                              document.removeEventListener('mouseup', handleMouseUp);
                            document.body.style.cursor = '';
                          };

                          document.body.style.cursor = 'col-resize';
                          document.addEventListener('mousemove', handleMouseMove);
                          document.addEventListener('mouseup', handleMouseUp);
                        }}
                        />
                        )}
                      </th>
                    ))}
                  </tr>
                </thead>
                 <tbody>
                  {sortedEmpresas.map(empresa => {
                    const isExpanded = expandedRows.has(empresa.id);
                    const hasContatos = (empresaContatos[empresa.id]?.length || 0) > 0;

                    return (
                      <>
                        <tr key={empresa.id} className="border-b border-border/30 hover:bg-gradient-to-r hover:from-muted/50 hover:to-muted/30 hover:shadow-sm transition-all duration-200">
                          <td className="p-3">
                            <div className="flex items-center gap-1">
                              {hasContatos && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0 rounded-full hover:bg-muted"
                                  onClick={() => toggleRow(empresa.id)}
                                >
                                  {isExpanded ? (
                                    <ChevronDown className="w-4 h-4" />
                                  ) : (
                                    <ChevronRight className="w-4 h-4" />
                                  )}
                                </Button>
                              )}
                            </div>
                          </td>
                          {visibleEmpresasColumns.map(col => {
                            if (col.id === "actions") {
                              return (
                                <td key={col.id} className="p-3">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => navigate('/empresas', { state: { editEmpresaId: empresa.id } })}
                                    className="h-8 px-2 rounded-full hover:bg-primary hover:text-primary-foreground transition-all duration-200 border-primary/20"
                                  >
                                    <Edit className="w-4 h-4" />
                                  </Button>
                                </td>
                              );
                            }
                            
                            // Campos fixos da empresa
                            if (col.id === "nome_fantasia" || col.id === "company_fantasia") {
                              return <td key={col.id} className="p-3 font-medium">{empresa.nome_fantasia}</td>;
                            }
                            if (col.id === "nome" || col.id === "company_name") {
                              return <td key={col.id} className="p-3 text-muted-foreground">{empresa.nome || "-"}</td>;
                            }
                            if (col.id === "cnpj" || col.id === "cpf_cnpj") {
                              return <td key={col.id} className="p-3 text-muted-foreground">{empresa.cnpj || empresa.custom_fields?.cpf_cnpj || "-"}</td>;
                            }
                            if (col.id === "email") {
                              return <td key={col.id} className="p-3 text-muted-foreground">{empresa.email || "-"}</td>;
                            }
                            if (col.id === "telefone") {
                              return <td key={col.id} className="p-3 text-muted-foreground">{empresa.telefone || "-"}</td>;
                            }
                            if (col.id === "cidade" || col.id === "city") {
                              return <td key={col.id} className="p-3 text-muted-foreground">{empresa.cidade || "-"}</td>;
                            }
                            if (col.id === "estado" || col.id === "state") {
                              return <td key={col.id} className="p-3 text-muted-foreground">{empresa.estado || "-"}</td>;
                            }
                            if (col.id === "endereco" || col.id === "address") {
                              return <td key={col.id} className="p-3 text-muted-foreground">{empresa.endereco || "-"}</td>;
                            }
                            if (col.id === "bairro" || col.id === "neighborhood") {
                              return <td key={col.id} className="p-3 text-muted-foreground">{empresa.bairro || empresa.custom_fields?.bairro || "-"}</td>;
                            }
                            if (col.id === "cep") {
                              return <td key={col.id} className="p-3 text-muted-foreground">{empresa.cep || "-"}</td>;
                            }
                            
                            // Campos customizados
                            const customValue = empresa.custom_fields?.[col.id];
                            return (
                              <td key={col.id} className="p-3 text-muted-foreground">
                                {customValue || "-"}
                              </td>
                            );
                          })}
                        </tr>
                        {isExpanded && hasContatos && (
                          <tr>
                            <td colSpan={visibleEmpresasColumns.length + 1} className="bg-gradient-to-r from-muted/30 to-muted/10 p-4 border-l-4 border-l-primary/40">
                              <div className="ml-8">
                                <p className="text-sm font-semibold text-foreground mb-3">
                                  Contatos Vinculados:
                                </p>
                                <div className="space-y-2">
                                  {empresaContatos[empresa.id]?.map((cont: any) => (
                                    <div key={cont.id} className="flex items-center gap-2 text-sm bg-background/50 rounded-lg p-2 hover:bg-background/80 transition-colors">
                                      <User className="w-4 h-4 text-blue-500" />
                                      <span className="font-medium">{cont.nome}</span>
                                      {cont.email && (
                                        <span className="text-muted-foreground text-xs">({cont.email})</span>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="vendedores" className="flex-1 p-8 overflow-auto">
          <SimpleListaComVinculos
            titulo="vendedor"
            icone={<UserCog className="w-4 h-4 text-emerald-500" />}
            itens={filteredVendedores}
            getNome={(v: any) => v.nome_fantasia || v.nome}
            getSub={(v: any) => v.cnpj || v.email}
            vinculos={vendedorEmpresas}
            vinculoLabel="Empresas atendidas por este vendedor"
            expandedRows={expandedRows}
            toggleRow={toggleRow}
            renderVinculo={(emp: any) => (
              <div className="flex items-center gap-2 text-sm bg-background/50 rounded-lg p-2">
                <Building2 className="w-4 h-4 text-purple-500" />
                <span className="font-medium">{emp.nome_fantasia}</span>
                {emp.cnpj && <span className="text-muted-foreground text-xs">({emp.cnpj})</span>}
              </div>
            )}
          />
        </TabsContent>

        <TabsContent value="transportadoras" className="flex-1 p-8 overflow-auto">
          <SimpleListaComVinculos
            titulo="transportadora"
            icone={<Truck className="w-4 h-4 text-orange-500" />}
            itens={filteredTransportadoras}
            getNome={(v: any) => v.nome_fantasia || v.nome}
            getSub={(v: any) => v.cnpj || v.email}
            vinculos={{}}
            vinculoLabel=""
            expandedRows={expandedRows}
            toggleRow={toggleRow}
            renderVinculo={() => null}
          />
        </TabsContent>

        <TabsContent value="usuarios" className="flex-1 p-8 overflow-auto">
          <SimpleListaComVinculos
            titulo="usuário"
            icone={<Users className="w-4 h-4 text-indigo-500" />}
            itens={filteredUsuarios}
            getNome={(u: any) => u.nome}
            getSub={(u: any) => u.email}
            vinculos={usuarioEmpresas}
            vinculoLabel="Empresas sob responsabilidade deste usuário"
            expandedRows={expandedRows}
            toggleRow={toggleRow}
            renderVinculo={(emp: any) => (
              <div className="flex items-center gap-2 text-sm bg-background/50 rounded-lg p-2">
                <Building2 className="w-4 h-4 text-purple-500" />
                <span className="font-medium">{emp.nome_fantasia}</span>
                {emp.cnpj && <span className="text-muted-foreground text-xs">({emp.cnpj})</span>}
              </div>
            )}
          />
        </TabsContent>
      </Tabs>

      {/* Sheet de Configurações */}
      <Sheet open={showConfigSheet} onOpenChange={setShowConfigSheet}>
        <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Configurar Colunas das Tabelas</SheetTitle>
          </SheetHeader>

          <Tabs defaultValue="todos" className="mt-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="todos">Todos</TabsTrigger>
              <TabsTrigger value="contatos">Contatos</TabsTrigger>
              <TabsTrigger value="empresas">Empresas</TabsTrigger>
            </TabsList>

            <TabsContent value="todos" className="mt-4">
              <ColumnConfigPanel
                columns={todosTableColumns}
                onColumnsChange={setTodosTableColumns}
              />
            </TabsContent>

            <TabsContent value="contatos" className="mt-4">
              <ColumnConfigPanel
                columns={contatosTableColumns}
                onColumnsChange={setContatosTableColumns}
              />
            </TabsContent>

            <TabsContent value="empresas" className="mt-4">
              <ColumnConfigPanel
                columns={empresasTableColumns}
                onColumnsChange={setEmpresasTableColumns}
              />
            </TabsContent>
          </Tabs>
        </SheetContent>
      </Sheet>
    </div>
  );
}
