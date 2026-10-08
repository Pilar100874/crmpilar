# Pilar Voz – Agente de IA (Android)

Aplicativo Android que faz o papel do servidor de voz: registra o ramal da IA na
central UCM, atende ligações, faz as ligações pedidas no CRM e escuta ramais
para sugerir respostas ao atendente.

- Ativação pela chave da empresa (Chaves dos aplicativos → tipo **Pilar Voz**).
- Deixe o aparelho na mesma rede (Wi‑Fi) da central, ligado na tomada.
- Ramal da IA na UCM: codec **PCMU**, UDP, sem TLS/SRTP.
- Usa a IA inclusa do sistema (qualidade gratuita). A qualidade Premium com
  Pipecat continua no `voice-agent-server`.

O APK é gerado pelo fluxo `.github/workflows/build-pilar-voz.yml`.
