import { useEffect, useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Check, X, Workflow, Plus, Trash2, History, Sparkles, AlertTriangle, ShieldCheck } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { supabase } from "@/integrations/supabase/client";
import { usePontoEmpresa } from "./usePontoEmpresa";
import { toast } from "sonner";

type Entidade = "ajuste" | "afastamento";

const JUSTIFICATIVAS_PADRAO: Record<string, { aprovar: string[]; rejeitar: string[]; abonar: string[] }> = {
  atraso: {
    aprovar: [
      "Atraso justificado por trânsito anormal comprovado.",
      "Atraso por motivo de saúde com atestado anexado.",
      "Liberação prévia do gestor registrada.",
      "Compensação acordada no mesmo dia.",
    ],
    rejeitar: [
      "Reincidência sem justificativa válida.",
      "Sem comprovação documental do motivo informado.",
      "Já houve advertência verbal sobre o tema.",
    ],
    abonar: [
      "Abonado por liberalidade da empresa (1ª ocorrência).",
      "Abonado mediante compensação em banco de horas.",
      "Abonado conforme acordo coletivo vigente.",
    ],
  },
  falta: {
    aprovar: [
      "Falta justificada por atestado médico (CID válido).",
      "Falta por óbito familiar (art. 473 CLT).",
      "Falta por doação de sangue (até 1 dia/ano).",
      "Falta por convocação eleitoral/jurídica.",
    ],
    rejeitar: [
      "Falta sem comunicação prévia ao gestor.",
      "Atestado fora do prazo legal de entrega (48h).",
      "Reincidência injustificada.",
    ],
    abonar: [
      "Abonado por liberalidade — sem desconto em folha.",
      "Abonado com débito em banco de horas.",
      "Abonado conforme política interna.",
    ],
  },
  hora_extra: {
    aprovar: [
      "Hora extra autorizada previamente para demanda do setor.",
      "Necessidade operacional comprovada.",
      "Dentro do limite do acordo coletivo.",
    ],
    rejeitar: [
      "Hora extra não autorizada previamente.",
      "Excede limite diário permitido (2h/dia CLT).",
      "Demanda não justificada pelo gestor.",
    ],
    abonar: [],
  },
  saida_antecipada: {
    aprovar: [
      "Saída autorizada por motivo de saúde.",
      "Liberação do gestor registrada por escrito.",
      "Compensação acordada na mesma semana.",
    ],
    rejeitar: [
      "Saída sem autorização do gestor.",
      "Sem justificativa documental.",
    ],
    abonar: ["Abonado por liberalidade.", "Compensado em banco de horas."],
  },
  default: {
    aprovar: ["Justificativa válida e documentada.", "Aprovação dentro da política interna."],
    rejeitar: ["Sem documentação suficiente.", "Fora da política da empresa."],
    abonar: ["Abonado por liberalidade.", "Compensação em banco de horas."],
  },
};

function tipoKey(tipo: string): keyof typeof JUSTIFICATIVAS_PADRAO {
  const t = (tipo || "").toLowerCase();
  if (t.includes("atras")) return "atraso";
  if (t.includes("falta")) return "falta";
  if (t.includes("extra") || t.includes("he")) return "hora_extra";
  if (t.includes("saida") || t.includes("anteci")) return "saida_antecipada";
  return "default";
}

interface Historico {
  atrasos: number;
  faltas: number;
  saidas: number;
  extras: number;
  totalDias: number;
  ajustesAnteriores: number;
  aprovadosAnteriores: number;
  rejeitadosAnteriores: number;
  ultimoEvento?: string;
}

