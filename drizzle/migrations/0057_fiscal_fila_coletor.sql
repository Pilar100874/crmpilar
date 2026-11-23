ALTER TABLE public.fiscal_operacoes ADD COLUMN IF NOT EXISTS parametros jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.fiscal_operacoes ADD COLUMN IF NOT EXISTS tentativas integer NOT NULL DEFAULT 0;
ALTER TABLE public.fiscal_operacoes ADD COLUMN IF NOT EXISTS coletado_em timestamptz;
CREATE INDEX IF NOT EXISTS fiscal_operacoes_fila ON public.fiscal_operacoes(estabelecimento_id,situacao,created_at);
CREATE OR REPLACE FUNCTION public.fiscal_coletor_ativar(p_ambiente text,p_ativo boolean) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE e uuid:=public.get_auth_user_estabelecimento_id(); BEGIN
 IF e IS NULL OR NOT public.is_usuario_interno(auth.uid()) THEN RAISE EXCEPTION 'Sem permissão'; END IF;
 IF p_ambiente NOT IN ('homologacao','producao') THEN RAISE EXCEPTION 'Ambiente inválido'; END IF;
 INSERT INTO fiscal_engine_config(estabelecimento_id,url_api,ambiente,habilitado,mensagem) VALUES(e,'coletor://local',p_ambiente,p_ativo,CASE WHEN p_ativo THEN 'Emissão pelo Coletor ativada' ELSE 'Emissão desativada' END)
 ON CONFLICT(estabelecimento_id) DO UPDATE SET url_api='coletor://local',ambiente=EXCLUDED.ambiente,habilitado=EXCLUDED.habilitado,mensagem=EXCLUDED.mensagem,updated_at=now();
END $$;
REVOKE ALL ON FUNCTION public.fiscal_coletor_ativar(text,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.fiscal_coletor_ativar(text,boolean) TO authenticated;