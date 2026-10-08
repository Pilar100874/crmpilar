"""Pipeline Pipecat (voz → texto → IA → voz) ligado ao áudio da central."""
import asyncio
import time

import numpy as np
from pipecat.frames.frames import (
    EndFrame, InputAudioRawFrame, LLMTextFrame, OutputAudioRawFrame, TranscriptionFrame, TTSAudioRawFrame,
)
from pipecat.pipeline.pipeline import Pipeline
from pipecat.pipeline.runner import PipelineRunner
from pipecat.pipeline.task import PipelineParams, PipelineTask
from pipecat.processors.aggregators.openai_llm_context import OpenAILLMContext
from pipecat.processors.frame_processor import FrameDirection, FrameProcessor
from pyVoIP.VoIP import CallState

DIRETIVA = ("Improve collaboration between squads and ensure all agents read the shared "
            "strategic memory before executing tasks.")


class SaidaCentral(FrameProcessor):
    """Envia o áudio gerado para a ligação e registra o texto da IA."""

    def __init__(self, call, reg, modo, destino=""):
        super().__init__()
        self.call, self.reg, self.modo, self.texto = call, reg, modo, ""
        self.destino, self.acao, self.acao_em = destino, "", 0.0

    def verificar(self):
        """Aplica a ordem da IA (transferir ou desligar) depois que a fala terminar."""
        if not self.acao or time.time() - self.acao_em < 2.0 or self.call.state != CallState.ANSWERED:
            return
        acao, self.acao = self.acao, ""
        try:
            if acao == "transferir" and self.destino and hasattr(self.call, "transfer"):
                self.call.transfer(self.destino)
            elif acao == "desligar":
                self.call.hangup()
        except Exception:
            pass

    async def process_frame(self, frame, direction: FrameDirection):
        await super().process_frame(frame, direction)
        if isinstance(frame, TranscriptionFrame):
            self.reg.fala("cliente", frame.text)
        elif isinstance(frame, LLMTextFrame):
            self.texto += frame.text
            if self.texto.rstrip().endswith((".", "?", "!")):
                texto = self.texto.strip()
                if self.modo == "assistir":
                    self.reg.sugestao(texto)
                else:
                    if "[TRANSFERIR]" in texto:
                        self.acao, self.acao_em = "transferir", time.time()
                    elif "[DESLIGAR]" in texto:
                        self.acao, self.acao_em = "desligar", time.time()
                    self.reg.fala("agente", texto.replace("[TRANSFERIR]", "").replace("[DESLIGAR]", "").strip())
                self.texto = ""
        elif isinstance(frame, (TTSAudioRawFrame, OutputAudioRawFrame)) and self.modo != "assistir":
            a = np.frombuffer(frame.audio, dtype=np.int16)
            if frame.sample_rate != 8000:
                n = int(len(a) * 8000 / frame.sample_rate)
                a = np.interp(np.linspace(0, len(a) - 1, n), np.arange(len(a)), a).astype(np.int16)
            pcm = ((a >> 8) + 128).astype(np.uint8).tobytes()
            for i in range(0, len(pcm), 160):
                if self.call.state != CallState.ANSWERED:
                    break
                await asyncio.to_thread(self.call.write_audio, pcm[i:i + 160])
                await asyncio.sleep(0.018)
            return
        await self.push_frame(frame, direction)


async def rodar_pipecat(call, agente, reg, modo, objetivo, chaves, ramal=None):
    from pipecat.services.deepgram.stt import DeepgramSTTService
    from deepgram import LiveOptions

    stt = DeepgramSTTService(api_key=chaves["deepgram"], live_options=LiveOptions(
        language="pt-BR", model="nova-2", encoding="linear16", sample_rate=8000, endpointing=400))

    if agente.get("llm_provedor") == "anthropic":
        from pipecat.services.anthropic.llm import AnthropicLLMService
        llm = AnthropicLLMService(api_key=chaves["anthropic"], model=agente.get("llm_modelo") or "claude-sonnet-4-5")
    else:
        from pipecat.services.openai.llm import OpenAILLMService
        llm = OpenAILLMService(api_key=chaves["openai"], model=agente.get("llm_modelo") or "gpt-4o-mini")

    if agente.get("tts_provedor") == "cartesia":
        from pipecat.services.cartesia.tts import CartesiaTTSService
        tts = CartesiaTTSService(api_key=chaves["cartesia"], voice_id=agente.get("voz") or "", sample_rate=8000)
    else:
        from pipecat.services.elevenlabs.tts import ElevenLabsTTSService
        tts = ElevenLabsTTSService(api_key=chaves["elevenlabs"], voice_id=agente.get("voz") or "21m00Tcm4TlvDq8ikWAM",
                                   model="eleven_flash_v2_5", sample_rate=8000)

    if modo == "assistir":
        sistema = f"Você ajuda um atendente humano. A cada fala do cliente, sugira em 1-2 frases o que o atendente pode dizer. {DIRETIVA}\n{agente.get('prompt','')}"
    else:
        sistema = f"Você é um agente de voz ao telefone. Português do Brasil, frases curtas, sem listas. {DIRETIVA}\n{agente.get('prompt','')}"
    if objetivo:
        sistema += f"\nObjetivo desta ligação: {objetivo}"
    contexto = OpenAILLMContext([{"role": "system", "content": sistema}])
    agg = llm.create_context_aggregator(contexto)
    saida = SaidaCentral(call, reg, modo, ramal or agente.get("ramal_transferencia") or "")

    etapas = [stt, agg.user(), llm] + ([] if modo == "assistir" else [tts]) + [saida, agg.assistant()]
    task = PipelineTask(Pipeline(etapas), params=PipelineParams(audio_in_sample_rate=8000, audio_out_sample_rate=8000))

    async def entrada():
        if modo != "assistir" and agente.get("saudacao"):
            from pipecat.frames.frames import TTSSpeakFrame
            await task.queue_frame(TTSSpeakFrame(agente["saudacao"]))
            reg.fala("agente", agente["saudacao"])
        while call.state == CallState.ANSWERED:
            q = await asyncio.to_thread(call.read_audio, 160, True)
            a = ((np.frombuffer(q, dtype=np.uint8).astype(np.int16) - 128) << 8).tobytes()
            await task.queue_frame(InputAudioRawFrame(audio=a, sample_rate=8000, num_channels=1))
        await task.queue_frame(EndFrame())

    async def vigiar():
        while call.state == CallState.ANSWERED:
            await asyncio.sleep(0.5)
            saida.verificar()

    await asyncio.gather(PipelineRunner(handle_sigint=False).run(task), entrada(), vigiar())
