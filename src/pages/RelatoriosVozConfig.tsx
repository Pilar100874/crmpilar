import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import { Plus, Pencil, Trash2, Mic, Sparkles, FileBarChart, X } from "lucide-react";
import { getEstabelecimentoId } from "@/lib/estabelecimentoUtils";

type FiltroSchema = {
  chave: string;
  rotulo: string;
  coluna: string;
  tipo: "text" | "number" | "date" | "date_range" | "enum" | "boolean";
  operador?: "eq" | "ilike" | "gte" | "lte" | "in";
  obrigatorio?: boolean;
  opcoes?: string[];
};

type Relatorio = {
  id: string;
  nome: string;
  grupo: string;
  descricao: string | null;
  prompt_geracao: string;
  tipo_saida: "texto" | "tabela" | "grafico" | "misto";
  aliases: string[];
  parametros: any[];
  ativo: boolean;
  tipo_fonte?: "tabela" | "api";
  tabela_base?: string | null;
  api_endpoint_id?: string | null;
  campos_exibicao?: any[];
  filtros_disponiveis?: FiltroSchema[];
  ordenacao?: { coluna?: string; direcao?: "asc" | "desc" };
  limite_padrao?: number;
};

const TIPOS = [
  { v: "texto", l: "Texto / Resumo" },
  { v: "tabela", l: "Tabela" },
  { v: "grafico", l: "Gráfico" },
  { v: "misto", l: "Misto (tabela + gráfico)" },
];

const GRUPOS_SUGERIDOS = ["Vendas", "Financeiro", "Estoque", "Atendimento", "Logística", "RH", "Marketing", "Geral"];

const emptyForm: Omit<Relatorio, "id"> = {
  nome: "", grupo: "Vendas", descricao: "", prompt_geracao: "",
  tipo_saida: "tabela", aliases: [], parametros: [], ativo: true,
  tipo_fonte: "tabela", tabela_base: "", api_endpoint_id: null,
  campos_exibicao: [], filtros_disponiveis: [],
  ordenacao: { coluna: "", direcao: "desc" }, limite_padrao: 100,
};

