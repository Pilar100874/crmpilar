ALTER TABLE public.produtos ADD COLUMN ficha_producao jsonb;
CREATE OR REPLACE FUNCTION public.validar_ficha_producao() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE grupo jsonb; opcao jsonb; etapa jsonb;
BEGIN
 IF NEW.ficha_producao IS NULL THEN RETURN NEW; END IF;
 IF jsonb_typeof(NEW.ficha_producao)<>'object' OR COALESCE((NEW.ficha_producao->>'quantidade_base')::numeric,0)<=0 OR COALESCE(NEW.ficha_producao->>'unidade_produto','')='' THEN RAISE EXCEPTION 'Informe quantidade-base positiva e unidade do produto'; END IF;
 IF jsonb_typeof(NEW.ficha_producao->'materiais') IS DISTINCT FROM 'array' OR jsonb_typeof(NEW.ficha_producao->'etapas') IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'Ficha de produção inválida'; END IF;
 FOR grupo IN SELECT value FROM jsonb_array_elements(NEW.ficha_producao->'materiais') LOOP
  IF jsonb_typeof(grupo->'opcoes') IS DISTINCT FROM 'array' OR jsonb_array_length(grupo->'opcoes')=0 THEN RAISE EXCEPTION 'Cada material precisa de uma opção'; END IF;
  FOR opcao IN SELECT value FROM jsonb_array_elements(grupo->'opcoes') LOOP
   IF COALESCE((opcao->>'quantidade')::numeric,0)<=0 OR COALESCE(opcao->>'unidade','')='' THEN RAISE EXCEPTION 'Consumo de matéria-prima deve ser positivo e ter unidade'; END IF;
   IF NOT EXISTS(SELECT 1 FROM public.produtos p WHERE p.id=(opcao->>'produto_id')::uuid AND p.estabelecimento_id=NEW.estabelecimento_id AND p.materia_prima AND p.id<>NEW.id) THEN RAISE EXCEPTION 'Matéria-prima inválida ou de outra empresa'; END IF;
  END LOOP;
 END LOOP;
 FOR etapa IN SELECT value FROM jsonb_array_elements(NEW.ficha_producao->'etapas') LOOP
  IF COALESCE(etapa->>'nome','')='' OR jsonb_typeof(etapa->'opcoes') IS DISTINCT FROM 'array' OR jsonb_array_length(etapa->'opcoes')=0 THEN RAISE EXCEPTION 'Cada etapa precisa de nome e máquina'; END IF;
  FOR opcao IN SELECT value FROM jsonb_array_elements(etapa->'opcoes') LOOP
   IF COALESCE((opcao->>'capacidade_minuto')::numeric,0)<=0 THEN RAISE EXCEPTION 'Capacidade da máquina deve ser positiva'; END IF;
   IF NOT EXISTS(SELECT 1 FROM public.producao_maquinas m WHERE m.id=(opcao->>'maquina_id')::uuid AND m.estabelecimento_id=NEW.estabelecimento_id) THEN RAISE EXCEPTION 'Máquina inválida ou de outra empresa'; END IF;
  END LOOP;
 END LOOP;
 RETURN NEW;
END $$;
CREATE TRIGGER validar_ficha_producao BEFORE INSERT OR UPDATE OF ficha_producao,estabelecimento_id ON public.produtos FOR EACH ROW EXECUTE FUNCTION public.validar_ficha_producao();