CREATE TABLE public.fiscal_operacoes (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), estabelecimento_id uuid NOT NULL, chave text NOT NULL, acao text NOT NULL, nota_id uuid, situacao text NOT NULL DEFAULT 'processando', resposta jsonb, erro text, usuario_id uuid, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(estabelecimento_id,chave));
GRANT SELECT ON public.fiscal_operacoes TO authenticated;
GRANT ALL ON public.fiscal_operacoes TO service_role;
ALTER TABLE public.fiscal_operacoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Internos leem operações fiscais" ON public.fiscal_operacoes FOR SELECT TO authenticated USING(public.is_usuario_interno(auth.uid()) AND estabelecimento_id=public.get_auth_user_estabelecimento_id());
CREATE TABLE public.fiscal_titulos (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), estabelecimento_id uuid NOT NULL, nota_id uuid NOT NULL REFERENCES public.notas_fiscais(id), empresa_id uuid, tipo text NOT NULL CHECK(tipo IN ('pagar','receber')), parcela text NOT NULL, vencimento date NOT NULL, valor numeric NOT NULL CHECK(valor>0), situacao text NOT NULL DEFAULT 'pendente_aprovacao' CHECK(situacao IN ('pendente_aprovacao','aprovado','cancelado')), usuario_id uuid, created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(nota_id,parcela,tipo));
GRANT SELECT ON public.fiscal_titulos TO authenticated;
GRANT ALL ON public.fiscal_titulos TO service_role;
ALTER TABLE public.fiscal_titulos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Internos leem títulos fiscais" ON public.fiscal_titulos FOR SELECT TO authenticated USING(public.is_usuario_interno(auth.uid()) AND estabelecimento_id=public.get_auth_user_estabelecimento_id());
ALTER TABLE public.estoque_movimentos ADD COLUMN IF NOT EXISTS chave_fiscal text;
CREATE UNIQUE INDEX IF NOT EXISTS estoque_movimentos_chave_fiscal ON public.estoque_movimentos(estabelecimento_id,chave_fiscal) WHERE chave_fiscal IS NOT NULL;
REVOKE INSERT, UPDATE, DELETE ON public.fiscal_consultas_systax FROM authenticated;
CREATE OR REPLACE FUNCTION public.fiscal_integrar_titulos(p_nota uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE n notas_fiscais%ROWTYPE; p jsonb; total numeric:=0; BEGIN
 SELECT * INTO n FROM notas_fiscais WHERE id=p_nota FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Nota não encontrada'; END IF;
 IF auth.role() IS DISTINCT FROM 'service_role' AND (n.estabelecimento_id IS DISTINCT FROM public.get_auth_user_estabelecimento_id() OR NOT public.is_usuario_interno(auth.uid())) THEN RAISE EXCEPTION 'Sem permissão'; END IF;
 IF n.tipo='saida' AND (n.status<>'emitida' OR n.ambiente IS DISTINCT FROM 'producao') THEN RAISE EXCEPTION 'NF-e não autorizada em produção'; END IF;
 IF n.tipo='entrada' AND n.status<>'lancada' THEN RAISE EXCEPTION 'Entrada ainda não lançada'; END IF;
 IF EXISTS(SELECT 1 FROM fiscal_tipos_operacao WHERE id=n.tipo_operacao_id AND NOT gera_financeiro) THEN RETURN; END IF;
 IF jsonb_array_length(coalesce(n.dados_emissao->'duplicatas','[]'::jsonb))=0 THEN RETURN; END IF;
 SELECT coalesce(sum((value->>'valor')::numeric),0) INTO total FROM jsonb_array_elements(n.dados_emissao->'duplicatas');
 IF abs(total-n.valor_total)>0.01 THEN RAISE EXCEPTION 'Duplicatas não correspondem ao total da nota'; END IF;
 FOR p IN SELECT value FROM jsonb_array_elements(n.dados_emissao->'duplicatas') LOOP
  IF (p->>'valor')::numeric>0 THEN INSERT INTO fiscal_titulos(estabelecimento_id,nota_id,empresa_id,tipo,parcela,vencimento,valor,usuario_id) VALUES(n.estabelecimento_id,n.id,n.empresa_id,CASE WHEN n.tipo='entrada' THEN 'pagar' ELSE 'receber' END,p->>'numero',(p->>'vencimento')::date,(p->>'valor')::numeric,public.get_current_usuario_id_safe()) ON CONFLICT(nota_id,parcela,tipo) DO NOTHING; END IF;
 END LOOP;
END $$;
REVOKE ALL ON FUNCTION public.fiscal_integrar_titulos(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.fiscal_integrar_titulos(uuid) TO authenticated,service_role;
CREATE OR REPLACE FUNCTION public.fiscal_efeitos_autorizacao() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN
 IF NEW.motor_emissao='proprio' AND NEW.tipo='saida' AND (NEW.status IN ('emitida','cancelada') AND (TG_OP='INSERT' OR OLD.status IS DISTINCT FROM NEW.status)) THEN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN RAISE EXCEPTION 'A situação fiscal depende do retorno autenticado do motor'; END IF;
  IF NEW.status='emitida' AND (NEW.chave IS NULL OR NEW.protocolo IS NULL) THEN RAISE EXCEPTION 'Autorização sem chave ou protocolo'; END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER fiscal_validar_retorno BEFORE INSERT OR UPDATE OF status ON public.notas_fiscais FOR EACH ROW EXECUTE FUNCTION public.fiscal_efeitos_autorizacao();
CREATE OR REPLACE FUNCTION public.fiscal_movimentar_autorizacao() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN
 IF NEW.motor_emissao<>'proprio' OR NEW.tipo<>'saida' OR NEW.ambiente IS DISTINCT FROM 'producao' THEN RETURN NEW; END IF;
 IF NEW.status='emitida' AND OLD.status IS DISTINCT FROM 'emitida' THEN
  IF NOT EXISTS(SELECT 1 FROM fiscal_tipos_operacao WHERE id=NEW.tipo_operacao_id AND NOT movimenta_estoque) AND NOT EXISTS(SELECT 1 FROM estoque_movimentos WHERE nota_fiscal_id=NEW.id AND tipo='saida') THEN
   INSERT INTO estoque_movimentos(estabelecimento_id,produto_id,unidade_id,tipo,origem,quantidade,nota_fiscal_id,documento,usuario_id,chave_fiscal) SELECT NEW.estabelecimento_id,produto_id,NEW.unidade_id,'saida','venda',quantidade,NEW.id,'NF-e '||NEW.numero,NEW.usuario_id,'autorizacao:'||NEW.id||':'||id FROM notas_fiscais_itens WHERE nota_id=NEW.id AND produto_id IS NOT NULL ORDER BY produto_id ON CONFLICT(estabelecimento_id,chave_fiscal) WHERE chave_fiscal IS NOT NULL DO NOTHING;
  END IF;
  PERFORM public.fiscal_integrar_titulos(NEW.id);
 ELSIF NEW.status='cancelada' AND OLD.status='emitida' THEN
  INSERT INTO estoque_movimentos(estabelecimento_id,produto_id,unidade_id,tipo,origem,quantidade,nota_fiscal_id,documento,usuario_id,chave_fiscal) SELECT NEW.estabelecimento_id,produto_id,unidade_id,'entrada','devolucao',quantidade,NEW.id,'Estorno NF-e '||NEW.numero,NEW.usuario_id,'estorno:'||id FROM estoque_movimentos WHERE nota_fiscal_id=NEW.id AND tipo='saida' ORDER BY produto_id ON CONFLICT(estabelecimento_id,chave_fiscal) WHERE chave_fiscal IS NOT NULL DO NOTHING;
  UPDATE fiscal_titulos SET situacao='cancelado' WHERE nota_id=NEW.id;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER fiscal_aplicar_retorno AFTER UPDATE OF status ON public.notas_fiscais FOR EACH ROW EXECUTE FUNCTION public.fiscal_movimentar_autorizacao();
CREATE OR REPLACE FUNCTION public.fiscal_aprovar_titulo(p_titulo uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN IF NOT public.is_usuario_interno(auth.uid()) THEN RAISE EXCEPTION 'Sem permissão'; END IF; UPDATE fiscal_titulos SET situacao='aprovado' WHERE id=p_titulo AND estabelecimento_id=public.get_auth_user_estabelecimento_id() AND situacao='pendente_aprovacao'; IF NOT FOUND THEN RAISE EXCEPTION 'Título não disponível'; END IF; END $$;
REVOKE ALL ON FUNCTION public.fiscal_aprovar_titulo(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.fiscal_aprovar_titulo(uuid) TO authenticated;