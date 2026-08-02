
REVOKE SELECT ON public.aip_credenciais FROM authenticated, anon, PUBLIC;
REVOKE SELECT ON public.aip_credencial_versoes FROM authenticated, anon, PUBLIC;

GRANT SELECT (id, estabelecimento_id, provedor, nome, descricao, ambiente, dados, mascara,
              versao, rotacionado_em, rotacionado_por, rotacao_dias, expira_em, ultimo_uso,
              ativo, created_by, created_at, updated_at)
  ON public.aip_credenciais TO authenticated;

GRANT SELECT (id, credencial_id, estabelecimento_id, versao, mascara, motivo, criado_por, created_at)
  ON public.aip_credencial_versoes TO authenticated;
