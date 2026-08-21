CREATE OR REPLACE FUNCTION public.ferr_create_overdue_notifications()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  notification_count integer := 0;
  loan_record RECORD;
BEGIN
  FOR loan_record IN
    SELECT l.id as loan_id, l.user_id, t.name as tool_name
    FROM ferr_loans l
    JOIN ferr_tools t ON t.id = l.tool_id
    WHERE l.status = 'ativo'
      AND l.due_date < now()
      AND NOT EXISTS (
        SELECT 1 FROM ferr_notifications n
        WHERE n.loan_id = l.id
          AND n.type = 'overdue'
          AND n.created_at::date = now()::date
      )
  LOOP
    INSERT INTO ferr_notifications (user_id, loan_id, title, message, type)
    VALUES (
      loan_record.user_id,
      loan_record.loan_id,
      'Devolução em Atraso',
      'A ferramenta "' || loan_record.tool_name || '" está com prazo de devolução vencido. Por favor, devolva ou solicite renovação.',
      'overdue'
    );
    notification_count := notification_count + 1;
  END LOOP;
  RETURN notification_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.ferr_create_overdue_notifications() TO authenticated;