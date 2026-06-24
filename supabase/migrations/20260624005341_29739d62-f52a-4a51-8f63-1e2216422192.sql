ALTER TABLE public.ponto_escalas
  ADD COLUMN IF NOT EXISTS codigo text,
  ADD COLUMN IF NOT EXISTS descricao text,
  ADD COLUMN IF NOT EXISTS hora_desconto_dsr text,
  ADD COLUMN IF NOT EXISTS marcacao_excecao boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS ignorar_feriados boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS ignorar_afastamento_ciclico boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS jornada_flexivel boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS aplicar_tolerancia_flexivel boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS intervalo_flexivel boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS controlar_nr17 boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS intervalo_preassinalado jsonb NOT NULL DEFAULT '{"ativo":false,"aplicar_todos":false,"aplicar_diferente_previsto":false,"aplicar_sem_jornada":false,"gerar_intervalo":"","quando_exceder":"","aplicar_periodo":false,"gerar_intervalo_periodo":"","quando_exceder_periodo":""}'::jsonb,
  ADD COLUMN IF NOT EXISTS intrajornada_config jsonb NOT NULL DEFAULT '{"tempo_faltante":"nao_utilizar","lancar_he":false,"considerar_limite":"nenhum","limite_contratado":"","dias_considerar":[]}'::jsonb,
  ADD COLUMN IF NOT EXISTS jornada_feriados jsonb NOT NULL DEFAULT '{"classificacao":"descanso","entrada1":"","saida1":"","entrada2":"","saida2":""}'::jsonb;