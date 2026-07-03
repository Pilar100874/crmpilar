package br.com.pilar.hub.sms

import android.content.Context
import android.telephony.SmsManager
import br.com.pilar.hub.ApiClient
import org.json.JSONObject

object SmsModule {
    fun processarFila(ctx: Context, deviceToken: String) {
        try {
            val body = JSONObject().apply {
                put("device_token", deviceToken)
                put("action", "fetch_queue")
            }.toString()
            val resp = ApiClient.post("pilar-sms-queue", body)
            val json = JSONObject(resp)
            val arr = json.optJSONArray("messages") ?: return
            val sm = SmsManager.getDefault()
            for (i in 0 until arr.length()) {
                val msg = arr.getJSONObject(i)
                val to = msg.getString("phone")
                val text = msg.getString("message")
                val id = msg.getString("id")
                try {
                    sm.sendTextMessage(to, null, text, null, null)
                    ApiClient.post("pilar-sms-queue", JSONObject().apply {
                        put("device_token", deviceToken)
                        put("action", "mark_sent")
                        put("message_id", id)
                    }.toString())
                } catch (e: Exception) {
                    ApiClient.post("pilar-sms-queue", JSONObject().apply {
                        put("device_token", deviceToken)
                        put("action", "mark_failed")
                        put("message_id", id)
                        put("error", e.message)
                    }.toString())
                }
            }
        } catch (e: Exception) { e.printStackTrace() }
    }
}
