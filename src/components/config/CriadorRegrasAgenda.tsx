import { useEffect, useMemo, useState } from "react";
import { Plus, Pencil, Trash2, Wand2, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import { toast } from "@/lib/toast-config";
import { ACOES, CANAIS_REGRA, GATILHOS, rotuloAcao, rotuloGatilho } from "@/lib/calendario/regrasAutomacao";

interface Regra {
  id: string; nome: string; descricao: string | null; gatilho: string; acao: string;
  condicoes: any; acao_config: any; ativa: boolean; execucoes: number; ultima_execucao: string | null;
}

const vazio = () => ({
  id: "", nome: "", descricao: "", gatilho: "atendimento_finalizado", acao: "criar_tarefa",
  canais: [] as string[], status: "", texto: "", diasSem: 30,
  dias: 3, hora: "", titulo: "Retornar contato com {cliente}", responsavel: "vinculado", evitar: true, canalTarefa: "",
});

const telas = Array.from(new Set(GATILHOS.map((g) => g.tela)));

export function CriadorRegrasAgenda({ estabelecimentoId }: { estabelecimentoId: string }) {
  const [regras, setRegras] = useState<Regra[]>([]);
  const [form, setForm] = useState<ReturnType<typeof vazio> | null>(null);
  const [excluir, setExcluir] = useState<Regra | null>(null);
  const [salvando, setSalvando] = useState(false);
  const db = supabase as any;

  const carregar = async () => {
    const { data } = await db.from("calendario_regras_automacao").select("*").eq("estabelecimento_id", estabelecimentoId).order("created_at");
    setRegras(data || []);
  };
  useEffect(() => { void carregar(); }, [estabelecimentoId]);

  const gat = useMemo(() => GATILHOS.find((g) => g.valor === form?.gatilho), [form?.gatilho]);
  const set = (p: Partial<ReturnType<typeof vazio>>) => setForm((f) => (f ? { ...f, ...p } : f));

  const editar = (r: Regra) => setForm({
    ...vazio(), id: r.id, nome: r.nome, descricao: r.descricao || "", gatilho: r.gatilho, acao: r.acao,
    canais: r.condicoes?.canais || [], status: (r.condicoes?.status || []).join(", "), texto: r.condicoes?.texto_contem || "",
    diasSem: r.condicoes?.dias_sem_contato ?? 30, dias: r.acao_config?.dias ?? 0, hora: r.acao_config?.hora || "",
    titulo: r.acao_config?.titulo || "", responsavel: r.acao_config?.responsavel || "vinculado",
    evitar: r.acao_config?.evitar_duplicada ?? true, canalTarefa: r.acao_config?.canal || "",
  });

  const salvar = async () => {
    if (!form) return;
    if (!form.nome.trim()) return toast.error("Informe o nome da regra");
    const c = gat?.condicoes || [];
    const condicoes: any = {};
    if (c.includes("canais") && form.canais.length) condicoes.canais = form.canais;
    if (c.includes("status") && form.status.trim()) condicoes.status = form.status.split(",").map((s) => s.trim()).filter(Boolean);
    if (c.includes("texto") && form.texto.trim()) condicoes.texto_contem = form.texto.trim();
    if (c.includes("dias")) condicoes.dias_sem_contato = Number(form.diasSem) || 30;
    const acao_config: any = { dias: Number(form.dias) || 0, responsavel: form.responsavel };
    if (form.acao === "criar_tarefa") Object.assign(acao_config, { titulo: form.titulo, hora: form.hora, evitar_duplicada: form.evitar, canal: form.canalTarefa });
    const linha = { estabelecimento_id: estabelecimentoId, nome: form.nome.trim(), descricao: form.descricao || null, gatilho: form.gatilho, acao: form.acao, condicoes, acao_config };
    setSalvando(true);
    const { error } = form.id
      ? await db.from("calendario_regras_automacao").update(linha).eq("id", form.id)
      : await db.from("calendario_regras_automacao").insert(linha);
    setSalvando(false);
    if (error) return toast.error("Não foi possível salvar a regra");
    toast.success("Regra salva");
    setForm(null); void carregar();
  };

  const alternar = async (r: Regra, v: boolean) => {
    setRegras((rs) => rs.map((x) => (x.id === r.id ? { ...x, ativa: v } : x)));
    await db.from("calendario_regras_automacao").update({ ativa: v }).eq("id", r.id);
  };

  const confirmarExclusao = async () => {
    if (!excluir) return;
    await db.from("calendario_regras_automacao").delete().eq("id", excluir.id);
    setExcluir(null); void carregar();
  };

  const resumo = (r: Regra) => {
    const partes = [`Quando: ${rotuloGatilho(r.gatilho)}`];
    if (r.condicoes?.canais?.length) partes.push(`canal ${r.condicoes.canais.join("/")}`);
    if (r.condicoes?.status?.length) partes.push(`status ${r.condicoes.status.join("/")}`);
    if (r.condicoes?.texto_contem) partes.push(`contém "${r.condicoes.texto_contem}"`);
    if (r.condicoes?.dias_sem_contato) partes.push(`${r.condicoes.dias_sem_contato} dias`);
    return `${partes.join(" · ")} → ${rotuloAcao(r.acao)}${r.acao_config?.dias != null && r.acao !== "concluir_tarefas" && r.acao !== "cancelar_tarefas" ? ` em ${r.acao_config.dias} dia(s)` : ""}`;
  };

  return (
    <section className="rounded-lg border bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="flex items-center gap-2 text-base font-semibold"><Wand2 className="h-5 w-5 text-primary" /> Criador de regras</h2>
          <p className="text-xs text-muted-foreground">Monte regras do tipo "quando acontecer X → faça Y na agenda". O sistema executa sozinho.</p>
        </div>
        <Button size="sm" onClick={() => setForm(vazio())}><Plus className="h-4 w-4" /> Nova regra</Button>
      </div>

      <div className="mt-3 space-y-2">
        {regras.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma regra criada ainda.</p>}
        {telas.filter((t) => regras.some((r) => GATILHOS.find((g) => g.valor === r.gatilho)?.tela === t)).map((t) => (
          <div key={t}>
            <p className="mb-1 mt-2 text-xs font-semibold uppercase text-muted-foreground">{t}</p>
            {regras.filter((r) => GATILHOS.find((g) => g.valor === r.gatilho)?.tela === t).map((r) => (
              <div key={r.id} className="mb-2 flex items-start gap-3 rounded-md border bg-background p-3">
                <Zap className={`mt-0.5 h-4 w-4 shrink-0 ${r.ativa ? "text-primary" : "text-muted-foreground"}`} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{r.nome} <Badge variant="outline" className="ml-1 text-[10px]">{r.execucoes} execuções</Badge></p>
                  <p className="text-xs text-muted-foreground">{resumo(r)}</p>
                </div>
                <Switch checked={r.ativa} onCheckedChange={(v) => alternar(r, v)} />
                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => editar(r)}><Pencil className="h-4 w-4" /></Button>
                <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => setExcluir(r)}><Trash2 className="h-4 w-4" /></Button>
              </div>
            ))}
          </div>
        ))}
      </div>

      <Dialog open={!!form} onOpenChange={(o) => !o && setForm(null)}>
        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
          <DialogHeader><DialogTitle>{form?.id ? "Editar regra" : "Nova regra"}</DialogTitle></DialogHeader>
          {form && (
            <div className="space-y-4">
              <div className="space-y-1"><Label>Nome</Label><Input value={form.nome} onChange={(e) => set({ nome: e.target.value })} placeholder="Ex.: Retorno após orçamento perdido" /></div>

              <div className="rounded-md border p-3 space-y-3">
                <p className="text-xs font-semibold uppercase text-primary">Quando</p>
                <Select value={form.gatilho} onValueChange={(v) => set({ gatilho: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {telas.map((t) => (
                      <SelectGroup key={t}><SelectLabel>{t}</SelectLabel>
                        {GATILHOS.filter((g) => g.tela === t).map((g) => <SelectItem key={g.valor} value={g.valor}>{g.rotulo}</SelectItem>)}
                      </SelectGroup>
                    ))}
                  </SelectContent>
                </Select>
                {gat?.condicoes.includes("canais") && (
                  <div className="space-y-1"><Label className="text-xs">Só nos canais (vazio = todos)</Label>
                    <div className="flex flex-wrap gap-3">{CANAIS_REGRA.map((c) => (
                      <label key={c.valor} className="flex items-center gap-1.5 text-sm">
                        <Checkbox checked={form.canais.includes(c.valor)} onCheckedChange={(v) => set({ canais: v ? [...form.canais, c.valor] : form.canais.filter((x) => x !== c.valor) })} />{c.rotulo}
                      </label>))}</div>
                  </div>
                )}
                {gat?.condicoes.includes("status") && (
                  <div className="space-y-1"><Label className="text-xs">Só com status (separe por vírgula; vazio = qualquer)</Label>
                    <Input value={form.status} onChange={(e) => set({ status: e.target.value })} placeholder="Ex.: fechado, perdido" /></div>
                )}
                {gat?.condicoes.includes("texto") && (
                  <div className="space-y-1"><Label className="text-xs">Só se o texto contiver (opcional)</Label>
                    <Input value={form.texto} onChange={(e) => set({ texto: e.target.value })} placeholder="Ex.: orçamento" /></div>
                )}
                {gat?.condicoes.includes("dias") && (
                  <div className="space-y-1"><Label className="text-xs">Dias sem contato</Label>
                    <Input type="number" min={1} value={form.diasSem} onChange={(e) => set({ diasSem: Number(e.target.value) })} /></div>
                )}
              </div>

              <div className="rounded-md border p-3 space-y-3">
                <p className="text-xs font-semibold uppercase text-primary">Faça na agenda</p>
                <Select value={form.acao} onValueChange={(v) => set({ acao: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{ACOES.map((a) => <SelectItem key={a.valor} value={a.valor}>{a.rotulo}</SelectItem>)}</SelectContent>
                </Select>
                {(form.acao === "criar_tarefa" || form.acao === "remarcar_tarefa") && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1"><Label className="text-xs">Daqui a quantos dias</Label>
                      <Input type="number" min={0} value={form.dias} onChange={(e) => set({ dias: Number(e.target.value) })} /></div>
                    {form.acao === "criar_tarefa" && (
                      <div className="space-y-1"><Label className="text-xs">Horário (vazio = dia todo)</Label>
                        <Input type="time" value={form.hora} onChange={(e) => set({ hora: e.target.value })} /></div>
                    )}
                  </div>
                )}
                {form.acao === "criar_tarefa" && (
                  <>
                    <div className="space-y-1"><Label className="text-xs">Título da tarefa (use {"{cliente}"})</Label>
                      <Input value={form.titulo} onChange={(e) => set({ titulo: e.target.value })} /></div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1"><Label className="text-xs">Responsável</Label>
                        <Select value={form.responsavel} onValueChange={(v) => set({ responsavel: v })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="vinculado">Usuário vinculado ao cliente</SelectItem>
                            <SelectItem value="executor">Quem fez a ação</SelectItem>
                          </SelectContent>
                        </Select></div>
                      <div className="space-y-1"><Label className="text-xs">Canal da tarefa</Label>
                        <Select value={form.canalTarefa || "regra"} onValueChange={(v) => set({ canalTarefa: v === "regra" ? "" : v })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent><SelectItem value="regra">Sem canal</SelectItem>{CANAIS_REGRA.map((c) => <SelectItem key={c.valor} value={c.valor}>{c.rotulo}</SelectItem>)}</SelectContent>
                        </Select></div>
                    </div>
                    <label className="flex items-center gap-2 text-sm"><Checkbox checked={form.evitar} onCheckedChange={(v) => set({ evitar: !!v })} /> Não criar se o cliente já tiver tarefa pendente</label>
                  </>
                )}
              </div>
              <div className="space-y-1"><Label>Descrição (opcional)</Label><Input value={form.descricao} onChange={(e) => set({ descricao: e.target.value })} /></div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setForm(null)}>Cancelar</Button>
            <Button onClick={salvar} disabled={salvando}>Salvar regra</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DeleteConfirmDialog open={!!excluir} onOpenChange={(o) => !o && setExcluir(null)} onConfirm={confirmarExclusao} itemName={excluir?.nome} />
    </section>
  );
}
