import { useEffect, useState, type ReactNode } from "react";
import { Plus, X } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ProdutoBusca } from "@/components/envio-massa/ProdutoBusca";
import { supabase } from "@/integrations/supabase/client";
import { getEstabelecimentoId } from "@/lib/estabelecimentoUtils";
import { CONFIG_PADRAO, lerConfigPotenciais, salvarConfigPotenciais, type ConfigPotenciais } from "@/lib/atendimento/potenciais";

function Num({ valor, onChange, sufixo, max = 3650 }: { valor: number; onChange: (n: number) => void; sufixo: string; max?: number }) {
  return (
    <span className="flex shrink-0 items-center gap-1.5">
      <Input type="number" min={0} max={max} className="h-8 w-20" value={valor}
        onChange={(e) => onChange(Math.max(0, Math.min(max, Number(e.target.value) || 0)))} />
      <span className="text-xs text-muted-foreground">{sufixo}</span>
    </span>
  );
}
function Linha({ rotulo, children }: { rotulo: string; children: ReactNode }) {
  return <label className="flex flex-wrap items-center justify-between gap-2 text-sm"><span className="min-w-0">{rotulo}</span>{children}</label>;
}
function Secao({ titulo, desc, ativo, onAtivo, children }: { titulo: string; desc: string; ativo?: boolean; onAtivo?: (v: boolean) => void; children: ReactNode }) {
  return (
    <section className="space-y-2 rounded-lg border p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0"><p className="text-sm font-semibold">{titulo}</p><p className="text-xs text-muted-foreground">{desc}</p></div>
        {onAtivo && <Switch checked={!!ativo} onCheckedChange={onAtivo} aria-label={`Ativar ${titulo}`} />}
      </div>
      {(ativo ?? true) && <div className="space-y-2">{children}</div>}
    </section>
  );
}

