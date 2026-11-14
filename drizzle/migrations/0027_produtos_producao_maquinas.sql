ALTER TABLE public.produtos ADD COLUMN materia_prima boolean NOT NULL DEFAULT false, ADD COLUMN produzido boolean NOT NULL DEFAULT false, ADD COLUMN comercializavel boolean NOT NULL DEFAULT true, ADD COLUMN producao_observacoes text, ADD COLUMN producao_tempo_minutos numeric;
CREATE TABLE public.producao_maquinas (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), estabelecimento_id uuid NOT NULL REFERENCES public.estabelecimentos(id), nome text NOT NULL, codigo text NOT NULL, fabricante text, modelo text, observacoes text, ativo boolean NOT NULL DEFAULT true, created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(estabelecimento_id,codigo));
GRANT SELECT,INSERT,UPDATE,DELETE ON public.producao_maquinas TO authenticated;
GRANT ALL ON public.producao_maquinas TO service_role;
ALTER TABLE public.producao_maquinas ENABLE ROW LEVEL SECURITY;
CREATE POLICY maquinas_empresa ON public.producao_maquinas TO authenticated USING(estabelecimento_id=public.get_auth_user_estabelecimento_id()) WITH CHECK(estabelecimento_id=public.get_auth_user_estabelecimento_id());
CREATE TABLE public.producao_maquina_usuarios (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), maquina_id uuid NOT NULL REFERENCES public.producao_maquinas(id) ON DELETE CASCADE, usuario_id uuid NOT NULL REFERENCES public.usuarios(id), grau_conhecimento text NOT NULL, observacoes text, created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(maquina_id,usuario_id), CONSTRAINT grau_conhecimento_valido CHECK(grau_conhecimento IN ('iniciante','basico','intermediario','avancado','instrutor')));
GRANT SELECT,INSERT,UPDATE,DELETE ON public.producao_maquina_usuarios TO authenticated;
GRANT ALL ON public.producao_maquina_usuarios TO service_role;
ALTER TABLE public.producao_maquina_usuarios ENABLE ROW LEVEL SECURITY;
CREATE POLICY conhecimento_empresa ON public.producao_maquina_usuarios TO authenticated USING(EXISTS(SELECT 1 FROM public.producao_maquinas m WHERE m.id=maquina_id AND m.estabelecimento_id=public.get_auth_user_estabelecimento_id())) WITH CHECK(EXISTS(SELECT 1 FROM public.producao_maquinas m JOIN public.usuarios u ON u.id=usuario_id AND u.estabelecimento_id=m.estabelecimento_id WHERE m.id=maquina_id AND m.estabelecimento_id=public.get_auth_user_estabelecimento_id()));
CREATE TABLE public.produto_maquinas (produto_id uuid NOT NULL REFERENCES public.produtos(id) ON DELETE CASCADE, maquina_id uuid NOT NULL REFERENCES public.producao_maquinas(id) ON DELETE CASCADE, PRIMARY KEY(produto_id,maquina_id));
GRANT SELECT,INSERT,UPDATE,DELETE ON public.produto_maquinas TO authenticated;
GRANT ALL ON public.produto_maquinas TO service_role;
ALTER TABLE public.produto_maquinas ENABLE ROW LEVEL SECURITY;
CREATE POLICY produto_maquinas_empresa ON public.produto_maquinas TO authenticated USING(EXISTS(SELECT 1 FROM public.produtos p WHERE p.id=produto_id AND p.estabelecimento_id=public.get_auth_user_estabelecimento_id())) WITH CHECK(EXISTS(SELECT 1 FROM public.produtos p JOIN public.producao_maquinas m ON m.id=maquina_id AND m.estabelecimento_id=p.estabelecimento_id WHERE p.id=produto_id AND p.produzido AND p.estabelecimento_id=public.get_auth_user_estabelecimento_id()));
CREATE OR REPLACE FUNCTION public.salvar_maquinas_produto(p_produto uuid,p_maquinas uuid[]) RETURNS void LANGUAGE plpgsql SET search_path=public AS $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.produtos WHERE id=p_produto AND estabelecimento_id=public.get_auth_user_estabelecimento_id() AND produzido) THEN RAISE EXCEPTION 'Produto produzido não encontrado nesta empresa'; END IF;
 IF EXISTS(SELECT 1 FROM unnest(p_maquinas) i WHERE NOT EXISTS(SELECT 1 FROM public.producao_maquinas m WHERE m.id=i AND m.estabelecimento_id=public.get_auth_user_estabelecimento_id())) THEN RAISE EXCEPTION 'Máquina não pertence à empresa'; END IF;
 DELETE FROM public.produto_maquinas WHERE produto_id=p_produto AND NOT(maquina_id=ANY(p_maquinas));
 INSERT INTO public.produto_maquinas(produto_id,maquina_id) SELECT p_produto,i FROM unnest(p_maquinas) i ON CONFLICT DO NOTHING;
END $$;
REVOKE ALL ON FUNCTION public.salvar_maquinas_produto(uuid,uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.salvar_maquinas_produto(uuid,uuid[]) TO authenticated;
CREATE OR REPLACE FUNCTION public.validar_produto_comercializavel_orcamento() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.produtos p JOIN public.orcamentos o ON o.id=NEW.orcamento_id AND o.estabelecimento_id=p.estabelecimento_id WHERE p.id=NEW.produto_id AND p.comercializavel AND p.ativo) THEN RAISE EXCEPTION 'Este produto não está disponível para comercialização'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER validar_produto_comercializavel BEFORE INSERT OR UPDATE ON public.orcamento_itens FOR EACH ROW EXECUTE FUNCTION public.validar_produto_comercializavel_orcamento();
CREATE OR REPLACE FUNCTION public.validar_producao_produto() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$ BEGIN
 IF NEW.producao_tempo_minutos IS NOT NULL AND NEW.producao_tempo_minutos<0 THEN RAISE EXCEPTION 'Tempo de produção não pode ser negativo'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER validar_producao BEFORE INSERT OR UPDATE ON public.produtos FOR EACH ROW EXECUTE FUNCTION public.validar_producao_produto();