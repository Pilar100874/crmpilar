package br.com.pilar.automacao

import org.json.JSONObject
import java.io.BufferedReader
import java.net.HttpURLConnection
import java.net.URL

/** Conversa com o servidor para validar a chave da empresa. */
object ApiClient {

    data class Ativacao(val empresaId: String, val empresaNome: String)

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
}