export function RegrasPotenciaisDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const [cfg, setCfg] = useState<ConfigPotenciais>(CONFIG_PADRAO);
  const [estab, setEstab] = useState<string | null>(null);
  const [grupos, setGrupos] = useState<{ id: string; nome: string }[]>([]);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (!open) return;
    void (async () => {
      const e = await getEstabelecimentoId(); setEstab(e);
      if (!e) return;
      setCfg(await lerConfigPotenciais(e));
      const { data } = await (supabase as any).from("produto_categorias").select("id, nome").eq("estabelecimento_id", e).order("nome");
      setGrupos(data ?? []);
    })();
  }, [open]);

  const set = <K extends keyof ConfigPotenciais>(k: K, v: Partial<ConfigPotenciais[K]>) => setCfg((c) => ({ ...c, [k]: { ...c[k], ...v } }));
  const ac = cfg.acaoComercial;

  const salvar = async () => {
    if (!estab) return;
    setSalvando(true);
    try { await salvarConfigPotenciais(estab, cfg); toast.success("Regras de potenciais salvas"); onOpenChange(false); }
    catch { toast.error("Não foi possível salvar as regras"); }
    finally { setSalvando(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto overflow-x-hidden">
        <DialogHeader>
          <DialogTitle>Regras de clientes potenciais</DialogTitle>
          <DialogDescription>Defina por quais motivos um cliente aparece na aba Potenciais. O motivo sempre aparece no cartão.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Secao titulo="Ciclo de recompra" desc="Clientes que estão chegando na data habitual de compra." ativo={cfg.recompra.ativo} onAtivo={(v) => set("recompra", { ativo: v })}>
            <Linha rotulo="Sugerir com antecedência de"><Num valor={cfg.recompra.antecedenciaDias} onChange={(n) => set("recompra", { antecedenciaDias: n })} sufixo="dias" /></Linha>
          </Secao>
          <Secao titulo="Orçamento sem retorno" desc="Propostas abertas aguardando resposta do cliente." ativo={cfg.orcamento.ativo} onAtivo={(v) => set("orcamento", { ativo: v })}>
            <Linha rotulo="Aberto há pelo menos"><Num valor={cfg.orcamento.diasAberto} onChange={(n) => set("orcamento", { diasAberto: n })} sufixo="dias" /></Linha>
            <Linha rotulo="Valor mínimo"><Num valor={cfg.orcamento.valorMinimo} onChange={(n) => set("orcamento", { valorMinimo: n })} sufixo="R$" max={10_000_000} /></Linha>
          </Secao>
          <Secao titulo="Ação comercial / estoque parado" desc="Clientes que já compraram produtos ou grupos em promoção." ativo={ac.ativo} onAtivo={(v) => set("acaoComercial", { ativo: v })}>
            <Linha rotulo="Descrição exibida no motivo">
              <Input className="h-8 w-full sm:w-56" value={ac.descricao} onChange={(e) => set("acaoComercial", { descricao: e.target.value.slice(0, 60) })} placeholder="Ex.: queima de estoque" />
            </Linha>
            <div className="space-y-1.5">
              <p className="text-xs font-medium">Produtos em foco</p>
              <div className="flex flex-wrap gap-1.5">
                {ac.produtos.map((p) => (
                  <span key={p.id} className="flex max-w-full items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs">
                    <span className="truncate">{p.nome}</span>
                    <button type="button" aria-label={`Remover ${p.nome}`} onClick={() => set("acaoComercial", { produtos: ac.produtos.filter((x) => x.id !== p.id) })}><X className="h-3 w-3" /></button>
                  </span>
                ))}
              </div>
              <ProdutoBusca valor={null} onChange={(p) => p && !ac.produtos.some((x) => x.id === p.id) && set("acaoComercial", { produtos: [...ac.produtos, p] })} />
            </div>
            <div className="space-y-1.5">
              <p className="text-xs font-medium">Grupos de produtos em foco</p>
              <div className="flex flex-wrap gap-1.5">
                {ac.grupos.map((g) => (
                  <span key={g.id} className="flex max-w-full items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs">
                    <span className="truncate">{g.nome}</span>
                    <button type="button" aria-label={`Remover ${g.nome}`} onClick={() => set("acaoComercial", { grupos: ac.grupos.filter((x) => x.id !== g.id) })}><X className="h-3 w-3" /></button>
                  </span>
                ))}
              </div>
              <Select value="" onValueChange={(id) => { const g = grupos.find((x) => x.id === id); if (g && !ac.grupos.some((x) => x.id === id)) set("acaoComercial", { grupos: [...ac.grupos, g] }); }}>
                <SelectTrigger className="h-9 text-xs"><SelectValue placeholder={grupos.length ? "Adicionar grupo" : "Nenhum grupo cadastrado"} /></SelectTrigger>
                <SelectContent>{grupos.map((g) => <SelectItem key={g.id} value={g.id}>{g.nome}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <Linha rotulo="Comprou nos últimos"><Num valor={ac.mesesHistorico} onChange={(n) => set("acaoComercial", { mesesHistorico: n })} sufixo="meses" max={24} /></Linha>
            <Linha rotulo="E não comprou há pelo menos"><Num valor={ac.semCompraDias} onChange={(n) => set("acaoComercial", { semCompraDias: n })} sufixo="dias" /></Linha>
          </Secao>
          <Secao titulo="Queda no volume" desc="Continua comprando, mas bem menos que o habitual." ativo={cfg.quedaVolume.ativo} onAtivo={(v) => set("quedaVolume", { ativo: v })}>
            <Linha rotulo="Queda mínima"><Num valor={cfg.quedaVolume.percentual} onChange={(n) => set("quedaVolume", { percentual: n })} sufixo="%" max={100} /></Linha>
            <Linha rotulo="Período comparado"><Num valor={cfg.quedaVolume.janelaDias} onChange={(n) => set("quedaVolume", { janelaDias: Math.max(7, n) })} sufixo="dias" max={365} /></Linha>
          </Secao>
          <Secao titulo="Complemento de linha" desc="Compra um produto, mas nunca comprou o complementar." ativo={cfg.crossSell.ativo} onAtivo={(v) => set("crossSell", { ativo: v })}>
            {cfg.crossSell.pares.map((par, i) => (
              <div key={i} className="grid grid-cols-1 gap-1.5 rounded-md border border-dashed p-2 sm:grid-cols-[1fr_1fr_auto] sm:items-center">
                <ProdutoBusca valor={par.base} onChange={(p) => set("crossSell", { pares: cfg.crossSell.pares.map((x, j) => (j === i ? { ...x, base: p } : x)) })} />
                <ProdutoBusca valor={par.complemento} onChange={(p) => set("crossSell", { pares: cfg.crossSell.pares.map((x, j) => (j === i ? { ...x, complemento: p } : x)) })} />
                <Button type="button" size="icon" variant="ghost" aria-label="Remover par" onClick={() => set("crossSell", { pares: cfg.crossSell.pares.filter((_, j) => j !== i) })}><X className="h-4 w-4" /></Button>
              </div>
            ))}
            <p className="text-[11px] text-muted-foreground">Em cada linha: produto que ele compra → produto complementar a oferecer.</p>
            <Button type="button" variant="outline" size="sm" className="gap-1" onClick={() => set("crossSell", { pares: [...cfg.crossSell.pares, { base: null, complemento: null }] })}><Plus className="h-3.5 w-3.5" />Par de produtos</Button>
          </Secao>
          <Secao titulo="Inativos com histórico" desc="Clientes habituais que pararam de comprar." ativo={cfg.inativo.ativo} onAtivo={(v) => set("inativo", { ativo: v })}>
            <Linha rotulo="Sem compras há"><Num valor={cfg.inativo.diasSemCompra} onChange={(n) => set("inativo", { diasSemCompra: n })} sufixo="dias" /></Linha>
            <Linha rotulo="Com no mínimo"><Num valor={cfg.inativo.minCompras} onChange={(n) => set("inativo", { minCompras: Math.max(1, n) })} sufixo="pedidos" max={100} /></Linha>
          </Secao>
          <Secao titulo="Proteções" desc="Evitam sobrecarregar o atendente e insistir com o cliente.">
            <Linha rotulo="Máximo de clientes por dia"><Num valor={cfg.protecao.limite} onChange={(n) => set("protecao", { limite: n })} sufixo="clientes" max={500} /></Linha>
            <Linha rotulo="Ignorar quem recebeu disparo nos últimos"><Num valor={cfg.protecao.contatoRecenteDias} onChange={(n) => set("protecao", { contatoRecenteDias: n })} sufixo="dias" max={90} /></Linha>
            <Linha rotulo="Ignorar quem já tem tarefa pendente"><Switch checked={cfg.protecao.ignorarComTarefa} onCheckedChange={(v) => set("protecao", { ignorarComTarefa: v })} /></Linha>
          </Secao>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => setCfg(CONFIG_PADRAO)}>Restaurar padrão</Button>
          <Button onClick={() => void salvar()} disabled={salvando || !estab}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
