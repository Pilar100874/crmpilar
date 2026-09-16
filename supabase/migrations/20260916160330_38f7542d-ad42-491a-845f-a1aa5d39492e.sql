ALTER TABLE public.unidades
  ADD COLUMN IF NOT EXISTS sip_servidor TEXT,
  ADD COLUMN IF NOT EXISTS sip_porta INTEGER DEFAULT 8089,
  ADD COLUMN IF NOT EXISTS sip_servidor_alternativo TEXT,
  ADD COLUMN IF NOT EXISTS sip_porta_alternativa INTEGER DEFAULT 8089,
  ADD COLUMN IF NOT EXISTS ramal_portaria TEXT;

-- Copia os dados já cadastrados nos usuários para a unidade vinculada
UPDATE public.unidades u
SET sip_servidor = COALESCE(u.sip_servidor, d.sip_servidor),
    sip_porta = COALESCE(u.sip_porta, d.sip_porta, 8089),
    sip_servidor_alternativo = COALESCE(u.sip_servidor_alternativo, d.sip_servidor_alternativo),
    sip_porta_alternativa = COALESCE(u.sip_porta_alternativa, d.sip_porta_alternativa, 8089),
    ramal_portaria = COALESCE(u.ramal_portaria, d.ramal_portaria)
FROM (
  SELECT DISTINCT ON (unidade_id) unidade_id, sip_servidor, sip_porta, sip_servidor_alternativo, sip_porta_alternativa, ramal_portaria
  FROM public.usuarios
  WHERE unidade_id IS NOT NULL AND (sip_servidor IS NOT NULL OR ramal_portaria IS NOT NULL)
  ORDER BY unidade_id, updated_at DESC NULLS LAST
) d
WHERE u.id = d.unidade_id;