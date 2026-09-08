package br.com.pilar.tvsignage

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.pm.PackageInstaller
import android.os.Build
import android.util.Log

/**
 * Resultado da instalacao OTA feita via PackageInstaller.
 *
 * - STATUS_PENDING_USER_ACTION: o Android exige uma confirmacao. Abrimos a tela de confirmacao
 *   automaticamente (o app nao precisa ser fechado antes: o sistema encerra e substitui sozinho).
 * - STATUS_SUCCESS: o proprio Android reabre o app via MY_PACKAGE_REPLACED (BootReceiver).
 * - Erro: registra no log e libera o estado pendente para o rollback avaliar.
 */
class InstallResultReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent) {
        val status = intent.getIntExtra(PackageInstaller.EXTRA_STATUS, -1)
        val msg = intent.getStringExtra(PackageInstaller.EXTRA_STATUS_MESSAGE)
        when (status) {
            PackageInstaller.STATUS_PENDING_USER_ACTION -> {
                val confirm = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU)
                    intent.getParcelableExtra(Intent.EXTRA_INTENT, Intent::class.java)
                else @Suppress("DEPRECATION") intent.getParcelableExtra<Intent>(Intent.EXTRA_INTENT)
                confirm?.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                try { confirm?.let { context.startActivity(it) } } catch (e: Exception) {
                    Log.e(TAG, "confirmacao nao abriu: ${e.message}")
                }
            }
            PackageInstaller.STATUS_SUCCESS -> Log.i(TAG, "atualizacao instalada")
            else -> Log.e(TAG, "falha na instalacao (status=$status): $msg")
        }
    }

    companion object {
        private const val TAG = "PilarInstall"
        const val ACTION = "br.com.pilar.tvsignage.INSTALL_RESULT"
    }
}
