import { useEffect, useMemo, useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { extractFillableTokens } from "@/lib/editores/mergeEngine";
import { fetchDynamicOptions, isDynamicOpcoes, parseDynamic } from "@/lib/editores/dynamicOptions";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  html: string;
  values: Record<string, string>;
  onApply: (values: Record<string, string>) => void;
}

export function QuickFillDialog({ open, onOpenChange, html, values, onApply }: Props) {
  const tokens = useMemo(() => extractFillableTokens(html), [html]);
  const [draft, setDraft] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) return;
    const d: Record<string, string> = {};
    tokens.forEach(t => { d[t.raw] = values[t.raw] ?? values[t.label] ?? ""; });
    setDraft(d);
  }, [open, tokens, values]);

  const setV = (k: string, v: string) => setDraft(d => ({ ...d, [k]: v }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Preencher campos do formulário</DialogTitle>
          <DialogDescription>
            {tokens.length > 0
              ? `Preencha os ${tokens.length} campo(s). Os valores serão aplicados ao documento.`
              : "Nenhum campo de formulário no documento."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          {tokens.map(tok => {
            const v = draft[tok.raw] ?? "";
            return (
              <div key={tok.raw} className="space-y-1">
                <label className="text-xs font-medium">{tok.label}</label>
                {tok.tipo === "textarea" ? (
                  <Textarea value={v} onChange={e => setV(tok.raw, e.target.value)} rows={3} />
                ) : tok.tipo === "data" ? (
                  <Input type="date" value={v} onChange={e => setV(tok.raw, e.target.value)} />
                ) : tok.tipo === "numero" ? (
                  <Input type="number" value={v} onChange={e => setV(tok.raw, e.target.value)} />
                ) : tok.tipo === "check" ? (
                  <div className="flex items-center gap-2">
                    <Checkbox checked={v === "true"} onCheckedChange={ck => setV(tok.raw, ck ? "true" : "")} />
                    <span className="text-xs text-muted-foreground">{v === "true" ? "Marcado" : "Desmarcado"}</span>
                  </div>
                ) : tok.tipo === "lista" ? (
                  <Select value={v} onValueChange={(nv) => setV(tok.raw, nv)}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      {(tok.opcoes || []).map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                    </SelectContent>
                  </Select>
                ) : tok.tipo === "radio" ? (
                  <div className="flex flex-wrap gap-3">
                    {(tok.opcoes || []).map(o => (
                      <label key={o} className="flex items-center gap-1 text-sm">
                        <input type="radio" name={tok.raw} checked={v === o} onChange={() => setV(tok.raw, o)} />
                        {o}
                      </label>
                    ))}
                  </div>
                ) : (
                  <Input value={v} onChange={e => setV(tok.raw, e.target.value)} />
                )}
              </div>
            );
          })}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button
            disabled={tokens.length === 0}
            onClick={() => { onApply(draft); onOpenChange(false); }}
          >
            Aplicar no documento
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
