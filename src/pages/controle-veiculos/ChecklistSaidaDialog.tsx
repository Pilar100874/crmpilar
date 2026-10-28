import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import { toast } from "sonner";
import { FileDown, Loader2, Plus, Sparkles, Trash2 } from "lucide-react";
import {
  RESPONSAVEIS, aplicaAoTipo, gerarPdfChecklist, itensSugeridos, listarChecklist,
  type ChecklistItem, type Responsavel,
} from "@/lib/cv/checklistSaida";

interface Props { open: boolean; onOpenChange: (v: boolean) => void; tipos: string[] }

export default function ChecklistSaidaDialog({ open, onOpenChange, tipos }: Props) {
  const [itens, setItens] = useState<ChecklistItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [aba, setAba] = useState<Responsavel>("motorista");
  const [novo, setNovo] = useState({ categoria: "", item: "" });
  const [excluir, setExcluir] = useState<ChecklistItem | null>(null);

  const load = async () => {
    setLoading(true);
    try { setItens(await listarChecklist()); } catch (e: any) { toast.error(e.message); }
    setLoading(false);
  };
  useEffect(() => { if (open) load(); }, [open]);

  const carregarSugestoes = async () => {
    const existentes = new Set(itens.map(i => `${i.responsavel}|${i.item}`));
    const novos = itensSugeridos().filter(i => !existentes.has(`${i.responsavel}|${i.item}`));
    if (!novos.length) return toast.info("Todos os itens sugeridos já estão na lista");
    const { error } = await supabase.from("cv_checklist_saida_itens").insert(novos);
    if (error) return toast.error(error.message);
    toast.success(`${novos.length} itens sugeridos adicionados`); load();
  };

  const adicionar = async () => {
    if (!novo.item.trim()) return toast.error("Informe o item");
    const ordem = Math.max(0, ...itens.filter(i => i.responsavel === aba).map(i => i.ordem)) + 1;
    const { error } = await supabase.from("cv_checklist_saida_itens").insert({
      responsavel: aba, categoria: novo.categoria.trim() || "Geral", item: novo.item.trim(), tipos_veiculo: [], ordem,
    });
    if (error) return toast.error(error.message);
    setNovo({ categoria: "", item: "" }); load();
  };

  const alternarTipo = async (i: ChecklistItem, tipo: string) => {
    // Lista vazia = todos; ao desmarcar um, materializa os demais
    const atuais = i.tipos_veiculo.length ? i.tipos_veiculo : tipos;
    let prox = atuais.includes(tipo) ? atuais.filter(t => t !== tipo) : [...atuais, tipo];
    if (tipos.every(t => prox.includes(t))) prox = [];
    if (!prox.length && atuais.length === 1 && atuais[0] === tipo) return toast.error("O item precisa valer para ao menos um tipo");
    setItens(prev => prev.map(x => x.id === i.id ? { ...x, tipos_veiculo: prox } : x));
    const { error } = await supabase.from("cv_checklist_saida_itens").update({ tipos_veiculo: prox }).eq("id", i.id!);
    if (error) { toast.error(error.message); load(); }
  };

  const confirmarExclusao = async () => {
    if (!excluir?.id) return;
    const { error } = await supabase.from("cv_checklist_saida_itens").delete().eq("id", excluir.id);
    if (error) return toast.error(error.message);
    setExcluir(null); load();
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Check list diário de saída de veículos</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            Defina o que o motorista e o mecânico conferem sempre que um veículo sai. Clique no tipo de veículo para dizer se o item vale para ele.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={carregarSugestoes}><Sparkles className="h-4 w-4 mr-1" />Adicionar itens sugeridos</Button>
            <Button onClick={() => gerarPdfChecklist(itens, tipos)} disabled={!itens.length || !tipos.length}>
              <FileDown className="h-4 w-4 mr-1" />Gerar PDF para imprimir
            </Button>
          </div>
          {!tipos.length && <p className="text-sm text-destructive">Cadastre veículos com tipo na Logística para gerar as colunas.</p>}

          <Tabs value={aba} onValueChange={v => setAba(v as Responsavel)}>
            <TabsList>
              {RESPONSAVEIS.map(r => (
                <TabsTrigger key={r.valor} value={r.valor}>
                  {r.rotulo} ({itens.filter(i => i.responsavel === r.valor).length})
                </TabsTrigger>
              ))}
            </TabsList>
            {RESPONSAVEIS.map(r => (
              <TabsContent key={r.valor} value={r.valor} className="space-y-2">
                <div className="flex flex-col sm:flex-row gap-2">
                  <Input className="sm:w-40" placeholder="Grupo (ex.: Pneus)" value={novo.categoria} onChange={e => setNovo({ ...novo, categoria: e.target.value })} />
                  <Input className="flex-1" placeholder="Item a verificar" value={novo.item} onChange={e => setNovo({ ...novo, item: e.target.value })} onKeyDown={e => e.key === "Enter" && adicionar()} />
                  <Button onClick={adicionar}><Plus className="h-4 w-4 mr-1" />Adicionar</Button>
                </div>
                {loading ? <Loader2 className="h-5 w-5 animate-spin mx-auto my-6" /> : (
                  <div className="divide-y rounded-md border">
                    {itens.filter(i => i.responsavel === r.valor).map(i => (
                      <div key={i.id} className="p-2 flex flex-col gap-1.5">
                        <div className="flex items-start gap-2">
                          <Badge variant="outline" className="shrink-0">{i.categoria}</Badge>
                          <span className="text-sm flex-1 min-w-0 break-words">{i.item}</span>
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setExcluir(i)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {tipos.map(t => {
                            const ativo = aplicaAoTipo(i, t);
                            return (
                              <button key={t} type="button" onClick={() => alternarTipo(i, t)}
                                className={`text-xs px-2 py-0.5 rounded-full border transition-colors ${ativo ? "bg-primary text-primary-foreground border-primary" : "text-muted-foreground border-border"}`}>
                                {t}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                    {!itens.some(i => i.responsavel === r.valor) && (
                      <p className="text-sm text-muted-foreground p-4 text-center">Nenhum item. Use "Adicionar itens sugeridos".</p>
                    )}
                  </div>
                )}
              </TabsContent>
            ))}
          </Tabs>
          <DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Fechar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
      <DeleteConfirmDialog
        open={!!excluir}
        onOpenChange={(v: boolean) => !v && setExcluir(null)}
        onConfirm={confirmarExclusao}
        title="Excluir item do check list?"
        description={excluir?.item}
      />
    </>
  );
}
