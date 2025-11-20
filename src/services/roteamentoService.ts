import { supabase } from "@/integrations/supabase/client";
import type { Chat, Atendente, FilaAtendimento } from "@/types/atendimento";

/**
 * Serviço de Roteamento Automático de Chats
 * Responsável por atribuir chats a atendentes baseado em diferentes estratégias
 */

// Verificar se atendente tem carteira fixa para o cliente
export const verificarCarteiraFixa = async (customerId: string, estabelecimentoId: string): Promise<string | null> => {
  try {
    const { data } = await supabase
      .from("atendente_carteiras")
      .select("atendente_id, atendente:atendentes(*)")
      .eq("customer_id", customerId)
      .eq("estabelecimento_id", estabelecimentoId)
      .eq("ativa", true)
      .single();

    if (data && data.atendente) {
      const atendente = data.atendente as any;
      // Verificar se atendente está disponível e aceita novos chats
      if (atendente.status === 'disponivel' && atendente.aceita_novos_chats) {
        // Verificar se não atingiu limite de chats
        const { data: chatsAtivos } = await supabase
          .from("conversations")
          .select("id")
          .eq("atendente_atual_id", atendente.id)
          .in("chat_status", ["em_atendimento", "aguardando_cliente"]);

        if ((chatsAtivos?.length || 0) < atendente.max_chats_simultaneos) {
          return atendente.id;
        }
      }
    }
    return null;
  } catch (error) {
    console.error("Erro ao verificar carteira fixa:", error);
    return null;
  }
};

// Buscar atendentes disponíveis da fila
const buscarAtendentesDisponiveis = async (filaId: string): Promise<Atendente[]> => {
  try {
    const { data: filaAtendentes } = await supabase
      .from("atendente_filas")
      .select("atendente_id")
      .eq("fila_id", filaId);

    if (!filaAtendentes || filaAtendentes.length === 0) return [];

    const atendenteIds = filaAtendentes.map(fa => fa.atendente_id);

    const { data: atendentes } = await supabase
      .from("atendentes")
      .select("*")
      .in("id", atendenteIds)
      .eq("status", "disponivel")
      .eq("aceita_novos_chats", true);

    if (!atendentes) return [];

    // Filtrar atendentes que não atingiram limite de chats
    const atendentesDisponiveis = [];
    for (const atendente of atendentes) {
      const { data: chatsAtivos } = await supabase
        .from("conversations")
        .select("id")
        .eq("atendente_atual_id", atendente.id)
        .in("chat_status", ["em_atendimento", "aguardando_cliente"]);

      if ((chatsAtivos?.length || 0) < atendente.max_chats_simultaneos) {
        atendentesDisponiveis.push(atendente);
      }
    }

    return atendentesDisponiveis as Atendente[];
  } catch (error) {
    console.error("Erro ao buscar atendentes disponíveis:", error);
    return [];
  }
};

// Roteamento Round Robin
const roteamentoRoundRobin = async (filaId: string): Promise<string | null> => {
  const atendentes = await buscarAtendentesDisponiveis(filaId);
  if (atendentes.length === 0) return null;

  // Buscar último atendente que recebeu chat nesta fila
  const { data: ultimoChat } = await supabase
    .from("conversations")
    .select("atendente_atual_id")
    .eq("fila_id", filaId)
    .not("atendente_atual_id", "is", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!ultimoChat?.atendente_atual_id) {
    return atendentes[0].id; // Primeiro atendente
  }

  // Encontrar próximo atendente na lista
  const currentIndex = atendentes.findIndex(a => a.id === ultimoChat.atendente_atual_id);
  const nextIndex = (currentIndex + 1) % atendentes.length;
  return atendentes[nextIndex].id;
};

