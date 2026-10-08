import { useCallback, useEffect, useState } from "react";
import { Bot, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getEstabelecimentoId } from "@/lib/aip/db";
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

async function meuRamal(): Promise<string | null> {
  const { data } = await supabase.rpc("get_minhas_credenciais" as any);
  const r = Array.isArray(data) ? data[0] : data;
  return (r as any)?.ramal ? String((r as any).ramal) : null;
}

interface Props { local: LocalIaAjuda; className?: string }

/** Painel de sugestões da IA ao atendente; só aparece no local escolhido. */
export default function IaAjudaAtendente({ local, className = "" }: Props) {
  const { prefs, atualizar } = useIaAjudaPrefs();
  const [sugestoes, setSugestoes] = useState<{ texto: string; em: string }[]>([]);
  const [ramal, setRamal] = useState<string | null>(null);
  const visivel = local === "atendimento" || prefs.local === "fone";
  const exibindo = local === prefs.local;

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
    atualizar({ ativa: true });
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

  if (!visivel) return null;
  if (local === "atendimento" && prefs.local !== "atendimento") {
    return (
      <label className={`flex items-center gap-1.5 text-[11px] text-muted-foreground ${className}`}>
        <Switch checked={false} onCheckedChange={() => atualizar({ local: "atendimento" })} aria-label="Usar IA ajuda aqui" />
        <Bot className="h-3.5 w-3.5 text-primary" /> Usar IA ajuda nesta tela (sai do Pilar Fone)
      </label>
    );
  }
  const ultimas = sugestoes.slice(-3).reverse();

  return (
    <div className={`rounded-lg border border-primary/30 bg-primary/5 p-2 text-foreground ${className}`}>
      <div className="flex flex-wrap items-center gap-2">
        <Bot className="h-4 w-4 text-primary" />
        <span className="text-xs font-semibold">IA ajuda</span>
        <Switch checked={prefs.ativa} onCheckedChange={(v) => void ativar(v)} aria-label="Ativar IA ajuda" />
        {local === "atendimento" && (
          <label className="ml-auto flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <Switch checked={prefs.local === "atendimento"} onCheckedChange={(v) => atualizar({ local: v ? "atendimento" : "fone" })} aria-label="Mostrar aqui" />
            Mostrar aqui (sai do Pilar Fone)
          </label>
        )}
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
