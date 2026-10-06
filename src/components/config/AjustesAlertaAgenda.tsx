import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "@/lib/toast-config";

export function AjustesAlertaAgenda({ estabelecimentoId, tipo, configuracao, onClose, onSaved }: {
  estabelecimentoId: string; tipo: string; configuracao: Record<string, number>;
  onClose: () => void; onSaved: () => void;
}) {
  const [valores, setValores] = useState({ dias_vermelho: configuracao.dias_vermelho ?? 7, dias_laranja: configuracao.dias_laranja ?? 5, dias_amarelo: configuracao.dias_amarelo ?? 3, dias_verde: configuracao.dias_verde ?? 0 });
  const [salvando, setSalvando] = useState(false);
  const salvar = async () => {
    setSalvando(true);
    const { error } = await supabase.from("calendario_regras").update({ configuracao: { ...configuracao, ...valores }, updated_at: new Date().toISOString() }).eq("estabelecimento_id", estabelecimentoId).eq("tipo", tipo);
    setSalvando(false);
    if (error) { toast.error("Não foi possível salvar os níveis de alerta"); return; }
    toast.success("Níveis de alerta salvos");
    onSaved(); onClose();
  };
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Alerta de tarefas urgentes</DialogTitle><DialogDescription>Dias de atraso para cada nível de alerta.</DialogDescription></DialogHeader>
        <div className="space-y-4">
          {([
            ["dias_vermelho", "Vermelho — mais crítico"], ["dias_laranja", "Laranja"], ["dias_amarelo", "Amarelo"], ["dias_verde", "Verde — em dia"],
          ] as const).map(([campo, titulo]) => (
            <div key={campo} className="space-y-1.5"><Label htmlFor={campo}>{titulo}</Label><Input id={campo} type="number" min={0} disabled={campo === "dias_verde"} value={valores[campo]} onChange={(e) => setValores((v) => ({ ...v, [campo]: Math.max(0, Number(e.target.value) || 0) }))} /></div>
          ))}
        </div>
        <DialogFooter><Button variant="outline" onClick={onClose}>Cancelar</Button><Button onClick={salvar} disabled={salvando}>Salvar ajustes</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}