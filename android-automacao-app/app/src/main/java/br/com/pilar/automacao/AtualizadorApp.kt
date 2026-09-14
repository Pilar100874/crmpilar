package br.com.pilar.automacao

import android.app.Activity
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Handler
import android.os.Looper
import androidx.core.content.FileProvider
import org.json.JSONObject
import java.io.File
import java.net.HttpURLConnection
import java.net.URL

/**
 * Atualização manual do aplicativo (botão "Atualizar aplicativo").
 * Lê o manifesto publicado pelo sistema, compara com a versão instalada,
 * baixa o APK e abre o instalador do Android.
 */
object AtualizadorApp {

    private const val BASE = "https://crmpilar.lovable.app"
    private const val MANIFESTO = "/apps/pilar-automacao-latest.json"

    data class Info(val versao: String, val url: String, val notas: String)

    private val ui = Handler(Looper.getMainLooper())
    @Volatile private var consultaEmAndamento = false

    fun versaoInstalada(ctx: Context): String = try {
        ctx.packageManager.getPackageInfo(ctx.packageName, 0).versionName.orEmpty()
    } catch (_: Exception) { "" }

    /** true quando [a] é menor que [b] comparando x.y.z */
    fun menorQue(a: String, b: String): Boolean {
        val pa = a.split(".").map { it.filter(Char::isDigit).toIntOrNull() ?: 0 }
        val pb = b.split(".").map { it.filter(Char::isDigit).toIntOrNull() ?: 0 }
        for (i in 0 until maxOf(pa.size, pb.size)) {
            val x = pa.getOrElse(i) { 0 }
            val y = pb.getOrElse(i) { 0 }
            if (x != y) return x < y
        }
        return false
    }

    private fun baixarTexto(url: String): String? = try {
        val c = URL(url).openConnection() as HttpURLConnection
        c.connectTimeout = 15000
        c.readTimeout = 20000
        c.setRequestProperty("Cache-Control", "no-cache")
        c.inputStream.bufferedReader().use { it.readText() }
    } catch (_: Exception) { null }

    fun consultar(): Info? {
        val txt = baixarTexto("$BASE$MANIFESTO?_=${System.currentTimeMillis()}") ?: return null
        return try {
            val j = JSONObject(txt)
            val versao = j.optString("version").ifBlank { j.optString("versionName") }
            val url = j.optString("downloadUrl").ifBlank { j.optString("url") }
            if (versao.isBlank() || url.isBlank()) null
            else Info(versao, url, j.optString("notas"))
        } catch (_: Exception) { null }
    }

    private fun baixarApk(ctx: Context, url: String): File? = try {
        val out = File(ctx.cacheDir, "atualizacao.apk")
        if (out.exists()) out.delete()
        val c = URL(url).openConnection() as HttpURLConnection
        c.instanceFollowRedirects = true
        c.connectTimeout = 20000
        c.readTimeout = 180000
        c.inputStream.use { input -> out.outputStream().use { input.copyTo(it, 64 * 1024) } }
        val pacote = ctx.packageManager.getPackageArchiveInfo(out.absolutePath, 0)?.packageName
        if (out.length() > 100_000 && pacote == ctx.packageName) out else { out.delete(); null }
    } catch (_: Exception) { null }

    private fun instalar(ctx: Context, arquivo: File) {
        val uri: Uri = FileProvider.getUriForFile(ctx, "${ctx.packageName}.fileprovider", arquivo)
        val intent = Intent(Intent.ACTION_INSTALL_PACKAGE).apply {
            data = uri
            addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_ACTIVITY_NEW_TASK)
            putExtra(Intent.EXTRA_NOT_UNKNOWN_SOURCE, true)
        }
        try {
            ctx.startActivity(intent)
        } catch (_: Exception) {
            val fallback = Intent(Intent.ACTION_VIEW).apply {
                setDataAndType(uri, "application/vnd.android.package-archive")
                addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            ctx.startActivity(fallback)
        }
    }

