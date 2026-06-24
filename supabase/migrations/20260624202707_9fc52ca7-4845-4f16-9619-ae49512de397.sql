ALTER TABLE public.ponto_acordos_coletivos
ADD COLUMN IF NOT EXISTS he_faixas_customizadas jsonb NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.ponto_acordos_coletivos.he_faixas_customizadas IS
'Faixas adicionais de hora extra com percentuais customizados (ex.: 60%, 70%, 75%). Estrutura: [{"nome":"HE 60% Sábado","percentual":60,"multiplicador":1.6,"condicao":"sabado","aplicar_apos_min":0,"limite_diario_min":120,"rubrica_dominio":"H60"}]';