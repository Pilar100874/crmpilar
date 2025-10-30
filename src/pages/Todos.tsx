import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Search, Filter, Building2, User, Settings2, ChevronDown, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown, Edit } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getEstabelecimentoId } from "@/lib/estabelecimentoUtils";
import { TableColumnsConfig, type TableColumn } from "@/components/config/TableColumnsConfig";

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

export default function Todos() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [contatos, setContatos] = useState<Contato[]>([]);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
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

        // Buscar empresas
        const { data: empresasData } = await supabase
          .from('empresas')
          .select('*')
          .eq('estabelecimento_id', estabId)
          .order('nome_fantasia');

        if (empresasData) setEmpresas(empresasData);

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

  // Aplicar ordenação para Todos
  let todosItens = [
    ...filteredContatos.map(c => ({ ...c, type: 'contato' as const })),
    ...filteredEmpresas.map(e => ({ ...e, type: 'empresa' as const }))
  ];

  if (todosSortConfig) {
    todosItens = [...todosItens].sort((a, b) => {
      let aValue, bValue;
      if (todosSortConfig.key === 'nome') {
        aValue = a.type === 'contato' ? a.nome : a.nome_fantasia;
        bValue = b.type === 'contato' ? b.nome : b.nome_fantasia;
      } else if (todosSortConfig.key === 'email') {
        aValue = a.email || '';
        bValue = b.email || '';
      } else if (todosSortConfig.key === 'telefone') {
        aValue = a.telefone || '';
        bValue = b.telefone || '';
      } else {
        aValue = '';
        bValue = '';
      }
      
      if (todosSortConfig.direction === 'asc') {
        return aValue.localeCompare(bValue);
      } else {
        return bValue.localeCompare(aValue);
      }
    });
  } else {
    todosItens = todosItens.sort((a, b) => {
      const nomeA = a.type === 'contato' ? a.nome : a.nome_fantasia;
      const nomeB = b.type === 'contato' ? b.nome : b.nome_fantasia;
      return nomeA.localeCompare(nomeB);
    });
  }

  // Aplicar ordenação para Contatos
  let sortedContatos = [...filteredContatos];
  if (contatosSortConfig) {
    sortedContatos = sortedContatos.sort((a, b) => {
      let aValue, bValue;
      if (contatosSortConfig.key === 'nome') {
        aValue = a.nome;
        bValue = b.nome;
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
        aValue = a.nome_fantasia;
        bValue = b.nome_fantasia;
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
            <div className="bg-card rounded-lg border border-border/40 shadow-sm overflow-auto">
              <table className="w-full">
                <thead className="border-b border-border/40 bg-muted/30">
                  <tr>
                    <th className="p-4 w-[30px]"></th>
                    {visibleTodosColumns.map((column) => (
                      <th
                        key={column.id}
                        className="text-left p-4 font-medium text-xs uppercase tracking-wider text-muted-foreground relative"
                        style={{ width: column.width, minWidth: column.width }}
                      >
                        <div className="flex items-center justify-between gap-2 pr-4">
                          <span>{column.label}</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5 hover:bg-background/50"
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
                    const hasVinculos = item.type === 'contato' 
                      ? (contatoEmpresas[item.id]?.length || 0) > 0
                      : (empresaContatos[item.id]?.length || 0) > 0;

                    return (
                      <>
                        <tr key={`${item.type}-${item.id}`} className="border-b border-border/40 hover:bg-muted/30 transition-colors">
                          <td className="p-3">
                            {hasVinculos && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0"
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
                                  {item.type === 'contato' ? (
                                    <User className="w-4 h-4 text-blue-500" />
                                  ) : (
                                    <Building2 className="w-4 h-4 text-purple-500" />
                                  )}
                                </td>
                              );
                            }
                            
                            if (col.id === "nome") {
                              return (
                                <td key={col.id} className="p-3 font-medium">
                                  {item.type === 'contato' ? item.nome : item.nome_fantasia}
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
                              return (
                                <td key={col.id} className="p-3">
                                  {item.type === 'contato' ? (
                                    <Badge variant={item.tipo_operador ? "default" : "secondary"}>
                                      {item.tipo_operador ? "Cliente" : "Prospect"}
                                    </Badge>
                                  ) : (
                                    <Badge variant="outline">Empresa</Badge>
                                  )}
                                </td>
                              );
                            }
                            
                            return <td key={col.id} className="p-3">-</td>;
                          })}
                        </tr>
                        {isExpanded && hasVinculos && (
                          <tr>
                            <td colSpan={visibleTodosColumns.length + 1} className="bg-muted/20 p-4">
                              <div className="ml-8">
                                <p className="text-sm font-medium text-muted-foreground mb-2">
                                  {item.type === 'contato' ? 'Empresas Vinculadas:' : 'Contatos Vinculados:'}
                                </p>
                                <div className="space-y-1">
                                  {item.type === 'contato' ? (
                                    contatoEmpresas[item.id]?.map((emp: any) => (
                                      <div key={emp.id} className="flex items-center gap-2 text-sm">
                                        <Building2 className="w-3 h-3 text-purple-500" />
                                        <span>{emp.nome_fantasia}</span>
                                        {emp.cnpj && (
                                          <span className="text-muted-foreground">({emp.cnpj})</span>
                                        )}
                                      </div>
                                    ))
                                  ) : (
                                    empresaContatos[item.id]?.map((cont: any) => (
                                      <div key={cont.id} className="flex items-center gap-2 text-sm">
                                        <User className="w-3 h-3 text-blue-500" />
                                        <span>{cont.nome}</span>
                                        {cont.email && (
                                          <span className="text-muted-foreground">({cont.email})</span>
                                        )}
                                      </div>
                                    ))
                                  )}
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
            <div className="bg-card rounded-lg border border-border/40 shadow-sm overflow-auto">
              <table className="w-full">
                <thead className="border-b border-border/40 bg-muted/30">
                  <tr>
                    <th className="p-4 w-[30px]"></th>
                    {visibleContatosColumns.map((column) => (
                      <th
                        key={column.id}
                        className="text-left p-4 font-medium text-xs uppercase tracking-wider text-muted-foreground relative"
                        style={{ width: column.width, minWidth: column.width }}
                      >
                        <div className="flex items-center justify-between gap-2 pr-4">
                          <span>{column.label}</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5 hover:bg-background/50"
                            onClick={() => handleContatosSort(column.id)}
                          >
                            {getSortIcon(column.id, contatosSortConfig)}
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
                        <tr key={contato.id} className="border-b border-border/40 hover:bg-muted/30 transition-colors">
                          <td className="p-3">
                            <div className="flex items-center gap-1">
                              {hasEmpresas && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0"
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
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => navigate('/contatos')}
                                    className="h-8 px-2 hover:bg-primary/10"
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
                            <td colSpan={visibleContatosColumns.length + 1} className="bg-muted/20 p-4">
                              <div className="ml-8">
                                <p className="text-sm font-medium text-muted-foreground mb-2">
                                  Empresas Vinculadas:
                                </p>
                                <div className="space-y-1">
                                  {contatoEmpresas[contato.id]?.map((emp: any) => (
                                    <div key={emp.id} className="flex items-center gap-2 text-sm">
                                      <Building2 className="w-3 h-3 text-purple-500" />
                                      <span>{emp.nome_fantasia}</span>
                                      {emp.cnpj && (
                                        <span className="text-muted-foreground">({emp.cnpj})</span>
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
            <div className="bg-card rounded-lg border border-border/40 shadow-sm overflow-auto">
              <table className="w-full">
                <thead className="border-b border-border/40 bg-muted/30">
                  <tr>
                    <th className="p-4 w-[30px]"></th>
                    {visibleEmpresasColumns.map((column) => (
                      <th
                        key={column.id}
                        className="text-left p-4 font-medium text-xs uppercase tracking-wider text-muted-foreground relative"
                        style={{ width: column.width, minWidth: column.width }}
                      >
                        <div className="flex items-center justify-between gap-2 pr-4">
                          <span>{column.label}</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5 hover:bg-background/50"
                            onClick={() => handleEmpresasSort(column.id)}
                          >
                            {getSortIcon(column.id, empresasSortConfig)}
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
                        <tr key={empresa.id} className="border-b border-border/40 hover:bg-muted/30 transition-colors">
                          <td className="p-3">
                            <div className="flex items-center gap-1">
                              {hasContatos && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0"
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
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => navigate('/empresas')}
                                    className="h-8 px-2 hover:bg-primary/10"
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
                            <td colSpan={visibleEmpresasColumns.length + 1} className="bg-muted/20 p-4">
                              <div className="ml-8">
                                <p className="text-sm font-medium text-muted-foreground mb-2">
                                  Contatos Vinculados:
                                </p>
                                <div className="space-y-1">
                                  {empresaContatos[empresa.id]?.map((cont: any) => (
                                    <div key={cont.id} className="flex items-center gap-2 text-sm">
                                      <User className="w-3 h-3 text-blue-500" />
                                      <span>{cont.nome}</span>
                                      {cont.email && (
                                        <span className="text-muted-foreground">({cont.email})</span>
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
              <TableColumnsConfig
                columns={todosTableColumns}
                onColumnsChange={setTodosTableColumns}
              />
            </TabsContent>

            <TabsContent value="contatos" className="mt-4">
              <TableColumnsConfig
                columns={contatosTableColumns}
                onColumnsChange={setContatosTableColumns}
              />
            </TabsContent>

            <TabsContent value="empresas" className="mt-4">
              <TableColumnsConfig
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
