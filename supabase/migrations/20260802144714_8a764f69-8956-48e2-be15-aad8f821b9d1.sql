
CREATE TABLE IF NOT EXISTS public.aip_notification_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  estabelecimento_id uuid NOT NULL UNIQUE,
  ui_ativo boolean NOT NULL DEFAULT true,
  webhook_url text,
  emails text[] NOT NULL DEFAULT '{}',
  notificar_inicio boolean NOT NULL DEFAULT true,
  notificar_fim boolean NOT NULL DEFAULT true,
  notificar_aprovacao boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.aip_notification_settings TO authenticated;
GRANT ALL ON public.aip_notification_settings TO service_role;
ALTER TABLE public.aip_notification_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "aip_notification_settings_tenant" ON public.aip_notification_settings
  FOR ALL TO authenticated
  USING (estabelecimento_id = get_auth_user_estabelecimento_id() OR is_system_admin())
  WITH CHECK (estabelecimento_id = get_auth_user_estabelecimento_id() OR is_system_admin());

CREATE TABLE IF NOT EXISTS public.aip_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  estabelecimento_id uuid NOT NULL,
  evento text NOT NULL,
  nivel text NOT NULL DEFAULT 'info',
  titulo text NOT NULL,
  mensagem text,
  execution_id uuid,
  approval_id uuid,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  lida boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS aip_notifications_estab_idx ON public.aip_notifications (estabelecimento_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.aip_notifications TO authenticated;
GRANT ALL ON public.aip_notifications TO service_role;
ALTER TABLE public.aip_notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "aip_notifications_tenant" ON public.aip_notifications
  FOR ALL TO authenticated
  USING (estabelecimento_id = get_auth_user_estabelecimento_id() OR is_system_admin())
  WITH CHECK (estabelecimento_id = get_auth_user_estabelecimento_id() OR is_system_admin());

CREATE TRIGGER aip_notification_settings_updated_at BEFORE UPDATE ON public.aip_notification_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER aip_notifications_updated_at BEFORE UPDATE ON public.aip_notifications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.aip_notifications REPLICA IDENTITY FULL;
ALTER TABLE public.aip_executions REPLICA IDENTITY FULL;
ALTER TABLE public.aip_approvals REPLICA IDENTITY FULL;

DO $$
BEGIN
  BEGIN EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.aip_notifications'; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.aip_executions'; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.aip_approvals'; EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;

-- Dispara a edge function de entrega (webhook / e-mail)
CREATE OR REPLACE FUNCTION public.aip_notificacao_dispatch()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cfg public.aip_notification_settings%ROWTYPE;
BEGIN
  SELECT * INTO cfg FROM public.aip_notification_settings
   WHERE estabelecimento_id = NEW.estabelecimento_id;

  IF cfg.id IS NULL THEN
    RETURN NEW;
  END IF;

  IF cfg.webhook_url IS NULL AND coalesce(array_length(cfg.emails, 1), 0) = 0 THEN
    RETURN NEW;
  END IF;

  PERFORM net.http_post(
    url := 'https://ioxugupvxlcdweldocmq.supabase.co/functions/v1/aip-notify',
    headers := '{"Content-Type":"application/json"}'::jsonb,
    body := jsonb_build_object('notification_id', NEW.id)
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_aip_notificacao_dispatch
AFTER INSERT ON public.aip_notifications
FOR EACH ROW EXECUTE FUNCTION public.aip_notificacao_dispatch();

-- Execuções: início e fim
CREATE OR REPLACE FUNCTION public.aip_executions_notificar()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cfg public.aip_notification_settings%ROWTYPE;
  nome text;
BEGIN
  SELECT * INTO cfg FROM public.aip_notification_settings
   WHERE estabelecimento_id = NEW.estabelecimento_id;

  SELECT w.nome INTO nome FROM public.aip_workflows w WHERE w.id = NEW.workflow_id;
  nome := coalesce(nome, NEW.origem, 'Execução');

  IF TG_OP = 'INSERT' THEN
    IF cfg.id IS NULL OR cfg.notificar_inicio THEN
      INSERT INTO public.aip_notifications (estabelecimento_id, evento, nivel, titulo, mensagem, execution_id, payload)
      VALUES (NEW.estabelecimento_id, 'execucao_inicio', 'info',
              'Execução iniciada: ' || nome,
              'Status: ' || NEW.status, NEW.id,
              jsonb_build_object('workflow_id', NEW.workflow_id, 'status', NEW.status));
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status IN ('concluida', 'erro', 'cancelada') AND (cfg.id IS NULL OR cfg.notificar_fim) THEN
      INSERT INTO public.aip_notifications (estabelecimento_id, evento, nivel, titulo, mensagem, execution_id, payload)
      VALUES (NEW.estabelecimento_id, 'execucao_fim',
              CASE WHEN NEW.status = 'concluida' THEN 'sucesso' ELSE 'erro' END,
              'Execução ' || NEW.status || ': ' || nome,
              coalesce(NEW.erro, NEW.motivo_interrupcao, 'Finalizada com sucesso'), NEW.id,
              jsonb_build_object('workflow_id', NEW.workflow_id, 'status', NEW.status, 'duracao_ms', NEW.duracao_ms));
    ELSIF NEW.status = 'aguardando_aprovacao' AND (cfg.id IS NULL OR cfg.notificar_aprovacao) THEN
      INSERT INTO public.aip_notifications (estabelecimento_id, evento, nivel, titulo, mensagem, execution_id, payload)
      VALUES (NEW.estabelecimento_id, 'execucao_pausada', 'aviso',
              'Execução aguardando aprovação: ' || nome,
              'A execução foi pausada até a decisão humana.', NEW.id,
              jsonb_build_object('workflow_id', NEW.workflow_id));
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_aip_executions_notificar
AFTER INSERT OR UPDATE ON public.aip_executions
FOR EACH ROW EXECUTE FUNCTION public.aip_executions_notificar();

-- Aprovações pendentes
CREATE OR REPLACE FUNCTION public.aip_approvals_notificar()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cfg public.aip_notification_settings%ROWTYPE;
BEGIN
  IF NEW.status <> 'pendente' THEN
    RETURN NEW;
  END IF;

  SELECT * INTO cfg FROM public.aip_notification_settings
   WHERE estabelecimento_id = NEW.estabelecimento_id;

  IF cfg.id IS NULL OR cfg.notificar_aprovacao THEN
    INSERT INTO public.aip_notifications (estabelecimento_id, evento, nivel, titulo, mensagem, execution_id, approval_id, payload)
    VALUES (NEW.estabelecimento_id, 'aprovacao_pendente', 'aviso',
            'Aprovação pendente: ' || NEW.titulo,
            coalesce(NEW.instrucoes, 'Há uma aprovação humana aguardando decisão.'),
            NEW.execution_id, NEW.id,
            jsonb_build_object('node_id', NEW.node_id, 'tipo', NEW.tipo));
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_aip_approvals_notificar
AFTER INSERT ON public.aip_approvals
FOR EACH ROW EXECUTE FUNCTION public.aip_approvals_notificar();
