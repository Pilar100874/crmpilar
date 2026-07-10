package br.com.pilar.sms

import android.app.Activity
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.os.Build
import android.telephony.SmsManager
import android.telephony.SubscriptionManager
import java.util.UUID

object SmsSender {

    data class Result(val ok: Boolean, val simUsed: Int, val error: String? = null)

    /**
     * Envia o SMS e:
     *  - retorna Result assim que o Android confirma o SENT (rádio saiu do celular);
     *  - quando o DELIVERED chegar (relatório da operadora, pode demorar segundos ou não chegar),
     *    chama [onDelivered] em um thread do BroadcastReceiver. `delivered=true` = operadora
     *    confirmou entrega ao aparelho destino; `delivered=false` = falha reportada.
     */
    fun send(
        ctx: Context,
        to: String,
        message: String,
        senderHint: String?,
        onDelivered: ((delivered: Boolean, error: String?) -> Unit)? = null,
    ): Result {
        return try {
            val simIndex = senderHint?.toIntOrNull() ?: 0
            val manager: SmsManager = resolveManager(ctx, simIndex)

            val parts = manager.divideMessage(message)
            val sentAction = "br.com.pilar.sms.SMS_SENT_${UUID.randomUUID()}"
            val deliveredAction = "br.com.pilar.sms.SMS_DELIVERED_${UUID.randomUUID()}"

            // Barreira síncrona para o SENT — só voltamos deste método após o rádio confirmar.
            val sentLatch = java.util.concurrent.CountDownLatch(1)
            var sentOk = false
            var sentErr: String? = null

            val sentReceiver = object : BroadcastReceiver() {
                override fun onReceive(c: Context?, intent: Intent?) {
                    sentOk = resultCode == Activity.RESULT_OK
                    if (!sentOk) sentErr = when (resultCode) {
                        SmsManager.RESULT_ERROR_GENERIC_FAILURE -> "GENERIC_FAILURE"
                        SmsManager.RESULT_ERROR_NO_SERVICE -> "NO_SERVICE (sem sinal)"
                        SmsManager.RESULT_ERROR_NULL_PDU -> "NULL_PDU"
                        SmsManager.RESULT_ERROR_RADIO_OFF -> "RADIO_OFF (modo avião)"
                        else -> "sent code=$resultCode"
                    }
                    try { ctx.unregisterReceiver(this) } catch (_: Exception) {}
                    sentLatch.countDown()
                }
            }
            val deliveredReceiver = object : BroadcastReceiver() {
                override fun onReceive(c: Context?, intent: Intent?) {
                    val ok = resultCode == Activity.RESULT_OK
                    val err = if (ok) null else "delivery code=$resultCode"
                    try { ctx.unregisterReceiver(this) } catch (_: Exception) {}
                    onDelivered?.invoke(ok, err)
                }
            }

            registerReceiverCompat(ctx, sentReceiver, IntentFilter(sentAction))
            if (onDelivered != null) {
                registerReceiverCompat(ctx, deliveredReceiver, IntentFilter(deliveredAction))
            }

            val piFlags =
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S)
                    PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_MUTABLE
                else PendingIntent.FLAG_UPDATE_CURRENT

            val sentPI = PendingIntent.getBroadcast(
                ctx, 0, Intent(sentAction).setPackage(ctx.packageName), piFlags
            )
            val deliveredPI = if (onDelivered != null) PendingIntent.getBroadcast(
                ctx, 0, Intent(deliveredAction).setPackage(ctx.packageName), piFlags
            ) else null

            if (parts.size > 1) {
                val sentList = ArrayList<PendingIntent>().apply { for (i in parts.indices) add(sentPI) }
                val delList = if (deliveredPI != null)
                    ArrayList<PendingIntent>().apply { for (i in parts.indices) add(deliveredPI) }
                else null
                manager.sendMultipartTextMessage(to, null, parts, sentList, delList)
            } else {
                manager.sendTextMessage(to, null, message, sentPI, deliveredPI)
            }

            // Aguarda no máximo 15s pelo SENT — se estourar, considera enviado (rádio pode estar lento).
            sentLatch.await(15, java.util.concurrent.TimeUnit.SECONDS)
            Result(sentOk || sentLatch.count > 0, simIndex, sentErr)
        } catch (e: Exception) {
            Result(false, -1, e.message ?: "unknown error")
        }
    }

    private fun registerReceiverCompat(ctx: Context, r: BroadcastReceiver, f: IntentFilter) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            ctx.registerReceiver(r, f, Context.RECEIVER_NOT_EXPORTED)
        } else {
            @Suppress("UnspecifiedRegisterReceiverFlag")
            ctx.registerReceiver(r, f)
        }
    }

    private fun resolveManager(ctx: Context, simIndex: Int): SmsManager {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            val sm = ctx.getSystemService(SmsManager::class.java)
            try {
                val subMgr = ctx.getSystemService(SubscriptionManager::class.java)
                val subs = subMgr?.activeSubscriptionInfoList
                if (subs != null && simIndex in subs.indices) {
                    ctx.getSystemService(SmsManager::class.java)
                        .createForSubscriptionId(subs[simIndex].subscriptionId)
                } else sm
            } catch (_: SecurityException) { sm }
        } else {
            @Suppress("DEPRECATION")
            try {
                val subs = SubscriptionManager.from(ctx).activeSubscriptionInfoList
                if (subs != null && simIndex in subs.indices) {
                    SmsManager.getSmsManagerForSubscriptionId(subs[simIndex].subscriptionId)
                } else SmsManager.getDefault()
            } catch (_: SecurityException) { SmsManager.getDefault() }
        }
    }
}
