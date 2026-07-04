package br.com.pilar.hub.sms

import android.content.Context
import android.os.BatteryManager
import android.telephony.SmsManager
import br.com.pilar.hub.ApiClient
import org.json.JSONObject

object SmsModule {
    /**
     * Polling da fila de SMS do CRM.
     * Endpoints: sms-queue-poll (busca) e sms-queue-ack (confirma).
     * Autenticação via header X-Device-Token.
     */
    fun processarFila(ctx: Context, deviceToken: String) {
        try {
            val bm = ctx.getSystemService(Context.BATTERY_SERVICE) as? BatteryManager
            val bateria = bm?.getIntProperty(BatteryManager.BATTERY_PROPERTY_CAPACITY) ?: -1

            val pollBody = JSONObject().apply {
                if (bateria >= 0) put("bateria", bateria)
                put("limit", 5)
            }.toString()

            val headers = mapOf("X-Device-Token" to deviceToken)
            val resp = ApiClient.post("sms-queue-poll", pollBody, headers)
            val json = JSONObject(resp)
            val arr = json.optJSONArray("messages") ?: return

            val sm = SmsManager.getDefault()
            for (i in 0 until arr.length()) {
                val msg = arr.getJSONObject(i)
                val id = msg.getString("id")
                val to = msg.optString("telefone", msg.optString("phone"))
                val text = msg.optString("mensagem", msg.optString("message"))
                try {
                    sm.sendTextMessage(to, null, text, null, null)
                    ApiClient.post(
                        "sms-queue-ack",
                        JSONObject().apply {
                            put("id", id)
                            put("success", true)
                        }.toString(),
                        headers
                    )
                } catch (e: Exception) {
                    ApiClient.post(
                        "sms-queue-ack",
                        JSONObject().apply {
                            put("id", id)
                            put("success", false)
                            put("erro", e.message ?: "erro desconhecido")
                        }.toString(),
                        headers
                    )
                }
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }
}
