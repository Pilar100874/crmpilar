-- Atualizar foreign keys para ON UPDATE CASCADE e ON DELETE RESTRICT
-- Isso permite atualizações em cascata mas impede exclusões com vínculos

-- conversations -> customers
ALTER TABLE public.conversations 
DROP CONSTRAINT IF EXISTS conversations_customer_id_fkey,
ADD CONSTRAINT conversations_customer_id_fkey 
  FOREIGN KEY (customer_id) 
  REFERENCES public.customers(id) 
  ON UPDATE CASCADE 
  ON DELETE RESTRICT;

-- messages -> conversations
ALTER TABLE public.messages 
DROP CONSTRAINT IF EXISTS messages_conversation_id_fkey,
ADD CONSTRAINT messages_conversation_id_fkey 
  FOREIGN KEY (conversation_id) 
  REFERENCES public.conversations(id) 
  ON UPDATE CASCADE 
  ON DELETE CASCADE;

-- usuarios -> estabelecimentos
ALTER TABLE public.usuarios 
DROP CONSTRAINT IF EXISTS usuarios_estabelecimento_id_fkey,
ADD CONSTRAINT usuarios_estabelecimento_id_fkey 
  FOREIGN KEY (estabelecimento_id) 
  REFERENCES public.estabelecimentos(id) 
  ON UPDATE CASCADE 
  ON DELETE RESTRICT;

-- usuarios -> unidades
ALTER TABLE public.usuarios 
DROP CONSTRAINT IF EXISTS usuarios_unidade_id_fkey,
ADD CONSTRAINT usuarios_unidade_id_fkey 
  FOREIGN KEY (unidade_id) 
  REFERENCES public.unidades(id) 
  ON UPDATE CASCADE 
  ON DELETE SET NULL;

-- usuarios -> grupos_acesso
ALTER TABLE public.usuarios 
DROP CONSTRAINT IF EXISTS usuarios_grupo_acesso_id_fkey,
ADD CONSTRAINT usuarios_grupo_acesso_id_fkey 
  FOREIGN KEY (grupo_acesso_id) 
  REFERENCES public.grupos_acesso(id) 
  ON UPDATE CASCADE 
  ON DELETE SET NULL;

-- unidades -> estabelecimentos
ALTER TABLE public.unidades 
DROP CONSTRAINT IF EXISTS unidades_estabelecimento_id_fkey,
ADD CONSTRAINT unidades_estabelecimento_id_fkey 
  FOREIGN KEY (estabelecimento_id) 
  REFERENCES public.estabelecimentos(id) 
  ON UPDATE CASCADE 
  ON DELETE CASCADE;

-- segmentos -> estabelecimentos
ALTER TABLE public.segmentos 
DROP CONSTRAINT IF EXISTS segmentos_estabelecimento_id_fkey,
ADD CONSTRAINT segmentos_estabelecimento_id_fkey 
  FOREIGN KEY (estabelecimento_id) 
  REFERENCES public.estabelecimentos(id) 
  ON UPDATE CASCADE 
  ON DELETE CASCADE;

-- grupos_acesso -> estabelecimentos
ALTER TABLE public.grupos_acesso 
DROP CONSTRAINT IF EXISTS grupos_acesso_estabelecimento_id_fkey,
ADD CONSTRAINT grupos_acesso_estabelecimento_id_fkey 
  FOREIGN KEY (estabelecimento_id) 
  REFERENCES public.estabelecimentos(id) 
  ON UPDATE CASCADE 
  ON DELETE CASCADE;

-- usuario_segmentos -> usuarios
ALTER TABLE public.usuario_segmentos 
DROP CONSTRAINT IF EXISTS usuario_segmentos_usuario_id_fkey,
ADD CONSTRAINT usuario_segmentos_usuario_id_fkey 
  FOREIGN KEY (usuario_id) 
  REFERENCES public.usuarios(id) 
  ON UPDATE CASCADE 
  ON DELETE CASCADE;

-- usuario_segmentos -> segmentos
ALTER TABLE public.usuario_segmentos 
DROP CONSTRAINT IF EXISTS usuario_segmentos_segmento_id_fkey,
ADD CONSTRAINT usuario_segmentos_segmento_id_fkey 
  FOREIGN KEY (segmento_id) 
  REFERENCES public.segmentos(id) 
  ON UPDATE CASCADE 
  ON DELETE CASCADE;

-- customers -> estabelecimentos
ALTER TABLE public.customers 
DROP CONSTRAINT IF EXISTS customers_estabelecimento_id_fkey,
ADD CONSTRAINT customers_estabelecimento_id_fkey 
  FOREIGN KEY (estabelecimento_id) 
  REFERENCES public.estabelecimentos(id) 
  ON UPDATE CASCADE 
  ON DELETE CASCADE;

-- user_roles -> usuarios
ALTER TABLE public.user_roles 
DROP CONSTRAINT IF EXISTS user_roles_user_id_fkey,
ADD CONSTRAINT user_roles_user_id_fkey 
  FOREIGN KEY (user_id) 
  REFERENCES public.usuarios(id) 
  ON UPDATE CASCADE 
  ON DELETE CASCADE;

-- quick_replies -> usuarios
ALTER TABLE public.quick_replies 
DROP CONSTRAINT IF EXISTS quick_replies_user_id_fkey,
ADD CONSTRAINT quick_replies_user_id_fkey 
  FOREIGN KEY (user_id) 
  REFERENCES public.usuarios(id) 
  ON UPDATE CASCADE 
  ON DELETE CASCADE;

-- quick_replies -> grupos_acesso
ALTER TABLE public.quick_replies 
DROP CONSTRAINT IF EXISTS quick_replies_grupo_acesso_id_fkey,
ADD CONSTRAINT quick_replies_grupo_acesso_id_fkey 
  FOREIGN KEY (grupo_acesso_id) 
  REFERENCES public.grupos_acesso(id) 
  ON UPDATE CASCADE 
  ON DELETE SET NULL;

-- quick_attachments -> usuarios
ALTER TABLE public.quick_attachments 
DROP CONSTRAINT IF EXISTS quick_attachments_user_id_fkey,
ADD CONSTRAINT quick_attachments_user_id_fkey 
  FOREIGN KEY (user_id) 
  REFERENCES public.usuarios(id) 
  ON UPDATE CASCADE 
  ON DELETE CASCADE;

-- quick_attachments -> grupos_acesso
ALTER TABLE public.quick_attachments 
DROP CONSTRAINT IF EXISTS quick_attachments_grupo_acesso_id_fkey,
ADD CONSTRAINT quick_attachments_grupo_acesso_id_fkey 
  FOREIGN KEY (grupo_acesso_id) 
  REFERENCES public.grupos_acesso(id) 
  ON UPDATE CASCADE 
  ON DELETE SET NULL;