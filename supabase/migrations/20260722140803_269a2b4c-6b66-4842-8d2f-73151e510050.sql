
CREATE OR REPLACE FUNCTION public.clear_entity_dependency(p_entity text, p_id uuid, p_dep_key text)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  n integer := 0;
  txt text := p_id::text;
BEGIN
  IF p_entity = 'empresa' THEN
    IF p_dep_key = 'Contatos vinculados' THEN
      DELETE FROM public.customer_empresas WHERE empresa_id = p_id;
    ELSIF p_dep_key = 'Clientes diretos' THEN
      UPDATE public.customers SET empresa_id = NULL WHERE empresa_id = p_id;
    ELSIF p_dep_key = 'Orçamentos' THEN
      DELETE FROM public.orcamentos WHERE empresa_id = p_id;
    ELSIF p_dep_key = 'Negociações no funil' THEN
      DELETE FROM public.funil_deals WHERE empresa_id = p_id;
    ELSIF p_dep_key = 'Pedidos e-commerce' THEN
      DELETE FROM public.pedidos_ecommerce WHERE empresa_id = p_id;
    ELSIF p_dep_key = 'Tarefas de agenda' THEN
      DELETE FROM public.calendario_tarefas WHERE empresa_id::text = txt;
    END IF;

  ELSIF p_entity = 'produto' THEN
    IF p_dep_key = 'Itens em orçamentos' THEN
      DELETE FROM public.orcamento_itens WHERE produto_id = p_id;
    ELSIF p_dep_key = 'Itens em pedidos' THEN
      DELETE FROM public.pedidos_ecommerce_itens WHERE produto_id = p_id;
    ELSIF p_dep_key = 'Publicações em marketplace' THEN
      DELETE FROM public.marketplace_produtos WHERE produto_id = p_id;
    ELSIF p_dep_key = 'Mensagens do grupo' THEN
      DELETE FROM public.mensagens_grupo_produto WHERE grupo_id IN (SELECT grupo_id FROM public.produtos WHERE id = p_id);
    END IF;

  ELSIF p_entity = 'veiculo' THEN
    IF p_dep_key = 'Posições registradas' THEN
      DELETE FROM public.veiculo_posicoes WHERE veiculo_id = p_id;
    ELSIF p_dep_key = 'Entregas programadas' THEN
      DELETE FROM public.entregas_programadas WHERE veiculo_id = p_id;
    ELSIF p_dep_key = 'Custos registrados' THEN
      DELETE FROM public.veiculos_custos WHERE veiculo_id = p_id;
    ELSIF p_dep_key = 'Encomendas' THEN
      DELETE FROM public.livro_encomendas WHERE veiculo_id = p_id;
    END IF;

  ELSIF p_entity = 'motorista' THEN
    IF p_dep_key = 'Movimentações de veículos' THEN
      DELETE FROM public.cv_vehicle_movements WHERE driver_id = p_id;
    END IF;

  ELSIF p_entity = 'usuario' THEN
    IF p_dep_key = 'Atendimentos' THEN
      UPDATE public.atendimento_registros SET atendente_id = NULL WHERE atendente_id = p_id;
    ELSIF p_dep_key = 'Conversas atribuídas' THEN
      UPDATE public.conversations SET atendente_id = NULL WHERE atendente_id = p_id;
    ELSIF p_dep_key = 'Orçamentos como vendedor' THEN
      UPDATE public.orcamentos SET vendedor_id = NULL WHERE vendedor_id = p_id;
    END IF;

  ELSIF p_entity = 'contato' THEN
    IF p_dep_key = 'conversas' THEN
      DELETE FROM public.conversations WHERE customer_id = p_id;
    ELSIF p_dep_key = 'mensagens' THEN
      DELETE FROM public.messages WHERE conversation_id IN (SELECT id FROM public.conversations WHERE customer_id = p_id);
    ELSIF p_dep_key = 'orcamentos' THEN
      DELETE FROM public.orcamentos WHERE cliente_id = p_id;
    ELSIF p_dep_key = 'pedidos_ecommerce' THEN
      DELETE FROM public.pedidos_ecommerce WHERE customer_id = p_id;
    ELSIF p_dep_key = 'negociacoes_funil' THEN
      DELETE FROM public.funil_deals WHERE cliente_id = p_id;
    ELSIF p_dep_key = 'tickets_portal' THEN
      DELETE FROM public.portal_tickets WHERE customer_id = p_id;
    ELSIF p_dep_key = 'tarefas_agenda' THEN
      DELETE FROM public.calendario_tarefas WHERE contact_id = p_id::text;
    ELSIF p_dep_key = 'envio_massa' THEN
      DELETE FROM public.envio_massa_contatos WHERE customer_id = p_id;
    ELSIF p_dep_key = 'vendas_atribuidas' THEN
      DELETE FROM public.vendas_atribuidas WHERE customer_id = p_id;
    ELSIF p_dep_key = 'respostas_pesquisa' THEN
      DELETE FROM public.pesquisas_respostas WHERE customer_id = p_id;
    ELSIF p_dep_key = 'carrinhos_ativos' THEN
      DELETE FROM public.ecom_active_carts WHERE customer_id = p_id;
    END IF;

  ELSIF p_entity = 'cupom' THEN
    IF p_dep_key = 'Pedidos que usaram' THEN
      UPDATE public.pedidos_ecommerce SET cupom_id = NULL WHERE cupom_id = p_id;
    END IF;

  ELSIF p_entity = 'tabela_preco' THEN
    IF p_dep_key = 'Produtos vinculados' THEN
      DELETE FROM public.produtos_fontes_precos WHERE tabela_preco_id = p_id;
    END IF;

  ELSIF p_entity = 'agente_ia' THEN
    IF p_dep_key = 'Sessões de chat' THEN
      DELETE FROM public.agent_chat_sessions WHERE agent_id = p_id;
    END IF;

  ELSIF p_entity = 'mensagem_grupo' THEN
    IF p_dep_key = 'Usos registrados' THEN
      DELETE FROM public.bot_frase_uso WHERE frase_id = p_id;
    END IF;
  END IF;

  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END;
$$;

GRANT EXECUTE ON FUNCTION public.clear_entity_dependency(text, uuid, text) TO authenticated;
