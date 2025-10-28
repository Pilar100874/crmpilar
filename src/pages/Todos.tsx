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
  razao_social: string | null;
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
    e.razao_social?.toLowerCase().includes(searchTerm.toLowerCase()) ||
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
    <div className="flex-1 flex flex-col h-full bg-background">
      <div className="border-b border-border bg-card px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-foreground">Todos os Contatos e Empresas</h1>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar contatos e empresas..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <Tabs defaultValue="all" className="flex-1 flex flex-col">
        <div className="border-b border-border bg-card px-6">
          <TabsList className="bg-transparent h-auto p-0">
            <TabsTrigger 
              value="all" 
              className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none bg-transparent"
            >
              Todos ({todosItens.length})
            </TabsTrigger>
            <TabsTrigger 
              value="contacts"
              className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none bg-transparent"
            >
              Contatos ({filteredContatos.length})
            </TabsTrigger>
            <TabsTrigger 
              value="companies"
              className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none bg-transparent"
            >
              Empresas ({filteredEmpresas.length})
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="all" className="flex-1 p-6 overflow-auto">
          {todosItens.length === 0 ? (
            <div className="text-center text-muted-foreground py-12">
              Nenhum contato ou empresa encontrado
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">Tipo</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>E-mail</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {todosItens.map(item => (
                  <TableRow key={`${item.type}-${item.id}`}>
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
                    <TableCell>{item.email || "-"}</TableCell>
                    <TableCell>{item.telefone || "-"}</TableCell>
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
          )}
        </TabsContent>

        <TabsContent value="contacts" className="flex-1 p-6 overflow-auto">
          {filteredContatos.length === 0 ? (
            <div className="text-center text-muted-foreground py-12">
              Nenhum contato encontrado
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>E-mail</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Cargo</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredContatos.map(contato => (
                  <TableRow key={contato.id}>
                    <TableCell className="font-medium">{contato.nome}</TableCell>
                    <TableCell>{contato.email}</TableCell>
                    <TableCell>{contato.telefone}</TableCell>
                    <TableCell>{contato.custom_fields?.position || "-"}</TableCell>
                    <TableCell>
                      <Badge variant={contato.tipo_operador ? "default" : "secondary"}>
                        {contato.tipo_operador ? "Cliente" : "Prospect"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </TabsContent>

        <TabsContent value="companies" className="flex-1 p-6 overflow-auto">
          {filteredEmpresas.length === 0 ? (
            <div className="text-center text-muted-foreground py-12">
              Nenhuma empresa encontrada
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome Fantasia</TableHead>
                  <TableHead>Razão Social</TableHead>
                  <TableHead>CNPJ</TableHead>
                  <TableHead>E-mail</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Cidade</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEmpresas.map(empresa => (
                  <TableRow key={empresa.id}>
                    <TableCell className="font-medium">{empresa.nome_fantasia}</TableCell>
                    <TableCell>{empresa.razao_social || "-"}</TableCell>
                    <TableCell>{empresa.cnpj || "-"}</TableCell>
                    <TableCell>{empresa.email || "-"}</TableCell>
                    <TableCell>{empresa.telefone || "-"}</TableCell>
                    <TableCell>{empresa.cidade || "-"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
