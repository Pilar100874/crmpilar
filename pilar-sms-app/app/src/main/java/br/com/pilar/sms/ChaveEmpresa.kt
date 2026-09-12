package br.com.pilar.sms

import android.content.Context
import org.json.JSONObject
import java.io.BufferedReader
import java.net.HttpURLConnection
import java.net.URL

/** Guarda e valida a chave da empresa que libera o aplicativo (sistema multiempresa). */
object ChaveEmpresa {

    private const val ARQUIVO = "pilar_sms"

    data class Ativacao(val empresaId: String, val empresaNome: String)

    private fun sp(ctx: Context) = ctx.getSharedPreferences(ARQUIVO, Context.MODE_PRIVATE)

    fun chave(ctx: Context): String = sp(ctx).getString("chave_empresa", "")?.trim().orEmpty()

    fun empresaId(ctx: Context): String = sp(ctx).getString("empresa_id", "")?.trim().orEmpty()

    fun empresaNome(ctx: Context): String = sp(ctx).getString("empresa_nome", "")?.trim().orEmpty()

    fun ativado(ctx: Context): Boolean = chave(ctx).isNotEmpty() && empresaId(ctx).isNotEmpty()

    fun salvar(ctx: Context, chave: String, empresaId: String, empresaNome: String) {
        sp(ctx).edit()
            .putString("chave_empresa", chave.trim().uppercase())
            .putString("empresa_id", empresaId.trim())
            .putString("empresa_nome", empresaNome.trim())
            .apply()
    }

    fun limpar(ctx: Context) {
        sp(ctx).edit()
            .remove("chave_empresa")
            .remove("empresa_id")
            .remove("empresa_nome")
            .apply()
    }

    /** Valida a chave no servidor. Lança erro com a mensagem pronta para mostrar na tela. */
    fun validar(chave: String): Ativacao {
        val url = URL("${SmsPollingService.SUPABASE_URL}/functions/v1/app-chave-validar")
        val conn = (url.openConnection() as HttpURLConnection).apply {
            requestMethod = "POST"
            connectTimeout = 15000
            readTimeout = 30000
            doOutput = true
            setRequestProperty("Content-Type", "application/json")
            setRequestProperty("apikey", SmsPollingService.ANON_KEY)
            setRequestProperty("Authorization", "Bearer ${SmsPollingService.ANON_KEY}")
        }
        conn.outputStream.use {
            val corpo = JSONObject()
                .put("chave", chave.trim().uppercase())
                .put("app", "sms")
                .toString()
            it.write(corpo.toByteArray())
        }
        val codigo = conn.responseCode
        val texto = (if (codigo in 200..299) conn.inputStream else conn.errorStream)
            ?.bufferedReader()?.use(BufferedReader::readText).orEmpty()
        conn.disconnect()

        val json = runCatching { JSONObject(texto) }.getOrNull()
        if (codigo !in 200..299) {
            throw IllegalStateException(
                json?.optString("error").takeUnless { it.isNullOrBlank() }
                    ?: "Não foi possível validar a chave"
            )
        }
        return Ativacao(
            empresaId = json?.optString("estabelecimento_id").orEmpty(),
            empresaNome = json?.optString("empresa").orEmpty(),
        )
    }
}
