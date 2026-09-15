package br.com.pilar.hub

import org.json.JSONObject

/** Conversa com os relógios Control iD na rede local (login.fcgi / get_afd.fcgi). */
object ControlId {

    data class Batida(val nsr: Long, val cpf: String, val dataHora: String)

    private data class Alvo(val host: String, val porta: Int, val https: Boolean)

    private fun normalizar(equipamento: JSONObject): Alvo {
        var host = equipamento.optString("ip").trim()
        var porta = equipamento.optInt("porta", 0)
        var https: Boolean? = null
        val m = Regex("^(https?)://(.+?)(?::(\\d+))?(?:/.*)?$", RegexOption.IGNORE_CASE).find(host)
        if (m != null) {
            https = m.groupValues[1].lowercase() == "https"
            host = m.groupValues[2]
            m.groupValues[3].toIntOrNull()?.let { porta = it }
        }
        host = host.trimEnd('/')
        if (https == null) {
            https = when (porta) {
                443 -> true
                80 -> false
                else -> equipamento.optBoolean("usa_https", false)
            }
        }
        if (porta == 0) porta = if (https == true) 443 else 80
        return Alvo(host, porta, https == true)
    }

    private fun base(alvo: Alvo) = "${if (alvo.https) "https" else "http"}://${alvo.host}:${alvo.porta}"

    private fun login(alvo: Alvo, usuario: String, senha: String): String {
        val resposta = Rede.texto(
            url = "${base(alvo)}/login.fcgi",
            metodo = "POST",
            corpo = JSONObject().put("login", usuario).put("password", senha).toString(),
            timeoutMs = 12000,
            aceitarCertificadoLocal = true,
        )
        val sessao = runCatching { JSONObject(resposta).optString("session") }.getOrNull().orEmpty()
        if (sessao.isBlank()) throw IllegalStateException("Relógio não aceitou o usuário e a senha.")
        return sessao
    }

    private fun afd(alvo: Alvo, sessao: String): String = Rede.texto(
        url = "${base(alvo)}/get_afd.fcgi?session=$sessao",
        metodo = "POST",
        corpo = JSONObject().put("mode", "671").toString(),
        timeoutMs = 60000,
        aceitarCertificadoLocal = true,
    )

    private fun logout(alvo: Alvo, sessao: String) {
        runCatching {
            Rede.texto(
                url = "${base(alvo)}/logout.fcgi?session=$sessao",
                metodo = "POST",
                corpo = "{}",
                timeoutMs = 8000,
                aceitarCertificadoLocal = true,
            )
        }
    }

    /** AFD P671 tipo 3: NSR(9)+Tipo(1)+Data(DDMMAAAA)+Hora(HHMM)+CPF(12) */
    fun interpretarAfd(texto: String, ultimoNsr: Long): List<Batida> {
        val saida = mutableListOf<Batida>()
        for (linha in texto.split('\n')) {
            val l = linha.trim('\r')
            if (l.length < 35) continue
            if (l.substring(9, 10) != "3") continue
            val nsr = l.substring(0, 9).toLongOrNull() ?: continue
            if (nsr <= ultimoNsr) continue
            val dd = l.substring(10, 12)
            val mm = l.substring(12, 14)
            val aaaa = l.substring(14, 18)
            if (!aaaa.startsWith("20")) continue
            val hh = l.substring(18, 20)
            val mi = l.substring(20, 22)
            val cpf = l.substring(22, 34).filter { it.isDigit() }
            saida += Batida(nsr, cpf, "$aaaa-$mm-${dd}T$hh:$mi:00")
        }
        return saida
    }

    fun lerBatidas(equipamento: JSONObject, ultimoNsr: Long): List<Batida> {
        val alvo = normalizar(equipamento)
        val usuario = equipamento.optString("usuario").ifBlank { "admin" }
        val senha = equipamento.optString("senha").ifBlank {
            equipamento.optString("chave_comunicacao").ifBlank { "admin" }
        }
        val tentativas = listOf(
            alvo,
            if (alvo.https) Alvo(alvo.host, 80, false) else Alvo(alvo.host, 443, true),
        ).distinct()
        var ultimoErro: Exception? = null
        for (tentativa in tentativas) {
            try {
                val sessao = login(tentativa, usuario, senha)
                try {
                    return interpretarAfd(afd(tentativa, sessao), ultimoNsr)
                } finally {
                    logout(tentativa, sessao)
                }
            } catch (e: Exception) {
                ultimoErro = e
            }
        }
        throw ultimoErro ?: IllegalStateException("Relógio não respondeu na rede.")
    }
}
