package br.com.pilar.tvsignage

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Handler
import android.os.Looper
import android.util.Log

/**
 * Inicia o app automaticamente após o boot do aparelho (TV Box HK1 K8S / Android TV / tablets).
 * Aguarda alguns segundos para a rede subir e abre apenas a MainActivity — nenhum serviço
 * de mídia é iniciado no boot.
 */
class BootReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent) {
        val action = intent.action ?: return
        if (action !in BOOT_ACTIONS) return

        Log.i(TAG, "Boot recebido: $action — agendando abertura do app")
        val appCtx = context.applicationContext
        val pending = goAsync()

        Handler(Looper.getMainLooper()).postDelayed({
            try {
                val launch = Intent(appCtx, MainActivity::class.java).apply {
                    addFlags(
                        Intent.FLAG_ACTIVITY_NEW_TASK
                            or Intent.FLAG_ACTIVITY_CLEAR_TOP
                            or Intent.FLAG_ACTIVITY_SINGLE_TOP
                    )
                    putExtra(MainActivity.EXTRA_FROM_BOOT, true)
                }
                appCtx.startActivity(launch)
            } catch (e: Exception) {
                Log.e(TAG, "Falha ao abrir MainActivity no boot", e)
            } finally {
                pending.finish()
            }
        }, BOOT_DELAY_MS)
    }

    companion object {
        private const val TAG = "PilarBootReceiver"
        private const val BOOT_DELAY_MS = 8000L
        private val BOOT_ACTIONS = setOf(
            Intent.ACTION_BOOT_COMPLETED,
            "android.intent.action.LOCKED_BOOT_COMPLETED",
            "android.intent.action.QUICKBOOT_POWERON",
            "com.htc.intent.action.QUICKBOOT_POWERON",
            "android.intent.action.REBOOT"
        )
    }
}
