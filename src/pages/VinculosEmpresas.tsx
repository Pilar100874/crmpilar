import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Building2, User as UserIcon, Users, Link2, Trash2, Filter, Search } from "lucide-react";
import { getEstabelecimentoId } from "@/lib/estabelecimentoUtils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface Empresa {
  id: string;
  nome_fantasia: string;
  nome: string;
  cnpj: string;
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

interface Vinculo {
  id: string;
  empresa_id: string;
  usuario_id: string | null;
  segmento_id: string | null;
  empresas: Empresa;
  usuarios: Usuario | null;
  segmentos: Segmento | null;
}

export default function VinculosEmpresas() {
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [filteredEmpresas, setFilteredEmpresas] = useState<Empresa[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [segmentos, setSegmentos] = useState<Segmento[]>([]);
  const [vinculos, setVinculos] = useState<Vinculo[]>([]);
  const [selectedEmpresas, setSelectedEmpresas] = useState<string[]>([]);
  const [selectedUsuario, setSelectedUsuario] = useState<string>("");
  const [selectedSegmento, setSelectedSegmento] = useState<string>("");
  const [filterUsuario, setFilterUsuario] = useState<string>("all");
  const [filterSegmento, setFilterSegmento] = useState<string>("all");
  const [loading, setLoading] = useState(false);
  const [estabelecimentoId, setEstabelecimentoId] = useState<string>("");

  useEffect(() => {
    const init = async () => {
      const estabId = await getEstabelecimentoId();
      setEstabelecimentoId(estabId);
    };
    init();
  }, []);

  useEffect(() => {
    if (estabelecimentoId) {
      loadData();
    }
  }, [estabelecimentoId]);

  useEffect(() => {
    loadVinculos();
  }, [filterUsuario, filterSegmento]);

  useEffect(() => {
    // Filtrar empresas baseado no termo de busca
    if (searchTerm.trim() === "") {
      setFilteredEmpresas([]);
    } else {
      const filtered = empresas.filter((empresa) => {
        const searchLower = searchTerm.toLowerCase();
        return (
          empresa.nome_fantasia?.toLowerCase().includes(searchLower) ||
          empresa.nome?.toLowerCase().includes(searchLower) ||
          empresa.cnpj?.toLowerCase().includes(searchLower)
        );
      });
      setFilteredEmpresas(filtered);
    }
  }, [searchTerm, empresas]);

  const loadData = async () => {
    try {
      // Carregar empresas
      const { data: empresasData, error: empresasError } = await supabase
        .from("empresas")
        .select("id, nome_fantasia, nome, cnpj")
        .eq("estabelecimento_id", estabelecimentoId)
        .order("nome_fantasia");

      if (empresasError) throw empresasError;
      setEmpresas(empresasData || []);

      // Carregar usuários
      const { data: usuariosData, error: usuariosError } = await supabase
        .from("usuarios")
        .select("id, nome, email")
        .eq("estabelecimento_id", estabelecimentoId)
        .order("nome");

      if (usuariosError) throw usuariosError;
      setUsuarios(usuariosData || []);

      // Carregar segmentos
      const { data: segmentosData, error: segmentosError } = await supabase
        .from("segmentos")
        .select("id, nome")
        .eq("estabelecimento_id", estabelecimentoId)
        .order("nome");

      if (segmentosError) throw segmentosError;
      setSegmentos(segmentosData || []);

      await loadVinculos();
    } catch (error: any) {
      toast.error("Erro ao carregar dados", {
        description: error.message,
      });
    }
  };

  const loadVinculos = async () => {
    try {
      let query = supabase
        .from("empresa_vinculos")
        .select(`
          id,
          empresa_id,
          usuario_id,
          segmento_id,
          empresas:empresa_id (id, nome_fantasia, nome, cnpj),
          usuarios:usuario_id (id, nome, email),
          segmentos:segmento_id (id, nome)
        `)
        .eq("estabelecimento_id", estabelecimentoId);

      if (filterUsuario !== "all") {
        query = query.eq("usuario_id", filterUsuario);
      }

      if (filterSegmento !== "all") {
        query = query.eq("segmento_id", filterSegmento);
      }

      const { data, error } = await query.order("created_at", { ascending: false });

      if (error) throw error;
      setVinculos(data || []);
    } catch (error: any) {
      toast.error("Erro ao carregar vínculos", {
        description: error.message,
      });
    }
  };

  const handleCreateVinculo = async () => {
    if (selectedEmpresas.length === 0) {
      toast.error("Nenhuma empresa selecionada", {
        description: "Selecione pelo menos uma empresa para vincular",
      });
      return;
    }

    if (!selectedUsuario && !selectedSegmento) {
      toast.error("Destino não selecionado", {
        description: "Selecione um usuário ou segmento para vincular",
      });
      return;
    }

    setLoading(true);
    try {
      const vinculos = selectedEmpresas.map((empresaId) => ({
        empresa_id: empresaId,
        usuario_id: selectedUsuario || null,
        segmento_id: selectedSegmento || null,
        estabelecimento_id: estabelecimentoId,
      }));

      const { error } = await supabase.from("empresa_vinculos").insert(vinculos);

      if (error) throw error;

      toast.success("Vínculos criados com sucesso", {
        description: `${selectedEmpresas.length} empresa(s) vinculada(s)`,
      });

      setSelectedEmpresas([]);
      setSelectedUsuario("");
      setSelectedSegmento("");
      await loadVinculos();
    } catch (error: any) {
      toast.error("Erro ao criar vínculos", {
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteVinculo = async (vinculoId: string) => {
    try {
      const { error } = await supabase
        .from("empresa_vinculos")
        .delete()
        .eq("id", vinculoId);

      if (error) throw error;

      toast.success("Vínculo removido", {
        description: "O vínculo foi removido com sucesso",
      });

      await loadVinculos();
    } catch (error: any) {
      toast.error("Erro ao remover vínculo", {
        description: error.message,
      });
    }
  };

  const handleChangeVinculo = async (vinculoId: string, novoUsuario?: string, novoSegmento?: string) => {
    try {
      const updates: any = {};
      if (novoUsuario) updates.usuario_id = novoUsuario;
      if (novoSegmento) updates.segmento_id = novoSegmento;

      const { error } = await supabase
        .from("empresa_vinculos")
        .update(updates)
        .eq("id", vinculoId);

      if (error) throw error;

      toast.success("Vínculo atualizado", {
        description: "O vínculo foi atualizado com sucesso",
      });

      await loadVinculos();
    } catch (error: any) {
      toast.error("Erro ao atualizar vínculo", {
        description: error.message,
      });
    }
  };

  const toggleEmpresaSelection = (empresaId: string) => {
    setSelectedEmpresas((prev) =>
      prev.includes(empresaId)
        ? prev.filter((id) => id !== empresaId)
        : [...prev, empresaId]
    );
  };

  const selectAllEmpresas = () => {
    if (selectedEmpresas.length === filteredEmpresas.length && filteredEmpresas.length > 0) {
      setSelectedEmpresas([]);
    } else {
      setSelectedEmpresas(filteredEmpresas.map((e) => e.id));
    }
  };

  const handleSearch = () => {
    // A busca é feita automaticamente pelo useEffect
    if (filteredEmpresas.length === 0 && searchTerm.trim() !== "") {
      toast.error("Nenhuma empresa encontrada", {
        description: "Tente outro termo de busca",
      });
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Vínculo X Usuário / Segmento</h1>
        <p className="text-muted-foreground mt-2">
          Gerencie os vínculos entre empresas e usuários ou segmentos
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Painel de Criação de Vínculos */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Link2 className="h-5 w-5 text-primary" />
              Criar Novos Vínculos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="search-empresa">Buscar Empresas</Label>
              <div className="flex gap-2">
                <Input
                  id="search-empresa"
                  placeholder="Digite nome, razão social ou CNPJ..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSearch();
                  }}
                />
                <Button onClick={handleSearch} variant="secondary">
                  <Search className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {filteredEmpresas.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Resultados da Busca</Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={selectAllEmpresas}
                    className="text-xs"
                  >
                    {selectedEmpresas.length === filteredEmpresas.length ? "Desmarcar" : "Selecionar"} Todas
                  </Button>
                </div>
                <ScrollArea className="h-64 border rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12"></TableHead>
                        <TableHead>Nome Fantasia</TableHead>
                        <TableHead>Razão Social</TableHead>
                        <TableHead>CNPJ</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredEmpresas.map((empresa) => (
                        <TableRow key={empresa.id}>
                          <TableCell>
                            <Checkbox
                              checked={selectedEmpresas.includes(empresa.id)}
                              onCheckedChange={() => toggleEmpresaSelection(empresa.id)}
                            />
                          </TableCell>
                          <TableCell className="font-medium">{empresa.nome_fantasia || "-"}</TableCell>
                          <TableCell>{empresa.nome || "-"}</TableCell>
                          <TableCell className="text-muted-foreground">{empresa.cnpj || "-"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
                {selectedEmpresas.length > 0 && (
                  <Badge variant="secondary">
                    {selectedEmpresas.length} empresa(s) selecionada(s)
                  </Badge>
                )}
              </div>
            )}

            {searchTerm && filteredEmpresas.length === 0 && (
              <div className="text-center py-8 text-muted-foreground text-sm">
                Nenhuma empresa encontrada
              </div>
            )}

            <Separator />

            <div className="space-y-2">
              <Label htmlFor="usuario-select">Vincular a Usuário</Label>
              <Select value={selectedUsuario || "none"} onValueChange={(value) => setSelectedUsuario(value === "none" ? "" : value)}>
                <SelectTrigger id="usuario-select">
                  <SelectValue placeholder="Selecione um usuário (opcional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum</SelectItem>
                  {usuarios.map((usuario) => (
                    <SelectItem key={usuario.id} value={usuario.id}>
                      {usuario.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="segmento-select">Vincular a Segmento</Label>
              <Select value={selectedSegmento || "none"} onValueChange={(value) => setSelectedSegmento(value === "none" ? "" : value)}>
                <SelectTrigger id="segmento-select">
                  <SelectValue placeholder="Selecione um segmento (opcional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum</SelectItem>
                  {segmentos.map((segmento) => (
                    <SelectItem key={segmento.id} value={segmento.id}>
                      {segmento.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              onClick={handleCreateVinculo}
              disabled={loading || selectedEmpresas.length === 0}
              className="w-full"
            >
              <Link2 className="h-4 w-4 mr-2" />
              Criar Vínculos
            </Button>
          </CardContent>
        </Card>

        {/* Painel de Filtros */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5 text-primary" />
              Filtrar Vínculos Existentes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="filter-usuario">Filtrar por Usuário</Label>
              <Select value={filterUsuario} onValueChange={setFilterUsuario}>
                <SelectTrigger id="filter-usuario">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os usuários</SelectItem>
                  {usuarios.map((usuario) => (
                    <SelectItem key={usuario.id} value={usuario.id}>
                      {usuario.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="filter-segmento">Filtrar por Segmento</Label>
              <Select value={filterSegmento} onValueChange={setFilterSegmento}>
                <SelectTrigger id="filter-segmento">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os segmentos</SelectItem>
                  {segmentos.map((segmento) => (
                    <SelectItem key={segmento.id} value={segmento.id}>
                      {segmento.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="pt-4 border-t">
              <div className="text-sm text-muted-foreground">
                <strong>{vinculos.length}</strong> vínculo(s) encontrado(s)
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lista de Vínculos */}
      <Card>
        <CardHeader>
          <CardTitle>Vínculos Existentes</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[500px]">
            <div className="space-y-4">
              {vinculos.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  Nenhum vínculo encontrado
                </div>
              ) : (
                vinculos.map((vinculo) => (
                  <Card key={vinculo.id} className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-3">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-5 w-5 text-primary" />
                          <span className="font-semibold">
                            {vinculo.empresas.nome_fantasia || vinculo.empresas.nome}
                          </span>
                          {vinculo.empresas.cnpj && (
                            <span className="text-sm text-muted-foreground">
                              {vinculo.empresas.cnpj}
                            </span>
                          )}
                        </div>

                        <div className="grid gap-2 sm:grid-cols-2">
                          {vinculo.usuario_id && (
                            <div className="space-y-1">
                              <Label className="text-xs">Usuário</Label>
                              <Select
                                value={vinculo.usuario_id}
                                onValueChange={(value) =>
                                  handleChangeVinculo(vinculo.id, value, undefined)
                                }
                              >
                                <SelectTrigger className="h-8">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {usuarios.map((usuario) => (
                                    <SelectItem key={usuario.id} value={usuario.id}>
                                      {usuario.nome}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          )}

                          {vinculo.segmento_id && (
                            <div className="space-y-1">
                              <Label className="text-xs">Segmento</Label>
                              <Select
                                value={vinculo.segmento_id}
                                onValueChange={(value) =>
                                  handleChangeVinculo(vinculo.id, undefined, value)
                                }
                              >
                                <SelectTrigger className="h-8">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {segmentos.map((segmento) => (
                                    <SelectItem key={segmento.id} value={segmento.id}>
                                      {segmento.nome}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          )}
                        </div>
                      </div>

                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteVinculo(vinculo.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
