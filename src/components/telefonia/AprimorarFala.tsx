import { useState } from "react";
import { AlertTriangle, CheckCircle2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ACOES, type AcaoCondicao, type RoteiroSalvo } from "@/lib/voz/roteirosLigacao";
import { respostaReconhecida } from "@/lib/voz/aprimorarRoteiro";

export type Aprimorar = (etapa: number, resposta: string, acao: AcaoCondicao, texto?: string) => Promise<void>;

/** Abaixo de uma fala do cliente: mostra a etapa e permite incluir a resposta numa regra do roteiro com 1 clique. */
export function AprimorarFala({ roteiro, etapa, resposta, naoEntendida, onAprimorar }: {
  roteiro: RoteiroSalvo; etapa: number; resposta: string; naoEntendida?: boolean; onAprimorar: Aprimorar;
}) {
  const [et, setEt] = useState(etapa);
  const [acao, setAcao] = useState<AcaoCondicao>("responder");
  const [texto, setTexto] = useState("");
  const [aberto, setAberto] = useState(false);
  const ok = respostaReconhecida(roteiro, et, resposta);
  return (
    <div className="ml-3 mt-1 space-y-1 border-l-2 border-border pl-2">
      <div className="flex flex-wrap items-center gap-1 text-[11px]">
        <Select value={String(et)} onValueChange={(v) => setEt(Number(v))}>
          <SelectTrigger className="h-6 w-auto gap-1 px-2 text-[11px]"><SelectValue /></SelectTrigger>
          <SelectContent>{roteiro.etapas.map((e, i) => <SelectItem key={i} value={String(i)}>Etapa {i + 1} · {e.titulo}</SelectItem>)}</SelectContent>
        </Select>
        {ok && !naoEntendida
          ? <span className="flex items-center gap-1 text-primary"><CheckCircle2 className="h-3 w-3" /> resposta já está nas regras</span>
          : <span className="flex items-center gap-1 text-destructive"><AlertTriangle className="h-3 w-3" /> {naoEntendida ? "a IA não entendeu" : "não acionou nenhuma regra desta etapa"}</span>}
      </div>
      {(!ok || naoEntendida) && (
        <div className="flex flex-wrap gap-1">
          <Button size="sm" variant="outline" className="h-6 px-2 text-[11px]" onClick={() => void onAprimorar(et, resposta, "avancar")}><Plus className="mr-0.5 h-3 w-3" /> Tratar como Sim / Avançar</Button>
          <Button size="sm" variant="outline" className="h-6 px-2 text-[11px]" onClick={() => void onAprimorar(et, resposta, "responder", "Sem problema. Qual dia fica melhor para eu te retornar?")}><Plus className="mr-0.5 h-3 w-3" /> Tratar como Não / Reagendar</Button>
          <Popover open={aberto} onOpenChange={setAberto}>
            <PopoverTrigger asChild><Button size="sm" variant="outline" className="h-6 px-2 text-[11px]"><Plus className="mr-0.5 h-3 w-3" /> Nova regra</Button></PopoverTrigger>
            <PopoverContent className="w-72 space-y-2">
              <p className="text-xs font-medium text-foreground">SE o cliente disser "{resposta}"</p>
              <Select value={acao} onValueChange={(v) => setAcao(v as AcaoCondicao)}>
                <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                <SelectContent>{ACOES.map((a) => <SelectItem key={a.id} value={a.id}>{a.rotulo}</SelectItem>)}</SelectContent>
              </Select>
              <Input className="h-8" value={texto} onChange={(e) => setTexto(e.target.value)} placeholder={acao === "responder" ? "O que responder" : "Complemento (opcional)"} />
              <Button size="sm" className="w-full" onClick={() => { void onAprimorar(et, resposta, acao, texto.trim() || undefined); setAberto(false); }}>Adicionar ao roteiro</Button>
            </PopoverContent>
          </Popover>
        </div>
      )}
    </div>
  );
}
