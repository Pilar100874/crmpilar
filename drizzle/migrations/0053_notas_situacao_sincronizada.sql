CREATE OR REPLACE FUNCTION public.notas_fiscais_sync_situacao()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.situacao := CASE
    WHEN NEW.status = 'cancelada' OR NEW.status_sefaz ILIKE 'cancelad%' THEN 'cancelada'
    WHEN NEW.status = 'emitida' OR NEW.status_sefaz ILIKE 'autorizad%' THEN 'autorizada'
    WHEN NEW.status_sefaz ILIKE 'erro_autoriza%' OR NEW.status_sefaz ILIKE 'rejeit%' OR NEW.status_sefaz ILIKE 'denegad%' THEN 'rejeitada'
    WHEN NEW.status_sefaz ILIKE 'processando%' THEN 'processando'
    WHEN NEW.status_sefaz ILIKE 'erro%' THEN 'erro_comunicacao'
    WHEN NEW.status = 'pronta' THEN 'validada'
    ELSE COALESCE(NULLIF(NEW.situacao, ''), 'rascunho') END;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_notas_sync_situacao ON public.notas_fiscais;
CREATE TRIGGER trg_notas_sync_situacao BEFORE INSERT OR UPDATE OF status, status_sefaz ON public.notas_fiscais
FOR EACH ROW EXECUTE FUNCTION public.notas_fiscais_sync_situacao();