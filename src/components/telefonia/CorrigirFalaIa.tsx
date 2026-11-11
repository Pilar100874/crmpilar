import { useState } from "react";
import { Loader2, Pencil } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { corrigirFala } from "@/lib/voz/aprimorarRoteiro";
import type { RoteiroSalvo } from "@/lib/voz/roteirosLigacao";

export type AplicarCorrecao = (novo: RoteiroSalvo, mensagem: string) => Promise<void>;
type Modo = "trocar" | "regra" | "ia";

/** Abaixo de uma fala da IA no teste: corrige o que ela disse direto no roteiro. */
export function CorrigirFalaIa({ roteiro, etapa, dita, respostaAnterior, onAplicar }: {
  roteiro: RoteiroSalvo; etapa: number; dita: string; respostaAnterior?: string; onAplicar: AplicarCorrecao;
}) {
  const [aberto, setAberto] = useState(false);
  const [modo, setModo] = useState<Modo>(respostaAnterior ? "regra" : "trocar");
  const [texto, setTexto] = useState("");
  const [ocupado, setOcupado] = useState(false);

  const aplicar = async () => {
    const t = texto.trim(); if (!t) return;
    setOcupado(true);
    try {
      if (modo === "ia") {
        const { data, error } = await supabase.functions.invoke("voz-roteiro-teste", { body: { acao: "corrigir", fala: roteiro.etapas[etapa]?.fala, dita, correcao: t } });
        if (error || data?.error || !data?.fala) { toast.error(data?.error ?? "A IA não conseguiu reescrever agora"); return; }
        await onAplicar(corrigirFala(roteiro, etapa, "trocar", data.fala), `Etapa ${etapa + 1} reescrita: "${data.fala}"`);
      } else {
        const novo = corrigirFala(roteiro, etapa, modo, t, respostaAnterior);
        if (novo === roteiro) { toast.info("Nada mudou no roteiro"); return; }
        await onAplicar(novo, modo === "trocar" ? `Fala da etapa ${etapa + 1} trocada` : `Nova regra na etapa ${etapa + 1}`);
      }
      setAberto(false); setTexto("");
    } finally { setOcupado(false); }
  };

  return (
    <Popover open={aberto} onOpenChange={setAberto}>
      <PopoverTrigger asChild>
        <Button size="sm" variant="ghost" className="ml-3 mt-0.5 h-6 px-2 text-[11px] text-muted-foreground"><Pencil className="mr-1 h-3 w-3" /> Corrigir esta fala</Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 max-w-[90vw] space-y-3">
        <p className="text-xs font-medium text-foreground">O que a IA deveria ter dito?</p>
        <Textarea rows={3} value={texto} onChange={(e) => setTexto(e.target.value)} placeholder={modo === "ia" ? "Ex.: não cite valores e pergunte se ele recebeu o e-mail" : "Escreva a fala certa"} />
        <RadioGroup value={modo} onValueChange={(v) => setModo(v as Modo)} className="gap-2">
          {respostaAnterior && (
            <div className="flex items-start gap-2"><RadioGroupItem value="regra" id="cf-regra" className="mt-0.5" />
              <Label htmlFor="cf-regra" className="text-xs font-normal leading-snug">Quando o cliente disser "{respostaAnterior}", responder isso <span className="text-muted-foreground">(nova regra da etapa {etapa + 1})</span></Label></div>
          )}
          <div className="flex items-start gap-2"><RadioGroupItem value="trocar" id="cf-trocar" className="mt-0.5" />
            <Label htmlFor="cf-trocar" className="text-xs font-normal leading-snug">Trocar a fala da etapa {etapa + 1} por este texto</Label></div>
          <div className="flex items-start gap-2"><RadioGroupItem value="ia" id="cf-ia" className="mt-0.5" />
            <Label htmlFor="cf-ia" className="text-xs font-normal leading-snug">A IA reescreve a fala da etapa {etapa + 1} seguindo minha correção</Label></div>
        </RadioGroup>
        <Button size="sm" className="w-full" onClick={() => void aplicar()} disabled={ocupado || !texto.trim()}>
          {ocupado && <Loader2 className="mr-1 h-3 w-3 animate-spin" />} Aplicar no roteiro
        </Button>
      </PopoverContent>
    </Popover>
  );
}
