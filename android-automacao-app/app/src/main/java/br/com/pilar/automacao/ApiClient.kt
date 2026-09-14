package br.com.pilar.automacao

import org.json.JSONObject
import org.json.JSONArray
import java.io.BufferedReader
import java.net.HttpURLConnection
import java.net.URL
import java.net.URLEncoder
import java.nio.charset.StandardCharsets

/** Conversa com o servidor para validar a chave da empresa. */
object ApiClient {

    data class Ativacao(val empresaId: String, val empresaNome: String)
    data class Sessao(
        val accessToken: String,
        val refreshToken: String,
        val expiresAt: Long,
        val userId: String,
        val ambienteCelular: String,
        val ambienteTablet: String,
        val estabelecimentoId: String,
    )

    data class Painel(val ambiente: JSONObject, val blocos: JSONArray)

    fun validarChave(chave: String): Ativacao {
        val url = URL("${BuildConfig.SUPABASE_URL}/functions/v1/automacao-app-chave")
        val conn = (url.openConnection() as HttpURLConnection).apply {
            requestMethod = "POST"
            connectTimeout = 15000
            readTimeout = 30000
            doOutput = true
            setRequestProperty("Content-Type", "application/json")
            setRequestProperty("apikey", BuildConfig.SUPABASE_ANON_KEY)
            setRequestProperty("Authorization", "Bearer ${BuildConfig.SUPABASE_ANON_KEY}")
        }
        conn.outputStream.use {
            it.write(JSONObject().put("chave", chave.trim().uppercase()).toString().toByteArray())
        }
        val codigo = conn.responseCode
        val corpo = (if (codigo in 200..299) conn.inputStream else conn.errorStream)
            ?.bufferedReader()?.use(BufferedReader::readText).orEmpty()
        conn.disconnect()

        val json = runCatching { JSONObject(corpo) }.getOrNull()
        if (codigo !in 200..299) {
            throw IllegalStateException(json?.optString("error").takeUnless { it.isNullOrBlank() }
                ?: "Não foi possível validar a chave")
        }
        return Ativacao(
            empresaId = json?.optString("estabelecimento_id").orEmpty(),
            empresaNome = json?.optString("empresa").orEmpty(),
        )
    }

    fun autenticar(email: String, senha: String): Sessao {
        val resposta = requisicaoJson(
            url = "${BuildConfig.SUPABASE_URL}/auth/v1/token?grant_type=password",
            metodo = "POST",
            autorizacao = BuildConfig.SUPABASE_ANON_KEY,
            corpo = JSONObject().put("email", email.trim()).put("password", senha),
        )
        val accessToken = resposta.getString("access_token")
        val refreshToken = resposta.getString("refresh_token")
        val expiresAt = resposta.optLong("expires_at", System.currentTimeMillis() / 1000 + resposta.optLong("expires_in", 3600))
        val userId = resposta.getJSONObject("user").getString("id")
        val campos = "estabelecimento_id,automacao_ambiente_celular,automacao_ambiente_tablet"
        val idCodificado = URLEncoder.encode(userId, StandardCharsets.UTF_8.name())
        val perfil = requisicaoArray(
            "${BuildConfig.SUPABASE_URL}/rest/v1/usuarios?auth_user_id=eq.$idCodificado&select=$campos",
            accessToken,
        ).optJSONObject(0) ?: throw IllegalStateException("Usuário não encontrado no sistema")

        return Sessao(
            accessToken = accessToken,
            refreshToken = refreshToken,
            expiresAt = expiresAt,
            userId = userId,
            ambienteCelular = perfil.optString("automacao_ambiente_celular"),
            ambienteTablet = perfil.optString("automacao_ambiente_tablet"),
            estabelecimentoId = perfil.optString("estabelecimento_id"),
        )
    }

    /** Carrega somente o ambiente atribuído ao usuário autenticado e seus blocos visíveis. */
    fun carregarPainel(accessToken: String, ambienteId: String): Painel {
        val ambiente = requisicaoArray(
            "${BuildConfig.SUPABASE_URL}/rest/v1/automacao_ambientes?id=eq.${codificar(ambienteId)}&ativo=eq.true&select=*",
            accessToken,
        ).optJSONObject(0) ?: throw IllegalStateException("Painel não encontrado ou sem acesso")
        val blocos = requisicaoArray(
            "${BuildConfig.SUPABASE_URL}/rest/v1/automacao_blocos?ambiente_id=eq.${codificar(ambienteId)}&visivel=eq.true&select=*&order=y.asc,x.asc",
            accessToken,
        )
        return Painel(ambiente, blocos)
    }

