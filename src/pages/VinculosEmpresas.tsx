import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Building2, Link2, Trash2, Search, Plus } from "lucide-react";
import { getEstabelecimentoId } from "@/lib/estabelecimentoUtils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

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
  usuario_vinculado_id: string | null;
  segmento_vinculado_id: string | null;
  vinculo_id: string | null;
}

export default function VinculosEmpresas() {
  const [empresas, setEmpresas] = useState<EmpresaComVinculo[]>([]);
  const [filteredEmpresas, setFilteredEmpresas] = useState<EmpresaComVinculo[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [segmentos, setSegmentos] = useState<Segmento[]>([]);
  const [loading, setLoading] = useState(false);
  const [estabelecimentoId, setEstabelecimentoId] = useState<string>("");
  
  // Filtros
  const [searchTerm, setSearchTerm] = useState("");
  const [filterUsuario, setFilterUsuario] = useState<string>("all");
  const [filterSegmento, setFilterSegmento] = useState<string>("all");
  const [filterField, setFilterField] = useState<string>("all");

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
    applyFilters();
  }, [searchTerm, filterUsuario, filterSegmento, filterField, empresas]);

  const loadData = async () => {
    try {
      // Carregar empresas com vínculos
      const { data: empresasData, error: empresasError } = await supabase
        .from("empresas")
        .select("id, nome_fantasia, nome, cnpj, email, telefone, endereco")
        .eq("estabelecimento_id", estabelecimentoId)
        .order("nome_fantasia");

      if (empresasError) throw empresasError;

      // Carregar vínculos
      const { data: vinculosData, error: vinculosError } = await supabase
        .from("empresa_vinculos")
        .select("id, empresa_id, usuario_id, segmento_id")
        .eq("estabelecimento_id", estabelecimentoId);

      if (vinculosError) throw vinculosError;

      // Combinar empresas com vínculos
      const empresasComVinculos: EmpresaComVinculo[] = (empresasData || []).map((empresa) => {
        const vinculo = vinculosData?.find((v) => v.empresa_id === empresa.id);
        return {
          ...empresa,
          usuario_vinculado_id: vinculo?.usuario_id || null,
          segmento_vinculado_id: vinculo?.segmento_id || null,
          vinculo_id: vinculo?.id || null,
        };
      });

      setEmpresas(empresasComVinculos);
      setFilteredEmpresas(empresasComVinculos);

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
    } catch (error: any) {
      toast.error("Erro ao carregar dados", {
        description: error.message,
      });
    }
  };

  const applyFilters = () => {
    let filtered = [...empresas];

    // Filtro por campo específico e termo de busca
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

    // Filtro por usuário vinculado
    if (filterUsuario !== "all") {
      if (filterUsuario === "none") {
        filtered = filtered.filter((e) => !e.usuario_vinculado_id);
      } else {
        filtered = filtered.filter((e) => e.usuario_vinculado_id === filterUsuario);
      }
    }

    // Filtro por segmento vinculado
    if (filterSegmento !== "all") {
      if (filterSegmento === "none") {
        filtered = filtered.filter((e) => !e.segmento_vinculado_id);
      } else {
        filtered = filtered.filter((e) => e.segmento_vinculado_id === filterSegmento);
      }
    }

    setFilteredEmpresas(filtered);
  };

  const handleCreateVinculo = async (empresaId: string, usuarioId?: string, segmentoId?: string) => {
    if (!usuarioId && !segmentoId) {
      toast.error("Destino não selecionado", {
        description: "Selecione um usuário ou segmento para vincular",
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from("empresa_vinculos").insert({
        empresa_id: empresaId,
        usuario_id: usuarioId || null,
        segmento_id: segmentoId || null,
        estabelecimento_id: estabelecimentoId,
      });

      if (error) throw error;

      toast.success("Vínculo criado com sucesso");
      await loadData();
    } catch (error: any) {
      toast.error("Erro ao criar vínculo", {
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

      toast.success("Vínculo removido");
      await loadData();
    } catch (error: any) {
      toast.error("Erro ao remover vínculo", {
        description: error.message,
      });
    }
  };

  const handleUpdateVinculo = async (vinculoId: string, usuarioId?: string, segmentoId?: string) => {
    try {
      const updates: any = {};
      if (usuarioId !== undefined) updates.usuario_id = usuarioId || null;
      if (segmentoId !== undefined) updates.segmento_id = segmentoId || null;

      const { error } = await supabase
        .from("empresa_vinculos")
        .update(updates)
        .eq("id", vinculoId);

      if (error) throw error;

      toast.success("Vínculo atualizado");
      await loadData();
    } catch (error: any) {
      toast.error("Erro ao atualizar vínculo", {
        description: error.message,
      });
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Vínculo X Usuário / Segmento</h1>
        <p className="text-muted-foreground mt-2">
          Pesquise empresas e gerencie seus vínculos com usuários e segmentos
        </p>
      </div>

      {/* Painel de Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5 text-primary" />
            Filtros de Pesquisa
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
              <Label htmlFor="filter-usuario">Usuário Vinculado</Label>
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
              {filteredEmpresas.length} empresa(s) encontrada(s)
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearchTerm("");
                setFilterField("all");
                setFilterUsuario("all");
                setFilterSegmento("all");
              }}
            >
              Limpar Filtros
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tabela de Resultados */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            Empresas e Vínculos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[600px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome Fantasia</TableHead>
                  <TableHead>Razão Social</TableHead>
                  <TableHead>CNPJ</TableHead>
                  <TableHead className="w-[200px]">Usuário</TableHead>
                  <TableHead className="w-[200px]">Segmento</TableHead>
                  <TableHead className="w-[100px]">Ações</TableHead>
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
                  filteredEmpresas.map((empresa) => (
                    <TableRow key={empresa.id}>
                      <TableCell className="font-medium">
                        {empresa.nome_fantasia || "-"}
                      </TableCell>
                      <TableCell>{empresa.nome || "-"}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {empresa.cnpj || "-"}
                      </TableCell>
                      <TableCell>
                        <Select
                          value={empresa.usuario_vinculado_id || "none"}
                          onValueChange={(value) => {
                            if (empresa.vinculo_id) {
                              handleUpdateVinculo(
                                empresa.vinculo_id,
                                value === "none" ? "" : value,
                                undefined
                              );
                            } else {
                              handleCreateVinculo(
                                empresa.id,
                                value === "none" ? undefined : value,
                                undefined
                              );
                            }
                          }}
                        >
                          <SelectTrigger className="h-8">
                            <SelectValue placeholder="Selecionar..." />
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
                      </TableCell>
                      <TableCell>
                        <Select
                          value={empresa.segmento_vinculado_id || "none"}
                          onValueChange={(value) => {
                            if (empresa.vinculo_id) {
                              handleUpdateVinculo(
                                empresa.vinculo_id,
                                undefined,
                                value === "none" ? "" : value
                              );
                            } else {
                              handleCreateVinculo(
                                empresa.id,
                                undefined,
                                value === "none" ? undefined : value
                              );
                            }
                          }}
                        >
                          <SelectTrigger className="h-8">
                            <SelectValue placeholder="Selecionar..." />
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
                      </TableCell>
                      <TableCell>
                        {empresa.vinculo_id && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteVinculo(empresa.vinculo_id!)}
                            className="h-8 w-8 text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
