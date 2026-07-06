import React, { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getEstabelecimentoId, getUserIdFromAuth } from "@/lib/estabelecimentoUtils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ClipboardList, Plus, FileText, Eye } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Props {
  empresaId: string;
}

export const EmpresaFormulariosTab: React.FC<Props> = ({ empresaId }) => {
  const [respostas, setRespostas] = useState<any[]>([]);
  const [formularios, setFormularios] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [openNew, setOpenNew] = useState(false);
  const [formSel, setFormSel] = useState<string>("");
  const [campos, setCampos] = useState<any[]>([]);
  const [values, setValues] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);
  const [viewResp, setViewResp] = useState<any>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: r }, { data: f }] = await Promise.all([
      supabase.from("visita_formulario_respostas")
        .select("id, respostas, preenchido_em, origem_preenchimento, formulario_id, visita_formularios(nome)")
        .eq("empresa_id", empresaId)
        .order("preenchido_em", { ascending: false }),
      supabase.from("visita_formularios").select("id, nome, descricao").eq("ativo", true).order("nome"),
    ]);
    setRespostas(r || []);
    setFormularios(f || []);
    setLoading(false);
  }, [empresaId]);

  useEffect(() => { if (empresaId) load(); }, [empresaId, load]);

  async function selecionarFormulario(id: string) {
    setFormSel(id);
    setValues({});
    const { data } = await supabase.from("visita_formulario_campos")
      .select("*").eq("formulario_id", id).order("ordem");
    setCampos(data || []);
  }

  function setV(k: string, v: any) { setValues(o => ({ ...o, [k]: v })); }

  async function salvar() {
    if (!formSel) { toast.error("Selecione um formulário"); return; }
    for (const c of campos) {
      if (c.obrigatorio) {
        const v = values[c.chave];
        if (v == null || v === "" || (Array.isArray(v) && v.length === 0)) {
          toast.error(`Campo obrigatório: ${c.rotulo}`); return;
        }
      }
    }
    setSaving(true);
    const estabId = await getEstabelecimentoId();
    const uid = await getUserIdFromAuth();
    const { error } = await supabase.from("visita_formulario_respostas").insert({
      estabelecimento_id: estabId,
      empresa_id: empresaId,
      formulario_id: formSel,
      respostas: values,
      preenchido_por: uid,
      origem_preenchimento: "cadastro_cliente",
    });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Formulário salvo");
    setOpenNew(false); setFormSel(""); setCampos([]); setValues({});
    load();
  }

  function renderCampo(c: any) {
    const v = values[c.chave];
    switch (c.tipo) {
      case "textarea": return <Textarea value={v || ""} onChange={e => setV(c.chave, e.target.value)} rows={3} placeholder={c.placeholder || ""} />;
      case "numero": return <Input type="number" value={v ?? ""} onChange={e => setV(c.chave, e.target.value)} />;
      case "nota": return <Input type="number" min={0} max={10} value={v ?? ""} onChange={e => setV(c.chave, e.target.value)} />;
      case "booleano": return <Switch checked={!!v} onCheckedChange={val => setV(c.chave, val)} />;
      case "data": return <Input type="date" value={v || ""} onChange={e => setV(c.chave, e.target.value)} />;
      case "hora": return <Input type="time" value={v || ""} onChange={e => setV(c.chave, e.target.value)} />;
      case "selecao":
        return (
          <Select value={v || ""} onValueChange={val => setV(c.chave, val)}>
            <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
            <SelectContent>{(c.opcoes || []).map((o: string) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
          </Select>
        );
      case "multi":
        return (
          <div className="space-y-1">
            {(c.opcoes || []).map((o: string) => (
              <label key={o} className="flex items-center gap-2 text-sm">
                <Checkbox checked={(v || []).includes(o)} onCheckedChange={ck => {
                  const arr = new Set<string>(v || []);
                  if (ck) arr.add(o); else arr.delete(o);
                  setV(c.chave, Array.from(arr));
                }} />
                {o}
              </label>
            ))}
          </div>
        );
      default:
        return <Input value={v || ""} onChange={e => setV(c.chave, e.target.value)} placeholder={c.placeholder || ""} />;
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h3 className="font-medium flex items-center gap-2"><ClipboardList className="h-4 w-4" /> Formulários do Cliente</h3>
          <p className="text-xs text-muted-foreground">Respostas de visitas e preenchimentos avulsos.</p>
        </div>
        <Button size="sm" onClick={() => setOpenNew(true)} className="w-full sm:w-auto">
          <Plus className="h-4 w-4 mr-1" /> Preencher Formulário
        </Button>
      </div>

      {loading ? (
        <div className="text-sm text-muted-foreground">Carregando...</div>
      ) : respostas.length === 0 ? (
        <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">
          Nenhum formulário preenchido para este cliente.
        </CardContent></Card>
      ) : (
        <div className="space-y-2">
          {respostas.map(r => (
            <Card key={r.id}>
              <CardContent className="p-3 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-medium text-sm truncate flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                    {r.visita_formularios?.nome || "Formulário"}
                  </div>
                  <div className="text-xs text-muted-foreground flex flex-wrap gap-2 mt-1">
                    <span>{format(new Date(r.preenchido_em), "dd/MM/yyyy HH:mm", { locale: ptBR })}</span>
                    <Badge variant="secondary" className="text-[10px]">
                      {r.origem_preenchimento === "cadastro_cliente" ? "Cadastro" : "Visita"}
                    </Badge>
                  </div>
                </div>
                <Button size="sm" variant="ghost" onClick={() => setViewResp(r)}>
                  <Eye className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Sheet: preencher novo */}
      <Sheet open={openNew} onOpenChange={(o) => { setOpenNew(o); if (!o) { setFormSel(""); setCampos([]); setValues({}); } }}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader><SheetTitle>Preencher Formulário</SheetTitle></SheetHeader>
          <div className="space-y-3 py-4">
            <div>
              <Label>Formulário</Label>
              <Select value={formSel} onValueChange={selecionarFormulario}>
                <SelectTrigger><SelectValue placeholder="Selecione um formulário" /></SelectTrigger>
                <SelectContent>
                  {formularios.map(f => <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {campos.map(c => (
              <div key={c.id}>
                <Label>{c.rotulo}{c.obrigatorio && <span className="text-destructive ml-1">*</span>}</Label>
                {renderCampo(c)}
              </div>
            ))}
            {formSel && campos.length === 0 && <div className="text-sm text-muted-foreground">Formulário sem campos.</div>}
          </div>
          <SheetFooter>
            <Button variant="outline" onClick={() => setOpenNew(false)}>Cancelar</Button>
            <Button onClick={salvar} disabled={saving || !formSel}>{saving ? "Salvando..." : "Salvar"}</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Sheet: visualizar resposta */}
      <Sheet open={!!viewResp} onOpenChange={(o) => !o && setViewResp(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{viewResp?.visita_formularios?.nome || "Resposta"}</SheetTitle>
          </SheetHeader>
          <div className="py-4 space-y-2 text-sm">
            {viewResp && Object.entries(viewResp.respostas || {}).map(([k, v]) => (
              <div key={k} className="border-b pb-2">
                <div className="text-xs text-muted-foreground">{k}</div>
                <div className="break-words">{Array.isArray(v) ? v.join(", ") : String(v ?? "—")}</div>
              </div>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};