export default function RelatoriosVozConfig() {
  const [items, setItems] = useState<Relatorio[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Relatorio | null>(null);
  const [form, setForm] = useState<typeof emptyForm>(emptyForm);
  const [aliasInput, setAliasInput] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [filter, setFilter] = useState("");

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("relatorios_voz")
      .select("*")
      .order("grupo").order("nome");
    if (error) toast.error(error.message);
    setItems((data as any) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openNew = () => {
    setEditing(null);
    setForm(emptyForm);
    setAliasInput("");
    setDialogOpen(true);
  };

  const openEdit = (r: Relatorio) => {
    setEditing(r);
    setForm({
      nome: r.nome, grupo: r.grupo, descricao: r.descricao || "",
      prompt_geracao: r.prompt_geracao, tipo_saida: r.tipo_saida,
      aliases: r.aliases || [], parametros: r.parametros || [],
      ativo: r.ativo,
      tipo_fonte: r.tipo_fonte ?? "tabela",
      tabela_base: r.tabela_base ?? "",
      api_endpoint_id: r.api_endpoint_id ?? null,
      campos_exibicao: Array.isArray(r.campos_exibicao) ? r.campos_exibicao : [],
      filtros_disponiveis: Array.isArray(r.filtros_disponiveis) ? r.filtros_disponiveis : [],
      ordenacao: r.ordenacao ?? { coluna: "", direcao: "desc" },
      limite_padrao: r.limite_padrao ?? 100,
    });
    setAliasInput("");
    setDialogOpen(true);
  };

  const addFiltro = () => setForm(f => ({
    ...f,
    filtros_disponiveis: [...(f.filtros_disponiveis || []), {
      chave: `filtro_${(f.filtros_disponiveis?.length || 0) + 1}`,
      rotulo: "", coluna: "", tipo: "text", operador: "ilike", obrigatorio: false, opcoes: [],
    }],
  }));
  const updFiltro = (i: number, patch: Partial<FiltroSchema>) => setForm(f => ({
    ...f,
    filtros_disponiveis: (f.filtros_disponiveis || []).map((x, idx) => idx === i ? { ...x, ...patch } : x),
  }));
  const rmFiltro = (i: number) => setForm(f => ({
    ...f,
    filtros_disponiveis: (f.filtros_disponiveis || []).filter((_, idx) => idx !== i),
  }));

  const addAlias = () => {
    const v = aliasInput.trim().toLowerCase();
    if (!v) return;
    if (form.aliases.includes(v)) { setAliasInput(""); return; }
    setForm(f => ({ ...f, aliases: [...f.aliases, v] }));
    setAliasInput("");
  };

  const removeAlias = (a: string) => {
    setForm(f => ({ ...f, aliases: f.aliases.filter(x => x !== a) }));
  };

  const salvar = async () => {
    if (!form.nome.trim() || !form.prompt_geracao.trim()) {
      toast.error("Nome e prompt são obrigatórios");
      return;
    }
    const estabelecimento_id = await getEstabelecimentoId();
    if (!estabelecimento_id) { toast.error("Estabelecimento não encontrado"); return; }
    const { data: { user } } = await supabase.auth.getUser();

    const payload = {
      ...form,
      estabelecimento_id,
      created_by: user?.id,
    };

    if (editing) {
      const { error } = await supabase.from("relatorios_voz").update(payload).eq("id", editing.id);
      if (error) return toast.error(error.message);
      toast.success("Relatório atualizado");
    } else {
      const { error } = await supabase.from("relatorios_voz").insert(payload);
      if (error) return toast.error(error.message);
      toast.success("Relatório criado");
    }
    setDialogOpen(false);
    load();
  };

  const excluir = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from("relatorios_voz").delete().eq("id", deleteId);
    if (error) return toast.error(error.message);
    toast.success("Excluído");
    setDeleteId(null);
    load();
  };

  const filtered = items.filter(r => {
    if (!filter.trim()) return true;
    const q = filter.toLowerCase();
    return r.nome.toLowerCase().includes(q) ||
      r.grupo.toLowerCase().includes(q) ||
      r.aliases.some(a => a.includes(q));
  });

  const grupos = Array.from(new Set(filtered.map(r => r.grupo))).sort();

  return (
    <div className="p-4 sm:p-6 space-y-4 max-w-6xl mx-auto">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <FileBarChart className="h-6 w-6 text-primary" />
            Relatórios por Voz
          </h1>
          <p className="text-sm text-muted-foreground">
            Cadastre relatórios que o Assistente Pilar poderá gerar quando você disser <b>"relatórios"</b>.
          </p>
        </div>
        <Button onClick={openNew}>
          <Plus className="h-4 w-4 mr-2" /> Novo relatório
        </Button>
      </div>

      <Card>
        <CardContent className="p-3">
          <Input
            placeholder="Filtrar por nome, grupo ou alias…"
            value={filter}
            onChange={e => setFilter(e.target.value)}
          />
        </CardContent>
      </Card>

      {loading ? (
        <div className="text-sm text-muted-foreground">Carregando…</div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            <Sparkles className="h-8 w-8 mx-auto mb-3 opacity-40" />
            <p className="font-medium">Nenhum relatório cadastrado</p>
            <p className="text-xs mt-1">Clique em "Novo relatório" para começar.</p>
          </CardContent>
        </Card>
      ) : (
        grupos.map(g => (
          <Card key={g}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Badge variant="outline">{g}</Badge>
                <span className="text-xs text-muted-foreground font-normal">
                  {filtered.filter(r => r.grupo === g).length} relatório(s)
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {filtered.filter(r => r.grupo === g).map(r => (
                <div key={r.id} className="flex items-start justify-between gap-3 p-3 rounded-lg border hover:bg-muted/40">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium">{r.nome}</span>
                      <Badge variant="secondary" className="text-[10px]">{r.tipo_saida}</Badge>
                      {!r.ativo && <Badge variant="destructive" className="text-[10px]">inativo</Badge>}
                    </div>
                    {r.descricao && (
                      <p className="text-xs text-muted-foreground mt-0.5">{r.descricao}</p>
                    )}
                    {r.aliases.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        <Mic className="h-3 w-3 text-muted-foreground" />
                        {r.aliases.map(a => (
                          <span key={a} className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary">"{a}"</span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" onClick={() => openEdit(r)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => setDeleteId(r.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        ))
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar relatório" : "Novo relatório"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label>Nome*</Label>
                <Input value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
                  placeholder="Ex.: Vendas por vendedor" />
              </div>
              <div>
                <Label>Grupo</Label>
                <Select value={form.grupo} onValueChange={v => setForm(f => ({ ...f, grupo: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {GRUPOS_SUGERIDOS.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Descrição</Label>
              <Input value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))}
                placeholder="Curto resumo do que este relatório mostra" />
            </div>

            <div>
              <Label>Tipo de saída</Label>
              <Select value={form.tipo_saida} onValueChange={(v: any) => setForm(f => ({ ...f, tipo_saida: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TIPOS.map(t => <SelectItem key={t.v} value={t.v}>{t.l}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Prompt de geração*</Label>
              <Textarea rows={5}
                value={form.prompt_geracao}
                onChange={e => setForm(f => ({ ...f, prompt_geracao: e.target.value }))}
                placeholder="Ex.: Traga o total vendido nos últimos 30 dias, agrupado por vendedor, com percentual sobre o total. Inclua um mini gráfico de barras."
              />
              <p className="text-[11px] text-muted-foreground mt-1">
                Descreva exatamente o que a IA deve montar: números, agrupamentos, gráficos, filtros padrão.
              </p>
            </div>

            <div>
              <Label>Aliases de voz</Label>
              <div className="flex gap-2">
                <Input value={aliasInput} onChange={e => setAliasInput(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addAlias(); } }}
                  placeholder="Ex.: vendas por vendedor (Enter para adicionar)" />
                <Button type="button" variant="outline" onClick={addAlias}>Adicionar</Button>
              </div>
              {form.aliases.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {form.aliases.map(a => (
                    <button key={a} onClick={() => removeAlias(a)}
                      className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary hover:bg-destructive/10 hover:text-destructive">
                      "{a}" ✕
                    </button>
                  ))}
                </div>
              )}
              <p className="text-[11px] text-muted-foreground mt-1">
                Frases pelas quais o usuário pode pedir este relatório diretamente por voz.
              </p>
            </div>

            <div className="flex items-center justify-between p-2 rounded border">
              <div>
                <Label>Ativo</Label>
                <p className="text-xs text-muted-foreground">Se desligado, não aparece no assistente de voz.</p>
              </div>
              <Switch checked={form.ativo} onCheckedChange={v => setForm(f => ({ ...f, ativo: v }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={salvar}>{editing ? "Atualizar" : "Criar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DeleteConfirmDialog
        open={!!deleteId}
        onOpenChange={o => !o && setDeleteId(null)}
        onConfirm={excluir}
        title="Excluir relatório?"
        description="Este relatório deixará de estar disponível no Assistente de Voz."
      />
    </div>
  );
}
