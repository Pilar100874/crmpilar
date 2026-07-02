
## Objetivo

Trazer o programa completo do projeto **pilaracesso** para este projeto como um novo módulo chamado **Controle de Visitantes**, replicando o padrão visual usado no **Controle de Veículos** (CVLayout com sidebar colapsável desktop + Select mobile, header em gradient, cards de KPI padronizados, tokens semânticos do design system, etc.).

## O que será criado

### Banco de dados (1 migration)
Criar tabelas no schema `public`:
- `visitors` — cpf único, nome, empresa, e-mail, whatsapp, foto
- `contact_persons` — pessoas autorizadas a receber visitas (nome, whatsapp, cpf)
- `pending_visitors` — solicitações aguardando autorização
- `access_records` — histórico de entradas/saídas

Cada tabela com:
- RLS habilitado
- Policies para `authenticated` (SELECT/INSERT/UPDATE/DELETE)
- `GRANT` obrigatórios para `authenticated` e `service_role`
- Índices em cpf, status e entry_date

### Hook de dados
- `src/hooks/useVisitantesControl.ts` — versão adaptada do `useSupabaseAccessControl` original, usando `import { supabase } from "@/integrations/supabase/client"` deste projeto.

### Tipos
- `src/types/visitantes.ts` — `Visitor`, `ContactPerson`, `PendingVisitor`, `AccessRecord`, `AccessFilters`.

### Layout do módulo (padrão CV)
- `src/pages/controle-visitantes/CVisLayout.tsx` — mesmo padrão do `CVLayout`:
  - Header superior "Controle de Visitantes" com ícone `Users`
  - Sidebar colapsável no desktop, `<Select>` dropdown no mobile/tablet
  - Suporte a `isSoloMode()` (abrir em nova aba sem menu)
  - Duas seções: Principal + Configurações
- `src/pages/controle-visitantes/CVisPageHeader.tsx` — header gradient e cards KPI, cópia adaptada do `CVPageHeader`.

### Páginas do módulo
Adaptadas dos componentes originais mantendo funcionalidade, mas usando tokens semânticos e visual CV:

**Principal**
- `CVisDashboard.tsx` — dashboard com KPIs (Presentes, Entradas Hoje, Pendentes, Saídas Hoje) + atalhos para Entrada/Presentes/Autorizações
- `CVisEntrada.tsx` — registro de entrada (busca por CPF, cadastro rápido, foto, dados da visita, imediato vs pendente)
- `CVisPresentes.tsx` — visitantes atualmente no local + botão de saída
- `CVisAutorizacoes.tsx` — solicitações pendentes (aprovar/negar)
- `CVisRelatorios.tsx` — filtros + histórico + exportação

**Configurações**
- `CVisVisitantes.tsx` — CRUD de visitantes
- `CVisContatos.tsx` — CRUD de pessoas de contato

### Rotas e navegação
- `src/App.tsx` — adicionar `<Route path="/controle-visitantes" element={<CVisLayout />}>` com filhos.
- `src/components/Layout.tsx` — adicionar item **Controle de Visitantes** (ícone `Users`) no menu principal apontando para `/controle-visitantes`.
- `src/lib/menus.ts` — adicionar entradas em `MENU_CONFIG` (categoria "Visitantes"), atualizar `CATEGORY_ORDER`.
- `src/components/GlobalOpenInNewTabButton.tsx` — nenhuma mudança (já herda o botão global).

## O que NÃO será importado

- `SplashScreen` e página `Admin` do pilaracesso (o splash/admin deste projeto já existe e é diferente).
- `Navigation.tsx` original (substituído pelo padrão CVLayout).
- Edge function `admin-clear-data` (o admin do pilaracesso é outra tela e não faz parte do módulo operacional).
- Tokens de CSS `gradient-warning`, `shadow-glow-success` — serão substituídos por classes existentes deste projeto (`bg-amber-500`, tokens semânticos).

## Detalhes técnicos

- Todas as cores usarão tokens semânticos (`bg-primary`, `text-success`, etc.), sem cores hardcoded.
- Textos em português (regra de projeto).
- Delete sempre com `DeleteConfirmDialog` (regra de projeto).
- Cabeçalhos das tabelas seguem padrão de GRANT deste projeto (Lovable Cloud).
- `types.ts` é auto-gerado e será atualizado automaticamente após a migration.
- Nenhuma edição em `client.ts`, `.env` ou `config.toml`.

## Fora do escopo

- Autenticação/perfis para o módulo (usa policies `authenticated` genéricas, como no original).
- Integração com câmeras / catracas / face recognition (não existiam no pilaracesso).
- Notificações via WhatsApp automatizadas (o original só abre link).
