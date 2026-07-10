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
import java.text.SimpleDateFormat
import java.util.ArrayDeque
import java.util.Date
import java.util.Locale

/**
 * Serviço em segundo plano que consulta a fila do CRM e envia SMS.
 *  - Envia UM SMS por vez (fila sequencial).
 *  - Aguarda a confirmação do Android antes do próximo.
 *  - Intervalo mínimo configurável entre envios (default 5s).
 *  - Deduplica por ID para evitar duplo disparo.
 *  - Não altera/trim/split/valida o conteúdo da mensagem.
 */
class SmsPollingService : Service() {

    data class SendEvent(
        val phone: String,
        val message: String,
        val success: Boolean,
        val error: String?,
        val timeMs: Long,
        val resultCode: Int = 0,
        val errorCode: String = "",
        val subscriptionId: Int = -1,
        val messageLength: Int = 0,
        val parts: Int = 0,
    )

    data class DiagSnapshot(
        val whenMs: Long,
        val requestJson: String,
        val phone: String,
        val messageLength: Int,
        val simIndex: Int,
        val subscriptionId: Int,
        val queueSize: Int,
        val androidResultCode: Int,
        val androidErrorCode: String,
        val androidErrorDescription: String,
        val apiAckPayload: String,
        val apiAckResponse: String,
    )

    enum class ConnState { STOPPED, CONNECTING, ACTIVE, ERROR }

