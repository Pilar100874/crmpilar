# CRM Pilar - Extensão de Monitoramento de Tela

Esta extensão do Chrome permite o monitoramento silencioso de tela para o CRM Pilar.

## Instalação

### 1. Preparar os ícones

Crie uma pasta `icons` dentro de `browser-extension` e adicione os seguintes arquivos:
- `icon16.png` (16x16 pixels)
- `icon48.png` (48x48 pixels)
- `icon128.png` (128x128 pixels)

Você pode usar qualquer ícone de sua preferência ou criar um simples com as iniciais "CP".

### 2. Carregar a extensão no Chrome

1. Abra o Chrome e vá para `chrome://extensions/`
2. Ative o **"Modo do desenvolvedor"** no canto superior direito
3. Clique em **"Carregar sem compactação"**
4. Selecione a pasta `browser-extension`

### 3. Usar a extensão

1. Clique no ícone da extensão na barra do Chrome
2. Cole o ID do usuário (você pode encontrar isso no CRM após fazer login)
3. Clique em **"Iniciar Monitoramento"**
4. Na primeira vez, você precisará selecionar qual tela/janela compartilhar
5. Após a seleção inicial, a captura acontecerá silenciosamente

## Como funciona

- A extensão captura a tela a cada **3 segundos**
- As imagens são comprimidas em JPEG com qualidade de 50%
- Os frames são transmitidos via Supabase Realtime para visualização remota
- O supervisor pode ver a tela em tempo real no painel de monitoramento

## Obter o ID do Usuário

1. Faça login no CRM Pilar
2. Abra o console do navegador (F12)
3. Digite: `localStorage.getItem('sb-ioxugupvxlcdweldocmq-auth-token')`
4. O ID do usuário está no campo `user.id` do JSON retornado

Ou, após implementação no CRM, o ID será exibido na página de perfil do usuário.

## Notas de Segurança

- A extensão só funciona quando o usuário explicitamente a inicia
- A primeira seleção de tela requer aprovação do usuário
- Após a primeira aprovação, as capturas subsequentes são silenciosas
- O usuário pode parar o monitoramento a qualquer momento

## Troubleshooting

### A extensão não conecta
- Verifique se o ID do usuário está correto
- Confirme que você tem conexão com a internet
- Verifique se o usuário existe no banco de dados

### Frames não aparecem no dashboard
- Confirme que a extensão mostra status "Ativo"
- Verifique o console do Chrome por erros
- Confirme que o supervisor está visualizando o usuário correto
