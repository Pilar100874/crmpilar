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
  IF NEW.app NOT IN ('controle', 'automacao', 'sms') OR NEW.dispositivo_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  tipo := CASE
    WHEN NEW.app = 'controle' THEN 'hub'
    WHEN NEW.app = 'automacao' THEN 'automacao'
    ELSE 'android'
  END;

  INSERT INTO public.sms_devices (
    estabelecimento_id, nome, ativo, tipo_dispositivo,
    modulo_sms_ativo, modulo_ponto_ativo, modulo_camera_ativo
  ) VALUES (
    NEW.estabelecimento_id, NEW.nome, NOT NEW.bloqueado, tipo,
    NEW.app = 'sms', NEW.app = 'controle', false
  ) RETURNING id INTO novo_id;

  NEW.dispositivo_id := novo_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_vincular_dispositivo_app ON public.automacao_app_chaves;
CREATE TRIGGER trg_vincular_dispositivo_app
  BEFORE INSERT ON public.automacao_app_chaves
  FOR EACH ROW EXECUTE FUNCTION public.vincular_dispositivo_app();

WITH chaves_sem_dispositivo AS (
  SELECT c.id, c.estabelecimento_id, c.nome, c.bloqueado
  FROM public.automacao_app_chaves c
  WHERE c.app = 'sms' AND c.dispositivo_id IS NULL
), novos_dispositivos AS (
  INSERT INTO public.sms_devices (
    estabelecimento_id, nome, ativo, tipo_dispositivo,
    modulo_sms_ativo, modulo_ponto_ativo, modulo_camera_ativo
  )
  SELECT estabelecimento_id, nome, NOT bloqueado, 'android', true, false, false
  FROM chaves_sem_dispositivo
  RETURNING id, estabelecimento_id, nome
)
UPDATE public.automacao_app_chaves c
SET dispositivo_id = d.id
FROM novos_dispositivos d
WHERE c.app = 'sms'
  AND c.dispositivo_id IS NULL
  AND c.estabelecimento_id = d.estabelecimento_id
  AND c.nome = d.nome;

REVOKE EXECUTE ON FUNCTION public.vincular_dispositivo_app() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.vincular_dispositivo_app() TO service_role;