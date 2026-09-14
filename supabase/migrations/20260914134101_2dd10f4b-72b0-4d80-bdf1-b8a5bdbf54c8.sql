ALTER TABLE public.automacao_app_chaves
  ADD COLUMN IF NOT EXISTS dispositivo_id uuid REFERENCES public.sms_devices(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS automacao_app_chaves_dispositivo_id_key
  ON public.automacao_app_chaves(dispositivo_id)
  WHERE dispositivo_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.vincular_dispositivo_controle()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  novo_id uuid;
BEGIN
  IF NEW.app <> 'controle' OR NEW.dispositivo_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.sms_devices (
    estabelecimento_id, nome, ativo, tipo_dispositivo,
    modulo_sms_ativo, modulo_ponto_ativo, modulo_camera_ativo
  ) VALUES (
    NEW.estabelecimento_id, NEW.nome, NOT NEW.bloqueado, 'hub',
    false, true, false
  ) RETURNING id INTO novo_id;

  NEW.dispositivo_id := novo_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_vincular_dispositivo_controle ON public.automacao_app_chaves;
CREATE TRIGGER trg_vincular_dispositivo_controle
  BEFORE INSERT ON public.automacao_app_chaves
  FOR EACH ROW EXECUTE FUNCTION public.vincular_dispositivo_controle();

INSERT INTO public.sms_devices (
  estabelecimento_id, nome, ativo, tipo_dispositivo,
  modulo_sms_ativo, modulo_ponto_ativo, modulo_camera_ativo
)
SELECT c.estabelecimento_id, c.nome, NOT c.bloqueado, 'hub', false, true, false
FROM public.automacao_app_chaves c
WHERE c.app = 'controle' AND c.dispositivo_id IS NULL;

UPDATE public.automacao_app_chaves c
SET dispositivo_id = d.id
FROM public.sms_devices d
WHERE c.app = 'controle'
  AND c.dispositivo_id IS NULL
  AND d.estabelecimento_id = c.estabelecimento_id
  AND d.nome = c.nome
  AND d.tipo_dispositivo = 'hub';