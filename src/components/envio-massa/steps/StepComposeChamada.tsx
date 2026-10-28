import { useEffect, useState } from "react";
import { AlertCircle, Bot, Check, ListOrdered, PhoneForwarded, PhoneOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { getEstabelecimentoId } from "@/lib/estabelecimentoUtils";
import { meuRamal } from "@/components/telefonia/IaAjudaAtendente";
import { CHAVE_PARAR_AO_RECEBER } from "@/components/atendimento/DiscadorModoDialog";
import { obterStatusRamalGlobal, ouvirStatusRamalGlobal } from "@/lib/telefonia/statusRamalGlobal";
import { cn } from "@/lib/utils";
import { CanalEnvio } from "../types";

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

/** Etapa "Montar" dos canais de chamada (Telefone e Ligação com IA). */
export function StepComposeChamada({
  canal, modoDiscador, pararAoReceber, agenteIaId, ramalIa, objetivoIa,
  onModoChange, onPararAoReceberChange, onAgenteChange, onRamalChange, onObjetivoChange,
  onBack, onNext,
}: Props) {
  const [agentes, setAgentes] = useState<{ id: string; nome: string }[]>([]);
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
      const { data } = await (supabase as any).from("voz_agentes").select("id, nome, modos")
        .eq("estabelecimento_id", est).eq("ativo", true);
      const lista = (data ?? []).filter((a: any) => (a.modos ?? []).includes("ligar"));
      setAgentes(lista);
      if (!agenteIaId && lista[0]) onAgenteChange(lista[0].id, lista[0].nome);
      const r = await meuRamal();
      if (r && !ramalIa) onRamalChange(r);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canal]);

  const pronto = canal === "telefone" ? true : !!agenteIaId && !!ramalIa.trim();

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto space-y-4">
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
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => onModoChange(m.id)}
                      className={cn(
                        "flex items-center gap-2 rounded-xl border px-3 py-3 text-left transition-colors",
                        ativo ? "border-primary bg-primary/10" : "border-border/60 hover:bg-muted/50"
                      )}
                    >
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
                <Switch
                  checked={pararAoReceber}
                  onCheckedChange={(v) => { onPararAoReceberChange(v); localStorage.setItem(CHAVE_PARAR_AO_RECEBER, v ? "1" : "0"); }}
                />
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
            <Card className="p-4 space-y-3">
              <h4 className="font-medium text-sm flex items-center gap-2">
                <Bot className="h-4 w-4 text-primary" />
                Configuração da ligação com IA
              </h4>
              <div className="grid gap-2 sm:grid-cols-[1fr_8rem]">
                <select
                  value={agenteIaId}
                  onChange={(e) => {
                    const a = agentes.find((x) => x.id === e.target.value);
                    onAgenteChange(e.target.value, a?.nome || "");
                  }}
                  className="h-9 rounded-md border border-input bg-background px-2 text-xs text-foreground"
                  aria-label="Agente de voz"
                >
                  {agentes.length === 0 && <option value="">Nenhum agente com "Fazer ligações"</option>}
                  {agentes.map((a) => <option key={a.id} value={a.id}>{a.nome}</option>)}
                </select>
                <Input
                  value={ramalIa}
                  onChange={(e) => onRamalChange(e.target.value)}
                  placeholder="Seu ramal"
                  className="h-9 text-xs"
                  aria-label="Ramal do atendente"
                />
                <Textarea
                  rows={3}
                  value={objetivoIa}
                  onChange={(e) => onObjetivoChange(e.target.value)}
                  className="text-xs sm:col-span-2"
                  placeholder="Objetivo da ligação (ex.: oferecer a promoção da semana). Quando o contato responder, a IA transfere para o seu ramal."
                />
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
      </div>

      <div className="flex items-center justify-between pt-4 border-t mt-4 shrink-0">
        <Button variant="outline" onClick={onBack}>Voltar</Button>
        <Button onClick={onNext} disabled={!pronto}>Continuar</Button>
      </div>
    </div>
  );
}
