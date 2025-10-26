-- Adicionar campos de jornada de trabalho na tabela usuarios
ALTER TABLE public.usuarios 
ADD COLUMN hora_inicial TIME NOT NULL DEFAULT '08:00:00',
ADD COLUMN hora_final TIME NOT NULL DEFAULT '18:00:00';