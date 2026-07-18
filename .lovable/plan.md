## O que será feito

### 1. Banco de dados
Adicionar coluna `vendedor_id` (uuid, referência a `empresas.id`) na tabela `empresa_vinculos`. A tabela já suporta `usuario_id` e `segmento_id` — só falta vendedor.

### 2. Tela de cadastro de Empresa (`Empresas.tsx`)
Adicionar duas novas abas no formulário de edição/criação de empresa, ao lado de "Contatos Vinculados" e "Segmentos":

- **Usuários do Sistema**: multi-select de usuários do estabelecimento. Salva em `empresa_vinculos` com `usuario_id` preenchido. Mostra lista dos já vinculados com botão de remover.
- **Vendedores**: multi-select das empresas com `tipo_cliente='vendedor'`. Salva em `empresa_vinculos` com `vendedor_id` preenchido. Mesma UX de adicionar/remover.

Ambas as abas seguem o mesmo padrão visual da aba "Segmentos" já existente.

### 3. Nova tela de vínculo em massa: Vínculo Empresa × Vendedor
Criar `src/pages/VinculosEmpresaVendedor.tsx` reusando o mesmo wizard de 4 passos de `VinculosEmpresas.tsx`:

1. Passo 1: selecionar empresas
2. Passo 2: selecionar vendedores a vincular
3. Passo 3: confirmação
4. Passo 4: processamento

Cria/remove registros em `empresa_vinculos` com `vendedor_id`.

Como os componentes `VinculosWizardStep1..4` estão acoplados a "usuário/segmento", a nova tela terá uma versão simplificada inline (apenas o passo 2 muda — seleciona vendedores). Reaproveita 100% do visual.

### 4. Menu Listas
Adicionar item **"Vínculo Empresa × Vendedor"** em `ListasHub.tsx`, ao lado de "Vínculo Empresas" e "Vínculo Contatos".

## Detalhes técnicos

- Migration: `ALTER TABLE public.empresa_vinculos ADD COLUMN vendedor_id uuid REFERENCES public.empresas(id) ON DELETE CASCADE;` + índice.
- No `Empresas.tsx`, adicionar `vendedores` e `usuariosSistema` ao state, buscar ambos no `fetchAll`, e novas ações `handleAdicionarUsuario` / `handleAdicionarVendedor` / `handleRemoverVinculo`.
- Filtrar vendedores por `tipo_cliente='vendedor'` e `estabelecimento_id`.
- A aba Vendedores fica visível para todos os variants (empresa/vendedor/transportadora) — faz sentido vincular vendedor a transportadora também. Confirme se prefere restringir só a variant "empresa".
