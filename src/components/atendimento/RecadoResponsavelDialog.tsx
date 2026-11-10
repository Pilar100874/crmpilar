import { useEffect, useState } from "react";
import { MessageSquare, UserPlus, X } from "lucide-react";
import { GlobalClientFilter } from "./GlobalClientFilter";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { carregarResponsaveis, listarUsuarios, registrarRecado, type Responsavel, type UrgenciaRecado } from "@/lib/atendimento/recadoResponsavel";

interface Props { open: boolean; onOpenChange: (v: boolean) => void; contatoId: string; contatoNome: string; embedded?: boolean; onSelecionar?: (id: string, nome: string) => void; onCadastrar?: () => void }

export function RecadoResponsavelDialog({ open, onOpenChange, contatoId, contatoNome, embedded, onSelecionar, onCadastrar }: Props) {
  const [responsaveis, setResponsaveis] = useState<Responsavel[]>([]);
  const [outros, setOutros] = useState<Responsavel[]>([]);
  const [responsavelId, setResponsavelId] = useState("");
  const [recado, setRecado] = useState("");
  const [urgencia, setUrgencia] = useState<UrgenciaRecado>("urgente");
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (!open) return;
    let ativo = true;
    void Promise.all([contatoId ? carregarResponsaveis(contatoId) : Promise.resolve([]), listarUsuarios()]).then(([r, todos]) => {
      if (!ativo) return;
      setResponsaveis(r);
      const ids = new Set(r.map(x => x.id));
      setOutros(todos.filter(u => !ids.has(u.id)));
      setResponsavelId(r[0]?.id ?? "");
    }).catch(() => toast.error("Não foi possível carregar os usuários"));
    return () => { ativo = false; };
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

  const conteudo = <>
        <DialogHeader>
          {embedded ? <h2 className="flex items-center gap-2 text-base font-semibold"><MessageSquare className="h-5 w-5 text-primary" />Encaminhar recado</h2> : <DialogTitle>Encaminhar recado</DialogTitle>}
          {!embedded && <DialogDescription>{contatoNome}</DialogDescription>}
        </DialogHeader>
        <div className="space-y-3">
          {embedded && <div className="space-y-1"><Label>Cliente</Label><div className="flex items-center gap-2"><span className="min-w-0 flex-1 break-words text-sm">{contatoNome || "Selecione o cliente"}</span><GlobalClientFilter compact activeFilter={contatoId ? { type: "customer", id: contatoId, nome: contatoNome } : null} onFilterChange={filtro => {
            if (!filtro) { onSelecionar?.("", ""); return; }
            if (filtro.type === "customer") { onSelecionar?.(filtro.id, filtro.nome); return; }
            void import("@/integrations/supabase/client").then(async ({ supabase }) => {
              const { data, error } = await supabase.from("customer_empresas").select("customer_id, customers:customer_id(nome)").eq("empresa_id", filtro.id).order("is_primary", { ascending: false }).limit(1).maybeSingle();
              if (error || !data?.customer_id) { toast.error("Selecione ou cadastre um contato para esta empresa"); return; }
              onSelecionar?.(data.customer_id, data.customers?.nome || filtro.nome);
            });
          }} /><Button variant="outline" size="icon" title="Cadastrar cliente" aria-label="Cadastrar cliente" onClick={onCadastrar}><UserPlus className="h-4 w-4" /></Button></div></div>}
          <div className="space-y-1">
            <Label>Enviar para</Label>
            <Select value={responsavelId} onValueChange={setResponsavelId}>
              <SelectTrigger><SelectValue placeholder="Escolha quem deve retornar" /></SelectTrigger>
              <SelectContent>
                {responsaveis.map(u => <SelectItem key={u.id} value={u.id}>{u.nome} (responsável)</SelectItem>)}
                {outros.map(u => <SelectItem key={u.id} value={u.id}>{u.nome}</SelectItem>)}
              </SelectContent>
            </Select>
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
          <Button onClick={salvar} disabled={salvando || !contatoId || !recado.trim() || !responsavelId}>{salvando ? "Enviando..." : "Enviar recado"}</Button>
        </DialogFooter>
  </>;
  if (embedded) return <section data-recado-central className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto bg-background p-4 sm:p-6"><div className="mb-4 flex justify-end"><Button variant="ghost" size="icon" aria-label="Fechar recado" onClick={() => onOpenChange(false)}><X className="h-4 w-4" /></Button></div><div className="mx-auto w-full max-w-xl space-y-5">{conteudo}</div></section>;
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-w-md">{conteudo}</DialogContent></Dialog>;
}
