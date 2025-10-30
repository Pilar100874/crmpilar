import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search, Filter, Building2, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getEstabelecimentoId } from "@/lib/estabelecimentoUtils";

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
                    <TableHead className="w-[50px] font-semibold">Tipo</TableHead>
                    <TableHead className="font-semibold">Nome</TableHead>
                    <TableHead className="font-semibold">E-mail</TableHead>
                    <TableHead className="font-semibold">Telefone</TableHead>
                    <TableHead className="font-semibold">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {todosItens.map(item => (
                    <TableRow key={`${item.type}-${item.id}`} className="hover:bg-muted/30">
                      <TableCell>
                        {item.type === 'contato' ? (
                          <User className="w-4 h-4 text-blue-500" />
                        ) : (
                          <Building2 className="w-4 h-4 text-purple-500" />
                        )}
                      </TableCell>
                      <TableCell className="font-medium">
                        {item.type === 'contato' ? item.nome : item.nome_fantasia}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{item.email || "-"}</TableCell>
                      <TableCell className="text-muted-foreground">{item.telefone || "-"}</TableCell>
                      <TableCell>
                        {item.type === 'contato' ? (
                          <Badge variant={item.tipo_operador ? "default" : "secondary"}>
                            {item.tipo_operador ? "Cliente" : "Prospect"}
                          </Badge>
                        ) : (
                          <Badge variant="outline">Empresa</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
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
                    <TableHead className="font-semibold">Nome</TableHead>
                    <TableHead className="font-semibold">E-mail</TableHead>
                    <TableHead className="font-semibold">Telefone</TableHead>
                    <TableHead className="font-semibold">Cargo</TableHead>
                    <TableHead className="font-semibold">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredContatos.map(contato => (
                    <TableRow key={contato.id} className="hover:bg-muted/30">
                      <TableCell className="font-medium">{contato.nome}</TableCell>
                      <TableCell className="text-muted-foreground">{contato.email}</TableCell>
                      <TableCell className="text-muted-foreground">{contato.telefone}</TableCell>
                      <TableCell className="text-muted-foreground">{contato.custom_fields?.position || "-"}</TableCell>
                      <TableCell>
                        <Badge variant={contato.tipo_operador ? "default" : "secondary"}>
                          {contato.tipo_operador ? "Cliente" : "Prospect"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
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
                    <TableHead className="font-semibold">Nome Fantasia</TableHead>
                    <TableHead className="font-semibold">Razão Social</TableHead>
                    <TableHead className="font-semibold">CNPJ</TableHead>
                    <TableHead className="font-semibold">E-mail</TableHead>
                    <TableHead className="font-semibold">Telefone</TableHead>
                    <TableHead className="font-semibold">Cidade</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEmpresas.map(empresa => (
                    <TableRow key={empresa.id} className="hover:bg-muted/30">
                      <TableCell className="font-medium">{empresa.nome_fantasia}</TableCell>
                      <TableCell className="text-muted-foreground">{empresa.nome || "-"}</TableCell>
                      <TableCell className="text-muted-foreground">{empresa.cnpj || "-"}</TableCell>
                      <TableCell className="text-muted-foreground">{empresa.email || "-"}</TableCell>
                      <TableCell className="text-muted-foreground">{empresa.telefone || "-"}</TableCell>
                      <TableCell className="text-muted-foreground">{empresa.cidade || "-"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
