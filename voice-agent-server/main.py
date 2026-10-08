"""
Servidor de Agentes de Voz do CRM Pilar (inspirado no Pipecat).

- Registra o ramal da IA na central UCM (SIP, áudio PCMU/PCMA 8 kHz).
- Atende ligações recebidas, faz ligações pedidas pelo CRM e escuta
  ligações para sugerir respostas ao atendente.
- Modo "gratuito": usa a IA inclusa no CRM (função voz-ia-turno).
- Modo "premium": usa o Pipecat com Deepgram + OpenAI/Anthropic + ElevenLabs/Cartesia
  e as chaves cadastradas na tela Agentes de Voz.
"""
import asyncio
import base64
import io
import os
import threading
import time
import wave
from datetime import datetime, timezone

import httpx
import numpy as np
from pyVoIP.VoIP import CallState, InvalidStateError, VoIPPhone
from supabase import create_client

SUPA_URL = os.environ["SUPABASE_URL"]
SUPA_KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
RUNNER_KEY = os.environ.get("RUNNER_KEY", "")
EMPRESA = os.environ["ESTABELECIMENTO_ID"]
UCM_HOST = os.environ["UCM_HOST"]
UCM_PORTA = int(os.environ.get("UCM_PORTA", "5060"))
SIP_SENHA = os.environ["SIP_SENHA"]
IP_LOCAL = os.environ.get("IP_LOCAL", "0.0.0.0")
CODIGO_ESCUTA = os.environ.get("CODIGO_ESCUTA", "*45")

db = create_client(SUPA_URL, SUPA_KEY)
FUNC = f"{SUPA_URL}/functions/v1"


def agora():
    return datetime.now(timezone.utc).isoformat()


def carregar_agente():
    r = (db.table("voz_agentes").select("*").eq("estabelecimento_id", EMPRESA)
         .eq("ativo", True).order("created_at").limit(1).execute())
    return r.data[0] if r.data else None


def chave(provedor: str) -> str | None:
    """Lê a chave do cofre do CRM (aip-credenciais, ação interna 'usar')."""
    try:
        r = httpx.post(f"{FUNC}/aip-credenciais", timeout=20, headers={
            "Authorization": f"Bearer {SUPA_KEY}", "x-aip-internal": "1"},
            json={"acao": "usar", "provedor": provedor, "estabelecimento_id": EMPRESA})
        return r.json().get("segredo") if r.status_code == 200 else None
    except Exception:
        return None


# ---------------- áudio ----------------
def pcm8u_para_wav(pcm8u: bytes) -> bytes:
    amostras = (np.frombuffer(pcm8u, dtype=np.uint8).astype(np.int16) - 128) << 8
    buf = io.BytesIO()
    with wave.open(buf, "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(8000)
        w.writeframes(amostras.tobytes())
    return buf.getvalue()


def wav_para_pcm8u(wav_bytes: bytes) -> bytes:
    with wave.open(io.BytesIO(wav_bytes)) as w:
        taxa, canais = w.getframerate(), w.getnchannels()
        dados = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16)
    if canais > 1:
        dados = dados.reshape(-1, canais).mean(axis=1).astype(np.int16)
    if taxa != 8000:
        n = int(len(dados) * 8000 / taxa)
        dados = np.interp(np.linspace(0, len(dados) - 1, n), np.arange(len(dados)), dados).astype(np.int16)
    return ((dados >> 8) + 128).astype(np.uint8).tobytes()


def energia(pcm8u: bytes) -> float:
    a = np.frombuffer(pcm8u, dtype=np.uint8).astype(np.int16) - 128
    return float(np.abs(a).mean()) if len(a) else 0.0


def tocar(call, pcm8u: bytes):
    for i in range(0, len(pcm8u), 160):
        if call.state != CallState.ANSWERED:
            return
        call.write_audio(pcm8u[i:i + 160])
        time.sleep(0.02)


# ---------------- registro da conversa ----------------
class Registro:
    def __init__(self, agente, modo, numero=None, ramal=None):
        self.inicio = time.time()
        self.falas, self.sugestoes = [], []
        r = db.table("voz_chamadas").insert({
            "estabelecimento_id": EMPRESA, "agente_id": agente["id"], "modo": modo,
            "numero": numero, "ramal_monitorado": ramal}).execute()
        self.id = r.data[0]["id"]

    def fala(self, papel, texto):
        self.falas.append({"papel": papel, "texto": texto, "em": agora()})
        db.table("voz_chamadas").update({"transcricao": self.falas}).eq("id", self.id).execute()

    def sugestao(self, texto):
        self.sugestoes.append({"texto": texto, "em": agora()})
        db.table("voz_chamadas").update({"sugestoes": self.sugestoes}).eq("id", self.id).execute()

    def fim(self, status="finalizada"):
        db.table("voz_chamadas").update({
            "status": status, "finalizada_em": agora(),
            "duracao_seg": int(time.time() - self.inicio)}).eq("id", self.id).execute()


# ---------------- modo gratuito (IA inclusa no CRM) ----------------
def turno_gratuito(agente, modo, falas, wav=None):
    r = httpx.post(f"{FUNC}/voz-ia-turno", timeout=60, headers={"x-runner-key": RUNNER_KEY}, json={
        "audio_wav_b64": base64.b64encode(wav).decode() if wav else None,
        "prompt": agente.get("prompt", ""), "historico": falas, "modo": modo,
        "voz": agente.get("voz") or "alloy"})
    r.raise_for_status()
    return r.json()


