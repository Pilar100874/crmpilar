import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getEstabelecimentoId } from "@/lib/estabelecimentoUtils";
import { toast } from "@/lib/toast-config";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserCog, Search, Pencil, Plus, Trash2, Info } from "lucide-react";

interface Gerente {
  id: string;
  nome: string;
  email: string;
  telefone: string | null;
}

interface Empresa {
  id: string;
  nome_fantasia: string | null;
  nome: string | null;
  cnpj: string | null;
  tipo_cliente: string;
}

export default function Gerentes() {
  const [estabelecimentoId, setEstabelecimentoId] = useState<string | null>(null);
  const [gerentes, setGerentes] = useState<Gerente[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [editing, setEditing] = useState<Gerente | null>(null);
  const [showForm, setShowForm] = useState(false);

  const [vendedoresLista, setVendedoresLista] = useState<Empresa[]>([]);
  const [empresasLista, setEmpresasLista] = useState<Empresa[]>([]);
  const [vinculosVendedores, setVinculosVendedores] = useState<Array<{ id: string; vendedor_empresa_id: string }>>([]);
  const [vinculosEmpresas, setVinculosEmpresas] = useState<Array<{ id: string; empresa_id: string }>>([]);
  const [novosVendedores, setNovosVendedores] = useState<string[]>([]);
  const [novasEmpresas, setNovasEmpresas] = useState<string[]>([]);

  useEffect(() => {
    (async () => {
      const id = await getEstabelecimentoId();
      setEstabelecimentoId(id);
    })();
  }, []);

  useEffect(() => {
    if (estabelecimentoId) {
      loadGerentes();
      loadListas();
    }
  }, [estabelecimentoId]);

  const loadGerentes = async () => {
    if (!estabelecimentoId) return;
    const { data, error } = await supabase
      .from("usuarios")
      .select("id, nome, email, telefone")
      .eq("estabelecimento_id", estabelecimentoId)
      .eq("tipo", "gerente")
      .order("nome");
    if (error) {
      toast.error("Erro ao carregar gerentes: " + error.message);
      return;
    }
    setGerentes(data || []);
  };

  const loadListas = async () => {
    if (!estabelecimentoId) return;
    const { data: vend } = await supabase
      .from("empresas")
      .select("id, nome_fantasia, nome, cnpj, tipo_cliente")
      .eq("estabelecimento_id", estabelecimentoId)
      .eq("tipo_cliente", "vendedor")
      .order("nome_fantasia");
    setVendedoresLista(vend || []);

    const { data: emp } = await supabase
      .from("empresas")
      .select("id, nome_fantasia, nome, cnpj, tipo_cliente")
      .eq("estabelecimento_id", estabelecimentoId)
      .eq("tipo_cliente", "B2B")
      .order("nome_fantasia");
    setEmpresasLista(emp || []);
  };

  const openDetails = async (g: Gerente) => {
    setEditing(g);
    setShowForm(true);
    setNovosVendedores([]);
    setNovasEmpresas([]);
    await loadVinculos(g.id);
  };

  const loadVinculos = async (gerenteId: string) => {
    if (!estabelecimentoId) return;
    const { data: vv } = await supabase
      .from("gerente_vendedores")
      .select("id, vendedor_empresa_id")
      .eq("gerente_usuario_id", gerenteId)
      .eq("estabelecimento_id", estabelecimentoId);
    setVinculosVendedores(vv || []);

    const { data: ve } = await supabase
      .from("empresa_vinculos")
      .select("id, empresa_id")
      .eq("usuario_id", gerenteId)
      .eq("estabelecimento_id", estabelecimentoId)
      .is("vendedor_id", null)
      .is("transportadora_id", null);
    setVinculosEmpresas(ve || []);
  };

  const adicionarVendedores = async () => {
    if (!editing || !estabelecimentoId || novosVendedores.length === 0) return;
    const rows = novosVendedores.map(vid => ({
      gerente_usuario_id: editing.id,
      vendedor_empresa_id: vid,
      estabelecimento_id: estabelecimentoId,
    }));
    const { error } = await supabase.from("gerente_vendedores").insert(rows);
    if (error) { toast.error("Erro: " + error.message); return; }
    toast.success("Vendedores vinculados!");
    setNovosVendedores([]);
    await loadVinculos(editing.id);
  };

  const removerVendedor = async (id: string) => {
    const { error } = await supabase.from("gerente_vendedores").delete().eq("id", id);
    if (error) { toast.error("Erro: " + error.message); return; }
    toast.success("Vínculo removido");
    if (editing) await loadVinculos(editing.id);
  };

  const adicionarEmpresas = async () => {
    if (!editing || !estabelecimentoId || novasEmpresas.length === 0) return;
    const rows = novasEmpresas.map(eid => ({
      empresa_id: eid,
      usuario_id: editing.id,
      segmento_id: null,
      vendedor_id: null,
      transportadora_id: null,
      estabelecimento_id: estabelecimentoId,
    }));
    const { error } = await supabase.from("empresa_vinculos").insert(rows);
    if (error) { toast.error("Erro: " + error.message); return; }
    toast.success("Empresas vinculadas!");
    setNovasEmpresas([]);
    await loadVinculos(editing.id);
  };

  const removerEmpresa = async (id: string) => {
    const { error } = await supabase.from("empresa_vinculos").delete().eq("id", id);
    if (error) { toast.error("Erro: " + error.message); return; }
    toast.success("Vínculo removido");
    if (editing) await loadVinculos(editing.id);
  };

  const filtrados = gerentes.filter(g => {
    const q = searchTerm.toLowerCase();
    return !q || g.nome.toLowerCase().includes(q) || g.email.toLowerCase().includes(q);
  });

  const idsVend = new Set(vinculosVendedores.map(v => v.vendedor_empresa_id));
  const idsEmp = new Set(vinculosEmpresas.map(v => v.empresa_id));

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-primary/15 text-primary flex items-center justify-center">
          <UserCog className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight">Gerentes</h1>
          <p className="text-muted-foreground text-sm">
            Usuários do tipo <strong>Gerente</strong>. Para criar ou editar cadastro, use Configurações → Usuários.
          </p>
        </div>
      </div>

      <Card className="p-4 border-info/30 bg-info/5 flex items-start gap-3">
        <Info className="h-4 w-4 text-primary mt-0.5" />
        <p className="text-sm text-muted-foreground">
          Esta tela mostra apenas usuários com tipo <strong>Gerente</strong>. Ajuste o tipo no cadastro de usuário
          (Configurações → Usuários) para que apareçam aqui. Nesta tela você gerencia os vendedores e empresas
          sob responsabilidade de cada gerente.
        </p>
      </Card>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <Badge variant="secondary">{filtrados.length} gerente(s)</Badge>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Telefone</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtrados.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                  Nenhum gerente encontrado.
                </TableCell>
              </TableRow>
            ) : (
              filtrados.map(g => (
                <TableRow key={g.id}>
                  <TableCell className="font-medium">{g.nome}</TableCell>
                  <TableCell>{g.email}</TableCell>
                  <TableCell>{g.telefone || "-"}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => openDetails(g)}>
                      <Pencil className="h-4 w-4 mr-2" />
                      Gerenciar vínculos
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      <Sheet open={showForm} onOpenChange={(o) => { if (!o) { setShowForm(false); setEditing(null); } }}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <UserCog className="h-5 w-5" />
              {editing?.nome}
            </SheetTitle>
          </SheetHeader>

          <Tabs defaultValue="vendedores" className="mt-6">
            <TabsList>
              <TabsTrigger value="vendedores">Vendedores</TabsTrigger>
              <TabsTrigger value="empresas">Empresas</TabsTrigger>
            </TabsList>

            <TabsContent value="vendedores" className="space-y-4 mt-4">
              <Card className="border-primary/20 bg-primary/5">
                <CardContent className="p-4 space-y-3">
                  <h4 className="text-sm font-semibold">Adicionar vendedores</h4>
                  <div className="space-y-1 max-h-[220px] overflow-y-auto border rounded-lg p-2 bg-background">
                    {vendedoresLista.filter(v => !idsVend.has(v.id)).length === 0 && (
                      <p className="text-xs text-muted-foreground p-2">Todos os vendedores já foram vinculados.</p>
                    )}
                    {vendedoresLista.filter(v => !idsVend.has(v.id)).map(v => (
                      <div key={v.id} className="flex items-center space-x-2 p-1.5 hover:bg-accent/50 rounded">
                        <Checkbox
                          id={`v-${v.id}`}
                          checked={novosVendedores.includes(v.id)}
                          onCheckedChange={(c) => {
                            if (c) setNovosVendedores([...novosVendedores, v.id]);
                            else setNovosVendedores(novosVendedores.filter(x => x !== v.id));
                          }}
                        />
                        <label htmlFor={`v-${v.id}`} className="text-sm cursor-pointer flex-1">
                          {v.nome_fantasia || v.nome}
                        </label>
                      </div>
                    ))}
                  </div>
                  <Button size="sm" className="w-full" onClick={adicionarVendedores} disabled={novosVendedores.length === 0}>
                    <Plus className="h-4 w-4 mr-2" /> Vincular selecionados
                  </Button>
                </CardContent>
              </Card>

              <div>
                <h4 className="text-sm font-semibold mb-2">Vendedores vinculados ({vinculosVendedores.length})</h4>
                {vinculosVendedores.length === 0 ? (
                  <div className="p-4 border rounded-lg bg-muted/30 text-center">
                    <p className="text-sm text-muted-foreground">Nenhum vendedor vinculado</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {vinculosVendedores.map(v => {
                      const vend = vendedoresLista.find(x => x.id === v.vendedor_empresa_id);
                      return (
                        <div key={v.id} className="p-3 border rounded-lg bg-muted/30 flex items-center justify-between group">
                          <p className="text-sm font-medium">{vend?.nome_fantasia || vend?.nome || "Vendedor removido"}</p>
                          <Button variant="ghost" size="sm" onClick={() => removerVendedor(v.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="empresas" className="space-y-4 mt-4">
              <Card className="border-primary/20 bg-primary/5">
                <CardContent className="p-4 space-y-3">
                  <h4 className="text-sm font-semibold">Adicionar empresas</h4>
                  <div className="space-y-1 max-h-[220px] overflow-y-auto border rounded-lg p-2 bg-background">
                    {empresasLista.filter(e => !idsEmp.has(e.id)).length === 0 && (
                      <p className="text-xs text-muted-foreground p-2">Nenhuma empresa disponível.</p>
                    )}
                    {empresasLista.filter(e => !idsEmp.has(e.id)).map(e => (
                      <div key={e.id} className="flex items-center space-x-2 p-1.5 hover:bg-accent/50 rounded">
                        <Checkbox
                          id={`e-${e.id}`}
                          checked={novasEmpresas.includes(e.id)}
                          onCheckedChange={(c) => {
                            if (c) setNovasEmpresas([...novasEmpresas, e.id]);
                            else setNovasEmpresas(novasEmpresas.filter(x => x !== e.id));
                          }}
                        />
                        <label htmlFor={`e-${e.id}`} className="text-sm cursor-pointer flex-1">
                          {e.nome_fantasia || e.nome}
                          {e.cnpj && <span className="text-xs text-muted-foreground ml-2">{e.cnpj}</span>}
                        </label>
                      </div>
                    ))}
                  </div>
                  <Button size="sm" className="w-full" onClick={adicionarEmpresas} disabled={novasEmpresas.length === 0}>
                    <Plus className="h-4 w-4 mr-2" /> Vincular selecionadas
                  </Button>
                </CardContent>
              </Card>

              <div>
                <h4 className="text-sm font-semibold mb-2">Empresas vinculadas ({vinculosEmpresas.length})</h4>
                {vinculosEmpresas.length === 0 ? (
                  <div className="p-4 border rounded-lg bg-muted/30 text-center">
                    <p className="text-sm text-muted-foreground">Nenhuma empresa vinculada</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {vinculosEmpresas.map(v => {
                      const emp = empresasLista.find(x => x.id === v.empresa_id);
                      return (
                        <div key={v.id} className="p-3 border rounded-lg bg-muted/30 flex items-center justify-between group">
                          <div>
                            <p className="text-sm font-medium">{emp?.nome_fantasia || emp?.nome || "Empresa removida"}</p>
                            {emp?.cnpj && <p className="text-xs text-muted-foreground">{emp.cnpj}</p>}
                          </div>
                          <Button variant="ghost" size="sm" onClick={() => removerEmpresa(v.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </SheetContent>
      </Sheet>
    </div>
  );
}
