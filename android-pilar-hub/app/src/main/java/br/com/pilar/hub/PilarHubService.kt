package br.com.pilar.hub

import android.app.*
import android.content.Intent
import android.os.BatteryManager
import android.os.Build
import android.os.IBinder
import androidx.core.app.NotificationCompat
import br.com.pilar.hub.sms.SmsModule
import br.com.pilar.hub.ponto.PontoQueue
import kotlinx.coroutines.*
import org.json.JSONObject

class PilarHubService : Service() {

    companion object {
        const val CH_ID = "pilar_hub_ch"
        @Volatile var smsAtivo = false
        @Volatile var pontoAtivo = false
        @Volatile var cameraAtiva = false
    }

    private val scope = CoroutineScope(Dispatchers.IO + SupervisorJob())

    override fun onBind(i: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        criarCanal()
        startForeground(1, notif("Pilar Hub ativo", "Aguardando configuração..."))
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

    private fun atualizarNotif() {
        val ativos = listOfNotNull(
            if (smsAtivo) "SMS" else null,
            if (pontoAtivo) "Ponto" else null,
            if (cameraAtiva) "Câmera" else null
        ).joinToString(" · ").ifEmpty { "nenhum módulo ativo" }
        val nm = getSystemService(NotificationManager::class.java)
        nm.notify(1, notif("Pilar Hub", "Módulos: $ativos"))
    }

    private fun loop() = scope.launch {
        val prefs = getSharedPreferences("pilar_hub", MODE_PRIVATE)
        while (isActive) {
            val token = prefs.getString("device_token", null)
            if (!token.isNullOrBlank()) {
                try {
                    val bm = getSystemService(BATTERY_SERVICE) as BatteryManager
                    val bat = bm.getIntProperty(BatteryManager.BATTERY_PROPERTY_CAPACITY)
                    val body = JSONObject().apply {
                        put("device_token", token)
                        put("battery", bat)
                    }.toString()
                    val resp = ApiClient.post("pilar-hub-heartbeat", body)
                    val json = JSONObject(resp)
                    val cfg = json.optJSONObject("config") ?: json
                    smsAtivo = cfg.optBoolean("modulo_sms_ativo", false)
                    pontoAtivo = cfg.optBoolean("modulo_ponto_ativo", false)
                    cameraAtiva = cfg.optBoolean("modulo_camera_ativo", false)
                    atualizarNotif()

                    if (smsAtivo) SmsModule.processarFila(this@PilarHubService, token)
                } catch (e: Exception) {
                    e.printStackTrace()
                }
            }
            delay(30_000)
        }
    }

    override fun onDestroy() {
        scope.cancel(); super.onDestroy()
    }
}
