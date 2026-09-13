package br.com.pilar.automacao

import org.json.JSONObject
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

    private fun requisicaoJson(
        url: String,
        metodo: String,
        autorizacao: String,
        corpo: JSONObject,
    ): JSONObject {
        val conn = (URL(url).openConnection() as HttpURLConnection).apply {
            requestMethod = metodo
            connectTimeout = 15000
            readTimeout = 30000
            doOutput = true
            setRequestProperty("Content-Type", "application/json")
            setRequestProperty("apikey", BuildConfig.SUPABASE_ANON_KEY)
            setRequestProperty("Authorization", "Bearer $autorizacao")
        }
        conn.outputStream.use { it.write(corpo.toString().toByteArray()) }
        val codigo = conn.responseCode
        val texto = (if (codigo in 200..299) conn.inputStream else conn.errorStream)
            ?.bufferedReader()?.use(BufferedReader::readText).orEmpty()
        conn.disconnect()
        val json = runCatching { JSONObject(texto) }.getOrNull()
        if (codigo !in 200..299 || json == null) {
            val mensagem = json?.optString("msg").takeUnless { it.isNullOrBlank() }
                ?: json?.optString("error_description").takeUnless { it.isNullOrBlank() }
                ?: "E-mail ou senha inválidos"
            throw IllegalStateException(mensagem)
        }
        return json
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
}
