package br.com.pilar.tvsignage

import android.content.Context
import java.io.File

/**
 * Rollback automatico da atualizacao OTA.
 *
 * Fluxo:
 * 1. Antes de instalar o APK novo, [prepararBackup] copia o APK da versao atual
 *    para files/backup/previous.apk e guarda versao/estado em SharedPreferences.
 * 2. [marcarPendente] registra que ha uma instalacao em andamento (versao alvo + horario).
 * 3. No proximo start do app, [verificarNaInicializacao] compara a versao instalada:
 *    - versao >= alvo  -> sucesso, limpa o estado pendente;
 *    - versao inalterada e passou do prazo (ou ja houve tentativa) -> reinstala o backup.
 * 4. Se o app nem reiniciar (instalador travado), o watchdog [agendarWatchdog] dispara
 *    o rollback depois do prazo, ainda com o processo vivo.
 */
object Rollback {

    private const val PREFS = "tv_update_state"
    private const val K_PENDENTE = "pendente"
    private const val K_ALVO = "alvo"
    private const val K_ANTERIOR = "anterior"
    private const val K_INICIO = "inicio"
    private const val K_TENTATIVAS = "tentativas"
    private const val K_ROLLBACK = "rollback_feito"

    /** Prazo para a nova versao subir; passou disso, volta para a anterior. */
    const val PRAZO_MS = 5 * 60 * 1000L

    private fun prefs(ctx: Context) = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

    private fun backupFile(ctx: Context): File {
        val dir = File(ctx.filesDir, "backup").apply { mkdirs() }
        return File(dir, "previous.apk")
    }

    fun temBackup(ctx: Context): Boolean = backupFile(ctx).length() > 100_000

    /** Copia o APK instalado atualmente para poder voltar depois. */
    fun prepararBackup(ctx: Context): Boolean = try {
        val origem = File(ctx.applicationInfo.sourceDir)
        val destino = backupFile(ctx)
        if (origem.canRead() && origem.length() > 100_000) {
            val tmp = File(destino.parentFile, "previous.tmp")
            origem.inputStream().use { i -> tmp.outputStream().use { o -> i.copyTo(o, 64 * 1024) } }
            if (destino.exists()) destino.delete()
            tmp.renameTo(destino)
            prefs(ctx).edit().putInt(K_ANTERIOR, Updater.currentVersionCode(ctx)).apply()
            true
        } else false
    } catch (_: Exception) { false }

    fun marcarPendente(ctx: Context, alvo: Int) {
        prefs(ctx).edit()
            .putBoolean(K_PENDENTE, true)
            .putInt(K_ALVO, alvo)
            .putLong(K_INICIO, System.currentTimeMillis())
            .putInt(K_TENTATIVAS, prefs(ctx).getInt(K_TENTATIVAS, 0) + 1)
            .remove(K_ROLLBACK)
            .apply()
    }

    fun limpar(ctx: Context) {
        prefs(ctx).edit()
            .remove(K_PENDENTE).remove(K_ALVO).remove(K_INICIO).remove(K_TENTATIVAS)
            .apply()
    }

    fun pendente(ctx: Context): Boolean = prefs(ctx).getBoolean(K_PENDENTE, false)
    fun versaoAlvo(ctx: Context): Int = prefs(ctx).getInt(K_ALVO, 0)
    fun versaoAnterior(ctx: Context): Int = prefs(ctx).getInt(K_ANTERIOR, 0)
    private fun inicio(ctx: Context): Long = prefs(ctx).getLong(K_INICIO, 0L)
    private fun tentativas(ctx: Context): Int = prefs(ctx).getInt(K_TENTATIVAS, 0)

    sealed class Estado {
        object Nada : Estado()
        data class Sucesso(val versao: Int) : Estado()
        /** Aguardando a instalacao concluir; [restanteMs] ate o prazo. */
        data class Aguardando(val restanteMs: Long) : Estado()
        data class Revertido(val versao: Int) : Estado()
        data class Falhou(val msg: String) : Estado()
    }

    /**
     * Avalia o estado da atualizacao. Chamar na inicializacao e no watchdog.
     * [instalar] recebe o APK de backup quando for preciso abrir o instalador do sistema
     * (deve ser repassado para a main thread pela Activity).
     */
    fun verificar(ctx: Context, instalar: (File) -> Unit): Estado {
        if (!pendente(ctx)) return Estado.Nada
        val atual = Updater.currentVersionCode(ctx)
        val alvo = versaoAlvo(ctx)
        if (alvo > 0 && atual >= alvo) {
            limpar(ctx)
            return Estado.Sucesso(atual)
        }
        val decorrido = System.currentTimeMillis() - inicio(ctx)
        if (decorrido < PRAZO_MS && tentativas(ctx) < 2) {
            return Estado.Aguardando(PRAZO_MS - decorrido)
        }
        // Falhou: instalacao nao concluiu ou o app nao reiniciou na versao nova.
        val backup = backupFile(ctx)
        val anterior = versaoAnterior(ctx)
        limpar(ctx)
        if (atual > 0 && anterior > 0 && atual == anterior && !temBackup(ctx)) {
            // Continua na versao anterior e nao ha backup: nada a reverter, apenas reporta.
            return Estado.Falhou("atualizacao nao concluiu; permanece na versao $atual")
        }
        if (!temBackup(ctx)) return Estado.Falhou("atualizacao falhou e nao ha backup para restaurar")
        prefs(ctx).edit().putBoolean(K_ROLLBACK, true).apply()
        return if (Updater.instalarSilencioso(backup)) {
            Estado.Revertido(anterior)
        } else {
            instalar(backup)
            Estado.Revertido(anterior)
        }
    }

    /** Descarta o APK novo baixado (usado quando a verificacao falha antes de instalar). */
    fun descartarDownload(ctx: Context) {
        try { File(ctx.cacheDir, "update.apk").delete() } catch (_: Exception) {}
    }
}
