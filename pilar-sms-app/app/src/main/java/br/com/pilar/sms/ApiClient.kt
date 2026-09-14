package br.com.pilar.sms

import org.json.JSONObject
import java.io.BufferedReader
import java.net.HttpURLConnection
import java.net.URL

object ApiClient {
    data class Ativacao(
        val empresaId: String,
        val empresaNome: String,
        val dispositivoId: String,
        val deviceToken: String,
    )

    fun validarChave(chave: String): Ativacao {
        val url = URL("${SmsPollingService.SUPABASE_URL}/functions/v1/automacao-app-chave")
        val conn = (url.openConnection() as HttpURLConnection).apply {
            requestMethod = "POST"
            connectTimeout = 15_000
            readTimeout = 30_000
            doOutput = true
            setRequestProperty("Content-Type", "application/json")
            setRequestProperty("apikey", SmsPollingService.ANON_KEY)
            setRequestProperty("Authorization", "Bearer ${SmsPollingService.ANON_KEY}")
        }
        conn.outputStream.use {
            val body = JSONObject().put("chave", chave.trim().uppercase()).put("app", "sms")
            it.write(body.toString().toByteArray())
        }
        val code = conn.responseCode
        val body = (if (code in 200..299) conn.inputStream else conn.errorStream)
            ?.bufferedReader()?.use(BufferedReader::readText).orEmpty()
        conn.disconnect()
        val json = runCatching { JSONObject(body) }.getOrNull()
        if (code !in 200..299) {
            throw IllegalStateException(json?.optString("error").takeUnless { it.isNullOrBlank() }
                ?: "Não foi possível validar a chave")
        }
        val token = json?.optString("device_token").orEmpty()
        if (token.length < 16) throw IllegalStateException("A chave não possui um aparelho SMS válido")
        return Ativacao(
            empresaId = json?.optString("estabelecimento_id").orEmpty(),
            empresaNome = json?.optString("empresa").orEmpty(),
            dispositivoId = json?.optString("dispositivo_id").orEmpty(),
            deviceToken = token,
        )
    }
}
