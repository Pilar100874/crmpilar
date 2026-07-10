package br.com.pilar.sms

import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.telephony.SubscriptionManager
import android.view.View
import android.widget.Button
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

/**
 * Tela de diagnóstico do gateway SMS.
 * Mostra a última requisição recebida, o SIM selecionado, o estado da fila,
 * o retorno do Android e a resposta enviada à API.
 */
class DiagnosticActivity : AppCompatActivity() {

    private val handler = Handler(Looper.getMainLooper())
    private val fmt = SimpleDateFormat("HH:mm:ss", Locale.getDefault())
    private lateinit var tv: TextView

    private val refresher = object : Runnable {
        override fun run() { render(); handler.postDelayed(this, 1500) }
    }

    override fun onCreate(s: Bundle?) {
        super.onCreate(s)
        val root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(32, 32, 32, 32)
        }
        val title = TextView(this).apply {
            text = "Diagnóstico do Gateway SMS"
            textSize = 20f
            setPadding(0, 0, 0, 16)
        }
        val btn = Button(this).apply {
            text = "Atualizar"
            setOnClickListener { render() }
        }
        tv = TextView(this).apply {
            textSize = 12f
            setTextIsSelectable(true)
            typeface = android.graphics.Typeface.MONOSPACE
        }
        val sv = ScrollView(this).apply {
            addView(tv, LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT))
        }
        root.addView(title)
        root.addView(btn)
        root.addView(sv, LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.MATCH_PARENT, 0, 1f))
        setContentView(root)
    }

    override fun onResume() { super.onResume(); handler.post(refresher) }
    override fun onPause() { super.onPause(); handler.removeCallbacks(refresher) }

    private fun render() {
        val d = SmsPollingService.lastDiag
        val sb = StringBuilder()
        sb.appendLine("=== ESTADO ATUAL ===")
        sb.appendLine("Status: ${SmsPollingService.status}")
        sb.appendLine("Conexão: ${SmsPollingService.connState}")
        sb.appendLine("Fila (pendentes): ${SmsPollingService.queueSize}")
        sb.appendLine("Enviados: ${SmsPollingService.enviados}   Falhas: ${SmsPollingService.falhas}")
        val last = SmsPollingService.lastSendMs
        sb.appendLine("Último envio: " + if (last == 0L) "—" else fmt.format(Date(last)))
        sb.appendLine()
        sb.appendLine("=== SIMs DISPONÍVEIS ===")
        try {
            val sm = getSystemService(SubscriptionManager::class.java)
            val subs = sm?.activeSubscriptionInfoList.orEmpty()
            val def = SubscriptionManager.getDefaultSmsSubscriptionId()
            sb.appendLine("Default SMS subId: $def")
            subs.forEachIndexed { i, info ->
                sb.appendLine("[$i] subId=${info.subscriptionId} carrier=${info.carrierName} slot=${info.simSlotIndex}")
            }
            if (subs.isEmpty()) sb.appendLine("(nenhum SIM detectado ou sem permissão)")
        } catch (e: Exception) {
            sb.appendLine("Erro consultando SIMs: ${e.message}")
        }
        sb.appendLine()
        if (d == null) {
            sb.appendLine("=== ÚLTIMA MENSAGEM ===\n(nenhuma ainda)")
        } else {
            sb.appendLine("=== ÚLTIMA MENSAGEM (${fmt.format(Date(d.whenMs))}) ===")
            sb.appendLine("Telefone: ${d.phone}")
            sb.appendLine("Tamanho da mensagem: ${d.messageLength}")
            sb.appendLine("SIM index: ${d.simIndex}   subId: ${d.subscriptionId}")
            sb.appendLine("Fila restante: ${d.queueSize}")
            sb.appendLine()
            sb.appendLine("--- Retorno do Android ---")
            sb.appendLine("resultCode: ${d.androidResultCode}")
            sb.appendLine("errorCode:  ${d.androidErrorCode}")
            sb.appendLine("descrição:  ${d.androidErrorDescription}")
            sb.appendLine()
            sb.appendLine("--- Requisição recebida da API ---")
            sb.appendLine(d.requestJson)
            sb.appendLine()
            sb.appendLine("--- Payload enviado ao ack ---")
            sb.appendLine(d.apiAckPayload)
            sb.appendLine()
            sb.appendLine("--- Resposta da API ---")
            sb.appendLine(d.apiAckResponse)
        }
        sb.appendLine()
        sb.appendLine("=== HISTÓRICO (${SmsPollingService.history.size}) ===")
        synchronized(SmsPollingService.historyLock) {
            for (ev in SmsPollingService.history) {
                val tag = if (ev.success) "OK " else "ERR"
                sb.appendLine("[$tag] ${fmt.format(Date(ev.timeMs))} ${ev.phone} len=${ev.messageLength} parts=${ev.parts} code=${ev.resultCode} ${ev.errorCode}")
            }
        }
        tv.text = sb.toString()
    }
}
