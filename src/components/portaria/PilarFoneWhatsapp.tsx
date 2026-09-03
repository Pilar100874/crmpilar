import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, Mic, Paperclip, RefreshCw, Search, Send, Square, Users } from "lucide-react";
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
  attachments?: any;
}

/** Extrai a primeira mídia da mensagem (anexo ou áudio). */
function midiaDaMensagem(m: MensagemItem): { url: string; tipo: string; nome?: string } | null {
  const bruto = m.attachments;
  const lista = Array.isArray(bruto) ? bruto : bruto ? [bruto] : [];
  const primeiro: any = lista[0];
  if (!primeiro) return null;
  const url = primeiro.url || primeiro.fileUrl || primeiro.link;
  if (!url) return null;
  return { url, tipo: primeiro.contentType || primeiro.type || "", nome: primeiro.fileName || primeiro.name };
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

/** Aba de conversas de WhatsApp dentro do Pilar Fone. */
export default function PilarFoneWhatsapp({ alvo, onAlvoConsumido }: Props) {
  const [conversas, setConversas] = useState<ConversaItem[]>([]);
  const [busca, setBusca] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [aberta, setAberta] = useState<ConversaItem | null>(null);
  const [mensagens, setMensagens] = useState<MensagemItem[]>([]);
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [usuarioId, setUsuarioId] = useState<string | null>(null);
  const [somenteMinhas, setSomenteMinhas] = useState(
    () => localStorage.getItem("pilarFoneWaMinhas") !== "0",
  );
  const [gravando, setGravando] = useState(false);
  const fimRef = useRef<HTMLDivElement | null>(null);
  const arquivoRef = useRef<HTMLInputElement | null>(null);
  const gravadorRef = useRef<MediaRecorder | null>(null);
  const pedacosRef = useRef<Blob[]>([]);

  useEffect(() => {
    void (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth?.user) return;
      const { data } = await supabase
        .from("usuarios")
        .select("id")
        .eq("auth_user_id", auth.user.id)
        .maybeSingle();
      setUsuarioId((data as { id: string } | null)?.id ?? null);
    })();
  }, []);

  useEffect(() => {
    localStorage.setItem("pilarFoneWaMinhas", somenteMinhas ? "1" : "0");
  }, [somenteMinhas]);

  const carregarConversas = useCallback(async () => {
    setCarregando(true);
    const estabelecimentoId = await getEstabelecimentoId();
    let query = supabase
      .from("conversations")
      .select("id, updated_at, customers:customer_id(nome, telefone)")
      .order("updated_at", { ascending: false })
      .limit(50);
    if (estabelecimentoId) query = query.eq("estabelecimento_id", estabelecimentoId);
    if (somenteMinhas && usuarioId) {
      query = query.or(`assignee_id.eq.${usuarioId},atendente_atual_id.eq.${usuarioId}`);
    }
    const { data } = await query;

    const lista: ConversaItem[] = (data ?? []).map((c: any) => ({
      id: c.id,
      nome: c.customers?.nome || c.customers?.telefone || "Sem nome",
      telefone: c.customers?.telefone || "",
      atualizadoEm: c.updated_at,
    }));
    setConversas(lista);
    setCarregando(false);
  }, [somenteMinhas, usuarioId]);

  useEffect(() => {
    void carregarConversas();
  }, [carregarConversas]);

  const carregarMensagens = useCallback(async (conversaId: string) => {
    const { data } = await supabase
      .from("messages")
      .select("id, sender, text, created_at, attachments")
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

  /** Vincula a conversa ao usuário logado para aparecer em "Minhas conversas". */
  const assumirConversa = useCallback(
    async (conversaId: string) => {
      if (!conversaId || !usuarioId) return;
      await supabase
        .from("conversations")
        .update({ assignee_id: usuarioId })
        .eq("id", conversaId)
        .is("assignee_id", null);
    },
    [usuarioId],
  );

  /** Sobe o arquivo e dispara o envio pelo WhatsApp. */
  const enviarArquivo = async (arquivo: File | Blob, nome: string, tipo: string) => {
    if (!aberta || enviando) return;
    setEnviando(true);
    try {
      const caminho = `pilar-fone/${Date.now()}-${nome.replace(/[^\w.-]/g, "_")}`;
      const { error: upErro } = await supabase.storage
        .from("chat-attachments")
        .upload(caminho, arquivo, { contentType: tipo, upsert: false });
      if (upErro) throw upErro;
      const { data: pub } = supabase.storage.from("chat-attachments").getPublicUrl(caminho);

      const estabelecimentoId = await getEstabelecimentoId();
      const body: Record<string, unknown> = { fileUrl: pub.publicUrl, fileName: nome, contentType: tipo };
      if (aberta.id) body.conversationId = aberta.id;
      else {
        body.telefone = soDigitos(aberta.telefone);
        body.estabelecimento_id = estabelecimentoId;
      }
      const { error } = await supabase.functions.invoke("send-agent-message", { body });
      if (error) throw error;
      if (aberta.id) {
        void assumirConversa(aberta.id);
        void carregarMensagens(aberta.id);
      } else void carregarConversas();
      toast.success("Arquivo enviado");
    } catch (e: any) {
      toast.error(e?.message || "Não foi possível enviar o arquivo");
    } finally {
      setEnviando(false);
    }
  };

  /** Grava um áudio pelo microfone e envia ao encerrar. */
  const alternarGravacao = async () => {
    if (gravando) {
      gravadorRef.current?.stop();
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const gravador = new MediaRecorder(stream);
      pedacosRef.current = [];
      gravador.ondataavailable = (e) => e.data.size && pedacosRef.current.push(e.data);
      gravador.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        setGravando(false);
        const blob = new Blob(pedacosRef.current, { type: gravador.mimeType || "audio/webm" });
        if (blob.size > 0) void enviarArquivo(blob, `audio-${Date.now()}.webm`, blob.type);
      };
      gravadorRef.current = gravador;
      gravador.start();
      setGravando(true);
    } catch {
      toast.error("Não foi possível acessar o microfone");
    }
  };

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
      if (aberta.id) {
        void assumirConversa(aberta.id);
        void carregarMensagens(aberta.id);
      }
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
                {(() => {
                  const midia = midiaDaMensagem(m);
                  if (!midia) return null;
                  if (midia.tipo.startsWith("audio"))
                    return <audio controls src={midia.url} className="mb-1 w-52 max-w-full" />;
                  if (midia.tipo.startsWith("image"))
                    return (
                      <img
                        src={midia.url}
                        alt={midia.nome || "Imagem enviada no WhatsApp"}
                        className="mb-1 max-h-56 rounded-lg object-cover"
                        loading="lazy"
                      />
                    );
                  return (
                    <a
                      href={midia.url}
                      target="_blank"
                      rel="noreferrer"
                      className="mb-1 flex items-center gap-2 underline"
                    >
                      <Paperclip className="h-4 w-4" /> {midia.nome || "Arquivo"}
                    </a>
                  );
                })()}
                {m.text && <p className="whitespace-pre-wrap break-words">{m.text}</p>}
                <p className="mt-0.5 text-right text-[10px] opacity-60">
                  {new Date(m.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            </div>
          ))}
          <div ref={fimRef} />
        </div>

        <div className="flex items-end gap-2 bg-[#1F2C34] px-3 py-2">
          <input
            ref={arquivoRef}
            type="file"
            className="hidden"
            onChange={(e) => {
              const arquivo = e.target.files?.[0];
              e.target.value = "";
              if (arquivo) void enviarArquivo(arquivo, arquivo.name, arquivo.type || "application/octet-stream");
            }}
          />
          <button
            type="button"
            aria-label="Anexar arquivo"
            title="Anexar arquivo"
            disabled={enviando}
            onClick={() => arquivoRef.current?.click()}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-[#2A3942] text-[#AEBAC1] disabled:opacity-50"
          >
            <Paperclip className="h-5 w-5" />
          </button>
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
            aria-label={gravando ? "Parar gravação e enviar áudio" : "Gravar áudio"}
            title={gravando ? "Parar gravação e enviar áudio" : "Gravar áudio"}
            onClick={() => void alternarGravacao()}
            disabled={enviando}
            className={`flex h-10 w-10 items-center justify-center rounded-full disabled:opacity-50 ${
              gravando ? "bg-red-500 text-white animate-pulse" : "bg-[#2A3942] text-[#AEBAC1]"
            }`}
          >
            {gravando ? <Square className="h-4 w-4" /> : <Mic className="h-5 w-5" />}
          </button>
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
          <button
            type="button"
            aria-label={somenteMinhas ? "Mostrando minhas conversas" : "Mostrando todas as conversas"}
            title={somenteMinhas ? "Minhas conversas" : "Todas as conversas"}
            onClick={() => setSomenteMinhas((v) => !v)}
            className={somenteMinhas ? "text-[#00A884]" : "text-[#8696A0]"}
          >
            <Users className="h-4 w-4" />
          </button>
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
            void assumirConversa(c.id);
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
