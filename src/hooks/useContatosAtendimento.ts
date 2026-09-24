import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ouvirTarefasAlteradas } from "@/lib/calendario/eventos";

export interface ContatoAtendimento {
  id: string;
  nome: string;
  /** Número de WhatsApp (coluna telefone) */
  telefone: string;
  /** Telefone fixo/comercial (coluna tel) */
  tel: string;
  email: string;
  /** Texto auxiliar, ex.: título da tarefa da agenda */
  referencia?: string;
  /** Horário da tarefa quando o contato veio da agenda. */
  horario?: string;
  /** Origem da tarefa, seguindo as informações do cartão da Agenda. */
  origem?: string;
  /** Quantidade de orçamentos em aberto do contato e suas empresas. */
  orcamentosAbertos?: number;
  /** Quantidade de dias em atraso da tarefa da agenda. */
  diasAtraso?: number;
  /** Quantidade de e-mails ainda não lidos deste contato. */
  emailsNaoLidos?: number;
  /** Quantidade de chats pendentes deste contato. */
  chatsPendentes?: number;
  /** Nome curto exibido na faixa lateral do cartão. */
  responsavel?: string;
  /** Empresas vinculadas ao contato para o painel unificado de detalhes. */
  companies?: any[];
}

/**
 * Contatos vinculados ao usuário logado (customer_vinculos).
 * Usado quando a flag "Usar agenda" está desligada.
 */
export function useContatosVinculados(usuarioIds: string[], ativo: boolean) {
  const chave = usuarioIds.join(",");
  const [contatos, setContatos] = useState<ContatoAtendimento[]>([]);
  const [carregando, setCarregando] = useState(false);

  const carregar = useCallback(async () => {
    const ids = chave ? chave.split(",") : [];
    if (ids.length === 0 || !ativo) {
      setContatos([]);
      return;
    }
    setCarregando(true);
    try {
      const { data: vinculosDiretos, error } = await supabase
        .from("customer_vinculos")
        .select("customer_id")
        .in("usuario_id", ids);

      if (error) throw error;

      const customerIds = [...new Set(((vinculosDiretos ?? []) as any[]).map((v) => v.customer_id).filter(Boolean))];
      let vinculadosDiretos: any[] = [];
      if (customerIds.length) {
        const { data: customers, error: customersError } = await supabase
          .from("customers")
          .select("id, nome, telefone, tel, email, customer_empresas ( id, empresa_id, is_primary, cargo, empresas:empresa_id ( id, nome, nome_fantasia, cnpj ) )")
          .in("id", customerIds.slice(0, 500));
        if (customersError) throw customersError;
        vinculadosDiretos = (customers ?? []).map((customer) => ({ customers: customer }));
      }

      // Contatos das empresas vinculadas aos usuários visíveis
      const { data: empVinc } = await supabase
        .from("empresa_vinculos")
        .select("empresa_id")
        .in("usuario_id", ids)
        .is("vendedor_id", null);
      const empresaIds = [...new Set(((empVinc ?? []) as any[]).map((e) => e.empresa_id).filter(Boolean))];
      let viaEmpresa: any[] = [];
      if (empresaIds.length) {
        const { data: ce } = await supabase
          .from("customer_empresas")
          .select("customers:customer_id ( id, nome, telefone, tel, email, customer_empresas ( id, empresa_id, is_primary, cargo, empresas:empresa_id ( id, nome, nome_fantasia, cnpj ) ) )")
          .in("empresa_id", empresaIds.slice(0, 500));
        viaEmpresa = ce ?? [];
      }

      // Com a agenda desligada, tarefas futuras não escondem contatos.
      // Permanecem fora apenas os contatos explicitamente inativados do fluxo.
      const { data: inativos } = await supabase
        .from("customer_fluxo_inativacoes" as any)
        .select("customer_id")
        .eq("ativo", true);
      const ocultos = new Set<string>(((inativos ?? []) as any[]).map((t) => t.customer_id));

      const mapa = new Map<string, ContatoAtendimento>();
      [...vinculadosDiretos, ...viaEmpresa].forEach((vinculo: any) => {
        const c = vinculo.customers;
        if (!c?.id || mapa.has(c.id) || ocultos.has(c.id)) return;
        mapa.set(c.id, {
          id: c.id,
          nome: c.nome || "Sem nome",
          telefone: c.telefone || "",
          tel: c.tel || "",
          email: c.email || "",
          responsavel: "Meu Cliente",
          companies: c.customer_empresas || [],
        });
      });

      setContatos(
        Array.from(mapa.values()).sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR")),
      );
    } catch (erro) {
      console.error("Erro ao carregar contatos vinculados:", erro);
      setContatos([]);
    } finally {
      setCarregando(false);
    }
  }, [chave, ativo]);

  useEffect(() => {
    void carregar();
    return ouvirTarefasAlteradas(() => void carregar());
  }, [carregar]);

  return { contatos, carregando, recarregar: carregar };
}
