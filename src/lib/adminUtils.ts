/**
 * Utilitários para verificação de permissões de admin no sistema.
 * 
 * Este arquivo contém funções reutilizáveis para verificar se um usuário
 * é administrador do sistema.
 * 
 * ARQUITETURA DE ADMIN (SIMPLIFICADA):
 * 
 * Usuário Admin (tabela user_roles com role='admin'):
 *   - Acesso total a todos os menus e funcionalidades
 *   - Pode gerenciar usuários, bots, flows, etc. de qualquer estabelecimento
 *   - Verificado com: has_role(auth.uid(), 'admin'::app_role)
 * 
 * NOTA TÉCNICA CRÍTICA:
 * - auth.uid() retorna o ID de auth.users
 * - usuarios.auth_user_id referencia auth.users.id
 * - user_roles.user_id referencia usuarios.id (NÃO auth.users.id!)
 * 
 * Portanto, ao verificar roles em user_roles no frontend, é necessário:
 * 1. Buscar usuarios.id usando auth_user_id
 * 2. Usar esse usuarios.id para buscar em user_roles
 * 
 * As funções has_role() e políticas RLS no backend já fazem esse mapeamento automaticamente.
 */

export const ADMIN_ARCHITECTURE_DOCS = `
Arquitetura de Administração - Documentação Técnica (Simplificada)
====================================================

ADMIN VIA USER_ROLES:

Identificado por: has_role(auth.uid(), 'admin'::app_role)
Pode: Gerenciar TODOS os estabelecimentos e seus dados
Acesso: Irrestrito a todos os recursos
Tabelas: public.usuarios + public.user_roles
   
MAPEAMENTO DE IDs (CRÍTICO):
   auth.users.id 
     ↓ (vinculado por)
   usuarios.auth_user_id 
     ↓ (gera)
   usuarios.id
     ↓ (usado em)
   user_roles.user_id

FUNÇÕES UTILITÁRIAS:
   isSystemAdmin() - Verifica se tem role 'admin' (alias para isEstabelecimentoAdmin)
   isEstabelecimentoAdmin() - Verifica se tem role 'admin'
   isAnyAdmin() - Verifica se tem role 'admin'
   getUserIdFromAuth() - Converte auth.users.id → usuarios.id

POLÍTICAS RLS PADRÃO:
   - SELECT: Admin OU estabelecimento_id match
   - INSERT/UPDATE/DELETE: Mesma lógica do SELECT

Para mais detalhes, veja: src/lib/estabelecimentoUtils.ts
`;
