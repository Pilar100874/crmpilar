import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { carregarResponsaveis, listarUsuarios, registrarRecado, type Responsavel, type UrgenciaRecado } from "@/lib/atendimento/recadoResponsavel";

interface Props { open: boolean; onOpenChange: (v: boolean) => void; contatoId: string; contatoNome: string }

export function RecadoResponsavelDialog({ open, onOpenChange, contatoId, contatoNome }: Props) {
  const [responsaveis, setResponsaveis] = useState<Responsavel[]>([]);
  const [outros, setOutros] = useState<Responsavel[]>([]);
  const [responsavelId, setResponsavelId] = useState("");
  const [recado, setRecado] = useState("");
  const [urgencia, setUrgencia] = useState<UrgenciaRecado>("normal");
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (!open) return;
    setRecado(""); setUrgencia("normal");
    void Promise.all([carregarResponsaveis(contatoId), listarUsuarios()]).then(([r, todos]) => {
      setResponsaveis(r);
      const ids = new Set(r.map(x => x.id));
      setOutros(todos.filter(u => !ids.has(u.id)));
      setResponsavelId(r[0]?.id ?? "");
    });
  }, [open, contatoId]);

  const salvar = async () => {
    setSalvando(true);
    try {
      await registrarRecado({ contatoId, contatoNome, responsavelId, recado, urgencia });
      const nome = [...responsaveis, ...outros].find(u => u.id === responsavelId)?.nome;
      toast.success(`Recado enviado para a agenda de ${nome ?? "responsável"}`);
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.message || "Não foi possível registrar o recado");
    } finally { setSalvando(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Anotar recado para o responsável</DialogTitle>
          <DialogDescription>{contatoNome} — o recado vira uma tarefa de retorno na agenda de quem cuida do contato.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label>Responsável</Label>
            <Select value={responsavelId} onValueChange={setResponsavelId}>
              <SelectTrigger><SelectValue placeholder="Escolha quem deve retornar" /></SelectTrigger>
              <SelectContent>
                {responsaveis.map(u => <SelectItem key={u.id} value={u.id}>{u.nome} (responsável)</SelectItem>)}
                {outros.map(u => <SelectItem key={u.id} value={u.id}>{u.nome}</SelectItem>)}
              </SelectContent>
            </Select>
            {!responsaveis.length && <p className="text-xs text-muted-foreground">Este contato não tem responsável vinculado; escolha um usuário.</p>}
          </div>
          <div className="space-y-1">
            <Label>Recado</Label>
            <Textarea rows={4} value={recado} onChange={e => setRecado(e.target.value)} placeholder="Ex.: Cliente ligou pedindo a cotação de cimento." />
          </div>
          <div className="space-y-1">
            <Label>Urgência</Label>
            <div className="flex gap-2">
              <Button type="button" className="flex-1" variant={urgencia === "normal" ? "default" : "outline"} onClick={() => setUrgencia("normal")}>Normal (2 h)</Button>
              <Button type="button" className="flex-1" variant={urgencia === "urgente" ? "destructive" : "outline"} onClick={() => setUrgencia("urgente")}>Urgente (30 min)</Button>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={salvar} disabled={salvando || !recado.trim() || !responsavelId}>{salvando ? "Enviando..." : "Enviar recado"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
