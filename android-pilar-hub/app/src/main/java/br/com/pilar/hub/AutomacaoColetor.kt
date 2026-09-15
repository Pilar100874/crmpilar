package br.com.pilar.hub

import android.content.Context
import android.util.Base64
import org.json.JSONObject

/** Executa na rede local os comandos de automação e portaria enviados pelo sistema. */
object AutomacaoColetor {

    private val ultimoLogCampainha = mutableMapOf<String, Long>()
    private val campainhaIniciada = mutableSetOf<String>()
    @Volatile private var jobsEmAndamento = false
    @Volatile private var dispositivos: List<JSONObject> = emptyList()

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

    private fun unidade(ctx: Context): String? = Prefs.filialId(ctx).ifBlank { null }

    private fun garantirRegistro(ctx: Context) {
        if (Prefs.portariaToken(ctx).isNotBlank()) return
        val resposta = chamar(
            ctx,
            JSONObject()
                .put("acao", "provisionar")
                .put("hostname", android.os.Build.MODEL)
                .put("unidade_id", unidade(ctx))
                .put("unidade_nome", Prefs.filialNome(ctx).ifBlank { Prefs.empresaNome(ctx) })
                .put("versao", BuildConfig.VERSION_NAME),
        )
        val token = resposta.optString("token")
        if (token.isNotBlank()) Prefs.salvarPortariaToken(ctx, token)
    }

    /** Laço lento: confere quais dispositivos são deste coletor, testa a rede e observa a campainha. */
    fun sincronizar(ctx: Context) {
        garantirRegistro(ctx)
        val handshake = chamar(
            ctx,
            JSONObject()
                .put("acao", "handshake")
                .put("unidade_id", unidade(ctx))
                .put("versao", BuildConfig.VERSION_NAME),
        )
        val lista = Rede.lista(handshake, "dispositivos")
        dispositivos = (0 until lista.length()).mapNotNull { lista.optJSONObject(it) }
        ColetorEstado.dispositivos = dispositivos.map { d ->
            val host = hostDoDispositivo(d)
            val porta = portaDoDispositivo(d)
            val saude = if (host == null) null else testarTcp(host, porta)
            ColetorEstado.Item(
                nome = d.optString("nome").ifBlank { d.optString("identificador").ifBlank { "Dispositivo" } },
                situacao = when {
                    host == null -> "Sem endereço configurado"
                    saude?.first == true -> "Ativo em $host:$porta · ${saude.second} ms"
                    else -> "Sem resposta em $host:$porta"
                },
            )
        }
        verificarCampainha(ctx)
        ColetorEstado.automacaoUltimaSync = agoraHora()
        executarJobs(ctx)
    }

    /** Laço rápido: só busca e executa comandos pendentes, para o botão do painel responder na hora. */
    fun executarJobs(ctx: Context) {
        if (jobsEmAndamento) return
        if (Prefs.portariaToken(ctx).isBlank()) return
        jobsEmAndamento = true
        try {
            val jobs = Rede.lista(
                chamar(ctx, JSONObject().put("acao", "jobs").put("limite", 5).put("unidade_id", unidade(ctx))),
                "jobs",
            )
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
                    ColetorEstado.erros++
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
        } catch (e: Exception) {
            ColetorEstado.erros++
            ColetorEstado.ultimoErro = e.message ?: "Falha ao buscar comandos."
        } finally {
            jobsEmAndamento = false
        }
    }

    // ---- Campainha do interfone (iDFace) -----------------------------------

    private val EVENTOS_CAMPAINHA = listOf(7, 8)

    private fun verificarCampainha(ctx: Context) {
        for (device in dispositivos) {
            if (device.optString("tipo").lowercase() != "idface") continue
            if (device.optString("ip").isBlank()) continue
            val id = device.optString("id")
            val eventos = device.optJSONObject("config")?.optJSONArray("campainha_eventos")?.let { arr ->
                (0 until arr.length()).map { arr.optInt(it) }
            } ?: EVENTOS_CAMPAINHA
            try {
                val logs = ControlId.logsRecentes(device, device.optJSONObject("credenciais"))
                if (logs.length() == 0) continue
                var maior = 0L
                var tocou = false
                val anterior = ultimoLogCampainha[id] ?: 0L
                for (i in 0 until logs.length()) {
                    val log = logs.optJSONObject(i) ?: continue
                    val logId = log.optLong("id")
                    if (logId > maior) maior = logId
                    if (logId > anterior && eventos.contains(log.optInt("event"))) tocou = true
                }
                if (!campainhaIniciada.contains(id)) {
                    campainhaIniciada += id
                    ultimoLogCampainha[id] = maior
                    continue
                }
                ultimoLogCampainha[id] = maxOf(anterior, maior)
                if (tocou) {
                    runCatching {
                        chamar(
                            ctx,
                            JSONObject()
                                .put("acao", "campainha")
                                .put("unidade_id", unidade(ctx))
                                .put("device_id_evento", id),
                        )
                    }
                }
            } catch (e: Exception) {
                ColetorEstado.ultimoErro = e.message ?: "Falha ao ler a campainha."
            }
        }
    }

