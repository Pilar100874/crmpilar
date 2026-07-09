import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/lib/toast-config";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import { Search, Plus, Pencil, Trash2, GripVertical, FormInput, ChevronRight, ChevronDown } from "lucide-react";
import { serializeFillable, type FillableTipo } from "@/lib/editores/mergeEngine";
import { CNPJ_SUBFIELDS, buildCnpjGroupPayload } from "@/lib/editores/cnpjGroup";
import { CEP_SUBFIELDS, buildCepGroupPayload } from "@/lib/editores/cepGroup";
import { Checkbox } from "@/components/ui/checkbox";

interface CustomField {
  id: string;
  label: string;
  tipo: FillableTipo;
  fonte: "manual" | "tabela";
  opcoes: string[];
  tabela: string | null;
  coluna: string | null;
}

interface Props {
  estabelecimentoId: string | null;
  onInsert: (payload: string) => void;
}

const TIPOS: { value: FillableTipo; label: string; hasOpcoes?: boolean }[] = [
  { value: "texto", label: "Texto curto" },
  { value: "textarea", label: "Texto longo (parágrafo)" },
  { value: "data", label: "Data" },
  { value: "numero", label: "Número" },
  { value: "cnpj", label: "CNPJ (auto-preenche pela Receita)" },
  { value: "cep", label: "CEP (auto-preenche pelo ViaCEP)" },
  { value: "check", label: "Caixa de seleção (checkbox)", hasOpcoes: true },
  { value: "lista", label: "Lista suspensa (select)", hasOpcoes: true },
  { value: "radio", label: "Opções (radio)", hasOpcoes: true },
];

// Campos de sistema (não removíveis, disponíveis para todos os usuários).
const SYSTEM_FIELDS: CustomField[] = [
  { id: "__sys_cnpj__", label: "CNPJ", tipo: "cnpj", fonte: "manual", opcoes: CNPJ_SUBFIELDS.map(s => s.key), tabela: null, coluna: null },
  { id: "__sys_cep__", label: "CEP", tipo: "cep", fonte: "manual", opcoes: CEP_SUBFIELDS.map(s => s.key), tabela: null, coluna: null },
];
const isSystemField = (f: CustomField) => f.id.startsWith("__sys_");

const TABELAS = [
  { value: "customers", label: "Clientes" },
  { value: "empresas", label: "Empresas / Fornecedores" },
  { value: "ponto_funcionarios", label: "Funcionários" },
  { value: "pedidos_ecommerce", label: "Pedidos" },
  { value: "orcamentos", label: "Orçamentos" },
  { value: "produtos", label: "Produtos" },
  { value: "vis_visitors", label: "Visitantes" },
  { value: "veiculos", label: "Veículos" },
];

function buildFieldPayload(f: CustomField): string {
  if (f.tipo === "cnpj") {
    const keys = f.opcoes.length > 0 ? f.opcoes : CNPJ_SUBFIELDS.map(s => s.key);
    return buildCnpjGroupPayload(f.label, keys);
  }
  if (f.tipo === "cep") {
    const keys = f.opcoes.length > 0 ? f.opcoes : CEP_SUBFIELDS.map(s => s.key);
    return buildCepGroupPayload(f.label, keys);
  }
  const tipoFinal: FillableTipo =
    f.tipo === "check" && f.opcoes.length > 0 ? "radio" : f.tipo;
  const opts = f.fonte === "tabela" && f.tabela && f.coluna
    ? [`__DYN__:${f.tabela}:${f.coluna}`]
    : f.opcoes;
  const token = serializeFillable({ tipo: tipoFinal, label: f.label, opcoes: opts });
  return `__FIELD__:${JSON.stringify({
    tipo: tipoFinal, token, label: f.label, opcoes: opts.join(","),
  })}`;
}

