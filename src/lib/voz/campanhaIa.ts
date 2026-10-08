import { useSyncExternalStore } from "react";
import { supabase } from "@/integrations/supabase/client";

const db = supabase as any;

export type StatusItem = "aguardando" | "ligando" | "concluido" | "sem_resposta" | "erro" | "cancelado";
export interface ItemCampanha { id: string; nome: string; empresa: string; numero: string; status: StatusItem; comandoId?: string }
export interface CampanhaIa {
  estabelecimentoId: string; agenteId: string; objetivo: string; ramalAtendente: string;
  itens: ItemCampanha[]; atual: number; estado: "rodando" | "pausada" | "cancelada" | "finalizada";
  aberta: boolean;
}

let campanha: CampanhaIa | null = null;
const ouvintes = new Set<() => void>();
const emitir = () => ouvintes.forEach((f) => f());
const set = (p: Partial<CampanhaIa>) => { if (campanha) { campanha = { ...campanha, ...p }; emitir(); } };
const setItem = (i: number, p: Partial<ItemCampanha>) => {
  if (!campanha) return;
  const itens = campanha.itens.slice(); itens[i] = { ...itens[i], ...p }; set({ itens });
};

export function useCampanhaIa() {
  return useSyncExternalStore((f) => { ouvintes.add(f); return () => ouvintes.delete(f); }, () => campanha);
}

const espera = (ms: number) => new Promise((r) => setTimeout(r, ms));
let rodando = false;

function objetivoCom(ramal: string, objetivo: string) {
  return `${objetivo || "Apresentar a empresa e entender o interesse do contato."}\n` +
    `REGRA OBRIGATÓRIA: assim que a pessoa responder ou interagir de qualquer forma (pergunta, interesse, pedido), ` +
    `diga em uma frase curta que vai passar para um atendente e inclua [TRANSFERIR] na resposta. ` +
    `A transferência vai para o ramal ${ramal}. Se for caixa postal ou ninguém falar, inclua [DESLIGAR].`;
}

async function executar() {
  if (rodando) return;
  rodando = true;
  try {
    while (campanha && campanha.estado === "rodando") {
      const i = campanha.itens.findIndex((x) => x.status === "aguardando");
      if (i < 0) { set({ estado: "finalizada" }); break; }
      set({ atual: i });
      setItem(i, { status: "ligando" });
      const c = campanha;
      const { data: u } = await supabase.auth.getUser();
      const r = await db.from("voz_comandos").insert({
        estabelecimento_id: c.estabelecimentoId, agente_id: c.agenteId, tipo: "ligar",
        numero: c.itens[i].numero, ramal: c.ramalAtendente,
        objetivo: objetivoCom(c.ramalAtendente, c.objetivo), criado_por: u.user?.id ?? null,
      }).select("id").single();
      if (r.error) { setItem(i, { status: "erro" }); continue; }
      setItem(i, { comandoId: r.data.id });
      // Aguarda o aparelho/servidor iniciar a ligação; depois aguarda a chamada terminar.
      const inicio = Date.now();
      let fim: StatusItem | null = null;
      while (!fim && Date.now() - inicio < 10 * 60_000) {
        await espera(3000);
        if (!campanha || (campanha.estado as string) === "cancelada") { fim = "cancelado"; break; }
        const s = (await db.from("voz_comandos").select("status").eq("id", r.data.id).maybeSingle()).data?.status;
        if (s === "sem_resposta" || s === "erro" || s === "cancelado") fim = s;
        else if (s === "concluido") {
          // Ligação atendida: espera a conversa (ou a transferência) acabar.
          const ch = (await db.from("voz_chamadas").select("status").eq("estabelecimento_id", c.estabelecimentoId)
            .eq("numero", c.itens[i].numero).gte("iniciada_em", new Date(inicio).toISOString())
            .order("iniciada_em", { ascending: false }).limit(1).maybeSingle()).data;
          if (ch && ch.status !== "em_andamento" && ch.status !== "ativa") fim = "concluido";
        }
      }
      setItem(i, { status: fim ?? "erro" });
      if (campanha?.estado === "rodando") await espera(2000);
    }
  } finally { rodando = false; }
}

export function iniciarCampanhaIa(dados: Omit<CampanhaIa, "itens" | "atual" | "estado" | "aberta"> & { itens: Omit<ItemCampanha, "status">[] }) {
  if (campanha && (campanha.estado === "rodando" || campanha.estado === "pausada")) return false;
  campanha = { ...dados, itens: dados.itens.map((x) => ({ ...x, status: "aguardando" })), atual: 0, estado: "rodando", aberta: true };
  emitir();
  void executar();
  return true;
}
export function pausarCampanhaIa() { set({ estado: "pausada" }); }
export function retomarCampanhaIa() { set({ estado: "rodando" }); void executar(); }
export async function cancelarCampanhaIa() {
  if (!campanha) return;
  const pend = campanha.itens.filter((x) => x.comandoId && x.status === "ligando").map((x) => x.comandoId);
  set({ estado: "cancelada", itens: campanha.itens.map((x) => (x.status === "aguardando" ? { ...x, status: "cancelado" } : x)) });
  if (pend.length) await db.from("voz_comandos").update({ status: "cancelado" }).in("id", pend).eq("status", "pendente");
}
export function alternarPopupCampanhaIa(aberta?: boolean) { if (campanha) set({ aberta: aberta ?? !campanha.aberta }); }
export function fecharCampanhaIa() { if (campanha && campanha.estado !== "rodando" && campanha.estado !== "pausada") { campanha = null; emitir(); } }
