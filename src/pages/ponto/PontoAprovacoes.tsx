import { useEffect, useState, useCallback, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Check, X, Workflow, Plus, Trash2, History, Sparkles, AlertTriangle, ShieldCheck, Filter, ListChecks } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { supabase } from "@/integrations/supabase/client";
import { usePontoEmpresa } from "./usePontoEmpresa";
import { toast } from "sonner";

type Entidade = "ajuste" | "afastamento";
type Decisao = "aprovar" | "rejeitar" | "abonar";
type Categoria = "atraso" | "falta" | "hora_extra" | "saida_antecipada" | "geral";

interface MotivoFixo {
  codigo: string;
  label: string;
  categoria: Categoria;
  aplicavel: Decisao[];
  textoPadrao: string;
}

// Catálogo de MOTIVOS FIXOS (códigos imutáveis) — usados em relatórios e filtros.
const MOTIVOS_FIXOS: MotivoFixo[] = [
  // Atraso
  { codigo: "ATR_TRANSITO", label: "Atraso – Trânsito anormal", categoria: "atraso", aplicavel: ["aprovar","abonar"], textoPadrao: "Atraso justificado por trânsito anormal comprovado." },
  { codigo: "ATR_SAUDE", label: "Atraso – Saúde com atestado", categoria: "atraso", aplicavel: ["aprovar"], textoPadrao: "Atraso por motivo de saúde com atestado anexado." },
  { codigo: "ATR_LIBERACAO", label: "Atraso – Liberação prévia do gestor", categoria: "atraso", aplicavel: ["aprovar"], textoPadrao: "Liberação prévia do gestor registrada." },
  { codigo: "ATR_FAMILIAR", label: "Atraso – Emergência familiar", categoria: "atraso", aplicavel: ["aprovar","abonar"], textoPadrao: "Atraso por emergência familiar comunicada." },
  { codigo: "ATR_TRANSPORTE", label: "Atraso – Falha transporte público", categoria: "atraso", aplicavel: ["aprovar","abonar"], textoPadrao: "Falha do transporte público comprovada." },
  { codigo: "ATR_REINCIDENTE", label: "Atraso – Reincidente sem justificativa", categoria: "atraso", aplicavel: ["rejeitar"], textoPadrao: "Reincidência sem justificativa válida." },
  { codigo: "ATR_SEM_DOC", label: "Atraso – Sem documentação", categoria: "atraso", aplicavel: ["rejeitar"], textoPadrao: "Sem comprovação documental do motivo informado." },
  // Falta
  { codigo: "FAL_ATESTADO", label: "Falta – Atestado médico (CID)", categoria: "falta", aplicavel: ["aprovar"], textoPadrao: "Falta justificada por atestado médico com CID válido." },
  { codigo: "FAL_OBITO", label: "Falta – Óbito familiar (art. 473 CLT)", categoria: "falta", aplicavel: ["aprovar"], textoPadrao: "Falta por óbito familiar conforme art. 473 CLT." },
  { codigo: "FAL_DOACAO", label: "Falta – Doação de sangue", categoria: "falta", aplicavel: ["aprovar"], textoPadrao: "Falta por doação de sangue (até 1 dia/ano)." },
  { codigo: "FAL_CONVOCACAO", label: "Falta – Convocação eleitoral/jurídica", categoria: "falta", aplicavel: ["aprovar"], textoPadrao: "Falta por convocação eleitoral/jurídica." },
  { codigo: "FAL_PATERN_MATERN", label: "Falta – Licença paternidade/maternidade", categoria: "falta", aplicavel: ["aprovar"], textoPadrao: "Licença paternidade/maternidade legal." },
  { codigo: "FAL_INJUSTIFICADA", label: "Falta – Injustificada", categoria: "falta", aplicavel: ["rejeitar"], textoPadrao: "Falta sem comunicação prévia ao gestor." },
  { codigo: "FAL_ATESTADO_ATRASADO", label: "Falta – Atestado fora do prazo (48h)", categoria: "falta", aplicavel: ["rejeitar"], textoPadrao: "Atestado fora do prazo legal de entrega (48h)." },
  // Hora extra
  { codigo: "HE_AUTORIZADA", label: "HE – Autorizada previamente", categoria: "hora_extra", aplicavel: ["aprovar"], textoPadrao: "Hora extra autorizada previamente pelo gestor." },
  { codigo: "HE_DEMANDA", label: "HE – Demanda operacional", categoria: "hora_extra", aplicavel: ["aprovar"], textoPadrao: "Necessidade operacional comprovada do setor." },
  { codigo: "HE_ACT_CCT", label: "HE – Dentro do acordo coletivo", categoria: "hora_extra", aplicavel: ["aprovar"], textoPadrao: "Dentro do limite do acordo coletivo vigente." },
  { codigo: "HE_NAO_AUTORIZADA", label: "HE – Não autorizada previamente", categoria: "hora_extra", aplicavel: ["rejeitar"], textoPadrao: "Hora extra não autorizada previamente." },
  { codigo: "HE_EXCEDE_LIMITE", label: "HE – Excede limite legal (2h/dia)", categoria: "hora_extra", aplicavel: ["rejeitar"], textoPadrao: "Excede o limite de 2h diárias previsto na CLT." },
  // Saída antecipada
  { codigo: "SAI_SAUDE", label: "Saída – Motivo de saúde", categoria: "saida_antecipada", aplicavel: ["aprovar"], textoPadrao: "Saída autorizada por motivo de saúde." },
  { codigo: "SAI_LIBERACAO", label: "Saída – Liberação do gestor", categoria: "saida_antecipada", aplicavel: ["aprovar"], textoPadrao: "Liberação do gestor registrada por escrito." },
  { codigo: "SAI_FAMILIAR", label: "Saída – Emergência familiar", categoria: "saida_antecipada", aplicavel: ["aprovar","abonar"], textoPadrao: "Saída por emergência familiar comprovada." },
  { codigo: "SAI_SEM_AUTORIZACAO", label: "Saída – Sem autorização", categoria: "saida_antecipada", aplicavel: ["rejeitar"], textoPadrao: "Saída sem autorização do gestor." },
  // Geral / Abono
  { codigo: "GER_COMPENSACAO_BH", label: "Compensação em banco de horas", categoria: "geral", aplicavel: ["aprovar","abonar"], textoPadrao: "Compensação acordada via banco de horas." },
  { codigo: "GER_LIBERALIDADE", label: "Liberalidade da empresa", categoria: "geral", aplicavel: ["abonar"], textoPadrao: "Abonado por liberalidade da empresa." },
  { codigo: "GER_ACORDO_COLETIVO", label: "Acordo coletivo (CCT/ACT)", categoria: "geral", aplicavel: ["aprovar","abonar"], textoPadrao: "Conforme cláusula do acordo coletivo vigente." },
  { codigo: "GER_POLITICA_INTERNA", label: "Política interna", categoria: "geral", aplicavel: ["aprovar","abonar"], textoPadrao: "Conforme política interna da empresa." },
  { codigo: "GER_FORA_POLITICA", label: "Fora da política interna", categoria: "geral", aplicavel: ["rejeitar"], textoPadrao: "Fora da política interna da empresa." },
];

