package br.com.pilar.tvsignage

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import androidx.core.content.FileProvider
import okhttp3.OkHttpClient
import okhttp3.Request
import org.json.JSONObject
import java.io.File
import java.util.concurrent.TimeUnit

/**
 * Atualização OTA do APK (comando "atualizar_versao").
 *
 * Fluxo:
 * 1. Baixa o manifesto public/apps/android-tv-signage-latest.json do sistema.
 * 2. Compara versionCode com o instalado (se o manifesto informar).
 * 3. Baixa o APK para o cache e instala:
 *    - silenciosamente via `pm install -r` quando o app tem privilégio (root/system/device owner);
 *    - senão, abre o instalador padrão do Android (ACTION_VIEW / FileProvider).
 */
object Updater {

    data class Info(val url: String, val versionCode: Int, val versionName: String)

    private val http = OkHttpClient.Builder()
        .connectTimeout(20, TimeUnit.SECONDS)
        .readTimeout(120, TimeUnit.SECONDS)
        .writeTimeout(120, TimeUnit.SECONDS)
        .build()

    fun currentVersionCode(ctx: Context): Int = try {
        val pi = ctx.packageManager.getPackageInfo(ctx.packageName, 0)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) pi.longVersionCode.toInt()
        else @Suppress("DEPRECATION") pi.versionCode
    } catch (_: Exception) { 0 }

    fun fetchLatest(): Info? {
        val base = BuildConfig.APP_BASE_URL.trimEnd('/')
        val url = "$base/apps/android-tv-signage-latest.json?_=${System.currentTimeMillis()}"
        val req = Request.Builder().url(url)
            .addHeader("Cache-Control", "no-cache")
            .build()
        http.newCall(req).execute().use { r ->
            if (!r.isSuccessful) return null
            val body = r.body?.string().orEmpty()
            if (body.isBlank()) return null
            val j = JSONObject(body)
            val apk = j.optString("url")
            if (apk.isBlank()) return null
            return Info(
                url = apk,
                versionCode = j.optInt("versionCode", 0),
                versionName = j.optString("versionName", "")
            )
        }
    }

    /** Baixa o APK para o cache do app. Retorna o arquivo ou null. */
    fun download(ctx: Context, url: String): File? {
        val out = File(ctx.cacheDir, "update.apk")
        try { if (out.exists()) out.delete() } catch (_: Exception) {}
        val req = Request.Builder().url(url).build()
        http.newCall(req).execute().use { r ->
            if (!r.isSuccessful) return null
            val stream = r.body?.byteStream() ?: return null
            out.outputStream().use { dst -> stream.copyTo(dst, 64 * 1024) }
        }
        return if (out.length() > 100_000) out else null
    }

    /** Instalação silenciosa (root / system / device owner). Retorna true se concluiu. */
    private fun trySilentInstall(file: File): Boolean {
        for (cmd in listOf(
            arrayOf("su", "-c", "pm install -r -d \"${file.absolutePath}\""),
            arrayOf("pm", "install", "-r", "-d", file.absolutePath)
        )) {
            try {
                val p = Runtime.getRuntime().exec(cmd)
                val ok = p.waitFor() == 0
                if (ok) return true
            } catch (_: Exception) {}
        }
        return false
    }

    /** Abre o instalador do sistema. Deve ser chamado na thread principal. */
    private fun openInstaller(ctx: Context, file: File) {
        val uri: Uri = FileProvider.getUriForFile(ctx, "${ctx.packageName}.fileprovider", file)
        val intent = Intent(Intent.ACTION_INSTALL_PACKAGE).apply {
            data = uri
            addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            putExtra(Intent.EXTRA_NOT_UNKNOWN_SOURCE, true)
            putExtra(Intent.EXTRA_RETURN_RESULT, false)
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

    sealed class Result {
        object JaAtualizado : Result()
        object Instalando : Result()
        data class Erro(val msg: String) : Result()
    }

    /**
     * Executa o processo completo. Chamar em thread de IO.
     * [onInstaller] é invocado (na thread chamadora) quando é preciso abrir a UI do instalador —
     * a Activity deve repassar para a main thread.
     */
    fun atualizar(ctx: Context, forcar: Boolean, onInstaller: (File) -> Unit): Result {
        val info = fetchLatest() ?: return Result.Erro("manifesto indisponível")
        val atual = currentVersionCode(ctx)
        if (!forcar && info.versionCode in 1..atual) return Result.JaAtualizado
        val file = download(ctx, info.url) ?: return Result.Erro("download falhou")
        if (trySilentInstall(file)) return Result.Instalando
        onInstaller(file)
        return Result.Instalando
    }

    fun instalarArquivo(ctx: Context, file: File) = openInstaller(ctx, file)
}
