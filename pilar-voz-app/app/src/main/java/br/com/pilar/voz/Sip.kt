package br.com.pilar.voz

import java.net.DatagramPacket
import java.net.DatagramSocket
import java.net.InetAddress
import java.net.InetSocketAddress
import java.security.MessageDigest
import java.util.UUID
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.LinkedBlockingQueue
import java.util.concurrent.TimeUnit
import kotlin.random.Random

/** Mensagem SIP já interpretada. */
class SipMsg(val linha: String, val cab: Map<String, List<String>>, val corpo: String) {
    val ehResposta get() = linha.startsWith("SIP/2.0")
    val status get() = if (ehResposta) linha.split(" ")[1].toInt() else 0
    val metodo get() = if (ehResposta) (h("cseq") ?: "").substringAfter(" ").trim() else linha.substringBefore(" ")
    fun h(n: String) = cab[n.lowercase()]?.firstOrNull()
    fun todos(n: String) = cab[n.lowercase()] ?: emptyList()

    companion object {
        private val CURTOS = mapOf("v" to "via", "f" to "from", "t" to "to", "i" to "call-id", "m" to "contact", "l" to "content-length", "c" to "content-type")
        fun ler(txt: String): SipMsg? {
            val partes = txt.split("\r\n\r\n", limit = 2)
            val linhas = partes[0].split("\r\n")
            if (linhas.isEmpty()) return null
            val cab = LinkedHashMap<String, MutableList<String>>()
            linhas.drop(1).forEach { l ->
                val i = l.indexOf(':'); if (i <= 0) return@forEach
                var nome = l.substring(0, i).trim().lowercase(); nome = CURTOS[nome] ?: nome
                cab.getOrPut(nome) { mutableListOf() }.add(l.substring(i + 1).trim())
            }
            return SipMsg(linhas[0], cab, partes.getOrElse(1) { "" })
        }
    }
}

/** Uma ligação (diálogo SIP) com seu fluxo de áudio RTP. */
class Chamada(val agente: SipAgente, val callId: String, val entrada: Boolean, val numero: String) {
    @Volatile var ativa = false
    @Volatile var encerrada = false
    var tagLocal = gerarTag(); var tagRemota = ""
    var deCab = ""; var paraCab = ""; var alvoRemoto = ""
    var cseq = 1
    var conviteRecebido: SipMsg? = null
    val rtp = Rtp()
    val respostas = LinkedBlockingQueue<SipMsg>()
    var aoEncerrar: (() -> Unit)? = null

    fun desligar() {
        if (encerrada) return
        if (ativa) agente.enviarNoDialogo(this, "BYE")
        else if (!entrada) agente.enviarNoDialogo(this, "CANCEL")
        encerrar()
    }

    fun transferir(ramal: String) {
        if (!ativa) return
        agente.enviarNoDialogo(this, "REFER", "Refer-To: <sip:$ramal@${agente.host}>\r\nReferred-By: <sip:${agente.ramal}@${agente.host}>\r\n")
    }

    fun encerrar() {
        if (encerrada) return
        encerrada = true; ativa = false; rtp.parar()
        agente.chamadas.remove(callId); aoEncerrar?.invoke()
    }

    companion object { fun gerarTag() = UUID.randomUUID().toString().take(10) }
}

/**
 * Cliente SIP mínimo (UDP) para a central UCM: registra o ramal da IA,
 * atende/faz ligações em PCMU e transfere com REFER.
 */
