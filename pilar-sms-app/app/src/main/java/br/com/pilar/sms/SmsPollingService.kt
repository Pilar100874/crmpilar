package br.com.pilar.sms

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Context
import android.content.Intent
import android.os.BatteryManager
import android.os.Build
import android.os.IBinder
import android.os.PowerManager
import android.util.Log
import androidx.core.app.NotificationCompat
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import org.json.JSONArray
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import java.util.ArrayDeque

/**
 * Serviço em segundo plano que consulta a fila do CRM e envia SMS.
 * Modelo pull: o celular sempre conecta para fora — não precisa de IP público.
 */
class SmsPollingService : Service() {

    data class SendEvent(
        val phone: String,
        val message: String,
        val success: Boolean,
        val error: String?,
        val timeMs: Long
    )

    enum class ConnState { STOPPED, CONNECTING, ACTIVE, ERROR }

    companion object {
        const val CHANNEL = "pilar_sms_poll"
        const val NOTIF_ID = 1
        const val TAG = "PilarSmsPoll"

        const val SUPABASE_URL = "https://ioxugupvxlcdweldocmq.supabase.co"
        const val ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlveHVndXB2eGxjZHdlbGRvY21xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA3MTEwODUsImV4cCI6MjA3NjI4NzA4NX0.WKRpPgsfohk4BRyHthLmz23F2Iab-vPObkioUeFkzWc"
        const val POLL_INTERVAL_MS = 5_000L
        const val MAX_HISTORY = 30

        @Volatile var status: String = "Desconectado"
        @Volatile var connState: ConnState = ConnState.STOPPED
        @Volatile var enviados: Int = 0
        @Volatile var falhas: Int = 0
        @Volatile var ultimoPing: Long = 0L
        @Volatile var bateria: Int = -1
        @Volatile var startedAt: Long = 0L
        val historyLock = Any()
        val history = ArrayDeque<SendEvent>()

        fun clearHistory() {
            synchronized(historyLock) { history.clear() }
            enviados = 0; falhas = 0
        }
    }

    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private var job: Job? = null
    private var wakeLock: PowerManager.WakeLock? = null

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        createChannel()
        startForeground(NOTIF_ID, buildNotification("Iniciando..."))
        val pm = getSystemService(Context.POWER_SERVICE) as PowerManager
        wakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "PilarSms:polling").apply {
            setReferenceCounted(false)
            acquire()
        }
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val token = getSharedPreferences("pilar_sms", Context.MODE_PRIVATE)
            .getString("device_token", "") ?: ""
        if (token.isBlank()) {
            connState = ConnState.ERROR
            updateStatus("Sem token cadastrado")
            stopSelf()
            return START_NOT_STICKY
        }
        startedAt = System.currentTimeMillis()
        job?.cancel()
        job = scope.launch { loop(token) }
        return START_STICKY
    }

    private suspend fun loop(token: String) {
        connState = ConnState.CONNECTING
        updateStatus("Conectando...")
        while (true) {
            try {
                val resp = poll(token)
                ultimoPing = System.currentTimeMillis()
                bateria = batteryLevel()
                connState = ConnState.ACTIVE
                val messages = resp.optJSONArray("messages") ?: JSONArray()
                if (messages.length() > 0) {
                    updateStatus("Enviando ${messages.length()} SMS...")
                }
                for (i in 0 until messages.length()) {
                    val m = messages.getJSONObject(i)
                    val id = m.getString("id")
                    val to = m.getString("telefone")
                    val msg = m.getString("mensagem")
                    val result = SmsSender.send(this@SmsPollingService, to, msg, null) { delivered, derr ->
                        // Callback assíncrono do relatório de entrega da operadora.
                        scope.launch { ackDelivery(token, id, delivered, derr) }
                    }
                    ack(token, id, result.ok, result.error)
                    if (result.ok) enviados++ else falhas++
                    addHistory(SendEvent(to, msg, result.ok, result.error, System.currentTimeMillis()))
                }
                updateStatus("Conectado")
            } catch (e: Exception) {
                Log.w(TAG, "Erro no polling", e)
                connState = ConnState.ERROR
                updateStatus("Sem conexão — tentando novamente")
            }
            delay(POLL_INTERVAL_MS)
        }
    }

    private fun addHistory(ev: SendEvent) {
        synchronized(historyLock) {
            history.addFirst(ev)
            while (history.size > MAX_HISTORY) history.removeLast()
        }
    }

    private fun poll(token: String): JSONObject {
        val url = URL("$SUPABASE_URL/functions/v1/sms-queue-poll")
        val conn = url.openConnection() as HttpURLConnection
        conn.requestMethod = "POST"
        conn.doOutput = true
        conn.connectTimeout = 10_000
        conn.readTimeout = 15_000
        conn.setRequestProperty("Content-Type", "application/json")
        conn.setRequestProperty("apikey", ANON_KEY)
        conn.setRequestProperty("Authorization", "Bearer $ANON_KEY")
        conn.setRequestProperty("X-Device-Token", token)

        val body = JSONObject().apply {
            put("bateria", batteryLevel())
            put("sinal", "wifi_or_mobile")
            put("limit", 5)
        }.toString()
        conn.outputStream.use { it.write(body.toByteArray()) }

        val code = conn.responseCode
        val stream = if (code in 200..299) conn.inputStream else conn.errorStream
        val text = stream.bufferedReader().use { it.readText() }
        if (code !in 200..299) throw RuntimeException("HTTP $code: $text")
        return JSONObject(text)
    }

    private fun ack(token: String, id: String, success: Boolean, error: String?) {
        try {
            val url = URL("$SUPABASE_URL/functions/v1/sms-queue-ack")
            val conn = url.openConnection() as HttpURLConnection
            conn.requestMethod = "POST"
            conn.doOutput = true
            conn.connectTimeout = 10_000
            conn.readTimeout = 15_000
            conn.setRequestProperty("Content-Type", "application/json")
            conn.setRequestProperty("apikey", ANON_KEY)
            conn.setRequestProperty("Authorization", "Bearer $ANON_KEY")
            conn.setRequestProperty("X-Device-Token", token)
            val body = JSONObject().apply {
                put("id", id)
                put("success", success)
                if (error != null) put("erro", error)
            }.toString()
            conn.outputStream.use { it.write(body.toByteArray()) }
            conn.responseCode
        } catch (e: Exception) {
            Log.w(TAG, "Falha no ack de $id", e)
        }
    }

    private fun ackDelivery(token: String, id: String, delivered: Boolean, error: String?) {
        try {
            val url = URL("$SUPABASE_URL/functions/v1/sms-queue-ack")
            val conn = url.openConnection() as HttpURLConnection
            conn.requestMethod = "POST"
            conn.doOutput = true
            conn.connectTimeout = 10_000
            conn.readTimeout = 15_000
            conn.setRequestProperty("Content-Type", "application/json")
            conn.setRequestProperty("apikey", ANON_KEY)
            conn.setRequestProperty("Authorization", "Bearer $ANON_KEY")
            conn.setRequestProperty("X-Device-Token", token)
            val body = JSONObject().apply {
                put("id", id)
                put("delivered", delivered)
                if (error != null) put("erro", error)
            }.toString()
            conn.outputStream.use { it.write(body.toByteArray()) }
            conn.responseCode
        } catch (e: Exception) {
            Log.w(TAG, "Falha no ack de entrega de $id", e)
        }
    }

    private fun batteryLevel(): Int {
        return try {
            val bm = getSystemService(Context.BATTERY_SERVICE) as BatteryManager
            bm.getIntProperty(BatteryManager.BATTERY_PROPERTY_CAPACITY)
        } catch (_: Exception) { -1 }
    }

    private fun updateStatus(s: String) {
        status = s
        val nm = getSystemService(NotificationManager::class.java)
        nm?.notify(NOTIF_ID, buildNotification(s))
    }

    private fun buildNotification(text: String) =
        NotificationCompat.Builder(this, CHANNEL)
            .setContentTitle("Pilar SMS")
            .setContentText("$text · $enviados enviados · $falhas falhas")
            .setSmallIcon(android.R.drawable.stat_sys_upload)
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .build()

    private fun createChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val ch = NotificationChannel(CHANNEL, "Pilar SMS", NotificationManager.IMPORTANCE_LOW)
            getSystemService(NotificationManager::class.java)?.createNotificationChannel(ch)
        }
    }

    override fun onDestroy() {
        job?.cancel()
        scope.cancel()
        try { wakeLock?.release() } catch (_: Exception) {}
        connState = ConnState.STOPPED
        status = "Desconectado"
        super.onDestroy()
    }
}
