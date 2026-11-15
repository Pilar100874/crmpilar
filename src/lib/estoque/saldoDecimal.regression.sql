-- Run against the managed database. Everything is rolled back, including the test product.
BEGIN;
DO $$
DECLARE e uuid; p uuid; s numeric;
BEGIN
  SELECT id INTO e FROM public.estabelecimentos LIMIT 1;
  INSERT INTO public.produtos(nome, estabelecimento_id, unidade, estoque_saldo, ativo)
  VALUES ('QA saldo decimal transacional', e, 'KG', 0, false) RETURNING id INTO p;
  INSERT INTO public.estoque_movimentos(estabelecimento_id, produto_id, tipo, quantidade)
  VALUES (e,p,'entrada',12.4);
  SELECT estoque_saldo INTO s FROM public.produtos WHERE id=p;
  IF s <> 12.4 THEN RAISE EXCEPTION 'Expected 12.4, got %',s; END IF;
  INSERT INTO public.estoque_movimentos(estabelecimento_id, produto_id, tipo, quantidade)
  VALUES (e,p,'saida',12.4), (e,p,'entrada',0.4), (e,p,'entrada',0.4), (e,p,'entrada',0.4);
  SELECT estoque_saldo INTO s FROM public.produtos WHERE id=p;
  IF s <> 1.2 THEN RAISE EXCEPTION 'Expected 3 x 0.4 = 1.2, got %',s; END IF;
  INSERT INTO public.estoque_movimentos(estabelecimento_id, produto_id, tipo, quantidade)
  VALUES (e,p,'saida',0.25);
  SELECT estoque_saldo INTO s FROM public.produtos WHERE id=p;
  IF s <> 0.95 THEN RAISE EXCEPTION 'Expected 0.95 after exit, got %',s; END IF;
  INSERT INTO public.estoque_movimentos(estabelecimento_id, produto_id, tipo, quantidade, origem)
  VALUES (e,p,'entrada',0.25,'devolucao');
  UPDATE public.produtos SET descricao='edit without stock' WHERE id=p;
  SELECT estoque_saldo INTO s FROM public.produtos WHERE id=p;
  IF s <> 1.2 THEN RAISE EXCEPTION 'Expected 1.2 after return/edit, got %',s; END IF;
END $$;
ROLLBACK;