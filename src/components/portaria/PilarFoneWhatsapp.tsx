import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, RefreshCw, Search, Send } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getEstabelecimentoId } from "@/lib/estabelecimentoUtils";
import PilarFoneHistorico from "@/components/portaria/PilarFoneHistorico";
import { registrarChamada } from "@/lib/portaria/historicoChamadas";

interface ConversaItem {
  id: string;
  nome: string;
  telefone: string;
  atualizadoEm: string;
}

interface MensagemItem {
  id: string;
  sender: string;
  text: string | null;
  created_at: string;
}

export interface AlvoWhatsapp {
  nome: string;
  numero: string;
}

interface Props {
  /** Contato selecionado em outra aba para abrir/iniciar conversa. */
  alvo?: AlvoWhatsapp | null;
  onAlvoConsumido?: () => void;
}

const soDigitos = (v: string) => v.replace(/\D/g, "");

/** Aba de conversas de WhatsApp dentro do Pilar Sip. */
export default function PilarFoneWhatsapp({ alvo, onAlvoConsumido }: Props) {
  const [conversas, setConversas] = useState<ConversaItem[]>([]);
  const [busca, setBusca] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [aberta, setAberta] = useState<ConversaItem | null>(null);
  const [mensagens, setMensagens] = useState<MensagemItem[]>([]);
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const fimRef = useRef<HTMLDivElement | null>(null);

  const carregarConversas = useCallback(async () => {
    setCarregando(true);
    const estabelecimentoId = await getEstabelecimentoId();
    let query = supabase
      .from("conversations")
      .select("id, updated_at, customers:customer_id(nome, telefone)")
      .order("updated_at", { ascending: false })
      .limit(50);
    if (estabelecimentoId) query = query.eq("estabelecimento_id", estabelecimentoId);
    const { data } = await query;

    const lista: ConversaItem[] = (data ?? []).map((c: any) => ({
      id: c.id,
      nome: c.customers?.nome || c.customers?.telefone || "Sem nome",
      telefone: c.customers?.telefone || "",
      atualizadoEm: c.updated_at,
    }));
    setConversas(lista);
    setCarregando(false);
  }, []);

  useEffect(() => {
    void carregarConversas();
  }, [carregarConversas]);

  const carregarMensagens = useCallback(async (conversaId: string) => {
    const { data } = await supabase
      .from("messages")
      .select("id, sender, text, created_at")
      .eq("conversation_id", conversaId)
      .order("created_at", { ascending: true })
      .limit(200);
    setMensagens((data ?? []) as MensagemItem[]);
  }, []);

  useEffect(() => {
    if (!aberta) return;
    void carregarMensagens(aberta.id);
    const canal = supabase
      .channel(`pilar-sip-wa-${aberta.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${aberta.id}` },
        (payload) => setMensagens((prev) => [...prev, payload.new as MensagemItem]),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(canal);
    };
  }, [aberta, carregarMensagens]);

  useEffect(() => {
    fimRef.current?.scrollIntoView({ block: "end" });
  }, [mensagens]);

  // Abre conversa a partir de um contato escolhido na aba de cadastros
  useEffect(() => {
    if (!alvo) return;
    const alvoDigitos = soDigitos(alvo.numero);
    const existente = conversas.find((c) => soDigitos(c.telefone).endsWith(alvoDigitos.slice(-8)));
    setAberta(existente ?? { id: "", nome: alvo.nome, telefone: alvo.numero, atualizadoEm: "" });
    onAlvoConsumido?.();
  }, [alvo, conversas, onAlvoConsumido]);

  const enviar = async () => {
    const conteudo = texto.trim();
    if (!conteudo || !aberta || enviando) return;
    setEnviando(true);
    try {
      const estabelecimentoId = await getEstabelecimentoId();
      const body: Record<string, unknown> = { text: conteudo };
      if (aberta.id) body.conversationId = aberta.id;
      else {
        body.telefone = soDigitos(aberta.telefone);
        body.estabelecimento_id = estabelecimentoId;
      }
      const { error } = await supabase.functions.invoke("send-agent-message", { body });
      if (error) throw error;
      setTexto("");
      if (aberta.id) void carregarMensagens(aberta.id);
      else void carregarConversas();
      toast.success("Mensagem enviada");
    } catch (e: any) {
      toast.error(e?.message || "Não foi possível enviar a mensagem");
    } finally {
      setEnviando(false);
    }
  };

  if (aberta) {
    return (
      <div className="flex h-full flex-col">
        <div className="flex items-center gap-3 bg-[#1F2C34] px-3 py-2.5">
          <button type="button" aria-label="Voltar" onClick={() => setAberta(null)}>
            <ArrowLeft className="h-5 w-5 text-[#AEBAC1]" />
          </button>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-[#E9EDEF]">{aberta.nome}</p>
            <p className="truncate text-xs text-[#8696A0]">{aberta.telefone}</p>
          </div>
        </div>

        <div className="flex-1 space-y-2 overflow-y-auto px-3 py-3">
          {mensagens.length === 0 && (
            <p className="pt-6 text-center text-sm text-[#8696A0]">Nenhuma mensagem nesta conversa.</p>
          )}
          {mensagens.map((m) => (
            <div key={m.id} className={`flex ${m.sender === "customer" ? "justify-start" : "justify-end"}`}>
              <div
                className={`max-w-[80%] rounded-2xl px-3 py-2 text-[13px] ${
                  m.sender === "customer" ? "bg-[#1F2C34] text-[#E9EDEF]" : "bg-[#005C4B] text-white"
                }`}
              >
                <p className="whitespace-pre-wrap break-words">{m.text}</p>
                <p className="mt-0.5 text-right text-[10px] opacity-60">
                  {new Date(m.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            </div>
          ))}
          <div ref={fimRef} />
        </div>

        <div className="flex items-end gap-2 bg-[#1F2C34] px-3 py-2">
          <textarea
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void enviar();
              }
            }}
            rows={1}
            placeholder="Mensagem"
            className="max-h-24 flex-1 resize-none rounded-2xl bg-[#2A3942] px-3 py-2 text-sm text-[#E9EDEF] outline-none placeholder:text-[#8696A0]"
          />
          <button
            type="button"
            aria-label="Enviar mensagem"
            onClick={() => void enviar()}
            disabled={enviando || !texto.trim()}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-[#00A884] text-[#0B141A] transition active:scale-95 disabled:opacity-50"
          >
            <Send className="h-5 w-5" />
          </button>
        </div>
      </div>
    );
  }

  const visiveis = conversas.filter(
    (c) =>
      !busca.trim() ||
      c.nome.toLowerCase().includes(busca.toLowerCase()) ||
      soDigitos(c.telefone).includes(soDigitos(busca)),
  );

  return (
    <div>
      <div className="sticky top-0 z-10 bg-[#0B141A] px-4 py-3">
        <div className="flex items-center gap-2 rounded-full bg-[#1F2C34] px-3 py-2">
          <Search className="h-4 w-4 shrink-0 text-[#8696A0]" />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar conversa"
            className="w-full bg-transparent text-sm text-[#E9EDEF] outline-none placeholder:text-[#8696A0]"
          />
          <button type="button" aria-label="Atualizar" onClick={() => void carregarConversas()}>
            <RefreshCw className={`h-4 w-4 text-[#8696A0] ${carregando ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {carregando && <p className="px-4 py-6 text-sm text-[#8696A0]">Carregando conversas...</p>}
      {!carregando && visiveis.length === 0 && (
        <p className="px-4 py-6 text-sm text-[#8696A0]">Nenhuma conversa encontrada.</p>
      )}

      {visiveis.map((c) => (
        <button
          key={c.id}
          type="button"
          onClick={() => {
            registrarChamada({ grupo: "whatsapp", nome: c.nome, numero: c.telefone, direcao: "saida" });
            setAberta(c);
          }}
          className="flex w-full items-center gap-3 px-4 py-2.5 text-left active:bg-white/5"
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#00A884]/20 text-sm font-bold text-[#00A884]">
            {c.nome.slice(0, 2).toUpperCase()}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[15px] font-semibold text-[#E9EDEF]">{c.nome}</p>
            <p className="truncate text-[13px] text-[#8696A0]">{c.telefone}</p>
          </div>
          <span className="shrink-0 text-[11px] text-[#8696A0]">
            {c.atualizadoEm ? new Date(c.atualizadoEm).toLocaleDateString("pt-BR") : ""}
          </span>
        </button>
      ))}

      <PilarFoneHistorico grupo="whatsapp" titulo="Conversas recentes" />
    </div>
  );
}
