ALTER TABLE public.ucm_config
  ADD COLUMN IF NOT EXISTS sip_porta integer NOT NULL DEFAULT 8089,
  ADD COLUMN IF NOT EXISTS sip_porta_alternativa integer NOT NULL DEFAULT 8089,
  ADD COLUMN IF NOT EXISTS ramal_portaria text;

UPDATE public.ucm_config c
SET sip_porta = COALESCE(u.sip_porta, c.sip_porta),
    sip_porta_alternativa = COALESCE(u.sip_porta_alternativa, c.sip_porta_alternativa),
    ramal_portaria = COALESCE(c.ramal_portaria, u.ramal_portaria),
    ucm_host = COALESCE(NULLIF(c.ucm_host, ''), u.sip_servidor),
    remote_ip = COALESCE(NULLIF(c.remote_ip, ''), u.sip_servidor_alternativo)
FROM (
  SELECT DISTINCT ON (estabelecimento_id) estabelecimento_id, sip_porta, sip_porta_alternativa, ramal_portaria, sip_servidor, sip_servidor_alternativo
  FROM public.unidades
  WHERE sip_servidor IS NOT NULL OR ramal_portaria IS NOT NULL
  ORDER BY estabelecimento_id, created_at
) u
WHERE u.estabelecimento_id = c.estabelecimento_id;