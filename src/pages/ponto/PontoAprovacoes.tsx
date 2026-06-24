import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Check, X, Workflow, Plus, Trash2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { usePontoEmpresa } from "./usePontoEmpresa";
import { toast } from "sonner";

type Entidade = "ajuste" | "afastamento";

export default function PontoAprovacoes() {
  const { empresaId } = usePontoEmpresa();
  const [ajustes, setAjustes] = useState<any[]>([]);
  const [afast, setAfast] = useState<any[]>([]);
  const [configs, setConfigs] = useState<any[]>([]);
  const [nota, setNota] = useState<Record<string, string>>({});

  const load = async () => {
    if (!empresaId) return;
    const { data: funcs } = await supabase.from("ponto_funcionarios")
      .select("id, nome").eq("empresa_id", empresaId);
    const funcIds = (funcs || []).map(f => f.id);
    const nomeMap = new Map((funcs||[]).map(f => [f.id, f.nome]));

    const [aj, af, cf] = await Promise.all([
      supabase.from("ponto_ajustes")
        .select("*").eq("status", "pendente").in("funcionario_id", funcIds)
        .order("created_at", { ascending: false }),
      supabase.from("ponto_ferias_afastamentos")
        .select("*").eq("status", "pendente").in("funcionario_id", funcIds)
        .order("created_at", { ascending: false }),
      supabase.from("ponto_aprovacao_config").select("*").eq("empresa_id", empresaId),
    ]);
    setAjustes((aj.data||[]).map((x:any) => ({...x, _nome: nomeMap.get(x.funcionario_id)})));
    setAfast((af.data||[]).map((x:any) => ({...x, _nome: nomeMap.get(x.funcionario_id)})));
    setConfigs(cf.data || []);
  };
  useEffect(() => { load(); }, [empresaId]);

  const aprovar = async (entidade: Entidade, item: any, decisao: "aprovar"|"rejeitar") => {
    const tabela = entidade === "ajuste" ? "ponto_ajustes" : "ponto_ferias_afastamentos";
    const novoNivel = (item.nivel_aprovacao_atual || 1) + (decisao === "aprovar" ? 1 : 0);
    const aprovacoes = Array.isArray(item.aprovacoes) ? [...item.aprovacoes] : [];
    aprovacoes.push({
      nivel: item.nivel_aprovacao_atual,
      decisao,
      nota: nota[item.id] || null,
      em: new Date().toISOString(),
    });

    let novoStatus = item.status;
    if (decisao === "rejeitar") novoStatus = "rejeitado";
    else if (novoNivel > (item.nivel_aprovacao_max || 1)) novoStatus = "aprovado";

    const { error } = await supabase.from(tabela).update({
      status: novoStatus,
      nivel_aprovacao_atual: decisao === "aprovar" ? novoNivel : item.nivel_aprovacao_atual,
      aprovacoes,
    }).eq("id", item.id);
    if (error) return toast.error(error.message);
    toast.success(decisao === "aprovar" ? (novoStatus === "aprovado" ? "Aprovado" : "Avançou para próximo nível") : "Rejeitado");
    load();
  };

  // Config
  const [novoNivel, setNovoNivel] = useState({ entidade: "ajuste" as Entidade, papel: "gestor" });
  const upsertConfig = async (entidade: string, niveis: any[]) => {
    if (!empresaId) return;
    const existente = configs.find(c => c.entidade === entidade);
    if (existente) {
      await supabase.from("ponto_aprovacao_config").update({ niveis }).eq("id", existente.id);
    } else {
      await supabase.from("ponto_aprovacao_config").insert({ empresa_id: empresaId, entidade, niveis });
    }
    load();
  };
  const addNivel = async () => {
    const existente = configs.find(c => c.entidade === novoNivel.entidade);
    const atuais: any[] = existente?.niveis || [];
    const next = [...atuais, { nivel: atuais.length + 1, papel: novoNivel.papel }];
    await upsertConfig(novoNivel.entidade, next);
  };
  const removerNivel = async (entidade: string, idx: number) => {
    const existente = configs.find(c => c.entidade === entidade);
    if (!existente) return;
    const niveis = (existente.niveis as any[]).filter((_, i) => i !== idx).map((n, i) => ({ ...n, nivel: i + 1 }));
    await upsertConfig(entidade, niveis);
  };

  const renderLista = (entidade: Entidade, items: any[]) => (
    items.length === 0 ? (
      <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">Nenhuma pendência.</CardContent></Card>
    ) : (
      <div className="space-y-2">
        {items.map(it => (
          <Card key={it.id}><CardContent className="p-4 space-y-2">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium">{it._nome || "—"}</span>
                  {entidade === "ajuste" ? (
                    <Badge variant="outline">{it.data} · {it.tipo}</Badge>
                  ) : (
                    <Badge variant="outline">{it.tipo} · {it.data_inicio} → {it.data_fim} ({it.dias}d)</Badge>
                  )}
                  <Badge>Nível {it.nivel_aprovacao_atual}/{it.nivel_aprovacao_max}</Badge>
                </div>
                {it.motivo && <p className="text-xs text-muted-foreground">{it.motivo}</p>}
                {it.valor_proposto && <p className="text-xs">Proposto: <strong>{it.valor_proposto}</strong></p>}
                {(it.aprovacoes||[]).length > 0 && (
                  <div className="text-xs text-muted-foreground">
                    Histórico: {(it.aprovacoes as any[]).map((h,i)=>`N${h.nivel}:${h.decisao}`).join(" → ")}
                  </div>
                )}
              </div>
            </div>
            <Textarea placeholder="Observação (opcional)" value={nota[it.id]||""}
              onChange={e => setNota({...nota, [it.id]: e.target.value})} className="h-16" />
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="outline" onClick={() => aprovar(entidade, it, "rejeitar")}>
                <X className="mr-1 h-4 w-4" /> Rejeitar
              </Button>
              <Button size="sm" onClick={() => aprovar(entidade, it, "aprovar")}>
                <Check className="mr-1 h-4 w-4" /> Aprovar
              </Button>
            </div>
          </CardContent></Card>
        ))}
      </div>
    )
  );

  return (
    <div className="space-y-4 p-6">
      <div>
        <h2 className="text-xl font-semibold sm:text-2xl flex items-center gap-2"><Workflow className="h-5 w-5" /> Aprovações multinível</h2>
        <p className="text-sm text-muted-foreground">Fluxo configurável: gestor → RH → diretor.</p>
      </div>

      <Tabs defaultValue="pendentes">
        <TabsList>
          <TabsTrigger value="pendentes">Pendentes</TabsTrigger>
          <TabsTrigger value="config">Configuração do fluxo</TabsTrigger>
        </TabsList>
        <TabsContent value="pendentes" className="space-y-4">
          <div>
            <h3 className="font-semibold mb-2">Ajustes ({ajustes.length})</h3>
            {renderLista("ajuste", ajustes)}
          </div>
          <div>
            <h3 className="font-semibold mb-2">Férias e afastamentos ({afast.length})</h3>
            {renderLista("afastamento", afast)}
          </div>
        </TabsContent>

        <TabsContent value="config" className="space-y-4">
          <Card><CardContent className="p-4 space-y-3">
            <p className="text-sm text-muted-foreground">
              Defina a sequência de papéis que devem aprovar cada tipo de solicitação. Quando uma solicitação for criada, ela passará por cada nível em ordem.
            </p>
            <div className="grid gap-3 grid-cols-1 sm:grid-cols-3">
              <div>
                <Label>Entidade</Label>
                <Select value={novoNivel.entidade} onValueChange={(v:any) => setNovoNivel({...novoNivel, entidade:v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ajuste">Ajustes de ponto</SelectItem>
                    <SelectItem value="afastamento">Férias / afastamentos</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Papel</Label>
                <Select value={novoNivel.papel} onValueChange={v => setNovoNivel({...novoNivel, papel:v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gestor">Gestor</SelectItem>
                    <SelectItem value="rh">RH</SelectItem>
                    <SelectItem value="diretor">Diretor</SelectItem>
                    <SelectItem value="financeiro">Financeiro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button onClick={addNivel} className="w-full"><Plus className="mr-2 h-4 w-4" /> Adicionar nível</Button>
              </div>
            </div>
          </CardContent></Card>

          {["ajuste","afastamento"].map(ent => {
            const c = configs.find(x => x.entidade === ent);
            const niveis: any[] = c?.niveis || [];
            return (
              <Card key={ent}><CardContent className="p-4 space-y-2">
                <h4 className="font-semibold">{ent === "ajuste" ? "Ajustes de ponto" : "Férias / afastamentos"}</h4>
                {niveis.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Nenhum nível configurado (apenas 1 aprovação requerida).</p>
                ) : (
                  <ol className="space-y-1">
                    {niveis.map((n:any, i:number) => (
                      <li key={i} className="flex items-center justify-between border-b py-1.5 text-sm">
                        <span><Badge variant="outline" className="mr-2">N{n.nivel}</Badge>{n.papel}</span>
                        <Button size="sm" variant="ghost" onClick={() => removerNivel(ent, i)}>
                          <Trash2 className="h-3 w-3 text-destructive" />
                        </Button>
                      </li>
                    ))}
                  </ol>
                )}
              </CardContent></Card>
            );
          })}
        </TabsContent>
      </Tabs>
    </div>
  );
}
