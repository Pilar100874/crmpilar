package br.com.pilar.tvsignage

import android.content.Context
import android.content.Intent
import android.content.pm.PackageInfo
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import androidx.core.content.FileProvider
import okhttp3.OkHttpClient
import okhttp3.Request
import org.json.JSONObject
import java.io.File
import java.security.MessageDigest
import java.util.concurrent.TimeUnit

/**
 * Atualização OTA do APK (comando "atualizar_versao").
 *
 * Fluxo:
 * 1. Baixa o manifesto public/apps/android-tv-signage-latest.json do sistema.
 * 2. Compara versionCode com o instalado (se o manifesto informar).
 * 3. Baixa o APK para o cache, valida tamanho, checksum SHA-256 e assinatura digital.
 * 4. Instala:
 *    - silenciosamente via `pm install -r` quando o app tem privilégio (root/system/device owner);
 *    - senão, abre o instalador padrão do Android (ACTION_VIEW / FileProvider).
 */
object Updater {

    data class Info(
        val url: String,
        val versionCode: Int,
        val versionName: String,
        val sha256: String = "",
        val size: Long = 0L
    )

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
                versionName = j.optString("versionName", ""),
                sha256 = j.optString("sha256", "").trim().lowercase(),
                size = j.optLong("size", 0L)
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

    /** SHA-256 do arquivo baixado, em hexadecimal minusculo. */
    fun sha256(file: File): String {
        val md = MessageDigest.getInstance("SHA-256")
        file.inputStream().use { input ->
            val buf = ByteArray(64 * 1024)
            while (true) {
                val n = input.read(buf)
                if (n <= 0) break
                md.update(buf, 0, n)
            }
        }
        return md.digest().joinToString("") { "%02x".format(it) }
    }

    private fun archiveInfo(ctx: Context, file: File): PackageInfo? {
        val flags = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P)
            PackageManager.GET_SIGNING_CERTIFICATES else @Suppress("DEPRECATION") PackageManager.GET_SIGNATURES
        return try { ctx.packageManager.getPackageArchiveInfo(file.absolutePath, flags) } catch (_: Exception) { null }
    }

    @Suppress("DEPRECATION")
    private fun certHashes(pi: PackageInfo?): Set<String> {
        if (pi == null) return emptySet()
        val sigs = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            val si = pi.signingInfo
            (si?.apkContentsSigners ?: si?.signingCertificateHistory)?.toList()
        } else pi.signatures?.toList()
        val md = MessageDigest.getInstance("SHA-256")
        return sigs.orEmpty().map { s -> md.digest(s.toByteArray()).joinToString("") { b -> "%02x".format(b) } }.toSet()
    }

    /**
     * Valida o APK baixado antes de instalar:
     * - tamanho e checksum SHA-256 (quando o manifesto os informa);
     * - arquivo e um APK legivel e do mesmo pacote;
     * - assinatura identica a do app instalado (bloqueia APK adulterado/de outra origem).
     * Retorna null quando esta tudo certo, ou a mensagem de erro.
     */
    fun verificar(ctx: Context, file: File, info: Info): String? {
        if (info.size > 0 && file.length() != info.size)
            return "tamanho invalido (${file.length()} de ${info.size} bytes)"
        if (info.sha256.isNotBlank()) {
            val calc = try { sha256(file) } catch (_: Exception) { "" }
            if (!calc.equals(info.sha256, ignoreCase = true))
                return "checksum nao confere (download corrompido)"
        }
        val arq = archiveInfo(ctx, file) ?: return "APK invalido ou corrompido"
        if (arq.packageName != ctx.packageName) return "pacote diferente (${arq.packageName})"
        val instalado = try {
            val flags = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P)
                PackageManager.GET_SIGNING_CERTIFICATES else @Suppress("DEPRECATION") PackageManager.GET_SIGNATURES
            ctx.packageManager.getPackageInfo(ctx.packageName, flags)
        } catch (_: Exception) { null }
        val novas = certHashes(arq)
        if (novas.isEmpty()) return "APK sem assinatura digital"
        val atuais = certHashes(instalado)
        if (atuais.isNotEmpty() && novas.intersect(atuais).isEmpty())
            return "assinatura diferente da versao instalada"
        return null
    }

    /** Instalação silenciosa (root / system / device owner). Retorna true se concluiu. */
    fun instalarSilencioso(file: File): Boolean {
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
        val problema = verificar(ctx, file, info)
        if (problema != null) {
            try { file.delete() } catch (_: Exception) {}
            return Result.Erro(problema)
        }
        // Guarda a versão atual para poder voltar caso a nova não instale/reinicie.
        Rollback.prepararBackup(ctx)
        Rollback.marcarPendente(ctx, if (info.versionCode > 0) info.versionCode else atual + 1)
        if (instalarSilencioso(file)) return Result.Instalando
        onInstaller(file)
        return Result.Instalando
    }


    fun instalarArquivo(ctx: Context, file: File) = openInstaller(ctx, file)
}
