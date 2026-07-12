# Guia de Configuração — OAuth do Módulo Ads

Este guia explica como conectar Google Ads, Meta Ads (Facebook/Instagram) e TikTok Ads via OAuth no CRM Pilar.

## 1. Pré-requisito: cadastre o App do Desenvolvedor

Antes de usar a **Conexão rápida via OAuth**, cadastre em **Painel de Anúncios → Conexões → Apps do Desenvolvedor**:

- **Google Ads**: `Client ID` + `Client Secret` (Google Cloud Console → APIs & Credentials → OAuth 2.0 Client)
- **Meta Ads**: `App ID` + `App Secret` (Meta for Developers → Suas apps)
- **TikTok Ads**: `App ID` + `App Secret` (TikTok for Business → Apps)

## 2. Cadastre a Redirect URI no portal da plataforma

Cada plataforma exige que a URL de retorno do OAuth esteja **explicitamente autorizada** no app do desenvolvedor. Use exatamente:

```
https://<seu-projeto>.supabase.co/functions/v1/ads-oauth-callback
```

> A URL exata (com seu projeto) aparece com botão **Copiar** na tela de Conexões, no aviso amarelo do card "Conexão rápida via OAuth".

### Onde cadastrar em cada plataforma

| Plataforma | Portal | Local |
| --- | --- | --- |
| Google | https://console.cloud.google.com/apis/credentials | Editar o OAuth Client → **Authorized redirect URIs** |
| Meta | https://developers.facebook.com/apps/ | App → **Facebook Login → Settings → Valid OAuth Redirect URIs** |
| TikTok | https://business-api.tiktok.com/portal/apps | App → **Basic info → Redirect URL** |

⚠️ **A URL precisa bater byte-a-byte** — protocolo (`https`), host, caminho, sem barra final extra. Qualquer diferença faz a plataforma retornar `redirect_uri_mismatch` e o OAuth falha.

## 3. Escopos utilizados

| Plataforma | Escopos |
| --- | --- |
| Google | `https://www.googleapis.com/auth/adwords` |
| Meta | `ads_management`, `ads_read`, `business_management` |
| TikTok | escopos padrão configurados no app |

## 4. Fluxo de conexão

1. Vá em **Painel de Anúncios → Conexões → Contas de Anúncio**.
2. No card **Conexão rápida via OAuth**, clique em `Conectar <Plataforma>`.
3. Uma nova janela abre com o consentimento da plataforma. Faça login e autorize.
4. A janela fecha sozinha e o toast "Conectado: <plataforma>" confirma o sucesso.
5. Uma linha nova aparece em **Contas de Anúncio** com o token salvo.

## 5. Solução de problemas

| Erro | Causa | Solução |
| --- | --- | --- |
| `redirect_uri_mismatch` | URL não cadastrada / com diferença | Copie a URL do card e cole exatamente no portal. |
| `invalid_client` | Client Secret errado ou app em modo dev | Confira o segredo em Apps do Desenvolvedor; publique o app se estiver em modo desenvolvimento. |
| Popup não abre | Bloqueador de popup | Libere popups para o domínio do CRM e tente de novo. |
| Toast não confirma | Callback bloqueado | Verifique se a Redirect URI está autorizada e se o app não está em modo dev restrito. |
| `App Not Setup` (Meta) | App em modo Desenvolvimento sem seu usuário como testador | Adicione seu usuário como Tester em Roles → Roles, ou coloque o app em Live. |

## 6. Renovação de tokens

O sistema salva `access_token` + `refresh_token`. O refresh é acionado automaticamente pelo motor de coleta quando o token expira — nenhuma ação manual é necessária.
