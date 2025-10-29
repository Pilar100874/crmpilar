-- Update company_type and cpf_cnpj to never be locked (manual input fields)
UPDATE public.form_field_configs
SET locked = false
WHERE form_type = 'empresa'
  AND field_id IN ('company_type', 'cpf_cnpj');