def falar_gratuito(call, agente, reg, texto):
    """Gera o áudio de uma frase fixa (ex.: saudação) pela IA inclusa."""
    try:
        r = httpx.post(f"{FUNC}/voz-ia-turno", timeout=60, headers={"x-runner-key": RUNNER_KEY}, json={
            "prompt": f"Diga exatamente, sem mudar nada: {texto}", "historico": [{"papel": "cliente", "texto": "."}],
            "modo": "receber", "voz": agente.get("voz") or "alloy"}).json()
        reg.fala("agente", texto)
        if r.get("audio_b64"):
            tocar(call, wav_para_pcm8u(base64.b64decode(r["audio_b64"])))
    except Exception as e:
        print("Falha na saudação:", e)


def sessao_gratuita(call, agente, reg, modo, objetivo=None):
    prompt_extra = f"\nObjetivo desta ligação: {objetivo}" if objetivo else ""
    agente = {**agente, "prompt": (agente.get("prompt") or "") + prompt_extra}
    if modo != "assistir" and agente.get("saudacao"):
        falar_gratuito(call, agente, reg, agente["saudacao"])
    trecho, silencio, falando = b"", 0, False
    while call.state == CallState.ANSWERED:
        quadro = call.read_audio(160, blocking=True)
        if energia(quadro) > 6:
            falando, silencio = True, 0
            trecho += quadro
        elif falando:
            trecho += quadro
            silencio += 1
            if silencio > 35:  # ~700 ms de silêncio = fim da fala
                if len(trecho) > 4000:
                    try:
                        r = turno_gratuito(agente, modo, reg.falas, pcm8u_para_wav(trecho))
                        if r.get("fala"):
                            reg.fala("cliente", r["fala"])
                        resp = (r.get("resposta") or "").strip()
                        if modo == "assistir":
                            if resp: reg.sugestao(resp)
                        elif resp:
                            reg.fala("agente", resp.replace("[TRANSFERIR]", "").replace("[DESLIGAR]", "").strip())
                            if r.get("audio_b64"):
                                tocar(call, wav_para_pcm8u(base64.b64decode(r["audio_b64"])))
                            if "[TRANSFERIR]" in resp and agente.get("ramal_transferencia"):
                                call.transfer(agente["ramal_transferencia"]) if hasattr(call, "transfer") else None
                                return
                            if "[DESLIGAR]" in resp:
                                call.hangup(); return
                    except Exception as e:
                        print("Erro no turno:", e)
                trecho, silencio, falando = b"", 0, False


# ---------------- modo premium (Pipecat) ----------------
def sessao_premium(call, agente, reg, modo, objetivo=None):
    from premium import rodar_pipecat
    chaves = {p: chave(p) for p in ("deepgram", "openai", "anthropic", "elevenlabs", "cartesia")}
    asyncio.run(rodar_pipecat(call, agente, reg, modo, objetivo, chaves))


def conduzir(call, modo, numero=None, ramal=None, objetivo=None):
    agente = carregar_agente()
    if not agente:
        call.hangup(); return
    reg = Registro(agente, modo, numero, ramal)
    try:
        if agente.get("qualidade") == "premium":
            sessao_premium(call, agente, reg, modo, objetivo)
        else:
            sessao_gratuita(call, agente, reg, modo, objetivo)
        reg.fim()
    except Exception as e:
        print("Erro na chamada:", e); reg.fim("erro")
    finally:
        try: call.hangup()
        except InvalidStateError: pass


# ---------------- central ----------------
def ao_receber(call):
    agente = carregar_agente()
    if not agente or "receber" not in (agente.get("modos") or []):
        call.deny(); return
    call.answer()
    conduzir(call, "receber", numero=str(getattr(call.request.headers.get("From", {}), "get", lambda *_: "")("number", "")))


def aguardar_atender(call, limite=45):
    t = time.time()
    while call.state == CallState.DIALING and time.time() - t < limite:
        time.sleep(0.3)
    return call.state == CallState.ANSWERED


def processar_comandos(fone):
    while True:
        try:
            r = (db.table("voz_comandos").select("*").eq("estabelecimento_id", EMPRESA)
                 .eq("status", "pendente").order("created_at").limit(1).execute())
            for cmd in r.data or []:
                db.table("voz_comandos").update({"status": "executando", "processado_em": agora()}).eq("id", cmd["id"]).execute()
                destino = cmd["numero"] if cmd["tipo"] == "ligar" else f"{CODIGO_ESCUTA}{cmd['ramal']}"
                call = fone.call(destino)
                if aguardar_atender(call):
                    modo = "ligar" if cmd["tipo"] == "ligar" else "assistir"
                    threading.Thread(target=conduzir, args=(call, modo, cmd.get("numero"), cmd.get("ramal"), cmd.get("objetivo")), daemon=True).start()
                    db.table("voz_comandos").update({"status": "concluido"}).eq("id", cmd["id"]).execute()
                else:
                    try: call.hangup()
                    except Exception: pass
                    db.table("voz_comandos").update({"status": "sem_resposta"}).eq("id", cmd["id"]).execute()
        except Exception as e:
            print("Erro nos comandos:", e)
        time.sleep(3)


def main():
    agente = carregar_agente()
    if not agente or not agente.get("ramal_ia"):
        raise SystemExit("Cadastre um agente ativo com o ramal da IA na tela Agentes de Voz.")
    fone = VoIPPhone(UCM_HOST, UCM_PORTA, agente["ramal_ia"], SIP_SENHA, myIP=IP_LOCAL, callCallback=ao_receber)
    fone.start()
    print(f"Ramal {agente['ramal_ia']} registrado em {UCM_HOST}. Aguardando ligações…")
    try:
        processar_comandos(fone)
    finally:
        fone.stop()


if __name__ == "__main__":
    main()
