import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { progressoVoz } from "../_shared/progressoVoz.ts";

/**
 * Modo "gratuito" dos Agentes de Voz: o servidor de voz envia o trecho de fala
 * do cliente (WAV) e recebe texto transcrito, resposta da IA e áudio da resposta.
 * Usa a IA inclusa no sistema. Protegido pela chave compartilhada AIP_RUNNER_KEY.
 */
const GW = "https://ai.gateway.lovable.dev/v1";
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const DIRETIVA =
  "Improve collaboration between squads and ensure all agents read the shared strategic memory before executing tasks.";

async function responder(key: string, sistema: string, historico: { papel: string; texto: string }[], modelo = "openai/gpt-5-nano") {
  const input = historico.map((h) => ({
    role: h.papel === "agente" ? "assistant" : "user",
    content: h.texto,
  }));
  const r = await fetch(`${GW}/responses`, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", "X-Lovable-AIG-SDK": "fetch" },
    body: JSON.stringify({
      model: modelo,
      instructions: sistema,
      input,
      stream: true,
      store: false,
      reasoning: { effort: "minimal" },
    }),
  });
  if (!r.ok || !r.body) throw Object.assign(new Error(await r.text()), { status: r.status });
  const reader = r.body.getReader();
  const dec = new TextDecoder();
  let buf = "", texto = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    const linhas = buf.split("\n");
    buf = linhas.pop() ?? "";
    for (const l of linhas) {
      if (!l.startsWith("data:")) continue;
      const d = l.slice(5).trim();
      if (!d || d === "[DONE]") continue;
      try {
        const ev = JSON.parse(d);
        if (ev.type === "response.output_text.delta") texto += ev.delta ?? "";
      } catch { /* ignora */ }
    }
  }
  return texto.trim();
}

