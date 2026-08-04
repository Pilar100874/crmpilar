package br.com.pilar.tvsignage

import android.app.KeyguardManager
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.os.SystemClock
import android.os.UserManager
import android.util.Log

/**
 * Inicia o app automaticamente após o boot do aparelho (TV Box HK1 K8S / Android TV / tablets).
 *
 * Fluxo validado:
 *  - LOCKED_BOOT_COMPLETED (direct boot, antes do desbloqueio do usuário): em muitos firmwares
 *    o `startActivity` ainda é bloqueado até o usuário ser desbloqueado. Por isso tentamos abrir
 *    e, se falhar, reagendamos com backoff até o limite de tentativas.
 *  - BOOT_COMPLETED / QUICKBOOT_POWERON: abre a MainActivity após ~8s (dentro da janela 5–10s).
 *  - Duplicidade: se dois broadcasts chegarem (comum: LOCKED_BOOT_COMPLETED + BOOT_COMPLETED),
 *    apenas o primeiro agendamento efetiva a abertura dentro de DEDUPE_WINDOW_MS.
 *
 * Teste manual via ADB:
 *   adb shell am broadcast -a android.intent.action.LOCKED_BOOT_COMPLETED -n br.com.pilar.tvsignage/.BootReceiver
 *   adb shell am broadcast -a android.intent.action.QUICKBOOT_POWERON     -n br.com.pilar.tvsignage/.BootReceiver
 *   adb logcat -s PilarBootReceiver
 */
class BootReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent) {
        val action = intent.action
        val elapsed = SystemClock.elapsedRealtime()

        if (action == null || action !in BOOT_ACTIONS) {
            Log.w(TAG, "Broadcast ignorado (action=$action)")
            return
        }

        val appCtx = context.applicationContext
        val userUnlocked = isUserUnlocked(appCtx)
        val locked = isKeyguardLocked(appCtx)

        Log.i(
            TAG,
            "Boot recebido action=$action | uptime=${elapsed}ms | userUnlocked=$userUnlocked | " +
                "keyguardLocked=$locked | sdk=${Build.VERSION.SDK_INT} | device=${Build.MODEL}"
        )

        synchronized(lock) {
            val since = elapsed - lastScheduledAt
            if (lastScheduledAt > 0L && since < DEDUPE_WINDOW_MS) {
                Log.i(TAG, "Abertura já agendada há ${since}ms por '$lastScheduledAction' — ignorando '$action'")
                return
            }
            lastScheduledAt = elapsed
            lastScheduledAction = action
        }

        val pending = goAsync()
        Log.i(TAG, "Agendando abertura da MainActivity em ${BOOT_DELAY_MS}ms (janela alvo 5–10s)")

        scheduleLaunch(appCtx, action, attempt = 1, delay = BOOT_DELAY_MS) {
            pending.finish()
        }
    }

    private fun scheduleLaunch(
        appCtx: Context,
        action: String,
        attempt: Int,
        delay: Long,
        onSettled: () -> Unit
    ) {
        Handler(Looper.getMainLooper()).postDelayed({
            val t0 = SystemClock.elapsedRealtime()
            val ok = tryLaunch(appCtx, action, attempt)
            val took = SystemClock.elapsedRealtime() - t0

            if (ok) {
                Log.i(TAG, "MainActivity aberta na tentativa $attempt (startActivity levou ${took}ms)")
                onSettled()
                return@postDelayed
            }

            if (attempt >= MAX_ATTEMPTS) {
                Log.e(TAG, "Falha definitiva ao abrir MainActivity após $attempt tentativas (action=$action)")
                onSettled()
                return@postDelayed
            }

            val next = RETRY_DELAY_MS * attempt
            Log.w(TAG, "Tentativa $attempt falhou — nova tentativa em ${next}ms")
            scheduleLaunch(appCtx, action, attempt + 1, next, onSettled)
        }, delay)
    }

    private fun tryLaunch(appCtx: Context, action: String, attempt: Int): Boolean = try {
        val launch = Intent(appCtx, MainActivity::class.java).apply {
            addFlags(
                Intent.FLAG_ACTIVITY_NEW_TASK
                    or Intent.FLAG_ACTIVITY_CLEAR_TOP
                    or Intent.FLAG_ACTIVITY_SINGLE_TOP
            )
            putExtra(MainActivity.EXTRA_FROM_BOOT, true)
            putExtra(EXTRA_BOOT_ACTION, action)
            putExtra(EXTRA_BOOT_ATTEMPT, attempt)
        }
        appCtx.startActivity(launch)
        true
    } catch (e: Exception) {
        Log.e(TAG, "startActivity falhou (tentativa $attempt, action=$action): ${e.javaClass.simpleName}: ${e.message}")
        false
    }

    private fun isUserUnlocked(ctx: Context): Boolean = try {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            (ctx.getSystemService(Context.USER_SERVICE) as? UserManager)?.isUserUnlocked ?: true
        } else true
    } catch (e: Exception) {
        Log.w(TAG, "Não foi possível ler UserManager.isUserUnlocked: ${e.message}")
        true
    }

    private fun isKeyguardLocked(ctx: Context): Boolean = try {
        (ctx.getSystemService(Context.KEYGUARD_SERVICE) as? KeyguardManager)?.isKeyguardLocked ?: false
    } catch (e: Exception) {
        Log.w(TAG, "Não foi possível ler KeyguardManager: ${e.message}")
        false
    }

    companion object {
        private const val TAG = "PilarBootReceiver"

        /** Atraso base: dentro da janela exigida de 5–10s para a MainActivity aparecer. */
        private const val BOOT_DELAY_MS = 8000L
        private const val RETRY_DELAY_MS = 4000L
        private const val MAX_ATTEMPTS = 4
        private const val DEDUPE_WINDOW_MS = 60_000L

        const val EXTRA_BOOT_ACTION = "boot_action"
        const val EXTRA_BOOT_ATTEMPT = "boot_attempt"

        private val lock = Any()

        @Volatile
        private var lastScheduledAt = 0L

        @Volatile
        private var lastScheduledAction: String? = null

        private val BOOT_ACTIONS = setOf(
            Intent.ACTION_BOOT_COMPLETED,
            "android.intent.action.LOCKED_BOOT_COMPLETED",
            "android.intent.action.QUICKBOOT_POWERON",
            "com.htc.intent.action.QUICKBOOT_POWERON",
            "android.intent.action.REBOOT"
        )
    }
}
