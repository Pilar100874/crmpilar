type FalaVoz = { papel: string; texto: string };
const normalizar = (t: string) => t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

/** Interpreta respostas curtas no contexto da última pergunta, sem decidir pelo cliente. */
export function progressoVoz(historico: FalaVoz[], fala: string, silencio: boolean) {
  const ultima = [...historico].reverse().find((h) => h.papel === "agente")?.texto ?? "";
  const pergunta = normalizar(ultima);
  const resposta = normalizar(fala).trim();
  const perguntaOrcamento = /orcamento|proposta/.test(pergunta) && /olhada|analis|olhar|verific|avali|viu|leu/.test(pergunta);
  const negativa = /\b(nao|ainda nao|nem olhei|nao consegui)\b/.test(resposta);
  const afirmativa = /\b(sim|ja vi|ja olhei|ja analisei|consegui|olhei|analisei|dei uma olhada)\b/.test(resposta);
  const respostaOrcamento = perguntaOrcamento && resposta
    ? negativa ? "nao_analisou" : afirmativa ? "analisou" : null
    : null;
  const ultimoCliente = historico.map((h) => h.papel).lastIndexOf("cliente");
  const falasSemResposta = historico.slice(ultimoCliente + 1).filter((h) => h.papel === "agente");
  const jaChecouAudio = falasSemResposta.some((h) => /consegue me ouvir|esta me ouvindo|nao estou conseguindo ouvir/i.test(normalizar(h.texto)));
  const encerrarSilencio = silencio && jaChecouAudio;
  // Cliente respondeu e a IA ainda não respondeu: o silêncio é espera pela IA, não falta de áudio.
  const clienteSemResposta = historico.length > 0 && historico[historico.length - 1].papel === "cliente" && normalizar(historico[historico.length - 1].texto).replace(/[^a-z]/g, "").length > 0;
  const respostaSilencio = !silencio || clienteSemResposta ? null : encerrarSilencio
    ? "Não estou conseguindo ouvir sua resposta. Obrigado pela atenção, até mais. [DESLIGAR]"
    : "Alô, consegue me ouvir?";
  // "Alô" no início (antes de qualquer resposta real) é cumprimento, não resposta: repete só a última pergunta.
  const apenasSaudacao = /^(alo+|ola|oi|pronto|bom dia|boa tarde|boa noite|quem fala|quem e|sim\??)?[\s,.!?]*(alo+|ola|oi|pronto|bom dia|boa tarde|boa noite|quem fala|quem e)[\s,.!?]*$/.test(resposta);
  const clienteJaFalou = historico.some((h) => h.papel === "cliente");
  const perguntaAtual = (ultima.match(/[^.!?]*\?/g) ?? []).pop()?.trim() ?? "";
  const respostaSaudacao = !silencio && apenasSaudacao && !clienteJaFalou && perguntaAtual
    ? `Oi, tudo bem? ${perguntaAtual}`
    : null;
  return { respostaOrcamento, encerrarSilencio, respostaSilencio, respostaSaudacao };
}