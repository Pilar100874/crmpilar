-- Adicionar colunas para ícone e cor personalizados nas paradas marcadas
ALTER TABLE public.logistica_paradas_marcadas 
ADD COLUMN IF NOT EXISTS icone_parada TEXT DEFAULT 'MapPin',
ADD COLUMN IF NOT EXISTS cor_icone_parada TEXT DEFAULT '#EAB308',
ADD COLUMN IF NOT EXISTS legenda_parada TEXT;

-- Comentários
COMMENT ON COLUMN public.logistica_paradas_marcadas.icone_parada IS 'Nome do ícone Lucide para exibir no mapa';
COMMENT ON COLUMN public.logistica_paradas_marcadas.cor_icone_parada IS 'Cor hexadecimal do ícone no mapa';
COMMENT ON COLUMN public.logistica_paradas_marcadas.legenda_parada IS 'Legenda/texto personalizado do marcador';