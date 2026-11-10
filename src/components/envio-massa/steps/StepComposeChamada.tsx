import { useEffect, useState } from "react";
import { AlertCircle, Bot, Check, ListOrdered, PhoneForwarded, PhoneOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { getEstabelecimentoId } from "@/lib/estabelecimentoUtils";
import { meuRamal } from "@/components/telefonia/IaAjudaAtendente";
import { CHAVE_PARAR_AO_RECEBER } from "@/components/atendimento/DiscadorModoDialog";
import { obterStatusRamalGlobal, ouvirStatusRamalGlobal } from "@/lib/telefonia/statusRamalGlobal";
import { cn } from "@/lib/utils";
import { CanalEnvio } from "../types";
import { ProdutoBusca } from "../ProdutoBusca";
import { ROTEIROS, lerConduta, regrasConduta, montarObjetivoRoteiro, pendenciasRoteiro, roteiroPorId, type DadosRoteiro, type RoteiroId } from "@/lib/voz/roteirosLigacao";
import { camposPendentes, camposUsaveis, textoCampos, type ValorCampo } from "@/lib/voz/camposAgente";

type Oferta = {
  roteiro: RoteiroId; roteiroEscolhido?: boolean; produto: { id: string; nome: string } | null; condicao: string; descontoMax: number; aviso: string; texto: string;
};
const OFERTA_INICIAL: Oferta = { roteiro: "reposicao", produto: null, condicao: "", descontoMax: 0, aviso: "", texto: "" };
/** Mantém o formulário ao voltar/avançar etapas. */
let ultimaOferta: Oferta | null = null;
let ultimosValores: Record<string, ValorCampo> = {};

interface Props {
  canal: CanalEnvio;
  modoDiscador: "sequencial" | "previa";
  pararAoReceber: boolean;
  agenteIaId: string;
  ramalIa: string;
  objetivoIa: string;
  onModoChange: (modo: "sequencial" | "previa") => void;
  onPararAoReceberChange: (valor: boolean) => void;
  onAgenteChange: (id: string, nome: string) => void;
  onRamalChange: (ramal: string) => void;
  onObjetivoChange: (objetivo: string) => void;
  onBack: () => void;
  onNext: () => void;
}

/** Etapa "Configurar" dos canais de chamada (Telefone e Ligação com IA). */
export function StepComposeChamada({
  canal, modoDiscador, pararAoReceber, agenteIaId, ramalIa, objetivoIa,
  onModoChange, onPararAoReceberChange, onAgenteChange, onRamalChange, onObjetivoChange,
  onBack, onNext,
}: Props) {
  const [agentes, setAgentes] = useState<{ id: string; nome: string; config?: unknown }[]>([]);
  const [ramalRegistrado, setRamalRegistrado] = useState(obterStatusRamalGlobal().registrado);

  // Status ao vivo do Pilar Fone: a ligação só toca no navegador se ele estiver registrado.
  useEffect(() => {
    const parar = ouvirStatusRamalGlobal((s) => setRamalRegistrado(s.registrado));
    return () => { parar(); };
  }, []);

  useEffect(() => {
    if (canal !== "ia") return;
    void (async () => {
      const est = await getEstabelecimentoId();
      const { data } = await (supabase as any).from("voz_agentes").select("id, nome, modos, config")
        .eq("estabelecimento_id", est).eq("ativo", true).order("created_at");
      const lista = (data ?? []).filter((a: any) => (a.modos ?? []).includes("ligar"));
      setAgentes(lista);
      if (lista[0] && agenteIaId !== lista[0].id) onAgenteChange(lista[0].id, lista[0].nome);
      const r = await meuRamal();
      if (r && !ramalIa) onRamalChange(r);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canal]);

  const [oferta, setOferta] = useState<Oferta>(() => ultimaOferta ?? { ...OFERTA_INICIAL, texto: objetivoIa });
  const mudar = (p: Partial<Oferta>) => {
    const n = { ...oferta, ...p };
    setOferta(n); ultimaOferta = n;
    emitir(n, valores);
  };
  const [valores, setValores] = useState<Record<string, ValorCampo>>(() => ultimosValores);
  const roteiro = roteiroPorId(oferta.roteiro);
  const dadosDe = (n: Oferta): DadosRoteiro => ({
    produtoNome: roteiroPorId(n.roteiro).campos.includes("produto") ? n.produto?.nome : undefined,
    condicao: n.condicao, descontoMax: n.descontoMax, aviso: n.aviso, observacoes: n.texto,
  });
  const emitir = (n: Oferta, v: Record<string, ValorCampo>) =>
    onObjetivoChange([regrasConduta(lerConduta(configAgente)), montarObjetivoRoteiro(n.roteiro, dadosDe(n)), textoCampos(campos, v)].filter(Boolean).join(" "));
  const mudarCampo = (id: string, valor: ValorCampo) => {
    const v = { ...valores, [id]: valor }; setValores(v); ultimosValores = v; emitir(oferta, v);
  };
  // Campos de produto do agente duplicariam o produto do roteiro: o roteiro decide o produto.
  const configAgente = agentes.find((a) => a.id === agenteIaId)?.config;
  // Campos antigos do agente só valem se forem fixos (o roteiro decide o resto).
  const campos = camposUsaveis(configAgente).filter((c) => c.tipo !== "produto" && c.fixo);
  // Roteiro padrão do agente, quando o usuário ainda não escolheu outro nesta sessão.
  useEffect(() => {
    if (canal !== "ia") return;
    const padrao = lerConduta(configAgente).roteiroPadrao;
    if (padrao && !ultimaOferta?.roteiroEscolhido) { mudar({ roteiro: padrao }); return; }
    emitir(oferta, valores);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agenteIaId, agentes.length]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (canal === "ia") mudar({}); }, [canal]);

  const pronto = canal === "telefone" ? true : !!agenteIaId && !!ramalIa.trim() && camposPendentes(campos, valores).length === 0
    && pendenciasRoteiro(oferta.roteiro, dadosDe(oferta)).length === 0;

  return (
    <div className="flex flex-col min-w-0 space-y-4">
      {canal === "telefone" ? (
        <>
          <Card className="p-4">
            <h4 className="font-medium mb-3 text-sm">Modo de discagem</h4>
            <div className="grid gap-2 sm:grid-cols-2">
              {([
                { id: "sequencial", label: "Discagem sequencial", icon: ListOrdered, desc: "Liga um após o outro" },
                { id: "previa", label: "Aprovação uma a uma", icon: PhoneForwarded, desc: "Você confirma cada ligação" },
              ] as const).map((m) => {
                const Icone = m.icon;
                const ativo = modoDiscador === m.id;
                return (
                  <button key={m.id} type="button" onClick={() => onModoChange(m.id)}
                    className={cn("flex items-center gap-2 rounded-xl border px-3 py-3 text-left transition-colors",
                      ativo ? "border-primary bg-primary/10" : "border-border/60 hover:bg-muted/50")}>
                    <Icone className={cn("h-4 w-4 shrink-0", ativo ? "text-primary" : "text-muted-foreground")} />
                    <span className="min-w-0">
                      <span className="block text-xs font-semibold text-foreground">{m.label}</span>
                      <span className="block text-[10px] text-muted-foreground">{m.desc}</span>
                    </span>
                    {ativo && <Check className="ml-auto h-4 w-4 shrink-0 text-primary" />}
                  </button>
                );
              })}
            </div>
            <label className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
              <Switch checked={pararAoReceber}
                onCheckedChange={(v) => { onPararAoReceberChange(v); localStorage.setItem(CHAVE_PARAR_AO_RECEBER, v ? "1" : "0"); }} />
              Parar ao receber ligação
            </label>
          </Card>

          {!ramalRegistrado && (
            <Card className="p-3 border-amber-200 bg-amber-50/50 dark:bg-amber-900/20 dark:border-amber-800">
              <div className="flex items-start gap-2">
                <PhoneOff className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  <strong>O Pilar Fone está desconectado.</strong> A ligação só toca neste navegador se o Pilar Fone
                  estiver aberto com a bolinha verde. Abra o Pilar Fone antes de iniciar as ligações.
                </p>
              </div>
            </Card>
          )}
        </>
      ) : (
        <>
          <Card className="p-4">
            <h4 className="font-medium mb-3 text-sm flex items-center gap-2">
              <Bot className="h-4 w-4 text-primary" />
              Agente de voz
            </h4>
            {agentes.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                Nenhum agente com "Fazer ligações" ativo. Crie um em Configurações de atendimento → Agentes de voz.
              </p>
            ) : (
              <p className="flex items-center gap-2 rounded-xl border border-primary/40 bg-primary/10 px-3 py-2.5 text-xs">
                <Check className="h-4 w-4 shrink-0 text-primary" />
                <span className="min-w-0"><span className="font-semibold text-foreground">Ligando com {agentes[0].nome}</span>
                  <span className="block text-[10px] text-muted-foreground">Agente único de ligações · faz a ligação e transfere para você</span></span>
              </p>
            )}
          </Card>

          <Card className="p-4 space-y-3">
            <h4 className="font-medium text-sm">Destino da transferência e objetivo</h4>
            <div className="space-y-1.5">
              <Label htmlFor="ramal-ia-massa" className="text-xs">Seu ramal <span className="text-destructive">*</span></Label>
              <Input id="ramal-ia-massa" value={ramalIa} onChange={(e) => onRamalChange(e.target.value)}
                placeholder="Ex.: 2222" className="h-9 text-xs sm:max-w-[10rem]" />
              <p className="text-[10px] text-muted-foreground">Quando o contato responder, a IA transfere a ligação para este ramal.</p>
            </div>
          </Card>

          {campos.length > 0 && (
            <Card className="p-4 space-y-3">
              <h4 className="font-medium text-sm">Informações para o agente</h4>
              {campos.map((c) => (
                <div key={c.id} className="space-y-1.5 min-w-0">
                  <Label className="text-xs">{c.rotulo}{!c.fixo && <span className="text-destructive"> *</span>}</Label>
                  {c.fixo ? (
                    <p className="rounded-md border border-dashed px-3 py-2 text-xs text-muted-foreground">{c.valor == null ? "—" : typeof c.valor === "string" ? c.valor || "—" : c.valor.nome} · definido no agente</p>
                  ) : c.tipo === "produto" ? (
                    <ProdutoBusca valor={(valores[c.id] as any) ?? null} onChange={(p) => mudarCampo(c.id, p)} />
                  ) : c.tipo === "opcoes" ? (
                    <div className="flex flex-wrap gap-2">
                      {(c.opcoes ?? []).map((o) => (
                        <Button key={o} type="button" size="sm" variant={valores[c.id] === o ? "default" : "outline"}
                          onClick={() => mudarCampo(c.id, valores[c.id] === o ? null : o)}>{o}</Button>
                      ))}
                    </div>
                  ) : (
                    <Input type={c.tipo === "numero" ? "number" : "text"} className="h-9 text-xs"
                      value={typeof valores[c.id] === "string" ? (valores[c.id] as string) : ""}
                      onChange={(e) => mudarCampo(c.id, e.target.value)} />
                  )}
                </div>
              ))}
            </Card>
          )}

          <Card className="p-4 space-y-3">
            <h4 className="font-medium text-sm">Roteiro da ligação</h4>
            <div className="grid gap-2 sm:grid-cols-2">
              {ROTEIROS.map((r) => {
                const ativo = oferta.roteiro === r.id;
                return (
                  <button key={r.id} type="button" onClick={() => mudar({ roteiro: r.id, roteiroEscolhido: true })}
                    className={cn("flex items-start gap-2 rounded-xl border px-3 py-2.5 text-left transition-colors",
                      ativo ? "border-primary bg-primary/10" : "border-border/60 hover:bg-muted/50")}>
                    <span className="min-w-0">
                      <span className="block text-xs font-semibold text-foreground">{r.rotulo}</span>
                      <span className="block text-[10px] text-muted-foreground">{r.desc}</span>
                    </span>
                    {ativo && <Check className="ml-auto h-4 w-4 shrink-0 text-primary" />}
                  </button>
                );
              })}
            </div>
            {roteiro.produtoPorCliente && (
              <p className="rounded-md bg-muted/50 px-3 py-2 text-[11px] text-muted-foreground">
                O produto é escolhido para cada cliente pelo histórico de compras dele.
              </p>
            )}
            {roteiro.campos.includes("produto") && (
              <div className="space-y-1.5">
                <Label className="text-xs">Produto <span className="text-destructive">*</span></Label>
                <ProdutoBusca valor={oferta.produto} onChange={(p) => mudar({ produto: p })} />
              </div>
            )}
            {(roteiro.campos.includes("condicao") || roteiro.campos.includes("desconto")) && (
              <div className="grid gap-3 sm:grid-cols-[1fr_9rem]">
                {roteiro.campos.includes("condicao") && (
                  <div className="space-y-1.5 min-w-0">
                    <Label className="text-xs">Condição especial (opcional)</Label>
                    <Input value={oferta.condicao} onChange={(e) => mudar({ condicao: e.target.value })} className="h-9 text-xs"
                      placeholder="Ex.: frete grátis acima de 5 fardos" />
                  </div>
                )}
                {roteiro.campos.includes("desconto") && (
                  <div className="space-y-1.5">
                    <Label className="text-xs">Desconto máx. (%)</Label>
                    <Input type="number" min={0} max={30} value={oferta.descontoMax || ""} className="h-9 text-xs"
                      onChange={(e) => mudar({ descontoMax: Math.min(30, Math.max(0, Number(e.target.value) || 0)) })} placeholder="0" />
                  </div>
                )}
              </div>
            )}
            {roteiro.campos.includes("aviso") && (
              <div className="space-y-1.5">
                <Label className="text-xs">O que avisar <span className="text-destructive">*</span></Label>
                <Input value={oferta.aviso} onChange={(e) => mudar({ aviso: e.target.value })} className="h-9 text-xs"
                  placeholder="Ex.: boleto com vencimento dia 15" />
              </div>
            )}
            <details className="rounded-md border border-dashed px-3 py-2 text-[11px] text-muted-foreground">
              <summary className="cursor-pointer font-medium">Como a IA vai conduzir</summary>
              <ol className="mt-2 list-decimal space-y-1 pl-4">
                <li>Cumprimenta e confirma se fala com o contato (na recepção, pede por ele).</li>
                {roteiro.etapas({ produtoNome: oferta.produto?.nome, condicao: oferta.condicao, aviso: oferta.aviso }).map((e) => <li key={e}>{e}</li>)}
                <li>Com interesse, transfere para o seu ramal com o resumo na tela.</li>
              </ol>
            </details>
            <div className="space-y-1.5">
              <Label htmlFor="objetivo-ia-massa" className="text-xs">Observações para a IA</Label>
              <Textarea id="objetivo-ia-massa" rows={2} value={oferta.texto} onChange={(e) => mudar({ texto: e.target.value })}
                className="text-xs" placeholder="Ex.: confirmar o interesse e agendar entrega para a próxima semana." />
            </div>
          </Card>

          <Card className="p-3 border-amber-200 bg-amber-50/50 dark:bg-amber-900/20 dark:border-amber-800">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700 dark:text-amber-400">
                As ligações com IA são executadas por um aparelho de voz conectado à rede do PABX
                (Coletor com o módulo Voz ligado, app Pilar Voz ou servidor de voz). Se nenhum estiver
                conectado, a campanha é interrompida com aviso.
              </p>
            </div>
          </Card>
        </>
      )}

      <div className="flex items-center justify-between border-t pt-4">
        <Button variant="outline" onClick={onBack}>Voltar</Button>
        <Button onClick={onNext} disabled={!pronto}>Continuar</Button>
      </div>
    </div>
  );
}
