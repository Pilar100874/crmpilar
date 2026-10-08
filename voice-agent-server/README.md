# Servidor de Agentes de Voz (Pipecat + central UCM)

Registra um ramal da IA na central e:
- **Atende ligações** recebidas nesse ramal (coloque-o numa fila/URA da UCM);
- **Faz ligações** pedidas na tela *Agentes de Voz → Ligar*;
- **Ajuda o atendente**: entra em escuta silenciosa no ramal e mostra sugestões ao vivo.

## Importante sobre onde rodar
O áudio do telefone (RTP/UDP) precisa ir e voltar entre a central e este servidor.
O Railway **não recebe UDP de fora**, então o servidor deve rodar numa máquina
na mesma rede da central (ou com VPN até ela). O mesmo `Dockerfile` serve para os dois.

## Na central UCM
1. Crie um ramal SIP para a IA (ex.: 7000), codec **PCMU/PCMA**, sem TLS/SRTP.
2. Ative o código de escuta (Spy/Listen) e coloque-o em `CODIGO_ESCUTA`.

## Rodar
```bash
cp .env.example .env   # preencha
docker build -t pilar-voz . && docker run --env-file .env --network host pilar-voz
```

## Qualidade
- **Gratuita**: usa a IA inclusa do CRM; mais lenta entre as falas.
- **Premium**: Pipecat com Deepgram + OpenAI/Anthropic + ElevenLabs/Cartesia, usando as
  chaves cadastradas na aba *Chaves* da tela Agentes de Voz.
