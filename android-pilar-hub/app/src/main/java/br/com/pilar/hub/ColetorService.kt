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

    private val escopo = CoroutineScope(Dispatchers.IO)
    private var lacoPonto: Job? = null
    private var lacoAutomacao: Job? = null
    private var lacoComandos: Job? = null
    private var lacoRemoto: Job? = null

    companion object {
        const val CANAL = "pilar_coletor"
        const val ACAO_SINCRONIZAR = "br.com.pilar.hub.SINCRONIZAR"
        const val ATUALIZOU = "br.com.pilar.hub.ATUALIZOU"

        private const val INTERVALO_PONTO = 15_000L
        private const val INTERVALO_AUTOMACAO = 5_000L
        private const val INTERVALO_COMANDOS = 400L
        private const val INTERVALO_REMOTO = 60_000L

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
        iniciarLacos()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (intent?.action == ACAO_SINCRONIZAR) {
            escopo.launch {
                rodarPonto()
                rodarAutomacao()
            }
        }
        iniciarLacos()
        return START_STICKY
    }

    override fun onDestroy() {
        lacoPonto?.cancel()
        lacoAutomacao?.cancel()
        lacoComandos?.cancel()
        lacoRemoto?.cancel()
        ColetorEstado.rodando = false
        super.onDestroy()
    }

    private fun iniciarLacos() {
        if (lacoPonto?.isActive != true) {
            lacoPonto = escopo.launch {
                while (isActive) {
                    rodarPonto()
                    delay(INTERVALO_PONTO)
                }
            }
        }
        if (lacoAutomacao?.isActive != true) {
            lacoAutomacao = escopo.launch {
                while (isActive) {
                    rodarAutomacao()
                    delay(INTERVALO_AUTOMACAO)
                }
            }
        }
        if (lacoComandos?.isActive != true) {
            lacoComandos = escopo.launch {
                while (isActive) {
                    if (Prefs.automacaoAtiva(this@ColetorService)) {
                        runCatching { AutomacaoColetor.executarJobs(this@ColetorService) }
                    }
                    delay(INTERVALO_COMANDOS)
                }
            }
        }
        if (lacoRemoto?.isActive != true) {
            lacoRemoto = escopo.launch {
                while (isActive) {
                    runCatching { ColetorRemoto.bater(this@ColetorService) }
                    delay(INTERVALO_REMOTO)
                }
            }
        }
    }

    private fun rodarPonto() {
        if (!Prefs.pontoAtivo(this)) {
            ColetorEstado.relogios = emptyList()
            return
        }
        try {
            PontoColetor.sincronizar(this)
        } catch (e: Exception) {
            ColetorEstado.erros++
            ColetorEstado.ultimoErro = e.message ?: "Falha ao ler os relógios de ponto"
        }
        ColetorEstado.ultimaSync = agora()
        avisarTela()
    }

    private fun rodarAutomacao() {
        if (!Prefs.automacaoAtiva(this)) {
            ColetorEstado.dispositivos = emptyList()
            return
        }
        try {
            AutomacaoColetor.sincronizar(this)
        } catch (e: Exception) {
            ColetorEstado.erros++
            ColetorEstado.ultimoErro = e.message ?: "Falha ao atender os dispositivos de automação"
        }
        avisarTela()
    }

    private fun agora(): String =
        java.text.SimpleDateFormat("HH:mm:ss", java.util.Locale.getDefault()).format(java.util.Date())

    private fun avisarTela() {
        atualizarNotificacao()
        sendBroadcast(Intent(ATUALIZOU).setPackage(packageName))
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
            .setStyle(NotificationCompat.BigTextStyle().bigText(texto))
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
