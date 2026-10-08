package br.com.pilar.voz

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.IBinder
import android.os.PowerManager
import org.json.JSONArray
import org.json.JSONObject
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.concurrent.TimeUnit

/**
 * Serviço em segundo plano: mantém o ramal da IA registrado na central,
 * atende ligações, executa os pedidos do CRM e conversa usando a IA do sistema.
 */
class VozService : Service() {
    private var agente: SipAgente? = null
    @Volatile private var rodando = false
    private var trava: PowerManager.WakeLock? = null

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (intent?.action == ACAO_PARAR) { pararTudo(); stopSelf(); return START_NOT_STICKY }
        iniciarPrimeiroPlano("Conectando à central…")
        if (!rodando) { rodando = true; Thread(::principal, "pilar-voz").start() }
        return START_STICKY
    }

    private fun principal() {
        val pref = getSharedPreferences(PREF, MODE_PRIVATE)
        Api.chave = pref.getString("chave", "") ?: ""
        trava = (getSystemService(POWER_SERVICE) as PowerManager)
            .newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "pilarvoz:servico").apply { acquire() }
        while (rodando) {
            try {
                val cfg = Api.config()
                val ramal = pref.getString("ramal", "")!!.ifBlank { cfg.optString("ramal_ia") }
                val host = pref.getString("host", "")!!
                val porta = pref.getString("porta", "5060")!!.toIntOrNull() ?: 5060
                if (host.isBlank() || ramal.isBlank()) { log("Preencha o endereço da central e o ramal"); return }
                val sip = SipAgente(host, porta, ramal, pref.getString("senha", "")!!, ::log) { c -> aoReceber(c) }
                agente = sip
                if (!sip.registrar()) { sip.parar(); Thread.sleep(15_000); continue }
                log("Ramal $ramal registrado em $host"); atualizarNotificacao("Ramal $ramal pronto para atender")
                var ultimoRegistro = System.currentTimeMillis()
                while (rodando) {
                    if (System.currentTimeMillis() - ultimoRegistro > 240_000) {
                        if (!sip.registrar()) break; ultimoRegistro = System.currentTimeMillis()
                    }
                    runCatching { Api.proximoComando() }.getOrNull()?.let { executarComando(sip, it) }
                    Thread.sleep(3000)
                }
                sip.parar()
            } catch (e: Exception) {
                log("Erro: ${e.message}"); Thread.sleep(15_000)
            }
        }
    }

    private fun aoReceber(c: Chamada) {
        val cfg = runCatching { Api.config() }.getOrNull()
        val modos = cfg?.optJSONArray("modos")?.let { a -> (0 until a.length()).map { a.getString(it) } } ?: emptyList()
        if (cfg == null || "receber" !in modos || agente?.chamadas?.size ?: 0 > 1) { agente?.recusar(c); return }
        log("Atendendo ${c.numero}")
        agente?.atender(c)
        conduzir(c, cfg, "receber", null)
    }

    private fun executarComando(sip: SipAgente, cmd: JSONObject) {
        val id = cmd.getString("id"); val tipo = cmd.optString("tipo")
        val escuta = getSharedPreferences(PREF, MODE_PRIVATE).getString("codigo_escuta", "*45")!!
        val destino = if (tipo == "ligar") cmd.optString("numero") else "$escuta${cmd.optString("ramal")}"
        log(if (tipo == "ligar") "Ligando para $destino" else "Escutando o ramal ${cmd.optString("ramal")}")
        Thread {
            val c = sip.ligar(destino)
            if (c == null) { Api.statusComando(id, "sem_resposta"); return@Thread }
            Api.statusComando(id, "concluido")
            val cfg = runCatching { Api.config() }.getOrElse { JSONObject() }
            conduzir(c, cfg, if (tipo == "ligar") "ligar" else "assistir", cmd.optString("objetivo").ifBlank { null },
                numero = cmd.optString("numero").ifBlank { null }, ramal = cmd.optString("ramal").ifBlank { null })
        }.start()
    }

    /** Conversa por turnos: escuta até a pessoa parar de falar, envia à IA e toca a resposta. */
    private fun conduzir(c: Chamada, cfg: JSONObject, modo: String, objetivo: String?, numero: String? = c.numero, ramal: String? = null) {
        val chamadaId = runCatching { Api.iniciar(modo, numero, ramal) }.getOrNull()
        val hist = JSONArray()
        fun registrar(papel: String, texto: String) {
            if (texto.isBlank()) return
            hist.put(JSONObject().put("papel", papel).put("texto", texto))
            chamadaId?.let { Api.fala(it, papel, texto) }
        }
        var erro = false
        try {
            val saudacao = cfg.optString("saudacao")
            if (modo != "assistir" && saudacao.isNotBlank()) {
                runCatching {
                    val r = Api.turno(null, JSONArray().put(JSONObject().put("papel", "cliente").put("texto", ".")), "receber", null,
                        "Diga exatamente, sem mudar nada: $saudacao")
                    r.optString("audio_b64").takeIf { it.isNotBlank() && it != "null" }?.let { c.rtp.tocar(Audio.wavPara8k(it)) }
                }
                registrar("agente", saudacao)
            }
            val trecho = ArrayList<Short>(); var silencio = 0; var falando = false
            while (c.ativa) {
                val q = c.rtp.entrada.poll(300, TimeUnit.MILLISECONDS) ?: continue
                if (modo != "assistir" && c.rtp.tocando()) { trecho.clear(); falando = false; continue }
                val e = Audio.energia(q)
                if (e > LIMIAR_FALA) { falando = true; silencio = 0; q.forEach { trecho.add(it) } }
                else if (falando) {
                    q.forEach { trecho.add(it) }
                    if (++silencio > 35) {
                        if (trecho.size > 4000) {
                            val r = runCatching { Api.turno(Audio.paraBase64(Audio.wav8k(trecho.toShortArray())), hist, modo, objetivo, null, chamadaId, numero) }
                                .onFailure { log("IA: ${it.message}") }.getOrNull()
                            if (r != null) {
                                registrar("cliente", r.optString("fala"))
                                val resp = r.optString("resposta").trim()
                                if (modo == "assistir") { if (resp.isNotBlank()) chamadaId?.let { Api.sugestao(it, resp) } }
                                else if (resp.isNotBlank()) {
                                    registrar("agente", resp.replace("[TRANSFERIR]", "").replace("[DESLIGAR]", "").trim())
                                    r.optString("audio_b64").takeIf { it.isNotBlank() && it != "null" }?.let { c.rtp.tocar(Audio.wavPara8k(it)) }
                                    while (c.ativa && c.rtp.tocando()) Thread.sleep(100)
                                    val transf = if (modo == "ligar" && !ramal.isNullOrBlank()) ramal else cfg.optString("ramal_transferencia")
                                    if (resp.contains("[TRANSFERIR]") && transf.isNotBlank()) { c.transferir(transf); Thread.sleep(4000); break }
                                    if (resp.contains("[DESLIGAR]")) break
                                }
                            }
                        }
                        trecho.clear(); silencio = 0; falando = false
                    }
                }
            }
        } catch (e: Exception) { erro = true; log("Erro na ligação: ${e.message}") }
        finally {
            c.desligar()
            chamadaId?.let { Api.finalizar(it, erro) }
            log("Ligação encerrada")
        }
    }

    private fun pararTudo() { rodando = false; Thread { agente?.parar() }.start(); runCatching { trava?.release() } }
    override fun onDestroy() { pararTudo(); super.onDestroy() }

    private fun iniciarPrimeiroPlano(texto: String) {
        val nm = getSystemService(NotificationManager::class.java)
        if (Build.VERSION.SDK_INT >= 26) nm.createNotificationChannel(NotificationChannel(CANAL, "Pilar Voz", NotificationManager.IMPORTANCE_LOW))
        startForeground(1, notificacao(texto))
    }

    private fun atualizarNotificacao(texto: String) = getSystemService(NotificationManager::class.java).notify(1, notificacao(texto))

    private fun notificacao(texto: String): Notification {
        val abrir = PendingIntent.getActivity(this, 0, Intent(this, MainActivity::class.java), PendingIntent.FLAG_IMMUTABLE)
        val b = if (Build.VERSION.SDK_INT >= 26) Notification.Builder(this, CANAL) else @Suppress("DEPRECATION") Notification.Builder(this)
        return b.setContentTitle("Pilar Voz").setContentText(texto).setSmallIcon(android.R.drawable.sym_call_incoming)
            .setContentIntent(abrir).setOngoing(true).build()
    }

    private fun log(msg: String) {
        val linha = "${SimpleDateFormat("HH:mm:ss", Locale("pt", "BR")).format(Date())}  $msg"
        synchronized(EVENTOS) { EVENTOS.add(0, linha); while (EVENTOS.size > 100) EVENTOS.removeAt(EVENTOS.size - 1) }
        sendBroadcast(Intent(EVENTO).setPackage(packageName))
    }

    companion object {
        const val PREF = "pilar_voz"; const val CANAL = "pilar_voz"
        const val ACAO_PARAR = "br.com.pilar.voz.PARAR"; const val EVENTO = "br.com.pilar.voz.EVENTO"
        const val LIMIAR_FALA = 700
        val EVENTOS = mutableListOf<String>()
        fun iniciar(ctx: Context) {
            val i = Intent(ctx, VozService::class.java)
            if (Build.VERSION.SDK_INT >= 26) ctx.startForegroundService(i) else ctx.startService(i)
        }
        fun parar(ctx: Context) = ctx.startService(Intent(ctx, VozService::class.java).setAction(ACAO_PARAR))
    }
}
