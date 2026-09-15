package br.com.pilar.hub

import android.content.Context
import android.util.Base64
import org.json.JSONObject

/** Executa na rede local os comandos de automação enviados pelo CRM. */
object AutomacaoColetor {

    private fun chamar(ctx: Context, corpo: JSONObject): JSONObject {
        val deviceKey = Prefs.deviceKey(ctx)
        return Rede.funcao(
            "portaria-coletor",
            corpo.put("device_key", deviceKey),
            mapOf(
                "x-coletor-token" to Prefs.portariaToken(ctx),
                "x-coletor-device" to deviceKey,
            ),
        )
    }

    private fun garantirRegistro(ctx: Context) {
        if (Prefs.portariaToken(ctx).isNotBlank()) return
        val resposta = chamar(
            ctx,
            JSONObject()
                .put("acao", "provisionar")
                .put("hostname", android.os.Build.MODEL)
                .put("unidade_nome", Prefs.empresaNome(ctx))
                .put("versao", BuildConfig.VERSION_NAME),
        )
        val token = resposta.optString("token")
        if (token.isNotBlank()) Prefs.salvarPortariaToken(ctx, token)
    }

    fun sincronizar(ctx: Context) {
        garantirRegistro(ctx)

        val handshake = chamar(ctx, JSONObject().put("acao", "handshake").put("versao", BuildConfig.VERSION_NAME))
        val dispositivos = Rede.lista(handshake, "dispositivos")
        ColetorEstado.dispositivos = (0 until dispositivos.length()).mapNotNull { i ->
            dispositivos.optJSONObject(i)?.let {
                ColetorEstado.Item(
                    nome = it.optString("nome").ifBlank { it.optString("ip") },
                    situacao = it.optString("ip").ifBlank { it.optString("endpoint") },
                )
            }
        }

        val jobs = Rede.lista(chamar(ctx, JSONObject().put("acao", "jobs").put("limite", 5)), "jobs")
        for (i in 0 until jobs.length()) {
            val job = jobs.optJSONObject(i) ?: continue
            var ok = true
            var mensagem: String
            var dados: String? = null
            try {
                val resultado = executar(job)
                mensagem = resultado.first
                dados = resultado.second
                ColetorEstado.comandosExecutados++
            } catch (e: Exception) {
                ok = false
                mensagem = e.message ?: "Falha ao executar na rede local."
                ColetorEstado.ultimoErro = mensagem
            }
            runCatching {
                chamar(
                    ctx,
                    JSONObject()
                        .put("acao", "resultado")
                        .put("job_id", job.optString("id"))
                        .put("ok", ok)
                        .put("mensagem", mensagem.take(480))
                        .put("dados", dados),
                )
            }
        }
    }

    private fun executar(job: JSONObject): Pair<String, String?> {
        val device = job.optJSONObject("device") ?: throw IllegalStateException("Dispositivo não informado.")
        val cred = job.optJSONObject("credenciais") ?: JSONObject()
        val params = job.optJSONObject("parametros") ?: JSONObject()
        val canal = params.optInt("canal", device.optInt("canal_rele", 0))
        return when (job.optString("comando")) {
            "ligar" -> ligar(device, cred, canal, true)
            "desligar" -> ligar(device, cred, canal, false)
            "abrir" -> pulso(device, cred, canal)
            else -> status(device, cred, canal)
        }
    }

    private fun baseDoDispositivo(device: JSONObject): String {
        val endpoint = device.optString("endpoint")
        if (endpoint.isNotBlank()) return endpoint.trimEnd('/')
        val ip = device.optString("ip")
        if (ip.isBlank()) throw IllegalStateException("Dispositivo sem IP configurado.")
        val protocolo = device.optJSONObject("config")?.optString("protocolo").orEmpty().ifBlank { "http" }
        val porta = device.optInt("porta", 0)
        return "$protocolo://$ip" + if (porta > 0) ":$porta" else ""
    }

    private fun cabecalhos(cred: JSONObject): Map<String, String> {
        val usuario = cred.optString("usuario")
        val senha = cred.optString("senha")
        if (usuario.isBlank() || senha.isBlank()) return emptyMap()
        val token = Base64.encodeToString("$usuario:$senha".toByteArray(), Base64.NO_WRAP)
        return mapOf("Authorization" to "Basic $token")
    }

    private fun geracao(device: JSONObject): String =
        device.optJSONObject("config")?.optString("geracao").orEmpty().ifBlank { "gen2" }.lowercase()

    private fun tentar(urls: List<String>, cabecalhos: Map<String, String>): String {
        var ultimoErro: Exception? = null
        for (url in urls) {
            try {
                return Rede.texto(url, "GET", null, cabecalhos, 8000, aceitarCertificadoLocal = true)
            } catch (e: Exception) {
                ultimoErro = e
                if (!Regex("HTTP 40[04]").containsMatchIn(e.message.orEmpty())) throw e
            }
        }
        throw ultimoErro ?: IllegalStateException("Dispositivo não respondeu.")
    }

    private fun ligar(device: JSONObject, cred: JSONObject, canal: Int, ligar: Boolean): Pair<String, String?> {
        val base = baseDoDispositivo(device)
        val cfg = device.optJSONObject("config") ?: JSONObject()
        val autoOff = cfg.optBoolean("auto_off", false)
        val atraso = cfg.optInt("auto_off_delay", 0)
        val comTempo = ligar && autoOff && atraso > 0
        val rpc = "$base/rpc/Switch.Set?id=$canal&on=${if (ligar) "true" else "false"}" + if (comTempo) "&toggle_after=$atraso" else ""
        val gen1 = "$base/relay/$canal?turn=${if (ligar) "on" else "off"}" + if (comTempo) "&timer=$atraso" else ""
        val urls = if (geracao(device) == "gen1") listOf(gen1, rpc) else listOf(rpc, gen1)
        val texto = tentar(urls, cabecalhos(cred))
        return (if (ligar) "Ligado pelo Coletor local." else "Desligado pelo Coletor local.") to texto.take(300)
    }

    private fun pulso(device: JSONObject, cred: JSONObject, canal: Int): Pair<String, String?> {
        val base = baseDoDispositivo(device)
        val pulsoMs = device.optInt("pulso_ms", 1000).coerceIn(200, 10000)
        val segundos = maxOf(1, Math.round(pulsoMs / 1000.0).toInt())
        val rpc = "$base/rpc/Switch.Set?id=$canal&on=true&toggle_after=$segundos"
        val gen1 = "$base/relay/$canal?turn=on&timer=$segundos"
        val urls = if (geracao(device) == "gen1") listOf(gen1, rpc) else listOf(rpc, gen1)
        val texto = tentar(urls, cabecalhos(cred))
        return "Relé acionado pelo Coletor local." to texto.take(300)
    }

    private fun status(device: JSONObject, cred: JSONObject, canal: Int): Pair<String, String?> {
        val base = baseDoDispositivo(device)
        val doCanal = "$base/rpc/Switch.GetStatus?id=$canal"
        val rpc = "$base/rpc/Shelly.GetStatus"
        val gen1 = "$base/status"
        val urls = if (geracao(device) == "gen1") listOf(gen1, doCanal, rpc) else listOf(doCanal, rpc, gen1)
        val texto = tentar(urls, cabecalhos(cred))
        return "Dispositivo respondeu na rede local." to texto.take(8000)
    }
}
