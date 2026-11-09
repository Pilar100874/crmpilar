ALTER TABLE public.calendario_tarefas DROP CONSTRAINT IF EXISTS calendario_tarefas_origem_check;
ALTER TABLE public.calendario_tarefas ADD CONSTRAINT calendario_tarefas_origem_check CHECK (origem IS NULL OR origem = ANY (ARRAY['bot','campanha','ligacao','visita','email_enviado','email_recebido','pedido_orcamento','pedido_negociacao','pedido_aprovacao','manual','novo_contato','regra','telefone','email','presencial','whatsapp','chat','inteligente','automatico']) OR origem LIKE 'chat\_%');

ALTER TABLE public.empresas ADD COLUMN IF NOT EXISTS situacao_credito text NOT NULL DEFAULT 'nao_informado';
ALTER TABLE public.empresas ADD COLUMN IF NOT EXISTS credito_obs text;

CREATE OR REPLACE FUNCTION public.reconquista_orcamento_perdido()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_nome text;
BEGIN
  IF NEW.etapa = 'perdido' AND COALESCE(OLD.etapa,'') <> 'perdido' AND NEW.cliente_id IS NOT NULL AND NEW.vendedor_id IS NOT NULL AND NEW.estabelecimento_id IS NOT NULL THEN
    SELECT nome INTO v_nome FROM customers WHERE id = NEW.cliente_id;
    INSERT INTO calendario_tarefas (user_id, estabelecimento_id, contact_id, contact_name, title, description, date, status, origem, origem_sub_item, modo_criacao, motivo, is_all_day)
    VALUES (NEW.vendedor_id, NEW.estabelecimento_id, NEW.cliente_id, COALESCE(v_nome,'Cliente'),
      'Reconquista: orçamento perdido - ' || COALESCE(v_nome,'Cliente'),
      'Orçamento perdido' || COALESCE(' (' || NEW.motivo_perda || ')', '') || '. Verificar se o concorrente atendeu bem.',
      (now() + interval '15 days')::date, 'pending', 'automatico', 'reconquista_orcamento', 'automatico',
      'Orçamento de R$ ' || COALESCE(round(NEW.valor_total)::text,'0') || ' marcado como perdido' || COALESCE(' por ' || NEW.motivo_perda, '') || '; retorno em 15 dias', true);
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_reconquista_orcamento ON public.orcamentos;
CREATE TRIGGER trg_reconquista_orcamento AFTER UPDATE OF etapa ON public.orcamentos FOR EACH ROW EXECUTE FUNCTION public.reconquista_orcamento_perdido();