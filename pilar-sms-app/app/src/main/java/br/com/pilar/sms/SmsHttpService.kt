package br.com.pilar.sms

import android.app.*
import android.content.Context
import android.content.Intent
import android.net.wifi.WifiManager
import android.os.Build
import android.os.IBinder
import android.os.PowerManager
import androidx.core.app.NotificationCompat
import fi.iki.elonen.NanoHTTPD
import org.json.JSONObject
import java.util.UUID

class SmsHttpService : Service() {

    private var server: HttpServer? = null
    private var wakeLock: PowerManager.WakeLock? = null

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val prefs = getSharedPreferences("pilar_sms", Context.MODE_PRIVATE)
        val port = prefs.getInt("port", 8080)
        val token = prefs.getString("token", "") ?: ""

        startForeground(NOTIF_ID, buildNotification("Servidor ativo na porta $port"))

        val pm = getSystemService(POWER_SERVICE) as PowerManager
        wakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "PilarSms::HttpWakeLock").apply {
            setReferenceCounted(false); acquire()
        }

        try {
            server?.stop()
            server = HttpServer(this, port, token).also { it.start(NanoHTTPD.SOCKET_READ_TIMEOUT, true) }
        } catch (e: Exception) {
            stopSelf()
        }
        return START_STICKY
    }

    override fun onDestroy() {
        server?.stop(); server = null
        wakeLock?.let { if (it.isHeld) it.release() }
        super.onDestroy()
    }

    private fun buildNotification(text: String): Notification {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val ch = NotificationChannel(CHANNEL_ID, "Pilar SMS", NotificationManager.IMPORTANCE_LOW)
            (getSystemService(NOTIFICATION_SERVICE) as NotificationManager).createNotificationChannel(ch)
        }
        val pi = PendingIntent.getActivity(
            this, 0, Intent(this, MainActivity::class.java),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("Pilar SMS Gateway")
            .setContentText(text)
            .setSmallIcon(android.R.drawable.stat_sys_data_bluetooth)
            .setOngoing(true)
            .setContentIntent(pi)
            .build()
    }

    class HttpServer(
        private val ctx: Context,
        port: Int,
        private val token: String
    ) : NanoHTTPD(port) {

        override fun serve(session: IHTTPSession): Response {
            return try {
                when {
                    session.method == Method.GET && session.uri == "/health" ->
                        json(Response.Status.OK, mapOf("ok" to true, "version" to "1.0.0"))

                    session.method == Method.POST && session.uri == "/send" -> handleSend(session)

                    else -> json(Response.Status.NOT_FOUND, mapOf("error" to "not_found"))
                }
            } catch (e: Exception) {
                json(Response.Status.INTERNAL_ERROR, mapOf("error" to (e.message ?: "internal")))
            }
        }

        private fun handleSend(session: IHTTPSession): Response {
            val auth = session.headers["authorization"].orEmpty()
            if (token.isBlank() || auth != "Bearer $token") {
                return json(Response.Status.UNAUTHORIZED, mapOf("error" to "unauthorized"))
            }
            val body = HashMap<String, String>()
            session.parseBody(body)
            val raw = body["postData"] ?: return json(Response.Status.BAD_REQUEST, mapOf("error" to "empty_body"))
            val payload = JSONObject(raw)
            val to = payload.optString("to")
            val msg = payload.optString("message")
            val sender = payload.optString("sender", null.toString()).takeIf { it != "null" }

            if (to.isBlank() || msg.isBlank()) {
                return json(Response.Status.BAD_REQUEST, mapOf("error" to "invalid_payload"))
            }

            val result = SmsSender.send(ctx, to, msg, sender)
            return if (result.ok) {
                json(Response.Status.OK, mapOf("ok" to true, "id" to UUID.randomUUID().toString(), "sim" to result.simUsed))
            } else {
                json(Response.Status.INTERNAL_ERROR, mapOf("ok" to false, "error" to (result.error ?: "send_failed")))
            }
        }

        private fun json(status: Response.Status, data: Map<String, Any?>): Response {
            val obj = JSONObject(data)
            return newFixedLengthResponse(status, "application/json", obj.toString())
        }
    }

    companion object {
        const val CHANNEL_ID = "pilar_sms_channel"
        const val NOTIF_ID = 4711

        fun localIp(ctx: Context): String {
            // 1) tenta enumerar interfaces (funciona em Wi-Fi, hotspot e dados móveis, sem permissão extra)
            try {
                val interfaces = java.net.NetworkInterface.getNetworkInterfaces()
                for (nif in interfaces) {
                    if (!nif.isUp || nif.isLoopback || nif.isVirtual) continue
                    val name = nif.name.lowercase()
                    // prioriza wlan (Wi-Fi) e rmnet/ccmni (dados móveis)
                    for (addr in nif.inetAddresses) {
                        if (addr.isLoopbackAddress) continue
                        val host = addr.hostAddress ?: continue
                        // apenas IPv4
                        if (host.contains(":")) continue
                        if (host == "0.0.0.0") continue
                        return host
                    }
                }
            } catch (_: Exception) {}

            // 2) fallback pro WifiManager (Android antigo)
            try {
                val wm = ctx.applicationContext.getSystemService(Context.WIFI_SERVICE) as WifiManager
                @Suppress("DEPRECATION")
                val ip = wm.connectionInfo.ipAddress
                if (ip != 0) {
                    return String.format("%d.%d.%d.%d", ip and 0xff, ip shr 8 and 0xff, ip shr 16 and 0xff, ip shr 24 and 0xff)
                }
            } catch (_: Exception) {}

            return "0.0.0.0"
        }
    }
}
