-- Backfill auth_user_id for usuarios with NULL, matching on email
UPDATE public.usuarios u
SET auth_user_id = au.id
FROM auth.users au
WHERE u.auth_user_id IS NULL
  AND lower(u.email) = lower(au.email);

-- Optional: ensure future rows have auth_user_id not null when used in policies
-- (no constraint added to avoid breaking inserts, but frontend should always set it).