class SipAgente(
    val host: String, private val porta: Int, val ramal: String, private val senha: String,
    private val log: (String) -> Unit, private val aoReceber: (Chamada) -> Unit,
) {
    private val sock = DatagramSocket()
    private val destino = InetSocketAddress(host, porta)
    val ipLocal: String = DatagramSocket().use { it.connect(InetAddress.getByName(host), porta); it.localAddress.hostAddress ?: "0.0.0.0" }
    private val portaLocal = sock.localPort
    val chamadas = ConcurrentHashMap<String, Chamada>()
    private val regResp = LinkedBlockingQueue<SipMsg>()
    @Volatile private var rodando = true
    @Volatile var registrado = false
    private val regCallId = UUID.randomUUID().toString()
    private val regTag = Chamada.gerarTag()
    private var regCseq = 1

    init { Thread(::receber, "sip-rx").apply { isDaemon = true }.start() }

    private fun via() = "Via: SIP/2.0/UDP $ipLocal:$portaLocal;branch=z9hG4bK${UUID.randomUUID().toString().take(12)};rport"
    private fun contato() = "Contact: <sip:$ramal@$ipLocal:$portaLocal;transport=udp>"

    private fun enviar(txt: String) {
        val b = txt.toByteArray()
        sock.send(DatagramPacket(b, b.size, destino))
    }

    private fun montar(metodo: String, uri: String, cab: List<String>, corpo: String = ""): String {
        val sb = StringBuilder("$metodo $uri SIP/2.0\r\n")
        cab.forEach { sb.append(it).append("\r\n") }
        sb.append("Max-Forwards: 70\r\nUser-Agent: Pilar Voz\r\n")
        if (corpo.isNotEmpty()) sb.append("Content-Type: application/sdp\r\n")
        sb.append("Content-Length: ${corpo.toByteArray().size}\r\n\r\n").append(corpo)
        return sb.toString()
    }

    private fun md5(s: String) = MessageDigest.getInstance("MD5").digest(s.toByteArray()).joinToString("") { "%02x".format(it) }

    /** Cabeçalho de autenticação Digest a partir do desafio 401/407. */
    private fun autenticar(desafio: SipMsg, metodo: String, uri: String): String {
        val proxy = desafio.status == 407
        val linha = (if (proxy) desafio.h("proxy-authenticate") else desafio.h("www-authenticate")) ?: ""
        fun p(n: String) = Regex("""$n="?([^",]+)"?""").find(linha)?.groupValues?.get(1) ?: ""
        val realm = p("realm"); val nonce = p("nonce"); val qop = p("qop"); val opaque = p("opaque")
        val ha1 = md5("$ramal:$realm:$senha"); val ha2 = md5("$metodo:$uri")
        val cnonce = UUID.randomUUID().toString().take(8); val nc = "00000001"
        val resp = if (qop.isNotEmpty()) md5("$ha1:$nonce:$nc:$cnonce:auth:$ha2") else md5("$ha1:$nonce:$ha2")
        val extra = (if (qop.isNotEmpty()) ",qop=auth,nc=$nc,cnonce=\"$cnonce\"" else "") + (if (opaque.isNotEmpty()) ",opaque=\"$opaque\"" else "")
        val nome = if (proxy) "Proxy-Authorization" else "Authorization"
        return "$nome: Digest username=\"$ramal\",realm=\"$realm\",nonce=\"$nonce\",uri=\"$uri\",response=\"$resp\",algorithm=MD5$extra"
    }

    fun registrar(expira: Int = 300): Boolean {
        val uri = "sip:$host"
        fun req(auth: String?) = montar("REGISTER", uri, listOfNotNull(
            via(), "From: <sip:$ramal@$host>;tag=$regTag", "To: <sip:$ramal@$host>", "Call-ID: $regCallId",
            "CSeq: ${regCseq++} REGISTER", contato(), "Expires: $expira", auth))
        regResp.clear(); enviar(req(null))
        var r = regResp.poll(5, TimeUnit.SECONDS) ?: return false.also { registrado = false; log("Central não respondeu") }
        if (r.status == 401 || r.status == 407) {
            enviar(req(autenticar(r, "REGISTER", uri)))
            r = regResp.poll(5, TimeUnit.SECONDS) ?: return false.also { registrado = false }
        }
        registrado = r.status in 200..299
        if (!registrado) log("Registro recusado (${r.status}). Confira ramal e senha.")
        return registrado
    }

    private fun sdp(rtpPorta: Int) = "v=0\r\no=pilar 1 1 IN IP4 $ipLocal\r\ns=Pilar Voz\r\nc=IN IP4 $ipLocal\r\nt=0 0\r\n" +
        "m=audio $rtpPorta RTP/AVP 0 101\r\na=rtpmap:0 PCMU/8000\r\na=rtpmap:101 telephone-event/8000\r\na=ptime:20\r\na=sendrecv\r\n"

    private fun destinoRtp(corpo: String): InetSocketAddress? {
        val ip = Regex("""c=IN IP4 ([0-9.]+)""").find(corpo)?.groupValues?.get(1) ?: return null
        val p = Regex("""m=audio (\d+)""").find(corpo)?.groupValues?.get(1)?.toInt() ?: return null
        return InetSocketAddress(ip, p)
    }

    /** Liga para um número/ramal e aguarda o atendimento. */
    fun ligar(numero: String, limiteSeg: Int = 45): Chamada? {
        val c = Chamada(this, UUID.randomUUID().toString(), false, numero)
        val uri = "sip:$numero@$host"
        c.alvoRemoto = uri; c.deCab = "<sip:$ramal@$host>;tag=${c.tagLocal}"; c.paraCab = "<$uri>"
        chamadas[c.callId] = c
        val corpo = sdp(c.rtp.porta)
        fun convite(auth: String?) = montar("INVITE", uri, listOfNotNull(via(), "From: ${c.deCab}", "To: ${c.paraCab}",
            "Call-ID: ${c.callId}", "CSeq: ${c.cseq} INVITE", contato(), auth), corpo)
        enviar(convite(null))
        val limite = System.currentTimeMillis() + limiteSeg * 1000L
        while (System.currentTimeMillis() < limite) {
            val r = c.respostas.poll(1, TimeUnit.SECONDS) ?: continue
            if (r.metodo != "INVITE") continue
            when {
                r.status == 401 || r.status == 407 -> { ack(c, r); c.cseq++; enviar(convite(autenticar(r, "INVITE", uri))) }
                r.status in 100..199 -> Unit
                r.status in 200..299 -> {
                    c.tagRemota = Regex("""tag=([^;>\s]+)""").find(r.h("to") ?: "")?.groupValues?.get(1) ?: ""
                    c.paraCab = r.h("to") ?: c.paraCab
                    Regex("""<([^>]+)>""").find(r.h("contact") ?: "")?.groupValues?.get(1)?.let { c.alvoRemoto = it }
                    ack(c, r)
                    val d = destinoRtp(r.corpo) ?: return null.also { c.desligar() }
                    c.rtp.iniciar(d); c.ativa = true
                    return c
                }
                else -> { ack(c, r); log("Ligação para $numero recusada (${r.status})"); c.encerrar(); return null }
            }
        }
        c.desligar(); return null
    }

    private fun ack(c: Chamada, r: SipMsg) {
        val uri = if (r.status in 200..299) c.alvoRemoto else "sip:${c.numero}@$host"
        enviar(montar("ACK", uri, listOf(via(), "From: ${c.deCab}", "To: ${r.h("to")}", "Call-ID: ${c.callId}", "CSeq: ${c.cseq} ACK")))
    }

    fun enviarNoDialogo(c: Chamada, metodo: String, extra: String = "") {
        if (metodo != "CANCEL") c.cseq++
        val cab = mutableListOf(via(), "From: ${c.deCab}", "To: ${c.paraCab}", "Call-ID: ${c.callId}", "CSeq: ${c.cseq} $metodo", contato())
        extra.split("\r\n").filter { it.isNotBlank() }.forEach { cab.add(it) }
        enviar(montar(metodo, c.alvoRemoto, cab))
    }

    private fun responder(req: SipMsg, codigo: Int, frase: String, tag: String? = null, corpo: String = "") {
        val sb = StringBuilder("SIP/2.0 $codigo $frase\r\n")
        req.todos("via").forEach { sb.append("Via: $it\r\n") }
        sb.append("From: ${req.h("from")}\r\n")
        val para = req.h("to") ?: ""
        sb.append("To: ${if (tag != null && !para.contains("tag=")) "$para;tag=$tag" else para}\r\n")
        sb.append("Call-ID: ${req.h("call-id")}\r\nCSeq: ${req.h("cseq")}\r\n").append(contato()).append("\r\nUser-Agent: Pilar Voz\r\n")
        if (corpo.isNotEmpty()) sb.append("Content-Type: application/sdp\r\n")
        sb.append("Content-Length: ${corpo.toByteArray().size}\r\n\r\n").append(corpo)
        enviar(sb.toString())
    }

    /** Atende uma ligação recebida. */
    fun atender(c: Chamada) {
        val inv = c.conviteRecebido ?: return
        val d = destinoRtp(inv.corpo) ?: return responder(inv, 488, "Not Acceptable Here", c.tagLocal)
        responder(inv, 200, "OK", c.tagLocal, sdp(c.rtp.porta))
        c.rtp.iniciar(d); c.ativa = true
    }

    fun recusar(c: Chamada) { c.conviteRecebido?.let { responder(it, 486, "Busy Here", c.tagLocal) }; c.encerrar() }

    private fun receber() {
        val buf = ByteArray(8192)
        while (rodando) {
            try {
                val p = DatagramPacket(buf, buf.size); sock.receive(p)
                val m = SipMsg.ler(String(p.data, 0, p.length)) ?: continue
                val callId = m.h("call-id") ?: continue
                if (m.ehResposta) {
                    if (callId == regCallId) regResp.offer(m) else chamadas[callId]?.respostas?.offer(m)
                    continue
                }
                when (m.metodo) {
                    "INVITE" -> {
                        if (chamadas.containsKey(callId)) continue // retransmissão
                        responder(m, 100, "Trying")
                        val de = m.h("from") ?: ""
                        val numero = Regex("""sip:([^@;>]+)""").find(de)?.groupValues?.get(1) ?: ""
                        val c = Chamada(this, callId, true, numero)
                        c.conviteRecebido = m
                        c.tagRemota = Regex("""tag=([^;>\s]+)""").find(de)?.groupValues?.get(1) ?: ""
                        c.deCab = "${m.h("to")};tag=${c.tagLocal}"; c.paraCab = de
                        c.alvoRemoto = Regex("""<([^>]+)>""").find(m.h("contact") ?: "")?.groupValues?.get(1) ?: "sip:$numero@$host"
                        chamadas[callId] = c
                        responder(m, 180, "Ringing", c.tagLocal)
                        Thread { aoReceber(c) }.start()
                    }
                    "BYE" -> { responder(m, 200, "OK"); chamadas[callId]?.encerrar() }
                    "CANCEL" -> {
                        responder(m, 200, "OK")
                        chamadas[callId]?.let { c -> c.conviteRecebido?.let { responder(it, 487, "Request Terminated", c.tagLocal) }; c.encerrar() }
                    }
                    "ACK" -> Unit
                    "NOTIFY" -> {
                        responder(m, 200, "OK")
                        if (m.corpo.contains("SIP/2.0 200")) chamadas[callId]?.desligar() // transferência concluída
                    }
                    else -> responder(m, 200, "OK")
                }
            } catch (_: Exception) { if (!rodando) break }
        }
    }

    fun parar() {
        rodando = false
        chamadas.values.toList().forEach { it.desligar() }
        runCatching { registrar(0) }
        sock.close()
    }
}

