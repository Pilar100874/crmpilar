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
              <div className="grid gap-2 sm:grid-cols-2">
                {agentes.map((a) => {
                  const ativo = agenteIaId === a.id;
                  return (
                    <button key={a.id} type="button" onClick={() => onAgenteChange(a.id, a.nome)}
                      className={cn("flex items-center gap-2 rounded-xl border px-3 py-3 text-left transition-colors",
                        ativo ? "border-primary bg-primary/10" : "border-border/60 hover:bg-muted/50")}>
                      <Bot className={cn("h-4 w-4 shrink-0", ativo ? "text-primary" : "text-muted-foreground")} />
                      <span className="min-w-0">
                        <span className="block truncate text-xs font-semibold text-foreground">{a.nome}</span>
                        <span className="block text-[10px] text-muted-foreground">Faz ligações e transfere para você</span>
                      </span>
                      {ativo && <Check className="ml-auto h-4 w-4 shrink-0 text-primary" />}
                    </button>
                  );
                })}
              </div>
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
            <div className="space-y-1.5">
              <Label htmlFor="objetivo-ia-massa" className="text-xs">Objetivo da ligação</Label>
              <Textarea id="objetivo-ia-massa" rows={3} value={objetivoIa} onChange={(e) => onObjetivoChange(e.target.value)}
                className="text-xs"
                placeholder="Ex.: oferecer a promoção da semana e confirmar o interesse do contato." />
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
