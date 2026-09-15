package br.com.pilar.hub

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

/** Religa o coletor quando o aparelho é ligado. */
class BootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent?) {
        if (intent?.action != Intent.ACTION_BOOT_COMPLETED) return
        if (!Prefs.ativado(context) || !Prefs.coletorAtivo(context)) return
        ColetorService.iniciar(context)
    }
}