// Roteamento por Disponibilidade (menor carga)
const roteamentoPorDisponibilidade = async (filaId: string): Promise<string | null> => {
  const atendentes = await buscarAtendentesDisponiveis(filaId);
  if (atendentes.length === 0) return null;

  // Buscar carga de cada atendente
  const atendentesComCarga = await Promise.all(
    atendentes.map(async (atendente) => {
      const { data: chatsAtivos } = await supabase
        .from("conversations")
        .select("id")
        .eq("atendente_atual_id", atendente.id)
        .in("chat_status", ["em_atendimento", "aguardando_cliente"]);

      return {
        atendente,
        carga: chatsAtivos?.length || 0
      };
    })
  );

  // Ordenar por menor carga
  atendentesComCarga.sort((a, b) => a.carga - b.carga);
  return atendentesComCarga[0].atendente.id;
};

// Roteamento por Skill
const roteamentoPorSkill = async (filaId: string): Promise<string | null> => {
  try {
    // Buscar skills requeridas pela fila
    const { data: filaSkills } = await supabase
      .from("fila_skills")
      .select("skill_id, nivel_minimo")
      .eq("fila_id", filaId);

    if (!filaSkills || filaSkills.length === 0) {
      // Se fila não tem skills, usa round robin
      return roteamentoRoundRobin(filaId);
    }

    const atendentes = await buscarAtendentesDisponiveis(filaId);
    if (atendentes.length === 0) return null;

    // Buscar skills de cada atendente
    const atendentesComSkills = await Promise.all(
      atendentes.map(async (atendente) => {
        const { data: atendenteSkills } = await supabase
          .from("atendente_skills")
          .select("skill_id, nivel")
          .eq("atendente_id", atendente.id);

        return {
          atendente,
          skills: atendenteSkills || []
        };
      })
    );

    // Filtrar atendentes que possuem as skills necessárias
    const atendentesQualificados = atendentesComSkills.filter(({ skills }) => {
      return filaSkills.every(filaSkill => {
        const atendenteSkill = skills.find(s => s.skill_id === filaSkill.skill_id);
        return atendenteSkill && atendenteSkill.nivel >= filaSkill.nivel_minimo;
      });
    });

    if (atendentesQualificados.length === 0) {
      // Nenhum atendente qualificado, retorna null
      return null;
    }

    // Entre os qualificados, escolhe o com maior nível médio
    const atendentesComNivelMedio = atendentesQualificados.map(({ atendente, skills }) => {
      const nivelMedio = skills.reduce((sum, s) => sum + s.nivel, 0) / skills.length;
      return { atendente, nivelMedio };
    });

    atendentesComNivelMedio.sort((a, b) => b.nivelMedio - a.nivelMedio);
    return atendentesComNivelMedio[0].atendente.id;
  } catch (error) {
    console.error("Erro no roteamento por skill:", error);
    return roteamentoRoundRobin(filaId);
  }
};

// Roteamento por Prioridade
const roteamentoPorPrioridade = async (filaId: string): Promise<string | null> => {
  try {
    // Buscar atendentes com suas prioridades na fila
    const { data: filaAtendentes } = await supabase
      .from("atendente_filas")
      .select("atendente_id, prioridade, atendente:atendentes(*)")
      .eq("fila_id", filaId)
      .order("prioridade", { ascending: false });

    if (!filaAtendentes || filaAtendentes.length === 0) return null;

    // Filtrar atendentes disponíveis
    const atendentesDisponiveis = [];
    for (const fa of filaAtendentes) {
      const atendente = fa.atendente as any;
      if (atendente.status === 'disponivel' && atendente.aceita_novos_chats) {
        const { data: chatsAtivos } = await supabase
          .from("conversations")
          .select("id")
          .eq("atendente_atual_id", atendente.id)
          .in("chat_status", ["em_atendimento", "aguardando_cliente"]);

        if ((chatsAtivos?.length || 0) < atendente.max_chats_simultaneos) {
          atendentesDisponiveis.push(atendente);
        }
      }
    }

    if (atendentesDisponiveis.length === 0) return null;
    return atendentesDisponiveis[0].id; // Já está ordenado por prioridade
  } catch (error) {
    console.error("Erro no roteamento por prioridade:", error);
    return roteamentoRoundRobin(filaId);
  }
};

