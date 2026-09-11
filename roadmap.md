# Roadmap

- [x] Popup em tela cheia para "Conectar ramal" (igual ao interfone)
- [x] Cores dos campos do ramal SIP legíveis no tema escuro
- [x] Reaplicar vídeo e viva-voz com consentimento mútuo (hook + popup)
- [x] Tela de Histórico com leitura melhor no tema escuro
- [x] Mensagens de erro mais bonitas (banner inline AvisoInline)
- [x] Versão marcada v1.6.2 + interfone-version.json atualizado
- [x] Contraste de textos/fundo do APK — ajustado pelo próprio usuário
- [x] Atualização remota do APK com backup/restauração da configuração SIP
- [x] Build validado (npm run build OK)
- [x] Viva-voz/videochamada na tela de chamada SIP (PilarFone) com botoes estilo WhatsApp
- [x] Mostrar capturas de cada tela do app ao usuario

## 2026-09-02
- [x] InterfoneTile: zoom por clique + arraste (corrigidos erros TS de 'movido')
- [x] InterfonePopup: botão fechar com respiro (pb-5) e import do InterfoneTile
- [x] Typecheck OK (tsgo --noEmit)

## 2026-09-03
- [x] Unificar softphone + videochamada no Pilar Fone (popup em formato de celular)
- [x] Remover abas Softphone/Videochamada de Configurações de Atendimento
- [x] Botão fechar, borda mais fina e botões sem corte no popup
- [x] Gatilho como aba lateral (estilo chat interno), logo acima do chat
- [x] Remover aba Chat do Pilar Fone (chat volta a ser só o painel lateral próprio)
- [x] Interfone dentro do Pilar Fone web (igual ao APK): config, campainha em tempo real e InterfonePopup
- [x] Aba lateral do Pilar Fone arrastável verticalmente (posição salva no navegador)
- [x] Clicar em números no painel de chat abre a tela correspondente do telefone (WhatsApp/discador)
- [x] Renomear "Pilar Sip" para "Pilar Fone" (web e APK)
- [x] Filtros de Cadastros como ícones
- [x] Permissão por abas do Pilar Fone no cadastro de usuário (web + APK)
- [x] WhatsApp do Pilar Fone: anexar arquivos e enviar áudio
- [x] WhatsApp do Pilar Fone: separar conversas por usuário do sistema
- [x] Abas do Pilar Fone: nenhuma marcada = nenhuma disponível (antes liberava todas)
- [x] Sem abas liberadas: botão lateral do Pilar Fone não aparece na web
- [x] Remover switch "Acesso ao Interfone" do cadastro de usuários (redundante com as abas)
- [x] Tela Campainha do interfone sem rolagem (layout flex, vídeos preenchem a tela) e sem relógio no topo
- [x] Nome da câmera na parte inferior da imagem, texto preto, sem borda/fundo

## 2026-09-04
- [x] Incrementar Android TV Signage para 1.6.0 e alinhar manifesto do APK
- [x] Incrementar Pilar Fone para 1.7.6 e alinhar manifesto do APK
- [x] Confirmar conclusão das duas releases no GitHub Actions após sincronização com a branch principal

## Validação técnica F01–F16 — 2026-09-11
- [x] Etapa 1 — Segurança: F01–F05 (RLS de SMS/push por estabelecimento implantada; SQL livre revogado; teste público aprovado)
- [x] Etapa 2 — Instalação e testes: F06 e F15 (instalação congelada, tipos, lint, 80 testes e build aprovados)
- [x] Etapa 3 — Funcionamento comercial: F07–F12 (dados reais, persistência e gravação transacional de etapas implementados)
- [x] Etapa 4 — Escala e usabilidade: F13, F14 e F16 (paginação/busca, detalhes sob demanda, recuperação de módulos e estados acessíveis)
- [ ] Homologação com usuário comum e administrador em dois estabelecimentos
- [x] Persistência somente de leitura após recarga e nova sessão
- [ ] Envio real de SMS/push com destinatários de homologação
- [ ] Revisar separadamente 131 alertas legados do verificador do banco, fora dos F01–F16
