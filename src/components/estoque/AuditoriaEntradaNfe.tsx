import { useEffect, useState } from "react";
import { FunctionsHttpError } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ShieldCheck, Loader2, AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import { OPERACOES, faltasConsulta, lerTributacao, montarConsulta } from "@/lib/fiscal/motorFiscal";
import { auditarNota, type NivelDivergencia } from "@/lib/fiscal/auditoriaEntrada";

const sb = supabase as any;
const soDig = (s?: string | null) => (s ?? "").replace(/\D/g, "");
const OPS_ENTRADA = OPERACOES.filter((o) => o.entrada);
const ESTILO: Record<NivelDivergencia, { rotulo: string; cls: string; Icone: any }> = {
  ok: { rotulo: "Em conformidade", cls: "border-primary/40 bg-primary/5 text-primary", Icone: CheckCircle2 },
  atencao: { rotulo: "Atenção", cls: "border-accent bg-accent/30 text-accent-foreground", Icone: AlertTriangle },
  erro: { rotulo: "Inconsistência fiscal", cls: "border-destructive/50 bg-destructive/10 text-destructive", Icone: XCircle },
};

/** Painel de auditoria da NF-e de entrada: consulta o Systax (fornecedor → sua unidade) e aponta divergências do XML. */
export function AuditoriaEntradaNfe({ edit, produtos, estabelecimentoId }: { edit: any; produtos: any[]; estabelecimentoId: string }) {
  const [unidades, setUnidades] = useState<any[]>([]);
  const [unidadeId, setUnidadeId] = useState("");
  const [operacao, setOperacao] = useState("compra");
  const [carregando, setCarregando] = useState(false);
  const [res, setRes] = useState<ReturnType<typeof auditarNota> | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    sb.from("unidades").select("id, nome, uf, cnpj, regime_tributario, crt, cnae_fiscal, inscricao_estadual").eq("estabelecimento_id", estabelecimentoId).order("nome").then(({ data }: any) => {
      const l = data ?? []; setUnidades(l);
      const igual = l.find((u: any) => soDig(u.cnpj) && soDig(u.cnpj) === soDig(edit.destinatario_cnpj));
      setUnidadeId((igual ?? l[0])?.id ?? "");
    });
  }, [estabelecimentoId, edit.destinatario_cnpj]);
  useEffect(() => { setRes(null); setErro(null); }, [edit.chave, unidadeId, operacao]);

  const auditar = async () => {
    setErro(null); setRes(null);
    const un = unidades.find((u) => u.id === unidadeId);
    if (!un) return setErro("Escolha a unidade que recebeu a nota");
    const { data: forn } = edit.empresa_id ? await sb.from("empresas").select("cnpj, estado, regime_tributario, cnae_fiscal").eq("id", edit.empresa_id).maybeSingle() : { data: null };
    const c = {
      operacao,
      emitente: { cnpj: forn?.cnpj ?? edit.participante_cnpj, uf: forn?.estado ?? edit.participante_uf, regime_tributario: forn?.regime_tributario, cnae_fiscal: forn?.cnae_fiscal },
      destinatario: { cnpj: un.cnpj, uf: un.uf, regime_tributario: un.regime_tributario, inscricao_estadual: un.inscricao_estadual, contribuinte_icms: "1", consumidor_final: operacao === "compra_uso_consumo" || operacao === "compra_ativo", cnae_fiscal: un.cnae_fiscal },
      itens: edit.itens.map((i: any) => { const p = produtos.find((x) => x.id === i.produto_id); return { produto_id: i.produto_id || null, ncm: i.ncm || p?.ncm, cest: p?.cest, origem: p?.origem, tipo_item_fiscal: p?.tipo_item_fiscal, valor: Number(i.valorTotal) || 0, quantidade: Number(i.quantidade) || 0 }; }),
    };
    const faltas = faltasConsulta(c).map((f) => f.replace("unidade emissora", "fornecedor").replace("regime tributário da unidade", "regime tributário do fornecedor").replace("UF do cliente", "UF da unidade"));
    if (faltas.length) return setErro("Complete antes de auditar: " + faltas.join(", "));
    setCarregando(true);
    try {
      const { data, error } = await supabase.functions.invoke("systax-calcular", { body: montarConsulta(c) });
      if (error) {
        let msg = error.message;
        if (error instanceof FunctionsHttpError) { try { const j = await error.context.json(); msg = j.error + (j.detalhes ? ` — ${typeof j.detalhes === "string" ? j.detalhes : JSON.stringify(j.detalhes)}` : ""); } catch { /* sem corpo */ } }
        throw new Error(msg);
      }
      setRes(auditarNota(edit.itens, data.itens.map(lerTributacao)));
    } catch (e: any) { setErro(e.message); } finally { setCarregando(false); }
  };

  if (!edit.itens?.length) return null;
  const est = res ? ESTILO[res.nivel] : null;
  return (
    <div className="space-y-2 rounded-md border p-2.5">
      <div className="flex flex-wrap items-center gap-2"><ShieldCheck className="h-4 w-4 text-primary" /><span className="text-sm font-medium">Auditoria fiscal (Systax)</span></div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <div><Label className="text-xs">Unidade que recebeu</Label><Select value={unidadeId} onValueChange={setUnidadeId}><SelectTrigger><SelectValue placeholder="Escolha" /></SelectTrigger><SelectContent>{unidades.map((u) => <SelectItem key={u.id} value={u.id}>{u.nome}</SelectItem>)}</SelectContent></Select></div>
        <div><Label className="text-xs">Tipo de entrada</Label><Select value={operacao} onValueChange={setOperacao}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{OPS_ENTRADA.map((o) => <SelectItem key={o.valor} value={o.valor}>{o.rotulo}</SelectItem>)}</SelectContent></Select></div>
        <Button size="sm" variant="outline" onClick={auditar} disabled={carregando}>{carregando ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-1 h-4 w-4" />}Auditar tributos</Button>
      </div>
      {erro && <p className="text-xs text-destructive">{erro}</p>}
      {res && est && <div className="space-y-2">
        <div className={`flex items-center gap-2 rounded-md border p-2 text-sm ${est.cls}`}><est.Icone className="h-4 w-4 shrink-0" /><b>{est.rotulo}</b><span className="text-xs">{res.totalDivergencias ? `${res.totalDivergencias} ponto(s) a verificar` : "Os impostos do XML batem com o calculado"}</span></div>
        {res.resultados.map((r) => (
          <div key={r.item} className="rounded-md border p-2 text-xs">
            <div className="flex flex-wrap items-center gap-1.5"><b className="min-w-0 break-words">{r.item}. {r.descricao}</b><Badge variant={r.nivel === "erro" ? "destructive" : r.nivel === "atencao" ? "secondary" : "outline"}>{ESTILO[r.nivel].rotulo}</Badge>{r.cfopEntradaSugerido && <span className="text-muted-foreground">CFOP de entrada: {r.cfopEntradaSugerido}</span>}</div>
            {r.divergencias.map((d, k) => <p key={k} className={d.nivel === "erro" ? "text-destructive" : ""}>• <b>{d.campo}:</b> nota {d.xml}, esperado {d.esperado} — {d.mensagem}</p>)}
          </div>
        ))}
      </div>}
    </div>
  );
}
