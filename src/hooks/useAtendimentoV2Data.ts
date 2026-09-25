import { useCallback, useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { getEstabelecimentoId } from "@/lib/estabelecimentoUtils";
import { ouvirTarefasAlteradas } from "@/lib/calendario/eventos";
import type {
  AtendimentoV2Contato,
  AtendimentoV2Conversa,
  AtendimentoV2FilaItem,
  AtendimentoV2Mensagem,
  AtendimentoV2Tarefa,
} from "@/types/atendimento-v2";

const statusFechados = new Set(["closed", "encerrado", "concluido", "cancelado", "completed"]);
const normalizarTelefone = (valor?: string | null) => (valor || "").replace(/\D/g, "");

function nomeEmpresa(contato: AtendimentoV2Contato | null) {
  const empresas = contato?.companies || [];
  const principal = empresas.find((item) => item.is_primary) || empresas[0];
  return principal?.empresas?.nome_fantasia || principal?.empresas?.nome || "";
}

function canalDaOrigem(origem?: string | null): AtendimentoV2FilaItem["canal"] {
  if (origem?.includes("email")) return "email";
  if (origem === "ligacao") return "telefone";
  if (origem === "visita") return "visita";
  return "whatsapp";
}

export function useAtendimentoV2Data(dataSelecionada: Date) {
  const [carregando, setCarregando] = useState(true);
  const [estabelecimentoId, setEstabelecimentoId] = useState("");
  const [usuarioId, setUsuarioId] = useState("");
  const [tarefas, setTarefas] = useState<AtendimentoV2Tarefa[]>([]);
  const [conversas, setConversas] = useState<AtendimentoV2Conversa[]>([]);
  const [mensagens, setMensagens] = useState<Record<string, AtendimentoV2Mensagem[]>>({});

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      const [{ data: sessao }, estabelecimento] = await Promise.all([
        supabase.auth.getUser(),
        getEstabelecimentoId(),
      ]);
      const authId = sessao.user?.id;
      if (!authId || !estabelecimento) {
        setTarefas([]);
        setConversas([]);
        return;
      }
      setEstabelecimentoId(estabelecimento);

      const { data: usuario, error: usuarioError } = await supabase
        .from("usuarios")
        .select("id")
        .eq("auth_user_id", authId)
        .eq("estabelecimento_id", estabelecimento)
        .maybeSingle();
      if (usuarioError) throw usuarioError;
      if (!usuario?.id) return;
      setUsuarioId(usuario.id);

      const dataStr = format(dataSelecionada, "yyyy-MM-dd");
      const [{ data: tarefasData, error: tarefasError }, { data: conversasData, error: conversasError }] = await Promise.all([
        supabase
          .from("calendario_tarefas")
          .select("*")
          .eq("user_id", usuario.id)
          .eq("date", dataStr)
          .not("status", "in", '("concluido","cancelado","completed")')
          .order("time", { ascending: true }),
        supabase
          .from("conversations")
          .select("id, customer_id, status, canal, updated_at, metadata, customer:customers!conversations_customer_id_fkey(id,nome,telefone,tel,email)")
          .eq("estabelecimento_id", estabelecimento)
          .order("updated_at", { ascending: false })
          .limit(200),
      ]);
      if (tarefasError) throw tarefasError;
      if (conversasError) throw conversasError;

      const contatoIds = new Set<string>();
      (tarefasData || []).forEach((tarefa) => tarefa.contact_id && contatoIds.add(tarefa.contact_id));
      (conversasData || []).forEach((conversa) => conversa.customer_id && contatoIds.add(conversa.customer_id));

      const ids = Array.from(contatoIds);
      const [{ data: contatosData }, { data: empresasData }] = ids.length
        ? await Promise.all([
            supabase.from("customers").select("id,nome,telefone,tel,email").in("id", ids),
            supabase
              .from("customer_empresas")
              .select("id,customer_id,empresa_id,is_primary,cargo,empresas:empresa_id(id,nome,nome_fantasia,cnpj)")
              .in("customer_id", ids),
          ])
        : [{ data: [] }, { data: [] }];

      const empresasPorContato = new Map<string, any[]>();
      (empresasData || []).forEach((relacao: any) => {
        const atual = empresasPorContato.get(relacao.customer_id) || [];
        atual.push(relacao);
        empresasPorContato.set(relacao.customer_id, atual);
      });
      const contatos = new Map<string, AtendimentoV2Contato>();
      (contatosData || []).forEach((contato: any) => contatos.set(contato.id, {
        id: contato.id,
        nome: contato.nome || "Sem nome",
        telefone: contato.telefone || "",
        tel: contato.tel || "",
        email: contato.email || "",
        companies: empresasPorContato.get(contato.id) || [],
      }));

      const conversaIds = (conversasData || []).map((conversa) => conversa.id);
      const { data: ultimasMensagens } = conversaIds.length
        ? await supabase
            .from("messages")
            .select("id,conversation_id,sender,text,created_at,attachments,payload")
            .in("conversation_id", conversaIds)
            .order("created_at", { ascending: false })
        : { data: [] };
      const ultimaPorConversa = new Map<string, AtendimentoV2Mensagem>();
      const naoLidasPorConversa = new Map<string, number>();
      (ultimasMensagens || []).forEach((mensagem: any) => {
        if (!ultimaPorConversa.has(mensagem.conversation_id)) ultimaPorConversa.set(mensagem.conversation_id, mensagem);
        const payload = mensagem.payload as Record<string, unknown> | null;
        if (mensagem.sender === "customer" && payload?.read !== true) {
          naoLidasPorConversa.set(mensagem.conversation_id, (naoLidasPorConversa.get(mensagem.conversation_id) || 0) + 1);
        }
      });

      setTarefas((tarefasData || []).map((tarefa: any) => ({
        ...tarefa,
        customers: tarefa.contact_id ? contatos.get(tarefa.contact_id) || null : null,
      })));
      setConversas((conversasData || []).map((conversa: any) => ({
        ...conversa,
        customer: conversa.customer_id ? contatos.get(conversa.customer_id) || null : null,
        lastMessage: ultimaPorConversa.get(conversa.id) || null,
        unreadCount: naoLidasPorConversa.get(conversa.id) || 0,
      })));
    } catch (erro) {
      console.error("Erro ao carregar o Painel de Atendimento:", erro);
    } finally {
      setCarregando(false);
    }
  }, [dataSelecionada]);

  useEffect(() => {
    void carregar();
    return ouvirTarefasAlteradas(() => void carregar());
  }, [carregar]);

  useEffect(() => {
    if (!estabelecimentoId) return;
    const canal = supabase
      .channel(`atendimento-v2-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "calendario_tarefas" }, () => void carregar())
      .on("postgres_changes", { event: "*", schema: "public", table: "conversations" }, () => void carregar())
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, () => void carregar())
      .subscribe();
    return () => { void supabase.removeChannel(canal); };
  }, [carregar, estabelecimentoId]);

  const carregarMensagens = useCallback(async (conversationId: string) => {
    const { data, error } = await supabase
      .from("messages")
      .select("id,conversation_id,sender,text,created_at,attachments,payload")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });
    if (error) throw error;
    setMensagens((atual) => ({ ...atual, [conversationId]: (data || []) as AtendimentoV2Mensagem[] }));
  }, []);

  const enviarMensagem = useCallback(async (conversationId: string, texto: string) => {
    const { error } = await supabase.from("messages").insert({
      conversation_id: conversationId,
      sender: "agent",
      text: texto,
      attachments: [],
      payload: { contentType: "text" },
    });
    if (error) throw error;
    const { error: envioError } = await supabase.functions.invoke("send-agent-message", {
      body: { conversationId, text: texto, contentType: "text" },
    });
    if (envioError) throw envioError;
    await carregarMensagens(conversationId);
  }, [carregarMensagens]);

  const fila = useMemo<AtendimentoV2FilaItem[]>(() => {
    const itens = new Map<string, AtendimentoV2FilaItem>();
    tarefas.forEach((tarefa) => {
      const contatoId = tarefa.contact_id;
      const chave = contatoId || `tarefa-${tarefa.id}`;
      const contato = tarefa.customers;
      itens.set(chave, {
        key: chave,
        contato,
        contatoId,
        nome: contato?.nome || tarefa.contact_name || "Contato não identificado",
        empresa: nomeEmpresa(contato),
        motivo: tarefa.description || tarefa.title || "Contato agendado",
        horario: tarefa.time || "Dia todo",
        canal: canalDaOrigem(tarefa.origem),
        atrasado: !!tarefa.data_original && tarefa.data_original < format(new Date(), "yyyy-MM-dd"),
        recebido: false,
        naoIdentificado: !contatoId,
        naoLidas: 0,
        tarefa,
        conversa: null,
      });
    });
    conversas.filter((conversa) => !statusFechados.has(conversa.status)).forEach((conversa) => {
      const telefone = normalizarTelefone((conversa.metadata as any)?.phone);
      const chave = conversa.customer_id || `recebido-${conversa.id}`;
      const existente = conversa.customer_id ? itens.get(conversa.customer_id) : undefined;
      const contato = conversa.customer;
      itens.set(chave, {
        key: chave,
        contato: contato || existente?.contato || null,
        contatoId: conversa.customer_id || existente?.contatoId || null,
        nome: contato?.nome || existente?.nome || (telefone ? `Número ${telefone}` : "Contato não identificado"),
        empresa: nomeEmpresa(contato) || existente?.empresa || "",
        motivo: conversa.lastMessage?.text || existente?.motivo || "Mensagem recebida",
        horario: conversa.lastMessage?.created_at
          ? new Date(conversa.lastMessage.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
          : existente?.horario || "",
        canal: conversa.canal === "email" ? "email" : "whatsapp",
        atrasado: existente?.atrasado || false,
        recebido: true,
        naoIdentificado: !conversa.customer_id,
        naoLidas: conversa.unreadCount,
        tarefa: existente?.tarefa || null,
        conversa,
      });
    });
    return Array.from(itens.values()).sort((a, b) => {
      if (a.atrasado !== b.atrasado) return a.atrasado ? -1 : 1;
      if ((a.naoLidas > 0) !== (b.naoLidas > 0)) return a.naoLidas > 0 ? -1 : 1;
      return a.horario.localeCompare(b.horario);
    });
  }, [conversas, tarefas]);

  return {
    carregando,
    estabelecimentoId,
    usuarioId,
    tarefas,
    conversas,
    fila,
    mensagens,
    carregar,
    carregarMensagens,
    enviarMensagem,
  };
}