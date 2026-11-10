import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, Copy, GitBranch, PhoneCall, Plus, RotateCcw, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { SimuladorLigacaoVoz, type AgenteSim } from "./SimuladorLigacaoVoz";
import {
  ACOES, DEPARTAMENTOS, GATILHOS_PRONTOS, ROTEIROS, carregarRoteirosSalvos, compilarRoteiro, ehDeFabrica, palavrasGatilho, roteiroDeFabrica,
  type CampoRoteiro, type RoteiroBaseId, type RoteiroSalvo,
} from "@/lib/voz/roteirosLigacao";

const db = supabase as any;
const CAMPOS: { id: CampoRoteiro; rotulo: string }[] = [
  { id: "produto", rotulo: "Produto" }, { id: "condicao", rotulo: "Condição" },
  { id: "desconto", rotulo: "Desconto máximo" }, { id: "aviso", rotulo: "Aviso (financeiro)" },
];
const LIVRE = "__livre__";

/** Lista e editor dos roteiros de ligação da empresa: fábrica editável + novos, com regras "Se X, faça Y". */
export function EditorRoteirosVoz({ estabelecimentoId, agentes }: { estabelecimentoId: string | null; agentes: AgenteSim[] }) {
  const [lista, setLista] = useState<RoteiroSalvo[]>([]);
  const [atual, setAtual] = useState<RoteiroSalvo | null>(null);
  const [excluir, setExcluir] = useState(false);
  const [simulando, setSimulando] = useState<RoteiroSalvo | null>(null);
  const simulador = (
    <Dialog open={!!simulando} onOpenChange={(aberto) => { if (!aberto) setSimulando(null); }}>
      <DialogContent className="max-h-[85dvh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Simular roteiro</DialogTitle>
          <DialogDescription>Ligação de teste · {simulando?.nome || "Novo roteiro"}</DialogDescription>
        </DialogHeader>
        {simulando && <SimuladorLigacaoVoz estabelecimentoId={estabelecimentoId} agentes={agentes} roteiroSelecionado={simulando} />}
      </DialogContent>
    </Dialog>
  );

  const carregar = useCallback(async () => {
    const salvos = await carregarRoteirosSalvos(db, estabelecimentoId);
    const fab = ROTEIROS.map((r) => salvos.find((s) => s.chave === r.id) ?? roteiroDeFabrica(r.id as RoteiroBaseId));
    setLista([...fab, ...salvos.filter((s) => !ehDeFabrica(s.chave))]);
  }, [estabelecimentoId]);
  useEffect(() => { void carregar(); }, [carregar]);

  const salvar = async () => {
    if (!atual || !estabelecimentoId) return;
    if (!atual.nome.trim()) return toast.error("Dê um nome ao roteiro");
    if (!atual.etapas.some((e) => e.fala.trim())) return toast.error("Inclua pelo menos uma etapa com fala");
    const corpo = { estabelecimento_id: estabelecimentoId, chave: atual.chave, departamento: atual.departamento, nome: atual.nome.trim(),
      descricao: atual.descricao, campos: atual.campos, etapas: atual.etapas, ativo: atual.ativo, updated_at: new Date().toISOString() };
    const r = await db.from("voz_roteiros").upsert(corpo, { onConflict: "estabelecimento_id,chave" }).select().single();
    if (r.error) return toast.error(r.error.message);
    toast.success("Roteiro salvo"); setAtual(null); void carregar();
  };
  const remover = async () => {
    if (!atual?.id) return;
    const r = await db.from("voz_roteiros").delete().eq("id", atual.id);
    if (r.error) return toast.error(r.error.message);
    toast.success(ehDeFabrica(atual.chave) ? "Roteiro original restaurado" : "Roteiro excluído");
    setExcluir(false); setAtual(null); void carregar();
  };
  const novo = () => setAtual({ chave: `custom_${Date.now().toString(36)}`, departamento: "comercial", nome: "", descricao: "", campos: ["condicao", "desconto"], ativo: true,
    etapas: [{ titulo: "Abertura", fala: "Diga o motivo da ligação em uma frase.", condicoes: [] }, { titulo: "Pergunta", fala: "", condicoes: [{ gatilho: "demonstrou interesse", acao: "transferir" }] }] });
  const duplicar = (r: RoteiroSalvo) => setAtual({ ...structuredClone(r), id: undefined, chave: `custom_${Date.now().toString(36)}`, nome: `${r.nome} (cópia)` });

  if (!atual) return (
    <div className="space-y-3">
      {simulador}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">Edite as falas e as regras "Se o cliente..., faça..." de cada roteiro, ou crie novos.</p>
        <Button size="sm" onClick={novo}><Plus className="mr-1 h-4 w-4" /> Novo roteiro</Button>
      </div>
      {DEPARTAMENTOS.map((dep) => (
        <div key={dep.id} className="space-y-2">
          <h4 className="text-sm font-semibold text-foreground">{dep.rotulo}</h4>
          <div className="grid gap-2 sm:grid-cols-2">
            {lista.filter((r) => r.departamento === dep.id).map((r) => (
              <Card key={r.chave} className="flex min-w-0 flex-col gap-2 p-3">
                <div className="flex min-w-0 items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground">{r.nome}</p>
                    <p className="line-clamp-2 text-xs text-muted-foreground">{r.descricao}</p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <Badge variant="outline" className="text-[10px]">{ehDeFabrica(r.chave) ? (r.id ? "Fábrica editado" : "Fábrica") : "Criado"}</Badge>
                    {!r.ativo && <Badge variant="secondary" className="text-[10px]">Inativo</Badge>}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground"><GitBranch className="mr-1 inline h-3 w-3" />{r.etapas.length} etapas · {r.etapas.reduce((n, e) => n + e.condicoes.length, 0)} regras</p>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" className="h-8" onClick={() => setAtual(structuredClone(r))}>Editar</Button>
                  <Button size="sm" variant="outline" className="h-8" onClick={() => setSimulando(structuredClone(r))}><PhoneCall className="mr-1 h-3.5 w-3.5" /> Simular</Button>
                  <Button size="sm" variant="ghost" className="h-8" onClick={() => duplicar(r)}><Copy className="mr-1 h-3.5 w-3.5" /> Duplicar</Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      ))}
    </div>
  );

  const set = (p: Partial<RoteiroSalvo>) => setAtual({ ...atual, ...p });
  const setEtapa = (i: number, p: Partial<RoteiroSalvo["etapas"][number]>) => set({ etapas: atual.etapas.map((e, j) => (j === i ? { ...e, ...p } : e)) });
  const fabrica = ehDeFabrica(atual.chave);

  return (
    <div className="space-y-4">
      {simulador}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button size="sm" variant="ghost" onClick={() => setAtual(null)}><ArrowLeft className="mr-1 h-4 w-4" /> Roteiros</Button>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => setSimulando(structuredClone(atual))}><PhoneCall className="mr-1 h-4 w-4" /> Simular</Button>
          {atual.id && <Button size="sm" variant="outline" onClick={() => setExcluir(true)}>
            {fabrica ? <><RotateCcw className="mr-1 h-4 w-4" /> Restaurar original</> : <><Trash2 className="mr-1 h-4 w-4" /> Excluir</>}</Button>}
          <Button size="sm" onClick={() => void salvar()}><Save className="mr-1 h-4 w-4" /> Salvar</Button>
        </div>
      </div>

      <Card className="grid gap-3 p-4 sm:grid-cols-2">
        <div className="space-y-1"><Label>Nome</Label><Input value={atual.nome} onChange={(e) => set({ nome: e.target.value })} placeholder="Ex.: Convite para feira" /></div>
        <div className="space-y-1"><Label>Departamento</Label>
          <Select value={atual.departamento} onValueChange={(v) => set({ departamento: v as RoteiroSalvo["departamento"] })} disabled={fabrica}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{DEPARTAMENTOS.map((d) => <SelectItem key={d.id} value={d.id}>{d.rotulo}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1 sm:col-span-2"><Label>Descrição</Label><Input value={atual.descricao} onChange={(e) => set({ descricao: e.target.value })} /></div>
        <div className="space-y-1 sm:col-span-2">
          <Label>Campos pedidos no disparo</Label>
          <div className="flex flex-wrap gap-3">
            {CAMPOS.map((c) => (
              <label key={c.id} className="flex items-center gap-2 text-sm">
                <Switch checked={atual.campos.includes(c.id)} onCheckedChange={(v) => set({ campos: v ? [...atual.campos, c.id] : atual.campos.filter((x) => x !== c.id) })} />
                {c.rotulo}
              </label>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">Use nas falas: {"{produto}"}, {"{condicao}"}, {"{desconto}"}, {"{aviso}"}.</p>
        </div>
        <label className="flex items-center gap-2 text-sm"><Switch checked={atual.ativo} onCheckedChange={(v) => set({ ativo: v })} /> Disponível no disparo</label>
      </Card>

      {atual.etapas.map((e, i) => (
        <Card key={i} className="space-y-3 p-4">
          <div className="flex items-center gap-2">
            <Badge>{i + 1}</Badge>
            <Input className="h-8" value={e.titulo} onChange={(x) => setEtapa(i, { titulo: x.target.value })} placeholder="Título da etapa" />
            <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0" aria-label="Remover etapa" onClick={() => set({ etapas: atual.etapas.filter((_, j) => j !== i) })}><Trash2 className="h-4 w-4" /></Button>
          </div>
          <div className="space-y-1"><Label>O que a IA diz/faz</Label>
            <Textarea rows={2} value={e.fala} maxLength={400} onChange={(x) => setEtapa(i, { fala: x.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Regras desta etapa</Label>
            <p className="text-xs text-muted-foreground">No campo SE, escreva várias respostas possíveis separadas por vírgula (ex.: sim, tenho dúvida, quero fechar) — a regra vale para qualquer uma delas.</p>
            {e.condicoes.map((c, k) => {
              const livre = !GATILHOS_PRONTOS.includes(c.gatilho);
              const palavras = palavrasGatilho(c.gatilho);
              const setC = (p: Partial<typeof c>) => setEtapa(i, { condicoes: e.condicoes.map((y, z) => (z === k ? { ...y, ...p } : y)) });
              return (
                <div key={k} className="grid gap-2 rounded-lg border border-border/60 p-2 sm:grid-cols-[auto_1fr_auto_1fr_auto] sm:items-center">
                  <span className="text-xs font-semibold text-muted-foreground">SE o cliente</span>
                  <div className="space-y-1">
                    <Select value={livre ? LIVRE : c.gatilho} onValueChange={(v) => setC({ gatilho: v === LIVRE ? "" : v })}>
                      <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                      <SelectContent>{GATILHOS_PRONTOS.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}<SelectItem value={LIVRE}>Outro (escrever)</SelectItem></SelectContent>
                    </Select>
                    <Input className="h-8" value={c.gatilho} onChange={(x) => setC({ gatilho: x.target.value })} placeholder="Ex.: sim, tenho dúvida, quero fechar" />
                    {palavras.length > 1 && (
                      <div className="flex flex-wrap items-center gap-1">
                        <span className="text-[10px] text-muted-foreground">qualquer uma:</span>
                        {palavras.map((p) => <Badge key={p} variant="secondary" className="text-[10px]">{p}</Badge>)}
                      </div>
                    )}
                  </div>
                  <span className="text-xs font-semibold text-muted-foreground">ENTÃO</span>
                  <div className="space-y-1">
                    <Select value={c.acao} onValueChange={(v) => setC({ acao: v as typeof c.acao })}>
                      <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                      <SelectContent>{ACOES.map((a) => <SelectItem key={a.id} value={a.id}>{a.rotulo}</SelectItem>)}</SelectContent>
                    </Select>
                    <Input className="h-8" value={c.texto ?? ""} onChange={(x) => setC({ texto: x.target.value })} placeholder={c.acao === "responder" ? "O que responder" : "Complemento (opcional)"} />
                  </div>
                  <Button size="icon" variant="ghost" className="h-8 w-8" aria-label="Remover regra" onClick={() => setEtapa(i, { condicoes: e.condicoes.filter((_, z) => z !== k) })}><Trash2 className="h-4 w-4" /></Button>
                </div>
              );
            })}
            <Button size="sm" variant="outline" onClick={() => setEtapa(i, { condicoes: [...e.condicoes, { gatilho: "achou caro", acao: "desconto" }] })}><Plus className="mr-1 h-3.5 w-3.5" /> Regra</Button>
          </div>
        </Card>
      ))}
      <Button variant="outline" onClick={() => set({ etapas: [...atual.etapas, { titulo: `Etapa ${atual.etapas.length + 1}`, fala: "", condicoes: [] }] })}><Plus className="mr-1 h-4 w-4" /> Etapa</Button>

      <Card className="p-4">
        <p className="mb-1 text-xs font-semibold text-foreground">Como a IA vai receber</p>
        <p className="whitespace-pre-wrap break-words text-xs text-muted-foreground">{compilarRoteiro(atual, { descontoMax: 5, condicao: "frete grátis" })}</p>
      </Card>

      <DeleteConfirmDialog open={excluir} onOpenChange={setExcluir} onConfirm={() => void remover()}
        title={fabrica ? "Restaurar roteiro original?" : "Excluir roteiro?"}
        description={fabrica ? "Suas alterações neste roteiro serão descartadas." : "O roteiro deixará de aparecer no disparo."} />
    </div>
  );
}
