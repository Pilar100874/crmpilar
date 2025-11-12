import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search } from "lucide-react";

interface Contato {
  id: string;
  nome: string;
  telefone: string;
  email: string;
  usuario_vinculado_id: string | null;
  segmento_vinculado_id: string | null;
  vinculo_id: string | null;
}

interface Usuario {
  id: string;
  nome: string;
  email: string;
}

interface Segmento {
  id: string;
  nome: string;
}

interface Props {
  contatos: Contato[];
  usuarios: Usuario[];
  segmentos: Segmento[];
  selectedContatos: string[];
  onSelectContatos: (ids: string[]) => void;
}

export function VinculosWizardStep1Contatos({
  contatos,
  usuarios,
  segmentos,
  selectedContatos,
  onSelectContatos,
}: Props) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterField, setFilterField] = useState("all");
  const [filterUsuario, setFilterUsuario] = useState("all");
  const [filterSegmento, setFilterSegmento] = useState("all");
  const [filteredContatos, setFilteredContatos] = useState(contatos);

  useEffect(() => {
    applyFilters();
  }, [searchTerm, filterField, filterUsuario, filterSegmento, contatos]);

  const applyFilters = () => {
    let result = [...contatos];

    // Filtro por campo de texto
    if (searchTerm.trim()) {
      const termo = searchTerm.toLowerCase();
      result = result.filter((c) => {
        if (filterField === "all") {
          return (
            c.nome.toLowerCase().includes(termo) ||
            c.telefone.toLowerCase().includes(termo) ||
            c.email.toLowerCase().includes(termo)
          );
        }
        if (filterField === "nome") return c.nome.toLowerCase().includes(termo);
        if (filterField === "telefone") return c.telefone.toLowerCase().includes(termo);
        if (filterField === "email") return c.email.toLowerCase().includes(termo);
        return true;
      });
    }

    // Filtro por usuário vinculado
    if (filterUsuario !== "all") {
      if (filterUsuario === "none") {
        result = result.filter((c) => !c.usuario_vinculado_id);
      } else {
        result = result.filter((c) => c.usuario_vinculado_id === filterUsuario);
      }
    }

    // Filtro por segmento vinculado
    if (filterSegmento !== "all") {
      if (filterSegmento === "none") {
        result = result.filter((c) => !c.segmento_vinculado_id);
      } else {
        result = result.filter((c) => c.segmento_vinculado_id === filterSegmento);
      }
    }

    setFilteredContatos(result);
  };

  const handleSelectAll = () => {
    if (selectedContatos.length === filteredContatos.length) {
      onSelectContatos([]);
    } else {
      onSelectContatos(filteredContatos.map((c) => c.id));
    }
  };

  const handleSelectContato = (contatoId: string) => {
    if (selectedContatos.includes(contatoId)) {
      onSelectContatos(selectedContatos.filter((id) => id !== contatoId));
    } else {
      onSelectContatos([...selectedContatos, contatoId]);
    }
  };

  const clearFilters = () => {
    setSearchTerm("");
    setFilterField("all");
    setFilterUsuario("all");
    setFilterSegmento("all");
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Passo 1: Pesquisar e Selecionar Contatos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Filtros */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Campo de Pesquisa</Label>
              <Select value={filterField} onValueChange={setFilterField}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os campos</SelectItem>
                  <SelectItem value="nome">Nome</SelectItem>
                  <SelectItem value="telefone">Telefone</SelectItem>
                  <SelectItem value="email">E-mail</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Termo de Busca</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Digite para buscar..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Filtrar por Usuário</Label>
              <Select value={filterUsuario} onValueChange={setFilterUsuario}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="none">Sem usuário</SelectItem>
                  {usuarios.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Filtrar por Segmento</Label>
              <Select value={filterSegmento} onValueChange={setFilterSegmento}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="none">Sem segmento</SelectItem>
                  {segmentos.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <Button variant="outline" size="sm" onClick={clearFilters}>
              Limpar Filtros
            </Button>
            <Badge variant="secondary">
              {filteredContatos.length} contatos encontrados
            </Badge>
          </div>

          {/* Tabela de Resultados */}
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedContatos.length === filteredContatos.length && filteredContatos.length > 0}
                      onCheckedChange={handleSelectAll}
                    />
                  </TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>E-mail</TableHead>
                  <TableHead>Usuário Vinculado</TableHead>
                  <TableHead>Segmento Vinculado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredContatos.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      Nenhum contato encontrado com os filtros aplicados
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredContatos.map((contato) => {
                    const usuario = usuarios.find((u) => u.id === contato.usuario_vinculado_id);
                    const segmento = segmentos.find((s) => s.id === contato.segmento_vinculado_id);

                    return (
                      <TableRow key={contato.id}>
                        <TableCell>
                          <Checkbox
                            checked={selectedContatos.includes(contato.id)}
                            onCheckedChange={() => handleSelectContato(contato.id)}
                          />
                        </TableCell>
                        <TableCell className="font-medium">{contato.nome}</TableCell>
                        <TableCell>{contato.telefone}</TableCell>
                        <TableCell>{contato.email}</TableCell>
                        <TableCell>
                          {usuario ? (
                            <Badge variant="outline">{usuario.nome}</Badge>
                          ) : (
                            <span className="text-muted-foreground text-sm">Sem vínculo</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {segmento ? (
                            <Badge variant="outline">{segmento.nome}</Badge>
                          ) : (
                            <span className="text-muted-foreground text-sm">Sem vínculo</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {selectedContatos.length > 0 && (
            <div className="flex items-center gap-2">
              <Badge variant="default" className="bg-primary">
                {selectedContatos.length} contatos selecionados
              </Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSelectAll}
              >
                Selecionar Todas ({filteredContatos.length})
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
