package br.com.pilar.hub

import org.json.JSONArray
import org.json.JSONObject
import java.io.BufferedReader
import java.net.HttpURLConnection
import java.net.URL
import javax.net.ssl.HostnameVerifier
import javax.net.ssl.HttpsURLConnection
import javax.net.ssl.SSLContext
import javax.net.ssl.X509TrustManager

/** Chamadas HTTP usadas pelo coletor: servidor do CRM e equipamentos da rede local. */
object Rede {

    /** Equipamentos locais usam certificado próprio; a conexão nunca sai da rede do cliente. */
    private val contextoPermissivo: SSLContext by lazy {
        val confia = object : X509TrustManager {
            override fun checkClientTrusted(c: Array<out java.security.cert.X509Certificate>?, a: String?) {}
            override fun checkServerTrusted(c: Array<out java.security.cert.X509Certificate>?, a: String?) {}
            override fun getAcceptedIssuers(): Array<java.security.cert.X509Certificate> = arrayOf()
        }
        SSLContext.getInstance("TLS").apply { init(null, arrayOf(confia), java.security.SecureRandom()) }
    }

    fun texto(
        url: String,
        metodo: String = "GET",
        corpo: String? = null,
        cabecalhos: Map<String, String> = emptyMap(),
        timeoutMs: Int = 15000,
        aceitarCertificadoLocal: Boolean = false,
    ): String {
        val conn = (URL(url).openConnection() as HttpURLConnection).apply {
            requestMethod = metodo
            connectTimeout = timeoutMs
            readTimeout = timeoutMs
            instanceFollowRedirects = true
            cabecalhos.forEach { (k, v) -> setRequestProperty(k, v) }
            if (corpo != null) {
                doOutput = true
                if (getRequestProperty("Content-Type") == null) setRequestProperty("Content-Type", "application/json")
            }
        }
        if (aceitarCertificadoLocal && conn is HttpsURLConnection) {
            conn.sslSocketFactory = contextoPermissivo.socketFactory
            conn.hostnameVerifier = HostnameVerifier { _, _ -> true }
        }
        corpo?.let { conn.outputStream.use { saida -> saida.write(it.toByteArray()) } }
        val codigo = conn.responseCode
        val resposta = (if (codigo in 200..299) conn.inputStream else conn.errorStream)
            ?.bufferedReader()?.use(BufferedReader::readText).orEmpty()
        conn.disconnect()
        if (codigo !in 200..299) throw IllegalStateException("HTTP $codigo: ${resposta.take(160)}")
        return resposta
    }

    /** Usado quando o equipamento devolve uma imagem em vez de texto. */
    fun bytes(
        url: String,
        metodo: String = "GET",
        corpo: String? = null,
        cabecalhos: Map<String, String> = emptyMap(),
        timeoutMs: Int = 20000,
        aceitarCertificadoLocal: Boolean = false,
    ): Pair<ByteArray, String> {
        val conn = (URL(url).openConnection() as HttpURLConnection).apply {
            requestMethod = metodo
            connectTimeout = timeoutMs
            readTimeout = timeoutMs
            cabecalhos.forEach { (k, v) -> setRequestProperty(k, v) }
            if (corpo != null) {
                doOutput = true
                if (getRequestProperty("Content-Type") == null) setRequestProperty("Content-Type", "application/json")
            }
        }
        if (aceitarCertificadoLocal && conn is HttpsURLConnection) {
            conn.sslSocketFactory = contextoPermissivo.socketFactory
            conn.hostnameVerifier = HostnameVerifier { _, _ -> true }
        }
        corpo?.let { conn.outputStream.use { saida -> saida.write(it.toByteArray()) } }
        val codigo = conn.responseCode
        val tipo = conn.contentType ?: "image/jpeg"
        val dados = (if (codigo in 200..299) conn.inputStream else conn.errorStream)?.use { it.readBytes() } ?: ByteArray(0)
        conn.disconnect()
        if (codigo !in 200..299) throw IllegalStateException("HTTP $codigo")
        return dados to tipo
    }

    fun json(
        url: String,
        metodo: String = "POST",
        corpo: JSONObject? = null,
        cabecalhos: Map<String, String> = emptyMap(),
        timeoutMs: Int = 30000,
    ): JSONObject {
        val texto = texto(url, metodo, corpo?.toString(), cabecalhos, timeoutMs)
        return runCatching { JSONObject(texto) }.getOrElse { JSONObject().put("ok", true) }
    }

    fun funcao(nome: String, corpo: JSONObject, cabecalhosExtras: Map<String, String> = emptyMap()): JSONObject =
        json(
            url = "${BuildConfig.SUPABASE_URL}/functions/v1/$nome",
            corpo = corpo,
            cabecalhos = mapOf(
                "apikey" to BuildConfig.SUPABASE_ANON_KEY,
                "Authorization" to "Bearer ${BuildConfig.SUPABASE_ANON_KEY}",
            ) + cabecalhosExtras,
        )

    fun lista(json: JSONObject, campo: String): JSONArray = json.optJSONArray(campo) ?: JSONArray()
}
