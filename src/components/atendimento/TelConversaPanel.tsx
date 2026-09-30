import { useCallback, useEffect, useRef, useState } from "react";
import { Mic, MicOff, Save, Trash2, Disc3, PhoneIncoming, PhoneOutgoing, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";

const BUCKET = "gravacoes-chamadas";
const db = supabase as any;

interface Props {
  customerId: string;
  telefones: (string | null | undefined)[];
}

interface Anotacao { id: string; texto: string; created_at: string }
interface Gravacao { id: string; numero: string | null; direcao: string; inicio: string; duracao_seg: number; caminho: string }

const digitos = (v?: string | null) => (v || "").replace(/\D/g, "");
const fmtDur = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

/** Aba Telefone: campo "o que foi conversado" (digitado ou por voz) e gravações do contato. */
export default function TelConversaPanel({ customerId, telefones }: Props) {
  const [texto, setTexto] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [ouvindo, setOuvindo] = useState(false);
  const [anotacoes, setAnotacoes] = useState<Anotacao[]>([]);
  const [gravacoes, setGravacoes] = useState<Gravacao[]>([]);
  const [urls, setUrls] = useState<Record<string, string>>({});
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

  return (
    <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4">
      <div className="space-y-2">
        <label className="text-xs font-semibold text-muted-foreground">O que foi conversado</label>
        <Textarea value={texto} onChange={(e) => setTexto(e.target.value)} rows={4}
          placeholder="Digite ou toque no microfone para ditar..." />
        <div className="flex items-center gap-2">
          <Button type="button" size="sm" variant={ouvindo ? "destructive" : "outline"} onClick={alternarVoz}>
            {ouvindo ? <MicOff className="h-4 w-4 mr-1" /> : <Mic className="h-4 w-4 mr-1" />}
            {ouvindo ? "Parar ditado" : "Ditar"}
          </Button>
          <Button type="button" size="sm" onClick={salvar} disabled={!texto.trim() || salvando}>
            {salvando ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
            Salvar
          </Button>
        </div>
      </div>

      {anotacoes.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-semibold text-muted-foreground">Conversas registradas</p>
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
      )}

      <div className="space-y-1.5">
        <p className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
          <Disc3 className="h-3.5 w-3.5" /> Gravações ({gravacoes.length})
        </p>
        {gravacoes.length === 0 && (
          <p className="text-xs text-muted-foreground">Nenhuma gravação deste contato. Ative a gravação no Pilar Fone durante a ligação.</p>
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
              {urls[g.id] ? <audio controls preload="none" src={urls[g.id]} className="h-9 w-full" /> :
                <p className="text-[11px] text-muted-foreground">Áudio indisponível.</p>}
            </div>
          );
        })}
      </div>

      <DeleteConfirmDialog open={!!excluir} onOpenChange={(o) => !o && setExcluir(null)}
        onConfirm={() => void confirmarExclusao()}
        title={excluir?.tipo === "gravacao" ? "Excluir gravação" : "Excluir anotação"} />
    </div>
  );
}
