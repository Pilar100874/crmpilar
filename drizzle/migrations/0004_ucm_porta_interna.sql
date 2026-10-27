ALTER TABLE public.ucm_config ADD COLUMN IF NOT EXISTS sip_porta_interna integer;
COMMENT ON COLUMN public.ucm_config.sip_porta_interna IS 'Porta do UCM acessível na rede interna; usada junto com ucm_host_interno (padrão 8089 quando vazia).';