export function CamposFormularioSidebar({ estabelecimentoId, onInsert }: Props) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const toggleExpand = (id: string) => setExpanded(prev => {
    const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n;
  });
  const subLabelMap = new Map<string, string>([
    ...CNPJ_SUBFIELDS.map(s => [s.key, s.label] as [string, string]),
    ...CEP_SUBFIELDS.map(s => [s.key, s.label] as [string, string]),
  ]);
  const buildSubPayload = (f: CustomField, key: string) =>
    f.tipo === "cep" ? buildCepGroupPayload(f.label, [key]) : buildCnpjGroupPayload(f.label, [key]);
  const onDragSub = (e: React.DragEvent, f: CustomField, key: string) => {
    const payload = buildSubPayload(f, key);
    e.dataTransfer.setData("application/x-doc-payload", payload);
    e.dataTransfer.setData("text/plain", `${f.label} - ${subLabelMap.get(key) || key}`);
    e.dataTransfer.effectAllowed = "copy";
  };
  const [fields, setFields] = useState<CustomField[]>([]);
  const [busca, setBusca] = useState("");
  const [editing, setEditing] = useState<CustomField | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [toDelete, setToDelete] = useState<CustomField | null>(null);
  const [colunas, setColunas] = useState<string[]>([]);

  const load = async () => {
    if (!estabelecimentoId) return;
    const { data, error } = await supabase
      .from("doc_form_fields")
      .select("id, label, tipo, fonte, opcoes, tabela, coluna")
      .eq("estabelecimento_id", estabelecimentoId)
      .order("label");
    if (error) { toast.error(error.message); return; }
    setFields((data ?? []) as any);
  };
  useEffect(() => { void load(); }, [estabelecimentoId]);

  // Carrega colunas dinamicamente ao trocar tabela no diálogo
  useEffect(() => {
    const tabela = editing?.tabela;
    if (!tabela) { setColunas([]); return; }
    let cancel = false;
    (async () => {
      const { data } = await supabase.from(tabela as any).select("*").limit(1);
      if (cancel) return;
      setColunas(data && data[0] ? Object.keys(data[0]) : []);
    })();
    return () => { cancel = true; };
  }, [editing?.tabela]);

  const filtrados = useMemo(() => {
    const combined = [...SYSTEM_FIELDS, ...fields];
    const q = busca.toLowerCase();
    return q ? combined.filter(f => f.label.toLowerCase().includes(q)) : combined;
  }, [fields, busca]);

  const novo = () => {
    setEditing({ id: "", label: "", tipo: "texto", fonte: "manual", opcoes: [], tabela: null, coluna: null });
    setDialogOpen(true);
  };
  const editar = (f: CustomField) => { setEditing({ ...f }); setDialogOpen(true); };

  const salvar = async () => {
    if (!editing || !estabelecimentoId) return;
    if (!editing.label.trim()) { toast.error("Rótulo obrigatório"); return; }
    const cfg = TIPOS.find(t => t.value === editing.tipo)!;
    if (cfg.hasOpcoes && editing.fonte === "tabela" && (!editing.tabela || !editing.coluna)) {
      toast.error("Escolha tabela e coluna"); return;
    }
    const isCnpj = editing.tipo === "cnpj";
    const isCep = editing.tipo === "cep";
    const isGroup = isCnpj || isCep;
    if (isGroup && editing.opcoes.length === 0) { toast.error("Selecione ao menos um sub-campo"); return; }
    const payload = {
      estabelecimento_id: estabelecimentoId,
      label: editing.label.trim(),
      tipo: editing.tipo,
      fonte: cfg.hasOpcoes ? editing.fonte : "manual",
      opcoes: isGroup ? editing.opcoes : (cfg.hasOpcoes && editing.fonte === "manual" ? editing.opcoes : []),
      tabela: cfg.hasOpcoes && editing.fonte === "tabela" ? editing.tabela : null,
      coluna: cfg.hasOpcoes && editing.fonte === "tabela" ? editing.coluna : null,
    };
    const q = editing.id
      ? supabase.from("doc_form_fields").update(payload).eq("id", editing.id)
      : supabase.from("doc_form_fields").insert(payload);
    const { error } = await q;
    if (error) { toast.error(error.message); return; }
    toast.success("Campo salvo");
    setDialogOpen(false); setEditing(null);
    void load();
  };

  const excluir = async () => {
    if (!toDelete) return;
    const { error } = await supabase.from("doc_form_fields").delete().eq("id", toDelete.id);
    if (error) { toast.error(error.message); return; }
    setToDelete(null);
    void load();
  };

  const onDrag = (e: React.DragEvent, f: CustomField) => {
    const payload = buildFieldPayload(f);
    e.dataTransfer.setData("application/x-doc-payload", payload);
    e.dataTransfer.setData("text/plain", f.label);
    e.dataTransfer.effectAllowed = "copy";
  };

  const cfg = editing ? TIPOS.find(t => t.value === editing.tipo)! : null;

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="p-2 border-b space-y-2 shrink-0">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="h-3.5 w-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar…" className="h-8 pl-7 text-xs" />
          </div>
          <Button size="sm" className="h-8" onClick={novo}><Plus className="h-3.5 w-3.5 mr-1" />Novo</Button>
        </div>
        <p className="text-[10px] text-muted-foreground">Arraste ou clique para inserir no documento.</p>
      </div>

      <ScrollArea className="flex-1 min-h-0">
        <div className="p-2 space-y-1">
          {filtrados.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-4">Nenhum campo personalizado.</p>
          )}
          {filtrados.map(f => {
            const isCnpj = f.tipo === "cnpj";
            const isCep = f.tipo === "cep";
            const isGroup = isCnpj || isCep;
            const isSystem = isSystemField(f);
            const isOpen = expanded.has(f.id);
            const allSubs = isCnpj ? CNPJ_SUBFIELDS : isCep ? CEP_SUBFIELDS : [];
            const subKeys = isGroup ? (f.opcoes.length ? f.opcoes : allSubs.map(s => s.key)) : [];
            return (
              <div key={f.id}>
                <div
                  draggable
                  onDragStart={(e) => onDrag(e, f)}
                  onClick={() => isGroup ? toggleExpand(f.id) : onInsert(buildFieldPayload(f))}
                  className="group flex items-center gap-2 p-2 rounded border bg-card hover:bg-accent cursor-grab active:cursor-grabbing"
                  title={isGroup ? "Clique para ver sub-campos · arraste para inserir todos" : "Arraste para o documento ou clique para inserir"}
                >
                  {isGroup ? (
                    <button type="button" onClick={(e) => { e.stopPropagation(); toggleExpand(f.id); }} className="shrink-0">
                      {isOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                    </button>
                  ) : (
                    <GripVertical className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  )}
                  <FormInput className="h-3.5 w-3.5 text-primary shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium truncate flex items-center gap-1">
                      {f.label}
                      {isSystem && <Badge variant="outline" className="h-4 px-1 text-[9px] border-primary/40 text-primary">sistema</Badge>}
                    </div>
                    <div className="flex items-center gap-1 mt-0.5">
                      <Badge variant="outline" className="h-4 px-1 text-[9px]">{f.tipo}</Badge>
                      {f.fonte === "tabela" && (
                        <Badge variant="secondary" className="h-4 px-1 text-[9px]">
                          {f.tabela}.{f.coluna}
                        </Badge>
                      )}
                      {isGroup && (
                        <Badge variant="secondary" className="h-4 px-1 text-[9px]">{subKeys.length} sub-campos</Badge>
                      )}
                    </div>
                  </div>
                  {!isSystem && (
                    <div className="flex opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button size="icon" variant="ghost" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); editar(f); }}>
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={(e) => { e.stopPropagation(); setToDelete(f); }}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </div>
                {isGroup && isOpen && (
                  <div className="ml-5 mt-1 space-y-0.5 border-l pl-2">
                    {subKeys.map(k => (
                      <div
                        key={k}
                        draggable
                        onDragStart={(e) => onDragSub(e, f, k)}
                        onClick={() => onInsert(buildSubPayload(f, k))}
                        className="flex items-center gap-2 px-2 py-1 rounded hover:bg-accent cursor-grab active:cursor-grabbing"
                        title="Arraste ou clique para inserir apenas este sub-campo"
                      >
                        <GripVertical className="h-3 w-3 text-muted-foreground shrink-0" />
                        <span className="text-[11px] truncate">{subLabelMap.get(k) || k}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </ScrollArea>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Editar campo personalizado" : "Inserir campo personalizado"}</DialogTitle>
            <DialogDescription>Campo reutilizável em qualquer documento do estabelecimento. Arraste ou clique para inserir no editor.</DialogDescription>
          </DialogHeader>
          {editing && (
            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground">Rótulo</label>
                <Input value={editing.label} onChange={e => setEditing({ ...editing, label: e.target.value })} autoFocus />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Tipo</label>
                <Select value={editing.tipo} onValueChange={(v: FillableTipo) => setEditing({
                  ...editing,
                  tipo: v,
                  opcoes:
                    v === "cnpj" && editing.opcoes.length === 0 ? CNPJ_SUBFIELDS.map(s => s.key) :
                    v === "cep" && editing.opcoes.length === 0 ? CEP_SUBFIELDS.map(s => s.key) :
                    editing.opcoes,
                })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TIPOS.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {(editing.tipo === "cnpj" || editing.tipo === "cep") && (() => {
                const subs = editing.tipo === "cnpj" ? CNPJ_SUBFIELDS : CEP_SUBFIELDS;
                const fonte = editing.tipo === "cnpj" ? "Receita" : "ViaCEP";
                const chave = editing.tipo === "cnpj" ? "CNPJ" : "CEP";
                return (
                  <div className="border rounded p-3 space-y-2 bg-muted/20">
                    <div className="text-xs font-medium">Sub-campos do {fonte} a inserir</div>
                    <p className="text-[11px] text-muted-foreground">
                      Ao inserir, cada item vira um campo no documento. No primeiro foco em qualquer um deles, o {chave} será solicitado e todos os campos vazios serão preenchidos automaticamente.
                    </p>
                    <div className="grid grid-cols-2 gap-1.5 max-h-56 overflow-auto">
                      {subs.map(sf => {
                        const checked = editing.opcoes.includes(sf.key);
                        return (
                          <label key={sf.key} className="flex items-center gap-2 text-xs cursor-pointer">
                            <Checkbox
                              checked={checked}
                              onCheckedChange={(v) => {
                                const next = v
                                  ? [...editing.opcoes, sf.key]
                                  : editing.opcoes.filter(k => k !== sf.key);
                                setEditing({ ...editing, opcoes: next });
                              }}
                            />
                            {sf.label}
                          </label>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}
              {cfg?.hasOpcoes && (
                <div className="border rounded p-3 space-y-2 bg-muted/20">
                  <div>
                    <label className="text-xs text-muted-foreground">Fonte das opções</label>
                    <Select value={editing.fonte} onValueChange={(v: "manual" | "tabela") => setEditing({ ...editing, fonte: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="manual">Digitar manualmente</SelectItem>
                        <SelectItem value="tabela">Buscar de uma tabela (tempo real)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {editing.fonte === "manual" ? (
                    <div>
                      <label className="text-xs text-muted-foreground">Opções (separadas por vírgula)</label>
                      <Input
                        value={editing.opcoes.join(", ")}
                        onChange={e => setEditing({ ...editing, opcoes: e.target.value.split(",").map(s => s.trim()).filter(Boolean) })}
                        placeholder="SP, RJ, MG"
                      />
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[11px] text-muted-foreground">Tabela</label>
                        <Select value={editing.tabela ?? ""} onValueChange={(v) => setEditing({ ...editing, tabela: v, coluna: null })}>
                          <SelectTrigger className="h-8"><SelectValue placeholder="Selecionar…" /></SelectTrigger>
                          <SelectContent>
                            {TABELAS.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="text-[11px] text-muted-foreground">Coluna</label>
                        <Select value={editing.coluna ?? ""} onValueChange={(v) => setEditing({ ...editing, coluna: v })} disabled={!editing.tabela}>
                          <SelectTrigger className="h-8"><SelectValue placeholder={editing.tabela ? "Selecionar…" : "Escolha a tabela"} /></SelectTrigger>
                          <SelectContent>
                            {colunas.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={salvar}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DeleteConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        onConfirm={excluir}
        title="Excluir campo"
        description={`Remover "${toDelete?.label}"?`}
      />
    </div>
  );
}