    companion object {
        const val CHANNEL = "pilar_sms_poll"
        const val NOTIF_ID = 1
        const val TAG = "PilarSmsPoll"

        const val SUPABASE_URL = "https://ioxugupvxlcdweldocmq.supabase.co"
        const val ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlveHVndXB2eGxjZHdlbGRvY21xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA3MTEwODUsImV4cCI6MjA3NjI4NzA4NX0.WKRpPgsfohk4BRyHthLmz23F2Iab-vPObkioUeFkzWc"
        const val POLL_INTERVAL_MS = 5_000L
        const val MIN_SEND_INTERVAL_MS = 5_000L
        const val MAX_HISTORY = 30
        const val DEDUPE_MAX = 500

        private val isoFmt = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSSXXX", Locale.US)

        @Volatile var status: String = "Desconectado"
        @Volatile var connState: ConnState = ConnState.STOPPED
        @Volatile var enviados: Int = 0
        @Volatile var falhas: Int = 0
        @Volatile var ultimoPing: Long = 0L
        @Volatile var bateria: Int = -1
        @Volatile var startedAt: Long = 0L
        @Volatile var lastSendMs: Long = 0L
        @Volatile var queueSize: Int = 0
        @Volatile var lastDiag: DiagSnapshot? = null

        val historyLock = Any()
        val history = ArrayDeque<SendEvent>()
        val processedIds = LinkedHashSet<String>()

        fun clearHistory() {
            synchronized(historyLock) { history.clear() }
            enviados = 0; falhas = 0
        }

        fun rememberProcessed(id: String): Boolean {
            synchronized(processedIds) {
                if (processedIds.contains(id)) return false
                processedIds.add(id)
                while (processedIds.size > DEDUPE_MAX) {
                    val it = processedIds.iterator()
                    if (it.hasNext()) { it.next(); it.remove() }
                }
                return true
            }
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
                queueSize = messages.length()
                if (messages.length() > 0) updateStatus("Fila: ${messages.length()} SMS")

                for (i in 0 until messages.length()) {
                    val m = messages.getJSONObject(i)
                    val id = m.getString("id")
                    // Dedupe: se já processamos esse ID nesta sessão, ignora.
                    if (!rememberProcessed(id)) {
                        Log.w(TAG, "IGNORADO id=$id (já processado nesta sessão)")
                        continue
                    }

                    val to: String = m.optString("telefone").ifBlank { m.optString("phone") }
                    // Converte explicitamente para String; não trima, não interpreta.
                    val msg: String = when {
                        m.isNull("mensagem").not() -> m.optString("mensagem").toString()
                        m.isNull("message").not() -> m.optString("message").toString()
                        else -> ""
                    }

                    if (to.isBlank() || msg.isBlank()) {
                        Log.w(TAG, "Payload inválido id=$id telefone='$to' msgLen=${msg.length}")
                        val ackResp = ack(token, id, false, msg, "", "PAYLOAD_INVALIDO",
                            "telefone ou mensagem ausente", -1, -1, 0)
                        recordDiag(m.toString(), to, msg.length, -1, -1, messages.length() - i - 1,
                            -1, "PAYLOAD_INVALIDO", "telefone ou mensagem ausente", ackResp.first, ackResp.second)
                        falhas++
                        addHistory(SendEvent(to, msg, false, "PAYLOAD_INVALIDO", System.currentTimeMillis(),
                            -1, "PAYLOAD_INVALIDO", -1, msg.length, 0))
                        continue
                    }

                    // Intervalo mínimo entre envios.
                    val since = System.currentTimeMillis() - lastSendMs
                    if (lastSendMs > 0 && since < MIN_SEND_INTERVAL_MS) {
                        val waitMs = MIN_SEND_INTERVAL_MS - since
                        Log.i(TAG, "Aguardando ${waitMs}ms (intervalo mínimo entre SMS)")
                        delay(waitMs)
                    }

                    // Log OBRIGATÓRIO antes do envio.
                    Log.i(TAG, "ENVIAR id=$id telefone=$to tamanho=${msg.length} mensagem=<<${msg}>>")
                    updateStatus("Enviando para $to (${msg.length} chars)")

                    val result = SmsSender.send(this@SmsPollingService, to, msg, null) { delivered, derr ->
                        scope.launch { ackDelivery(token, id, delivered, derr) }
                    }
                    lastSendMs = System.currentTimeMillis()

                    val ackResp = ack(
                        token = token,
                        id = id,
                        success = result.ok,
                        message = msg,
                        phone = to,
                        errorCode = result.errorCode,
                        errorDescription = result.errorDescription,
                        resultCode = result.resultCode,
                        subscriptionId = result.subscriptionId,
                        parts = result.parts,
                    )

                    recordDiag(m.toString(), to, msg.length, result.simUsed, result.subscriptionId,
                        messages.length() - i - 1, result.resultCode, result.errorCode,
                        result.errorDescription, ackResp.first, ackResp.second)

                    if (result.ok) enviados++ else falhas++
                    addHistory(SendEvent(
                        phone = to, message = msg, success = result.ok,
                        error = if (result.ok) null else result.errorDescription,
                        timeMs = System.currentTimeMillis(),
                        resultCode = result.resultCode, errorCode = result.errorCode,
                        subscriptionId = result.subscriptionId, messageLength = msg.length,
                        parts = result.parts
                    ))
                }
                queueSize = 0
                updateStatus("Conectado")
            } catch (e: Exception) {
                Log.w(TAG, "Erro no polling", e)
                connState = ConnState.ERROR
                updateStatus("Sem conexão — tentando novamente")
            }
            delay(POLL_INTERVAL_MS)
        }
    }

    private fun recordDiag(
        requestJson: String, phone: String, len: Int, simIndex: Int, subId: Int,
        queueLeft: Int, resultCode: Int, errorCode: String, errorDesc: String,
        ackPayload: String, ackResponse: String,
    ) {
        lastDiag = DiagSnapshot(
            whenMs = System.currentTimeMillis(),
            requestJson = requestJson,
            phone = phone,
            messageLength = len,
            simIndex = simIndex,
            subscriptionId = subId,
            queueSize = queueLeft,
            androidResultCode = resultCode,
            androidErrorCode = errorCode,
            androidErrorDescription = errorDesc,
            apiAckPayload = ackPayload,
            apiAckResponse = ackResponse,
        )
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

    /** Envia ack detalhado para a API. Retorna (payload, response). */
    private fun ack(
        token: String,
        id: String,
        success: Boolean,
        message: String,
        phone: String,
        errorCode: String,
        errorDescription: String,
        resultCode: Int,
        subscriptionId: Int,
        parts: Int,
    ): Pair<String, String> {
        val body = JSONObject().apply {
            put("id", id)
            put("success", success)
            put("status", if (success) "enviado" else "erro")
            put("telefone", phone)
            put("mensagem", message)
            put("tamanho", message.length)
            put("android_result_code", resultCode)
            put("android_error_code", errorCode)
            put("android_error_description", errorDescription)
            put("subscription_id", subscriptionId)
            put("parts", parts)
            put("timestamp", isoFmt.format(Date()))
            if (!success) put("erro", "$errorCode: $errorDescription")
        }.toString()
        val response = try {
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
            conn.outputStream.use { it.write(body.toByteArray()) }
            val code = conn.responseCode
            val stream = if (code in 200..299) conn.inputStream else conn.errorStream
            val text = stream?.bufferedReader()?.use { it.readText() } ?: ""
            "HTTP $code $text"
        } catch (e: Exception) {
            Log.w(TAG, "Falha no ack de $id", e)
            "EXCEPTION ${e.message}"
        }
        return body to response
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
