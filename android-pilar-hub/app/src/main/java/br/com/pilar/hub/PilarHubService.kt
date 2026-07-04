package br.com.pilar.hub

import android.app.*
import android.content.Intent
import android.os.Build
import android.os.IBinder
import androidx.core.app.NotificationCompat
import br.com.pilar.hub.sms.SmsModule
import kotlinx.coroutines.*

/**
 * Serviço em foreground responsável exclusivamente pelo módulo SMS.
 * Ponto e Câmera rodam no Coletor Desktop (MSI) — NÃO neste APK.
 */
class PilarHubService : Service() {

    companion object {
        const val CH_ID = "pilar_hub_ch"
    }

    private val scope = CoroutineScope(Dispatchers.IO + SupervisorJob())

    override fun onBind(i: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        criarCanal()
        startForeground(1, notif("Pilar Hub", "Gateway SMS ativo"))
        loop()
    }

    private fun criarCanal() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val nm = getSystemService(NotificationManager::class.java)
            nm.createNotificationChannel(
                NotificationChannel(CH_ID, "Pilar Hub", NotificationManager.IMPORTANCE_LOW)
            )
        }
    }

    private fun notif(title: String, text: String): Notification =
        NotificationCompat.Builder(this, CH_ID)
            .setContentTitle(title).setContentText(text)
            .setSmallIcon(android.R.drawable.stat_notify_sync)
            .setOngoing(true).build()

    private fun loop() = scope.launch {
        val prefs = getSharedPreferences("pilar_hub", MODE_PRIVATE)
        while (isActive) {
            val token = prefs.getString("device_token", null)
            if (!token.isNullOrBlank()) {
                try {
                    SmsModule.processarFila(this@PilarHubService, token)
                } catch (e: Exception) {
                    e.printStackTrace()
                }
            }
            delay(15_000)
        }
    }

    override fun onDestroy() {
        scope.cancel(); super.onDestroy()
    }
}
