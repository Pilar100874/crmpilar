import { useEffect, useState } from "react";
import { AlertCircle, Clock3, Loader2, MessageSquare, Send, User, UserPlus, X, Zap } from "lucide-react";
import { GlobalClientFilter } from "./GlobalClientFilter";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { carregarResponsaveis, listarUsuarios, registrarRecado, selecaoResponsavelRecado, type Responsavel, type UrgenciaRecado } from "@/lib/atendimento/recadoResponsavel";
import { getUserIdFromAuth } from "@/lib/estabelecimentoUtils";
import { PainelAtendimentoHeader } from "./PainelAtendimentoHeader";

interface Props { open: boolean; onOpenChange: (v: boolean) => void; contatoId: string; contatoNome: string; embedded?: boolean; onSelecionar?: (id: string, nome: string) => void; onCadastrar?: () => void }

export function RecadoResponsavelDialog({ open, onOpenChange, contatoId, contatoNome, embedded, onSelecionar, onCadastrar }: Props) {
  const [responsaveis, setResponsaveis] = useState<Responsavel[]>([]);
  const [outros, setOutros] = useState<Responsavel[]>([]);
  const [responsavelId, setResponsavelId] = useState("");
  const [recado, setRecado] = useState("");
  const [urgencia, setUrgencia] = useState<UrgenciaRecado>("urgente");
  const [salvando, setSalvando] = useState(false);
  const [bloqueado, setBloqueado] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [erroSelecao, setErroSelecao] = useState(false);

  useEffect(() => {
    if (!open) return;
    let ativo = true;
    setCarregando(true); setResponsavelId(""); setBloqueado(false); setErroSelecao(false);
    void Promise.all([contatoId ? carregarResponsaveis(contatoId) : Promise.resolve([]), listarUsuarios(), getUserIdFromAuth()]).then(([r, todos, usuarioId]) => {
      if (!ativo) return;
      if (!usuarioId) throw new Error("Usuário não identificado");
      const selecao = selecaoResponsavelRecado(r, usuarioId);
      setBloqueado(selecao.bloqueado);
      setResponsaveis(r);
      const ids = new Set(r.map(x => x.id));
      setOutros(todos.filter(u => !ids.has(u.id)));
      setResponsavelId(selecao.responsavelId);
    }).catch(() => { if (ativo) { setErroSelecao(true); toast.error("Não foi possível conferir os responsáveis do cliente"); } }).finally(() => { if (ativo) setCarregando(false); });
    return () => { ativo = false; };
  }, [open, contatoId]);

  const salvar = async () => {
    if (bloqueado || carregando || erroSelecao) return;
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
        {embedded ? <PainelAtendimentoHeader title="Encaminhar recado" icon={MessageSquare} onClose={() => onOpenChange(false)} closeLabel="Fechar recado" /> : <div className="flex items-start justify-between gap-3 border-b pb-5">
        <DialogHeader className="min-w-0 text-left">
          {embedded ? <h2 className="flex items-center gap-3 text-xl font-semibold"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><MessageSquare className="h-5 w-5" /></span>Encaminhar recado</h2> : <DialogTitle>Encaminhar recado</DialogTitle>}
          {!embedded && <DialogDescription>{contatoNome}</DialogDescription>}
        </DialogHeader>
        {embedded && <Button variant="ghost" size="icon" className="shrink-0 text-muted-foreground" title="Fechar recado" aria-label="Fechar recado" onClick={() => onOpenChange(false)}><X className="h-4 w-4" /></Button>}
        </div>}
        <div className="space-y-6 px-4 sm:px-6">
          {embedded && <div className="space-y-2"><Label className="text-sm font-semibold">Cliente</Label><div className="flex min-w-0 items-center gap-2 rounded-lg border bg-muted/30 p-3"><User className="h-5 w-5 shrink-0 text-muted-foreground" /><span className={`min-w-0 flex-1 break-words text-sm ${contatoNome ? "font-medium" : "text-muted-foreground"}`}>{contatoNome || "Nenhum cliente selecionado"}</span><div className="flex shrink-0 items-center gap-1"><GlobalClientFilter compact activeFilter={contatoId ? { type: "customer", id: contatoId, nome: contatoNome } : null} onFilterChange={filtro => {
            if (!filtro) { onSelecionar?.("", ""); return; }
            if (filtro.type === "customer") { onSelecionar?.(filtro.id, filtro.nome); return; }
            void import("@/integrations/supabase/client").then(async ({ supabase }) => {
              const { data, error } = await supabase.from("customer_empresas").select("customer_id, customers:customer_id(nome)").eq("empresa_id", filtro.id).order("is_primary", { ascending: false }).limit(1).maybeSingle();
              if (error || !data?.customer_id) { toast.error("Selecione ou cadastre um contato para esta empresa"); return; }
              onSelecionar?.(data.customer_id, data.customers?.nome || filtro.nome);
            });
          }} /><Button variant="ghost" size="icon" title="Cadastrar cliente" aria-label="Cadastrar cliente" onClick={onCadastrar}><UserPlus className="h-4 w-4" /></Button></div></div></div>}
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Enviar para</Label>
            {bloqueado && <p role="alert" className="flex items-start gap-2 rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />Este cliente está vinculado a você. Não é permitido encaminhar recado para sua própria carteira.</p>}
            {carregando && contatoId && <p role="status" className="flex items-center gap-2 text-xs text-muted-foreground"><Loader2 className="h-3 w-3 animate-spin" />Conferindo responsável…</p>}
            {erroSelecao && <p role="alert" className="flex items-start gap-2 rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />Não foi possível conferir o responsável. Selecione o cliente novamente.</p>}
            <Select value={responsavelId} onValueChange={setResponsavelId} disabled={bloqueado || carregando || erroSelecao}>
              <SelectTrigger className="h-11"><SelectValue placeholder="Escolha quem deve retornar" /></SelectTrigger>
              <SelectContent>
                {responsaveis.map(u => <SelectItem key={u.id} value={u.id}>{u.nome} (responsável)</SelectItem>)}
                {outros.map(u => <SelectItem key={u.id} value={u.id}>{u.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="recado-mensagem" className="text-sm font-semibold">Recado</Label>
            <Textarea id="recado-mensagem" className="min-h-[144px] resize-y text-sm leading-relaxed" rows={5} value={recado} onChange={e => setRecado(e.target.value)} placeholder="Ex.: Cliente ligou pedindo a cotação de cimento." />
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Urgência</Label>
            <div className="grid grid-cols-2 gap-3">
              <Button type="button" aria-pressed={urgencia === "normal"} className="h-auto min-h-16 min-w-0 justify-start gap-2 whitespace-normal px-3 py-3" variant={urgencia === "normal" ? "default" : "outline"} onClick={() => setUrgencia("normal")}><Clock3 className="h-4 w-4 shrink-0" /><span className="min-w-0 text-left"><span className="block font-semibold">Normal</span><span className="block text-xs font-normal">Retorno em 2 h</span></span></Button>
              <Button type="button" aria-pressed={urgencia === "urgente"} className="h-auto min-h-16 min-w-0 justify-start gap-2 whitespace-normal px-3 py-3" variant={urgencia === "urgente" ? "destructive" : "outline"} onClick={() => setUrgencia("urgente")}><Zap className="h-4 w-4 shrink-0" /><span className="min-w-0 text-left"><span className="block font-semibold">Urgente</span><span className="block text-xs font-normal">Retorno em 30 min</span></span></Button>
            </div>
          </div>
        </div>
        <DialogFooter className="gap-2 border-t px-4 py-4 sm:gap-2 sm:px-6">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button className="gap-2" onClick={salvar} disabled={salvando || bloqueado || carregando || erroSelecao || !contatoId || !recado.trim() || !responsavelId}>{salvando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}{salvando ? "Enviando..." : "Enviar recado"}</Button>
        </DialogFooter>
  </>;
  if (embedded) return <section data-recado-central className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto bg-background"><div className="w-full space-y-6">{conteudo}</div></section>;
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-h-[90dvh] max-w-lg overflow-y-auto">{conteudo}</DialogContent></Dialog>;
}
