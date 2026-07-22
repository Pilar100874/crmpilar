import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search } from "lucide-react";

interface Empresa {
  id: string;
  nome_fantasia: string;
  nome: string;
  cnpj: string;
  email: string;
  telefone: string;
  endereco: string;
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

interface EmpresaComVinculo extends Empresa {
  usuarios_vinculados: Array<{ id: string; nome: string }>;
  segmentos_vinculados: Array<{ id: string; nome: string }>;
}

interface Props {
  empresas: EmpresaComVinculo[];
  usuarios: Usuario[];
  segmentos: Segmento[];
  selectedEmpresas: string[];
  onSelectEmpresas: (ids: string[]) => void;
}

export function VinculosWizardStep1({ empresas, usuarios, segmentos, selectedEmpresas, onSelectEmpresas }: Props) {
  const [filteredEmpresas, setFilteredEmpresas] = useState<EmpresaComVinculo[]>(empresas);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterUsuario, setFilterUsuario] = useState<string>("all");
  const [filterSegmento, setFilterSegmento] = useState<string>("all");
  const [filterField, setFilterField] = useState<string>("all");

  useEffect(() => {
    applyFilters();
  }, [searchTerm, filterUsuario, filterSegmento, filterField, empresas]);

  const applyFilters = () => {
    let filtered = [...empresas];

    if (searchTerm.trim() !== "") {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter((empresa) => {
        if (filterField === "all") {
          return (
            empresa.nome_fantasia?.toLowerCase().includes(searchLower) ||
            empresa.nome?.toLowerCase().includes(searchLower) ||
            empresa.cnpj?.toLowerCase().includes(searchLower) ||
            empresa.email?.toLowerCase().includes(searchLower) ||
            empresa.telefone?.toLowerCase().includes(searchLower) ||
            empresa.endereco?.toLowerCase().includes(searchLower)
          );
        } else if (filterField === "nome_fantasia") {
          return empresa.nome_fantasia?.toLowerCase().includes(searchLower);
        } else if (filterField === "nome") {
          return empresa.nome?.toLowerCase().includes(searchLower);
        } else if (filterField === "cnpj") {
          return empresa.cnpj?.toLowerCase().includes(searchLower);
        } else if (filterField === "email") {
          return empresa.email?.toLowerCase().includes(searchLower);
        } else if (filterField === "telefone") {
          return empresa.telefone?.toLowerCase().includes(searchLower);
        } else if (filterField === "endereco") {
          return empresa.endereco?.toLowerCase().includes(searchLower);
        }
        return true;
      });
    }

    if (filterUsuario !== "all") {
      if (filterUsuario === "none") {
        filtered = filtered.filter((e) => e.usuarios_vinculados.length === 0);
      } else {
        filtered = filtered.filter((e) => 
          e.usuarios_vinculados.some(u => u.id === filterUsuario)
        );
      }
    }

    if (filterSegmento !== "all") {
      if (filterSegmento === "none") {
        filtered = filtered.filter((e) => e.segmentos_vinculados.length === 0);
      } else {
        filtered = filtered.filter((e) => 
          e.segmentos_vinculados.some(s => s.id === filterSegmento)
        );
      }
    }

    setFilteredEmpresas(filtered);
  };

  const toggleEmpresaSelection = (empresaId: string) => {
    const newSelection = selectedEmpresas.includes(empresaId)
      ? selectedEmpresas.filter((id) => id !== empresaId)
      : [...selectedEmpresas, empresaId];
    onSelectEmpresas(newSelection);
  };

  const selectAllFiltered = () => {
    if (selectedEmpresas.length === filteredEmpresas.length && filteredEmpresas.length > 0) {
      onSelectEmpresas([]);
    } else {
      onSelectEmpresas(filteredEmpresas.map((e) => e.id));
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5 text-primary" />
            Passo 1: Pesquisar e Selecionar Empresas
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="filter-field">Campo de Busca</Label>
              <Select value={filterField} onValueChange={setFilterField}>
                <SelectTrigger id="filter-field">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os campos</SelectItem>
                  <SelectItem value="nome_fantasia">Nome Fantasia</SelectItem>
                  <SelectItem value="nome">Razão Social</SelectItem>
                  <SelectItem value="cnpj">CNPJ</SelectItem>
                  <SelectItem value="email">E-mail</SelectItem>
                  <SelectItem value="telefone">Telefone</SelectItem>
                  <SelectItem value="endereco">Endereço</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="search-term">Termo de Busca</Label>
              <Input
                id="search-term"
                placeholder="Digite para buscar..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="filter-usuario">Gerente Vinculado</Label>
              <Select value={filterUsuario} onValueChange={setFilterUsuario}>
                <SelectTrigger id="filter-usuario">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="none">Sem vínculo</SelectItem>
                  {usuarios.map((usuario) => (
                    <SelectItem key={usuario.id} value={usuario.id}>
                      {usuario.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="filter-segmento">Segmento Vinculado</Label>
              <Select value={filterSegmento} onValueChange={setFilterSegmento}>
                <SelectTrigger id="filter-segmento">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="none">Sem vínculo</SelectItem>
                  {segmentos.map((segmento) => (
                    <SelectItem key={segmento.id} value={segmento.id}>
                      {segmento.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t">
            <Badge variant="secondary">
              {filteredEmpresas.length} empresa(s) encontrada(s) • {selectedEmpresas.length} selecionada(s)
            </Badge>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Resultados</span>
            {filteredEmpresas.length > 0 && (
              <Badge 
                variant="outline" 
                className="cursor-pointer hover:bg-secondary"
                onClick={selectAllFiltered}
              >
                {selectedEmpresas.length === filteredEmpresas.length ? "Desmarcar" : "Selecionar"} Todas
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12"></TableHead>
                  <TableHead>Nome Fantasia</TableHead>
                  <TableHead>Razão Social</TableHead>
                  <TableHead>CNPJ</TableHead>
                  <TableHead>Usuário Atual</TableHead>
                  <TableHead>Segmento Atual</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEmpresas.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      Nenhuma empresa encontrada
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredEmpresas.map((empresa) => {
                    return (
                      <TableRow key={empresa.id}>
                        <TableCell>
                          <Checkbox
                            checked={selectedEmpresas.includes(empresa.id)}
                            onCheckedChange={() => toggleEmpresaSelection(empresa.id)}
                          />
                        </TableCell>
                        <TableCell className="font-medium">
                          {empresa.nome_fantasia || "-"}
                        </TableCell>
                        <TableCell>{empresa.nome || "-"}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {empresa.cnpj || "-"}
                        </TableCell>
                        <TableCell>
                          {empresa.usuarios_vinculados.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {empresa.usuarios_vinculados.map((u) => (
                                <Badge key={u.id} variant="outline">{u.nome}</Badge>
                              ))}
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-sm">Sem vínculo</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {empresa.segmentos_vinculados.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {empresa.segmentos_vinculados.map((s) => (
                                <Badge key={s.id} variant="outline">{s.nome}</Badge>
                              ))}
                            </div>
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
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
