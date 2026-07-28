
# Padrão único de Cadastro (Empresa / Pessoa) em todo o sistema

## Objetivo

Unificar todos os cadastros de empresa e pessoa em um único fluxo "CNPJ-first / CPF-first" com auto-preenchimento, cache, máscaras, validação Zod, foco automático no Número e experiência estilo Nubank/Mercado Livre.

## 1. Camada de serviços (nova base compartilhada)

Criar em `src/lib/cadastros/`:

- `cnpjService.ts` — `buscarCNPJ(cnpj)` com cache in-memory (Map por CNPJ), debounce, cancelamento via AbortController, retry 1x, fallback BrasilAPI → edge `consultar-cnpj`. Retorna objeto normalizado com todos os campos exigidos (situação, abertura, natureza jurídica, capital social, porte, MEI, Simples, CNAE principal + secundários, país="Brasil").
- `cepService.ts` — `buscarCEP(cep)` com cache e cancelamento (ViaCEP).
- `cpfService.ts` — só validação de dígitos (LGPD).
- `enderecoAutofill.ts` — helper que, dado um CEP, resolve UF/cidade + carrega municípios IBGE e devolve código IBGE.
- `schemas.ts` — schemas Zod: `empresaSchema`, `pessoaFisicaSchema`, `enderecoSchema`.

## 2. Componentes reutilizáveis (novos)

Em `src/components/cadastros/`:

- `CnpjField.tsx` — input com máscara, loading, validação de dígitos, consulta automática ao completar, ícone de status, mensagem de erro, exposição via `onLookup(data)`.
- `CpfField.tsx` — máscara + validação.
- `CepField.tsx` — máscara + ViaCEP automático, expõe `onLookup(data)`, dispara foco no `NumeroField` irmão.
- `NumeroEnderecoField.tsx` — input controlado; recebe ref para autofoco após CEP/CNPJ.
- `EmpresaFormCore.tsx` — formulário completo padronizado (CNPJ primeiro, todos os campos listados: razão, fantasia, situação, abertura, natureza, capital, porte, regime, MEI, Simples, CNAE principal, lista de CNAEs secundários, email, telefone, endereço com UF/cidade travados por CEP + IBGE readonly, país). Usa `react-hook-form` + Zod.
- `PessoaFisicaFormCore.tsx` — formulário curto (CPF, nome, nascimento, celular, email, CEP, número, complemento).

Ambos os cores expõem `defaultValues`, `onSubmit`, `mode` (create/edit) e são consumidos pelas telas existentes sem duplicar lógica.

## 3. Telas a refatorar (todas passam a consumir os cores)

Listas principais:
- `src/pages/Empresas.tsx` — Empresas, Vendedores, Transportadoras.
- `src/pages/ProspeccaoEmpresas.tsx` — cadastro manual de prospect.
- `src/components/atendimento/EmpresaFormSheet.tsx` — CRM.
- `src/components/atendimento/ContatoFormSheet.tsx` — CRM pessoa física.
- `src/components/NovaEmpresaDialog.tsx` / `NovoContatoDialog.tsx` — passam a delegar aos cores.

Bot / atendimento:
- Cadastro rápido de empresa/contato disparado por blocos do bot que criam registros.

Ponto:
- `Empresas`, `Filiais`, `Funcionários` do módulo Ponto (Filiais e Empresas usam mesmo padrão CNPJ-first; Funcionários usam PessoaFisicaFormCore).

Ecommerce:
- Cadastro de comprador (empresa B2B) e cliente PF no checkout admin.

Qualquer outra tela que hoje capture CNPJ/CPF isolado ganha `CnpjField`/`CpfField` (busca automática + máscara).

## 4. Campos adicionados no schema `empresas`

Migration adicionando colunas que hoje não existem (quando aplicável):
- `situacao_cadastral text`
- `data_abertura date`
- `natureza_juridica text`
- `capital_social numeric`
- `porte text`
- `regime_tributario text`
- `optante_mei boolean`
- `optante_simples boolean`
- `cnae_principal text`
- `cnaes_secundarios jsonb`
- `pais text default 'Brasil'`

Todas nullable, sem afetar dados existentes. GRANTs e RLS preservados.

Tabela `pessoas` — se não existir separada (hoje é `customers`), adicionar `data_nascimento date` em `customers` (nullable).

## 5. Fluxo UX garantido

Empresa:
```
CNPJ (máscara) → validação dígitos → consulta automática (loading, cache, sem duplicar)
   → preenche tudo → se Número vazio, foca Número → Salvar
```

CEP dentro da empresa:
```
CEP completo → ViaCEP → preenche logradouro/bairro/UF/cidade + IBGE → foca Número
```

Pessoa Física:
```
CPF → valida → Nome → Nascimento → Celular → Email → CEP → ViaCEP → Número → Salvar
```

- Se CNPJ/CEP não encontrado: permite cadastro manual (sem travar), mantendo UF/Cidade guiados por CEP quando houver.
- Debounce 500ms nas consultas; AbortController cancela requisição anterior; toast de erro discreto.

## 6. Máscaras e validações

Reaproveita `src/lib/masks.ts` e `src/lib/validators.ts` existentes (CPF, CNPJ, CEP, telefone, data). Adiciona schemas Zod centrais em `schemas.ts` para uso em `react-hook-form`. Validação também server-side reutilizando `validateCpfCnpjField` já existente.

## 7. Ordem de execução

1. Migration de colunas novas em `empresas` (+ `data_nascimento` em `customers`).
2. Criar `src/lib/cadastros/*` (serviços + schemas).
3. Criar `src/components/cadastros/*` (fields + cores).
4. Refatorar `Empresas.tsx` (Empresas/Vendedores/Transportadoras).
5. Refatorar `EmpresaFormSheet.tsx` e `ContatoFormSheet.tsx` (CRM/atendimento).
6. Refatorar `ProspeccaoEmpresas.tsx`.
7. Refatorar telas de Ponto (Empresas, Filiais, Funcionários).
8. Refatorar cadastro do Ecommerce (comprador B2B / PF).
9. Ajustar blocos do Bot que criam registros para chamar os cores.
10. Smoke-test em cada tela: build + navegação manual pelas rotas.

## Detalhes técnicos

- `react-hook-form` + `@hookform/resolvers/zod` já disponíveis no projeto (usados em outras telas).
- Cache CNPJ/CEP: `Map<string, Promise<Result>>` — mesma chamada em voo é reaproveitada, evita duplicidade.
- AbortController armazenado em ref; cancela ao digitar novo valor ou desmontar.
- IBGE continua via `UfCidadeIbge` existente (não duplicar lógica); os cores injetam UF/Cidade já resolvidos pelo CEP.
- Consulta CNPJ: BrasilAPI primeiro (público, sem custo). Fallback edge `consultar-cnpj` para email/telefone quando faltar.
- Nenhuma consulta CPF a serviços de dados pessoais será feita (LGPD).
- Tipagem: `EmpresaFormValues` e `PessoaFisicaFormValues` exportadas de `schemas.ts`.
- Sem mudança em RLS ou grants existentes; migration só adiciona colunas nullable.

## Risco / mitigação

- Refatoração ampla → mantenho as telas atuais funcionando durante a migração, um arquivo por vez; cada refatoração compila antes de seguir.
- Se algum consumidor específico tiver campo custom (ex.: transportadora tem `tipo_transporte`), o core aceita `extraFields` renderizados após o bloco padrão.
