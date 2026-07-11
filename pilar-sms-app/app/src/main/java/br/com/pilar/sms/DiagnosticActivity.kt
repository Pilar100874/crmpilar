package br.com.pilar.sms

import android.Manifest
import android.content.pm.PackageManager
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.telephony.SubscriptionManager
import android.view.View
import android.widget.Button
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

/**
 * Tela de diagnóstico do gateway SMS.
 * Mostra a última requisição recebida, o SIM selecionado, o estado da fila,
 * o retorno do Android, a resposta enviada à API e permite ENVIAR SMS DE TESTE
 * localmente para diagnosticar por que algumas mensagens vão e outras não.
 */
class DiagnosticActivity : AppCompatActivity() {

    private val handler = Handler(Looper.getMainLooper())
    private val fmt = SimpleDateFormat("HH:mm:ss", Locale.getDefault())
    private lateinit var tv: TextView
    private lateinit var etPhone: EditText
    private lateinit var etMsg: EditText
    private lateinit var btnTest: Button
    private lateinit var tvTestResult: TextView

    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main)

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
        val btnRefresh = Button(this).apply {
            text = "Atualizar"
            setOnClickListener { render() }
        }

        // ============ SEÇÃO DE TESTE ============
        val testTitle = TextView(this).apply {
            text = "Enviar SMS de teste"
            textSize = 16f
            setPadding(0, 24, 0, 8)
        }
        etPhone = EditText(this).apply {
            hint = "Telefone (ex: 11999998888)"
            inputType = android.text.InputType.TYPE_CLASS_PHONE
        }
        etMsg = EditText(this).apply {
            hint = "Mensagem"
            minLines = 2
        }
        btnTest = Button(this).apply {
            text = "Enviar teste agora"
            setOnClickListener { onTestSend() }
        }
        tvTestResult = TextView(this).apply {
            textSize = 12f
            setTextIsSelectable(true)
            typeface = android.graphics.Typeface.MONOSPACE
            setPadding(0, 8, 0, 16)
            text = "(sem teste ainda — o resultado detalhado aparece aqui e no histórico)"
        }

        // ============ LOG ============
        val logTitle = TextView(this).apply {
            text = "Log detalhado"
            textSize = 16f
            setPadding(0, 16, 0, 8)
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
        root.addView(btnRefresh)
        root.addView(testTitle)
        root.addView(etPhone)
        root.addView(etMsg)
        root.addView(btnTest)
        root.addView(tvTestResult)
        root.addView(logTitle)
        root.addView(sv, LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.MATCH_PARENT, 0, 1f))
        setContentView(root)
    }

    override fun onResume() { super.onResume(); handler.post(refresher) }
    override fun onPause() { super.onPause(); handler.removeCallbacks(refresher) }
    override fun onDestroy() { super.onDestroy(); try { scope.coroutineContext[Job]?.cancel() } catch (_: Exception) {} }

    private fun onTestSend() {
        val to = etPhone.text?.toString()?.trim().orEmpty()
        val msg = etMsg.text?.toString().orEmpty()
        if (to.isBlank() || msg.isBlank()) {
            Toast.makeText(this, "Informe telefone e mensagem", Toast.LENGTH_SHORT).show()
            return
        }
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.SEND_SMS)
            != PackageManager.PERMISSION_GRANTED) {
            ActivityCompat.requestPermissions(this, arrayOf(Manifest.permission.SEND_SMS), 77)
            Toast.makeText(this, "Conceda a permissão de SMS e tente novamente", Toast.LENGTH_LONG).show()
            return
        }
        btnTest.isEnabled = false
        tvTestResult.text = "Enviando teste para $to (${msg.length} chars)..."
        scope.launch {
            val result = withContext(Dispatchers.IO) {
                val preferredSim = getSharedPreferences("pilar_sms", MODE_PRIVATE)
                    .getInt("preferred_sim_index", -1)
                val hint = if (preferredSim >= 0) preferredSim.toString() else null
                SmsSender.send(this@DiagnosticActivity, to, msg, hint, null)
            }

            val txt = buildString {
                appendLine("=== TESTE ${fmt.format(Date(result.timestamp))} ===")
                appendLine("Telefone: $to")
                appendLine("Tamanho: ${result.messageLength}  Partes: ${result.parts}")
                appendLine("SIM index: ${result.simUsed}  subId: ${result.subscriptionId}")
                appendLine("Resultado Android: ${result.resultCode} (${result.errorCode})")
                appendLine("Descrição: ${result.errorDescription}")
                appendLine("Tentativas: ${result.attemptDetails}")
                appendLine("OK: ${result.ok}")
            }
            tvTestResult.text = txt
            // Registra no histórico para aparecer também na tela principal.
            synchronized(SmsPollingService.historyLock) {
                SmsPollingService.history.addFirst(SmsPollingService.SendEvent(
                    phone = "TESTE $to",
                    message = msg,
                    success = result.ok,
                    error = if (result.ok) null else result.errorDescription,
                    timeMs = System.currentTimeMillis(),
                    resultCode = result.resultCode,
                    errorCode = result.errorCode,
                    subscriptionId = result.subscriptionId,
                    messageLength = result.messageLength,
                    parts = result.parts,
                    attempts = result.attemptDetails,
                ))
                while (SmsPollingService.history.size > SmsPollingService.MAX_HISTORY)
                    SmsPollingService.history.removeLast()
            }
            if (result.ok) SmsPollingService.enviados++ else SmsPollingService.falhas++
            btnTest.isEnabled = true
            render()
        }
    }

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
            sb.appendLine("tentativas: ${d.attempts.ifBlank { "—" }}")
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
                if (ev.attempts.isNotBlank()) {
                    sb.appendLine("     tentativas: ${ev.attempts}")
                }
                if (!ev.success && !ev.error.isNullOrBlank()) {
                    sb.appendLine("     ↳ ${ev.error}")
                }
            }
        }
        tv.text = sb.toString()
    }
}
