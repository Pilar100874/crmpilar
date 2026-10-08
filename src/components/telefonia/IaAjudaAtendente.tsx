import { useCallback, useEffect, useRef, useState } from "react";
import { Bot, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getEstabelecimentoId } from "@/lib/estabelecimento";
import { Switch } from "@/components/ui/switch";

const db = supabase as any;
const CHAVE = "pilar:ia-ajuda";
const EVENTO = "pilar:ia-ajuda-mudou";

export type LocalIaAjuda = "fone" | "atendimento";
interface Prefs { ativa: boolean; local: LocalIaAjuda }

function lerPrefs(): Prefs {
  try { return { ativa: false, local: "fone", ...JSON.parse(localStorage.getItem(CHAVE) || "{}") }; }
  catch { return { ativa: false, local: "fone" }; }
}

/** Preferência compartilhada entre Pilar Fone e a aba Tel do Atendimento. */
export function useIaAjudaPrefs() {
  const [prefs, setPrefs] = useState<Prefs>(lerPrefs);
  useEffect(() => {
    const sync = () => setPrefs(lerPrefs());
    window.addEventListener(EVENTO, sync);
    window.addEventListener("storage", sync);
    return () => { window.removeEventListener(EVENTO, sync); window.removeEventListener("storage", sync); };
  }, []);
  const atualizar = useCallback((p: Partial<Prefs>) => {
    localStorage.setItem(CHAVE, JSON.stringify({ ...lerPrefs(), ...p }));
    window.dispatchEvent(new Event(EVENTO));
  }, []);
  return { prefs, atualizar };
}

export async function meuRamal(): Promise<string | null> {
  const { data } = await supabase.rpc("get_minhas_credenciais" as any);
  const r = Array.isArray(data) ? data[0] : data;
  return (r as any)?.ramal ? String((r as any).ramal) : null;
}

function hora(iso: string) {
  try {
    return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  } catch { return ""; }
}

interface Props { local: LocalIaAjuda; className?: string }

/** Painel de sugestões da IA ao atendente; só aparece no local escolhido. */
export default function IaAjudaAtendente({ local, className = "" }: Props) {
  const { prefs, atualizar } = useIaAjudaPrefs();
  const [sugestoes, setSugestoes] = useState<{ texto: string; em: string }[]>([]);
  const [ramal, setRamal] = useState<string | null>(null);
  const rolagem = useRef<HTMLDivElement>(null);
  const visivel = local === prefs.local;
  const exibindo = visivel;

  useEffect(() => { void meuRamal().then(setRamal); }, []);

  const ativar = async (on: boolean) => {
    if (!on) { atualizar({ ativa: false }); setSugestoes([]); return; }
    const est = await getEstabelecimentoId();
    if (!est || !ramal) return toast.error("Seu usuário não tem ramal configurado");
    const { data: ags } = await db.from("voz_agentes").select("id, modos").eq("estabelecimento_id", est).eq("ativo", true);
    const ag = (ags ?? []).find((a: any) => (a.modos ?? []).includes("assistir"));
    if (!ag) return toast.error('Nenhum agente de voz com "Ajudar o atendente" ativo');
    const { data: u } = await supabase.auth.getUser();
    const r = await db.from("voz_comandos").insert({ estabelecimento_id: est, agente_id: ag.id, tipo: "assistir", ramal, criado_por: u.user?.id ?? null });
    if (r.error) return toast.error(r.error.message);
    // Ao ligar a partir desta tela, as sugestões passam a aparecer nela (saem do outro local).
    atualizar({ ativa: true, local });
    toast.success("A IA vai escutar seu ramal e sugerir respostas");
  };

  useEffect(() => {
    if (!prefs.ativa || !ramal || !exibindo) return;
    let vivo = true;
    const buscar = async () => {
      const { data } = await db.from("voz_chamadas").select("sugestoes").eq("modo", "assistir")
        .eq("ramal_monitorado", ramal).order("iniciada_em", { ascending: false }).limit(1).maybeSingle();
      if (vivo) setSugestoes(Array.isArray(data?.sugestoes) ? data.sugestoes : []);
    };
    void buscar();
    const t = setInterval(buscar, 3000);
    return () => { vivo = false; clearInterval(t); };
  }, [prefs.ativa, ramal, exibindo]);

  // No telefone o campo acompanha a conversa: a sugestão mais nova fica à vista.
  useEffect(() => {
    const el = rolagem.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [sugestoes, prefs.ativa, prefs.local]);

  if (!visivel) return null;

  if (local === "fone") {
    const conversas = sugestoes.slice(-20);
    return (
      <div className={`overflow-hidden rounded-2xl border border-white/10 bg-[#111B21] ${className}`}>
        <div className="flex items-center gap-2 border-b border-white/10 px-3 py-2">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#00A884]/15">
            <Bot className="h-3.5 w-3.5 text-[#00A884]" />
          </span>
          <span className="text-[13px] font-semibold text-[#E9EDEF]">IA ajuda</span>
          <span className="ml-auto text-[11px] text-[#8696A0]">{prefs.ativa ? "escutando seu ramal" : "desligada"}</span>
          <Switch checked={prefs.ativa} onCheckedChange={(v) => void ativar(v)} aria-label="Ativar IA ajuda" />
        </div>
        <div ref={rolagem} className="max-h-44 min-h-[76px] space-y-2 overflow-y-auto px-3 py-3">
          {!prefs.ativa ? (
            <p className="text-[12px] text-[#8696A0]">Ligue a IA para receber sugestões de resposta durante a ligação.</p>
          ) : conversas.length === 0 ? (
            <p className="text-[12px] text-[#8696A0]">Aguardando a conversa para sugerir…</p>
          ) : (
            conversas.map((s, i) => (
              <div key={s.em + i} className="flex gap-2">
                <Sparkles className="mt-1.5 h-3.5 w-3.5 shrink-0 text-[#00A884]" />
                <div className="max-w-[88%] rounded-2xl rounded-tl-sm bg-[#18252D] px-3 py-2">
                  <p className="text-[13px] leading-snug text-[#E9EDEF]">{s.texto}</p>
                  <p className="mt-1 text-[10px] text-[#8696A0]">{hora(s.em)}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    );
  }

  const ultimas = sugestoes.slice(-3).reverse();

  return (
    <div className={`rounded-lg border border-primary/30 bg-primary/5 p-2 text-foreground ${className}`}>
      <div className="flex flex-wrap items-center gap-2">
        <Bot className="h-4 w-4 text-primary" />
        <span className="text-xs font-semibold">IA ajuda</span>
        <Switch checked={prefs.ativa} onCheckedChange={(v) => void ativar(v)} aria-label="Ativar IA ajuda" />
      </div>
      {prefs.ativa && (
        <div className="mt-2 max-h-28 space-y-1 overflow-y-auto">
          {ultimas.length === 0
            ? <p className="text-[11px] text-muted-foreground">Aguardando a conversa para sugerir…</p>
            : ultimas.map((s, i) => (
              <p key={s.em + i} className={`flex gap-1 text-xs ${i ? "text-muted-foreground" : "font-medium"}`}>
                <Sparkles className="mt-0.5 h-3 w-3 shrink-0 text-primary" />{s.texto}
              </p>
            ))}
        </div>
      )}
    </div>
  );
}