export default function PontoAprovacoes() {
  const { empresaId } = usePontoEmpresa();
  const [ajustes, setAjustes] = useState<any[]>([]);
  const [afast, setAfast] = useState<any[]>([]);
  const [configs, setConfigs] = useState<any[]>([]);
  const [nota, setNota] = useState<Record<string, string>>({});
  const [historicos, setHistoricos] = useState<Record<string, Historico>>({});
  const [openHist, setOpenHist] = useState<Record<string, boolean>>({});

  const load = useCallback(async () => {
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
  }, [empresaId]);
  useEffect(() => { load(); }, [load]);

  const carregarHistorico = useCallback(async (funcionarioId: string) => {
    if (historicos[funcionarioId]) return;
    const desde = new Date();
    desde.setDate(desde.getDate() - 90);
    const desdeStr = desde.toISOString().slice(0, 10);

    const [espelho, ajustesAnt] = await Promise.all([
      supabase.from("ponto_espelho_diario")
        .select("data,atraso_min,falta,saida_antec_min,extra_min")
        .eq("funcionario_id", funcionarioId)
        .gte("data", desdeStr),
      supabase.from("ponto_ajustes")
        .select("status,created_at")
        .eq("funcionario_id", funcionarioId)
        .gte("created_at", desde.toISOString()),
    ]);

    const rows = espelho.data || [];
    const hist: Historico = {
      atrasos: rows.filter((r: any) => (r.atraso_min || 0) > 0).length,
      faltas: rows.filter((r: any) => r.falta).length,
      saidas: rows.filter((r: any) => (r.saida_antec_min || 0) > 0).length,
      extras: rows.filter((r: any) => (r.extra_min || 0) > 0).length,
      totalDias: rows.length,
      ajustesAnteriores: (ajustesAnt.data || []).length,
      aprovadosAnteriores: (ajustesAnt.data || []).filter((a: any) => a.status === "aprovado").length,
      rejeitadosAnteriores: (ajustesAnt.data || []).filter((a: any) => a.status === "rejeitado").length,
      ultimoEvento: rows.sort((a: any, b: any) => b.data.localeCompare(a.data))[0]?.data,
    };
    setHistoricos(prev => ({ ...prev, [funcionarioId]: hist }));
  }, [historicos]);

  const toggleHist = (id: string, funcionarioId: string) => {
    const next = !openHist[id];
    setOpenHist(prev => ({ ...prev, [id]: next }));
    if (next) carregarHistorico(funcionarioId);
  };

  const decidir = async (entidade: Entidade, item: any, decisao: "aprovar" | "rejeitar" | "abonar") => {
    const tabela = entidade === "ajuste" ? "ponto_ajustes" : "ponto_ferias_afastamentos";
    const aprovado = decisao !== "rejeitar";
    const novoNivel = (item.nivel_aprovacao_atual || 1) + (aprovado ? 1 : 0);
    const aprovacoes = Array.isArray(item.aprovacoes) ? [...item.aprovacoes] : [];
    aprovacoes.push({
      nivel: item.nivel_aprovacao_atual,
      decisao,
      nota: nota[item.id] || null,
      em: new Date().toISOString(),
    });

    let novoStatus = item.status;
    if (decisao === "rejeitar") novoStatus = "rejeitado";
    else if (decisao === "abonar") novoStatus = "abonado";
    else if (novoNivel > (item.nivel_aprovacao_max || 1)) novoStatus = "aprovado";

    const { error } = await supabase.from(tabela).update({
      status: novoStatus,
      nivel_aprovacao_atual: aprovado ? novoNivel : item.nivel_aprovacao_atual,
      aprovacoes,
    }).eq("id", item.id);
    if (error) return toast.error(error.message);
    const msg = decisao === "aprovar" ? (novoStatus === "aprovado" ? "Aprovado" : "Avançou para próximo nível")
      : decisao === "abonar" ? "Abonado" : "Rejeitado";
    toast.success(msg);
    load();
  };

  const aplicarQuick = (id: string, texto: string) => {
    setNota(prev => ({ ...prev, [id]: (prev[id] ? prev[id] + " " : "") + texto }));
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

  const renderHistorico = (h?: Historico, tipo?: string) => {
    if (!h) return <div className="text-xs text-muted-foreground py-2">Carregando histórico…</div>;
    const tk = tipoKey(tipo || "");
    const destaque = tk === "atraso" ? h.atrasos : tk === "falta" ? h.faltas : tk === "saida_antecipada" ? h.saidas : tk === "hora_extra" ? h.extras : 0;
    const padrao = destaque >= 5 ? "frequente" : destaque >= 2 ? "ocasional" : "rara";
    const corPadrao = padrao === "frequente" ? "destructive" : padrao === "ocasional" ? "secondary" : "default";
    return (
      <div className="space-y-2 rounded-md border bg-muted/30 p-3 text-xs">
        <div className="flex items-center gap-2">
          <Badge variant={corPadrao as any} className="capitalize">
            {padrao === "frequente" && <AlertTriangle className="mr-1 h-3 w-3" />}
            Conduta {padrao}
          </Badge>
          <span className="text-muted-foreground">Últimos 90 dias ({h.totalDias} dias com espelho)</span>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <div><strong>{h.atrasos}</strong> atrasos</div>
          <div><strong>{h.faltas}</strong> faltas</div>
          <div><strong>{h.saidas}</strong> saídas antecip.</div>
          <div><strong>{h.extras}</strong> dias c/ HE</div>
        </div>
        <div className="flex flex-wrap gap-3 border-t pt-2 text-muted-foreground">
          <span>Ajustes anteriores: <strong className="text-foreground">{h.ajustesAnteriores}</strong></span>
          <span className="text-emerald-600">Aprovados: {h.aprovadosAnteriores}</span>
          <span className="text-destructive">Rejeitados: {h.rejeitadosAnteriores}</span>
          {h.ultimoEvento && <span>Último evento: {h.ultimoEvento}</span>}
        </div>
      </div>
    );
  };

  const renderQuick = (id: string, tipo: string) => {
    const tk = tipoKey(tipo);
    const set = JUSTIFICATIVAS_PADRAO[tk];
    const blocos: Array<[string, string[], string]> = [
      ["Aprovar", set.aprovar, "border-emerald-500/40 hover:bg-emerald-500/10"],
      ["Rejeitar", set.rejeitar, "border-destructive/40 hover:bg-destructive/10"],
      ["Abonar", set.abonar, "border-blue-500/40 hover:bg-blue-500/10"],
    ];
    return (
      <div className="space-y-2">
        {blocos.map(([label, arr, cls]) => arr.length > 0 && (
          <div key={label}>
            <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</div>
            <div className="flex flex-wrap gap-1.5">
              {arr.map((j, i) => (
                <button key={i} type="button" onClick={() => aplicarQuick(id, j)}
                  className={`rounded-full border px-2.5 py-1 text-xs transition ${cls}`}>
                  + {j.length > 50 ? j.slice(0, 50) + "…" : j}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderLista = (entidade: Entidade, items: any[]) => (
    items.length === 0 ? (
      <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">Nenhuma pendência.</CardContent></Card>
    ) : (
      <div className="space-y-2">
        {items.map(it => {
          const hist = historicos[it.funcionario_id];
          const tipoExibe = entidade === "ajuste" ? it.tipo : it.tipo;
          return (
          <Card key={it.id}><CardContent className="p-4 space-y-3">
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
                  {hist && (hist[tipoKey(tipoExibe) === "atraso" ? "atrasos" : tipoKey(tipoExibe) === "falta" ? "faltas" : tipoKey(tipoExibe) === "saida_antecipada" ? "saidas" : "extras"] >= 5) && (
                    <Badge variant="destructive" className="gap-1"><AlertTriangle className="h-3 w-3" /> Reincidente</Badge>
                  )}
                </div>
                {it.motivo && <p className="text-xs text-muted-foreground">📝 {it.motivo}</p>}
                {it.valor_proposto && <p className="text-xs">Proposto: <strong>{JSON.stringify(it.valor_proposto)}</strong></p>}
                {(it.aprovacoes||[]).length > 0 && (
                  <div className="text-xs text-muted-foreground">
                    Histórico aprovações: {(it.aprovacoes as any[]).map((h)=>`N${h.nivel}:${h.decisao}`).join(" → ")}
                  </div>
                )}
              </div>
            </div>

            <Collapsible open={openHist[it.id]} onOpenChange={() => toggleHist(it.id, it.funcionario_id)}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs">
                  <History className="h-3 w-3" />
                  {openHist[it.id] ? "Ocultar" : "Ver"} padrão de conduta (90 dias)
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-2">
                {renderHistorico(hist, tipoExibe)}
              </CollapsibleContent>
            </Collapsible>

            <div className="rounded-md border bg-muted/20 p-3 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold">
                <Sparkles className="h-3.5 w-3.5" /> Justificativas rápidas
              </div>
              {renderQuick(it.id, tipoExibe)}
            </div>

            <Textarea placeholder="Justificativa do encarregado (clique nas opções acima ou escreva)"
              value={nota[it.id]||""}
              onChange={e => setNota({...nota, [it.id]: e.target.value})} className="min-h-[60px]" />

            <div className="flex flex-wrap justify-end gap-2">
              <Button size="sm" variant="outline" onClick={() => decidir(entidade, it, "rejeitar")}>
                <X className="mr-1 h-4 w-4" /> Rejeitar
              </Button>
              <Button size="sm" variant="secondary" onClick={() => decidir(entidade, it, "abonar")}>
                <ShieldCheck className="mr-1 h-4 w-4" /> Abonar
              </Button>
              <Button size="sm" onClick={() => decidir(entidade, it, "aprovar")}>
                <Check className="mr-1 h-4 w-4" /> Aprovar
              </Button>
            </div>
          </CardContent></Card>
        );})}
      </div>
    )
  );

  return (
    <div className="space-y-4 p-6">
      <div>
        <h2 className="text-xl font-semibold sm:text-2xl flex items-center gap-2"><Workflow className="h-5 w-5" /> Aprovações multinível</h2>
        <p className="text-sm text-muted-foreground">Veja o padrão de conduta do funcionário e use justificativas rápidas ao aprovar, rejeitar ou abonar.</p>
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
