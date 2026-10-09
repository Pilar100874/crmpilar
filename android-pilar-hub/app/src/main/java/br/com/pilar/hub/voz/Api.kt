package br.com.pilar.hub.voz

import org.json.JSONArray
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL

/** Conversa com o CRM pela função voz-dispositivo, sempre identificada pela chave da empresa. */
object Api {
    const val SUPABASE_URL = "https://ioxugupvxlcdweldocmq.supabase.co"
    const val ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlveHVndXB2eGxjZHdlbGRvY21xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA3MTEwODUsImV4cCI6MjA3NjI4NzA4NX0.WKRpPgsfohk4BRyHthLmz23F2Iab-vPObkioUeFkzWc"

    @Volatile var chave: String = ""

    private fun post(funcao: String, corpo: JSONObject, timeout: Int = 60_000): JSONObject {
        val conn = (URL("$SUPABASE_URL/functions/v1/$funcao").openConnection() as HttpURLConnection).apply {
            requestMethod = "POST"; connectTimeout = 15_000; readTimeout = timeout; doOutput = true
            setRequestProperty("Content-Type", "application/json")
            setRequestProperty("apikey", ANON_KEY)
            setRequestProperty("Authorization", "Bearer $ANON_KEY")
        }
        conn.outputStream.use { it.write(corpo.toString().toByteArray()) }
        val code = conn.responseCode
        val txt = (if (code in 200..299) conn.inputStream else conn.errorStream)?.bufferedReader()?.use { it.readText() }.orEmpty()
        conn.disconnect()
        val json = runCatching { JSONObject(txt) }.getOrElse { JSONObject() }
        if (code !in 200..299) throw IllegalStateException(json.optString("error").ifBlank { "Erro $code" })
        return json
    }

    fun ativar(c: String): JSONObject =
        post("automacao-app-chave", JSONObject().put("chave", c.trim().uppercase()).put("app", "voz"))

    private fun voz(acao: String, extra: JSONObject = JSONObject()): JSONObject =
        post("voz-dispositivo", extra.put("chave", chave).put("acao", acao), 90_000)

    fun config(agenteId: String? = null): JSONObject = voz("config", JSONObject().put("agente_id", agenteId ?: JSONObject.NULL)).getJSONObject("agente")

    fun turno(wavB64: String?, historico: JSONArray, modo: String, objetivo: String?, promptExtra: String? = null, chamadaId: String? = null, numero: String? = null, agenteId: String? = null): JSONObject =
        voz("turno", JSONObject().put("audio_wav_b64", wavB64 ?: JSONObject.NULL).put("historico", historico)
            .put("modo", modo).put("objetivo", objetivo ?: JSONObject.NULL).put("prompt_extra", promptExtra ?: JSONObject.NULL)
            .put("chamada_id", chamadaId ?: JSONObject.NULL).put("numero", numero ?: JSONObject.NULL).put("agente_id", agenteId ?: JSONObject.NULL))

    fun iniciar(modo: String, numero: String?, ramal: String?, agenteId: String? = null): String =
        voz("iniciar", JSONObject().put("agente_id", agenteId ?: JSONObject.NULL).put("modo", modo).put("numero", numero ?: JSONObject.NULL).put("ramal", ramal ?: JSONObject.NULL)).getString("id")

    fun fala(id: String, papel: String, texto: String) { runCatching { voz("fala", JSONObject().put("chamada_id", id).put("papel", papel).put("texto", texto)) } }
    fun sugestao(id: String, texto: String) { runCatching { voz("sugestao", JSONObject().put("chamada_id", id).put("texto", texto)) } }
    fun finalizar(id: String, erro: Boolean = false) { runCatching { voz("finalizar", JSONObject().put("chamada_id", id).put("status", if (erro) "erro" else "finalizada")) } }
    fun proximoComando(): JSONObject? = voz("comandos").optJSONObject("comando")
    fun statusComando(id: String, status: String) { runCatching { voz("comando_status", JSONObject().put("comando_id", id).put("status", status)) } }
}
