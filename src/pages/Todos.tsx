import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Search, Filter, Building2, User, Settings2, ChevronDown, ChevronRight } from "lucide-react";
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
  cidade: string | null;
}

export default function Todos() {
  const [searchTerm, setSearchTerm] = useState("");
  const [contatos, setContatos] = useState<Contato[]>([]);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [estabelecimentoId, setEstabelecimentoId] = useState<string | null>(null);
  const [showConfigSheet, setShowConfigSheet] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [contatoEmpresas, setContatoEmpresas] = useState<Record<string, any[]>>({});
  const [empresaContatos, setEmpresaContatos] = useState<Record<string, any[]>>({});

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

  // Gerenciamento de colunas da tabela - Contatos
  const [contatosTableColumns, setContatosTableColumns] = useState<TableColumn[]>(() => {
    const saved = localStorage.getItem("todosContatosTableColumns");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {}
    }
    return [
      { id: "nome", label: "Nome", visible: true, width: 250, locked: true },
      { id: "email", label: "E-mail", visible: true, width: 250 },
      { id: "telefone", label: "Telefone", visible: true, width: 150 },
      { id: "position", label: "Cargo", visible: true, width: 150 },
      { id: "status", label: "Status", visible: true, width: 120 },
    ];
  });

  // Gerenciamento de colunas da tabela - Empresas
  const [empresasTableColumns, setEmpresasTableColumns] = useState<TableColumn[]>(() => {
    const saved = localStorage.getItem("todosEmpresasTableColumns");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {}
    }
    return [
      { id: "nome_fantasia", label: "Nome Fantasia", visible: true, width: 250, locked: true },
      { id: "nome", label: "Razão Social", visible: true, width: 250 },
      { id: "cnpj", label: "CNPJ", visible: true, width: 180 },
      { id: "email", label: "E-mail", visible: true, width: 250 },
      { id: "telefone", label: "Telefone", visible: true, width: 150 },
      { id: "cidade", label: "Cidade", visible: true, width: 150 },
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

        // Buscar vínculos contato-empresa
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

          // Mapear empresas -> contatos
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

  const todosItens = [
    ...filteredContatos.map(c => ({ ...c, type: 'contato' as const })),
    ...filteredEmpresas.map(e => ({ ...e, type: 'empresa' as const }))
  ].sort((a, b) => {
    const nomeA = a.type === 'contato' ? a.nome : a.nome_fantasia;
    const nomeB = b.type === 'contato' ? b.nome : b.nome_fantasia;
    return nomeA.localeCompare(nomeB);
  });

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
            <div className="bg-card rounded-lg border border-border/40 shadow-sm overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-border/40 bg-muted/30">
                    <TableHead className="w-[30px] font-semibold"></TableHead>
                    {visibleTodosColumns.map(col => (
                      <TableHead key={col.id} className="font-semibold" style={{ width: col.width }}>
                        {col.label}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {todosItens.map(item => {
                    const isExpanded = expandedRows.has(item.id);
                    const hasVinculos = item.type === 'contato' 
                      ? (contatoEmpresas[item.id]?.length || 0) > 0
                      : (empresaContatos[item.id]?.length || 0) > 0;

                    return (
                      <>
                        <TableRow key={`${item.type}-${item.id}`} className="hover:bg-muted/30">
                          <TableCell>
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
                          </TableCell>
                          {visibleTodosColumns.map(col => {
                            if (col.id === "tipo") {
                              return (
                                <TableCell key={col.id}>
                                  {item.type === 'contato' ? (
                                    <User className="w-4 h-4 text-blue-500" />
                                  ) : (
                                    <Building2 className="w-4 h-4 text-purple-500" />
                                  )}
                                </TableCell>
                              );
                            }
                            
                            if (col.id === "nome") {
                              return (
                                <TableCell key={col.id} className="font-medium">
                                  {item.type === 'contato' ? item.nome : item.nome_fantasia}
                                </TableCell>
                              );
                            }
                            
                            if (col.id === "email") {
                              return (
                                <TableCell key={col.id} className="text-muted-foreground">
                                  {item.email || "-"}
                                </TableCell>
                              );
                            }
                            
                            if (col.id === "telefone") {
                              return (
                                <TableCell key={col.id} className="text-muted-foreground">
                                  {item.telefone || "-"}
                                </TableCell>
                              );
                            }
                            
                            if (col.id === "status") {
                              return (
                                <TableCell key={col.id}>
                                  {item.type === 'contato' ? (
                                    <Badge variant={item.tipo_operador ? "default" : "secondary"}>
                                      {item.tipo_operador ? "Cliente" : "Prospect"}
                                    </Badge>
                                  ) : (
                                    <Badge variant="outline">Empresa</Badge>
                                  )}
                                </TableCell>
                              );
                            }
                            
                            return <TableCell key={col.id}>-</TableCell>;
                          })}
                        </TableRow>
                        {isExpanded && hasVinculos && (
                          <TableRow>
                            <TableCell colSpan={visibleTodosColumns.length + 1} className="bg-muted/20 p-4">
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
                            </TableCell>
                          </TableRow>
                        )}
                      </>
                    );
                  })}
                </TableBody>
              </Table>
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
            <div className="bg-card rounded-lg border border-border/40 shadow-sm overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-border/40 bg-muted/30">
                    <TableHead className="w-[30px] font-semibold"></TableHead>
                    {visibleContatosColumns.map(col => (
                      <TableHead key={col.id} className="font-semibold" style={{ width: col.width }}>
                        {col.label}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredContatos.map(contato => {
                    const isExpanded = expandedRows.has(contato.id);
                    const hasEmpresas = (contatoEmpresas[contato.id]?.length || 0) > 0;

                    return (
                      <>
                        <TableRow key={contato.id} className="hover:bg-muted/30">
                          <TableCell>
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
                          </TableCell>
                          {visibleContatosColumns.map(col => {
                            let cellContent = "-";
                            
                            if (col.id === "nome") cellContent = contato.nome;
                            else if (col.id === "email") cellContent = contato.email;
                            else if (col.id === "telefone") cellContent = contato.telefone;
                            else if (col.id === "position") cellContent = contato.custom_fields?.position || "-";
                            else if (col.id === "status") {
                              return (
                                <TableCell key={col.id}>
                                  <Badge variant={contato.tipo_operador ? "default" : "secondary"}>
                                    {contato.tipo_operador ? "Cliente" : "Prospect"}
                                  </Badge>
                                </TableCell>
                              );
                            }

                            return (
                              <TableCell 
                                key={col.id} 
                                className={col.id === "nome" ? "font-medium" : "text-muted-foreground"}
                              >
                                {cellContent}
                              </TableCell>
                            );
                          })}
                        </TableRow>
                        {isExpanded && hasEmpresas && (
                          <TableRow>
                            <TableCell colSpan={visibleContatosColumns.length + 1} className="bg-muted/20 p-4">
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
                            </TableCell>
                          </TableRow>
                        )}
                      </>
                    );
                  })}
                </TableBody>
              </Table>
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
            <div className="bg-card rounded-lg border border-border/40 shadow-sm overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-border/40 bg-muted/30">
                    <TableHead className="w-[30px] font-semibold"></TableHead>
                    {visibleEmpresasColumns.map(col => (
                      <TableHead key={col.id} className="font-semibold" style={{ width: col.width }}>
                        {col.label}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEmpresas.map(empresa => {
                    const isExpanded = expandedRows.has(empresa.id);
                    const hasContatos = (empresaContatos[empresa.id]?.length || 0) > 0;

                    return (
                      <>
                        <TableRow key={empresa.id} className="hover:bg-muted/30">
                          <TableCell>
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
                          </TableCell>
                          {visibleEmpresasColumns.map(col => {
                            let cellContent = "-";
                            
                            if (col.id === "nome_fantasia") cellContent = empresa.nome_fantasia;
                            else if (col.id === "nome") cellContent = empresa.nome || "-";
                            else if (col.id === "cnpj") cellContent = empresa.cnpj || "-";
                            else if (col.id === "email") cellContent = empresa.email || "-";
                            else if (col.id === "telefone") cellContent = empresa.telefone || "-";
                            else if (col.id === "cidade") cellContent = empresa.cidade || "-";

                            return (
                              <TableCell 
                                key={col.id} 
                                className={col.id === "nome_fantasia" ? "font-medium" : "text-muted-foreground"}
                              >
                                {cellContent}
                              </TableCell>
                            );
                          })}
                        </TableRow>
                        {isExpanded && hasContatos && (
                          <TableRow>
                            <TableCell colSpan={visibleEmpresasColumns.length + 1} className="bg-muted/20 p-4">
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
                            </TableCell>
                          </TableRow>
                        )}
                      </>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Sheet de Configurações */}
      <Sheet open={showConfigSheet} onOpenChange={setShowConfigSheet}>
        <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Configurar Colunas das Tabelas</SheetTitle>
          </SheetHeader>

          <div className="space-y-8 mt-6">
            <div>
              <h3 className="text-lg font-medium mb-4">Tabela Todos</h3>
              <TableColumnsConfig
                columns={todosTableColumns}
                onColumnsChange={setTodosTableColumns}
              />
            </div>

            <div className="border-t pt-6">
              <h3 className="text-lg font-medium mb-4">Tabela Contatos</h3>
              <TableColumnsConfig
                columns={contatosTableColumns}
                onColumnsChange={setContatosTableColumns}
              />
            </div>

            <div className="border-t pt-6">
              <h3 className="text-lg font-medium mb-4">Tabela Empresas</h3>
              <TableColumnsConfig
                columns={empresasTableColumns}
                onColumnsChange={setEmpresasTableColumns}
              />
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