const TRANSICAO_TXT = "Perfeito, vou te passar agora para o atendente, um instante.";
const TRANSICAO = `${TRANSICAO_TXT} [TRANSFERIR]`;
const CACHE_AUDIO = new Map<string, string>();

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const esperado = Deno.env.get("AIP_RUNNER_KEY");
  if (!esperado || req.headers.get("x-runner-key") !== esperado) return json({ error: "Não autorizado" }, 401);
  const key = Deno.env.get("LOVABLE_API_KEY");
  if (!key) return json({ error: "LOVABLE_API_KEY ausente" }, 500);

  try {
    const { audio_wav_b64, prompt = "", historico = [], modo = "receber", voz = "alloy", frase_exata = null, silencio = false, venda = false, forcar_transferencia = false } = await req.json();

    let fala = "";
    if (audio_wav_b64) {
      const bytes = Uint8Array.from(atob(audio_wav_b64), (c) => c.charCodeAt(0));
      const fd = new FormData();
      fd.append("model", "openai/gpt-4o-mini-transcribe");
      fd.append("language", "pt");
      fd.append("prompt", "Ligação comercial em português do Brasil. Respostas comuns: alô, sim, não, pode falar, recebi, não recebi, analisei, tenho dúvida, quero fechar, pode transferir, quanto fica, qual o valor, prazo, pagamento, boleto, orçamento, pedido, depois, agora não, obrigado.");
      fd.append("file", new Blob([bytes], { type: "audio/wav" }), "fala.wav");
      const s = await fetch(`${GW}/audio/transcriptions`, { method: "POST", headers: { Authorization: `Bearer ${key}` }, body: fd });
      if (!s.ok) return json({ error: "Falha na transcrição", details: await s.text() }, s.status);
      fala = String((await s.json()).text ?? "").trim();
      // Filtro de ruído/alucinação: caracteres não latinos ou fala curta sem letras úteis.
      const letras = fala.replace(/[^a-zA-ZÀ-ÿ]/g, "");
      if (/[^\u0000-\u024F\s.,!?'"-]/.test(fala) || (letras.length < 2 && !/^(é|e|ah|oi|ok)$/i.test(fala.replace(/[^a-zA-ZÀ-ÿ]/g, "")))) fala = "";
      // Ruído transcrito como inglês ou frases-fantasma comuns do transcritor.
      if (/\b(the|you|are|which|thank|this|is|what)\b/i.test(fala) && !/[ãõçéêáíóú]/i.test(fala)) fala = "";
      if (/legenda|inscreva|obrigad[oa] por assistir/i.test(fala)) fala = "";
    }
    if (!fala && audio_wav_b64 && !forcar_transferencia) return json({ fala: "", resposta: "", audio_b64: null });

    const hist = [...historico, ...(fala ? [{ papel: "cliente", texto: fala }] : silencio ? [{ papel: "cliente", texto: "(o cliente ficou em silêncio, não disse nada)" }] : [])];
    const progresso = progressoVoz(historico, fala, silencio);
    const notaAvanco = `\n\nCONTROLE DE PROGRESSO: "espere a resposta" significa aguardar ENTRE turnos. Quando o cliente responde à última pergunta, essa etapa já foi cumprida: aplique suas condições e avance, sem repetir a pergunta nem reiniciar o roteiro. "Sim" e "não" valem como respostas completas à última pergunta; não são automaticamente pedido de transferência. Alô não é resposta ao orçamento. Não leia instruções como "uma pergunta, espere a resposta" em voz alta.${progresso.respostaOrcamento === "analisou" ? " O cliente CONFIRMOU que analisou o orçamento. NÃO pergunte novamente se olhou; siga as regras desta etapa ou pergunte apenas o que falta para fechar." : progresso.respostaOrcamento === "nao_analisou" ? " O cliente disse que NÃO analisou o orçamento. NÃO repita a pergunta; siga as regras desta etapa ou pergunte qual dia pode retornar." : ""}`;
    const sistema = modo === "assistir"
      ? `Você ajuda um atendente humano durante uma ligação. Leia a conversa e devolva UMA sugestão curta (até 2 frases) do que o atendente pode dizer agora. Responda em português. ${DIRETIVA}\n\nContexto: ${prompt}`
      : `Você é um agente de voz ao telefone. ${venda ? "Nesta ligação há um bloco de VENDA: nele você pode conversar livremente sobre produtos, estoque, preços e similares do CATÁLOGO, fazendo perguntas de venda; fora dele, siga o roteiro. " : ""}Fale em português do Brasil como uma pessoa real: no máximo 2 frases curtas por fala; só faça perguntas que estejam no ROTEIRO, nunca invente perguntas novas (se o roteiro não prevê próxima pergunta, apenas confirme e siga a etapa seguinte ou encerre); sem listas, emojis, markdown ou números de pedido. Responda ao que o cliente acabou de dizer antes de seguir o roteiro, uma etapa por fala. Se não entendeu, peça para repetir em poucas palavras. Se ouvir caixa postal ou mensagem de operadora, responda apenas "[DESLIGAR]". ${venda ? "Dúvidas sobre produtos, preço ou estoque você responde com o CATÁLOGO. " : 'Se o cliente pedir ajuda, explicação ou disser que não entendeu a proposta, não improvise: diga uma frase curta de transição e inclua "[TRANSFERIR]". '}Se o cliente disser "humano" ou pedir uma pessoa, em qualquer etapa, diga uma frase curta e inclua "[TRANSFERIR]". Use "[TRANSFERIR]" só quando a última fala do cliente pedir isso ou mostrar interesse explícito; nunca na mesma fala em que você faz uma pergunta, nunca na sua primeira ou segunda fala sem resposta do cliente. Para encerrar, termine com "[DESLIGAR]". ${DIRETIVA}\n\n${prompt}`;
    const GATILHO = /(\bhumano\b|d[uú]vida|fechar|quanto fica|qual (o )?valor|pre[çc]o|prazo|pagamento|transfer|vendedor|atendente|falar com algu[eé]m|\bajuda\b|me explica|explicar|orienta|n[aã]o entendi)/i;
    // No bloco de venda, preço/prazo/dúvida são negociação: só "humano"/atendente transfere direto.
    const GATILHO_VENDA = /(\bhumano\b|transfer|vendedor|atendente|falar com algu[eé]m)/i;
    const regraOuro = fala && (venda ? GATILHO_VENDA : GATILHO).test(fala)
      ? `\n\nREGRA DE OURO: o cliente acabou de dizer "${fala}". NÃO faça pergunta. Diga uma frase curta de transição (ex.: "Perfeito, vou te passar agora para o atendente, um instante.") e inclua [TRANSFERIR].`
      : "";
    // Atalhos sem LLM (economizam ~1s): frase exata (saudação) e transferência imediata.
    const exata = typeof frase_exata === "string" && frase_exata.trim() ? frase_exata.trim() : null;
    let resposta = exata && modo !== "assistir"
      ? exata
      : silencio && modo !== "assistir" && progresso.respostaSilencio
        ? progresso.respostaSilencio
      : progresso.respostaSaudacao && modo !== "assistir"
        ? progresso.respostaSaudacao
      : regraOuro && modo !== "assistir"
        ? TRANSICAO
        : await responder(key, sistema + regraOuro + notaAvanco, hist);
    // Resposta vazia do modelo deixava o cliente sem retorno e disparava "consegue me ouvir?".
    if (modo !== "assistir" && !resposta?.replace(/\[(TRANSFERIR|DESLIGAR|FLUXO:[^\]]*)\]/g, "").trim() && (fala || silencio)) {
      resposta = await responder(key, sistema + regraOuro + notaAvanco, hist, "google/gemini-2.5-flash").catch(() => "");
      if (!resposta?.trim()) resposta = progresso.respostaOrcamento === "analisou"
        ? "Que bom! Ficou alguma dúvida ou podemos seguir com o pedido?"
        : progresso.respostaOrcamento === "nao_analisou"
          ? "Sem problema. Qual dia fica melhor para eu te retornar?"
          : "Perfeito. Posso seguir com o motivo da minha ligação?";
    }
    // Trava: só transfere se o cliente falou neste turno e a IA não terminou perguntando.
    if (modo !== "assistir" && !forcar_transferencia && resposta?.includes("[TRANSFERIR]")) {
      const limpa = resposta.replace(/\[TRANSFERIR\]/g, "").trim();
      if (!fala || (!regraOuro && /\?\s*$/.test(limpa))) resposta = limpa;
    }

    let audio_b64: string | null = null;
    if (modo !== "assistir" && resposta) {
      const falar = resposta.replace(/\[(TRANSFERIR|DESLIGAR|FLUXO:[^\]]*)\]/g, "").trim();
      const ck = `${voz}|${falar}`;
      const audioSalvo = CACHE_AUDIO.get(ck);
      if (falar && audioSalvo) audio_b64 = audioSalvo;
      else if (falar) {
        const t = await fetch(`${GW}/audio/speech`, {
          method: "POST",
          headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
          body: JSON.stringify({ model: "openai/gpt-4o-mini-tts", input: falar, voice: voz, response_format: "wav" }),
        });
        if (t.ok) {
          const b = new Uint8Array(await t.arrayBuffer());
          let s = "";
          for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode(...b.subarray(i, i + 0x8000));
          audio_b64 = btoa(s);
          // Guarda falas curtas repetidas (saudação, transição) para tocar na hora nas próximas ligações.
          if (exata || resposta.startsWith(TRANSICAO_TXT)) {
            if (CACHE_AUDIO.size > 200) CACHE_AUDIO.clear();
            CACHE_AUDIO.set(ck, audio_b64);
          }
        }
      }
    }
    return json({ fala, resposta, audio_b64 });
  } catch (e) {
    const st = (e as { status?: number }).status ?? 500;
    return json({ error: (e as Error).message }, st);
  }
});
