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
import java.util.LinkedHashMap
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
        val attemptDetails: String = "",
        val attemptedSubscriptions: String = "",
    )

    private data class SmsCandidate(
        val manager: SmsManager,
        val simIndex: Int,
        val subscriptionId: Int,
        val label: String,
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

        val attempts = mutableListOf<String>()
        val candidates = resolveCandidates(ctx, senderHint?.toIntOrNull())
        var lastResult: Result? = null

        for (candidate in candidates) {
            val result = sendWithCandidate(ctx, to, text, candidate, startTs, onDelivered)
            val attempt = "${candidate.label}(sim=${candidate.simIndex},sub=${candidate.subscriptionId})=${result.errorCode}/${result.resultCode}"
            attempts += attempt
            lastResult = result.copy(
                attemptDetails = attempts.joinToString(" | "),
                attemptedSubscriptions = candidates.joinToString(",") { "${it.label}:sim=${it.simIndex}:sub=${it.subscriptionId}" },
            )
            if (result.ok) return lastResult
            Log.w(TAG, "Tentativa falhou: $attempt")
        }

        return lastResult ?: Result(
            ok = false,
            simUsed = senderHint?.toIntOrNull() ?: -1,
            subscriptionId = -1,
            resultCode = -1,
            errorCode = "SEM_GERENCIADOR_SMS",
            errorDescription = "Nenhum gerenciador/SIM de SMS disponível no aparelho",
            messageLength = text.length,
            parts = 0,
            timestamp = startTs,
            attemptDetails = "nenhuma tentativa executada",
            attemptedSubscriptions = "",
        )
    }

    private fun sendWithCandidate(
        ctx: Context,
        to: String,
        text: String,
        candidate: SmsCandidate,
        startTs: Long,
        onDelivered: ((delivered: Boolean, error: String?) -> Unit)?,
    ): Result {
        try {
            val manager = candidate.manager
            val parts = manager.divideMessage(text)

            val sentAction = "br.com.pilar.sms.SMS_SENT_${UUID.randomUUID()}"
            val deliveredAction = "br.com.pilar.sms.SMS_DELIVERED_${UUID.randomUUID()}"

            val sentLatch = CountDownLatch(parts.size)
            val worstCode = java.util.concurrent.atomic.AtomicInteger(Activity.RESULT_OK)
            val anyFailure = java.util.concurrent.atomic.AtomicBoolean(false)

            val sentReceiver = object : BroadcastReceiver() {
                override fun onReceive(c: Context?, intent: Intent?) {
                    val code = resultCode
                    if (code != Activity.RESULT_OK) {
                        anyFailure.set(true)
                        worstCode.set(code)
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
            val finalCode = if (!finished) Activity.RESULT_OK else worstCode.get()
            val (errName, errDesc) = describe(finalCode)
            val ok = !anyFailure.get() || finalCode == Activity.RESULT_OK
            Log.i(TAG, "DONE send to=$to len=${text.length} parts=${parts.size} sub=${candidate.subscriptionId} code=$finalCode ok=$ok")
            return Result(
                ok = ok || finalCode == Activity.RESULT_OK,
                simUsed = candidate.simIndex,
                subscriptionId = candidate.subscriptionId,
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
                simUsed = candidate.simIndex,
                subscriptionId = candidate.subscriptionId,
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

    /** Retorna candidatos em ordem: SIM escolhido, SIM padrão, SIMs ativos e fallback do Android. */
    private fun resolveCandidates(ctx: Context, simIndex: Int?): List<SmsCandidate> {
        val candidates = LinkedHashMap<String, SmsCandidate>()

        fun add(candidate: SmsCandidate) {
            val key = if (candidate.subscriptionId != -1) "sub:${candidate.subscriptionId}" else "fallback:${candidate.label}"
            if (!candidates.containsKey(key)) candidates[key] = candidate
        }

        try {
            val defaultSmsSubId = SubscriptionManager.getDefaultSmsSubscriptionId()
            val subs = try {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP_MR1) {
                    @Suppress("DEPRECATION")
                    SubscriptionManager.from(ctx).activeSubscriptionInfoList.orEmpty()
                } else emptyList()
            } catch (_: SecurityException) { emptyList() }

            if (simIndex != null && simIndex in subs.indices) {
                val subId = subs[simIndex].subscriptionId
                add(SmsCandidate(managerFor(ctx, subId), simIndex, subId, "selecionado"))
            }

            if (defaultSmsSubId != INVALID_SUBSCRIPTION_ID) {
                val idx = subs.indexOfFirst { it.subscriptionId == defaultSmsSubId }.takeIf { it >= 0 } ?: -1
                add(SmsCandidate(managerFor(ctx, defaultSmsSubId), idx, defaultSmsSubId, "padrao"))
            }

            subs.forEachIndexed { idx, info ->
                add(SmsCandidate(managerFor(ctx, info.subscriptionId), idx, info.subscriptionId, "sim_$idx"))
            }
        } catch (e: Exception) {
            Log.w(TAG, "Falha listando SIMs; usando fallback", e)
        }

        add(SmsCandidate(defaultManager(ctx), -1, -1, "android_default"))
        return candidates.values.toList()
    }

    private fun managerFor(ctx: Context, subId: Int): SmsManager {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            ctx.getSystemService(SmsManager::class.java).createForSubscriptionId(subId)
        } else {
            @Suppress("DEPRECATION")
            SmsManager.getSmsManagerForSubscriptionId(subId)
        }
    }

    private fun defaultManager(ctx: Context): SmsManager {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            ctx.getSystemService(SmsManager::class.java)
        } else {
            @Suppress("DEPRECATION")
            SmsManager.getDefault()
        }
    }
}
