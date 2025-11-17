-- Adicionar coluna para número da sala de conferência
ALTER TABLE public.ucm_config 
ADD COLUMN IF NOT EXISTS conference_room_number VARCHAR(50);

COMMENT ON COLUMN public.ucm_config.conference_room_number IS 'Número da sala de conferência no UCM para chamadas multiponto';
