package br.com.pilar.hub

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.IBinder
import androidx.core.app.NotificationCompat
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch

/** Mantém o coletor trabalhando em segundo plano: relógios de ponto e automação. */
class ColetorService : Service() {

    private var ciclo: Job? = null

    companion object {
        const val CANAL = "pilar_coletor"
        const val ACAO_SINCRONIZAR = "br.com.pilar.hub.SINCRONIZAR"
        const val ATUALIZOU = "br.com.pilar.hub.ATUALIZOU"

        fun iniciar(ctx: Context) {
            val intent = Intent(ctx, ColetorService::class.java)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) ctx.startForegroundService(intent)
            else ctx.startService(intent)
        }

        fun parar(ctx: Context) {
            ctx.stopService(Intent(ctx, ColetorService::class.java))
        }

        fun sincronizarAgora(ctx: Context) {
            val intent = Intent(ctx, ColetorService::class.java).setAction(ACAO_SINCRONIZAR)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) ctx.startForegroundService(intent)
            else ctx.startService(intent)
        }
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        criarCanal()
        startForeground(1, notificacao("Coletor Pilar em funcionamento"))
        ColetorEstado.rodando = true
        Prefs.salvarColetorAtivo(this, true)
        iniciarCiclo()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (intent?.action == ACAO_SINCRONIZAR) iniciarCiclo()
        return START_STICKY
    }

    override fun onDestroy() {
        ciclo?.cancel()
        ColetorEstado.rodando = false
        super.onDestroy()
    }

    private fun iniciarCiclo() {
        if (ciclo?.isActive == true) return
        ciclo = CoroutineScope(Dispatchers.IO).launch {
            while (isActive) {
                rodarUmaVez()
                delay(60_000L)
            }
        }
    }

    private fun rodarUmaVez() {
        try {
            PontoColetor.sincronizar(this)
        } catch (e: Exception) {
            ColetorEstado.ultimoErro = e.message ?: "Falha ao ler os relógios de ponto"
        }
        try {
            AutomacaoColetor.sincronizar(this)
        } catch (e: Exception) {
            ColetorEstado.ultimoErro = e.message ?: "Falha ao atender os dispositivos de automação"
        }
        ColetorEstado.ultimaSync = java.text.SimpleDateFormat("HH:mm:ss", java.util.Locale.getDefault())
            .format(java.util.Date())
        atualizarNotificacao()
        sendBroadcast(Intent(ATUALIZOU).setPackage(packageName))
        AtualizadorApp.processarComandoRemoto(this)
    }

    private fun criarCanal() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
        val canal = NotificationChannel(CANAL, "Coletor Pilar", NotificationManager.IMPORTANCE_LOW)
        canal.description = "Mantém a coleta de ponto e a automação funcionando"
        getSystemService(NotificationManager::class.java).createNotificationChannel(canal)
    }

    private fun notificacao(texto: String): Notification {
        val abrir = PendingIntent.getActivity(
            this,
            0,
            Intent(this, MainActivity::class.java),
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
        )
        return NotificationCompat.Builder(this, CANAL)
            .setContentTitle("Pilar Coletor")
            .setContentText(texto)
            .setSmallIcon(R.mipmap.ic_launcher)
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setContentIntent(abrir)
            .build()
    }

    private fun atualizarNotificacao() {
        runCatching {
            getSystemService(NotificationManager::class.java).notify(1, notificacao(ColetorEstado.resumo()))
        }
    }
}
