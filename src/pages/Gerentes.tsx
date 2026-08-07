import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getEstabelecimentoId } from "@/lib/estabelecimentoUtils";
import { toast } from "@/lib/toast-config";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserCog, Search, Pencil, Plus, Trash2, X, Info } from "lucide-react";
import { CadastroHeader } from "@/components/cadastros/CadastroHeader";
import { CadastroCardList } from "@/components/cadastros/CadastroCardList";

import { FilteredCheckboxList } from "@/components/common/FilteredCheckboxList";

interface Gerente {
  id: string;
  nome: string;
  email: string;
  whatsapp: string | null;
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
  const [vinculosVendedores, setVinculosVendedores] = useState<
    Array<{ vendedor_empresa_id: string; gvId?: string; evId?: string }>
  >([]);
  const [vinculosEmpresas, setVinculosEmpresas] = useState<Array<{ id: string; empresa_id: string }>>([]);
  const [novosVendedores, setNovosVendedores] = useState<string[]>([]);
  const [novasEmpresas, setNovasEmpresas] = useState<string[]>([]);
  const [contagemVendedores, setContagemVendedores] = useState<Record<string, number>>({});


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
      loadContagemVendedores();
    }

  }, [estabelecimentoId]);

  const loadGerentes = async () => {
    if (!estabelecimentoId) return;
    const { data, error } = await supabase
      .from("usuarios")
      .select("id, nome, email, whatsapp")
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
    // Fonte 1: tabela gerente_vendedores (vínculo criado pela tela do gerente)
    const { data: vv } = await supabase
      .from("gerente_vendedores")
      .select("id, vendedor_empresa_id")
      .eq("gerente_usuario_id", gerenteId)
      .eq("estabelecimento_id", estabelecimentoId);

    // Fonte 2: empresa_vinculos (vínculo criado pela tela do vendedor)
    const { data: evVend } = await supabase
      .from("empresa_vinculos")
      .select("id, vendedor_id")
      .eq("usuario_id", gerenteId)
      .eq("estabelecimento_id", estabelecimentoId)
      .not("vendedor_id", "is", null);

    const mapa = new Map<string, { vendedor_empresa_id: string; gvId?: string; evId?: string }>();
    (vv || []).forEach((r: any) => {
      mapa.set(r.vendedor_empresa_id, { vendedor_empresa_id: r.vendedor_empresa_id, gvId: r.id });
    });
    (evVend || []).forEach((r: any) => {
      const atual = mapa.get(r.vendedor_id) || { vendedor_empresa_id: r.vendedor_id };
      mapa.set(r.vendedor_id, { ...atual, evId: r.id });
    });
    setVinculosVendedores(Array.from(mapa.values()));

    const { data: ve } = await supabase
      .from("empresa_vinculos")
      .select("id, empresa_id")
      .eq("usuario_id", gerenteId)
      .eq("estabelecimento_id", estabelecimentoId)
      .is("vendedor_id", null)
      .is("transportadora_id", null);
    setVinculosEmpresas(ve || []);
  };

  const loadContagemVendedores = async () => {
    if (!estabelecimentoId) return;
    const [{ data: gv }, { data: ev }] = await Promise.all([
      supabase
        .from("gerente_vendedores")
        .select("gerente_usuario_id, vendedor_empresa_id")
        .eq("estabelecimento_id", estabelecimentoId),
      supabase
        .from("empresa_vinculos")
        .select("usuario_id, vendedor_id")
        .eq("estabelecimento_id", estabelecimentoId)
        .not("vendedor_id", "is", null)
        .not("usuario_id", "is", null),
    ]);
    const porGerente: Record<string, Set<string>> = {};
    (gv || []).forEach((r: any) => {
      (porGerente[r.gerente_usuario_id] ||= new Set()).add(r.vendedor_empresa_id);
    });
    (ev || []).forEach((r: any) => {
      (porGerente[r.usuario_id] ||= new Set()).add(r.vendedor_id);
    });
    const contagem: Record<string, number> = {};
    Object.entries(porGerente).forEach(([k, v]) => { contagem[k] = v.size; });
    setContagemVendedores(contagem);
  };

  const adicionarVendedores = async () => {
    if (!editing || !estabelecimentoId || novosVendedores.length === 0) return;

    // Um vendedor só pode ter 1 gerente: verifica se já pertence a outro
    const { data: jaVinculados } = await supabase
      .from("empresa_vinculos")
      .select("vendedor_id, usuario_id")
      .eq("estabelecimento_id", estabelecimentoId)
      .in("vendedor_id", novosVendedores)
      .not("usuario_id", "is", null);

    const ocupados = (jaVinculados || []).filter((r: any) => r.usuario_id !== editing.id);
    if (ocupados.length > 0) {
      const nomes = ocupados
        .map((r: any) => {
          const v = vendedoresLista.find(x => x.id === r.vendedor_id);
          return v?.nome_fantasia || v?.nome || "vendedor";
        })
        .join(", ");
      toast.error(`Já possuem outro gerente: ${nomes}. Remova o vínculo atual pela tela do vendedor.`);
      return;
    }

    const permitidos = novosVendedores;
    const gvRows = permitidos.map(vid => ({
      gerente_usuario_id: editing.id,
      vendedor_empresa_id: vid,
      estabelecimento_id: estabelecimentoId,
    }));
    const { error } = await supabase.from("gerente_vendedores").insert(gvRows);
    if (error && !error.message.includes("duplicate")) {
      toast.error("Erro: " + error.message);
      return;
    }

    // Espelha na tela do vendedor (empresa_vinculos)
    const jaEspelhados = new Set((jaVinculados || []).map((r: any) => r.vendedor_id));
    const evRows = permitidos
      .filter(vid => !jaEspelhados.has(vid))
      .map(vid => ({
        empresa_id: vid,
        usuario_id: editing.id,
        segmento_id: null,
        vendedor_id: vid,
        transportadora_id: null,
        estabelecimento_id: estabelecimentoId,
      }));
    if (evRows.length > 0) {
      const { error: evErr } = await supabase.from("empresa_vinculos").insert(evRows);
      if (evErr && !evErr.message.includes("duplicate")) {
        toast.error("Erro ao espelhar vínculo: " + evErr.message);
      }
    }

    toast.success("Vendedores vinculados!");
    setNovosVendedores([]);
    await loadVinculos(editing.id);
    await loadContagemVendedores();
  };

  const removerVendedor = async (v: { gvId?: string; evId?: string }) => {
    if (v.gvId) {
      const { error } = await supabase.from("gerente_vendedores").delete().eq("id", v.gvId);
      if (error) { toast.error("Erro: " + error.message); return; }
    }
    if (v.evId) {
      const { error } = await supabase.from("empresa_vinculos").delete().eq("id", v.evId);
      if (error) { toast.error("Erro: " + error.message); return; }
    }
    toast.success("Vínculo removido");
    if (editing) await loadVinculos(editing.id);
    await loadContagemVendedores();
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

  if (showForm && editing) {
    return (
      <div className="flex-1 flex flex-col h-full bg-gradient-to-br from-background to-muted/20">
        <div className="border-b bg-card/80 backdrop-blur-sm px-4 sm:px-8 py-4 sm:py-6">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => { setShowForm(false); setEditing(null); }}
              className="hover:bg-accent/50"
            >
              <X className="w-5 h-5" />
            </Button>
            <div className="h-10 w-10 rounded-lg bg-primary/15 text-primary flex items-center justify-center">
              <UserCog className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl sm:text-2xl font-light tracking-tight text-foreground truncate">
                {editing.nome}
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 truncate">{editing.email}</p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-4 sm:p-8">
          <Tabs defaultValue="vendedores" className="w-full max-w-4xl mx-auto">
            <TabsList className="bg-muted/30 border border-border/40 p-1 rounded-lg mb-6">
              <TabsTrigger value="vendedores" className="data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-md">
                Vendedores
              </TabsTrigger>
              <TabsTrigger value="empresas" className="data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-md">
                Empresas
              </TabsTrigger>
            </TabsList>

            <TabsContent value="vendedores" className="space-y-4 mt-4">
              <Card className="border-primary/20 bg-primary/5">
                <CardContent className="p-4 space-y-3">
                  <h4 className="text-sm font-semibold">Adicionar vendedores</h4>
                  <FilteredCheckboxList
                    idPrefix="v"
                    items={vendedoresLista
                      .filter((v) => !idsVend.has(v.id))
                      .map((v) => {
                        const label = v.nome_fantasia || v.nome;
                        const extra = v.nome_fantasia && v.nome && v.nome_fantasia !== v.nome ? v.nome : undefined;
                        return {
                          id: v.id,
                          label,
                          extra,
                          searchableText: `${v.nome_fantasia || ""} ${v.nome || ""}`.trim(),
                        };
                      })}
                    selected={novosVendedores}
                    onToggle={(id, checked) =>
                      setNovosVendedores(
                        checked
                          ? [...novosVendedores, id]
                          : novosVendedores.filter((x) => x !== id)
                      )
                    }
                    searchPlaceholder="Buscar vendedor por nome ou nome fantasia..."
                    emptyText="Todos os vendedores já foram vinculados."
                    maxHeightClass="max-h-[260px]"
                  />
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
                        <div key={v.vendedor_empresa_id} className="p-3 border rounded-lg bg-muted/30 flex items-center justify-between group">
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{vend?.nome_fantasia || vend?.nome || "Vendedor removido"}</p>
                            {vend?.cnpj && <p className="text-xs text-muted-foreground">{vend.cnpj}</p>}
                            {!v.gvId && (
                              <p className="text-[11px] text-muted-foreground mt-0.5">Vinculado pela tela do vendedor</p>
                            )}
                          </div>
                          <Button variant="ghost" size="sm" onClick={() => removerVendedor(v)}>
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
                  <FilteredCheckboxList
                    idPrefix="e"
                    items={empresasLista
                      .filter((e) => !idsEmp.has(e.id))
                      .map((e) => ({
                        id: e.id,
                        label: e.nome_fantasia || e.nome,
                        extra: e.cnpj || undefined,
                      }))}
                    selected={novasEmpresas}
                    onToggle={(id, checked) =>
                      setNovasEmpresas(
                        checked
                          ? [...novasEmpresas, id]
                          : novasEmpresas.filter((x) => x !== id)
                      )
                    }
                    searchPlaceholder="Buscar empresa por nome ou CNPJ..."
                    emptyText="Nenhuma empresa disponível."
                    maxHeightClass="max-h-[260px]"
                  />
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
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-gradient-to-br from-background to-muted/20">

        <CadastroHeader
          icon={UserCog}
          title="Gerentes"
          subtitle="Gerencie os vendedores e empresas sob responsabilidade de cada gerente"
          stats={[
            { label: filtrados.length === 1 ? "gerente" : "gerentes", value: filtrados.length, tone: "primary" },
          ]}
          toolbar={
            <>
              <div className="flex-1 min-w-0">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar gerentes..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 h-9 sm:h-10 rounded-xl border-border/50 focus-visible:ring-1 bg-background text-sm"
                  />
                </div>
              </div>

              {searchTerm && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSearchTerm("")}
                  className="gap-2 text-muted-foreground hover:text-foreground h-9 px-3"
                >
                  <X className="w-4 h-4" />
                  <span className="hidden sm:inline">Limpar</span>
                </Button>
              )}
            </>
          }
        />



        <div className="flex-1 overflow-auto p-3 sm:p-4 md:p-6 space-y-4">
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="p-3 sm:p-4 flex items-start gap-3">
              <Info className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
              <p className="text-xs sm:text-sm text-muted-foreground">
                Esta tela mostra apenas usuários com tipo <strong>Gerente</strong>. Para criar ou editar o cadastro,
                acesse <strong>Configurações → Usuários</strong>.
              </p>
            </CardContent>
          </Card>

          {filtrados.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center px-4">
                <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-muted/30 flex items-center justify-center mx-auto mb-3 sm:mb-4">
                  <UserCog className="w-6 h-6 sm:w-8 sm:h-8 text-muted-foreground/50" />
                </div>
                <p className="text-base sm:text-lg font-light text-foreground mb-2">Nenhum gerente encontrado</p>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Defina o tipo "Gerente" no cadastro de usuários para que apareçam aqui
                </p>
              </div>
            </div>
          ) : (
            <>
            <CadastroCardList
              className="lg:hidden"
              items={filtrados.map(g => ({
                id: g.id,
                title: g.nome,
                subtitle: g.email,
                badge: (
                  <span className="inline-flex items-center rounded-full bg-primary/10 text-primary px-2.5 py-0.5 text-xs font-medium">
                    {contagemVendedores[g.id] || 0} vend.
                  </span>
                ),
                fields: [{ label: "Telefone", value: g.whatsapp || "-", full: true }],
                actions: (
                  <Button variant="outline" size="sm" onClick={() => openDetails(g)} className="gap-1.5 h-8 rounded-full border-primary/20">
                    <Pencil className="h-3.5 w-3.5" />
                    <span className="text-xs">Vínculos</span>
                  </Button>
                ),
              }))}
            />

            <div className="hidden lg:block bg-card rounded-2xl border border-border/40 shadow-lg overflow-x-auto relative">
              <table className="w-full table-fixed">

                <thead className="border-b border-border/40 bg-muted/40 backdrop-blur-sm">
                  <tr>
                    <th className="text-center px-3 sm:px-4 py-2.5 sm:py-3.5 font-semibold text-xs uppercase tracking-wider text-foreground sticky left-0 z-30 bg-muted border-r border-border shadow-[4px_0_10px_-4px_hsl(var(--foreground)/0.18)]" style={{ width: 120, minWidth: 120 }}>
                      Ações
                    </th>
                    <th className="text-left px-3 sm:px-4 py-2.5 sm:py-3.5 font-semibold text-xs uppercase tracking-wider text-muted-foreground/80">Nome</th>
                    <th className="text-left px-3 sm:px-4 py-2.5 sm:py-3.5 font-semibold text-xs uppercase tracking-wider text-muted-foreground/80">E-mail</th>
                    <th className="text-left px-3 sm:px-4 py-2.5 sm:py-3.5 font-semibold text-xs uppercase tracking-wider text-muted-foreground/80">Telefone</th>
                    <th className="text-left px-3 sm:px-4 py-2.5 sm:py-3.5 font-semibold text-xs uppercase tracking-wider text-muted-foreground/80" style={{ width: 130 }}>Vendedores</th>
                  </tr>
                </thead>
                <tbody>
                  {filtrados.map(g => (
                    <tr key={g.id} className="border-b border-border/30 hover:bg-muted/40 transition-colors duration-150 group">
                      <td className="p-2 sm:p-3 sticky left-0 z-20 bg-card group-hover:bg-muted border-r border-border shadow-[4px_0_10px_-4px_hsl(var(--foreground)/0.18)] text-center transition-colors duration-150 whitespace-nowrap" style={{ width: 120, minWidth: 120 }}>
                        <Button variant="outline" size="sm" onClick={() => openDetails(g)} className="gap-1.5 h-8 rounded-full hover:bg-primary hover:text-primary-foreground border-primary/20">
                          <Pencil className="h-3.5 w-3.5" />
                          <span className="hidden sm:inline text-xs">Vínculos</span>
                        </Button>
                      </td>
                      <td className="px-3 sm:px-4 py-3 text-sm font-medium">{g.nome}</td>
                      <td className="px-3 sm:px-4 py-3 text-sm text-muted-foreground">{g.email}</td>
                      <td className="px-3 sm:px-4 py-3 text-sm text-muted-foreground">{g.whatsapp || "-"}</td>
                      <td className="px-3 sm:px-4 py-3 text-sm">
                        <span className="inline-flex items-center rounded-full bg-primary/10 text-primary px-2.5 py-0.5 text-xs font-medium">
                          {contagemVendedores[g.id] || 0}
                        </span>
                      </td>

                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            </>

          )}
        </div>
      </div>
  );
}
