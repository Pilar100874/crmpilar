import React, { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getEstabelecimentoId, getUserIdFromAuth } from "@/lib/estabelecimentoUtils";

interface Props {
  ocorrenciaId: string | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSaved?: () => void;
}

export const VisitaFormularioSheet: React.FC<Props> = ({ ocorrenciaId, open, onOpenChange, onSaved }) => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formulario, setFormulario] = useState<any>(null);
  const [campos, setCampos] = useState<any[]>([]);
  const [obrigatorio, setObrigatorio] = useState(false);
  const [respostas, setRespostas] = useState<Record<string, any>>({});

  useEffect(() => {
    if (!open || !ocorrenciaId) return;
    (async () => {
      setLoading(true); setFormulario(null); setCampos([]); setRespostas({});
      const { data, error } = await supabase.functions.invoke("resolver-formulario-visita", {
        body: { ocorrencia_id: ocorrenciaId },
      });
      if (error) { toast.error(error.message); setLoading(false); return; }
      setFormulario(data?.formulario || null);
      setCampos(data?.campos || []);
      setObrigatorio(!!data?.obrigatorio);
      setLoading(false);
    })();
  }, [open, ocorrenciaId]);

  function setV(chave: string, valor: any) {
    setRespostas(r => ({ ...r, [chave]: valor }));
  }

  async function salvar() {
    if (!ocorrenciaId || !formulario) return;
    // Valida obrigatórios
    for (const c of campos) {
      if (c.obrigatorio) {
        const v = respostas[c.chave];
        if (v == null || v === "" || (Array.isArray(v) && v.length === 0)) {
          toast.error(`Campo obrigatório: ${c.rotulo}`); return;
        }
      }
    }
    setSaving(true);
    const estabId = await getEstabelecimentoId();
    const uid = await getUserIdFromAuth();
    let lat: number | null = null, lng: number | null = null;
    try {
      const pos = await new Promise<GeolocationPosition>((res, rej) =>
        navigator.geolocation.getCurrentPosition(res, rej, { timeout: 4000 }));
      lat = pos.coords.latitude; lng = pos.coords.longitude;
    } catch {}
    const { error } = await supabase.from("visita_formulario_respostas").insert({
      estabelecimento_id: estabId,
      ocorrencia_id: ocorrenciaId,
      formulario_id: formulario.id,
      respostas,
      preenchido_por: uid,
      lat, lng,
    });
    if (error) { toast.error(error.message); setSaving(false); return; }
    await supabase.from("visita_ocorrencias").update({ formulario_status: "preenchido" }).eq("id", ocorrenciaId);
    toast.success("Formulário salvo");
    setSaving(false);
    onOpenChange(false);
    onSaved?.();
  }

  function renderCampo(c: any) {
    const v = respostas[c.chave];
    switch (c.tipo) {
      case "textarea":
        return <Textarea value={v || ""} onChange={e => setV(c.chave, e.target.value)} placeholder={c.placeholder || ""} rows={3} />;
      case "numero":
        return <Input type="number" value={v ?? ""} onChange={e => setV(c.chave, e.target.value)} />;
      case "nota":
        return <Input type="number" min={0} max={10} value={v ?? ""} onChange={e => setV(c.chave, e.target.value)} />;
      case "booleano":
        return <Switch checked={!!v} onCheckedChange={val => setV(c.chave, val)} />;
      case "data":
        return <Input type="date" value={v || ""} onChange={e => setV(c.chave, e.target.value)} />;
      case "hora":
        return <Input type="time" value={v || ""} onChange={e => setV(c.chave, e.target.value)} />;
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
      case "foto":
        return (
          <Input type="file" accept="image/*" capture="environment" onChange={async e => {
            const f = e.target.files?.[0]; if (!f) return;
            const reader = new FileReader();
            reader.onload = () => setV(c.chave, reader.result);
            reader.readAsDataURL(f);
          }} />
        );
      case "localizacao":
        return (
          <Button variant="outline" type="button" onClick={() => {
            navigator.geolocation.getCurrentPosition(p => setV(c.chave, `${p.coords.latitude},${p.coords.longitude}`));
          }}>{v ? v : "Capturar localização"}</Button>
        );
      case "assinatura":
        return <Textarea value={v || ""} onChange={e => setV(c.chave, e.target.value)} placeholder="Assinatura / observação" rows={2} />;
      default:
        return <Input value={v || ""} onChange={e => setV(c.chave, e.target.value)} placeholder={c.placeholder || ""} />;
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{formulario ? formulario.nome : "Formulário da Visita"}</SheetTitle>
        </SheetHeader>
        {loading && <div className="py-8 text-center text-muted-foreground">Carregando...</div>}
        {!loading && !formulario && (
          <div className="py-8 text-center text-muted-foreground">Nenhum formulário aplicável a esta visita.</div>
        )}
        {!loading && formulario && (
          <div className="space-y-3 py-4">
            {formulario.descricao && <p className="text-sm text-muted-foreground">{formulario.descricao}</p>}
            {campos.map(c => (
              <div key={c.id}>
                <Label>{c.rotulo}{c.obrigatorio && <span className="text-destructive ml-1">*</span>}</Label>
                {renderCampo(c)}
              </div>
            ))}
            {campos.length === 0 && <div className="text-sm text-muted-foreground">Formulário sem campos.</div>}
          </div>
        )}
        <SheetFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          {formulario && <Button onClick={salvar} disabled={saving}>{saving ? "Salvando..." : "Salvar"}</Button>}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
};
