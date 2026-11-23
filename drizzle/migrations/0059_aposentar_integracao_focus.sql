ALTER TABLE public.notas_fiscais ALTER COLUMN motor_emissao SET DEFAULT 'proprio';
COMMENT ON TABLE public.nfe_config IS 'DEPRECATED: integração Focus removida; substituída por fiscal_engine_config e emissor no Coletor';
REVOKE EXECUTE ON FUNCTION public.nfe_config_status(), public.nfe_config_salvar(text,text,text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.nfe_config FROM anon, authenticated;