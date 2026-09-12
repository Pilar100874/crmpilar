# Chave da empresa padronizada em todos os aplicativos

Hoje só o Pilar Automação pede uma chave da empresa. A ideia é que **todos** os aplicativos
(Pilar Fone, Pilar SMS, Pilar Automação e Pilar Remotas) comecem pedindo uma chave que
identifica a empresa, e só depois peçam usuário e senha.

## O que muda para você

1. **Uma tela única de chaves** dentro de **Admin → Apps**: cria, copia, bloqueia e apaga as
   chaves, escolhendo para qual aplicativo cada chave vale (Fone, SMS, Automação, Remotas).
   Mostra também o último uso de cada chave.
2. **Pilar Fone**: ao abrir, pede a chave da empresa; depois vem a tela de usuário e senha.
   Se a chave estiver bloqueada, o aparelho não entra.
3. **Pilar SMS**: mesma abertura por chave antes de configurar o aparelho.
4. **Pilar Automação**: continua igual, passa a usar a nova tela de chaves.
5. **Pilar Remotas**: a parte de chaves/ativação sai da tela do Gerenciador de Telas Remotas —
   passa a ficar só em Admin → Apps.
6. **Novas versões de todos os aplicativos** são geradas para sair no mesmo padrão.

## Parte técnica

- Migração: coluna `app` em `public.automacao_app_chaves`
  (`automacao` | `fone` | `sms` | `remotas`, padrão `automacao`), índice por
  `estabelecimento_id, app`; RLS e grants atuais mantidos.
- Edge Function nova `app-chave-validar` (pública, sem JWT): recebe `{ chave, app }`,
  devolve `estabelecimento_id`, nome da empresa e registra `ultima_comunicacao`;
  rejeita chave bloqueada ou de outro aplicativo. `automacao-app-chave` passa a
  delegar para a mesma lógica (compatibilidade com o APK atual).
- Front: `src/components/apps/ChavesAppsManager.tsx` (CRUD com filtro por aplicativo),
  usado em `src/pages/AdminApps.tsx`; `src/pages/automacao/AutomacaoChavesApp.tsx` vira
  redirecionamento para `/admin/apps`; item de menu de Automação removido em
  `src/components/Layout.tsx` e `src/lib/voz/rotasSistema.ts` atualizado.
- Pilar Remotas: bloco de ativação/chaves removido de `src/pages/tv-signage/TvSignageApi.tsx`
  (aba deixa só instruções de instalação, apontando para Admin → Apps).
- Pilar Fone (`interfone.html` + `portaria-app`): passo de chave antes do login, guardado
  localmente, validado por `app-chave-validar`; botão "Trocar chave". Versão 1.8.0.
- Pilar SMS (`pilar-sms-app`): `AtivacaoActivity` + `Prefs` de chave como no app de Automação,
  activity de entrada no `AndroidManifest.xml`. Versão 1.8.0.
- Pilar Automação: `app=automacao` na validação; versão 1.5.0.
- Pilar Remotas (`android-tv-signage`): texto de ativação alinhado ao padrão; versão nova.
- Workflows do GitHub Actions recompilam cada APK ao subir as alterações.

## Verificação

- `bun run typecheck`, `bun run test`, `bun run lint` e `bun run build`.
- Teste da Edge Function com chave válida, bloqueada e de outro aplicativo.
- Conferência visual da tela de chaves em Admin → Apps.
