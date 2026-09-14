# Pilar Controle — Android

Aplicativo Android nativo para celular e tablet com dois módulos:

- Automação: mostra somente o ambiente atribuído ao usuário e envia comandos reais aos equipamentos.
- Relógio de Ponto: identifica o funcionário autenticado e registra entrada, início/fim de intervalo e saída.

Não contém SMS, câmera, WebView ou menus gerais do CRM. O Pilar SMS continua como aplicativo separado.

## Acesso

1. Informe uma chave multiempresa do tipo **Pilar Controle**.
2. Entre com e-mail e senha.
3. O usuário somente acessa dados da empresa da chave e seu ambiente atribuído.

## Compatibilidade

O `applicationId` e o manifesto público `hub-version.json` permanecem com o identificador interno `hub`, permitindo atualizar instalações antigas do Pilar Hub para o Pilar Controle.

## Geração

O workflow `build-pilar-hub.yml` compila, assina e publica `pilar-controle-v<versão>.apk`. O pacote deve ser considerado disponível somente depois de o manifesto público marcar `disponivel: true`.