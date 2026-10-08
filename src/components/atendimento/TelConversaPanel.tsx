import { useCallback, useEffect, useRef, useState } from "react";
import { AlertCircle, Mic, MicOff, Save, Trash2, Disc3, PhoneIncoming, PhoneOutgoing, Loader2, PhoneOff, PhoneMissed, PhoneCall } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import IaAjudaAtendente from "@/components/telefonia/IaAjudaAtendente";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import { lerResultadoPendente, salvarResultadoPendente } from "@/lib/atendimento/finalizarAtendimento";

const BUCKET = "gravacoes-chamadas";
const db = supabase as any;

interface Props {
  customerId: string;
  telefones: (string | null | undefined)[];
  estabelecimentoId: string;
}

interface Anotacao { id: string; texto: string; created_at: string }
interface Gravacao { id: string; numero: string | null; direcao: string; inicio: string; duracao_seg: number; caminho: string }
interface AtendimentoFlag { id: string; nome: string }
const RESULTADOS = [
  { nome: "Não atendeu", Icone: PhoneMissed },
  { nome: "Ocupado", Icone: PhoneOff },
  { nome: "Atendeu", Icone: PhoneCall },
] as const;

const digitos = (v?: string | null) => (v || "").replace(/\D/g, "");
const fmtDur = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

