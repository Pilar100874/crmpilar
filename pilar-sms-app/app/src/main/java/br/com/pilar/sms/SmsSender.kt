package br.com.pilar.sms

import android.content.Context
import android.os.Build
import android.telephony.SmsManager
import android.telephony.SubscriptionManager

object SmsSender {

    data class Result(val ok: Boolean, val simUsed: Int, val error: String? = null)

    fun send(ctx: Context, to: String, message: String, senderHint: String?): Result {
        return try {
            val simIndex = senderHint?.toIntOrNull() ?: 0
            val manager: SmsManager = resolveManager(ctx, simIndex)

            val parts = manager.divideMessage(message)
            if (parts.size > 1) {
                manager.sendMultipartTextMessage(to, null, parts, null, null)
            } else {
                manager.sendTextMessage(to, null, message, null, null)
            }
            Result(true, simIndex)
        } catch (e: Exception) {
            Result(false, -1, e.message ?: "unknown error")
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
