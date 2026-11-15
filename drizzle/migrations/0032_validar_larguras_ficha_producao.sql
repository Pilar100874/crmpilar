CREATE OR REPLACE FUNCTION public.validar_larguras_ficha_producao() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE f jsonb; grupo jsonb; etapa jsonb; opcao jsonb; material jsonb; campo text;
BEGIN
 f := NEW.ficha_producao;
 IF f IS NULL THEN RETURN NEW; END IF;
 IF f->>'largura_produto_cm' IS NOT NULL AND (jsonb_typeof(f->'largura_produto_cm') <> 'number' OR (f->>'largura_produto_cm')::numeric <= 0) THEN RAISE EXCEPTION 'Largura do produto deve ser positiva'; END IF;
 FOR grupo IN SELECT value FROM jsonb_array_elements(f->'materiais') LOOP
  FOR opcao IN SELECT value FROM jsonb_array_elements(grupo->'opcoes') LOOP
   IF opcao->>'largura_cm' IS NOT NULL AND (jsonb_typeof(opcao->'largura_cm') <> 'number' OR (opcao->>'largura_cm')::numeric <= 0) THEN RAISE EXCEPTION 'Largura da matéria-prima deve ser positiva'; END IF;
  END LOOP;
 END LOOP;
 FOR etapa IN SELECT value FROM jsonb_array_elements(f->'etapas') LOOP
  IF COALESCE(etapa->>'material_largura_id','') <> '' THEN
   SELECT value INTO material FROM jsonb_array_elements(f->'materiais') WHERE value->>'id' = etapa->>'material_largura_id';
   IF material IS NULL OR f->>'largura_produto_cm' IS NULL THEN RAISE EXCEPTION 'Selecione material e largura do produto para a etapa'; END IF;
   IF EXISTS(SELECT 1 FROM jsonb_array_elements(material->'opcoes') m WHERE m->>'largura_cm' IS NULL) THEN RAISE EXCEPTION 'Todas as alternativas do material devem ter largura'; END IF;
  END IF;
  FOR opcao IN SELECT value FROM jsonb_array_elements(etapa->'opcoes') LOOP
   FOREACH campo IN ARRAY ARRAY['largura_min_cm','largura_max_cm'] LOOP
    IF opcao->>campo IS NOT NULL THEN
     IF jsonb_typeof(opcao->campo) <> 'number' OR (opcao->>campo)::numeric <= 0 THEN RAISE EXCEPTION 'Limites de largura devem ser positivos'; END IF;
     IF COALESCE(etapa->>'material_largura_id','') = '' THEN RAISE EXCEPTION 'Selecione o material para a regra de largura'; END IF;
    END IF;
   END LOOP;
   IF (opcao->>'largura_min_cm')::numeric > (opcao->>'largura_max_cm')::numeric THEN RAISE EXCEPTION 'Largura mínima não pode superar a máxima'; END IF;
  END LOOP;
 END LOOP;
 RETURN NEW;
END $$;
CREATE TRIGGER validar_larguras_ficha_producao BEFORE INSERT OR UPDATE OF ficha_producao ON public.produtos FOR EACH ROW EXECUTE FUNCTION public.validar_larguras_ficha_producao();