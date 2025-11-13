-- Popular profiles com dados existentes do auth.users
-- Para cada usuário em auth.users, criar um profile

-- Primeiro, inserir profiles para usuários que já existem
INSERT INTO public.profiles (id, email, nome, estabelecimento_id, is_admin)
SELECT 
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data->>'nome', split_part(au.email, '@', 1)) as nome,
  NULL as estabelecimento_id,
  CASE 
    WHEN au.email ILIKE 'admin_%@sistema.local' THEN true
    ELSE false
  END as is_admin
FROM auth.users au
WHERE NOT EXISTS (
  SELECT 1 FROM public.profiles p WHERE p.id = au.id
)
ON CONFLICT (id) DO NOTHING;

-- Atualizar estabelecimento_id para usuários que existem na tabela usuarios antiga
-- baseado no email
UPDATE public.profiles p
SET estabelecimento_id = u.estabelecimento_id
FROM public.usuarios u
WHERE p.email = u.email
  AND p.estabelecimento_id IS NULL
  AND u.estabelecimento_id IS NOT NULL;