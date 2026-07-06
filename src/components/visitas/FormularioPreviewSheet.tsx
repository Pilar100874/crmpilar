import React, { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Eye, RefreshCw } from "lucide-react";
import { toast } from "sonner";

export interface CampoPreview {
  id?: string;
  tipo: string;
  rotulo: string;
  chave?: string;
  obrigatorio: boolean;
  ordem?: number;
  opcoes?: string[] | null;
  placeholder?: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  nome: string;
  descricao?: string;
  campos: CampoPreview[];
}

export const FormularioPreviewSheet: React.FC<Props> = ({ open, onOpenChange, nome, descricao, campos }) => {
  const [values, setValues] = useState<Record<string, any>>({});

  function setV(k: string, v: any) { setValues(o => ({ ...o, [k]: v })); }
  function reset() { setValues({}); }

  function validar() {
    for (const c of campos) {
      if (c.obrigatorio) {
        const v = values[c.chave || String(c.ordem)];
        if (v == null || v === "" || (Array.isArray(v) && v.length === 0)) {
          toast.error(`Campo obrigatório: ${c.rotulo}`);
          return;
        }
      }
    }
    toast.success("Simulação válida! Todos os campos obrigatórios foram preenchidos.");
    console.log("[Simulação] Respostas:", values);
  }

  function renderCampo(c: CampoPreview, idx: number) {
    const key = c.chave || String(idx);
    const v = values[key];
    switch (c.tipo) {
      case "textarea":
        return <Textarea value={v || ""} onChange={e => setV(key, e.target.value)} rows={3} placeholder={c.placeholder || ""} />;
      case "numero":
        return <Input type="number" value={v ?? ""} onChange={e => setV(key, e.target.value)} placeholder={c.placeholder || ""} />;
      case "nota":
        return <Input type="number" min={0} max={10} value={v ?? ""} onChange={e => setV(key, e.target.value)} placeholder="0 a 10" />;
      case "booleano":
        return (
          <div className="flex items-center gap-2">
            <Switch checked={!!v} onCheckedChange={val => setV(key, val)} />
            <span className="text-sm text-muted-foreground">{v ? "Sim" : "Não"}</span>
          </div>
        );
      case "data":
        return (
          <div className="flex gap-2">
            <Input type="date" value={v || ""} onChange={e => setV(key, e.target.value)} />
            <Button type="button" variant="outline" size="sm" onClick={() => setV(key, new Date().toISOString().slice(0, 10))}>Hoje</Button>
          </div>
        );
      case "hora":
        return (
          <div className="flex gap-2">
            <Input type="time" value={v || ""} onChange={e => setV(key, e.target.value)} />
            <Button type="button" variant="outline" size="sm" onClick={() => { const d = new Date(); setV(key, `${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`); }}>Agora</Button>
          </div>
        );
      case "selecao":
        return (
          <Select value={v || ""} onValueChange={val => setV(key, val)}>
            <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
            <SelectContent>
              {(c.opcoes || []).map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
              {(!c.opcoes || c.opcoes.length === 0) && <div className="p-2 text-xs text-muted-foreground">Sem opções</div>}
            </SelectContent>
          </Select>
        );
      case "multi":
        return (
          <div className="space-y-1">
            {(c.opcoes || []).map(o => (
              <label key={o} className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={(v || []).includes(o)}
                  onCheckedChange={ck => {
                    const arr = new Set<string>(v || []);
                    if (ck) arr.add(o); else arr.delete(o);
                    setV(key, Array.from(arr));
                  }}
                />
                {o}
              </label>
            ))}
            {(!c.opcoes || c.opcoes.length === 0) && <div className="text-xs text-muted-foreground">Sem opções</div>}
          </div>
        );
      case "foto":
        return <Input type="file" accept="image/*" capture="environment" />;
      case "localizacao":
        return (
          <Button variant="outline" type="button" size="sm" onClick={() => {
            navigator.geolocation.getCurrentPosition(
              p => setV(key, `${p.coords.latitude.toFixed(5)},${p.coords.longitude.toFixed(5)}`),
              () => toast.error("Não foi possível obter localização")
            );
          }}>{v || "Capturar localização"}</Button>
        );
      case "assinatura":
        return <Textarea value={v || ""} onChange={e => setV(key, e.target.value)} rows={2} placeholder="Assinatura / observação" />;
      default:
        return <Input value={v || ""} onChange={e => setV(key, e.target.value)} placeholder={c.placeholder || ""} />;
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Eye className="h-4 w-4" /> Simulação: {nome || "Formulário"}
            <Badge variant="secondary" className="text-[10px]">preview</Badge>
          </SheetTitle>
          {descricao && <SheetDescription>{descricao}</SheetDescription>}
          <p className="text-xs text-muted-foreground">
            Visualização de como o formulário aparecerá para o usuário. Nada é salvo.
          </p>
        </SheetHeader>

        <div className="space-y-3 py-4">
          {campos.length === 0 && (
            <div className="text-sm text-muted-foreground text-center py-8">
              Adicione campos para simular o formulário.
            </div>
          )}
          {campos.map((c, i) => (
            <div key={i}>
              <Label>
                {c.rotulo || <span className="italic text-muted-foreground">(sem rótulo)</span>}
                {c.obrigatorio && <span className="text-destructive ml-1">*</span>}
              </Label>
              {renderCampo(c, i)}
            </div>
          ))}
        </div>

        <SheetFooter className="gap-2">
          <Button variant="outline" onClick={reset}>
            <RefreshCw className="h-4 w-4 mr-1" /> Limpar
          </Button>
          <Button onClick={validar}>Validar simulação</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
};
