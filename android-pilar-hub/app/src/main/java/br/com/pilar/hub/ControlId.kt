package br.com.pilar.hub

import org.json.JSONArray
import org.json.JSONObject

/** Conversa com os equipamentos Control iD na rede local (login.fcgi, get_afd.fcgi, etc.). */
object ControlId {

    data class Batida(val nsr: Long, val cpf: String, val dataHora: String)

    data class Alvo(val host: String, val porta: Int, val https: Boolean)

    fun alvoPrincipal(equipamento: JSONObject): Alvo {
        var host = equipamento.optString("ip").trim()
        if (host.isBlank()) host = equipamento.optString("endpoint").trim()
        var porta = equipamento.optInt("porta", 0)
        var https: Boolean? = null
        val m = Regex("^(https?)://(.+?)(?::(\\d+))?(?:/.*)?$", RegexOption.IGNORE_CASE).find(host)
        if (m != null) {
            https = m.groupValues[1].lowercase() == "https"
            host = m.groupValues[2]
            m.groupValues[3].toIntOrNull()?.let { porta = it }
        }
        host = host.trimEnd('/')
        if (host.isBlank()) throw IllegalStateException("Equipamento sem endereço na rede.")
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

    /** O mesmo equipamento pode responder em http ou https: tentamos os dois. */
    fun alvos(equipamento: JSONObject): List<Alvo> {
        val principal = alvoPrincipal(equipamento)
        val alternativo = if (principal.https) Alvo(principal.host, 80, false) else Alvo(principal.host, 443, true)
        return listOf(principal, alternativo).distinct()
    }

    fun base(alvo: Alvo) = "${if (alvo.https) "https" else "http"}://${alvo.host}:${alvo.porta}"

    private fun usuarioDe(equipamento: JSONObject, cred: JSONObject?): String =
        (cred?.optString("usuario").orEmpty().ifBlank { equipamento.optString("usuario") }).ifBlank { "admin" }

    private fun senhaDe(equipamento: JSONObject, cred: JSONObject?): String =
        (cred?.optString("senha").orEmpty().ifBlank { equipamento.optString("senha") })
            .ifBlank { equipamento.optString("chave_comunicacao") }
            .ifBlank { "admin" }

    fun login(alvo: Alvo, usuario: String, senha: String): String {
        val resposta = Rede.texto(
            url = "${base(alvo)}/login.fcgi",
            metodo = "POST",
            corpo = JSONObject().put("login", usuario).put("password", senha).toString(),
            timeoutMs = 12000,
            aceitarCertificadoLocal = true,
        )
        val sessao = runCatching { JSONObject(resposta).optString("session") }.getOrNull().orEmpty()
        if (sessao.isBlank()) throw IllegalStateException("Equipamento não aceitou o usuário e a senha.")
        return sessao
    }

    fun logout(alvo: Alvo, sessao: String) {
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

    /** Abre uma sessão no equipamento tentando os protocolos possíveis e sempre encerra ao final. */
    fun <T> comSessao(equipamento: JSONObject, cred: JSONObject?, bloco: (Alvo, String) -> T): T {
        val usuario = usuarioDe(equipamento, cred)
        val senha = senhaDe(equipamento, cred)
        var ultimoErro: Exception? = null
        for (alvo in alvos(equipamento)) {
            try {
                val sessao = login(alvo, usuario, senha)
                try {
                    return bloco(alvo, sessao)
                } finally {
                    logout(alvo, sessao)
                }
            } catch (e: Exception) {
                ultimoErro = e
            }
        }
        throw ultimoErro ?: IllegalStateException("Equipamento não respondeu na rede.")
    }

    private fun postFcgi(alvo: Alvo, caminho: String, sessao: String, corpo: JSONObject, timeoutMs: Int = 20000): String =
        Rede.texto(
            url = "${base(alvo)}/$caminho?session=$sessao",
            metodo = "POST",
            corpo = corpo.toString(),
            timeoutMs = timeoutMs,
            aceitarCertificadoLocal = true,
        )

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

    fun lerBatidas(equipamento: JSONObject, ultimoNsr: Long): List<Batida> =
        comSessao(equipamento, null) { alvo, sessao ->
            val afd = Rede.texto(
                url = "${base(alvo)}/get_afd.fcgi?session=$sessao",
                metodo = "POST",
                corpo = JSONObject().put("mode", "671").toString(),
                timeoutMs = 60000,
                aceitarCertificadoLocal = true,
            )
            interpretarAfd(afd, ultimoNsr)
        }

    /** Teste de conexão pedido pelo painel do sistema. */
    fun testarConexao(equipamento: JSONObject): String = try {
        comSessao(equipamento, null) { _, _ -> }
        "Sucesso: conectado pelo Pilar Coletor no aparelho."
    } catch (e: Exception) {
        "Falha: ${e.message ?: "equipamento não respondeu"}"
    }

    /** Aciona a porta/relé do iDFace. */
    fun abrirPorta(device: JSONObject, cred: JSONObject?, porta: Int): Pair<String, String?> =
        comSessao(device, cred) { alvo, sessao ->
            val corpo = JSONObject().put(
                "actions",
                JSONArray().put(JSONObject().put("action", "door").put("parameters", "door=$porta")),
            )
            val texto = postFcgi(alvo, "execute_actions.fcgi", sessao, corpo)
            "Porta acionada pelo Pilar Coletor." to texto.take(300)
        }

    /** Confere se o equipamento aceita login (usado como "status"). */
    fun statusLogin(device: JSONObject, cred: JSONObject?): Pair<String, String?> =
        comSessao(device, cred) { _, sessao ->
            "Login no equipamento efetuado pelo coletor." to JSONObject().put("sessao", sessao.isNotBlank()).toString()
        }

    /** Foto da câmera embutida do iDFace (usada pelo interfone/portaria). */
    fun capturarImagem(device: JSONObject, cred: JSONObject?): Pair<String, String?> =
        comSessao(device, cred) { alvo, sessao ->
            val corpo = JSONObject().put("frame_type", "camera").put("camera", "rgb")
            val (bytes, tipo) = Rede.bytes(
                url = "${base(alvo)}/save_screenshot.fcgi?session=$sessao",
                metodo = "POST",
                corpo = corpo.toString(),
                timeoutMs = 20000,
                aceitarCertificadoLocal = true,
            )
            if (bytes.isEmpty()) throw IllegalStateException("O iDFace devolveu uma imagem vazia.")
            val dados = JSONObject()
                .put("imagem_base64", android.util.Base64.encodeToString(bytes, android.util.Base64.NO_WRAP))
                .put("content_type", tipo)
            "Imagem capturada pela câmera do iDFace." to dados.toString()
        }

    /** Últimos acessos registrados (usado para detectar o toque da campainha). */
    fun logsRecentes(device: JSONObject, cred: JSONObject?, limite: Int = 10): JSONArray =
        comSessao(device, cred) { alvo, sessao ->
            val corpo = JSONObject()
                .put("object", "access_logs")
                .put("order_by", JSONArray().put("id"))
                .put("order_desc", true)
                .put("limit", limite)
            val texto = postFcgi(alvo, "load_objects.fcgi", sessao, corpo)
            runCatching { JSONObject(texto).optJSONArray("access_logs") }.getOrNull() ?: JSONArray()
        }
}
