-- Add origem_sub_item field to calendario_tarefas table
ALTER TABLE calendario_tarefas 
ADD COLUMN IF NOT EXISTS origem_sub_item TEXT;