    private fun permitirInstalacao(act: Activity): Boolean {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return true
        if (act.packageManager.canRequestPackageInstalls()) return true
        try {
            act.startActivity(
                Intent(android.provider.Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES)
                    .setData(Uri.parse("package:${act.packageName}"))
            )
        } catch (_: Exception) {}
        return false
    }

    /**
     * Fluxo completo do botão. [aviso] recebe mensagens já na thread principal.
     */
    fun atualizar(act: Activity, aviso: (String) -> Unit) {
        aviso("Procurando atualização…")
        Thread {
            val info = consultar()
            if (info == null) {
                ui.post { aviso("Não foi possível consultar a atualização agora.") }
                return@Thread
            }
            val atual = versaoInstalada(act)
            if (!menorQue(atual, info.versao)) {
                ui.post { aviso("Você já está na versão mais recente (${atual.ifBlank { info.versao }}).") }
                return@Thread
            }
            ui.post { aviso("Baixando versão ${info.versao}…") }
            val arquivo = baixarApk(act, info.url)
            if (arquivo == null) {
                ui.post { aviso("Falha ao baixar a atualização.") }
                return@Thread
            }
            ui.post {
                if (!permitirInstalacao(act)) {
                    aviso("Autorize a instalação de aplicativos e toque novamente.")
                    return@post
                }
                aviso("Abrindo o instalador…")
                instalar(act, arquivo)
            }
        }.start()
    }

    private fun postFila(ctx: Context, body: JSONObject): JSONObject? = try {
        val conn = URL("${BuildConfig.SUPABASE_URL}/functions/v1/app-update-device").openConnection() as HttpURLConnection
        conn.requestMethod = "POST"
        conn.connectTimeout = 15000
        conn.readTimeout = 180000
        conn.doOutput = true
        conn.setRequestProperty("Content-Type", "application/json")
        conn.setRequestProperty("apikey", BuildConfig.SUPABASE_ANON_KEY)
        conn.setRequestProperty("Authorization", "Bearer ${BuildConfig.SUPABASE_ANON_KEY}")
        conn.setRequestProperty("X-Device-Token", Prefs.chave(ctx))
        conn.outputStream.use { it.write(body.toString().toByteArray()) }
        val stream = if (conn.responseCode in 200..299) conn.inputStream else conn.errorStream
        val resposta = stream?.bufferedReader()?.use { it.readText() }.orEmpty()
        conn.disconnect()
        JSONObject(resposta)
    } catch (_: Exception) { null }

    /** Consulta a Central sem limpar chave, sessão, ambiente ou preferências do aplicativo. */
    fun processarComandoRemoto(act: Activity) {
        if (consultaEmAndamento || Prefs.chave(act).isBlank()) return
        consultaEmAndamento = true
        Thread {
            try {
                val versao = versaoInstalada(act)
                val resposta = postFila(act, JSONObject().put("acao", "poll").put("app", "automacao").put("versao_app", versao))
                val comando = resposta?.optJSONObject("command") ?: return@Thread
                val id = comando.optString("id")
                val url = comando.optString("url")
                if (id.isBlank() || url.isBlank()) return@Thread
                postFila(act, JSONObject().put("acao", "ack").put("app", "automacao").put("command_id", id).put("status", "instalando"))
                val arquivo = baixarApk(act, url)
                if (arquivo == null) {
                    postFila(act, JSONObject().put("acao", "ack").put("app", "automacao").put("command_id", id).put("status", "erro").put("mensagem", "Falha ao baixar a atualização"))
                    return@Thread
                }
                ui.post {
                    if (!permitirInstalacao(act)) {
                        postFila(act, JSONObject().put("acao", "ack").put("app", "automacao").put("command_id", id).put("status", "erro").put("mensagem", "Permissão de instalação pendente"))
                    } else instalar(act, arquivo)
                }
            } finally {
                consultaEmAndamento = false
            }
        }.start()
    }
}
