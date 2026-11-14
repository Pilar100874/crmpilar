CREATE OR REPLACE FUNCTION public.validar_regras_materia_prima_maquina()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
DECLARE f jsonb; grupo jsonb; opcao_material jsonb; etapa jsonb; maquina jsonb; regra jsonb; material jsonb;
BEGIN
 f := NEW.ficha_producao;
 IF f IS NULL THEN RETURN NEW; END IF;
 FOR grupo IN SELECT value FROM jsonb_array_elements(f->'materiais') LOOP
  FOR opcao_material IN SELECT value FROM jsonb_array_elements(grupo->'opcoes') LOOP
   IF opcao_material->>'meta_producao' IS NOT NULL AND (jsonb_typeof(opcao_material->'meta_producao') <> 'number' OR (opcao_material->>'meta_producao')::numeric <= 0) THEN RAISE EXCEPTION 'A meta de produção deve ser maior que zero'; END IF;
  END LOOP;
 END LOOP;
 FOR etapa IN SELECT value FROM jsonb_array_elements(f->'etapas') LOOP
  material := NULL;
  IF COALESCE(etapa->>'material_regra_id','') <> '' THEN
   SELECT value INTO material FROM jsonb_array_elements(f->'materiais') WHERE value->>'id'=etapa->>'material_regra_id';
   IF material IS NULL THEN RAISE EXCEPTION 'Selecione um material existente para as regras da etapa'; END IF;
  END IF;
  FOR maquina IN SELECT value FROM jsonb_array_elements(etapa->'opcoes') LOOP
   IF maquina->>'setup_minutos' IS NOT NULL AND (jsonb_typeof(maquina->'setup_minutos') <> 'number' OR (maquina->>'setup_minutos')::numeric < 0) THEN RAISE EXCEPTION 'Setup deve ser não negativo'; END IF;
   IF maquina->>'setup_troca_material_minutos' IS NOT NULL AND (jsonb_typeof(maquina->'setup_troca_material_minutos') <> 'number' OR (maquina->>'setup_troca_material_minutos')::numeric < 0) THEN RAISE EXCEPTION 'Setup de reposição deve ser não negativo'; END IF;
   IF maquina ? 'regras_materiais' AND jsonb_typeof(maquina->'regras_materiais') <> 'array' THEN RAISE EXCEPTION 'Regras de matéria-prima inválidas'; END IF;
   IF EXISTS (SELECT 1 FROM jsonb_array_elements(COALESCE(maquina->'regras_materiais','[]'::jsonb)) r GROUP BY r->>'material_opcao_id' HAVING count(*)>1) THEN RAISE EXCEPTION 'Não repita regras para a mesma matéria-prima na máquina'; END IF;
   FOR regra IN SELECT value FROM jsonb_array_elements(COALESCE(maquina->'regras_materiais','[]'::jsonb)) LOOP
    IF material IS NULL OR NOT EXISTS(SELECT 1 FROM jsonb_array_elements(material->'opcoes') m WHERE m->>'id'=regra->>'material_opcao_id') THEN RAISE EXCEPTION 'A regra deve usar uma opção do material da etapa'; END IF;
    IF jsonb_typeof(regra->'permitida') IS DISTINCT FROM 'boolean' OR jsonb_typeof(regra->'simultaneos') IS DISTINCT FROM 'number' THEN RAISE EXCEPTION 'Informe aceitação e quantidade produzida por vez'; END IF;
    IF (regra->>'simultaneos')::numeric <= 0 OR (regra->>'simultaneos')::numeric <> trunc((regra->>'simultaneos')::numeric) THEN RAISE EXCEPTION 'Quantidade produzida por vez deve ser um inteiro maior que zero'; END IF;
   END LOOP;
  END LOOP;
 END LOOP;
 RETURN NEW;
END $$;
COMMENT ON FUNCTION public.validar_regras_materia_prima_maquina() IS 'Validates per-material production goals and machine compatibility, simultaneous output, initial setup and material-replenishment setup. Legacy width metadata remains supported by its existing validator until each recipe is saved in the new format.';