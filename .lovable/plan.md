# Corrigir APKs Pilar SMS, Automação e Controle

## Objetivo
Padronizar os três aplicativos Android pelo visual do Pilar Fone, corrigir os ícones antes da geração e separar claramente as funções de cada produto.

## Alterações

### Pilar SMS
- Redesenhar o símbolo central dentro da área segura do ícone adaptativo, preservando fundo azul-marinho, detalhe laranja e identidade de SMS.
- Gerar todas as densidades Android a partir de uma única arte validada e comparar visualmente com o Pilar Fone.
- Manter o SMS exclusivamente neste aplicativo.

### Pilar Automação
- Refazer ativação e login em Android nativo com a mesma linguagem visual do Pilar Fone: fundo azul-marinho, marca branca, detalhes laranja, campos e mensagens nativos.
- Substituir o painel WebView por uma tela Android nativa que carrega apenas o ambiente atribuído ao usuário.
- Reproduzir os blocos e comandos reais desse ambiente, mantendo estados, atualização e isolamento por empresa.
- Corrigir o ícone vazio com um símbolo de automação centralizado no mesmo padrão visual do Pilar Fone.

### Pilar Controle (atual Pilar Hub)
- Renomear o APK, textos, notificações, download e versão de “Pilar Hub” para “Pilar Controle”.
- Aplicar o mesmo fluxo multiempresa: chave, login e acesso somente aos dados da empresa.
- Manter apenas duas áreas no APK: Automação e Relógio de Ponto.
- Remover do APK permissões, bibliotecas e processamento de câmera e SMS.
- Preservar câmeras, ponto e automação sem alterações nas versões Windows e ISO.
- Criar ícone próprio de Controle dentro do padrão visual do Pilar Fone.

### Downloads e atualizações
- Atualizar nomes, descrições, manifesto de versão e identificação usada pela atualização remota.
- Preservar atualização dentro do aplicativo e pela Central de Atualizações.
- Manter compatibilidade com instalações existentes do antigo Pilar Hub durante a transição.

## Validação
- Renderizar uma prancha comparativa dos ícones Pilar Fone, SMS, Automação e Controle e conferir margens/centralização antes de gerar pacotes.
- Validar ativação, login, ambiente atribuído, comandos de automação, registro de ponto e atualização.
- Confirmar que o APK Controle não solicita câmera/SMS e que Windows/ISO continuam completos.
- Executar verificações do site e do código Android disponíveis neste ambiente.
- A geração dos APKs assinados continuará no fluxo automático; só será disparada após as verificações visuais e funcionais possíveis localmente.
