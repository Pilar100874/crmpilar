package br.com.pilar.tvsignage

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Handler
import android.os.Looper
import android.util.Log

/** Reabre o app automaticamente logo apos a atualizacao OTA ser instalada. */
class UpdatedReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != Intent.ACTION_MY_PACKAGE_REPLACED) return
        val appCtx = context.applicationContext
        val pending = goAsync()
        Handler(Looper.getMainLooper()).postDelayed({
            try {
                appCtx.startActivity(
                    Intent(appCtx, MainActivity::class.java).addFlags(
                        Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
                    )
                )
            } catch (e: Exception) {
                Log.e("PilarUpdated", "nao reabriu apos update: ${e.message}")
            }
            pending.finish()
        }, 3000)
    }
}
