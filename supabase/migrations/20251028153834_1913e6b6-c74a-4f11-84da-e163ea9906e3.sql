-- Ensure old unique index/constraint is fully removed
DO $$
BEGIN
  -- Try drop constraint (in case it exists as a table constraint)
  BEGIN
    ALTER TABLE public.quick_replies DROP CONSTRAINT IF EXISTS quick_replies_shortcut_key;
  EXCEPTION WHEN undefined_object THEN
    -- ignore
  END;
  
  -- Try drop index with that name (most errors reference index name)
  BEGIN
    DROP INDEX IF EXISTS public.quick_replies_shortcut_key;
  EXCEPTION WHEN undefined_table THEN
    -- ignore
  END;
END $$;

-- Recreate correct partial unique index only for non-null shortcuts, per establishment
CREATE UNIQUE INDEX IF NOT EXISTS quick_replies_shortcut_estab_unique
ON public.quick_replies (shortcut, estabelecimento_id)
WHERE shortcut IS NOT NULL;