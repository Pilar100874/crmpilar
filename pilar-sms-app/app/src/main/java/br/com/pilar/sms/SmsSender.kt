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
import android.telephony.SubscriptionManager.INVALID_SUBSCRIPTION_ID
import android.util.Log
import java.util.UUID
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit

/**
 * Envio de SMS.
 *  - NÃO faz split, trim, validação semântica ou reinterpretação do conteúdo.
 *  - Trata o texto como String opaca (vírgula, #, hífen, acentos, quebras de linha OK).
 *  - Retorna o código real do Android (RESULT_OK, GENERIC_FAILURE, NO_SERVICE, ...).
 */
object SmsSender {

    private const val TAG = "PilarSmsSender"

    data class Result(
        val ok: Boolean,
        val simUsed: Int,
        val subscriptionId: Int,
        val resultCode: Int,
        val errorCode: String,
        val errorDescription: String,
        val messageLength: Int,
        val parts: Int,
        val timestamp: Long,
    )

    private fun describe(code: Int): Pair<String, String> = when (code) {
        Activity.RESULT_OK -> "RESULT_OK" to "Envio confirmado pelo rádio do aparelho"
        SmsManager.RESULT_ERROR_GENERIC_FAILURE -> "RESULT_ERROR_GENERIC_FAILURE" to "Falha genérica reportada pelo Android (nem sempre significa falha real)"
        SmsManager.RESULT_ERROR_RADIO_OFF -> "RESULT_ERROR_RADIO_OFF" to "Rádio desligado (modo avião)"
        SmsManager.RESULT_ERROR_NULL_PDU -> "RESULT_ERROR_NULL_PDU" to "PDU nula gerada pelo sistema"
        SmsManager.RESULT_ERROR_NO_SERVICE -> "RESULT_ERROR_NO_SERVICE" to "Sem serviço da operadora"
        SmsManager.RESULT_ERROR_LIMIT_EXCEEDED -> "RESULT_ERROR_LIMIT_EXCEEDED" to "Limite de SMS do aparelho/operadora excedido"
        else -> "RESULT_CODE_$code" to "Código não mapeado retornado pelo Android"
    }

    /**
     * Envia UM SMS de forma síncrona e aguarda o retorno do rádio (SENT).
     * @param onDelivered opcional — chamado no futuro quando/if o delivery report chegar.
     */
    fun send(
        ctx: Context,
        to: String,
        message: String,
        senderHint: String?,
        onDelivered: ((delivered: Boolean, error: String?) -> Unit)? = null,
    ): Result {
        val startTs = System.currentTimeMillis()
        val text: String = message.toString() // garante String, não interpreta

        Log.i(TAG, "PREP send to=$to len=${text.length} parts=? content=<<${text}>>")

        try {
            val simIndex = senderHint?.toIntOrNull()
            val (manager, subId) = resolveManager(ctx, simIndex)
            val parts = manager.divideMessage(text)

            val sentAction = "br.com.pilar.sms.SMS_SENT_${UUID.randomUUID()}"
            val deliveredAction = "br.com.pilar.sms.SMS_DELIVERED_${UUID.randomUUID()}"

            val sentLatch = CountDownLatch(parts.size)
            @Volatile var worstCode = Activity.RESULT_OK
            @Volatile var anyFailure = false

            val sentReceiver = object : BroadcastReceiver() {
                override fun onReceive(c: Context?, intent: Intent?) {
                    val code = resultCode
                    if (code != Activity.RESULT_OK) {
                        anyFailure = true
                        worstCode = code
                    }
                    sentLatch.countDown()
                    if (sentLatch.count == 0L) {
                        try { ctx.unregisterReceiver(this) } catch (_: Exception) {}
                    }
                }
            }
            val deliveredReceiver = object : BroadcastReceiver() {
                override fun onReceive(c: Context?, intent: Intent?) {
                    val ok = resultCode == Activity.RESULT_OK
                    try { ctx.unregisterReceiver(this) } catch (_: Exception) {}
                    onDelivered?.invoke(ok, if (ok) null else "delivery code=$resultCode")
                }
            }

            registerReceiverCompat(ctx, sentReceiver, IntentFilter(sentAction))
            if (onDelivered != null) registerReceiverCompat(ctx, deliveredReceiver, IntentFilter(deliveredAction))

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
                manager.sendTextMessage(to, null, text, sentPI, deliveredPI)
            }

            val finished = sentLatch.await(20, TimeUnit.SECONDS)
            val finalCode = if (!finished) Activity.RESULT_OK else worstCode
            val (errName, errDesc) = describe(finalCode)
            val ok = !anyFailure || finalCode == Activity.RESULT_OK
            Log.i(TAG, "DONE send to=$to len=${text.length} parts=${parts.size} code=$finalCode ok=$ok")
            return Result(
                ok = ok || finalCode == Activity.RESULT_OK,
                simUsed = simIndex ?: -1,
                subscriptionId = subId,
                resultCode = finalCode,
                errorCode = errName,
                errorDescription = errDesc,
                messageLength = text.length,
                parts = parts.size,
                timestamp = startTs,
            )
        } catch (e: Exception) {
            Log.e(TAG, "EXC send to=$to len=${text.length}", e)
            return Result(
                ok = false,
                simUsed = senderHint?.toIntOrNull() ?: -1,
                subscriptionId = -1,
                resultCode = -1,
                errorCode = "EXCEPTION",
                errorDescription = e.message ?: "erro desconhecido",
                messageLength = text.length,
                parts = 0,
                timestamp = startTs,
            )
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

    /** Retorna (SmsManager, subscriptionId) — subscriptionId=-1 se indeterminado. */
    private fun resolveManager(ctx: Context, simIndex: Int?): Pair<SmsManager, Int> {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            val sm = ctx.getSystemService(SmsManager::class.java)
            try {
                val subMgr = ctx.getSystemService(SubscriptionManager::class.java)
                val defaultSmsSubId = SubscriptionManager.getDefaultSmsSubscriptionId()
                val subs = subMgr?.activeSubscriptionInfoList.orEmpty()
                val selectedSubId = if (simIndex != null && simIndex in subs.indices) subs[simIndex].subscriptionId
                else if (defaultSmsSubId != INVALID_SUBSCRIPTION_ID) defaultSmsSubId else -1
                if (selectedSubId != -1) {
                    ctx.getSystemService(SmsManager::class.java).createForSubscriptionId(selectedSubId) to selectedSubId
                } else sm to -1
            } catch (_: SecurityException) { sm to -1 }
        } else {
            @Suppress("DEPRECATION")
            try {
                val subs = SubscriptionManager.from(ctx).activeSubscriptionInfoList
                val defaultSmsSubId = SubscriptionManager.getDefaultSmsSubscriptionId()
                val selectedSubId = if (simIndex != null && subs != null && simIndex in subs.indices) subs[simIndex].subscriptionId
                else if (defaultSmsSubId != INVALID_SUBSCRIPTION_ID) defaultSmsSubId else -1
                if (selectedSubId != -1) SmsManager.getSmsManagerForSubscriptionId(selectedSubId) to selectedSubId
                else SmsManager.getDefault() to -1
            } catch (_: SecurityException) { SmsManager.getDefault() to -1 }
        }
    }
}
