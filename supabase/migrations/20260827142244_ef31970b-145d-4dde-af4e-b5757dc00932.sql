CREATE TABLE public.transp_setores_numeros (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  setor_id uuid NOT NULL REFERENCES public.transp_setores(id) ON DELETE CASCADE,
  numero text NOT NULL,
  descricao text,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.transp_setores_numeros TO authenticated;
GRANT ALL ON public.transp_setores_numeros TO service_role;

ALTER TABLE public.transp_setores_numeros ENABLE ROW LEVEL SECURITY;

CREATE POLICY transp_setores_numeros_tenant ON public.transp_setores_numeros
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.transp_setores s
    WHERE s.id = transp_setores_numeros.setor_id
      AND s.estabelecimento_id = get_user_estabelecimento_id(auth.uid())
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.transp_setores s
    WHERE s.id = transp_setores_numeros.setor_id
      AND s.estabelecimento_id = get_user_estabelecimento_id(auth.uid())
  ));

CREATE TRIGGER transp_setores_numeros_updated_at
  BEFORE UPDATE ON public.transp_setores_numeros
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Migra números existentes de transp_setores.whatsapp
INSERT INTO public.transp_setores_numeros (setor_id, numero, descricao, ativo)
SELECT id, whatsapp, 'Principal', true
FROM public.transp_setores
WHERE whatsapp IS NOT NULL AND whatsapp <> '';