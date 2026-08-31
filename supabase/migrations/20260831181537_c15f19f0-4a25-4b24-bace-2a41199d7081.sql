ALTER TABLE public.grupos_acesso
  ADD COLUMN IF NOT EXISTS perfil text NOT NULL DEFAULT 'padrao';

ALTER TABLE public.grupos_acesso
  DROP CONSTRAINT IF EXISTS grupos_acesso_perfil_check;
ALTER TABLE public.grupos_acesso
  ADD CONSTRAINT grupos_acesso_perfil_check
  CHECK (perfil IN ('padrao','admin','atendente','porteiro','gerente'));

UPDATE public.grupos_acesso SET perfil = 'admin'
  WHERE perfil = 'padrao' AND lower(nome) IN ('admin','administrador','administradora');
UPDATE public.grupos_acesso SET perfil = 'atendente'
  WHERE perfil = 'padrao' AND lower(nome) = 'atendente';
UPDATE public.grupos_acesso SET perfil = 'porteiro'
  WHERE perfil = 'padrao' AND lower(nome) = 'porteiro';
UPDATE public.grupos_acesso SET perfil = 'gerente'
  WHERE perfil = 'padrao' AND lower(nome) = 'gerente';

INSERT INTO public.grupos_acesso (nome, perfil, estabelecimento_id, menus_permitidos)
SELECT v.nome, v.perfil, e.id, '{}'::jsonb
FROM public.estabelecimentos e
CROSS JOIN (VALUES ('Porteiro','porteiro'), ('Gerente','gerente')) AS v(nome, perfil)
WHERE NOT EXISTS (
  SELECT 1 FROM public.grupos_acesso g
  WHERE g.estabelecimento_id = e.id AND g.perfil = v.perfil
);