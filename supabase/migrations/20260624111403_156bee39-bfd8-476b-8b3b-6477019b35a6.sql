
CREATE OR REPLACE FUNCTION public.ponto_afastamento_enqueue_esocial()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_evento text;
BEGIN
  IF NEW.status <> 'aprovado' THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND OLD.status = 'aprovado' THEN RETURN NEW; END IF;

  v_evento := 'S-2230';

  INSERT INTO public.ponto_esocial_eventos
    (estabelecimento_id, funcionario_id, evento, referencia_id, payload, status)
  VALUES (
    NEW.estabelecimento_id, NEW.funcionario_id, v_evento, NEW.id,
    jsonb_build_object(
      'tipo', NEW.tipo, 'data_inicio', NEW.data_inicio,
      'data_fim', NEW.data_fim, 'dias', NEW.dias, 'motivo', NEW.motivo
    ),
    'pendente'
  );

  UPDATE public.ponto_ferias_afastamentos SET esocial_evento = v_evento WHERE id = NEW.id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ponto_afastamento_esocial ON public.ponto_ferias_afastamentos;
CREATE TRIGGER trg_ponto_afastamento_esocial
  AFTER INSERT OR UPDATE OF status ON public.ponto_ferias_afastamentos
  FOR EACH ROW EXECUTE FUNCTION public.ponto_afastamento_enqueue_esocial();

-- Desligamento: dispara S-2299 quando status muda para demitido/desligado/inativo
CREATE OR REPLACE FUNCTION public.ponto_funcionario_enqueue_desligamento()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_estab uuid;
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status
     AND NEW.status IN ('demitido','desligado','inativo')
     AND COALESCE(OLD.status,'') NOT IN ('demitido','desligado','inativo') THEN

    SELECT estabelecimento_id INTO v_estab FROM public.ponto_empresas WHERE id = NEW.empresa_id;

    INSERT INTO public.ponto_esocial_eventos
      (estabelecimento_id, funcionario_id, evento, referencia_id, payload, status)
    VALUES (
      v_estab, NEW.id, 'S-2299', NEW.id,
      jsonb_build_object(
        'data_desligamento', COALESCE(NEW.demissao, CURRENT_DATE),
        'novo_status', NEW.status
      ),
      'pendente'
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ponto_funcionario_desligamento ON public.ponto_funcionarios;
CREATE TRIGGER trg_ponto_funcionario_desligamento
  AFTER UPDATE OF status ON public.ponto_funcionarios
  FOR EACH ROW EXECUTE FUNCTION public.ponto_funcionario_enqueue_desligamento();

-- Tabela de importações AFD
CREATE TABLE IF NOT EXISTS public.ponto_afd_importacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.ponto_empresas(id) ON DELETE CASCADE,
  estabelecimento_id uuid NOT NULL,
  filial_id uuid REFERENCES public.ponto_filiais(id) ON DELETE SET NULL,
  equipamento_id uuid REFERENCES public.ponto_equipamentos(id) ON DELETE SET NULL,
  nome_arquivo text NOT NULL,
  formato text NOT NULL DEFAULT 'rep-c' CHECK (formato IN ('rep-a','rep-c','rep-p','generico')),
  cnpj_cabecalho text,
  total_linhas integer NOT NULL DEFAULT 0,
  total_marcacoes integer NOT NULL DEFAULT 0,
  marcacoes_importadas integer NOT NULL DEFAULT 0,
  marcacoes_duplicadas integer NOT NULL DEFAULT 0,
  marcacoes_erro integer NOT NULL DEFAULT 0,
  erros jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'processando' CHECK (status IN ('processando','concluido','erro')),
  importado_por uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ponto_afd_importacoes TO authenticated;
GRANT ALL ON public.ponto_afd_importacoes TO service_role;
ALTER TABLE public.ponto_afd_importacoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "afd_imp_estab" ON public.ponto_afd_importacoes FOR ALL TO authenticated
  USING (user_in_estabelecimento(estabelecimento_id)) WITH CHECK (user_in_estabelecimento(estabelecimento_id));
CREATE TRIGGER set_afd_imp_uat BEFORE UPDATE ON public.ponto_afd_importacoes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