// Função principal de roteamento
export const rotearChat = async (
  chatId: string,
  customerId: string,
  estabelecimentoId: string,
  filaId?: string
): Promise<boolean> => {
  try {
    // 1. Verificar carteira fixa
    const atendenteCarteira = await verificarCarteiraFixa(customerId, estabelecimentoId);
    if (atendenteCarteira) {
      await atribuirChat(chatId, atendenteCarteira, filaId || null);
      return true;
    }

    // 2. Determinar fila
    let filaParaRotear = filaId;
    if (!filaParaRotear) {
      // Buscar fila padrão ou fila com maior prioridade
      const { data: filas } = await supabase
        .from("filas_atendimento")
        .select("id")
        .eq("estabelecimento_id", estabelecimentoId)
        .eq("ativa", true)
        .order("prioridade", { ascending: false })
        .limit(1);

      if (!filas || filas.length === 0) {
        console.log("Nenhuma fila ativa encontrada");
        return false;
      }
      filaParaRotear = filas[0].id;
    }

    // 3. Buscar tipo de roteamento da fila
    const { data: fila } = await supabase
      .from("filas_atendimento")
      .select("tipo_roteamento, mensagem_fila")
      .eq("id", filaParaRotear)
      .single();

    if (!fila) {
      console.log("Fila não encontrada");
      return false;
    }

    // 4. Aplicar estratégia de roteamento
    let atendenteId: string | null = null;

    switch (fila.tipo_roteamento) {
      case "round_robin":
        atendenteId = await roteamentoRoundRobin(filaParaRotear);
        break;
      case "por_disponibilidade":
        atendenteId = await roteamentoPorDisponibilidade(filaParaRotear);
        break;
      case "por_skill":
        atendenteId = await roteamentoPorSkill(filaParaRotear);
        break;
      case "por_prioridade":
        atendenteId = await roteamentoPorPrioridade(filaParaRotear);
        break;
      case "por_carteira":
        // Já verificado acima
        atendenteId = null;
        break;
      default:
        atendenteId = await roteamentoRoundRobin(filaParaRotear);
    }

    if (atendenteId) {
      await atribuirChat(chatId, atendenteId, filaParaRotear);
      return true;
    } else {
      // Colocar em fila de espera
      await colocarEmFila(chatId, filaParaRotear, fila.mensagem_fila);
      return false;
    }
  } catch (error) {
    console.error("Erro ao rotear chat:", error);
    return false;
  }
};

// Atribuir chat a atendente
const atribuirChat = async (chatId: string, atendenteId: string, filaId: string | null) => {
  await supabase
    .from("conversations")
    .update({
      atendente_atual_id: atendenteId,
      fila_id: filaId,
      chat_status: "em_atendimento",
      tempo_atendimento_inicio: new Date().toISOString(),
      bot_active: false
    })
    .eq("id", chatId);
};

// Colocar chat em fila de espera
const colocarEmFila = async (chatId: string, filaId: string, mensagemFila?: string) => {
  await supabase
    .from("conversations")
    .update({
      fila_id: filaId,
      chat_status: "em_fila",
      tempo_espera_inicio: new Date().toISOString()
    })
    .eq("id", chatId);

  // Enviar mensagem de fila se configurada
  if (mensagemFila) {
    await supabase
      .from("messages")
      .insert({
        conversation_id: chatId,
        sender: "system",
        text: mensagemFila
      });
  }
};

// Processar fila automaticamente (chamar periodicamente)
export const processarFila = async (estabelecimentoId: string) => {
  try {
    // Buscar chats em fila
    const { data: chatsEmFila } = await supabase
      .from("conversations")
      .select("id, customer_id, fila_id")
      .eq("estabelecimento_id", estabelecimentoId)
      .eq("chat_status", "em_fila")
      .order("tempo_espera_inicio", { ascending: true });

    if (!chatsEmFila || chatsEmFila.length === 0) return;

    // Tentar rotear cada chat
    for (const chat of chatsEmFila) {
      await rotearChat(chat.id, chat.customer_id, estabelecimentoId, chat.fila_id || undefined);
    }
  } catch (error) {
    console.error("Erro ao processar fila:", error);
  }
};
