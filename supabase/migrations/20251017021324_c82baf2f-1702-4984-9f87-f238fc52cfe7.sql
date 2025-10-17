-- Update grupos_acesso table to support granular permissions
-- The menus_permitidos column will now store objects with permissions
-- Structure: { "Dashboard": { "view": true, "create": true, "edit": true, "delete": true }, ... }

-- No schema changes needed, jsonb already supports this structure
-- Just adding a comment to document the new structure

COMMENT ON COLUMN public.grupos_acesso.menus_permitidos IS 
'Stores menu permissions as JSON objects. Structure: { "MenuName": { "view": boolean, "create": boolean, "edit": boolean, "delete": boolean } }';