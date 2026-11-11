import { useEffect, useRef, useState } from "react";
import { Loader2, Mic, RotateCcw, Send } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { compilarRoteiro, lerConduta, regrasConduta, regrasConversa, type RoteiroSalvo } from "@/lib/voz/roteirosLigacao";
import { falaNaoEntendida, type Fala } from "@/lib/voz/aprimorarRoteiro";
import { AprimorarFala, type Aprimorar } from "./AprimorarFala";
import { CorrigirFalaIa, type AplicarCorrecao } from "./CorrigirFalaIa";
import type { AgenteSim } from "./SimuladorLigacaoVoz";

type Linha = Fala & { etapa?: number; regra?: string | null };

/** Teste do roteiro no navegador, sem ligação: digite ou fale e veja etapa e regra acionadas. */
export function SimuladorTelaVoz({ roteiro, agente, onAprimorar, onCorrigir }: { roteiro: RoteiroSalvo; agente?: AgenteSim; onAprimorar: Aprimorar; onCorrigir?: AplicarCorrecao }) {
  const [falas, setFalas] = useState<Linha[]>([]);
  const [txt, setTxt] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [ouvindo, setOuvindo] = useState(false);
  const fim = useRef<HTMLDivElement>(null);
  const prompt = [regrasConversa("teste"), regrasConduta(lerConduta(agente?.config)),
    compilarRoteiro(roteiro, { produtoNome: "produto de exemplo", aviso: "boleto em aberto", descontoMax: 5, condicao: "frete grátis" })].join("\n");

  const turno = async (hist: Linha[]) => {
    setCarregando(true);
    const { data, error } = await supabase.functions.invoke("voz-roteiro-teste", { body: { prompt, historico: hist.map(({ papel, texto }) => ({ papel, texto })) } });
    setCarregando(false);
    if (error || data?.error) return toast.error(data?.error ?? "Falha ao simular");
    const etapa = Math.max(0, Math.min(roteiro.etapas.length - 1, (data.etapa ?? 1) - 1));
    const nova = hist.map((f, i) => (i === hist.length - 1 && f.papel === "cliente" ? { ...f, etapa: f.etapa ?? etapa, regra: data.regra } : f));
    const marca = data.acao === "transferir" ? " [transferiria para o atendente]" : data.acao === "encerrar" ? " [encerraria a ligação]" : "";
    setFalas([...nova, { papel: "agente", texto: `${data.resposta}${marca}`, etapa }]);
  };
  useEffect(() => { void turno([]); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);
  useEffect(() => { fim.current?.scrollIntoView({ block: "nearest" }); }, [falas]);

  const enviar = (t = txt) => {
    if (!t.trim() || carregando) return;
    const ultimaEtapa = [...falas].reverse().find((f) => f.papel === "agente")?.etapa ?? 0;
    const h = [...falas, { papel: "cliente", texto: t.trim(), etapa: ultimaEtapa }];
    setFalas(h); setTxt(""); void turno(h);
  };
  const microfone = () => {
    const SR = (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition;
    if (!SR) return toast.error("Este navegador não permite falar pelo microfone; digite a resposta");
    const r = new SR(); r.lang = "pt-BR"; r.interimResults = false;
    r.onresult = (e: any) => enviar(e.results[0][0].transcript);
    r.onend = () => setOuvindo(false); r.onerror = () => setOuvindo(false);
    setOuvindo(true); r.start();
  };

  return (
    <div className="space-y-3">
      <div className="max-h-[45dvh] space-y-2 overflow-y-auto rounded-md border border-border bg-muted/40 p-3">
        {falas.map((f, i) => (
          <div key={i}>
            <p className="break-words text-sm"><span className="font-semibold text-foreground">{f.papel === "agente" ? "IA" : "Você"}:</span> <span className="text-foreground">{f.texto}</span>
              {f.papel === "agente" && f.etapa !== undefined && <Badge variant="outline" className="ml-2 text-[10px]">Etapa {f.etapa + 1}</Badge>}</p>
            {onCorrigir && f.papel === "agente" && f.etapa !== undefined && (
              <CorrigirFalaIa roteiro={roteiro} etapa={f.etapa} dita={f.texto}
                respostaAnterior={falas[i - 1]?.papel === "cliente" ? falas[i - 1].texto : undefined} onAplicar={onCorrigir} />
            )}
            {f.papel === "cliente" && f.etapa !== undefined && falas[i + 1] && (
              <AprimorarFala roteiro={roteiro} etapa={f.etapa} resposta={f.texto} naoEntendida={!f.regra && falaNaoEntendida(falas, i)} onAprimorar={onAprimorar} />
            )}
          </div>
        ))}
        {carregando && <p className="flex items-center gap-1 text-xs text-muted-foreground"><Loader2 className="h-3 w-3 animate-spin" /> IA pensando…</p>}
        <div ref={fim} />
      </div>
      <div className="flex gap-2">
        <Input value={txt} onChange={(e) => setTxt(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") enviar(); }} placeholder="Responda como o cliente…" disabled={carregando} />
        <Button size="icon" variant={ouvindo ? "default" : "outline"} aria-label="Falar pelo microfone" onClick={microfone} disabled={carregando}><Mic className="h-4 w-4" /></Button>
        <Button size="icon" aria-label="Enviar" onClick={() => enviar()} disabled={carregando || !txt.trim()}><Send className="h-4 w-4" /></Button>
        <Button size="icon" variant="ghost" aria-label="Recomeçar" onClick={() => { setFalas([]); void turno([]); }}><RotateCcw className="h-4 w-4" /></Button>
      </div>
      <p className="text-xs text-muted-foreground">Nenhuma ligação é feita. Ao adicionar uma resposta ou corrigir uma fala, o roteiro é ajustado na hora.</p>
    </div>
  );
}