/** Áudio RTP em PCMU, quadros de 20 ms (160 amostras). */
class Rtp {
    private val sock = DatagramSocket(0)
    val porta: Int get() = sock.localPort
    val entrada = LinkedBlockingQueue<ShortArray>()
    private val saida = LinkedBlockingQueue<ShortArray>()
    @Volatile private var rodando = false
    @Volatile var falando = false; private set

    fun iniciar(destino: InetSocketAddress) {
        rodando = true
        Thread({
            val buf = ByteArray(2048)
            while (rodando) {
                try {
                    val p = DatagramPacket(buf, buf.size); sock.receive(p)
                    if (p.length <= 12 || (buf[1].toInt() and 0x7F) != 0) continue
                    val cc = buf[0].toInt() and 0x0F
                    val ini = 12 + cc * 4
                    entrada.offer(ShortArray(p.length - ini) { Audio.ulawParaPcm(buf[ini + it]) })
                    while (entrada.size > 500) entrada.poll()
                } catch (_: Exception) { if (!rodando) break }
            }
        }, "rtp-rx").apply { isDaemon = true }.start()
        Thread({
            var seq = Random.nextInt(0, 65535); var ts = Random.nextLong(0, 1L shl 31); val ssrc = Random.nextInt()
            val silencio = ShortArray(160)
            var proximo = System.nanoTime()
            while (rodando) {
                val q = saida.poll()
                falando = q != null || saida.isNotEmpty()
                val quadro = q ?: silencio
                val pkt = ByteArray(12 + 160)
                pkt[0] = 0x80.toByte(); pkt[1] = 0
                pkt[2] = (seq shr 8).toByte(); pkt[3] = seq.toByte()
                for (i in 0..3) pkt[4 + i] = (ts shr (24 - i * 8)).toByte()
                for (i in 0..3) pkt[8 + i] = (ssrc shr (24 - i * 8)).toByte()
                for (i in 0 until 160) pkt[12 + i] = Audio.pcmParaUlaw(if (i < quadro.size) quadro[i] else 0)
                runCatching { sock.send(DatagramPacket(pkt, pkt.size, destino)) }
                seq = (seq + 1) and 0xFFFF; ts += 160
                proximo += 20_000_000L
                val espera = (proximo - System.nanoTime()) / 1_000_000L
                if (espera > 0) Thread.sleep(espera)
            }
        }, "rtp-tx").apply { isDaemon = true }.start()
    }

    /** Coloca áudio para tocar na ligação (PCM 8 kHz). */
    fun tocar(pcm: ShortArray) {
        var i = 0
        while (i < pcm.size) { saida.offer(pcm.copyOfRange(i, minOf(i + 160, pcm.size))); i += 160 }
    }

    fun limparSaida() = saida.clear()
    fun tocando() = falando || saida.isNotEmpty()
    fun parar() { rodando = false; sock.close() }
}
