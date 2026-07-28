package br.com.pilar.sms

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.provider.Telephony
import android.util.Log
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL

/**
 * Captura SMS recebidos e encaminha para o CRM (tracker-sms-inbound).
 * O CRM correlaciona pelo telefone remetente com o cadastro do veículo/rastreador.
 * Se o chip do rastreador não responder por SMS, simplesmente nada chega — é opcional.
 */
class SmsInboundReceiver : BroadcastReceiver() {

    companion object { private const val TAG = "PilarSmsInbound" }

    override fun onReceive(ctx: Context, intent: Intent?) {
        if (intent?.action != Telephony.Sms.Intents.SMS_RECEIVED_ACTION) return
        val msgs = Telephony.Sms.Intents.getMessagesFromIntent(intent) ?: return

        // Agrupa partes de SMS multi-part por remetente
        val agrupado = HashMap<String, StringBuilder>()
        var lastTs = 0L
        for (m in msgs) {
            val from = m.originatingAddress ?: continue
            agrupado.getOrPut(from) { StringBuilder() }.append(m.messageBody ?: "")
            lastTs = maxOf(lastTs, m.timestampMillis)
        }

        val token = ctx.getSharedPreferences("pilar_sms", Context.MODE_PRIVATE)
            .getString("device_token", "") ?: ""
        if (token.isBlank()) {
            Log.w(TAG, "Sem token — SMS de entrada não será encaminhado")
            return
        }

        val ts = if (lastTs > 0) lastTs else System.currentTimeMillis()
        val scope = CoroutineScope(Dispatchers.IO)
        for ((from, sb) in agrupado) {
            val body = sb.toString()
            Log.i(TAG, "SMS entrada de=$from len=${body.length}")
            scope.launch { postInbound(token, from, body, ts) }
        }
    }

    private fun postInbound(token: String, from: String, message: String, at: Long) {
        try {
            val url = URL("${SmsPollingService.SUPABASE_URL}/functions/v1/tracker-sms-inbound")
            val conn = url.openConnection() as HttpURLConnection
            conn.requestMethod = "POST"
            conn.doOutput = true
            conn.connectTimeout = 10_000
            conn.readTimeout = 15_000
            conn.setRequestProperty("Content-Type", "application/json")
            conn.setRequestProperty("apikey", SmsPollingService.ANON_KEY)
            conn.setRequestProperty("Authorization", "Bearer ${SmsPollingService.ANON_KEY}")
            conn.setRequestProperty("X-Device-Token", token)
            val body = JSONObject().apply {
                put("from", from)
                put("message", message)
                put("at", at)
            }.toString()
            conn.outputStream.use { it.write(body.toByteArray()) }
            val code = conn.responseCode
            Log.i(TAG, "Inbound postado from=$from status=$code")
        } catch (e: Exception) {
            Log.w(TAG, "Falha ao postar SMS de entrada", e)
        }
    }
}
