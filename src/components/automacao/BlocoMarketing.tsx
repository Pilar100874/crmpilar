import { useEffect, useState } from "react";
import { Loader2, Megaphone } from "lucide-react";
import { Bloco } from "@/lib/automacao/api";
import { supabase } from "@/integrations/supabase/client";
import { invokeComRetry } from "@/lib/invokeComRetry";
import { iconePorNome } from "@/lib/automacao/icones";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Cfg {
  automacao_id?: string;
  confirmar?: boolean;
  icone?: string;
  mostrar_status?: boolean;
}

/** Botão do painel que dispara uma automação de marketing. */
export default function BlocoMarketing({ bloco, edicao }: { bloco: Bloco; edicao?: boolean }) {
  const cfg = (bloco.config ?? {}) as Cfg;
  const Icone = cfg.icone ? iconePorNome(cfg.icone) : Megaphone;
  const [nomeAutomacao, setNomeAutomacao] = useState<string>("");
  const [rodando, setRodando] = useState(false);
  const [confirmar, setConfirmar] = useState(false);
  const [ultima, setUltima] = useState<string>("");

  useEffect(() => {
    let vivo = true;
    (async () => {
      if (!cfg.automacao_id) { setNomeAutomacao(""); return; }
      const { data } = await (supabase as any)
        .from("marketing_automations")
        .select("name")
        .eq("id", cfg.automacao_id)
        .maybeSingle();
      if (vivo) setNomeAutomacao(data?.name ?? "");
    })();
    return () => { vivo = false; };
  }, [cfg.automacao_id]);

  const executar = async () => {
    if (!cfg.automacao_id) {
      toast.error("Escolha a automação de marketing na edição do elemento.");
      return;
    }
    setRodando(true);
    try {
      const data = await invokeComRetry<any>(
        "marketing-automation-execute",
        { automationId: cfg.automacao_id },
        { tentativas: 2 },
      );
      if (data && data.success === false) throw new Error(data.error || "Falha ao executar");
      setUltima(new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }));
      toast.success("Automação de marketing iniciada!");
    } catch (e: any) {
      toast.error(e?.message || "Não foi possível iniciar a automação");
    } finally {
      setRodando(false);
    }
  };

  const aoClicar = () => {
    if (edicao) return;
    if (cfg.confirmar !== false) setConfirmar(true);
    else executar();
  };

  return (
    <>
      <button
        type="button"
        onClick={aoClicar}
        disabled={rodando}
        className={cn(
          "h-full w-full overflow-hidden rounded-2xl border p-3 text-left transition-colors",
          rodando ? "border-primary bg-primary/20" : "border-border bg-card hover:border-primary/50",
        )}
      >
        <div className="flex h-full min-h-0 flex-col items-center justify-center gap-2 text-center">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/15 text-primary">
            {rodando ? <Loader2 className="h-6 w-6 animate-spin" /> : <Icone className="h-6 w-6" />}
          </span>
          <p className="truncate text-sm font-semibold">{bloco.nome || nomeAutomacao || "Marketing"}</p>
          {cfg.mostrar_status !== false && (
            <p className="truncate text-[11px] text-muted-foreground">
              {rodando
                ? "Disparando…"
                : ultima
                  ? `Último disparo às ${ultima}`
                  : nomeAutomacao || "Toque para disparar"}
            </p>
          )}
        </div>
      </button>

      <AlertDialog open={confirmar} onOpenChange={setConfirmar}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disparar automação de marketing?</AlertDialogTitle>
            <AlertDialogDescription>
              {nomeAutomacao
                ? `A automação "${nomeAutomacao}" será executada agora e as mensagens serão enviadas.`
                : "A automação será executada agora e as mensagens serão enviadas."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => executar()}>Disparar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