    fun comando(accessToken: String, deviceId: String, canal: Int, acao: String): JSONObject {
        val acaoReal = if (acao == "alternar") {
            val atual = comando(accessToken, deviceId, canal, "status")
            if (atual.optBoolean("ligado", false)) "desligar" else "ligar"
        } else acao
        return requisicaoJson(
            url = "${BuildConfig.SUPABASE_URL}/functions/v1/automacao-comando",
            metodo = "POST",
            autorizacao = accessToken,
            corpo = JSONObject().put("device_id", deviceId).put("canal", canal).put("acao", acaoReal),
        )
    }

    fun funcionarioAtual(accessToken: String, userId: String): JSONObject? = requisicaoArray(
        "${BuildConfig.SUPABASE_URL}/rest/v1/ponto_funcionarios?auth_user_id=eq.${codificar(userId)}&status=eq.ativo&select=id,nome&limit=1",
        accessToken,
    ).optJSONObject(0)

    fun registrarPonto(accessToken: String, funcionarioId: String, tipo: String): JSONObject =
        requisicaoJson(
            url = "${BuildConfig.SUPABASE_URL}/rest/v1/ponto_registros",
            metodo = "POST",
            autorizacao = accessToken,
            corpo = JSONObject()
                .put("funcionario_id", funcionarioId)
                .put("data_hora", formatoIsoUtc())
                .put("tipo", tipo)
                .put("origem", "pilar_controle_android"),
            preferRepresentation = true,
        )

    private fun codificar(valor: String): String =
        URLEncoder.encode(valor, StandardCharsets.UTF_8.name())

    private fun requisicaoJson(
        url: String,
        metodo: String,
        autorizacao: String,
        corpo: JSONObject,
        preferRepresentation: Boolean = false,
    ): JSONObject {
        val conn = (URL(url).openConnection() as HttpURLConnection).apply {
            requestMethod = metodo
            connectTimeout = 15000
            readTimeout = 30000
            doOutput = true
            setRequestProperty("Content-Type", "application/json")
            setRequestProperty("apikey", BuildConfig.SUPABASE_ANON_KEY)
            setRequestProperty("Authorization", "Bearer $autorizacao")
            if (preferRepresentation) setRequestProperty("Prefer", "return=representation")
        }
        conn.outputStream.use { it.write(corpo.toString().toByteArray()) }
        val codigo = conn.responseCode
        val texto = (if (codigo in 200..299) conn.inputStream else conn.errorStream)
            ?.bufferedReader()?.use(BufferedReader::readText).orEmpty()
        conn.disconnect()
        val json = runCatching { JSONObject(texto) }.getOrNull()
        if (codigo !in 200..299) {
            val mensagem = json?.optString("msg").takeUnless { it.isNullOrBlank() }
                ?: json?.optString("error_description").takeUnless { it.isNullOrBlank() }
                ?: "E-mail ou senha inválidos"
            throw IllegalStateException(mensagem)
        }
        if (json != null) return json
        val array = runCatching { JSONArray(texto) }.getOrNull()
        return array?.optJSONObject(0) ?: JSONObject().put("ok", true)
    }

    private fun requisicaoArray(url: String, autorizacao: String): org.json.JSONArray {
        val conn = (URL(url).openConnection() as HttpURLConnection).apply {
            requestMethod = "GET"
            connectTimeout = 15000
            readTimeout = 30000
            setRequestProperty("apikey", BuildConfig.SUPABASE_ANON_KEY)
            setRequestProperty("Authorization", "Bearer $autorizacao")
        }
        val codigo = conn.responseCode
        val texto = (if (codigo in 200..299) conn.inputStream else conn.errorStream)
            ?.bufferedReader()?.use(BufferedReader::readText).orEmpty()
        conn.disconnect()
        if (codigo !in 200..299) throw IllegalStateException("Não foi possível consultar o painel do usuário")
        return runCatching { org.json.JSONArray(texto) }.getOrElse {
            throw IllegalStateException("Resposta inválida ao consultar o painel")
        }
    }

    private fun formatoIsoUtc(): String =
        java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", java.util.Locale.US).apply {
            timeZone = java.util.TimeZone.getTimeZone("UTC")
        }.format(java.util.Date())
}
