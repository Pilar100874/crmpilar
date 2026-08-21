INSERT INTO public.ferr_role_permissions (role, route, can_access)
SELECT r.role, '/loans', true
FROM (SELECT DISTINCT role FROM public.ferr_role_permissions WHERE route = '/loan/return' AND can_access) r
WHERE NOT EXISTS (
  SELECT 1 FROM public.ferr_role_permissions p WHERE p.role = r.role AND p.route = '/loans'
);