/**
 * Utilitários para verificação de permissões de admin no sistema.
 * 
 * Este arquivo contém funções reutilizáveis para verificar se um usuário
 * é administrador do sistema ou administrador de estabelecimento.
 * 
 * IMPORTANTE: A arquitetura de admin tem dois níveis:
 * 
 * 1. Administrador do Sistema (tabela administradores):
 *    - Acesso total a todos os estabelecimentos
 *    - Pode criar/editar/deletar estabelecimentos
 *    - Pode gerenciar usuários de qualquer estabelecimento
 *    - Verificado com: EXISTS (SELECT 1 FROM administradores WHERE id = auth.uid())
 * 
 * 2. Admin de Estabelecimento (tabela user_roles com role='admin'):
 *    - Acesso total apenas ao SEU estabelecimento
 *    - Pode gerenciar usuários, bots, flows, etc. do estabelecimento
 *    - NÃO pode modificar dados básicos do estabelecimento (CNPJ, nome, etc.)
 *    - Verificado com: has_role(auth.uid(), 'admin'::app_role)
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
Arquitetura de Administração - Documentação Técnica
====================================================

DOIS NÍVEIS DE ADMIN:

1. ADMINISTRADOR DO SISTEMA (tabela: administradores)
   - Identificado por: EXISTS (SELECT 1 FROM administradores WHERE id = auth.uid())
   - Pode: Gerenciar TODOS os estabelecimentos e seus dados
   - Acesso: Irrestrito a todos os recursos
   - Tabela: public.administradores
   
2. ADMIN DE ESTABELECIMENTO (tabela: user_roles)
   - Identificado por: has_role(auth.uid(), 'admin'::app_role)
   - Pode: Gerenciar apenas SEU estabelecimento
   - Restrições: NÃO pode modificar dados básicos do estabelecimento
   - Tabelas: public.usuarios + public.user_roles
   
MAPEAMENTO DE IDs (CRÍTICO):
   auth.users.id 
     ↓ (vinculado por)
   usuarios.auth_user_id 
     ↓ (gera)
   usuarios.id
     ↓ (usado em)
   user_roles.user_id

FUNÇÕES UTILITÁRIAS:
   isSystemAdmin() - Verifica se é admin do sistema
   isEstabelecimentoAdmin() - Verifica se tem role 'admin'
   isAnyAdmin() - Verifica qualquer tipo de admin
   getUserIdFromAuth() - Converte auth.users.id → usuarios.id

POLÍTICAS RLS PADRÃO:
   - SELECT: Administrador sistema OU (admin estabelecimento E estabelecimento_id match)
   - INSERT/UPDATE/DELETE: Mesma lógica do SELECT
   - Estabelecimentos: Apenas administrador sistema pode modificar

Para mais detalhes, veja: src/lib/estabelecimentoUtils.ts
`;