const MOTIVO_MAP: Record<string, MotivoFixo> = Object.fromEntries(MOTIVOS_FIXOS.map(m => [m.codigo, m]));

function tipoCategoria(tipo: string): Categoria {
  const t = (tipo || "").toLowerCase();
  if (t.includes("atras")) return "atraso";
  if (t.includes("falta")) return "falta";
  if (t.includes("extra") || t.includes("he")) return "hora_extra";
  if (t.includes("saida") || t.includes("anteci")) return "saida_antecipada";
  return "geral";
}

function motivosPara(tipo: string, decisao?: Decisao): MotivoFixo[] {
  const cat = tipoCategoria(tipo);
  return MOTIVOS_FIXOS.filter(m =>
    (m.categoria === cat || m.categoria === "geral") &&
    (!decisao || m.aplicavel.includes(decisao))
  );
}

interface Historico {
  atrasos: number; faltas: number; saidas: number; extras: number;
  totalDias: number; ajustesAnteriores: number;
  aprovadosAnteriores: number; rejeitadosAnteriores: number;
  ultimoEvento?: string;
  motivosFrequentes: Array<{ codigo: string; label: string; count: number }>;
}

export default function PontoAprovacoes() {
  const { empresaId } = usePontoEmpresa();
  const [ajustes, setAjustes] = useState<any[]>([]);
  const [afast, setAfast] = useState<any[]>([]);
  const [configs, setConfigs] = useState<any[]>([]);
  const [nota, setNota] = useState<Record<string, string>>({});
  const [motivoSel, setMotivoSel] = useState<Record<string, string>>({});
  const [historicos, setHistoricos] = useState<Record<string, Historico>>({});
  const [openHist, setOpenHist] = useState<Record<string, boolean>>({});

  // Filtros
  const [filtroCategoria, setFiltroCategoria] = useState<"todas" | Categoria>("todas");
  const [filtroMotivo, setFiltroMotivo] = useState<string>("todos");

  // Ocorrências decididas (para análise)
  const [ocorrencias, setOcorrencias] = useState<any[]>([]);
  const [ocFiltroMotivo, setOcFiltroMotivo] = useState<string>("todos");
  const [ocFiltroDecisao, setOcFiltroDecisao] = useState<string>("todas");

  const load = useCallback(async () => {
    if (!empresaId) return;
    const { data: funcs } = await supabase.from("ponto_funcionarios")
      .select("id, nome").eq("empresa_id", empresaId);
    const funcIds = (funcs || []).map(f => f.id);
    const nomeMap = new Map((funcs||[]).map(f => [f.id, f.nome]));

    const [aj, af, cf, ajDec] = await Promise.all([
      supabase.from("ponto_ajustes")
        .select("*").eq("status", "pendente").in("funcionario_id", funcIds)
        .order("created_at", { ascending: false }),
      supabase.from("ponto_ferias_afastamentos")
        .select("*").eq("status", "pendente").in("funcionario_id", funcIds)
        .order("created_at", { ascending: false }),
      supabase.from("ponto_aprovacao_config").select("*").eq("empresa_id", empresaId),
      supabase.from("ponto_ajustes")
        .select("*").in("status", ["aprovado","rejeitado","abonado"])
        .in("funcionario_id", funcIds)
        .order("updated_at", { ascending: false }).limit(300),
    ]);
    setAjustes((aj.data||[]).map((x:any) => ({...x, _nome: nomeMap.get(x.funcionario_id)})));
    setAfast((af.data||[]).map((x:any) => ({...x, _nome: nomeMap.get(x.funcionario_id)})));
    setConfigs(cf.data || []);
    setOcorrencias((ajDec.data||[]).map((x:any) => ({...x, _nome: nomeMap.get(x.funcionario_id)})));
  }, [empresaId]);
  useEffect(() => { load(); }, [load]);

  const carregarHistorico = useCallback(async (funcionarioId: string) => {
    if (historicos[funcionarioId]) return;
    const desde = new Date(); desde.setDate(desde.getDate() - 90);
    const desdeStr = desde.toISOString().slice(0, 10);

    const [espelho, ajustesAnt] = await Promise.all([
      supabase.from("ponto_espelho_diario")
        .select("data,atraso_min,falta,saida_antec_min,extra_min")
        .eq("funcionario_id", funcionarioId)
        .gte("data", desdeStr),
      supabase.from("ponto_ajustes")
        .select("status,aprovacoes,created_at")
        .eq("funcionario_id", funcionarioId)
        .gte("created_at", desde.toISOString()),
    ]);

    const rows = espelho.data || [];
    // Motivos frequentes (últimos 90d)
    const motivoCount = new Map<string, number>();
    for (const a of (ajustesAnt.data || []) as any[]) {
      for (const ev of (a.aprovacoes || []) as any[]) {
        if (ev?.motivo_codigo) motivoCount.set(ev.motivo_codigo, (motivoCount.get(ev.motivo_codigo) || 0) + 1);
      }
    }
    const motivosFrequentes = Array.from(motivoCount.entries())
      .sort((a,b) => b[1]-a[1])
      .slice(0,3)
      .map(([cod, count]) => ({ codigo: cod, label: MOTIVO_MAP[cod]?.label || cod, count }));

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
      motivosFrequentes,
    };
    setHistoricos(prev => ({ ...prev, [funcionarioId]: hist }));
  }, [historicos]);

  const toggleHist = (id: string, funcionarioId: string) => {
    const next = !openHist[id];
    setOpenHist(prev => ({ ...prev, [id]: next }));
    if (next) carregarHistorico(funcionarioId);
  };

  const decidir = async (entidade: Entidade, item: any, decisao: Decisao) => {
    const motivoCodigo = motivoSel[item.id];
    if (!motivoCodigo) {
      toast.error("Selecione um motivo fixo antes de decidir.");
      return;
    }
    const motivo = MOTIVO_MAP[motivoCodigo];
    if (motivo && !motivo.aplicavel.includes(decisao)) {
      toast.error(`O motivo "${motivo.label}" não se aplica a "${decisao}".`);
      return;
    }
    const tabela = entidade === "ajuste" ? "ponto_ajustes" : "ponto_ferias_afastamentos";
    const aprovado = decisao !== "rejeitar";
    const novoNivel = (item.nivel_aprovacao_atual || 1) + (aprovado ? 1 : 0);
    const aprovacoes = Array.isArray(item.aprovacoes) ? [...item.aprovacoes] : [];
    aprovacoes.push({
      nivel: item.nivel_aprovacao_atual,
      decisao,
      motivo_codigo: motivoCodigo,
      motivo_label: motivo?.label,
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

  const aplicarMotivo = (id: string, codigo: string) => {
    setMotivoSel(prev => ({ ...prev, [id]: codigo }));
    const m = MOTIVO_MAP[codigo];
    if (m) setNota(prev => ({ ...prev, [id]: m.textoPadrao }));
  };

  // ====== Config ======
  const [novoNivel, setNovoNivel] = useState({ entidade: "ajuste" as Entidade, papel: "gestor" });
  const upsertConfig = async (entidade: string, niveis: any[]) => {
    if (!empresaId) return;
    const existente = configs.find(c => c.entidade === entidade);
    if (existente) await supabase.from("ponto_aprovacao_config").update({ niveis }).eq("id", existente.id);
    else await supabase.from("ponto_aprovacao_config").insert({ empresa_id: empresaId, entidade, niveis });
    load();
  };
  const addNivel = async () => {
    const existente = configs.find(c => c.entidade === novoNivel.entidade);
    const atuais: any[] = existente?.niveis || [];
    await upsertConfig(novoNivel.entidade, [...atuais, { nivel: atuais.length + 1, papel: novoNivel.papel }]);
  };
  const removerNivel = async (entidade: string, idx: number) => {
    const existente = configs.find(c => c.entidade === entidade);
    if (!existente) return;
    const niveis = (existente.niveis as any[]).filter((_, i) => i !== idx).map((n, i) => ({ ...n, nivel: i + 1 }));
    await upsertConfig(entidade, niveis);
  };

  // ====== Filtros aplicados aos pendentes ======
  const ajustesFiltrados = useMemo(() => ajustes.filter(a => {
    if (filtroCategoria !== "todas" && tipoCategoria(a.tipo) !== filtroCategoria) return false;
    if (filtroMotivo !== "todos") {
      const cat = MOTIVO_MAP[filtroMotivo]?.categoria;
      if (cat && cat !== "geral" && tipoCategoria(a.tipo) !== cat) return false;
    }
    return true;
  }), [ajustes, filtroCategoria, filtroMotivo]);

  // ====== Resumo de ocorrências por motivo (decididas) ======
  const resumoMotivos = useMemo(() => {
    const map = new Map<string, { codigo: string; label: string; total: number; aprovados: number; rejeitados: number; abonados: number }>();
    for (const oc of ocorrencias) {
      const ult = (oc.aprovacoes || []).slice(-1)[0];
      if (!ult?.motivo_codigo) continue;
      const k = ult.motivo_codigo;
      const entry = map.get(k) || { codigo: k, label: MOTIVO_MAP[k]?.label || k, total: 0, aprovados: 0, rejeitados: 0, abonados: 0 };
      entry.total++;
      if (oc.status === "aprovado") entry.aprovados++;
      else if (oc.status === "rejeitado") entry.rejeitados++;
      else if (oc.status === "abonado") entry.abonados++;
      map.set(k, entry);
    }
    return Array.from(map.values()).sort((a,b) => b.total - a.total);
  }, [ocorrencias]);

  const ocorrenciasFiltradas = useMemo(() => ocorrencias.filter(o => {
    const ult = (o.aprovacoes || []).slice(-1)[0];
    if (ocFiltroMotivo !== "todos" && ult?.motivo_codigo !== ocFiltroMotivo) return false;
    if (ocFiltroDecisao !== "todas" && o.status !== ocFiltroDecisao) return false;
    return true;
  }), [ocorrencias, ocFiltroMotivo, ocFiltroDecisao]);

  const renderHistorico = (h?: Historico, tipo?: string) => {
    if (!h) return <div className="text-xs text-muted-foreground py-2">Carregando histórico…</div>;
    const tk = tipoCategoria(tipo || "");
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
          {h.ultimoEvento && <span>Último: {h.ultimoEvento}</span>}
        </div>
        {h.motivosFrequentes.length > 0 && (
          <div className="border-t pt-2">
            <div className="mb-1 font-semibold">Motivos mais usados (90d):</div>
            <div className="flex flex-wrap gap-1">
              {h.motivosFrequentes.map(m => (
                <Badge key={m.codigo} variant="outline" className="text-[10px]">{m.label} · {m.count}x</Badge>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderMotivos = (id: string, tipo: string) => {
    const motivos = motivosPara(tipo);
    const selecionado = motivoSel[id];
    return (
      <div className="space-y-2">
        <Label className="text-xs">Motivo fixo (obrigatório) — usado em filtros e relatórios</Label>
        <Select value={selecionado || ""} onValueChange={(v) => aplicarMotivo(id, v)}>
          <SelectTrigger><SelectValue placeholder="Selecione um motivo…" /></SelectTrigger>
          <SelectContent className="max-h-72">
            {(["aprovar","abonar","rejeitar"] as Decisao[]).map(d => {
              const opts = motivos.filter(m => m.aplicavel.includes(d));
              if (!opts.length) return null;
              return (
                <div key={d}>
                  <div className="px-2 py-1 text-[10px] font-bold uppercase text-muted-foreground">{d === "aprovar" ? "Aprovar" : d === "abonar" ? "Abonar" : "Rejeitar"}</div>
                  {opts.map(m => (
                    <SelectItem key={m.codigo} value={m.codigo}>
                      <span className="font-mono text-[10px] mr-1 opacity-60">{m.codigo}</span> {m.label}
                    </SelectItem>
                  ))}
                </div>
              );
            })}
          </SelectContent>
        </Select>
        {selecionado && (
          <Badge variant="secondary" className="text-[10px]">
            Selecionado: {MOTIVO_MAP[selecionado]?.label}
          </Badge>
        )}
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
          const cat = tipoCategoria(it.tipo);
          const reincidente = hist && (cat === "atraso" ? hist.atrasos : cat === "falta" ? hist.faltas : cat === "saida_antecipada" ? hist.saidas : cat === "hora_extra" ? hist.extras : 0) >= 5;
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
                  {reincidente && <Badge variant="destructive" className="gap-1"><AlertTriangle className="h-3 w-3" /> Reincidente</Badge>}
                </div>
                {it.motivo && <p className="text-xs text-muted-foreground">📝 {it.motivo}</p>}
                {(it.aprovacoes||[]).length > 0 && (
                  <div className="text-xs text-muted-foreground">
                    Histórico: {(it.aprovacoes as any[]).map((h)=>`N${h.nivel}:${h.decisao}${h.motivo_codigo ? `(${h.motivo_codigo})` : ""}`).join(" → ")}
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
              <CollapsibleContent className="pt-2">{renderHistorico(hist, it.tipo)}</CollapsibleContent>
            </Collapsible>

            <div className="rounded-md border bg-muted/20 p-3 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold">
                <Sparkles className="h-3.5 w-3.5" /> Decisão
              </div>
              {renderMotivos(it.id, it.tipo)}
              <Textarea placeholder="Observação adicional (opcional)"
                value={nota[it.id]||""}
                onChange={e => setNota({...nota, [it.id]: e.target.value})} className="min-h-[60px]" />
            </div>

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
        <p className="text-sm text-muted-foreground">Selecione um <strong>motivo fixo</strong> (código padronizado) para cada decisão — usado em filtros, ocorrências e relatórios.</p>
      </div>

      <Tabs defaultValue="pendentes">
        <TabsList>
          <TabsTrigger value="pendentes">Pendentes</TabsTrigger>
          <TabsTrigger value="ocorrencias"><ListChecks className="mr-1 h-3.5 w-3.5" />Ocorrências e motivos</TabsTrigger>
          <TabsTrigger value="config">Configuração</TabsTrigger>
        </TabsList>

        <TabsContent value="pendentes" className="space-y-4">
          <Card><CardContent className="flex flex-wrap items-end gap-3 p-3">
            <div className="flex-1 min-w-[160px]">
              <Label className="text-xs"><Filter className="mr-1 inline h-3 w-3" />Categoria</Label>
              <Select value={filtroCategoria} onValueChange={(v:any) => setFiltroCategoria(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas</SelectItem>
                  <SelectItem value="atraso">Atraso</SelectItem>
                  <SelectItem value="falta">Falta</SelectItem>
                  <SelectItem value="hora_extra">Hora extra</SelectItem>
                  <SelectItem value="saida_antecipada">Saída antecipada</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 min-w-[220px]">
              <Label className="text-xs">Filtrar por motivo fixo</Label>
              <Select value={filtroMotivo} onValueChange={setFiltroMotivo}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent className="max-h-72">
                  <SelectItem value="todos">Todos os motivos</SelectItem>
                  {MOTIVOS_FIXOS.map(m => <SelectItem key={m.codigo} value={m.codigo}>{m.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </CardContent></Card>

          <div>
            <h3 className="font-semibold mb-2">Ajustes ({ajustesFiltrados.length})</h3>
            {renderLista("ajuste", ajustesFiltrados)}
          </div>
          <div>
            <h3 className="font-semibold mb-2">Férias e afastamentos ({afast.length})</h3>
            {renderLista("afastamento", afast)}
          </div>
        </TabsContent>

        <TabsContent value="ocorrencias" className="space-y-4">
          <Card><CardContent className="p-4 space-y-3">
            <h3 className="font-semibold flex items-center gap-2"><ListChecks className="h-4 w-4" /> Resumo por motivo (decisões registradas)</h3>
            {resumoMotivos.length === 0 ? (
              <p className="text-xs text-muted-foreground">Nenhuma decisão com motivo fixo registrada ainda.</p>
            ) : (
              <div className="overflow-x-auto rounded border">
                <table className="w-full text-sm resp-table">
                  <thead className="bg-muted/50"><tr className="text-left">
                    <th className="p-2">Código</th><th className="p-2">Motivo</th>
                    <th className="p-2 text-right">Total</th>
                    <th className="p-2 text-right text-emerald-600">Aprovados</th>
                    <th className="p-2 text-right text-blue-600">Abonados</th>
                    <th className="p-2 text-right text-destructive">Rejeitados</th>
                    <th className="p-2"></th>
                  </tr></thead>
                  <tbody>
                    {resumoMotivos.map(r => (
                      <tr key={r.codigo} className="border-t">
                        <td className="p-2 font-mono text-xs">{r.codigo}</td>
                        <td className="p-2">{r.label}</td>
                        <td className="p-2 text-right font-semibold">{r.total}</td>
                        <td className="p-2 text-right">{r.aprovados}</td>
                        <td className="p-2 text-right">{r.abonados}</td>
                        <td className="p-2 text-right">{r.rejeitados}</td>
                        <td className="p-2"><Button size="sm" variant="ghost" onClick={() => setOcFiltroMotivo(r.codigo)}>Filtrar</Button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent></Card>

          <Card><CardContent className="p-4 space-y-3">
            <div className="flex flex-wrap items-end gap-3">
              <div className="flex-1 min-w-[200px]">
                <Label className="text-xs">Motivo</Label>
                <Select value={ocFiltroMotivo} onValueChange={setOcFiltroMotivo}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent className="max-h-72">
                    <SelectItem value="todos">Todos</SelectItem>
                    {MOTIVOS_FIXOS.map(m => <SelectItem key={m.codigo} value={m.codigo}>{m.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1 min-w-[160px]">
                <Label className="text-xs">Decisão</Label>
                <Select value={ocFiltroDecisao} onValueChange={setOcFiltroDecisao}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todas">Todas</SelectItem>
                    <SelectItem value="aprovado">Aprovados</SelectItem>
                    <SelectItem value="abonado">Abonados</SelectItem>
                    <SelectItem value="rejeitado">Rejeitados</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="overflow-x-auto rounded border">
              <table className="w-full text-sm resp-table">
                <thead className="bg-muted/50"><tr className="text-left">
                  <th className="p-2">Data</th><th className="p-2">Funcionário</th>
                  <th className="p-2">Tipo</th><th className="p-2">Decisão</th>
                  <th className="p-2">Motivo</th><th className="p-2">Observação</th>
                </tr></thead>
                <tbody>
                  {ocorrenciasFiltradas.length === 0 ? (
                    <tr><td colSpan={6} className="p-4 text-center text-muted-foreground text-xs">Nenhuma ocorrência com esses filtros.</td></tr>
                  ) : ocorrenciasFiltradas.map(o => {
                    const ult = (o.aprovacoes || []).slice(-1)[0] || {};
                    return (
                      <tr key={o.id} className="border-t">
                        <td className="p-2 whitespace-nowrap">{o.data}</td>
                        <td className="p-2">{o._nome}</td>
                        <td className="p-2"><Badge variant="outline">{o.tipo}</Badge></td>
                        <td className="p-2">
                          <Badge variant={o.status === "aprovado" ? "default" : o.status === "abonado" ? "secondary" : "destructive"}>
                            {o.status}
                          </Badge>
                        </td>
                        <td className="p-2 text-xs">
                          {ult.motivo_codigo ? (
                            <>
                              <span className="font-mono text-[10px] opacity-60">{ult.motivo_codigo}</span><br/>
                              {ult.motivo_label}
                            </>
                          ) : <span className="text-muted-foreground">—</span>}
                        </td>
                        <td className="p-2 text-xs text-muted-foreground">{ult.nota || "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="config" className="space-y-4">
          <Card><CardContent className="p-4 space-y-3">
            <p className="text-sm text-muted-foreground">
              Defina a sequência de papéis que devem aprovar cada tipo de solicitação.
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
                  <p className="text-xs text-muted-foreground">Nenhum nível configurado.</p>
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