/** Aba Telefone: campo "o que foi conversado" (digitado ou por voz) e gravações do contato. */
export default function TelConversaPanel({ customerId, telefones, estabelecimentoId }: Props) {
  const [texto, setTexto] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [ouvindo, setOuvindo] = useState(false);
  const [anotacoes, setAnotacoes] = useState<Anotacao[]>([]);
  const [gravacoes, setGravacoes] = useState<Gravacao[]>([]);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [flags, setFlags] = useState<AtendimentoFlag[]>([]);
  const [resultadoNome, setResultadoNome] = useState(() => lerResultadoPendente(customerId)?.nome ?? "");
  const [excluir, setExcluir] = useState<{ tipo: "anotacao" | "gravacao"; id: string; caminho?: string } | null>(null);
  const recRef = useRef<any>(null);
  const baseRef = useRef("");

  const chaveTel = telefones.map(digitos).filter((d) => d.length >= 8).join(",");

  const carregar = useCallback(async () => {
    const { data: an } = await db.from("anotacoes_ligacao").select("id, texto, created_at")
      .eq("customer_id", customerId).order("created_at", { ascending: false }).limit(20);
    setAnotacoes(an || []);
    const finais = chaveTel ? chaveTel.split(",").map((d) => d.slice(-8)) : [];
    if (finais.length === 0) { setGravacoes([]); return; }
    const { data: gr } = await db.from("gravacoes_chamadas")
      .select("id, numero, direcao, inicio, duracao_seg, caminho")
      .or(finais.map((f) => `numero.ilike.%${f}`).join(","))
      .order("inicio", { ascending: false }).limit(20);
    const lista: Gravacao[] = gr || [];
    setGravacoes(lista);
    const novas: Record<string, string> = {};
    await Promise.all(lista.map(async (g) => {
      const { data } = await supabase.storage.from(BUCKET).createSignedUrl(g.caminho, 3600);
      if (data?.signedUrl) novas[g.id] = data.signedUrl;
    }));
    setUrls(novas);
  }, [customerId, chaveTel]);

  useEffect(() => { setTexto(""); void carregar(); }, [carregar]);
  useEffect(() => {
    setResultadoNome(lerResultadoPendente(customerId)?.nome ?? "");
    void supabase.from("atendimento_flags").select("id, nome")
      .eq("estabelecimento_id", estabelecimentoId).eq("ativo", true).order("ordem")
      .then(({ data }) => setFlags(data ?? []));
  }, [customerId, estabelecimentoId]);
  useEffect(() => () => recRef.current?.stop?.(), []);

  const alternarVoz = () => {
    if (ouvindo) { recRef.current?.stop(); return; }
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { toast.error("Seu navegador não permite ditado por voz"); return; }
    const rec = new SR();
    rec.lang = "pt-BR";
    rec.continuous = true;
    rec.interimResults = true;
    baseRef.current = texto ? texto.trimEnd() + " " : "";
    rec.onresult = (e: any) => {
      let final = "", parcial = "";
      for (let i = 0; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) final += r[0].transcript; else parcial += r[0].transcript;
      }
      setTexto(baseRef.current + final + parcial);
    };
    rec.onend = () => setOuvindo(false);
    rec.onerror = () => setOuvindo(false);
    recRef.current = rec;
    rec.start();
    setOuvindo(true);
  };

  const salvar = async () => {
    if (!texto.trim()) return;
    setSalvando(true);
    const { data: auth } = await supabase.auth.getUser();
    const { data: u } = await supabase.from("usuarios").select("id").eq("auth_user_id", auth.user?.id || "").maybeSingle();
    if (!u) { setSalvando(false); toast.error("Usuário não encontrado"); return; }
    const { error } = await db.from("anotacoes_ligacao").insert({ customer_id: customerId, usuario_id: u.id, texto: texto.trim() });
    setSalvando(false);
    if (error) { toast.error("Não foi possível salvar"); return; }
    recRef.current?.stop?.();
    setTexto("");
    toast.success("Conversa registrada");
    void carregar();
  };

  const confirmarExclusao = async () => {
    if (!excluir) return;
    if (excluir.tipo === "anotacao") {
      await db.from("anotacoes_ligacao").delete().eq("id", excluir.id);
    } else {
      if (excluir.caminho) await supabase.storage.from(BUCKET).remove([excluir.caminho]);
      await db.from("gravacoes_chamadas").delete().eq("id", excluir.id);
    }
    setExcluir(null);
    toast.success("Excluído");
    void carregar();
  };

  const selecionarResultado = (nome: string) => {
    const flagId = flags.find((flag) => flag.nome.toLowerCase() === nome.toLowerCase())?.id ?? null;
    setResultadoNome(nome);
    salvarResultadoPendente(customerId, { flagId, nome });
  };

  const permiteRelato = resultadoNome === "Atendeu";

  return (
    <div className="flex-1 min-h-0 flex flex-col gap-2 p-3 overflow-hidden">
      <IaAjudaAtendente local="atendimento" className="shrink-0" />
      <div className="shrink-0 space-y-2 rounded-lg border border-border bg-card p-2.5">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-foreground">Resultado do contato</label>
          {!resultadoNome && <span className="flex items-center gap-1 text-[10px] text-destructive"><AlertCircle className="h-3 w-3" /> Obrigatório</span>}
        </div>
        <div className="flex items-center gap-1.5">
          {RESULTADOS.map(({ nome, Icone }) => {
            const selecionado = resultadoNome === nome;
            return (
              <Button key={nome} type="button" variant={selecionado ? "default" : "outline"} size="sm"
                title={nome} aria-label={nome} aria-pressed={selecionado}
                onClick={() => selecionarResultado(nome)} className="h-8 flex-1 min-w-0 p-0">
                <Icone className="h-4 w-4 shrink-0" />
              </Button>
            );
          })}
        </div>
      </div>

      {!resultadoNome && (
        <div className="shrink-0 rounded-lg border border-dashed border-border px-3 py-2 text-center text-xs text-muted-foreground">
          Selecione o resultado para continuar o atendimento.
        </div>
      )}

      {permiteRelato && <div className="shrink-0 rounded-lg border border-border bg-muted/20 p-2 space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <label className="text-xs font-semibold text-muted-foreground">O que foi conversado</label>
          <div className="flex items-center gap-1.5">
            <Button type="button" size="sm" variant={ouvindo ? "destructive" : "outline"} className="h-7 px-2 text-xs" onClick={alternarVoz}>
              {ouvindo ? <MicOff className="h-3.5 w-3.5 mr-1" /> : <Mic className="h-3.5 w-3.5 mr-1" />}
              {ouvindo ? "Parar" : "Ditar"}
            </Button>
            <Button type="button" size="sm" className="h-7 px-2 text-xs" onClick={salvar} disabled={!texto.trim() || salvando}>
              {salvando ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Save className="h-3.5 w-3.5 mr-1" />}
              Salvar
            </Button>
          </div>
        </div>
        <Textarea value={texto} onChange={(e) => setTexto(e.target.value)} rows={2}
          className="min-h-[44px] resize-none text-sm"
          placeholder="Digite ou toque no microfone para ditar..." />
      </div>}

      {/* Conversas e gravações lado a lado, cada uma com rolagem própria */}
      <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-2 gap-2">
        <div className="min-h-0 flex flex-col rounded-lg border border-border">
          <p className="shrink-0 px-2 py-1.5 text-xs font-semibold text-muted-foreground border-b border-border">
            Conversas registradas ({anotacoes.length})
          </p>
          <div className="flex-1 min-h-0 overflow-y-auto p-1.5 space-y-1.5">
            {anotacoes.length === 0 && (
              <p className="text-xs text-muted-foreground p-1">Nenhuma conversa registrada ainda.</p>
            )}
            {anotacoes.map((a) => (
              <div key={a.id} className="flex gap-2 rounded-lg border border-border bg-muted/30 p-2">
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] text-muted-foreground">{new Date(a.created_at).toLocaleString("pt-BR")}</p>
                  <p className="text-sm whitespace-pre-wrap">{a.texto}</p>
                </div>
                <button type="button" title="Excluir" onClick={() => setExcluir({ tipo: "anotacao", id: a.id })}
                  className="self-start text-muted-foreground hover:text-destructive">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="min-h-0 flex flex-col rounded-lg border border-border">
          <p className="shrink-0 flex items-center gap-1.5 px-2 py-1.5 text-xs font-semibold text-muted-foreground border-b border-border">
            <Disc3 className="h-3.5 w-3.5" /> Gravações ({gravacoes.length})
          </p>
          <div className="flex-1 min-h-0 overflow-y-auto p-1.5 space-y-1.5">
            {gravacoes.length === 0 && (
              <p className="text-xs text-muted-foreground p-1">Nenhuma gravação deste contato. Ative a gravação no Pilar Fone durante a ligação.</p>
            )}
            {gravacoes.map((g) => {
              const Icone = g.direcao === "entrada" ? PhoneIncoming : PhoneOutgoing;
              return (
                <div key={g.id} className="rounded-lg border border-border p-2 space-y-1">
                  <div className="flex items-center gap-2">
                    <Icone className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="flex-1 text-xs">{new Date(g.inicio).toLocaleString("pt-BR")} · {fmtDur(g.duracao_seg)}</span>
                    <button type="button" title="Excluir gravação" onClick={() => setExcluir({ tipo: "gravacao", id: g.id, caminho: g.caminho })}
                      className="text-muted-foreground hover:text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  {urls[g.id] ? <audio controls preload="none" src={urls[g.id]} className="h-8 w-full" /> :
                    <p className="text-[11px] text-muted-foreground">Áudio indisponível.</p>}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <DeleteConfirmDialog open={!!excluir} onOpenChange={(o) => !o && setExcluir(null)}
        onConfirm={() => void confirmarExclusao()}
        title={excluir?.tipo === "gravacao" ? "Excluir gravação" : "Excluir anotação"} />
    </div>
  );
}
