
ALTER TABLE public.empresa_vinculos 
  ADD COLUMN IF NOT EXISTS auto_via_vendedor_id uuid REFERENCES public.empresas(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_empresa_vinculos_auto_via_vendedor 
  ON public.empresa_vinculos(auto_via_vendedor_id) WHERE auto_via_vendedor_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.sync_auto_vinculo_from_vendedor()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.auto_via_vendedor_id IS NOT NULL THEN
      RETURN NEW;
    END IF;

    IF NEW.usuario_id IS NULL AND NEW.vendedor_id IS NOT NULL 
       AND NEW.empresa_id IS NOT NULL AND NEW.empresa_id <> NEW.vendedor_id THEN
      INSERT INTO public.empresa_vinculos (empresa_id, usuario_id, vendedor_id, segmento_id, estabelecimento_id, auto_via_vendedor_id)
      SELECT NEW.empresa_id, ev.usuario_id, NULL::uuid, NULL::uuid, NEW.estabelecimento_id, NEW.vendedor_id
      FROM public.empresa_vinculos ev
      WHERE ev.vendedor_id = NEW.vendedor_id
        AND ev.usuario_id IS NOT NULL
        AND ev.empresa_id = NEW.vendedor_id
        AND NOT EXISTS (
          SELECT 1 FROM public.empresa_vinculos x
          WHERE x.empresa_id = NEW.empresa_id
            AND x.usuario_id = ev.usuario_id
            AND x.auto_via_vendedor_id = NEW.vendedor_id
        );
    END IF;

    IF NEW.usuario_id IS NOT NULL AND NEW.vendedor_id IS NOT NULL 
       AND NEW.empresa_id = NEW.vendedor_id THEN
      INSERT INTO public.empresa_vinculos (empresa_id, usuario_id, vendedor_id, segmento_id, estabelecimento_id, auto_via_vendedor_id)
      SELECT ev.empresa_id, NEW.usuario_id, NULL::uuid, NULL::uuid, NEW.estabelecimento_id, NEW.vendedor_id
      FROM public.empresa_vinculos ev
      WHERE ev.vendedor_id = NEW.vendedor_id
        AND ev.usuario_id IS NULL
        AND ev.empresa_id <> NEW.vendedor_id
        AND NOT EXISTS (
          SELECT 1 FROM public.empresa_vinculos x
          WHERE x.empresa_id = ev.empresa_id
            AND x.usuario_id = NEW.usuario_id
            AND x.auto_via_vendedor_id = NEW.vendedor_id
        );
    END IF;

    RETURN NEW;

  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.auto_via_vendedor_id IS NOT NULL THEN
      RETURN OLD;
    END IF;

    IF OLD.usuario_id IS NULL AND OLD.vendedor_id IS NOT NULL 
       AND OLD.empresa_id IS NOT NULL AND OLD.empresa_id <> OLD.vendedor_id THEN
      DELETE FROM public.empresa_vinculos
      WHERE auto_via_vendedor_id = OLD.vendedor_id 
        AND empresa_id = OLD.empresa_id;
    END IF;

    IF OLD.usuario_id IS NOT NULL AND OLD.vendedor_id IS NOT NULL 
       AND OLD.empresa_id = OLD.vendedor_id THEN
      DELETE FROM public.empresa_vinculos
      WHERE auto_via_vendedor_id = OLD.vendedor_id 
        AND usuario_id = OLD.usuario_id;
    END IF;

    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_auto_vinculo_from_vendedor_ins ON public.empresa_vinculos;
CREATE TRIGGER trg_sync_auto_vinculo_from_vendedor_ins
AFTER INSERT ON public.empresa_vinculos
FOR EACH ROW EXECUTE FUNCTION public.sync_auto_vinculo_from_vendedor();

DROP TRIGGER IF EXISTS trg_sync_auto_vinculo_from_vendedor_del ON public.empresa_vinculos;
CREATE TRIGGER trg_sync_auto_vinculo_from_vendedor_del
AFTER DELETE ON public.empresa_vinculos
FOR EACH ROW EXECUTE FUNCTION public.sync_auto_vinculo_from_vendedor();

INSERT INTO public.empresa_vinculos (empresa_id, usuario_id, vendedor_id, segmento_id, estabelecimento_id, auto_via_vendedor_id)
SELECT DISTINCT ve.empresa_id, vu.usuario_id, NULL::uuid, NULL::uuid, ve.estabelecimento_id, ve.vendedor_id
FROM public.empresa_vinculos ve
JOIN public.empresa_vinculos vu 
  ON vu.vendedor_id = ve.vendedor_id
 AND vu.usuario_id IS NOT NULL
 AND vu.empresa_id = ve.vendedor_id
WHERE ve.usuario_id IS NULL 
  AND ve.vendedor_id IS NOT NULL
  AND ve.empresa_id IS NOT NULL 
  AND ve.empresa_id <> ve.vendedor_id
  AND ve.auto_via_vendedor_id IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.empresa_vinculos x
    WHERE x.empresa_id = ve.empresa_id
      AND x.usuario_id = vu.usuario_id
      AND x.auto_via_vendedor_id = ve.vendedor_id
  );
