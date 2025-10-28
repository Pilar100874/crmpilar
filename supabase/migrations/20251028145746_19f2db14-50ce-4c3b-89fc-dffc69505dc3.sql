-- Adicionar coluna tipo_pagamento_id na tabela condicoes_pagamento
ALTER TABLE public.condicoes_pagamento
ADD COLUMN tipo_pagamento_id UUID REFERENCES public.tipos_pagamento(id) ON DELETE SET NULL;