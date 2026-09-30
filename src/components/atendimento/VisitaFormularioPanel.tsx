import { useEffect, useState } from "react";
import { ClipboardList, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getUserIdFromAuth } from "@/lib/estabelecimentoUtils";
import { marcarPendencia } from "@/lib/atendimento/finalizarAtendimento";
import { toast } from "@/lib/toast-config";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Campo = { id: string; chave: string; rotulo: string; tipo: string; obrigatorio: boolean; opcoes: string[] | null; placeholder: string | null };
type Formulario = { id: string; nome: string; descricao: string | null };

export function VisitaFormularioPanel({ customerId, estabelecimentoId }: { customerId: string; estabelecimentoId: string }) {
  const [formularios, setFormularios] = useState<Formulario[]>([]);
  const [formularioId, setFormularioId] = useState("");
  const [campos, setCampos] = useState<Campo[]>([]);
  const [respostas, setRespostas] = useState<Record<string, unknown>>({});
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    let ativo = true;
    setCarregando(true);
    setFormularioId(""); setRespostas({}); setCampos([]);
    void supabase.from("visita_formularios").select("id, nome, descricao")
      .eq("estabelecimento_id", estabelecimentoId).eq("ativo", true).order("nome")
      .then(({ data, error }) => {
        if (!ativo) return;
        if (error) toast.error("Não foi possível carregar os formulários de visita");
        setFormularios(data ?? []);
        setCarregando(false);
      });
    return () => { ativo = false; };
  }, [customerId, estabelecimentoId]);

  useEffect(() => {
    if (!formularioId) return;
    let ativo = true;
    setCampos([]); setRespostas({});
    void supabase.from("visita_formulario_campos").select("id, chave, rotulo, tipo, obrigatorio, opcoes, placeholder")
      .eq("formulario_id", formularioId).order("ordem")
      .then(({ data, error }) => {
        if (!ativo) return;
        if (error) toast.error("Não foi possível carregar os campos");
        setCampos((data ?? []) as Campo[]);
      });
    return () => { ativo = false; };
  }, [formularioId]);

  const setValor = (chave: string, valor: unknown) => setRespostas(prev => ({ ...prev, [chave]: valor }));

  const salvar = async () => {
    if (!formularioId || !estabelecimentoId) return;
    for (const campo of campos) {
      const valor = respostas[campo.chave];
      if (campo.obrigatorio && (valor == null || valor === "" || (Array.isArray(valor) && valor.length === 0))) {
        toast.error(`Campo obrigatório: ${campo.rotulo}`);
        return;
      }
      if (campo.tipo !== "foto" && typeof valor === "string" && valor.length > 1000) {
        toast.error(`${campo.rotulo}: limite de 1000 caracteres`);
        return;
      }
    }
    setSalvando(true);
    try {
      const usuarioId = await getUserIdFromAuth();
      if (!usuarioId) throw new Error("Usuário não encontrado");
      const { data: vinculo, error: vinculoErro } = await supabase.from("customer_empresas")
        .select("empresa_id").eq("customer_id", customerId).limit(1).maybeSingle();
      if (vinculoErro) throw vinculoErro;
      const { error } = await supabase.from("visita_formulario_respostas").insert({
        estabelecimento_id: estabelecimentoId,
        empresa_id: vinculo?.empresa_id ?? null,
        formulario_id: formularioId,
        preenchido_por: usuarioId,
        origem_preenchimento: "visita",
        respostas: respostas as Record<string, string | number | boolean | string[] | null>,
      });
      if (error) throw error;
      marcarPendencia(customerId);
      setRespostas({});
      toast.success("Formulário da visita salvo");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível salvar o formulário");
    } finally { setSalvando(false); }
  };

  const formulario = formularios.find(f => f.id === formularioId);
  return <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-4">
    <div className="flex items-center gap-2 text-sm font-semibold"><ClipboardList className="h-4 w-4 text-primary" /> Formulário da visita</div>
    {carregando ? <p className="text-sm text-muted-foreground">Carregando formulários...</p> : formularios.length === 0 ?
      <p className="text-sm text-muted-foreground">Nenhum formulário de visita ativo.</p> : <>
        <div className="space-y-1.5">
          <Label htmlFor="formulario-visita">Formulário</Label>
          <Select value={formularioId} onValueChange={setFormularioId}>
            <SelectTrigger id="formulario-visita"><SelectValue placeholder="Selecione um formulário" /></SelectTrigger>
            <SelectContent>{formularios.map(f => <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        {formulario?.descricao && <p className="text-sm text-muted-foreground">{formulario.descricao}</p>}
        {campos.map(c => {
          const valor = respostas[c.chave];
          const texto = typeof valor === "string" || typeof valor === "number" ? String(valor) : "";
          return <div key={c.id} className="space-y-1.5">
            <Label htmlFor={`visita-${c.id}`}>{c.rotulo}{c.obrigatorio && <span className="text-destructive"> *</span>}</Label>
            {c.tipo === "textarea" || c.tipo === "assinatura" ?
              <Textarea id={`visita-${c.id}`} maxLength={1000} value={texto} onChange={e => setValor(c.chave, e.target.value)} placeholder={c.placeholder ?? ""} /> :
              c.tipo === "booleano" ? <Switch id={`visita-${c.id}`} checked={valor === true} onCheckedChange={v => setValor(c.chave, v)} /> :
              c.tipo === "selecao" ? <Select value={texto} onValueChange={v => setValor(c.chave, v)}><SelectTrigger id={`visita-${c.id}`}><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent>{(c.opcoes ?? []).map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select> :
              c.tipo === "multi" ? <div className="flex flex-wrap gap-3">{(c.opcoes ?? []).map(o => <label key={o} className="flex items-center gap-2 text-sm"><Checkbox checked={Array.isArray(valor) && valor.includes(o)} onCheckedChange={checked => { const atual = Array.isArray(valor) ? valor as string[] : []; setValor(c.chave, checked ? [...atual, o] : atual.filter(v => v !== o)); }} />{o}</label>)}</div> :
              c.tipo === "localizacao" ? <Button type="button" variant="outline" onClick={() => navigator.geolocation.getCurrentPosition(p => setValor(c.chave, `${p.coords.latitude},${p.coords.longitude}`), () => toast.error("Não foi possível obter a localização"))}>{texto || "Capturar localização"}</Button> :
              c.tipo === "foto" ? <Input id={`visita-${c.id}`} type="file" accept="image/*" capture="environment" onChange={e => { const file = e.target.files?.[0]; if (!file) return; if (file.size > 2_000_000) { toast.error("Imagem deve ter até 2 MB"); return; } const reader = new FileReader(); reader.onload = () => setValor(c.chave, reader.result); reader.readAsDataURL(file); }} /> :
              <Input id={`visita-${c.id}`} type={c.tipo === "numero" || c.tipo === "nota" ? "number" : c.tipo === "data" ? "date" : c.tipo === "hora" ? "time" : "text"} min={c.tipo === "nota" ? 0 : undefined} max={c.tipo === "nota" ? 10 : undefined} maxLength={1000} value={texto} onChange={e => setValor(c.chave, e.target.value)} placeholder={c.placeholder ?? ""} />}
          </div>;
        })}
        {formularioId && <Button onClick={() => void salvar()} disabled={salvando || campos.length === 0} className="gap-2">{salvando && <Loader2 className="h-4 w-4 animate-spin" />}Salvar formulário</Button>}
      </>}
  </div>;
}