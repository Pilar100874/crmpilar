CREATE OR REPLACE FUNCTION public.vincular_dispositivo_app()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  novo_id uuid;
  tipo text;
BEGIN
  IF NEW.app NOT IN ('controle', 'automacao') OR NEW.dispositivo_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  tipo := CASE WHEN NEW.app = 'controle' THEN 'hub' ELSE 'automacao' END;
  INSERT INTO public.sms_devices (
    estabelecimento_id, nome, ativo, tipo_dispositivo,
    modulo_sms_ativo, modulo_ponto_ativo, modulo_camera_ativo
  ) VALUES (
    NEW.estabelecimento_id, NEW.nome, NOT NEW.bloqueado, tipo,
    false, NEW.app = 'controle', false
  ) RETURNING id INTO novo_id;

  NEW.dispositivo_id := novo_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_vincular_dispositivo_controle ON public.automacao_app_chaves;
DROP TRIGGER IF EXISTS trg_vincular_dispositivo_app ON public.automacao_app_chaves;
CREATE TRIGGER trg_vincular_dispositivo_app
  BEFORE INSERT ON public.automacao_app_chaves
  FOR EACH ROW EXECUTE FUNCTION public.vincular_dispositivo_app();

INSERT INTO public.sms_devices (
  estabelecimento_id, nome, ativo, tipo_dispositivo,
  modulo_sms_ativo, modulo_ponto_ativo, modulo_camera_ativo
)
SELECT c.estabelecimento_id, c.nome, NOT c.bloqueado, 'automacao', false, false, false
FROM public.automacao_app_chaves c
WHERE c.app = 'automacao' AND c.dispositivo_id IS NULL;

UPDATE public.automacao_app_chaves c
SET dispositivo_id = d.id
FROM public.sms_devices d
WHERE c.app = 'automacao'
  AND c.dispositivo_id IS NULL
  AND d.estabelecimento_id = c.estabelecimento_id
  AND d.nome = c.nome
  AND d.tipo_dispositivo = 'automacao';

CREATE OR REPLACE FUNCTION public.validar_comando_atualizacao_app()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  dispositivo public.sms_devices%ROWTYPE;
BEGIN
  SELECT * INTO dispositivo FROM public.sms_devices WHERE id = NEW.device_id;
  IF dispositivo.id IS NULL OR dispositivo.estabelecimento_id IS DISTINCT FROM NEW.estabelecimento_id THEN
    RAISE EXCEPTION 'Aparelho não pertence ao estabelecimento informado';
  END IF;
  IF NEW.app NOT IN ('sms', 'hub', 'automacao') THEN
    RAISE EXCEPTION 'Aplicativo não suportado pela fila de atualização';
  END IF;
  IF (NEW.app = 'sms' AND dispositivo.tipo_dispositivo = 'hub')
     OR (NEW.app = 'hub' AND dispositivo.tipo_dispositivo <> 'hub')
     OR (NEW.app = 'automacao' AND dispositivo.tipo_dispositivo <> 'automacao') THEN
    RAISE EXCEPTION 'Aplicativo não corresponde ao aparelho';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validar_comando_atualizacao_app ON public.app_update_commands;
CREATE TRIGGER trg_validar_comando_atualizacao_app
  BEFORE INSERT OR UPDATE OF estabelecimento_id, device_id, app
  ON public.app_update_commands
  FOR EACH ROW EXECUTE FUNCTION public.validar_comando_atualizacao_app();