    // ---- Saúde dos dispositivos --------------------------------------------

    private fun hostDoDispositivo(device: JSONObject): String? {
        val ip = device.optString("ip")
        if (ip.isNotBlank()) return ip.removePrefix("http://").removePrefix("https://").substringBefore('/').substringBefore(':')
        val endpoint = device.optString("endpoint")
        if (endpoint.isBlank()) return null
        return runCatching { java.net.URI(endpoint).host }.getOrNull()
    }

    private fun portaDoDispositivo(device: JSONObject): Int {
        val porta = device.optInt("porta", 0)
        if (porta > 0) return porta
        val endpoint = device.optString("endpoint")
        if (endpoint.isNotBlank()) {
            val uri = runCatching { java.net.URI(endpoint) }.getOrNull()
            if (uri != null) {
                if (uri.port > 0) return uri.port
                return if (uri.scheme == "https") 443 else 80
            }
        }
        val protocolo = device.optJSONObject("config")?.optString("protocolo").orEmpty().lowercase()
        return if (protocolo == "https") 443 else 80
    }

    private fun testarTcp(host: String, porta: Int, timeoutMs: Int = 2500): Pair<Boolean, Long> {
        val inicio = System.currentTimeMillis()
        return try {
            java.net.Socket().use { s ->
                s.connect(java.net.InetSocketAddress(host, porta), timeoutMs)
            }
            true to (System.currentTimeMillis() - inicio)
        } catch (_: Exception) {
            false to (System.currentTimeMillis() - inicio)
        }
    }

    private fun agoraHora(): String =
        java.text.SimpleDateFormat("HH:mm:ss", java.util.Locale.getDefault()).format(java.util.Date())

    // ---- Execução dos comandos ---------------------------------------------

    private fun executar(job: JSONObject): Pair<String, String?> {
        val device = job.optJSONObject("device") ?: throw IllegalStateException("Dispositivo não informado.")
        val cred = job.optJSONObject("credenciais") ?: JSONObject()
        val params = job.optJSONObject("parametros") ?: JSONObject()
        val canal = params.optInt("canal", device.optInt("canal_rele", 0))
        val idface = device.optString("tipo").lowercase() == "idface"
        return when (job.optString("comando")) {
            "capturar_camera" -> {
                if (!idface) throw IllegalStateException("Captura disponível somente para o iDFace.")
                ControlId.capturarImagem(device, cred)
            }
            "ligar", "desligar" -> {
                if (idface) throw IllegalStateException("Liga/desliga disponível somente para Shelly.")
                ligar(device, cred, canal, job.optString("comando") == "ligar")
            }
            "configurar_saida" -> {
                if (idface) throw IllegalStateException("Configuração de saída disponível somente para Shelly.")
                configurarSaida(device, cred, canal, params)
            }
            "abrir" -> {
                if (idface) ControlId.abrirPorta(device, cred, params.optInt("porta", 1))
                else pulso(device, cred, canal)
            }
            else -> if (idface) ControlId.statusLogin(device, cred) else status(device, cred, canal)
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

    /** Ajusta o modo da saída do Shelly (pulso/liga-desliga, tempo e estado ao energizar). */
    private fun configurarSaida(device: JSONObject, cred: JSONObject, canal: Int, params: JSONObject): Pair<String, String?> {
        val base = baseDoDispositivo(device)
        val config = JSONObject()
        params.optString("modo").takeIf { it.isNotBlank() }?.let { config.put("in_mode", it) }
        if (params.has("auto_off")) config.put("auto_off", params.optBoolean("auto_off"))
        if (params.has("auto_off_delay")) config.put("auto_off_delay", params.optInt("auto_off_delay"))
        params.optString("power_on_state").takeIf { it.isNotBlank() }?.let { config.put("initial_state", it) }
        val corpo = JSONObject().put("id", canal).put("config", config).toString()
        val texto = Rede.texto(
            url = "$base/rpc/Switch.SetConfig",
            metodo = "POST",
            corpo = corpo,
            cabecalhos = cabecalhos(cred) + mapOf("Content-Type" to "application/json"),
            timeoutMs = 8000,
            aceitarCertificadoLocal = true,
        )
        return "Configuração de saída aplicada pelo Coletor local." to texto.take(300)
    }
}
