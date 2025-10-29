-- Update existing company_type fields to be locked
UPDATE public.form_field_configs
SET locked = true
WHERE form_type = 'empresa'
  AND field_id = 'company_type';